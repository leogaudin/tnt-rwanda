#!/usr/bin/env node
// Emergency rollback of the recompute: puts `statusChanges`, `progress` and `lastScan` of every box back to the values
// in a backup that was restored into a staging copy. Nothing else is touched (indexes and backfilled scans are harmless
// to the old server and stay).
//
//   1. mongorestore --uri="$STRING_URI" [--gzip] --nsFrom 'test.*' --nsTo 'tnt_staging_<c>.*' --dir ~/tnt-backups/<c>-<date>
//   2. STRING_URI=... node scripts/migration/restore-derived-fields.mjs --from tnt_staging_<c>                      (dry run)
//   3. STRING_URI=... node scripts/migration/restore-derived-fields.mjs --from tnt_staging_<c> --production --confirm
//   4. node scripts/migration/drop-staging.mjs --db tnt_staging_<c> --confirm
//
// Scans received after the backup are not undone; the old server recomputes a box's status only when it receives a scan.
import { connect, mongoose, parseArgs, run } from './lib.mjs';

const FIELDS = ['statusChanges', 'progress', 'lastScan'];
const BATCH = 5000;

run(async () => {
	const args = parseArgs();
	if (typeof args.from !== 'string' || !/^tnt_staging_[a-z0-9_]+$/.test(args.from)) throw new Error('--from must be a tnt_staging_* database holding the restored backup');
	if (args.confirm && !args.production) throw new Error('--confirm writes to the real database: pass --production as well');
	const target = await connect(args);
	const source = mongoose.connection.client.db(args.from);
	if (target.databaseName === source.databaseName) throw new Error('source and target are the same database');
	console.log(`Restoring ${FIELDS.join(', ')} from ${source.databaseName} into ${target.databaseName}${args.confirm ? ' (WRITING)' : ' (dry run)'}`);

	let seen = 0, different = 0, missingInTarget = 0;
	let ops = [];
	const flush = async () => {
		if (args.confirm && ops.length) await target.collection('boxes').bulkWrite(ops, { ordered: false });
		ops = [];
	};

	const current = target.collection('boxes');
	const projection = Object.fromEntries(FIELDS.map((f) => [f, 1]));
	const plan = (old, now) => {
		const set = {}, unset = {};
		for (const f of FIELDS) {
			if (old[f] === undefined) { if (now[f] !== undefined) unset[f] = ''; }
			else if (JSON.stringify(old[f]) !== JSON.stringify(now[f])) set[f] = old[f];
		}
		const hasSet = Object.keys(set).length > 0, hasUnset = Object.keys(unset).length > 0;
		if (!hasSet && !hasUnset) return null;
		return { updateOne: { filter: { _id: old._id }, update: { ...(hasSet ? { $set: set } : {}), ...(hasUnset ? { $unset: unset } : {}) } } };
	};

	const processBatch = async (batch) => {
		const nowById = new Map((await current.find({ _id: { $in: batch.map((b) => b._id) } }, { projection }).toArray()).map((b) => [String(b._id), b]));
		for (const old of batch) {
			seen++;
			const now = nowById.get(String(old._id));
			if (!now) { missingInTarget++; continue; }
			const op = plan(old, now);
			if (op) { different++; ops.push(op); }
		}
		if (ops.length >= BATCH) await flush();
	};

	let batch = [];
	for await (const old of source.collection('boxes').find({}, { projection })) {
		batch.push(old);
		if (batch.length >= 1000) { await processBatch(batch); batch = []; }
	}
	if (batch.length) await processBatch(batch);
	await flush();
	console.log(JSON.stringify({ boxesInBackup: seen, boxesToRestore: different, boxesNoLongerInDatabase: missingInTarget, written: !!args.confirm }));
	if (!args.confirm) console.log('Dry run only.');
});
