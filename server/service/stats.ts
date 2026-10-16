import type { Progress, StatusChange, StatusChanges, Box, Scan } from '../types';

const ORDERED_STATUSES = [
	'inProgress',
	'received',
	'reachedGps',
	'reachedAndReceived',
	'validated',
] as const satisfies readonly (keyof StatusChanges)[];

export function getLastScanWithConditions<T extends { time: number; [key: string]: any }>(
	scans: T[] | null | undefined,
	conditions: string[] = [],
): T | null {
	return (scans ?? []).reduce<T | null>((last, scan) => {
		const matchesAll = conditions.every((cond) => scan[cond]);
		if (matchesAll && scan.time > (last?.time ?? 0)) return scan;
		return last;
	}, null);
}

export function getProgress(box: Pick<Box, 'statusChanges'>, notAfterTimestamp = Date.now()): Progress {
	if (!box.statusChanges) return 'noScans';

	const sc = box.statusChanges!;
	return ORDERED_STATUSES.reduce<Progress>((lastStatus, status) => {
		const change = sc[status];
		if (change?.time && change.time <= notAfterTimestamp) return status;
		return lastStatus;
	}, 'noScans');
}

type ScanForState = Pick<Scan, 'id' | 'time' | 'finalDestination' | 'markedAsReceived'>;

export interface BoxState {
	statusChanges: StatusChanges;
	progress: Progress;
	lastScan: StatusChange | null;
}

/**
 * Deterministic chronological order. `time` alone is not unique (duplicate
 * submissions land within the same millisecond), so `id` breaks ties and the
 * result never depends on the order the scans were read from the database.
 */
function byTimeThenId(a: ScanForState, b: ScanForState) {
	return a.time - b.time || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/**
 * The single source of truth for what a box's stored scan-derived fields
 * (`statusChanges`, `progress`, `lastScan`) must be. It is a pure function of
 * the box's scans, so it can be re-run at any time, on any subset of scans, in
 * any order, and always converges to the same result.
 */
export function computeBoxState(scans: readonly ScanForState[] | null | undefined): BoxState {
	const sorted = [...(scans ?? [])].sort(byTimeThenId);

	const statusChanges: StatusChanges = {
		inProgress: null,
		received: null,
		reachedGps: null,
		reachedAndReceived: null,
		validated: null,
	};

	for (const scan of sorted) {
		if (scan.finalDestination && scan.markedAsReceived && !statusChanges.validated) {
			statusChanges.validated = { scan: scan.id, time: scan.time };
		} else if (scan.finalDestination) {
			if (statusChanges.received && !statusChanges.reachedAndReceived) {
				statusChanges.reachedAndReceived = { scan: scan.id, time: scan.time };
			} else if (!statusChanges.reachedGps) {
				statusChanges.reachedGps = { scan: scan.id, time: scan.time };
			}
		} else if (scan.markedAsReceived) {
			if (statusChanges.reachedGps && !statusChanges.reachedAndReceived) {
				statusChanges.reachedAndReceived = { scan: scan.id, time: scan.time };
			} else if (!statusChanges.received) {
				statusChanges.received = { scan: scan.id, time: scan.time };
			}
		} else if (Object.values(statusChanges).every((s) => !s)) {
			statusChanges.inProgress = { scan: scan.id, time: scan.time };
		}
	}

	const last = sorted[sorted.length - 1];

	return {
		statusChanges,
		progress: getProgress({ statusChanges }),
		lastScan: last ? { scan: last.id, time: last.time } : null,
	};
}

export function groupScansByBox<T extends { boxId: string }>(scans: readonly T[]): Map<string, T[]> {
	const byBox = new Map<string, T[]>();
	for (const scan of scans) {
		const list = byBox.get(scan.boxId);
		if (list) list.push(scan);
		else byBox.set(scan.boxId, [scan]);
	}
	return byBox;
}

export function indexStatusChanges(sample: Pick<Box, 'id' | 'scans'>[]) {
	return sample.map((box) => ({
		updateOne: {
			filter: { id: box.id },
			update: { $set: computeBoxState(box.scans) },
		},
	}));
}
