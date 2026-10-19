import type { CountryConfig } from '../index';

export default {
	name: 'TnT Senegal 🇸🇳',
	title: 'Track-and-Trace',
	shortName: 'TnT',
	apiUrl: 'https://tnt-senegal-api.vercel.app/api',
	colors: {
		lightest: '#B1C4B7',
		light: '#76B88C',
		main: '#00853F',
		dark: '#005E2F',
		darkest: '#0F271B',
	},
	defaultLanguage: 'fr',
	languages: ['fr', 'en'],
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
	gpsUpdateFields: ['administrativeCode'],
	schoolView: { fields: ['school'] },
	labels: {
		en: {
			academicInspection: 'AI',
			educationAndTrainingInspection: 'ETI',
			commune: 'Commune',
			administrativeCode: 'Admin Code',
			directorName: 'Director',
			directorPhone: 'Director Phone',
		},
		fr: {
			academicInspection: 'IA',
			educationAndTrainingInspection: 'IEF',
			commune: 'Commune',
			administrativeCode: 'Code Admin',
			directorName: 'Directeur',
			directorPhone: 'Téléphone du directeur',
		},
	},
	features: { projectEmails: false },
} satisfies CountryConfig;
