/* Fredagslotteriet – Keiservarden GP: felles tegning av løypa (brukes av spillet og løypedesigneren).
   Alt tegnes i verdenskoordinater ut fra den kompilerte løypa (FL.KPhys.compile). */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u, P = FL.KPhys;
  const R = P.R;
  const EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  const darker = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (c) => Math.round(c * k); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };

  function stars(seed = 42) { const r = u.mulberry32(seed); return Array.from({ length: 120 }, () => [r(), r() * 0.8, 0.4 + r() * 1.2, r() * 6]); }

  /* Himmelen kan velges i designeren (natt er standard): farger på himmel og fjell, stjerner og sol */
  const SKY = {
    natt: { g: ['#02060f', '#081530', '#122347'], deep: '#0c1a34', star: 1, mtn: ['#2a3a5c', '#16233b', '#0f1a2c', '#0b1422'] },
    skumring: { g: ['#140d33', '#46285e', '#c0624f'], deep: '#56306a', star: 0.6, mtn: ['#3d3058', '#2b2244', '#201a35', '#181328'] },
    dag: { g: ['#2f6fc2', '#6ea7e2', '#c4e3f7'], deep: '#7fb4e8', star: 0, mtn: ['#8ea4c0', '#6f86a3', '#596d87', '#485970'], sun: ['#fff6cf', 0.82, 0.14, 38] },
    sol: { g: ['#22305f', '#b8655e', '#ffc977'], deep: '#cf7a60', star: 0.12, mtn: ['#4d3f5c', '#3b3049', '#2d253a', '#221c2c'], sun: ['#ffd27a', 0.72, 0.3, 54] },
    storm: { g: ['#06080c', '#141921', '#222934'], deep: '#1a2029', star: 0, mtn: ['#2d333d', '#22272f', '#1a1e25', '#14171c'], flash: 1 },
  };
  const lookOf = (C) => (C && C.look) || {};
  const skyOf = (C) => SKY[lookOf(C).sky] || SKY.natt;

  /* Himmel, stjerner og nordlys – i skjermkoordinater */
  function sky(ctx, cw, ch, v, time, st, C) {
    const S = skyOf(C);
    const g = ctx.createLinearGradient(0, 0, 0, ch);
    const deep = u.clamp((v.y - (C.start.y - 300)) / Math.max(400, C.H - 320), 0, 1);
    g.addColorStop(0, S.g[0]); g.addColorStop(0.6, deep > 0.85 ? S.deep : S.g[1]); g.addColorStop(1, S.g[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    if (S.star) for (const [x, y, r, ph] of st) { ctx.globalAlpha = (0.35 + 0.35 * Math.sin(time * 1.3 + ph)) * (1 - deep * 0.6) * S.star; ctx.fillStyle = '#fff'; ctx.fillRect(x * cw, y * ch - (v.y * 0.03) % ch, r, r); }
    ctx.globalAlpha = 1;
    if (S.sun) { // sola (midnattssola står lavt)
      const [c, sx, sy, r] = S.sun, x = sx * cw, y = sy * ch - v.y * 0.02;
      const gl = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 3.2);
      gl.addColorStop(0, c); gl.addColorStop(0.3, 'rgba(255,230,160,.25)'); gl.addColorStop(1, 'rgba(255,230,160,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    if (lookOf(C).aur === 0) return;
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = k === 1 ? 'rgba(138,125,255,.07)' : 'rgba(94,242,181,.08)'; ctx.lineWidth = 60 + k * 30;
      ctx.beginPath();
      const yy = ch * (0.18 + k * 0.08) - v.y * 0.02;
      ctx.moveTo(-50, yy + Math.sin(time * 0.3 + k) * 20);
      ctx.bezierCurveTo(cw * 0.3, yy - 60 + Math.sin(time * 0.4 + k * 2) * 30, cw * 0.6, yy + 50, cw + 50, yy - 20 + Math.cos(time * 0.35) * 25);
      ctx.stroke();
    }
  }

  /* Fjellet – toppen står alltid over startporten */
  function mountain(ctx, C) {
    if (lookOf(C).mtn === 0) return;
    const m = skyOf(C).mtn;
    const dx = C.start.x - 800, dy = C.start.y - 300, bot = C.H - 20;
    const g = ctx.createLinearGradient(0, -200 + dy, 0, bot);
    g.addColorStop(0, m[0]); g.addColorStop(0.08, m[1]); g.addColorStop(0.6, m[2]); g.addColorStop(1, m[3]);
    ctx.fillStyle = g;
    if (dx) ctx.fillRect(-1400, 700 + dy, 4400, bot - 700 - dy);
    ctx.beginPath();
    ctx.moveTo(-600 + dx, bot); ctx.lineTo(-600 + dx, 600 + dy); ctx.lineTo(120 + dx, 120 + dy); ctx.lineTo(420 + dx, -40 + dy); ctx.lineTo(800 + dx, -170 + dy);
    ctx.lineTo(1180 + dx, -40 + dy); ctx.lineTo(1500 + dx, 140 + dy); ctx.lineTo(2200 + dx, 700 + dy); ctx.lineTo(2200 + dx, bot); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(235,242,255,.85)';
    ctx.beginPath(); ctx.moveTo(800 + dx, -170 + dy); ctx.lineTo(880 + dx, -110 + dy); ctx.lineTo(840 + dx, -100 + dy); ctx.lineTo(790 + dx, -120 + dy); ctx.lineTo(730 + dx, -96 + dy); ctx.lineTo(700 + dx, -110 + dy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.03)';
    const nE = Math.floor((C.H - 300) / 190);
    for (let k = 0; k < nE; k++) { const y = 200 + k * 190 + dy; ctx.beginPath(); ctx.ellipse(800 + dx + Math.sin(k * 7.3) * 600, y, 160 + (k % 3) * 60, 30, Math.sin(k) * 0.4, 0, Math.PI * 2); ctx.fill(); }
  }

  /* Bodø ved målet: byen, havna, kaia og BODØ-skiltet */
  function city(ctx, C, v) {
    const F = C.fin;
    if (v.y + v.h < F.y - 180 || lookOf(C).city === 0) return;
    ctx.fillStyle = '#0a1a2e'; ctx.fillRect(-400, F.y + 288, 2400, 400);
    ctx.fillStyle = 'rgba(255,214,140,.10)'; for (let k = 0; k < 10; k++) ctx.fillRect(200 + k * 130, F.y + 300 + (k % 3) * 18, 70, 3);
    const r = u.mulberry32(77);
    for (let x = -300; x < F.x + 10; x += 46 + r() * 30) {
      const h = 60 + r() * 120, w = 38 + r() * 26;
      ctx.fillStyle = r() < 0.5 ? '#14203a' : '#1a2742'; ctx.fillRect(x, F.y + 280 - h, w, h);
      ctx.fillStyle = '#ffd27a';
      for (let wy = F.y + 280 - h + 8; wy < F.y + 270; wy += 14) for (let wx = x + 6; wx < x + w - 8; wx += 11) if (r() < 0.4) { ctx.globalAlpha = 0.5 + r() * 0.5; ctx.fillRect(wx, wy, 5, 6); }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#e9e4da'; ctx.fillRect(F.x + 90, F.y + 300, 220, 26); ctx.fillStyle = '#15181d'; ctx.fillRect(F.x + 80, F.y + 322, 250, 22); ctx.fillStyle = '#c62828'; ctx.fillRect(F.x + 180, F.y + 272, 22, 28);
    // BODØ-skiltet står på stolper over målkurva, så kulene som lander ikke dekker det
    ctx.fillStyle = '#2a3346'; ctx.fillRect(F.x + 104, F.y + 108, 6, 142); ctx.fillRect(F.x + 222, F.y + 108, 6, 142);
    const town = lookOf(C).town || 'BODØ';
    ctx.font = '900 64px Fraunces, Georgia, serif';
    const tw = ctx.measureText(town).width;
    if (tw > 220) ctx.font = `900 ${Math.max(22, Math.floor((64 * 220) / tw))}px Fraunces, Georgia, serif`; // lange navn krymper så de får plass over målet
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff6dc'; ctx.shadowColor = 'rgba(246,189,71,.8)'; ctx.shadowBlur = 18;
    ctx.fillText(town, F.x + 166, F.y + 104); ctx.shadowBlur = 0;
  }

  /* Pynt og bakgrunn fra designeren (kulene merker dem ikke) */
  function deco(ctx, d, ox = 0, oy = 0) {
    ctx.save(); ctx.translate(d.x + ox, d.y + oy);
    if (d.ang) ctx.rotate((d.ang * Math.PI) / 180);
    if (d.flip) ctx.scale(-1, 1);
    ctx.font = `${d.size}px ${EMOJI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f3ecdf';
    ctx.fillText(d.ico, 0, d.size * 0.06);
    ctx.restore();
  }
  function shape(ctx, s) {
    ctx.save(); ctx.globalAlpha = s.alpha / 100; ctx.fillStyle = s.col;
    if (s.round) { ctx.beginPath(); ctx.ellipse((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, (s.x1 - s.x0) / 2, (s.y1 - s.y0) / 2, 0, 0, Math.PI * 2); ctx.fill(); }
    else ctx.fillRect(s.x0, s.y0, s.x1 - s.x0, s.y1 - s.y0);
    ctx.restore();
  }
  /* Vær over hele bildet: snø eller regn (fast mønster i bildet), og lyn når himmelen er storm */
  function weather(ctx, C, v, time) {
    const L = lookOf(C), k0 = v.h / 900;
    if (L.wx === 'regn') {
      ctx.strokeStyle = 'rgba(170,195,230,.3)'; ctx.lineWidth = 2 * k0; ctx.beginPath();
      for (let k = 0; k < 140; k++) {
        const x = v.x + ((k * 137.5 + time * 120) % (v.w + 200)) - 100, y = v.y + ((k * 499.1 + time * 1100 * k0) % (v.h + 160)) - 80;
        ctx.moveTo(x, y); ctx.lineTo(x - 8 * k0, y + 30 * k0);
      }
      ctx.stroke();
    } else if (L.wx === 'sno') {
      ctx.fillStyle = 'rgba(240,246,255,.75)';
      for (let k = 0; k < 130; k++) {
        const sp = 0.6 + (k % 5) * 0.15, x = v.x + ((k * 97.3 + Math.sin(time * 0.8 + k) * 30 + time * 18) % (v.w + 60)) - 30;
        const y = v.y + ((k * 268.7 + time * 70 * sp * k0) % (v.h + 40)) - 20;
        ctx.beginPath(); ctx.arc(x, y, (1.4 + (k % 3)) * k0, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (skyOf(C).flash) { // lyn: av og til blinker det hvitt
      const f = Math.sin(time * 0.9) * Math.sin(time * 2.7 + 1);
      if (f > 0.93) { ctx.fillStyle = `rgba(220,230,255,${((f - 0.93) * 2.2).toFixed(3)})`; ctx.fillRect(v.x, v.y, v.w, v.h); }
    }
  }

  /* Fartsstripe bak en kule som flyr fortere enn den kan trille (skutt ut av et Glimt-hjul) */
  function trail(ctx, x0, y0, x1, y1, color) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    if (d < 95 || d > 420) return; // vanlig fart eller et hopp i opptaket
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,240,190,.35)'); g.addColorStop(1, color);
    ctx.save();
    ctx.globalAlpha = 0.75; ctx.strokeStyle = g; ctx.lineCap = 'round'; ctx.lineWidth = R * 1.5;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.restore();
  }
  function ball(ctx, x, y, color, label, ang, alpha = 1, ring) {
    ctx.globalAlpha = alpha;
    const gr = ctx.createRadialGradient(x - R * 0.35, y - R * 0.4, R * 0.15, x, y, R);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, color); gr.addColorStop(1, color.startsWith('#') ? darker(color, 0.55) : color);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, R * 0.68, ang, ang + 1.3); ctx.stroke();
    if (ring) { ctx.strokeStyle = ring; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, R + 4, 0, Math.PI * 2); ctx.stroke(); }
    const fs = label.length >= 3 ? 8 : 10;
    ctx.font = `800 ${fs}px "JetBrains Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,20,30,.75)'; ctx.strokeText(label, x, y + 0.5);
    ctx.fillStyle = '#fff'; ctx.fillText(label, x, y + 0.5);
    ctx.globalAlpha = 1;
  }

  /* ---------- De nye delene ---------- */
  const label = (ctx, text, x, y, color = 'rgba(225,235,245,.75)', align = 'center') => {
    ctx.font = '800 12px "JetBrains Mono", monospace'; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(text, x, y);
  };
  // tørrfiskhjellet: stolper og stang (fisken tegnes med de bevegelige delene)
  function racksBack(ctx, C) {
    for (const rk of C.racks) {
      ctx.strokeStyle = 'rgba(92,64,40,.5)'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(rk.x, rk.y); ctx.lineTo(rk.x - 20, rk.y + 170); ctx.moveTo(rk.x + rk.w, rk.y); ctx.lineTo(rk.x + rk.w + 20, rk.y + 170); ctx.stroke();
      ctx.strokeStyle = '#7a5634'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(rk.x - 12, rk.y); ctx.lineTo(rk.x + rk.w + 12, rk.y); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rk.x - 12, rk.y - 3); ctx.lineTo(rk.x + rk.w + 12, rk.y - 3); ctx.stroke();
      label(ctx, 'TØRRFISKHJELLET', rk.x + rk.w / 2, rk.y - 16, 'rgba(241,217,182,.7)');
    }
  }
  // bagasjebåndet: ramme, gummibånd og ruller i endene
  function beltsBase(ctx, C) {
    for (const sg of C.S) {
      if (sg.kind !== 'belt') continue;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(sg.ax + 3, sg.ay + 6); ctx.lineTo(sg.bx + 3, sg.by + 6); ctx.stroke();
      ctx.strokeStyle = '#8b97a6'; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(sg.ax, sg.ay); ctx.lineTo(sg.bx, sg.by); ctx.stroke();
      ctx.strokeStyle = '#23272e'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(sg.ax, sg.ay); ctx.lineTo(sg.bx, sg.by); ctx.stroke();
      for (const [x, y] of [[sg.ax, sg.ay], [sg.bx, sg.by]]) { ctx.fillStyle = '#c4ccd6'; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#4a525e'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  // slaps: grå sørpe med klumper
  function slush(ctx, C) {
    for (const Z of C.slushes) {
      const w = Z.x1 - Z.x0, h = Z.y1 - Z.y0;
      ctx.fillStyle = 'rgba(205,218,230,.15)'; ctx.fillRect(Z.x0, Z.y0, w, h);
      const r = u.mulberry32(Math.round(Z.x0 * 7 + Z.y0 * 13) >>> 0);
      ctx.fillStyle = 'rgba(235,242,250,.32)';
      const nDots = Math.min(260, Math.round((w * h) / 900));
      for (let k = 0; k < nDots; k++) { ctx.beginPath(); ctx.arc(Z.x0 + r() * w, Z.y0 + r() * h, 1.5 + r() * 2.5, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = 'rgba(205,218,230,.35)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.strokeRect(Z.x0, Z.y0, w, h); ctx.setLineDash([]);
      label(ctx, 'SLAPS', Z.x0 + 8, Z.y0 + 13, 'rgba(225,235,245,.75)', 'left');
    }
  }
  // Andøya-raketten: tårn, plate og sikteretning
  function rocketPads(ctx, C) {
    for (const L of C.rockets) {
      const tx = L.x - 40;
      ctx.strokeStyle = '#7d8794'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(tx - 7, L.y); ctx.lineTo(tx - 7, L.y - 96); ctx.moveTo(tx + 7, L.y); ctx.lineTo(tx + 7, L.y - 96); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.beginPath();
      for (let y = L.y; y > L.y - 96; y -= 16) { ctx.moveTo(tx - 7, y); ctx.lineTo(tx + 7, y - 16); ctx.moveTo(tx + 7, y); ctx.lineTo(tx - 7, y - 16); }
      ctx.stroke();
      ctx.fillStyle = '#4b5563'; ctx.fillRect(L.x - 28, L.y - 6, 56, 12);
      for (let k = 0; k < 7; k++) { ctx.fillStyle = k % 2 ? '#111' : '#f6bd47'; ctx.fillRect(L.x - 28 + k * 8, L.y + 2, 8, 4); }
      const c = Math.cos(L.ang), s = -Math.sin(L.ang), ax = L.hx + c * 34, ay = L.hy + s * 34;
      ctx.strokeStyle = 'rgba(255,154,122,.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L.hx + c * 14, L.hy + s * 14); ctx.lineTo(ax, ay); ctx.stroke();
      ctx.fillStyle = 'rgba(255,154,122,.95)'; ctx.beginPath(); ctx.moveTo(ax + c * 9, ay + s * 9); ctx.lineTo(ax - s * 6, ay + c * 6); ctx.lineTo(ax + s * 6, ay - c * 6); ctx.closePath(); ctx.fill();
      label(ctx, 'ANDØYA', L.x, L.y + 18, 'rgba(255,200,170,.8)');
    }
  }
  // tunnelportaler: inngang og utgang
  function portal(ctx, x, y, text) {
    ctx.fillStyle = '#3a4252'; ctx.beginPath(); ctx.moveTo(x - 46, y + 2); ctx.lineTo(x - 46, y - 44); ctx.quadraticCurveTo(x, y - 78, x + 46, y - 44); ctx.lineTo(x + 46, y + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#05070b'; ctx.beginPath(); ctx.moveTo(x - 25, y + 2); ctx.lineTo(x - 25, y - 22); ctx.arc(x, y - 22, 25, Math.PI, 0); ctx.lineTo(x + 25, y + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#b8bcc4'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - 28, y + 2); ctx.lineTo(x - 28, y - 22); ctx.arc(x, y - 22, 28, Math.PI, 0); ctx.lineTo(x + 28, y + 2); ctx.stroke();
    label(ctx, text, x, y - 70, '#f3ecdf');
  }
  function portals(ctx, C) {
    for (const T of C.tunnels) { portal(ctx, T.ax, T.ay, 'TUNNEL INN'); portal(ctx, T.bx, T.by, T.dir > 0 ? 'UT →' : '← UT'); }
  }
  // en rein (står med hovene i 0,0 og ser mot høyre)
  function reindeer(ctx, walk, graze) {
    const body = '#8a6a4f', dark = '#5a4331', light = '#eadfcc';
    ctx.lineCap = 'round';
    ctx.strokeStyle = dark; ctx.lineWidth = 4;
    const sw = Math.sin(walk) * 6;
    for (const [x, d] of [[-14, sw], [-8, -sw], [12, -sw], [18, sw]]) { ctx.beginPath(); ctx.moveTo(x, -26); ctx.lineTo(x + d, 0); ctx.stroke(); }
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(2, -32, 24, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(-20, -32, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
    const hx = 30, hy = graze ? -12 : -52;
    ctx.strokeStyle = body; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(18, -36); ctx.lineTo(hx - 2, hy + 4); ctx.stroke();
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(hx + 4, hy, 9, 6, graze ? 0.7 : 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1410'; ctx.beginPath(); ctx.arc(hx + 12, hy + (graze ? 5 : 1), 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = light; ctx.lineWidth = 2.5; ctx.beginPath();
    ctx.moveTo(hx, hy - 4); ctx.lineTo(hx - 6, hy - 22); ctx.lineTo(hx - 15, hy - 30);
    ctx.moveTo(hx - 6, hy - 22); ctx.lineTo(hx + 2, hy - 31);
    ctx.moveTo(hx - 3, hy - 13); ctx.lineTo(hx + 7, hy - 18);
    ctx.stroke();
  }
  function newMoving(ctx, C, t, time) {
    // Saltstraumen
    for (const V of C.vortexes) {
      ctx.save(); ctx.translate(V.x, V.y);
      const g = ctx.createRadialGradient(0, 0, 6, 0, 0, V.r);
      g.addColorStop(0, V.drain ? 'rgba(2,6,14,.95)' : 'rgba(20,110,140,.55)'); g.addColorStop(0.45, 'rgba(24,120,160,.4)'); g.addColorStop(1, 'rgba(40,150,190,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, V.r, 0, Math.PI * 2); ctx.fill();
      const rot = V.a0 + time * 2.4 * V.dir;
      ctx.lineCap = 'round';
      for (let k = 0; k < 5; k++) {
        ctx.strokeStyle = k % 2 ? 'rgba(220,245,255,.45)' : 'rgba(150,215,240,.35)'; ctx.lineWidth = 3 + (k % 2);
        ctx.beginPath();
        for (let s = 0; s <= 20; s++) {
          const f = s / 20, rr = V.r * (0.12 + 0.82 * f), a = rot + k * ((Math.PI * 2) / 5) - V.dir * f * 2.4;
          if (s) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.stroke();
      }
      if (V.drain) { ctx.fillStyle = '#01040a'; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(150,215,240,.55)'; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.restore();
      label(ctx, 'SALTSTRAUMEN', V.x, V.y + V.r + 14, 'rgba(200,235,250,.75)');
    }
    // bagasjebåndet går
    for (const sg of C.S) {
      if (sg.kind !== 'belt') continue;
      const L = Math.hypot(sg.bx - sg.ax, sg.by - sg.ay);
      if (L < 30) continue;
      const dir = sg.belt >= 0 ? 1 : -1, nx = -sg.uy, ny = sg.ux;
      const off = (((time * sg.belt * 0.6) % 30) + 30) % 30;
      ctx.strokeStyle = 'rgba(246,189,71,.8)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let s = off + 12; s < L - 12; s += 30) {
        const cx = sg.ax + sg.ux * s, cy = sg.ay + sg.uy * s, bx = cx - sg.ux * 5 * dir, by = cy - sg.uy * 5 * dir;
        ctx.moveTo(bx + nx * 4, by + ny * 4); ctx.lineTo(cx + sg.ux * 3 * dir, cy + sg.uy * 3 * dir); ctx.lineTo(bx - nx * 4, by - ny * 4);
      }
      ctx.stroke();
    }
    // ferga, havet, kaiene og bommen
    for (const F of C.ferries) {
      const sea = F.sea, s = P.kin.ferry(F, t);
      const wave = (x) => sea.y0 + 6 + Math.sin(x * 0.05 + time * 2.4) * 4;
      const wg = ctx.createLinearGradient(0, sea.y0, 0, sea.y1);
      wg.addColorStop(0, 'rgba(30,90,130,.85)'); wg.addColorStop(1, 'rgba(6,24,44,.95)');
      ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(sea.x0, sea.y1);
      for (let x = sea.x0; x <= sea.x1; x += 12) ctx.lineTo(x, wave(x));
      ctx.lineTo(sea.x1, wave(sea.x1)); ctx.lineTo(sea.x1, sea.y1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(220,240,255,.5)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = sea.x0; x <= sea.x1; x += 12) { if (x === sea.x0) ctx.moveTo(x, wave(x)); else ctx.lineTo(x, wave(x)); }
      ctx.stroke();
      for (const [x, y, side] of [[F.ax, F.ay, F.sA], [F.bx, F.by, F.sB]]) { const qx = x + side * (F.hw + 4); ctx.fillStyle = '#5b4632'; ctx.fillRect(qx - 5, y + 6, 10, Math.max(10, sea.y0 - y + 8)); }
      label(ctx, F.ax < F.bx ? 'FERGA →' : '← FERGA', F.ax, F.ay - 56, 'rgba(243,236,223,.7)');
      // bommen i ferjekøen
      ctx.lineCap = 'butt';
      if (!s.openA) { for (let k = 0; k < 6; k++) { ctx.strokeStyle = k % 2 ? '#fff' : '#ee4a2f'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(F.barX, F.ay + 6 - k * 8); ctx.lineTo(F.barX, F.ay - 2 - k * 8); ctx.stroke(); } }
      else { ctx.strokeStyle = 'rgba(238,74,47,.6)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(F.barX, F.ay + 6); ctx.lineTo(F.barX - F.sA * 26, F.ay - 40); ctx.stroke(); }
      // MF Lofoten
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.tilt);
      const hw = F.hw;
      ctx.fillStyle = '#1b1f27'; ctx.beginPath(); ctx.moveTo(-hw - 10, 4); ctx.lineTo(hw + 10, 4); ctx.lineTo(hw - 8, 42); ctx.lineTo(-hw + 8, 42); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c62828'; ctx.beginPath(); ctx.moveTo(-hw - 10, 4); ctx.lineTo(hw + 10, 4); ctx.lineTo(hw + 3, 20); ctx.lineTo(-hw - 3, 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f3ecdf'; ctx.fillRect(-hw + 4, 22, hw * 2 - 8, 3);
      ctx.font = '900 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('MF LOFOTEN', 0, 32);
      ctx.strokeStyle = '#e9dfc9'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.lineTo(hw, 0); ctx.stroke();
      ctx.restore();
      const c = Math.cos(s.tilt), sn = Math.sin(s.tilt);
      for (const [side, open] of [[F.sA, s.openA], [F.sB, s.openB]]) {
        const ex = s.x + side * c * hw, ey = s.y + side * sn * hw;
        ctx.strokeStyle = '#f6bd47'; ctx.lineWidth = 8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(ex, ey);
        if (open) ctx.lineTo(ex + side * 26, ey + 12); else ctx.lineTo(ex, ey - 32);
        ctx.stroke();
      }
    }
    // tørrfisken
    for (const rk of C.racks) for (const F of rk.fish) {
      const a = P.kin.fishAngle(F, t), L = F.len;
      ctx.save(); ctx.translate(F.px, F.py); ctx.rotate(-a);
      ctx.strokeStyle = '#d8cfbf'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 8); ctx.stroke();
      ctx.fillStyle = '#c9b48f'; ctx.strokeStyle = '#6f5c40'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(-8, 1); ctx.lineTo(-5, 13);
      ctx.quadraticCurveTo(-10, L * 0.5, -6, L - 6); ctx.quadraticCurveTo(0, L + 5, 6, L - 6);
      ctx.quadraticCurveTo(10, L * 0.5, 5, 13); ctx.lineTo(8, 1); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2b2118'; ctx.beginPath(); ctx.arc(-2.5, L - 12, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // reinen
    for (const Rn of C.reins) {
      const s = P.kin.rein(Rn, t);
      const face = (s.dir || 1) * (Rn.bx >= Rn.ax ? 1 : -1), k = 0.6 + 0.4 * s.near;
      ctx.save(); ctx.globalAlpha = 0.3 + 0.7 * s.near; ctx.translate(s.x, s.y - 10 * (1 - s.near)); ctx.scale(face * k, k);
      reindeer(ctx, s.graze ? 0 : time * 9, s.graze);
      ctx.restore();
    }
    // tunnelen stengt pga. ras
    for (const T of C.tunnels) {
      if (!P.kin.tunnelClosed(T, t)) continue;
      const r = u.mulberry32(Math.round(T.mx * 3 + T.my) >>> 0);
      for (let k = 0; k < 9; k++) { ctx.fillStyle = k % 3 ? '#6b7280' : '#8b93a1'; ctx.beginPath(); ctx.arc(T.mx - 22 + r() * 44, T.my + 14 - r() * 30, 7 + r() * 8, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#ee4a2f'; ctx.fillRect(T.mx - 52, T.my - 66, 104, 22);
      label(ctx, 'STENGT · RAS', T.mx, T.my - 55, '#fff');
    }
    // varsellampe på rakett-tårnet
    for (const L of C.rockets) { ctx.fillStyle = Math.sin(time * 5 + L.x) > 0 ? '#ff4d3d' : '#5a1a14'; ctx.beginPath(); ctx.arc(L.x - 40, L.y - 100, 5, 0, Math.PI * 2); ctx.fill(); }
    for (const Bq of C.bosses) boss(ctx, Bq, t, time);
  }

  /* Sjefen: kontorsjef i dress med strålepistol. Skuddene kommer fra opptaket (Bq.shots) */
  const rr = (ctx, x, y, w, h, r) => (ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h));
  const LINES = ['Tilbake på jobb!', 'Fredagslotteri? Ikke på min vakt!', 'Hvem har tatt kaffen min?', 'Dette tar vi på mandagsmøtet!', 'Timelista, takk!'];
  function boss(ctx, Bq, t, time) {
    const shots = Bq.shots || [];
    let last = null, idx = -1;
    for (let k = shots.length - 1; k >= 0; k--) if (shots[k].t0 <= t) { last = shots[k]; idx = k; break; }
    const sx = Bq.x + Bq.dir * 12, sy = Bq.y - 86; // skulderen
    const aim = last && t - last.t0 < 0.9 ? Math.atan2(last.vy, last.vx) : Bq.dir > 0 ? 0.12 : Math.PI - 0.12;
    // kroppen (speilvendt etter retningen)
    ctx.save(); ctx.translate(Bq.x, Bq.y); ctx.scale(Bq.dir, 1);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 2, 26, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1f2632'; ctx.fillRect(-13, -40, 11, 40); ctx.fillRect(2, -40, 11, 40); // bukse
    ctx.fillStyle = '#0d1016'; ctx.fillRect(-15, -4, 15, 5); ctx.fillRect(1, -4, 16, 5); // sko
    ctx.fillStyle = '#2b3445'; ctx.beginPath(); ctx.moveTo(-19, -40); ctx.lineTo(19, -40); ctx.lineTo(16, -92); ctx.lineTo(-16, -92); ctx.closePath(); ctx.fill(); // dressjakke
    ctx.fillStyle = '#f3f1ea'; ctx.beginPath(); ctx.moveTo(-7, -92); ctx.lineTo(7, -92); ctx.lineTo(0, -70); ctx.closePath(); ctx.fill(); // skjorte
    ctx.fillStyle = '#c62828'; ctx.beginPath(); ctx.moveTo(-3, -90); ctx.lineTo(3, -90); ctx.lineTo(4, -66); ctx.lineTo(0, -60); ctx.lineTo(-4, -66); ctx.closePath(); ctx.fill(); // slips
    ctx.strokeStyle = '#2b3445'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-14, -86); ctx.lineTo(-20, -56); ctx.stroke(); // den andre armen
    ctx.fillStyle = '#e8c4a0'; ctx.beginPath(); ctx.arc(1, -108, 15, 0, Math.PI * 2); ctx.fill(); // hodet
    ctx.fillStyle = '#6b5a4a'; ctx.fillRect(-14, -112, 4, 10); ctx.fillRect(12, -112, 4, 10); // hår på sidene
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(-3, -109, 4, 0, Math.PI * 2); ctx.moveTo(10, -109); ctx.arc(6, -109, 4, 0, Math.PI * 2); ctx.moveTo(1, -109); ctx.lineTo(2, -109); ctx.stroke(); // briller
    ctx.fillStyle = '#5a4636'; ctx.beginPath(); ctx.ellipse(2, -100, 7, 2.5, 0, 0, Math.PI * 2); ctx.fill(); // bart
    ctx.restore();
    // armen og strålepistolen sikter dit han skyter
    const hx = sx + Math.cos(aim) * 28, hy = sy + Math.sin(aim) * 28;
    ctx.strokeStyle = '#2b3445'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(aim); if (Math.cos(aim) < 0) ctx.scale(1, -1);
    ctx.fillStyle = '#4a5363'; ctx.fillRect(-4, 2, 7, 12); // skjeftet
    ctx.fillStyle = '#c9d2dc'; ctx.beginPath(); rr(ctx, -8, -6, 30, 11, 5); ctx.fill(); // løpet
    ctx.fillStyle = '#1f9e8f'; ctx.beginPath(); ctx.arc(-8, -0.5, 7, 0, Math.PI * 2); ctx.fill(); // tanken bak
    ctx.strokeStyle = '#1f9e8f'; ctx.lineWidth = 2.4; for (const rx of [10, 15, 20]) { ctx.beginPath(); ctx.ellipse(rx, -0.5, 2, 8, 0, 0, Math.PI * 2); ctx.stroke(); } // ringene
    const glow = last && t - last.t0 < 0.08;
    ctx.fillStyle = glow ? '#e8ffe0' : '#5ef28a'; ctx.beginPath(); ctx.arc(25, -0.5, glow ? 6 : 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (glow) { ctx.fillStyle = 'rgba(94,242,138,.35)'; ctx.beginPath(); ctx.arc(hx + Math.cos(aim) * 25, hy + Math.sin(aim) * 25, 16, 0, Math.PI * 2); ctx.fill(); }
    // strålene som er i lufta
    ctx.lineCap = 'round';
    for (let k = Math.max(0, idx - 4); k <= idx; k++) {
      const s = shots[k];
      if (!s || t < s.t0 || t >= s.t1) continue;
      const dt = t - s.t0, bx = s.x + s.vx * dt, by = s.y + s.vy * dt, l = Math.min(1, dt / 0.03) * 0.022;
      ctx.strokeStyle = 'rgba(94,242,138,.45)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(bx - s.vx * l, by - s.vy * l); ctx.lineTo(bx, by); ctx.stroke();
      ctx.strokeStyle = '#eaffef'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(bx - s.vx * l * 0.7, by - s.vy * l * 0.7); ctx.lineTo(bx, by); ctx.stroke();
    }
    // treffet: et grønt glimt der stråla stoppet
    for (let k = Math.max(0, idx - 4); k <= idx; k++) {
      const s = shots[k];
      if (!s || t < s.t1 || t > s.t1 + 0.25 || s.t1 === Infinity) continue;
      const bx = s.x + s.vx * (s.t1 - s.t0), by = s.y + s.vy * (s.t1 - s.t0), a = 1 - (t - s.t1) / 0.25;
      ctx.strokeStyle = `rgba(94,242,138,${(a * 0.9).toFixed(2)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx, by, 10 + (1 - a) * 22, 0, Math.PI * 2); ctx.stroke();
    }
    // en sjelden replikk (hvert femte skudd)
    if (last && idx % 5 === 0 && t - last.t0 < 1.4) {
      const text = LINES[(idx / 5) % LINES.length];
      ctx.font = '700 13px "Schibsted Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(text).width + 18, bx = Bq.x, by = Bq.y - 150;
      ctx.fillStyle = 'rgba(243,241,234,.95)'; ctx.beginPath(); rr(ctx, bx - w / 2, by - 13, w, 26, 9); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx - 6, by + 12); ctx.lineTo(bx + 2, by + 22); ctx.lineTo(bx + 6, by + 12); ctx.fill();
      ctx.fillStyle = '#161b24'; ctx.fillText(text, bx, by + 1);
    }
    label(ctx, 'SJEFEN', Bq.x, Bq.y + 30, 'rgba(243,236,223,.7)');
  }

  // løypefargen: egen farge på delen, ellers fargen valgt for hele løypa, ellers standard
  const segCol = (sg, L) => sg.col || (sg.kind === 'pit' ? '#6e5d4c' : sg.kind === 'wall' ? (L.track ? darker(L.track, 0.86) : '#c9bda5') : L.track || '#e9dfc9');
  const bumper = (ctx, b, flash) => {
    const rr = b.r * (flash ? 1.15 : 1);
    ctx.fillStyle = b.col || '#ee4a2f'; ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(b.x, b.y, rr - 6, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '800 13px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('TUT', b.x, b.y + 1);
  };
  const sign = (ctx, x, y, text, col) => {
    const w = signW(ctx, text);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#3a2a1d'; ctx.fillRect(x - 3, y + 14, 6, 34);
    ctx.fillStyle = col || '#5a3d27'; ctx.fillRect(x - w / 2, y - 16, w, 32);
    ctx.strokeStyle = col ? 'rgba(255,255,255,.35)' : '#8a6440'; ctx.lineWidth = 2; ctx.strokeRect(x - w / 2, y - 16, w, 32);
    ctx.fillStyle = '#f3ecdf'; ctx.fillText(text, x, y + 1);
  };
  /* Skinnene: en stålskinne fra der delene står og dit de kan kjøre */
  function rails(ctx, C) {
    for (const M of C.movers || []) {
      if (M.L < 2) continue;
      const x0 = M.cx, y0 = M.cy, x1 = M.cx + M.rx, y1 = M.cy + M.ry;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = 'rgba(150,162,178,.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      for (const [x, y] of [[x0, y0], [x1, y1]]) { ctx.fillStyle = '#4a525e'; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#c4ccd6'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  /* Det som kjører på skinnen, flyttet (ox, oy) fra der det står: vogna, ramper, vegger, bumpere og skilt */
  function mover(ctx, M, ox, oy, o = {}, L = {}) {
    const cx = M.cx + ox, cy = M.cy + oy;
    if (M.L >= 2) { // vogna som går på skinnen
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.atan2(M.ry, M.rx));
      ctx.fillStyle = '#23272e'; ctx.beginPath(); rr(ctx, -16, -8, 32, 16, 5); ctx.fill();
      ctx.fillStyle = '#f6bd47'; for (let k = -12; k <= 8; k += 8) ctx.fillRect(k, -6, 4, 12);
      ctx.restore();
    }
    ctx.lineCap = 'round';
    for (const g of M.segs) { ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = g.t * 2; ctx.beginPath(); ctx.moveTo(g.ax + ox + 3, g.ay + oy + 5); ctx.lineTo(g.bx + ox + 3, g.by + oy + 5); ctx.stroke(); }
    for (const g of M.segs) {
      const ax = g.ax + ox, ay = g.ay + oy, bx = g.bx + ox, by = g.by + oy;
      ctx.strokeStyle = segCol(g, L); ctx.lineWidth = g.t * 2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      // gul og svart kant: denne kjører
      ctx.strokeStyle = '#f6bd47'; ctx.lineWidth = 3; ctx.setLineDash([9, 9]); ctx.beginPath(); ctx.moveTo(ax, ay + g.t - 2); ctx.lineTo(bx, by + g.t - 2); ctx.stroke(); ctx.setLineDash([]);
    }
    for (const b of M.bumps) { const p = { x: b.x + ox, y: b.y + oy, r: b.r, col: b.col }; bumper(ctx, p, o.flash && o.flash(p)); }
    for (const s of M.signs) sign(ctx, s.x + ox, s.y + oy, s.text, s.col);
    for (const d of M.decos || []) deco(ctx, d, ox, oy);
  }

  /* Hopp på skinnen: delen blekner bort der den var, og et gult glimt der den dukker opp */
  function teleport(ctx, M, t, L) {
    const j = P.kin.railJump(M, t);
    if (!j) return;
    const a = 1 - j.age / 0.35;
    ctx.save();
    ctx.globalAlpha *= a * 0.45;
    mover(ctx, M, M.rx * j.s0, M.ry * j.s0, {}, L);
    ctx.restore();
    ctx.save();
    for (const [s, grow] of [[j.s0, 1], [j.s1, -1]]) {
      const x = M.cx + M.rx * s, y = M.cy + M.ry * s, r = grow > 0 ? 16 + (1 - a) * 46 : 16 + a * 46;
      ctx.strokeStyle = `rgba(246,189,71,${(a * 0.9).toFixed(2)})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(255,236,170,${(a * 0.8).toFixed(2)})`;
      for (let k = 0; k < 6; k++) { const an = k * 1.047 + s * 9; ctx.beginPath(); ctx.arc(x + Math.cos(an) * r * 0.8, y + Math.sin(an) * r * 0.8, 2.5, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }

  /* Faste deler: hull, ramper, vegger, spikerbrett, TUT-bumpere, mål og buret for de som ikke betalte */
  function track(ctx, C, o = {}) {
    ctx.lineCap = 'round';
    ctx.fillStyle = 'rgba(2,5,12,.86)';
    for (const p of C.pits) { const top = Math.min(p.yl, p.yr); ctx.fillRect(p.x0, top, p.x1 - p.x0, p.y1 - top); }
    racksBack(ctx, C);
    rails(ctx, C);
    const own = (sg) => sg.kind === 'belt' || sg.kind === 'sea' || sg.kind === 'pad'; // tegnes for seg
    for (const sg of C.S) { if (own(sg)) continue; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = sg.t * 2; ctx.beginPath(); ctx.moveTo(sg.ax + 3, sg.ay + 5); ctx.lineTo(sg.bx + 3, sg.by + 5); ctx.stroke(); }
    const L = lookOf(C);
    for (const sg of C.S) {
      if (own(sg)) continue;
      ctx.strokeStyle = segCol(sg, L);
      ctx.lineWidth = sg.t * 2; ctx.beginPath(); ctx.moveTo(sg.ax, sg.ay); ctx.lineTo(sg.bx, sg.by); ctx.stroke();
      if (sg.kind === 'track' || sg.kind === 'hopper') { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sg.ax, sg.ay - sg.t + 2); ctx.lineTo(sg.bx, sg.by - sg.t + 2); ctx.stroke(); }
    }
    // hjemmelagde hull har navnet sitt nede i gropa
    for (const p of C.pits) {
      if (p.cause) continue;
      ctx.font = '800 13px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(243,236,223,.6)';
      ctx.fillText(p.name.toUpperCase(), (p.x0 + p.x1) / 2, p.y1 - 18, Math.max(40, p.x1 - p.x0 - 8));
    }
    beltsBase(ctx, C);
    slush(ctx, C);
    rocketPads(ctx, C);
    portals(ctx, C);
    for (const p of C.pegs) { ctx.fillStyle = p.col || '#dbe3ec'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#5f7891'; ctx.lineWidth = 1.5; ctx.stroke(); }
    for (const b of C.bumpers) bumper(ctx, b, o.flash && o.flash(b));
    // mål
    const f = C.finish;
    for (let k = 0; k < 10; k++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (k + j) % 2 ? '#111' : '#fff'; ctx.fillRect(f.x0 + 4 + j * 14, f.y0 + k * 12, 14, 12); }
    ctx.fillStyle = '#c9bda5'; ctx.fillRect(f.x0, f.y0 - 30, 4, 160);
    ctx.font = '900 34px Fraunces, Georgia, serif'; ctx.fillStyle = '#ffe08a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('MÅL', f.x0 + 18, f.y0 - 38);
    // de som ikke betalte: fast bak gitter ved startporten
    const left = o.cage;
    if (left && left.length) {
      const sx = C.start.x, sy = C.start.y;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(sx + 370, sy - 150, 220, 120);
      left.slice(0, 12).forEach((p, k) => ball(ctx, sx + 390 + (k % 6) * 34, sy - 52 - Math.floor(k / 6) * 34, '#7d8794', p.nums && p.nums[0] ? String(p.nums[0]) : u.initials(p.name), 0, 0.85));
      ctx.strokeStyle = '#9aa6b4'; ctx.lineWidth = 3; for (let x = sx + 372; x <= sx + 588; x += 18) { ctx.beginPath(); ctx.moveTo(x, sy - 148); ctx.lineTo(x, sy - 32); ctx.stroke(); }
      ctx.font = '700 15px "JetBrains Mono", monospace'; ctx.fillStyle = '#f6bd47'; ctx.textAlign = 'center'; ctx.fillText('IKKE BETALT · FAST I PORTEN', sx + 480, sy - 160);
    }
  }

  /* Bevegelige deler: startport, Glimt-hjul, vipper, luker, vind og ørn */
  function moving(ctx, C, t, time, o = {}) {
    const open = !o.gateClosed && P.kin.gateOpen(t);
    for (const g of C.gates) {
      ctx.strokeStyle = '#ee4a2f';
      if (!open) { ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(g.ax, g.ay); ctx.lineTo(g.bx, g.by); ctx.stroke(); }
      else { ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(g.ax, g.ay); ctx.lineTo(g.ax - 12, g.ay + 58); ctx.stroke(); }
    }
    for (const W of C.wheels) {
      const wa = P.kin.wheelAngle(W, t);
      if (W.fast) { // rakettfart: armene blir en vifte, og den stiplede ringen viser hvor langt de rekker
        ctx.save();
        ctx.strokeStyle = 'rgba(255,212,0,.22)'; ctx.lineWidth = 3; ctx.setLineDash([10, 12]);
        ctx.beginPath(); ctx.arc(W.cx, W.cy, W.len + W.t + 6, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = '#ffd400'; ctx.lineWidth = W.t * 2;
        for (let g = 3; g >= 1; g--) {
          ctx.globalAlpha = 0.36 - g * 0.09;
          const lag = wa - W.w * g * 0.012;
          ctx.beginPath();
          for (let a = 0; a < W.arms; a++) { const an = lag + (a * Math.PI * 2) / W.arms; ctx.moveTo(W.cx, W.cy); ctx.lineTo(W.cx + Math.cos(an) * W.len, W.cy + Math.sin(an) * W.len); }
          ctx.stroke();
        }
        ctx.restore();
      }
      for (let a = 0; a < W.arms; a++) { const an = wa + (a * Math.PI * 2) / W.arms; ctx.strokeStyle = '#111'; ctx.lineWidth = W.t * 2 + 4; ctx.beginPath(); ctx.moveTo(W.cx, W.cy); ctx.lineTo(W.cx + Math.cos(an) * W.len, W.cy + Math.sin(an) * W.len); ctx.stroke(); ctx.strokeStyle = '#ffd400'; ctx.lineWidth = W.t * 2; ctx.stroke(); }
      if (W.arm || W.nohub) { // Glimt-armen og hjul uten nav: bare en bolt i midten, og navnet langs armen
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(W.cx, W.cy, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd400'; ctx.beginPath(); ctx.arc(W.cx, W.cy, 3.5, 0, Math.PI * 2); ctx.fill();
        if (W.len >= 90) { ctx.save(); ctx.translate(W.cx, W.cy); ctx.rotate(wa); ctx.fillStyle = '#111'; ctx.font = '900 10px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('GLIMT', W.len * 0.58, 1); ctx.restore(); }
        continue;
      }
      ctx.fillStyle = '#ffd400'; ctx.beginPath(); ctx.arc(W.cx, W.cy, 24, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = '#111'; ctx.font = '900 10px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('GLIMT', W.cx, W.cy + 1);
    }
    for (const Pp of C.seesaws) {
      const sa = P.kin.seesawAngle(Pp, t), c = Math.cos(sa), sn = Math.sin(sa);
      ctx.fillStyle = '#8a9bb0'; ctx.beginPath(); ctx.moveTo(Pp.px, Pp.py); ctx.lineTo(Pp.px - 18, Pp.py + 34); ctx.lineTo(Pp.px + 18, Pp.py + 34); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#b07a45'; ctx.lineWidth = Pp.t * 2; ctx.beginPath(); ctx.moveTo(Pp.px - c * Pp.half, Pp.py - sn * Pp.half); ctx.lineTo(Pp.px + c * Pp.half, Pp.py + sn * Pp.half); ctx.stroke();
      if (Pp.dyn) { ctx.fillStyle = '#f6bd47'; ctx.beginPath(); ctx.arc(Pp.px, Pp.py, 7, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#5a3d27'; ctx.lineWidth = 2; ctx.stroke(); } // tyngde-vippe
    }
    for (const T of C.traps) {
      if (!P.kin.trapOpen(T, t)) {
        ctx.strokeStyle = '#ee4a2f'; ctx.lineWidth = T.t * 2; ctx.beginPath(); ctx.moveTo(T.ax, T.ay); ctx.lineTo(T.bx, T.by); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = T.t * 2; ctx.setLineDash([10, 10]); ctx.beginPath(); ctx.moveTo(T.ax, T.ay); ctx.lineTo(T.bx, T.by); ctx.stroke(); ctx.setLineDash([]);
      } else { ctx.strokeStyle = '#ee4a2f'; ctx.lineWidth = T.t * 2; ctx.beginPath(); ctx.moveTo(T.ax, T.ay); ctx.lineTo(T.ax + 8, T.ay + 70); ctx.stroke(); }
    }
    // deler på skinne (i designeren står de hjemme, og programmet vises som et gjennomsiktig spøkelse)
    for (const M of C.movers || []) {
      const s = o.home ? null : P.kin.railDraw(M, t); // som kulene: fra opptaksbildene, så de står på plattformen
      if (s) teleport(ctx, M, t, lookOf(C));
      mover(ctx, M, s ? s.ox : 0, s ? s.oy : 0, o, lookOf(C));
    }
    for (const Z of C.winds) {
      const wa = P.kin.windAccel(Z, t);
      const n = Math.round(4 + wa / 30), left = Z.dir < 0;
      ctx.strokeStyle = 'rgba(220,235,255,.35)'; ctx.lineWidth = 2;
      for (let k = 0; k < n; k++) {
        const ph = ((time * (0.6 + wa / 500) + k * 0.37) % 1);
        const x = left ? Z.x1 - ph * (Z.x1 - Z.x0) : Z.x0 + ph * (Z.x1 - Z.x0);
        const y = Z.y0 + 30 + ((k * 53) % Math.max(1, Z.y1 - Z.y0 - 60));
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(left ? x + 40 + wa / 10 : x - 40 - wa / 10, y); ctx.stroke();
      }
      const ix = left ? Z.x1 + 30 : Z.x0 - 30;
      ctx.save(); ctx.translate(ix, Z.y0 + 40); if (!left) ctx.scale(-1, 1);
      ctx.font = `42px ${EMOJI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🌬️', 0, 0); ctx.restore();
      ctx.font = '700 14px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = wa > 200 ? '#ff9a7a' : '#cfe6ff'; ctx.fillText(`${Math.round(6 + wa / 22)} m/s`, ix, Z.y0 + 80);
    }
    newMoving(ctx, C, t, time);
    for (const E of C.eagles) {
      const cl = E.at(t);
      if (!cl) continue;
      ctx.save(); ctx.translate(cl.x, cl.y - 18); if (E.dir > 0) ctx.scale(-1, 1);
      ctx.font = `64px ${EMOJI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🦅', 0, 0); ctx.restore();
    }
  }

  function signW(ctx, text) { ctx.font = '800 15px "JetBrains Mono", monospace'; return ctx.measureText(text).width + 26; }
  function signs(ctx, C) {
    for (const sg of C.signs) sign(ctx, sg.x, sg.y, sg.text, sg.col);
  }

  /* Hele løypa i verdenskoordinater (kallet setter transformasjonen først):
     fjell og by · bakgrunnsfelt og pynt bak · løypa · bevegelige deler · pynt foran · skilt · vær */
  function scene(ctx, C, v, t, time, o = {}) {
    mountain(ctx, C);
    city(ctx, C, v);
    for (const s of C.shapes || []) shape(ctx, s);
    for (const d of C.decoBack || []) deco(ctx, d);
    track(ctx, C, o);
    moving(ctx, C, t, time, o);
    for (const d of C.decoFront || []) deco(ctx, d);
    signs(ctx, C);
    weather(ctx, C, v, time);
  }

  FL.KDraw = { EMOJI, SKY, stars, sky, mountain, city, track, moving, signs, signW, trail, ball, scene, mover, teleport };
})();
