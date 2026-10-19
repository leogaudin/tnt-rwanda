const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {resolveCountry} = require('./countries/select');

// The country is chosen at bundle time: TNT_COUNTRY, else countries/default.json.
const {country, configPath} = resolveCountry();

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
	// Metro's cache doesn't know about TNT_COUNTRY: without this, building a
	// second country on the same machine can reuse the first one's bundle.
	cacheVersion: country,
	resolver: {
		resolveRequest: (context, moduleName, platform) => {
			if (moduleName === '@country/config.json') {
				return {type: 'sourceFile', filePath: configPath};
			}
			return context.resolveRequest(context, moduleName, platform);
		},
	},
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
