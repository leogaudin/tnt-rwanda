// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import baseline from './specific-baseline.json';
import {
	name,
	colors,
	boxFields,
	gpsUpdateFields,
	enableProjectEmails,
	excludedKeys,
} from '@client/service/specific.js';
import { boxFields as serverBoxFields } from '@server/models/boxes.model.js';

const requiredOnly = (fields: Record<string, { required: boolean }>) =>
	Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { required: v.required }]));

describe('_default config keeps the pre-refactor values', () => {
	it('name and colors', () => {
		expect(name).toBe(baseline.name);
		expect(colors).toEqual(baseline.colors);
	});

	it('client boxFields: same keys, same order, same required', () => {
		expect(requiredOnly(boxFields)).toEqual(baseline.boxFields);
		expect(Object.keys(boxFields)).toEqual(Object.keys(baseline.boxFields));
	});

	it('server boxFields: same keys, same order, same required, String type', () => {
		expect(requiredOnly(serverBoxFields as any)).toEqual(baseline.boxFields);
		expect(Object.keys(serverBoxFields)).toEqual(Object.keys(baseline.boxFields));
		for (const f of Object.values(serverBoxFields) as any[]) expect(f.type).toBe(String);
	});

	it('gpsUpdateFields, enableProjectEmails, excludedKeys', () => {
		expect([...gpsUpdateFields]).toEqual(baseline.gpsUpdateFields);
		expect(enableProjectEmails).toBe(baseline.enableProjectEmails);
		expect([...excludedKeys]).toEqual(baseline.excludedKeys);
	});
});
