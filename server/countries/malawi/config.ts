import type { ServerCountryConfig } from '../types';

export default {
	boxFields: {
		project: { required: true },
		division: { required: false },
		district: { required: true },
		zone: { required: false },
		school: { required: true },
		htName: { required: false },
		htPhone: { required: false },
		schoolCode: { required: false },
	},
	reportFields: ['schoolCode', 'division', 'district', 'zone', 'school'],
	gpsMatchFields: ['schoolCode'],
	features: { dailyReport: false },
} satisfies ServerCountryConfig;
