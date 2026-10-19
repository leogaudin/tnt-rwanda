import type { CountryConfig } from '../index';

export default {
	name: 'TnT Malawi 🇲🇼',
	title: 'Track-and-Trace',
	shortName: 'TnT',
	apiUrl: 'https://tnt-malawi-api.vercel.app/api',
	colors: {
		lightest: '#FFE7E6',
		light: '#F5898B',
		main: '#CE1126',
		dark: '#A8051E',
		darkest: '#5C0014',
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
