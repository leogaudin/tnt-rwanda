import mongoose, { Document } from 'mongoose';
import type { StatusChanges } from '../types';

export interface IBox extends Document {
	id: string;
	project: string;
	district: string;
	sector: string;
	cell: string;
	village: string;
	school: string;
	schoolCode: string;
	htName: string;
	htPhone: string;
	adminId: string;
	createdAt: Date;
	scans: any[];
	schoolLatitude: number;
	schoolLongitude: number;
	statusChanges: StatusChanges | null;
	content: Record<string, number> | null;
	progress: string;
	lastScan: { scan: string; time: number } | null;
	packingListId: number | null;
}

// MUST MATCH boxFields VARIABLE IN client/src/service/specific.ts
export const boxFields = {
	project: { type: String, required: true },
	district: { type: String, required: true },
	sector: { type: String, required: true },
	cell: { type: String, required: true },
	village: { type: String, required: true },
	school: { type: String, required: true },
	schoolCode: { type: String, required: true },
	htName: { type: String, required: false },
	htPhone: { type: String, required: false },
};

const BoxSchema = new mongoose.Schema({
	id: { type: String, required: true },
	...boxFields,
	adminId: { type: String, required: true },
	createdAt: { type: Date, required: true },
	scans: { type: Array, required: false },
	schoolLatitude: { type: Number, required: true },
	schoolLongitude: { type: Number, required: true },
	statusChanges: { type: Object, required: false },
	content: { type: Object, required: false },
	progress: { type: String, required: false, default: 'noScans' },
	lastScan: { type: Object, required: false },
	packingListId: { type: Number, required: false },
});

// Serves the boxes/query access pattern: filter by adminId (equality) and
// sort by packingListId. Without this index MongoDB performs a blocking
// in-memory sort, which is capped at 32MB on these Atlas tiers (verified via
// explain: memLimit 33554432) and throws once the top-(skip+limit)
// set exceeds it (e.g. paginating past ~30k fat box documents) — silently
// truncating exports. The index lets the sort be served directly by the index.
// DEPLOY ORDER MATTERS: the previous index was { adminId, packingListId }, which
// could serve sort({ packingListId: 1 }) but CANNOT serve sort({ packingListId: 1,
// _id: 1 }) — verified by explain, it falls back to a blocking SORT. Build this
// widened index on the cluster BEFORE (or together with) deploying the code, or
// the label export runs a blocking sort against a 32MB cap in the meantime.
// The old 2-field index is now redundant; Mongoose does not drop it.
BoxSchema.index({ adminId: 1, packingListId: 1, _id: 1 });
// Serves the paginated paths that sort by `_id` alone (boxes/query with no
// explicit sort, insights, insights/report): adminId equality + _id ordering
// straight from the index, so no blocking sort regardless of result size.
BoxSchema.index({ adminId: 1, _id: 1 });
// Box.findOne({ id }) runs on every scan submission (and box lookups). The
// app-level `id` is otherwise unindexed, forcing a full collection scan per
// scan write — costly during bulk offline-sync replay. Left non-unique to
// avoid a build failure if any duplicate ids already exist; can be tightened
// to { unique: true } once the data is verified clean.
BoxSchema.index({ id: 1 });

export default mongoose.model<IBox>('boxes', BoxSchema);
