/* Archeoreplica — wersja pokazowa · „Zejdź w głąb”
   miernik głębokości · pędzel + pył · odkopywanie hero · odsłanianie zdjęć · klipy w widoku
   kreator dla inwestora · zgadywanka replik · lupa i mikroskop · galerie · lightbox */
(function () {
  'use strict';
  document.documentElement.classList.remove('no-js');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var IMG = 'media/img/';

  /* ── intro: naczynie składa się z fragmentu (raz na sesję) ── */
  var intro = $('.intro'), seen = false, T = 0;
  try { seen = sessionStorage.getItem('ar-intro') === '1'; sessionStorage.setItem('ar-intro', '1'); } catch (e) {}
  if (intro) {
    if (reduce || seen) intro.remove();
    else { T = 2100; document.documentElement.style.overflow = 'hidden'; setTimeout(function () { intro.classList.add('done'); document.documentElement.style.overflow = ''; setTimeout(function () { intro.remove(); }, 800); }, T); }
  }

  /* ── dane galerii ── */
  function range(p, a, b, skip) { var o = []; for (var i = a; i <= b; i++) if (!skip || skip.indexOf(i) < 0) o.push(IMG + p + '-' + i + '.webp'); return o; }
  var G = {
    ae: range('g31', 56, 63).concat([IMG + 'skate.webp']),
    repliki: [IMG + 'repliki.webp'].concat(range('g35', 40, 47)),
    lekcje: [IMG + 'lekcje.webp'].concat(range('g40', 0, 7)),
    pokazy: [IMG + 'pokazy.webp', IMG + 'tkaniny.webp'].concat(range('g38', 16, 23)),
    wystawy: [IMG + 'wystawy.webp', IMG + 'namiot.webp', IMG + 'g39-wystawa-2.webp'].concat(range('g39', 8, 15, [11])),
    teren: [IMG + 'hero2.webp', IMG + 'about.webp', IMG + 'ceramika-stos.webp'].concat(range('g36', 32, 39), range('g37', 24, 31))
  };
  var TABS = {
    lekcje: 'Wykłady i zajęcia praktyczne dla przedszkoli, szkół i placówek kulturalno-oświatowych. Inaczej prowadzimy lekcję dla najmłodszych, inaczej dla starszych — zawsze z kontaktem z replikami.',
    pokazy: 'Pokazy dawnych rzemiosł i festyny archeologiczne — edukacja połączona z rozrywką dla dzieci i dorosłych.',
    wystawy: 'Wystawy z rekonstrukcjami i replikami, które pozwalają zobaczyć codzienność dawnych społeczności z bliska.'
  };
  var ERAS = {
    kamien: 'Epoka kamienia — krzemień, kość i poroże, żarna i malowidła. Uczestnicy próbują technik naszych najdawniejszych przodków.',
    braz: 'Epoka brązu — życie codzienne w osadzie: ceramika, tkactwo i rzemiosło, przedstawione na replikach.',
    zelazo: 'Epoka żelaza — narzędzia, stroje i zajęcia w dawnej osadzie, z replikami przedmiotów do obejrzenia z bliska.',
    tematyczne: 'Zajęcia tematyczne — dopasowane do grupy wiekowej i programu placówki. Napisz, czego szukasz, a zaproponujemy temat.'
  };

  /* ── słowo po słowie ── */
  $$('.split').forEach(function (el) {
    var words = el.textContent.split(/(\s+)/), i = 0; el.textContent = '';
    words.forEach(function (w) {
      if (/^\s+$/.test(w)) { el.appendChild(document.createTextNode(w)); return; }
      var s = document.createElement('span'); s.className = 'w'; s.style.setProperty('--i', i++); s.textContent = w; el.appendChild(s);
    });
  });

  /* ── pojawianie się ── */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); if (e.target.dataset.count) count(e.target); } });
  }, { threshold: .18, rootMargin: '0px 0px -6% 0px' });
  function watch(root) { $$('.reveal,.split,.dig,.stratum,.mosaic figure,[data-count]', root).forEach(function (el) { if (!el.classList.contains('in')) io.observe(el); }); }
  watch(document);
  $('.hero .split') && setTimeout(function () { $$('.hero .split,.hero .reveal').forEach(function (e) { e.classList.add('in'); }); }, T + 250);

  /* ── liczniki ── */
  function count(b) {
    var to = +b.dataset.count, pre = b.dataset.prefix || '', plain = 'plain' in b.dataset, t0 = null, from = plain ? to - 16 : 0;
    if (reduce) return;
    function f(t) { t0 = t0 || t; var k = Math.min(1, (t - t0) / 1400), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); b.textContent = pre + v; if (k < 1) requestAnimationFrame(f); }
    requestAnimationFrame(f);
  }

  /* ── nagłówek, pasek postępu, miernik głębokości ── */
  var top = $('.top'), prog = $('.top__progress'), depth = $('.depth'), dm = $('.depth__m'), fill = $('.depth__fill'), eraEl = $('.depth__era');
  var secs = $$('[data-depth]'), maxD = 4.2, curEra = '', sticky = $('.sticky-cta'), navLinks = $$('.top__nav a');
  function onScroll() {
    var y = scrollY, h = document.documentElement.scrollHeight - innerHeight, mid = y + innerHeight * .5;
    top.classList.toggle('is-small', y > 40);
    prog.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    var d = 0, era = secs[0].dataset.era, act = null;
    for (var i = 0; i < secs.length; i++) {
      var s = secs[i], t = s.offsetTop, b = t + s.offsetHeight;
      if (mid >= t) { era = s.dataset.era; act = s;
        var nx = secs[i + 1], d0 = +s.dataset.depth, d1 = nx ? +nx.dataset.depth : maxD;
        d = d0 + (d1 - d0) * Math.min(1, (mid - t) / Math.max(1, b - t)); }
    }
    dm.textContent = d.toFixed(1).replace('.', ',');
    fill.style.height = (d / maxD * 100) + '%';
    depth.classList.toggle('on', y > innerHeight * .35);
    if (era !== curEra) { curEra = era; eraEl.classList.add('swap'); setTimeout(function () { eraEl.textContent = curEra; eraEl.classList.remove('swap'); }, 220); }
    sticky.classList.toggle('on', y > innerHeight * .9 && (!act || act.id !== 'kontakt'));
    var edu = act && (act.id === 'edukacja' || act.id === 'repliki');
    sticky.textContent = edu ? 'Zamów zajęcia' : 'Zapytaj o nadzór';
    sticky.setAttribute('href', edu ? '#kontakt' : '#kreator');
    sticky.dataset.topic = edu ? 'Lekcje i warsztaty' : '';
    navLinks.forEach(function (a) { a.classList.toggle('is-on', !!act && a.getAttribute('href') === '#' + act.id); });
    parallax();
  }
  var band = $('.band'), bandMedia = $('.band__media');
  function parallax() { if (reduce || !band) return; var r = band.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; bandMedia.style.transform = 'translateY(' + ((r.top + r.height / 2 - innerHeight / 2) * -.12) + 'px)'; }
  var ticking = false;
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; onScroll(); }); } }, { passive: true });
  addEventListener('resize', onScroll); onScroll();
  sticky.addEventListener('click', function () { if (sticky.dataset.topic) setTopic(sticky.dataset.topic); });

  /* ── menu mobilne ── */
  var burger = $('.top__burger'), nav = $('.top__nav');
  burger.addEventListener('click', function () { var o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });
  navLinks.forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('open'); burger.setAttribute('aria-expanded', false); }); });

  /* ── pędzel zamiast kursora + obłoczek pyłu ── */
  var brush = $('.brush');
  if (fine && !reduce) {
    document.documentElement.classList.add('has-brush');
    addEventListener('pointermove', function (e) { brush.style.transform = 'translate(' + (e.clientX - 6) + 'px,' + (e.clientY - 28) + 'px)'; }, { passive: true });
    addEventListener('pointerdown', function (e) { puff(e.clientX, e.clientY, 10); });
  }
  function puff(x, y, n) {
    for (var i = 0; i < n; i++) {
      var p = document.createElement('span'); p.className = 'puff'; var a = Math.random() * 6.28, r = 18 + Math.random() * 30;
      p.style.left = x + 'px'; p.style.top = y + 'px'; p.style.setProperty('--dx', Math.cos(a) * r + 'px'); p.style.setProperty('--dy', (Math.sin(a) * r - 12) + 'px');
      p.style.background = ['#c9a774', '#b08a58', '#e2cba2'][i % 3]; document.body.appendChild(p); setTimeout(p.remove.bind(p), 950);
    }
  }

  /* ── pył w świetle (cała strona) ── */
  (function () {
    var c = $('.dust'); if (!c || reduce) return; var x = c.getContext('2d'), W, H, P = [], dpr = Math.min(2, devicePixelRatio || 1), N = innerWidth < 700 ? 22 : 46;
    function size() { W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); addEventListener('resize', size);
    for (var i = 0; i < N; i++) P.push({ x: Math.random() * W, y: Math.random() * H, r: .6 + Math.random() * 1.8, vx: (Math.random() - .5) * .15, vy: -.05 - Math.random() * .18, a: .15 + Math.random() * .35, t: Math.random() * 6 });
    var heroVis = true; new IntersectionObserver(function (e) { heroVis = e[0].isIntersecting; }, { threshold: .4 }).observe($('.hero'));
    function tick() {
      x.clearRect(0, 0, W, H);
      if (!heroVis && !document.hidden) P.forEach(function (p) {
        p.t += .01; p.x += p.vx + Math.sin(p.t) * .12; p.y += p.vy; if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; } if (p.x < -5) p.x = W + 5; if (p.x > W + 5) p.x = -5;
        x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.28); x.fillStyle = 'rgba(120,80,40,' + p.a + ')'; x.fill();
      });
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();

  /* ── hero: ziemia do odkopania ── */
  (function () {
    var hero = $('.hero'), c = $('.hero__soil'); if (!c) return;
    if (reduce) { c.remove(); return; }
    var x = c.getContext('2d'), W, H, done = false, painted = 0;
    function soil() {
      var r = hero.getBoundingClientRect(); W = c.width = Math.round(r.width); H = c.height = Math.round(r.height);
      var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#b89a72'); g.addColorStop(.5, '#a6855c'); g.addColorStop(1, '#7c5c3c');
      x.globalCompositeOperation = 'source-over'; x.fillStyle = g; x.fillRect(0, 0, W, H);
      for (var i = 0; i < W * H / 90; i++) { x.fillStyle = 'rgba(' + (Math.random() < .5 ? '60,38,20,' : '235,215,180,') + (Math.random() * .22) + ')'; x.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2.4, 1 + Math.random() * 2.4); }
      for (i = 0; i < W * H / 9000; i++) { var px = Math.random() * W, py = Math.random() * H, pr = 2 + Math.random() * 7; x.beginPath(); x.ellipse(px, py, pr, pr * (.6 + Math.random() * .4), Math.random() * 3, 0, 6.28); x.fillStyle = ['#8d7457', '#c3ab88', '#6e5038', '#d6c4a3'][i % 4]; x.fill(); }
      x.globalCompositeOperation = 'destination-out';
    }
    function dab(px, py, r) {
      var g = x.createRadialGradient(px, py, r * .2, px, py, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 6.28); x.fill(); painted += r * r;
    }
    function stroke(x0, y0, x1, y1, r) { var d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, d / (r * .35)); for (var i = 0; i <= n; i++) dab(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, r * (.85 + Math.random() * .3)); }
    function finish(ms) { if (done) return; done = true; hero.classList.add('cleared'); c.style.transition = 'opacity ' + (ms || 1400) + 'ms ease'; c.style.opacity = 0; setTimeout(function () { c.remove(); }, (ms || 1400) + 100); }
    soil();
    // automatyczne pociągnięcia pędzla na start
    var R = Math.max(70, Math.min(W, H) * .14), path = [[.08, .3, .55, .22], [.5, .2, .95, .38], [.9, .45, .25, .55], [.15, .62, .75, .72], [.7, .7, .98, .62]], k = 0, t = 0;
    function auto() {
      if (done || k >= path.length) { if (!fine) setTimeout(function () { finish(1200); }, 700); return; }
      var p = path[k], a = t / 14, b = (t + 1) / 14;
      stroke(W * (p[0] + (p[2] - p[0]) * a), H * (p[1] + (p[3] - p[1]) * a), W * (p[0] + (p[2] - p[0]) * b), H * (p[1] + (p[3] - p[1]) * b), R);
      if (++t >= 14) { t = 0; k++; }
      requestAnimationFrame(auto);
    }
    setTimeout(auto, T + 500);
    var last = null;
    c.addEventListener('pointermove', function (e) {
      if (done) return; var r = c.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      if (last) stroke(last[0], last[1], px, py, R * .8); last = [px, py];
      if (painted > W * H * 2.2) finish();
      if (Math.random() < .25) puff(e.clientX, e.clientY, 2);
    });
    c.addEventListener('pointerleave', function () { last = null; });
    setTimeout(function () { finish(1800); }, T + (fine ? 9000 : 4200));
    addEventListener('scroll', function () { if (scrollY > innerHeight * .3) finish(600); }, { passive: true });
  })();

  /* ── klipy: ładowanie i odtwarzanie tylko w widoku ── */
  function arm(v) {
    if (v.dataset.armed) return; v.dataset.armed = 1; v.src = v.dataset.src;
    v.addEventListener('playing', function () { v.classList.add('on'); var card = v.closest('.card'); if (card) card.classList.add('playing'); });
    v.addEventListener('error', function () { v.remove(); });
  }
  var vio = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var v = e.target, card = v.closest('.card');
      if (e.isIntersecting) { if (card && fine) return; arm(v); v.play().catch(function () {}); }
      else if (v.dataset.armed) { v.pause(); }
    });
  }, { threshold: .35 });
  $$('video[data-src]').forEach(function (v) { if (reduce) return; vio.observe(v); });
  // na komputerze klipy w kartach startują po najechaniu
  if (fine && !reduce) $$('.card').forEach(function (card) {
    var v = $('video', card); if (!v) return;
    card.addEventListener('mouseenter', function () { arm(v); v.play().catch(function () {}); });
    card.addEventListener('mouseleave', function () { v.pause(); card.classList.remove('playing'); });
  });

  /* ── karty: lekki efekt 3D + przejście do podstrony ── */
  $$('.card').forEach(function (card) {
    card.addEventListener('click', function () { if (card.dataset.href) open(card.dataset.href, '_blank', 'noopener'); });
    if (!fine || reduce) return;
    card.addEventListener('mousemove', function (e) { var r = card.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width - .5, dy = (e.clientY - r.top) / r.height - .5; card.style.transform = 'perspective(900px) rotateY(' + dx * 7 + 'deg) rotateX(' + (-dy * 7) + 'deg) translateY(-4px)'; });
    card.addEventListener('mouseleave', function () { card.style.transform = ''; });
  });

  /* ── lupa na karcie „Badania naukowe” ── */
  $$('.card--loupe').forEach(function (card) {
    var m = $('.card__media', card), img = $('img', m), l = $('.loupe', m), Z = 2.6;
    l.style.backgroundImage = 'url(' + img.getAttribute('src') + ')';
    m.addEventListener('pointermove', function (e) {
      var r = m.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      l.style.left = px + 'px'; l.style.top = py + 'px';
      l.style.backgroundSize = (r.width * Z) + 'px ' + (r.height * Z) + 'px';
      l.style.backgroundPosition = (-px * Z + 75) + 'px ' + (-py * Z + 75) + 'px';
    });
  });

  /* ── mikroskop: przesuwanie powiększenia ── */
  $$('.scope__img').forEach(function (s) {
    var img = $('img', s);
    s.addEventListener('pointermove', function (e) { var r = s.getBoundingClientRect(); img.style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + '% ' + ((e.clientY - r.top) / r.height * 100) + '%'; img.style.transform = 'scale(2.4)'; });
    s.addEventListener('pointerleave', function () { img.style.transform = ''; img.style.transformOrigin = ''; });
  });

  /* ── żar z ogniska w paśmie z namiotem ── */
  (function () {
    var c = $('.band__embers'); if (!c || reduce) return; var x = c.getContext('2d'), W, H, P = [], on = false;
    function size() { W = c.width = band.offsetWidth; H = c.height = band.offsetHeight; }
    size(); addEventListener('resize', size);
    new IntersectionObserver(function (e) { on = e[0].isIntersecting; if (on) requestAnimationFrame(tick); }).observe(band);
    function tick() {
      if (!on) return; x.clearRect(0, 0, W, H);
      if (P.length < 70 && Math.random() < .6) P.push({ x: W * (.25 + Math.random() * .5), y: H + 5, vx: (Math.random() - .5) * .6, vy: -.6 - Math.random() * 1.4, l: 1, r: 1 + Math.random() * 2.2 });
      P = P.filter(function (p) { p.x += p.vx + Math.sin(p.y / 40) * .3; p.y += p.vy; p.l -= .0045; return p.l > 0; });
      P.forEach(function (p) { x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.28); x.fillStyle = 'rgba(255,' + (140 + p.l * 90 | 0) + ',60,' + p.l * .85 + ')'; x.shadowBlur = 10; x.shadowColor = '#ff9a3c'; x.fill(); });
      requestAnimationFrame(tick);
    }
  })();

  /* ── lightbox ── */
  var lb = $('.lb'), lbImg = $('img', lb), lbList = [], lbI = 0;
  function lbShow(list, i) { lbList = list; lbI = (i + list.length) % list.length; lbImg.src = list[lbI]; lb.hidden = false; document.body.style.overflow = 'hidden'; }
  function lbHide() { lb.hidden = true; document.body.style.overflow = ''; }
  $('.lb__x').onclick = lbHide; $('.lb__p').onclick = function () { lbShow(lbList, lbI - 1); }; $('.lb__n').onclick = function () { lbShow(lbList, lbI + 1); };
  lb.addEventListener('click', function (e) { if (e.target === lb) lbHide(); });
  addEventListener('keydown', function (e) { if (lb.hidden) return; if (e.key === 'Escape') lbHide(); if (e.key === 'ArrowLeft') lbShow(lbList, lbI - 1); if (e.key === 'ArrowRight') lbShow(lbList, lbI + 1); });

  /* ── przewijane paski galerii (same płyną, można przeciągać) ── */
  $$('[data-gallery]').forEach(function (tr) {
    var list = G[tr.dataset.gallery], strip = tr.parentNode;
    list.concat(list).forEach(function (src, i) { var im = new Image(); im.src = src; im.alt = 'Zdjęcie z galerii Archeoreplica'; im.loading = 'lazy'; im.draggable = false; im.dataset.i = i % list.length; tr.appendChild(im); });
    var pos = 0, v = reduce ? 0 : -.35, drag = false, sx = 0, sp = 0, moved = 0, vis = false;
    new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }).observe(strip);
    function loop() { if (vis && !drag) pos += v; var half = tr.scrollWidth / 2; if (half) { if (pos < -half) pos += half; if (pos > 0) pos -= half; } tr.style.transform = 'translateX(' + pos + 'px)'; requestAnimationFrame(loop); }
    requestAnimationFrame(loop);
    strip.addEventListener('pointerdown', function (e) { drag = true; moved = 0; sx = e.clientX; sp = pos; strip.classList.add('drag'); strip.setPointerCapture(e.pointerId); });
    strip.addEventListener('pointermove', function (e) { if (!drag) return; moved = Math.abs(e.clientX - sx); pos = sp + (e.clientX - sx); });
    strip.addEventListener('pointerup', function (e) { drag = false; strip.classList.remove('drag'); if (moved < 6) { var t = document.elementFromPoint(e.clientX, e.clientY); if (t && t.dataset.i) lbShow(list, +t.dataset.i); } });
  });

  /* ── mozaiki ── */
  function mosaic(box, list) {
    box.innerHTML = '';
    list.forEach(function (src, i) { var f = document.createElement('figure'), im = new Image(); im.src = src; im.alt = 'Zdjęcie z działalności Archeoreplica'; im.loading = 'lazy'; f.appendChild(im); f.style.transitionDelay = (i % 8) * 60 + 'ms'; f.onclick = function () { lbShow(list, i); }; box.appendChild(f); });
    watch(box);
  }
  $$('[data-mosaic-static]').forEach(function (b) { mosaic(b, G[b.dataset.mosaicStatic]); });
  var eduBox = $('[data-mosaic]'), ink = $('.tabs__ink'), desc = $('.tabs__desc');
  function tab(btn) {
    $$('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b === btn); });
    ink.style.left = btn.offsetLeft + 'px'; ink.style.width = btn.offsetWidth + 'px';
    desc.textContent = TABS[btn.dataset.tab]; mosaic(eduBox, G[btn.dataset.tab]);
  }
  $$('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { tab(b); }); });
  tab($('[data-tab]')); addEventListener('resize', function () { var b = $('[data-tab][aria-selected="true"]'); ink.style.left = b.offsetLeft + 'px'; ink.style.width = b.offsetWidth + 'px'; });
  var eraOut = $('.eras__out');
  function era(btn) { $$('[data-era-tab]').forEach(function (b) { b.setAttribute('aria-selected', b === btn); }); eraOut.textContent = ERAS[btn.dataset.eraTab]; }
  $$('[data-era-tab]').forEach(function (b) { b.addEventListener('click', function () { era(b); }); });
  era($('[data-era-tab]'));

  /* ── zgadywanka: co to za przedmiot ── */
  (function () {
    var box = $('.guess'); if (!box) return;
    var Q = [
      { img: 'g35-46', a: ['Harpun z kości na drzewcu', 'Grzebień tkacki', 'Szydło do skóry'], ok: 0, info: 'To harpun — zadziorzaste ostrze z kości osadzone na drzewcu, używane do połowu ryb.' },
      { img: 'g35-43', a: ['Łyżka', 'Grzebień z kości', 'Amulet'], ok: 1, info: 'To grzebień wykonany z kości — przedmiot codziennego użytku znany od pradziejów.' },
      { img: 'g35-47', a: ['Haczyki na ryby', 'Szpile do włosów', 'Groty osadzone na drzewcach'], ok: 2, info: 'To groty osadzone na drzewcach — odtworzone tak, jak mogły wyglądać pradziejowe pociski.' },
      { img: 'g35-40', a: ['Topór z ostrzem w oprawie z poroża', 'Młotek z kamienia', 'Motyka z drewna'], ok: 0, info: 'To topór — kamienne ostrze osadzone w oprawie z poroża, zamocowanej na drewnianym trzonku.' }
    ], i = 0, score = 0;
    function render() {
      var q = Q[i];
      box.innerHTML = '<div class="guess__img blur"><span>Przedmiot ' + (i + 1) + ' / ' + Q.length + '</span><img src="' + IMG + q.img + '.webp" alt="Replika zabytku do rozpoznania"></div>' +
        '<div><h3>Co to jest?</h3><div class="guess__opts">' + q.a.map(function (t, k) { return '<button class="guess__opt" data-k="' + k + '">' + t + '</button>'; }).join('') + '</div>' +
        '<p class="guess__info">Wybierz odpowiedź — zdjęcie odsłoni się po kliknięciu.</p><div class="guess__nav"><span class="guess__score">Wynik: ' + score + ' / ' + Q.length + '</span></div></div>';
      $$('.guess__opt', box).forEach(function (b) { b.onclick = function () { pick(+b.dataset.k); }; });
    }
    function pick(k) {
      var q = Q[i], bs = $$('.guess__opt', box); if (bs[0].disabled) return;
      bs.forEach(function (b, n) { b.disabled = true; if (n === q.ok) b.classList.add('ok'); else if (n === k) b.classList.add('no'); });
      if (k === q.ok) score++;
      $('.guess__img', box).classList.remove('blur'); $('.guess__info', box).textContent = (k === q.ok ? 'Brawo! ' : 'Prawie. ') + q.info;
      $('.guess__score', box).textContent = 'Wynik: ' + score + ' / ' + Q.length;
      var nx = document.createElement('button'); nx.className = 'btn btn--dark';
      if (i < Q.length - 1) { nx.textContent = 'Następny przedmiot'; nx.onclick = function () { i++; render(); }; }
      else { nx.textContent = 'Zamów repliki lub warsztaty'; nx.onclick = function () { setTopic('Repliki zabytków'); location.hash = '#kontakt'; }; }
      $('.guess__nav', box).appendChild(nx);
    }
    render();
  })();

  /* ── kreator dla inwestora ── */
  (function () {
    var stage = $('.quiz__stage'), bar = $('.quiz__bar span'); if (!stage) return;
    var Q = [
      { q: 'Gdzie powstanie inwestycja?', a: [['W historycznym centrum miasta lub na starówce', 3], ['W pobliżu zabytku albo znanego stanowiska archeologicznego', 3], ['Na terenie wiejskim lub rolnym', 1], ['Nie wiem', 1]] },
      { q: 'Czy teren jest objęty ochroną konserwatorską (MPZP, rejestr lub ewidencja zabytków)?', a: [['Tak', 4], ['Nie', 0], ['Nie wiem', 1]] },
      { q: 'Jakie roboty ziemne są planowane?', a: [['Dom jednorodzinny', 1], ['Hala, osiedle lub obiekt przemysłowy', 2], ['Inwestycja liniowa: droga, sieci, kanalizacja', 2], ['Remont bez głębokich wykopów', 0]] }
    ], i = 0, pts = 0, picks = [];
    function render() {
      bar.style.width = (i / Q.length * 100) + '%';
      var q = Q[i];
      stage.innerHTML = '<div class="quiz__fade"><p class="quiz__q">' + (i + 1) + '. ' + q.q + '</p><div class="quiz__opts">' + q.a.map(function (o, k) { return '<button class="quiz__opt" data-k="' + k + '">' + o[0] + '</button>'; }).join('') + '</div></div>';
      $$('.quiz__opt', stage).forEach(function (b) { b.onclick = function () { var o = q.a[+b.dataset.k]; pts += o[1]; picks.push(q.q + ' — ' + o[0]); i++; i < Q.length ? render() : result(); }; });
    }
    function result() {
      bar.style.width = '100%';
      var r = pts >= 6 ? ['Bardzo prawdopodobne', 'Przy takiej lokalizacji i zakresie robót konserwator zwykle wymaga nadzoru albo badań archeologicznych. Warto zaplanować je w harmonogramie przed wejściem koparek.'] :
              pts >= 3 ? ['Możliwe — warto sprawdzić', 'Zanim ruszą roboty ziemne, sprawdzimy dokumenty planistyczne i ewidencję zabytków dla Twojej działki i powiemy, czego się spodziewać.'] :
                         ['Raczej nie, ale potwierdź to', 'Wygląda na to, że archeolog może nie być potrzebny. Upewnij się jednak w dokumentach planistycznych — odkrycie w trakcie robót może wstrzymać budowę.'];
      stage.innerHTML = '<div class="quiz__res"><strong>' + r[0] + '</strong><p>' + r[1] + '</p><small>To orientacyjny wynik. Wymagania dla konkretnej działki określa wojewódzki konserwator zabytków.</small>' +
        '<div class="row"><a class="btn btn--light" href="#kontakt" data-go>Wyślij zapytanie z wynikiem</a><a class="btn btn--ghost" href="tel:+48604593263">Zadzwoń</a><button class="btn btn--ghost" data-again>Od nowa</button></div></div>';
      $('[data-go]', stage).onclick = function () { setTopic('Nadzór archeologiczny', 'Wynik kreatora: ' + r[0] + '\n' + picks.join('\n') + '\n\nLokalizacja działki: '); };
      $('[data-again]', stage).onclick = function () { i = 0; pts = 0; picks = []; render(); };
    }
    render();
  })();

  /* ── formularz (wersja pokazowa) ── */
  var form = $('.form');
  function setTopic(t, msg) { var s = form.temat; for (var k = 0; k < s.options.length; k++) if (s.options[k].text === t) s.selectedIndex = k; if (msg) form.tresc.value = msg; }
  form.addEventListener('submit', function (e) { e.preventDefault(); $('.form__note').textContent = 'To wersja pokazowa — formularz nie wysyła wiadomości. Na nowej stronie zapytanie trafi prosto na skrzynkę firmy.'; puff(innerWidth / 2, innerHeight / 2, 0); });
})();
