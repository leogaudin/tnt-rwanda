module.exports = {
	apps: [
		{
			name: "tnt-client",
			script: "npx",
			watch: true,
			interpreter: "none",
			args: "serve --ssl-cert /etc/letsencrypt/live/booktracking.reb.rw/fullchain.pem --ssl-key /etc/letsencrypt/live/booktracking.reb.rw/privkey.pem -p 4242 --cors --single dist/",
		}
	]
}
