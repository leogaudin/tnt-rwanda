import { defineConfig } from 'vitest/config';
import path from 'path';
import { countryDir } from './countries-select';

export default defineConfig({
	resolve: {
		alias: [
			// Per-package country configs (client and app both use the alias `@country`).
			{ find: /^@country\/config$/, replacement: path.join(countryDir('client'), 'config.ts') },
			{ find: /^@country\/config\.json$/, replacement: path.join(countryDir('app'), 'config.json') },
			{ find: /^@country\/locales\//, replacement: path.join(countryDir('client'), 'locales') + '/' },
			...Object.entries({
			'@server': path.resolve(__dirname, '../server'),
			'@client': path.resolve(__dirname, '../client/src'),
			'@app': path.resolve(__dirname, '../app/src'),
			express: path.resolve(__dirname, '../server/node_modules/express'),
			'@chakra-ui/react': path.resolve(__dirname, '../client/node_modules/@chakra-ui/react'),
			'@react-native-async-storage/async-storage': path.resolve(__dirname, '../app/node_modules/@react-native-async-storage/async-storage'),
			'react-router-dom': path.resolve(__dirname, '../client/node_modules/react-router-dom'),
			'react-helmet-async': path.resolve(__dirname, '../client/node_modules/react-helmet-async'),
			react: path.resolve(__dirname, '../client/node_modules/react'),
			'react-dom': path.resolve(__dirname, '../client/node_modules/react-dom'),
			}).map(([find, replacement]) => ({ find, replacement })),
		],
	},
	test: {
		include: ['**/*.test.ts', '**/*.test.tsx'],
	},
});