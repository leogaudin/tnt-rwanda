import mongoose, { Document } from 'mongoose';
import type { StatusChanges } from '../types';

export interface IBox extends Document {
	id: string;
	project: string;
	division: string;
	district: string;
	zone: string;
	school: string;
	htName: string;
	htPhone: string;
	schoolCode: string;
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
	division: { type: String, required: false },
	district: { type: String, required: true },
	zone: { type: String, required: false },
	school: { type: String, required: true },
	htName: { type: String, required: false },
	htPhone: { type: String, required: false },
	schoolCode: { type: String, required: false },
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
// in-memory sort, which is capped at 32MB and throws once the top-(skip+limit)
// set exceeds it (e.g. paginating past ~30k fat box documents) — silently
// truncating exports. The index lets the sort be served directly by the index.
BoxSchema.index({ adminId: 1, packingListId: 1 });

export default mongoose.model<IBox>('boxes', BoxSchema);
