#!/usr/bin/env node
// Copies scans that only exist inside a box (legacy `box.scans`) into the scans collection, because optimized only reads
// the collection. Idempotent: scans whose `id` is already in the collection are skipped. Never touches the boxes.
//   STRING_URI=... node scripts/migration/backfill-embedded-scans.mjs --db <staging name> [--confirm]
// Without --confirm it only reports. Writes need --db <staging name> or --production.
import { connect, parseArgs, run } from './lib.mjs';

run(async () => {
	const args = parseArgs();
	const db = await connect(args);
	const boxes = db.collection('boxes');
	const scans = db.collection('scans');
	console.log(`Database: ${db.databaseName}${args.confirm ? ' (WRITING)' : ' (dry run: nothing is written)'}`);

	const known = new Set();
	for await (const s of scans.find({}, { projection: { id: 1, _id: 0 } })) known.add(s.id);

	const toInsert = [];
	const skipped = { alreadyInCollection: 0, unusable: 0 };
	for await (const box of boxes.find({ 'scans.0': { $exists: true } }, { projection: { id: 1, adminId: 1, scans: 1 } })) {
		for (const s of box.scans) {
			if (!s || !s.id) { skipped.unusable++; continue; }
			if (known.has(s.id)) { skipped.alreadyInCollection++; continue; }
			const doc = {
				id: s.id,
				boxId: s.boxId ?? box.id,
				adminId: s.adminId ?? box.adminId,
				operatorId: s.operatorId,
				time: s.time,
				location: s.location,
				finalDestination: !!s.finalDestination,
				markedAsReceived: !!s.markedAsReceived,
				...(s.comment !== undefined ? { comment: s.comment } : {}),
			};
			const missing = ['operatorId', 'time', 'location'].filter((k) => doc[k] === undefined || doc[k] === null);
			if (missing.length) { skipped.unusable++; continue; }
			known.add(s.id);
			toInsert.push(doc);
		}
	}

	console.log(JSON.stringify({ toInsert: toInsert.length, ...skipped, boxes: [...new Set(toInsert.map((d) => d.boxId))].length }));
	if (!args.confirm) return console.log('Dry run only. Rerun with --confirm to insert.');
	if (toInsert.length) {
		const r = await scans.insertMany(toInsert, { ordered: false });
		console.log(`Inserted ${r.insertedCount} scans.`);
	}
	console.log('Run recompute.ts next: the affected boxes get their status from these scans.');
});
