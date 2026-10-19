// READ-ONLY checks after a legacy database has been migrated.
//   STRING_URI=... npx --prefix server tsx scripts/migration/verify.ts [--audit audit.json] [--db <name>]
import fs from 'node:fs';
import { computeBoxState, groupScansByBox } from '../../server/service/stats';
import { connect, parseArgs, run, REQUIRED_INDEXES, sameKey } from './lib.mjs';

run(async () => {
	const args: any = parseArgs();
	const db = await connect(args);
	const boxes = db.collection('boxes');
	const scans = db.collection('scans');
	const failures: string[] = [];
	const ok = (msg: string) => console.log(`  ok   ${msg}`);
	const fail = (msg: string) => { failures.push(msg); console.log(`  FAIL ${msg}`); };

	console.log(`Database: ${db.databaseName}`);
	const counts = { boxes: await boxes.countDocuments({}), scans: await scans.countDocuments({}) };
	if (typeof args.audit === 'string') {
		const audit = JSON.parse(fs.readFileSync(args.audit, 'utf8'));
		for (const c of ['boxes', 'scans'] as const) {
			counts[c] === audit.counts[c] ? ok(`${c} count equals the audit (${counts[c]})`) : fail(`${c}: ${counts[c]} now, ${audit.counts[c]} in the audit`);
		}
	} else console.log('  (no --audit file: counts not compared)');

	const noProgress = await boxes.countDocuments({ progress: { $in: [null] } });
	noProgress === 0 ? ok('every box has a progress') : fail(`${noProgress} boxes have no progress`);

	for (const [collection, wanted] of Object.entries(REQUIRED_INDEXES)) {
		const have = (await db.collection(collection).indexes()).map((i) => i.key);
		for (const { key } of wanted) have.some((k) => sameKey(k, key)) ? ok(`${collection} index ${JSON.stringify(key)}`) : fail(`${collection} index ${JSON.stringify(key)} is missing`);
	}

	const sample = await boxes.aggregate([{ $sample: { size: 50 } }, { $project: { id: 1, statusChanges: 1, progress: 1, lastScan: 1 } }]).toArray();
	const scanDocs: any[] = await scans.find({ boxId: { $in: sample.map((b) => b.id) } }, { projection: { id: 1, boxId: 1, time: 1, finalDestination: 1, markedAsReceived: 1 } }).toArray();
	const byBox = groupScansByBox(scanDocs);
	const inconsistent = sample.filter((b) => {
		const s = computeBoxState(byBox.get(b.id) as any);
		return JSON.stringify(b.statusChanges ?? null) !== JSON.stringify(s.statusChanges) || b.progress !== s.progress || JSON.stringify(b.lastScan ?? null) !== JSON.stringify(s.lastScan);
	});
	inconsistent.length === 0 ? ok(`${sample.length} sampled boxes agree with their scans`) : fail(`${inconsistent.length}/${sample.length} sampled boxes disagree with their scans (e.g. ${inconsistent.slice(0, 3).map((b) => b.id).join(', ')})`);

	if (failures.length) { console.log(`\n${failures.length} check(s) failed.`); process.exitCode = 1; }
	else console.log('\nAll checks passed.');
});
