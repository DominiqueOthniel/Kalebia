require('dotenv').config();

const { syncSiteDataJs } = require('./site-store');
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;
const app = createApp();

app.listen(PORT, async () => {
  try {
    await syncSiteDataJs();
  } catch (err) {
    console.warn('site-data.js non synchronisé:', err.message);
  }
  console.log('');
  console.log('  Kalebia Portfolio');
  console.log('  ─────────────────────────────────');
  console.log('  Site        → http://localhost:' + PORT);
  console.log('  Back office → http://localhost:' + PORT + '/admin/');
  console.log('  Données     → data/site.json');
  console.log('');
});
