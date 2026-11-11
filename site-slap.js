/*! site-slap v1.1.0 | MIT License | https://github.com/Mupran/site-slap */
// A two-player stick-figure slap game that wrecks the page it is installed on.
// One file, no dependencies. Drop it in with a <script> tag.
(function (global) {
  'use strict';
  if (typeof document === 'undefined') { if (typeof module === 'object' && module.exports) module.exports = {}; return; }

  const script = document.currentScript;
  const DEFAULTS = {
    colors: ['#2ee88f', '#ff7a45'],
    names: ['Player 1', 'Player 2'],
    computer: false,          // start against the computer instead of a second player
    launcherText: 'Slap this site',
    position: 'right',        // launcher corner: 'right' or 'left'
    target: null,             // element to mount inline; omit for a floating launcher
  };
  const INK = '#121311', PAPER = '#ecebe4', ROPE = '#77786f';
  const W = 960, H = 540, FLOOR = 440, HOME = [380, 580];
  // Power thresholds: pat, ropes, out of the ring, across the page, the header, through the site.
  const T = [0.2, 0.4, 0.55, 0.7, 0.82];
  const BOMB = 0.985; // the meter held completely full
  const TIERS = ['a pat', 'the ropes', 'out of the ring', 'across the page', 'into the header', 'through the website', 'a bomb'];
  const TOP = 2147483000;
  const NS = 'http://www.w3.org/2000/svg';
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeIn = (t) => t * t * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const back = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
  const tierOf = (p) => { if (p >= BOMB) return 6; const n = T.findIndex((t) => p < t); return n < 0 ? 5 : n; };

  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
    .launch, .fix { position: fixed; bottom: 18px; z-index: ${TOP + 3}; padding: 12px 18px; border-radius: 999px; background: ${INK}; color: ${PAPER}; border: 1px solid ${PAPER}; font-weight: 700; font-size: 15px; box-shadow: 0 14px 30px -12px rgba(0,0,0,.6); transition: transform .16s ease-out; }
    .launch:active, .fix:active { transform: scale(.97); }
    .launch.right, .fix.left { right: 18px; } .launch.left, .fix.right { left: 18px; }
    .panel { color: ${PAPER}; background: ${INK}; text-align: center; line-height: 1.45; }
    .panel.float { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); width: min(720px, calc(100vw - 20px)); max-height: calc(100vh - 28px); overflow: auto; z-index: ${TOP + 2}; padding: 14px; border: 1px solid #34352f; border-radius: 22px; box-shadow: 0 30px 70px -20px rgba(0,0,0,.75); }
    .panel.inline { padding: 22px 18px; border-radius: 22px; }
    .start { display: inline-flex; align-items: center; gap: 10px; padding: 15px 28px; border-radius: 999px; background: ${PAPER}; color: ${INK}; font-weight: 800; font-size: 18px; }
    canvas { display: block; width: 100%; aspect-ratio: 16 / 9; border: 1px solid #34352f; border-radius: 16px; background: #0b0c0a; touch-action: pan-y; }
    .status { margin: 12px 0 0; min-height: 1.5em; font-weight: 700; font-size: 16px; }
    .row { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 12px; }
    .slap { --p: 0; position: relative; overflow: hidden; flex: 1 1 220px; height: 60px; padding: 0 22px; border: 1px solid #34352f; border-radius: 999px; font-weight: 800; font-size: 16px; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; transition: transform .16s ease-out, opacity .2s ease, border-color .2s ease; }
    .slap.turn { border-color: var(--mc); }
    .slap::before { content: ''; position: absolute; inset: 0; background: var(--mc); transform-origin: 0 50%; transform: scaleX(var(--p)); }
    .slap::after { content: ''; position: absolute; inset: 0; pointer-events: none; mix-blend-mode: difference; opacity: .45; background: ${T.map((t) => `linear-gradient(#fff,#fff) ${t * 100}% 50% / 1px 34% no-repeat`).join(',')}; }
    .slap span { position: relative; z-index: 1; color: #fff; mix-blend-mode: difference; }
    .slap:disabled { cursor: default; opacity: .45; } .slap.turn:disabled { opacity: .8; }
    .slap.max { animation: jit 90ms linear infinite; }
    .slap.armed::before { background: #ff3b30; animation: armed 240ms linear infinite alternate; }
    @keyframes armed { from { filter: brightness(1); } to { filter: brightness(1.5); } }
    .narrow { display: none; }
    @media (max-width: 560px) {
      .wide { display: none; } .narrow { display: inline; }
      .row { gap: 8px; } .slap { flex: 1 1 0; min-width: 0; height: 56px; padding: 0 8px; font-size: 14px; }
      .slap::after { display: none; } .opt { padding: 8px 13px; font-size: 13px; } .status { font-size: 15px; min-height: 3em; }
    }
    @keyframes jit { 0% { translate: -2px 1px; } 50% { translate: 2px -1px; } 100% { translate: -1px -2px; } }
    .opt { padding: 9px 15px; border: 1px solid #34352f; border-radius: 999px; font-size: 14px; font-weight: 600; }
    .opt:hover { background: ${PAPER}; color: ${INK}; } .opt:disabled { opacity: .5; cursor: default; }
    .hint { margin: 12px auto 0; max-width: 60ch; font-size: 13px; color: #a9a89f; }
    .hint a { color: inherit; }
    [hidden] { display: none !important; }
  `;

  function create(options) {
    const opts = Object.assign({}, DEFAULTS, options);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const COLORS = opts.colors, NAMES = opts.names;
    const inline = !!opts.target;
    const family = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';

    /* ---------- interface, kept in a shadow root so the host page cannot restyle it ---------- */
    const host = document.createElement('div');
    host.setAttribute('data-site-slap-host', '');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${CSS} .launch, .fix, .panel { font-family: ${family.replace(/"/g, "'")}; }</style>
      ${inline ? '' : `<button type="button" class="launch ${opts.position === 'left' ? 'left' : 'right'}">${opts.launcherText}</button>`}
      <div class="panel ${inline ? 'inline' : 'float'}" style="font-family:${family.replace(/"/g, "'")}" ${inline ? '' : 'hidden'}>
        ${inline ? '<button type="button" class="start">&#9654; Play</button>' : ''}
        <div class="arena" ${inline ? 'hidden' : ''}>
          <canvas aria-label="A boxing ring with two stick figures facing each other"></canvas>
          <p class="status" aria-live="polite"></p>
          <div class="row">
            <button type="button" class="slap" style="--mc:${COLORS[0]}"><span></span></button>
            <button type="button" class="slap" style="--mc:${COLORS[1]}"><span></span></button>
          </div>
          <div class="row">
            <button type="button" class="opt mode">Play the computer instead</button>
            <button type="button" class="opt repair" hidden>Repair the website</button>
            <button type="button" class="opt quit">${inline ? 'Stop playing' : 'Close'}</button>
          </div>
          <p class="hint"><span class="wide">Take turns holding your button, or use the A and L keys. The longer you hold, the further they go. Fill the meter completely to arm a bomb. </span><span class="narrow">Take turns. Hold longer to hit harder. A full meter arms a bomb. </span><a href="https://github.com/Mupran/site-slap" target="_blank" rel="noopener">site-slap</a></p>
        </div>
      </div>
      <button type="button" class="fix ${opts.position === 'left' ? 'left' : 'right'}" hidden>Repair the website</button>`;
    (inline ? opts.target : document.body).appendChild(host);
    const $ = (s) => shadow.querySelector(s);
    const panel = $('.panel'), arena = $('.arena'), cv = $('canvas'), ctx = cv.getContext('2d');
    const btns = [...shadow.querySelectorAll('.slap')], labels = btns.map((b) => b.querySelector('span'));
    const statusEl = $('.status'), modeBtn = $('.mode'), fixBtn = $('.repair'), quitBtn = $('.quit'), pill = $('.fix');
    const launch = $('.launch'), startBtn = $('.start');

    const mk = (i) => ({ i, x: HOME[i], y: FLOOR, dir: i ? -1 : 1, color: COLORS[i], lean: 0, head: 0, arm: 0.3, elbow: 0.4, rot: 0, sy: 1, ko: 0, mark: 0, out: false, phase: rand(0, 6), shake: 0 });
    const men = [mk(0), mk(1)];
    const cam = { z: 1, x: W / 2, y: H / 2, shake: 0, rot: 0 };
    let rings = [], bursts = [], flash = 0;
    const rope = { left: 0, right: 0 };
    let parts = [], words = [];
    let state = 'off', turn = 0, cpu = !!opts.computer, lastTier = -1, damaged = false;
    let power = 0, holdStart = 0, timeScale = 1, gt = 0, rt = 0, last = 0, running = false;
    const tweens = new Set();

    const tween = (o, to, dur, ease = easeOut, real = false) => new Promise((res) => {
      const from = {};
      for (const k in to) from[k] = o[k];
      tweens.add({ o, from, to, t0: real ? rt : gt, dur, ease, real, res });
    });
    const sleep = (s, real = false) => tween({}, {}, s, easeOut, real);
    const say = (text) => { statusEl.textContent = text; };

    /* ---------- drawing ---------- */
    const pol = (a, len) => [Math.sin(a) * len, Math.cos(a) * len];
    function joints(f) {
      const L = f.lean + Math.sin(gt * 2.4 + f.phase) * 0.018 + (f.shake ? rand(-f.shake, f.shake) : 0);
      const hip = [0, -82];
      const sh = [hip[0] + Math.sin(L) * 72, hip[1] - Math.cos(L) * 72];
      const hd = [sh[0] + Math.sin(L + f.head) * 27, sh[1] - Math.cos(L + f.head) * 27];
      const e1 = pol(f.arm, 42), h1 = pol(f.arm + f.elbow, 40);
      const elbow = [sh[0] + e1[0], sh[1] + e1[1]];
      return { L, hip, sh, hd, elbow, hand: [elbow[0] + h1[0], elbow[1] + h1[1]] };
    }
    function drawMan(g, f, scale = 1, outline = false) {
      const j = joints(f);
      g.save();
      g.translate(f.x, f.y); g.scale(scale, scale);
      g.translate(0, -95); g.rotate(f.rot); g.translate(0, 95);
      g.scale(f.dir, f.sy);
      g.lineCap = 'round'; g.lineJoin = 'round';
      const body = () => {
        g.beginPath();
        g.moveTo(-20, 0); g.lineTo(-6, -42); g.lineTo(...j.hip); g.lineTo(8, -40); g.lineTo(20, 0);
        g.moveTo(...j.hip); g.lineTo(...j.sh);
        const b1 = pol(-0.3 - j.L * 0.4, 40), b2 = pol(-0.1 - j.L * 0.4, 38);
        g.moveTo(...j.sh); g.lineTo(j.sh[0] + b1[0], j.sh[1] + b1[1]); g.lineTo(j.sh[0] + b1[0] + b2[0], j.sh[1] + b1[1] + b2[1]);
        g.moveTo(...j.sh); g.lineTo(...j.elbow); g.lineTo(...j.hand);
        g.stroke();
        g.beginPath(); g.arc(j.hd[0], j.hd[1], 22, 0, 7); g.stroke();
        g.beginPath(); g.arc(j.hand[0], j.hand[1], 6, 0, 7); g.fill();
        if (f.bomb && !outlineOnly) {
          const bx = j.hand[0] + 6, by = j.hand[1] - 12;
          g.save();
          g.fillStyle = '#0b0c0a'; g.strokeStyle = PAPER; g.lineWidth = 3;
          g.beginPath(); g.arc(bx, by, 15, 0, 7); g.fill(); g.stroke();
          g.beginPath(); g.moveTo(bx + 8, by - 13); g.quadraticCurveTo(bx + 18, by - 26, bx + 12, by - 32); g.stroke();
          g.fillStyle = Math.floor(performance.now() / 70) % 2 ? '#ffd84a' : '#ff7a45';
          g.beginPath(); g.arc(bx + 12, by - 33, 5 + Math.random() * 3, 0, 7); g.fill();
          g.restore();
        }
      };
      let outlineOnly = true;
      if (outline) { g.strokeStyle = INK; g.fillStyle = INK; g.lineWidth = 13; body(); }
      outlineOnly = false;
      g.strokeStyle = f.color; g.fillStyle = f.color; g.lineWidth = 7; body();
      g.save();
      g.translate(j.hd[0], j.hd[1]); g.rotate(j.L + f.head); g.lineWidth = 3;
      if (f.ko > 0.3) {
        g.beginPath(); g.moveTo(4, -8); g.lineTo(12, 0); g.moveTo(12, -8); g.lineTo(4, 0); g.stroke();
        g.beginPath(); g.arc(9, 9, 4, 0, 7); g.stroke();
      } else {
        g.beginPath(); g.arc(9, -4, 2.4, 0, 7); g.fill();
        g.beginPath(); g.moveTo(5, 8); g.lineTo(14, 7); g.stroke();
      }
      if (f.dizzy > 0) {
        g.fillStyle = '#ffd84a';
        for (let n = 0; n < 3; n++) {
          const a = performance.now() / 160 + n * 2.09, sx = Math.cos(a) * 30, sy2 = -34 + Math.sin(a) * 7;
          g.beginPath();
          for (let k = 0; k < 8; k++) { const r = k % 2 ? 2.4 : 6.5, t = k * Math.PI / 4; g.lineTo(sx + Math.cos(t) * r, sy2 + Math.sin(t) * r); }
          g.fill();
        }
        g.fillStyle = f.color;
      }
      if (f.mark > 0.02) {
        g.globalAlpha = Math.min(1, f.mark); g.strokeStyle = COLORS[1 - f.i]; g.lineWidth = 3.5;
        g.beginPath();
        for (let n = 0; n < 4; n++) { g.moveTo(-4 + n * 5, 3); g.lineTo(-7 + n * 5, 14); }
        g.stroke();
      }
      g.restore(); g.restore();
    }
    function drawRing() {
      ctx.lineCap = 'round'; ctx.strokeStyle = ROPE; ctx.lineWidth = 3;
      [250, 305, 360].forEach((y, n) => {
        ctx.beginPath(); ctx.moveTo(120, y);
        ctx.bezierCurveTo(120 - rope.left * (1 - n * 0.2), y + 10, 300, y + 6, 480, y + 5);
        ctx.bezierCurveTo(660, y + 6, 840 + rope.right * (1 - n * 0.2), y + 10, 840, y);
        ctx.stroke();
      });
      ctx.strokeStyle = PAPER; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(120, FLOOR); ctx.lineTo(120, 222); ctx.moveTo(840, FLOOR); ctx.lineTo(840, 222); ctx.stroke();
      ctx.fillStyle = COLORS[0]; ctx.beginPath(); ctx.arc(120, 218, 9, 0, 7); ctx.fill();
      ctx.fillStyle = COLORS[1]; ctx.beginPath(); ctx.arc(840, 218, 9, 0, 7); ctx.fill();
      ctx.strokeStyle = PAPER; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(70, FLOOR + 3); ctx.lineTo(890, FLOOR + 3); ctx.stroke();
      ctx.strokeStyle = ROPE; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(86, FLOOR + 3); ctx.lineTo(86, FLOOR + 44); ctx.lineTo(874, FLOOR + 44); ctx.lineTo(874, FLOOR + 3); ctx.stroke();
    }
    function render() {
      const k = cv.width / W;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      const sx = cam.shake ? rand(-cam.shake, cam.shake) : 0, sy = cam.shake ? rand(-cam.shake, cam.shake) : 0;
      ctx.translate(W / 2 + sx, H / 2 + sy); ctx.rotate(cam.rot); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
      drawRing();
      men.forEach((f) => { if (!f.out) drawMan(ctx, f); });
      parts.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); });
      ctx.globalAlpha = 1;
      rings.forEach((r) => { ctx.globalAlpha = Math.max(0, r.life); ctx.strokeStyle = r.color; ctx.lineWidth = 2 + 10 * r.life; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 7); ctx.stroke(); });
      bursts.forEach((b) => {
        ctx.globalAlpha = Math.max(0, b.life); ctx.strokeStyle = b.color; ctx.lineWidth = 5; ctx.lineCap = 'round';
        const r0 = 34 + (1 - b.life) * 70, r1 = r0 + 26 + 60 * b.life;
        ctx.beginPath(); ctx.moveTo(b.x + Math.cos(b.a) * r0, b.y + Math.sin(b.a) * r0); ctx.lineTo(b.x + Math.cos(b.a) * r1, b.y + Math.sin(b.a) * r1); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      words.forEach((w) => {
        ctx.save();
        ctx.translate(w.x, w.y); ctx.rotate(w.rot); ctx.scale(w.s, w.s);
        ctx.globalAlpha = Math.min(1, w.life * 2);
        ctx.font = `800 64px ${family}`; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
        ctx.lineWidth = 10; ctx.strokeStyle = INK; ctx.strokeText(w.text, 0, 0);
        ctx.fillStyle = w.color; ctx.fillText(w.text, 0, 0);
        ctx.restore();
      });
      ctx.restore();
      if (flash > 0.01) { ctx.globalAlpha = Math.min(1, flash); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    }
    const pose = (f, p) => { f.arm = 0.3 - 2.5 * p; f.elbow = 0.4 + 0.6 * p; f.lean = -0.28 * p; f.shake = p > 0.6 ? (p - 0.6) * 0.09 : 0; };
    function frame(now) {
      if (!running) return;
      const dtReal = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      const dt = dtReal * timeScale;
      rt += dtReal; gt += dt;
      tweens.forEach((t) => {
        const p = Math.min(1, ((t.real ? rt : gt) - t.t0) / (t.dur || 0.0001));
        for (const k in t.to) t.o[k] = t.from[k] + (t.to[k] - t.from[k]) * t.ease(p);
        if (p >= 1) { tweens.delete(t); t.res(); }
      });
      if (state === 'charging') {
        power = Math.min(1, (performance.now() - holdStart) / 4200);
        men[turn].bomb = power >= BOMB;
        btns[turn].classList.toggle('armed', power >= BOMB);
        if (power >= BOMB) labels[turn].textContent = 'Bomb armed. Release!';
        pose(men[turn], power);
        btns[turn].style.setProperty('--p', power);
        btns[turn].classList.toggle('max', power >= T[3]);
        const tier = tierOf(power);
        if (tier !== lastTier) { lastTier = tier; say(`Charging: ${TIERS[tier]}.`); }
      }
      parts.forEach((p) => { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.1; });
      parts = parts.filter((p) => p.life > 0);
      rings.forEach((r) => { r.r += r.v * dtReal; r.life -= dtReal * 1.6; });
      rings = rings.filter((r) => r.life > 0);
      bursts.forEach((b) => { b.life -= dtReal * 2.2; });
      bursts = bursts.filter((b) => b.life > 0);
      flash *= Math.pow(0.0008, dtReal);
      men.forEach((f) => { if (f.dizzy > 0) f.dizzy -= dtReal; });
      words.forEach((w) => { w.life -= dtReal * 0.55; w.s += (1 - w.s) * 0.2; });
      words = words.filter((w) => w.life > 0);
      men.forEach((f) => { f.mark = Math.max(0, f.mark - dtReal * 0.05); });
      cam.shake *= 0.86;
      render();
      requestAnimationFrame(frame);
    }

    /* ---------- one slap ---------- */
    async function slap(A, V, p) {
      A.shake = 0;
      if (p >= T[2] && !reduce) {
        // A hop and a full spin to load the swing.
        tween(A, { y: FLOOR - 54 }, 0.16, easeOut).then(() => tween(A, { y: FLOOR }, 0.2, easeIn));
        await tween(A, { rot: A.dir * Math.PI * 2, arm: -2.4 - 0.4 * p, lean: -0.2 - 0.2 * p, elbow: 1 }, 0.34, easeInOut);
        A.rot = 0;
      } else {
        await tween(A, { arm: -2.4 - 0.4 * p, lean: -0.2 - 0.2 * p, elbow: 1 }, 0.14);
      }
      for (let n = 0; n < 6 + 10 * p; n++) parts.push({ x: A.x + A.dir * rand(-10, 40), y: FLOOR - rand(90, 200), vx: A.dir * rand(300, 900), vy: rand(-40, 40), r: rand(1, 2.5), life: rand(0.15, 0.35), color: PAPER });
      await tween(A, { arm: 1.72, elbow: 0.05, lean: 0.34 + 0.2 * p, x: A.x + A.dir * 82 }, 0.1, easeIn);
      const hx = V.x + V.dir * 4, hy = FLOOR - 185;
      V.mark = 1; V.ko = 1; A.bomb = false;
      cam.shake = 6 + 16 * p;
      flash = 0.25 + 0.6 * p;
      rings.push({ x: hx, y: hy, r: 16, v: 380 + 500 * p, life: 1, color: PAPER }, { x: hx, y: hy, r: 6, v: 220 + 300 * p, life: 1, color: A.color });
      for (let n = 0; n < 7 + Math.round(7 * p); n++) bursts.push({ x: hx, y: hy, a: (n / (7 + Math.round(7 * p))) * Math.PI * 2 + rand(-0.15, 0.15), life: 1, color: n % 2 ? PAPER : A.color });
      tween(rope, { left: 14 * p, right: 14 * p }, 0.05).then(() => { tween(rope, { left: 0, right: 0 }, 0.6, back); });
      if (!reduce && p >= T[0]) { timeScale = 0; await sleep(0.06 + 0.07 * p, true); } // hit-stop
      words.push({ text: p < T[0] ? 'pat.' : p < T[1] ? 'SLAP' : p < T[4] ? pick(['WHAM', 'THWACK', 'KAPOW']) : 'OBLITERATED', x: hx, y: hy - 58, rot: rand(-0.2, 0.1), s: 0.3, life: 1, color: A.color });
      for (let n = 0; n < 10 + 26 * p; n++) parts.push({ x: hx, y: hy, vx: -V.dir * rand(60, 520) * (0.4 + p), vy: rand(-420, 120), r: rand(1.5, 4), life: rand(0.5, 1.1), color: n % 3 ? PAPER : A.color });
      if (!reduce) { timeScale = 0.07; tween(cam, { z: 1.45 + 0.55 * p, x: hx, y: hy + 20, rot: -V.dir * 0.07 * p }, 0.22, easeOut, true); }
      tween(V, { head: -(0.5 + 1.1 * p), lean: -(0.2 + 0.45 * p) }, 0.07);
      tween(A, { arm: 2.4, lean: 0.5 + 0.1 * p }, 0.08);
      await sleep(reduce ? 0.25 : 0.7 + 0.6 * p, true);
      timeScale = 1;
      tween(cam, { z: 1, x: W / 2, y: H / 2, rot: 0 }, 0.4, easeInOut, true);
      const recover = tween(A, { x: HOME[A.i], arm: 0.3, elbow: 0.4, lean: 0 }, 0.35, easeInOut);
      if (p < T[0]) {
        say(pick(['Barely a tickle.', 'That was a greeting, not a slap.', 'Worse things have happened in a breeze.']));
        await tween(V, { head: 0.2, lean: 0.06 }, 0.2);
        await tween(V, { head: 0, lean: 0 }, 0.25);
        V.ko = 0;
      } else if (p < T[1] || reduce) {
        say(pick(['That will leave a mark.', 'Into the ropes.', 'Felt that one.']));
        const side = V.i ? 'right' : 'left';
        tween(rope, { [side]: 60 }, 0.3);
        await tween(V, { x: V.i ? 800 : 160, lean: -0.5, head: -0.6, rot: -V.dir * Math.PI * 2 }, 0.34);
        V.rot = 0; V.dizzy = 1.6;
        tween(rope, { [side]: 0 }, 0.5, back);
        await tween(V, { x: HOME[V.i], lean: 0.2, head: 0.3 }, 0.42, easeOut);
        await tween(V, { lean: 0, head: 0 }, 0.3);
        await sleep(0.3);
        V.ko = 0;
      } else {
        await fly(V, p);
      }
      await recover;
    }

    /* ---------- finding something on the host page to land on ---------- */
    const ours = (el) => el === host || host.contains(el) || el.contains(host) || el.hasAttribute('data-site-slap');
    function blocks() {
      const seen = new Set();
      document.querySelectorAll('main > *, section, article, body > *').forEach((el) => {
        if (ours(el) || /^(SCRIPT|STYLE|LINK|TEMPLATE|NOSCRIPT)$/.test(el.tagName)) return;
        const r = el.getBoundingClientRect();
        if (r.height < 120 || r.width < 200) return;
        seen.add(el);
      });
      // Prefer inner blocks: drop any block that merely wraps other candidates.
      return [...seen].filter((el) => ![...seen].some((o) => o !== el && el.contains(o)));
    }
    const pointIn = (el) => { const r = el.getBoundingClientRect(); return { el, x: r.left + scrollX + r.width * rand(0.25, 0.75), y: r.top + scrollY + Math.min(r.height * rand(0.3, 0.6), 420) }; };
    function target(V, p) {
      const ring = cv.getBoundingClientRect(), ringY = ring.top + scrollY + ring.height / 2;
      const list = blocks().map((el) => { const r = el.getBoundingClientRect(); return { el, d: Math.abs(r.top + scrollY + r.height / 2 - ringY) }; }).sort((a, b) => a.d - b.d);
      const anywhere = { el: null, x: innerWidth * rand(0.3, 0.7), y: Math.max(60, scrollY - innerHeight * rand(0.2, 0.8)) };
      if (p >= BOMB) {
        // The bomb takes out a whole block: the biggest few candidates, picked at random.
        const big = list.map((b) => b.el).sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height).slice(0, 4);
        if (big.length) {
          const el = pick(big), r = el.getBoundingClientRect();
          return { el, bomb: true, x: r.left + scrollX + r.width * rand(0.4, 0.6), y: r.top + scrollY + Math.min(r.height * 0.45, innerHeight * 0.6), line: pick(['Section removed.', 'That section is closed for repairs.', 'It was like that when I got here.']) };
        }
        return { ...anywhere, el: document.body, bomb: true, line: 'Section removed.' };
      }
      if (p >= T[4]) {
        const doc = document.documentElement.scrollHeight;
        let y = doc > innerHeight * 1.5 ? doc * rand(0.3, 0.6) : scrollY + innerHeight * 0.35;
        // Keep the hole clear of the ring itself, so the game stays playable.
        const top = ring.top + scrollY - 240, bottom = ring.bottom + scrollY + 240;
        if (y > top && y < bottom) y = top > 160 ? top : Math.min(doc - 120, bottom);
        const el = list.map((b) => b.el).find((e) => { const r = e.getBoundingClientRect(); return r.top + scrollY <= y && r.bottom + scrollY >= y; }) || null;
        return { el, hole: true, x: innerWidth * rand(0.35, 0.65), y, line: pick(['Straight through the website.', 'There is nothing behind the website.']) };
      }
      if (p >= T[3]) {
        const head = [...document.querySelectorAll('header, [role="banner"], nav')].find((e) => !ours(e) && e.getBoundingClientRect().width > 100);
        const r = head ? head.getBoundingClientRect() : null;
        return { el: head || (list[list.length - 1] || {}).el || null, header: true, x: innerWidth * rand(0.3, 0.7), y: r ? r.top + scrollY + r.height / 2 : 40, line: pick(['There goes the header.', 'Navigation is now optional.']) };
      }
      if (p >= T[2]) {
        const far = list.slice(Math.floor(list.length / 2));
        return far.length ? { ...pointIn(pick(far).el), line: pick(['Mind the content.', 'That section had a family.']) } : { ...anywhere, line: 'Off the page.' };
      }
      if (V.i === 1) {
        const near = list.slice(0, 3);
        return near.length ? { ...pointIn(pick(near).el), line: pick(['Sorry about that section.', 'It was a nice paragraph.']) } : { ...anywhere, line: 'Off the page.' };
      }
      return { el: null, edge: true, x: scrollX + 6, y: ring.top + scrollY + ring.height * 0.45, line: pick(['That was the wall.', 'The edge of the internet.']) };
    }

    /* ---------- leaving the ring ---------- */
    let overlay, octx;
    async function fly(V, p) {
      if (!overlay) {
        overlay = document.createElement('canvas');
        overlay.setAttribute('data-site-slap', '');
        overlay.style.cssText = `position:fixed;inset:0;width:100vw;height:100vh;z-index:${TOP + 4};pointer-events:none`;
        document.body.appendChild(overlay);
        octx = overlay.getContext('2d');
      }
      const r = cv.getBoundingClientRect(), k = r.width / W;
      const start = { x: r.left + scrollX + V.x * k, y: r.top + scrollY + (V.y - 95) * k };
      const tg = target(V, p);
      const flyer = { ...V, x: 0, y: 95, lean: -0.4, head: -0.7, arm: -2.6, elbow: 0.2, rot: 0, ko: 1, mark: 1, bomb: !!tg.bomb, dizzy: 0 };
      let blast = 0, blastAt = null;
      const size = Math.max(0.62, k * 1.05);
      let zoom = 1, eyes = false, growing = false, debris = [], caption = null;
      V.out = true;
      say(`${NAMES[V.i]} has left the ring.`);
      const html = document.documentElement, prevScroll = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';
      const dpr = Math.min(2, devicePixelRatio || 1);
      overlay.width = innerWidth * dpr; overlay.height = innerHeight * dpr;

      const paint = (x, y, trail) => {
        octx.setTransform(dpr, 0, 0, dpr, 0, 0);
        octx.clearRect(0, 0, innerWidth, innerHeight);
        if (trail) {
          octx.strokeStyle = V.color; octx.lineCap = 'round';
          trail.forEach(([tx, ty], n) => { if (!n) return; octx.globalAlpha = n / trail.length * 0.5; octx.lineWidth = n * 1.2; octx.beginPath(); octx.moveTo(trail[n - 1][0] - scrollX, trail[n - 1][1] - scrollY); octx.lineTo(tx - scrollX, ty - scrollY); octx.stroke(); });
          octx.globalAlpha = 1;
        }
        debris.forEach((d) => { octx.globalAlpha = Math.max(0, d.life); octx.fillStyle = d.color; octx.save(); octx.translate(d.x - scrollX, d.y - scrollY); octx.rotate(d.rot); octx.fillRect(-d.r, -d.r, d.r * 2, d.r * 1.4); octx.restore(); });
        octx.globalAlpha = 1;
        if (zoom > 0.02) { octx.save(); octx.translate(x - scrollX, y - scrollY); drawMan(octx, flyer, size * zoom, true); octx.restore(); }
        if (blast) {
          const u = (performance.now() - blast) / 1000, bx = blastAt.x - scrollX, by = blastAt.y - scrollY, big = Math.max(innerWidth, innerHeight);
          if (u < 1.1) {
            const a = Math.max(0, 1 - u / 1.1);
            [['#ff7a45', 0.75], ['#ffd84a', 0.5], [PAPER, 0.26]].forEach(([c, k]) => { octx.globalAlpha = a; octx.fillStyle = c; octx.beginPath(); octx.arc(bx, by, (60 + easeOut(Math.min(1, u / 0.7)) * big * 0.55) * k, 0, 7); octx.fill(); });
            octx.globalAlpha = a; octx.strokeStyle = PAPER; octx.lineWidth = 10 * a + 2;
            octx.beginPath(); octx.arc(bx, by, 40 + u * big * 1.1, 0, 7); octx.stroke();
            octx.globalAlpha = Math.max(0, 0.95 - u * 4); octx.fillStyle = '#fff'; octx.fillRect(0, 0, innerWidth, innerHeight);
            octx.globalAlpha = 1;
          }
        }
        if (eyes && Math.floor(performance.now() / 160) % 9) { octx.fillStyle = PAPER; [-9, 9].forEach((dx) => { octx.beginPath(); octx.arc(x - scrollX + dx, y - scrollY, 3.2, 0, 7); octx.fill(); }); }
        if (caption) {
          const px = Math.min(40, innerWidth * 0.06);
          octx.font = `800 ${Math.round(px)}px ${family}`;
          const wide = octx.measureText(caption.text).width;
          if (wide > innerWidth - 32) octx.font = `800 ${Math.floor(px * (innerWidth - 32) / wide)}px ${family}`;
          octx.textAlign = 'center'; octx.lineJoin = 'round';
          const half = octx.measureText(caption.text).width / 2 + 16;
          const cx = Math.min(innerWidth - half, Math.max(half, caption.x - scrollX)), cy = Math.max(70, caption.y - scrollY - 120 * size);
          octx.lineWidth = 9; octx.strokeStyle = INK; octx.strokeText(caption.text, cx, cy);
          octx.fillStyle = PAPER; octx.fillText(caption.text, cx, cy);
        }
      };
      const leg = (from, to, dur, spin, arcUp) => new Promise((res) => {
        const mid = { x: (from.x + to.x) / 2 + (to.edge ? 0 : (V.i ? 1 : -1) * Math.min(innerWidth * 0.3, 260)), y: Math.min(from.y, to.y) - arcUp };
        const t0 = performance.now(), trail = [];
        const step = (now) => {
          const u = Math.min(1, (now - t0) / dur), e = to.edge ? easeIn(u) : easeInOut(u), a = 1 - e;
          const x = a * a * from.x + 2 * a * e * mid.x + e * e * to.x;
          const y = a * a * from.y + 2 * a * e * mid.y + e * e * to.y;
          flyer.rot = spin * e * Math.PI * 2;
          if (growing) zoom = Math.min(1, 0.12 + u * 2.5);
          scrollTo(scrollX, y - innerHeight * (inline ? 0.5 : 0.35));
          trail.push([x, y]); if (trail.length > 9) trail.shift();
          paint(x, y, trail);
          if (u < 1) requestAnimationFrame(step); else res({ x, y });
        };
        requestAnimationFrame(step);
      });
      const hold = (ms, fn) => new Promise((res) => {
        const t0 = performance.now(); let prev = t0;
        const step = (now) => { fn((now - t0) / ms, (now - prev) / 1000); prev = now; if (now - t0 < ms) requestAnimationFrame(step); else res(); };
        requestAnimationFrame(step);
      });

      const dist = Math.hypot(tg.x - start.x, tg.y - start.y);
      const hit = await leg(start, tg, tg.edge ? 420 : Math.min(2300, Math.max(1100, dist * 0.9)), V.i ? 2.5 : -2.5, tg.edge ? 30 : 240);
      if (tg.bomb) {
        // He lands, the fuse runs down, then the section goes.
        flyer.rot = (V.i ? 1 : -1) * Math.PI / 2; flyer.lean = 0; flyer.head = 0.3;
        caption = { text: 'tick. tick. tick.', x: hit.x, y: hit.y };
        await hold(1000, () => paint(hit.x, hit.y + 20 * size, null));
        caption = null; flyer.bomb = false; flyer.color = '#4a4b45';
        blastAt = hit; blast = performance.now();
        for (let n = 0; n < 150; n++) debris.push({ x: hit.x + rand(-60, 60), y: hit.y + rand(-40, 40), vx: rand(-1100, 1100), vy: rand(-1500, -100), r: rand(4, 20), rot: rand(0, 6), life: rand(1.2, 2.4), color: pick([PAPER, '#ff7a45', '#ffd84a', '#3a3b36', V.color]) });
      }
      smash(tg, hit.x, hit.y, p);
      if (tg.hole) {
        await hold(480, (u) => { zoom = 1 - 0.95 * easeIn(Math.min(1, u)); flyer.rot += 0.4; paint(hit.x, hit.y, null); });
        zoom = 0; eyes = true;
      }
      for (let n = 0; n < 34; n++) debris.push({ x: hit.x, y: hit.y, vx: rand(-420, 420), vy: rand(-620, -80), r: rand(3, 9), rot: rand(0, 6), life: rand(0.7, 1.3), color: n % 4 ? PAPER : V.color });
      caption = { text: tg.line, x: hit.x, y: hit.y };
      flyer.rot = (V.i ? 1 : -1) * Math.PI / 2; flyer.lean = 0; flyer.arm = 2.6; flyer.head = 0.3;
      flyer.dizzy = 9;
      await hold(tg.bomb ? 2600 : tg.hole ? 2100 : 1500, (u, dt) => {
        debris.forEach((d) => { d.vy += 1500 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += dt * 6; d.life -= dt * 0.8; });
        paint(hit.x + (tg.edge ? 26 : 0), hit.y + (tg.hole ? 0 : 20 * size), null);
      });
      caption = null; debris = []; eyes = false; growing = !!tg.hole; blast = 0; flyer.dizzy = 0; flyer.color = V.color;
      flyer.lean = 0.2; flyer.arm = 0.6; flyer.head = 0; flyer.ko = 0;
      say(`${NAMES[V.i]} is on the way back.`);
      if (inline) host.scrollIntoView({ block: 'center' });
      const r2 = cv.getBoundingClientRect(), k2 = r2.width / W;
      const home = { x: r2.left + scrollX + HOME[V.i] * k2, y: r2.top + scrollY + (FLOOR - 95) * k2 };
      if (inline) scrollTo(scrollX, hit.y - innerHeight * 0.5);
      await leg({ ...hit, edge: false }, home, tg.edge ? 600 : Math.min(1500, Math.max(800, dist * 0.55)), V.i ? -1 : 1, 160);
      growing = false; zoom = 1;
      octx.clearRect(0, 0, innerWidth, innerHeight);
      html.style.scrollBehavior = prevScroll;
      Object.assign(V, { out: false, x: HOME[V.i], rot: 0, lean: 0, head: 0, ko: 0, sy: 0.62, dizzy: 1.8 });
      cam.shake = 8;
      await tween(V, { sy: 1 }, 0.5, back);
    }

    /* ---------- breaking the host page ---------- */
    const saved = new Map(); // element -> its inline style before we touched it
    const touch = (el) => { if (!saved.has(el)) saved.set(el, el.getAttribute('style')); };
    const SCATTER = 'h1,h2,h3,h4,h5,h6,p,li,img,button,figure,blockquote,dt,dd,td,th,pre,video,input,select,textarea,label,a,svg';
    function smash(tg, px, py, p) {
      damaged = true; fixBtn.hidden = false; pill.hidden = false;
      crack(px, py, p, tg.edge);
      if (tg.hole) hole(px, py);
      if (tg.bomb) { hole(px, py, true); blastSection(tg.el, px, py); return; }
      if (!reduce) document.body.animate(Array.from({ length: 7 }, (_, n) => ({ transform: n === 6 ? 'none' : `translate(${rand(-14, 14) * p}px, ${rand(-10, 10) * p}px)` })), { duration: 460, easing: 'ease-out' });
      if (tg.edge) return;
      if (tg.header && tg.el) {
        touch(tg.el);
        tg.el.style.transition = 'transform 800ms cubic-bezier(.3,1.5,.5,1)';
        tg.el.style.transformOrigin = `${px.toFixed(0)}px 0`;
        tg.el.style.transform = `rotate(${pick([-1, 1]) * 3.2}deg) translateY(18px)`;
        tg.el.querySelectorAll('a, button').forEach((a) => {
          touch(a);
          if (getComputedStyle(a).display === 'inline') a.style.display = 'inline-block';
          a.style.transition = `transform ${rand(600, 1000)}ms cubic-bezier(.3,1.45,.5,1)`;
          a.style.transform = `translate(${rand(-26, 26).toFixed(0)}px, ${rand(8, 70).toFixed(0)}px) rotate(${rand(-55, 55).toFixed(0)}deg)`;
        });
        return;
      }
      const scope = tg.el || document.body;
      const R = 240 + 420 * p, area = innerWidth * innerHeight * 0.6;
      const found = [];
      scope.querySelectorAll(SCATTER).forEach((n) => {
        if (saved.has(n) || ours(n) || (n.parentElement && n.parentElement.closest(SCATTER))) return;
        const r = n.getBoundingClientRect();
        if (!r.width || !r.height || r.width * r.height > area) return;
        const cx = r.left + scrollX + r.width / 2, cy = r.top + scrollY + r.height / 2, d = Math.hypot(cx - px, cy - py);
        if (d < R) found.push({ n, cx, cy, d });
      });
      found.sort((a, b) => a.d - b.d).slice(0, 120).forEach(({ n, cx, cy, d }) => {
        const k = 1 - d / R, ang = Math.atan2(cy - py, cx - px), push = k * k * (60 + 150 * p);
        let tx = Math.cos(ang) * push, ty = Math.sin(ang) * push + k * 70 * p, rot = rand(-1, 1) * 34 * k;
        const gone = k > 0.74;
        if (gone) { ty += rand(260, 520); rot *= 3; }
        touch(n);
        if (getComputedStyle(n).display === 'inline') n.style.display = 'inline-block';
        n.style.transition = gone ? `transform ${rand(700, 1100)}ms cubic-bezier(.5,0,.9,.5), opacity 500ms ease ${rand(400, 700)}ms` : `transform ${rand(600, 1000)}ms cubic-bezier(.3,1.45,.5,1)`;
        n.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;
        if (gone) n.style.opacity = '0';
      });
      const el = tg.el;
      if (el && !saved.has(el) && el.getBoundingClientRect().height < innerHeight * 2.5) {
        const r = el.getBoundingClientRect();
        touch(el);
        el.style.transition = 'transform 800ms cubic-bezier(.3,1.5,.5,1)';
        el.style.transformOrigin = `${(px - r.left - scrollX).toFixed(0)}px 50%`;
        el.style.transform = `rotate(${(pick([-1, 1]) * (0.5 + p * 0.7)).toFixed(2)}deg) translateY(${(6 + 8 * p).toFixed(0)}px)`;
      }
    }
    function svgAt(px, py, s, z, extra) {
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('data-site-slap', '');
      svg.setAttribute('viewBox', `${-s / 2} ${-s / 2} ${s} ${s}`);
      svg.style.cssText = `position:absolute;left:${px - s / 2}px;top:${py - s / 2}px;width:${s}px;height:${s}px;z-index:${z};pointer-events:none;overflow:visible;${extra}`;
      return svg;
    }
    function crack(px, py, p, edge) {
      const s = 260 + 520 * p, svg = svgAt(px, py, s, TOP, 'mix-blend-mode:difference');
      const rays = Math.round(9 + 7 * p);
      for (let n = 0; n < rays; n++) {
        let a = edge ? rand(-1.3, 1.3) : (n / rays) * Math.PI * 2 + rand(-0.2, 0.2);
        const len = s * rand(0.22, 0.5), segs = 4 + Math.floor(rand(0, 3));
        let x = 0, y = 0, d = 'M0 0';
        for (let i = 1; i <= segs; i++) {
          a += rand(-0.45, 0.45);
          x += Math.cos(a) * len / segs; y += Math.sin(a) * len / segs;
          d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
          if (i === 2 && Math.random() < 0.6) { const b = a + pick([-0.8, 0.8]); d += `M${x.toFixed(1)} ${y.toFixed(1)}L${(x + Math.cos(b) * len * 0.3).toFixed(1)} ${(y + Math.sin(b) * len * 0.3).toFixed(1)}M${x.toFixed(1)} ${y.toFixed(1)}`; }
        }
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', d); path.setAttribute('pathLength', '1');
        path.style.cssText = `fill:none;stroke:#fff;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-width:${rand(1, 2.6).toFixed(1)}`;
        svg.appendChild(path);
        if (!reduce) path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 260, delay: n * 12, easing: 'ease-out', fill: 'backwards' });
      }
      document.body.appendChild(svg);
    }
    // The bomb: everything in the block is thrown outward from the blast, in a wave.
    function blastSection(el, px, py) {
      if (!reduce) document.body.animate(Array.from({ length: 12 }, (_, n) => ({ transform: n === 11 ? 'none' : `translate(${rand(-34, 34)}px, ${rand(-26, 26)}px) rotate(${rand(-0.6, 0.6)}deg)` })), { duration: 900, easing: 'ease-out' });
      const area = innerWidth * innerHeight * 0.6;
      let count = 0;
      el.querySelectorAll(SCATTER).forEach((n) => {
        if (count > 420 || saved.has(n) || ours(n) || (n.parentElement && n.parentElement.closest(SCATTER))) return;
        const r = n.getBoundingClientRect();
        if (!r.width || !r.height || r.width * r.height > area) return;
        const cx = r.left + scrollX + r.width / 2, cy = r.top + scrollY + r.height / 2;
        const d = Math.hypot(cx - px, cy - py), ang = Math.atan2(cy - py, cx - px) + rand(-0.3, 0.3), push = rand(260, 900);
        count++;
        touch(n);
        if (getComputedStyle(n).display === 'inline') n.style.display = 'inline-block';
        const wait = Math.min(600, d * 0.35), dur = rand(900, 1500);
        n.style.transition = `transform ${dur}ms cubic-bezier(.16,.7,.35,1) ${wait}ms, opacity 500ms ease ${wait + dur * 0.55}ms`;
        n.style.transform = `translate(${(Math.cos(ang) * push).toFixed(0)}px, ${(Math.sin(ang) * push + rand(120, 620)).toFixed(0)}px) rotate(${rand(-260, 260).toFixed(0)}deg)`;
        if (Math.random() < 0.72) n.style.opacity = '0';
      });
      if (el !== document.body && !saved.has(el) && el.getBoundingClientRect().height < innerHeight * 3) {
        const r = el.getBoundingClientRect();
        touch(el);
        el.style.transition = 'transform 1100ms cubic-bezier(.3,1.5,.5,1)';
        el.style.transformOrigin = `${(px - r.left - scrollX).toFixed(0)}px 50%`;
        el.style.transform = `rotate(${pick([-1, 1]) * 2.4}deg) translateY(34px)`;
      }
    }
    function hole(px, py, crater) {
      const s = crater ? Math.min(620, innerWidth * 0.9) : Math.min(380, innerWidth * 0.72), svg = svgAt(px, py, s, TOP + 1, 'filter:drop-shadow(0 8px 14px rgba(0,0,0,.5))');
      const pts = Array.from({ length: 20 }, (_, n) => { const a = (n / 20) * Math.PI * 2, r = s * rand(0.29, 0.42); return [Math.cos(a) * r, Math.sin(a) * r]; });
      const poly = (k, fill) => { const el = document.createElementNS(NS, 'polygon'); el.setAttribute('points', pts.map(([x, y]) => `${(x * k).toFixed(1)},${(y * k + (k > 1 ? 5 : 0)).toFixed(1)}`).join(' ')); el.setAttribute('fill', fill); svg.appendChild(el); };
      poly(1.13, '#2c2d29'); poly(1, '#040504');
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('y', (s * 0.16).toFixed(0));
      t.style.cssText = 'font:500 11px ui-monospace,Menlo,monospace;fill:#77786f';
      t.textContent = crater ? 'section not found' : 'nothing back here';
      svg.appendChild(t);
      document.body.appendChild(svg);
      if (!reduce) svg.animate([{ transform: 'scale(.5)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 240, easing: 'ease-out' });
    }
    function repair() {
      document.querySelectorAll('svg[data-site-slap]').forEach((c) => c.remove());
      saved.forEach((style, el) => {
        el.style.transition = 'transform 700ms cubic-bezier(.3,1.3,.5,1), opacity 300ms ease';
        el.style.transform = 'none'; el.style.opacity = '';
        setTimeout(() => { if (style === null) el.removeAttribute('style'); else el.setAttribute('style', style); }, 760);
      });
      saved.clear();
      damaged = false; fixBtn.hidden = true; pill.hidden = true;
      if (state !== 'off') say('Good as new.');
    }

    /* ---------- turns ---------- */
    function refresh() {
      btns.forEach((b, i) => {
        const isCpu = cpu && i === 1, mine = turn === i;
        b.disabled = !((state === 'ready' && mine && !isCpu) || (state === 'charging' && mine));
        b.classList.toggle('turn', mine && state !== 'off');
        labels[i].textContent = isCpu ? 'Computer' : state === 'charging' && mine ? 'Release to slap' : `${NAMES[i]} · hold`;
      });
      modeBtn.disabled = state !== 'ready';
      modeBtn.textContent = cpu ? 'Switch to two players' : 'Play the computer instead';
    }
    const prompt = () => say(`${cpu ? (turn ? 'Computer’s' : 'Your') : NAMES[turn] + '’s'} turn. Hold to charge, release to slap.${damaged ? ' The page has seen better days.' : ''}`);
    async function act(i, p) {
      state = 'busy'; refresh();
      btns[i].classList.remove('max', 'armed');
      const name = TIERS[tierOf(p)];
      say(`${name[0].toUpperCase()}${name.slice(1)} it is.`);
      await slap(men[i], men[1 - i], p);
      btns[i].style.setProperty('--p', 0);
      turn = 1 - i;
      await sleep(0.4, true);
      if (cpu && turn === 1) {
        refresh();
        say(pick(['Computer’s turn. Brace.', 'The computer looks annoyed.', 'Here it comes.']));
        const roll = Math.random();
          const cp = roll < 0.08 ? 1 : roll < 0.45 ? rand(T[1], BOMB - 0.01) : rand(0.1, T[1]);
        const holdP = { p: 0 };
        const charge = tween(holdP, { p: cp }, 0.5 + cp * 1.6, (t) => t, true);
        const tick = () => { pose(men[1], holdP.p); men[1].bomb = holdP.p >= BOMB; btns[1].classList.toggle('armed', holdP.p >= BOMB); btns[1].style.setProperty('--p', holdP.p); if (holdP.p < cp) requestAnimationFrame(tick); };
        tick();
        await charge;
        await slap(men[1], men[0], cp);
        btns[1].style.setProperty('--p', 0); btns[1].classList.remove('armed');
        turn = 0;
      }
      state = 'ready'; refresh(); prompt();
    }
    const press = (i) => { if (state !== 'ready' || turn !== i || (cpu && i === 1)) return; state = 'charging'; holdStart = performance.now(); power = 0; lastTier = -1; refresh(); };
    const release = (i) => { if (state !== 'charging' || turn !== i) return; act(i, power); };
    btns.forEach((b, i) => {
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or lost pointer */ } press(i); });
      b.addEventListener('pointerup', () => release(i));
      b.addEventListener('pointercancel', () => release(i));
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      b.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(i); } });
      b.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); release(i); } });
    });
    const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '') || (e.target && e.target.isContentEditable);
    const keyFor = (e) => (e.key && e.key.toLowerCase() === 'a' ? 0 : e.key && e.key.toLowerCase() === 'l' ? 1 : -1);
    const onDown = (e) => { if (!running || e.repeat || e.metaKey || e.ctrlKey || typing(e) || keyFor(e) < 0) return; press(keyFor(e)); };
    const onUp = (e) => { if (running && keyFor(e) >= 0) release(keyFor(e)); };
    addEventListener('keydown', onDown); addEventListener('keyup', onUp);
    modeBtn.addEventListener('click', () => { if (state !== 'ready') return; cpu = !cpu; if (cpu) turn = 0; refresh(); prompt(); });
    fixBtn.addEventListener('click', repair); pill.addEventListener('click', repair);

    /* ---------- open and close ---------- */
    function size() {
      const dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = Math.round(cv.clientWidth * dpr);
      cv.height = Math.round(cv.clientWidth * (H / W) * dpr);
      if (overlay) { overlay.width = innerWidth * dpr; overlay.height = innerHeight * dpr; }
    }
    function open() {
      if (running) return;
      panel.hidden = false; arena.hidden = false;
      if (launch) launch.hidden = true;
      if (startBtn) startBtn.hidden = true;
      size();
      men.forEach((f, i) => Object.assign(f, mk(i)));
      state = 'ready'; running = true; last = performance.now(); turn = 0;
      refresh(); prompt();
      requestAnimationFrame(frame);
      if (inline) host.scrollIntoView({ block: 'center' });
    }
    function close() {
      if (state === 'busy') return;
      running = false; state = 'off';
      if (inline) { arena.hidden = true; startBtn.hidden = false; } else { panel.hidden = true; launch.hidden = false; }
    }
    const onResize = () => { if (running) size(); };
    addEventListener('resize', onResize);
    quitBtn.addEventListener('click', close);
    if (launch) launch.addEventListener('click', open);
    if (startBtn) startBtn.addEventListener('click', open);

    return {
      open, close, repair,
      destroy() { running = false; repair(); removeEventListener('keydown', onDown); removeEventListener('keyup', onUp); removeEventListener('resize', onResize); if (overlay) overlay.remove(); host.remove(); },
    };
  }

  let game = null;
  const API = {
    version: '1.1.0',
    /** Mount the game. Pass { target: element } to place it inline; otherwise it adds a floating launcher. */
    mount(options) { if (game) game.destroy(); game = create(options || {}); return game; },
    open(options) { if (!game) game = create(options || {}); game.open(); return game; },
    close() { if (game) game.close(); },
    repair() { if (game) game.repair(); },
  };
  global.SiteSlap = API;
  if (typeof module === 'object' && module.exports) module.exports = API;

  // Loaded by a plain <script> tag: set itself up unless told not to with data-manual.
  if (script && !script.hasAttribute('data-manual')) {
    const go = () => {
      const o = {};
      const sel = script.getAttribute('data-target');
      if (sel && document.querySelector(sel)) o.target = document.querySelector(sel);
      if (script.hasAttribute('data-computer')) o.computer = true;
      if (script.getAttribute('data-position')) o.position = script.getAttribute('data-position');
      if (script.getAttribute('data-label')) o.launcherText = script.getAttribute('data-label');
      API.mount(o);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  }
})(typeof window !== 'undefined' ? window : this);
