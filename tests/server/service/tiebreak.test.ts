import { describe, it, expect } from 'vitest';
import { tiebreakDirection } from '@server/service/index';

describe('tiebreakDirection', () => {
	it.each([
		[{}, 1],
		[undefined, 1],
		[{ packingListId: 1 }, 1],
		[{ packingListId: -1 }, -1],
		[{ packingListId: '1' }, 1],
		[{ packingListId: '-1' }, -1],
		[{ packingListId: 'asc' }, 1],
		[{ packingListId: 'ascending' }, 1],
		[{ packingListId: 'desc' }, -1],
		[{ packingListId: 'DESC' }, -1],
		[{ packingListId: 'descending' }, -1],
		[{ a: -1, b: 1 }, 1],   // follows the LAST key
		[{ a: 1, b: -1 }, -1],
		[{ a: 1, b: 'desc' }, -1],
		[{ a: 'desc', b: 1 }, 1],
	])('%j -> %s', (sort, expected) => {
		expect(tiebreakDirection(sort as any)).toBe(expected);
	});

	it('defaults to ascending for values it does not understand', () => {
		expect(tiebreakDirection({ a: { $meta: 'textScore' } } as any)).toBe(1);
		expect(tiebreakDirection({ a: 'nonsense' } as any)).toBe(1);
	});
});
