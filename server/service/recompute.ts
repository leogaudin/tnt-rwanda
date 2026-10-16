import Box from '../models/boxes.model';
import Scan from '../models/scans.model';
import { computeBoxState, groupScansByBox } from './stats';
import { isFinalDestination } from './index';

// Boxes are processed in chunks so memory stays bounded and the event loop is
// released between chunks (a single 80k-box pass used to block the API for
// half an hour).
const CHUNK_SIZE = 2000;
const MAX_REFRESH_ATTEMPTS = 5;

const STATE_FIELDS = 'id boxId time finalDestination markedAsReceived';

/**
 * Rebuilds a box's scan-derived fields (`statusChanges`, `progress`,
 * `lastScan`) from its scans.
 *
 * Recomputing from the scans, instead of patching the stored value with the
 * incoming scan, is what makes this safe under concurrency: two scans of the
 * same box that arrive within milliseconds used to overwrite each other's
 * read-modify-write, losing a status or pointing at the wrong scan. Here every
 * writer recomputes from the full set, then checks that no scan was added while
 * it worked; if one was, it goes again. The last writer therefore always
 * writes a state that includes every scan, and a missed refresh is repaired by
 * the next one.
 */
export async function refreshBoxState(boxId: string) {
	let state = computeBoxState([]);

	for (let attempt = 1; attempt <= MAX_REFRESH_ATTEMPTS; attempt++) {
		const scans = await Scan.find({ boxId }, STATE_FIELDS).lean();
		state = computeBoxState(scans as any[]);

		await Box.updateOne({ id: boxId }, { $set: state });

		const count = await Scan.countDocuments({ boxId });
		if (count === scans.length) return state;
	}

	console.warn(`Box ${boxId} kept receiving scans while its state was refreshed`);
	return state;
}

function chunks<T>(items: T[], size: number): T[][] {
	const result: T[][] = [];
	for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
	return result;
}

interface RecomputeOptions {
	/** Recompute `finalDestination` of every scan from the box's current coordinates first. */
	finalDestinations?: boolean;
}

export interface RecomputeResult {
	/** Number of boxes matching the filter. */
	boxes: number;
	/** Scans whose `finalDestination` changed. */
	recalculated: number;
	/** Boxes whose stored state changed. */
	reindexed: number;
}

/**
 * Recomputes the scan-derived fields of every box matching `boxFilter`
 * (and, optionally, the `finalDestination` of their scans beforehand).
 */
export async function recomputeBoxes(
	boxFilter: Record<string, any>,
	{ finalDestinations = false }: RecomputeOptions = {},
): Promise<RecomputeResult> {
	const boxes = await Box
		.find(boxFilter, finalDestinations ? 'id schoolLatitude schoolLongitude' : 'id')
		.lean();

	const result: RecomputeResult = { boxes: boxes.length, recalculated: 0, reindexed: 0 };

	for (const chunk of chunks(boxes, CHUNK_SIZE)) {
		const scans: any[] = await Scan
			.find(
				{ boxId: { $in: chunk.map((box) => box.id) } },
				finalDestinations ? `${STATE_FIELDS} location.coords` : STATE_FIELDS,
			)
			.lean();

		if (finalDestinations) {
			const schoolsById = new Map(chunk.map((box) => [box.id, box]));
			const scanUpdates: any[] = [];

			for (const scan of scans) {
				const box = schoolsById.get(scan.boxId);
				if (!box) continue;

				const finalDestination = isFinalDestination(
					{ latitude: box.schoolLatitude, longitude: box.schoolLongitude },
					{ latitude: scan.location.coords.latitude, longitude: scan.location.coords.longitude },
				);

				if (finalDestination !== scan.finalDestination) {
					scan.finalDestination = finalDestination;
					// `_id`, not `id`: `id` is not indexed on scans, so filtering on it
					// is a full collection scan per operation.
					scanUpdates.push({
						updateOne: {
							filter: { _id: scan._id },
							update: { $set: { finalDestination } },
						},
					});
				}
			}

			if (scanUpdates.length) {
				const written = await Scan.bulkWrite(scanUpdates);
				result.recalculated += written.modifiedCount;
			}
		}

		const scansByBox = groupScansByBox(scans);
		const boxUpdates = chunk.map((box) => ({
			updateOne: {
				filter: { id: box.id },
				update: { $set: computeBoxState(scansByBox.get(box.id)) },
			},
		}));

		const written = await Box.bulkWrite(boxUpdates);
		result.reindexed += written.modifiedCount;
	}

	return result;
}
