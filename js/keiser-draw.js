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

  /* Himmel, stjerner og nordlys – i skjermkoordinater */
  function sky(ctx, cw, ch, v, time, st, C) {
    const g = ctx.createLinearGradient(0, 0, 0, ch);
    const deep = u.clamp((v.y - (C.start.y - 300)) / Math.max(400, C.H - 320), 0, 1);
    g.addColorStop(0, '#02060f'); g.addColorStop(0.6, deep > 0.85 ? '#0c1a34' : '#081530'); g.addColorStop(1, '#122347');
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    for (const [x, y, r, ph] of st) { ctx.globalAlpha = (0.35 + 0.35 * Math.sin(time * 1.3 + ph)) * (1 - deep * 0.6); ctx.fillStyle = '#fff'; ctx.fillRect(x * cw, y * ch - (v.y * 0.03) % ch, r, r); }
    ctx.globalAlpha = 1;
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
    const dx = C.start.x - 800, dy = C.start.y - 300, bot = C.H - 20;
    const g = ctx.createLinearGradient(0, -200 + dy, 0, bot);
    g.addColorStop(0, '#2a3a5c'); g.addColorStop(0.08, '#16233b'); g.addColorStop(0.6, '#0f1a2c'); g.addColorStop(1, '#0b1422');
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
    if (v.y + v.h < F.y - 180) return;
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
    ctx.font = '900 64px Fraunces, Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff6dc'; ctx.shadowColor = 'rgba(246,189,71,.8)'; ctx.shadowBlur = 18;
    ctx.fillText('BODØ', F.x + 166, F.y + 104); ctx.shadowBlur = 0;
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

  /* Faste deler: hull, ramper, vegger, spikerbrett, TUT-bumpere, mål og buret for de som ikke betalte */
  function track(ctx, C, o = {}) {
    ctx.lineCap = 'round';
    ctx.fillStyle = 'rgba(2,5,12,.86)';
    for (const p of C.pits) { const top = Math.min(p.yl, p.yr); ctx.fillRect(p.x0, top, p.x1 - p.x0, p.y1 - top); }
    for (const sg of C.S) { ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = sg.t * 2; ctx.beginPath(); ctx.moveTo(sg.ax + 3, sg.ay + 5); ctx.lineTo(sg.bx + 3, sg.by + 5); ctx.stroke(); }
    for (const sg of C.S) {
      ctx.strokeStyle = sg.kind === 'pit' ? '#6e5d4c' : sg.kind === 'wall' ? '#c9bda5' : '#e9dfc9';
      ctx.lineWidth = sg.t * 2; ctx.beginPath(); ctx.moveTo(sg.ax, sg.ay); ctx.lineTo(sg.bx, sg.by); ctx.stroke();
      if (sg.kind === 'track' || sg.kind === 'hopper') { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sg.ax, sg.ay - sg.t + 2); ctx.lineTo(sg.bx, sg.by - sg.t + 2); ctx.stroke(); }
    }
    // hjemmelagde hull har navnet sitt nede i gropa
    for (const p of C.pits) {
      if (p.cause) continue;
      ctx.font = '800 13px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(243,236,223,.6)';
      ctx.fillText(p.name.toUpperCase(), (p.x0 + p.x1) / 2, p.y1 - 18, Math.max(40, p.x1 - p.x0 - 8));
    }
    for (const p of C.pegs) { ctx.fillStyle = '#dbe3ec'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#5f7891'; ctx.lineWidth = 1.5; ctx.stroke(); }
    for (const b of C.bumpers) {
      const rr = b.r * (o.flash && o.flash(b) ? 1.15 : 1);
      ctx.fillStyle = '#ee4a2f'; ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(b.x, b.y, rr - 6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '800 13px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('TUT', b.x, b.y + 1);
    }
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
      for (let a = 0; a < W.arms; a++) { const an = wa + (a * Math.PI * 2) / W.arms; ctx.strokeStyle = '#111'; ctx.lineWidth = W.t * 2 + 4; ctx.beginPath(); ctx.moveTo(W.cx, W.cy); ctx.lineTo(W.cx + Math.cos(an) * W.len, W.cy + Math.sin(an) * W.len); ctx.stroke(); ctx.strokeStyle = '#ffd400'; ctx.lineWidth = W.t * 2; ctx.stroke(); }
      ctx.fillStyle = '#ffd400'; ctx.beginPath(); ctx.arc(W.cx, W.cy, 24, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = '#111'; ctx.font = '900 10px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('GLIMT', W.cx, W.cy + 1);
    }
    for (const Pp of C.seesaws) {
      const sa = P.kin.seesawAngle(Pp, t), c = Math.cos(sa), sn = Math.sin(sa);
      ctx.fillStyle = '#8a9bb0'; ctx.beginPath(); ctx.moveTo(Pp.px, Pp.py); ctx.lineTo(Pp.px - 18, Pp.py + 34); ctx.lineTo(Pp.px + 18, Pp.py + 34); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#b07a45'; ctx.lineWidth = Pp.t * 2; ctx.beginPath(); ctx.moveTo(Pp.px - c * Pp.half, Pp.py - sn * Pp.half); ctx.lineTo(Pp.px + c * Pp.half, Pp.py + sn * Pp.half); ctx.stroke();
    }
    for (const T of C.traps) {
      if (!P.kin.trapOpen(T, t)) {
        ctx.strokeStyle = '#ee4a2f'; ctx.lineWidth = T.t * 2; ctx.beginPath(); ctx.moveTo(T.ax, T.ay); ctx.lineTo(T.bx, T.by); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = T.t * 2; ctx.setLineDash([10, 10]); ctx.beginPath(); ctx.moveTo(T.ax, T.ay); ctx.lineTo(T.bx, T.by); ctx.stroke(); ctx.setLineDash([]);
      } else { ctx.strokeStyle = '#ee4a2f'; ctx.lineWidth = T.t * 2; ctx.beginPath(); ctx.moveTo(T.ax, T.ay); ctx.lineTo(T.ax + 8, T.ay + 70); ctx.stroke(); }
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
    for (const E of C.eagles) {
      const cl = E.at(t);
      if (!cl) continue;
      ctx.save(); ctx.translate(cl.x, cl.y - 18); if (E.dir > 0) ctx.scale(-1, 1);
      ctx.font = `64px ${EMOJI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🦅', 0, 0); ctx.restore();
    }
  }

  function signW(ctx, text) { ctx.font = '800 15px "JetBrains Mono", monospace'; return ctx.measureText(text).width + 26; }
  function signs(ctx, C) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const sg of C.signs) {
      const w = signW(ctx, sg.text);
      ctx.fillStyle = '#3a2a1d'; ctx.fillRect(sg.x - 3, sg.y + 14, 6, 34);
      ctx.fillStyle = '#5a3d27'; ctx.fillRect(sg.x - w / 2, sg.y - 16, w, 32);
      ctx.strokeStyle = '#8a6440'; ctx.lineWidth = 2; ctx.strokeRect(sg.x - w / 2, sg.y - 16, w, 32);
      ctx.fillStyle = '#f3ecdf'; ctx.fillText(sg.text, sg.x, sg.y + 1);
    }
  }

  /* Hele løypa i verdenskoordinater (kallet setter transformasjonen først) */
  function scene(ctx, C, v, t, time, o = {}) {
    mountain(ctx, C);
    city(ctx, C, v);
    track(ctx, C, o);
    moving(ctx, C, t, time, o);
    signs(ctx, C);
  }

  FL.KDraw = { EMOJI, stars, sky, mountain, city, track, moving, signs, signW, ball, scene };
})();
