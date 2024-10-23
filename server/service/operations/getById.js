import { handle400Error, handle200Success, handle404Error } from '../errorHandlers.js';
import { requireApiKey } from '../apiKey.js';

export const getById = (Model, apiKeyNeeded = true) => async (req, res) => {
	try {
		if (apiKeyNeeded) {
			return requireApiKey(req, res, async () => {
				const instance = await Model.findOne({ id: req.params.id });

				if (!instance) {
					return handle404Error(res);
				}

				return handle200Success(res, instance);
			});
		}

		const instance = await Model.findOne({ id: req.params.id });

		if (!instance) {
			return handle404Error(res);
		}

		return handle200Success(res, instance);
	} catch (error) {
		console.error(error);
		return handle400Error(res, error);
	}
};
