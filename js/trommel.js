/* Fredagslotteriet – «Premiehjulet»: én vinner om gangen, med pause til premieutdelingen mellom hver.
   To stiler: hjul (standard – pekeren tikker sakte forbi navnene før den stopper) og glasstrommel.
   Spillets id er «trommel» av historiske grunner (skipsloggen og lagret valg bruker den). */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u, Ev = FL.Events, Store = FL.Store;
  const { Eng, E, ABORT } = FL.Engine;
  const S = () => FL.Audio;
  const VW = 1600, VH = 900, TAU = Math.PI * 2;
  const D = { x: 500, y: 480, r: 270 }; // glasstrommelen
  const NECK = 92; // halsen på toppen der kula suges opp
  const WH = { x: 470, y: 452, r: 330, hub: 66 }; // hjulet
  const PTR = { x: WH.x + WH.r + 52, y: WH.y }; // pekerens dreiepunkt, til høyre for hjulet
  const READ = { x: 905, y: 384, w: 585, h: 140 }; // «Pekeren står på …»
  const SHOW = { x: 800, y: 330, r: 118 }; // der vinnerkula vises stort
  const MEDAL = ['🥇', '🥈', '🥉'];
  const STALE = 12 * 3600 * 1000; // en påbegynt trekning kan fortsettes samme dag
  const STYLE_KEY = 'fredagslotteriet:premie-stil';
  const NAMES = ['Kari Nordmann', 'Ola Nordmann', 'Tor-Erik', 'Siv', 'Bjørnar', 'Hanne', 'Frode', 'Mona', 'Geir', 'Lise', 'Arnt', 'Trine', 'Rune', 'Ingrid', 'Stig', 'Unni'];
  const FONT = { mono: '"JetBrains Mono", ui-monospace, monospace', ui: '"Schibsted Grotesk", "Segoe UI", system-ui, sans-serif', disp: 'Fraunces, Georgia, serif', emoji: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif' };
  const mod = (a, m) => ((a % m) + m) % m;
  const savedStyle = () => { try { return localStorage.getItem(STYLE_KEY) === 'trommel' ? 'trommel' : 'hjul'; } catch (e) { return 'hjul'; } };

  /* ---------- Tegnehjelpere ---------- */
  const shades = new Map();
  function shade(hex) {
    let s = shades.get(hex);
    if (s) return s;
    const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const mix = (k) => `rgb(${c.map((v) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)).join(',')})`;
    s = { light: mix(0.35), dark: mix(-0.45) };
    shades.set(hex, s);
    return s;
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function brass(ctx, y0, y1) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#ffe7a3'); g.addColorStop(0.45, '#d4a046'); g.addColorStop(1, '#7d5216');
    return g;
  }
  function fit(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    let s = text;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }
  /* Lotterikule: farget kule med en hvit skive og nummeret. face = 1 snur skiva rett mot oss. */
  function ball(ctx, x, y, r, color, label, a, alpha = 1, face = 0) {
    const sh = shade(color);
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.06, x, y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.2, sh.light); g.addColorStop(0.72, color); g.addColorStop(1, sh.dark);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    const k = 1 - face;
    const dx = Math.sin(a) * r * 0.26 * k, dy = Math.sin(a * 0.7 + 1) * r * 0.12 * k;
    const dr = r * 0.6;
    ctx.fillStyle = '#fbf7ee';
    ctx.beginPath(); ctx.ellipse(x + dx, y + dy, dr * (1 - Math.abs(dx) / (r * 1.7)), dr * (1 - Math.abs(dy) / (r * 1.7)), 0, 0, TAU); ctx.fill();
    const fs = Math.min(dr * 1.05, (dr * 1.75) / (0.62 * Math.max(2, label.length)));
    ctx.font = `800 ${fs.toFixed(1)}px ${FONT.mono}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0f1b29'; ctx.fillText(label, x + dx, y + dy + fs * 0.05);
    ctx.fillStyle = 'rgba(255,255,255,.32)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.36, y - r * 0.5, r * 0.28, r * 0.14, -0.6, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }

  class Trommel {
    constructor(stage) {
      this.stage = stage;
      this.canvas = u.$('#trommelCanvas', stage);
      this.ctx = this.canvas.getContext('2d');
      this.fx = new FL.FX(u.$('#trommelFx', stage));
      this.fx.camera = () => this.view();
      this.el = {
        an: u.$('#announce', stage), ev: u.$('#evWrap', stage),
        pax: u.$('#paxList', stage), log: u.$('#logList', stage), paxCount: u.$('#paxCount', stage), logCount: u.$('#logCount', stage),
        start: u.$('#startOverlay', stage), end: u.$('#endOverlay', stage), sideBody: u.$('.side-body', stage),
        bar: document.createElement('div'),
      };
      // kontrollpanelet nederst: «Trekk neste» – du bestemmer tempoet
      this.el.bar.className = 'tr-bar';
      this.el.bar.hidden = true;
      this.el.bar.setAttribute('aria-live', 'polite');
      this.canvas.parentElement.appendChild(this.el.bar);
      this.cw = 0; this.ch = 0; this.dpr = 1; this.map = { s: 1, ox: 0, oy: 0 };
      this.token = 0; this.active = false; this.state = 'idle'; this.ses = null; this.style = savedStyle();
      this.balls = []; this.byNo = new Map(); this.ballR = 30; this.prevKey = null;
      this.segs = []; this.rot = 0; this.flick = 0; this.curSeg = null; this.wonSeg = null; this.spinning = false; this.lastTick = 0; this.curRow = null;
      this.mix = 0.12; this.dim = 0; this.boardA = 1; this.readA = 0; this.hero = null; this.landed = 0; this.time = 0; this.fanA = 0;
      this.rows = new Map(); this.logN = 0;
      this.face = null; this.faceKey = '';
      // hjulflaten tegnes på nytt når nettfontene er klare
      if (document.fonts) { document.fonts.ready.then(() => { this.faceKey = ''; }); if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => { this.faceKey = ''; }); }
      this.resize();
      if ('ResizeObserver' in window) new ResizeObserver(() => this.resize()).observe(this.canvas);
      this.bind();
    }
    resize() {
      const r = this.canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.cw = r.width; this.ch = r.height;
      this.canvas.width = Math.round(r.width * this.dpr);
      this.canvas.height = Math.round(r.height * this.dpr);
      const s = Math.min(r.width / VW, r.height / VH); // hele scenen får plass, uansett format
      this.map = { s, ox: (r.width - VW * s) / 2, oy: (r.height - VH * s) / 2 };
    }
    view() { const s = this.map.s, w = this.cw / s, h = this.ch / s; return { x: (VW - w) / 2, y: (VH - h) / 2, w, h }; }
    get wheel() { return this.style === 'hjul'; }
    where() { return this.wheel ? 'på hjulet' : 'i trommelen'; }

    /* ---------- Loddene: felt på hjulet eller kuler i trommelen ---------- */
    build(tickets, rec) {
      const won = new Set(rec ? rec.winners : []);
      const wonK = new Set(rec && rec.uniq ? rec.winners.map((no) => u.normName(rec.tickets[no - 1].name)) : []);
      const list = tickets.filter((t) => !won.has(t.no) && !wonK.has(u.normName(t.name)));
      const base = (t) => ({ no: t.no, name: t.name, k: u.normName(t.name), label: t.label || u.pad(t.no), color: u.colorFor(t.name), state: 'in' });
      this.wonSeg = null; this.curSeg = null; this.spinning = false;
      if (this.wheel) {
        // tilfeldig rekkefølge rundt hjulet (bare pynt – alle felt er like store, akkurat som sjansen)
        this.segs = u.shuffle(list, (n) => Math.floor(Math.random() * n)).map((t) => ({ ...base(t), w: 1 }));
        this.balls = []; this.byNo = new Map();
        return;
      }
      this.segs = [];
      const r = u.clamp(D.r * Math.sqrt(0.28 / Math.max(1, tickets.length)), 15, 42);
      this.ballR = r;
      this.balls = list.map((t) => {
        const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * (D.r - r - 6);
        return { ...base(t), x: D.x + Math.cos(a) * d, y: D.y + Math.sin(a) * d, vx: 0, vy: 0, r, dr: r, a: Math.random() * TAU, alpha: 1 };
      });
      this.byNo = new Map(this.balls.map((b) => [b.no, b]));
      for (let i = 0; i < 200; i++) this.step(1 / 240); // la dem legge seg til ro før noen ser dem
    }
    /* Enkel fysikk i trommelen (bare pynt – vinneren er allerede trukket når kula suges opp) */
    step(dt) {
      const m = this.mix;
      const live = this.balls.filter((b) => b.state === 'in');
      const kick = 2 + 26 * m, push = 0.25 + m, damp = Math.exp(-(0.4 + (1 - m) * 0.8) * dt);
      for (const b of live) {
        b.vy += 1500 * dt;
        // luft blåses inn i bunnen: tilfeldige støt, sterkest nederst
        const depth = u.clamp((b.y - (D.y - D.r)) / (2 * D.r), 0, 1);
        if (Math.random() < dt * kick * depth * depth) {
          b.vy -= (380 + Math.random() * 900) * push;
          b.vx += (Math.random() - 0.5) * 900 * push;
        }
        const dx = b.x - D.x, dy = b.y - D.y;
        b.vx += -dy * 0.9 * m * dt; b.vy += dx * 0.9 * m * dt; // virvel
        b.vx *= damp; b.vy *= damp;
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.a += (b.vx * dt) / b.r;
      }
      for (let i = 0; i < live.length; i++) {
        const a = live[i];
        for (let j = i + 1; j < live.length; j++) {
          const c = live[j];
          const dx = c.x - a.x, dy = c.y - a.y, min = a.r + c.r, d2 = dx * dx + dy * dy;
          if (d2 >= min * min || d2 < 1e-6) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (min - d) / 2;
          a.x -= nx * ov; a.y -= ny * ov; c.x += nx * ov; c.y += ny * ov;
          const rv = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
          if (rv < 0) { const imp = -1.82 * rv / 2; a.vx -= imp * nx; a.vy -= imp * ny; c.vx += imp * nx; c.vy += imp * ny; }
        }
      }
      for (const b of live) {
        const dx = b.x - D.x, dy = b.y - D.y, d = Math.hypot(dx, dy) || 1, lim = D.r - b.r - 4;
        if (d <= lim) continue;
        const nx = dx / d, ny = dy / d;
        b.x = D.x + nx * lim; b.y = D.y + ny * lim;
        const vn = b.vx * nx + b.vy * ny;
        if (vn > 0) { b.vx -= 1.6 * vn * nx; b.vy -= 1.6 * vn * ny; }
      }
    }
    /* Hjulet: feltene i rekkefølge, med vinkel. Felt som tas ut, krymper mykt (w → 0). */
    wheelLayout() {
      const list = this.segs.filter((s) => s.w > 0.001);
      const tot = list.reduce((a, s) => a + s.w, 0) || 1;
      let a = 0;
      return list.map((s) => { const sw = (s.w / tot) * TAU; const o = { s, a0: a, a1: a + sw }; a += sw; return o; });
    }
    segUnder(lay) {
      const th = mod(-this.rot, TAU); // pekeren står klokka tre (vinkel 0)
      for (const o of lay) if (th >= o.a0 && th < o.a1) return o.s;
      return lay.length ? lay[lay.length - 1].s : null;
    }
    inDrum() { return this.wheel ? this.segs.filter((s) => s.state === 'in').length : this.balls.filter((b) => b.state === 'in').length; }
    eligible() {
      const rec = this.ses.rec;
      const won = new Set(rec.winners);
      const wonK = new Set(rec.uniq ? rec.winners.map((no) => u.normName(rec.tickets[no - 1].name)) : []);
      return rec.tickets.filter((t) => !won.has(t.no) && !wonK.has(u.normName(t.name))).map((t) => t.no);
    }
    tweenTo(key, v, ms) { const f = this[key]; return Eng.tween(ms, (p) => { this[key] = u.lerp(f, v, p); }, E.inOut); }

    /* ---------- Hovedløkke ---------- */
    frame(d, dtReal) {
      if (!this.active) return;
      const dt = Math.min(0.05, dtReal / 1000);
      this.time += dt;
      if (this.wheel) {
        if (!this.spinning && !this.wonSeg && this.state !== 'drawing') this.rot += dt * 0.1; // hjulet driver sakte når ingen trekker
        this.flick *= Math.exp(-dt * 13);
        this.trackPointer();
      } else {
        const n = Math.max(1, Math.ceil(dt * 240));
        for (let i = 0; i < n; i++) this.step(dt / n);
        this.fanA += dt * (2 + 28 * this.mix);
      }
      this.draw();
      this.fx.update(dtReal * Math.min(2, Eng.speed));
    }
    /* Hvem pekeren står på. Under spinnet: tikk, pekeren slår, og raden i lista lyser. */
    trackPointer() {
      const s = this.segUnder(this.wheelLayout());
      if (s === this.curSeg) return;
      this.curSeg = s;
      if (!this.spinning) return;
      this.flick = 1;
      const now = performance.now();
      if (now - this.lastTick > 30) { this.lastTick = now; S().flap(); }
      if (this.curRow) this.curRow.classList.remove('is-cur');
      this.curRow = s ? this.rows.get(s.no) || null : null;
      if (this.curRow) this.curRow.classList.add('is-cur');
    }
    clearCurRow() { if (this.curRow) this.curRow.classList.remove('is-cur'); this.curRow = null; }
    draw() {
      const { ctx } = this;
      if (!this.cw) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const m = this.map;
      ctx.setTransform(this.dpr * m.s, 0, 0, this.dpr * m.s, this.dpr * m.ox, this.dpr * m.oy);
      const v = this.view();
      this.drawFloor(v, this.wheel ? WH.x : D.x);
      this.drawBoard();
      if (this.wheel) { this.drawWheel(); this.drawReadout(); } else this.drawDrum();
      if (this.dim > 0.002) { ctx.fillStyle = `rgba(3,8,16,${this.dim.toFixed(3)})`; ctx.fillRect(v.x - 2, v.y - 2, v.w + 4, v.h + 4); }
      if (this.hero) this.drawHero();
    }
    drawFloor(v, cx) {
      const { ctx } = this;
      const fy = 846;
      const cone = ctx.createLinearGradient(0, v.y, 0, fy);
      cone.addColorStop(0, 'rgba(255,240,200,.09)'); cone.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = cone;
      ctx.beginPath(); ctx.moveTo(cx - 70, v.y); ctx.lineTo(cx + 70, v.y); ctx.lineTo(cx + 380, fy); ctx.lineTo(cx - 380, fy); ctx.closePath(); ctx.fill();
      const g = ctx.createLinearGradient(0, fy - 50, 0, fy + 110);
      g.addColorStop(0, 'rgba(3,8,16,0)'); g.addColorStop(0.35, 'rgba(3,8,16,.7)'); g.addColorStop(1, 'rgba(2,5,11,.95)');
      ctx.fillStyle = g; ctx.fillRect(v.x - 2, fy - 50, v.w + 4, v.y + v.h - fy + 52);
      ctx.save(); ctx.translate(cx, fy); ctx.scale(1, 0.13);
      const sp = ctx.createRadialGradient(0, 0, 0, 0, 0, 440);
      sp.addColorStop(0, 'rgba(94,242,181,.22)'); sp.addColorStop(1, 'rgba(94,242,181,0)');
      ctx.fillStyle = sp; ctx.beginPath(); ctx.arc(0, 0, 440, 0, TAU); ctx.fill();
      ctx.restore();
    }
    drawWheel() {
      const { ctx } = this, R = WH.r;
      const lay = this.wheelLayout();
      const noNums = this.ses ? !!this.ses.rec.noNums : Store.settings.noNums;
      // stativet
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.ellipse(WH.x, 856, 210, 18, 0, 0, TAU); ctx.fill();
      const pg = ctx.createLinearGradient(WH.x - 150, 0, WH.x + 150, 0);
      pg.addColorStop(0, '#0a1424'); pg.addColorStop(0.42, '#243c5e'); pg.addColorStop(1, '#09121f');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.moveTo(WH.x - 28, WH.y); ctx.lineTo(WH.x + 28, WH.y); ctx.lineTo(WH.x + 150, 850); ctx.lineTo(WH.x - 150, 850); ctx.closePath(); ctx.fill();
      ctx.fillStyle = brass(ctx, 838, 856); rr(ctx, WH.x - 172, 838, 344, 18, 7); ctx.fill();
      // ytterring med lyspærer
      ctx.fillStyle = '#0c192b'; ctx.beginPath(); ctx.arc(WH.x, WH.y, R + 24, 0, TAU); ctx.fill();
      ctx.strokeStyle = brass(ctx, WH.y - R, WH.y + R); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(WH.x, WH.y, R + 24, 0, TAU); ctx.stroke();
      const nb = 36, chase = Math.floor(this.time * (this.spinning ? 16 : 3)), blink = this.wonSeg && Math.floor(this.time * 5) % 2 === 0;
      for (let i = 0; i < nb; i++) {
        const a = (i / nb) * TAU, x = WH.x + Math.cos(a) * (R + 12), y = WH.y + Math.sin(a) * (R + 12);
        const on = this.wonSeg ? blink : (i + chase) % 3 === 0;
        if (on) { ctx.fillStyle = 'rgba(255,224,138,.28)'; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill(); }
        ctx.fillStyle = on ? '#fff3c4' : '#5a4620'; ctx.beginPath(); ctx.arc(x, y, 4.6, 0, TAU); ctx.fill();
      }
      // feltene: ferdig tegnet hjulflate som bare roteres (rask også med hundre navn)
      ctx.save(); ctx.translate(WH.x, WH.y); ctx.rotate(this.rot);
      ctx.drawImage(this.wheelFace(lay, noNums), -R - 2, -R - 2, 2 * R + 4, 2 * R + 4);
      const won = this.wonSeg && lay.find((o) => o.s === this.wonSeg);
      if (won) {
        ctx.fillStyle = `rgba(255,255,255,${(0.22 + 0.2 * Math.sin(this.time * 9)).toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, won.a0, won.a1); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = '#d4a046'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(WH.x, WH.y, R + 1, 0, TAU); ctx.stroke();
      // navet
      const hg = ctx.createRadialGradient(WH.x - 18, WH.y - 22, 6, WH.x, WH.y, WH.hub);
      hg.addColorStop(0, '#2c4a73'); hg.addColorStop(1, '#0b1626');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(WH.x, WH.y, WH.hub, 0, TAU); ctx.fill();
      ctx.strokeStyle = brass(ctx, WH.y - WH.hub, WH.y + WH.hub); ctx.lineWidth = 7; ctx.stroke();
      ctx.font = `48px ${FONT.emoji}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      ctx.fillText('🎁', WH.x, WH.y + 3);
      // pekeren (slår litt ned hver gang en pigg passerer)
      ctx.save(); ctx.translate(PTR.x, PTR.y); ctx.rotate(-this.flick * 0.34);
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
      const tip = WH.x + R - 16 - PTR.x;
      const pgr = ctx.createLinearGradient(0, -26, 0, 26);
      pgr.addColorStop(0, '#ff7a5c'); pgr.addColorStop(0.5, '#ee4a2f'); pgr.addColorStop(1, '#a82a17');
      ctx.fillStyle = pgr;
      ctx.beginPath(); ctx.moveTo(tip, 0); ctx.lineTo(8, -27); ctx.quadraticCurveTo(26, -28, 26, 0); ctx.quadraticCurveTo(26, 28, 8, 27); ctx.closePath(); ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.strokeStyle = '#3a0e06'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = brass(ctx, -10, 10); ctx.beginPath(); ctx.arc(10, 0, 9, 0, TAU); ctx.fill();
      ctx.restore();
    }
    /* Hjulflaten (felt, nummer, navn og pigger) tegnes på et eget lerret bare når feltene endrer seg */
    wheelFace(lay, noNums) {
      const R = WH.r, sc = this.map.s * this.dpr;
      const key = `${sc.toFixed(3)}|${noNums ? 1 : 0}|${lay.map((o) => `${o.s.no}:${o.s.w.toFixed(3)}${o.s.state === 'out' ? 'o' : ''}`).join(',')}`;
      if (this.face && this.faceKey === key) return this.face;
      const c = this.face || document.createElement('canvas');
      const size = Math.max(2, Math.ceil((2 * R + 4) * sc));
      c.width = size; c.height = size;
      const g = c.getContext('2d');
      g.setTransform(sc, 0, 0, sc, size / 2, size / 2);
      g.clearRect(-R - 2, -R - 2, 2 * R + 4, 2 * R + 4);
      if (!lay.length) { g.fillStyle = '#132a46'; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill(); }
      lay.forEach((o, i) => {
        g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, o.a0, o.a1); g.closePath();
        g.fillStyle = o.s.color; g.fill();
        if (i % 2) { g.fillStyle = 'rgba(0,0,0,.13)'; g.fill(); }
        if (o.s.state === 'out') { g.fillStyle = 'rgba(4,10,20,.5)'; g.fill(); }
      });
      const sh = g.createRadialGradient(0, 0, WH.hub, 0, 0, R);
      sh.addColorStop(0, 'rgba(0,0,0,.4)'); sh.addColorStop(0.45, 'rgba(0,0,0,0)'); sh.addColorStop(0.9, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.25)');
      g.fillStyle = sh; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
      // skillelinjer
      if (lay.length > 1) {
        g.strokeStyle = 'rgba(6,12,22,.55)'; g.lineWidth = lay.length > 60 ? 1.2 : 2;
        g.beginPath();
        for (const o of lay) { g.moveTo(Math.cos(o.a0) * WH.hub, Math.sin(o.a0) * WH.hub); g.lineTo(Math.cos(o.a0) * R, Math.sin(o.a0) * R); }
        g.stroke();
      }
      // nummer og navn langs hvert felt – vannrett og lesbart der pekeren står
      for (const o of lay) {
        const sw = o.a1 - o.a0, fs = Math.min(30, sw * R * 0.72 * 0.6);
        if (fs < 7.5) continue;
        g.save(); g.rotate((o.a0 + o.a1) / 2);
        g.textAlign = 'right'; g.textBaseline = 'middle'; g.lineJoin = 'round';
        g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = fs * 0.2; g.fillStyle = '#ffffff';
        let x = R - 20;
        if (!noNums) {
          g.font = `800 ${fs.toFixed(1)}px ${FONT.mono}`;
          g.strokeText(o.s.label, x, 0); g.fillText(o.s.label, x, 0);
          x -= g.measureText(o.s.label).width + fs * 0.6;
        }
        let nf = fs;
        g.font = `700 ${nf.toFixed(1)}px ${FONT.ui}`;
        const room = x - WH.hub - 16, wd = g.measureText(o.s.name).width;
        if (wd > room) { nf = Math.max(fs * 0.7, (fs * room) / wd); g.font = `700 ${nf.toFixed(1)}px ${FONT.ui}`; }
        const txt = fit(g, o.s.name, room);
        g.strokeText(txt, x, 0); g.fillText(txt, x, 0);
        g.restore();
      }
      // pigger på kanten – de er det pekeren slår mot
      g.fillStyle = '#f3ecdf';
      const pr = lay.length > 60 ? 2.6 : 4.2;
      for (const o of lay) { g.beginPath(); g.arc(Math.cos(o.a0) * (R - 9), Math.sin(o.a0) * (R - 9), pr, 0, TAU); g.fill(); }
      this.face = c; this.faceKey = key;
      return c;
    }
    /* Navnet pekeren står på, stort – det er her det kribler */
    drawReadout() {
      const s = this.curSeg;
      if (this.readA < 0.01 || !s) return;
      const { ctx } = this, R = READ, done = !!this.wonSeg;
      ctx.globalAlpha = this.readA;
      ctx.fillStyle = 'rgba(6,14,28,.9)'; rr(ctx, R.x, R.y, R.w, R.h, 24); ctx.fill();
      ctx.strokeStyle = done ? '#f6bd47' : 'rgba(94,242,181,.5)'; ctx.lineWidth = done ? 4 : 2.5; ctx.stroke();
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = `700 15px ${FONT.mono}`; ctx.fillStyle = done ? '#f6bd47' : '#5ef2b5';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
      ctx.fillText(done ? 'VINNEREN ER' : 'PEKEREN STÅR PÅ', R.x + 132, R.y + 40);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      ball(ctx, R.x + 70, R.y + 76, 44, s.color, s.label, 0, this.readA, 1);
      ctx.globalAlpha = this.readA;
      let fs = 58;
      ctx.font = `italic 800 ${fs}px ${FONT.disp}`;
      const maxW = R.w - 160, w = ctx.measureText(s.name).width;
      if (w > maxW) { fs = Math.max(30, Math.floor((fs * maxW) / w)); ctx.font = `italic 800 ${fs}px ${FONT.disp}`; }
      ctx.fillStyle = '#f3ecdf'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(fit(ctx, s.name, maxW), R.x + 132, R.y + 90);
      ctx.globalAlpha = 1;
    }
    drawDrum() {
      const { ctx } = this;
      const R = D.r, top = D.y + R - 10, base = 850;
      // stativet
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.ellipse(D.x, base + 6, 210, 18, 0, 0, TAU); ctx.fill();
      const pg = ctx.createLinearGradient(D.x - 150, 0, D.x + 150, 0);
      pg.addColorStop(0, '#0a1424'); pg.addColorStop(0.42, '#243c5e'); pg.addColorStop(1, '#09121f');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.moveTo(D.x - 72, top); ctx.lineTo(D.x + 72, top); ctx.lineTo(D.x + 150, base); ctx.lineTo(D.x - 150, base); ctx.closePath(); ctx.fill();
      ctx.fillStyle = brass(ctx, base - 12, base + 6); rr(ctx, D.x - 172, base - 12, 344, 18, 7); ctx.fill();
      ctx.fillStyle = brass(ctx, 796, 828); rr(ctx, D.x - 96, 796, 192, 32, 7); ctx.fill();
      ctx.font = `700 13px ${FONT.mono}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#3a2508';
      ctx.fillText('FREDAGSLOTTERIET', D.x, 813);
      // glasset bak
      const bg = ctx.createRadialGradient(D.x - R * 0.3, D.y - R * 0.35, R * 0.1, D.x, D.y, R);
      bg.addColorStop(0, 'rgba(170,225,255,.05)'); bg.addColorStop(0.8, 'rgba(150,215,255,.09)'); bg.addColorStop(1, 'rgba(150,215,255,.22)');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(D.x, D.y, R, 0, TAU); ctx.fill();
      // vifta i bunnen som blåser kulene rundt
      const fx = D.x, fy = D.y + R - 34;
      ctx.fillStyle = 'rgba(10,20,34,.9)'; ctx.beginPath(); ctx.arc(fx, fy, 30, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(212,160,70,.75)';
      for (let i = 0; i < 6; i++) {
        const a = this.fanA + (i * TAU) / 6;
        ctx.beginPath(); ctx.ellipse(fx + Math.cos(a) * 15, fy + Math.sin(a) * 15, 13, 5, a, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = brass(ctx, fy - 6, fy + 6); ctx.beginPath(); ctx.arc(fx, fy, 6, 0, TAU); ctx.fill();
      // kulene
      for (const b of this.balls) if (b.state === 'in' || b.state === 'pop') ball(ctx, b.x, b.y, b.dr, b.color, b.label, b.a, b.alpha);
      // glasset foran
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(94,242,181,.07)'; ctx.lineWidth = 18; ctx.beginPath(); ctx.arc(D.x, D.y, R + 6, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(200,232,255,.5)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(D.x, D.y, R, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.17)'; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(D.x, D.y, R - 20, Math.PI * 1.08, Math.PI * 1.42); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(D.x, D.y, R - 16, Math.PI * 0.12, Math.PI * 0.5); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.ellipse(D.x - R * 0.44, D.y - R * 0.56, 28, 13, -0.7, 0, TAU); ctx.fill();
      ctx.lineCap = 'butt';
      // kraver og halsen
      ctx.fillStyle = brass(ctx, D.y + R - 16, D.y + R + 12); rr(ctx, D.x - 74, D.y + R - 16, 148, 28, 9); ctx.fill();
      const nw = Math.max(50, this.ballR * 2 + 20), ny = D.y - R - 14 - NECK;
      ctx.fillStyle = 'rgba(150,215,255,.1)'; ctx.fillRect(D.x - nw / 2, ny, nw, NECK + 4);
      ctx.strokeStyle = 'rgba(200,232,255,.5)'; ctx.lineWidth = 3; ctx.strokeRect(D.x - nw / 2, ny, nw, NECK + 4);
      ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(D.x - nw / 2 + 6, ny + 6, 6, NECK - 8);
      ctx.fillStyle = brass(ctx, ny - 10, ny + 6); rr(ctx, D.x - nw / 2 - 10, ny - 10, nw + 20, 16, 6); ctx.fill();
      ctx.fillStyle = brass(ctx, D.y - R - 16, D.y - R + 14); rr(ctx, D.x - 58, D.y - R - 16, 116, 30, 9); ctx.fill();
    }
    boardGeo() {
      const ses = this.ses;
      const n = ses ? Math.max(1, ses.rec.planned, ses.rec.winners.length) : Math.max(1, Store.settings.winners);
      const rowH = Math.min(82, 540 / n), head = 106;
      const h = head + n * rowH + 18;
      return { x: 985, y: Math.max(100, Math.min(480 - h / 2, 780 - h)), w: 505, h, head, rowH, n }; // holdes over kontrollpanelet
    }
    slotOf(g, i) { return { x: g.x + 104, y: g.y + g.head + i * g.rowH + g.rowH / 2, r: Math.min(28, g.rowH * 0.36) }; }
    drawBoard() {
      const A = this.boardA;
      if (A < 0.01) return;
      const { ctx } = this, g = this.boardGeo(), ses = this.ses;
      const rec = ses ? ses.rec : null;
      ctx.globalAlpha = A;
      ctx.fillStyle = 'rgba(6,14,28,.8)'; rr(ctx, g.x, g.y, g.w, g.h, 26); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = `700 15px ${FONT.mono}`; ctx.fillStyle = '#5ef2b5';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
      ctx.fillText('PREMIEBORDET', g.x + 30, g.y + 44);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      const won = rec ? this.landed : 0;
      ctx.font = `800 34px ${FONT.disp}`; ctx.fillStyle = '#eaf1f7';
      ctx.fillText(rec ? `${won} av ${g.n} har fått premie` : `${g.n} ${g.n === 1 ? 'vinner' : 'vinnere'} trekkes`, g.x + 30, g.y + 86);
      const next = rec && (this.state === 'ready' || this.state === 'pause') ? rec.winners.length : -1;
      for (let i = 0; i < g.n; i++) {
        const ry = g.y + g.head + i * g.rowH, s = this.slotOf(g, i);
        ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(g.x + 22, ry, g.w - 44, 1.5);
        if (i === next) {
          ctx.strokeStyle = `rgba(94,242,181,${(0.35 + 0.25 * Math.sin(this.time * 3)).toFixed(3)})`; ctx.lineWidth = 2.5;
          rr(ctx, g.x + 12, ry + 4, g.w - 24, g.rowH - 8, 14); ctx.stroke();
        }
        if (i < 3) { ctx.font = `${Math.min(32, g.rowH * 0.46).toFixed(0)}px ${FONT.emoji}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(MEDAL[i], g.x + 46, s.y + 1); }
        else { ctx.font = `800 ${Math.min(22, g.rowH * 0.4).toFixed(0)}px ${FONT.mono}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#93a8bd'; ctx.fillText(`${i + 1}.`, g.x + 46, s.y); }
        const t = rec && i < won ? rec.tickets[rec.winners[i] - 1] : null;
        const tx = s.x + s.r + 22, maxW = g.x + g.w - 26 - tx;
        if (t) {
          ball(ctx, s.x, s.y, s.r, u.colorFor(t.name), t.label || u.pad(rec.winners[i]), 0, A, 1);
          ctx.globalAlpha = A; ctx.textAlign = 'left'; // ball() midtstiller teksten og nullstiller gjennomsiktigheten
          const fs = Math.min(28, g.rowH * 0.36);
          ctx.font = `700 ${fs.toFixed(0)}px ${FONT.ui}`; ctx.fillStyle = '#eaf1f7'; ctx.textBaseline = rec.noNums ? 'middle' : 'alphabetic';
          ctx.fillText(fit(ctx, t.name, maxW), tx, rec.noNums ? s.y : s.y + fs * 0.12);
          if (!rec.noNums) { ctx.font = `500 ${Math.min(15, g.rowH * 0.22).toFixed(0)}px ${FONT.mono}`; ctx.fillStyle = '#93a8bd'; ctx.textBaseline = 'top'; ctx.fillText(`lodd ${t.label}`, tx, s.y + fs * 0.3); }
        } else {
          ctx.setLineDash([5, 6]); ctx.strokeStyle = 'rgba(255,255,255,.24)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
          ctx.font = `800 ${(s.r * 0.9).toFixed(0)}px ${FONT.mono}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillText('?', s.x, s.y + 1);
          ctx.textAlign = 'left';
          const giving = rec && i === won && ses.cur;
          ctx.font = `600 ${Math.min(21, g.rowH * 0.3).toFixed(0)}px ${FONT.ui}`;
          ctx.fillStyle = giving ? '#f6bd47' : i === next ? '#5ef2b5' : '#5f7891';
          ctx.fillText(giving ? '🎁 Får premien nå' : i === next ? 'Neste ut' : 'Ikke trukket ennå', tx, s.y);
        }
      }
      ctx.globalAlpha = 1;
    }
    drawHero() {
      const { ctx } = this, h = this.hero, b = h.b;
      if (h.glow > 0.01) {
        ctx.save(); ctx.translate(b.x, b.y);
        const gl = ctx.createRadialGradient(0, 0, b.dr * 0.6, 0, 0, b.dr * 2.6);
        gl.addColorStop(0, `rgba(246,189,71,${(0.4 * h.glow).toFixed(3)})`); gl.addColorStop(1, 'rgba(246,189,71,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, b.dr * 2.6, 0, TAU); ctx.fill();
        ctx.rotate(this.time * 0.25);
        ctx.fillStyle = `rgba(255,224,138,${(0.07 * h.glow).toFixed(3)})`;
        for (let i = 0; i < 12; i++) { const a = (i * TAU) / 12; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 460, a, a + 0.13); ctx.closePath(); ctx.fill(); }
        ctx.restore();
      }
      ball(ctx, b.x, b.y, b.dr, b.color, b.label, b.a, 1, h.face);
      if (h.nameA > 0.01) {
        const rec = this.ses.rec;
        ctx.globalAlpha = h.nameA;
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.font = `700 22px ${FONT.mono}`; ctx.fillStyle = '#5ef2b5';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
        ctx.fillText(`${h.rank}. VINNER${rec.noNums ? '' : ` · LODD ${b.label}`}`, SHOW.x, 520);
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        let fs = 96;
        ctx.font = `italic 800 ${fs}px ${FONT.disp}`;
        const w = ctx.measureText(b.name).width;
        if (w > 1180) { fs = Math.floor((fs * 1180) / w); ctx.font = `italic 800 ${fs}px ${FONT.disp}`; }
        ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30;
        ctx.fillStyle = '#f3ecdf'; ctx.fillText(b.name, SHOW.x, 604);
        ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
        ctx.font = `500 28px ${FONT.ui}`; ctx.fillStyle = '#c7d4e0';
        ctx.fillText('Kom og hent premien! 🎁', SHOW.x, 662);
        ctx.globalAlpha = 1;
      }
    }

    /* ---------- Sidepanelet ---------- */
    sideIdle() {
      this.el.pax.innerHTML = `<li class="side-empty">${this.wheel ? 'Hjulet fylles' : 'Trommelen fylles'} når trekningen starter.</li>`;
      this.el.log.innerHTML = '<li class="side-empty">Ingen vinnere ennå. Premiene venter.</li>';
      this.el.paxCount.textContent = '0'; this.el.logCount.textContent = '0';
    }
    buildManifest() {
      const rec = this.ses.rec;
      this.el.pax.innerHTML = rec.tickets.map((t) => `<li class="px" data-no="${t.no}"><span class="px-no">${u.esc(t.label || u.pad(t.no))}</span><span class="px-dot" style="background:${u.colorFor(t.name)}"></span><span class="px-name">${u.esc(t.name)}</span><span class="px-st"></span></li>`).join('');
      this.rows = new Map(u.$$('.px', this.el.pax).map((row) => [+row.dataset.no, row]));
      this.curRow = null;
      this.el.log.innerHTML = '';
      this.logN = 0;
      rec.winners.forEach((no, i) => { this.markWinner(no, i + 1, true); this.markSiblings(no); });
      this.updateCounts();
    }
    updateCounts() {
      if (!this.ses) return;
      this.el.paxCount.textContent = `${this.inDrum()}/${this.ses.rec.tickets.length}`;
      this.el.logCount.textContent = String(this.logN);
    }
    markWinner(no, rank, quiet) {
      const row = this.rows.get(no);
      if (!row) return;
      row.classList.add('is-win');
      row.querySelector('.px-st').textContent = MEDAL[rank - 1] || '🏁';
      if (!quiet) this.scrollRow(row);
    }
    markSiblings(no) {
      const rec = this.ses.rec;
      if (!rec.uniq) return;
      const k = u.normName(rec.tickets[no - 1].name);
      rec.tickets.forEach((t) => {
        if (t.no === no || u.normName(t.name) !== k) return;
        const row = this.rows.get(t.no);
        if (row) { row.classList.add('is-out'); row.querySelector('.px-st').textContent = '🎁'; row.title = 'Har allerede vunnet'; }
      });
    }
    logLine(icon, html, small) {
      const li = document.createElement('li');
      li.className = 'lg';
      li.innerHTML = `<span>${icon}</span><div>${small ? `<small>${u.esc(small)}</small>` : ''}${html}</div>`;
      const first = this.el.log.querySelector('.side-empty');
      if (first) first.remove();
      this.el.log.prepend(li);
      this.logN++;
      this.updateCounts();
    }

    /* ---------- Kontrollpanelet ---------- */
    renderBar() {
      const bar = this.el.bar;
      if (!this.active || !this.ses || this.state === 'idle') { bar.hidden = true; bar.innerHTML = ''; return; }
      const rec = this.ses.rec, n = rec.winners.length, W = rec.planned;
      const left = this.eligible().length;
      const btn = (act, label, primary) => `<button type="button" class="btn ${primary ? 'btn-primary' : 'btn-ghost'}" data-tr="${act}">${label}</button>`;
      let msg = '', btns = '';
      if (this.state === 'drawing') msg = `<span class="tr-wait">${this.wheel ? 'Hjulet snurrer' : 'Trommelen går'}</span>`;
      else if (this.state === 'ready') {
        msg = `🎟️ <b>${this.inDrum()} lodd</b> ${this.where()} · ${W} ${W === 1 ? 'premie' : 'premier'}<small>Trykk når dere er klare · mellomrom virker også</small>`;
        btns = btn('next', `${this.wheel ? '🎡 Snurr for' : '🎁 Trekk'} 1. vinner`, true) + btn('cancel', 'Avbryt');
      } else if (this.state === 'pause') {
        const cur = this.ses.cur;
        const more = n < W && left > 0;
        msg = cur ? `🎁 Gi premien til <b>${u.esc(cur.name)}</b>` : `<b>${n} av ${W}</b> vinnere er trukket`;
        msg += `<small>${more ? `${left} lodd igjen · trykk når dere er klare for neste` : 'Det var siste premie'}</small>`;
        btns = more ? btn('next', `${this.wheel ? 'Snurr for' : 'Trekk'} ${n + 1}. vinner →`, true) + btn('end', 'Avslutt her')
          : btn('end', '🏁 Se alle vinnerne', true) + (left ? btn('next', '＋ Én vinner til') : '');
      } else if (this.state === 'done') {
        msg = 'Trekningen er ferdig.';
        btns = btn('new', 'Ny trekning', true);
      }
      bar.innerHTML = `<div class="tr-msg">${msg}</div>${btns ? `<div class="tr-btns">${btns}</div>` : ''}`;
      bar.hidden = false;
    }

    /* ---------- Oppsett ---------- */
    activate() { this.active = true; this.resize(); this.idle(); }
    deactivate() {
      this.abort(true);
      this.active = false; this.ses = null; this.state = 'idle'; this.hero = null; this.dim = 0;
      this.el.bar.hidden = true;
    }
    abort(silent) {
      this.token++;
      this.spinning = false;
      this.clearCurRow();
      Eng.speed = FL.Engine.userSpeed || 1;
      this.stage.classList.remove('is-running');
      if (!silent && this.active) this.idle();
    }
    idle() {
      this.abort(true);
      this.ses = null; this.state = 'idle'; this.hero = null; this.dim = 0; this.mix = 0.12; this.landed = 0;
      this.boardA = 1; this.readA = 0; this.flick = 0;
      this.style = savedStyle();
      this.fx.clear();
      this.el.ev.innerHTML = ''; this.el.an.innerHTML = '';
      this.sideIdle();
      this.prevKey = null;
      this.renderBar();
      this.renderStart();
    }
    setStyle(s) {
      if (this.ses || (s !== 'hjul' && s !== 'trommel') || s === this.style) return;
      this.style = s;
      try { localStorage.setItem(STYLE_KEY, s); } catch (e) { /* ikke viktig */ }
      this.prevKey = null;
      this.sideIdle();
      this.renderStart();
    }
    /* Mens ingenting er i gang: vis loddene som har betalt, bak startbildet */
    preview() {
      const people = Store.participants();
      const key = people.map((p) => `${p.name}:${p.tickets}:${p.nums.join(',')}`).join('|') + (Store.settings.noNums ? '#n' : '') + this.style;
      if (key === this.prevKey) return;
      this.prevKey = key;
      this.build(people.length ? Ev.createDraw(people, Store.settings, { game: 'trommel', demo: true }).tickets : [], null);
    }
    makeRecord(people, opts) {
      const d = Ev.createDraw(people, Store.settings, { game: 'trommel', ...opts });
      // Her trekkes ikke vinnerne på forhånd: hver vinner trekkes idet du trykker
      d.planned = d.winners.length;
      d.winners = []; d.winnersCount = 0; d.elim = []; d.beats = [];
      d.uniq = Store.settings.uniqueWinners !== false;
      d.style = this.style;
      if (!opts.demo) d.open = true;
      return d;
    }
    begin(rec, mode, saved) {
      this.abort(true);
      this.style = rec.style === 'hjul' ? 'hjul' : rec.style === 'trommel' || saved ? 'trommel' : this.style;
      this.ses = { rec, mode, saved: !!saved, cur: null };
      this.hero = null; this.dim = 0; this.mix = 0.12; this.landed = rec.winners.length;
      this.boardA = 1; this.readA = 0; this.flick = 0;
      this.fx.clear();
      this.el.ev.innerHTML = ''; this.el.an.innerHTML = '';
      this.build(rec.tickets, rec);
      this.buildManifest();
      this.hideOverlay(this.el.start); this.hideOverlay(this.el.end);
      const left = rec.leftBehind || [];
      if (left.length) this.logLine('🧳', `Ikke med ${this.where()} (ikke betalt): ${u.joinNames(left.map((p) => `<b>${u.esc(p.name)}</b>`))}`, 'Før trekningen');
      if (saved) this.logLine('🎟️', `<b>${this.inDrum()} lodd</b> igjen ${this.where()}. ${rec.winners.length} av ${rec.planned} vinnere er trukket.`, 'Fortsetter trekningen');
      else this.logLine('🎟️', `<b>${rec.tickets.length} lodd</b> ${this.where()}. ${rec.planned} ${rec.planned === 1 ? 'premie skal' : 'premier skal'} deles ut.`, mode === 'demo' ? 'Prøvetur · lagres ikke' : 'Klar');
      this.state = rec.winners.length ? 'pause' : 'ready';
      this.renderBar();
      if (!saved) this.announce(this.wheel ? 'Premie&shy;hjulet' : 'Trommelen', mode === 'demo' ? 'Prøvetur · lagres ikke' : 'Én vinner om gangen', 2000);
    }
    startLive() {
      const people = Store.participants();
      if (!people.length) { u.toast('Ingen har betalt ennå – bekreft betaling i påmeldingen.'); return; }
      S().unlock();
      this.begin(this.makeRecord(people, { leftBehind: Store.leftBehind() }), 'live', false);
    }
    startDemo() {
      S().unlock();
      const max = Store.settings.maxPerPerson;
      const pool = u.shuffle(Array.from({ length: 99 }, (_, i) => i + 1));
      const people = u.shuffle(NAMES).slice(0, 12 + u.randInt(5)).map((n) => { const t = 1 + u.randInt(max); return { name: n, nums: pool.splice(0, t), tickets: t }; });
      const left = people.splice(0, 2).map((p) => ({ name: p.name, nums: p.nums }));
      this.begin(this.makeRecord(people, { demo: true, leftBehind: left }), 'demo', false);
    }
    resume() {
      const rec = Trommel.openRecord();
      if (!rec) { this.renderStart(); return; }
      S().unlock();
      this.begin(rec, 'live', true);
    }
    /* Første vinner låser trekningen i skipsloggen. Starter du og angrer før det, er ingenting endret. */
    lock() {
      const ses = this.ses, rec = ses.rec;
      if (ses.mode !== 'live') return;
      if (!ses.saved) {
        rec.date = new Date().toISOString();
        Store.addRecord(rec);
        Store.resetPaid(); // neste fredag starter alle som «ikke betalt» igjen
        ses.saved = true;
      } else Store.updateRecord(rec.id, { winners: rec.winners.slice(), winnersCount: rec.winners.length });
    }

    /* ---------- Selve trekningen, én og én ---------- */
    async drawNext() {
      if (!this.ses || (this.state !== 'ready' && this.state !== 'pause')) return;
      const ses = this.ses, rec = ses.rec;
      const pool = this.eligible();
      if (!pool.length) { u.toast(`Det er ingen lodd igjen ${this.where()}.`); return; }
      const token = this.token;
      const w = async (p) => { await p; if (token !== this.token) throw ABORT; };
      this.state = 'drawing';
      Eng.speed = FL.Engine.userSpeed || 1;
      this.stage.classList.add('is-running');
      this.renderBar();
      S().unlock();
      try {
        await w(this.stow());
        // Vinneren trekkes nå, med kryptografisk tilfeldighet blant loddene som er igjen – og låses med en gang.
        // Hjulet og trommelen viser bare fram det som allerede er avgjort.
        const no = pool[u.randInt(pool.length)];
        rec.winners.push(no);
        rec.winnersCount = rec.winners.length;
        this.lock();
        const rank = rec.winners.length;
        const h = this.wheel ? await this.spinTo(no, rank, w) : await this.suckUp(no, rank, w);
        await this.present(h, no, w);
      } catch (e) { if (e !== ABORT) console.error(e); }
    }
    /* Hjulet: fort i starten, så bremser det lenge, og de siste navnene tikker sakte forbi pekeren */
    async spinTo(no, rank, w) {
      this.announce(`${rank}. vinner`, 'Hjulet snurrer', 1700);
      this.tweenTo('boardA', 0.08, 400);
      this.tweenTo('readA', 1, 400);
      const lay = this.wheelLayout();
      const o = lay.find((x) => x.s.no === no);
      const sw = o.a1 - o.a0;
      // Hvor i vinnerens felt pekeren stopper. Ofte helt ytterst: enten krøp den så vidt over fra naboen,
      // eller så stoppet den rett før neste. Det er bare teater – vinneren er allerede trukket.
      const r = Math.random();
      const f = r < 0.38 ? 0.03 + Math.random() * 0.11 : r < 0.76 ? 0.86 + Math.random() * 0.11 : 0.25 + Math.random() * 0.5;
      const target = o.a0 + f * sw; // stedet på hjulet som skal stå under pekeren
      const rot0 = this.rot;
      const turns = lay.length < 10 ? 4 : 3;
      const back = 0.1; // et lite drag bakover før kastet
      const d = mod(-target - (rot0 - back), TAU) + TAU * turns;
      const T = 8200 + Math.min(1600, lay.length * 16);
      // jo flere navn, jo brattere oppbremsing – de siste ~2 navnene skal ta et par sekunder
      const k = u.clamp(Math.log(2.2 / (d / sw)) / Math.log(1700 / T), 1.7, 4.5);
      await w(Eng.tween(450, (p) => { this.rot = rot0 - back * p; }, E.inOut));
      S().whoosh();
      this.spinning = true;
      let beat = false;
      const rotW = this.rot;
      await w(Eng.tween(T, (p) => {
        this.rot = rotW + d * (1 - Math.pow(1 - p, k));
        if (!beat && p > 1 - 2100 / T) { beat = true; S().heartbeat(); }
      }, E.linear));
      this.spinning = false;
      this.rot = rotW + d;
      this.flick = 0.6;
      const seg = this.segs.find((s) => s.no === no);
      seg.state = 'won';
      this.wonSeg = seg; this.curSeg = seg;
      this.clearCurRow();
      this.updateCounts();
      S().pop();
      this.fx.sparkles(WH.x + WH.r, WH.y, 30, '#ffe08a');
      await w(Eng.wait(900));
      // kula i navneskiltet blir vinnerkula
      const b = { x: READ.x + 70, y: READ.y + 76, r: 44, dr: 44, a: 0, color: seg.color, label: seg.label, name: seg.name, state: 'top' };
      const h = { b, rank, face: 1, glow: 0, nameA: 0 };
      this.hero = h;
      this.tweenTo('readA', 0, 350);
      return h;
    }
    /* Trommelen: luft blåser kulene rundt, og én suges opp i halsen */
    async suckUp(no, rank, w) {
      const b = this.byNo.get(no);
      this.announce(`${rank}. vinner`, `Trommelen går · ${this.inDrum()} lodd`, 1900);
      S().wind(); S().roll(2.4);
      this.tweenTo('mix', 1, 600);
      await w(Eng.wait(2700));
      b.state = 'top';
      const h = { b, rank, face: 0, glow: 0, nameA: 0 };
      this.hero = h;
      this.updateCounts();
      S().whoosh();
      const x0 = b.x, y0 = b.y, mouth = D.y - D.r + b.r + 2;
      await w(Eng.tween(520, (p) => { b.x = u.lerp(x0, D.x, p); b.y = u.lerp(y0, mouth, p); b.a += 0.25; }, E.in));
      const neckTop = D.y - D.r - 14 - NECK - b.r - 4;
      await w(Eng.tween(380, (p) => { b.y = u.lerp(mouth, neckTop, p); }, E.out));
      this.tweenTo('mix', 0.12, 1400);
      S().pop();
      return h;
    }
    /* Vinnerkula fram, stor og tydelig – og så navnet */
    async present(h, no, w) {
      const ses = this.ses, rec = ses.rec, b = h.b, rank = h.rank;
      const sx = b.x, sy = b.y, r0 = b.dr, a0 = b.a, f0 = h.face;
      this.tweenTo('dim', 0.8, 700);
      await w(Eng.tween(950, (p) => {
        const q = E.inOut(p);
        b.x = u.lerp(sx, SHOW.x, q); b.y = u.lerp(sy, SHOW.y, q) - Math.sin(p * Math.PI) * 90;
        b.dr = u.lerp(r0, SHOW.r, E.outBack(p)); b.a = a0 + p * 9; h.face = u.lerp(f0, 1, q); h.glow = q;
      }, E.linear));
      await w(Eng.wait(this.wheel ? 200 : 800)); // på hjulet har navnet alt stått der – i trommelen kommer tallet først
      const t = rec.tickets[no - 1];
      ses.cur = { no, name: t.name };
      this.markWinner(no, rank);
      this.logLine(MEDAL[rank - 1] || '🏁', `<b>${u.esc(t.name)}</b>${rec.noNums ? '' : ` med lodd ${u.esc(t.label)}`}`, `${rank}. vinner`);
      await w(Eng.tween(420, (p) => { h.nameA = p; }, E.out));
      this.fx.sparkles(SHOW.x, SHOW.y, 36, '#ffe08a');
      if (rank === 1) { S().fanfare(); this.fx.confetti(220); this.fireworks(3); } else { S().ding(); S().sparkle(); this.fx.confetti(110); }
      this.state = 'pause';
      Eng.speed = FL.Engine.userSpeed || 1;
      this.stage.classList.remove('is-running');
      this.renderBar();
    }
    /* Forrige vinner går til premiebordet. Har hen flere lodd, tas de ut (én premie per person). */
    async stow() {
      const ses = this.ses, h = this.hero;
      if (!h || !ses.cur) { this.hero = null; return; }
      const b = h.b, slot = this.slotOf(this.boardGeo(), this.landed);
      const sx = b.x, sy = b.y, r0 = b.dr;
      this.tweenTo('dim', 0, 500);
      this.tweenTo('boardA', 1, 350);
      await Eng.tween(650, (p) => {
        b.x = u.lerp(sx, slot.x, p); b.y = u.lerp(sy, slot.y, p) - Math.sin(p * Math.PI) * 60;
        b.dr = u.lerp(r0, slot.r, p); h.nameA = Math.max(0, 1 - p * 2.5); h.glow = 1 - p;
      }, E.inOut);
      if (this.ses !== ses) return;
      this.hero = null; b.state = 'gone';
      this.landed++;
      S().pop();
      const no = ses.cur.no;
      ses.cur = null;
      const name = ses.rec.tickets[no - 1].name, k = u.normName(name);
      const uniq = ses.rec.uniq;
      const sibText = (n) => `${u.esc(name)} har vunnet – ${n === 1 ? 'det andre loddet' : `de ${n} andre loddene`} er tatt ut ${this.wheel ? 'av hjulet' : 'av trommelen'}.`;
      if (this.wheel) {
        // vinnerens felt (og de andre loddene hens) krymper bort, og hjulet lukker seg rundt
        this.wonSeg = null;
        const out = this.segs.filter((s) => s.no === no || (uniq && s.state === 'in' && s.k === k));
        out.forEach((s) => { s.state = 'out'; });
        const sib = out.filter((s) => s.no !== no).length;
        if (sib) { this.markSiblings(no); this.logLine('🎁', sibText(sib)); }
        await Eng.tween(600, (p) => { out.forEach((s) => { s.w = 1 - p; }); }, E.inOut);
        this.segs = this.segs.filter((s) => s.state !== 'out');
        this.updateCounts();
        return;
      }
      if (!uniq) return;
      const sib = this.balls.filter((x) => x.state === 'in' && x.k === k);
      if (!sib.length) return;
      sib.forEach((x) => { x.state = 'pop'; this.fx.sparkles(x.x, x.y, 10, '#f6bd47'); });
      this.markSiblings(no);
      this.logLine('🎁', sibText(sib.length));
      await Eng.tween(450, (p) => { sib.forEach((x) => { x.alpha = 1 - p; x.dr = x.r * (1 + 0.6 * p); }); }, E.out);
      sib.forEach((x) => { x.state = 'gone'; });
      this.updateCounts();
    }
    async finish() {
      if (!this.ses || this.state !== 'pause') return;
      const ses = this.ses, token = this.token;
      this.state = 'drawing';
      this.renderBar();
      await this.stow();
      if (token !== this.token || this.ses !== ses) return;
      if (ses.mode === 'live' && ses.saved) Store.updateRecord(ses.rec.id, { open: false });
      await Eng.wait(450);
      if (token !== this.token) return;
      this.state = 'done';
      this.renderBar();
      this.showEnd();
    }
    skip() {
      if (this.state !== 'drawing') return;
      Eng.speed = 6;
      S().whoosh();
    }
    fireworks(n) {
      for (let i = 0; i < n; i++) setTimeout(() => { if (!this.active) return; this.fx.firework(320 + Math.random() * 960, 110 + Math.random() * 200); S().boom(); }, i * 380 + Math.random() * 200);
    }

    /* ---------- Overlays ---------- */
    static openRecord() {
      return Store.history.find((h) => h.game === 'trommel' && h.open && !h.demo && Array.isArray(h.tickets) && Date.now() - new Date(h.date).getTime() < STALE) || null;
    }
    styleRow() {
      const b = (s, label) => `<button type="button" data-act="style" data-style="${s}" class="${this.style === s ? 'on' : ''}" aria-pressed="${this.style === s}">${label}</button>`;
      return `<div class="ov-style" role="group" aria-label="Velg hvordan vinnerne trekkes">${b('hjul', '🎡 Hjul')}${b('trommel', '🎱 Trommel')}</div>`;
    }
    renderStart() {
      if (!this.active || this.ses) return;
      this.preview();
      const open = Trommel.openRecord();
      const t = Store.totals();
      const W = Store.settings.winners;
      const kicker = `${this.wheel ? 'Premiehjulet' : 'Trommelen'} · én vinner om gangen`;
      let html;
      if (open) {
        const n = open.winners.length;
        html = `<div class="ov-card"><p class="ov-kicker">Trekningen er ikke ferdig</p><h3 class="ov-title">Fortsett <em>trekningen</em></h3>
          <p class="ov-sub">${n} av ${open.planned} ${open.planned === 1 ? 'vinner' : 'vinnere'} er trukket: <b>${u.esc(u.joinNames(Store.winnerNames(open)))}</b>. Resten av loddene er fortsatt med.</p>
          <div class="ov-btns"><button class="btn btn-primary" type="button" data-act="resume">▶ Fortsett trekningen</button><button class="btn btn-ghost" type="button" data-act="drop">Avslutt den</button></div>
          <p class="ov-fine">De som er trukket, står allerede i skipsloggen. Avslutter du, kan du starte en ny trekning.</p></div>`;
      } else if (!t.tickets) {
        html = `<div class="ov-card"><p class="ov-kicker">${kicker}</p><h3 class="ov-title">Ingen har <em>betalt</em></h3>
          <p class="ov-sub">${t.people ? `Bekreft betaling i påmeldingen – bare de som har betalt, kommer ${this.where()}.` : 'Legg inn passasjerer og bekreft betaling i påmeldingen først.'}</p>
          ${this.styleRow()}
          <div class="ov-btns"><a class="btn btn-primary" href="pamelding.html">Til påmeldingen</a><button class="btn btn-ghost" type="button" data-act="demo">${this.wheel ? '🎡' : '🎁'} Prøvetur</button></div>
          <p class="ov-fine">Prøveturer lagres ikke i skipsloggen.</p></div>`;
      } else {
        const left = Store.leftBehind();
        const n = Math.min(W, Store.settings.uniqueWinners ? t.paidPeople : t.tickets);
        html = `<div class="ov-card"><p class="ov-kicker">${kicker}</p><h3 class="ov-title">Klar for <em>${this.wheel ? 'premiehjulet' : 'trommelen'}</em></h3>
          <p class="ov-sub">${t.tickets} lodd ${this.where()}. Dere trekker <b>${u.numberWord(n)}</b> ${n === 1 ? 'vinner' : 'vinnere'} – én om gangen, med pause til premieutdelingen. Første som trekkes, velger premie først.</p>
          <div class="ov-facts"><span><b>${t.paidPeople}</b> betalt</span><span><b>${t.tickets}</b> lodd</span><span><b>${u.kr(t.pot)}</b> i potten</span></div>
          ${this.styleRow()}
          <div class="ov-btns"><button class="btn btn-primary" type="button" data-act="go">${this.wheel ? '🎡 Til hjulet' : '🎁 Fyll trommelen'}</button><button class="btn btn-ghost" type="button" data-act="demo">Prøvetur først</button></div>
          ${left.length ? `<p class="ov-warn">🧳 ${u.esc(u.joinNames(left.slice(0, 6).map((p) => p.name)))}${left.length > 6 ? ` og ${left.length - 6} til` : ''} har ikke betalt og kommer ikke ${this.where()}.</p>` : ''}
          <p class="ov-fine">Hver vinner trekkes med kryptografisk tilfeldighet i det øyeblikket du trykker, og låses i skipsloggen med en gang.</p></div>`;
      }
      this.el.start.innerHTML = html;
      this.el.start.hidden = false;
    }
    showEnd() {
      const { rec, mode } = this.ses;
      const ws = rec.winners.map((no, k) => ({ t: rec.tickets[no - 1], rank: k + 1 }));
      const podOrder = ws.length >= 3 ? [ws[1], ws[0], ws[2]].concat(ws.slice(3)) : (ws.length === 2 ? [ws[1], ws[0]] : ws);
      const pods = podOrder.map(({ t, rank }) => `<div class="pod p${rank <= 3 ? rank : 'n'}"><div class="pod-av" style="background:${u.colorFor(t.name)}">${u.esc(t.label)}</div><div class="pod-name">${u.esc(t.name)}</div><div class="pod-tix">${rec.noNums ? `${rank}. vinner` : `lodd ${u.esc(t.label)}`}</div><div class="pod-block">${rank}</div></div>`).join('');
      const live = mode === 'live';
      this.el.end.innerHTML = `<div class="ov-card">${live ? '' : '<span class="ov-badge">Prøvetur</span>'}<p class="ov-kicker">${this.wheel ? 'Premiehjulet' : 'Trommelen'} · ${u.esc(u.dfLong.format(new Date(rec.date)))}</p>
        <h3 class="ov-title">Gratulerer, <em>${ws.length === 1 ? 'vinner!' : 'vinnere!'}</em></h3>
        <div class="podium">${pods}</div>
        <p class="ov-sub">Premiene er delt ut. Innholdet er, som kjent, urelatert.</p>
        <div class="ov-btns">${live ? '<a class="btn btn-primary" href="historikk.html">Se skipsloggen</a><button class="btn btn-ghost" type="button" data-act="close">Ny trekning</button>' : `<button class="btn btn-primary" type="button" data-act="close">Tilbake til ${this.wheel ? 'hjulet' : 'trommelen'}</button>`}<button class="btn btn-ghost" type="button" data-act="hide">Se ${this.wheel ? 'hjulet' : 'trommelen'}</button></div>
        <p class="ov-fine">${live ? 'Lagret i skipsloggen.' : 'Prøveturer lagres ikke.'}</p></div>`;
      this.el.end.hidden = false;
    }

    /* ---------- Knapper ---------- */
    bind() {
      const mine = () => this.active && this.stage.dataset.game === 'trommel';
      u.$('#skipBtn', this.stage).addEventListener('click', () => { if (mine()) this.skip(); });
      const onAct = (e) => {
        if (!mine()) return;
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const act = b.dataset.act;
        if (act === 'go') this.startLive();
        else if (act === 'demo') this.startDemo();
        else if (act === 'style') this.setStyle(b.dataset.style);
        else if (act === 'resume') this.resume();
        else if (act === 'drop') { const r = Trommel.openRecord(); if (r) Store.updateRecord(r.id, { open: false }); }
        else if (act === 'hide') this.hideOverlay(this.el.end);
        else if (act === 'close') { this.hideOverlay(this.el.end); this.idle(); }
      };
      this.el.start.addEventListener('click', onAct);
      this.el.end.addEventListener('click', onAct);
      this.el.bar.addEventListener('click', (e) => {
        const b = e.target.closest('[data-tr]');
        if (!b || !mine()) return;
        const act = b.dataset.tr;
        if (act === 'next') this.drawNext();
        else if (act === 'end') this.finish();
        else if (act === 'cancel' || act === 'new') { this.hideOverlay(this.el.end); this.idle(); }
      });
      // mellomrom, Enter eller pil høyre = hovedknappen i panelet (greit når PC-en står på storskjerm)
      document.addEventListener('keydown', (e) => {
        if (!mine() || !this.ses || this.el.bar.hidden || !this.el.end.hidden) return;
        if (e.target.closest('input, textarea, select, dialog, button, a')) return;
        if (e.key !== ' ' && e.key !== 'Enter' && e.key !== 'ArrowRight') return;
        const b = this.el.bar.querySelector('.btn-primary');
        if (b) { e.preventDefault(); b.click(); }
      });
    }
  }

  ['announce', 'scrollRow', 'hideOverlay'].forEach((k) => { Trommel.prototype[k] = FL.Voyage.prototype[k]; });
  FL.Trommel = Trommel;
})();
