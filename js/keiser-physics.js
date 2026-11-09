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
  const FPS = 240 / REC;   // opptaket: 30 bilder i sekundet
  const ST = { RACE: 0, FIN: 1, OUT: 2, CARRY: 3, TUNNEL: 4 };
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
  const TYPES = ['start', 'finish', 'ramp', 'wall', 'pegs', 'bumper', 'wheel', 'seesaw', 'trap', 'pit', 'wind', 'eagle', 'sign',
    'vortex', 'belt', 'ferry', 'rocket', 'tunnel', 'rack', 'rein', 'slush', 'arm', 'boss'];
  const BOLT_V = 1700;     // farten på strålene fra Sjefen
  // ingen grenser på antall deler – bare én start og ett mål
  const LIMITS = { start: 1, finish: 1 };
  // i takt: fast startvinkel (grader, 0 = høyre, 90 = opp) i stedet for tilfeldig. Feltene finnes bare når det er på
  const syncOf = (p, o) => { if (+p.sync === 1) { o.sync = 1; o.ang = Math.round(num(p.ang, 0, 0, 359)); } return o; };
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
    wheel: (p) => {
      const o = syncOf(p, { type: 'wheel', x: XN(p.x, 800), y: YN(p.y, 600), len: num(p.len, 100, 50, 180), speed: num(p.speed, 2.2, -W_MAX, W_MAX), arms: Math.round(num(p.arms, 4, 2, 6)) });
      if (+p.hub === 0) o.hub = 0; // uten nav i midten (bare utseende – det er armene som slår)
      return o;
    },
    arm: (p) => syncOf(p, { type: 'arm', x: XN(p.x, 800), y: YN(p.y, 600), len: num(p.len, 150, 30, 400), speed: num(p.speed, 3, -W_MAX, W_MAX) }),
    boss: (p) => ({ type: 'boss', x: XN(p.x, 800), y: YN(p.y, 600), dir: +p.dir < 0 ? -1 : 1, range: num(p.range, 600, 150, 1200), cd: num(p.cd, 1.4, 0.4, 4), zap: +p.zap === 1 ? 1 : 0, force: num(p.force, 900, 100, 2400) }),
    seesaw: (p) => {
      const o = { type: 'seesaw', x: XN(p.x, 800), y: YN(p.y, 600), half: num(p.half, 140, 60, 260) };
      if (+p.phys === 1) o.phys = 1; // tyngde-vippe (feltet finnes bare når det er på, så eldre løyper er uendret)
      return o;
    },
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
    vortex: (p) => ({ type: 'vortex', x: XN(p.x, 800), y: YN(p.y, 600), r: num(p.r, 130, 70, 240), dir: +p.dir < 0 ? -1 : 1, drain: +p.drain === 1 ? 1 : 0 }),
    belt: (p) => ({ ...line('belt', p), speed: num(p.speed, 240, -600, 600) }),
    ferry: (p) => ({ ...line('ferry', p), speed: num(p.speed, 260, 120, 420) }),
    rocket: (p) => ({ type: 'rocket', x: XN(p.x, 800), y: YN(p.y, 600), ang: num(p.ang, 60, 0, 180), pow: num(p.pow, 1400, 500, 2400) }),
    tunnel: (p) => ({ ...line('tunnel', p), dir: +p.dir < 0 ? -1 : 1, ras: +p.ras === 0 ? 0 : 1 }),
    rack: (p) => ({ type: 'rack', x: XN(p.x, 600), y: YN(p.y, 600), w: num(p.w, 260, 80, 900), len: num(p.len, 70, 40, 120) }),
    rein: (p) => line('rein', p),
    slush: (p) => {
      const ax = XN(p.x0, 600), bx = XN(p.x1, 900), ay = YN(p.y0, 500), by = YN(p.y1, 620);
      const x0 = Math.min(ax, bx), y0 = Math.min(ay, by);
      return { type: 'slush', x0, y0, x1: Math.max(ax, bx, x0 + 60), y1: Math.max(ay, by, y0 + 40) };
    },
  };
  function sanePiece(p) { return p && SANE[p.type] ? SANE[p.type](p) : null; }
  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.pieces)) return null;
    const count = {};
    const pieces = [];
    for (const p of raw.pieces) {
      const s = sanePiece(p);
      if (!s) continue;
      count[s.type] = (count[s.type] || 0) + 1;
      if (LIMITS[s.type] && count[s.type] > LIMITS[s.type]) continue;
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
  /* Ferga til Lofoten: legger til ved A, går over til B, tipper av passasjerene og går tom tilbake */
  function makeFerry(p, r0) {
    const dx = p.bx - p.ax, dist = Math.hypot(dx, p.by - p.ay);
    const hw = 80, dwell = 1.8, travel = Math.max(0.6, dist / p.speed), period = 2 * dwell + 2 * travel;
    const sA = dx >= 0 ? -1 : 1, top = Math.max(p.ay, p.by) + 70;
    return {
      ax: p.ax, ay: p.ay, bx: p.bx, by: p.by, hw, dwell, travel, period, phase: r0 * period, sA, sB: -sA,
      barX: p.ax + sA * (hw + 14), // ferjekø: bommen på kaia ved A er nede når ferga ikke ligger inne
      sea: { x0: Math.min(p.ax, p.bx) - hw - 20, x1: Math.max(p.ax, p.bx) + hw + 20, y0: top, y1: top + 150 },
    };
  }
  /* Reinen rusler fram og tilbake langs stien og stopper for å beite. Tidslinje med {t, s, f}: posisjon s langs stien, f = retning */
  function makeRein(p, rnd) {
    const len = Math.hypot(p.bx - p.ax, p.by - p.ay);
    let t = 0, s = rnd() * len, dir = rnd() < 0.5 ? -1 : 1;
    const keys = [{ t, s, f: dir }];
    while (t < T_MAX + 4) {
      if (rnd() < 0.42) { t += 1.2 + rnd() * 2.2; keys.push({ t, s, f: dir }); continue; } // beiter
      const to = Math.max(0, Math.min(len, s + dir * (60 + rnd() * 220)));
      t += Math.max(0.4, Math.abs(to - s) / 55); s = to; keys.push({ t, s, f: dir });
      if (s >= len || s <= 0 || rnd() < 0.3) dir = -dir;
    }
    // innimellom rusler den til skogs (bakover i bildet) – da slipper kulene forbi
    const away = [];
    for (let t0 = 5 + rnd() * 4; t0 < T_MAX + 4; ) { const d = 3 + rnd() * 3; away.push({ t0, t1: t0 + d }); t0 += d + 5 + rnd() * 5; }
    return { ax: p.ax, ay: p.ay, bx: p.bx, by: p.by, len, keys, away, ki: 0 };
  }
  function compile(def, seed) {
    const pieces = def.pieces;
    const rnd = u.mulberry32((seed ^ 0x5eed) >>> 0);
    const S = [], pegs = [], bumpers = [], gates = [], wheels = [], seesaws = [], traps = [], winds = [], eagles = [], sensors = [], pits = [], signs = [];
    const vortexes = [], ferries = [], rockets = [], tunnels = [], racks = [], reins = [], slushes = [], bosses = [];
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
      else if (p.type === 'belt') {
        const L = Math.hypot(p.bx - p.ax, p.by - p.ay) || 1;
        S.push({ ax: p.ax, ay: p.ay, bx: p.bx, by: p.by, t: 7, e: 0.15, kind: 'belt', belt: p.speed, ux: (p.bx - p.ax) / L, uy: (p.by - p.ay) / L });
      } else if (p.type === 'rocket') S.push({ ax: p.x - 24, ay: p.y, bx: p.x + 24, by: p.y, t: 6, e: 0.2, kind: 'pad' });
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
    const makeWheel = (p, arms) => {
      const W = { cx: p.x, cy: p.y, len: p.len, w: p.speed, arms, t: 8, a0: rnd() * 6.28 };
      if (p.sync) W.a0 = (-p.ang * Math.PI) / 180; // i takt: fast startvinkel
      // raske hjul sjekkes i små steg, så armene ikke hopper over kulene
      if (Math.abs(p.speed) > W_FAST) { W.fast = true; W.sub = Math.max(1, Math.ceil((Math.abs(p.speed) * (p.len + R) * DT) / 5)); }
      return W;
    };
    of('wheel').forEach((p) => { const W = makeWheel(p, p.arms); if (p.hub === 0) W.nohub = true; wheels.push(W); });
    of('seesaw').forEach((p) => {
      const Pp = { px: p.x, py: p.y, half: p.half, amp: 0.2, period: 3.2, phase: rnd() * 3.2, t: 8 };
      if (p.phys) { // tyngde-vippe: vipper etter vekta av kulene (bjelken veier som ti kuler)
        const I = (10 * p.half * p.half) / 3;
        Object.assign(Pp, { dyn: true, I, k: I * 4.84, c: I * 1.1, max: 0.42 });
      }
      seesaws.push(Pp);
    });
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
    // de nye delene trekker fra seeden etter de gamle, så eldre løyper får nøyaktig samme faser som før
    of('vortex').forEach((p) => vortexes.push({ x: p.x, y: p.y, r: p.r, dir: p.dir, drain: p.drain, a0: rnd() * 6.28 }));
    of('ferry').forEach((p) => {
      const F = makeFerry(p, rnd());
      const s = F.sea;
      S.push({ ax: s.x0, ay: s.y0, bx: s.x0, by: s.y1, t: 7, e: 0.2, kind: 'sea' }, { ax: s.x1, ay: s.y0, bx: s.x1, by: s.y1, t: 7, e: 0.2, kind: 'sea' }, { ax: s.x0, ay: s.y1, bx: s.x1, by: s.y1, t: 7, e: 0.2, kind: 'sea' });
      sensors.push({ x0: s.x0 + 7, y0: s.y0 + 12, x1: s.x1 - 7, y1: s.y1 - 3, cause: 'k_ferje', pn: null });
      ferries.push(F);
    });
    of('rocket').forEach((p) => {
      const a = (p.ang * Math.PI) / 180;
      rockets.push({ x: p.x, y: p.y, ang: a, pow: p.pow, vx: Math.cos(a) * p.pow, vy: -Math.sin(a) * p.pow, hx: p.x, hy: p.y - R - 6 });
    });
    of('tunnel').forEach((p) => {
      const closures = [];
      if (p.ras) for (let t = 9 + rnd() * 10; t < T_MAX; t += 13 + rnd() * 15) closures.push({ t0: t, t1: t + 3 + rnd() * 2.5 });
      tunnels.push({ ax: p.ax, ay: p.ay, bx: p.bx, by: p.by, dir: p.dir, ras: p.ras, closures, transit: 0.35 + Math.hypot(p.bx - p.ax, p.by - p.ay) / 1400, mx: p.ax, my: p.ay - 20 });
    });
    of('rack').forEach((p) => {
      // hver fisk er en pendel (veier som tre kuler): vinden får den til å svinge, og kulene kan dytte den unna
      const fish = [];
      for (let px = p.x + 22; px <= p.x + p.w - 21; px += 44) {
        const I = p.len * p.len, kg = 1500 * p.len, wn = Math.sqrt(kg / I);
        const wd = wn * (0.92 + rnd() * 0.16), amp = 0.55 + rnd() * 0.25, c = 0.2 * Math.sqrt(kg * I);
        fish.push({ px, py: p.y, len: p.len, I, kg, c, wd, amp, drive: amp * c * wd, ph: rnd() * 6.28, th0: (rnd() - 0.5) * 0.8 });
      }
      racks.push({ x: p.x, y: p.y, w: p.w, len: p.len, fish });
    });
    of('rein').forEach((p) => reins.push(makeRein(p, rnd)));
    of('slush').forEach((p) => slushes.push({ x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1 }));
    // Glimt-armen: én arm som spinner rundt et punkt i enden (samme fysikk som hjulet, uten nav)
    of('arm').forEach((p) => { const W = makeWheel(p, 1); W.arm = true; wheels.push(W); });
    // Sjefen: står og skyter med strålepistol (skuddene lagres i shots under løpet, så tegningen kan vise dem)
    of('boss').forEach((p) => bosses.push({ x: p.x, y: p.y, dir: p.dir, range: p.range, cd: p.cd, zap: p.zap, force: p.force, gx: p.x + p.dir * 42, gy: p.y - 72, phase: rnd() * p.cd, shots: [] }));
    return {
      S, pegs, bumpers, gates, wheels, seesaws, traps, winds, eagles, sensors, pits, signs,
      vortexes, ferries, rockets, tunnels, racks, reins, slushes, bosses,
      start: { x: start.x, y: start.y }, fin: { x: fin.x, y: fin.y },
      finish: { x0: fin.x, y0: fin.y, x1: fin.x + 40, y1: fin.y + 230 },
      W: WORLD_W, H: fin.y + 390, top: start.y - 440,
    };
  }
  function course(seed, def) {
    const d = def && def !== ORIGINAL ? (normalize(def) || ORIGINAL) : ORIGINAL;
    return compile(d, seed);
  }

  /* Verdi fra opptaket (30 bilder i sekundet) ved tid t */
  function recAt(arr, t) {
    if (!arr || !arr.length) return 0;
    const k = t * FPS;
    let a = Math.floor(k);
    if (a >= arr.length - 1) return arr[arr.length - 1];
    if (a < 0) a = 0;
    return arr[a] + (arr[a + 1] - arr[a]) * (k - a);
  }
  /* Tilstander som avhenger av tid (brukes både i simulering og tegning) */
  const kin = {
    gateOpen: (t) => t >= GATE_T,
    wheelAngle: (W, t) => W.a0 + W.w * t,
    // tyngde-vippa styres av kulene: tegningen leser vinkelen fra opptaket (og står vannrett uten opptak)
    seesawAngle: (P, t) => P.dyn ? recAt(P.rec, t) : P.amp * Math.sin((2 * Math.PI * (t + P.phase)) / P.period),
    seesawRate: (P, t) => P.amp * ((2 * Math.PI) / P.period) * Math.cos((2 * Math.PI * (t + P.phase)) / P.period),
    trapOpen: (T, t) => { const ph = (t + T.phase) % T.period; return ph >= T.openFrom && ph <= T.openTo; },
    windAccel: (Z, t) => { let a = Z.base; for (const g of Z.gusts) if (t >= g.t0 && t <= g.t1) { a += g.a * Math.sin(((t - g.t0) / (g.t1 - g.t0)) * Math.PI); break; } return a; },
    // tørrfisken svinger fritt i løpet (opptak); uten opptak (i designeren) vises en rolig svingning
    fishAngle: (F, t) => F.rec ? recAt(F.rec, t) : F.amp * Math.sin(F.wd * t + F.ph),
    tunnelClosed: (T, t) => T.closures.some((c) => t >= c.t0 && t < c.t1),
    // ferga: posisjon (midt på dekket), fart, helning og hvilke porter som står åpne
    ferry: (F, t) => {
      const ph = (((t + F.phase) % F.period) + F.period) % F.period, d = F.dwell, tr = F.travel;
      let s = 0, ds = 0, at = 0;
      if (ph < d) at = 1;
      else if (ph < d + tr) { const x = (ph - d) / tr; s = x * x * (3 - 2 * x); ds = (6 * x * (1 - x)) / tr; }
      else if (ph < 2 * d + tr) { s = 1; at = 2; }
      else { const x = (ph - 2 * d - tr) / tr; s = 1 - x * x * (3 - 2 * x); ds = -(6 * x * (1 - x)) / tr; }
      // dekket heller litt mot B-porten, og tipper ordentlig når ferga ligger ved B
      let tilt = F.sB * 0.07, rate = 0;
      if (at === 2) {
        const k = ph - d - tr, full = F.sB * 0.17;
        if (k < 0.35) { tilt += full * (k / 0.35); rate = full / 0.35; }
        else if (d - k < 0.35) { tilt += full * ((d - k) / 0.35); rate = -full / 0.35; }
        else tilt += full;
      }
      return { x: F.ax + (F.bx - F.ax) * s, y: F.ay + (F.by - F.ay) * s, vx: (F.bx - F.ax) * ds, vy: (F.by - F.ay) * ds, tilt, rate, openA: at === 1, openB: at === 2, at };
    },
    rein: (Rn, t) => {
      const K = Rn.keys;
      let i = Rn.ki || 0;
      if (i >= K.length - 1 || t < K[i].t) i = 0;
      while (i < K.length - 2 && t >= K[i + 1].t) i++;
      Rn.ki = i;
      const a = K[i], b = K[i + 1] || a, span = b.t - a.t;
      const f = span > 0 ? Math.min(1, Math.max(0, (t - a.t) / span)) : 0;
      const s = a.s + (b.s - a.s) * f, v = span > 0 && t < b.t ? (b.s - a.s) / span : 0;
      const ux = Rn.len ? (Rn.bx - Rn.ax) / Rn.len : 1, uy = Rn.len ? (Rn.by - Rn.ay) / Rn.len : 0;
      // borte = i skogen; near = 0..1 hvor langt fram i bildet den står (for tegningen)
      let away = false, near = 1;
      for (const w of Rn.away) {
        if (t < w.t0 - 0.4) break;
        if (t < w.t1 + 0.4) { away = t >= w.t0 && t < w.t1; near = Math.min(1, Math.max(0, Math.max(w.t0 - t, t - w.t1) / 0.4)); break; }
      }
      return { x: Rn.ax + ux * s, y: Rn.ay + uy * s, vx: ux * v, vy: uy * v, dir: v > 0 ? 1 : v < 0 ? -1 : b.f, graze: v === 0, away, near };
    },
  };
  // kula forsvant ut av verden ved siden av et Glimt-hjul → hjulet slo den ut
  const segDist = (px, py, g) => {
    const abx = g.bx - g.ax, aby = g.by - g.ay, l2 = abx * abx + aby * aby;
    let q = l2 ? ((px - g.ax) * abx + (py - g.ay) * aby) / l2 : 0; q = q < 0 ? 0 : q > 1 ? 1 : q;
    return Math.hypot(px - g.ax - abx * q, py - g.ay - aby * q);
  };
  const flung = (C, x, y, arm) => C.wheels.some((w) => !w.arm === !arm && (x < 0 ? w.cx < C.W / 2 : x > C.W && w.cx > C.W / 2) && y > w.cy - 300 && y < w.cy + 250);

  /* Banen en kule fra Andøya-raketten vil fly (uten andre kuler og bevegelige deler) – forhåndsvisning i designeren */
  function aimPath(C, L) {
    const pts = [];
    let x = L.hx, y = L.hy, vx = L.vx, vy = L.vy, cp = V_LAUNCH;
    const near = (g) => {
      const abx = g.bx - g.ax, aby = g.by - g.ay, l2 = abx * abx + aby * aby;
      let q = l2 ? ((x - g.ax) * abx + (y - g.ay) * aby) / l2 : 0; q = q < 0 ? 0 : q > 1 ? 1 : q;
      return Math.hypot(x - g.ax - abx * q, y - g.ay - aby * q) < R + g.t;
    };
    for (let s = 1; s <= 240 * 4; s++) {
      vy += G * DT; vx *= 1 - AIR * DT;
      const sp = Math.hypot(vx, vy);
      if (sp > cp) { vx *= cp / sp; vy *= cp / sp; } else if (cp > VMAX) cp = sp > VMAX ? sp : VMAX;
      x += vx * DT; y += vy * DT;
      const hit = s > 10 && C.S.some(near);
      if (s % 3 === 0 || hit) pts.push(x, y);
      if (hit || x < -80 || x > C.W + 80 || y > C.H + 60) break;
    }
    return pts;
  }

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
      cap[i] = V_LAUNCH; launchT[i] = t; launchBy[i] = W.arm ? 4 : 1;
      if (Math.hypot(VX[i], VY[i]) > 1100 && t - lastLaunch[i] > 1) { lastLaunch[i] = t; events.push(W.arm ? { t, type: 'launch', i, x: X[i], y: Y[i], arm: 1 } : { t, type: 'launch', i, x: X[i], y: Y[i] }); }
    }
    /* ---- de nye delene (alt her er tomt for løyper uten dem) ---- */
    const NV = C.vortexes.length, NF = C.ferries.length, NK = C.rockets.length, NU = C.tunnels.length, NR = C.reins.length, NL = C.slushes.length;
    const NB = C.bosses.length, bolts = [], bNext = Float64Array.from(C.bosses, (b) => GATE_T + b.phase);
    // fri sikt fra pistolen til kula (ingen vegg eller rampe i veien)
    function clear(x0, y0, x1, y1) {
      const L = Math.hypot(x1 - x0, y1 - y0), m = Math.ceil(Math.max(0, L - R - 10) / 12);
      for (let s = 1; s <= m; s++) {
        const f = (s * 12) / L, px = x0 + (x1 - x0) * f, py = y0 + (y1 - y0) * f;
        const cell = grid.get(key(Math.floor(px / CELL), Math.floor(py / CELL)));
        if (cell) for (const it of cell) if (it.s && segDist(px, py, it.s) < it.s.t + 4) return false;
      }
      return true;
    }
    const fish = [];
    C.racks.forEach((rk) => rk.fish.forEach((f) => fish.push(f)));
    const NFI = fish.length;
    const launchBy = new Uint8Array(n); // 1 = Glimt-hjul, 2 = Andøya-raketten, 3 = Saltstraumen
    const fishT = new Float64Array(n).fill(-Infinity), lastFish = new Float64Array(n).fill(-9), reinT = new Float64Array(n).fill(-9);
    const vIn = new Float64Array(n), vCool = new Float64Array(n), slushIn = new Uint8Array(n * NL);
    const hold = new Int32Array(n), noCatch = new Float64Array(n), loaded = new Int32Array(NK).fill(-1), loadT = new Float64Array(NK);
    const tunOut = new Float64Array(n), tunQ = new Int32Array(n), tunV = new Float64Array(n), noTun = new Float64Array(n);
    const fa = new Float64Array(NFI), fw = new Float64Array(NFI), fst = new Array(NF), rst = new Array(NR), tclosed = new Uint8Array(NU);
    const fth = Float64Array.from(fish, (f) => f.th0), fom = new Float64Array(NFI), fdL = new Float64Array(NFI), frec = fish.map(() => []);
    const dynS = C.seesaws.map((s) => !!s.dyn), anyDyn = dynS.some(Boolean);
    const th = new Float64Array(NS), om = new Float64Array(NS), dL = new Float64Array(NS), srec = C.seesaws.map(() => []);
    // bagasjebåndet: kula tar etter farten til båndet (også oppover)
    function belt(i, s) {
      const rel = VX[i] * s.ux + VY[i] * s.uy - s.belt, k = Math.min(1, 10 * DT);
      VX[i] -= s.ux * rel * k; VY[i] -= s.uy * rel * k;
    }
    // kula som ligger klar i raketten står bom fast; de andre spretter av den
    function pinned(i, j, nx, ny, ov) {
      if (hold[i] && hold[j]) return;
      if (hold[i]) {
        X[j] += nx * ov * 2; Y[j] += ny * ov * 2;
        const vn = VX[j] * nx + VY[j] * ny;
        if (vn < 0) { VX[j] -= (1 + E_MM) * vn * nx; VY[j] -= (1 + E_MM) * vn * ny; }
      } else {
        X[i] -= nx * ov * 2; Y[i] -= ny * ov * 2;
        const vn = VX[i] * nx + VY[i] * ny;
        if (vn > 0) { VX[i] -= (1 + E_MM) * vn * nx; VY[i] -= (1 + E_MM) * vn * ny; }
      }
    }
    let t = 0, step = 0, lastDoneT = -1;
    const active = (i) => state[i] === ST.RACE || state[i] === ST.FIN || (state[i] === ST.OUT && cause[i] !== 'k_orna' && X[i] > -40 && X[i] < C.W + 40 && Y[i] < C.H + 40);

    while (t < T_MAX + 2) {
      const gateOpen = kin.gateOpen(t);
      for (let q = 0; q < NW; q++) wa[q] = kin.wheelAngle(C.wheels[q], t);
      for (let q = 0; q < NS; q++) {
        if (dynS[q]) { sa[q] = th[q]; sr[q] = om[q]; }
        else { sa[q] = kin.seesawAngle(C.seesaws[q], t); sr[q] = kin.seesawRate(C.seesaws[q], t); }
      }
      for (let q = 0; q < NT; q++) topen[q] = kin.trapOpen(C.traps[q], t) ? 1 : 0;
      for (let q = 0; q < NZ; q++) wv[q] = kin.windAccel(C.winds[q], t);
      for (let q = 0; q < NE; q++) claws[q] = C.eagles[q].at(t);
      for (let q = 0; q < NFI; q++) { fa[q] = fth[q]; fw[q] = fom[q]; }
      for (let q = 0; q < NF; q++) fst[q] = kin.ferry(C.ferries[q], t);
      for (let q = 0; q < NR; q++) rst[q] = kin.rein(C.reins[q], t);
      for (let q = 0; q < NU; q++) tclosed[q] = kin.tunnelClosed(C.tunnels[q], t) ? 1 : 0;
      for (let i = 0; i < n; i++) {
        if (state[i] === ST.CARRY) { const cl = claws[carrier[i]]; if (cl) { X[i] = cl.x; Y[i] = cl.y + 24; } else { X[i] = -200; Y[i] = 2500; } continue; }
        if (state[i] === ST.TUNNEL) { // kommer ut av tunnelen igjen
          if (t < tunOut[i]) continue;
          const T = C.tunnels[tunQ[i]];
          state[i] = ST.RACE; X[i] = T.bx + T.dir * 8; Y[i] = T.by - R - 9;
          VX[i] = T.dir * Math.min(650, Math.max(220, tunV[i])); VY[i] = 0; noTun[i] = t + 0.8;
        }
        if (hold[i]) { // ligger klar i Andøya-raketten
          const q = hold[i] - 1, L = C.rockets[q];
          if (state[i] !== ST.RACE) { loaded[q] = -1; hold[i] = 0; }
          else {
            X[i] = L.hx; Y[i] = L.hy; VX[i] = 0; VY[i] = 0;
            if (t - loadT[q] < 0.6) continue;
            loaded[q] = -1; hold[i] = 0; // 3 – 2 – 1 – AVFYR
            VX[i] = L.vx; VY[i] = L.vy; cap[i] = V_LAUNCH; launchT[i] = t; launchBy[i] = 2; noCatch[i] = t + 0.7;
            events.push({ t, type: 'rocket', i, x: L.hx, y: L.hy });
          }
        }
        if (!active(i)) continue;
        VY[i] += G * DT;
        if (state[i] === ST.RACE) {
          for (let q = 0; q < NZ; q++) {
            const Z = C.winds[q];
            if (X[i] > Z.x0 && X[i] < Z.x1 && Y[i] > Z.y0 && Y[i] < Z.y1) { if (Z.dir < 0) VX[i] -= wv[q] * DT; else VX[i] += wv[q] * DT; }
          }
          if (NV) { // Saltstraumen: virvelen drar kula rundt, og spytter den ut igjen etter et par runder
            let inV = false;
            for (let q = 0; q < NV; q++) {
              const V = C.vortexes[q];
              const dx = X[i] - V.x, dy = Y[i] - V.y, d = Math.hypot(dx, dy);
              if (d >= V.r || t < vCool[i]) continue;
              inV = true;
              const ux = d > 0 ? dx / d : 0, uy = d > 0 ? dy / d : -1, tx = -uy * V.dir, ty = ux * V.dir;
              // strømmen: fart rundt (mot 620), litt innover, og sentripetalkraft så kula går i ring
              let vr = VX[i] * ux + VY[i] * uy, vt = VX[i] * tx + VY[i] * ty;
              vt += (620 - vt) * Math.min(1, 6 * DT);
              vr += (-(V.drain ? 50 : 18) - vr) * Math.min(1, 10 * DT);
              vr -= (Math.min(vt * vt, 1e6) / Math.max(d, 25)) * DT;
              VX[i] = ux * vr + tx * vt; VY[i] = uy * vr + ty * vt;
              vIn[i] += DT;
              if (V.drain && d < 18) { // sugd ned i sluket
                state[i] = ST.OUT; tDone[i] = t; cause[i] = 'k_salt'; lastDoneT = t;
                events.push({ t, type: 'out', i, cause: 'k_salt' });
                X[i] = -500; Y[i] = V.y; VX[i] = 0; VY[i] = 0;
                break;
              }
              if (vIn[i] > 1.7 + ((i * 0.618034) % 1)) {
                VX[i] = tx * 1250 + ux * 260; VY[i] = ty * 1250 + uy * 260;
                cap[i] = V_LAUNCH; launchT[i] = t; launchBy[i] = 3; vCool[i] = t + 1.2; vIn[i] = 0;
                events.push({ t, type: 'spit', i, x: X[i], y: Y[i] });
                break;
              }
            }
            if (!inV) vIn[i] = 0;
          }
          for (let q = 0; q < NL; q++) { // slaps: alt går tregt
            const Z = C.slushes[q];
            if (X[i] > Z.x0 && X[i] < Z.x1 && Y[i] > Z.y0 && Y[i] < Z.y1) {
              const k = 1 - 2.4 * DT;
              VX[i] *= k; VY[i] *= k;
              if (!slushIn[i * NL + q]) { slushIn[i * NL + q] = 1; events.push({ t, type: 'slaps', i, x: X[i], y: Y[i] }); }
            }
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
            if (NK && (hold[i] || hold[j])) { pinned(i, j, nx, ny, ov); continue; }
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
          if (it.s) { if (capsule(i, it.s.ax, it.s.ay, it.s.bx, it.s.by, it.s.t, it.s.e, 0, 0) && it.s.kind === 'belt') belt(i, it.s); }
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
          if (Math.abs(X[i] - Pp.px) < Pp.half + 30 && Math.abs(Y[i] - Pp.py) < (dynS[q] ? Pp.half * 0.42 + 40 : 80)) {
            const c = Math.cos(sa[q]), s = Math.sin(sa[q]);
            const ax = Pp.px - c * Pp.half, ay = Pp.py - s * Pp.half, bx = Pp.px + c * Pp.half, by = Pp.py + s * Pp.half;
            const abx = bx - ax, aby = by - ay, l2 = abx * abx + aby * aby;
            let qq = ((X[i] - ax) * abx + (Y[i] - ay) * aby) / l2; qq = qq < 0 ? 0 : qq > 1 ? 1 : qq;
            const qx = ax + abx * qq, qy = ay + aby * qq;
            if (dynS[q]) { // tyngde-vippe: støtet fra kula vrir bjelken motsatt vei
              const vx0 = VX[i], vy0 = VY[i];
              if (capsule(i, ax, ay, bx, by, Pp.t, 0.25, -sr[q] * (qy - Pp.py), sr[q] * (qx - Pp.px))) dL[q] -= (qx - Pp.px) * (VY[i] - vy0) - (qy - Pp.py) * (VX[i] - vx0);
            } else capsule(i, ax, ay, bx, by, Pp.t, 0.25, -sr[q] * (qy - Pp.py), sr[q] * (qx - Pp.px));
          }
        }
        // tørrfiskhjellet: fisken svinger og slår
        for (let q = 0; q < NFI; q++) {
          const F = fish[q];
          if (Math.abs(X[i] - F.px) > F.len + 24 || Y[i] < F.py - 24 || Y[i] > F.py + F.len + 24) continue;
          const ex = F.px + Math.sin(fa[q]) * F.len, ey = F.py + Math.cos(fa[q]) * F.len;
          const abx = ex - F.px, aby = ey - F.py, l2 = abx * abx + aby * aby;
          let qq = ((X[i] - F.px) * abx + (Y[i] - F.py) * aby) / l2; qq = qq < 0 ? 0 : qq > 1 ? 1 : qq;
          const qx = F.px + abx * qq, qy = F.py + aby * qq, vx0 = VX[i], vy0 = VY[i];
          if (capsule(i, F.px, F.py, ex, ey, 7, 0.5, fw[q] * (qy - F.py), -fw[q] * (qx - F.px))) {
            fdL[q] += (qx - F.px) * (VY[i] - vy0) - (qy - F.py) * (VX[i] - vx0); // kula dytter fisken unna
            if (Math.hypot(VX[i] - vx0, VY[i] - vy0) > 220) {
              if (t - lastFish[i] > 0.7) { lastFish[i] = t; events.push({ t, type: 'fish', i, x: X[i], y: Y[i] }); }
              fishT[i] = t;
            }
          }
        }
        // ferga: dekket og bildekk-portene
        for (let q = 0; q < NF; q++) {
          const F = C.ferries[q], s = fst[q];
          if (!s.openA && Math.abs(X[i] - F.barX) < 30 && Y[i] > F.ay - 60 && Y[i] < F.ay + 20) capsule(i, F.barX, F.ay + 6, F.barX, F.ay - 42, 5, 0.2, 0, 0);
          if (Math.abs(X[i] - s.x) > F.hw + 30 || Y[i] < s.y - 64 || Y[i] > s.y + 40) continue;
          const c = Math.cos(s.tilt), sn = Math.sin(s.tilt);
          const ax = s.x - c * F.hw, ay = s.y - sn * F.hw, bx = s.x + c * F.hw, by = s.y + sn * F.hw;
          const abx = bx - ax, aby = by - ay, l2 = abx * abx + aby * aby;
          let qq = ((X[i] - ax) * abx + (Y[i] - ay) * aby) / l2; qq = qq < 0 ? 0 : qq > 1 ? 1 : qq;
          const qx = ax + abx * qq, qy = ay + aby * qq;
          const svx = s.vx - s.rate * (qy - s.y), svy = s.vy + s.rate * (qx - s.x);
          if (capsule(i, ax, ay, bx, by, 7, 0.15, svx, svy)) { // kula blir med båten
            const rel = (VX[i] - svx) * c + (VY[i] - svy) * sn, k = Math.min(1, 3 * DT);
            VX[i] -= c * rel * k; VY[i] -= sn * rel * k;
          }
          if (!s.openA) { const ex = s.x + F.sA * c * F.hw, ey = s.y + F.sA * sn * F.hw; capsule(i, ex, ey, ex, ey - 32, 5, 0.2, s.vx, s.vy); }
          if (!s.openB) { const ex = s.x + F.sB * c * F.hw, ey = s.y + F.sB * sn * F.hw; capsule(i, ex, ey, ex, ey - 32, 5, 0.2, s.vx, s.vy); }
        }
        // reinen står i veien
        for (let q = 0; q < NR; q++) {
          const s = rst[q];
          if (s.away || Math.abs(X[i] - s.x) > 60 || Math.abs(Y[i] - (s.y - 30)) > 56) continue;
          const vx0 = VX[i], vy0 = VY[i];
          if (capsule(i, s.x - 16, s.y - 30, s.x + 16, s.y - 30, 18, 0.3, s.vx, s.vy) && Math.hypot(VX[i] - vx0, VY[i] - vy0) > 90 && t - reinT[i] > 1.5) {
            reinT[i] = t;
            events.push({ t, type: 'rein', i, x: s.x, y: s.y - 50 });
          }
        }
        // steinras foran tunnelåpningen
        for (let q = 0; q < NU; q++) if (tclosed[q]) { const T = C.tunnels[q]; capsule(i, T.mx, T.my, T.mx, T.my, 16, 0.3, 0, 0); }
      }
      // tyngde-vippene svarer på støtene fra kulene
      if (anyDyn) for (let q = 0; q < NS; q++) {
        if (!dynS[q]) continue;
        const Pp = C.seesaws[q];
        om[q] += (dL[q] - (Pp.k * th[q] + Pp.c * om[q]) * DT) / Pp.I;
        th[q] += om[q] * DT;
        if (th[q] > Pp.max) { th[q] = Pp.max; if (om[q] > 0) om[q] *= -0.2; }
        else if (th[q] < -Pp.max) { th[q] = -Pp.max; if (om[q] < 0) om[q] *= -0.2; }
        dL[q] = 0;
      }
      // tørrfisken: tyngde, vind og støt fra kulene
      for (let q = 0; q < NFI; q++) {
        const F = fish[q];
        fom[q] += ((-F.kg * Math.sin(fth[q]) - F.c * fom[q] + F.drive * Math.sin(F.wd * t + F.ph)) * DT + fdL[q]) / F.I;
        fth[q] += fom[q] * DT;
        if (fth[q] > 1.35) { fth[q] = 1.35; if (fom[q] > 0) fom[q] *= -0.3; }
        else if (fth[q] < -1.35) { fth[q] = -1.35; if (fom[q] < 0) fom[q] *= -0.3; }
        fdL[q] = 0;
      }
      // Sjefen sikter på nærmeste kule foran seg (litt foran den) og skyter
      for (let q = 0; q < NB; q++) {
        const Bq = C.bosses[q];
        if (t < bNext[q]) continue;
        const seen = [];
        for (let i = 0; i < n; i++) {
          if (state[i] !== ST.RACE || hold[i]) continue;
          const dx = X[i] - Bq.gx, dy = Y[i] - Bq.gy;
          if (Bq.dir * dx < 15 || Math.abs(dy) > Math.abs(dx) * 2 + 40) continue;
          const d = Math.hypot(dx, dy);
          if (d <= Bq.range) seen.push([d, i]);
        }
        seen.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        let best = -1, bd = Infinity;
        for (const [d, i] of seen.slice(0, 6)) if (clear(Bq.gx, Bq.gy, X[i], Y[i])) { best = i; bd = d; break; } // bare kuler han ser
        if (best < 0) { bNext[q] = t + 0.2; continue; }
        const tf = bd / BOLT_V, tx = X[best] + VX[best] * tf - Bq.gx, ty = Y[best] + VY[best] * tf - Bq.gy, tl = Math.hypot(tx, ty) || 1;
        const shot = { t0: t, x: Bq.gx, y: Bq.gy, vx: (tx / tl) * BOLT_V, vy: (ty / tl) * BOLT_V, t1: t + Bq.range / BOLT_V + 0.05, q };
        Bq.shots.push(shot); bolts.push(shot);
        events.push({ t, type: 'shot', q, x: Bq.gx, y: Bq.gy });
        bNext[q] = t + Bq.cd;
      }
      // strålene flyr rett fram og stopper i første kule, vegg eller rampe
      for (let k = bolts.length - 1; k >= 0; k--) {
        const s = bolts[k], bx = s.x + s.vx * (t - s.t0), by = s.y + s.vy * (t - s.t0);
        let done = t >= s.t1;
        if (!done) for (let i = 0; i < n; i++) {
          if (state[i] !== ST.RACE || hold[i] || Math.abs(X[i] - bx) > R + 8 || Math.abs(Y[i] - by) > R + 8 || Math.hypot(X[i] - bx, Y[i] - by) > R + 7) continue;
          if (C.bosses[s.q].zap) { // fordampet
            state[i] = ST.OUT; tDone[i] = t; cause[i] = 'k_sjef'; lastDoneT = t;
            events.push({ t, type: 'out', i, cause: 'k_sjef' });
            X[i] = -500; VX[i] = 0; VY[i] = 0;
          } else { // dyttet av gårde (kraften velges i designeren, litt løft oppover følger med)
            const Fp = C.bosses[s.q].force;
            VX[i] += (s.vx / BOLT_V) * Fp; VY[i] += (s.vy / BOLT_V) * Fp - (Fp * 260) / 900;
            cap[i] = V_LAUNCH; launchT[i] = t; launchBy[i] = 5;
            events.push({ t, type: 'zapped', i, x: X[i], y: Y[i] });
          }
          s.hit = i; done = true;
          break;
        }
        if (!done) {
          const cell = grid.get(key(Math.floor(bx / CELL), Math.floor(by / CELL)));
          if (cell) for (const it of cell) if (it.s && segDist(bx, by, it.s) < it.s.t + 4) { done = true; break; }
        }
        if (done) { s.t1 = Math.min(s.t1, t); bolts.splice(k, 1); }
      }
      // ørna, sensorer, mål og fall ut av verden
      for (let i = 0; i < n; i++) {
        if (state[i] !== ST.RACE) continue;
        let got = false;
        for (let q = 0; q < NE; q++) {
          const cl = claws[q];
          if (cl && cl.p > 0.3 && cl.p < 0.75 && !grabbed[q].has(cl.k) && Math.hypot(X[i] - cl.x, Y[i] - cl.y) < R + C.eagles[q].reach) {
            if (hold[i]) { loaded[hold[i] - 1] = -1; hold[i] = 0; } // ørna tok kula rett fra raketten
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
        if (state[i] === ST.RACE && NU) for (let q = 0; q < NU; q++) { // inn i tunnelen (hvis den ikke er stengt)
          const T = C.tunnels[q];
          if (!tclosed[q] && t >= noTun[i] && Math.hypot(X[i] - T.mx, Y[i] - T.my) < 24) {
            if (hold[i]) { loaded[hold[i] - 1] = -1; hold[i] = 0; }
            state[i] = ST.TUNNEL; tunQ[i] = q; tunOut[i] = t + T.transit; tunV[i] = Math.hypot(VX[i], VY[i]);
            events.push({ t, type: 'tunnel', i, x: T.mx, y: T.my });
            X[i] = T.mx; Y[i] = -99999; VX[i] = 0; VY[i] = 0; // gjemt mens den kjører gjennom fjellet
            break;
          }
        }
        if (state[i] === ST.RACE && NK && !hold[i]) for (let q = 0; q < NK; q++) { // raketten lastes
          const L = C.rockets[q];
          if (loaded[q] < 0 && t >= noCatch[i] && Math.hypot(X[i] - L.hx, Y[i] - L.hy) < 22) { loaded[q] = i; loadT[q] = t; hold[i] = q + 1; X[i] = L.hx; Y[i] = L.hy; VX[i] = 0; VY[i] = 0; break; }
        }
        if (state[i] === ST.RACE && (X[i] < -30 || X[i] > C.W + 30 || Y[i] > C.H)) {
          const lb = t - launchT[i] < 6 ? launchBy[i] : 0;
          state[i] = ST.OUT; tDone[i] = t; lastDoneT = t;
          cause[i] = lb === 2 ? 'k_rakett' : lb === 3 ? 'k_salt' : lb === 4 ? 'k_arm' : lb === 5 ? 'k_sjef' : (flung(C, X[i], Y[i]) || lb === 1) ? 'k_glimt'
            : flung(C, X[i], Y[i], true) ? 'k_arm' : t - fishT[i] < 3 ? 'k_fisk' : 'k_kant';
          events.push({ t, type: 'out', i, cause: cause[i] });
        }
      }
      if (step % REC === 0) {
        const fr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { fr[i * 3] = X[i]; fr[i * 3 + 1] = Y[i]; fr[i * 3 + 2] = ANG[i]; }
        frames.push(fr);
        if (anyDyn) for (let q = 0; q < NS; q++) if (dynS[q]) srec[q].push(th[q]);
        for (let q = 0; q < NFI; q++) frec[q].push(fth[q]);
      }
      t += DT; step++;
      let racing = 0;
      for (let i = 0; i < n; i++) if (state[i] === ST.RACE || state[i] === ST.TUNNEL) racing++;
      if (!racing && t > lastDoneT + 2) break;
      if (t >= T_MAX && racing) {
        for (let i = 0; i < n; i++) if (state[i] === ST.RACE || state[i] === ST.TUNNEL) { state[i] = ST.OUT; tDone[i] = t; cause[i] = 'k_fast'; events.push({ t, type: 'out', i, cause: 'k_fast' }); }
        lastDoneT = t;
      }
    }
    C.seesaws.forEach((s, q) => { if (dynS[q]) s.rec = Float32Array.from(srec[q]); });
    fish.forEach((f, q) => { f.rec = Float32Array.from(frec[q]); });
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
      if (share('k_salt') > 0.2) reasons.push('Tips: Saltstraumen tar mange. Gjør virvelen mindre, flytt den, eller skru av sluket.');
      if (share('k_ferje') > 0.15) reasons.push('Tips: mange rekker ikke ferga. La rampene ende rett ved kaiene, og la ferga gå litt saktere.');
      if (share('k_rakett') > 0.15) reasons.push('Tips: raketten skyter mange ut i verdensrommet. Senk kraften eller sikt bedre – designeren viser banen.');
      if (share('k_fisk') > 0.15) reasons.push('Tips: tørrfisken slår mange ut av løypa. Sett opp vegger ved hjellet.');
      if (share('k_arm') > 0.15) reasons.push('Tips: Glimt-armen slår mange ut av løypa. Sett opp vegger rundt den, eller skru ned farten.');
      if (share('k_sjef') > 0.15) reasons.push('Tips: Sjefen tar mange. Gi ham kortere rekkevidde, la ham bare dytte, eller sett opp en vegg foran ham.');
    }
    return { ok: !reasons.length, rate, minRate, winT: Number.isFinite(winT) ? winT : null, firstT: Number.isFinite(firstT) ? firstT : null, causes, reasons, runs: runs.length, marbles: tot, need };
  }

  FL.KPhys = { R, GATE_T, T_MAX, ST, WORLD_W, W_FAST, W_MAX, TYPES, LIMITS, ORIGINAL, course, compile, normalize, sanePiece, hash, kin, simulate, race, summarize, assess, aimPath };
})();
