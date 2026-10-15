document.addEventListener('DOMContentLoaded', function () {
  wireDrawer();   // first: the video part below may stop early
  var v = document.querySelector('.hero-video');
  if (!v) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // CSS hides it too

  // one clip for every viewport — it scales to fit both orientations.
  // AV1 where supported (Chrome/Firefox/Android + Safari w/ AV1 hardware),
  // HEVC fallback for all other Safari/iOS; neither -> plain hero background.
  // Paths come from the markup so the deploy step versions them.
  var src = v.canPlayType('video/mp4; codecs="av01.0.05M.08"') ? v.getAttribute('data-av1')
          : v.canPlayType('video/mp4; codecs="hvc1"')          ? v.getAttribute('data-hevc')
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

// --- mobile drawer --- (independent of the hero clip: it must open even when
// the clip is skipped for reduced motion or an unsupported codec)
function wireDrawer() {
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
}
