import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// MUST MATCH boxFields VARIABLE IN client/src/service/specific.js
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

const Box = new Schema(
	{
		id: { type: String, required: true },
		...boxFields,
		adminId: { type: String, required: true },
		createdAt: { type: Date, required: true },
		scans: { type: Array, required: false },
		schoolLatitude: { type: Number, required: true},
		schoolLongitude: { type: Number, required: true},
		statusChanges: { type: Object, required: false },
		content: { type: Object, required: false },
		progress: { type: String, required: false, default: 'noScans' },
		lastScan: { type: Object, required: false },
		packingListId: { type: Number, required: false },
	}
)

export default mongoose.model('boxes', Box);
