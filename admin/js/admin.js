(function(){
  'use strict';

  var TOKEN_KEY = 'kalebia_admin_token';
  var site = null;
  var dirty = false;

  var $ = function(id){ return document.getElementById(id); };

  function token(){ return sessionStorage.getItem(TOKEN_KEY); }
  function setToken(t){ sessionStorage.setItem(TOKEN_KEY, t); }
  function clearToken(){ sessionStorage.removeItem(TOKEN_KEY); }

  function api(path, opts){
    opts = opts || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    if (token()) headers.Authorization = 'Bearer ' + token();
    return fetch(path, Object.assign({}, opts, { headers: headers }))
      .catch(function(){
        throw new Error('Serveur inaccessible. Lancez npm start, puis ouvrez http://localhost:3000/admin/');
      })
      .then(function(r){
        return r.json().catch(function(){ return {}; }).then(function(data){
          if (!r.ok) throw new Error(data.error || ('Erreur serveur (' + r.status + ')'));
          return data;
        });
      });
  }

  function showServerHint(){
    var el = $('login-hint');
    if (!el) return;
    if (location.protocol === 'file:') {
      el.textContent = 'Ne pas ouvrir ce fichier directement. Utilisez le serveur Node.';
      el.classList.add('warn');
      return;
    }
    if (location.pathname.indexOf('/admin') !== 0) {
      el.textContent = 'Mauvaise URL — redirection vers /admin/…';
      el.classList.add('warn');
      location.replace('/admin/');
      return;
    }
    el.textContent = 'URL : ' + location.origin + '/admin/ · Mot de passe : kalebia2024';
  }

  function doLogin(){
    if (location.protocol === 'file:') {
      $('login-error').textContent = 'Ouvrez http://localhost:3000/admin/ après avoir lancé npm start.';
      return;
    }
    if (location.pathname.indexOf('/admin') !== 0) {
      location.replace('/admin/');
      return;
    }
    var pwd = $('login-password').value.trim();
    var btn = $('login-btn');
    $('login-error').textContent = '';
    if (btn) { btn.disabled = true; btn.textContent = 'Connexion…'; }
    api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: pwd }) })
      .then(function(data){
        if (!data || !data.token) throw new Error('Réponse serveur invalide.');
        setToken(data.token);
        return loadSite();
      })
      .then(function(){
        history.replaceState(null, '', '/admin/');
        showApp();
        toast('Connecté — panneau d\u2019administration');
      })
      .catch(function(err){
        $('login-error').textContent = err.message || 'Connexion impossible.';
      })
      .finally(function(){
        if (btn) { btn.disabled = false; btn.textContent = 'Se connecter'; }
      });
  }

  function toast(msg, isErr){
    var el = $('toast');
    el.textContent = msg;
    el.classList.toggle('err', !!isErr);
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function(){ el.classList.remove('show'); }, 3200);
  }

  function setSaveState(kind, msg){
    var el = $('save-state');
    var btn = $('btn-save');
    if (!el) return;
    el.className = 'save-state is-' + kind;
    el.textContent = msg;
    if (btn) btn.disabled = kind !== 'dirty';
  }

  function markDirty(){
    dirty = true;
    setSaveState('dirty', 'Modifications non enregistrées');
  }

  function field(label, html, hint){
    return '<div class="field"><label>' + label + '</label>' + html + (hint ? '<small>' + hint + '</small>' : '') + '</div>';
  }

  function input(name, val, type){
    type = type || 'text';
    return '<input type="' + type + '" data-path="' + name + '" value="' + escAttr(val == null ? '' : val) + '">';
  }

  function textarea(name, val){
    return '<textarea data-path="' + name + '">' + escHtml(val == null ? '' : val) + '</textarea>';
  }

  function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escAttr(s){ return escHtml(s).replace(/"/g,'&quot;'); }
  function slugify(s){
    return String(s || 'realisation')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'realisation';
  }

  function getPath(obj, path){
    return path.split('.').reduce(function(o,k){ return o && o[k]; }, obj);
  }

  function setPath(obj, path, val){
    var keys = path.split('.');
    var cur = obj;
    for (var i = 0; i < keys.length - 1; i++) {
      var k = keys[i];
      var next = keys[i + 1];
      if (/^\d+$/.test(k)) k = Number(k);
      if (cur[k] == null) cur[k] = /^\d+$/.test(next) ? [] : {};
      cur = cur[k];
    }
    var last = keys[keys.length - 1];
    if (/^\d+$/.test(last)) last = Number(last);
    cur[last] = val;
  }

  function bindPanel(root){
    root.querySelectorAll('[data-path]').forEach(function(el){
      el.addEventListener('input', function(){
        var path = el.dataset.path;
        var val = el.type === 'number' ? Number(el.value) : el.value;
        setPath(site, path, val);
        markDirty();
      });
    });
  }

  function renderOverview(){
    var profile = site.profile || {};
    var meta = site.meta || {};
    var projects = site.projects || {};
    var impact = site.impact || {};
    var name = (profile.firstName || '') + ' ' + (profile.lastName || '');
    $('panel-overview').innerHTML =
      '<div class="card"><h2>Bienvenue</h2><p>Gérez l\'ensemble du portfolio depuis cette interface. Les modifications sont enregistrées dans <code>data/site.json</code> et synchronisées automatiquement avec le site public.</p></div>' +
      '<div class="card"><h2>Flux recommandé</h2><p style="color:var(--ink-soft)">1. Modifiez une section · 2. Vérifiez l\'état “Modifications non enregistrées” · 3. Cliquez sur Enregistrer · 4. Ouvrez Aperçu live.</p></div>' +
      '<div class="grid-2">' +
      '<div class="card"><h2>Aperçu rapide</h2><p><strong>' + escHtml(name.trim()) + '</strong><br>' + escHtml(profile.email || '') + '</p><p style="margin-top:12px;color:var(--ink-soft)">' + escHtml(meta.description || '') + '</p></div>' +
      '<div class="card"><h2>Statistiques</h2><ul style="list-style:none;display:grid;gap:8px">' +
      '<li>📁 ' + (projects.items || []).length + ' réalisations</li>' +
      '<li>📊 ' + (impact.stats || []).length + ' indicateurs d\'impact</li>' +
      '<li>🔗 ' + (site.social || []).filter(function(s){ return s.url; }).length + ' réseaux actifs</li>' +
      '</ul></div></div>';
  }

  function renderProfil(){
    $('panel-profil').innerHTML =
      '<div class="card"><h2>Identité</h2><div class="grid-2">' +
      field('Prénom', input('profile.firstName', site.profile.firstName)) +
      field('Nom', input('profile.lastName', site.profile.lastName)) +
      field('Accroche (hero)', input('profile.eyebrow', site.profile.eyebrow)) +
      field('WhatsApp (numéro international)', input('profile.whatsapp', site.profile.whatsapp), 'Ex. 237600000000') +
      field('Localisation', input('profile.location', site.profile.location)) +
      field('Email', input('profile.email', site.profile.email, 'email')) +
      field('Titre du poste', input('meta.jobTitle', site.meta.jobTitle)) +
      '</div></div>' +
      '<div class="card"><h2>SEO &amp; meta</h2>' +
      field('URL du site', input('meta.siteUrl', site.meta.siteUrl)) +
      field('Titre de la page', input('meta.title', site.meta.title)) +
      field('Meta description', textarea('meta.description', site.meta.description)) +
      '</div>';
    bindPanel($('panel-profil'));
  }

  function renderHero(){
    $('panel-hero').innerHTML =
      '<div class="card"><h2>Section hero</h2>' +
      field('Phrase d\'accroche (thesis)', input('hero.thesis', site.hero.thesis)) +
      field('Headline CM', input('hero.headline', site.hero.headline)) +
      field('Texte d\'introduction', textarea('hero.lede', site.hero.lede)) +
      '</div>' +
      '<div class="card"><h2>Bandeau défilant</h2><p style="color:var(--ink-soft);font-size:.9rem;margin-bottom:12px">Un élément par ligne.</p>' +
      field('Éléments', textarea('marquee-text', (site.marquee || []).join('\n'))) +
      '</div>';
    bindPanel($('panel-hero'));
    $('panel-hero').querySelector('[data-path="marquee-text"]').addEventListener('input', function(e){
      site.marquee = e.target.value.split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
      markDirty();
    });
  }

  function renderAbout(){
    $('panel-about').innerHTML =
      '<div class="card"><h2>À propos</h2>' +
      field('Titre', input('about.title', site.about.title)) +
      field('Phrase synergie', input('about.synergy', site.about.synergy || '')) +
      field('Paragraphe 1 (HTML autorisé : &lt;strong&gt;)', textarea('about-p1', site.about.paragraphs[0] || '')) +
      field('Paragraphe 2', textarea('about-p2', site.about.paragraphs[1] || '')) +
      field('Compétences (une par ligne)', textarea('about-tags', (site.about.tags || []).join('\n'))) +
      '</div>' +
      '<div class="card"><h2>Blocs CM / PM</h2><div class="grid-2">' +
      field('Titre bloc CM', input('about.cmBlock.title', (site.about.cmBlock && site.about.cmBlock.title) || 'Community Manager')) +
      field('Titre bloc PM', input('about.pmBlock.title', (site.about.pmBlock && site.about.pmBlock.title) || 'Project Manager')) +
      '</div>' +
      field('Compétences CM (une par ligne)', textarea('about-cm-items', ((site.about.cmBlock && site.about.cmBlock.items) || []).join('\n'))) +
      field('Compétences PM (une par ligne)', textarea('about-pm-items', ((site.about.pmBlock && site.about.pmBlock.items) || []).join('\n'))) +
      '</div>' +
      '<div class="card"><h2>Galerie photos</h2>' +
      '<p style="color:var(--ink-soft);font-size:.9rem;margin-bottom:12px">Photos en action, événements, formations…</p>' +
      '<div class="upload-zone"><input type="file" id="upload-gallery" accept="image/*"><input type="text" id="gallery-caption" placeholder="Légende (optionnelle)" style="margin-top:10px;width:100%"></div>' +
      '<div class="tag-input" id="gallery-list">' + ((site.about.gallery || []).map(function(g, gi){
        return '<span class="tag-chip"><img src="/' + escAttr(g.src || g) + '" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:6px">' +
          escHtml(g.caption || '') +
          '<button type="button" data-remove-gallery-photo="' + gi + '" title="Supprimer">×</button></span>';
      }).join('')) + '</div></div>' +
      '<div class="card"><h2>Portrait</h2>' +
      '<div class="upload-zone">' +
      (site.portrait ? '<img src="/' + escAttr(site.portrait) + '" alt="Portrait">' : '') +
      '<p style="margin-bottom:12px">JPG, PNG, WebP ou SVG — max 8 Mo</p>' +
      '<input type="file" id="upload-portrait" accept="image/*">' +
      '</div></div>' +
      '<div class="card"><h2>CV (PDF)</h2>' +
      '<div class="upload-zone"><p>Fichier actuel : <strong>' + escHtml(site.cv.path) + '</strong></p>' +
      field('Label du bouton', input('cv.label', site.cv.label)) +
      '<input type="file" id="upload-cv" accept=".pdf,application/pdf" style="margin-top:12px">' +
      '</div></div>';
    bindPanel($('panel-about'));
    $('panel-about').querySelector('[data-path="about-p1"]').addEventListener('input', function(e){
      site.about.paragraphs[0] = e.target.value; markDirty();
    });
    $('panel-about').querySelector('[data-path="about-p2"]').addEventListener('input', function(e){
      if (!site.about.paragraphs[1]) site.about.paragraphs.push('');
      site.about.paragraphs[1] = e.target.value; markDirty();
    });
    $('panel-about').querySelector('[data-path="about-tags"]').addEventListener('input', function(e){
      site.about.tags = e.target.value.split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
      markDirty();
    });
    if (!site.about.cmBlock) site.about.cmBlock = { title: 'Community Manager', items: [] };
    if (!site.about.pmBlock) site.about.pmBlock = { title: 'Project Manager', items: [] };
    $('panel-about').querySelector('[data-path="about-cm-items"]').addEventListener('input', function(e){
      site.about.cmBlock.items = e.target.value.split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
      markDirty();
    });
    $('panel-about').querySelector('[data-path="about-pm-items"]').addEventListener('input', function(e){
      site.about.pmBlock.items = e.target.value.split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
      markDirty();
    });
    $('upload-portrait').addEventListener('change', function(){ uploadFile(this.files[0], 'portrait', { input: this }); });
    $('upload-cv').addEventListener('change', function(){ uploadFile(this.files[0], 'cv', { input: this }); });
    var uploadGallery = $('upload-gallery');
    if (uploadGallery) uploadGallery.addEventListener('change', function(){
      var cap = $('gallery-caption');
      uploadFile(uploadGallery.files[0], 'gallery-photo', { input: uploadGallery, caption: cap ? cap.value : '', onDone: renderAbout });
    });
    document.querySelectorAll('[data-remove-gallery-photo]').forEach(function(btn){
      btn.addEventListener('click', function(){
        site.about.gallery.splice(Number(btn.dataset.removeGalleryPhoto), 1);
        markDirty(); renderAbout();
      });
    });
  }

  function renderExpertise(){
    var html = '<div class="card"><h2>Introduction</h2>' +
      field('Titre', input('expertise.title', site.expertise.title)) +
      field('Sous-titre', textarea('expertise.subtitle', site.expertise.subtitle)) +
      '</div>';
    (site.expertise.pillars || []).forEach(function(p, i){
      html += '<div class="card" data-pillar="' + i + '"><div class="list-item-head"><strong>Pilier ' + (i+1) + '</strong></div>' +
        field('Numéro', input('expertise.pillars.' + i + '.num', p.num)) +
        field('Titre', input('expertise.pillars.' + i + '.title', p.title)) +
        field('Tagline', input('expertise.pillars.' + i + '.tagline', p.tagline)) +
        field('Compétences (une par ligne)', textarea('pillar-items-' + i, (p.items || []).join('\n'))) +
        '</div>';
    });
    $('panel-expertise').innerHTML = html;
    bindPanel($('panel-expertise'));
    (site.expertise.pillars || []).forEach(function(_, i){
      $('panel-expertise').querySelector('[data-path="pillar-items-' + i + '"]').addEventListener('input', function(e){
        site.expertise.pillars[i].items = e.target.value.split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
        markDirty();
      });
    });
  }

  function renderProjects(){
    var html = '<div class="card"><h2>Introduction</h2>' +
      field('Titre', input('projects.title', site.projects.title)) +
      field('Sous-titre', textarea('projects.subtitle', site.projects.subtitle)) +
      '<p style="color:var(--ink-soft);font-size:.9rem">Chaque réalisation devient une page dédiée accessible depuis le site public.</p>' +
      '<button type="button" class="btn btn-primary btn-sm" id="add-project" style="margin-top:12px">+ Ajouter une entreprise / marque</button></div>';
    (site.projects.items || []).forEach(function(p, i){
      html += projectItemHtml(p, i);
    });
    $('panel-projects').innerHTML = html;
    bindPanel($('panel-projects'));
    bindProjectEvents();
    $('add-project').addEventListener('click', function(){
      var n = (site.projects.items || []).length + 1;
      site.projects.items.push({ slug:'realisation-' + n, company:'Nouvelle entreprise', kind:'', title:'', description:'', detailDescription:'', statValue:'', statLabel:'', image:'', gallery:[], videos:[] });
      markDirty();
      renderProjects();
    });
  }

  function projectItemHtml(p, i){
    var galleryHtml = (p.gallery || []).map(function(g, gi){
      return '<span class="tag-chip"><img src="/' + escAttr(g) + '" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:6px">' +
        '<button type="button" data-remove-gallery="' + i + '" data-path="' + escAttr(g) + '" title="Supprimer">×</button></span>';
    }).join('');
    var videoHtml = (p.videos || []).map(function(v){
      return '<span class="tag-chip"><span>Vidéo</span><button type="button" data-remove-video="' + i + '" data-path="' + escAttr(v) + '" title="Supprimer">×</button></span>';
    }).join('');
    return '<div class="list-item" data-project="' + i + '"><div class="list-item-head"><strong>' + escHtml(p.company || ('Projet ' + String(i+1).padStart(2,'0'))) + '</strong><div class="list-actions">' +
      (i > 0 ? '<button type="button" class="btn btn-ghost btn-sm" data-move="up" data-i="' + i + '">↑</button>' : '') +
      (i < site.projects.items.length - 1 ? '<button type="button" class="btn btn-ghost btn-sm" data-move="down" data-i="' + i + '">↓</button>' : '') +
      '<button type="button" class="btn btn-ghost btn-sm" data-remove-project="' + i + '">Supprimer</button></div></div>' +
      field('Entreprise / marque', input('projects.items.' + i + '.company', p.company || p.title)) +
      field('URL de la page', input('projects.items.' + i + '.slug', p.slug || slugify(p.company || p.title)), 'Exemple : apple, orange-money, campagne-lancement') +
      field('Catégorie', input('projects.items.' + i + '.kind', p.kind)) +
      field('Plateforme(s)', input('projects.items.' + i + '.platform', p.platform || '')) +
      field('Objectif', textarea('projects.items.' + i + '.objective', p.objective || '')) +
      field('Résultats clés', textarea('projects.items.' + i + '.results', p.results || '')) +
      field('Titre de la collaboration', input('projects.items.' + i + '.title', p.title)) +
      field('Résumé affiché dans la liste', textarea('projects.items.' + i + '.description', p.description)) +
      field('Description détaillée de la page dédiée', textarea('projects.items.' + i + '.detailDescription', p.detailDescription || p.description)) +
      '<div class="grid-2">' +
      field('Stat — chiffre', input('projects.items.' + i + '.statValue', p.statValue)) +
      field('Stat — label', input('projects.items.' + i + '.statLabel', p.statLabel)) +
      '</div>' +
      '<div class="field"><label>Image splash (couverture)</label>' +
      '<div class="upload-zone">' +
      (p.image ? '<img src="/' + escAttr(p.image) + '" alt="Splash" style="max-width:100%;border-radius:12px;margin-bottom:12px">' : '<p style="color:var(--ink-soft);margin-bottom:8px">Aucune image</p>') +
      '<input type="file" data-upload-splash="' + i + '" accept="image/*"></div></div>' +
      '<div class="field"><label>Visuels de campagne (galerie)</label>' +
      '<div class="upload-zone">' +
      (galleryHtml ? '<div class="tag-input">' + galleryHtml + '</div>' : '') +
      '<input type="file" data-upload-gallery="' + i + '" accept="image/*"></div>' +
      '<small>JPG, PNG, WebP ou SVG — un fichier à la fois</small></div>' +
      '<div class="field"><label>Vidéos du travail effectué</label>' +
      '<div class="upload-zone">' +
      (videoHtml ? '<div class="tag-input">' + videoHtml + '</div>' : '') +
      '<input type="file" data-upload-video="' + i + '" accept="video/mp4,video/webm,video/quicktime"></div>' +
      '<small>MP4, WebM ou MOV — max 80 Mo</small></div></div>';
  }

  function bindProjectEvents(){
    document.querySelectorAll('[data-remove-project]').forEach(function(btn){
      btn.addEventListener('click', function(){
        if (!confirm('Supprimer cette réalisation ? Cette action sera définitive après Enregistrer.')) return;
        site.projects.items.splice(Number(btn.dataset.removeProject), 1);
        markDirty(); renderProjects();
      });
    });
    document.querySelectorAll('[data-move]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var i = Number(btn.dataset.i);
        var j = btn.dataset.move === 'up' ? i - 1 : i + 1;
        var tmp = site.projects.items[i];
        site.projects.items[i] = site.projects.items[j];
        site.projects.items[j] = tmp;
        markDirty(); renderProjects();
      });
    });
    document.querySelectorAll('[data-upload-splash]').forEach(function(input){
      input.addEventListener('change', function(){
        uploadFile(input.files[0], 'project-splash', { projectIndex: input.dataset.uploadSplash, input: input });
      });
    });
    document.querySelectorAll('[data-upload-gallery]').forEach(function(input){
      input.addEventListener('change', function(){
        uploadFile(input.files[0], 'project-gallery', { projectIndex: input.dataset.uploadGallery, input: input });
      });
    });
    document.querySelectorAll('[data-upload-video]').forEach(function(input){
      input.addEventListener('change', function(){
        uploadFile(input.files[0], 'project-video', { projectIndex: input.dataset.uploadVideo, input: input });
      });
    });
    document.querySelectorAll('[data-remove-gallery]').forEach(function(btn){
      btn.addEventListener('click', function(){
        removeProjectMedia(Number(btn.dataset.removeGallery), btn.dataset.path, 'image');
      });
    });
    document.querySelectorAll('[data-remove-video]').forEach(function(btn){
      btn.addEventListener('click', function(){
        removeProjectMedia(Number(btn.dataset.removeVideo), btn.dataset.path, 'video');
      });
    });
  }

  function removeProjectMedia(projectIndex, mediaPath, mediaType){
    if (!confirm('Supprimer ce média de la réalisation ?')) return;
    api('/api/admin/gallery', {
      method: 'DELETE',
      body: JSON.stringify({ projectIndex: projectIndex, mediaPath: mediaPath, mediaType: mediaType })
    }).then(function(data){
      site = data.site;
      dirty = false;
      setSaveState('saved', 'Réalisation mise à jour');
      toast('Média supprimé ✓');
      renderProjects();
    }).catch(function(e){ toast(e.message, true); });
  }

  function renderImpact(){
    var html = '<div class="card"><h2>Impact</h2>' +
      field('Titre', input('impact.title', site.impact.title)) +
      '<button type="button" class="btn btn-primary btn-sm" id="add-stat" style="margin-top:12px">+ Ajouter un indicateur</button></div>';
    (site.impact.stats || []).forEach(function(s, i){
      html += '<div class="list-item" data-stat="' + i + '"><div class="list-item-head"><strong>Indicateur ' + (i+1) + '</strong>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-remove-stat="' + i + '">Supprimer</button></div>' +
        '<div class="grid-3">' +
        field('Valeur', input('impact.stats.' + i + '.count', s.count, 'number')) +
        field('Suffixe', input('impact.stats.' + i + '.suffix', s.suffix)) +
        field('Label', input('impact.stats.' + i + '.label', s.label)) +
        '</div></div>';
    });
    $('panel-impact').innerHTML = html;
    bindPanel($('panel-impact'));
    $('add-stat').addEventListener('click', function(){
      site.impact.stats.push({ count: 0, suffix: '', label: '' });
      markDirty(); renderImpact();
    });
    document.querySelectorAll('[data-remove-stat]').forEach(function(btn){
      btn.addEventListener('click', function(){
        if (!confirm('Supprimer cet indicateur ?')) return;
        site.impact.stats.splice(Number(btn.dataset.removeStat), 1);
        markDirty(); renderImpact();
      });
    });
  }

  function renderPartners(){
    site.partners = site.partners || { title: 'Ils m’ont fait confiance', subtitle: '', items: [] };
    var html = '<div class="card"><h2>Ils m’ont fait confiance</h2>' +
      field('Titre', input('partners.title', site.partners.title)) +
      field('Sous-titre', textarea('partners.subtitle', site.partners.subtitle)) +
      '<button type="button" class="btn btn-primary btn-sm" id="add-partner" style="margin-top:12px">+ Ajouter un logo partenaire</button></div>';

    (site.partners.items || []).forEach(function(p, i){
      html += '<div class="list-item"><div class="list-item-head"><strong>' + escHtml(p.name || ('Partenaire ' + (i + 1))) + '</strong>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-remove-partner="' + i + '">Supprimer</button></div>' +
        field('Nom de l’entreprise', input('partners.items.' + i + '.name', p.name)) +
        field('Lien externe (optionnel)', input('partners.items.' + i + '.url', p.url || '')) +
        '<div class="field"><label>Logo</label><div class="upload-zone">' +
        (p.logo ? '<img src="/' + escAttr(p.logo) + '" alt="Logo" style="max-width:160px;max-height:80px;object-fit:contain;margin-bottom:12px">' : '<p style="color:var(--ink-soft);margin-bottom:8px">Aucun logo</p>') +
        '<input type="file" data-upload-partner-logo="' + i + '" accept="image/*"></div><small>SVG, PNG, JPG ou WebP</small></div></div>';
    });

    $('panel-partners').innerHTML = html;
    bindPanel($('panel-partners'));
    $('add-partner').addEventListener('click', function(){
      site.partners.items.push({ name: 'Nouvelle entreprise', logo: '', url: '' });
      markDirty();
      renderPartners();
    });
    document.querySelectorAll('[data-remove-partner]').forEach(function(btn){
      btn.addEventListener('click', function(){
        if (!confirm('Supprimer ce partenaire ?')) return;
        site.partners.items.splice(Number(btn.dataset.removePartner), 1);
        markDirty();
        renderPartners();
      });
    });
    document.querySelectorAll('[data-upload-partner-logo]').forEach(function(input){
      input.addEventListener('change', function(){
        uploadFile(input.files[0], 'partner-logo', { partnerIndex: input.dataset.uploadPartnerLogo, input: input });
      });
    });
  }

  function renderMethod(){
    var html = '<div class="card"><h2>Méthode</h2>' +
      field('Titre', input('method.title', site.method.title)) +
      field('Sous-titre', textarea('method.subtitle', site.method.subtitle)) +
      '<button type="button" class="btn btn-primary btn-sm" id="add-step" style="margin-top:12px">+ Ajouter une étape</button></div>';
    (site.method.steps || []).forEach(function(s, i){
      html += '<div class="list-item"><div class="list-item-head"><strong>Étape ' + (i+1) + '</strong>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-remove-step="' + i + '">Supprimer</button></div>' +
        field('Numéro', input('method.steps.' + i + '.num', s.num)) +
        field('Titre', input('method.steps.' + i + '.title', s.title)) +
        field('Texte', textarea('method.steps.' + i + '.text', s.text)) +
        '</div>';
    });
    $('panel-method').innerHTML = html;
    bindPanel($('panel-method'));
    $('add-step').addEventListener('click', function(){
      site.method.steps.push({ num:'', title:'', text:'' });
      markDirty(); renderMethod();
    });
    document.querySelectorAll('[data-remove-step]').forEach(function(btn){
      btn.addEventListener('click', function(){
        if (!confirm('Supprimer cette étape ?')) return;
        site.method.steps.splice(Number(btn.dataset.removeStep), 1);
        markDirty(); renderMethod();
      });
    });
  }

  function renderFormations(){
    if (!site.formations) site.formations = { title: '', subtitle: '', items: [] };
    var html = '<div class="card"><h2>Formations dispensées</h2>' +
      field('Titre', input('formations.title', site.formations.title)) +
      field('Sous-titre', textarea('formations.subtitle', site.formations.subtitle)) +
      '<button type="button" class="btn btn-primary btn-sm" id="add-formation" style="margin-top:12px">+ Ajouter une formation</button></div>';
    (site.formations.items || []).forEach(function(f, i){
      html += '<div class="list-item"><div class="list-item-head"><strong>' + escHtml(f.title || ('Formation ' + (i+1))) + '</strong>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-remove-formation="' + i + '">Supprimer</button></div>' +
        field('Titre', input('formations.items.' + i + '.title', f.title)) +
        field('Description', textarea('formations.items.' + i + '.description', f.description)) +
        field('Public cible', input('formations.items.' + i + '.audience', f.audience)) +
        field('Durée', input('formations.items.' + i + '.duration', f.duration)) +
        field('Modalité', input('formations.items.' + i + '.modality', f.modality)) +
        field('Bénéfices (un par ligne)', textarea('formation-benefits-' + i, (f.benefits || []).join('\n'))) +
        '</div>';
    });
    $('panel-formations').innerHTML = html;
    bindPanel($('panel-formations'));
    (site.formations.items || []).forEach(function(_, i){
      var el = $('panel-formations').querySelector('[data-path="formation-benefits-' + i + '"]');
      if (el) el.addEventListener('input', function(e){
        site.formations.items[i].benefits = e.target.value.split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
        markDirty();
      });
    });
    var addBtn = $('add-formation');
    if (addBtn) addBtn.addEventListener('click', function(){
      site.formations.items.push({ title:'', description:'', audience:'', duration:'', modality:'', benefits:[] });
      markDirty(); renderFormations();
    });
    document.querySelectorAll('[data-remove-formation]').forEach(function(btn){
      btn.addEventListener('click', function(){
        site.formations.items.splice(Number(btn.dataset.removeFormation), 1);
        markDirty(); renderFormations();
      });
    });
  }

  function renderBlog(){
    if (!site.blog) site.blog = { title: '', subtitle: '', items: [] };
    var html = '<div class="card"><h2>Blog / Insights</h2>' +
      field('Titre', input('blog.title', site.blog.title)) +
      field('Sous-titre', textarea('blog.subtitle', site.blog.subtitle)) +
      '<button type="button" class="btn btn-primary btn-sm" id="add-post" style="margin-top:12px">+ Ajouter un article</button></div>';
    (site.blog.items || []).forEach(function(p, i){
      html += '<div class="list-item"><div class="list-item-head"><strong>' + escHtml(p.title || ('Article ' + (i+1))) + '</strong>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-remove-post="' + i + '">Supprimer</button></div>' +
        field('Slug URL', input('blog.items.' + i + '.slug', p.slug)) +
        field('Titre', input('blog.items.' + i + '.title', p.title)) +
        field('Extrait', textarea('blog.items.' + i + '.excerpt', p.excerpt)) +
        field('Date', input('blog.items.' + i + '.date', p.date)) +
        field('Temps de lecture', input('blog.items.' + i + '.readTime', p.readTime)) +
        field('Contenu', textarea('blog.items.' + i + '.body', p.body)) +
        '</div>';
    });
    $('panel-blog').innerHTML = html;
    bindPanel($('panel-blog'));
    var addPost = $('add-post');
    if (addPost) addPost.addEventListener('click', function(){
      site.blog.items.push({ slug:'article-' + (site.blog.items.length + 1), title:'', excerpt:'', date:'', readTime:'5 min', body:'' });
      markDirty(); renderBlog();
    });
    document.querySelectorAll('[data-remove-post]').forEach(function(btn){
      btn.addEventListener('click', function(){
        site.blog.items.splice(Number(btn.dataset.removePost), 1);
        markDirty(); renderBlog();
      });
    });
  }

  function renderTestimonial(){
    if (!site.testimonials) site.testimonials = { items: [], pending: [] };
    var html = '<div class="card"><h2>Témoignages publiés</h2>';
    (site.testimonials.items || []).forEach(function(t, i){
      html += '<div class="list-item"><div class="list-item-head"><strong>' + escHtml(t.author || 'Avis') + '</strong>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-remove-testimonial="' + i + '">Supprimer</button></div>' +
        field('Citation', textarea('testimonials.items.' + i + '.quote', t.quote)) +
        field('Auteur', input('testimonials.items.' + i + '.author', t.author)) +
        field('Poste', input('testimonials.items.' + i + '.role', t.role)) +
        field('Entreprise', input('testimonials.items.' + i + '.company', t.company)) +
        field('Note (1-5)', input('testimonials.items.' + i + '.rating', t.rating, 'number')) +
        '</div>';
    });
    html += '</div><div class="card"><h2>En attente de modération</h2>';
    if (!(site.testimonials.pending || []).length) html += '<p style="color:var(--ink-soft)">Aucun avis en attente.</p>';
    (site.testimonials.pending || []).forEach(function(t, i){
      html += '<div class="list-item"><p><strong>' + escHtml(t.author) + '</strong> — ' + escHtml(t.quote) + '</p>' +
        '<div class="list-actions" style="margin-top:8px">' +
        '<button type="button" class="btn btn-primary btn-sm" data-approve-testimonial="' + i + '">Publier</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-reject-testimonial="' + i + '">Rejeter</button></div></div>';
    });
    html += '</div>';
    $('panel-testimonial').innerHTML = html;
    bindPanel($('panel-testimonial'));
    document.querySelectorAll('[data-remove-testimonial]').forEach(function(btn){
      btn.addEventListener('click', function(){
        site.testimonials.items.splice(Number(btn.dataset.removeTestimonial), 1);
        markDirty(); renderTestimonial();
      });
    });
    document.querySelectorAll('[data-approve-testimonial]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var i = Number(btn.dataset.approveTestimonial);
        var t = site.testimonials.pending[i];
        t.published = true;
        site.testimonials.items.push(t);
        site.testimonials.pending.splice(i, 1);
        markDirty(); renderTestimonial();
      });
    });
    document.querySelectorAll('[data-reject-testimonial]').forEach(function(btn){
      btn.addEventListener('click', function(){
        site.testimonials.pending.splice(Number(btn.dataset.rejectTestimonial), 1);
        markDirty(); renderTestimonial();
      });
    });
  }

  function renderContact(){
    var html = '<div class="card"><h2>Contact</h2>' +
      field('Titre (partie 1)', input('contact.title', site.contact.title)) +
      field('Mot en italique', input('contact.highlight', site.contact.highlight)) +
      field('Texte d\'invitation', textarea('contact.lede', site.contact.lede)) +
      field('Message WhatsApp pré-rempli', textarea('contact.whatsappMessage', site.contact.whatsappMessage || '')) +
      '</div><div class="card"><h2>Réseaux sociaux</h2>';
    (site.social || []).forEach(function(s, i){
      html += '<div class="list-item"><strong>' + escHtml(s.label || s.id) + '</strong>' +
        field('URL', input('social.' + i + '.url', s.url)) +
        field('Label affiché', input('social.' + i + '.label', s.label)) +
        '</div>';
    });
    html += '</div>';
    $('panel-contact').innerHTML = html;
    bindPanel($('panel-contact'));
  }

  function renderAll(){
    renderOverview();
    renderProfil();
    renderHero();
    renderAbout();
    renderExpertise();
    renderProjects();
    renderPartners();
    renderFormations();
    renderBlog();
    renderImpact();
    renderMethod();
    renderTestimonial();
    renderContact();
    dirty = false;
    setSaveState('saved', 'Aucune modification');
  }

  function showPanel(id){
    document.querySelectorAll('.panel').forEach(function(p){ p.classList.remove('active'); });
    document.querySelectorAll('.nav button').forEach(function(b){ b.classList.remove('active'); });
    $('panel-' + id).classList.add('active');
    document.querySelector('.nav button[data-panel="' + id + '"]').classList.add('active');
    $('page-title').textContent = document.querySelector('.nav button[data-panel="' + id + '"]').textContent.trim();
  }

  function showLogin(){
    $('login-screen').classList.remove('hidden');
    $('app-shell').classList.add('hidden');
  }

  function showApp(){
    try {
      if (!site || !site.profile) throw new Error('Données du site invalides.');
      $('login-screen').classList.add('hidden');
      $('app-shell').classList.remove('hidden');
      renderAll();
      showPanel('overview');
    } catch (err) {
      clearToken();
      showLogin();
      $('login-error').textContent = err.message || 'Erreur au chargement du panneau.';
    }
  }

  function loadSite(){
    return api('/api/site').then(function(data){
      site = data;
    });
  }

  function saveSite(){
    if (!dirty) {
      toast('Aucune modification à enregistrer');
      setSaveState('saved', 'Aucune modification');
      return Promise.resolve();
    }
    $('btn-save').disabled = true;
    setSaveState('saving', 'Sauvegarde en cours…');
    return api('/api/admin/site', { method: 'PUT', body: JSON.stringify(site) })
      .then(function(){
        dirty = false;
        setSaveState('saved', 'Enregistré');
        toast('Modifications enregistrées ✓');
      })
      .catch(function(e){
        setSaveState('error', 'Sauvegarde échouée');
        toast(e.message, true);
      })
      .finally(function(){ if (dirty) $('btn-save').disabled = false; });
  }

  function uploadFile(file, type, extra){
    if (!file) return;
    extra = extra || {};
    var zone = extra.input && extra.input.closest ? extra.input.closest('.upload-zone') : null;
    var fd = new FormData();
    fd.append('type', type);
    if (extra.projectIndex != null) fd.append('projectIndex', extra.projectIndex);
    if (extra.partnerIndex != null) fd.append('partnerIndex', extra.partnerIndex);
    if (extra.caption != null) fd.append('caption', extra.caption);
    fd.append('file', file);
    if (zone) zone.classList.add('is-busy');
    setSaveState('saving', 'Upload en cours…');
    fetch('/api/admin/upload', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token() },
      body: fd
    }).then(function(r){
      return r.json().catch(function(){ return {}; }).then(function(data){
        if (!r.ok) throw new Error(data.error || 'Upload impossible.');
        return data;
      });
    }).then(function(data){
      if (data.error) throw new Error(data.error);
      site = data.site;
      dirty = false;
      setSaveState('saved', 'Upload enregistré');
      var msg = type === 'cv' ? 'CV mis à jour ✓' : type === 'project-splash' ? 'Image splash mise à jour ✓' : type === 'project-gallery' ? 'Visuel ajouté à la galerie ✓' : type === 'project-video' ? 'Vidéo ajoutée ✓' : type === 'partner-logo' ? 'Logo partenaire mis à jour ✓' : type === 'gallery-photo' ? 'Photo galerie ajoutée ✓' : 'Portrait mis à jour ✓';
      toast(msg);
      if (type === 'project-splash' || type === 'project-gallery' || type === 'project-video') renderProjects();
      else if (type === 'partner-logo') renderPartners();
      else if (extra.onDone) extra.onDone();
      else renderAbout();
    }).catch(function(e){
      setSaveState('error', 'Upload échoué');
      toast(e.message, true);
    }).finally(function(){
      if (zone) zone.classList.remove('is-busy');
    });
  }

  $('login-btn').addEventListener('click', doLogin);
  $('login-form').addEventListener('submit', function(e){
    e.preventDefault();
    doLogin();
  });
  $('login-password').addEventListener('keydown', function(e){
    if (e.key === 'Enter') { e.preventDefault(); doLogin(); }
  });

  $('btn-save').addEventListener('click', saveSite);
  $('btn-logout').addEventListener('click', function(){
    if (dirty && !confirm('Des modifications non enregistrées seront perdues. Continuer ?')) return;
    api('/api/admin/logout', { method: 'POST' }).catch(function(){});
    clearToken();
    showLogin();
  });

  document.querySelectorAll('.nav button[data-panel]').forEach(function(btn){
    btn.addEventListener('click', function(){
      showPanel(btn.dataset.panel);
    });
  });

  window.addEventListener('beforeunload', function(e){
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  document.addEventListener('keydown', function(e){
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveSite();
    }
  });

  if (token()) {
    api('/api/admin/me').then(loadSite).then(showApp).catch(function(){
      clearToken();
      showLogin();
    });
  } else {
    showLogin();
  }

  showServerHint();
})();
