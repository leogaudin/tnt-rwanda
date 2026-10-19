// Recomputes the scan-derived fields (statusChanges, progress, lastScan) of boxes with the server's own
// computeBoxState, directly on the database (not over HTTP: /boxes/reindex would time out on Vercel).
//   STRING_URI=... npx --prefix server tsx scripts/migration/recompute.ts --admin <id|all> [--db <name>] [--batch 5000] [--confirm]
// Without --confirm it computes and prints the before/after `progress` distribution and writes nothing.
import { computeBoxState, groupScansByBox } from '../../server/service/stats';
import { connect, parseArgs, run } from './lib.mjs';

const tally = (counts: Record<string, number>, key: string) => { counts[key] = (counts[key] || 0) + 1; };

run(async () => {
	const args: any = parseArgs();
	if (!args.admin) throw new Error('Usage: recompute.ts --admin <id|all> [--db <name>] [--batch N] [--confirm]');
	const batchSize = Number(args.batch) || 5000;
	const db = await connect(args);
	const boxes = db.collection('boxes');
	const scans = db.collection('scans');

	const adminIds: string[] = args.admin === 'all' ? await boxes.distinct('adminId') : [String(args.admin)];
	console.log(`Database: ${db.databaseName}${args.confirm ? ' (WRITING)' : ' (dry run: nothing is written)'}`);

	for (const [i, adminId] of adminIds.entries()) {
		const before: Record<string, number> = {};
		const after: Record<string, number> = {};
		let total = 0, changed = 0, progressChanged = 0;
		let lastId: any = null;

		for (;;) {
			const batch = await boxes
				.find({ adminId, ...(lastId ? { _id: { $gt: lastId } } : {}) }, { projection: { id: 1, progress: 1, statusChanges: 1, lastScan: 1 } })
				.sort({ _id: 1 })
				.limit(batchSize)
				.toArray();
			if (!batch.length) break;
			lastId = batch[batch.length - 1]._id;

			const scanDocs: any[] = await scans
				.find({ boxId: { $in: batch.map((b) => b.id) } }, { projection: { id: 1, boxId: 1, time: 1, finalDestination: 1, markedAsReceived: 1 } })
				.toArray();
			const byBox = groupScansByBox(scanDocs);

			const updates: any[] = [];
			for (const box of batch) {
				const state = computeBoxState(byBox.get(box.id) as any);
				total++;
				tally(before, box.progress ?? '(missing)');
				tally(after, state.progress);
				const same = JSON.stringify(box.statusChanges ?? null) === JSON.stringify(state.statusChanges) && JSON.stringify(box.lastScan ?? null) === JSON.stringify(state.lastScan) && box.progress === state.progress;
				if (!same) { changed++; updates.push({ updateOne: { filter: { _id: box._id }, update: { $set: state } } }); }
				if (box.progress !== state.progress) progressChanged++;
			}
			if (args.confirm && updates.length) await boxes.bulkWrite(updates, { ordered: false });
		}

		console.log(JSON.stringify({ admin: `admin${i + 1}`, adminId, boxes: total, boxesChanged: changed, progressChanged, progressBefore: before, progressAfter: after, written: !!args.confirm }, null, 2));
	}
	if (!args.confirm) console.log('\nDry run only. Explain every difference between before and after, then rerun with --confirm.');
});
