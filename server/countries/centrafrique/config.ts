import type { ServerCountryConfig } from '../types';

export default {
	boxFields: {
		project: { required: true },
		academicInspection: { required: true },
		circonscription: { required: true },
		sector: { required: true },
		school: { required: true },
		schoolCode: { required: true },
		htName: { required: false },
		htPhone: { required: false },
	},
	reportFields: ['project', 'school', 'circonscription', 'sector'],
	gpsMatchFields: ['schoolCode'],
	features: { dailyReport: false },
} satisfies ServerCountryConfig;
