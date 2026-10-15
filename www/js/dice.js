document.addEventListener('DOMContentLoaded', function () {
(function () {
  'use strict';

  /* ----------------------- CONFIG ----------------------- */
  const CONFIG = {
    diceCount:     1,
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
    dieColorNew:   '#15130f',   // marble near-black base
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
  const actionBarEl = document.querySelector('.action-bar');
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

  /* ---------- faint marble veining for NEW_BEHAVIOR dice ---------- */
  function paintMarble(ctx, w, h) {
    ctx.save();
    for (let i = 0; i < 26; i++) {                       // soft grey veins
      ctx.beginPath();
      let x = Math.random() * w, y = Math.random() * h;
      ctx.moveTo(x, y);
      const segs = 3 + (Math.random() * 3 | 0);
      for (let s = 0; s < segs; s++) {
        x += (Math.random() - 0.5) * w * 0.5;
        y += (Math.random() - 0.5) * h * 0.5;
        ctx.lineTo(x, y);
      }
      const g = 150 + (Math.random() * 70 | 0);
      ctx.strokeStyle = 'rgba(' + g + ',' + g + ',' + g + ',' + (0.03 + Math.random() * 0.05).toFixed(3) + ')';
      ctx.lineWidth = 1 + Math.random() * 2.5;
      ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {                        // brighter hairline veins
      ctx.beginPath();
      let x = Math.random() * w, y = Math.random() * h;
      ctx.moveTo(x, y);
      for (let s = 0; s < 5; s++) {
        x += (Math.random() - 0.5) * w * 0.3;
        y += (Math.random() - 0.5) * h * 0.3;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(210,205,190,0.05)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- number atlas texture (5 × 4 cells, faces 1–20) ---------- */
  function makeAtlas() {
    const COLS = 5, ROWS = 4, CS = 256;
    const cv = document.createElement('canvas');
    cv.width = COLS * CS; cv.height = ROWS * CS;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = NEW ? CONFIG.dieColorNew : CONFIG.dieColor;
    ctx.fillRect(0, 0, cv.width, cv.height);
    if (NEW) paintMarble(ctx, cv.width, cv.height);

    const pad = CS * 0.055;
    const uvs = []; // per face: 3 uv pairs (apex, baseL, baseR)

    for (let i = 0; i < 20; i++) {
      const col = i % COLS, row = (i / COLS) | 0;
      const x0 = col * CS, y0 = row * CS;
      const apex  = [x0 + CS / 2,  y0 + pad];
      const baseL = [x0 + pad,     y0 + CS - pad];
      const baseR = [x0 + CS - pad, y0 + CS - pad];

      // thin inlay line just inside each facet edge
      ctx.strokeStyle = CONFIG.edgeColor;
      ctx.lineWidth = CS * 0.028;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(apex[0], apex[1]); ctx.lineTo(baseR[0], baseR[1]);
      ctx.lineTo(baseL[0], baseL[1]); ctx.closePath();
      ctx.stroke();

      // number at the triangle centroid (optically nudged up)
      const n = i + 1;
      const isRb = NEW && n === 20;                   // face «20» → stylized «Р» (Ролебаза)
      const label = isRb ? 'Р' : String(n);
      const cx = x0 + CS / 2;
      const cy = (apex[1] + baseL[1] + baseR[1]) / 3 - CS * 0.02;
      const fs = CS * (isRb ? 0.46 : 0.33);
      ctx.font = isRb ? `italic 700 ${fs}px Georgia, "PT Serif", "Times New Roman", serif` : `800 ${fs}px "Arial Black", "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(120,72,10,0.9)';        // darker gold rim → gilded look
      ctx.lineWidth = fs * 0.08;
      ctx.strokeText(label, cx, cy);
      ctx.fillStyle = CONFIG.numberColor;
      ctx.fillText(label, cx, cy);
      if (n === 6 || n === 9) {                       // disambiguate 6 / 9
        ctx.strokeRect(cx - fs * 0.28, cy + fs * 0.52, fs * 0.56, fs * 0.07);
        ctx.fillRect(cx - fs * 0.28, cy + fs * 0.52, fs * 0.56, fs * 0.07);
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

  // glue the physics floor/ceiling to the on-screen action bar / navbar
  function syncBounds() {
    const hpx = container.clientHeight || window.innerHeight;
    const pxToY = (px) => worldH / 2 - (px / hpx) * worldH;
    ceilY = navBarEl ? pxToY(navBarEl.getBoundingClientRect().bottom) : worldH / 2;
    // rest the dice 16px above the action bar's top edge (no overlap)
    floorY = actionBarEl
      ? Math.max(pxToY(actionBarEl.getBoundingClientRect().top - 16), -worldH / 2)
      : -worldH / 2;
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
      const m = CONFIG.dieRadius;
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
      ? { map: tex, roughness: 0.26, metalness: 0.0,  flatShading: true }   // polished marble
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

    const die = { mesh, body };
    dice.push(die);
    return die;
  }
  for (let i = 0; i < CONFIG.diceCount; i++) addDie();

  function rollFromTop() {
    dice.forEach((d, i) => {
      const b = d.body;
      b.wakeUp();
      // spawn from under the navbar: die 0 in the left third, die 1 in the right
      const side = (i % 2 === 0 ? -1 : 1);
      const third = worldW / 3;
      b.position.set(
        side * third + (Math.random() - 0.5) * third * 0.5,
        ceilY - CONFIG.dieRadius * 1.6,
        (Math.random() - 0.5) * CONFIG.depth * 0.6
      );
      b.quaternion.setFromAxisAngle(
        new CANNON.Vec3(Math.random(), Math.random(), Math.random()).unit(),
        Math.random() * Math.PI * 2
      );
      b.velocity.set(0, 0, 0);
      b.angularVelocity.set(0, 0, 0);
      // random force on load: an impulse with random direction & strength,
      // applied off-center so it also spins the die
      const impulse = new CANNON.Vec3(
        (Math.random() - 0.5) * 10,          // random sideways
        -(2 + Math.random() * 5),            // gentle downward shove
        (Math.random() - 0.5) * 3
      );
      const offCenter = new CANNON.Vec3(
        (Math.random() - 0.5) * CONFIG.dieRadius,
        (Math.random() - 0.5) * CONFIG.dieRadius,
        (Math.random() - 0.5) * CONFIG.dieRadius
      );
      b.applyImpulse(impulse, b.position.vadd(offCenter));
      // extra random tumble so the roll always reads as a roll
      b.angularVelocity.x += (Math.random() - 0.5) * 12;
      b.angularVelocity.y += (Math.random() - 0.5) * 12;
      b.angularVelocity.z += (Math.random() - 0.5) * 12;
    });
  }

  function settleQuietly() { // prefers-reduced-motion: no tumbling intro
    syncBounds();
    dice.forEach((d, i) => {
      d.body.position.set(
        (-(dice.length - 1) / 2 + i) * CONFIG.dieRadius * 2.6,
        floorY + CONFIG.dieRadius * 1.05, 0
      );
      d.body.velocity.set(0, 0, 0);
      d.body.angularVelocity.set(0, 0, 0);
    });
  }

  function rollOnTable() {          // NEW_BEHAVIOR intro: skitter across the table
    syncBounds();
    dice.forEach((d) => {
      const b = d.body; b.wakeUp();
      // spawn in the LEFT-TOP third of the viewport so the die is less likely to
      // sit over content; a gentler skitter keeps it roughly in that corner
      b.position.set(
        -worldW / 3 + (Math.random() - 0.5) * worldW * 0.1,
        worldH / 3 + (Math.random() - 0.5) * worldH * 0.1,
        CONFIG.liftZ * 0.5                         // start a bit raised, then drop & roll
      );
      b.quaternion.setFromAxisAngle(
        new CANNON.Vec3(Math.random(), Math.random(), Math.random()).unit(),
        Math.random() * Math.PI * 2
      );
      b.velocity.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, 0);
      b.angularVelocity.set(
        (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14
      );
    });
  }

  function settleOnTable() {        // NEW_BEHAVIOR reduced-motion: rest quietly on the table
    syncBounds();
    dice.forEach((d, i) => {
      d.body.position.set(
        -worldW / 3 + (-(dice.length - 1) / 2 + i) * CONFIG.dieRadius * 2.6,   // left-top third
        worldH / 3,
        CONFIG.tableZ + CONFIG.dieRadius
      );
      d.body.velocity.set(0, 0, 0);
      d.body.angularVelocity.set(0, 0, 0);
    });
  }

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
        const m = CONFIG.dieRadius;
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
        b.velocity.set(v.x * scale, v.y * scale, 0);   // gravity settles it back onto the table
        const spin = Math.min(sp * scale * 0.3, 14);
        b.angularVelocity.set(
          (Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin
        );
      } else {
        b.velocity.set(v.x, v.y, v.z * 0.3);
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
    // when the docked action bar re-sticks to the viewport bottom (scrolling up
    // from the page end) the floor drops — wake sleeping dice so they fall to it
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
  /* ---------- pouch: hold 3s to spawn a die; 3 fills => MULTIBALL ---------- */
  const pouchBtn = document.getElementById('dice-pouch');
  const pouchFill = document.getElementById('pouch-fill');
  const resetBtn = document.getElementById('dice-reset');
  const multiballEl = document.getElementById('multiball');
  const FILL_SECONDS = 1;
  let holding = false;
  let progress = 0;        // 0..1, drains at the same speed when released
  let fillsDone = 0;       // completed holds since last reset
  let progressRaf = null;
  let lastPT = 0;
  let sparkTimer = null;
  let multiballTimer = null;

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

  function spawnOneDie() {
    // revive a hidden default die first; then mint fresh extras
    let d = dice.find(x => !x.mesh.visible && !x.shrinking);
    if (d) {
      world.addBody(d.body);
      d.mesh.visible = true;
    } else {
      d = addDie();
      d.extra = true;
    }
    dropIn(d);
    return d;
  }

  function hideMultiball() {
    if (!multiballEl) return;
    clearTimeout(multiballTimer);
    multiballEl.classList.remove('is-on');
    multiballEl.hidden = true;
  }
  function triggerMultiball() {
    if (multiballEl) {
      multiballEl.hidden = false;
      // restart the CSS animation even if it was shown before
      void multiballEl.offsetWidth;
      multiballEl.classList.add('is-on');
      clearTimeout(multiballTimer);
      multiballTimer = setTimeout(hideMultiball, 4200);
    }
    for (let i = 0; i < 5; i++) setTimeout(spawnOneDie, i * 140);
  }

  function setFill(p) {
    if (pouchFill) pouchFill.style.height = (p * 100).toFixed(1) + '%';
  }
  function progressTick(now) {
    const pdt = Math.min((now - lastPT) / 1000, 0.1);
    lastPT = now;
    if (holding) {
      progress += pdt / FILL_SECONDS;   // 1s per extra die
      if (progress >= 1) {
        progress = 0;                 // the background resets
        fillsDone++;
        spawnOneDie();                // ...and if still held, fills again
        if (fillsDone === 3) triggerMultiball();
      }
    } else {
      progress = Math.max(0, progress - pdt / FILL_SECONDS);
    }
    setFill(progress);
    if (holding || progress > 0) progressRaf = requestAnimationFrame(progressTick);
    else progressRaf = null;
  }
  function ensureProgressLoop() {
    if (progressRaf === null) {
      lastPT = performance.now();
      progressRaf = requestAnimationFrame(progressTick);
    }
  }

  function spawnSpark() {
    const s = document.createElement('span');
    s.className = 'pouch-spark';
    const ang = Math.random() * Math.PI * 2;
    const dist = 26 + Math.random() * 34;
    s.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(1) + 'px');
    s.style.setProperty('--dy', (Math.sin(ang) * dist - 14).toFixed(1) + 'px');
    s.style.left = (50 + (Math.random() - 0.5) * 40) + '%';
    s.style.top = (50 + (Math.random() - 0.5) * 40) + '%';
    pouchBtn.parentElement.appendChild(s);
    s.addEventListener('animationend', function () { s.remove(); });
  }

  if (pouchBtn) {
    pouchBtn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    pouchBtn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      holding = true;
      try { pouchBtn.setPointerCapture(e.pointerId); } catch (err) {}
      ensureProgressLoop();
      if (!reducedMotion) {
        clearInterval(sparkTimer);
        sparkTimer = setInterval(spawnSpark, 70);   // golden particles while held
      }
    });
    const release = function () {
      if (!holding) return;
      holding = false;
      clearInterval(sparkTimer);
      ensureProgressLoop();                          // keep draining
    };
    pouchBtn.addEventListener('pointerup', release);
    pouchBtn.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
  }

  /* ---------- reset: shrink-to-zero, destroy extras, kill the sign ---------- */
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
    holding = false;
    clearInterval(sparkTimer);
    progress = 0; setFill(0);
    fillsDone = 0;
    hideMultiball();
  }
  if (resetBtn) resetBtn.addEventListener('click', resetDice);

  layout();
  window.addEventListener('resize', layout);
  if (NEW) { syncBounds(); if (reducedMotion) settleOnTable(); else rollOnTable(); }
  else     { if (reducedMotion) settleQuietly(); else rollFromTop(); }
  requestAnimationFrame(tick);

  // tiny public API
  window.diceOverlay = { roll: NEW ? rollOnTable : rollFromTop, spawnOne: spawnOneDie, reset: resetDice, multiball: triggerMultiball, dice, world, config: CONFIG };
})();
});
