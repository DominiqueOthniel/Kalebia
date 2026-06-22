const fs = require('fs').promises;
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'data', 'site.json');
const SITE_DATA_JS = path.join(ROOT, 'public', 'js', 'site-data.js');

async function readSite() {
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

async function writeSite(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
  await syncSiteDataJs(data);
}

async function syncSiteDataJs(data) {
  const payload = data || await readSite();
  const js = '/** Généré automatiquement — ne pas éditer. Source : data/site.json */\nwindow.SITE_DATA=' +
    JSON.stringify(payload, null, 2) + ';\n';
  await fs.mkdir(path.dirname(SITE_DATA_JS), { recursive: true });
  await fs.writeFile(SITE_DATA_JS, js, 'utf8');
}

module.exports = { ROOT, DATA_FILE, SITE_DATA_JS, readSite, writeSite, syncSiteDataJs };
