// Runs the whole suite once per country (TNT_COUNTRY=<c>), stopping at the first failure.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const countries = fs
	.readdirSync(path.join(root, 'server/countries'), { withFileTypes: true })
	.filter((d) => d.isDirectory())
	.map((d) => d.name)
	.sort();

for (const country of countries) {
	console.log(`\n=== ${country} ===`);
	try {
		execFileSync('npx', ['vitest', 'run'], {
			stdio: 'inherit',
			cwd: path.dirname(fileURLToPath(import.meta.url)),
			env: { ...process.env, TNT_COUNTRY: country },
		});
	} catch {
		console.error(`\nTests failed for ${country}`);
		process.exit(1);
	}
}
console.log(`\nAll ${countries.length} countries passed.`);
