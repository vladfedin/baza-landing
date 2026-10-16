/*
  Live Rolebaza on the landing: upcoming games, the app's tutorials and the
  prices of its participation tiers, straight from its public API.
  ---------------------------------------------------------------------------
  Same data the app's home page shows, drawn the way the app draws it: a game
  is a portrait card (ScheduledGameCard.tsx) — cover, type and system on top,
  title in the middle, master / time / seats / price at the bottom. Each block
  stays hidden until it has something to show; the page reads complete either
  way.

  Safety: every user-written string goes in through textContent; images load
  only from the app's own storage (a master's VK / Telegram avatar would hand
  the visitor's IP to a third party — the token gets the initial instead).
*/
(function () {
  'use strict';

  var APP = 'https://beta.rolebaza.ru';
  // The app's CORS admits rolebaza.ru and its subdomains. A local preview has
  // a different origin, so it asks its own server, which forwards /api to the
  // app (tools/preview.mjs).
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var API = LOCAL ? '' : APP;
  var UTM = 'utm_source=rolebaza.ru&utm_medium=landing&utm_content=live';
  var MAX_GAMES = 6;   // a deck of three on view (js/deck.js), like the tables

  function getJson(path) {
    return fetch(API + path, { credentials: 'omit' }).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    });
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function appUrl(path) {
    return APP + path + (path.indexOf('?') >= 0 ? '&' : '?') + UTM;
  }

  /** Only the app's own storage; anything else is a third party. */
  function ownImage(url) {
    if (typeof url !== 'string') return null;
    try {
      var u = new URL(url, APP);
      return u.origin === APP ? u.href : null;
    } catch (e) { return null; }
  }

  // Stable per-game cover gradient, the dark palette of the app
  // (client/src/utils/identity-gradients.ts) — for games without a cover.
  var GRADIENTS = [
    'linear-gradient(135deg, #1a1c2c, #3b2e5a 45%, #5b3a6b)',
    'linear-gradient(135deg, #0f2027, #203a43 45%, #2c5364)',
    'linear-gradient(135deg, #1f1c2c, #2e1437 50%, #4a2040)',
    'linear-gradient(135deg, #0d1b2a, #1b3a4b 45%, #3a5a40)',
    'linear-gradient(135deg, #1c1c3c, #2d2b55 50%, #3b4371)',
    'linear-gradient(135deg, #1a1a2e, #16213e 45%, #0f3460)',
    'linear-gradient(135deg, #2d1b30, #442840 45%, #5c3d56)',
    'linear-gradient(135deg, #1b2838, #2a4a5e 45%, #3d6b7e)'
  ];
  function hash01(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return (h >>> 0) / 0xffffffff;
  }

  // As the app shows it (client/src/utils/format-game-time.ts): the visitor's
  // own zone first, Moscow in parentheses when it differs, with the weekday if
  // Moscow is already on another day — «сб, 18 октября в 04:00 GMT-5 (12:00 Мск)».
  var MSK = 'Europe/Moscow';
  var viewerTz = (function () {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return MSK; }
  })();
  var timeFmt = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'shortOffset'
  });
  function dayIn(d, tz) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  }
  function when(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var primary = timeFmt.format(d);
    if (viewerTz === MSK) return primary;
    var hm = new Intl.DateTimeFormat('ru-RU', { timeZone: MSK, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
    var wd = dayIn(d, viewerTz) === dayIn(d, MSK) ? ''
      : new Intl.DateTimeFormat('ru-RU', { timeZone: MSK, weekday: 'short' }).format(d) + ', ';
    return primary + ' (' + wd + hm + ' Мск)';
  }

  function priceText(g) {
    if (g.priceLabel) return g.priceLabel;
    if (!g.price) return 'Бесплатно';
    return Math.round(g.price / 100) + ' руб.';
  }

  function token(name, avatar) {
    var t = el('span', 'live-token');
    var src = ownImage(avatar);
    if (src) {
      var img = el('img');
      img.src = src; img.alt = ''; img.loading = 'lazy';
      t.appendChild(img);
    } else {
      t.textContent = (name || '?').trim().charAt(0).toUpperCase();
    }
    return t;
  }

  function gameCard(g) {
    var a = el('a', 'game-card');
    a.href = appUrl('/game/' + encodeURIComponent(g.slug));
    a.setAttribute('data-goal', 'game_open');

    var cover = el('div', 'game-card__cover');
    var src = ownImage(g.coverImageUrl);
    if (src && !/\.(mp4|webm|mov)(\?|$)/i.test(src)) {
      cover.style.backgroundImage = 'url("' + src.replace(/"/g, '%22') + '")';
    } else {
      cover.style.backgroundImage = GRADIENTS[Math.floor(hash01(g.id) * GRADIENTS.length) % GRADIENTS.length];
    }
    a.appendChild(cover);

    var top = el('div', 'game-card__top');
    top.appendChild(el('span', 'game-card__pill', g.gameType === 'campaign' ? 'Кампания' : 'Разовый'));
    if (g.gameSystem) top.appendChild(el('span', 'game-card__pill', g.gameSystem));
    a.appendChild(top);

    var mid = el('div', 'game-card__mid');
    mid.appendChild(el('h3', 'game-card__title', g.title));
    if (g.description) mid.appendChild(el('p', 'game-card__desc', g.description));
    a.appendChild(mid);

    var foot = el('div', 'game-card__foot');
    var master = el('div', 'game-card__master');
    master.appendChild(token(g.master && g.master.displayName, g.master && g.master.avatarUrl));
    master.appendChild(el('span', null, (g.master && g.master.displayName) || ''));
    foot.appendChild(master);
    var t = when(g.startTime);
    if (t) foot.appendChild(el('div', 'game-card__when', t));
    var row = el('div', 'game-card__row');
    var slots = g.slots || { current: 0, max: 0 };
    var full = g.status === 'full' || (slots.max > 0 && slots.current >= slots.max);
    row.appendChild(el('span', 'game-card__slots' + (full ? ' is-full' : ''),
      full ? 'Мест нет' : slots.current + ' / ' + slots.max));
    row.appendChild(el('span', 'game-card__price' + (g.price ? '' : ' is-free'), priceText(g)));
    foot.appendChild(row);
    a.appendChild(foot);
    return a;
  }

  function reveal(block) {
    block.hidden = false;
    var section = block.closest('section');
    if (section) section.hidden = false;
  }

  function loadGames() {
    var row = document.getElementById('live-games');
    if (!row) return;
    getJson('/api/scheduled-games/').then(function (res) {
      var now = Date.now() - 3 * 3600 * 1000;   // a game started an hour or two ago still counts
      var games = (res.games || []).filter(function (g) {
        return g && g.slug && g.title && (g.status === 'open' || g.status === 'full') &&
          (!g.startTime || new Date(g.startTime).getTime() > now);
      }).sort(function (a, b) {
        if (a.status !== b.status) return a.status === 'open' ? -1 : 1;   // open seats first
        return new Date(a.startTime || 0) - new Date(b.startTime || 0);
      }).slice(0, MAX_GAMES);
      if (!games.length) return;
      games.forEach(function (g) { row.appendChild(gameCard(g)); });
      reveal(document.getElementById('live-games-block'));
    }).catch(function () { /* the block stays hidden */ });
  }

  // Tutorials of the app (/api/tutorials): cover, title, summary; on a pointer
  // that hovers, the tutorial's preview clip plays over the cover.
  var MAX_TUTORIALS = 6;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tutorialCard(t) {
    var a = el('a', 'tut-card');
    a.href = appUrl('/tutorials/' + encodeURIComponent(t.slug));
    a.setAttribute('data-goal', 'tutorial_open');
    var media = el('div', 'tut-card__media');
    var cover = ownImage(t.coverImageUrl);
    if (cover) {
      var img = el('img'); img.src = cover; img.alt = ''; img.loading = 'lazy';
      media.appendChild(img);
    }
    var clip = ownImage(t.previewVideoUrl);
    if (clip && canHover) {
      media.appendChild(el('span', 'tut-card__play'));
      var video = null;
      a.addEventListener('mouseenter', function () {
        if (!video) {
          video = el('video', 'tut-card__video');
          video.muted = true; video.loop = true; video.playsInline = true; video.preload = 'none';
          video.src = clip;
          media.appendChild(video);
        }
        var p = video.play(); if (p && p.catch) p.catch(function () {});
        media.classList.add('is-playing');
      });
      a.addEventListener('mouseleave', function () {
        if (video) video.pause();
        media.classList.remove('is-playing');
      });
    }
    a.appendChild(media);
    var body = el('div', 'tut-card__body');
    body.appendChild(el('h3', 'tut-card__title', t.title));
    if (t.summary) body.appendChild(el('p', 'tut-card__text', t.summary));
    a.appendChild(body);
    return a;
  }

  function loadTutorials() {
    var row = document.getElementById('live-tutorials');
    if (!row) return;
    getJson('/api/tutorials?locale=ru').then(function (res) {
      var list = (res.data || []).filter(function (t) { return t && t.slug && t.title; }).slice(0, MAX_TUTORIALS);
      if (!list.length) return;
      list.forEach(function (t) { row.appendChild(tutorialCard(t)); });
      document.getElementById('tutorials').hidden = false;
    }).catch(function () {});
  }

  // «Сколько это стоит?» — the paid tiers, as the app's /pricing shows them
  // (PricingPage.tsx: storage named in decimal units of binary sizes, so the
  // label promises a little less than the account gets). The markup holds
  // the same figures as a fallback.
  function rub(v) { return new Intl.NumberFormat('ru-RU').format(Math.round(Number(v))) + '\u00a0₽'; }
  function size(bytes) {
    var mib = Math.round(bytes / 1048576);
    return mib >= 1024 && mib % 1024 === 0 ? (mib / 1024) + ' ГБ' : mib + ' МБ';
  }
  function saves(n) {
    if (n == null) return 'Сохранённые игры без ограничений';
    var m10 = n % 10, m100 = n % 100;
    var word = m10 === 1 && m100 !== 11 ? 'сохранённая игра'
      : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'сохранённые игры' : 'сохранённых игр';
    return n + ' ' + word;
  }
  function loadPlans() {
    var box = document.querySelector('[data-plans]');
    if (!box) return;
    getJson('/api/billing/plans').then(function (res) {
      (res.plans || []).forEach(function (p) {
        var card = box.querySelector('[data-plan="' + p.id + '"]');
        if (!card) return;
        var offers = p.offers || [];
        var year = offers.filter(function (o) { return o.cadence === 'year'; })[0];
        var month = offers.filter(function (o) { return o.cadence === 'month'; })[0];
        var set = function (sel, text) { var el = card.querySelector(sel); if (el && text) el.textContent = text; };
        if (year) set('[data-plan-year]', rub(year.priceRub));
        if (month) set('[data-plan-month]', rub(month.priceRub));
        if (p.maxStorageBytes) set('[data-plan-storage]', 'Хранилище ' + size(p.maxStorageBytes));
        if (p.maxFileSizeBytes) set('[data-plan-file]', 'Файл до ' + size(p.maxFileSizeBytes));
        set('[data-plan-saves]', saves(p.maxGameSnapshots));
      });
    }).catch(function () { /* the figures in the markup stay */ });
  }

  function start() { loadGames(); loadTutorials(); loadPlans(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
