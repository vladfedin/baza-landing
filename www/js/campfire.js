/*
  The finale's campfire comes alive: warm light flickers over the party (only
  where the picture is — the glow is cut to its outline), the fire's core
  pulses and sparks rise. It starts from the still picture and fades in on
  hover, fades back out when the pointer leaves; where there is no hover
  (touch), it plays while the picture is on screen. Reduced motion — still.
  Coordinates are the picture's own (960×600): the fire sits at FIRE.
*/
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var FIRE = { x: 482, y: 400, tip: 300 };
  var EASE_IN = 2.2, EASE_OUT = 2.8;           // per second: how fast the life fades in / out

  function wire(fig) {
    var img = fig.querySelector('img');
    var cv = fig.querySelector('canvas.campfire__fx');
    if (!img || !cv) return;
    var ctx = cv.getContext('2d');
    var mask = document.createElement('canvas');
    var spark = document.createElement('canvas');
    var W = 960, H = 600, ready = false;
    function prepare() {
      W = img.naturalWidth || W; H = img.naturalHeight || H;
      cv.width = W; cv.height = H; mask.width = W; mask.height = H;
      mask.getContext('2d').drawImage(img, 0, 0, W, H);
      spark.width = spark.height = 16;
      var sg = spark.getContext('2d'), g = sg.createRadialGradient(8, 8, 0, 8, 8, 8);
      g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(0.35, 'rgba(255,170,70,0.9)'); g.addColorStop(1, 'rgba(255,90,20,0)');
      sg.fillStyle = g; sg.fillRect(0, 0, 16, 16);
      ready = true;
    }
    if (img.complete && img.naturalWidth) prepare(); else img.addEventListener('load', prepare);

    var life = 0, want = 0, raf = 0, last = 0, t = 0, sparks = [], due = 0;
    function flicker(t) {   // a few unrelated sines read as a living flame
      return 0.6 + 0.18 * Math.sin(t * 7.3) + 0.12 * Math.sin(t * 13.1 + 1.7) + 0.1 * Math.sin(t * 3.1 + 0.4);
    }
    function frame(now) {
      var dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt;
      life += (want - life) * Math.min(1, dt * (want > life ? EASE_IN : EASE_OUT));
      var f = flicker(t);
      ctx.clearRect(0, 0, W, H);
      if (ready && life > 0.002) {
        // 1. the light on the party, cut to the picture's outline
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(mask, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        var g = ctx.createRadialGradient(FIRE.x, FIRE.y - 30, 10, FIRE.x, FIRE.y - 30, 470);
        g.addColorStop(0, 'rgba(255,160,60,' + (0.42 * f * life) + ')');
        g.addColorStop(0.45, 'rgba(255,120,40,' + (0.16 * f * life) + ')');
        g.addColorStop(1, 'rgba(255,100,30,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // 2. the fire's core
        ctx.globalCompositeOperation = 'lighter';
        var c = ctx.createRadialGradient(FIRE.x, FIRE.y - 20, 4, FIRE.x, FIRE.y - 20, 120);
        c.addColorStop(0, 'rgba(255,220,140,' + (0.34 * (0.7 + 0.3 * Math.sin(t * 11.7)) * life) + ')');
        c.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = c; ctx.fillRect(FIRE.x - 130, FIRE.y - 150, 260, 260);
      }
      // 3. sparks rise from the flames while it lives
      if (want > 0.5) {
        due += dt * 30;
        while (due >= 1) {
          due -= 1;
          sparks.push({ x: FIRE.x + (Math.random() - 0.5) * 70, y: FIRE.tip + 40 + Math.random() * 40,
            vx: (Math.random() - 0.5) * 18, vy: -(45 + Math.random() * 70), age: 0,
            max: 1.3 + Math.random() * 1.8, size: 6 + Math.random() * 8, ph: Math.random() * 6 });
        }
      }
      ctx.globalCompositeOperation = 'lighter';
      for (var i = sparks.length - 1; i >= 0; i--) {
        var s = sparks[i];
        s.age += dt;
        if (s.age > s.max) { sparks.splice(i, 1); continue; }
        s.x += (s.vx + Math.sin(t * 3 + s.ph) * 14) * dt; s.y += s.vy * dt;
        var a = (1 - s.age / s.max) * Math.min(1, life * 1.5);
        ctx.globalAlpha = a;
        ctx.drawImage(spark, s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
      }
      ctx.globalAlpha = 1;
      if (want === 0 && life < 0.003 && !sparks.length) { ctx.clearRect(0, 0, W, H); raf = 0; return; }
      raf = requestAnimationFrame(frame);
    }
    function play(on) {
      want = on ? 1 : 0;
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    }
    if (window.matchMedia('(hover: hover)').matches) {
      fig.addEventListener('pointerenter', function () { play(true); });
      fig.addEventListener('pointerleave', function () { play(false); });
    } else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { play(e.isIntersecting); }); }, { threshold: 0.4 }).observe(fig);
    }
  }
  function init() { document.querySelectorAll('.campfire').forEach(wire); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
