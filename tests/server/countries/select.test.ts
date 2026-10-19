import { describe, it, expect } from 'vitest';
import { resolveCountry, countries } from '@server/countries';
import type { ServerCountryConfig } from '@server/countries/types';

const cfg = (gps: string): ServerCountryConfig => ({
	boxFields: { project: { required: true } },
	reportFields: ['project'],
	gpsMatchField: gps,
	features: { dailyReport: false },
});
const available = { _default: cfg('schoolCode'), liberia: cfg('schoolCode'), senegal: cfg('administrativeCode') };

describe('server country selection', () => {
	it('TNT_COUNTRY wins over default.json', () => {
		const r = resolveCountry({ env: { TNT_COUNTRY: 'senegal' }, defaultCountry: 'liberia', available });
		expect(r.code).toBe('senegal');
		expect(r.config.gpsMatchField).toBe('administrativeCode');
	});

	it('falls back to the default.json country when TNT_COUNTRY is unset or empty', () => {
		expect(resolveCountry({ env: {}, defaultCountry: 'liberia', available }).code).toBe('liberia');
		expect(resolveCountry({ env: { TNT_COUNTRY: '' }, defaultCountry: 'liberia', available }).code).toBe('liberia');
	});

	it('throws on an unknown country and lists the available ones', () => {
		expect(() => resolveCountry({ env: { TNT_COUNTRY: 'atlantis' }, available })).toThrow(/Unknown TNT_COUNTRY "atlantis".*liberia/);
	});

	it('refuses the test-only _default in production (NODE_ENV or VERCEL_ENV)', () => {
		expect(() => resolveCountry({ env: { NODE_ENV: 'production' }, defaultCountry: '_default', available })).toThrow(/test-only/);
		expect(() => resolveCountry({ env: { VERCEL_ENV: 'production', TNT_COUNTRY: '_default' }, available })).toThrow(/test-only/);
	});

	it('allows _default in production only with the explicit TNT_ALLOW_DEFAULT_COUNTRY=true opt-in', () => {
		const env = { NODE_ENV: 'production', TNT_COUNTRY: '_default' };
		expect(resolveCountry({ env: { ...env, TNT_ALLOW_DEFAULT_COUNTRY: 'true' }, available }).code).toBe('_default');
		expect(() => resolveCountry({ env: { ...env, TNT_ALLOW_DEFAULT_COUNTRY: '1' }, available })).toThrow(/test-only/);
	});

	it('allows _default outside production, and real countries in production', () => {
		expect(resolveCountry({ env: { NODE_ENV: 'test' }, defaultCountry: '_default', available }).code).toBe('_default');
		expect(resolveCountry({ env: { NODE_ENV: 'production', TNT_COUNTRY: 'liberia' }, available }).code).toBe('liberia');
	});

	it('a standalone export (default.json = a real country) runs in production without TNT_COUNTRY', () => {
		expect(resolveCountry({ env: { NODE_ENV: 'production' }, defaultCountry: 'liberia', available }).code).toBe('liberia');
	});

	it('the shipped registry contains the default.json country', async () => {
		const { default: selection } = await import('@server/countries/default.json');
		expect(countries).toHaveProperty(selection.country);
	});
});
