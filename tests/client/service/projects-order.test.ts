// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { projectsByRecency, sortProjectsByRecency, computeInsights } from '@client/service/stats.js';

const box = (project: string, createdAt: string | null, extra: Record<string, unknown> = {}) =>
	({ project, createdAt, statusChanges: null, content: null, progress: 'noScans', ...extra }) as any;

describe('projectsByRecency', () => {
	it('puts the most recently started project first', () => {
		const boxes = [box('old', '2024-01-01'), box('mid', '2024-06-01'), box('new', '2025-01-01'), box('old', '2024-02-01')];
		expect(projectsByRecency(boxes)).toEqual(['new', 'mid', 'old']);
	});

	it('does not move a project when newer boxes are imported into it', () => {
		const before = [box('a', '2025-01-01'), box('b', '2025-03-01')];
		const after = [...before, box('a', '2025-09-01')];
		expect(projectsByRecency(before)).toEqual(['b', 'a']);
		expect(projectsByRecency(after)).toEqual(['b', 'a']);
	});

	it('keeps projects without a usable date last, in order of appearance', () => {
		const boxes = [box('nodate1', null), box('dated', '2024-01-01'), box('nodate2', 'garbage')];
		expect(projectsByRecency(boxes)).toEqual(['dated', 'nodate1', 'nodate2']);
	});

	it('breaks ties by order of appearance and handles an empty list', () => {
		expect(projectsByRecency([box('x', '2024-01-01'), box('y', '2024-01-01')])).toEqual(['x', 'y']);
		expect(projectsByRecency([])).toEqual([]);
	});
});

describe('sortProjectsByRecency', () => {
	const boxes = [box('old', '2024-01-01'), box('new', '2025-01-01')];

	it('orders the given names like the boxes do', () => {
		expect(sortProjectsByRecency(['old', 'new'], boxes)).toEqual(['new', 'old']);
	});

	it('puts names the boxes do not mention last, and ignores boxes of other projects', () => {
		expect(sortProjectsByRecency(['ghost', 'old'], boxes)).toEqual(['old', 'ghost']);
		expect(sortProjectsByRecency(['ghost'], [])).toEqual(['ghost']);
	});
});

describe('computeInsights grouped', () => {
	it('lists projects newest first', () => {
		const result = computeInsights([box('old', '2024-01-01'), box('new', '2025-01-01')], { grouped: true });
		expect(Object.keys(result)).toEqual(['new', 'old']);
	});

	it('still filters with `only`', () => {
		const result = computeInsights([box('old', '2024-01-01'), box('new', '2025-01-01')], { grouped: true, only: ['old'] });
		expect(Object.keys(result)).toEqual(['old']);
	});
});
