import type { ServerCountryConfig } from '../types';

export default {
	boxFields: {
		project: { required: true },
		academicInspection: { required: false },
		educationAndTrainingInspection: { required: false },
		commune: { required: true },
		school: { required: true },
		administrativeCode: { required: false },
		directorName: { required: false },
		directorPhone: { required: false },
	},
	reportFields: ['school', 'educationAndTrainingInspection', 'academicInspection'],
	gpsMatchFields: ['administrativeCode'],
	features: { dailyReport: false },
} satisfies ServerCountryConfig;
