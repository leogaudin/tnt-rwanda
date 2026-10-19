import type { CountryConfig } from '../index';

export default {
	name: 'TnT Centrafrique 🇨🇫',
	title: 'TnT Centrafrique',
	shortName: 'TnT Centrafrique',
	apiUrl: 'https://tnt-centrafrique-api.vercel.app/api',
	colors: {
		lightest: '#E8F0FE',
		light: '#B3CBF7',
		main: '#003082',
		dark: '#002060',
		darkest: '#001340',
	},
	defaultLanguage: 'fr',
	languages: ['en', 'fr'],
	boxFields: {
		project: { required: true },
		academicInspection: { required: true },
		circonscription: { required: true },
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
			academicInspection: 'Academic Inspection',
			circonscription: 'Circonscription',
			sector: 'Sector',
			school: 'School Name',
			schoolCode: 'School Number',
		},
		fr: {
			academicInspection: 'Inspection Académique',
			circonscription: 'Circonscription',
			sector: 'Secteur',
			school: 'Nom de l\'école',
			schoolCode: 'Numéro de l\'école',
		},
	},
	features: { projectEmails: false },
} satisfies CountryConfig;
