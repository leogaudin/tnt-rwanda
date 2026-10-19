import { describe, it, expect, afterEach } from 'vitest';
// @ts-ignore: plain JS script helper
import { parseArgs, connect, redact, sameKey } from '../../scripts/migration/lib.mjs';

describe('migration script helpers', () => {
	const saved = process.env.STRING_URI;
	afterEach(() => { if (saved === undefined) delete process.env.STRING_URI; else process.env.STRING_URI = saved; });

	it('parseArgs reads options with values, flags and positionals', () => {
		expect(parseArgs(['sierraleone', '--db', 'staging', '--confirm', '--batch', '10'])).toEqual({ _: ['sierraleone'], db: 'staging', confirm: true, batch: '10' });
	});

	it('refuses a mistyped option such as "--db staging" passed as one word', async () => {
		process.env.STRING_URI = 'mongodb://example.invalid/x';
		await expect(connect(parseArgs(['--db staging']))).rejects.toThrow(/Unrecognised argument/);
	});

	it('refuses --confirm without --db or --production, before touching the network', async () => {
		process.env.STRING_URI = 'mongodb://example.invalid/x';
		await expect(connect(parseArgs(['--confirm']))).rejects.toThrow(/--confirm writes/);
	});

	it('never leaks a connection string in an error message', () => {
		expect(redact('failed mongodb+srv://user:secret@host/db?x=1 end')).toBe('failed <uri> end');
	});

	it('sameKey compares index keys including order', () => {
		expect(sameKey({ a: 1, b: 1 }, { a: 1, b: 1 })).toBe(true);
		expect(sameKey({ a: 1, b: 1 }, { b: 1, a: 1 })).toBe(false);
	});
});
