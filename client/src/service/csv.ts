import Papa from 'papaparse';
import { callAPI } from '.';
import lzstring from 'lz-string';
import { boxFields, gpsUpdateFields } from './specific';

export type ParseSuccess = { box: Record<string, any> };
export type ParseError = { error: string };
export type ParseResult = ParseSuccess | ParseError;

const DISTRIBUTION_FIELDS = [...Object.keys(boxFields), 'schoolLatitude', 'schoolLongitude'];
const GPS_FIELDS: string[] = [...gpsUpdateFields, 'schoolLatitude', 'schoolLongitude'];

function parseCoord(value: string): number {
	return parseFloat(value.replace(',', '.'));
}

export function parseDistributionRow(rowData: string[], adminId: string): ParseResult {
	const newBox: Record<string, any> = {};

	for (const [index, field] of DISTRIBUTION_FIELDS.entries()) {
		if (
			!rowData[index] &&
			(boxFields[field]?.required || field === 'schoolLatitude' || field === 'schoolLongitude')
		) {
			return { error: `Field ${field} is missing.` };
		}
		newBox[field] = rowData[index];
	}

	newBox.schoolLatitude = parseCoord(newBox.schoolLatitude);
	newBox.schoolLongitude = parseCoord(newBox.schoolLongitude);
	newBox.adminId = adminId;

	if (isNaN(newBox.schoolLatitude) || isNaN(newBox.schoolLongitude)) {
		return { error: `Latitude ${newBox.schoolLatitude} or Longitude ${newBox.schoolLongitude} is invalid.` };
	}

	return { box: newBox };
}

export function parseGPSUpdateRow(rowData: string[], isFirstRow = false): ParseResult {
	const newBox: Record<string, any> = {};

	for (const [index, field] of GPS_FIELDS.entries()) {
		if (!rowData[index]) {
			return { error: `Field ${field} is missing.` };
		}
		newBox[field] = rowData[index];
	}

	if (!isFirstRow) {
		if (
			isNaN(parseCoord(newBox.schoolLatitude)) ||
			isNaN(parseCoord(newBox.schoolLongitude))
		) {
			return { error: `Latitude ${newBox.schoolLatitude} or Longitude ${newBox.schoolLongitude} is invalid.` };
		}
	}

	newBox.schoolLatitude = parseCoord(newBox.schoolLatitude);
	newBox.schoolLongitude = parseCoord(newBox.schoolLongitude);

	if (isNaN(newBox.schoolLatitude) || isNaN(newBox.schoolLongitude)) {
		return { error: `Latitude ${newBox.schoolLatitude} or Longitude ${newBox.schoolLongitude} is invalid.` };
	}

	return { box: newBox };
}

export type ParsedContent = {
	content: Record<string, number>;
	/** Columns or cells that were left out, with the reason. */
	skipped: { field: string; kind: 'header' | 'value'; reason: string }[];
};

/**
 * Turns the extra CSV columns (everything after the distribution fields) into a
 * box's content. Columns with a blank header (e.g. a trailing comma) and cells
 * that are not a non-negative number are left out instead of being stored as an
 * item named "" or as NaN.
 */
export function parseContent(fields: string[], values: string[]): ParsedContent {
	const content: Record<string, number> = {};
	const skipped: ParsedContent['skipped'] = [];

	fields.forEach((field, index) => {
		if (!field.trim()) {
			skipped.push({ field, kind: 'header', reason: 'its header is empty' });
			return;
		}

		const quantity = parseInt(values[index]);
		if (!Number.isFinite(quantity) || quantity < 0) {
			skipped.push({ field, kind: 'value', reason: `"${values[index] ?? ''}" is not a valid quantity` });
			return;
		}

		content[field] = quantity;
	});

	return { content, skipped };
}

type SetOutput = (updater: (prev: string[]) => string[]) => void;

