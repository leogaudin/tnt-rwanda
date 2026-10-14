import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@server/models/admins.model', () => ({
	default: { findOne: vi.fn() },
}));

import Admin from '@server/models/admins.model';
import { requireApiKey } from '@server/service/apiKey';

function makeRes() {
	const res: any = { headersSent: false };
	res.status = vi.fn((code: number) => { res.statusCode = code; return res; });
	res.json = vi.fn((body: any) => { res.body = body; res.headersSent = true; return res; });
	return res;
}

describe('requireApiKey', () => {
	beforeEach(() => vi.clearAllMocks());

	it('returns 401 when no key is provided', async () => {
		const res = makeRes();
		const next = vi.fn();
		await requireApiKey({ headers: {} } as any, res, next);
		expect(res.statusCode).toBe(401);
		expect(res.body).toEqual({ error: 'API key required' });
		expect(next).not.toHaveBeenCalled();
	});

	it('returns 401 when the key is unknown', async () => {
		(Admin.findOne as any).mockResolvedValue(null);
		const res = makeRes();
		await requireApiKey({ headers: { 'x-authorization': 'bad' } } as any, res, vi.fn());
		expect(res.statusCode).toBe(401);
		expect(res.body).toEqual({ error: 'Invalid API key' });
	});

	it('passes the admin to the callback and keeps its result', async () => {
		const admin = { id: 'a1' };
		(Admin.findOne as any).mockResolvedValue(admin);
		const res = makeRes();
		const next = vi.fn(async () => 'done');
		const result = await requireApiKey({ headers: { 'x-authorization': 'k' } } as any, res, next);
		expect(next).toHaveBeenCalledWith(admin);
		expect(result).toBe('done');
		expect(res.status).not.toHaveBeenCalled();
	});

	it('answers 500 when the callback rejects', async () => {
		(Admin.findOne as any).mockResolvedValue({ id: 'a1' });
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const res = makeRes();
		await requireApiKey(
			{ headers: { 'x-authorization': 'k' } } as any,
			res,
			async () => { throw new Error('boom'); },
		);
		expect(res.statusCode).toBe(500);
		expect(res.body).toEqual({ error: 'Internal server error' });
	});

	it('answers 500 when the callback throws synchronously', async () => {
		(Admin.findOne as any).mockResolvedValue({ id: 'a1' });
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const res = makeRes();
		await requireApiKey(
			{ headers: { 'x-authorization': 'k' } } as any,
			res,
			() => { throw new Error('boom'); },
		);
		expect(res.statusCode).toBe(500);
	});

	it('does not answer twice if the response was already sent', async () => {
		(Admin.findOne as any).mockResolvedValue({ id: 'a1' });
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const res = makeRes();
		res.headersSent = true;
		await requireApiKey(
			{ headers: { 'x-authorization': 'k' } } as any,
			res,
			async () => { throw new Error('boom'); },
		);
		expect(res.status).not.toHaveBeenCalled();
	});
});
