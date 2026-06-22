/**
 * Tests automatisés site public + API admin
 * Usage: node scripts/test-site.mjs
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PASSWORD = process.env.ADMIN_PASSWORD || 'kalebia2024';

const results = [];
let token = null;
let originalHeadline = null;

function pass(name, detail) {
  results.push({ ok: true, name, detail });
  console.log('  ✓', name, detail ? `— ${detail}` : '');
}
function fail(name, detail) {
  results.push({ ok: false, name, detail });
  console.log('  ✗', name, detail ? `— ${detail}` : '');
}

async function fetchText(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  return { res, text };
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  let data = {};
  try { data = await res.json(); } catch { /* empty */ }
  return { res, data };
}

async function testPublicPages() {
  console.log('\n=== Site public ===');

  const home = await fetchText(`${BASE}/`);
  if (home.res.status === 200 && home.text.includes('Kalebie')) pass('GET /', '200 OK');
  else fail('GET /', `status ${home.res.status}`);

  for (const asset of [
    '/css/style.css',
    '/js/site.js',
    '/js/site-data.js',
    '/js/main.js',
    '/assets/favicon.svg',
  ]) {
    const r = await fetch(`${BASE}${asset}`);
    if (r.ok) pass(`GET ${asset}`, String(r.status));
    else fail(`GET ${asset}`, String(r.status));
  }

  const data = await fetchJson(`${BASE}/data/site.json`);
  if (data.res.ok && data.data.meta?.title) {
    originalHeadline = data.data.hero?.headline;
    pass('GET /data/site.json', data.data.meta.title);
  } else fail('GET /data/site.json', String(data.res.status));

  const apiSite = await fetchJson(`${BASE}/api/site`);
  if (apiSite.res.ok && apiSite.data.hero) pass('GET /api/site', 'JSON valide');
  else fail('GET /api/site', String(apiSite.res.status));

  const adminRedirect = await fetch(`${BASE}/admin`, { redirect: 'manual' });
  if ([301, 302, 303, 307, 308].includes(adminRedirect.status)) {
    pass('GET /admin → redirect', adminRedirect.headers.get('location') || '');
  } else fail('GET /admin redirect', String(adminRedirect.status));

  const adminPage = await fetchText(`${BASE}/admin/`);
  if (adminPage.res.ok && adminPage.text.includes('Back office Kalebie')) {
    pass('GET /admin/', 'page admin servie');
  } else fail('GET /admin/', String(adminPage.res.status));

  if (adminPage.text.includes('/admin/js/admin.js')) pass('Admin JS chemin absolu');
  else fail('Admin JS chemin absolu', 'script introuvable');

  if (adminPage.text.includes('type="button"') && adminPage.text.includes('id="login-btn"')) {
    pass('Formulaire login sans submit natif');
  } else fail('Formulaire login sans submit natif');

  const portfolioPage = await fetchText(`${BASE}/portfolio-kalebia.html`);
  if (portfolioPage.text.includes('location.replace') || portfolioPage.text.includes('url=/')) {
    pass('portfolio-kalebia.html redirige vers /');
  } else fail('portfolio-kalebia.html redirect', String(portfolioPage.res.status));

  for (const id of ['hero-name', 'work-list', 'exp-grid', 'navlinks', 'loader', 'burger']) {
    if (home.text.includes(`id="${id}"`)) pass(`HTML #${id} présent`);
    else fail(`HTML #${id} présent`);
  }
}

