// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';
import {
	type ParseResult,
	type ParseSuccess,
	type ParseError,
	parseDistributionRow,
	parseGPSUpdateRow,
} from '@client/service/csv.js';
import { boxFields, gpsUpdateFields } from '@client/service/specific.js';

const distributionFields = [...Object.keys(boxFields), 'schoolLatitude', 'schoolLongitude'];
const gpsFields: string[] = [...gpsUpdateFields, 'schoolLatitude', 'schoolLongitude'];

/** Narrow a ParseResult to ParseSuccess, failing the test if it's an error. */
function expectSuccess(result: ParseResult): ParseSuccess {
	expect('box' in result).toBe(true);
	return result as ParseSuccess;
}

/** Narrow a ParseResult to ParseError, failing the test if it's a success. */
function expectError(result: ParseResult): ParseError {
	expect('error' in result).toBe(true);
	return result as ParseError;
}

function makeDistributionRow(overrides: Record<string, string> = {}): string[] {
	const defaults: Record<string, string> = {};
	for (const field of distributionFields) {
		if (field === 'schoolLatitude') defaults[field] = '48.8566';
		else if (field === 'schoolLongitude') defaults[field] = '2.3522';
		else defaults[field] = `val_${field}`;
	}
	Object.assign(defaults, overrides);
	return distributionFields.map((f) => defaults[f]);
}

function makeGPSRow(overrides: Record<string, string> = {}): string[] {
	const defaults: Record<string, string> = {};
	for (const field of gpsFields) {
		if (field === 'schoolLatitude') defaults[field] = '48.8566';
		else if (field === 'schoolLongitude') defaults[field] = '2.3522';
		else defaults[field] = `val_${field}`;
	}
	Object.assign(defaults, overrides);
	return gpsFields.map((f) => defaults[f]);
}

// ── parseDistributionRow ──

describe('parseDistributionRow', () => {
	it('parses a valid row into a box object', () => {
		const row = makeDistributionRow();
		const { box } = expectSuccess(parseDistributionRow(row, 'admin1'));
		expect(box.adminId).toBe('admin1');
		expect(box.schoolLatitude).toBe(48.8566);
		expect(box.schoolLongitude).toBe(2.3522);
	});

	it('populates all boxFields keys', () => {
		const row = makeDistributionRow();
		const { box } = expectSuccess(parseDistributionRow(row, 'admin1'));
		for (const field of Object.keys(boxFields)) {
			expect(box).toHaveProperty(field);
		}
	});

	it('returns error when a required field is missing', () => {
		const requiredField = Object.keys(boxFields).find((k) => boxFields[k].required);
		if (!requiredField) return;
		const row = makeDistributionRow({ [requiredField]: '' });
		const { error } = expectError(parseDistributionRow(row, 'admin1'));
		expect(error).toContain(requiredField);
	});

	it('returns error when schoolLatitude is empty', () => {
		const row = makeDistributionRow({ schoolLatitude: '' });
		const { error } = expectError(parseDistributionRow(row, 'admin1'));
		expect(error).toContain('schoolLatitude');
	});

	it('returns error when schoolLongitude is empty', () => {
		const row = makeDistributionRow({ schoolLongitude: '' });
		const { error } = expectError(parseDistributionRow(row, 'admin1'));
		expect(error).toContain('schoolLongitude');
	});

	it('returns error for invalid latitude', () => {
		const row = makeDistributionRow({ schoolLatitude: 'abc' });
		const { error } = expectError(parseDistributionRow(row, 'admin1'));
		expect(error).toContain('Latitude');
	});

	it('returns error for invalid longitude', () => {
		const row = makeDistributionRow({ schoolLongitude: 'xyz' });
		expectError(parseDistributionRow(row, 'admin1'));
	});

	it('handles comma-separated decimals', () => {
		const row = makeDistributionRow({ schoolLatitude: '48,8566', schoolLongitude: '2,3522' });
		const { box } = expectSuccess(parseDistributionRow(row, 'admin1'));
		expect(box.schoolLatitude).toBeCloseTo(48.8566, 3);
		expect(box.schoolLongitude).toBeCloseTo(2.3522, 3);
	});

	it('allows optional fields to be empty', () => {
		const optionalField = Object.keys(boxFields).find((k) => !boxFields[k].required);
		if (!optionalField) return;
		const row = makeDistributionRow({ [optionalField]: '' });
		expectSuccess(parseDistributionRow(row, 'admin1'));
	});

	it('rejects completely empty row', () => {
		expectError(parseDistributionRow([], 'admin1'));
	});

	it('rejects row with only some fields', () => {
		expectError(parseDistributionRow(['project1'], 'admin1'));
	});
});

// ── parseGPSUpdateRow ──

