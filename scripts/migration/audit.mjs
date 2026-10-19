#!/usr/bin/env node
// READ-ONLY audit of a country's database before migrating it to `optimized` (plan, Phase 8.2).
//   STRING_URI=... node scripts/migration/audit.mjs <country> [--db <name>] [--out audit.json]
// Uses only find/countDocuments/aggregate (no $out/$merge)/indexes/collStats-like counts. Prints no personal data:
// admins are numbered, box ids are only listed as examples.
import fs from 'node:fs';
import { connect, loadServerConfig, parseArgs, run, REQUIRED_INDEXES, sameKey } from './lib.mjs';

const HEX128 = /^[0-9a-f]{128}$/i;

run(async () => {
	const args = parseArgs();
	const country = args._[0];
	if (!country) throw new Error('Usage: audit.mjs <country> [--db <name>] [--out file]');
	const config = await loadServerConfig(country);
	const db = await connect(args);
	const boxes = db.collection('boxes');
	const scans = db.collection('scans');
	const admins = db.collection('admins');

	const report = { country, database: db.databaseName, generatedAt: new Date().toISOString() };
	const stop = [];

	report.counts = { admins: await admins.countDocuments({}), boxes: await boxes.countDocuments({}), scans: await scans.countDocuments({}) };

	// per-admin counts and the progress baseline for the recompute (8.5)
	const adminIds = await boxes.distinct('adminId');
	report.perAdmin = [];
	for (const [i, adminId] of adminIds.entries()) {
		const progress = Object.fromEntries((await boxes.aggregate([{ $match: { adminId } }, { $group: { _id: { $ifNull: ['$progress', '(missing)'] }, n: { $sum: 1 } } }]).toArray()).map((r) => [r._id, r.n]));
		report.perAdmin.push({
			admin: `admin${i + 1}`,
			adminId,
			boxes: await boxes.countDocuments({ adminId }),
			scans: await scans.countDocuments({ adminId }),
			progress,
		});
	}

	// missing derived fields
	report.missing = {};
	for (const f of ['statusChanges', 'progress', 'lastScan']) {
		report.missing[f] = await boxes.countDocuments({ [f]: { $in: [null] } }); // matches null and missing
	}
	if (report.counts.boxes && report.missing.statusChanges / report.counts.boxes > 0.01) stop.push(`more than 1% of boxes lack statusChanges (${report.missing.statusChanges}/${report.counts.boxes})`);

	// embedded scans that are not in the scans collection
	const embedded = await boxes.find({ 'scans.0': { $exists: true } }, { projection: { id: 1, scans: 1 } }).toArray();
	let orphanBoxes = [];
	for (const b of embedded) {
		const ids = b.scans.map((s) => s && s.id).filter(Boolean);
		const found = ids.length ? await scans.countDocuments({ id: { $in: ids } }) : 0;
		if (found < ids.length) orphanBoxes.push(b.id);
	}
	report.embeddedScans = { boxesWithEmbeddedScans: embedded.length, boxesWithScansMissingFromCollection: orphanBoxes.length, exampleBoxIds: orphanBoxes.slice(0, 5) };
	if (orphanBoxes.length) stop.push(`${orphanBoxes.length} boxes have embedded scans missing from the scans collection`);

	// data fields vs the country's boxFields
	const keyRows = await boxes.aggregate([{ $project: { k: { $map: { input: { $objectToArray: '$$ROOT' }, as: 'e', in: '$$e.k' } } } }, { $unwind: '$k' }, { $group: { _id: '$k', n: { $sum: 1 } } }]).toArray();
	const present = Object.fromEntries(keyRows.map((r) => [r._id, r.n]));
	const known = new Set([...Object.keys(config.boxFields), '_id', '__v', 'id', 'adminId', 'createdAt', 'scans', 'schoolLatitude', 'schoolLongitude', 'statusChanges', 'content', 'progress', 'lastScan', 'packingListId']);
	report.fields = {
		unknownInData: Object.keys(present).filter((k) => !known.has(k)),
		configFieldsNeverInData: Object.keys(config.boxFields).filter((k) => !present[k]),
		nonEmptyPerConfigField: {},
	};
	for (const f of Object.keys(config.boxFields)) {
		report.fields.nonEmptyPerConfigField[f] = await boxes.countDocuments({ [f]: { $exists: true, $nin: [null, ''] } });
	}
	if (report.fields.unknownInData.length) stop.push(`fields in the data that the config does not know: ${report.fields.unknownInData.join(', ')}`);
	const requiredEmpty = Object.entries(config.boxFields).filter(([f, d]) => d.required && report.counts.boxes && report.fields.nonEmptyPerConfigField[f] < report.counts.boxes).map(([f]) => f);
	report.fields.requiredButEmptyInSomeBoxes = requiredEmpty; // informational: `required` only applies on insert
	report.gpsMatchFields = { fields: config.gpsMatchFields, boxesWithAllNonEmpty: report.counts.boxes ? await boxes.countDocuments(Object.fromEntries(config.gpsMatchFields.map((f) => [f, { $exists: true, $nin: [null, ''] }]))) : 0 };

	// indexes, sizes, sort memory risk
	report.indexes = {};
	for (const c of ['boxes', 'scans']) {
		const have = (await db.collection(c).indexes()).map((i) => i.key);
		report.indexes[c] = { existing: have, missing: REQUIRED_INDEXES[c].filter((r) => !have.some((k) => sameKey(k, r.key))).map((r) => r.key) };
	}
	report.sizes = {};
	for (const c of ['boxes', 'scans']) {
		const [s] = await db.collection(c).aggregate([{ $collStats: { storageStats: {} } }]).toArray().catch(() => [null]);
		report.sizes[c] = s ? { documents: s.storageStats.count, dataBytes: s.storageStats.size, indexBytes: s.storageStats.totalIndexSize } : 'unavailable';
	}
	report.sortCheck = [];
	for (const a of report.perAdmin.slice(0, 3)) {
		const plan = await boxes.find({ adminId: a.adminId }).sort({ packingListId: 1, _id: 1 }).explain('queryPlanner').catch(() => null);
		const stages = JSON.stringify(plan?.queryPlanner?.winningPlan || {});
		report.sortCheck.push({ admin: a.admin, blockingSort: /"stage":"SORT"/.test(stages), note: 'blockingSort means the 32MB in-memory sort cap applies until the boxes index is built' });
	}

	// admins: passwords must look like the client's SHA-512 hex
	const adminDocs = await admins.find({}, { projection: { password: 1, email: 1 } }).toArray();
	const nonHex = adminDocs.filter((a) => !HEX128.test(String(a.password || '')));
	report.admins = { total: adminDocs.length, passwordNotSha512Hex: nonHex.length };
	if (nonHex.length) stop.push(`${nonHex.length} admins have a password that is not a 128-char hex hash`);

	report.stopAndReport = stop;
	const text = JSON.stringify(report, null, 2);
	if (typeof args.out === 'string') { fs.writeFileSync(args.out, text + '\n'); console.log(`Audit written to ${args.out}`); }
	console.log(text);
	if (stop.length) console.log('\nSTOP AND REPORT TO THE USER:\n- ' + stop.join('\n- '));
});
