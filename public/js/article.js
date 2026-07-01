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

  function formatBody(text) {
    if (!text) return '';
    return esc(text).split(/\n\n+/).map(function(p){
      return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  function renderMissing() {
    document.getElementById('article-head').innerHTML =
      '<span class="eyebrow">Blog</span><h1>Article introuvable</h1>' +
      '<p class="lede">Cet article n\'existe pas encore ou a été retiré.</p>' +
      '<a class="btn btn-primary" href="/#blog">Retour au blog</a>';
    document.getElementById('article-body').innerHTML = '';
  }

  function renderArticle(post, data) {
    var name = ((data.profile && data.profile.firstName) || '') + ' ' + ((data.profile && data.profile.lastName) || '');
    name = name.trim() || 'Kalebia Nyoue Franck';
    document.title = (post.title || 'Article') + ', ' + name;

    var meta = '';
    if (post.date || post.readTime) {
      meta = '<p class="article-meta">';
      if (post.date) meta += '<time datetime="' + esc(post.date) + '">' + esc(post.date) + '</time>';
      if (post.date && post.readTime) meta += ' · ';
      if (post.readTime) meta += esc(post.readTime);
      meta += '</p>';
    }

    document.getElementById('article-head').innerHTML =
      '<span class="eyebrow">Blog</span>' +
      meta +
      '<h1>' + esc(post.title) + '</h1>' +
      (post.excerpt ? '<p class="lede">' + esc(post.excerpt) + '</p>' : '');

    document.getElementById('article-body').innerHTML =
      '<div class="article-content">' + formatBody(post.body) + '</div>' +
      '<div class="article-detail-actions">' +
      '<a class="btn btn-ghost" href="/#blog">← Tous les articles</a>' +
      '</div>';
  }

  document.getElementById('yr').textContent = new Date().getFullYear();

  loadData().then(function(data){
    var slug = new URLSearchParams(location.search).get('slug');
    var items = (data.blog && data.blog.items) || [];
    var post = items.find(function(item){ return item.slug === slug; });
    if (!post) {
      renderMissing();
      return;
    }
    renderArticle(post, data);
  }).catch(renderMissing);
})();
