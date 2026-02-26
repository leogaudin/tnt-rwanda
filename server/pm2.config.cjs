module.exports = {
	apps: [{
		name: 'tnt-server',
		script: './index.ts',
		interpreter: './node_modules/.bin/tsx',
		watch: true,
		env_production: {
			NODE_ENV: 'production'
		},
		env_development: {
			NODE_ENV: 'development'
		}
	}]
}
