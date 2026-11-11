const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const cors = require('cors');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const careerRoadmap = require('./features/career-roadmap/api/router');
const { supabase } = require('./features/career-roadmap/storage/supabaseStore');

const app = express();
const port = Number(process.env.PORT || 5000);
const host = process.env.HOST || '0.0.0.0';
const allowedOrigins = new Set((process.env.FRONTEND_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean));
// Allow local backend origins (used by Safe Exam Browser kiosk connecting directly to port 5000)
allowedOrigins.add(`http://${host}:${port}`);
allowedOrigins.add(`http://localhost:${port}`);
allowedOrigins.add(`http://127.0.0.1:${port}`);

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false, // allow loading local scripts for SEB kiosk
}));
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.has(origin)) return callback(null, true);
  return callback(new Error('Origin is not allowed by CORS.'));
} }));
app.use(express.json({ limit: '1mb' }));
// Serve exam frontend assets for Safe Exam Browser
app.use('/api/career/exam-assets', express.static(path.join(__dirname, 'features/career-roadmap/exam')));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'career-roadmap-backend' }));
app.use('/api/career', rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));

// Supabase JWT auth middleware — attaches req.user from the Bearer token
app.use('/api/career', async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  const token = authHeader.slice(7);
  if (!token || !supabase) return next();
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      req.user = { id: user.id, email: user.email };
    }
  } catch (err) {
    console.warn('[auth] Supabase token verification failed:', err.message);
  }
  next();
});

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
