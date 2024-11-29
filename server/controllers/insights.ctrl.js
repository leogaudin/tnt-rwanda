import express from 'express';
import Admin from '../models/admins.model.js';
import Box from '../models/boxes.model.js';
const router = express.Router();

router.post('/toggle_insights', async (req, res) => {
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

router.get('/is_public/:id', async (req, res) => {
	try {
		const { id } = req.params;

		const admin = await Admin.findOne({ id });
		if (!admin)
			return res.status(404).json({ message: 'Admin not found' });

		return res.status(200).json({ publicInsights: admin.publicInsights });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

router.get('/raw_insights/:adminId', async (req, res) => {
	try {
		const found = await Admin.findOne({ id: req.params.adminId });
		if (!found)
			return res.status(404).json({ success: false, error: `Admin not found` });

		const skip = parseInt(req.query.skip);
		const limit = parseInt(req.query.limit);
		delete req.query.skip;
		delete req.query.limit;

		const filters = {
			adminId: req.params.adminId,
			...req.query,
		};

		if (found.publicInsights || req.headers['x-authorization']) {
			const boxes = await Box
							.find(
								filters,
								'statusChanges project'
							)
							.skip(skip)
							.limit(limit);

			if (!boxes.length)
				return res.status(404).json({ success: false, error: `No boxes available` });

			return res.status(200).json({
				success: true,
				data: {
					boxes
				}
			});
		} else {
			return res.status(401).json({ success: false, error: `Unauthorized` });
		}
	} catch (error) {
		console.error(error);
		return res.status(500).json({ success: false, error: error });
	}
});

// router.get('/projects/:id', async (req, res) => {
// 	const { id } = req.params;
// 	const user = await Admin.findOne({ id });

// 	if (!user)
// 		return res.status(404).json({ message: 'Admin not found' });

// 	if (!user.publicInsights) {
// 		requireApiKey(req, res, async (admin) => {
// 			const projects = await Box.find({ adminId: id }).distinct('project');
// 			return handle200Success(res, projects);
// 		});
// 	}
// 	else {
// 		const projects = await Box.find({ adminId: id }).distinct('project');
// 		return handle200Success(res, projects);
// 	}
// });

export default router;
