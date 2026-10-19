#!/usr/bin/env node
// Drops the collections of a temporary staging copy. Refuses any database whose name does not start with tnt_staging_.
//   STRING_URI=... node scripts/migration/drop-staging.mjs --db tnt_staging_xx --confirm
import { connect, parseArgs, run } from './lib.mjs';

run(async () => {
	const args = parseArgs();
	if (typeof args.db !== 'string' || !/^tnt_staging_[a-z0-9_]+$/.test(args.db)) throw new Error('--db must be a tnt_staging_* database');
	const db = await connect(args);
	const names = (await db.listCollections().toArray()).map((c) => c.name);
	console.log(`Database: ${db.databaseName}, collections: ${names.join(', ') || '(none)'}${args.confirm ? '' : ' (dry run, pass --confirm to drop)'}`);
	if (!args.confirm) return;
	for (const n of names) await db.collection(n).drop();
	console.log('dropped');
});
