import type { CountryConfig } from '../index';

export default {
	name: 'TnT Sierra Leone 🇸🇱',
	title: 'Track-and-Trace',
	shortName: 'TnT',
	apiUrl: 'https://tnt-sierraleone-api.vercel.app/api',
	colors: {
		lightest: '#e5f0f9',
		light: '#b2d4ed',
		main: '#0072c6',
		dark: '#004f8a',
		darkest: '#00223b',
	},
	defaultLanguage: 'en',
	languages: ['en', 'fr'],
	boxFields: {
		project: { required: true },
		province: { required: true },
		district: { required: false },
		council: { required: false },
		chiefdom: { required: false },
		school: { required: true },
		schoolCode: { required: true },
		htName: { required: false },
		htPhone: { required: false },
	},
	gpsUpdateFields: ['schoolCode'],
	schoolView: { fields: ['school'] },
	labels: {
		en: {
			province: 'Province',
			council: 'Council',
			chiefdom: 'Chiefdom',
		},
		fr: {
			province: 'Province',
			council: 'Conseil',
			chiefdom: 'Chefferie',
		},
	},
	features: { projectEmails: false },
} satisfies CountryConfig;
