/* Fredagslotteriet – «Keiservarden Grand Prix»: kuleløp fra Keiservarden ned til Bodø havn.
   Løpet simuleres først (keiser-physics.js). Kula som faktisk kom først får nummeret til den som ble trukket som vinner.
   Løypa er originalen eller en godkjent egen løype fra løypedesigneren – den lagres med trekningen, så reprisen blir lik. */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u, Ev = FL.Events, Store = FL.Store, P = FL.KPhys, D = FL.KDraw;
  const { Eng } = FL.Engine;
  const S = () => FL.Audio;
  const NAMES = ['Kari Nordmann', 'Ola Nordmann', 'Tor-Erik', 'Siv', 'Bjørnar', 'Hanne', 'Frode', 'Mona', 'Geir', 'Lise', 'Arnt', 'Trine', 'Rune', 'Ingrid', 'Stig', 'Unni', 'Kjell-Ove', 'Randi', 'Svein', 'Gunn', 'Per', 'Oda'];
  const CAUSE_SAY = {
    k_vind: (n) => ['Bodø-vind!', `Å nei! ${n} blåste ned i Juvet!`],
    k_ornes: (n) => ['Feil avkjøring!', `${n} falt gjennom Ørnes-luka. Kor e han på vei? Ørnes!`],
    k_orna: (n) => ['ØRNA!', `Ørna tok ${n}! Den ser vi aldri igjen.`],
    k_glimt: (n) => ['Glimt-hjulet!', `${n} ble slått rett ut av Glimt-hjulet!`],
    k_kant: (n) => ['Utfor kanten!', `${n} trillet utfor kanten. Det e langt ned.`],
    k_fast: (n) => ['Snøfonna', `${n} satt fast i ei snøfonn.`],
    k_hull: (n, pn) => ['Ned i hullet!', `${n} falt ned i ${u.esc(pn || 'et hull')}!`],
    k_salt: (n) => ['Saltstraumen!', `${n} ble tatt av Saltstraumen. Verdens sterkeste malstrøm vinner alltid.`],
    k_ferje: (n) => ['Rakk ikke ferga!', `${n} rakk ikke ferga og havnet i havet. Neste avgang går om en time.`],
    k_rakett: (n) => ['Andøya, vi har et problem!', `${n} ble skutt rett ut i verdensrommet!`],
    k_fisk: (n) => ['Tørrfisk!', `${n} fikk en tørrfisk i trynet og forsvant ut av løypa.`],
    k_arm: (n) => ['Glimt-armen!', `${n} fikk et slag av Glimt-armen og forsvant ut av løypa!`],
    k_sjef: (n) => ['Sjefen!', `${n} ble tatt av Sjefen. Fredagslotteri er visst ikke lov.`],
  };
  const FUN = ['launch', 'rocket', 'spit', 'tunnel', 'fish', 'rein', 'slaps', 'zapped'];
  // killfeed: kort tekst for hvert utfall (kommentatoren tar bare start og vinnere)
  const KILL = {
    k_vind: 'blåste ned i Juvet', k_ornes: 'tok Ørnes-luka', k_orna: 'tatt av ørna', k_glimt: 'slått ut av Glimt-hjulet',
    k_arm: 'slått ut av Glimt-armen', k_kant: 'utfor kanten', k_fast: 'satt fast', k_salt: 'tatt av Saltstraumen',
    k_ferje: 'rakk ikke ferga', k_rakett: 'skutt ut i verdensrommet', k_fisk: 'tørrfisk i trynet', k_sjef: 'tatt av Sjefen',
  };

  /* Løypa som er valgt for trekningen: en godkjent egen løype, ellers originalen (null) */
  function activeDef() {
    const id = Store.courseId;
    if (!id || id === P.ORIGINAL.id) return null;
    const c = Store.getCourse(id);
    const def = c && P.normalize(c);
    return def && c.ok && c.ok === P.hash(def) ? def : null;
  }
  function approved() {
    return Store.courses.map((c) => { const def = P.normalize(c); return def && c.ok === P.hash(def) ? def : null; }).filter(Boolean);
  }

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
        kf: document.createElement('ol'),
      };
      this.el.kf.className = 'kfeed';
      this.el.kf.setAttribute('aria-live', 'polite');
      this.canvas.parentElement.appendChild(this.el.kf);
      this.cw = 0; this.ch = 0; this.dpr = 1;
      this.def = null; this.courseKey = '';
      this.C = P.course(1, null);
      this.cam = this.homeCam();
      this.token = 0; this.active = false; this.running = false; this.playing = false;
      this.t = 0; this.texts = []; this.time = 0; this.fb = new Map();
      this.stars = D.stars(42);
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
    homeCam() { return { x: this.C.start.x, y: this.C.start.y - 130, vh: 620 }; }
    /* bytt til løypa som er valgt i Store (bare når ingenting kjører) */
    syncCourse(force) {
      const def = activeDef();
      const key = def ? `${def.id}:${P.hash(def)}` : 'original';
      if (!force && key === this.courseKey) return;
      this.courseKey = key; this.def = def;
      if (!this.running) { this.C = P.course(1, def); this.cam = this.homeCam(); }
    }

    /* ---------- Avspilling ---------- */
    pos(i, t) {
      const fr = this.res.frames, k = t * this.res.fps;
      let a = Math.floor(k); const f = k - a;
      if (a >= fr.length - 1) { const L = fr[fr.length - 1]; return [L[i * 3], L[i * 3 + 1], L[i * 3 + 2]]; }
      if (a < 0) a = 0;
      const A = fr[a], B = fr[a + 1];
      // hopp i opptaket (tunnel, ørna, sluket): ikke tegn kula på veien mellom
      if (Math.abs(B[i * 3] - A[i * 3]) > 260 || Math.abs(B[i * 3 + 1] - A[i * 3 + 1]) > 260) { const Q = f < 0.5 ? A : B; return [Q[i * 3], Q[i * 3 + 1], Q[i * 3 + 2]]; }
      return [A[i * 3] + (B[i * 3] - A[i * 3]) * f, A[i * 3 + 1] + (B[i * 3 + 1] - A[i * 3 + 1]) * f, A[i * 3 + 2] + (B[i * 3 + 2] - A[i * 3 + 2]) * f];
    }
    say(icon, title, text, prio = 1) {
      if (prio < (this.sayPrio || 0) && this.time - (this.sayAt || 0) < 1.8) return;
      this.sayPrio = prio; this.sayAt = this.time;
      this.infoCard(icon, title, text, 'Kommentator · Keiservarden GP');
      // kommentatoren tar bare de store øyeblikkene – og forsvinner igjen, så bildet er ryddig under løpet
      const card = this.el.ev.firstElementChild;
      clearTimeout(this.sayT);
      this.sayT = setTimeout(() => { if (card && card.parentNode) { card.classList.add('out'); setTimeout(() => card.remove(), 400); } }, prio >= 5 ? 6500 : 4500);
    }
    float(text, x, y, color = '#fff', size = 30) { this.texts.push({ text, x, y, color, size, t0: this.time }); }
    handle(e, quiet) {
      const m = this.mar[e.i];
      if (e.type === 'bump') {
        if (quiet || !m || m.state) return;
        m.bumpT = this.t;
        this.fx.sparkles(e.x, e.y, 10, '#ffd0c4');
        if (this.time - (this.tootAt || 0) > 0.35) { this.tootAt = this.time; S().toot(); this.float('TUT!', e.x, e.y - 40, '#ffb08f', 26); }
        return;
      }
      if (e.type === 'shot') { // Sjefen skyter – bare lyd, og bare når det skjer i nærheten av lederne
        if (!quiet && Math.abs(this.leaderY - e.y) < 650 && this.once('zapFx', 0.12)) S().zap();
        return;
      }
      if (FUN.includes(e.type)) {
        if (!quiet && m && !m.state) this.fun(e, m);
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
            this.say(['🥇', '🥈', '🥉'][rank - 1] || '🏁', close ? 'FOTOFINISH!' : `${rank}. plass!`, rank === 1 ? `${u.esc(p.name)} vinner ${u.esc(this.raceName())}!` : `${u.esc(p.name)} (kule ${u.esc(p.label)}) e i mål som nummer ${rank}!`, 5);
            if (rank === 1) { S().fanfare(); this.fx.confetti(160); } else S().ding();
            this.fx.sparkles(e.x || this.C.finish.x0 + 20, this.C.fin.y + 90, 30, '#ffe08a');
          }
          if (rank === this.W) this.winT = e.t;
        } else {
          this.setRow(p, '🏁');
          if (!quiet && rank <= this.W + 3) this.feed('🏁', `${this.who(p)} i mål som nr. ${rank}`, 'fin'); // resten står i lista
        }
        return;
      }
      if (e.type === 'out') {
        m.state = 'out'; m.cause = e.cause;
        const ev = Ev.EVENTS[e.cause] || Ev.EVENTS.k_kant;
        const said = CAUSE_SAY[e.cause] || CAUSE_SAY.k_kant;
        this.setRow(p, ev.icon, true);
        this.out++;
        this.updateCounts();
        this.logLine(ev.icon, said(`<b>${u.esc(p.name)}</b>`, e.pn)[1]);
        if (quiet) return;
        this.feed(ev.icon, `${this.who(p)} ${u.esc(e.cause === 'k_hull' ? `falt ned i ${e.pn || 'hullet'}` : KILL[e.cause] || KILL.k_kant)}`, 'out');
        if (e.cause === 'k_orna') S().screech();
        else if (e.cause === 'k_ornes') S().thud();
        else if (e.cause === 'k_salt' || e.cause === 'k_ferje') S().splash(1);
        else if (e.cause === 'k_rakett') S().boom();
        else if (e.cause === 'k_sjef') S().zap();
        else S().whoosh();
      }
    }
    /* Killfeed øverst i hjørnet: utfall og småhendelser glir inn og forsvinner igjen */
    feed(icon, html, kind = 'minor') {
      if (kind === 'minor' && !this.once('minorFeed', 2.2)) return; // småting kommer aldri tettere enn dette
      const kf = this.el.kf, li = document.createElement('li');
      li.className = `kf-row is-${kind}`;
      li.innerHTML = `<span class="kf-ico">${icon}</span><span class="kf-txt">${html}</span>`;
      kf.prepend(li);
      while (kf.children.length > 6) kf.lastElementChild.remove();
      setTimeout(() => { li.classList.add('is-old'); setTimeout(() => li.remove(), 500); }, kind === 'out' ? 6500 : 4000);
    }
    who(p) { return p ? `<b style="color:${p.color}">${u.esc(p.name)}</b> <span class="kf-no">${u.esc(p.label)}</span>` : '<b>En kule</b>'; }
    once(k, gap) { if (this.time - (this[k] || -99) < gap) return false; this[k] = this.time; return true; }
    /* Småhendelser fra Glimt-hjul, Glimt-arm og de nye delene: lyd og en linje i killfeeden */
    fun(e, m) {
      const who = this.who(this.pax.get(m.no));
      // samme kule og samme greie vises høyst hvert tiende sekund
      const fresh = () => { const k = `${e.type}:${e.i}`, last = this.fb.get(k); if (last != null && this.time - last < 10) return false; this.fb.set(k, this.time); return true; };
      if (e.type === 'launch') {
        if (this.once('launchFx', 0.3)) S().launch();
        if (fresh()) this.feed(e.arm ? '🦾' : '💛', `${who} slått til værs`);
      } else if (e.type === 'rocket') {
        if (this.once('rocketFx', 0.25)) S().launch();
        if (fresh()) this.feed('🚀', `${who} skutt opp fra Andøya`);
      } else if (e.type === 'spit') {
        if (this.once('spitFx', 0.3)) S().splash(0.6);
        if (fresh()) this.feed('🌀', `${who} spyttet ut av Saltstraumen`);
      } else if (e.type === 'tunnel') {
        if (fresh()) this.feed('🚇', `${who} kjørte inn i tunnelen`);
      } else if (e.type === 'fish') {
        if (this.once('fishFx', 0.3)) S().thud();
        if (fresh()) this.feed('🐟', `${who} fikk tørrfisk i trynet`);
      } else if (e.type === 'rein') {
        if (this.once('reinFx', 0.6)) S().grunt();
        if (fresh()) this.feed('🦌', `${who} står fast bak reinen`);
      } else if (e.type === 'slaps') {
        if (e.i === this.leader && fresh()) this.feed('🌨️', `${who} kjørte inn i slapset`);
      } else if (e.type === 'zapped') {
        if (fresh()) this.feed('👔', `${who} truffet av Sjefen`);
      }
    }
    raceName() { return this.courseName ? `«${this.courseName}»` : 'Keiservarden Grand Prix'; }
    setRow(p, icon, out) { if (!p || !p.row) return; p.row.querySelector('.px-st').textContent = icon; if (out) p.row.classList.add('is-out'); }
    logLine(icon, html) {
      const li = document.createElement('li');
      li.className = 'lg';
      li.innerHTML = `<span>${icon}</span><div><small>${u.esc(this.courseName || 'Keiservarden')} · ${this.t.toFixed(1)} s</small>${html}</div>`;
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
      if (prev < G && this.t >= G) { this.announce('KJØR!', 'Porten e åpen', 1300); S().horn(0.9); this.say('🎙️', 'Og de e i gang!', this.courseName ? `Porten e åpen – kulene stuper utfor ${u.esc(this.raceName())}!` : 'Porten på Keiservarden e åpen – kulene stuper ned mot Bodø!', 2); }
      let gust = false;
      for (const Z of this.C.winds) {
        for (const g of Z.gusts) if (prev < g.t0 && this.t >= g.t0 && this.leaderY > Z.y0 - 280 && this.leaderY < Z.y1 + 280) { S().wind(); if (this.once('gustFeed', 4)) this.feed('🌬️', this.courseName ? 'Vindkast!' : 'Vindkast i Bodø-vinden!'); gust = true; break; }
        if (gust) break;
      }
      for (const E of this.C.eagles) {
        let heard = false;
        for (const s of E.swoops) if (prev < s && this.t >= s && this.leaderY > Math.min(E.ay, E.by) - 490) { S().screech(); heard = true; break; }
        if (heard) break;
      }
      // ferga går, ras i tunnelen og reinen som går til skogs – bare når det skjer nær lederne
      const near = (y) => Math.abs(this.leaderY - y) < 520;
      for (const F of this.C.ferries) {
        if (P.kin.ferry(F, prev).at === 1 && P.kin.ferry(F, this.t).at !== 1 && near(F.ay)) {
          S().horn(0.7, 0.24);
          if (this.once('ferryFeed', 8)) this.feed('⛴️', 'MF Lofoten legger fra kai');
        }
      }
      for (const T of this.C.tunnels) {
        if (!P.kin.tunnelClosed(T, prev) && P.kin.tunnelClosed(T, this.t) && near(T.ay)) { S().boom(); this.feed('🪨', 'Ras i tunnelen – stengt'); }
      }
      for (const Rn of this.C.reins) {
        if (!P.kin.rein(Rn, prev).away && P.kin.rein(Rn, this.t).away && near(Rn.ay) && this.once('reinAwayFeed', 4)) this.feed('🦌', 'Reinen gikk til skogs – veien er fri');
      }
      while (this.ei < this.res.events.length && this.res.events[this.ei].t <= this.t) this.handle(this.res.events[this.ei++], false);
      // leder
      let best = -1, by = -1e9;
      for (let i = 0; i < this.n; i++) { const m = this.mar[i]; if (m.state) continue; const y = this.pos(i, this.t)[1]; if (y > -50000 && y > by) { by = y; best = i; } }
      this.leaderY = best >= 0 ? by : this.leaderY;
      if (best >= 0 && best !== this.leader && this.t > G + 2 && !this.finished.length) {
        this.leader = best;
        if (this.once('leadFeed', 3.5)) this.feed('🏔️', `${this.who(this.pax.get(this.mar[best].no))} tar ledelsen`, 'lead');
      }
      if (this.playing && ((this.winT != null && this.t >= this.winT + 3.8) || this.t >= this.res.duration)) this.wrapUp();
    }
    updateCamera(dt) {
      const C = this.C;
      let tx = C.start.x, ty = C.start.y - 130, tvh = 620;
      if (this.res && this.t > 0.2) {
        if (this.t > this.firstFinT - 1.4) { tx = C.fin.x - 50; ty = C.fin.y + 90; tvh = 660; }
        else if (this.t >= P.GATE_T - 0.4) {
          const live = [];
          for (let i = 0; i < this.n; i++) if (!this.mar[i].state) { const q = this.pos(i, this.t); if (q[1] > -50000) live.push(q); } // ikke kuler inne i en tunnel
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
      this.cam.x = vw >= C.W ? C.W / 2 : u.clamp(this.cam.x, vw / 2, C.W - vw / 2);
      this.cam.y = u.clamp(this.cam.y, C.top + this.cam.vh / 2, C.H + 40 - this.cam.vh / 2);
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
      D.sky(ctx, cw, ch, v, this.time, this.stars, this.C);
      ctx.setTransform(dpr * s, 0, 0, dpr * s, -v.x * s * dpr, -v.y * s * dpr);
      D.scene(ctx, this.C, v, this.res ? this.t : this.time, this.time, { flash: this.res ? (b) => this.bumpHit(b) : null, cage: this.rec && this.rec.leftBehind });
      this.drawMarbles();
      this.drawTexts();
    }
    bumpHit(b) { return this.mar.some((m, i) => m.bumpT != null && this.t - m.bumpT < 0.15 && Math.hypot(this.pos(i, this.t)[0] - b.x, this.pos(i, this.t)[1] - b.y) < 60); }
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
        if (m.cause !== 'k_orna') { const [px, py] = this.pos(i, Math.max(0, this.t - 0.1)); D.trail(this.ctx, px, py, x, y, out ? '#6b7480' : p.color); }
        D.ball(this.ctx, x, y, out ? '#6b7480' : p.color, p.label, ang, out ? 0.55 : 1, ring);
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
      this.syncCourse(true);
      this.cam = this.homeCam();
      this.fx.clear();
      this.el.ev.innerHTML = ''; this.el.an.innerHTML = ''; this.el.kf.innerHTML = '';
      this.el.route.innerHTML = '';
      this.el.pax.innerHTML = '<li class="side-empty">Kulene står klare i porten på toppen.</li>';
      this.el.log.innerHTML = '<li class="side-empty">Kommentatoren varmer opp stemmen.</li>';
      this.el.paxCount.textContent = '0'; this.el.logCount.textContent = '0';
      this.renderStart();
    }
    prepare(d) {
      const n = d.tickets.length;
      const need = Math.min(d.winners.length, n);
      let res;
      if (d.physSeed != null) res = P.simulate(n, d.physSeed, d.course || null);
      else {
        res = P.race(n, u.randInt(0x7fffffff), need, d.course || null, d.course ? 16 : 8);
        if (d.course && res.finishers < need) { // egen løype slapp for få gjennom – originalen tar over
          u.toast(`«${d.course.name}» slapp for få kuler gjennom – kjører originalløypa i stedet.`, 4200);
          d.course = null;
          res = P.race(n, u.randInt(0x7fffffff), need, null);
        }
      }
      d.physSeed = res.seed;
      const crypto = d.winners.concat(d.elim.slice().reverse());
      const ticketOf = new Array(n);
      res.rank.forEach((mi, k) => { ticketOf[mi] = crypto[k]; });
      if (!d.beats || !d.beats.length) {
        d.beats = res.events.filter((e) => e.type === 'out').map((e) => {
          const b = { at: +(e.t / res.duration).toFixed(4), place: 'kei', ev: e.cause, v: [ticketOf[e.i]], t: 0 };
          if (e.pn) b.pn = e.pn;
          return b;
        });
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
      this.courseName = draw.course ? draw.course.name : null;
      this.W = Math.min(draw.winners.length, this.n);
      this.mar = ticketOf.map((no) => ({ no, state: null, cause: null, bumpT: null }));
      this.pax = new Map();
      draw.tickets.forEach((t) => { const label = t.label || u.pad(t.no); this.pax.set(t.no, { no: t.no, name: t.name, label, color: u.colorFor(t.name), ini: label, alive: true, row: null }); });
      const ff = res.events.find((e) => e.type === 'finish');
      this.firstFinT = ff ? ff.t : Infinity;
      this.finished = []; this.out = 0; this.logN = 0; this.ei = 0; this.t = 0; this.leader = -1; this.leaderY = 0; this.winT = null;
      this.sayPrio = 0; this.texts = []; this.fb = new Map();
      this.cam = this.homeCam();
      this.buildManifest();
      this.el.log.innerHTML = '';
      this.el.ev.innerHTML = ''; this.el.kf.innerHTML = '';
      this.hideOverlay(this.el.start); this.hideOverlay(this.el.end);
      this.running = true; this.playing = true;
      Eng.speed = FL.Engine.userSpeed || 1;
      this.stage.classList.add('is-running');
      S().unlock();
      const left = draw.leftBehind || [];
      const where = this.courseName ? `i porten på toppen av ${u.esc(this.raceName())}` : 'i porten på toppen, 366 meter over Bodø';
      this.say('🎙️', this.courseName ? `Velkommen til ${u.esc(this.raceName())}!` : 'Velkommen til Keiservarden!', `${this.n} kuler ${where}. Bare <b>${u.numberWord(this.W)}</b> kommer først ned til havna.${left.length ? ` ${u.esc(u.joinNames(left.map((p) => p.name)))} har ikke betalt og sitter fast i porten.` : ''}`, 2);
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
    courseRow() {
      const list = approved();
      const cur = this.def ? this.def.id : P.ORIGINAL.id;
      const opts = [`<option value="${P.ORIGINAL.id}">Keiservarden (original)</option>`]
        .concat(list.map((c) => `<option value="${u.esc(c.id)}"${c.id === cur ? ' selected' : ''}>${u.esc(c.name)}</option>`)).join('');
      const stale = Store.courseId && Store.courseId !== P.ORIGINAL.id && !this.def ? Store.getCourse(Store.courseId) : null;
      return `<div class="ov-course"><label class="ov-course-pick"><span>Løype</span><select data-course aria-label="Velg løype">${opts}</select></label>
        <a class="btn btn-ghost btn-small" href="designer.html">✏️ Løypedesigner</a>
        ${stale ? `<p class="ov-course-note">«${u.esc(stale.name)}» er endret og må godkjennes på nytt i designeren. Originalen brukes så lenge.</p>` : ''}</div>`;
    }
    renderStart() {
      if (this.running || !this.active) return;
      this.syncCourse();
      const t = Store.totals();
      const W = Store.settings.winners;
      const name = this.def ? this.def.name : 'Keiservarden';
      let html;
      if (!t.tickets) {
        html = `<div class="ov-card"><p class="ov-kicker">Keiservarden GP · ${u.esc(name)}</p><h3 class="ov-title">Ingen har <em>betalt</em></h3>
          <p class="ov-sub">${t.people ? 'Bekreft betaling i påmeldingen – bare de som har betalt får en kule i porten.' : 'Legg inn passasjerer og bekreft betaling i påmeldingen først.'}</p>
          ${this.courseRow()}
          <div class="ov-btns"><a class="btn btn-primary" href="pamelding.html">Til påmeldingen</a><button class="btn btn-ghost" type="button" data-act="demo">🏔️ Prøveløp</button></div>
          <p class="ov-fine">Prøveløp lagres ikke i skipsloggen.</p></div>`;
      } else {
        const left = Store.leftBehind();
        html = `<div class="ov-card"><p class="ov-kicker">Keiservarden · fysikk-kuleløp</p><h3 class="ov-title">${this.def ? `<em>${u.esc(this.def.name)}</em>` : 'Keiservarden <em>Grand Prix</em>'}</h3>
          <p class="ov-sub">${t.tickets} kuler slippes fra toppen. De <b>${u.numberWord(Math.min(W, t.paidPeople))}</b> første ned til Bodø havn vinner.</p>
          <div class="ov-facts"><span><b>${t.paidPeople}</b> betalt</span><span><b>${t.tickets}</b> kuler</span><span><b>${u.kr(t.pot)}</b> i potten</span></div>
          ${this.courseRow()}
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
      this.el.end.innerHTML = `<div class="ov-card">${badge}<p class="ov-kicker">${this.courseName ? `${u.esc(this.courseName)} · ` : 'Bodø havn · '}målgang · ${u.esc(u.dfLong.format(new Date(d.date)))}</p>
        <h3 class="ov-title">Først ned <em>${this.courseName ? 'til havna!' : 'Keiservarden!'}</em></h3>
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
      this.el.start.addEventListener('change', (e) => {
        const sel = e.target.closest('[data-course]');
        if (sel && mine()) Store.setCourse(sel.value); // Store varsler → renderStart → ny løype tegnes
      });
    }
    busy(msg) { this.el.start.innerHTML = `<div class="ov-card"><p class="ov-kicker">Keiservarden</p><h3 class="ov-title">${msg}</h3></div>`; this.el.start.hidden = false; }
    snapshot(draw) { const def = activeDef(); if (def) draw.course = { id: def.id, name: def.name, pieces: def.pieces }; return draw; }
    startLive() {
      const people = Store.participants();
      if (!people.length) { u.toast('Ingen har betalt ennå – bekreft betaling i påmeldingen.'); return; }
      S().unlock();
      const draw = this.snapshot(Ev.createDraw(people, Store.settings, { game: 'keiser', leftBehind: Store.leftBehind() }));
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
      const draw = this.snapshot(Ev.createDraw(people, Store.settings, { game: 'keiser', demo: true, leftBehind: left }));
      this.busy('Preparerer <em>løypa…</em>');
      setTimeout(() => this.start(draw, 'demo'), 40);
    }
    replay(rec) { S().unlock(); this.busy('Spoler tilbake…'); setTimeout(() => this.start(rec, 'replay'), 40); }
  }

  ['announce', 'infoCard', 'scrollRow', 'markWinner', 'hideOverlay'].forEach((k) => { Keiser.prototype[k] = FL.Voyage.prototype[k]; });
  FL.Keiser = Keiser;
})();
