/*
  Cookies consent + Yandex.Metrika + goals.
  ---------------------------------------------------------------------------
  Metrika loads only after the visitor allows analytics (COMPLIANCE.md: 152-ФЗ,
  analytics only with consent). The choice lives in localStorage under the same
  keys the previous landing used, so visitors who already answered are not
  asked again.

  Goals: any element with data-goal="<name>" reports a Metrika goal on click
  (if Metrika is running). Names: cta_play, game_open, table_open, review_profile, guild_join.
*/
(function () {
  'use strict';

  var COUNTER = 106941653;
  var KEY = 'rb_consent_analytics';
  var KEY_AT = 'rb_consent_analytics_at';
  // Only the public domain counts; previews and the beta app stay out.
  var isProd = /(^|\.)rolebaza\.ru$/.test(location.hostname) && !/beta\./.test(location.hostname);

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function write(v) {
    try {
      localStorage.setItem(KEY, v);
      localStorage.setItem(KEY_AT, new Date().toISOString());
    } catch (e) { /* storage blocked: we simply ask again next time */ }
  }

  var loaded = false;
  function initMetrika() {
    if (loaded || !isProd) return;
    loaded = true;
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    window.ym(COUNTER, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
  }
  if (read() === 'granted') initMetrika();

  function goal(name) {
    if (loaded && typeof window.ym === 'function') window.ym(COUNTER, 'reachGoal', name);
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-goal]');
    if (el) goal(el.getAttribute('data-goal'));
  }, true);

  function wireBanner() {
    var banner = document.getElementById('cookie-banner');
    if (!banner || read() !== null) return;
    banner.hidden = false;
    requestAnimationFrame(function () { banner.classList.add('is-visible'); });
    function answer(v) {
      write(v);
      if (v === 'granted') initMetrika();
      banner.classList.remove('is-visible');
      setTimeout(function () { banner.hidden = true; }, 200);
    }
    document.getElementById('cookie-accept').addEventListener('click', function () { answer('granted'); });
    document.getElementById('cookie-decline').addEventListener('click', function () { answer('denied'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireBanner);
  else wireBanner();
})();
