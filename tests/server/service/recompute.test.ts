import { describe, it, expect, vi, beforeEach } from 'vitest';

// A tiny in-memory stand-in for the two collections, with random latency on
// every call so concurrent requests interleave in many different ways.
const db = vi.hoisted(() => ({
	scans: [] as any[],
	box: null as any,
	boxWrites: 0,
	scanWrites: [] as any[],
	jitter: true,
}));

const delay = () => db.jitter ? new Promise((r) => setTimeout(r, Math.random() * 4)) : Promise.resolve();

vi.mock('@server/models/scans.model', () => ({
	default: {
		find: vi.fn((q: any) => {
			const snapshot = db.scans.filter((s) => (q.boxId?.$in ? q.boxId.$in.includes(s.boxId) : s.boxId === q.boxId)).map((s) => ({ ...s }));
			return { lean: async () => { await delay(); return snapshot; } };
		}),
		countDocuments: vi.fn(async (q: any) => { await delay(); return db.scans.filter((s) => s.boxId === q.boxId).length; }),
		bulkWrite: vi.fn(async (ops: any[]) => { db.scanWrites.push(...ops); return { modifiedCount: ops.length }; }),
	},
}));
vi.mock('@server/models/boxes.model', () => ({
	default: {
		updateOne: vi.fn(async (_f: any, update: any) => { await delay(); db.box = { ...db.box, ...update.$set }; db.boxWrites++; }),
		find: vi.fn(() => ({ lean: async () => db.boxes })),
		bulkWrite: vi.fn(async (ops: any[]) => { db.boxOps = ops; return { modifiedCount: ops.length }; }),
	},
	boxFields: {},
}));

import { refreshBoxState, recomputeBoxes } from '@server/service/recompute.js';
import { computeBoxState } from '@server/service/stats.js';

(db as any).boxes = [];
(db as any).boxOps = [];

const mk = (id: string, time: number, flags: any = {}) => ({
	id, boxId: 'b1', time, finalDestination: false, markedAsReceived: false, ...flags,
});

beforeEach(() => {
	db.scans = [];
	db.box = { id: 'b1' };
	db.boxWrites = 0;
	db.scanWrites = [];
	db.jitter = true;
	(db as any).boxes = [];
	(db as any).boxOps = [];
});

describe('refreshBoxState', () => {
	it('stores the state derived from all of the box scans, including lastScan', async () => {
		db.scans = [mk('a', 100), mk('b', 200, { finalDestination: true })];
		await refreshBoxState('b1');
		expect(db.box).toMatchObject(computeBoxState(db.scans));
		expect(db.box.lastScan).toEqual({ scan: 'b', time: 200 });
	});

	it('repairs a stale box on the next scan (self-healing)', async () => {
		db.box = { id: 'b1', progress: 'noScans', statusChanges: null, lastScan: null };
		db.scans = [mk('a', 100), mk('b', 200, { markedAsReceived: true })];
		await refreshBoxState('b1');
		expect(db.box.progress).toBe('received');
	});

	it('never loses a scan when several arrive at the same time (race)', async () => {
		for (let trial = 0; trial < 150; trial++) {
			db.scans = [mk('first', 1)];
			db.box = { id: 'b1' };
			const incoming = [
				mk(`x${trial}`, 100, { finalDestination: true }),
				mk(`y${trial}`, 101),
				mk(`z${trial}`, 102, { markedAsReceived: true }),
			];

			// Each "request" inserts its scan, then refreshes the box, at its own pace.
			await Promise.all(incoming.map(async (s) => {
				await delay();
				db.scans.push(s);
				await refreshBoxState('b1');
			}));

			const expected = computeBoxState(db.scans);
			expect(db.box.statusChanges).toEqual(expected.statusChanges);
			expect(db.box.progress).toBe(expected.progress);
			expect(db.box.lastScan).toEqual(expected.lastScan);
		}
	});
});

describe('recomputeBoxes', () => {
	it('rebuilds every box from a single grouped pass, including lastScan', async () => {
		db.jitter = false;
		(db as any).boxes = [{ id: 'b1' }, { id: 'b2' }, { id: 'empty' }];
		db.scans = [mk('a', 100), { ...mk('b', 200), boxId: 'b2', finalDestination: true }, mk('c', 300)];

		const result = await recomputeBoxes({ adminId: 'x' });

		expect(result).toEqual({ boxes: 3, recalculated: 0, reindexed: 3 });
		const byId = Object.fromEntries((db as any).boxOps.map((op: any) => [op.updateOne.filter.id, op.updateOne.update.$set]));
		expect(byId.b1.lastScan).toEqual({ scan: 'c', time: 300 });
		expect(byId.b2.progress).toBe('reachedGps');
		expect(byId.empty).toMatchObject({ progress: 'noScans', lastScan: null });
	});

	it('recalculates finalDestination, filters scan updates on _id, and uses the new value for the state', async () => {
		db.jitter = false;
		(db as any).boxes = [{ id: 'b1', schoolLatitude: 0, schoolLongitude: 0 }];
		db.scans = [
			// at the school, but flagged as not final
			{ ...mk('a', 100), _id: 'oid-a', finalDestination: false, location: { coords: { latitude: 0, longitude: 0, accuracy: 1 } } },
			// 100 km away, but flagged as final
			{ ...mk('b', 200), _id: 'oid-b', finalDestination: true, location: { coords: { latitude: 1, longitude: 1, accuracy: 1 } } },
		];

		const result = await recomputeBoxes({ adminId: 'x' }, { finalDestinations: true });

		expect(result.recalculated).toBe(2);
		expect(db.scanWrites.map((op) => op.updateOne.filter)).toEqual([{ _id: 'oid-a' }, { _id: 'oid-b' }]);
		const state = (db as any).boxOps[0].updateOne.update.$set;
		expect(state.statusChanges.reachedGps).toEqual({ scan: 'a', time: 100 });
	});
});
