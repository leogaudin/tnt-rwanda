import type { CountryConfig } from '../index';

export default {
	name: 'Rwanda Textbooks Distribution Tracking System 🇷🇼',
	title: 'Track-and-Trace',
	shortName: 'TnT',
	apiUrl: 'https://booktracking.reb.rw:8000/api',
	colors: {
		lightest: '#E6FCFF',
		light: '#A3F3FF',
		main: '#26BFED',
		dark: '#006394',
		darkest: '#00456E',
	},
	defaultLanguage: 'en',
	languages: ['en', 'fr'],
	boxFields: {
		project: { required: true },
		district: { required: true },
		sector: { required: true },
		cell: { required: true },
		village: { required: true },
		school: { required: true },
		schoolCode: { required: true },
		htName: { required: false },
		htPhone: { required: false },
	},
	gpsUpdateFields: ['schoolCode'],
	schoolView: { fields: ['school'] },
	labels: {
		en: {
			uploadPrompt: 'Upload a packing list',
			sector: 'Sector',
			cell: 'Cell',
			village: 'Village',
		},
		fr: {
			sector: 'Secteur',
			cell: 'Cellule',
			village: 'Village',
		},
	},
	features: { projectEmails: true },
} satisfies CountryConfig;
