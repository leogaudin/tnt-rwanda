import { describe, it, expect } from 'vitest';
import { sanitizeContent } from '@server/service/index.js';

describe('sanitizeContent', () => {
	it('keeps valid items untouched', () => {
		expect(sanitizeContent({ Books: 10, Pens: 0 })).toEqual({ Books: 10, Pens: 0 });
	});

	it('drops items with a blank name', () => {
		expect(sanitizeContent({ '': null, ' ': 4, Books: 2 })).toEqual({ Books: 2 });
	});

	it('drops non-finite, negative and non-numeric quantities', () => {
		expect(sanitizeContent({ a: null, b: NaN, c: Infinity, d: -1, e: '5', f: 3 })).toEqual({ f: 3 });
	});

	it('returns an empty object for anything that is not a plain object', () => {
		for (const bad of [null, undefined, 'x', 5, [1, 2]]) expect(sanitizeContent(bad)).toEqual({});
	});
});
