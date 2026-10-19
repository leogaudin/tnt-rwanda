// Country-specific values. They come from client/countries/<country>/config.ts,
// selected at build time by TNT_COUNTRY (see vite.config.js).
import config from '@country/config';

export const name = config.name;

export const colors = config.colors;

export const API_URL =
	process.env.NODE_ENV === 'development'
		? 'http://localhost:3000/api'
		: (import.meta.env?.VITE_API_URL as string | undefined) || config.apiUrl;

interface FieldDef {
	type: StringConstructor;
	required: boolean;
}

export const boxFields: Record<string, FieldDef> = Object.fromEntries(
	Object.entries(config.boxFields).map(([field, def]) => [
		field,
		{ type: String, required: def.required },
	]),
);

export const gpsUpdateFields: readonly string[] = config.gpsUpdateFields;

export const schoolView = config.schoolView;

export const defaultLanguage = config.defaultLanguage;

export const enableProjectEmails = config.features.projectEmails;

export const excludedKeys = [
	'_id',
	'__v',
	'id',
	'adminId',
	'scans',
	'schoolLatitude',
	'schoolLongitude',
	'statusChanges',
	'progress',
	'content',
	'lastScan',
	'packingListId',
] as const;
