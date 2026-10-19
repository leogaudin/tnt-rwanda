// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { getSchoolView } from '@client/service/schoolView';

describe('getSchoolView', () => {
	it('uses the first field with a non-empty value', () => {
		expect(getSchoolView({ school: 'S', lgea: 'L' }, ['school', 'lgea'])).toEqual({ field: 'school', value: 'S' });
		expect(getSchoolView({ school: '', lgea: 'L' }, ['school', 'lgea'])).toEqual({ field: 'lgea', value: 'L' });
		expect(getSchoolView({ lgea: 'L' }, ['school', 'lgea'])).toEqual({ field: 'lgea', value: 'L' });
	});

	it('treats whitespace-only, undefined and null as empty', () => {
		expect(getSchoolView({ school: '   ', lgea: undefined }, ['school', 'lgea'])).toBeNull();
		expect(getSchoolView({ school: null }, ['school'])).toBeNull();
	});

	it('returns null when no field has a value (so no modal and no unfiltered query)', () => {
		expect(getSchoolView({}, ['school'])).toBeNull();
		expect(getSchoolView({ school: 'S' }, [])).toBeNull();
	});

	it('defaults to the country config (_default: school)', () => {
		expect(getSchoolView({ school: 'Springfield' })).toEqual({ field: 'school', value: 'Springfield' });
	});
});
