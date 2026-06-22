const fs = require('fs/promises');
const path = require('path');
const { ROOT, DATA_FILE, syncSiteDataJs } = require('../server/site-store');

const PUBLIC_DIR = path.join(ROOT, 'public');
const ADMIN_SRC = path.join(ROOT, 'admin');

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(from, to);
    else await fs.copyFile(from, to);
  }
}

async function build() {
  await fs.mkdir(path.join(PUBLIC_DIR, 'data'), { recursive: true });
  await fs.copyFile(DATA_FILE, path.join(PUBLIC_DIR, 'data', 'site.json'));
  await syncSiteDataJs();
  await copyDir(ADMIN_SRC, path.join(PUBLIC_DIR, 'admin'));
  console.log('Build Netlify terminé : public/ prêt à être publié.');
}

build().catch(function(err) {
  console.error(err);
  process.exit(1);
});
