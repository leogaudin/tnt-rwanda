module.exports = {
	apps: [{
		name: 'tnt-server',
		script: './index.ts',
		interpreter: 'node',
		interpreter_args: '--import tsx',
		watch: true,
		env_production: {
			NODE_ENV: 'production'
		},
		env_development: {
			NODE_ENV: 'development'
		}
	}]
}
