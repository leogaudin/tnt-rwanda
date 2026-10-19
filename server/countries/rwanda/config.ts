import type { ServerCountryConfig } from '../types';

export default {
	boxFields: {
		project: { required: true },
		district: { required: true },
		sector: { required: true },
		cell: { required: true },
		village: { required: true },
		school: { required: true },
		schoolCode: { required: true },
		htName: { required: false },
		htPhone: { required: false },
	},
	reportFields: ['project', 'district', 'sector', 'cell', 'village', 'school', 'schoolCode'],
	gpsMatchFields: ['schoolCode'],
	features: { dailyReport: false },
} satisfies ServerCountryConfig;
