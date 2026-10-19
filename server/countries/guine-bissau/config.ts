import type { ServerCountryConfig } from '../types';

export default {
	boxFields: {
		project: { required: true },
		region: { required: false },
		sector: { required: true },
		school: { required: true },
		schoolCode: { required: true },
		htName: { required: false },
		htPhone: { required: false },
	},
	reportFields: ['project', 'school', 'sector'],
	gpsMatchFields: ['schoolCode'],
	features: { dailyReport: false },
} satisfies ServerCountryConfig;
