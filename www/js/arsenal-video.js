/*
  Arsenal cards ship a few short background clips. They're decorative
  (opacity 0.25, behind the card text), so we lazy-load them: the tags
  carry preload="none" and their file paths in data-av1 / data-hevc; the
  <source>s are attached only when the card scrolls into view, then the clip
  is paused when it leaves so a long visit doesn't keep it decoding off-screen.
  (Under prefers-reduced-motion the CSS sets .tool-video{display:none}, so
  the cards never gain a layout box, never intersect, and never load.)

  The paths live in the markup, not here, so the deploy step versions them
  with every other asset (tools/version-assets.mjs). The browser picks the
  first <source> it can decode and fetches only that file:
      data-av1   AV1  — Chrome/Edge/Firefox/Android + Safari with AV1 hardware
      data-hevc  HEVC — every Safari / iOS, incl. devices without AV1
  A browser with neither shows the card without its clip.
*/
document.addEventListener('DOMContentLoaded', function () {
  var videos = document.querySelectorAll('video.tool-video[data-av1]');
  if (!videos.length) return;

  // best compression first, widest compatibility last
  var SOURCES = [
    { attr: 'data-av1',  type: 'video/mp4; codecs="av01.0.05M.08"' },
    { attr: 'data-hevc', type: 'video/mp4; codecs="hvc1"' }
  ];

  function wire(v) {
    if (v.dataset.wired) return;        // attach <source>s once
    v.dataset.wired = '1';
    SOURCES.forEach(function (s) {
      var src = v.getAttribute(s.attr);
      if (!src) return;
      var el = document.createElement('source');
      el.src = src;
      el.type = s.type;
      v.appendChild(el);
    });
    v.load();
  }
  function play(v) {
    var p = v.play(); if (p && p.catch) p.catch(function () {});
  }

  // No IntersectionObserver: wire eagerly, never pause.
  if (!('IntersectionObserver' in window)) {
    videos.forEach(function (v) { wire(v); play(v); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) { wire(v); play(v); }
      else if (!v.paused) { v.pause(); }
    });
  }, { rootMargin: '300px 0px', threshold: 0.01 });

  videos.forEach(function (v) { io.observe(v); });
});