describe('parseGPSUpdateRow', () => {
	it('parses a valid row into a box object', () => {
		const row = makeGPSRow();
		const { box } = expectSuccess(parseGPSUpdateRow(row, false));
		expect(box.schoolLatitude).toBe(48.8566);
		expect(box.schoolLongitude).toBe(2.3522);
	});

	it('populates all gpsUpdateFields keys', () => {
		const row = makeGPSRow();
		const { box } = expectSuccess(parseGPSUpdateRow(row, false));
		for (const field of gpsUpdateFields) {
			expect(box).toHaveProperty(field);
		}
	});

	it('returns error when a field is missing', () => {
		const field = gpsFields[0];
		const row = makeGPSRow({ [field]: '' });
		const { error } = expectError(parseGPSUpdateRow(row, false));
		expect(error).toContain(field);
	});

	it('returns error for invalid latitude', () => {
		const row = makeGPSRow({ schoolLatitude: 'abc' });
		const { error } = expectError(parseGPSUpdateRow(row, false));
		expect(error).toContain('Latitude');
	});

	it('handles comma-separated decimals', () => {
		const row = makeGPSRow({ schoolLatitude: '48,8566', schoolLongitude: '2,3522' });
		const { box } = expectSuccess(parseGPSUpdateRow(row, false));
		expect(box.schoolLatitude).toBeCloseTo(48.8566, 3);
		expect(box.schoolLongitude).toBeCloseTo(2.3522, 3);
	});

	it('is more lenient with first row (header detection)', () => {
		const row = makeGPSRow();
		expectSuccess(parseGPSUpdateRow(row, true));
	});

	it('rejects completely empty row', () => {
		expectError(parseGPSUpdateRow([]));
	});

	it('rejects row with empty strings', () => {
		expectError(parseGPSUpdateRow(['', '', '']));
	});

	it('rejects invalid longitude', () => {
		const row = makeGPSRow({ schoolLongitude: 'xyz' });
		expectError(parseGPSUpdateRow(row, false));
	});

	it('handles negative coordinates (southern/western hemisphere)', () => {
		const row = makeGPSRow({ schoolLatitude: '-33.8688', schoolLongitude: '151.2093' });
		const { box } = expectSuccess(parseGPSUpdateRow(row, false));
		expect(box.schoolLatitude).toBeCloseTo(-33.8688, 3);
		expect(box.schoolLongitude).toBeCloseTo(151.2093, 3);
	});
});

// ── E2E-like: CSV text built from the selected country's fields → Papa Parse → parse functions ──

const requiredFields = Object.keys(boxFields).filter((f) => boxFields[f].required);
const optionalFields = Object.keys(boxFields).filter((f) => !boxFields[f].required);
const firstGps = gpsUpdateFields[0];

const toCsv = (rows: string[][], delimiter = ',') => rows.map((r) => r.join(delimiter)).join('\n');
const distributionCsv = (rows: string[][], extraHeader: string[] = [], delimiter = ',') =>
	toCsv([[...distributionFields, ...extraHeader], ...rows], delimiter);
const gpsCsv = (rows: string[][], delimiter = ',') => toCsv(rows, delimiter);

function parseDistributionCsv(csv: string, delimiter?: string) {
	const boxes: Record<string, unknown>[] = [];
	const errors: string[] = [];
	Papa.parse<Record<string, string>>(csv, {
		skipEmptyLines: true,
		header: true,
		...(delimiter ? { delimiter } : {}),
		step: (element) => {
			const values: string[] = Object.values(element.data);
			const result = parseDistributionRow(values, 'admin1');
			if ('error' in result) errors.push(result.error);
			else boxes.push(result.box);
		},
	});
	return { boxes, errors };
}

function parseGpsCsv(csv: string, delimiter?: string) {
	const boxes: Record<string, unknown>[] = [];
	const errors: string[] = [];
	let rowIdx = 0;
	Papa.parse<string[]>(csv, {
		skipEmptyLines: true,
		...(delimiter ? { delimiter } : {}),
		step: (element) => {
			const result = parseGPSUpdateRow(element.data, rowIdx === 0);
			if ('error' in result) errors.push(result.error);
			else boxes.push(result.box);
			rowIdx++;
		},
	});
	return { boxes, errors };
}

