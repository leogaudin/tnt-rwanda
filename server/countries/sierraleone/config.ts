import type { ServerCountryConfig } from '../types';

export default {
	boxFields: {
		project: { required: true },
		province: { required: true },
		district: { required: false },
		council: { required: false },
		chiefdom: { required: false },
		school: { required: true },
		htName: { required: false },
		htPhone: { required: false },
	},
	reportFields: ['school', 'province'],
	gpsMatchFields: ['school', 'district'],
	features: { dailyReport: false },
} satisfies ServerCountryConfig;
