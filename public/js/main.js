(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = window.matchMedia('(hover:none),(pointer:coarse)').matches;
  var mobileNav = window.matchMedia('(max-width:920px)');
  var lerp = function(a,b,n){ return a + (b - a) * n; };

  document.getElementById('yr').textContent = new Date().getFullYear();

  var io, cio, hmArr = [];

  function bindInteractions(){
    if (!touch && !reduce) {
      document.querySelectorAll('[data-magnetic]').forEach(function(el){
        if (el.dataset.magneticBound) return;
        el.dataset.magneticBound = '1';
        el.addEventListener('mousemove', function(e){
          var r = el.getBoundingClientRect();
          el.style.transform = 'translate(' + (e.clientX - (r.left + r.width / 2)) * 0.32 + 'px,' + (e.clientY - (r.top + r.height / 2)) * 0.32 + 'px)';
        });
        el.addEventListener('mouseleave', function(){ el.style.transform = ''; });
      });

      document.querySelectorAll('[data-tilt]').forEach(function(el){
        if (el.dataset.tiltBound) return;
        el.dataset.tiltBound = '1';
        el.addEventListener('mousemove', function(e){
          var r = el.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - .5;
          var py = (e.clientY - r.top) / r.height - .5;
          el.style.transform = 'perspective(900px) rotateY(' + (px * 5) + 'deg) rotateX(' + (-py * 5) + 'deg) translateY(-4px)';
        });
        el.addEventListener('mouseleave', function(){ el.style.transform = ''; });
      });

      var rng = document.getElementById('cring');
      if (rng) {
        document.querySelectorAll('a,button,[data-cursor],[data-magnetic]').forEach(function(el){
          if (el.dataset.cursorBound) return;
          el.dataset.cursorBound = '1';
          el.addEventListener('mouseenter', function(){ rng.classList.add('hov'); });
          el.addEventListener('mouseleave', function(){ rng.classList.remove('hov'); });
        });
      }
    }
  }

  function observeReveals(){
    if (!io) {
      io = new IntersectionObserver(function(en){
        en.forEach(function(e){
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { threshold: .14 });
    }
    document.querySelectorAll('[data-reveal]:not([data-observed])').forEach(function(el){
      el.dataset.observed = '1';
      io.observe(el);
    });
    document.querySelectorAll('[data-stagger]').forEach(function(parent){
      if (parent.dataset.staggerBound) return;
      parent.dataset.staggerBound = '1';
      var kids = parent.children;
      var delay = parent.closest('.pillar') || parent.closest('.about-block') ? 250 : 70;
      for (var i = 0; i < kids.length; i++) {
        kids[i].setAttribute('data-reveal', '');
        kids[i].style.transitionDelay = (i * delay) + 'ms';
        if (!kids[i].dataset.observed) {
          kids[i].dataset.observed = '1';
          io.observe(kids[i]);
        }
      }
    });
  }

  function observeCounters(){
    if (!cio) {
      cio = new IntersectionObserver(function(en){
        en.forEach(function(e){
          if (e.isIntersecting) { animateCount(e.target); cio.unobserve(e.target); }
        });
      }, { threshold: .5 });
    }
    document.querySelectorAll('[data-count]:not([data-count-observed])').forEach(function(el){
      el.dataset.countObserved = '1';
      cio.observe(el);
    });
  }

  function animateCount(el){
    var target = parseFloat(el.dataset.count);
    var dec = parseInt(el.dataset.dec || '0', 10);
    var suffix = el.dataset.suffix || '';
    if (reduce) { el.textContent = (dec ? target.toFixed(dec) : Math.round(target)) + suffix; return; }
    var dur = 1600, start = performance.now();
    (function tick(now){
      var p = Math.min((now - start) / dur, 1);
      var val = target * (1 - Math.pow(1 - p, 3));
      el.textContent = (dec ? val.toFixed(dec) : Math.round(val)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }

  function startScramble(){
    document.querySelectorAll('[data-scramble]').forEach(function(el){
      var fin = el.dataset.scramble;
      if (!fin) return;
      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&@àéè•0123456789';
      if (reduce) { el.textContent = fin; return; }
      var frame = 0, len = fin.length;
      var queue = fin.split('').map(function(c,i){
        return { c: c, start: Math.floor(i * 1.4) + Math.floor(Math.random() * 8), end: 0 };
      });
      queue.forEach(function(q){ q.end = q.start + 8 + Math.floor(Math.random() * 12); });
      (function run(){
        var out = '', complete = 0;
        for (var i = 0; i < len; i++) {
          var q = queue[i];
          if (frame >= q.end) { out += q.c; complete++; }
          else if (frame >= q.start) { out += '<span style="color:var(--coral);opacity:.7">' + chars[Math.floor(Math.random() * chars.length)] + '</span>'; }
        }
        el.innerHTML = out;
        frame++;
        if (complete < len) requestAnimationFrame(run);
        else el.textContent = fin;
      })();
    });
  }

  function bindGallery(){
    document.querySelectorAll('.case-thumb:not([data-gallery-bound])').forEach(function(btn){
      btn.dataset.galleryBound = '1';
      btn.addEventListener('click', function(){
        var caseId = btn.dataset.case;
        var src = btn.dataset.src;
        var splash = document.querySelector('.case-splash[data-case="' + caseId + '"]');
        if (!splash || splash.dataset.src === src) return;
        btn.closest('.case-gallery').querySelectorAll('.case-thumb').forEach(function(t){ t.classList.remove('is-active'); });
        btn.classList.add('is-active');
        splash.classList.add('is-fading');
        setTimeout(function(){
          splash.src = src;
          splash.dataset.src = src;
          splash.classList.remove('is-fading');
        }, 180);
      });
    });
  }

  function bindImageFallbacks(){
    document.querySelectorAll('.case-splash:not([data-error-bound])').forEach(function(img){
      img.dataset.errorBound = '1';
      img.addEventListener('error', function(){
        img.classList.add('is-broken');
        var wrap = img.closest('.phone-mock') || img.closest('.case-splash-wrap');
        if (wrap) wrap.classList.add('has-broken-image');
      });
    });
    document.querySelectorAll('.case-thumb img:not([data-error-bound])').forEach(function(img){
      img.dataset.errorBound = '1';
      img.addEventListener('error', function(){
        var btn = img.closest('.case-thumb');
        if (btn) btn.style.display = 'none';
      });
    });
  }

  function initActiveNav(){
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
    var sections = links.map(function(a){
      return { link: a, section: document.querySelector(a.getAttribute('href')) };
    }).filter(function(item){ return item.section; });
    if (!sections.length || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (!entry.isIntersecting) return;
        sections.forEach(function(item){
          var active = item.section === entry.target;
          item.link.classList.toggle('is-current', active);
          if (active) item.link.setAttribute('aria-current', 'true');
          else item.link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });

    sections.forEach(function(item){ observer.observe(item.section); });
  }

  function initThemeToggle(){
    var btn = document.getElementById('themeToggle');
    if (!btn) return;
    var saved = localStorage.getItem('knf_theme');
    if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    btn.addEventListener('click', function(){
      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (dark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('knf_theme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('knf_theme', 'dark');
      }
    });
  }

  function initBlogRead(){
    document.querySelectorAll('.blog-read:not([data-blog-bound])').forEach(function(btn){
      btn.dataset.blogBound = '1';
      btn.addEventListener('click', function(){
        var slug = btn.dataset.blogSlug;
        var body = document.getElementById('blog-' + slug);
        if (!body) return;
        var open = !body.classList.contains('hidden');
        document.querySelectorAll('.blog-body').forEach(function(b){ b.classList.add('hidden'); });
        document.querySelectorAll('.blog-read').forEach(function(b){ b.textContent = 'Lire l\'article →'; });
        if (!open) {
          body.classList.remove('hidden');
          btn.textContent = 'Fermer ↑';
        }
      });
    });
  }

  function initTestimonialForm(){
    var form = document.getElementById('testimonialForm');
    var starInput = document.getElementById('starInput');
    var ratingField = document.getElementById('t-rating');
    var note = document.getElementById('testimonialFormNote');
    if (!form || !starInput) return;

    function setStars(n){
      if (ratingField) ratingField.value = n;
      starInput.querySelectorAll('button').forEach(function(b){
        b.classList.toggle('on', Number(b.dataset.star) <= n);
      });
    }
    setStars(5);
    starInput.querySelectorAll('button').forEach(function(b){
      b.addEventListener('click', function(){ setStars(Number(b.dataset.star)); });
    });

    form.addEventListener('submit', function(e){
      e.preventDefault();
      if (!note) return;
      var payload = {
        author: form.author.value.trim(),
        role: form.role.value.trim(),
        company: form.company.value.trim(),
        quote: form.quote.value.trim(),
        rating: Number(ratingField ? ratingField.value : 5)
      };
      if (!payload.author || !payload.quote) {
        note.textContent = 'Merci de remplir tous les champs obligatoires.';
        note.className = 'form-note err';
        return;
      }
      note.textContent = 'Envoi en cours…';
      note.className = 'form-note';
      fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function(r){ return r.json().then(function(d){ if (!r.ok) throw new Error(d.error || 'Erreur'); return d; }); })
        .then(function(){
          form.reset();
          setStars(5);
          note.textContent = 'Merci ! Votre avis sera publié après modération.';
          note.className = 'form-note ok';
        })
        .catch(function(err){
          var wa = document.getElementById('contact-whatsapp');
          if (wa && wa.href && wa.href.indexOf('wa.me') > -1) {
            var txt = 'Bonjour Kalebia, je souhaite déposer un témoignage.\n\nNom : ' + payload.author +
              '\nPoste : ' + payload.role + '\nEntreprise : ' + payload.company +
              '\nNote : ' + payload.rating + '/5\n\n"' + payload.quote + '"';
            note.innerHTML = 'Envoi serveur indisponible. <a href="' + wa.href.split('?')[0] + '?text=' + encodeURIComponent(txt) + '" target="_blank" rel="noopener">Envoyer via WhatsApp</a>.';
            note.className = 'form-note';
          } else {
            note.textContent = err.message || 'Impossible d\'envoyer pour le moment.';
            note.className = 'form-note err';
          }
        });
    });
  }

  function initApp(){
    bindInteractions();
    bindGallery();
    bindImageFallbacks();
    initActiveNav();
    initThemeToggle();
    initBlogRead();
    initTestimonialForm();
    observeReveals();
    observeCounters();
  }

  /* ---------- PRELOADER ---------- */
  var loader = document.getElementById('loader');
  var ring = document.getElementById('ringfg');
  var pctn = document.getElementById('pctn');
  var statusEl = document.getElementById('lstatus');
  var lname = document.getElementById('lname');
  var CIRC = 489;
  var statuses = ['Connexion à la communauté…','Synchronisation du calendrier…','Chargement de l\u2019engagement…','Alignement des parties prenantes…','Préparation du tableau de bord…'];
  var done = false;

  function finishLoad(){
    if (done) return;
    done = true;
    loader.classList.add('done');
    document.body.classList.remove('loading');
    document.body.classList.add('ready');
    document.querySelectorAll('.hero .up').forEach(function(el,i){
      setTimeout(function(){ el.classList.add('go'); }, 120 * i + 120);
    });
    setTimeout(function(){ animateHeatmap(); drawSpark(); startScramble(); }, 360);
    setTimeout(function(){ if (loader && loader.parentNode) loader.style.display = 'none'; }, 1300);
  }

  function buildHeatmap(){
    var hm = document.getElementById('heatmap');
    if (!hm || hm.children.length) return;
    var cells = 18 * 7, frag = document.createDocumentFragment();
    for (var i = 0; i < cells; i++) {
      var s = document.createElement('span');
      var lvl = Math.random();
      var op = lvl < 0.3 ? 0.10 : lvl < 0.55 ? 0.28 : lvl < 0.78 ? 0.55 : lvl < 0.92 ? 0.8 : 1;
      var col = lvl > 0.92 ? '#5ba8d4' : (lvl > 0.78 ? '#d4b483' : '#f6f3ed');
      s.style.background = col === '#f6f3ed' ? 'rgba(246,243,237,' + op + ')' : col;
      frag.appendChild(s);
      hmArr.push(s);
    }
    hm.appendChild(frag);
  }

  function animateHeatmap(){
    hmArr.forEach(function(s,i){
      setTimeout(function(){
        s.style.transition = 'transform .5s var(--ease),opacity .5s';
        s.style.transform = 'scale(1)';
        s.style.opacity = '1';
      }, i * 7);
    });
    if (!reduce) {
      setInterval(function(){
        if (!hmArr.length) return;
        hmArr[Math.floor(Math.random() * hmArr.length)].animate(
          [{ opacity: .4 }, { opacity: 1 }, { opacity: .7 }],
          { duration: 900, easing: 'ease-out' }
        );
      }, 420);
    }
  }

  function drawSpark(){
    var sp = document.getElementById('sparkline');
    if (sp) { sp.style.transition = 'stroke-dashoffset 1.4s var(--ease)'; sp.style.strokeDashoffset = '0'; }
  }

  function bootPreloader(){
    buildHeatmap();
    if (location.protocol === 'file:') {
      document.body.classList.remove('loading');
      document.body.classList.add('ready');
      if (loader) loader.style.display = 'none';
      return;
    }
    if (reduce) {
      finishLoad();
      return;
    }
    try {
      var cv = document.getElementById('net');
      if (!cv) throw new Error('no canvas');
      var ctx = cv.getContext('2d');
      if (!ctx) throw new Error('no ctx');
      var W, H, DPR = Math.min(window.devicePixelRatio || 1, 2);
      var nodes = [], N = 0, conv = 0;

      function resize(){
        W = cv.clientWidth; H = cv.clientHeight;
        cv.width = W * DPR; cv.height = H * DPR;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      }
      function build(){
        resize();
        N = Math.max(46, Math.min(90, Math.floor(W * H / 14000)));
        nodes = [];
        for (var i = 0; i < N; i++) {
          nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .5, vy: (Math.random() - .5) * .5, r: Math.random() * 2 + 1.2 });
        }
      }
      build();
      window.addEventListener('resize', build);

      function frame(){
        if (done && conv > 1.2) return;
        ctx.clearRect(0, 0, W, H);
        var cox = W / 2, coy = H / 2;
        for (var i = 0; i < N; i++) {
          var n = nodes[i];
          if (done) { conv += 0.0008; n.x += (cox - n.x) * conv * 0.06; n.y += (coy - n.y) * conv * 0.06; }
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > W) n.vx *= -1;
          if (n.y < 0 || n.y > H) n.vy *= -1;
        }
        for (var a = 0; a < N; a++) {
          for (var b = a + 1; b < N; b++) {
            var dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y, d = Math.sqrt(dx * dx + dy * dy);
            if (d < 118) {
              ctx.strokeStyle = 'rgba(255,86,64,' + (0.16 * (1 - d / 118)) + ')';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(nodes[a].x, nodes[a].y);
              ctx.lineTo(nodes[b].x, nodes[b].y);
              ctx.stroke();
            }
          }
        }
        for (var k = 0; k < N; k++) {
          var p = nodes[k];
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, 6.2832);
          ctx.fillStyle = k % 5 === 0 ? 'rgba(244,160,36,.9)' : 'rgba(248,239,231,.78)';
          ctx.fill();
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);

      var prog = 0, target = 0, si = 0;
      if (statusEl) statusEl.textContent = statuses[0];
      function tickProgress(){
        target += Math.random() * 7 + 2;
        if (target > 100) target = 100;
        prog = lerp(prog, target, 1);
        var v = Math.min(100, Math.round(prog));
        if (pctn) pctn.textContent = v;
        if (ring) ring.style.strokeDashoffset = CIRC * (1 - v / 100);
        if (v >= 20 * (si + 1) && si < statuses.length - 1 && statusEl) { si++; statusEl.textContent = statuses[si]; }
        if (v >= 72 && lname) {
          lname.querySelectorAll('span').forEach(function(s, idx){
            if (!s.dataset.shown) {
              s.dataset.shown = 1;
              setTimeout(function(){
                s.style.transition = 'transform .6s var(--ease,cubic-bezier(.16,1,.3,1)),opacity .6s';
                s.style.transform = 'translateY(0)';
                s.style.opacity = '1';
              }, idx * 32);
            }
          });
        }
        if (v >= 100) { if (statusEl) statusEl.textContent = 'Prêt.'; setTimeout(finishLoad, 520); return; }
        setTimeout(tickProgress, 130);
      }
      setTimeout(tickProgress, 260);
    } catch (err) {
      finishLoad();
    }
  }

  function initFloatIcons(){
    var stage = document.getElementById('floatStage');
    var wrap = document.getElementById('floatWrap');
    if (!stage || !wrap) return;
    if (loader && !reduce && !touch) {
      loader.addEventListener('pointermove', function(e){
        var r = wrap.getBoundingClientRect();
        var px = (e.clientX - (r.left + r.width / 2)) / r.width;
        var py = (e.clientY - (r.top + r.height / 2)) / r.height;
        stage.style.transform = 'rotateY(' + (px * 18) + 'deg) rotateX(' + (-py * 18) + 'deg)';
      });
      loader.addEventListener('pointerleave', function(){ stage.style.transform = ''; });
    }
    stage.querySelectorAll('.fchip').forEach(function(chip){
      chip.addEventListener('pointerdown', function(){
        chip.classList.remove('pop');
        void chip.offsetWidth;
        chip.classList.add('pop');
      });
      chip.addEventListener('animationend', function(ev){
        if (ev.animationName === 'fpop') chip.classList.remove('pop');
      });
    });
  }

  function initHeroOrbit(){
    var stage = document.getElementById('orbitStage');
    var host = document.getElementById('heroOrbit');
    if (!stage || !host) return;
    var meter = host.querySelector('.orbit-meter');
    var countEl = document.getElementById('orbitCount');
    var chips = Array.prototype.slice.call(stage.querySelectorAll('.ochip'));
    var count = 0;
    try { count = parseInt(localStorage.getItem('knf_orbit') || '0', 10) || 0; } catch (e) {}
    if (countEl) countEl.textContent = count;

    var bodies = [];
    var lastE = null;
    var lastT = 0;
    var physicsOn = !reduce;

    function parsePct(v, total){
      if (!v) return 0;
      v = String(v).trim();
      if (v.slice(-1) === '%') return parseFloat(v) / 100 * total;
      return parseFloat(v) || 0;
    }

    function mobScale(width){
      if (width < 380) return 0.6;
      if (width < 600) return 0.7;
      if (width < 920) return 0.84;
      return 1;
    }

    function initBodies(){
      var w = stage.clientWidth;
      var h = stage.clientHeight;
      var scale = mobScale(w);
      var prevV = bodies.map(function(b){ return { vx: b.vx, vy: b.vy }; });
      bodies = chips.map(function(chip, i){
        var st = chip.style;
        var baseSz = parseFloat(st.getPropertyValue('--sz')) || chip.offsetWidth || 72;
        var sz = baseSz * scale;
        var depth = parseFloat(chip.dataset.depth || '1');
        var x = parsePct(st.getPropertyValue('--x'), w) + sz * 0.5;
        var y = parsePct(st.getPropertyValue('--y'), h) + sz * 0.5;
        chip.style.left = '0';
        chip.style.top = '0';
        chip.style.width = sz + 'px';
        chip.style.height = sz + 'px';
        var pv = prevV[i];
        return {
          el: chip,
          floaty: chip.querySelector('.floaty'),
          x: x,
          y: y,
          vx: pv ? pv.vx : (Math.random() - 0.5) * 1.1,
          vy: pv ? pv.vy : (Math.random() - 0.5) * 1.1,
          r: sz * 0.5,
          m: sz * depth,
          phase: Math.random() * Math.PI * 2,
          depth: depth
        };
      });
    }

    function collide(a, b){
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var minD = a.r + b.r;
      if (dist >= minD || dist === 0) return;
      var nx = dx / dist;
      var ny = dy / dist;
      var overlap = minD - dist;
      var invMass = 1 / a.m + 1 / b.m;
      a.x -= nx * overlap * (b.m / (a.m + b.m));
      a.y -= ny * overlap * (b.m / (a.m + b.m));
      b.x += nx * overlap * (a.m / (a.m + b.m));
      b.y += ny * overlap * (a.m / (a.m + b.m));
      var dvx = b.vx - a.vx;
      var dvy = b.vy - a.vy;
      var dvn = dvx * nx + dvy * ny;
      if (dvn >= 0) return;
      var rest = 0.82;
      var impulse = -(1 + rest) * dvn / invMass;
      a.vx -= impulse * nx / a.m;
      a.vy -= impulse * ny / a.m;
      b.vx += impulse * nx / b.m;
      b.vy += impulse * ny / b.m;
    }

    function bounceWalls(b, w, h){
      var rest = 0.72;
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx) * rest; }
      else if (b.x + b.r > w) { b.x = w - b.r; b.vx = -Math.abs(b.vx) * rest; }
      if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy) * rest; }
      else if (b.y + b.r > h) { b.y = h - b.r; b.vy = -Math.abs(b.vy) * rest; }
    }

    function physicsStep(dt){
      var w = stage.clientWidth;
      var h = stage.clientHeight;
      if (!w || !h) return;
      var mx = 0, my = 0, hr = null;
      if (lastE && !touch) {
        hr = host.getBoundingClientRect();
        mx = lastE.clientX - hr.left;
        my = lastE.clientY - hr.top;
      }
      var drag = Math.pow(0.985, dt / 16);
      bodies.forEach(function(b){
        b.phase += dt * 0.0014;
        b.vx += Math.sin(b.phase) * 0.028;
        b.vy += Math.cos(b.phase * 0.87) * 0.024;
        if (hr) {
          var dx = b.x - mx;
          var dy = b.y - my;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var R = 150;
          if (dist < R && dist > 0) {
            var f = (1 - dist / R) * 3.2 * b.depth;
            b.vx += dx / dist * f;
            b.vy += dy / dist * f;
          }
        }
        b.vx *= drag;
        b.vy *= drag;
        var spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        var maxSpd = 2.8;
        if (spd > maxSpd) { b.vx = b.vx / spd * maxSpd; b.vy = b.vy / spd * maxSpd; }
        b.x += b.vx * (dt / 16);
        b.y += b.vy * (dt / 16);
        bounceWalls(b, w, h);
      });
      for (var pass = 0; pass < 4; pass++) {
        for (var i = 0; i < bodies.length; i++) {
          for (var j = i + 1; j < bodies.length; j++) collide(bodies[i], bodies[j]);
        }
      }
      bodies.forEach(function(b){
        var bob = Math.sin(b.phase * 2.1) * 4;
        var tiltX = Math.max(-14, Math.min(14, -b.vy * 2.2));
        var tiltZ = Math.max(-12, Math.min(12, b.vx * 2.6));
        b.el.style.transform = 'translate(' + (b.x - b.r).toFixed(2) + 'px,' + (b.y - b.r + bob).toFixed(2) + 'px)';
        if (b.floaty) b.floaty.style.transform = 'rotateX(' + tiltX.toFixed(2) + 'deg) rotateZ(' + tiltZ.toFixed(2) + 'deg)';
      });
    }

    function physicsLoop(now){
      if (!physicsOn) return;
      if (!lastT) lastT = now;
      var dt = Math.min(40, now - lastT);
      lastT = now;
      physicsStep(dt);
      if (lastE && !touch) {
        var r = host.getBoundingClientRect();
        var px = (lastE.clientX - r.left) / r.width - 0.5;
        var py = (lastE.clientY - r.top) / r.height - 0.5;
        stage.style.transform = 'rotateY(' + (px * 16).toFixed(2) + 'deg) rotateX(' + (-py * 16).toFixed(2) + 'deg)';
      }
      requestAnimationFrame(physicsLoop);
    }

    if (physicsOn) {
      host.classList.add('physics-on');
      requestAnimationFrame(function(){
        initBodies();
        requestAnimationFrame(physicsLoop);
      });
      if (!touch) {
        host.addEventListener('pointermove', function(e){ lastE = e; });
        host.addEventListener('pointerleave', function(){
          lastE = null;
          stage.style.transform = '';
        });
      }
      var resizeTimer;
      window.addEventListener('resize', function(){
        if (!bodies.length) return;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(initBodies, 120);
      });
    } else if (!reduce && !touch) {
      var raf = null;
      host.addEventListener('pointermove', function(e){ lastE = e; if (!raf) raf = requestAnimationFrame(apply); });
      host.addEventListener('pointerleave', function(){
        lastE = null; stage.style.transform = '';
        chips.forEach(function(c){ c.style.transform = ''; });
      });
      function apply(){
        raf = null; if (!lastE) return;
        var r = host.getBoundingClientRect();
        var mx = lastE.clientX - r.left, my = lastE.clientY - r.top;
        var px = mx / r.width - .5, py = my / r.height - .5;
        stage.style.transform = 'rotateY(' + (px * 16).toFixed(2) + 'deg) rotateX(' + (-py * 16).toFixed(2) + 'deg)';
        chips.forEach(function(c){
          var cr = c.getBoundingClientRect();
          var cx = cr.left + cr.width / 2 - r.left, cy = cr.top + cr.height / 2 - r.top;
          var dx = cx - mx, dy = cy - my, dist = Math.sqrt(dx * dx + dy * dy);
          var R = 160, depth = parseFloat(c.dataset.depth || '1'), tx = 0, ty = 0;
          if (dist < R && dist > 0) { var f = (1 - dist / R) * 46 * depth; tx = dx / dist * f; ty = dy / dist * f; }
          c.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px)';
        });
      }
    }

    function burst(chip){
      count++;
      try { localStorage.setItem('knf_orbit', String(count)); } catch (e) {}
      if (countEl) countEl.textContent = count;
      if (meter) { meter.classList.remove('bump'); void meter.offsetWidth; meter.classList.add('bump'); }
      chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop');
      if (physicsOn) {
        var body = null;
        for (var bi = 0; bi < bodies.length; bi++) {
          if (bodies[bi].el === chip) { body = bodies[bi]; break; }
        }
        if (body) {
          body.vx += (Math.random() - 0.5) * 4.5;
          body.vy -= 2.8 + Math.random() * 2.2;
        }
      }
      var b = document.createElement('span');
      b.className = 'orbit-burst';
      b.textContent = '+1';
      b.style.setProperty('--c', '#5ba8d4');
      var cr = chip.getBoundingClientRect(), hr = stage.getBoundingClientRect();
      b.style.left = (cr.left + cr.width / 2 - hr.left) + 'px';
      b.style.top = (cr.top + cr.height / 2 - hr.top) + 'px';
      stage.appendChild(b);
      var killed = false;
      function kill(){ if (killed) return; killed = true; if (b.parentNode) b.parentNode.removeChild(b); }
      b.addEventListener('animationend', kill);
      setTimeout(kill, 1200);
    }

    chips.forEach(function(chip){
      chip.addEventListener('click', function(){ burst(chip); });
      chip.addEventListener('animationend', function(ev){ if (ev.animationName === 'opop') chip.classList.remove('pop'); });
    });
    if (meter) meter.addEventListener('transitionend', function(ev){
      if (ev.propertyName === 'transform') meter.classList.remove('bump');
    });
  }

  var skipBtn = document.getElementById('skip');
  if (skipBtn) skipBtn.addEventListener('click', finishLoad);
  setTimeout(function(){ if (!done && !reduce) finishLoad(); }, 7000);

  initFloatIcons();
  initHeroOrbit();
  bootPreloader();

  window.loadSiteData().then(function(data){
    if (window.renderSite) window.renderSite(data);
    initApp();
  }).catch(function(){
    initApp();
  });

  if (!touch && !reduce) {
    document.body.classList.add('cursor-on');
    var dot = document.getElementById('cdot'), rng = document.getElementById('cring');
    var mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my;
    window.addEventListener('mousemove', function(e){
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
    });
    (function loop(){
      rx = lerp(rx, mx, .18); ry = lerp(ry, my, .18);
      rng.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
      requestAnimationFrame(loop);
    })();
  }

  if (!touch && !reduce) {
    document.querySelectorAll('.blob').forEach(function(b){
      window.addEventListener('mousemove', function(e){
        var nx = e.clientX / window.innerWidth - .5;
        var ny = e.clientY / window.innerHeight - .5;
        var d = parseFloat(b.dataset.depth || .2);
        b.style.transform = 'translate(' + (nx * 60 * d) + 'px,' + (ny * 60 * d) + 'px)';
      });
    });
  }

  var progBar = document.getElementById('prog');
  window.addEventListener('scroll', function(){
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var pct = h > 0 ? Math.round(window.scrollY / h * 100) : 0;
    progBar.style.width = pct + '%';
    progBar.setAttribute('aria-valuenow', pct);
  }, { passive: true });

  var burger = document.getElementById('burger');
  var links = document.getElementById('navlinks');

  function syncNavA11y(){
    if (mobileNav.matches && !links.classList.contains('open')) links.setAttribute('aria-hidden', 'true');
    else links.removeAttribute('aria-hidden');
  }
  syncNavA11y();
  mobileNav.addEventListener('change', syncNavA11y);

  function openNav(){
    links.classList.add('open');
    burger.setAttribute('aria-expanded', 'true');
    links.removeAttribute('aria-hidden');
    var first = links.querySelector('a');
    if (first) first.focus();
  }

  function closeNav(){
    links.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    syncNavA11y();
    burger.focus();
  }

  burger.addEventListener('click', function(){
    if (links.classList.contains('open')) closeNav();
    else openNav();
  });

  links.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', closeNav); });

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && links.classList.contains('open')) closeNav();
  });

  links.addEventListener('keydown', function(e){
    if (e.key !== 'Tab' || !links.classList.contains('open')) return;
    var focusable = links.querySelectorAll('a');
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();
