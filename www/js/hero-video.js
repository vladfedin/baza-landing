document.addEventListener('DOMContentLoaded', function () {
  var v = document.querySelector('.hero-video');
  if (!v) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // CSS hides it too

  // one clip for every viewport — it scales to fit both orientations.
  // AV1 where supported (Chrome/Firefox/Android + Safari w/ AV1 hardware),
  // HEVC fallback for all other Safari/iOS; neither -> photo fallback below.
  var base = './vid/video_title';
  var src = v.canPlayType('video/mp4; codecs="av01.0.05M.08"') ? base + '.av1.mp4'
          : v.canPlayType('video/mp4; codecs="hvc1"')          ? base + '.hevc.mp4'
          : '';
  if (!src) { var w = v.closest('.hero-video-wrap'); if (w) w.remove(); return; }
  v.setAttribute('src', src);
  v.load();

  v.addEventListener('canplay', function () {
    v.classList.add('is-ready');
    var p = v.play(); if (p && p.catch) p.catch(function () {});
  });
  v.addEventListener('error', function () {
    var w = v.closest('.hero-video-wrap'); if (w) w.remove(); // photo stays as fallback
  });
  // --- mobile drawer ---
  var drawer = document.getElementById('nav-drawer');
  var backdrop = document.getElementById('drawer-backdrop');
  var burger = document.getElementById('nav-burger');
  function setDrawer(open) {
    if (!drawer) return;
    if (open) backdrop.hidden = false;
    requestAnimationFrame(function () {
      drawer.classList.toggle('is-open', open);
      backdrop.classList.toggle('is-open', open);
    });
    burger.setAttribute('aria-expanded', String(open));
    if (!open) setTimeout(function () { backdrop.hidden = true; }, 320);
  }
  if (burger) {
    burger.addEventListener('click', function () { setDrawer(true); });
    backdrop.addEventListener('click', function () { setDrawer(false); });
    document.getElementById('drawer-close').addEventListener('click', function () { setDrawer(false); });
    drawer.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setDrawer(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setDrawer(false);
    });
  }

  // pause when the hero scrolls out of view
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else v.pause();
      });
    }, { threshold: 0.05 }).observe(document.querySelector('.hero'));
  }
});
