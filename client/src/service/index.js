import i18n from '../language';

import Login from '../pages/Login'
import Home from '../pages/Home';
import Boxes from '../pages/Boxes';
import Scans from '../pages/Scans';
import Import from '../pages/Import';
import Export from '../pages/Export';
import Advanced from '../pages/Advanced';
import PublicInsights from '../pages/PublicInsights';

import { IoHome, IoClose, IoCheckmark, IoPrint } from 'react-icons/io5';
import { FaBoxOpen, FaChevronUp, FaChevronDown, FaMapPin, FaEye, FaClock, FaQrcode, FaPlus, FaCopy, FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import { IoMdExit, IoMdRefresh, IoMdSettings } from 'react-icons/io';
import { BiImport, BiExport } from 'react-icons/bi';
import { MdDelete } from 'react-icons/md';
import { TbProgressCheck } from "react-icons/tb";
import { BsMailbox } from "react-icons/bs";

import { palette } from '../theme';
import { API_URL } from './specific';
import { computeInsights } from './stats';

export const user = JSON.parse(localStorage.getItem('user'));

export const navbarWidth = '250px';

/**
 * Calls the API with the given parameters
 *
 * @param {String} 			method		HTTP method to be used
 * @param {String} 			endpoint	Endpoint to be called
 * @param {Object}			data		Data to be sent in the request
 * @param {Object}			headers		Headers to be sent in the request
 * @param {AbortSignal}		signal		AbortSignal to be used in the request
 *
 * @returns {Promise<Response>}			Response of the request
 */
export const callAPI = async (method, endpoint, data = null, headers = {}, signal = null) => {
	const authorization = user?.apiKey || '';
	const requestHeaders = {
		'Content-Type': 'application/json',
		'Accept-Encoding': 'gzip, deflate',
		'X-Authorization': authorization,
		...headers,
	};

	const response = await fetch(`${API_URL}/${endpoint}`, {
		method: method,
		headers: requestHeaders,
		body: data ? JSON.stringify(data) : null,
		signal: signal,
	});

	return response;
}

/**
 * Fetches all boxes from the API
 *
 * @param {String}										id			ID of the user
 * @param {Array<{field: String, value: String}>}		filters		Filters to be applied to the request
 *
 * @returns {Promise<Array>}			Array of boxes
 */
export async function fetchAllBoxes(filters = []) {
	try {
		const BUFFER_LENGTH = 7000;
		const boxes = [];

		const query = filters
						.map(({ field, value }) => {
							if (value?.length)
								return `${field}=${value}`
						})
						.filter((x) => x)
						.join('&');

		const response = await callAPI('GET', `boxes/count${query ? `?${query}` : ''}`);
		const json = await response.json();
		const count = json?.data?.count || 0;

		while (boxes.length < count) {
			const skip = boxes.length;

			const request = await callAPI('GET', `boxes/admin/${user.id}?skip=${skip}&limit=${BUFFER_LENGTH}${query ? `&${query}` : ''}`);

			if (request.status !== 200 || !request.ok)
				break;

			const response = await request.json();

			if (response?.data?.boxes)
				boxes.push(...response?.data?.boxes);
		}

		boxes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
		return boxes;
	} catch (err) {
		console.error(err);
		return null;
	}
}

export async function fetchInsights(id) {
	try {
		const BUFFER_LENGTH = 15_000;
		const boxes = [];

		while (true) {
			const skip = boxes.length;

			const request = await callAPI(
				'GET',
				`raw_insights/${id}?skip=${skip}&limit=${BUFFER_LENGTH}`
			);

			if (request.status !== 200 || !request.ok)
				break;

			const response = await request.json();

			if (response?.data?.boxes)
				boxes.push(...response?.data?.boxes);
		}

		boxes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
		return computeInsights(boxes);
	} catch (err) {
		console.error(err);
		return null;
	}
}

export async function fetchAllScans() {
	try {
		const BUFFER_LENGTH = 10000;
		const scans = [];

		while (true) {
			const skip = scans.length;

			const request = await callAPI('GET', `scans?skip=${skip}&limit=${BUFFER_LENGTH}`);

			if (request.status !== 200 || !request.ok)
				break;

			const response = await request.json();

			if (response?.data?.scans)
				scans.push(...response?.data?.scans);
		}

		return scans;
	} catch (err) {
		console.error(err);
		return null;
	}
}

export async function fetchBoxScans(boxId) {
	const response = await callAPI(
		'GET',
		`box/${boxId}/scans`
	);

	const json = await response.json();

	return json.data.scans;
}

export const icons = {
	home: IoHome,
	box: FaBoxOpen,
	exit: IoMdExit,
	check: IoCheckmark,
	close: IoClose,
	up: FaChevronUp,
	down: FaChevronDown,
	left: FaChevronLeft,
	right: FaChevronRight,
	pin: FaMapPin,
	eye: FaEye,
	clock: FaClock,
	qr: FaQrcode,
	import: BiImport,
	export: BiExport,
	plus: FaPlus,
	refresh: IoMdRefresh,
	delete: MdDelete,
	print: IoPrint,
	settings: IoMdSettings,
	copy: FaCopy,
	almost: TbProgressCheck,
	mailbox: BsMailbox,
}

export const getRoutes = () => [
	{
		path: '/auth',
		component: Login,
		public: true,
		worksWithoutBoxes: true,
	},
	{
		path: '/',
		component: Home,
		title: i18n.t('home'),
		inNav: true,
		icon: icons.home,
	},
	{
		path: '/boxes',
		component: Boxes,
		title: i18n.t('boxes'),
		inNav: true,
		icon: icons.box,
	},
	{
		path: '/scans',
		component: Scans,
		title: i18n.t('scans'),
		inNav: true,
		icon: icons.qr,
	},
	{
		path: '/import',
		component: Import,
		title: i18n.t('import'),
		inNav: true,
		icon: icons.import,
		worksWithoutBoxes: true,
	},
	{
		path: '/export',
		component: Export,
		title: i18n.t('export'),
		inNav: true,
		icon: icons.export,
	},
	{
		path: '/advanced',
		component: Advanced,
		title: i18n.t('advanced'),
		inNav: true,
		icon: icons.settings,
	},
	{
		path: '/insights/:id',
		component: PublicInsights,
		title: i18n.t('insights'),
		public: true,
		worksWithoutBoxes: true,
	},
];

export const progresses = [
	{
		key: 'total',
		color: palette.text,
		userAvailable: false,
	},
	{
		key: 'noScans',
		color: palette.error.main,
		userAvailable: true,
		icon: icons.close,
		inTimeline: true,
	},
	{
		key: 'inProgress',
		color: palette.warning.main,
		userAvailable: true,
		icon: icons.clock,
		inTimeline: true,
	},
	{
		key: 'received',
		color: palette.blue.main,
		userAvailable: true,
		icon: icons.eye,
		inTimeline: true,
	},
	{
		key: 'reachedGps',
		color: palette.cyan.main,
		userAvailable: true,
		icon: icons.pin,
		inTimeline: true,
	},
	{
		key: 'reachedAndReceived',
		color: palette.teal.main,
		userAvailable: true,
		icon: icons.almost,
		inTimeline: true,
	},
	{
		key: 'validated',
		color: palette.success.main,
		userAvailable: true,
		icon: icons.check,
		inTimeline: true,
	},
]
