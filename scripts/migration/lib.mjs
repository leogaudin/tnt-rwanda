// Shared helpers for the migration scripts. They run against the database named by STRING_URI
// (optionally another database name on the same cluster with --db, used for staging copies).
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const requireFromServer = createRequire(path.join(root, 'server/package.json'));
export const mongoose = requireFromServer('mongoose');

export function parseArgs(argv = process.argv.slice(2)) {
	const args = { _: [] };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a.startsWith('--')) {
			const next = argv[i + 1];
			if (next === undefined || next.startsWith('--')) args[a.slice(2)] = true;
			else { args[a.slice(2)] = next; i++; }
		} else args._.push(a);
	}
	return args;
}

/** Connects with STRING_URI (never printed). `--db` selects another database on the same cluster. */
export async function connect(args) {
	const odd = Object.keys(args).filter((k) => k !== '_' && !/^[a-z][a-z0-9-]*$/i.test(k));
	if (odd.length) throw new Error(`Unrecognised argument(s) ${JSON.stringify(odd)}: pass each option and its value as separate words.`);
	if (args.confirm && typeof args.db !== 'string' && !args.production) {
		throw new Error('--confirm writes to the database in STRING_URI. Pass --db <staging name> to rehearse on a copy, or --production to write to the real database.');
	}
	if (!process.env.STRING_URI) throw new Error('STRING_URI is not set (put it in the environment, e.g. `set -a; . ./server/.env; set +a`).');
	await mongoose.connect(process.env.STRING_URI, {
		serverSelectionTimeoutMS: 20000,
		...(typeof args.db === 'string' ? { dbName: args.db } : {}),
	});
	return mongoose.connection.db;
}

export const redact = (msg) => String(msg).replace(/mongodb(\+srv)?:\/\/[^\s]+/g, '<uri>');

/** Server country config, read from server/countries/<country>/config.ts (needs Node >= 22.18). */
export async function loadServerConfig(country) {
	const file = path.join(root, 'server/countries', country, 'config.ts');
	if (!fs.existsSync(file)) throw new Error(`Unknown country "${country}"`);
	return (await import(pathToFileURL(file).href)).default;
}

export async function run(main) {
	try {
		await main();
		await mongoose.disconnect();
	} catch (e) {
		console.error('ERROR:', redact(e.message));
		await mongoose.disconnect().catch(() => {});
		process.exit(1);
	}
}

/** Indexes optimized needs (the old server only had _id and, on boxes, id). */
export const REQUIRED_INDEXES = {
	boxes: [
		{ key: { adminId: 1, packingListId: 1, _id: 1 } },
		{ key: { adminId: 1, _id: 1 } },
		{ key: { id: 1 } },
	],
	scans: [
		{ key: { adminId: 1, time: 1, _id: 1 } },
		{ key: { boxId: 1 } },
	],
};

export const sameKey = (a, b) => JSON.stringify(a) === JSON.stringify(b);