describe('E2E: distribution list CSV', () => {
	it('parses all rows successfully', () => {
		const csv = distributionCsv([
			makeDistributionRow({ project: 'Alpha' }),
			makeDistributionRow({ project: 'Beta', schoolLatitude: '40.7128', schoolLongitude: '-74.0060' }),
		]);
		const { boxes, errors } = parseDistributionCsv(csv);

		expect(errors).toHaveLength(0);
		expect(boxes).toHaveLength(2);
		expect(boxes[0].project).toBe('Alpha');
		for (const field of Object.keys(boxFields)) {
			if (field !== 'project') expect(boxes[0][field]).toBe(`val_${field}`);
		}
		expect(boxes[0].schoolLatitude).toBe(48.8566);
		expect(boxes[0].adminId).toBe('admin1');
		expect(boxes[1].schoolLongitude).toBe(-74.006);
	});

	it('handles extra content columns', () => {
		const csv = distributionCsv([[...makeDistributionRow(), '100', '50']], ['books', 'pens']);

		const boxes: Record<string, unknown>[] = [];
		Papa.parse<Record<string, string>>(csv, {
			skipEmptyLines: true,
			header: true,
			step: (element) => {
				const values: string[] = Object.values(element.data);
				const result = parseDistributionRow(values, 'admin1');
				if ('box' in result) {
					const contentFields = element.meta.fields!.slice(distributionFields.length);
					if (contentFields.length) {
						result.box.content = {} as Record<string, number>;
						contentFields.forEach((field: string, index: number) => {
							result.box.content[field] = parseInt(values[index + distributionFields.length]);
						});
					}
					boxes.push(result.box);
				}
			},
		});

		expect(boxes).toHaveLength(1);
		expect((boxes[0].content as Record<string, number>).books).toBe(100);
		expect((boxes[0].content as Record<string, number>).pens).toBe(50);
	});

	it.each(requiredFields)('reports an error when the required field "%s" is empty', (field) => {
		const { boxes, errors } = parseDistributionCsv(distributionCsv([makeDistributionRow({ [field]: '' })]));
		expect(boxes).toHaveLength(0);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain(field);
	});

	it('reports errors for invalid coordinates', () => {
		const { errors } = parseDistributionCsv(distributionCsv([makeDistributionRow({ schoolLatitude: 'not_a_number' })]));
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('Latitude');
	});

	it('handles comma-separated decimals in CSV', () => {
		const csv = distributionCsv([makeDistributionRow({ schoolLatitude: '48,8566', schoolLongitude: '2,3522' })], [], ';');
		const { boxes } = parseDistributionCsv(csv, ';');

		expect(boxes).toHaveLength(1);
		expect(boxes[0].schoolLatitude).toBeCloseTo(48.8566, 3);
		expect(boxes[0].schoolLongitude).toBeCloseTo(2.3522, 3);
	});

	it.runIf(optionalFields.length > 0)('allows optional fields to be empty in CSV', () => {
		const empty = Object.fromEntries(optionalFields.map((f) => [f, '']));
		const { boxes, errors } = parseDistributionCsv(distributionCsv([makeDistributionRow(empty)]));

		expect(errors).toHaveLength(0);
		expect(boxes).toHaveLength(1);
		for (const field of optionalFields) expect(boxes[0][field]).toBe('');
	});
});

describe('E2E: GPS coordinates CSV', () => {
	const gpsRow = (key: string, lat = '48.8566', lng = '2.3522') =>
		[...gpsUpdateFields.map((f) => `${key}_${f}`), lat, lng];

	it('parses a valid GPS CSV', () => {
		const { boxes, errors } = parseGpsCsv(gpsCsv([gpsRow('SC001'), gpsRow('SC002', '40.7128', '-74.0060')]));

		expect(errors).toHaveLength(0);
		expect(boxes).toHaveLength(2);
		for (const f of gpsUpdateFields) expect(boxes[0][f]).toBe(`SC001_${f}`);
		expect(boxes[0].schoolLatitude).toBe(48.8566);
		expect(boxes[1].schoolLongitude).toBe(-74.006);
	});

	it('skips header row gracefully', () => {
		const { boxes } = parseGpsCsv(gpsCsv([[...gpsFields], gpsRow('SC001')]));
		expect(boxes).toHaveLength(1);
		expect(boxes[0][firstGps]).toBe(`SC001_${firstGps}`);
	});

	it('reports errors for missing fields', () => {
		const row = gpsRow('SC001');
		row[0] = '';
		const { errors } = parseGpsCsv(gpsCsv([row]));

		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain(firstGps);
	});

	it('handles semicolon-delimited GPS CSV with comma decimals', () => {
		const { boxes } = parseGpsCsv(gpsCsv([gpsRow('SC001', '48,8566', '2,3522')], ';'), ';');

		expect(boxes).toHaveLength(1);
		expect(boxes[0].schoolLatitude).toBeCloseTo(48.8566, 3);
		expect(boxes[0].schoolLongitude).toBeCloseTo(2.3522, 3);
	});

	it('processes multi-row CSV with mixed valid/invalid rows', () => {
		const { boxes, errors } = parseGpsCsv(
			gpsCsv([gpsRow('SC001'), gpsRow('SC002', 'invalid'), gpsRow('SC003', '40.7128', '-74.0060')]),
		);

		expect(boxes).toHaveLength(2);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('Latitude');
		expect(boxes[0][firstGps]).toBe(`SC001_${firstGps}`);
		expect(boxes[1][firstGps]).toBe(`SC003_${firstGps}`);
	});
});
