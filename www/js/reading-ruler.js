/*
  Reading-progress "XP" ruler (desktop only).
  ---------------------------------------------------------------------------
  A vertical ruler pinned to the right edge that fills as the page is scrolled —
  like a longread progress bar, but gamified: milestone marks are labelled with
  the % scrolled shown as XP (experience). The tick hierarchy mimics a metric
  ruler, built from the ruler's own pixel height:
    - primary   every 150px  (2px, longest, labelled "<n> XP")
    - secondary every  75px  (splits each primary segment in half)
    - tertiary  every  15px  (fine, mm-style divisions)
  Each primary's label is the % that its position represents; a live cursor
  shows the current XP. Hidden under 1200px via CSS — this script no-ops while
  the element has no height, and rebuilds on resize.
*/
document.addEventListener('DOMContentLoaded', function () {
  var ruler = document.querySelector('.reading-ruler');
  if (!ruler) return;
  var ticksBox = ruler.querySelector('.reading-ruler__ticks');
  var fill     = ruler.querySelector('.reading-ruler__rail-fill');
  var cursor   = ruler.querySelector('.reading-ruler__cursor');
  var xpOut    = ruler.querySelector('.reading-ruler__xp');
  if (!ticksBox || !fill || !cursor || !xpOut) return;

  var PRIMARY = 150, SECONDARY = 75, TERTIARY = 15;
  var ticks = [];   // { el, pos }
  var H = 0;        // ruler pixel length (0 while hidden on small screens)

  /* ----------------------------------------------------------------------
     The ruler is a long IN-PAGE element pinned down the right side (it scrolls
     with the content, not the viewport). Its top sits 160px below the fixed top
     bar; its bottom is capped at MAX_XP px (or the campfire's bottom line, if
     that comes first) so the bar stays short enough that the party riding the
     cursor never sinks into the bottom action bar. Tick spacing stays constant
     metric-ruler pixels (150/75/15) and XP is linear along that length — every
     scrolled pixel earns the same XP: 0 at the top mark, MAX_XP at the bottom.
     100% (the bottom) is reached when the ruler's foot rises to a safe line
     above the action bar, keeping the token party fully on screen.
     Shared with js/party.js via window.rbXpProgress.                          */
  var MAX_XP = 6450;                             // hard cap on the ruler's length / top XP value
  var SAFE_GAP = 100;                            // keep the cursor (and its party) this far above the action bar
  var fireImg = document.querySelector('.campfire img');
  var actionBarEl = document.querySelector('.action-bar');

  function rulerTopDoc() {                        // document Y of the ruler's top: 160px below the bar
    var top = document.querySelector('.topbar-shell');
    return (top ? top.offsetHeight : 0) + 32 + 128;
  }
  function campfireBottomDoc() {                  // document Y of the campfire image's bottom line
    if (!fireImg) return document.documentElement.scrollHeight;
    return Math.round(fireImg.getBoundingClientRect().bottom + window.pageYOffset);
  }
  function rulerBottomDoc() {                     // document Y of the ruler's foot (shorter of cap / campfire)
    return Math.min(campfireBottomDoc(), rulerTopDoc() + MAX_XP);
  }
  function safeLineY() {                          // lowest on-screen Y the cursor may reach (above the bar)
    var barH = actionBarEl ? actionBarEl.offsetHeight : 96;
    return window.innerHeight - barH - SAFE_GAP;
  }
  function scrollEndY() {                         // scroll offset at which XP reaches its max (bar foot at safe line)
    var docMax = document.documentElement.scrollHeight - window.innerHeight;
    return Math.max(1, Math.min(rulerBottomDoc() - safeLineY(), docMax));
  }
  function progress() {                           // 0..1, linear with scroll (constant XP per pixel)
    return Math.min(Math.max(window.pageYOffset / scrollEndY(), 0), 1);
  }
  window.rbXpProgress = progress;

  function build() {
    /* pin the ruler down the page: top 160px under the bar, bottom at the cap/fire */
    var A = rulerTopDoc(), B = rulerBottomDoc();
    ruler.style.top = A + 'px';
    ruler.style.bottom = 'auto';
    ruler.style.height = Math.max(0, B - A) + 'px';
    H = ruler.clientHeight;
    ticksBox.textContent = '';
    ticks = [];
    if (H <= 0) return;                       // hidden (mobile) → nothing to draw
    var frag = document.createDocumentFragment();
    for (var y = 0; y <= H + 0.5; y += TERTIARY) {
      var level = (y % PRIMARY === 0) ? 'primary' : (y % SECONDARY === 0) ? 'secondary' : 'tertiary';
      var t = document.createElement('div');
      t.className = 'reading-ruler__tick reading-ruler__tick--' + level;
      t.style.top = y + 'px';
      if (level === 'primary') {
        var lab = document.createElement('span');
        lab.className = 'reading-ruler__label';
        lab.textContent = y + ' XP';          // pixels passed (tick's distance down the ruler), not a %
        t.appendChild(lab);
      }
      frag.appendChild(t);
      ticks.push({ el: t, pos: y });
    }
    ticksBox.appendChild(frag);
  }

  function update() {
    if (H <= 0) return;
    var p = progress();
    var px = p * H;
    fill.style.height = px + 'px';
    cursor.style.top = px + 'px';
    xpOut.textContent = Math.round(px) + ' XP';   // matches the pixel-based tick labels
    for (var i = 0; i < ticks.length; i++) {
      ticks[i].el.classList.toggle('is-reached', ticks[i].pos <= px + 0.5);
    }
  }

  var raf = 0;
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; update(); });
  }

  function rebuild() { build(); update(); }

  build();
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  var rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(rebuild, 150);
  }, { passive: true });
  /* the campfire art is lazy-loaded, so its box (and thus the ruler's bottom)
     can shift once it decodes — remeasure then, and after full page load */
  if (fireImg && !fireImg.complete) fireImg.addEventListener('load', rebuild, { once: true });
  window.addEventListener('load', rebuild);
});
