const serverless = require('serverless-http');
const express = require('express');
const api = require('../../server/routes/api');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use('/api', api);

module.exports.handler = serverless(app);
