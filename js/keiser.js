/* Fredagslotteriet – «Keiservarden Grand Prix»: kuleløp fra Keiservarden ned til Bodø havn.
   Løpet simuleres først (keiser-physics.js). Kula som faktisk kom først får nummeret til den som ble trukket som vinner. */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u, Ev = FL.Events, Store = FL.Store, P = FL.KPhys;
  const { Eng, ABORT } = FL.Engine;
  const S = () => FL.Audio;
  const R = P.R;
  const NAMES = ['Kari Nordmann', 'Ola Nordmann', 'Tor-Erik', 'Siv', 'Bjørnar', 'Hanne', 'Frode', 'Mona', 'Geir', 'Lise', 'Arnt', 'Trine', 'Rune', 'Ingrid', 'Stig', 'Unni', 'Kjell-Ove', 'Randi', 'Svein', 'Gunn', 'Per', 'Oda'];
  const CAUSE_SAY = {
    k_vind: (n) => ['Bodø-vind!', `Å nei! ${n} blåste ned i Juvet!`],
    k_ornes: (n) => ['Feil avkjøring!', `${n} falt gjennom Ørnes-luka. Kor e han på vei? Ørnes!`],
    k_orna: (n) => ['ØRNA!', `Ørna tok ${n}! Den ser vi aldri igjen.`],
    k_glimt: (n) => ['Glimt-hjulet!', `${n} ble slått rett ut av Glimt-hjulet!`],
    k_kant: (n) => ['Utfor kanten!', `${n} trillet utfor kanten. Det e langt ned.`],
    k_fast: (n) => ['Snøfonna', `${n} satt fast i ei snøfonn.`],
  };
  const darker = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (c) => Math.round(c * k); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };

  class Keiser {
    constructor(stage) {
      this.stage = stage;
      this.canvas = u.$('#keiserCanvas', stage);
      this.ctx = this.canvas.getContext('2d');
      this.fx = new FL.FX(u.$('#keiserFx', stage));
      this.fx.camera = () => this.view();
      this.el = {
        an: u.$('#announce', stage), ev: u.$('#evWrap', stage), route: u.$('#route', stage),
        pax: u.$('#paxList', stage), log: u.$('#logList', stage), paxCount: u.$('#paxCount', stage), logCount: u.$('#logCount', stage),
        start: u.$('#startOverlay', stage), end: u.$('#endOverlay', stage), sideBody: u.$('.side-body', stage),
      };
      this.cam = { x: 800, y: 160, vh: 620 };
      this.cw = 0; this.ch = 0; this.dpr = 1;
      this.C = P.course(1);
      this.token = 0; this.active = false; this.running = false; this.playing = false;
      this.t = 0; this.texts = []; this.time = 0;
      const r = u.mulberry32(42);
      this.stars = Array.from({ length: 120 }, () => [r(), r() * 0.8, 0.4 + r() * 1.2, r() * 6]);
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
    }
    view() { const vh = this.cam.vh, vw = vh * (this.cw / Math.max(1, this.ch)); return { x: this.cam.x - vw / 2, y: this.cam.y - vh / 2, w: vw, h: vh }; }

    /* ---------- Avspilling ---------- */
    pos(i, t) {
      const fr = this.res.frames, k = t * this.res.fps;
      let a = Math.floor(k); const f = k - a;
      if (a >= fr.length - 1) { const L = fr[fr.length - 1]; return [L[i * 3], L[i * 3 + 1], L[i * 3 + 2]]; }
      if (a < 0) a = 0;
      const A = fr[a], B = fr[a + 1];
      return [A[i * 3] + (B[i * 3] - A[i * 3]) * f, A[i * 3 + 1] + (B[i * 3 + 1] - A[i * 3 + 1]) * f, A[i * 3 + 2] + (B[i * 3 + 2] - A[i * 3 + 2]) * f];
    }
    say(icon, title, text, prio = 1) {
      if (prio < (this.sayPrio || 0) && this.time - (this.sayAt || 0) < 1.8) return;
      this.sayPrio = prio; this.sayAt = this.time;
      this.infoCard(icon, title, text, 'Kommentator · Keiservarden GP');
    }
    float(text, x, y, color = '#fff', size = 30) { this.texts.push({ text, x, y, color, size, t0: this.time }); }
    marble(i) { return this.mar[i]; }
    handle(e, quiet) {
      const m = this.mar[e.i];
      if (e.type === 'bump') {
        if (quiet || !m || m.state) return;
        m.bumpT = this.t;
        this.fx.sparkles(e.x, e.y, 10, '#ffd0c4');
        if (this.time - (this.tootAt || 0) > 0.35) { this.tootAt = this.time; S().toot(); this.float('TUT!', e.x, e.y - 40, '#ffb08f', 26); }
        return;
      }
      const p = this.pax.get(m.no);
      if (e.type === 'finish') {
        m.state = 'fin';
        this.finished.push(e.i);
        const rank = this.finished.length;
        if (rank <= this.W) {
          this.markWinner(p, rank);
          if (!quiet) {
            this.announce(`${rank}. plass`, `${p.name} · kule ${p.label}`, 2200);
            const close = rank > 1 && e.t - this.res.tDone[this.finished[rank - 2]] < 0.35;
            this.say(['🥇', '🥈', '🥉'][rank - 1] || '🏁', close ? 'FOTOFINISH!' : `${rank}. plass!`, rank === 1 ? `${u.esc(p.name)} vinner Keiservarden Grand Prix!` : `${u.esc(p.name)} (kule ${u.esc(p.label)}) e i mål som nummer ${rank}!`, 5);
            if (rank === 1) { S().fanfare(); this.fx.confetti(160); } else S().ding();
            this.fx.sparkles(e.x || 1310, 3420, 30, '#ffe08a');
          }
          if (rank === this.W) this.winT = e.t;
        } else {
          this.setRow(p, '🏁');
          if (!quiet && this.time - (this.finSayAt || 0) > 2.2) { this.finSayAt = this.time; this.say('🏁', 'I mål', `${u.esc(p.name)} kom i mål som nummer ${rank}.`, 0); }
        }
        return;
      }
      if (e.type === 'out') {
        m.state = 'out'; m.cause = e.cause;
        const ev = Ev.EVENTS[e.cause] || Ev.EVENTS.k_kant;
        this.setRow(p, ev.icon, true);
        this.out++;
        this.updateCounts();
        this.logLine(ev.icon, (CAUSE_SAY[e.cause] || CAUSE_SAY.k_kant)(`<b>${u.esc(p.name)}</b>`)[1]);
        if (quiet) return;
        const [title, line] = (CAUSE_SAY[e.cause] || CAUSE_SAY.k_kant)(`<b>${u.esc(p.name)}</b> (${u.esc(p.label)})`);
        this.say(ev.icon, title, line, 3);
        const [x, y] = this.pos(e.i, this.t);
        if (e.cause === 'k_orna') S().screech();
        else if (e.cause === 'k_ornes') { S().thud(); this.float('ØRNES ↓', x, y - 30, '#f6bd47', 24); }
        else { S().whoosh(); this.float('NEEI!', x, y - 34, '#9fd6ff', 26); }
      }
    }
    setRow(p, icon, out) { if (!p || !p.row) return; p.row.querySelector('.px-st').textContent = icon; if (out) p.row.classList.add('is-out'); }
    logLine(icon, html) {
      const li = document.createElement('li');
      li.className = 'lg';
      li.innerHTML = `<span>${icon}</span><div><small>Keiservarden · ${this.t.toFixed(1)} s</small>${html}</div>`;
      const first = this.el.log.querySelector('.side-empty'); if (first) first.remove();
      this.el.log.prepend(li);
      this.logN++;
      this.updateCounts();
    }
    advance(dt) {
      const prev = this.t;
      this.t += dt;
      const G = P.GATE_T;
      [[0.6, '3'], [1.6, '2'], [2.6, '1']].forEach(([at, txt]) => { if (prev < at && this.t >= at) { this.announce(txt, 'Keiservarden Grand Prix', 900); S().pop(); } });
      if (prev < G && this.t >= G) { this.announce('KJØR!', 'Porten e åpen', 1300); S().horn(0.9); this.say('🎙️', 'Og de e i gang!', 'Porten på Keiservarden e åpen – kulene stuper ned mot Bodø!', 2); }
      for (const g of this.C.wind.gusts) if (prev < g.t0 && this.t >= g.t0 && this.leaderY > 900 && this.leaderY < 1700) { S().wind(); this.say('🌬️', 'Vindkast!', 'Kraftig kast i Bodø-vind – nå gjelder det å holde farta!', 1); break; }
      for (const s of this.C.eagle.swoops) if (prev < s && this.t >= s && this.leaderY > 2500) { S().screech(); break; }
      while (this.ei < this.res.events.length && this.res.events[this.ei].t <= this.t) this.handle(this.res.events[this.ei++], false);
      // leder
      let best = -1, by = -1e9;
      for (let i = 0; i < this.n; i++) { const m = this.mar[i]; if (m.state) continue; const y = this.pos(i, this.t)[1]; if (y > by) { by = y; best = i; } }
      this.leaderY = best >= 0 ? by : this.leaderY;
      if (best >= 0 && best !== this.leader && this.t > G + 2 && !this.finished.length) {
        this.leader = best;
        if (this.time - (this.leadAt || 0) > 3.5) { this.leadAt = this.time; const p = this.pax.get(this.mar[best].no); this.say('🏔️', 'Ny leder!', `${u.esc(p.name)} (kule ${u.esc(p.label)}) tar ledelsen!`, 1); }
      }
      if (this.playing && ((this.winT != null && this.t >= this.winT + 3.8) || this.t >= this.res.duration)) this.wrapUp();
    }
    updateCamera(dt) {
      let tx = 800, ty = 170, tvh = 620;
      if (this.res && this.t > 0.2) {
        if (this.t > this.firstFinT - 1.4) { tx = 1240; ty = 3420; tvh = 660; }
        else if (this.t >= P.GATE_T - 0.4) {
          const live = [];
          for (let i = 0; i < this.n; i++) if (!this.mar[i].state) live.push(this.pos(i, this.t));
          live.sort((a, b) => b[1] - a[1]);
          const top = live.slice(0, 4);
          if (top.length) {
            const w = [0.55, 0.2, 0.15, 0.1];
            let sx = 0, sy = 0, sw = 0;
            top.forEach((p, k) => { sx += p[0] * w[k]; sy += p[1] * w[k]; sw += w[k]; });
            tx = sx / sw; ty = sy / sw + 30;
            const spread = top.length > 1 ? top[0][1] - top[top.length - 1][1] : 0;
            tvh = u.clamp(560 + spread * 0.6, 560, 900);
          }
        }
      }
      const k = 1 - Math.exp(-dt * 2.6);
      this.cam.x += (tx - this.cam.x) * k; this.cam.y += (ty - this.cam.y) * k; this.cam.vh += (tvh - this.cam.vh) * k;
      const vw = this.cam.vh * (this.cw / Math.max(1, this.ch));
      this.cam.x = vw >= 1600 ? 800 : u.clamp(this.cam.x, vw / 2, 1600 - vw / 2);
      this.cam.y = u.clamp(this.cam.y, this.cam.vh / 2 - 140, 3760 - this.cam.vh / 2);
    }
    frame(d, dtReal) {
      if (!this.active || !this.cw) return;
      const dt = Math.min(0.06, dtReal / 1000);
      this.time += dt;
      if (this.playing) this.advance(d / 1000);
      this.updateCamera(dt);
      this.draw();
      this.fx.update(dtReal);
      if (this.playing && this.time - (this.boardAt || 0) > 0.3) { this.boardAt = this.time; this.renderBoard(); }
    }

    /* ---------- Tegning ---------- */
    draw() {
      const { ctx } = this;
      const cw = this.cw, ch = this.ch, dpr = this.dpr;
      const v = this.view(), s = cw / v.w;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = ctx.createLinearGradient(0, 0, 0, ch);
      const deep = u.clamp(v.y / 3400, 0, 1);
      g.addColorStop(0, '#02060f'); g.addColorStop(0.6, deep > 0.85 ? '#0c1a34' : '#081530'); g.addColorStop(1, '#122347');
      ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
      ctx.globalAlpha = 1 - deep * 0.6;
      for (const [x, y, r, ph] of this.stars) { ctx.globalAlpha = (0.35 + 0.35 * Math.sin(this.time * 1.3 + ph)) * (1 - deep * 0.6); ctx.fillStyle = '#fff'; ctx.fillRect(x * cw, y * ch - (v.y * 0.03) % ch, r, r); }
      ctx.globalAlpha = 1;
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = k === 1 ? 'rgba(138,125,255,.07)' : 'rgba(94,242,181,.08)'; ctx.lineWidth = 60 + k * 30;
        ctx.beginPath();
        const yy = ch * (0.18 + k * 0.08) - v.y * 0.02;
        ctx.moveTo(-50, yy + Math.sin(this.time * 0.3 + k) * 20);
        ctx.bezierCurveTo(cw * 0.3, yy - 60 + Math.sin(this.time * 0.4 + k * 2) * 30, cw * 0.6, yy + 50, cw + 50, yy - 20 + Math.cos(this.time * 0.35) * 25);
        ctx.stroke();
      }
      ctx.setTransform(dpr * s, 0, 0, dpr * s, -v.x * s * dpr, -v.y * s * dpr);
      this.drawMountain(v);
      this.drawCity();
      this.drawTrack();
      this.drawMoving();
      this.drawSigns();
      this.drawMarbles();
      this.drawTexts();
    }
    drawMountain(v) {
      const { ctx } = this;
      const g = ctx.createLinearGradient(0, -200, 0, 3700);
      g.addColorStop(0, '#2a3a5c'); g.addColorStop(0.08, '#16233b'); g.addColorStop(0.6, '#0f1a2c'); g.addColorStop(1, '#0b1422');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-600, 3700); ctx.lineTo(-600, 600); ctx.lineTo(120, 120); ctx.lineTo(420, -40); ctx.lineTo(800, -170); ctx.lineTo(1180, -40); ctx.lineTo(1500, 140); ctx.lineTo(2200, 700); ctx.lineTo(2200, 3700); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(235,242,255,.85)';
      ctx.beginPath(); ctx.moveTo(800, -170); ctx.lineTo(880, -110); ctx.lineTo(840, -100); ctx.lineTo(790, -120); ctx.lineTo(730, -96); ctx.lineTo(700, -110); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.03)';
      for (let k = 0; k < 18; k++) { const y = 200 + k * 190; ctx.beginPath(); ctx.ellipse(800 + Math.sin(k * 7.3) * 600, y, 160 + (k % 3) * 60, 30, Math.sin(k) * 0.4, 0, Math.PI * 2); ctx.fill(); }
    }
    drawCity() {
      const { ctx } = this;
      if (this.view().y + this.view().h < 3150) return;
      ctx.fillStyle = '#0a1a2e'; ctx.fillRect(-400, 3618, 2400, 400);
      ctx.fillStyle = 'rgba(255,214,140,.10)'; for (let k = 0; k < 10; k++) ctx.fillRect(200 + k * 130, 3630 + (k % 3) * 18, 70, 3);
      const r = u.mulberry32(77);
      for (let x = -300; x < 1300; x += 46 + r() * 30) {
        const h = 60 + r() * 120, w = 38 + r() * 26;
        ctx.fillStyle = r() < 0.5 ? '#14203a' : '#1a2742'; ctx.fillRect(x, 3610 - h, w, h);
        ctx.fillStyle = '#ffd27a';
        for (let wy = 3610 - h + 8; wy < 3600; wy += 14) for (let wx = x + 6; wx < x + w - 8; wx += 11) if (r() < 0.4) { ctx.globalAlpha = 0.5 + r() * 0.5; ctx.fillRect(wx, wy, 5, 6); }
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#e9e4da'; ctx.fillRect(1380, 3630, 220, 26); ctx.fillStyle = '#15181d'; ctx.fillRect(1370, 3652, 250, 22); ctx.fillStyle = '#c62828'; ctx.fillRect(1470, 3602, 22, 28);
      // BODØ-skiltet står på stolper over målkurva, så kulene som lander ikke dekker det
      ctx.fillStyle = '#2a3346'; ctx.fillRect(1394, 3438, 6, 142); ctx.fillRect(1512, 3438, 6, 142);
      ctx.font = '900 64px Fraunces, Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff6dc'; ctx.shadowColor = 'rgba(246,189,71,.8)'; ctx.shadowBlur = 18;
      ctx.fillText('BODØ', 1456, 3434); ctx.shadowBlur = 0;
    }
    drawTrack() {
      const { ctx } = this, C = this.C;
      ctx.lineCap = 'round';
      // groper
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(898, 1342, 112, 198); ctx.fillRect(860, 2606, 100, 164);
      for (const sg of C.S) { ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = sg.t * 2; ctx.beginPath(); ctx.moveTo(sg.ax + 3, sg.ay + 5); ctx.lineTo(sg.bx + 3, sg.by + 5); ctx.stroke(); }
      for (const sg of C.S) {
        ctx.strokeStyle = sg.kind === 'pit' ? '#6e5d4c' : sg.kind === 'wall' ? '#c9bda5' : '#e9dfc9';
        ctx.lineWidth = sg.t * 2; ctx.beginPath(); ctx.moveTo(sg.ax, sg.ay); ctx.lineTo(sg.bx, sg.by); ctx.stroke();
        if (sg.kind === 'track' || sg.kind === 'hopper') { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sg.ax, sg.ay - sg.t + 2); ctx.lineTo(sg.bx, sg.by - sg.t + 2); ctx.stroke(); }
      }
      for (const p of C.pegs) { ctx.fillStyle = '#dbe3ec'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#5f7891'; ctx.lineWidth = 1.5; ctx.stroke(); }
      for (const b of C.bumpers) {
        const hit = this.res ? this.mar.some((m, i) => m.bumpT != null && this.t - m.bumpT < 0.15 && Math.hypot(this.pos(i, this.t)[0] - b.x, this.pos(i, this.t)[1] - b.y) < 60) : false;
        const rr = b.r * (hit ? 1.15 : 1);
        ctx.fillStyle = '#ee4a2f'; ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(b.x, b.y, rr - 6, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '800 13px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('TUT', b.x, b.y + 1);
      }
      // mål
      const f = C.finish;
      for (let k = 0; k < 10; k++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (k + j) % 2 ? '#111' : '#fff'; ctx.fillRect(f.x0 + 4 + j * 14, 3330 + k * 12, 14, 12); }
      ctx.fillStyle = '#c9bda5'; ctx.fillRect(f.x0, 3300, 4, 160);
      ctx.font = '900 34px Fraunces, Georgia, serif'; ctx.fillStyle = '#ffe08a'; ctx.textAlign = 'center'; ctx.fillText('MÅL', f.x0 + 18, 3292);
      // de som ikke betalte: fast i porten
      if (this.rec && this.rec.leftBehind && this.rec.leftBehind.length) {
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(1170, 150, 220, 120);
        this.rec.leftBehind.slice(0, 12).forEach((p, k) => this.ball(1190 + (k % 6) * 34, 248 - Math.floor(k / 6) * 34, '#7d8794', p.nums && p.nums[0] ? String(p.nums[0]) : u.initials(p.name), 0, 0.85));
        ctx.strokeStyle = '#9aa6b4'; ctx.lineWidth = 3; for (let x = 1172; x <= 1388; x += 18) { ctx.beginPath(); ctx.moveTo(x, 152); ctx.lineTo(x, 268); ctx.stroke(); }
        ctx.font = '700 15px "JetBrains Mono", monospace'; ctx.fillStyle = '#f6bd47'; ctx.textAlign = 'center'; ctx.fillText('IKKE BETALT · FAST I PORTEN', 1280, 140);
      }
    }
    drawMoving() {
      const { ctx } = this, C = this.C, t = this.res ? this.t : this.time;
      // startport
      if (!P.kin.gateOpen(t)) { ctx.strokeStyle = '#ee4a2f'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(C.gate.ax, C.gate.ay); ctx.lineTo(C.gate.bx, C.gate.by); ctx.stroke(); }
      else { ctx.strokeStyle = '#ee4a2f'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(C.gate.ax, C.gate.ay); ctx.lineTo(C.gate.ax - 12, C.gate.ay + 58); ctx.stroke(); }
      // Glimt-hjulet
      const W = C.wheel, wa = P.kin.wheelAngle(C, t);
      for (let a = 0; a < W.arms; a++) { const an = wa + (a * Math.PI * 2) / W.arms; ctx.strokeStyle = '#111'; ctx.lineWidth = W.t * 2 + 4; ctx.beginPath(); ctx.moveTo(W.cx, W.cy); ctx.lineTo(W.cx + Math.cos(an) * W.len, W.cy + Math.sin(an) * W.len); ctx.stroke(); ctx.strokeStyle = '#ffd400'; ctx.lineWidth = W.t * 2; ctx.stroke(); }
      ctx.fillStyle = '#ffd400'; ctx.beginPath(); ctx.arc(W.cx, W.cy, 24, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = '#111'; ctx.font = '900 10px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('GLIMT', W.cx, W.cy + 1);
      // vippa
      const Pp = C.seesaw, sa = P.kin.seesawAngle(C, t), c = Math.cos(sa), sn = Math.sin(sa);
      ctx.fillStyle = '#8a9bb0'; ctx.beginPath(); ctx.moveTo(Pp.px, Pp.py); ctx.lineTo(Pp.px - 18, Pp.py + 34); ctx.lineTo(Pp.px + 18, Pp.py + 34); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#b07a45'; ctx.lineWidth = Pp.t * 2; ctx.beginPath(); ctx.moveTo(Pp.px - c * Pp.half, Pp.py - sn * Pp.half); ctx.lineTo(Pp.px + c * Pp.half, Pp.py + sn * Pp.half); ctx.stroke();
      // Ørnes-luka
      const T = C.trap;
      if (!P.kin.trapOpen(C, t)) {
        ctx.strokeStyle = '#ee4a2f'; ctx.lineWidth = T.t * 2; ctx.beginPath(); ctx.moveTo(T.ax, T.ay); ctx.lineTo(T.bx, T.by); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = T.t * 2; ctx.setLineDash([10, 10]); ctx.beginPath(); ctx.moveTo(T.ax, T.ay); ctx.lineTo(T.bx, T.by); ctx.stroke(); ctx.setLineDash([]);
      } else { ctx.strokeStyle = '#ee4a2f'; ctx.lineWidth = T.t * 2; ctx.beginPath(); ctx.moveTo(T.ax, T.ay); ctx.lineTo(T.ax + 8, T.ay + 70); ctx.stroke(); }
      // Bodø-vind
      const wa2 = P.kin.windAccel(C, t), Z = C.wind;
      const n = Math.round(4 + wa2 / 30);
      ctx.strokeStyle = 'rgba(220,235,255,.35)'; ctx.lineWidth = 2;
      for (let k = 0; k < n; k++) { const ph = ((this.time * (0.6 + wa2 / 500) + k * 0.37) % 1); const x = Z.x1 - ph * (Z.x1 - Z.x0); const y = Z.y0 + 30 + ((k * 53) % (Z.y1 - Z.y0 - 60)); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 40 + wa2 / 10, y); ctx.stroke(); }
      ctx.font = '42px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🌬️', Z.x1 + 30, Z.y0 + 40);
      ctx.font = '700 14px "JetBrains Mono", monospace'; ctx.fillStyle = wa2 > 200 ? '#ff9a7a' : '#cfe6ff'; ctx.fillText(`${Math.round(6 + wa2 / 22)} m/s`, Z.x1 + 30, Z.y0 + 80);
      // ørna
      const cl = C.eagle.at(t);
      if (cl) { ctx.save(); ctx.translate(cl.x, cl.y - 18); ctx.scale(-1, 1); ctx.font = '64px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🦅', 0, 0); ctx.restore(); }
    }
    drawSigns() {
      const { ctx } = this;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const sg of this.C.signs) {
        ctx.font = '800 15px "JetBrains Mono", monospace';
        const w = ctx.measureText(sg.text).width + 26;
        ctx.fillStyle = '#3a2a1d'; ctx.fillRect(sg.x - 3, sg.y + 14, 6, 34);
        ctx.fillStyle = '#5a3d27'; ctx.fillRect(sg.x - w / 2, sg.y - 16, w, 32);
        ctx.strokeStyle = '#8a6440'; ctx.lineWidth = 2; ctx.strokeRect(sg.x - w / 2, sg.y - 16, w, 32);
        ctx.fillStyle = '#f3ecdf'; ctx.fillText(sg.text, sg.x, sg.y + 1);
      }
    }
    ball(x, y, color, label, ang, alpha = 1, ring) {
      const { ctx } = this;
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
    drawMarbles() {
      if (!this.res) return;
      const v = this.view();
      const order = [];
      for (let i = 0; i < this.n; i++) order.push(i);
      order.sort((a, b) => (this.mar[a].state ? 0 : 1) - (this.mar[b].state ? 0 : 1));
      for (const i of order) {
        const m = this.mar[i];
        const [x, y, ang] = this.pos(i, this.t);
        if (x < v.x - 40 || x > v.x + v.w + 40 || y < v.y - 40 || y > v.y + v.h + 40) continue;
        const p = this.pax.get(m.no);
        const out = m.state === 'out' && m.cause !== 'k_orna';
        const rank = m.state === 'fin' ? this.finished.indexOf(i) + 1 : 0;
        const ring = rank && rank <= this.W ? ['#ffd34d', '#dfe6ee', '#e0a070'][rank - 1] || '#ffd34d' : (i === this.leader && !m.state ? '#5ef2b5' : null);
        this.ball(x, y, out ? '#6b7480' : p.color, p.label, ang, out ? 0.55 : 1, ring);
      }
    }
    drawTexts() {
      const { ctx } = this;
      this.texts = this.texts.filter((tx) => this.time - tx.t0 < 1.2);
      for (const tx of this.texts) {
        const k = (this.time - tx.t0) / 1.2;
        ctx.globalAlpha = 1 - k * k;
        ctx.font = `italic 900 ${tx.size}px Fraunces, Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = tx.size / 6; ctx.strokeStyle = '#0b1420'; ctx.strokeText(tx.text, tx.x, tx.y - k * 30);
        ctx.fillStyle = tx.color; ctx.fillText(tx.text, tx.x, tx.y - k * 30);
      }
      ctx.globalAlpha = 1;
    }

    buildManifest() {
      this.el.pax.innerHTML = this.rec.tickets.map((t) => {
        const p = this.pax.get(t.no);
        return `<li class="px" data-no="${t.no}"><span class="px-no">–</span><span class="px-dot" style="background:${p.color}"></span><span class="px-name">${u.esc(t.name)} <small class="px-lab">#${u.esc(p.label)}</small></span><span class="px-st"></span></li>`;
      }).join('');
      u.$$('.px', this.el.pax).forEach((row) => { this.pax.get(+row.dataset.no).row = row; });
      this.updateCounts();
    }
    updateCounts() {
      const T = this.rec.tickets.length;
      this.el.paxCount.textContent = `${T - this.out}/${T}`;
      this.el.logCount.textContent = String(this.logN);
    }

    /* ---------- Live-tabell ---------- */
    renderBoard() {
      if (!this.res) return;
      const live = [], outs = [];
      for (let i = 0; i < this.n; i++) { const m = this.mar[i]; if (m.state === 'out') outs.push(i); else if (!m.state) live.push(i); }
      live.sort((a, b) => this.pos(b, this.t)[1] - this.pos(a, this.t)[1]);
      outs.sort((a, b) => this.res.tDone[b] - this.res.tDone[a]);
      const order = this.finished.concat(live, outs);
      const frag = document.createDocumentFragment();
      order.forEach((i, k) => {
        const p = this.pax.get(this.mar[i].no);
        if (!p.row) return;
        p.row.querySelector('.px-no').textContent = `${k + 1}.`;
        frag.appendChild(p.row);
      });
      this.el.pax.appendChild(frag);
    }

    /* ---------- Oppsett ---------- */
    activate() { this.active = true; this.resize(); this.idle(); }
    deactivate() { this.abort(); this.active = false; }
    idle() {
      this.res = null; this.rec = null; this.playing = false; this.winT = null;
      this.cam = { x: 800, y: 170, vh: 620 };
      this.fx.clear();
      this.el.ev.innerHTML = ''; this.el.an.innerHTML = '';
      this.el.route.innerHTML = '';
      this.el.pax.innerHTML = '<li class="side-empty">Kulene står klare i porten på Keiservarden.</li>';
      this.el.log.innerHTML = '<li class="side-empty">Kommentatoren varmer opp stemmen.</li>';
      this.el.paxCount.textContent = '0'; this.el.logCount.textContent = '0';
      this.renderStart();
    }
    prepare(d) {
      const n = d.tickets.length;
      const res = d.physSeed != null ? P.simulate(n, d.physSeed) : P.race(n, u.randInt(0x7fffffff), Math.min(d.winners.length, n));
      d.physSeed = res.seed;
      const crypto = d.winners.concat(d.elim.slice().reverse());
      const ticketOf = new Array(n);
      res.rank.forEach((mi, k) => { ticketOf[mi] = crypto[k]; });
      if (!d.beats || !d.beats.length) {
        d.beats = res.events.filter((e) => e.type === 'out').map((e) => ({ at: +(e.t / res.duration).toFixed(4), place: 'kei', ev: e.cause, v: [ticketOf[e.i]], t: 0 }));
      }
      return { res, ticketOf };
    }
    start(draw, mode, prepared) {
      this.abort(true);
      const token = ++this.token;
      this.rec = draw; this.mode = mode;
      const { res, ticketOf } = prepared || this.prepare(draw);
      if (token !== this.token) return;
      this.res = res; this.n = res.n; this.C = res.C;
      this.W = Math.min(draw.winners.length, this.n);
      this.mar = ticketOf.map((no) => ({ no, state: null, cause: null, bumpT: null }));
      this.pax = new Map();
      draw.tickets.forEach((t) => { const label = t.label || u.pad(t.no); this.pax.set(t.no, { no: t.no, name: t.name, label, color: u.colorFor(t.name), ini: label, alive: true, row: null }); });
      const ff = res.events.find((e) => e.type === 'finish');
      this.firstFinT = ff ? ff.t : Infinity;
      this.finished = []; this.out = 0; this.logN = 0; this.ei = 0; this.t = 0; this.leader = -1; this.leaderY = 0; this.winT = null;
      this.sayPrio = 0; this.texts = [];
      this.buildManifest();
      this.el.log.innerHTML = '';
      this.el.ev.innerHTML = '';
      this.hideOverlay(this.el.start); this.hideOverlay(this.el.end);
      this.running = true; this.playing = true;
      Eng.speed = FL.Engine.userSpeed || 1;
      this.stage.classList.add('is-running');
      S().unlock();
      const left = draw.leftBehind || [];
      this.say('🎙️', 'Velkommen til Keiservarden!', `${this.n} kuler i porten på toppen, 366 meter over Bodø. Bare <b>${u.numberWord(this.W)}</b> kommer først ned til havna.${left.length ? ` ${u.esc(u.joinNames(left.map((p) => p.name)))} har ikke betalt og sitter fast i porten.` : ''}`, 2);
      if (left.length) this.logLine('🚧', `Satt fast i startporten (ikke betalt): ${u.joinNames(left.map((p) => `<b>${u.esc(p.name)}</b>`))}`);
    }
    wrapUp() {
      this.playing = false;
      while (this.ei < this.res.events.length) this.handle(this.res.events[this.ei++], true);
      this.t = this.res.duration;
      this.renderBoard();
      this.running = false;
      this.stage.classList.remove('is-running');
      this.showEnd();
    }
    abort(silent) {
      this.token++;
      this.running = false; this.playing = false;
      Eng.speed = FL.Engine.userSpeed || 1;
      this.stage.classList.remove('is-running');
      if (!silent && this.active) this.idle();
    }
    skip() {
      if (!this.running || !this.res) return;
      const fins = this.res.events.filter((e) => e.type === 'finish');
      const target = fins.length ? fins[Math.min(this.W, fins.length) - 1].t - 1.5 : this.res.duration;
      if (this.t >= target) return;
      while (this.ei < this.res.events.length && this.res.events[this.ei].t <= target) this.handle(this.res.events[this.ei++], true);
      this.t = target;
      S().whoosh();
    }

    /* ---------- Overlays ---------- */
    renderStart() {
      if (this.running || !this.active) return;
      const t = Store.totals();
      const W = Store.settings.winners;
      let html;
      if (!t.tickets) {
        html = `<div class="ov-card"><p class="ov-kicker">Keiservarden · 366 moh</p><h3 class="ov-title">Ingen har <em>betalt</em></h3>
          <p class="ov-sub">${t.people ? 'Bekreft betaling i påmeldingen – bare de som har betalt får en kule i porten.' : 'Legg inn passasjerer og bekreft betaling i påmeldingen først.'}</p>
          <div class="ov-btns"><a class="btn btn-primary" href="pamelding.html">Til påmeldingen</a><button class="btn btn-ghost" type="button" data-act="demo">🏔️ Prøveløp</button></div>
          <p class="ov-fine">Prøveløp lagres ikke i skipsloggen.</p></div>`;
      } else {
        const left = Store.leftBehind();
        html = `<div class="ov-card"><p class="ov-kicker">Keiservarden · 366 moh · fysikk-kuleløp</p><h3 class="ov-title">Keiservarden <em>Grand Prix</em></h3>
          <p class="ov-sub">${t.tickets} kuler slippes fra toppen av Keiservarden. De <b>${u.numberWord(Math.min(W, t.paidPeople))}</b> første ned til Bodø havn vinner.</p>
          <div class="ov-facts"><span><b>${t.paidPeople}</b> betalt</span><span><b>${t.tickets}</b> kuler</span><span><b>${u.kr(t.pot)}</b> i potten</span></div>
          <div class="ov-btns"><button class="btn btn-primary" type="button" data-act="go">🏁 Slipp kulene!</button><button class="btn btn-ghost" type="button" data-act="demo">Prøveløp først</button></div>
          ${left.length ? `<p class="ov-warn">🚧 ${u.esc(u.joinNames(left.slice(0, 6).map((p) => p.name)))}${left.length > 6 ? ` og ${left.length - 6} til` : ''} har ikke betalt og sitter fast i porten.</p>` : ''}
          <p class="ov-fine">Ekte fysikk: løpet kjøres usynlig først, og vinnerne – trukket med kryptografisk tilfeldighet – får kulene som faktisk kom først. Alt låses i skipsloggen før løpet vises.</p></div>`;
      }
      this.el.start.innerHTML = html;
      this.el.start.hidden = false;
    }
    showEnd() {
      const d = this.rec;
      const ws = d.winners.map((no, k) => ({ p: this.pax.get(no), rank: k + 1 }));
      const podOrder = ws.length >= 3 ? [ws[1], ws[0], ws[2]].concat(ws.slice(3)) : (ws.length === 2 ? [ws[1], ws[0]] : ws);
      const pods = podOrder.map(({ p, rank }) => `<div class="pod p${rank <= 3 ? rank : 'n'}"><div class="pod-av" style="background:${p.color}">${u.esc(p.label)}</div><div class="pod-name">${u.esc(p.name)}</div><div class="pod-tix">kule ${u.esc(p.label)}</div><div class="pod-block">${rank}</div></div>`).join('');
      const badge = this.mode === 'demo' ? '<span class="ov-badge">Prøveløp</span>' : (this.mode === 'replay' ? '<span class="ov-badge">Reprise</span>' : '');
      this.el.end.innerHTML = `<div class="ov-card">${badge}<p class="ov-kicker">Bodø havn · målgang · ${u.esc(u.dfLong.format(new Date(d.date)))}</p>
        <h3 class="ov-title">Først ned <em>Keiservarden!</em></h3>
        <div class="podium">${pods}</div>
        <p class="ov-sub">Vinnerne velger premie i rekkefølge. Premiene er, som kjent, urelatert.</p>
        <div class="ov-btns">${this.mode === 'live' ? '<a class="btn btn-primary" href="historikk.html">Se skipsloggen</a>' : '<button class="btn btn-primary" type="button" data-act="close">Tilbake til toppen</button>'}
        <button class="btn btn-ghost" type="button" data-act="replay">Se reprise</button><button class="btn btn-ghost" type="button" data-act="hide">Se løypa</button></div>
        <p class="ov-fine">${this.mode === 'live' ? 'Lagret i skipsloggen.' : (this.mode === 'demo' ? 'Prøveløp lagres ikke.' : 'Reprise av en tidligere trekning.')}</p></div>`;
      this.el.end.hidden = false;
    }

    /* ---------- Knapper ---------- */
    bind() {
      const mine = () => this.active && this.stage.dataset.game === 'keiser';
      u.$('#skipBtn', this.stage).addEventListener('click', () => { if (mine()) this.skip(); });
      const onAct = (e) => {
        if (!mine()) return;
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const act = b.dataset.act;
        if (act === 'go') this.startLive();
        else if (act === 'demo') this.startDemo();
        else if (act === 'replay') this.start(this.rec, this.mode === 'live' ? 'replay' : this.mode);
        else if (act === 'hide') this.hideOverlay(this.el.end);
        else if (act === 'close') { this.hideOverlay(this.el.end); this.idle(); }
      };
      this.el.start.addEventListener('click', onAct);
      this.el.end.addEventListener('click', onAct);
    }
    busy(msg) { this.el.start.innerHTML = `<div class="ov-card"><p class="ov-kicker">Keiservarden</p><h3 class="ov-title">${msg}</h3></div>`; this.el.start.hidden = false; }
    startLive() {
      const people = Store.participants();
      if (!people.length) { u.toast('Ingen har betalt ennå – bekreft betaling i påmeldingen.'); return; }
      S().unlock();
      const draw = Ev.createDraw(people, Store.settings, { game: 'keiser', leftBehind: Store.leftBehind() });
      this.busy('Preparerer <em>løypa…</em>');
      setTimeout(() => {
        const prepared = this.prepare(draw); // fysikken kjøres – resultatet låses før noe vises
        Store.addRecord(draw);
        Store.resetPaid();
        this.start(draw, 'live', prepared);
      }, 40);
    }
    startDemo() {
      S().unlock();
      const max = Store.settings.maxPerPerson;
      const pool = u.shuffle(Array.from({ length: 99 }, (_, i) => i + 1));
      const people = u.shuffle(NAMES).slice(0, 16 + u.randInt(6)).map((nm) => { const t = 1 + u.randInt(max); return { name: nm, nums: pool.splice(0, t), tickets: t }; });
      const left = people.splice(0, 2 + u.randInt(2)).map((p) => ({ name: p.name, nums: p.nums }));
      const draw = Ev.createDraw(people, Store.settings, { game: 'keiser', demo: true, leftBehind: left });
      this.busy('Preparerer <em>løypa…</em>');
      setTimeout(() => this.start(draw, 'demo'), 40);
    }
    replay(rec) { S().unlock(); this.busy('Spoler tilbake…'); setTimeout(() => this.start(rec, 'replay'), 40); }
  }

  ['announce', 'infoCard', 'scrollRow', 'markWinner', 'hideOverlay'].forEach((k) => { Keiser.prototype[k] = FL.Voyage.prototype[k]; });
  FL.Keiser = Keiser;
})();
