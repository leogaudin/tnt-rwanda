export const name = 'Rwanda Textbooks Distribution Tracking System 🇷🇼';

export const colors = {
	lightest: '#E6FCFF',
	light: '#A3F3FF',
	main: '#26BFED',
	dark: '#006394',
	darkest: '#00456E',
} as const;

export const API_URL =
	// process.env.NODE_ENV === 'development'
	// 	? 'http://localhost:3000/api'
	// 	:
	'https://booktracking.reb.rw:8000/api';

interface FieldDef {
	type: StringConstructor;
	required: boolean;
}

export const boxFields: Record<string, FieldDef> = {
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

export const gpsUpdateFields = ['schoolCode'] as const;

export const excludedKeys = [
	'_id',
	'__v',
	'id',
	'adminId',
	'scans',
	'schoolLatitude',
	'schoolLongitude',
	'statusChanges',
	'progress',
	'content',
	'lastScan',
	'packingListId',
] as const;