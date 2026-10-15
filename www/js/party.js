/*
  Party tokens — scroll-collected hero avatars.
  ---------------------------------------------------------------------------
  As the reader scrolls and each Арсенал character portrait's upper quarter reaches
  the middle of the viewport, a circular 48px avatar token pops out of that upper
  quarter and flies to the reading-ruler's XP cursor, joining a "party" that trails the
  current XP position. Formations by size: 1 alone, 2 side-by-side, 3 as 2+1
  (bottom row centred), 4 as 2x2, 5 as 3+2. As the campfire (the bottom pane)
  rises into view the party peels into the illustration one member at a time,
  slowly and reversibly — scrolling back up brings them out to the XP line again.
  Tokens are never removed, so the party persists near the XP bar.

  Avatar source convention: img/<portrait>.avatar.avif, declared per character as
  data-avatar. Those files may not exist yet — on load error a token falls back
  to a circular crop of the character's own portrait. Desktop only: the feature
  is inert whenever the ruler is hidden (there is no XP cursor to follow), and
  it respects prefers-reduced-motion.
*/
document.addEventListener('DOMContentLoaded', function () {
  var ruler = document.querySelector('.reading-ruler');
  var chars = [].slice.call(document.querySelectorAll('.arsenal-char'));
  var campfire = document.querySelector('.campfire img');
  if (!ruler || !chars.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var TOKEN = 48, GAP = 8, CELL = TOKEN + GAP;   // token box + spacing between them
  var UPPER = 0.25;                              // trigger on / emerge from the portrait's upper quarter
  var layer = document.createElement('div');
  layer.className = 'party-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  var HIDE_INTO_CAMPFIRE = false;  // peel the party into the campfire near the end (toggle; off)
  var SPEED = 0.05;          // token easing per frame (lower = slower glide toward its target)
  var tokens = [];           // active party members, in join order
  var spawned = [];          // per-character: already collected?
  var animRunning = false, scrollRaf = 0;
  var celebrated = false;    // "long rest" end sequence already fired for the current arrival at the bottom
  var lastXpLevel = -1;      // floor(currentXP / 1000) at the previous sample — drives the LEVEL UP marks

  function portraitSrc(charEl) {
    var i = charEl.querySelector('img');
    return i ? (i.currentSrc || i.src) : '';
  }

  function spawnToken(charEl) {
    var img = charEl.querySelector('img');
    if (!img) return;
    var r = img.getBoundingClientRect();
    var el = document.createElement('div');
    el.className = 'party-token';
    var av = document.createElement('img');
    av.alt = ''; av.decoding = 'async';
    var portrait = portraitSrc(charEl);
    var avatar = charEl.getAttribute('data-avatar');
    av.addEventListener('error', function onerr() {          // avatar missing → crop the portrait
      av.removeEventListener('error', onerr);
      el.classList.add('is-fallback');
      if (portrait && av.getAttribute('src') !== portrait) av.src = portrait;
    });
    av.src = avatar || portrait;
    el.appendChild(av);
    layer.appendChild(el);

    var t = {
      el: el, s: 0.2, ts: 1, inFire: false, spread: null,
      x: r.left + r.width / 2 - TOKEN / 2,     // horizontal centre of the portrait
      y: r.top + r.height * UPPER - TOKEN / 2  // vertical: the portrait's upper quarter (near the head)
    };
    t.tx = t.x; t.ty = t.y;
    tokens.push(t);
    render(t);
  }

  // token-centre offsets (relative to the cluster centre) for a party of n
  function formation(n) {
    switch (n) {
      case 0: return [];
      case 1: return [[0, 0]];
      case 2: return [[-CELL / 2, 0], [CELL / 2, 0]];
      case 3: return [[-CELL / 2, -CELL / 2], [CELL / 2, -CELL / 2], [0, CELL / 2]];
      case 4: return [[-CELL / 2, -CELL / 2], [CELL / 2, -CELL / 2], [-CELL / 2, CELL / 2], [CELL / 2, CELL / 2]];
      case 5: return [[-CELL, -CELL / 2], [0, -CELL / 2], [CELL, -CELL / 2], [-CELL / 2, CELL / 2], [CELL / 2, CELL / 2]];
    }
    var out = [], cols = 3, rows = Math.ceil(n / cols);   // 6+ : centred rows of 3
    for (var k = 0; k < n; k++) {
      var row = Math.floor(k / cols), inRow = Math.min(cols, n - row * cols), col = k - row * cols;
      out.push([(col - (inRow - 1) / 2) * CELL, (row - (rows - 1) / 2) * CELL]);
    }
    return out;
  }

  function render(t) {
    t.el.style.transform = 'translate3d(' + t.x.toFixed(1) + 'px,' + t.y.toFixed(1) + 'px,0) scale(' + t.s.toFixed(3) + ')';
  }

  /* how many party members have peeled off into the fire at the current scroll.
     Reversible (depends only on the campfire's live viewport position): the
     party joins the fire one by one as the illustration rises through the
     viewport, and rejoins the XP line when the reader scrolls back up. */
  function fireHideCount() {
    if (!campfire || !tokens.length) return 0;
    var fr = campfire.getBoundingClientRect();
    if (fr.height <= 0) return 0;
    var start = window.innerHeight * 0.82;       // begin once the image top reaches 82% vh
    var end   = window.innerHeight * 0.18;       // all hidden by the time it reaches 18% vh
    var f = (start - fr.top) / (start - end);
    f = Math.min(Math.max(f, 0), 1);
    return Math.round(f * tokens.length);
  }

  function sendToFire(t) {
    var fr = campfire.getBoundingClientRect();
    var fx = fr.left + fr.width / 2, fy = fr.top + fr.height * 0.55;
    if (!t.spread) t.spread = { dx: (Math.random() - 0.5) * 90, dy: (Math.random() - 0.5) * 54 };
    t.tx = fx + t.spread.dx - TOKEN / 2;
    t.ty = fy + t.spread.dy - TOKEN / 2;
    t.ts = 0.25;
    if (!t.inFire) { t.inFire = true; t.el.classList.add('is-arrived'); }   // fade into the fire
  }

  function updateTargets() {
    var H = ruler.clientHeight;
    if (H <= 0) return;                          // ruler hidden (mobile) → leave targets be
    var rr = ruler.getBoundingClientRect();
    var p = window.rbXpProgress ? window.rbXpProgress()
          : (function () { var m = document.documentElement.scrollHeight - window.innerHeight; return m > 0 ? Math.min(Math.max(window.pageYOffset / m, 0), 1) : 0; })();
    var cursorY = rr.top + p * H;                // the XP cursor's screen Y

    /* earliest-collected members rest in the fire; the rest trail the cursor.
       Tokens are never removed — hidden ones can rejoin the line on scroll-up.
       With HIDE_INTO_CAMPFIRE off, hide is always 0 so the whole party stays. */
    var hide = HIDE_INTO_CAMPFIRE ? fireHideCount() : 0, line = [];
    for (var i = 0; i < tokens.length; i++) {
      if (i < hide) { sendToFire(tokens[i]); continue; }
      var t = tokens[i];
      if (t.inFire) { t.inFire = false; t.el.classList.remove('is-arrived'); }   // rejoin the party
      line.push(t);
    }

    var form = formation(line.length), maxDx = 0;
    for (var f = 0; f < form.length; f++) maxDx = Math.max(maxDx, Math.abs(form[f][0]));
    var clusterCx = rr.left - 12 - (maxDx + TOKEN / 2);   // just left of the ruler
    for (var j = 0; j < line.length; j++) {
      line[j].tx = clusterCx + form[j][0] - TOKEN / 2;
      line[j].ty = cursorY + form[j][1] - TOKEN / 2;
      line[j].ts = 1;
    }
  }

  function checkSpawns() {
    /* trigger earlier: fire when the character's head reaches ~65% down the
       viewport (i.e. soon after the image appears from the bottom), not mid-screen */
    var mid = window.innerHeight * 0.65;
    for (var i = 0; i < chars.length; i++) {
      if (spawned[i]) continue;
      var im = chars[i].querySelector('img');
      if (!im) { spawned[i] = true; continue; }
      var cr = im.getBoundingClientRect();
      if (cr.height === 0) continue;             // hidden (mobile) → not yet
      if (cr.top + cr.height * UPPER <= mid) { spawned[i] = true; spawnToken(chars[i]); }
    }
  }

  /* Old all-at-once send-off: when the campfire came into view the whole party
     flew in and was destroyed. Commented out — tokens now peel into the fire
     gradually and reversibly (see fireHideCount/sendToFire) and are never
     removed, so the party persists near the XP bar.
  function checkEndgame() {
    if (endgame || !campfire) return;
    var fr = campfire.getBoundingClientRect();
    if (fr.height > 0 && fr.top < window.innerHeight * 0.55) endgame = true;
  }
  */

  function anim() {
    var moving = false;
    for (var k = 0; k < tokens.length; k++) {
      var t = tokens[k];
      t.x += (t.tx - t.x) * SPEED;
      t.y += (t.ty - t.y) * SPEED;
      t.s += (t.ts - t.s) * SPEED;
      render(t);
      if (Math.abs(t.tx - t.x) > 0.5 || Math.abs(t.ty - t.y) > 0.5 || Math.abs(t.ts - t.s) > 0.01) moving = true;
    }
    if (moving) requestAnimationFrame(anim); else animRunning = false;
  }
  function startAnim() { if (!animRunning) { animRunning = true; requestAnimationFrame(anim); } }

  /* live viewport anchor for a floating cheer: the party's real centre (average of
     the tokens' current positions, not their targets, so the text sits ON the party
     even while they lag behind on a slow glide). Falls back to the XP cursor. */
  function tokenCentroid() {
    if (!tokens.length) {
      var rr0 = ruler.getBoundingClientRect();
      var p0 = window.rbXpProgress ? window.rbXpProgress() : 0;
      return { x: rr0.left - 34, y: rr0.top + p0 * ruler.clientHeight };
    }
    var sx = 0, sy = 0;
    for (var i = 0; i < tokens.length; i++) { sx += tokens[i].x + TOKEN / 2; sy += tokens[i].y + TOKEN / 2; }
    return { x: sx / tokens.length, y: sy / tokens.length };
  }

  /* A floating cheer that RISES RELATIVE TO THE PARTY: every frame it re-anchors to
     the live token centroid and lifts a little higher while fading, over ~3s, then
     removes itself. kind 'rest' = green "ДЛИННЫЙ ОТДЫХ" (healing long rest),
     'level' = golden "LEVEL UP".                                                   */
  function cheer(kind) {
    var box = document.createElement('div');
    box.className = 'party-cheer party-cheer--' + kind;
    var txt = document.createElement('div');
    txt.className = 'party-cheer__text';
    txt.textContent = (kind === 'level') ? 'LEVEL UP' : 'ДЛИННЫЙ ОТДЫХ';
    box.appendChild(txt);
    var count = (kind === 'rest') ? 34 : 24;          // more sparkles for the long-rest heal
    for (var i = 0; i < count; i++) {
      var pt = document.createElement('i');
      pt.className = 'party-cheer__particle';
      pt.style.left = (Math.random() * 170 - 85).toFixed(0) + 'px';
      pt.style.top  = (Math.random() * 70 - 26).toFixed(0) + 'px';
      pt.style.setProperty('--dx', (Math.random() * 80 - 40).toFixed(0) + 'px');
      pt.style.setProperty('--dy', (-80 - Math.random() * 100).toFixed(0) + 'px');
      pt.style.animationDelay = (Math.random() * 0.7).toFixed(2) + 's';
      box.appendChild(pt);
    }
    layer.appendChild(box);

    var t0 = performance.now(), DUR = 3000, RISE = 130;
    (function frame(now) {
      if (!box.parentNode) return;
      var e = (now - t0) / DUR;
      if (e >= 1) { box.parentNode.removeChild(box); return; }
      var a = tokenCentroid();
      box.style.left = a.x.toFixed(1) + 'px';
      box.style.top  = a.y.toFixed(1) + 'px';
      box.style.transform = 'translate(-50%, -50%) translateY(' + (-e * RISE).toFixed(1) + 'px)';
      box.style.opacity = (e < 0.12 ? e / 0.12 : 1 - (e - 0.12) / 0.88).toFixed(3);
      requestAnimationFrame(frame);
    })(t0);
  }

  function maybeCheer() {
    if (ruler.clientHeight <= 0) return;                        // desktop only
    var p = window.rbXpProgress ? window.rbXpProgress() : 0;

    /* LEVEL UP disabled for now — golden "LEVEL UP" on passing each 1000-XP mark,
       and a final one after ДЛИННЫЙ ОТДЫХ fades. Uncomment to re-enable.
    var xp = p * ruler.clientHeight;
    var lvl = Math.floor(xp / 1000);
    if (lastXpLevel < 0) lastXpLevel = lvl;                      // seed on first pass, no fire on load
    else if (lvl > lastXpLevel) cheer('level');
    lastXpLevel = lvl;
    */

    /* reaching the bottom: green long-rest heal */
    if (p >= 0.999) {
      if (!celebrated) {
        celebrated = true;
        cheer('rest');
        /* setTimeout(function () { if (celebrated) cheer('level'); }, 3300); */  // LEVEL UP after ДЛИННЫЙ ОТДЫХ (disabled)
      }
    } else if (p < 0.98) {
      celebrated = false;                                        // re-arm after leaving the bottom
    }
  }

  function tick() {
    scrollRaf = 0;
    layer.style.visibility = ruler.clientHeight > 0 ? 'visible' : 'hidden';
    checkSpawns();
    updateTargets();
    maybeCheer();
    startAnim();
  }
  function onScroll() { if (!scrollRaf) scrollRaf = requestAnimationFrame(tick); }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  tick();   // initial pass (covers a page that loads already scrolled)
});
