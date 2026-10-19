#!/usr/bin/env node
// Creates the indexes the current server needs. Idempotent, never drops anything.
//   STRING_URI=... node scripts/migration/indexes.mjs [--db <name>] [--confirm]
// Without --confirm it only prints what is missing.
import { connect, parseArgs, run, REQUIRED_INDEXES, sameKey } from './lib.mjs';

run(async () => {
	const args = parseArgs();
	const db = await connect(args);
	console.log(`Database: ${db.databaseName}${args.confirm ? '' : ' (dry run, pass --confirm to create)'}`);
	for (const [collection, wanted] of Object.entries(REQUIRED_INDEXES)) {
		const col = db.collection(collection);
		const have = await col.indexes().catch(() => []); // collection may not exist yet
		for (const { key } of wanted) {
			const exists = have.some((i) => sameKey(i.key, key));
			if (exists) { console.log(`  ${collection} ${JSON.stringify(key)}: already exists`); continue; }
			if (!args.confirm) { console.log(`  ${collection} ${JSON.stringify(key)}: MISSING (would create)`); continue; }
			await col.createIndex(key);
			console.log(`  ${collection} ${JSON.stringify(key)}: created`);
		}
	}
});
