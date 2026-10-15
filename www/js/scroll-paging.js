document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  /* Wheel paging: one-flick-per-page snapping with the mouse wheel. Disabled —
     the wheel now scrolls the page freely. The scroll-cue ("mouse icon") click
     still jumps to the next page (that path is independent of this flag). */
  var WHEEL_PAGING = false;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    /* SMIL does not honor prefers-reduced-motion by itself */
    var logoSvg = document.querySelector('.hero-logo');
    if (logoSvg && logoSvg.pauseAnimations) logoSvg.pauseAnimations();
  }
  var pages = ['hero', 'arsenal', 'finale']
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  if (pages.length < 2) return;

  /* keep --abar-h in sync so the scroll cues sit right above the action bar */
  var abar = document.querySelector('.action-bar');
  function syncAbarH() {
    if (abar) document.documentElement.style.setProperty('--abar-h', abar.offsetHeight + 'px');
  }
  syncAbarH();
  window.addEventListener('resize', syncAbarH, { passive: true });

  function tops() {
    return pages.map(function (p) {
      return Math.round(p.getBoundingClientRect().top + window.pageYOffset);
    });
  }
  function currentPage(t) {
    var y = window.pageYOffset, i = 0;
    for (var k = 0; k < t.length; k++) if (y >= t[k] - 12) i = k;
    return i;
  }

  var animating = false, animTimer = null;
  function goTo(i) {
    var t = tops();
    if (i < 0 || i >= t.length) return;
    animating = true;
    window.scrollTo({ top: t[i], behavior: reduced ? 'auto' : 'smooth' });
    clearTimeout(animTimer);
    animTimer = setTimeout(function () { animating = false; }, reduced ? 80 : 750);
  }

  /* one global mouse cue: visible on every locked page (hero, advantages,
     arsenal), fades out on the finale and in the footer; click -> next page */
  var cue = document.getElementById('scroll-cue');
  function updateCue() {
    if (!cue) return;
    var t = tops(), last = t.length - 1, y = window.pageYOffset;
    /* hide as soon as the finale rises into the lower half of the viewport —
       on tall screens the finale top may never be scrolled fully past
       (short finale + footer < one viewport), so a page-index check alone
       would leave the cue hanging over the footer/action bar */
    var hide = currentPage(t) >= last || y >= t[last] - window.innerHeight * 0.55;
    cue.classList.toggle('is-hidden', hide);
  }
  if (cue) {
    cue.addEventListener('click', function () {
      var t = tops(), i = currentPage(t);
      if (i < t.length - 1) goTo(i + 1);
    });
    var cueQueued = false;
    window.addEventListener('scroll', function () {
      if (cueQueued) return;
      cueQueued = true;
      requestAnimationFrame(function () { cueQueued = false; updateCue(); });
    }, { passive: true });
    window.addEventListener('resize', updateCue, { passive: true });
    updateCue();
  }

  /* wheel -> one page per flick while inside the paged zone (hero + advantages).
     From the arsenal page down (long content + footer) scrolling is free again;
     scrolling back up past the arsenal top re-enters paged mode. */
  window.addEventListener('wheel', function (e) {
    if (!WHEEL_PAGING) return;                                /* wheel paging disabled → free scroll */
    if (e.ctrlKey || e.defaultPrevented) return;              /* pinch-zoom etc. */
    if (window.matchMedia('(max-width: 768px)').matches) return;
    if (Math.abs(e.deltaY) < 4) return;
    var t = tops(), last = t.length - 1, y = window.pageYOffset;
    if (animating) { e.preventDefault(); return; }
    var i = currentPage(t);
    /* a page taller than the viewport (e.g. arsenal on small screens) scrolls
       freely until its bottom edge has been seen; only then we snap onward */
    var pageBottom = t[i] + pages[i].offsetHeight;
    var pageFits = pages[i].offsetHeight <= window.innerHeight + 24;
    if (e.deltaY > 0) {
      if (i < last) {
        if (!pageFits && pageBottom > y + window.innerHeight + 12) return;
        e.preventDefault(); goTo(i + 1);
      }
      /* i === last (finale): free scrolling down into the footer */
    } else {
      if (i > 0 && y <= t[i] + 12) { e.preventDefault(); goTo(i - 1); }
      else if (i > 0 && i < last && pageFits) { e.preventDefault(); goTo(i); }
    }
  }, { passive: false });
});
