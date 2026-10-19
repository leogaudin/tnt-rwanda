import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'http';

vi.mock('@server/countries', () => ({
	countryConfig: { gpsMatchField: 'administrativeCode', reportFields: ['school'], boxFields: {}, features: {} },
}));
vi.mock('@server/models/admins.model', () => ({ default: { findOne: vi.fn() } }));
vi.mock('@server/models/boxes.model', () => ({ default: { bulkWrite: vi.fn() }, boxFields: {} }));
vi.mock('@server/service/recompute', () => ({ recomputeBoxes: vi.fn() }));

import Admin from '@server/models/admins.model';
import Box from '@server/models/boxes.model';
import { recomputeBoxes } from '@server/service/recompute';
import boxesController from '@server/controllers/boxes.ctrl';

let server: Server;
let base: string;
beforeAll(async () => {
	const app = express();
	app.use(express.json());
	app.use('/api/boxes', boxesController);
	await new Promise<void>((resolve) => { server = app.listen(0, resolve); });
	base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(() => { server.close(); });

beforeEach(() => {
	vi.clearAllMocks();
	(Admin.findOne as any).mockResolvedValue({ id: 'a1' });
});

describe('POST /boxes/coords matches on the country gpsMatchField', () => {
	const coords = [
		{ administrativeCode: 'AC1', schoolCode: 'ignored', schoolLatitude: 1, schoolLongitude: 2 },
		{ administrativeCode: 'AC2', schoolLatitude: 3, schoolLongitude: 4 },
	];
	const call = () =>
		fetch(base + '/api/boxes/coords', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-authorization': 'k' },
			body: JSON.stringify({ coords }),
		});

	it('filters the updates and the recompute on that field (not schoolCode)', async () => {
		(Box.bulkWrite as any).mockResolvedValue({ modifiedCount: 2, matchedCount: 2 });
		const res = await call();
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ updated: 2, matched: 2 });

		const ops = (Box.bulkWrite as any).mock.calls[0][0];
		expect(ops.map((o: any) => o.updateMany.filter)).toEqual([
			{ administrativeCode: 'AC1', adminId: 'a1' },
			{ administrativeCode: 'AC2', adminId: 'a1' },
		]);
		expect(ops[0].updateMany.update).toEqual({ $set: { schoolLatitude: 1, schoolLongitude: 2 } });

		expect(recomputeBoxes).toHaveBeenCalledWith(
			{ adminId: 'a1', $or: [{ administrativeCode: 'AC1' }, { administrativeCode: 'AC2' }] },
			{ finalDestinations: true },
		);
	});

	it('keeps the response shape when nothing was modified', async () => {
		(Box.bulkWrite as any).mockResolvedValue({ modifiedCount: 0, matchedCount: 0 });
		const res = await call();
		expect(await res.json()).toEqual({ updated: 0, matched: 0, recalculated: 0 });
		expect(recomputeBoxes).not.toHaveBeenCalled();
	});
});
