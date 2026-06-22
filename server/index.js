require('dotenv').config();

const fs = require('fs').promises;
const express = require('express');
const path = require('path');
const api = require('./routes/api');
const { ROOT, DATA_FILE, syncSiteDataJs } = require('./site-store');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(ROOT, 'public');
const ADMIN_DIR = path.join(ROOT, 'admin');

const app = express();

app.use(express.json({ limit: '2mb' }));

app.get('/data/site.json', async (_req, res) => {
  try {
    res.type('application/json').send(await fs.readFile(DATA_FILE, 'utf8'));
  } catch {
    res.status(500).json({ error: 'Impossible de lire les données du site.' });
  }
});

app.use('/api', api);

app.get('/admin', (req, res, next) => {
  if (req.originalUrl === '/admin') {
    res.redirect(301, '/admin/');
    return;
  }
  next();
});
app.get('/admin/', (_req, res) => {
  res.sendFile(path.join(ADMIN_DIR, 'index.html'));
});
app.use('/admin', express.static(ADMIN_DIR, { index: 'index.html' }));

app.use('/public', (req, res) => {
  const target = req.url === '/' ? '/' : req.url;
  res.redirect(301, target);
});

app.use(express.static(PUBLIC_DIR, { index: 'index.html' }));

app.get('/portfolio-kalebia.html', (_req, res) => {
  res.redirect(301, '/');
});

app.use((req, res) => {
  if (/\.[a-z0-9]+$/i.test(req.path)) {
    res.status(404).type('text/plain').send('Not found');
    return;
  }
  if (req.path.startsWith('/admin')) {
    res.redirect(301, '/admin/');
    return;
  }
  res.status(404).sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, async () => {
  try {
    await syncSiteDataJs();
  } catch (err) {
    console.warn('site-data.js non synchronisé:', err.message);
  }
  console.log('');
  console.log('  Kalebie Portfolio');
  console.log('  ─────────────────────────────────');
  console.log('  Site        → http://localhost:' + PORT);
  console.log('  Back office → http://localhost:' + PORT + '/admin/');
  console.log('  Données     → data/site.json');
  console.log('');
});
