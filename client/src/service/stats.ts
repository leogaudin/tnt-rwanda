import type {
	Progress,
	StatusChanges,
	InsightBox,
	Repartition,
	ContentItem,
	Insights,
	ComputeOptions,
} from '../types';

const ORDERED_STATUSES = [
	'inProgress',
	'received',
	'reachedGps',
	'reachedAndReceived',
	'validated',
] as const satisfies readonly (keyof StatusChanges)[];

export function getLastScanWithConditions(
	scans: Array<{ time: number; [key: string]: unknown }> | null | undefined,
	conditions: string[] = [],
): { time: number; [key: string]: unknown } | null {
	return (scans ?? []).reduce<{ time: number; [key: string]: unknown } | null>((last, scan) => {
		const matchesAll = conditions.every((cond) => scan[cond]);
		if (matchesAll && scan.time > (last?.time ?? 0)) return scan;
		return last;
	}, null);
}

export function getProgress(box: Pick<InsightBox, 'statusChanges'>, notAfterTimestamp = Date.now()): Progress {
	if (!box.statusChanges) return 'noScans';

	const sc = box.statusChanges;
	return ORDERED_STATUSES.reduce<Progress>((lastStatus, status) => {
		const change = sc[status];
		if (change?.time && change.time <= notAfterTimestamp) return status;
		return lastStatus;
	}, 'noScans');
}

function sampleToRepartition(sample: InsightBox[], notAfterTimestamp = Date.now()): Repartition {
	const repartition: Repartition = {
		noScans: 0,
		inProgress: 0,
		reachedGps: 0,
		received: 0,
		reachedAndReceived: 0,
		validated: 0,
		total: sample.length,
	};

	for (const box of sample) {
		const progress = getProgress(box, notAfterTimestamp);
		repartition[progress]++;
	}

	return repartition;
}

function getMinMax(arr: number[]): { min: number; max: number } {
	if (!arr?.length) throw new Error('Invalid array');
	let min = arr[0];
	let max = arr[0];
	for (let i = 1; i < arr.length; i++) {
		if (arr[i] < min) min = arr[i];
		if (arr[i] > max) max = arr[i];
	}
	return { min, max };
}

function sampleToTimeline(sample: InsightBox[]) {
	const allTimestamps = sample
		.flatMap((box) =>
			Object.values(box.statusChanges ?? {})
				.filter(Boolean)
				.map((change: any) => change.time as number),
		);

	if (!allTimestamps.length) return [];

	const oneDay = 86_400_000;
	const { min: minTimestamp, max: maxTimestamp } = getMinMax(allTimestamps);

	const final = maxTimestamp + oneDay;
	const initial = Math.max(minTimestamp, final - (365 * oneDay) / 2) - oneDay;

	const data: Array<{ name: string } & Repartition> = [];

	for (let i = initial; i <= final; i += oneDay) {
		const day = new Date(i).toISOString().split('T')[0];
		data.push({ name: day, ...sampleToRepartition(sample, i) });
	}

	return data;
}

export function sampleToContent(sample: InsightBox[]): Record<string, ContentItem> {
	const content: Record<string, ContentItem> = {};

	for (const box of sample) {
		for (const [item, count] of Object.entries(box.content ?? {})) {
			// Items with a blank name or a non-numeric quantity come from malformed
			// CSV imports and would show up as an empty "0/0" entry.
			if (!item.trim() || typeof count !== 'number' || !Number.isFinite(count)) continue;
			content[item] ??= { validated: 0, total: 0 };
			content[item].total += count;
			if (box.progress === 'validated' || box.statusChanges?.validated) {
				content[item].validated += count;
			}
		}
	}

	return content;
}

export function computeInsights(
	boxes: InsightBox[] | null,
	options: ComputeOptions = {},
): Record<string, Insights> | Insights | Record<string, never> {
	const { grouped = true, only = null } = options;

	if (!boxes?.length) return {};

	if (!grouped) {
		const filtered = only ? boxes.filter((box) => only.includes(box.project)) : boxes;
		return {
			timeline: sampleToTimeline(filtered),
			repartition: sampleToRepartition(filtered),
			content: sampleToContent(filtered),
		};
	}

	const projects = projectsByRecency(boxes);

	return Object.fromEntries(
		projects
			.filter((project) => !only || only.includes(project))
			.map((project) => {
				const sample = boxes.filter((box) => box.project === project);
				return [project, {
					timeline: sampleToTimeline(sample),
					repartition: sampleToRepartition(sample),
					content: sampleToContent(sample),
				}];
			}),
	);
}

type DatedBox = { project: string; createdAt?: string | Date | null };

const timeOf = (date: string | Date | null | undefined): number | null => {
	const time = date ? new Date(date).getTime() : NaN;
	return Number.isNaN(time) ? null : time;
};

/**
 * Project names ordered by when the project started (its oldest box's `createdAt`), newest project first.
 * The position of a project does not change when more boxes are imported into it.
 * Projects without a usable date come last; ties keep their order of appearance.
 */
export function projectsByRecency(boxes: readonly DatedBox[]): string[] {
	const startOf = new Map<string, number | null>();

	for (const { project, createdAt } of boxes) {
		const time = timeOf(createdAt);
		const known = startOf.get(project) ?? null;
		startOf.set(project, time === null || (known !== null && known <= time) ? known : time);
	}

	return [...startOf]
		.sort(([, a], [, b]) => (a === null || b === null ? Number(a === null) - Number(b === null) : b - a))
		.map(([project]) => project);
}

/** `names` ordered like `projectsByRecency(boxes)`; names the boxes don't mention go last. */
export function sortProjectsByRecency(names: readonly string[], boxes: readonly DatedBox[]): string[] {
	const ranked = projectsByRecency(boxes).filter((project) => names.includes(project));
	return [...ranked, ...names.filter((project) => !ranked.includes(project))];
}
