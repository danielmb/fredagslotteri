/* Fredagslotteriet – «Keiservarden Grand Prix»: egen liten fysikkmotor for kuler + løypa ned fjellet.
   Hele løpet simuleres først (deterministisk, med seed), og spilles deretter av. */
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
  const ST = { RACE: 0, FIN: 1, OUT: 2, CARRY: 3 };

  /* ---------- Løypa (verden 1600 × 3500, y nedover) ---------- */
  function course(seed) {
    const rnd = u.mulberry32((seed ^ 0x5eed) >>> 0);
    const S = [];
    const seg = (ax, ay, bx, by, o = {}) => S.push({ ax, ay, bx, by, t: o.t || 7, e: o.e == null ? 0.3 : o.e, kind: o.kind || 'track' });
    // Start: trakt på toppen av Keiservarden
    seg(470, 40, 740, 300, { kind: 'hopper' }); seg(1130, 40, 860, 300, { kind: 'hopper' });
    seg(470, 40, 470, -60, { kind: 'hopper' }); seg(1130, 40, 1130, -60, { kind: 'hopper' });
    // Utforkjøring 1 → høyre
    seg(610, 262, 610, 346, { kind: 'wall' });
    seg(612, 340, 1460, 518);
    seg(1500, 400, 1500, 600, { kind: 'wall' }); seg(1550, 380, 1550, 640, { kind: 'wall' });
    // Utforkjøring 2 → venstre, inn i Glimt-hjulet
    seg(1530, 610, 330, 862);
    seg(380, 880, 380, 1075, { kind: 'wall' });
    seg(100, 780, 100, 1162, { kind: 'wall' });
    seg(100, 780, 250, 752, { kind: 'wall' });
    // Utforkjøring 3: Bodø-vind og hoppet over Juvet
    seg(100, 1160, 900, 1332);
    seg(1010, 1405, 1480, 1470);
    seg(1520, 1280, 1520, 1500, { kind: 'wall' }); seg(1552, 1300, 1552, 1565, { kind: 'wall' });
    seg(898, 1342, 898, 1540, { kind: 'pit' }); seg(1010, 1412, 1010, 1540, { kind: 'pit' }); seg(898, 1540, 1010, 1540, { kind: 'pit' });
    // Utforkjøring 4 → venstre, ned i Hurtigruta-feltet
    seg(1545, 1555, 300, 1810);
    seg(100, 1700, 100, 2292, { kind: 'wall' }); seg(780, 1850, 780, 2292, { kind: 'wall' });
    seg(100, 2290, 398, 2374); seg(780, 2290, 482, 2374);
    const pegs = [], bumpers = [];
    for (let row = 0; row < 7; row++) {
      const y = 1870 + row * 56, off = row % 2 ? 32 : 0;
      for (let x = 150 + off; x <= 740; x += 64) {
        if (Math.hypot(x - 300, y - 2020) < 60 || Math.hypot(x - 560, y - 2130) < 60) continue;
        pegs.push({ x, y, r: 7 });
      }
    }
    bumpers.push({ x: 300, y: 2020, r: 26, kick: 520 }, { x: 560, y: 2130, r: 26, kick: 520 });
    // Polarsirkel-vippa → to veier. Venstre: lang og trygg
    seg(300, 2552, 124, 2604);
    seg(70, 2510, 70, 2685, { kind: 'wall' });
    seg(80, 2680, 1180, 2900);
    // Høyre: kort, men med Ørnes-luka
    seg(600, 2552, 860, 2600);
    seg(960, 2619, 1180, 2660);
    seg(860, 2606, 860, 2770, { kind: 'pit' }); seg(960, 2626, 960, 2770, { kind: 'pit' }); seg(860, 2770, 960, 2770, { kind: 'pit' });
    seg(1240, 2510, 1240, 2970, { kind: 'wall' });
    // Utforkjøring 7: Ørna jakter
    seg(1252, 2990, 200, 3200);
    seg(90, 3020, 90, 3302, { kind: 'wall' });
    // Sjøgata → mål i Bodø havn
    seg(100, 3300, 1360, 3470);
    seg(1330, 3580, 1560, 3610); seg(1582, 3360, 1582, 3625, { kind: 'wall' }); seg(1328, 3540, 1328, 3586, { kind: 'wall' });

    const gate = { ax: 740, ay: 300, bx: 860, by: 300, t: 7 };
    const wheel = { cx: 240, cy: 1000, len: 106, w: 2.2, arms: 4, t: 8, a0: rnd() * 6.28 };
    const seesaw = { px: 440, py: 2472, half: 150, amp: 0.2, period: 3.2, phase: rnd() * 3.2, t: 8 };
    const trap = { ax: 862, ay: 2601, bx: 958, by: 2619, t: 7, period: 2.6, phase: rnd() * 2.6, openFrom: 1.7, openTo: 2.45 };
    const gusts = [];
    for (let t = 5 + rnd() * 3; t < T_MAX; t += 2.6 + rnd() * 3.2) gusts.push({ t0: t, t1: t + 0.9 + rnd() * 0.5, a: 300 + rnd() * 240 });
    const wind = { x0: 680, y0: 1180, x1: 1010, y1: 1420, base: 0, gusts };
    const swoops = [];
    for (let t = 14 + rnd() * 4; t < T_MAX; t += 4.2 + rnd() * 3) swoops.push(t);
    const y7 = (x) => 2990 + ((1252 - x) * 210) / 1052;
    const eagle = {
      swoops, dur: 1.8, reach: 20,
      at(t) { // klo-posisjon i et pågående stup, ellers null
        for (const t0 of swoops) {
          if (t >= t0 && t <= t0 + this.dur) {
            const p = (t - t0) / this.dur;
            const x = 1380 - p * 1280;
            const y = y7(x) - 16 - 250 * Math.pow(1 - Math.sin(p * Math.PI), 1.3);
            return { x, y, p, k: t0 };
          }
        }
        return null;
      },
    };
    const sensors = [
      { x0: 905, y0: 1398, x1: 1003, y1: 1537, cause: 'k_vind' },
      { x0: 867, y0: 2628, x1: 953, y1: 2767, cause: 'k_ornes' },
    ];
    const finish = { x0: 1290, y0: 3330, x1: 1330, y1: 3560 };
    const zones = [{ x0: 95, y0: 780, x1: 390, y1: 1160, zone: 'k_glimt' }];
    const signs = [
      { x: 300, y: 110, text: 'KEISERVARDEN · 366 MOH' },
      { x: 470, y: 840, text: 'GLIMT-HJULET' },
      { x: 760, y: 1150, text: 'BODØ-VIND' },
      { x: 955, y: 1575, text: 'JUVET' },
      { x: 880, y: 1850, text: 'HURTIGRUTA-TUT' },
      { x: 660, y: 2430, text: 'POLARSIRKEL-VIPPA' },
      { x: 910, y: 2810, text: 'ØRNES ↓' },
      { x: 980, y: 2950, text: 'ØRNA JAKTER' },
      { x: 640, y: 3520, text: 'SJØGATA' },
    ];
    return { S, pegs, bumpers, gate, wheel, seesaw, trap, wind, eagle, sensors, finish, zones, signs, W: 1600, H: 3720 };
  }

  /* Tilstander som avhenger av tid (brukes både i simulering og tegning) */
  const kin = {
    gateOpen: (t) => t >= GATE_T,
    wheelAngle: (C, t) => C.wheel.a0 + C.wheel.w * t,
    seesawAngle: (C, t) => C.seesaw.amp * Math.sin((2 * Math.PI * (t + C.seesaw.phase)) / C.seesaw.period),
    seesawRate: (C, t) => C.seesaw.amp * ((2 * Math.PI) / C.seesaw.period) * Math.cos((2 * Math.PI * (t + C.seesaw.phase)) / C.seesaw.period),
    trapOpen: (C, t) => { const ph = (t + C.trap.phase) % C.trap.period; return ph >= C.trap.openFrom && ph <= C.trap.openTo; },
    windAccel: (C, t) => { let a = C.wind.base; for (const g of C.wind.gusts) if (t >= g.t0 && t <= g.t1) { a += g.a * Math.sin(((t - g.t0) / (g.t1 - g.t0)) * Math.PI); break; } return a; },
  };

  /* ---------- Simulering ---------- */
  function simulate(n, seed) {
    const C = course(seed);
    const rnd = u.mulberry32(seed >>> 0);
    const X = new Float64Array(n), Y = new Float64Array(n), VX = new Float64Array(n), VY = new Float64Array(n), ANG = new Float64Array(n);
    const state = new Uint8Array(n), tDone = new Float64Array(n).fill(-1), cause = new Array(n).fill(null), zone = new Array(n).fill(null);
    // startposisjoner i trakta, fra bunnen og opp
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    let k = 0;
    for (let y = 276; k < n && y > -40; y -= 2 * R + 3) {
      const yy = Math.max(y, 40);
      const xl = 470 + (yy - 40) * (270 / 260) + R + 9, xr = 1130 - (yy - 40) * (270 / 260) - R - 9;
      for (let x = xl; x <= xr && k < n; x += 2 * R + 3) { const i = order[k++]; X[i] = x + (rnd() - 0.5) * 3; Y[i] = y + (rnd() - 0.5) * 3; VX[i] = (rnd() - 0.5) * 40; }
    }
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
    const lastBump = new Float64Array(n).fill(-9);
    let t = 0, step = 0, lastDoneT = -1, grabbedSwoop = new Set();
    const active = (i) => state[i] === ST.RACE || state[i] === ST.FIN || (state[i] === ST.OUT && cause[i] !== 'k_orna' && X[i] > -40 && X[i] < 1640 && Y[i] < 3760);

    while (t < T_MAX + 2) {
      const gateOpen = kin.gateOpen(t);
      const wa = kin.wheelAngle(C, t), sa = kin.seesawAngle(C, t), sr = kin.seesawRate(C, t), trapOpen = kin.trapOpen(C, t), wind = kin.windAccel(C, t);
      const claw = C.eagle.at(t);
      for (let i = 0; i < n; i++) {
        if (state[i] === ST.CARRY) { if (claw) { X[i] = claw.x; Y[i] = claw.y + 24; } else { X[i] = -200; Y[i] = 2500; } continue; }
        if (!active(i)) continue;
        VY[i] += G * DT;
        if (state[i] === ST.RACE && X[i] > C.wind.x0 && X[i] < C.wind.x1 && Y[i] > C.wind.y0 && Y[i] < C.wind.y1) VX[i] -= wind * DT;
        const damp = 1 - (contact[i] ? ROLL : AIR) * DT;
        VX[i] *= damp; VY[i] *= contact[i] ? damp : 1;
        const sp = Math.hypot(VX[i], VY[i]);
        if (sp > VMAX) { VX[i] *= VMAX / sp; VY[i] *= VMAX / sp; }
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
        if (!gateOpen) capsule(i, C.gate.ax, C.gate.ay, C.gate.bx, C.gate.by, C.gate.t, 0.2, 0, 0);
        if (!trapOpen) capsule(i, C.trap.ax, C.trap.ay, C.trap.bx, C.trap.by, C.trap.t, 0.25, 0, 0);
        // Glimt-hjulet
        const W = C.wheel;
        if (Math.hypot(X[i] - W.cx, Y[i] - W.cy) < W.len + R + W.t + 4) {
          for (let a = 0; a < W.arms; a++) {
            const ang = wa + (a * Math.PI * 2) / W.arms, ex = W.cx + Math.cos(ang) * W.len, ey = W.cy + Math.sin(ang) * W.len;
            const abx = ex - W.cx, aby = ey - W.cy, l2 = abx * abx + aby * aby;
            let q = ((X[i] - W.cx) * abx + (Y[i] - W.cy) * aby) / l2; q = q < 0 ? 0 : q > 1 ? 1 : q;
            const qx = W.cx + abx * q, qy = W.cy + aby * q;
            capsule(i, W.cx, W.cy, ex, ey, W.t, 0.35, -W.w * (qy - W.cy), W.w * (qx - W.cx));
          }
        }
        // Polarsirkel-vippa
        const P = C.seesaw;
        if (Math.abs(X[i] - P.px) < P.half + 30 && Math.abs(Y[i] - P.py) < 80) {
          const c = Math.cos(sa), s = Math.sin(sa);
          const ax = P.px - c * P.half, ay = P.py - s * P.half, bx = P.px + c * P.half, by = P.py + s * P.half;
          const abx = bx - ax, aby = by - ay, l2 = abx * abx + aby * aby;
          let q = ((X[i] - ax) * abx + (Y[i] - ay) * aby) / l2; q = q < 0 ? 0 : q > 1 ? 1 : q;
          const qx = ax + abx * q, qy = ay + aby * q;
          capsule(i, ax, ay, bx, by, P.t, 0.25, -sr * (qy - P.py), sr * (qx - P.px));
        }
      }
      // ørna, sensorer, mål og fall ut av verden
      for (let i = 0; i < n; i++) {
        if (state[i] !== ST.RACE) continue;
        if (claw && claw.p > 0.3 && claw.p < 0.75 && !grabbedSwoop.has(claw.k) && Math.hypot(X[i] - claw.x, Y[i] - claw.y) < R + C.eagle.reach) {
          grabbedSwoop.add(claw.k); state[i] = ST.CARRY; tDone[i] = t; cause[i] = 'k_orna'; lastDoneT = t;
          events.push({ t, type: 'out', i, cause: 'k_orna' });
          continue;
        }
        const f = C.finish;
        if (X[i] > f.x0 && X[i] < f.x1 && Y[i] > f.y0 && Y[i] < f.y1) { state[i] = ST.FIN; tDone[i] = t; lastDoneT = t; events.push({ t, type: 'finish', i }); continue; }
        for (const s of C.sensors) if (X[i] > s.x0 && X[i] < s.x1 && Y[i] > s.y0 && Y[i] < s.y1) { state[i] = ST.OUT; tDone[i] = t; cause[i] = s.cause; lastDoneT = t; events.push({ t, type: 'out', i, cause: s.cause }); break; }
        if (state[i] === ST.RACE && (X[i] < -30 || X[i] > 1630 || Y[i] > 3720)) { state[i] = ST.OUT; tDone[i] = t; cause[i] = X[i] < 0 && Y[i] > 700 && Y[i] < 1250 ? 'k_glimt' : 'k_kant'; lastDoneT = t; events.push({ t, type: 'out', i, cause: cause[i] }); }
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
    return { C, n, seed, frames, fps: 240 / REC, events, rank: fin.concat(out), finishers: fin.length, tDone, cause, duration: t };
  }

  /* Kjør med nye seeds til minst «need» kuler kommer i mål (løypa er den samme, bare starten varierer) */
  function race(n, seed, need) {
    let best = null;
    for (let k = 0; k < 8; k++) {
      const res = simulate(n, (seed + k * 7919) >>> 0);
      if (!best || res.finishers > best.finishers) best = res;
      if (res.finishers >= need) return res;
    }
    return best;
  }

  FL.KPhys = { R, GATE_T, T_MAX, ST, course, kin, simulate, race };
})();
