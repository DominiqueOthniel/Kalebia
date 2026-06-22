const express = require('express');
const path = require('path');
const { ROOT, readSite, writeSite } = require('../site-store');
const { createToken, revokeToken, extractToken, requireAuth } = require('../auth');
const { upload, relativeAssetPath } = require('../uploads');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'kalebia2024';

const router = express.Router();

router.get('/site', async (_req, res) => {
  try {
    res.json(await readSite());
  } catch {
    res.status(500).json({ error: 'Impossible de lire les données du site.' });
  }
});

router.post('/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Mot de passe incorrect.' });
    return;
  }
  res.json({ token: createToken() });
});

router.post('/admin/logout', requireAuth, (req, res) => {
  revokeToken(extractToken(req));
  res.json({ ok: true });
});

router.get('/admin/me', requireAuth, (_req, res) => {
  res.json({ ok: true });
});

router.put('/admin/site', requireAuth, async (req, res) => {
  try {
    await writeSite(req.body);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erreur lors de la sauvegarde.' });
  }
});

router.post('/admin/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Fichier manquant ou format non autorisé.' });
      return;
    }

    const site = await readSite();
    const type = req.body.type;
    const relativePath = relativeAssetPath(req.file.filename, type);

    if (type === 'cv') {
      site.cv = site.cv || {};
      site.cv.path = relativePath;
    } else if (type === 'project-splash') {
      const i = Number(req.body.projectIndex);
      if (!site.projects?.items?.[i]) {
        res.status(400).json({ error: 'Projet introuvable.' });
        return;
      }
      site.projects.items[i].image = relativePath;
    } else if (type === 'project-gallery') {
      const i = Number(req.body.projectIndex);
      if (!site.projects?.items?.[i]) {
        res.status(400).json({ error: 'Projet introuvable.' });
        return;
      }
      if (!site.projects.items[i].gallery) site.projects.items[i].gallery = [];
      site.projects.items[i].gallery.push(relativePath);
    } else if (type === 'project-video') {
      const i = Number(req.body.projectIndex);
      if (!site.projects?.items?.[i]) {
        res.status(400).json({ error: 'Projet introuvable.' });
        return;
      }
      if (!site.projects.items[i].videos) site.projects.items[i].videos = [];
      site.projects.items[i].videos.push(relativePath);
    } else if (type === 'partner-logo') {
      const i = Number(req.body.partnerIndex);
      if (!site.partners?.items?.[i]) {
        res.status(400).json({ error: 'Partenaire introuvable.' });
        return;
      }
      site.partners.items[i].logo = relativePath;
    } else {
      site.portrait = relativePath;
    }

    await writeSite(site);
    res.json({ ok: true, path: relativePath, site });
  } catch {
    res.status(500).json({ error: 'Erreur lors de l\u2019upload.' });
  }
});

router.delete('/admin/gallery', requireAuth, async (req, res) => {
  try {
    const { projectIndex, imagePath, mediaPath, mediaType } = req.body || {};
    const i = Number(projectIndex);
    const site = await readSite();
    const item = site.projects?.items?.[i];
    const listName = mediaType === 'video' ? 'videos' : 'gallery';
    const targetPath = mediaPath || imagePath;
    if (!item || !Array.isArray(item[listName])) {
      res.status(400).json({ error: 'Média introuvable.' });
      return;
    }
    item[listName] = item[listName].filter(function(g){ return g !== targetPath; });
    await writeSite(site);
    res.json({ ok: true, site });
  } catch {
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

module.exports = router;
