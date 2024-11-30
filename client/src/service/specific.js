// Here are all the country-specific configurations, to facilitate the process of adapting the application to a new country.

// TnT + name of the country + flag
export const name = 'TnT 🇺🇳';

export const colors = {
	lightest: '#F0F5FF',
	light: '#EBF0FE',
	main: '#0949FF',
	dark: '#0033C0',
	darkest: '#001D6A',
};

// The corresponding API URL
export const API_URL =
						true
						?
						'http://localhost:3000/api'
						:
						'https://track-and-trace-api.vercel.app/api'


// Fields that should be: displayed as information, or the full representation of the object
// Used in:
// - PDFExport.jsx
// - UploadBoxes.jsx
// - csv.js
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

// Minimal fields that are used to differentiate boxes (e.g. for updating coordinates)
// Used in:
// - UpdateGPS.jsx
// - Report.jsx
// - csv.js
export const essentialFields = [
	'school',
	'district',
]

// Keys that should not be available to the user (e.g. when filtering)
// Used in:
// - BoxFiltering.jsx
// - BoxModal.jsx
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
];
