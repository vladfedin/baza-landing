/*
  Landing funnel: the visitor's path to the app, for the app's monitoring
  («Воронки» → «Лендинг»; events landing_* in magicorp-vtt
  docs/analytics-events.md).
  ---------------------------------------------------------------------------
  - The visitor mark is the first-party cookie rb_lv (a random UUID) on
    .rolebaza.ru, so beta.rolebaza.ru reads the same mark when the visitor
    opens a table or signs up there. Set on the first visit, kept 90 days,
    never rewritten. Described in cookies.html.
  - Steps sent from here: the visit (referrer domain, utm_*), each section the
    first time it is on screen, each press of a [data-goal] element. Batched
    and sent with navigator.sendBeacon (text/plain — no CORS preflight; the
    answer is not read), so a press that leaves the page is not lost.
  - «Создать стол» asks «чистый стол или стол с подсказками» unless the
    visitor already had the training table (cookie rb_trained, set by beta).
    The question is on only while #start-choice carries data-training="on".
*/
(function () {
  'use strict';

  var APP = 'https://beta.rolebaza.ru';
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var ENDPOINT = (LOCAL ? '' : APP) + '/api/landing/events';
  var MARK = 'rb_lv';
  var TRAINED = 'rb_trained';
  var MARK_DAYS = 90;
  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  /* magicorp-vtt shared/types/landing-funnel.ts LANDING_SECTIONS, by element id. */
  var SECTIONS = ['hero', 'free', 'arsenal', 'tables', 'reviews', 'live', 'tutorials', 'faq', 'finale'];

  function readCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function domainAttr() {
    return /(^|\.)rolebaza\.ru$/.test(location.hostname) ? '; domain=.rolebaza.ru' : '';
  }
  function uuid() {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    var b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = Array.prototype.map.call(b, function (x) { return (x + 0x100).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  var visitor = readCookie(MARK);
  var first = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(visitor || '');
  if (first) {
    visitor = uuid();
    document.cookie = MARK + '=' + visitor + '; path=/; max-age=' + MARK_DAYS * 86400 + '; samesite=lax'
      + domainAttr() + (location.protocol === 'https:' ? '; secure' : '');
  }

  var queue = [];
  var timer = 0;
  function flush() {
    clearTimeout(timer);
    timer = 0;
    if (!queue.length) return;
    var body = JSON.stringify({ visitor: visitor, events: queue.splice(0, 20) });
    var sent = false;
    try { sent = navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, body); } catch (e) { sent = false; }
    if (!sent) {
      try {
        fetch(ENDPOINT, { method: 'POST', body: body, keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'text/plain' } })
          .catch(function () {});
      } catch (e) { /* lost: the funnel tolerates it */ }
    }
    if (queue.length) flush();
  }
  function push(event, now) {
    queue.push(event);
    if (now) flush();
    else if (!timer) timer = setTimeout(flush, 1500);
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);

  // The visit: where from. Only the referrer's domain, never its address.
  var params = new URLSearchParams(location.search);
  var utm = {};
  UTM.forEach(function (k) { var v = params.get(k); if (v) utm[k] = v.slice(0, 100); });
  var referrerHost = null;
  try { referrerHost = document.referrer ? new URL(document.referrer).hostname : null; } catch (e) { referrerHost = null; }
  push({
    name: 'landing_visited',
    first: first,
    device: matchMedia('(max-width: 768px)').matches ? 'phone' : 'desktop',
    referrerHost: referrerHost,
    utm: utm,
  }, true);

  // Depth: each part of the page the first time a quarter of it is on screen.
  function watchSections() {
    if (!('IntersectionObserver' in window)) return;
    var seen = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var name = entry.target.getAttribute('data-funnel-section');
        if (!entry.isIntersecting || seen[name]) return;
        seen[name] = true;
        io.unobserve(entry.target);
        push({ name: 'landing_scrolled', section: name });
      });
    }, { threshold: 0.25 });
    SECTIONS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { el.setAttribute('data-funnel-section', id); io.observe(el); }
    });
  }

  function targetOf(el) {
    var href = el.getAttribute('href');
    if (!href) return null;
    try { var u = new URL(href, location.href); return (u.host + u.pathname).slice(0, 100); } catch (e) { return null; }
  }

  // «Создать стол»: the question, unless the training table was already had.
  function askBeforeStart(link, e) {
    var dialog = document.getElementById('start-choice');
    if (!dialog || dialog.getAttribute('data-training') !== 'on' || typeof dialog.showModal !== 'function') return;
    if (readCookie(TRAINED)) return;
    e.preventDefault();
    var clean = dialog.querySelector('[data-goal="start_clean"]');
    if (clean) clean.setAttribute('href', link.getAttribute('href'));
    dialog.showModal();
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-goal]');
    if (!el) return;
    var goal = el.getAttribute('data-goal');
    push({ name: 'landing_cta_clicked', goal: goal, target: targetOf(el) }, true);
    if (goal === 'cta_play') askBeforeStart(el, e);
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchSections);
  else watchSections();
})();
