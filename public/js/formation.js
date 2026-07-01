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

  function whatsappUrl(number, message) {
    if (!number) return '#contact';
    var n = String(number).replace(/\D/g, '');
    var q = message ? '?text=' + encodeURIComponent(message) : '';
    return 'https://wa.me/' + n + q;
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
    document.getElementById('formation-head').innerHTML =
      '<span class="eyebrow">Formation</span><h1>Formation introuvable</h1>' +
      '<p class="lede">Ce parcours n\'existe pas encore ou a été retiré.</p>' +
      '<a class="btn btn-primary" href="/#formations">Retour aux formations</a>';
    document.getElementById('formation-flyer').innerHTML = '';
    document.getElementById('formation-body').innerHTML = '';
  }

  function renderFormation(f, data) {
    var name = ((data.profile && data.profile.firstName) || '') + ' ' + ((data.profile && data.profile.lastName) || '');
    name = name.trim() || 'Kalebia Nyoue Franck';
    document.title = (f.title || 'Formation') + ', ' + name;

    document.getElementById('formation-head').innerHTML =
      '<span class="eyebrow">Formation</span>' +
      '<h1>' + esc(f.title) + '</h1>' +
      (f.description ? '<p class="lede">' + esc(f.description) + '</p>' : '');

    var flyerEl = document.getElementById('formation-flyer');
    if (f.flyer) {
      flyerEl.innerHTML = '<img class="formation-flyer-img" src="' + esc(assetUrl(f.flyer)) + '" alt="Flyer, ' + esc(f.title) + '" width="360" height="480" loading="eager">';
      flyerEl.removeAttribute('aria-hidden');
    } else {
      flyerEl.innerHTML = '';
      flyerEl.setAttribute('aria-hidden', 'true');
    }

    var benefits = (f.benefits || []).map(function(b){
      return '<li>' + esc(b) + '</li>';
    }).join('');

    var waMsg = 'Bonjour Kalebia, je veux participer à la formation « ' + (f.title || '') + ' ».';
    var wa = whatsappUrl(data.profile && data.profile.whatsapp, waMsg);

    document.getElementById('formation-body').innerHTML =
      '<dl class="formation-meta formation-meta--detail">' +
      '<div><dt>Public</dt><dd>' + esc(f.audience) + '</dd></div>' +
      '<div><dt>Durée</dt><dd>' + esc(f.duration) + '</dd></div>' +
      '<div><dt>Modalité</dt><dd>' + esc(f.modality) + '</dd></div>' +
      '</dl>' +
      (benefits ? '<div class="formation-benefits-block"><h2>Ce que vous allez apprendre</h2><ul class="formation-benefits">' + benefits + '</ul></div>' : '') +
      '<div class="formation-detail-actions">' +
      '<a class="btn btn-whatsapp formation-wa-cta" href="' + esc(wa) + '" target="_blank" rel="noopener noreferrer">' +
      '<img src="/assets/social/whatsapp.svg" alt="" width="22" height="22"> Je veux participer</a>' +
      '<a class="btn btn-ghost" href="/#formations">Voir les autres formations</a>' +
      '</div>';
  }

  document.getElementById('yr').textContent = new Date().getFullYear();

  loadData().then(function(data){
    var slug = new URLSearchParams(location.search).get('slug');
    var items = (data.formations && data.formations.items) || [];
    var formation = items.find(function(item){ return item.slug === slug; });
    if (!formation) {
      renderMissing();
      return;
    }
    renderFormation(formation, data);
  }).catch(renderMissing);
})();
