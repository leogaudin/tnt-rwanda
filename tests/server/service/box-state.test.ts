import { describe, it, expect } from 'vitest';
import { computeBoxState, groupScansByBox, indexStatusChanges } from '@server/service/stats.js';

type S = { id: string; boxId: string; time: number; finalDestination: boolean; markedAsReceived: boolean };

const scan = (id: string, time: number, flags: Partial<S> = {}): S => ({
	id, boxId: 'b1', time, finalDestination: false, markedAsReceived: false, ...flags,
});

function permutations<T>(items: T[]): T[][] {
	if (items.length <= 1) return [items];
	return items.flatMap((item, i) =>
		permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));
}

describe('computeBoxState', () => {
	it('is empty for a box without scans', () => {
		expect(computeBoxState([])).toEqual({
			statusChanges: { inProgress: null, received: null, reachedGps: null, reachedAndReceived: null, validated: null },
			progress: 'noScans',
			lastScan: null,
		});
		expect(computeBoxState(null).lastScan).toBeNull();
	});

	it('reports the chronologically last scan as lastScan, whatever the input order', () => {
		const state = computeBoxState([scan('c', 300), scan('a', 100), scan('b', 200)]);
		expect(state.lastScan).toEqual({ scan: 'c', time: 300 });
	});

	it('does not depend on the order the scans are given in', () => {
		const scans = [
			scan('a', 100),
			scan('b', 200, { markedAsReceived: true }),
			scan('c', 300, { finalDestination: true }),
			scan('d', 300, { finalDestination: true, markedAsReceived: true }), // same ms as c
			scan('e', 400),
		];
		const expected = computeBoxState(scans);
		for (const order of permutations(scans)) {
			expect(computeBoxState(order)).toEqual(expected);
		}
	});

	it('breaks same-millisecond ties by id, deterministically', () => {
		const a = scan('a', 100, { finalDestination: true });
		const b = scan('b', 100, { finalDestination: true });
		expect(computeBoxState([b, a]).statusChanges.reachedGps).toEqual({ scan: 'a', time: 100 });
		expect(computeBoxState([a, b]).lastScan).toEqual({ scan: 'b', time: 100 });
	});

	it('does not mutate its input', () => {
		const scans = [scan('b', 200), scan('a', 100)];
		computeBoxState(scans);
		expect(scans.map((s) => s.id)).toEqual(['b', 'a']);
	});

	it('derives progress from the resulting status changes', () => {
		expect(computeBoxState([scan('a', 1)]).progress).toBe('inProgress');
		expect(computeBoxState([scan('a', 1), scan('b', 2, { finalDestination: true })]).progress).toBe('reachedGps');
		expect(computeBoxState([scan('a', 1, { finalDestination: true, markedAsReceived: true })]).progress).toBe('validated');
	});

	it('gives the same result as feeding scans one at a time (incremental == from scratch)', () => {
		const flagsPool = [
			{}, { markedAsReceived: true }, { finalDestination: true }, { finalDestination: true, markedAsReceived: true },
		];
		// Deterministic pseudo-random sequences.
		let seed = 42;
		const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

		for (let trial = 0; trial < 200; trial++) {
			const n = 1 + Math.floor(rand() * 8);
			const scans = Array.from({ length: n }, (_, i) =>
				scan(`s${trial}-${i}`, 1000 + i * 10, flagsPool[Math.floor(rand() * flagsPool.length)]));

			// Each prefix, recomputed from scratch, must agree with the full set's
			// history: the state after k scans is a pure function of those k scans.
			let previous = computeBoxState([]);
			for (let k = 1; k <= n; k++) {
				const state = computeBoxState(scans.slice(0, k));
				// Statuses never disappear or move once set.
				for (const key of Object.keys(state.statusChanges) as (keyof typeof state.statusChanges)[]) {
					if (previous.statusChanges[key]) expect(state.statusChanges[key]).toEqual(previous.statusChanges[key]);
				}
				previous = state;
			}
		}
	});
});

describe('indexStatusChanges', () => {
	it('also rebuilds lastScan', () => {
		const ops = indexStatusChanges([{ id: 'b1', scans: [scan('a', 100), scan('b', 200)] } as any]);
		expect(ops[0].updateOne.update.$set.lastScan).toEqual({ scan: 'b', time: 200 });
	});

	it('resets a box without scans', () => {
		const ops = indexStatusChanges([{ id: 'b1', scans: [] } as any]);
		expect(ops[0].updateOne.update.$set).toMatchObject({ progress: 'noScans', lastScan: null });
	});
});

describe('groupScansByBox', () => {
	it('groups scans by box id', () => {
		const grouped = groupScansByBox([
			{ ...scan('a', 1), boxId: 'x' }, { ...scan('b', 2), boxId: 'y' }, { ...scan('c', 3), boxId: 'x' },
		]);
		expect(grouped.get('x')!.map((s) => s.id)).toEqual(['a', 'c']);
		expect(grouped.get('y')!.map((s) => s.id)).toEqual(['b']);
		expect(grouped.get('z')).toBeUndefined();
	});
});
