// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';
import { type ParseResult, parseGPSUpdateRow } from '@client/service/csv.js';
import { gpsUpdateFields } from '@client/service/specific.js';
import { countryConfig } from '@server/countries';

/**
 * These tests verify the contract between the client's CSV GPS update
 * parsing and the server's /coords endpoint expectations.
 *
 * The server's /coords endpoint (boxes.ctrl.ts) builds MongoDB filters from the
 * country's gpsMatchFields:
 *   { <gpsMatchFields>: box.<gpsMatchFields>, adminId: admin.id }
 *
 * The client's GPS CSV parsing produces objects with fields from
 * gpsUpdateFields + schoolLatitude + schoolLongitude.
 */

const GPS_FIELDS = [...gpsUpdateFields, 'schoolLatitude', 'schoolLongitude'];
const matchFields = countryConfig.gpsMatchFields;
const row = (key: string, lat = '48.8566', lng = '2.3522') => [...gpsUpdateFields.map((f) => `${key}_${f}`), lat, lng];

describe('GPS update CSV → server /coords contract', () => {
	it('gpsUpdateFields contains the fields the server uses to match boxes', () => {
		const missingFields = matchFields.filter((f) => !(gpsUpdateFields as readonly string[]).includes(f));
		expect(missingFields).toHaveLength(0);
	});

	it('parsed GPS row contains the fields used by the server for matching', () => {
		const result: ParseResult = parseGPSUpdateRow(row('SC001'), false);
		expect('box' in result).toBe(true);
		if ('box' in result) {
			for (const f of matchFields) expect(result.box[f]).toBe(`SC001_${f}`);
			expect(result.box.schoolLatitude).toBe(48.8566);
			expect(result.box.schoolLongitude).toBe(2.3522);
		}
	});

	it('simulates full CSV parse → payload shape for /coords', () => {
		const csv = [row('SC001'), row('SC002', '40.7128', '-74.0060')].map((r) => r.join(',')).join('\n');
		const boxes: Record<string, unknown>[] = [];

		Papa.parse<string[]>(csv, {
			skipEmptyLines: true,
			step: (element) => {
				const result = parseGPSUpdateRow(element.data, false);
				if ('box' in result) boxes.push(result.box);
			},
		});

		expect(boxes).toHaveLength(2);
		for (const box of boxes) {
			for (const f of GPS_FIELDS) expect(box).toHaveProperty(f);
		}
		expect(boxes[0][gpsUpdateFields[0]]).toBe(`SC001_${gpsUpdateFields[0]}`);
		expect(boxes[1][gpsUpdateFields[0]]).toBe(`SC002_${gpsUpdateFields[0]}`);
	});

	it('GPS CSV field list is gpsUpdateFields followed by latitude and longitude', () => {
		expect(GPS_FIELDS).toEqual([...gpsUpdateFields, 'schoolLatitude', 'schoolLongitude']);
		expect(GPS_FIELDS.slice(-2)).toEqual(['schoolLatitude', 'schoolLongitude']);
	});

	it('each parsed row has non-empty values for every gpsUpdateField', () => {
		const csv = [row('SC001'), row('SC002', '40.7128', '-74.0060')].map((r) => r.join(',')).join('\n');
		const boxes: Record<string, unknown>[] = [];

		Papa.parse<string[]>(csv, {
			skipEmptyLines: true,
			step: (element) => {
				const result = parseGPSUpdateRow(element.data, false);
				if ('box' in result) boxes.push(result.box);
			},
		});

		for (const box of boxes) {
			for (const f of gpsUpdateFields) {
				expect(box[f]).toBeTruthy();
				expect(typeof box[f]).toBe('string');
			}
		}
	});
});
