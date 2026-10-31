const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const cors = require('cors');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const careerRoadmap = require('./features/career-roadmap/api/router');

const app = express();
const port = Number(process.env.PORT || 5000);
const host = process.env.HOST || '127.0.0.1';
const allowedOrigins = new Set((process.env.FRONTEND_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean));

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.has(origin)) return callback(null, true);
  return callback(new Error('Origin is not allowed by CORS.'));
} }));
app.use(express.json({ limit: '1mb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'career-roadmap-backend' }));
app.use('/api/career', rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/api/career', careerRoadmap);
app.use((error, _req, res, _next) => {
  console.error('[career-roadmap]', error.message);
  res.status(500).json({ error: 'The request failed. Check the backend console for details.' });
});

app.listen(port, host, () => {
  console.log(`Career Roadmap API listening at http://${host}:${port}`);
  console.log(`AI mode: ${process.env.AI_DEMO_MODE !== 'false' ? 'demo' : 'Gemini'}`);
  console.log(`Data directory: ${require('./features/career-roadmap/storage/jsonStore').dataRoot}`);
});
