const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;
const { ROOT } = require('./site-store');

const PUBLIC_ASSETS = path.join(ROOT, 'public', 'assets');
const PROJECTS_DIR = path.join(PUBLIC_ASSETS, 'projects');
const PARTNERS_DIR = path.join(PUBLIC_ASSETS, 'partners');

function isProjectMedia(type) {
  return type === 'project-splash' || type === 'project-gallery' || type === 'project-video';
}

const storage = multer.diskStorage({
  destination: async (req, _file, cb) => {
    try {
      const dest = isProjectMedia(req.body.type)
        ? PROJECTS_DIR
        : req.body.type === 'partner-logo'
          ? PARTNERS_DIR
          : PUBLIC_ASSETS;
      await fs.mkdir(dest, { recursive: true });
      cb(null, dest);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (req.body.type === 'cv') {
      cb(null, 'CV-Kalebie-Nyoue-Franck' + (ext || '.pdf'));
      return;
    }
    if (req.body.type === 'project-splash') {
      const idx = String(Number(req.body.projectIndex || 0) + 1).padStart(2, '0');
      cb(null, 'project-' + idx + '-splash' + (ext || '.jpg'));
      return;
    }
    if (req.body.type === 'project-gallery') {
      const idx = String(Number(req.body.projectIndex || 0) + 1).padStart(2, '0');
      cb(null, 'project-' + idx + '-g-' + Date.now().toString(36) + (ext || '.jpg'));
      return;
    }
    if (req.body.type === 'project-video') {
      const idx = String(Number(req.body.projectIndex || 0) + 1).padStart(2, '0');
      cb(null, 'project-' + idx + '-video-' + Date.now().toString(36) + (ext || '.mp4'));
      return;
    }
    if (req.body.type === 'partner-logo') {
      const idx = String(Number(req.body.partnerIndex || 0) + 1).padStart(2, '0');
      cb(null, 'partner-' + idx + '-' + Date.now().toString(36) + (ext || '.svg'));
      return;
    }
    cb(null, 'portrait' + (ext || '.jpg'));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /\.(jpe?g|png|webp|svg|pdf|mp4|webm|mov)$/i.test(path.extname(file.originalname)));
  }
});

function relativeAssetPath(filename, type) {
  if (isProjectMedia(type)) {
    return 'assets/projects/' + filename;
  }
  if (type === 'partner-logo') {
    return 'assets/partners/' + filename;
  }
  return 'assets/' + filename;
}

module.exports = { upload, relativeAssetPath, PUBLIC_ASSETS, PROJECTS_DIR, PARTNERS_DIR };
