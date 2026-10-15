/*
  Arsenal cards ship a few short background clips. They're decorative
  (opacity 0.25, behind the card text), so we lazy-load them: the tags
  carry preload="none" + a data-src BASE path; the real <source> variants
  are attached only when the card scrolls into view, then paused when it
  leaves so a long visit doesn't keep them decoding off-screen.
  (Under prefers-reduced-motion the CSS sets .tool-video{display:none}, so
  the cards never gain a layout box, never intersect, and never load.)

  Multi-codec fallback — each clip is encoded three ways and the browser
  picks the first <source> it can decode (only that one file is fetched;
  on a load error it advances to the next):
      <base>.av1.mp4    AV1  — Chrome/Edge/Firefox/Android + Safari w/ AV1 HW
      <base>.hevc.mp4   HEVC — all Safari / iOS, incl. devices with no AV1
      <base>.h264.mp4   H.264 — universal last-resort (older browsers)
  <base> is data-src with any trailing extension stripped, e.g.
  data-src="vid/ars_2_tokens.mp4" -> vid/ars_2_tokens.{av1,hevc,h264}.mp4
  Drop a tier from SOURCES if you don't ship that variant.
*/
document.addEventListener('DOMContentLoaded', function () {
  var videos = document.querySelectorAll('video.tool-video[data-src]');
  if (!videos.length) return;

  // best compression first, widest compatibility last
  var SOURCES = [
    { suffix: '.av1.mp4',  type: 'video/mp4; codecs="av01.0.05M.08"' },
    { suffix: '.hevc.mp4', type: 'video/mp4; codecs="hvc1"' },
    { suffix: '.h264.mp4', type: 'video/mp4; codecs="avc1.4d401e"' }
  ];

  function wire(v) {
    if (v.dataset.wired) return;        // attach <source>s once
    v.dataset.wired = '1';
    var base = v.getAttribute('data-src').replace(/\.(mp4|webm|mov|m4v)$/i, '');
    SOURCES.forEach(function (s) {
      var el = document.createElement('source');
      el.src = base + s.suffix;
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
