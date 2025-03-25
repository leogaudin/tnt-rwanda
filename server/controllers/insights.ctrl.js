import express from 'express';
import Admin from '../models/admins.model.js';
import Box from '../models/boxes.model.js';
import { getQuery } from '../service/index.js';
const router = express.Router();

/**
 * @description	Toggles the publicInsights setting
 */
router.post('/toggle', async (req, res) => {
	try {
		const apiKey = req.headers['x-authorization'];

		if (!apiKey)
			return res.status(401).json({ message: 'Unauthorized' });

		const admin = await Admin.findOne({ apiKey });

		if (!admin)
			return res.status(404).json({ message: 'Admin not found' });

		admin.publicInsights = !!!admin.publicInsights;
		await admin.save();
		return res.status(200).json({ message: 'Successfully set insights to ' + admin.publicInsights, publicInsights: admin.publicInsights });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

/**
 * @description	Retrieve the status changes of the current admin's boxes
 */
router.post('/', async (req, res) => {
	try {
		const { skip, limit, filters } = getQuery(req);
		if (!filters.adminId)
			return res.status(400).json({ error: 'Admin ID required' });

		const admin = await Admin.findOne({ id: filters.adminId });
		if (!admin)
			return res.status(404).json({ error: `Admin not found` });

		if (admin.publicInsights || req.headers['x-authorization'] === admin.apiKey) {
			const boxes = await Box
							.find(
								{ ...filters },
								{ project: 1, statusChanges: 1, content: 1, _id: 0 }
							)
							.skip(skip)
							.limit(limit);

			if (!boxes.length)
				return res.status(404).json({ error: `No boxes available` });

			return res.status(200).json({ boxes });
		} else {
			return res.status(401).json({ error: `Unauthorized` });
		}
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: error });
	}
});

export default router;
