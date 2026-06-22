(function(){
  'use strict';

  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function assetUrl(path) {
    if (!path) return '';
    if (/^https?:\/\//.test(path)) return path;
    return '/' + String(path).replace(/^\/+/, '');
  }

  function loadData() {
    var urls = ['/api/site', '/data/site.json', 'data/site.json'];
    function tryFetch(i) {
      if (i >= urls.length) {
        if (window.SITE_DATA) return Promise.resolve(window.SITE_DATA);
        return Promise.reject(new Error('Données indisponibles'));
      }
      return fetch(urls[i] + '?_=' + Date.now())
        .then(function(r){ if (!r.ok) throw new Error('fetch failed'); return r.json(); })
        .catch(function(){ return tryFetch(i + 1); });
    }
    return tryFetch(0);
  }

  function renderMissing() {
    document.getElementById('detail-head').innerHTML =
      '<span class="eyebrow">Réalisation</span><h1>Projet introuvable</h1><p class="lede">Cette collaboration n’existe pas encore ou a été retirée.</p><a class="btn btn-primary" href="/#travaux">Retour aux réalisations</a>';
    document.getElementById('detail-copy').innerHTML = '';
    document.getElementById('detail-meta').innerHTML = '';
  }

  function renderProject(project, data) {
    var name = ((data.profile?.firstName || '') + ' ' + (data.profile?.lastName || '')).trim();
    var pageTitle = (project.title || project.company || 'Réalisation') + ' · ' + (name || 'Kalebia Nyoue Franck');
    document.title = pageTitle;

    document.getElementById('detail-head').innerHTML =
      '<span class="eyebrow">' + esc(project.kind || 'Réalisation') + '</span>' +
      (project.company ? '<p class="detail-company">' + esc(project.company) + '</p>' : '') +
      '<h1>' + esc(project.title || project.company) + '</h1>' +
      (project.description ? '<p class="lede">' + esc(project.description) + '</p>' : '');

    document.getElementById('detail-copy').innerHTML =
      '<h2>Contexte & collaboration</h2>' +
      '<p>' + esc(project.detailDescription || project.description || '') + '</p>';

    document.getElementById('detail-meta').innerHTML =
      '<div class="metric"><div class="num c">' + esc(project.statValue || '') + '</div><div class="lab">' + esc(project.statLabel || '') + '</div></div>' +
      '<a class="btn btn-primary" href="/#contact">Discuter d’un projet similaire</a>';

    var images = [];
    if (project.image) images.push(project.image);
    (project.gallery || []).forEach(function(path){ images.push(path); });
    document.getElementById('detail-gallery').innerHTML = images.length
      ? images.map(function(path){
        return '<figure><img src="' + esc(assetUrl(path)) + '" alt="Image du projet ' + esc(project.title || project.company) + '" loading="lazy"></figure>';
      }).join('')
      : '<p class="empty-state">Aucune image ajoutée pour le moment.</p>';

    var videos = project.videos || [];
    document.getElementById('detail-videos').innerHTML = videos.length
      ? videos.map(function(path){
        return '<video controls preload="metadata" src="' + esc(assetUrl(path)) + '"></video>';
      }).join('')
      : '<p class="empty-state">Aucune vidéo ajoutée pour le moment.</p>';
  }

  document.getElementById('yr').textContent = new Date().getFullYear();

  loadData().then(function(data){
    var slug = new URLSearchParams(location.search).get('slug');
    var projects = data.projects?.items || [];
    var project = projects.find(function(item){ return item.slug === slug; });
    if (!project) {
      renderMissing();
      return;
    }
    renderProject(project, data);
  }).catch(renderMissing);
})();
