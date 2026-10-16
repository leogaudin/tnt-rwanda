import express, { Request, Response } from 'express';
import Admin from '../models/admins.model';
import Box from '../models/boxes.model';
import { requireApiKey } from '../service/apiKey';
import { generateId, getQuery, sanitizeContent, tiebreakDirection } from '../service/index';
import lzstring from 'lz-string';
import { recomputeBoxes } from '../service/recompute';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
	try {
		requireApiKey(req, res, async (admin: any) => {
			const { data } = req.body;

			if (!data) {
				return res.status(400).json({ error: 'No data provided' });
			}

			const payload = lzstring.decompressFromEncodedURIComponent(data);
			const instances = JSON.parse(payload!);
			instances.forEach((instance: any) => {
				instance.createdAt = new Date().getTime();
				instance.id = generateId();
				instance.adminId = admin.id;
				if (instance.content !== undefined)
					instance.content = sanitizeContent(instance.content);
			});

			const inserted = await Box.insertMany(instances);
			return res.status(201).json({
				message: 'Items created!',
				insertedCount: inserted.length,
			});
		});
	} catch (error) {
		console.error('Error occurred during createMany:', error);
		return res.status(500).json({ error });
	}
});

router.get('/one/:id', async (req: Request, res: Response) => {
	try {
		requireApiKey(req, res, async (admin: any) => {
			const box = await Box.findOne(
				{ id: req.params.id, adminId: admin.id },
				{ scans: 0 }
			);
			if (!box)
				return res.status(404).json({ error: `Box not found` });

			return res.status(200).json({ box });
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error });
	}
});

router.post('/query', async (req: Request, res: Response) => {
	try {
		requireApiKey(req, res, async (admin: any) => {
			const found = await Admin.findOne({ id: admin.id });
			if (!found)
				return res.status(404).json({ error: `Admin not found` });

			const { skip, limit, filters, sort } = getQuery(req);

			// The `_id` tiebreaker must point the SAME WAY as the caller's last sort
			// key. A mixed-direction sort like { packingListId: 1, _id: -1 } cannot be
			// served by traversing any single index — MongoDB falls back to a blocking
			// sort, which throws at 32MB on these Atlas tiers. A uniform-direction sort
			// is served by an index built in EITHER direction (forward or backward
			// traversal), so this also makes the fix independent of how the backing
			// index happened to be created.
			const tiebreak = tiebreakDirection(sort);

			const boxes = await Box
				.find(
					{ ...filters, adminId: admin.id },
					{ scans: 0 },
				)
				// `_id` is appended as a tiebreaker so the ordering is a TOTAL order.
				// skip/limit pagination is only correct over a stable sort: with no
				// sort (sort === {}) or a non-unique one (packingListId), MongoDB is
				// free to order equal/unsorted documents differently per query, so
				// pages overlap and other documents are never returned at all —
				// silently dropping rows from exports. `_id` is unique, so ties are
				// impossible and every page is disjoint.
				.sort({ ...sort, _id: tiebreak })
				.skip(skip)
				.limit(limit)
				// Defense-in-depth: even if the sort can't be served by an index
				// (missing index, ad-hoc sort field), let it spill to disk instead
				// of throwing the blocking-sort memory error mid-pagination. NB: the
				// limit is 32MB on the Atlas tiers these deployments run on (verified
				// via explain: memLimit 33554432), not the 100MB MongoDB default, and
				// allowDiskUse is ignored on Atlas M0/Flex — so the backing index, not
				// this call, is what actually keeps the sort off the heap.
				.allowDiskUse(true);

			if (!boxes.length)
				return res.status(404).json({ error: `No boxes available` });

			return res.status(200).json({ boxes });
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error });
	}
});

router.post('/distinct/:field', async (req: Request, res: Response) => {
	try {
		const { filters } = getQuery(req);
		if (typeof filters.adminId !== 'string' || !filters.adminId)
			return res.status(400).json({ error: 'Admin ID required' });

		const admin = await Admin.findOne({ id: filters.adminId });
		if (!admin)
			return res.status(404).json({ error: `Admin not found` });

		if (admin.publicInsights || req.headers['x-authorization'] === admin.apiKey) {
			const field = req.params.field;
			if (!field)
				return res.status(400).json({ error: 'Field required' });

			const distinct = await Box.distinct(field, { ...filters });
			return res.status(200).json({ distinct });
		} else {
			return res.status(401).json({ error: `Unauthorized` });
		}
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error });
	}
});

router.post('/count', async (req: Request, res: Response) => {
	try {
		const { filters } = getQuery(req);
		if (typeof filters.adminId !== 'string' || !filters.adminId)
			return res.status(400).json({ error: 'Admin ID required' });

		const admin = await Admin.findOne({ id: filters.adminId });
		if (!admin)
			return res.status(404).json({ error: `Admin not found` });

		if (admin.publicInsights || req.headers['x-authorization'] === admin.apiKey) {
			const count = await Box.countDocuments({ ...filters });
			return res.status(200).json({ count });
		} else {
			return res.status(401).json({ error: `Unauthorized` });
		}
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error });
	}
});

router.delete('/', async (req: Request, res: Response) => {
	try {
		requireApiKey(req, res, async (admin: any) => {
			const { filters } = getQuery(req);

			const results = await Promise.all([
				Box.deleteMany({ ...filters, adminId: admin.id }),
			]);

			return res.status(200).json({ deletedCount: results[0].deletedCount });
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error });
	}
});

router.post('/coords', async (req: Request, res: Response) => {
	try {
		requireApiKey(req, res, async (admin: any) => {
			const { coords } = req.body;
			const coordsUpdate = coords.map((box: any) => ({
				updateMany: {
					filter: { schoolCode: box.schoolCode, adminId: admin.id },
					update: { $set: { schoolLatitude: box.schoolLatitude, schoolLongitude: box.schoolLongitude } },
					multi: true,
				},
			}));

			const coordsUpdateResult = await Box.bulkWrite(coordsUpdate);
			const updated = coordsUpdateResult.modifiedCount;
			const matched = coordsUpdateResult.matchedCount;

			if (updated === 0)
				return res.status(200).json({ updated, matched, recalculated: 0 });

			await recomputeBoxes(
				{
					adminId: admin.id,
					$or: coords.map((box: any) => ({ schoolCode: box.schoolCode })),
				},
				{ finalDestinations: true },
			);

			return res.status(200).json({ updated, matched });
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error });
	}
});

router.post('/boxes/reindex', async (req: Request, res: Response) => {
	try {
		requireApiKey(req, res, async (admin: any) => {
			const { boxes, reindexed } = await recomputeBoxes({ adminId: admin.id });
			if (!boxes)
				return res.status(404).json({ error: `No boxes available` });

			return res.status(200).json({ reindexed });
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error });
	}
});

router.post('/boxes/recalculate', async (req: Request, res: Response) => {
	try {
		requireApiKey(req, res, async (admin: any) => {
			const { boxes, recalculated, reindexed } = await recomputeBoxes(
				{ adminId: admin.id },
				{ finalDestinations: true },
			);
			if (!boxes)
				return res.status(404).json({ error: `No boxes available` });

			return res.status(200).json({ recalculated, reindexed });
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error });
	}
});

export default router;