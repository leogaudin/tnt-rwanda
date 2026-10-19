import { schoolView } from './specific';

export interface SchoolViewTarget {
	/** Box field the view is based on (e.g. `school`, or `lgea` when no school is set). */
	field: string;
	value: string;
}

/**
 * The "school" of a box: the first field of `schoolView.fields` with a
 * non-empty value. Null when none has one, in which case no school name is
 * shown and the school modal must not be offered (querying an empty value
 * would match every box of the account).
 */
export function getSchoolView(
	box: Record<string, any>,
	fields: readonly string[] = schoolView.fields,
): SchoolViewTarget | null {
	for (const field of fields) {
		const value = box[field];
		if (typeof value === 'string' && value.trim() !== '') return { field, value };
	}
	return null;
}
