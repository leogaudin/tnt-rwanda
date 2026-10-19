import type { CountryConfig } from '../index';

export default {
	name: 'TnT 🇺🇳',
	title: 'Track-and-Trace',
	shortName: 'TnT',
	// Central is not deployed: this is the local development API.
	apiUrl: 'http://localhost:3000/api',
	colors: {
		lightest: '#F0F5FF',
		light: '#EBF0FE',
		main: '#0949FF',
		dark: '#0033C0',
		darkest: '#001D6A',
	},
	defaultLanguage: 'en',
	languages: ['en', 'fr'],
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
	gpsUpdateFields: ['schoolCode'],
	schoolView: { fields: ['school'] },
	labels: {},
	features: { projectEmails: false },
} satisfies CountryConfig;
