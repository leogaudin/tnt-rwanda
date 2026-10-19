// Country-specific values. They come from app/countries/<country>/config.json,
// selected at bundle time by TNT_COUNTRY (see metro.config.js).
import config from '@country/config.json';

export const colors = config.colors;

export const API_URL = config.apiUrl;
