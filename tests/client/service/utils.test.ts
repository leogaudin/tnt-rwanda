// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
	haversineDistance,
	groupByProperty,
	getLngLatCenter,
	getZoomLevel,
} from '@client/service/utils.js';

describe('haversineDistance', () => {
	it('returns 0 for identical points', () => {
		const c = { latitude: 48.8566, longitude: 2.3522 };
		expect(haversineDistance(c, c)).toBe(0);
	});

	it('returns known distance Paris→London ≈ 334 km', () => {
		const paris = { latitude: 48.8566, longitude: 2.3522 };
		const london = { latitude: 51.5074, longitude: -0.1278 };
		const d = haversineDistance(paris, london) / 1000;
		expect(d).toBeGreaterThan(330);
		expect(d).toBeLessThan(345);
	});

	it('is symmetric', () => {
		const paris = { latitude: 48.8566, longitude: 2.3522 };
		const london = { latitude: 51.5074, longitude: -0.1278 };
		const ab = haversineDistance(paris, london);
		const ba = haversineDistance(london, paris);
		expect(ab).toBeCloseTo(ba, 5);
	});

	it('handles antipodal points', () => {
		const a = { latitude: 0, longitude: 0 };
		const b = { latitude: 0, longitude: 180 };
		const d = haversineDistance(a, b) / 1000;
		expect(d).toBeGreaterThan(20000);
	});

	it('handles equator distance', () => {
		const a = { latitude: 0, longitude: 0 };
		const b = { latitude: 0, longitude: 1 };
		const d = haversineDistance(a, b) / 1000;
		expect(d).toBeGreaterThan(110);
		expect(d).toBeLessThan(112);
	});
});

describe('groupByProperty', () => {
	it('groups objects by a given property', () => {
		const items = [
			{ type: 'a', val: 1 },
			{ type: 'b', val: 2 },
			{ type: 'a', val: 3 },
		];
		const grouped = groupByProperty(items, 'type');
		expect(Object.keys(grouped)).toEqual(expect.arrayContaining(['a', 'b']));
		expect(grouped.a).toHaveLength(2);
		expect(grouped.b).toHaveLength(1);
	});

	it('returns empty object for empty array', () => {
		expect(groupByProperty([], 'type')).toEqual({});
	});
});

describe('getLngLatCenter', () => {
	it('returns the single point when only one coordinate', () => {
		// Paris as [lng, lat]
		const center = getLngLatCenter([[2.3522, 48.8566]]);
		expect(center[0]).toBeCloseTo(2.3522, 2);
		expect(center[1]).toBeCloseTo(48.8566, 2);
	});

	it('returns midpoint for two symmetric points', () => {
		const center = getLngLatCenter([[10, 0], [-10, 0]]);
		expect(center[0]).toBeCloseTo(0, 1);
	});

	it('returns an array with two elements', () => {
		// Paris and London as [lng, lat]
		expect(getLngLatCenter([[2.3522, 48.8566], [-0.1278, 51.5074]])).toHaveLength(2);
	});

	it('returns latitude in [-90, 90] for far-east longitudes (Philippines regression)', () => {
		// Manila scan: lng=121.02, lat=14.55. A buggy [lat, lng] implementation
		// would yield a "latitude" outside [-90, 90] which maplibre-gl rejects.
		const center = getLngLatCenter([[121.0211041, 14.5548397]]);
		expect(center[0]).toBeCloseTo(121.0211041, 4); // longitude
		expect(center[1]).toBeCloseTo(14.5548397, 4);  // latitude
		expect(center[1]).toBeGreaterThanOrEqual(-90);
		expect(center[1]).toBeLessThanOrEqual(90);
	});
});

describe('getZoomLevel', () => {
	it('returns a number', () => {
		expect(getZoomLevel([[48.8566, 2.3522], [51.5074, -0.1278]])).toBeTypeOf('number');
	});

	it('returns higher zoom for closer points', () => {
		const close = getZoomLevel([[48.8566, 2.3522], [48.8570, 2.3530]]);
		const far = getZoomLevel([[48.8566, 2.3522], [51.5074, -0.1278]]);
		expect(close).toBeGreaterThan(far);
	});

	it('returns max zoom for identical points', () => {
		const zoom = getZoomLevel([[48.8566, 2.3522], [48.8566, 2.3522]]);
		expect(zoom).toBeGreaterThanOrEqual(10);
	});
});