async function testAuth() {
  console.log('\n=== Authentification admin ===');

  const bad = await fetchJson(`${BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'wrong' }),
  });
  if (bad.res.status === 401) pass('Login mot de passe incorrect → 401');
  else fail('Login incorrect', `status ${bad.res.status}`);

  const good = await fetchJson(`${BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: PASSWORD }),
  });
  if (good.res.ok && good.data.token) {
    token = good.data.token;
    pass('Login mot de passe correct → token');
  } else fail('Login correct', good.data.error || String(good.res.status));

  const meNoAuth = await fetchJson(`${BASE}/api/admin/me`);
  if (meNoAuth.res.status === 401) pass('GET /api/admin/me sans token → 401');
  else fail('GET /api/admin/me sans token', String(meNoAuth.res.status));

  const me = await fetchJson(`${BASE}/api/admin/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (me.res.ok) pass('GET /api/admin/me avec token');
  else fail('GET /api/admin/me avec token', String(me.res.status));
}

async function testSaveAndSync() {
  console.log('\n=== Sauvegarde contenu ===');

  const siteRes = await fetchJson(`${BASE}/api/site`);
  const site = siteRes.data;
  if (!site.hero) { fail('Lecture site pour édition', 'hero manquant'); return; }

  const testValue = `TEST AUTO ${Date.now()}`;
  site.hero.headline = testValue;

  const save = await fetchJson(`${BASE}/api/admin/site`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(site),
  });
  if (save.res.ok) pass('PUT /api/admin/site', 'sauvegarde OK');
  else fail('PUT /api/admin/site', save.data.error || String(save.res.status));

  const afterApi = await fetchJson(`${BASE}/api/site`);
  if (afterApi.data.hero?.headline === testValue) pass('API reflète la modification');
  else fail('API reflète la modification', afterApi.data.hero?.headline);

  const afterData = await fetchJson(`${BASE}/data/site.json`);
  if (afterData.data.hero?.headline === testValue) pass('site.json reflète la modification');
  else fail('site.json reflète la modification');

  const { text: siteDataJs } = await fetchText(`${BASE}/js/site-data.js`);
  if (siteDataJs.includes(testValue)) pass('site-data.js synchronisé');
  else fail('site-data.js synchronisé', 'valeur absente');

  const { text: homeHtml } = await fetchText(`${BASE}/`);
  if (homeHtml.includes('site-data.js') || homeHtml.includes('site.js')) {
    pass('Page publique charge les scripts dynamiques');
  } else fail('Scripts dynamiques sur /');

  // Restaurer headline original
  site.hero.headline = originalHeadline ?? 'Je transforme les communautés en leviers de croissance.';
  await fetchJson(`${BASE}/api/admin/site`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(site),
  });
  pass('Restauration headline originale');
}

async function testProtectedRoutes() {
  console.log('\n=== Routes protégées ===');

  const saveNoAuth = await fetchJson(`${BASE}/api/admin/site`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (saveNoAuth.res.status === 401) pass('PUT /api/admin/site sans token → 401');
  else fail('PUT sans token', String(saveNoAuth.res.status));

  const logout = await fetchJson(`${BASE}/api/admin/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (logout.res.ok) pass('POST /api/admin/logout');
  else fail('POST /api/admin/logout', String(logout.res.status));

  const meAfter = await fetchJson(`${BASE}/api/admin/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (meAfter.res.status === 401) pass('Token révoqué après logout');
  else fail('Token révoqué', String(meAfter.res.status));
}

async function testSiteDataIntegrity() {
  console.log('\n=== Intégrité des données ===');

  const { data: site } = await fetchJson(`${BASE}/api/site`);
  const checks = [
    ['meta.title', site.meta?.title],
    ['hero.headline', site.hero?.headline],
    ['about.title', site.about?.title],
    ['projects.items', Array.isArray(site.projects?.items) && site.projects.items.length > 0],
    ['profile.email', site.profile?.email],
  ];
  for (const [key, val] of checks) {
    if (val) pass(`Champ ${key} présent`);
    else fail(`Champ ${key} présent`, 'manquant ou vide');
  }

  const projects = site.projects?.items || [];
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    if (p.title && p.image) pass(`Projet ${i + 1} titre + image`);
    else fail(`Projet ${i + 1}`, 'incomplet');
  }
}

async function testAssets() {
  console.log('\n=== Assets & fichiers ===');

  const { data: site } = await fetchJson(`${BASE}/api/site`);
  const assets = new Set();
  if (site.portrait) assets.add('/' + String(site.portrait).replace(/^\/+/, ''));
  if (site.cv?.path) assets.add('/' + String(site.cv.path).replace(/^\/+/, ''));
  (site.projects?.items || []).forEach(p => {
    if (p.image) assets.add('/' + String(p.image).replace(/^\/+/, ''));
    (p.gallery || []).forEach(g => assets.add('/' + String(g).replace(/^\/+/, '')));
  });
  assets.add('/assets/og-image.svg');

  for (const asset of [...assets].sort()) {
    const r = await fetch(`${BASE}${asset}`);
    if (r.ok) pass(`Asset ${asset}`);
    else fail(`Asset ${asset}`, `HTTP ${r.status}`);
  }

  const adminCss = await fetch(`${BASE}/admin/css/admin.css`);
  if (adminCss.ok) pass('GET /admin/css/admin.css');
  else fail('GET /admin/css/admin.css', String(adminCss.status));

  const adminJs = await fetchText(`${BASE}/admin/js/admin.js`);
  if (adminJs.res.ok && adminJs.text.includes('function doLogin')) pass('admin.js contient doLogin()');
  else fail('admin.js doLogin');

  const siteData = await fetchText(`${BASE}/js/site-data.js`);
  if (siteData.text.includes('window.SITE_DATA')) pass('site-data.js expose SITE_DATA');
  else fail('site-data.js format');
}

async function main() {
  console.log('Tests Kalebie —', BASE);
  try {
    await fetch(`${BASE}/`);
  } catch (e) {
    console.error('\nServeur inaccessible. Lancez: npm start');
    process.exit(1);
  }

  await testPublicPages();
  await testAuth();
  await testSaveAndSync();
  await testProtectedRoutes();
  await testSiteDataIntegrity();
  await testAssets();

  const failed = results.filter(r => !r.ok);
  console.log('\n══════════════════════════════════');
  console.log(`Résultat: ${results.length - failed.length}/${results.length} tests OK`);
  if (failed.length) {
    console.log('\nÉchecs:');
    failed.forEach(f => console.log(' -', f.name, f.detail || ''));
    process.exit(1);
  }
  console.log('Tous les tests sont passés.\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
