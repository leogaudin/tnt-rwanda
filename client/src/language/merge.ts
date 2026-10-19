export type Translations = Record<string, string>;
export type Resources = Record<string, Translations>;

/**
 * Builds the i18n resources: base translations, then the country's own locale
 * files, then the country's `labels` overrides (later layers win). A language
 * only present in a country's locale files (e.g. `pt`) is kept as it is.
 */
export function mergeResources(
	base: Resources,
	countryLocales: Resources,
	labels: Resources,
): Resources {
	const out: Resources = {};
	for (const layer of [base, countryLocales, labels]) {
		for (const [lng, strings] of Object.entries(layer)) {
			out[lng] = { ...(out[lng] || {}), ...strings };
		}
	}
	return out;
}
