/* Fredagslotteriet – «Keiservarden Grand Prix»: egen liten fysikkmotor for kuler, og løyper bygd av deler.
   Hele løpet simuleres først (deterministisk, med seed), og spilles deretter av.
   En løype er bare data: en liste med deler (start, rampe, vegg, hull, Glimt-hjul …).
   Originalløypa er beskrevet med de samme delene og gir nøyaktig samme løp som før. */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u;

  const R = 11;            // kuleradius (verdensenheter)
  const G = 1000;          // tyngdekraft
  const DT = 1 / 240;      // fysikk-steg
  const REC = 8;           // lagre hver 8. steg → 30 bilder i sekundet
  const T_MAX = 85;        // maks løpstid før resten «sitter fast»
  const GATE_T = 3.6;      // startporten åpner
  const ROLL = 0.25;       // rullemotstand ved kontakt (per sekund)
  const AIR = 0.03;
  const E_MM = 0.55;       // kule mot kule
  const VMAX = 700;
  const W_FAST = 5;        // Glimt-hjul raskere enn dette skyter kulene til værs (opp til 5 går alt som før)
  const W_MAX = 20;        // høyeste fart et Glimt-hjul kan få
  const V_LAUNCH = 2400;   // toppfart for en kule som er skutt ut av et raskt Glimt-hjul
  const ST = { RACE: 0, FIN: 1, OUT: 2, CARRY: 3 };
  const WORLD_W = 1600;    // løypa er alltid 1600 bred – høyden følger målet

  /* ---------- Originalløypa (1600 × 3720, y nedover) ---------- */
  const ORIGINAL_PIECES = [
    { type: 'start', x: 800, y: 300 },
    // Utforkjøring 1 → høyre
    { type: 'wall', ax: 610, ay: 262, bx: 610, by: 346 },
    { type: 'ramp', ax: 612, ay: 340, bx: 1460, by: 518 },
    { type: 'wall', ax: 1500, ay: 400, bx: 1500, by: 600 },
    { type: 'wall', ax: 1550, ay: 380, bx: 1550, by: 640 },
    // Utforkjøring 2 → venstre, inn i Glimt-hjulet
    { type: 'ramp', ax: 1530, ay: 610, bx: 330, by: 862 },
    { type: 'wall', ax: 380, ay: 880, bx: 380, by: 1075 },
    { type: 'wall', ax: 100, ay: 780, bx: 100, by: 1162 },
    { type: 'wall', ax: 100, ay: 780, bx: 250, by: 752 },
    { type: 'wheel', x: 240, y: 1000, len: 106, speed: 2.2, arms: 4 },
    // Utforkjøring 3: Bodø-vind og hoppet over Juvet
    { type: 'ramp', ax: 100, ay: 1160, bx: 900, by: 1332 },
    { type: 'ramp', ax: 1010, ay: 1405, bx: 1480, by: 1470 },
    { type: 'wall', ax: 1520, ay: 1280, bx: 1520, by: 1500 },
    { type: 'wall', ax: 1552, ay: 1300, bx: 1552, by: 1565 },
    { type: 'pit', x0: 898, x1: 1010, yl: 1342, yr: 1412, y1: 1540, sy: 1398, name: 'Juvet', cause: 'k_vind' },
    { type: 'wind', x0: 680, y0: 1180, x1: 1010, y1: 1420, dir: -1 },
    // Utforkjøring 4 → venstre, ned i Hurtigruta-feltet
    { type: 'ramp', ax: 1545, ay: 1555, bx: 300, by: 1810 },
    { type: 'wall', ax: 100, ay: 1700, bx: 100, by: 2292 },
    { type: 'wall', ax: 780, ay: 1850, bx: 780, by: 2292 },
    { type: 'ramp', ax: 100, ay: 2290, bx: 398, by: 2374 },
    { type: 'ramp', ax: 780, ay: 2290, bx: 482, by: 2374 },
    { type: 'pegs', x: 150, y: 1870, w: 590, rows: 7 },
    { type: 'bumper', x: 300, y: 2020 },
    { type: 'bumper', x: 560, y: 2130 },
    // Polarsirkel-vippa → to veier. Venstre: lang og trygg
    { type: 'seesaw', x: 440, y: 2472, half: 150 },
    { type: 'ramp', ax: 300, ay: 2552, bx: 124, by: 2604 },
    { type: 'wall', ax: 70, ay: 2510, bx: 70, by: 2685 },
    { type: 'ramp', ax: 80, ay: 2680, bx: 1180, by: 2900 },
    // Høyre: kort, men med Ørnes-luka
    { type: 'ramp', ax: 600, ay: 2552, bx: 860, by: 2600 },
    { type: 'trap', ax: 862, ay: 2601, bx: 958, by: 2619 },
    { type: 'ramp', ax: 960, ay: 2619, bx: 1180, by: 2660 },
    { type: 'pit', x0: 860, x1: 960, yl: 2606, yr: 2626, y1: 2770, sy: 2628, name: 'Ørnes', cause: 'k_ornes' },
    { type: 'wall', ax: 1240, ay: 2510, bx: 1240, by: 2970 },
    // Utforkjøring 7: Ørna jakter langs rampa
    { type: 'ramp', ax: 1252, ay: 2990, bx: 200, by: 3200 },
    { type: 'eagle', ax: 1252, ay: 2990, bx: 200, by: 3200 },
    { type: 'wall', ax: 90, ay: 3020, bx: 90, by: 3302 },
    // Sjøgata → mål i Bodø havn
    { type: 'ramp', ax: 100, ay: 3300, bx: 1360, by: 3470 },
    { type: 'finish', x: 1290, y: 3330 },
    { type: 'sign', x: 300, y: 110, text: 'KEISERVARDEN · 366 MOH' },
    { type: 'sign', x: 470, y: 840, text: 'GLIMT-HJULET' },
    { type: 'sign', x: 760, y: 1150, text: 'BODØ-VIND' },
    { type: 'sign', x: 955, y: 1575, text: 'JUVET' },
    { type: 'sign', x: 880, y: 1850, text: 'HURTIGRUTA-TUT' },
    { type: 'sign', x: 660, y: 2430, text: 'POLARSIRKEL-VIPPA' },
    { type: 'sign', x: 910, y: 2810, text: 'ØRNES ↓' },
    { type: 'sign', x: 980, y: 2950, text: 'ØRNA JAKTER' },
    { type: 'sign', x: 640, y: 3520, text: 'SJØGATA' },
  ];

  /* ---------- Rydding av løypedata (fra lagring, import og designeren) ---------- */
  const TYPES = ['start', 'finish', 'ramp', 'wall', 'pegs', 'bumper', 'wheel', 'seesaw', 'trap', 'pit', 'wind', 'eagle', 'sign'];
  const LIMITS = { total: 300, start: 1, finish: 1, ramp: 160, wall: 160, pegs: 8, bumper: 40, wheel: 8, seesaw: 8, trap: 12, pit: 16, wind: 6, eagle: 4, sign: 40 };
  const CAUSES = ['k_vind', 'k_ornes'];
  const num = (v, d, a, b) => { const n = typeof v === 'number' ? v : parseFloat(v); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : d; };
  const XN = (v, d) => num(v, d, -200, 1800);
  const YN = (v, d) => num(v, d, -3000, 30000);
  const txt = (v, d, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max) || d;
  const line = (type, p) => ({ type, ax: XN(p.ax, 600), ay: YN(p.ay, 500), bx: XN(p.bx, 900), by: YN(p.by, 560) });
  const SANE = {
    start: (p) => ({ type: 'start', x: num(p.x, 800, 340, 1260), y: YN(p.y, 300) }),
    finish: (p) => ({ type: 'finish', x: num(p.x, 1290, 0, 1300), y: YN(p.y, 3330) }),
    ramp: (p) => line('ramp', p),
    wall: (p) => line('wall', p),
    trap: (p) => line('trap', p),
    eagle: (p) => line('eagle', p),
    pegs: (p) => ({ type: 'pegs', x: XN(p.x, 300), y: YN(p.y, 600), w: num(p.w, 400, 64, 1600), rows: Math.round(num(p.rows, 5, 1, 14)) }),
    bumper: (p) => ({ type: 'bumper', x: XN(p.x, 800), y: YN(p.y, 600) }),
    wheel: (p) => ({ type: 'wheel', x: XN(p.x, 800), y: YN(p.y, 600), len: num(p.len, 100, 50, 180), speed: num(p.speed, 2.2, -W_MAX, W_MAX), arms: Math.round(num(p.arms, 4, 2, 6)) }),
    seesaw: (p) => ({ type: 'seesaw', x: XN(p.x, 800), y: YN(p.y, 600), half: num(p.half, 140, 60, 260) }),
    pit: (p) => {
      let x0 = XN(p.x0, 750), x1 = XN(p.x1, 860);
      if (x1 < x0) { const k = x0; x0 = x1; x1 = k; }
      if (x1 - x0 < 40) x1 = x0 + 40;
      const yl = YN(p.yl, 600), yr = YN(p.yr, 600);
      const y1 = Math.max(YN(p.y1, 760), Math.max(yl, yr) + 40);
      const o = { type: 'pit', x0, x1, yl, yr, y1, name: txt(p.name, 'Hullet', 24) };
      if (p.sy != null && Number.isFinite(+p.sy)) o.sy = num(p.sy, Math.max(yl, yr) + 2, Math.min(yl, yr) - 80, y1 - 10);
      if (CAUSES.includes(p.cause)) o.cause = p.cause;
      return o;
    },
    wind: (p) => {
      const ax = XN(p.x0, 600), bx = XN(p.x1, 900), ay = YN(p.y0, 500), by = YN(p.y1, 700);
      const x0 = Math.min(ax, bx), y0 = Math.min(ay, by);
      return { type: 'wind', x0, y0, x1: Math.max(ax, bx, x0 + 60), y1: Math.max(ay, by, y0 + 60), dir: +p.dir > 0 ? 1 : -1 };
    },
    sign: (p) => ({ type: 'sign', x: XN(p.x, 800), y: YN(p.y, 600), text: txt(p.text, 'SKILT', 28).toUpperCase() }),
  };
  function sanePiece(p) { return p && SANE[p.type] ? SANE[p.type](p) : null; }
  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.pieces)) return null;
    const count = {};
    const pieces = [];
    for (const p of raw.pieces) {
      const s = sanePiece(p);
      if (!s || pieces.length >= LIMITS.total) continue;
      count[s.type] = (count[s.type] || 0) + 1;
      if (count[s.type] > LIMITS[s.type]) continue;
      pieces.push(s);
    }
    if (!count.start) pieces.unshift({ type: 'start', x: 800, y: 300 });
    if (!count.finish) pieces.push({ type: 'finish', x: 1290, y: 3330 });
    return { id: txt(raw.id, 'c_' + u.hashStr(JSON.stringify(pieces)).toString(36), 40), name: txt(raw.name, 'Min løype', 40), pieces };
  }
  const hash = (def) => u.hashStr(JSON.stringify(def.pieces)).toString(36);
  const ORIGINAL = normalize({ id: 'keiservarden', name: 'Keiservarden (original)', pieces: ORIGINAL_PIECES });

  /* ---------- Fra deler til en løype fysikken kan kjøre ---------- */
  function makeEagle(p, swoops) {
    const dir = p.ax >= p.bx ? 1 : -1;            // 1 = flyr mot venstre, som i originalen
    const x0 = p.ax + 128 * dir, span = x0 - (p.bx - 100 * dir);
    const ddx = (p.ax - p.bx) || 1;
    const lineY = (x) => p.ay + ((p.ax - x) * (p.by - p.ay)) / ddx;
    return {
      swoops, dur: 1.8, reach: 20, dir, ax: p.ax, ay: p.ay, bx: p.bx, by: p.by, lineY,
      at(t) { // klo-posisjon i et pågående stup, ellers null
        for (const t0 of swoops) {
          if (t >= t0 && t <= t0 + this.dur) {
            const q = (t - t0) / this.dur;
            const x = x0 - q * span;
            const y = lineY(x) - 16 - 250 * Math.pow(1 - Math.sin(q * Math.PI), 1.3);
            return { x, y, p: q, k: t0 };
          }
        }
        return null;
      },
    };
  }
  function compile(def, seed) {
    const pieces = def.pieces;
    const rnd = u.mulberry32((seed ^ 0x5eed) >>> 0);
    const S = [], pegs = [], bumpers = [], gates = [], wheels = [], seesaws = [], traps = [], winds = [], eagles = [], sensors = [], pits = [], signs = [];
    let start = null, fin = null;
    const seg = (ax, ay, bx, by, kind = 'track') => S.push({ ax, ay, bx, by, t: 7, e: 0.3, kind });
    for (const p of pieces) {
      if (p.type === 'start') {
        start = p;
        seg(p.x - 330, p.y - 260, p.x - 60, p.y, 'hopper'); seg(p.x + 330, p.y - 260, p.x + 60, p.y, 'hopper');
        seg(p.x - 330, p.y - 260, p.x - 330, p.y - 360, 'hopper'); seg(p.x + 330, p.y - 260, p.x + 330, p.y - 360, 'hopper');
        gates.push({ ax: p.x - 60, ay: p.y, bx: p.x + 60, by: p.y, t: 7 });
      } else if (p.type === 'ramp') seg(p.ax, p.ay, p.bx, p.by);
      else if (p.type === 'wall') seg(p.ax, p.ay, p.bx, p.by, 'wall');
      else if (p.type === 'pit') {
        seg(p.x0, p.yl, p.x0, p.y1, 'pit'); seg(p.x1, p.yr, p.x1, p.y1, 'pit'); seg(p.x0, p.y1, p.x1, p.y1, 'pit');
        const top = p.sy != null ? p.sy : Math.max(p.yl, p.yr) + 2;
        sensors.push({ x0: p.x0 + 7, y0: top, x1: p.x1 - 7, y1: p.y1 - 3, cause: p.cause || 'k_hull', pn: p.cause ? null : p.name });
        pits.push(p);
      } else if (p.type === 'finish') {
        fin = p;
        seg(p.x + 40, p.y + 250, p.x + 270, p.y + 280); seg(p.x + 292, p.y + 30, p.x + 292, p.y + 295, 'wall'); seg(p.x + 38, p.y + 210, p.x + 38, p.y + 256, 'wall');
      } else if (p.type === 'bumper') bumpers.push({ x: p.x, y: p.y, r: 26, kick: 520 });
      else if (p.type === 'sign') signs.push({ x: p.x, y: p.y, text: p.text });
    }
    if (!start || !fin) throw new Error('Løypa mangler start eller mål');
    // spikerbrett: rad for rad, med plass rundt TUT-bumperne
    for (const p of pieces) {
      if (p.type !== 'pegs') continue;
      for (let row = 0; row < p.rows; row++) {
        const y = p.y + row * 56, off = row % 2 ? 32 : 0;
        for (let x = p.x + off; x <= p.x + p.w; x += 64) {
          if (bumpers.some((b) => Math.hypot(x - b.x, y - b.y) < b.r + 34)) continue;
          pegs.push({ x, y, r: 7 });
        }
      }
    }
    // bevegelige deler får fase fra seeden, alltid i samme typerekkefølge
    const of = (type) => pieces.filter((p) => p.type === type);
    of('wheel').forEach((p) => {
      const W = { cx: p.x, cy: p.y, len: p.len, w: p.speed, arms: p.arms, t: 8, a0: rnd() * 6.28 };
      // raske hjul sjekkes i små steg, så armene ikke hopper over kulene
      if (Math.abs(p.speed) > W_FAST) { W.fast = true; W.sub = Math.max(1, Math.ceil((Math.abs(p.speed) * (p.len + R) * DT) / 5)); }
      wheels.push(W);
    });
    of('seesaw').forEach((p) => seesaws.push({ px: p.x, py: p.y, half: p.half, amp: 0.2, period: 3.2, phase: rnd() * 3.2, t: 8 }));
    of('trap').forEach((p) => traps.push({ ax: p.ax, ay: p.ay, bx: p.bx, by: p.by, t: 7, period: 2.6, phase: rnd() * 2.6, openFrom: 1.7, openTo: 2.45 }));
    of('wind').forEach((p) => {
      const gusts = [];
      for (let t = 5 + rnd() * 3; t < T_MAX; t += 2.6 + rnd() * 3.2) gusts.push({ t0: t, t1: t + 0.9 + rnd() * 0.5, a: 300 + rnd() * 240 });
      winds.push({ x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1, dir: p.dir, base: 0, gusts });
    });
    of('eagle').forEach((p) => {
      const swoops = [];
      for (let t = 14 + rnd() * 4; t < T_MAX; t += 4.2 + rnd() * 3) swoops.push(t);
      eagles.push(makeEagle(p, swoops));
    });
    return {
      S, pegs, bumpers, gates, wheels, seesaws, traps, winds, eagles, sensors, pits, signs,
      start: { x: start.x, y: start.y }, fin: { x: fin.x, y: fin.y },
      finish: { x0: fin.x, y0: fin.y, x1: fin.x + 40, y1: fin.y + 230 },
      W: WORLD_W, H: fin.y + 390, top: start.y - 440,
    };
  }
  function course(seed, def) {
    const d = def && def !== ORIGINAL ? (normalize(def) || ORIGINAL) : ORIGINAL;
    return compile(d, seed);
  }

  /* Tilstander som avhenger av tid (brukes både i simulering og tegning) */
  const kin = {
    gateOpen: (t) => t >= GATE_T,
    wheelAngle: (W, t) => W.a0 + W.w * t,
    seesawAngle: (P, t) => P.amp * Math.sin((2 * Math.PI * (t + P.phase)) / P.period),
    seesawRate: (P, t) => P.amp * ((2 * Math.PI) / P.period) * Math.cos((2 * Math.PI * (t + P.phase)) / P.period),
    trapOpen: (T, t) => { const ph = (t + T.phase) % T.period; return ph >= T.openFrom && ph <= T.openTo; },
    windAccel: (Z, t) => { let a = Z.base; for (const g of Z.gusts) if (t >= g.t0 && t <= g.t1) { a += g.a * Math.sin(((t - g.t0) / (g.t1 - g.t0)) * Math.PI); break; } return a; },
  };
  // kula forsvant ut av verden ved siden av et Glimt-hjul → hjulet slo den ut
  const flung = (C, x, y) => C.wheels.some((w) => (x < 0 ? w.cx < C.W / 2 : x > C.W && w.cx > C.W / 2) && y > w.cy - 300 && y < w.cy + 250);

  /* ---------- Simulering ---------- */
  function simulate(n, seed, def) {
    const C = course(seed, def);
    const rnd = u.mulberry32(seed >>> 0);
    const X = new Float64Array(n), Y = new Float64Array(n), VX = new Float64Array(n), VY = new Float64Array(n), ANG = new Float64Array(n);
    const state = new Uint8Array(n), tDone = new Float64Array(n).fill(-1), cause = new Array(n).fill(null), pn = new Array(n).fill(null);
    const carrier = new Int16Array(n).fill(-1);
    // startposisjoner i trakta, fra bunnen og opp
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const sx = C.start.x, sy = C.start.y, top = sy - 260;
    let k = 0;
    for (let y = sy - 24; k < n && y > sy - 340; y -= 2 * R + 3) {
      const yy = Math.max(y, top);
      const xl = (sx - 330) + (yy - top) * (270 / 260) + R + 9, xr = (sx + 330) - (yy - top) * (270 / 260) - R - 9;
      for (let x = xl; x <= xr && k < n; x += 2 * R + 3) { const i = order[k++]; X[i] = x + (rnd() - 0.5) * 3; Y[i] = y + (rnd() - 0.5) * 3; VX[i] = (rnd() - 0.5) * 40; }
    }
    for (let y = sy - 365; k < n; y -= 2 * R + 3) for (let x = sx - 310; x <= sx + 310 && k < n; x += 2 * R + 3) { const i = order[k++]; X[i] = x; Y[i] = y; }
    // statisk rutenett for kollisjon
    const CELL = 120, grid = new Map();
    const key = (cx, cy) => cx * 4096 + cy;
    const addTo = (minx, miny, maxx, maxy, item) => {
      for (let cx = Math.floor(minx / CELL); cx <= Math.floor(maxx / CELL); cx++) for (let cy = Math.floor(miny / CELL); cy <= Math.floor(maxy / CELL); cy++) {
        const kk = key(cx, cy); let a = grid.get(kk); if (!a) { a = []; grid.set(kk, a); } a.push(item);
      }
    };
    C.S.forEach((s) => { const pad = s.t + R; addTo(Math.min(s.ax, s.bx) - pad, Math.min(s.ay, s.by) - pad, Math.max(s.ax, s.bx) + pad, Math.max(s.ay, s.by) + pad, { s }); });
    C.pegs.forEach((p) => addTo(p.x - p.r - R, p.y - p.r - R, p.x + p.r + R, p.y + p.r + R, { c: p }));
    C.bumpers.forEach((p) => addTo(p.x - p.r - R, p.y - p.r - R, p.x + p.r + R, p.y + p.r + R, { c: p, bump: true }));

    const events = [];
    const frames = [];
    const contact = new Uint8Array(n);

    function capsule(i, ax, ay, bx, by, t, e, svx, svy) {
      const abx = bx - ax, aby = by - ay, len2 = abx * abx + aby * aby;
      let q = len2 > 0 ? ((X[i] - ax) * abx + (Y[i] - ay) * aby) / len2 : 0;
      q = q < 0 ? 0 : q > 1 ? 1 : q;
      const qx = ax + abx * q, qy = ay + aby * q;
      const dx = X[i] - qx, dy = Y[i] - qy, d2 = dx * dx + dy * dy, min = R + t;
      if (d2 >= min * min) return null;
      const d = Math.sqrt(d2) || 1e-6, nx = dx / d, ny = dy / d;
      X[i] = qx + nx * min; Y[i] = qy + ny * min;
      let rvx = VX[i] - svx, rvy = VY[i] - svy;
      const vn = rvx * nx + rvy * ny;
      if (vn < 0) { const ee = vn < -40 ? e : 0; rvx -= (1 + ee) * vn * nx; rvy -= (1 + ee) * vn * ny; }
      VX[i] = rvx + svx; VY[i] = rvy + svy;
      contact[i] = 1;
      return { qx, qy };
    }
    function circle(i, c, e) {
      const dx = X[i] - c.x, dy = Y[i] - c.y, min = R + c.r, d2 = dx * dx + dy * dy;
      if (d2 >= min * min) return false;
      const d = Math.sqrt(d2) || 1e-6, nx = dx / d, ny = dy / d;
      X[i] = c.x + nx * min; Y[i] = c.y + ny * min;
      const vn = VX[i] * nx + VY[i] * ny;
      if (vn < 0) { VX[i] -= (1 + e) * vn * nx; VY[i] -= (1 + e) * vn * ny; }
      if (c.kick) { const out = VX[i] * nx + VY[i] * ny; if (out < c.kick) { VX[i] += (c.kick - out) * nx; VY[i] += (c.kick - out) * ny; } }
      contact[i] = 1;
      return true;
    }
    const NW = C.wheels.length, NS = C.seesaws.length, NT = C.traps.length, NZ = C.winds.length, NE = C.eagles.length;
    const wa = new Float64Array(NW), sa = new Float64Array(NS), sr = new Float64Array(NS), topen = new Uint8Array(NT), wv = new Float64Array(NZ);
    const claws = new Array(NE).fill(null), grabbed = C.eagles.map(() => new Set());
    const lastBump = new Float64Array(n).fill(-9);
    // raske Glimt-hjul: kula får fly fortere enn vanlig toppfart til den har bremset ned igjen
    const cap = new Float64Array(n).fill(VMAX), launchT = new Float64Array(n).fill(-Infinity), lastLaunch = new Float64Array(n).fill(-9);
    function spin(i, W, ang1) {
      let hit = false;
      for (let s = 1; s <= W.sub; s++) {
        const base = ang1 - (W.w * DT * (W.sub - s)) / W.sub; // fra forrige stegs vinkel fram til nå
        let touch = false;
        for (let a = 0; a < W.arms; a++) {
          const ang = base + (a * Math.PI * 2) / W.arms, ex = W.cx + Math.cos(ang) * W.len, ey = W.cy + Math.sin(ang) * W.len;
          const abx = ex - W.cx, aby = ey - W.cy, l2 = abx * abx + aby * aby;
          let qq = ((X[i] - W.cx) * abx + (Y[i] - W.cy) * aby) / l2; qq = qq < 0 ? 0 : qq > 1 ? 1 : qq;
          const qx = W.cx + abx * qq, qy = W.cy + aby * qq;
          if (capsule(i, W.cx, W.cy, ex, ey, W.t, 0.35, -W.w * (qy - W.cy), W.w * (qx - W.cx))) touch = true;
        }
        if (!touch) continue;
        hit = true;
        // løypa vinner over armen: kula skal ikke dyttes gjennom gulv, vegger eller lukker
        const cell = grid.get(key(Math.floor(X[i] / CELL), Math.floor(Y[i] / CELL)));
        if (cell) for (const it of cell) if (it.s) capsule(i, it.s.ax, it.s.ay, it.s.bx, it.s.by, it.s.t, it.s.e, 0, 0);
        for (let q = 0; q < NT; q++) if (!topen[q]) { const T = C.traps[q]; capsule(i, T.ax, T.ay, T.bx, T.by, T.t, 0.25, 0, 0); }
      }
      if (!hit) return;
      cap[i] = V_LAUNCH; launchT[i] = t;
      if (Math.hypot(VX[i], VY[i]) > 1100 && t - lastLaunch[i] > 1) { lastLaunch[i] = t; events.push({ t, type: 'launch', i, x: X[i], y: Y[i] }); }
    }
    let t = 0, step = 0, lastDoneT = -1;
    const active = (i) => state[i] === ST.RACE || state[i] === ST.FIN || (state[i] === ST.OUT && cause[i] !== 'k_orna' && X[i] > -40 && X[i] < C.W + 40 && Y[i] < C.H + 40);

    while (t < T_MAX + 2) {
      const gateOpen = kin.gateOpen(t);
      for (let q = 0; q < NW; q++) wa[q] = kin.wheelAngle(C.wheels[q], t);
      for (let q = 0; q < NS; q++) { sa[q] = kin.seesawAngle(C.seesaws[q], t); sr[q] = kin.seesawRate(C.seesaws[q], t); }
      for (let q = 0; q < NT; q++) topen[q] = kin.trapOpen(C.traps[q], t) ? 1 : 0;
      for (let q = 0; q < NZ; q++) wv[q] = kin.windAccel(C.winds[q], t);
      for (let q = 0; q < NE; q++) claws[q] = C.eagles[q].at(t);
      for (let i = 0; i < n; i++) {
        if (state[i] === ST.CARRY) { const cl = claws[carrier[i]]; if (cl) { X[i] = cl.x; Y[i] = cl.y + 24; } else { X[i] = -200; Y[i] = 2500; } continue; }
        if (!active(i)) continue;
        VY[i] += G * DT;
        if (state[i] === ST.RACE) {
          for (let q = 0; q < NZ; q++) {
            const Z = C.winds[q];
            if (X[i] > Z.x0 && X[i] < Z.x1 && Y[i] > Z.y0 && Y[i] < Z.y1) { if (Z.dir < 0) VX[i] -= wv[q] * DT; else VX[i] += wv[q] * DT; }
          }
        }
        const damp = 1 - (contact[i] ? ROLL : AIR) * DT;
        VX[i] *= damp; VY[i] *= contact[i] ? damp : 1;
        const sp = Math.hypot(VX[i], VY[i]), cp = cap[i];
        if (sp > cp) { VX[i] *= cp / sp; VY[i] *= cp / sp; }
        else if (cp > VMAX) cap[i] = sp > VMAX ? sp : VMAX; // en skutt kule bremser ned til vanlig toppfart igjen
        X[i] += VX[i] * DT; Y[i] += VY[i] * DT;
        ANG[i] += (VX[i] / R) * DT;
        contact[i] = 0;
      }
      // kule mot kule
      const mg = new Map();
      for (let i = 0; i < n; i++) {
        if (!active(i)) continue;
        const cx = Math.floor(X[i] / 24), cy = Math.floor(Y[i] / 24);
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
          const list = mg.get(key(cx + ox, cy + oy));
          if (!list) continue;
          for (const j of list) {
            const dx = X[j] - X[i], dy = Y[j] - Y[i], d2 = dx * dx + dy * dy;
            if (d2 >= 4 * R * R || d2 === 0) continue;
            const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (2 * R - d) / 2;
            X[i] -= nx * ov; Y[i] -= ny * ov; X[j] += nx * ov; Y[j] += ny * ov;
            const vn = (VX[j] - VX[i]) * nx + (VY[j] - VY[i]) * ny;
            if (vn < 0) { const jm = (-(1 + E_MM) * vn) / 2; VX[i] -= jm * nx; VY[i] -= jm * ny; VX[j] += jm * nx; VY[j] += jm * ny; }
          }
        }
        const kk = key(cx, cy); let a = mg.get(kk); if (!a) { a = []; mg.set(kk, a); } a.push(i);
      }
      // kule mot løype
      for (let i = 0; i < n; i++) {
        if (!active(i)) continue;
        const cell = grid.get(key(Math.floor(X[i] / CELL), Math.floor(Y[i] / CELL)));
        if (cell) for (const it of cell) {
          if (it.s) capsule(i, it.s.ax, it.s.ay, it.s.bx, it.s.by, it.s.t, it.s.e, 0, 0);
          else if (circle(i, it.c, it.bump ? 0.6 : 0.45) && it.bump && t - lastBump[i] > 0.25) { lastBump[i] = t; events.push({ t, type: 'bump', i, x: it.c.x, y: it.c.y }); }
        }
        if (!gateOpen) for (const g of C.gates) capsule(i, g.ax, g.ay, g.bx, g.by, g.t, 0.2, 0, 0);
        for (let q = 0; q < NT; q++) if (!topen[q]) { const T = C.traps[q]; capsule(i, T.ax, T.ay, T.bx, T.by, T.t, 0.25, 0, 0); }
        // Glimt-hjul
        for (let q = 0; q < NW; q++) {
          const W = C.wheels[q];
          if (Math.hypot(X[i] - W.cx, Y[i] - W.cy) < W.len + R + W.t + 4) {
            if (W.fast) { spin(i, W, wa[q]); continue; }
            for (let a = 0; a < W.arms; a++) {
              const ang = wa[q] + (a * Math.PI * 2) / W.arms, ex = W.cx + Math.cos(ang) * W.len, ey = W.cy + Math.sin(ang) * W.len;
              const abx = ex - W.cx, aby = ey - W.cy, l2 = abx * abx + aby * aby;
              let qq = ((X[i] - W.cx) * abx + (Y[i] - W.cy) * aby) / l2; qq = qq < 0 ? 0 : qq > 1 ? 1 : qq;
              const qx = W.cx + abx * qq, qy = W.cy + aby * qq;
              capsule(i, W.cx, W.cy, ex, ey, W.t, 0.35, -W.w * (qy - W.cy), W.w * (qx - W.cx));
            }
          }
        }
        // vipper
        for (let q = 0; q < NS; q++) {
          const Pp = C.seesaws[q];
          if (Math.abs(X[i] - Pp.px) < Pp.half + 30 && Math.abs(Y[i] - Pp.py) < 80) {
            const c = Math.cos(sa[q]), s = Math.sin(sa[q]);
            const ax = Pp.px - c * Pp.half, ay = Pp.py - s * Pp.half, bx = Pp.px + c * Pp.half, by = Pp.py + s * Pp.half;
            const abx = bx - ax, aby = by - ay, l2 = abx * abx + aby * aby;
            let qq = ((X[i] - ax) * abx + (Y[i] - ay) * aby) / l2; qq = qq < 0 ? 0 : qq > 1 ? 1 : qq;
            const qx = ax + abx * qq, qy = ay + aby * qq;
            capsule(i, ax, ay, bx, by, Pp.t, 0.25, -sr[q] * (qy - Pp.py), sr[q] * (qx - Pp.px));
          }
        }
      }
      // ørna, sensorer, mål og fall ut av verden
      for (let i = 0; i < n; i++) {
        if (state[i] !== ST.RACE) continue;
        let got = false;
        for (let q = 0; q < NE; q++) {
          const cl = claws[q];
          if (cl && cl.p > 0.3 && cl.p < 0.75 && !grabbed[q].has(cl.k) && Math.hypot(X[i] - cl.x, Y[i] - cl.y) < R + C.eagles[q].reach) {
            grabbed[q].add(cl.k); carrier[i] = q; state[i] = ST.CARRY; tDone[i] = t; cause[i] = 'k_orna'; lastDoneT = t;
            events.push({ t, type: 'out', i, cause: 'k_orna' });
            got = true;
            break;
          }
        }
        if (got) continue;
        const f = C.finish;
        if (X[i] > f.x0 && X[i] < f.x1 && Y[i] > f.y0 && Y[i] < f.y1) { state[i] = ST.FIN; tDone[i] = t; lastDoneT = t; events.push({ t, type: 'finish', i }); continue; }
        for (const s of C.sensors) {
          if (X[i] > s.x0 && X[i] < s.x1 && Y[i] > s.y0 && Y[i] < s.y1) {
            state[i] = ST.OUT; tDone[i] = t; cause[i] = s.cause; pn[i] = s.pn; lastDoneT = t;
            events.push(s.pn ? { t, type: 'out', i, cause: s.cause, pn: s.pn } : { t, type: 'out', i, cause: s.cause });
            break;
          }
        }
        if (state[i] === ST.RACE && (X[i] < -30 || X[i] > C.W + 30 || Y[i] > C.H)) { state[i] = ST.OUT; tDone[i] = t; cause[i] = flung(C, X[i], Y[i]) || t - launchT[i] < 6 ? 'k_glimt' : 'k_kant'; lastDoneT = t; events.push({ t, type: 'out', i, cause: cause[i] }); }
      }
      if (step % REC === 0) {
        const fr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { fr[i * 3] = X[i]; fr[i * 3 + 1] = Y[i]; fr[i * 3 + 2] = ANG[i]; }
        frames.push(fr);
      }
      t += DT; step++;
      let racing = 0;
      for (let i = 0; i < n; i++) if (state[i] === ST.RACE) racing++;
      if (!racing && t > lastDoneT + 2) break;
      if (t >= T_MAX && racing) {
        for (let i = 0; i < n; i++) if (state[i] === ST.RACE) { state[i] = ST.OUT; tDone[i] = t; cause[i] = 'k_fast'; events.push({ t, type: 'out', i, cause: 'k_fast' }); }
        lastDoneT = t;
      }
    }
    events.sort((a, b) => a.t - b.t);
    const idx = Array.from({ length: n }, (_, i) => i);
    const fin = idx.filter((i) => state[i] === ST.FIN).sort((a, b) => tDone[a] - tDone[b]);
    const out = idx.filter((i) => state[i] !== ST.FIN).sort((a, b) => tDone[b] - tDone[a]);
    return { C, n, seed, frames, fps: 240 / REC, events, rank: fin.concat(out), finishers: fin.length, tDone, cause, pn, duration: t };
  }

  /* Kjør med nye seeds til minst «need» kuler kommer i mål (løypa er den samme, bare starten varierer) */
  function race(n, seed, need, def, tries = 8) {
    let best = null;
    for (let k = 0; k < tries; k++) {
      const res = simulate(n, (seed + k * 7919) >>> 0, def);
      if (!best || res.finishers > best.finishers) best = res;
      if (res.finishers >= need) return res;
    }
    return best;
  }

  /* ---------- Godkjenning av egne løyper ---------- */
  function summarize(res) {
    const times = res.events.filter((e) => e.type === 'finish').map((e) => e.t - GATE_T);
    const causes = {};
    res.events.forEach((e) => { if (e.type === 'out') { const k = e.pn ? `${e.cause}:${e.pn}` : e.cause; causes[k] = (causes[k] || 0) + 1; } });
    return { n: res.n, finishers: res.finishers, times, causes };
  }
  function assess(runs, need) {
    const tot = runs.reduce((s, r) => s + r.n, 0), fin = runs.reduce((s, r) => s + r.finishers, 0);
    const rate = tot ? fin / tot : 0;
    const minRate = runs.length ? Math.min(...runs.map((r) => r.finishers / r.n)) : 0;
    const med = (arr) => { const a = arr.slice().sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : Infinity; };
    const winT = med(runs.map((r) => (r.times.length >= need ? r.times[need - 1] : Infinity)));
    const firstT = med(runs.map((r) => (r.times.length ? r.times[0] : Infinity)));
    const causes = {};
    runs.forEach((r) => Object.keys(r.causes).forEach((k) => { causes[k] = (causes[k] || 0) + r.causes[k]; }));
    const reasons = [];
    if (minRate < 0.3 || runs.some((r) => r.finishers < need)) reasons.push(`For få kom i mål i ett av prøveløpene (ned til ${Math.round(minRate * 100)} %). Minst ${need} kuler og 30 % må klare det hver gang.`);
    if (rate < 0.45) reasons.push(`Bare ${Math.round(rate * 100)} % kom i mål totalt. Minst 45 % må klare det.`);
    if (!(winT <= T_MAX - GATE_T - 6)) reasons.push('Løpet tar for lang tid. Vinnerne må være nede på under 75 sekunder.');
    if (reasons.length) { // pek på det som mest sannsynlig er galt
      const share = (id) => Object.keys(causes).filter((c) => c === id || c.startsWith(id + ':')).reduce((s, c) => s + causes[c], 0) / Math.max(1, tot);
      if (share('k_fast') > 0.15) reasons.push('Tips: mange kuler blir liggende fast. Se etter steder der noe sperrer veien, eller ramper som er for slakke.');
      if (share('k_kant') > 0.15) reasons.push('Tips: mange triller utfor kanten. Sett vegger på endene av rampene.');
      if (share('k_hull') > 0.25) reasons.push('Tips: hullene sluker mange. Gjør dem smalere, eller flytt dem litt unna.');
      if (share('k_glimt') > 0.15) reasons.push('Tips: Glimt-hjulet skyter mange kuler ut av løypa. Sett opp vegger rundt det, eller skru ned farten.');
    }
    return { ok: !reasons.length, rate, minRate, winT: Number.isFinite(winT) ? winT : null, firstT: Number.isFinite(firstT) ? firstT : null, causes, reasons, runs: runs.length, marbles: tot, need };
  }

  FL.KPhys = { R, GATE_T, T_MAX, ST, WORLD_W, W_FAST, W_MAX, TYPES, LIMITS, ORIGINAL, course, compile, normalize, sanePiece, hash, kin, simulate, race, summarize, assess };
})();
