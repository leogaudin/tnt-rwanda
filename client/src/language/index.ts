import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import config from '@country/config';
import en from './locales/en.json';
import fr from './locales/fr.json';
import { mergeResources, type Resources } from './merge';

const languageLabels: Record<string, string> = {
	en: 'English',
	fr: 'Français',
	pt: 'Português',
};

// Full extra languages of the selected country: client/countries/<country>/locales/<code>.json
const countryLocaleFiles = import.meta.glob<Record<string, string>>('@country/locales/*.json', {
	eager: true,
	import: 'default',
});

const countryLocales: Resources = {};
for (const [file, strings] of Object.entries(countryLocaleFiles)) {
	const code = file.split('/').pop()!.replace(/\.json$/, '');
	countryLocales[code] = strings;
}

const resources = mergeResources({ en, fr }, countryLocales, config.labels);

export const languages = config.languages.map((code) => ({
	label: languageLabels[code] || code,
	code,
}));

i18n
	.use(initReactI18next)
	.init({
		lng: config.defaultLanguage,
		fallbackLng: [config.defaultLanguage, 'en'],
		interpolation: {
			escapeValue: false,
		},
		resources: Object.fromEntries(
			Object.entries(resources).map(([lng, translation]) => [lng, { translation }]),
		),
	});

export default i18n;
