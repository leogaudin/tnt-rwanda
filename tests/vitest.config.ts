import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	resolve: {
		alias: {
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
		},
	},
	test: {
		include: ['**/*.test.ts', '**/*.test.tsx'],
	},
});