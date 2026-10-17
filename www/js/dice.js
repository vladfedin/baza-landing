/*
  The die is decoration: three.js + cannon.js weigh ~700 KB, and no die lies on
  the page until the visitor asks for one. So the libs are fetched only on
  intent — the pointer over a Ролебаза logo ([data-throw-die]), its focus or a
  click — from our own server (paths on #dice-overlay, versioned with the rest
  of the page's assets). Clicks made while they load are kept and played after.

  A click throws one more d20, up to five on the table; the sixth throws the
  promo cube — the app's logo die (P, masks, scroll and three random glyphs on
  the brand set's black and gold, faces from js/promo-die-glyphs.js, generated
  by tools/promo-die-glyphs.mjs); the seventh clears them all, and the count
  starts over (window.diceOverlay.press). Without the glyphs the sixth is one
  more d20.
*/
(function () {
  'use strict';
  var state = 'idle';          // idle → loading → ready | failed
  var queued = 0;
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  function boot() {
    if (state !== 'idle') return;
    var host = document.getElementById('dice-overlay');
    if (!host) { state = 'failed'; return; }
    state = 'loading';
    loadScript(host.getAttribute('data-three'))
      .then(function () { return loadScript(host.getAttribute('data-cannon')); })
      // the promo cube's faces: optional — without them the sixth throw is a d20
      .then(function () {
        var glyphs = host.getAttribute('data-promo-glyphs');
        return glyphs ? loadScript(glyphs).catch(function () {}) : null;
      })
      .then(function () { return loadDiceFonts(host); })
      .then(function () {
        startDice();
        state = 'ready';
        for (; queued > 0; queued--) window.diceOverlay.press();
      })
      .catch(function () { state = 'failed'; /* no die — the page works without it */ });
  }
  // the brand set's faces (promo-goldcaps of the app): Dicefont digits and the
  // Gotfridus «P»; a font that fails leaves the die on a system face
  function loadDiceFonts(host) {
    if (!('FontFace' in window)) return Promise.resolve();
    var load = function (family, attr) {
      var src = host.getAttribute(attr);
      if (!src) return Promise.resolve();
      return new FontFace(family, 'url(' + src + ')').load()
        .then(function (f) { document.fonts.add(f); })
        .catch(function () {});
    };
    return Promise.all([load('RbDiceDigits', 'data-font-digits'), load('RbDiceBrand', 'data-font-brand')]);
  }
  function wire() {
    document.querySelectorAll('[data-throw-die]').forEach(function (el) {
      el.addEventListener('pointerenter', boot);
      el.addEventListener('focus', boot);
      el.addEventListener('click', function () {
        if (state === 'ready') { window.diceOverlay.press(); return; }
        if (queued < 5) queued++;
        boot();
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();

function startDice() {
(function () {
  'use strict';

  /* ----------------------- CONFIG ----------------------- */
  const CONFIG = {
    diceCount:     0,   // none on the page until a click on the logo
    dieRadius:     1.35,        // in world units (world is ~24 units tall)
    dieColor:      '#b8402f',   // matches --accent-red (НРИ letters)
    numberColor:   '#d9b36a',   // Rolebaza accent gold
    edgeColor:     'rgba(217,179,106,0.4)', // thin gold inlay line on each facet
    gravity:       -38,         // world units / s²  (exaggerated = snappier dice)
    restitution:   0.38,        // bounciness
    friction:      0.35,
    worldHeight:   24,          // visible height of the physics box
    depth:         2.2,         // how far dice may drift toward/away from camera
    scrollKick:    0.055,       // upward velocity per scroll px (scrolling down)
    scrollKickMax: 13,          // cap for one scroll burst
    sideAngleMax:  0.35,        // max sideways ratio of a scroll toss ("small random angle")
    throwPower:    1.0,         // multiplier on drag-release velocity
    maxThrow:      45,          // clamp on throw speed
    shadows:       true,
    // --- NEW_BEHAVIOR only (marble dice rolling on the screen "tabletop") ---
    // the app's brand set «Фирменные кубы Ролебазы» (dice_skins promo-goldcaps):
    // black mirror body, gold digits with a dark outline, gold corner caps
    dieColorNew:   '#0b0b0f',   // body
    digitNew:      '#e3b54c',   // digits and the «P»
    outlineNew:    '#2a1e06',   // digit outline
    gravityZ:      -30,         // gravity pointed "into the screen" (tabletop)
    tableZ:        -1.2,        // rest-plane depth (dice sit ~at the screen)
    liftZ:          9,          // how far a grabbed die rises toward the viewer
    deadZone:       3.2         // min planar drag speed (u/s) before throw momentum
  };
  /* ------------------------------------------------------- */

  // Behaviour toggle.  'OLD_BEHAVIOR' = the original gravity-down d20s.
  // 'NEW_BEHAVIOR'  = marble dice rolling on the monitor surface: gravity points
  // into the screen, scrolling no longer tosses them, and grabbing a die raises
  // it off the table then flicks it with mouse momentum (with a dead zone).
  const BEHAVIOR = 'NEW_BEHAVIOR';
  const NEW = (BEHAVIOR === 'NEW_BEHAVIOR');

  // smaller dice on mobile: less interference with content
  if (window.matchMedia('(max-width: 768px)').matches) CONFIG.dieRadius *= 0.7;

  const container = document.getElementById('dice-overlay');
  const navBarEl = document.querySelector('.topbar-shell');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- icosahedron shared by visuals & physics ---------- */
  const T = (1 + Math.sqrt(5)) / 2;
  const RAW_VERTS = [
    [-1,  T,  0], [ 1,  T,  0], [-1, -T,  0], [ 1, -T,  0],
    [ 0, -1,  T], [ 0,  1,  T], [ 0, -1, -T], [ 0,  1, -T],
    [ T,  0, -1], [ T,  0,  1], [-T,  0, -1], [-T,  0,  1]
  ];
  const FACES = [
    [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
    [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
    [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
    [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]
  ];
  const VERT_SCALE = CONFIG.dieRadius / Math.hypot(1, T, 0);
  const VERTS = RAW_VERTS.map(v => v.map(c => c * VERT_SCALE));

  /* ---------- number atlas texture (5 × 4 cells, faces 1–20) ---------- */
  function makeAtlas() {
    const COLS = 5, ROWS = 4, CS = 256;
    const cv = document.createElement('canvas');
    cv.width = COLS * CS; cv.height = ROWS * CS;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = NEW ? CONFIG.dieColorNew : CONFIG.dieColor;
    ctx.fillRect(0, 0, cv.width, cv.height);

    const pad = CS * 0.055;
    const uvs = []; // per face: 3 uv pairs (apex, baseL, baseR)

    // a gold cap («пирамидка») on one corner of a face, as the brand set's
    // overlays draw it: two gold tones split from the corner, a dark line
    // along the inner edge; caps of the five faces meeting at a vertex make
    // the gold pyramid of the brand die
    function cap(v, a, b) {
      const t = 0.24;
      const p1 = [v[0] + (a[0] - v[0]) * t, v[1] + (a[1] - v[1]) * t];
      const p2 = [v[0] + (b[0] - v[0]) * t, v[1] + (b[1] - v[1]) * t];
      const m = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
      ctx.beginPath(); ctx.moveTo(v[0], v[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(m[0], m[1]); ctx.closePath();
      ctx.fillStyle = '#d6a63c'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(v[0], v[1]); ctx.lineTo(m[0], m[1]); ctx.lineTo(p2[0], p2[1]); ctx.closePath();
      ctx.fillStyle = '#f0c962'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]);
      ctx.strokeStyle = '#8a6418'; ctx.lineWidth = CS * 0.014; ctx.stroke();
    }

    for (let i = 0; i < 20; i++) {
      const col = i % COLS, row = (i / COLS) | 0;
      const x0 = col * CS, y0 = row * CS;
      const apex  = [x0 + CS / 2,  y0 + pad];
      const baseL = [x0 + pad,     y0 + CS - pad];
      const baseR = [x0 + CS - pad, y0 + CS - pad];
      const n = i + 1;
      const cx = x0 + CS / 2;
      const cy = (apex[1] + baseL[1] + baseR[1]) / 3 + CS * 0.02;

      if (NEW) {
        cap(apex, baseL, baseR); cap(baseL, apex, baseR); cap(baseR, apex, baseL);
        // face «20» carries the brand «P» (Gotfridus), the rest Dicefont digits
        const isRb = n === 20;
        const label = isRb ? 'P' : String(n);
        const fs = CS * (isRb ? 0.5 : 0.36);
        ctx.font = isRb ? `${fs}px RbDiceBrand, Georgia, serif` : `${fs}px RbDiceDigits, "Arial Black", system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        ctx.strokeStyle = CONFIG.outlineNew; ctx.lineWidth = fs * 0.06;
        ctx.strokeText(label, cx, cy);
        ctx.fillStyle = CONFIG.digitNew;
        ctx.fillText(label, cx, cy);
        if (n === 6 || n === 9) {                     // the app marks 6 / 9 with a dot after the digit
          const dx = cx + ctx.measureText(label).width / 2 + fs * 0.12;
          ctx.beginPath(); ctx.arc(dx, cy + fs * 0.28, fs * 0.055, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // thin inlay line just inside each facet edge
        ctx.strokeStyle = CONFIG.edgeColor;
        ctx.lineWidth = CS * 0.028;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(apex[0], apex[1]); ctx.lineTo(baseR[0], baseR[1]);
        ctx.lineTo(baseL[0], baseL[1]); ctx.closePath();
        ctx.stroke();
        const label = String(n);
        const fs = CS * 0.33;
        ctx.font = `800 ${fs}px "Arial Black", "Segoe UI", system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(120,72,10,0.9)';      // darker gold rim → gilded look
        ctx.lineWidth = fs * 0.08;
        ctx.strokeText(label, cx, cy - CS * 0.04);
        ctx.fillStyle = CONFIG.numberColor;
        ctx.fillText(label, cx, cy - CS * 0.04);
        if (n === 6 || n === 9) {                     // disambiguate 6 / 9
          ctx.strokeRect(cx - fs * 0.28, cy - CS * 0.04 + fs * 0.52, fs * 0.56, fs * 0.07);
          ctx.fillRect(cx - fs * 0.28, cy - CS * 0.04 + fs * 0.52, fs * 0.56, fs * 0.07);
        }
      }

      const W = cv.width, H = cv.height;
      const uv = p => [p[0] / W, 1 - p[1] / H];
      uvs.push([uv(apex), uv(baseL), uv(baseR)]);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    return { tex, uvs };
  }

  function makeDieGeometry(uvs) {
    const pos = [], uv = [];
    for (let f = 0; f < 20; f++) {
      const [a, b, c] = FACES[f];
      pos.push(...VERTS[a], ...VERTS[b], ...VERTS[c]);
      uv.push(...uvs[f][0], ...uvs[f][1], ...uvs[f][2]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals(); // non-indexed → flat facet normals
    return g;
  }

  /* ---------- three.js scene ---------- */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  const camDist = (CONFIG.worldHeight / 2) / Math.tan(THREE.MathUtils.degToRad(20));
  camera.position.set(0, 0, camDist);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if (CONFIG.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const sun = new THREE.DirectionalLight(0xffffff, 0.85);
  sun.position.set(-8, 18, NEW ? 26 : 14);   // NEW: more toward the viewer so a raised die shadows the table
  if (CONFIG.shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const s = 26;
    sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
    sun.shadow.camera.top = s;   sun.shadow.camera.bottom = -s;
    sun.shadow.camera.far = 80;
  }
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xd9b36a, 0.5);  // warm rim, matches accent
  rim.position.set(10, 4, -6);
  scene.add(rim);

  // transparent shadow-catcher at the bottom of the viewport
  const shadowFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(300, NEW ? 300 : 60),
    new THREE.ShadowMaterial({ opacity: NEW ? 0.33 : 0.45 })
  );
  if (NEW) shadowFloor.position.z = CONFIG.tableZ;   // the "table" behind the dice, facing the viewer
  else     shadowFloor.rotation.x = -Math.PI / 2;
  shadowFloor.receiveShadow = CONFIG.shadows;
  scene.add(shadowFloor);

  /* ---------- physics world ---------- */
  const world = new CANNON.World();
  if (NEW) world.gravity.set(0, 0, CONFIG.gravityZ);   // "into the screen" tabletop
  else     world.gravity.set(0, CONFIG.gravity, 0);
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 12;
  world.allowSleep = true;

  const diceMat = new CANNON.Material('dice');
  const wallMat = new CANNON.Material('wall');
  world.addContactMaterial(new CANNON.ContactMaterial(diceMat, wallMat, {
    friction: CONFIG.friction, restitution: CONFIG.restitution
  }));
  world.addContactMaterial(new CANNON.ContactMaterial(diceMat, diceMat, {
    friction: CONFIG.friction, restitution: CONFIG.restitution * 0.8
  }));

  const dieShape = new CANNON.ConvexPolyhedron(
    VERTS.map(v => new CANNON.Vec3(v[0], v[1], v[2])),
    FACES.map(f => f.slice())
  );

  function makeWall(nx, ny, nz) {
    const b = new CANNON.Body({ mass: 0, material: wallMat });
    b.addShape(new CANNON.Plane());
    // orient the plane (default normal +z) toward (nx, ny, nz)
    const from = new CANNON.Vec3(0, 0, 1), to = new CANNON.Vec3(nx, ny, nz);
    const q = new CANNON.Quaternion();
    if (from.almostEquals(to)) q.set(0, 0, 0, 1);
    else if (from.almostEquals(to.negate(new CANNON.Vec3()))) q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI);
    else {
      const axis = from.cross(to); axis.normalize();
      q.setFromAxisAngle(axis, Math.acos(from.dot(to)));
    }
    b.quaternion.copy(q);
    world.addBody(b);
    return b;
  }

  const floor   = makeWall(0,  1, 0);
  const ceiling = makeWall(0, -1, 0);
  const wallL   = makeWall( 1, 0, 0);
  const wallR   = makeWall(-1, 0, 0);
  const wallBk  = makeWall(0, 0,  1);
  const wallFt  = makeWall(0, 0, -1);
  if (NEW) {                       // back wall = the "table"; front wall = the lift ceiling
    wallBk.position.z = CONFIG.tableZ;
    wallFt.position.z = CONFIG.liftZ;
  } else {
    wallBk.position.z = -CONFIG.depth;
    wallFt.position.z =  CONFIG.depth;
  }

  /* ---------- viewport ↔ world mapping ---------- */
  let worldW = 10;
  const worldH = CONFIG.worldHeight;
  let floorY = -worldH / 2, ceilY = worldH / 2;
  let prevFloorY = floorY;

  // glue the physics ceiling to the navbar and the floor to the viewport's bottom
  function syncBounds() {
    const hpx = container.clientHeight || window.innerHeight;
    const pxToY = (px) => worldH / 2 - (px / hpx) * worldH;
    ceilY = navBarEl ? pxToY(navBarEl.getBoundingClientRect().bottom) : worldH / 2;
    // rest the dice 16px above the viewport's bottom edge
    floorY = Math.max(pxToY(hpx - 16), -worldH / 2);
    if (floorY > ceilY - CONFIG.dieRadius * 3) floorY = ceilY - CONFIG.dieRadius * 3;
    floor.position.y = floorY;
    ceiling.position.y = ceilY;
    if (!NEW) shadowFloor.position.y = floorY;
  }

  function layout() {
    const w = container.clientWidth  || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    worldW = worldH * camera.aspect;

    wallL.position.x   = -worldW / 2;
    wallR.position.x   =  worldW / 2;
    syncBounds();

    // pull any die that ended up outside the new bounds back in
    for (const d of dice) {
      const m = d.radius || CONFIG.dieRadius;
      if (Math.abs(d.body.position.x) > worldW / 2 - m) {
        d.body.position.x = THREE.MathUtils.clamp(d.body.position.x, -worldW / 2 + m, worldW / 2 - m);
        d.body.wakeUp();
      }
    }
  }

  /* ---------- dice ---------- */
  const { tex, uvs } = makeAtlas();
  const dieGeo = makeDieGeometry(uvs);
  const dieMaterial = new THREE.MeshStandardMaterial(
    NEW
      ? { map: tex, roughness: 0.42, metalness: 0.2,  flatShading: true }   // glossy black of the brand set; rougher than a mirror so a face never flares white
      : { map: tex, roughness: 0.38, metalness: 0.22, flatShading: true }
  );

  const dice = [];
  function addDie() {
    const mesh = new THREE.Mesh(dieGeo, dieMaterial);
    mesh.castShadow = CONFIG.shadows;
    scene.add(mesh);

    const body = new CANNON.Body({ mass: 1.2, material: diceMat, shape: dieShape });
    body.angularDamping = 0.12;
    body.linearDamping = 0.02;
    body.allowSleep = true;
    body.sleepSpeedLimit = 0.55;
    body.sleepTimeLimit = 0.8;
    world.addBody(body);

    const die = { mesh, body, thrown: false };
    // a die the visitor threw reports its face once it comes to rest
    // (js/roll-card.js shows it the way the table's chat shows a roll)
    body.addEventListener('sleep', () => {
      if (!die.thrown) return;
      die.thrown = false;
      window.dispatchEvent(new CustomEvent('rb:roll', { detail: { sides: 20, value: faceTowardViewer(body) } }));
    });
    dice.push(die);
    return die;
  }

  // Face f of the geometry carries the number f + 1 (makeAtlas / makeDieGeometry).
  // The rolled face is the one pointing against gravity: toward the camera (+Z)
  // on the screen "tabletop" (NEW), up the screen (+Y) for falling dice (OLD).
  const FACE_CENTERS = FACES.map(([a, b, c]) => new CANNON.Vec3(
    (VERTS[a][0] + VERTS[b][0] + VERTS[c][0]) / 3,
    (VERTS[a][1] + VERTS[b][1] + VERTS[c][1]) / 3,
    (VERTS[a][2] + VERTS[b][2] + VERTS[c][2]) / 3
  ));
  function faceTowardViewer(body) {
    let best = 0, bestZ = -Infinity;
    FACE_CENTERS.forEach((v, f) => {
      const w = body.quaternion.vmult(v);
      const up = NEW ? w.z : w.y;
      if (up > bestZ) { bestZ = up; best = f; }
    });
    return best + 1;
  }
  for (let i = 0; i < CONFIG.diceCount; i++) addDie();

  /* ---------- grab / drag / throw ----------
     The canvas keeps pointer-events:none so the page stays usable.
     We listen on window in the CAPTURE phase; only when the ray
     actually hits a die do we hijack the event.                    */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const dragPlane = new THREE.Plane();
  const hitPoint = new THREE.Vector3();
  let drag = null; // { die, samples: [{t, p}] }

  function pointerRay(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1,
            -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  }

  function pickDie(e) {
    pointerRay(e);
    const hits = raycaster.intersectObjects(dice.filter(d => d.mesh.visible && !d.shrinking).map(d => d.mesh));
    return hits.length ? { die: dice.find(d => d.mesh === hits[0].object), point: hits[0].point } : null;
  }

  window.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary) return;
    const hit = pickDie(e);
    if (!hit) return;                       // not a die → page gets the event
    e.preventDefault();
    e.stopPropagation();
    const camDir = camera.getWorldDirection(new THREE.Vector3());
    // NEW_BEHAVIOR: grabbing lifts the die off the table toward the viewer
    const planePoint = NEW
      ? new THREE.Vector3(hit.point.x, hit.point.y, CONFIG.liftZ - CONFIG.dieRadius)
      : hit.point;
    dragPlane.setFromNormalAndCoplanarPoint(camDir, planePoint);
    drag = { die: hit.die, samples: [] };
    hit.die.body.wakeUp();
    document.documentElement.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  }, { capture: true });

  window.addEventListener('pointermove', (e) => {
    if (drag) {
      pointerRay(e);
      if (raycaster.ray.intersectPlane(dragPlane, hitPoint)) {
        const m = drag.die.radius || CONFIG.dieRadius;
        hitPoint.x = THREE.MathUtils.clamp(hitPoint.x, -worldW / 2 + m, worldW / 2 - m);
        hitPoint.y = THREE.MathUtils.clamp(hitPoint.y, floorY + m, ceilY - m);
        drag.target = hitPoint.clone();
        drag.samples.push({ t: performance.now(), p: hitPoint.clone() });
        if (drag.samples.length > 8) drag.samples.shift();
      }
      e.preventDefault();
      e.stopPropagation();
    } else if (e.pointerType === 'mouse') {
      document.documentElement.style.cursor = pickDie(e) ? 'grab' : '';
    }
  }, { capture: true });

  function endDrag() {
    if (!drag) return;
    const b = drag.die.body;
    const s = drag.samples;
    if (s.length >= 2) {
      const a = s[0], z = s[s.length - 1];
      const dt = Math.max((z.t - a.t) / 1000, 0.016);
      const v = new THREE.Vector3().subVectors(z.p, a.p).divideScalar(dt)
        .multiplyScalar(CONFIG.throwPower);
      if (v.length() > CONFIG.maxThrow) v.setLength(CONFIG.maxThrow);
      if (NEW) {
        // flick across the table: planar momentum with a controller-style dead
        // zone, so a slow, deliberate placement barely nudges the die
        const sp = Math.hypot(v.x, v.y);
        const scale = sp <= CONFIG.deadZone ? 0 : (sp - CONFIG.deadZone) / sp;
        drag.die.thrown = scale > 0;     // a slow placement is not a roll
        b.velocity.set(v.x * scale, v.y * scale, 0);   // gravity settles it back onto the table
        const spin = Math.min(sp * scale * 0.3, 14);
        b.angularVelocity.set(
          (Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin
        );
      } else {
        b.velocity.set(v.x, v.y, v.z * 0.3);
        drag.die.thrown = v.length() > CONFIG.deadZone;
        const spin = Math.min(v.length() * 0.35, 16);
        b.angularVelocity.set(
          (Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin
        );
      }
    }
    drag = null;
    document.documentElement.style.cursor = '';
    document.body.style.userSelect = '';
  }
  window.addEventListener('pointerup', endDrag, { capture: true });
  window.addEventListener('pointercancel', endDrag, { capture: true });
  window.addEventListener('touchmove', (e) => { if (drag) e.preventDefault(); }, { passive: false });

  /* ---------- scroll → toss the dice at a small random angle ---------- */
  let lastScrollY = window.scrollY;
  let pendingKick = 0;
  window.addEventListener('scroll', () => {
    const dy = window.scrollY - lastScrollY;
    lastScrollY = window.scrollY;
    if (dy > 0) pendingKick += dy;          // only scrolling DOWN re-rolls
  }, { passive: true });

  function applyScrollKick() {
    if (NEW) { pendingKick = 0; return; }   // NEW_BEHAVIOR: scrolling no longer affects the dice
    if (pendingKick <= 0) return;
    const kick = Math.min(pendingKick * CONFIG.scrollKick, CONFIG.scrollKickMax);
    pendingKick = 0;
    if (reducedMotion) return;
    for (const d of dice) {
      if (drag && drag.die === d) continue;
      if (!d.mesh.visible || d.shrinking) continue;
      const b = d.body;
      b.wakeUp();
      const angle = (Math.random() - 0.5) * 2 * CONFIG.sideAngleMax; // small random tilt
      b.velocity.x += kick * angle;
      b.velocity.y += kick * (0.85 + Math.random() * 0.3);
      b.angularVelocity.x += (Math.random() - 0.5) * kick * 0.8;
      b.angularVelocity.y += (Math.random() - 0.5) * kick * 0.8;
      b.angularVelocity.z += (Math.random() - 0.5) * kick * 0.8;
    }
  }

  /* ---------- main loop ---------- */
  let lastT = performance.now();
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;

    syncBounds();
    // when the floor drops (the window grew taller) wake sleeping dice so they fall to it
    if (floorY < prevFloorY - 0.01) {
      for (const d of dice) { if (d.mesh.visible && !d.shrinking) d.body.wakeUp(); }
    }
    prevFloorY = floorY;
    applyScrollKick();

    if (drag && drag.target) {              // steer the grabbed die
      const b = drag.die.body;
      b.wakeUp();
      const k = 18;
      b.velocity.set(
        (drag.target.x - b.position.x) * k,
        (drag.target.y - b.position.y) * k,
        (drag.target.z - b.position.z) * k
      );
      b.angularVelocity.scale(0.9, b.angularVelocity);
    }

    world.step(1 / 60, dt, 4);

    for (const d of dice) {
      d.mesh.position.copy(d.body.position);
      d.mesh.quaternion.copy(d.body.quaternion);
    }
    // "shrink to zero" hide animation (reset button)
    for (let i = shrinking.length - 1; i >= 0; i--) {
      const s = shrinking[i];
      const k = 1 - (now - s.t0) / SHRINK_MS;
      if (k <= 0) {
        s.mesh.visible = false;
        s.mesh.scale.set(1, 1, 1);                   // ready for a future respawn
        if (s.removeFromScene) scene.remove(s.mesh); // extras are destroyed
        if (s.die) s.die.shrinking = false;
        shrinking.splice(i, 1);
      } else {
        s.mesh.scale.setScalar(Math.max(k * k, 0.001)); // ease-in shrink
      }
    }
    renderer.render(scene, camera);
  }

  /* ---------- boot ---------- */
  /* ---------- a click on the Ролебаза logo throws a d20; the sixth clears ---------- */
  const MAX_DICE = 5;

  function dropIn(d) {
    const b = d.body;
    b.wakeUp();
    if (NEW) {                        // drop onto the table from a raised point, then roll
      b.position.set(
        (Math.random() - 0.5) * worldW * 0.5,
        (Math.random() - 0.5) * worldH * 0.4,
        CONFIG.liftZ * 0.6
      );
      b.quaternion.setFromAxisAngle(
        new CANNON.Vec3(Math.random(), Math.random(), Math.random()).unit(),
        Math.random() * Math.PI * 2
      );
      b.velocity.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, 0);
      b.angularVelocity.set(
        (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14
      );
      return;
    }
    const third = worldW / 3;
    const side = Math.random() < 0.5 ? -1 : 1;
    b.position.set(
      side * third + (Math.random() - 0.5) * third * 0.5,
      ceilY - CONFIG.dieRadius * 1.6,
      (Math.random() - 0.5) * CONFIG.depth * 0.5
    );
    b.quaternion.setFromAxisAngle(
      new CANNON.Vec3(Math.random(), Math.random(), Math.random()).unit(),
      Math.random() * Math.PI * 2
    );
    b.velocity.set((Math.random() - 0.5) * 6, -(2 + Math.random() * 4), 0);
    b.angularVelocity.set(
      (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14
    );
  }

  function throwOneDie() {
    const d = addDie();
    d.extra = true;                  // every die is a visitor's: reset takes it away
    dropIn(d);
    d.thrown = true;                 // its face is announced like a visitor's throw
    return d;
  }

  /* ---------- the promo cube: the app's logo die (the sixth throw) ---------- */
  // Same faces as the app's easter-egg die (logo-die-glyphs.ts): P, masks and
  // scroll plus three random glyphs, gold on the brand set's black with gold
  // corner caps. A toy: its face is not announced as a roll.
  const PROMO = window.RB_PROMO_DIE || null;
  const PROMO_HALF = CONFIG.dieRadius * 0.9;
  function promoFace(key) {
    const S = 256;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = CONFIG.dieColorNew;
    ctx.fillRect(0, 0, S, S);
    const c = S * 0.2;                                   // gold caps on the four corners
    [[0, 0, 1, 1], [S, 0, -1, 1], [0, S, 1, -1], [S, S, -1, -1]].forEach(([x, y, sx, sy]) => {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sx * c, y); ctx.lineTo(x + sx * c / 2, y + sy * c / 2); ctx.closePath();
      ctx.fillStyle = '#d6a63c'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sx * c / 2, y + sy * c / 2); ctx.lineTo(x, y + sy * c); ctx.closePath();
      ctx.fillStyle = '#f0c962'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + sx * c, y); ctx.lineTo(x, y + sy * c);
      ctx.strokeStyle = '#8a6418'; ctx.lineWidth = S * 0.014; ctx.stroke();
    });
    const gold = CONFIG.digitNew;
    // As on the logo (img/logo-v2.svg): a glyph fills 72 % of its face
    // (0.14 margins), the scroll is mirrored and carries a small «×».
    const FILL = 0.72, PAD = (1 - FILL) / 2;
    ctx.save();
    if (key === 'p') {                                    // Gotfridus «P», tilted as on the logo
      const k = (S * 0.6) / 1700;
      ctx.translate(S / 2, S / 2); ctx.rotate(-32 * Math.PI / 180); ctx.scale(k, -k); ctx.translate(-700, -750);
      ctx.fillStyle = gold; ctx.fill(new Path2D(PROMO.p));
    } else if (key === 'drama') {                         // the masks: 96-grid fills, Y flipped
      const k = (S * FILL) / 96;
      ctx.translate(S * PAD, S * PAD); ctx.scale(k, k); ctx.translate(0, 96); ctx.scale(0.1, -0.1);
      ctx.fillStyle = gold;
      PROMO.masks.forEach(d => ctx.fill(new Path2D(d)));
    } else {                                              // Lucide-grid strokes: the scroll and the pool
      const scroll = key === 'scroll';
      const els = scroll ? PROMO.scroll.map(d => ({ tag: 'path', d })) : PROMO.pool[key];
      const k = (S * FILL) / 24;
      ctx.translate(S * PAD, S * PAD); ctx.scale(k, k);
      if (scroll) { ctx.translate(24, 0); ctx.scale(-1, 1); }
      ctx.strokeStyle = gold; ctx.lineWidth = scroll ? 1.5 : 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      els.forEach(el => {
        if (el.tag === 'path') ctx.stroke(new Path2D(el.d));
        else { ctx.beginPath(); ctx.arc(el.cx, el.cy, el.r, 0, Math.PI * 2); ctx.stroke(); }
      });
    }
    ctx.restore();
    if (key === 'scroll') {                               // the logo's «×» in the middle of the scroll
      const arm = S * 0.12, thick = S * 0.042;
      ctx.save();
      ctx.translate(S / 2, S / 2); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = gold;
      [[arm, thick], [thick, arm]].forEach(([w, h]) => {
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, thick / 2); else ctx.rect(-w / 2, -h / 2, w, h);
        ctx.fill();
      });
      ctx.restore();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, metalness: 0.2 });
  }
  function promoKeys() {
    const pool = Object.keys(PROMO.pool);
    const keys = ['p', 'drama', 'scroll'];
    while (keys.length < 6 && pool.length) keys.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    for (let i = keys.length - 1; i > 0; i--) {           // the faces land in random places on the cube
      const j = Math.floor(Math.random() * (i + 1)); const t = keys[i]; keys[i] = keys[j]; keys[j] = t;
    }
    return keys;
  }
  const promoGeo = PROMO ? new THREE.BoxGeometry(PROMO_HALF * 2, PROMO_HALF * 2, PROMO_HALF * 2) : null;
  const promoShape = PROMO ? new CANNON.Box(new CANNON.Vec3(PROMO_HALF, PROMO_HALF, PROMO_HALF)) : null;
  function throwPromoDie() {
    const mesh = new THREE.Mesh(promoGeo, promoKeys().map(promoFace));
    mesh.castShadow = CONFIG.shadows;
    scene.add(mesh);
    const body = new CANNON.Body({ mass: 1.6, material: diceMat, shape: promoShape });
    body.angularDamping = 0.12;
    body.linearDamping = 0.02;
    body.allowSleep = true;
    body.sleepSpeedLimit = 0.55;
    body.sleepTimeLimit = 0.8;
    world.addBody(body);
    const d = { mesh, body, thrown: false, extra: true, promo: true, radius: PROMO_HALF * Math.sqrt(3) };
    dice.push(d);
    dropIn(d);
    return d;
  }

  function press() {
    const out = dice.filter(d => d.mesh.visible && !d.shrinking);
    if (out.length > MAX_DICE || out.some(d => d.promo)) resetDice();       // the seventh clears
    else if (out.length === MAX_DICE && PROMO) throwPromoDie();             // the sixth: the promo cube
    else if (out.length >= MAX_DICE) resetDice();
    else throwOneDie();
  }

  /* ---------- reset: shrink-to-zero, destroy extras ---------- */
  const shrinking = [];   // { mesh, die|null, removeFromScene }
  const SHRINK_MS = 300;
  function resetDice() {
    if (drag) endDrag();
    for (let i = dice.length - 1; i >= 0; i--) {
      const d = dice[i];
      if (!d.mesh.visible) continue;
      (world.removeBody || world.remove).call(world, d.body);  // freeze physics now
      if (reducedMotion) {
        d.mesh.visible = false;
        if (d.extra) { scene.remove(d.mesh); dice.splice(i, 1); }
      } else if (!d.shrinking) {
        d.shrinking = true;
        if (d.extra) {
          dice.splice(i, 1);                         // extras leave the pool now...
          shrinking.push({ mesh: d.mesh, die: null, removeFromScene: true, t0: performance.now() });
        } else {
          shrinking.push({ mesh: d.mesh, die: d, removeFromScene: false, t0: performance.now() });
        }
      }
    }
  }

  layout();
  window.addEventListener('resize', layout);
  syncBounds();
  requestAnimationFrame(tick);

  // tiny public API
  window.diceOverlay = { press, throwOne: throwOneDie, reset: resetDice, dice, world, config: CONFIG };
})();
}
