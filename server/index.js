import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import cors from 'cors';
import compression from 'compression';
import https from 'https';
import http from 'http';
import fs from 'fs';

import boxesController from './controllers/boxes.ctrl.js';
import scansController from './controllers/scans.ctrl.js';
import authController from './controllers/auth.ctrl.js';
import insightsController from './controllers/insights.ctrl.js';

dotenv.config();

import mongoose from 'mongoose';
const mongoString = process.env.STRING_URI;

mongoose.connect(mongoString, {
	serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
	socketTimeoutMS: 300000, // Close sockets after 5 minutes of inactivity
});
const database = mongoose.connection;

database.on('error', (error) => {
	console.error(error)
})

database.once('connected', () => {
	console.info('Database Connected');
})

const app = express();
app.disable('x-powered-by');
const apiPort = 8000;
const payloadLimit = '4.5mb';

app.use(compression({
	threshold: 0,
}));
app.use(bodyParser.urlencoded({ extended: true, limit: payloadLimit }));
app.use(
	cors({
		origin: '*',
		methods: 'GET,POST,PUT,DELETE, PATCH',
		credentials: true,
		maxAge: 3600,
	})
);
app.use(bodyParser.raw({ type: 'application/octet-stream', limit: payloadLimit }));
app.use(bodyParser.json({ limit: payloadLimit }));

app.get('/', (req, res) => {
	res.send('Hello World!');
});

app.use('/api/boxes', boxesController);
app.use('/api/scan', scansController);
app.use('/api/auth', authController);
app.use('/api/insights', insightsController);

https.createServer({
	cert: fs.readFileSync('/etc/letsencrypt/live/booktracking.reb.rw/fullchain.pem'),
	key: fs.readFileSync('/etc/letsencrypt/live/booktracking.reb.rw/privkey.pem'),
}, app).listen(apiPort, () => console.info(`Server running on port ${apiPort}`));

http.createServer((req, res) => {
        const host = req.headers['host'] || '';
        const redirectUrl = `https://${host}${req.url}`;
        res.writeHead(301, { "Location": redirectUrl });
        res.end();
}).listen(80, () => console.info(`HTTP redirect server running on port 80`));

export default app;
