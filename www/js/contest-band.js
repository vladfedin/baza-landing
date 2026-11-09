/*
  The contest band (#contest): the night valley comes alive, and the nearest
  contest day is shown as it is in the app — read from its public API
  (GET /api/contests/open-games-2026). The server already names the nearest
  game (the running one, else the first ahead); the band shows every game of
  that day in Moscow time, like the app's home. No answer — no games block,
  the band keeps its text. After the results day the band removes itself.
*/
(function () {
  'use strict';

  var band = document.getElementById('contest');
  if (!band) return;
  if (Date.now() > Date.parse(band.getAttribute('data-until'))) { band.remove(); return; }

  var APP = 'https://beta.rolebaza.ru';
  // Same rule as js/live.js: a local preview asks its own server, which
  // forwards /api to the app (tools/preview.mjs).
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var API = LOCAL ? '' : APP;
  var UTM = 'utm_source=rolebaza.ru&utm_medium=landing&utm_content=contest-nearest';
  var TZ = 'Europe/Moscow';
  var MAX_GAMES = 3;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ── The valley comes alive: stars, fires, sparks — the app's positions
  //    (ContestBackdrop.tsx), in shares of the picture itself. ──
  var art = band.querySelector('.cbd-art');
  var stars = band.querySelector('.cbd-stars');
  var fires = band.querySelector('.cbd-fires');
  if (art && stars && fires) {
    for (var i = 0; i < 46; i++) {
      var r = function (n) { var x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
      var s = el('i');
      var size = 1 + r(3) * 1.8;
      s.style.cssText = 'left:' + (r(1) * 100) + '%;top:' + (r(2) * 42) + '%;width:' + size + 'px;height:' + size + 'px;animation-delay:' + (r(4) * 6) + 's;animation-duration:' + (2.5 + r(5) * 4) + 's';
      stars.appendChild(s);
    }
    var FIRES = [{ x: 0.638, y: 0.79, r: 0.075 }, { x: 0.638, y: 0.72, r: 0.04 }, { x: 0.27, y: 0.62, r: 0.03 }, { x: 0.45, y: 0.6, r: 0.03 }];
    var glow = function (f) { return 'left:' + f.x * 100 + '%;top:' + f.y * 100 + '%;width:' + f.r * 200 + '%;height:' + f.r * 300 + '%'; };
    FIRES.forEach(function (f, k) { var g = el('i'); g.style.cssText = glow(f) + ';animation-delay:' + k * 0.7 + 's'; fires.appendChild(g); });
    var screen = el('i', 'cbd-screenglow'); screen.style.cssText = glow({ x: 0.688, y: 0.685, r: 0.02 }); fires.appendChild(screen);
    var sparks = el('span', 'cbd-sparks');
    sparks.style.cssText = 'left:' + FIRES[0].x * 100 + '%;top:' + (FIRES[0].y - 0.06) * 100 + '%';
    for (var k = 0; k < 9; k++) {
      var p = el('i');
      p.style.cssText = '--dx:' + ((k % 3 - 1) * 9 + (k * 7) % 5) + 'px;animation-delay:' + k * 0.55 + 's;animation-duration:' + (2.6 + (k % 4) * 0.5) + 's';
      sparks.appendChild(p);
    }
    art.appendChild(sparks);
  }

  // ── The nearest contest day ──
  var dayKey = function (iso) { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso)); };
  var time = function (iso) { return new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(iso)); };

  function dayCaption(iso, live) {
    if (live) return 'Идёт сейчас';
    var key = dayKey(iso);
    var today = dayKey(new Date().toISOString());
    var tomorrow = dayKey(new Date(Date.now() + 86400000).toISOString());
    if (key === today) return 'Ближайшая игра · сегодня';
    if (key === tomorrow) return 'Ближайшая игра · завтра';
    return 'Ближайшая игра · ' + new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));
  }

  function spectatorsLabel(n) {
    var m10 = n % 10, m100 = n % 100;
    var word = m10 === 1 && m100 !== 11 ? 'зритель' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'зрителя' : 'зрителей';
    return n + ' ' + word;
  }

  function gameCard(g) {
    var a = el('a', 'cbd-game');
    a.setAttribute('data-goal', 'game_open');   // the funnel's existing goal for a game card (js/funnel.js)
    a.href = APP + '/game/' + encodeURIComponent(g.slug) + '?' + UTM;
    var cover = (g.coverMedia && g.coverMedia.posterUrl) || g.coverImageUrl;
    var pic = el('span', 'cbd-game__cover');
    if (cover) {
      var img = el('img');
      img.src = cover; img.alt = ''; img.decoding = 'async';
      pic.appendChild(img);
    }
    if (g.liveGame) pic.appendChild(el('span', 'cbd-game__live', 'Идёт'));
    a.appendChild(pic);
    var body = el('span', 'cbd-game__body');
    body.appendChild(el('span', 'cbd-game__time', time(g.startTime) + ' МСК' + (g.gameSystem ? ' · ' + g.gameSystem : '')));
    body.appendChild(el('span', 'cbd-game__title', g.title));
    var meta = [];
    if (g.master && g.master.displayName) meta.push(g.master.displayName);
    if (g.spectators && g.spectators.approved) meta.push(spectatorsLabel(g.spectators.approved));
    if (meta.length) body.appendChild(el('span', 'cbd-game__meta', meta.join(' · ')));
    a.appendChild(body);
    return a;
  }

  fetch(API + '/api/contests/open-games-2026', { credentials: 'omit' })
    .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then(function (d) {
      var nearest = d && d.nearest;
      if (!nearest || !Array.isArray(d.schedule)) return;
      var key = dayKey(nearest.startTime);
      var day = d.schedule
        .filter(function (g) { return g.liveGame || dayKey(g.startTime) === key; })
        .filter(function (g) { return g.liveGame || Date.parse(g.startTime) >= Date.parse(nearest.startTime) || g.id === nearest.id; })
        .sort(function (x, y) { return Date.parse(x.startTime) - Date.parse(y.startTime); });
      if (!day.some(function (g) { return g.id === nearest.id; })) day.unshift(nearest);
      var shown = day.slice(0, MAX_GAMES);
      var aside = band.querySelector('.cbd-nearest');
      var head = band.querySelector('.cbd-nearest__head');
      var list = band.querySelector('.cbd-games');
      head.textContent = dayCaption(nearest.startTime, !!nearest.liveGame);
      shown.forEach(function (g) { list.appendChild(gameCard(g)); });
      if (day.length > shown.length) {
        var more = el('a', 'cbd-more', 'Ещё ' + (day.length - shown.length) + ' в этот день');
        more.href = APP + '/contest/open-games?' + UTM;
        list.appendChild(more);
      }
      aside.hidden = false;
      band.classList.add('cbd--with-games');
    })
    .catch(function () { /* the band keeps its text; the contest page has the schedule */ });
})();
