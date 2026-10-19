import type { CountryConfig } from '../index';

export default {
	name: 'TnT Guiné-Bissau 🇬🇼',
	title: 'TnT Guiné-Bissau',
	shortName: 'TnT GB',
	faviconSize: '96x96',
	apiUrl: 'https://tnt-guine-bissau-api.vercel.app/api',
	colors: {
		lightest: '#E6F5EC',
		light: '#80CBA0',
		main: '#009739',
		dark: '#00712B',
		darkest: '#004219',
	},
	defaultLanguage: 'pt',
	languages: ['en', 'fr', 'pt'],
	boxFields: {
		project: { required: true },
		region: { required: false },
		sector: { required: true },
		school: { required: true },
		schoolCode: { required: true },
		htName: { required: false },
		htPhone: { required: false },
	},
	gpsUpdateFields: ['schoolCode'],
	schoolView: { fields: ['school'] },
	labels: {
		en: {
			region: 'Region',
			sector: 'Sector',
			school: 'Establishment Name',
			htName: 'Director Name',
			htPhone: 'Director Phone',
		},
		fr: {
			region: 'Région',
			sector: 'Secteur',
			school: 'Nom de l\'établissement',
		},
	},
	features: { projectEmails: false },
} satisfies CountryConfig;
