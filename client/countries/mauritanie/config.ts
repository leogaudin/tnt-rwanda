import type { CountryConfig } from '../index';

export default {
	name: 'TnT Mauritanie 🇲🇷',
	title: 'Track-and-Trace',
	shortName: 'TnT',
	apiUrl: 'https://tnt-mauritanie-api.vercel.app/api',
	colors: {
		lightest: '#FFF0ED',
		light: '#F79F97',
		main: '#D01C1F',
		dark: '#85040F',
		darkest: '#380008',
	},
	defaultLanguage: 'fr',
	languages: ['fr', 'en'],
	boxFields: {
		project: { required: true },
		wilaya: { required: true },
		moughataa: { required: true },
		commune: { required: true },
		school: { required: true },
		htName: { required: false },
		htPhone: { required: false },
	},
	gpsUpdateFields: ['school', 'wilaya'],
	schoolView: { fields: ['school'] },
	labels: {
		en: {
			wilaya: 'Wilaya',
			moughataa: 'Moughataa',
			commune: 'Commune',
		},
		fr: {
			wilaya: 'Wilaya',
			moughataa: 'Moughataa',
			commune: 'Commune',
		},
	},
	features: { projectEmails: false },
} satisfies CountryConfig;
