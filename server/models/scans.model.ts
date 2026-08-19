import mongoose, { Document } from 'mongoose';
import type { ScanLocation } from '../types';

export interface IScan extends Document {
	id: string;
	boxId: string;
	adminId: string;
	operatorId: string;
	time: number;
	location: ScanLocation;
	finalDestination: boolean;
	markedAsReceived: boolean;
	comment?: string;
}

const ScanSchema = new mongoose.Schema({
	id: { type: String, required: true },
	boxId: { type: String, required: true },
	adminId: { type: String, required: true },
	operatorId: { type: String, required: true },
	time: { type: Number, required: true },
	location: { type: Object, required: true },
	finalDestination: { type: Boolean, required: true },
	markedAsReceived: { type: Boolean, required: true },
	comment: { type: String, required: false },
});

// Serves the scan/query access pattern: filter by adminId (equality) and sort
// by time desc. Without it MongoDB does a blocking in-memory sort (32MB cap on
// these Atlas tiers),
// the same failure class as the boxes export — the index provides the order.
ScanSchema.index({ adminId: 1, time: -1, _id: 1 });
// Serves per-box scan lookups (scan/box/:id, BoxCard) and the { boxId: { $in } }
// bulk reads in coords/reindex/recalculate, which otherwise scan the whole
// (fast-growing) scans collection.
ScanSchema.index({ boxId: 1 });

export default mongoose.model<IScan>('scans', ScanSchema);
