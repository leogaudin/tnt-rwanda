import type { ServerCountryConfig } from '../types';

export default {
	boxFields: {
		project: { required: true },
		wilaya: { required: true },
		moughataa: { required: true },
		commune: { required: true },
		school: { required: true },
		htName: { required: false },
		htPhone: { required: false },
	},
	reportFields: ['school', 'wilaya'],
	gpsMatchFields: ['school'],
	features: { dailyReport: false },
} satisfies ServerCountryConfig;
