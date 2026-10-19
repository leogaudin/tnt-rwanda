#!/usr/bin/env node
// READ-ONLY audit of a legacy (JavaScript-era) country database before it is served by the current server.
//   STRING_URI=... node scripts/migration/audit.mjs <country> [--db <name>] [--out audit.json]
// Uses only aggregate (no $out/$merge), find, countDocuments, indexes. One pass over boxes and one over scans, so it
// stays usable on large databases. Prints no personal data: admins are numbered, box ids are only listed as examples.
import fs from 'node:fs';
import { connect, loadServerConfig, parseArgs, run, REQUIRED_INDEXES, sameKey } from './lib.mjs';

const HEX128 = /^[0-9a-f]{128}$/i;
const EMBEDDED_SAMPLE = 200;

const log = (msg) => console.error(`[audit ${new Date().toISOString().slice(11, 19)}] ${msg}`);
const nonEmpty = (f) => ({ $cond: [{ $gt: [{ $strLenCP: { $toString: { $ifNull: [`$${f}`, ''] } } }, 0] }, 1, 0] });

run(async () => {
	const args = parseArgs();
	const country = args._[0];
	if (!country) throw new Error('Usage: audit.mjs <country> [--db <name>] [--out file]');
	const config = await loadServerConfig(country);
	const db = await connect(args);
	const boxes = db.collection('boxes');
	const scans = db.collection('scans');
	const admins = db.collection('admins');
	const opts = { allowDiskUse: true, maxTimeMS: 30 * 60 * 1000 };

	const report = { country, database: db.databaseName, generatedAt: new Date().toISOString() };
	const stop = [];
	const fieldNames = Object.keys(config.boxFields);

	log('sizes and indexes');
	report.sizes = {};
	for (const c of ['boxes', 'scans']) {
		const [s] = await db.collection(c).aggregate([{ $collStats: { storageStats: {} } }]).toArray().catch(() => [null]);
		report.sizes[c] = s ? { documents: s.storageStats.count, dataBytes: s.storageStats.size, indexBytes: s.storageStats.totalIndexSize } : 'unavailable';
	}
	report.indexes = {};
	for (const c of ['boxes', 'scans']) {
		const have = (await db.collection(c).indexes()).map((i) => i.key);
		report.indexes[c] = { existing: have, missing: REQUIRED_INDEXES[c].filter((r) => !have.some((k) => sameKey(k, r.key))).map((r) => r.key) };
	}

	// ── one pass over boxes: per admin and progress value ──
	log('boxes pass (one aggregation)');
	const groups = await boxes.aggregate([
		{
			$group: {
				_id: { adminId: '$adminId', progress: { $ifNull: ['$progress', '(missing)'] } },
				n: { $sum: 1 },
				noStatusChanges: { $sum: { $cond: [{ $eq: [{ $ifNull: ['$statusChanges', null] }, null] }, 1, 0] } },
				noLastScan: { $sum: { $cond: [{ $eq: [{ $ifNull: ['$lastScan', null] }, null] }, 1, 0] } },
				scannedWithoutStatus: { $sum: { $cond: [{ $and: [{ $eq: [{ $ifNull: ['$statusChanges', null] }, null] }, { $ne: [{ $ifNull: ['$lastScan', null] }, null] }] }, 1, 0] } },
				withEmbeddedScans: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: [{ $cond: [{ $isArray: '$scans' }, '$scans', []] }, []] } }, 0] }, 1, 0] } },
				...Object.fromEntries(fieldNames.map((f, i) => [`f${i}`, { $sum: nonEmpty(f) }])),
				gpsReady: { $sum: { $cond: [{ $and: config.gpsMatchFields.map((f) => ({ $gt: [nonEmpty(f), 0] })) }, 1, 0] } },
			},
		},
	], opts).toArray();

	const byAdmin = new Map();
	const totals = { boxes: 0, scannedWithoutStatus: 0, noStatusChanges: 0, noProgress: 0, noLastScan: 0, withEmbeddedScans: 0, gpsReady: 0, nonEmpty: Object.fromEntries(fieldNames.map((f) => [f, 0])) };
	for (const g of groups) {
		const a = byAdmin.get(g._id.adminId) ?? { boxes: 0, progress: {} };
		a.boxes += g.n;
		a.progress[g._id.progress] = (a.progress[g._id.progress] ?? 0) + g.n;
		byAdmin.set(g._id.adminId, a);
		totals.boxes += g.n;
		totals.noStatusChanges += g.noStatusChanges;
		totals.noLastScan += g.noLastScan;
		totals.scannedWithoutStatus += g.scannedWithoutStatus;
		totals.withEmbeddedScans += g.withEmbeddedScans;
		totals.gpsReady += g.gpsReady;
		if (g._id.progress === '(missing)') totals.noProgress += g.n;
		fieldNames.forEach((f, i) => { totals.nonEmpty[f] += g[`f${i}`]; });
	}

	// ── one pass over scans: per admin ──
	log('scans pass (one aggregation)');
	const scanCounts = new Map((await scans.aggregate([{ $group: { _id: '$adminId', n: { $sum: 1 } } }], opts).toArray()).map((r) => [r._id, r.n]));

	report.counts = { admins: await admins.countDocuments({}), boxes: totals.boxes, scans: [...scanCounts.values()].reduce((a, b) => a + b, 0) };
	report.perAdmin = [...byAdmin.entries()]
		.sort((a, b) => b[1].boxes - a[1].boxes)
		.map(([adminId, a], i) => ({ admin: `admin${i + 1}`, adminId, boxes: a.boxes, scans: scanCounts.get(adminId) ?? 0, progress: a.progress }));
	report.scansWithoutBoxAdmin = [...scanCounts.keys()].filter((id) => !byAdmin.has(id)).length;

	report.missing = {
		statusChanges: totals.noStatusChanges,
		progress: totals.noProgress,
		lastScan: totals.noLastScan,
		scannedWithoutStatusChanges: totals.scannedWithoutStatus,
		note: 'statusChanges and lastScan are legitimately empty for boxes that were never scanned',
	};
	if (totals.boxes && totals.scannedWithoutStatus / totals.boxes > 0.01) stop.push(`more than 1% of boxes have a last scan but no statusChanges (${totals.scannedWithoutStatus}/${totals.boxes})`);

	// ── embedded scans (legacy `box.scans`): the current server only reads the scans collection ──
	log('embedded scans (full check against the scans collection)');
	const MAX_IDS = 3_000_000;
	let embeddedReport;
	if (report.counts.scans <= MAX_IDS) {
		const known = new Set();
		for await (const sc of scans.find({}, { projection: { id: 1, _id: 0 } })) known.add(sc.id);
		let entries = 0, missingEntries = 0, boxesWithMissing = 0, boxesOnlyEmbedded = 0;
		const examples = [];
		const perAdminMissing = new Map();
		for await (const b of boxes.find({ 'scans.0': { $exists: true } }, { projection: { id: 1, adminId: 1, scans: 1 } })) {
			const ids = b.scans.map((x) => x && x.id).filter(Boolean);
			entries += ids.length;
			const missing = ids.filter((id) => !known.has(id));
			missingEntries += missing.length;
			if (missing.length) {
				boxesWithMissing++;
				if (missing.length === ids.length) boxesOnlyEmbedded++;
				perAdminMissing.set(b.adminId, (perAdminMissing.get(b.adminId) ?? 0) + 1);
				if (examples.length < 5) examples.push(b.id);
			}
		}
		embeddedReport = {
			boxesWithEmbeddedScans: totals.withEmbeddedScans,
			embeddedScanEntries: entries,
			entriesMissingFromScansCollection: missingEntries,
			boxesWithAnyMissing: boxesWithMissing,
			boxesWhereAllEmbeddedScansAreMissing: boxesOnlyEmbedded,
			exampleBoxIds: examples,
			boxesWithMissingPerAdmin: Object.fromEntries(report.perAdmin.map((a) => [a.admin, perAdminMissing.get(a.adminId) ?? 0]).filter(([, n]) => n)),
		};
		if (boxesWithMissing) stop.push(`${boxesWithMissing} boxes have embedded scans (${missingEntries} entries) that are missing from the scans collection: the current server would ignore them`);
	} else {
		embeddedReport = { boxesWithEmbeddedScans: totals.withEmbeddedScans, note: `more than ${MAX_IDS} scans: full check skipped, check by hand` };
	}
	report.embeddedScans = embeddedReport;

	// ── field names present in the data (one pass) ──
	log('field names pass');
	const keyRows = await boxes.aggregate([
		{ $project: { k: { $map: { input: { $objectToArray: '$$ROOT' }, as: 'e', in: '$$e.k' } } } },
		{ $unwind: '$k' },
		{ $group: { _id: '$k', n: { $sum: 1 } } },
	], opts).toArray();
	const present = Object.fromEntries(keyRows.map((r) => [r._id, r.n]));
	const known = new Set([...fieldNames, '_id', '__v', 'id', 'adminId', 'createdAt', 'scans', 'schoolLatitude', 'schoolLongitude', 'statusChanges', 'content', 'progress', 'lastScan', 'packingListId']);
	report.fields = {
		unknownInData: Object.keys(present).filter((k) => !known.has(k)),
		configFieldsNeverInData: fieldNames.filter((k) => !present[k]),
		nonEmptyPerConfigField: totals.nonEmpty,
		requiredButEmptyInSomeBoxes: Object.entries(config.boxFields).filter(([f, d]) => d.required && totals.boxes && totals.nonEmpty[f] < totals.boxes).map(([f]) => f), // informational: `required` only applies on insert
	};
	report.gpsMatchFields = { fields: config.gpsMatchFields, boxesWithAllNonEmpty: totals.gpsReady };
	if (report.fields.unknownInData.length) stop.push(`fields in the data that the config does not know: ${report.fields.unknownInData.join(', ')}`);

	// ── sort memory risk ──
	report.sortCheck = [];
	for (const a of report.perAdmin.slice(0, 3)) {
		const plan = await boxes.find({ adminId: a.adminId }).sort({ packingListId: 1, _id: 1 }).explain('queryPlanner').catch(() => null);
		report.sortCheck.push({ admin: a.admin, blockingSort: /"stage":"SORT"/.test(JSON.stringify(plan?.queryPlanner?.winningPlan || {})), note: 'blockingSort means the 32MB in-memory sort cap applies until the boxes index is built' });
	}

	// ── admins: passwords must look like the client's SHA-512 hex ──
	const adminDocs = await admins.find({}, { projection: { password: 1 } }).toArray();
	const nonHex = adminDocs.filter((a) => !HEX128.test(String(a.password || '')));
	report.admins = { total: adminDocs.length, passwordNotSha512Hex: nonHex.length };
	if (nonHex.length) stop.push(`${nonHex.length} admins have a password that is not a 128-char hex hash`);

	report.stopAndReport = stop;
	const text = JSON.stringify(report, null, 2);
	if (typeof args.out === 'string') { fs.writeFileSync(args.out, text + '\n'); log(`written to ${args.out}`); }
	console.log(text);
	if (stop.length) console.log('\nSTOP AND REPORT TO THE USER:\n- ' + stop.join('\n- '));
});
