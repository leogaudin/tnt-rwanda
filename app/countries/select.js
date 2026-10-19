// Picks the app's country: TNT_COUNTRY, else countries/default.json.
// Used by metro.config.js (and mirrored in android/app/build.gradle).
const fs = require('fs');
const path = require('path');

function resolveCountry(env = process.env) {
	const dir = __dirname;
	const defaultCountry = JSON.parse(fs.readFileSync(path.join(dir, 'default.json'), 'utf8')).country;
	const country = env.TNT_COUNTRY || defaultCountry;
	const configPath = path.join(dir, country, 'config.json');
	if (!fs.existsSync(configPath)) {
		const available = fs
			.readdirSync(dir, { withFileTypes: true })
			.filter(d => d.isDirectory())
			.map(d => d.name);
		throw new Error(`Unknown TNT_COUNTRY "${country}". Available: ${available.join(', ')}`);
	}
	return { country, dir: path.join(dir, country), configPath };
}

module.exports = { resolveCountry };
