// Type of every client country config (client/countries/<country>/config.ts).
// The country is chosen at build time by the Vite alias `@country` (see vite.config.js).

export interface BoxFieldConfig {
	required: boolean;
}

export interface CountryConfig {
	/** Navbar name. */
	name: string;
	/** Browser tab title (<title>). */
	title: string;
	/** apple-mobile-web-app-title. */
	shortName: string;
	/** Size of the PNG favicon in public/ (favicon-<size>.png). Default 48x48. */
	faviconSize?: '48x48' | '96x96';
	apiUrl: string;
	colors: {
		lightest: string;
		light: string;
		main: string;
		dark: string;
		darkest: string;
	};
	defaultLanguage: string;
	/** Language codes offered in the navbar. Each needs base locales or `locales/<code>.json`. */
	languages: string[];
	/** Order matters. Must equal the server's `boxFields` for the same country (tested). */
	boxFields: Record<string, BoxFieldConfig>;
	/** Box fields a GPS update file is matched on. */
	gpsUpdateFields: string[];
	/**
	 * Ordered box fields defining a box's "school" (BoxCard and the school modal).
	 * The first field with a non-empty value is displayed and queried.
	 */
	schoolView: { fields: string[] };
	/** Per-language overrides merged over the base translations. */
	labels: Record<string, Record<string, string>>;
	features: {
		projectEmails: boolean;
	};
}
