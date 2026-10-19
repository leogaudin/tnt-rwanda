import type { ServerCountryConfig } from '../types';

export default {
	boxFields: {
		project: { required: true },
		state: { required: true },
		lgea: { required: true },
		school: { required: false },
		schoolCode: { required: false },
		htName: { required: false },
		htPhone: { required: false },
		ssoName: { required: false },
		ssoPhone: { required: false },
	},
	reportFields: ['schoolCode', 'school', 'lgea', 'state'],
	gpsMatchFields: ['schoolCode'],
	features: { dailyReport: false },
} satisfies ServerCountryConfig;
