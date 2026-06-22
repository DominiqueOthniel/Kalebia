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

  function fullName(p) {
    return ((p.firstName || '') + ' ' + (p.lastName || '')).trim();
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el && text != null) el.textContent = text;
  }

  function setHtml(id, html) {
    var el = document.getElementById(id);
    if (el && html != null) el.innerHTML = html;
  }

  function assetUrl(path) {
    if (!path) return '';
    if (/^https?:\/\//.test(path)) return path;
    var normalized = String(path).replace(/^\/+/, '');
    try {
      var url = new URL('./' + normalized, document.baseURI || window.location.href).href;
      return url + (url.indexOf('?') > -1 ? '&' : '?') + 'v=2';
    } catch (e) {
      return normalized;
    }
  }

  function socialIconPath(id) {
    var map = {
      linkedin: 'assets/social/linkedin.svg',
      instagram: 'assets/social/instagram.svg',
      tiktok: 'assets/social/tiktok.svg',
      twitter: 'assets/social/x.svg',
      x: 'assets/social/x.svg'
    };
    return map[id] || null;
  }

  window.renderSite = function(data) {
    if (!data) return;

    var name = fullName(data.profile || {});
    var meta = data.meta || {};
    var profile = data.profile || {};

    document.title = meta.title || name;
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', meta.description || '');

    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && meta.siteUrl) canonical.href = meta.siteUrl + '/';

    document.querySelectorAll('meta[property^="og:"]').forEach(function(m) {
      var prop = m.getAttribute('property');
      if (prop === 'og:url' && meta.siteUrl) m.content = meta.siteUrl + '/';
      if (prop === 'og:title') m.content = meta.title || name;
      if (prop === 'og:description') m.content = meta.description || '';
      if (prop === 'og:site_name') m.content = name;
    });

    document.querySelectorAll('meta[name^="twitter:"]').forEach(function(m) {
      var n = m.getAttribute('name');
      if (n === 'twitter:title') m.content = meta.title || name;
      if (n === 'twitter:description') m.content = meta.description || '';
    });

    var ld = document.getElementById('ld-json');
    if (ld) {
      var sameAs = (data.social || []).map(function(s){ return s.url; }).filter(Boolean);
      ld.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: name,
        jobTitle: meta.jobTitle || 'Project & Community Manager',
        url: meta.siteUrl || '',
        email: profile.email || '',
        image: meta.siteUrl ? meta.siteUrl + '/' + (data.portrait || '') : data.portrait,
        address: { '@type': 'PostalAddress', addressLocality: 'Douala', addressCountry: 'CM' },
        knowsLanguage: ['fr', 'en'],
        sameAs: sameAs
      });
    }

    setText('brand-name', name.replace(/ /g, '\u00a0'));
    setText('hero-eyebrow', profile.eyebrow);

    var heroName = document.getElementById('hero-name');
    if (heroName && profile.firstName) {
      heroName.innerHTML = esc(profile.firstName) + '<br><span class="ln2">' + esc(profile.lastName || '') + '</span>';
    }

    var thesis = document.querySelector('[data-scramble]');
    if (thesis && data.hero) thesis.setAttribute('data-scramble', data.hero.thesis || '');

    setText('hero-headline', data.hero && data.hero.headline);
    setText('hero-lede', data.hero && data.hero.lede);

    var portrait = document.getElementById('portrait-img');
    if (portrait && data.portrait) {
      portrait.src = assetUrl(data.portrait);
      portrait.alt = 'Portrait de ' + name + ', ' + (meta.jobTitle || '') + ' à Douala';
    }

    var caption = document.getElementById('portrait-caption');
    if (caption) {
      caption.innerHTML = '<b>' + esc(name) + '</b>' +
        (profile.location ? '<span class="ph-loc">' + esc(profile.location) + '</span>' : '');
    }

    if (data.dashboard) {
      var comm = document.getElementById('metric-community');
      var eng = document.getElementById('metric-engagement');
      if (comm && data.dashboard.community) {
        comm.dataset.count = data.dashboard.community.count;
        comm.dataset.suffix = data.dashboard.community.suffix || '';
        comm.setAttribute('aria-label', data.dashboard.community.label || '');
        var commLab = comm.parentElement && comm.parentElement.querySelector('.lab');
        if (commLab) commLab.textContent = data.dashboard.community.label || '';
      }
      if (eng && data.dashboard.engagement) {
        eng.dataset.count = data.dashboard.engagement.count;
        eng.dataset.suffix = data.dashboard.engagement.suffix || '';
        if (data.dashboard.engagement.dec != null) eng.dataset.dec = data.dashboard.engagement.dec;
        eng.setAttribute('aria-label', data.dashboard.engagement.label || '');
        var engLab = eng.parentElement && eng.parentElement.querySelector('.lab');
        if (engLab) engLab.textContent = data.dashboard.engagement.label || '';
      }
    }

    var track = document.getElementById('marquee-track');
    if (track && data.marquee && data.marquee.length) {
      var items = data.marquee.concat(data.marquee);
      track.innerHTML = items.map(function(t){ return '<span>' + esc(t) + '</span>'; }).join('');
    }

    setText('apropos-title', data.about && data.about.title);
    var aboutParas = document.getElementById('about-paragraphs');
    if (aboutParas && data.about && data.about.paragraphs) {
      aboutParas.innerHTML = data.about.paragraphs.map(function(p){ return '<p>' + p + '</p>'; }).join('');
    }

    var tags = document.getElementById('about-tags');
    if (tags && data.about && data.about.tags) {
      tags.innerHTML = data.about.tags.map(function(t){ return '<span class="tag">' + esc(t) + '</span>'; }).join('');
    }

    setText('expertise-title', data.expertise && data.expertise.title);
    setText('expertise-subtitle', data.expertise && data.expertise.subtitle);

    var expGrid = document.getElementById('exp-grid');
    if (expGrid && data.expertise && data.expertise.pillars) {
      expGrid.innerHTML = data.expertise.pillars.map(function(p, i){
        var reveal = i === 0 ? 'left' : 'right';
        var items = (p.items || []).map(function(li){ return '<li>' + esc(li) + '</li>'; }).join('');
        return '<div class="pillar' + (p.dark ? ' dark' : '') + '" data-reveal="' + reveal + '" data-tilt>' +
          '<span class="pnum">' + esc(p.num) + '</span>' +
          '<h3>' + esc(p.title) + '</h3>' +
          '<span class="ptag">' + esc(p.tagline) + '</span>' +
          '<ul>' + items + '</ul></div>';
      }).join('');
    }

    setText('travaux-eyebrow', 'Réalisations');
    setText('travaux-title', data.projects && data.projects.title);
    setText('travaux-subtitle', data.projects && data.projects.subtitle);

    var travauxNav = document.querySelector('.nav-links a[href="#travaux"]');
    if (travauxNav) travauxNav.textContent = 'Réalisations';

    var workList = document.getElementById('work-list');
    if (workList && data.projects && data.projects.items) {
      workList.innerHTML = data.projects.items.map(function(p, i){
        var idx = String(i + 1).padStart(2, '0');
        var flip = i % 2 === 1 ? ' case--flip' : '';
        var visual = '';
        if (p.image) {
          var thumbs = (p.gallery || []).map(function(g, gi){
            var gsrc = assetUrl(g);
            return '<button type="button" class="case-thumb" data-case="' + i + '" data-src="' + esc(gsrc) + '" aria-label="Visuel campagne ' + (gi + 1) + '">' +
              '<img src="' + esc(gsrc) + '" alt="" loading="eager" decoding="async" width="72" height="72">' +
              '</button>';
          }).join('');
          var splashSrc = assetUrl(p.image);
          visual = '<figure class="case-visual">' +
            '<div class="case-splash-wrap">' +
            '<img class="case-splash" src="' + esc(splashSrc) + '" alt="Visuel · ' + esc(p.title) + '" loading="eager" decoding="async" width="640" height="360" data-case="' + i + '" data-src="' + esc(splashSrc) + '">' +
            '</div>' +
            (thumbs ? '<div class="case-gallery" role="group" aria-label="Visuels de campagne">' + thumbs + '</div>' : '') +
            '</figure>';
        }
        var slug = p.slug || String(i);
        var detailUrl = '/realisation.html?slug=' + encodeURIComponent(slug);
        return '<article class="case' + flip + '" data-reveal>' +
          visual +
          '<div class="case-body">' +
          '<div class="cidx" aria-hidden="true">' + idx + '</div>' +
          '<div class="case-copy">' +
          '<div class="ckind">' + esc(p.kind || 'Réalisation') + '</div>' +
          (p.company ? '<p class="case-company">' + esc(p.company) + '</p>' : '') +
          '<h3>' + esc(p.title) + '</h3>' +
          '<p>' + esc(p.description) + '</p></div>' +
          '<div class="cstat"><div class="cn">' + esc(p.statValue) + '</div>' +
          '<div class="cl">' + esc(p.statLabel) + '</div></div>' +
          '<a class="case-link" href="' + esc(detailUrl) + '">Voir la collaboration →</a>' +
          '</div></article>';
      }).join('');
    }

    setText('impact-title', data.impact && data.impact.title);
    var impactGrid = document.getElementById('impact-grid');
    if (impactGrid && data.impact && data.impact.stats) {
      impactGrid.innerHTML = data.impact.stats.map(function(s){
        return '<div class="stat" data-reveal>' +
          '<div class="sv" data-count="' + esc(s.count) + '" data-suffix="' + esc(s.suffix || '') + '">0</div>' +
          '<div class="sl">' + esc(s.label) + '</div></div>';
      }).join('');
    }

    setText('methode-title', data.method && data.method.title);
    setText('methode-subtitle', data.method && data.method.subtitle);

    var steps = document.getElementById('method-steps');
    if (steps && data.method && data.method.steps) {
      steps.innerHTML = data.method.steps.map(function(s){
        return '<div class="step"><div class="sn">' + esc(s.num) + '</div>' +
          '<h3>' + esc(s.title) + '</h3><p>' + esc(s.text) + '</p></div>';
      }).join('');
    }

    if (data.testimonial) {
      var q = document.getElementById('testimonial-quote');
      if (q && data.testimonial.quote) q.textContent = '\u00ab ' + data.testimonial.quote + ' \u00bb';
      setText('testimonial-author', data.testimonial.author);
      setText('testimonial-role', data.testimonial.role);
    }

    if (data.partners) {
      setText('trusted-title', data.partners.title);
      setText('trusted-subtitle', data.partners.subtitle);
      var trustedGrid = document.getElementById('trusted-grid');
      if (trustedGrid && data.partners.items) {
        trustedGrid.innerHTML = data.partners.items.map(function(item){
          var logo = item.logo ? '<img src="' + esc(assetUrl(item.logo)) + '" alt="Logo ' + esc(item.name || 'partenaire') + '" loading="lazy">' : '<span>' + esc(item.name || 'Partenaire') + '</span>';
          var card = logo + '<small>' + esc(item.name || '') + '</small>';
          if (item.url) return '<a class="trusted-card" href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer">' + card + '</a>';
          return '<div class="trusted-card">' + card + '</div>';
        }).join('');
      }
    }

    if (data.contact) {
      var ct = document.getElementById('contact-title');
      if (ct) {
        ct.innerHTML = esc(data.contact.title || '') + ' <span class="serif">' + esc(data.contact.highlight || '') + '</span>.';
      }
      setText('contact-lede', data.contact.lede);
    }

    var emailEl = document.getElementById('contact-email');
    if (emailEl && profile.email) {
      emailEl.href = 'mailto:' + profile.email;
      emailEl.textContent = profile.email;
    }

    var cv = document.getElementById('cv-link');
    if (cv && data.cv && data.cv.path) {
      cv.href = assetUrl(data.cv.path);
      cv.setAttribute('download', '');
      if (data.cv.label) cv.textContent = data.cv.label;
    }

    var socials = document.getElementById('socials');
    if (socials && data.social) {
      socials.innerHTML = '';
      data.social.forEach(function(item){
        if (!item.url) return;
        var label = item.label || item.id || 'Réseau social';
        var a = document.createElement('a');
        a.href = item.url;
        a.className = 'social-link';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.setAttribute('aria-label', label);
        a.setAttribute('data-cursor', '');
        a.title = label;
        var icon = socialIconPath(item.id);
        if (icon) {
          a.innerHTML = '<img src="' + esc(assetUrl(icon)) + '" alt="" width="22" height="22" loading="lazy" decoding="async">' +
            '<span class="social-label">' + esc(label) + '</span>';
        } else {
          a.innerHTML = '<span class="social-label">' + esc(label) + '</span>';
        }
        socials.appendChild(a);
      });
    }

    var footLoc = document.getElementById('foot-location');
    if (footLoc) footLoc.textContent = name + ' · Douala, Cameroun';

    var footRole = document.getElementById('foot-role');
    if (footRole) footRole.textContent = meta.jobTitle || '';
  };

  window.loadSiteData = function() {
    var urls = ['/api/site', '/data/site.json', 'data/site.json'];
    function tryFetch(i) {
      if (i >= urls.length) return Promise.reject(new Error('fetch failed'));
      return fetch(urls[i] + (urls[i].indexOf('?') === -1 ? '?_=' + Date.now() : ''))
        .then(function(r){ if (!r.ok) throw new Error('fetch failed'); return r.json(); })
        .catch(function(){ return tryFetch(i + 1); });
    }
    return tryFetch(0).catch(function(){
      if (window.SITE_DATA) return window.SITE_DATA;
      throw new Error('no data');
    });
  };
})();
