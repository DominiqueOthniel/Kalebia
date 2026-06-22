const fs = require('fs').promises;
const { accessSync } = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function resolveDataFile() {
  const candidates = [
    path.join(ROOT, 'data', 'site.json'),
    path.join(__dirname, '..', '..', 'data', 'site.json'),
    path.join('/var/task', 'data', 'site.json'),
  ];
  for (const file of candidates) {
    try {
      accessSync(file);
      return file;
    } catch {
      /* fichier absent à cet emplacement */
    }
  }
  return path.join(ROOT, 'data', 'site.json');
}

const DATA_FILE = resolveDataFile();
const SITE_DATA_JS = path.join(ROOT, 'public', 'js', 'site-data.js');

function isServerless() {
  return Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
}

async function readSite() {
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

async function writeSite(data) {
  if (isServerless()) {
    throw new Error('La sauvegarde n’est pas disponible sur l’hébergement statique Netlify.');
  }
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
