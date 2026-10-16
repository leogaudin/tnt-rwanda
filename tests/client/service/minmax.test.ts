// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { computeInsights } from '@client/service/stats.js';

const ONE_DAY = 86_400_000;
const KEYS = ['inProgress', 'received', 'reachedGps', 'reachedAndReceived', 'validated'] as const;

function makeBox(times: Array<number | null>, project = 'p') {
	const statusChanges: any = {};
	KEYS.forEach((k, i) => {
		statusChanges[k] = times[i] == null ? null : { scan: 's' + i, time: times[i] };
	});
	return { project, statusChanges, content: {}, progress: 'noProgress', createdAt: 0 } as any;
}

const day = (t: number) => new Date(t).toISOString().split('T')[0];

// getMinMax is private: its result is observable through the first/last timeline entries
// (initial = max(min, final - 182.5d) - 1d, final = max + 1d).
function expectedBounds(all: number[]) {
	const min = Math.min(...all);
	const max = Math.max(...all);
	const final = max + ONE_DAY;
	const initial = Math.max(min, final - (365 * ONE_DAY) / 2) - ONE_DAY;
	const lastStep = initial + Math.floor((final - initial) / ONE_DAY) * ONE_DAY;
	return { first: day(initial), last: day(lastStep) };
}

function timelineOf(boxes: any[]) {
	return (computeInsights(boxes, { grouped: false }) as any).timeline as Array<{ name: string }>;
}

describe('timeline bounds (getMinMax) — same result as Math.min/Math.max', () => {
	it('single timestamp', () => {
		const t = Date.UTC(2026, 5, 15, 12);
		const tl = timelineOf([makeBox([t])]);
		const { first, last } = expectedBounds([t]);
		expect(tl[0].name).toBe(first);
		expect(tl[tl.length - 1].name).toBe(last);
	});

	it('random small samples match the reference implementation', () => {
		let seed = 42;
		const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
		for (let run = 0; run < 30; run++) {
			const base = Date.UTC(2026, 0, 1);
			const boxes = Array.from({ length: 1 + Math.floor(rnd() * 5) }, () =>
				makeBox(KEYS.map(() => (rnd() < 0.3 ? null : base + Math.floor(rnd() * 60 * ONE_DAY)))),
			);
			const all = boxes.flatMap((b) => Object.values(b.statusChanges).filter(Boolean).map((c: any) => c.time));
			if (!all.length) { expect(timelineOf(boxes)).toEqual([]); continue; }
			const { first, last } = expectedBounds(all);
			const tl = timelineOf(boxes);
			expect(tl[0].name).toBe(first);
			expect(tl[tl.length - 1].name).toBe(last);
		}
	});

	it('no status changes at all gives an empty timeline', () => {
		expect(timelineOf([makeBox([null, null, null, null, null])])).toEqual([]);
	});

	it('does not overflow the call stack with a very large number of timestamps', () => {
		// 5 x 200k = 1M timestamps; Math.min(...arr) throws RangeError from ~125k arguments.
		const t = Date.UTC(2026, 5, 15, 12);
		const boxes = Array.from({ length: 200_000 }, () => makeBox([t, t, t, t, t]));
		expect(() => Math.min(...boxes.flatMap(() => [t, t, t, t, t]))).toThrow(RangeError);
		const tl = timelineOf(boxes);
		expect(tl[0].name).toBe(day(t - ONE_DAY));
		expect(tl[tl.length - 1].name).toBe(expectedBounds([t]).last);
	});
});
