/* Archeoreplica — podstrony usług: nagłówek, menu, pojawianie się bloków, karuzele zdjęć przeciągane kursorem. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var top = $('.top'), prog = $('.top__progress'), burger = $('.top__burger'), nav = $('.top__nav');
  function onScroll() {
    var y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    if (top) top.classList.toggle('is-small', y > 40);
    if (prog) prog.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (burger && nav) burger.addEventListener('click', function () { var o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });

  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal,.mosaic figure').forEach(function (el) { if (reduce) el.classList.add('in'); else io.observe(el); });

  var hv = $('.sub-hero__video');                             // film w nagłówku: wczytuje się po zdjęciu i płynnie je zastępuje
  if (hv && !reduce) addEventListener('load', function () { hv.src = hv.dataset.vsrc; hv.addEventListener('playing', function () { hv.classList.add('on'); }); hv.play().catch(function () {}); });

  $$('[data-car]').forEach(function (box) {
    var navEl = document.createElement('div'); navEl.className = 'car__nav';
    navEl.innerHTML = '<button type="button" class="car__btn" aria-label="Poprzednie zdjęcia">←</button><button type="button" class="car__btn" aria-label="Następne zdjęcia">→</button><span class="car__hint">Przeciągnij zdjęcia w lewo lub w prawo</span>';
    box.parentNode.insertBefore(navEl, box.nextSibling);
    var prev = navEl.children[0], next = navEl.children[1];
    function step(d) { box.scrollBy({ left: d * Math.max(260, box.clientWidth * .8), behavior: reduce ? 'auto' : 'smooth' }); }
    function state() { prev.disabled = box.scrollLeft < 4; next.disabled = box.scrollLeft > box.scrollWidth - box.clientWidth - 4; }
    prev.onclick = function () { step(-1); }; next.onclick = function () { step(1); };
    box.addEventListener('scroll', state, { passive: true }); addEventListener('resize', state); addEventListener('load', state); state();
    box.tabIndex = 0; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Galeria zdjęć, przewijana w poziomie');
    box.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); step(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); } });
    var down = false, sx = 0, sl = 0;
    box.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse' || e.button !== 0) return; down = true; sx = e.clientX; sl = box.scrollLeft; });
    addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - sx; if (Math.abs(dx) > 5) { box.classList.add('drag'); box.scrollLeft = sl - dx; e.preventDefault(); } });
    addEventListener('pointerup', function () { down = false; box.classList.remove('drag'); });
    box.addEventListener('dragstart', function (e) { e.preventDefault(); });
  });
})();
