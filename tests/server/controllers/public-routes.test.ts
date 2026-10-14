import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'http';

const chain = (result: any[]) => {
	const q: any = { skip: () => q, limit: () => q, lean: () => q, sort: () => q, allowDiskUse: () => q, then: (r: any, j: any) => Promise.resolve(result).then(r, j) };
	return q;
};

vi.mock('@server/models/admins.model', () => ({
	default: { findOne: vi.fn() },
}));
vi.mock('@server/models/boxes.model', () => ({
	default: {
		find: vi.fn(),
		distinct: vi.fn(),
		countDocuments: vi.fn(),
		insertMany: vi.fn(),
	},
	boxFields: {},
}));
vi.mock('@server/models/scans.model', () => ({
	default: { find: vi.fn(), countDocuments: vi.fn() },
}));

import Admin from '@server/models/admins.model';
import Box from '@server/models/boxes.model';
import Scan from '@server/models/scans.model';
import boxesController from '@server/controllers/boxes.ctrl';
import insightsController from '@server/controllers/insights.ctrl';

const publicAdmin = { id: 'pub', publicInsights: true, apiKey: 'pub-key', projectEmails: { p: 'a@b.c' } };
const privateAdmin = { id: 'priv', publicInsights: false, apiKey: 'priv-key', projectEmails: {} };

let server: Server;
let base: string;

beforeAll(async () => {
	const app = express();
	app.use(express.json());
	app.use('/api/boxes', boxesController);
	app.use('/api/insights', insightsController);
	await new Promise<void>((resolve) => { server = app.listen(0, resolve); });
	base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(() => { server.close(); });

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	(Admin.findOne as any).mockImplementation(async (q: any) => {
		if (typeof q.id !== 'string') return publicAdmin; // what an injected operator could hit
		return [publicAdmin, privateAdmin].find((a) => a.id === q.id) ?? null;
	});
	(Box.distinct as any).mockResolvedValue(['x']);
	(Box.countDocuments as any).mockResolvedValue(3);
	(Box.find as any).mockImplementation(() => chain([{ id: 'b1', project: 'p', school: 's', district: 'd', statusChanges: {}, content: {} }]));
	(Scan.find as any).mockResolvedValue([]);
});

const post = (path: string, body: any, headers: Record<string, string> = {}) =>
	fetch(base + path, {
		method: 'POST',
		headers: { 'content-type': 'application/json', ...headers },
		body: JSON.stringify(body),
	});

const publicPostRoutes = [
	'/api/boxes/distinct/htPhone',
	'/api/boxes/count',
	'/api/insights',
	'/api/insights/report',
];

describe.each(publicPostRoutes)('POST %s', (route) => {
	it('answers 400 "Admin ID required" without adminId', async () => {
		const r = await post(route, { filters: {} });
		expect(r.status).toBe(400);
		expect(await r.json()).toEqual({ error: 'Admin ID required' });
	});

	it.each([
		['$in', { $in: ['pub', 'priv'] }],
		['$ne', { $ne: null }],
		['array', ['pub']],
		['number', 1],
	])('rejects a non-string adminId (%s) before touching the database', async (_n, adminId) => {
		const r = await post(route, { filters: { adminId } });
		expect(r.status).toBe(400);
		expect(await r.json()).toEqual({ error: 'Admin ID required' });
		expect(Admin.findOne).not.toHaveBeenCalled();
		expect(Box.find).not.toHaveBeenCalled();
		expect(Box.distinct).not.toHaveBeenCalled();
		expect(Box.countDocuments).not.toHaveBeenCalled();
	});

	it('still answers 404 for an unknown string adminId', async () => {
		const r = await post(route, { filters: { adminId: 'nope' } });
		expect(r.status).toBe(404);
		expect(await r.json()).toEqual({ error: 'Admin not found' });
	});

	it('still answers 401 for a private admin without key', async () => {
		const r = await post(route, { filters: { adminId: 'priv' } });
		expect(r.status).toBe(401);
		expect(await r.json()).toEqual({ error: 'Unauthorized' });
	});

	it('still answers 200 for a public admin without key', async () => {
		const r = await post(route, { filters: { adminId: 'pub' } });
		expect(r.status).toBe(200);
	});

	it('still answers 200 for a private admin with its key', async () => {
		const r = await post(route, { filters: { adminId: 'priv' } }, { 'x-authorization': 'priv-key' });
		expect(r.status).toBe(200);
	});
});

describe('public response shapes are unchanged', () => {
	it('distinct returns { distinct }', async () => {
		const r = await post('/api/boxes/distinct/htPhone', { filters: { adminId: 'pub' } });
		expect(await r.json()).toEqual({ distinct: ['x'] });
		expect(Box.distinct).toHaveBeenCalledWith('htPhone', { adminId: 'pub' });
	});

	it('count returns { count }', async () => {
		const r = await post('/api/boxes/count', { filters: { adminId: 'pub' } });
		expect(await r.json()).toEqual({ count: 3 });
	});
});

describe('GET /api/insights/emails', () => {
	it('400 without adminId', async () => {
		const r = await fetch(`${base}/api/insights/emails`);
		expect(r.status).toBe(400);
		expect(await r.json()).toEqual({ error: 'Admin ID required' });
	});

	it('400 for an operator-style adminId (adminId[$ne]=x)', async () => {
		const r = await fetch(`${base}/api/insights/emails?adminId[$ne]=x`);
		expect(r.status).toBe(400);
		expect(Admin.findOne).not.toHaveBeenCalled();
	});

	it('200 { emails } for a public admin with a string adminId', async () => {
		const r = await fetch(`${base}/api/insights/emails?adminId=pub`);
		expect(r.status).toBe(200);
		expect(await r.json()).toEqual({ emails: { p: 'a@b.c' } });
	});

	it('401 for a private admin without key', async () => {
		const r = await fetch(`${base}/api/insights/emails?adminId=priv`);
		expect(r.status).toBe(401);
	});
});

describe('authenticated routes (requireApiKey)', () => {
	it('POST /api/boxes without key is still 401', async () => {
		const r = await post('/api/boxes', { data: 'x' });
		expect(r.status).toBe(401);
		expect(await r.json()).toEqual({ error: 'API key required' });
	});

	it('POST /api/boxes without data is still 400', async () => {
		(Admin.findOne as any).mockResolvedValue(privateAdmin);
		const r = await post('/api/boxes', {}, { 'x-authorization': 'priv-key' });
		expect(r.status).toBe(400);
		expect(await r.json()).toEqual({ error: 'No data provided' });
	});

	it('POST /api/boxes with a corrupt payload answers 500 instead of hanging', async () => {
		(Admin.findOne as any).mockResolvedValue(privateAdmin);
		const r = await post('/api/boxes', { data: 'not-valid-lzstring' }, { 'x-authorization': 'priv-key' });
		expect(r.status).toBe(500);
		expect(await r.json()).toEqual({ error: 'Internal server error' });
	});

	it('a database error inside an authenticated handler answers 500', async () => {
		(Admin.findOne as any).mockResolvedValue(privateAdmin);
		(Box.countDocuments as any).mockRejectedValue(new Error('db down'));
		(Box.find as any).mockImplementation(() => { throw new Error('db down'); });
		const r = await post('/api/boxes/query', { filters: {} }, { 'x-authorization': 'priv-key' });
		expect(r.status).toBe(500);
	});
});
