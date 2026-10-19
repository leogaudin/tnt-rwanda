import type { CountryConfig } from '../index';

export default {
	name: 'TnT Nigeria 🇳🇬',
	title: 'Track-and-Trace',
	shortName: 'TnT',
	apiUrl: 'https://tnt-nigeria-api.vercel.app/api',
	colors: {
		lightest: '#B3C7BC',
		light: '#51A87D',
		main: '#008751',
		dark: '#00613D',
		darkest: '#0F271E',
	},
	defaultLanguage: 'en',
	languages: ['en', 'fr'],
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
	gpsUpdateFields: ['schoolCode'],
	schoolView: { fields: ['school', 'lgea'] },
	labels: {
		en: {
			state: 'State',
			lgea: 'LGEA',
			ssoName: 'SSO Name',
			ssoPhone: 'SSO Phone',
		},
		fr: {
			state: 'État',
			lgea: 'LGEA',
			ssoName: 'Nom du SSO',
			ssoPhone: 'Téléphone du SSO',
		},
	},
	features: { projectEmails: false },
} satisfies CountryConfig;
