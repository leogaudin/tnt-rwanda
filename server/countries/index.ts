import type { ServerCountryConfig } from './types';
import defaultSelection from './default.json';
// <country-imports> (the standalone export keeps only its own country between these markers)
import _default from './_default/config';
import centrafrique from './centrafrique/config';
import guineBissau from './guine-bissau/config';
import liberia from './liberia/config';
import malawi from './malawi/config';
import mauritanie from './mauritanie/config';
import nigeria from './nigeria/config';
import rwanda from './rwanda/config';
import senegal from './senegal/config';
import sierraleone from './sierraleone/config';
// </country-imports>

// Every country is imported statically on purpose: @vercel/node only bundles
// files it can trace. Add new countries here (a test checks the folder list).
// <country-registry>
export const countries: Record<string, ServerCountryConfig> = {
	_default,
	centrafrique,
	'guine-bissau': guineBissau,
	liberia,
	malawi,
	mauritanie,
	nigeria,
	rwanda,
	senegal,
	sierraleone,
};
// </country-registry>

export const TEST_ONLY_COUNTRY = '_default';

interface ResolveOptions {
	env?: Record<string, string | undefined>;
	defaultCountry?: string;
	available?: Record<string, ServerCountryConfig>;
}

/**
 * Picks the country: TNT_COUNTRY, else countries/default.json.
 * Throws on an unknown code, and refuses the test-only `_default` in production
 * so a project with a missing TNT_COUNTRY can't silently serve the test config.
 */
export function resolveCountry({
	env = process.env,
	defaultCountry = defaultSelection.country,
	available = countries,
}: ResolveOptions = {}): { code: string; config: ServerCountryConfig } {
	const code = env.TNT_COUNTRY || defaultCountry;
	const config = available[code];
	if (!config) {
		throw new Error(
			`Unknown TNT_COUNTRY "${code}". Available: ${Object.keys(available).join(', ')}`,
		);
	}
	const isProduction = env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production';
	if (isProduction && code === TEST_ONLY_COUNTRY) {
		throw new Error(
			`Refusing to run the test-only "${TEST_ONLY_COUNTRY}" country in production. Set TNT_COUNTRY.`,
		);
	}
	return { code, config };
}

export const { code: countryCode, config: countryConfig } = resolveCountry();