export async function uploadDistributionList(file: File, setOutput: SetOutput) {
	const data = await file.text();
	const boxes: Record<string, any>[] = [];
	const warned = new Set<string>();
	const user = JSON.parse(localStorage.getItem('user')!);

	Papa.parse(data, {
		skipEmptyLines: true,
		header: true,
		step: (element) => {
			const values = Object.values(element.data as Record<string, string>);
			const result = parseDistributionRow(values, user.id);

			if ('error' in result) {
				setOutput((prev) => [
					...prev,
					`Error parsing following item:`,
					JSON.stringify(values),
					result.error,
					`-------`,
				]);
				return;
			}

			const newBox = result.box;
			const contentFields = element.meta.fields!.slice(DISTRIBUTION_FIELDS.length);
			if (contentFields.length) {
				const { content, skipped } = parseContent(
					contentFields,
					values.slice(DISTRIBUTION_FIELDS.length),
				);
				newBox.content = content;

				// Warn once per column and kind of problem, not once per row.
				for (const { field, kind, reason } of skipped) {
					const key = `${kind}|${field}`;
					if (warned.has(key)) continue;
					warned.add(key);
					setOutput((prev) => [
						...prev,
						`Warning: ignored column "${field}" (${reason}${kind === 'value' ? '; other rows with this problem are not listed' : ''}).`,
					]);
				}
			}

			boxes.push(newBox);
		},
		complete: () => {
			if (!boxes.length) {
				setOutput((prev) => [...prev, `No valid items found.`]);
				return;
			}

			setOutput((prev) => [
				...prev,
				`Retrieved ${boxes.length} items.`,
				`Uploading...`,
			]);

			const BUFFER_LENGTH = 10_000;
			const numBoxes = boxes.length;
			let uploaded = 0;
			let uploadedBytes = 0;
			const responses: any[] = [];

			const processBuffer = (buffer: Record<string, any>[]) => {
				buffer.forEach((box, i) => {
					box.packingListId = uploaded + i;
				});
				const payload = {
					data: lzstring.compressToEncodedURIComponent(JSON.stringify(buffer)),
				};
				uploadedBytes += payload.data.length;
				callAPI('POST', 'boxes', payload)
					.then(async (res) => {
						if (!res.ok) {
							const text = await res.text();
							throw new Error(text || res.statusText);
						}
						return res.json();
					})
					.then((res) => {
						responses.push(res);
						uploaded += buffer.length;
						setOutput((prev) => [
							...prev,
							`${uploaded} items uploaded (${Math.round(uploadedBytes / 1000)} KB).`,
						]);
						if (uploaded < numBoxes) {
							processBuffer(boxes.slice(uploaded, uploaded + BUFFER_LENGTH));
						} else {
							const inserted = responses.reduce((acc, r) => acc + r.insertedCount, 0);
							setOutput((prev) => [
								...prev,
								`-------`,
								`All items uploaded.`,
								`${inserted} items added to database.`,
								`-------`,
								`Reload the page to see the changes.`,
								`-------`,
							]);
						}
					})
					.catch((err) => {
						console.error(err);
						setOutput((prev) => [
							...prev,
							`Error uploading items`,
							err.response?.data?.error?.message || err.message,
						]);
					});
			};

			processBuffer(boxes.slice(0, BUFFER_LENGTH));
		},
	});
}

export async function updateGPSCoordinates(file: File, setOutput: SetOutput) {
	const data = await file.text();
	const boxes: Record<string, any>[] = [];

	Papa.parse(data, {
		skipEmptyLines: true,
		step: (element) => {
			const result = parseGPSUpdateRow(element.data as string[], boxes.length === 0);
			if ('error' in result) {
				setOutput((prev) => [
					...prev,
					`Error parsing following item:`,
					JSON.stringify(element.data),
					result.error,
					`-------`,
				]);
			} else {
				boxes.push(result.box);
			}
		},
		complete: () => {
			if (!boxes.length) {
				setOutput((prev) => [...prev, `No valid items found.`]);
				return;
			}

			setOutput((prev) => [
				...prev,
				`Retrieved ${boxes.length} items.`,
				`Uploading...`,
			]);

			const BUFFER_LENGTH = 75;
			const numBoxes = boxes.length;
			let uploaded = 0;
			let uploadedBytes = 0;
			let updated = 0;
			const responses: any[] = [];

			const processBuffer = (buffer: Record<string, any>[]) => {
				const payload = { coords: buffer };
				callAPI('POST', 'boxes/coords', payload)
					.then(async (res) => {
						if (!res.ok) {
							const text = await res.text();
							throw new Error(text || res.statusText);
						}
						return res.json();
					})
					.then((res) => {
						responses.push(res);
						uploaded += buffer.length;
						uploadedBytes += JSON.stringify({ boxes: buffer }).length;
						updated += res.updated || 0;
						setOutput((prev) => [...prev, `${res.updated} objects updated.`]);
						if (uploaded < numBoxes) {
							processBuffer(boxes.slice(uploaded, uploaded + BUFFER_LENGTH));
						} else {
							setOutput((prev) => [
								...prev,
								`-------`,
								`Uploaded ${uploaded} coordinates (${Math.round(uploadedBytes / 1000)} KB).`,
								`Updated coordinates of ${updated} objects.`,
								`-------`,
								`Reload the page to see the changes.`,
								`-------`,
							]);
						}
					})
					.catch((err) => {
						console.error(err);
						setOutput((prev) => [
							...prev,
							`Error uploading items`,
							err.response?.data?.error?.message || err.message,
						]);
					});
			};

			processBuffer(boxes.slice(0, BUFFER_LENGTH));
		},
	});
}