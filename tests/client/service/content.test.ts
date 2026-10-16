// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { parseContent } from '@client/service/csv.js';
import { sampleToContent } from '@client/service/stats.js';

describe('parseContent', () => {
	it('parses numeric columns', () => {
		expect(parseContent(['Books', 'Pens'], ['100', '50'])).toEqual({ content: { Books: 100, Pens: 50 }, skipped: [] });
	});

	it('skips a column with an empty header (trailing comma in the CSV)', () => {
		const { content, skipped } = parseContent(['Books', ''], ['100', '']);
		expect(content).toEqual({ Books: 100 });
		expect(skipped).toEqual([{ field: '', kind: 'header', reason: 'its header is empty' }]);
	});

	it('skips whitespace-only headers', () => {
		expect(parseContent(['  '], ['4']).content).toEqual({});
	});

	it('skips blank and non-numeric cells instead of storing NaN', () => {
		const { content, skipped } = parseContent(['A', 'B', 'C'], ['', 'abc', '7']);
		expect(content).toEqual({ C: 7 });
		expect(skipped.map((s) => [s.field, s.kind])).toEqual([['A', 'value'], ['B', 'value']]);
	});

	it('skips negative quantities but keeps zero', () => {
		expect(parseContent(['A', 'B'], ['-3', '0']).content).toEqual({ B: 0 });
	});

	it('does not throw when a row is shorter than the header', () => {
		expect(parseContent(['A', 'B'], ['1']).content).toEqual({ A: 1 });
	});
});

describe('sampleToContent with malformed content', () => {
	const box = (content: any) => ({ project: 'p', statusChanges: null, content, progress: 'noScans', createdAt: 0 }) as any;

	it('ignores blank item names and non-numeric quantities already stored in the database', () => {
		const result = sampleToContent([box({ '': null, Books: 5, Pens: null, ' ': 3 }), box({ Books: 1 })]);
		expect(Object.keys(result)).toEqual(['Books']);
		expect(result.Books.total).toBe(6);
	});
});
