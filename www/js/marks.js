/*
  Account marks and the user plaque — the app's look, on the landing.
  ---------------------------------------------------------------------------
  A person on the landing is drawn the way the table draws them in its compact
  profile (client/src/components/user-chip/UserPopover.tsx): avatar, name,
  @alias and one row of marks. The row follows the app's rules:
    order and kinds    — shared/types/account-marks.ts (resolveAccountMarks)
    look of each kind  — shared/types/mark-look.ts (markLook, badgeMarkHue,
                         tierMarkHue), shapes — shared/types/mark-shapes.ts
    tag colours/icons  — client/src/components/account-marks/AccountMark.tsx
  It is a mirror, not a source: when the app changes a mark, change it here.
  Only what a public profile can show is covered; an unknown tag is skipped,
  as in the app.

  Usage: <figure class="user-plaque" data-user="master-zloboust"> with a static
  fallback inside; the profile is fetched from GET /api/users/:ref/public and
  the plaque is refilled. If the app does not answer, the fallback stays.
  Avatars load only from the app's own storage; a VK / Telegram avatar would
  send the visitor's address to a third party, so such a person's avatar is a
  copy kept in the markup (img/reviews/avatar-*.webp) and stays as it is.
  Every avatar and cover the app serves also has a copy in the markup: the
  person may delete or replace the picture, so the app's one takes the copy's
  place only once it has really loaded.
*/
(function () {
  'use strict';

  var APP = 'https://beta.rolebaza.ru';
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var API = LOCAL ? '' : APP;            // see js/live.js: local preview proxies /api
  // the sprite path as the markup names it — it carries the deploy's ?v=
  // (a path built here would be neither checked nor versioned)
  function spritePath() {
    var use = document.querySelector('use[href*="icons.svg"]');
    return use ? use.getAttribute('href').replace(/#.*$/, '') : '';
  }

  // account-marks.ts: kind per tag, and the order of kinds on the row
  var TAG_KIND = { player: 'self', master: 'self', founder: 'cohort', pioneer: 'cohort', keeper: 'cohort' };
  var TAG_ORDER = ['player', 'master', 'founder', 'pioneer', 'keeper'];
  var KIND_ORDER = { official: 0, participation: 1, achievement: 2, cohort: 3, self: 4 };
  // AccountMark.tsx: label, colour, shape and icon of a tag mark
  var TAG = {
    player:  { ru: 'Игрок',         hue: '#36b24d', shape: 'torn',    icon: 'user-round' },
    master:  { ru: 'Мастер игр',    hue: '#d4a41c', shape: 'torn',    icon: 'pen-tool' },
    founder: { ru: 'Основатель',    hue: '#e0b400', shape: 'rounded', icon: 'shield' },
    pioneer: { ru: 'Первопроходец', hue: '#e8894a', shape: 'rounded', icon: 'compass' },
    keeper:  { ru: 'Хранитель',     hue: '#a95fa8', shape: 'rounded', icon: 'shield-half' }
  };
  // mark-look.ts tierMarkHue: the rarity colour of the level, toned
  var TIER = {
    advanced:    { ru: 'Продвинутый', base: '#1eff00', tone: -0.28, icon: 'sparkles' },
    expert:      { ru: 'Эксперт',     base: '#0070dd', tone: -0.1,  icon: 'book-open-check' },
    master:      { ru: 'Мастер',      base: '#a335ee', tone: -0.1,  icon: 'crown' },
    grandmaster: { ru: 'Грандмастер', base: '#ff8000', tone: -0.1,  icon: 'castle' }
  };
  var KNOWN_ICONS = ['crown', 'castle', 'heart', 'compass', 'pen-tool', 'book-open', 'dice-5', 'shield',
    'users', 'scroll-text', 'coins', 'gamepad-2', 'music', 'mic', 'swords', 'map', 'infinity',
    'hard-drive', 'sparkles', 'book-open-check', 'shield-half', 'user-round'];

  /* ---- colour helpers (rarity-palette.ts toneHexColor, mark-look.ts badgeMarkHue) ---- */
  function tone(hex, amount) {
    var a = Math.max(-1, Math.min(1, amount)), target = a < 0 ? 0 : 255, m = Math.abs(a);
    var n = hex.replace('#', '');
    return '#' + [0, 2, 4].map(function (o) {
      var c = parseInt(n.slice(o, o + 2), 16);
      return ('0' + Math.round(c + (target - c) * m).toString(16)).slice(-2);
    }).join('');
  }
  function lum(hex) {
    var n = parseInt(hex.replace('#', ''), 16);
    return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  }
  function badgeHue(text, bg) {
    var pair = [text, bg].filter(function (c) { return /^#[0-9a-f]{6}$/i.test(c || ''); });
    if (!pair.length) return '#6b6b78';
    var d = pair.reduce(function (a, b) { return lum(b) < lum(a) ? b : a; });
    var n = parseInt(d.slice(1), 16);
    var r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, h = 0, s = 0;
    if (max !== min) {
      var dd = max - min;
      s = l > 0.5 ? dd / (2 - max - min) : dd / (max + min);
      h = max === r ? (g - b) / dd + (g < b ? 6 : 0) : max === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
      h *= 60;
    }
    l = Math.min(0.55, Math.max(0.34, l));
    var k = function (x) { return (x + h / 30) % 12; };
    var aa = s * Math.min(l, 1 - l);
    var f = function (x) { return l - aa * Math.max(-1, Math.min(k(x) - 3, Math.min(9 - k(x), 1))); };
    return '#' + [f(0), f(8), f(4)].map(function (x) { return ('0' + Math.round(x * 255).toString(16)).slice(-2); }).join('');
  }

  /* ---- marks ---- */
  function resolve(profile) {
    var marks = [];
    (profile.userTags || []).forEach(function (tag) {
      if (TAG_KIND[tag]) marks.push({ kind: TAG_KIND[tag], tag: tag });
    });
    if (TIER[profile.participationTierId]) marks.push({ kind: 'participation', tier: profile.participationTierId });
    (profile.badges || []).forEach(function (b) { if (b && b.isPublic !== false) marks.push({ kind: 'achievement', badge: b }); });
    return marks.map(function (m, i) { return { m: m, i: i }; }).sort(function (a, b) {
      return KIND_ORDER[a.m.kind] - KIND_ORDER[b.m.kind] ||
        (a.m.tag ? TAG_ORDER.indexOf(a.m.tag) : 0) - (b.m.tag ? TAG_ORDER.indexOf(b.m.tag) : 0) ||
        a.i - b.i;
    }).map(function (e) { return e.m; });
  }

  function iconEl(name) {
    if (KNOWN_ICONS.indexOf(name) < 0) return null;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', spritePath() + '#lu-' + name);
    svg.appendChild(use);
    return svg;
  }

  function markEl(m) {
    var span = document.createElement('span');
    var label, hue, shape, icon, title = '';
    if (m.kind === 'participation') {
      var t = TIER[m.tier];
      label = t.ru; hue = tone(t.base, t.tone); shape = 'pill'; icon = t.icon;
      title = 'Уровень участия — «' + t.ru + '»';
    } else if (m.kind === 'achievement') {
      var b = m.badge;
      label = b.displayNameRu; hue = badgeHue(b.textColor, b.backgroundColor);
      shape = b.shape || 'pill'; icon = b.iconKey;
      title = [b.descriptionRu, b.rewardDescriptionRu].filter(Boolean).join('\n');
    } else {
      var g = TAG[m.tag];
      label = g.ru; hue = g.hue; shape = g.shape; icon = g.icon;
    }
    span.className = 'mark mark--' + m.kind + ' mark--' + shape;
    span.style.setProperty('--hue', hue);
    if (m.kind === 'achievement') {
      span.style.setProperty('--hue-hi', tone(hue, 0.08));
      span.style.setProperty('--hue-lo', tone(hue, -0.12));
      span.style.setProperty('--hue-rim', tone(hue, -0.4));
    }
    if (title) span.title = title;
    var ic = iconEl(icon);
    if (ic) span.appendChild(ic);
    span.appendChild(document.createTextNode(label || ''));
    return span;
  }

  function ownImage(url) {
    try { var u = new URL(url, APP); return u.origin === APP ? u.href : null; } catch (e) { return null; }
  }

  function fill(plaque, p) {
    // a card may show its author twice (front and back): fill every copy
    var src = ownImage(p.avatarUrl);
    if (src) plaque.querySelectorAll('.user-plaque__avatar').forEach(function (avatar) {
      var img = document.createElement('img');
      img.alt = ''; img.src = src;   // not lazy: a detached lazy image never loads
      var c = p.avatarCrop;
      if (c && typeof c.scale === 'number') {     // UserAvatar.tsx crop
        img.style.width = img.style.height = (c.scale * 100) + '%';
        img.style.left = (c.x || 0) + '%'; img.style.top = (c.y || 0) + '%';
      }
      img.addEventListener('load', function () { avatar.textContent = ''; avatar.appendChild(img); });
    });
    // the profile's cover (a review card's background): the app's crop centre
    var cover = plaque.querySelector('.user-plaque__cover');
    var coverSrc = ownImage(p.backgroundImageUrl);
    if (cover && coverSrc) {
      var bc = p.backgroundCrop;
      var probe = new Image();
      probe.addEventListener('load', function () {
        if (bc && typeof bc.x === 'number' && typeof bc.y === 'number') {
          cover.style.objectPosition = (bc.x * 100).toFixed(1) + '% ' + (bc.y * 100).toFixed(1) + '%';
        }
        cover.src = coverSrc;
        cover.hidden = false;
      });
      probe.src = coverSrc;
    }
    plaque.querySelectorAll('.user-plaque__name').forEach(function (name) { if (p.displayName) name.textContent = p.displayName; });
    plaque.querySelectorAll('.user-plaque__alias').forEach(function (alias) { if (p.username) alias.textContent = '@' + p.username; });
    var row = plaque.querySelector('.user-plaque__marks');
    if (row) {
      // a row may ask for some kinds only (data-marks-only="participation
      // achievement") and a few of them (data-marks-max): a review card keeps
      // the level and the awards, not the profile's tags
      var only = (row.getAttribute('data-marks-only') || '').split(/\s+/).filter(Boolean);
      var max = parseInt(row.getAttribute('data-marks-max'), 10);
      var marks = resolve(p).filter(function (m) { return !only.length || only.indexOf(m.kind) >= 0; });
      if (only.length) marks.sort(function (a, b) { return only.indexOf(a.kind) - only.indexOf(b.kind); });
      if (max > 0) marks = marks.slice(0, max);
      if (marks.length) {
        row.textContent = '';
        marks.forEach(function (m) { row.appendChild(markEl(m)); });
        row.hidden = false;
      }
    }
  }

  function start() {
    document.querySelectorAll('.user-plaque[data-user]').forEach(function (plaque) {
      var ref = plaque.getAttribute('data-user');
      fetch(API + '/api/users/' + encodeURIComponent(ref) + '/public', { credentials: 'omit' })
        .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
        .then(function (p) { fill(plaque, p || {}); })
        .catch(function () { /* the static plaque stays */ });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
