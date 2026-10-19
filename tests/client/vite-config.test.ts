import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-ignore: plain JS config file
import { readHtmlFields, resolveCountry } from '../../client/vite.config.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'tnt-vite-'));

describe('client vite config helpers', () => {
	it('readHtmlFields reads title and shortName, handling quotes and escapes', () => {
		const dir = tmp();
		fs.writeFileSync(
			path.join(dir, 'config.ts'),
			`export default {\n\tname: 'TnT X',\n\ttitle: "Rwanda Textbooks' Tracking",\n\tshortName: 'It\\'s TnT',\n} satisfies X;\n`,
		);
		expect(readHtmlFields(dir)).toEqual({ title: "Rwanda Textbooks' Tracking", shortName: "It's TnT" });
	});

	it('readHtmlFields fails loudly when a field is missing', () => {
		const dir = tmp();
		fs.writeFileSync(path.join(dir, 'config.ts'), `export default { name: 'x' }`);
		expect(() => readHtmlFields(dir)).toThrow(/title/);
	});

	it('resolveCountry: TNT_COUNTRY, default.json, and unknown code', () => {
		const available = fs.readdirSync(path.resolve(__dirname, '../../client/countries'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
		expect(resolveCountry({ TNT_COUNTRY: available[0] }).country).toBe(available[0]);
		expect(resolveCountry({}).country).toBe(JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../client/countries/default.json'), 'utf8')).country);
		expect(() => resolveCountry({ TNT_COUNTRY: 'atlantis' })).toThrow(/Unknown TNT_COUNTRY "atlantis"/);
	});
});
