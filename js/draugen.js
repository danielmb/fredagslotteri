/* Fredagslotteriet – «Draugen»: hele flåten ror over Vestfjorden mot Henningsvær */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u, Ev = FL.Events, Store = FL.Store, A = FL.Art, D = FL.DArt;
  const { Eng, E, svgEl, ABORT } = FL.Engine;
  const S = () => FL.Audio;
  const VW = 1600, VH = 900, SEA = 470;
  const NAMES = ['Kari Nordmann', 'Ola Nordmann', 'Tor-Erik', 'Siv', 'Bjørnar', 'Hanne', 'Frode', 'Mona', 'Geir', 'Lise', 'Arnt', 'Trine', 'Rune', 'Ingrid', 'Stig', 'Unni', 'Kjell-Ove', 'Randi', 'Svein', 'Gunn'];

  class Draugen {
    constructor(stage) {
      this.stage = stage;
      this.sceneEl = u.$('#scene', stage);
      this.svg = u.$('#draugenSvg', stage);
      this.fx = new FL.FX(u.$('#draugenFx', stage));
      this.cam = { x: 0, y: 0, w: VW, h: VH };
      this._vb = '';
      this.fx.camera = () => this.cam;
      this.el = {
        route: u.$('#route', stage), an: u.$('#announce', stage), ev: u.$('#evWrap', stage),
        pax: u.$('#paxList', stage), log: u.$('#logList', stage), paxCount: u.$('#paxCount', stage), logCount: u.$('#logCount', stage),
        start: u.$('#startOverlay', stage), end: u.$('#endOverlay', stage), sideBody: u.$('.side-body', stage),
      };
      this.token = 0; this.running = false; this.active = false; this.skipping = false;
      this.progress = 0; this.storm = 0.4; this.dawn = 0; this.time = 0; this.rainAcc = 0;
      this.boats = []; this.byNo = new Map(); this.L = 12000; this.henn = null; this.bodoMark = null;
      this.build();
      this.bind();
    }

    /* ---------- Scene ---------- */
    build() {
      this.svg.innerHTML = `<defs>${D.DEFS}</defs>
        <rect width="${VW}" height="${VH}" fill="url(#dSky)"/>
        <rect id="dgDawn" width="${VW}" height="${VH}" fill="url(#dDawn)" opacity="0"/>
        <g id="dgMoon"><circle cx="1240" cy="150" r="120" fill="url(#dMoon)"/><circle cx="1240" cy="150" r="32" fill="#e8eef5" opacity=".85"/></g>
        <rect id="dgSkyFlash" width="${VW}" height="${SEA}" fill="#cfe2ff" opacity="0"/>
        <g id="dgBoltBg"></g>
        <g id="dgClouds"><g data-f="0.02" data-drift="3">${D.clouds(5, { y0: 20, y1: 220, n: 6, dark: '#0d1420', rim: '#46597a' })}</g><g data-f="0.05" data-drift="7">${D.clouds(9, { y0: 140, y1: 340, n: 5, dark: '#080d16', rim: '#2c3a52' })}</g></g>
        <g id="dgWall">${A.mountainLayer(888, { base: SEA + 6, amp: 230, step: 12, top: '#3b4a64', mid: 0.35, color: '#141d2a', bottom: '#0e1520', rim: '#9fb2d6', rimO: 0.25, sharp: 2.3, jag: 0.8 })}</g>
        <g id="dgFar"></g>
        <rect x="0" y="${SEA}" width="${VW}" height="${VH - SEA}" fill="url(#dSea)"/>
        <rect id="dgSeaDawn" x="0" y="${SEA}" width="${VW}" height="${VH - SEA}" fill="url(#dSeaDawn)" opacity="0"/>
        <g data-f="0.25" data-drift="10">${A.waveLines(612, { y0: SEA + 8, y1: 640, rows: 12, alpha: 1 })}</g>
        <g id="dgBack"></g>
        <g id="dgFleet"></g>
        <g data-f="0.9" data-drift="22">${A.waveLines(613, { y0: 650, y1: 895, rows: 12 })}</g>
        <g id="dgFx"></g>
        <rect id="dgFlash" width="${VW}" height="${VH}" fill="#ffffff" opacity="0" pointer-events="none"/>
        <rect id="dgInk" width="${VW}" height="${VH}" fill="#000" opacity="0" pointer-events="none"/>
        <g id="dgSky"></g>`;
      const q = (id) => this.svg.querySelector('#' + id);
      this.g = { dawn: q('dgDawn'), seaDawn: q('dgSeaDawn'), moon: q('dgMoon'), skyFlash: q('dgSkyFlash'), boltBg: q('dgBoltBg'), clouds: q('dgClouds'), wall: q('dgWall'), far: q('dgFar'), back: q('dgBack'), fleet: q('dgFleet'), fx: q('dgFx'), flash: q('dgFlash'), ink: q('dgInk'), sky: q('dgSky') };
      this.layers = Array.from(this.svg.querySelectorAll('[data-f]')).map((el) => ({ el, f: +el.dataset.f, drift: +(el.dataset.drift || 0) }));
    }
    clear() {
      ['far', 'back', 'fleet', 'fx', 'sky', 'boltBg'].forEach((k) => { this.g[k].innerHTML = ''; });
      this.g.flash.setAttribute('opacity', 0); this.g.ink.setAttribute('opacity', 0);
      this.boats = []; this.byNo = new Map(); this.henn = null;
      this.fx.clear();
      this.cam = { x: 0, y: 0, w: VW, h: VH };
      this.progress = 0; this.dawn = 0; this.storm = 0.4;
      this.bodoMark = svgEl('g', {}, A.bodo());
      this.g.back.appendChild(this.bodoMark);
    }
    prop(markup, parent = 'fx', attrs = {}) { const el = svgEl('g', attrs, markup); this.g[parent].appendChild(el); return el; }
    pop(text, x, y, { size = 48, color = '#ffffff', rot = -6, life = 1200 } = {}) {
      const g = svgEl('g', {}, `<text class="pop-txt" text-anchor="middle" font-size="${size}" fill="${color}" stroke-width="${Math.max(4, size / 7).toFixed(1)}">${u.esc(text)}</text>`);
      this.g.sky.appendChild(g);
      const set = (s, o, dy) => { g.setAttribute('transform', `translate(${x.toFixed(1)} ${(y - dy).toFixed(1)}) rotate(${rot}) scale(${s.toFixed(3)})`); g.style.opacity = o; };
      Eng.tween(260, (p) => set(0.3 + 0.7 * p, 1, 0), E.outBack)
        .then(() => Eng.tween(life, (p) => set(1, p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4, p * 26), E.linear))
        .then(() => g.remove());
    }
    shake() { const s = this.sceneEl; s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); }
    flash(op = 0.95, dur = 450) { const r = this.g.flash; Eng.tween(dur, (p) => r.setAttribute('opacity', (op * (1 - p)).toFixed(3)), E.out); }
    skyFlash(op = 0.4) {
      const r = this.g.skyFlash;
      Eng.tween(380, (p) => r.setAttribute('opacity', (op * (1 - p) * (0.6 + 0.4 * Math.sin(p * 30))).toFixed(3)), E.linear);
      if (Math.random() < 0.6) {
        const x = 200 + Math.random() * 1200;
        const b = svgEl('g', { opacity: 0.55 }, D.bolt(x, 0, x + (Math.random() - 0.5) * 200, SEA - 40 - Math.random() * 120));
        this.g.boltBg.appendChild(b);
        Eng.tween(260, (p) => b.setAttribute('opacity', (0.55 * (1 - p)).toFixed(2)), E.linear).then(() => b.remove());
      }
    }

    /* ---------- Kamera (viewBox) ---------- */
    camTo(cx, cy, w, dur = 700) {
      w = u.clamp(w, 480, VW);
      const h = (w * VH) / VW;
      const x = u.clamp(cx - w / 2, 0, VW - w), y = u.clamp(cy - h / 2, 0, VH - h);
      const f = { ...this.cam };
      return Eng.tween(dur, (p) => { this.cam = { x: u.lerp(f.x, x, p), y: u.lerp(f.y, y, p), w: u.lerp(f.w, w, p), h: u.lerp(f.h, h, p) }; }, E.inOut);
    }
    camReset(dur = 650) { return this.camTo(VW / 2, VH / 2, VW, dur); }
    async slowmo(fn, speed = 0.55) {
      const prev = Eng.speed;
      if (!this.skipping) Eng.speed = Math.min(prev, prev * speed);
      try { await fn(); } finally { if (!this.skipping) Eng.speed = FL.Engine.userSpeed || 1; }
    }

    /* ---------- Flåten ---------- */
    layout(n) {
      const rows = n <= 7 ? 1 : n <= 16 ? 2 : n <= 27 ? 3 : n <= 40 ? 4 : 5;
      const per = Math.ceil(n / rows);
      const slots = [];
      for (let r = 0; r < rows; r++) {
        const t = rows === 1 ? 0.8 : r / (rows - 1);
        const y = 560 + t * 220, s = 0.62 + t * 0.4;
        const count = Math.min(per, n - r * per);
        for (let c = 0; c < count; c++) {
          const span = 1240 / count;
          slots.push({ x: 180 + span * (c + 0.5) + (r % 2 ? 0.22 : -0.22) * span + (Math.random() - 0.5) * span * 0.25, y: y + (Math.random() - 0.5) * 14, s, row: r });
        }
      }
      return slots;
    }
    makeFleet() {
      const pax = Array.from(this.pax.values());
      const slots = this.layout(pax.length);
      const order = u.shuffle(pax, (n) => Math.floor(Math.random() * n));
      const list = order.map((p, i) => ({ p, ...slots[i] })).sort((a, b) => a.row - b.row || a.y - b.y);
      list.forEach((b) => {
        const g = svgEl('g', { class: 'fb', 'clip-path': 'url(#fbClip)' }, D.faering(b.p));
        g.style.opacity = 0;
        const oar = g.querySelector('.fb-oar');
        if (oar) oar.style.animationDelay = (-Math.random()).toFixed(2) + 's';
        this.g.fleet.appendChild(g);
        Object.assign(b, { g, act: g.querySelector('.fb-act'), rock: g.querySelector('.fb-rock'), foam: g.querySelector('.fb-foam'), phase: Math.random() * 6.28, ox: 0, oy: 0, ax: 0, ay: 0, ar: 0, as: 1, gone: false });
        this.boats.push(b);
        this.byNo.set(b.p.no, b);
      });
    }
    setAct(b) { b.act.setAttribute('transform', `translate(${b.ax.toFixed(1)} ${b.ay.toFixed(1)}) rotate(${b.ar.toFixed(1)} 0 -40) scale(${b.as.toFixed(3)})`); }
    pos(b) { return { x: b.x + b.ox + b.ax * b.s, y: b.y + b.oy + b.ay * b.s }; }
    sail(b) { const p = this.pos(b); return { x: p.x, y: p.y - 66 * b.s }; }
    hide(b) { b.gone = true; b.g.style.display = 'none'; }
    launch() {
      return Promise.all(this.boats.map((b, i) => Eng.wait(i * 45).then(() => Eng.tween(420, (p) => { b.g.style.opacity = p; b.oy = (1 - p) * 26; }, E.out))));
    }

    /* ---------- Rute ---------- */
    buildRoute() {
      this.el.route.innerHTML = '<div class="route-line"><div class="route-fill"></div></div>'
        + Ev.ROUTE_DRAUGEN.map((s) => `<div class="route-stop${s.type === 'marker' ? ' is-marker' : ''}" data-at="${s.at}" style="left:${s.at * 100}%"><i></i><span>${u.esc(s.name)}</span></div>`).join('')
        + '<span class="route-boat route-boat-d" aria-hidden="true">🚣</span>';
      this.routeFill = u.$('.route-fill', this.el.route);
      this.routeBoat = u.$('.route-boat', this.el.route);
      this.routeStops = u.$$('.route-stop', this.el.route);
      this._rp = -1;
    }
    tickRoute() {
      if (!this.routeFill) return;
      const p = u.clamp(this.progress, 0, 1);
      if (Math.abs(p - this._rp) < 0.0004) return;
      this._rp = p;
      const pc = (p * 100).toFixed(2) + '%';
      this.routeFill.style.width = pc; this.routeBoat.style.left = pc;
      this.routeStops.forEach((s) => s.classList.toggle('is-passed', p >= +s.dataset.at - 0.003));
    }
    routeMark() { const m = document.createElement('div'); m.className = 'route-mark'; m.style.left = (u.clamp(this.progress, 0, 1) * 100).toFixed(2) + '%'; this.el.route.appendChild(m); }

    /* ---------- Hovedløkke ---------- */
    frame(d, dtReal) {
      if (!this.active) return;
      const s = d / 1000;
      this.time += s;
      const dist = this.progress * this.L;
      const stormy = 1 + this.storm;
      for (const L of this.layers) L.el.setAttribute('transform', `translate(${(-((dist * L.f + this.time * L.drift * 10 * stormy) % VW)).toFixed(1)} 0)`);
      const k = 0.35 + 0.65 * this.progress;
      this.g.wall.setAttribute('transform', `translate(${(-((dist * 0.012) % VW)).toFixed(1)} ${SEA}) scale(1 ${k.toFixed(3)}) translate(0 ${-SEA})`);
      if (this.bodoMark) this.bodoMark.setAttribute('transform', `translate(${(330 - dist * 0.5).toFixed(1)} ${SEA + 46}) scale(.5)`);
      if (this.henn) this.henn.setAttribute('transform', `translate(${(1050 + (1 - this.progress) * 9000).toFixed(1)} ${SEA + 44}) scale(.92)`);
      this.g.dawn.setAttribute('opacity', this.dawn.toFixed(3));
      this.g.seaDawn.setAttribute('opacity', (this.dawn * 0.85).toFixed(3));
      this.g.clouds.setAttribute('opacity', (1 - this.dawn * 0.75).toFixed(3));
      this.g.moon.setAttribute('opacity', (1 - this.dawn).toFixed(3));
      const amp = 2.5 + this.storm * 3;
      for (const b of this.boats) {
        if (b.gone) continue;
        const bob = Math.sin(this.time * 1.7 + b.phase) * amp * b.s;
        const rot = Math.sin(this.time * 1.2 + b.phase * 1.7) * (2.5 + this.storm * 5);
        b.g.setAttribute('transform', `translate(${(b.x + b.ox).toFixed(1)} ${(b.y + b.oy + bob).toFixed(1)}) scale(${b.s.toFixed(3)})`);
        b.rock.setAttribute('transform', `rotate(${rot.toFixed(2)} 0 -6)`);
      }
      const vb = `${this.cam.x.toFixed(1)} ${this.cam.y.toFixed(1)} ${this.cam.w.toFixed(1)} ${this.cam.h.toFixed(1)}`;
      if (vb !== this._vb) { this.svg.setAttribute('viewBox', vb); this._vb = vb; }
      // regn
      const rain = (dtReal / 1000) * (30 + this.storm * 260) * (1 - this.dawn);
      this.rainAcc += rain;
      while (this.rainAcc >= 1) {
        this.rainAcc -= 1;
        this.fx.add({ x: this.cam.x + Math.random() * (this.cam.w + 400), y: this.cam.y - 20, vx: -330, vy: 1150 + Math.random() * 250, life: 1.1, size: 1.3, kind: 'streak', color: 'rgba(196,214,236,.95)' });
      }
      if (this.running && !this.dawn && Math.random() < (dtReal / 1000) * (0.04 + this.storm * 0.3)) this.skyFlash(0.18 + this.storm * 0.3);
      this.fx.update(dtReal * Math.min(2, Eng.speed));
      this.tickRoute();
    }

    /* ---------- Kort, logg, passasjerliste ---------- */
    card(b, i, reveal) {
      const ev = Ev.EVENTS[b.ev];
      const last = i === this.lastIdx;
      if (!reveal) {
        const meta = b.save ? 'Et under på Vestfjorden' : (last ? 'Siste offer før Henningsvær' : `Hendelse ${i + 1} av ${this.draw.beats.length}`);
        this.el.ev.innerHTML = `<div class="evcard${last ? ' is-final' : ''}" style="--ec:${ev.ec}"><div class="ec-ico">${ev.icon}</div><div>`
          + `<div class="ec-meta">${meta} · ${u.esc(Ev.PLACE_LABEL[b.place] || 'Vestfjorden')}</div>`
          + `<h3 class="ec-title">${u.esc(ev.title)}</h3><p class="ec-text"><span class="dots">• • •</span></p></div></div>`;
      } else {
        const p = u.$('.ec-text', this.el.ev);
        if (p) { p.innerHTML = Ev.eventText(b, this.draw.tickets, true); p.classList.add('reveal'); }
      }
    }
    eliminate(p, b) {
      if (!p || !p.alive) return;
      p.alive = false;
      this.out++;
      const ev = Ev.EVENTS[b.ev];
      p.row.classList.add('is-out');
      p.row.classList.remove('is-hit'); void p.row.offsetWidth; p.row.classList.add('is-hit');
      p.row.querySelector('.px-st').textContent = ev.icon;
      p.row.title = ev.name;
      this.scrollRow(p.row);
      this.updateCounts();
    }
    logCrew(left) {
      const li = document.createElement('li');
      li.className = 'lg';
      li.innerHTML = `<span>👻</span><div><small>Bodø · før avreise</small>Mannskap hos Draugen (ikke betalt): ${u.joinNames(left.map((p) => `<b>${u.esc(p.name)}</b>`))}</div>`;
      const first = this.el.log.querySelector('.side-empty');
      if (first) first.remove();
      this.el.log.prepend(li);
    }
    renderEmptySide() {
      this.el.pax.innerHTML = '<li class="side-empty">Flåten fylles når dere ror ut fra Bodø.</li>';
      this.el.log.innerHTML = '<li class="side-empty">Ingen hendelser ennå. Havet er stille. Foreløpig.</li>';
      this.el.paxCount.textContent = '0'; this.el.logCount.textContent = '0';
    }

    /* ---------- Oppsett og aktivering ---------- */
    activate() { this.active = true; this.idle(); }
    deactivate() { this.abort(); this.active = false; }
    idle() {
      this.clear();
      this.buildRoute();
      this.tickRoute();
      this.el.ev.innerHTML = ''; this.el.an.innerHTML = '';
      this.renderStart();
      this.renderEmptySide();
    }
    setup() {
      const d = this.draw;
      this.clear();
      this.L = Math.max(9000, (d.beats.length + 2) * 900);
      this.TOTAL = Math.max(6500, 2050 * Math.max(1, d.beats.length));
      this.pax = new Map();
      d.tickets.forEach((t) => { const label = t.label || u.pad(t.no); this.pax.set(t.no, { no: t.no, name: t.name, label, color: u.colorFor(t.name), ini: label, alive: true, row: null }); });
      this.out = 0; this.logN = 0; this.beatIdx = 0; this.bossShown = false; this.crew = [];
      this.lastIdx = d.beats.map((b) => !b.save).lastIndexOf(true);
      this.buildRoute();
      this.buildManifest();
      this.makeFleet();
      this.el.ev.innerHTML = ''; this.el.an.innerHTML = '';
    }
    sailTo(at) {
      const from = this.progress;
      if (at <= from) return Promise.resolve();
      return Eng.tween(Math.max(600, (at - from) * this.TOTAL), (p) => { this.progress = from + (at - from) * p; }, E.inOut);
    }

    /* ---------- Selve reisen ---------- */
    start(draw, mode) {
      this.abort(true);
      const token = ++this.token;
      this.draw = draw; this.mode = mode;
      this.play(token).catch((e) => { if (e !== ABORT) console.error(e); });
    }
    abort(silent) {
      this.token++;
      this.running = false; this.skipping = false;
      Eng.speed = FL.Engine.userSpeed || 1;
      this.stage.classList.remove('is-running');
      S().storm(false);
      if (!silent && this.active) this.idle();
    }
    async play(token) {
      const d = this.draw;
      const chk = () => { if (token !== this.token) throw ABORT; };
      const w = async (p) => { await p; chk(); };
      this.setup();
      this.running = true;
      Eng.speed = FL.Engine.userSpeed || 1;
      this.stage.classList.add('is-running');
      this.hideOverlay(this.el.start); this.hideOverlay(this.el.end);
      S().unlock(); S().storm(true);
      const T = d.tickets.length, W = d.winners.length;
      this.announce('Lofot&shy;fisket', 'Bodø · kl. 23.47 · storm i anmarsj', 2600);
      this.infoCard('🚣', 'Ut på Vestfjorden', `${T} færinger ror ut fra Bodø. Bare <b>${u.numberWord(W)}</b> kommer til Henningsvær når sola står opp.`, this.mode === 'live' ? 'Trekningen er låst i skipsloggen' : (this.mode === 'demo' ? 'Prøvetur · lagres ikke' : 'Reprise'));
      await w(this.launch());
      await w(Eng.wait(1100));
      if (d.leftBehind && d.leftBehind.length) await w(FL.DAnims.recruit(this, d.leftBehind));
      if (d.amulet && d.beats.some((b) => b.ev === 'amulett')) await w(FL.DAnims.amuletIntro(this, d.amulet));
      this.announce('Ro!', 'Hiv ohoi', 1500);
      S().ding();
      for (let i = 0; i < d.beats.length; i++) {
        if (this.skipping) break;
        const b = d.beats[i];
        if (b.place === 'boss' && !this.bossShown) { this.bossShown = true; await w(this.bossIntro()); }
        await w(this.sailTo(b.at));
        await w(this.playBeat(b, i));
        this.beatIdx = i + 1;
      }
      if (this.skipping) this.fastForward();
      await this.arrive(w);
    }
    async bossIntro() {
      const alive = this.draw.tickets.length - this.out;
      S().thunder();
      this.flash(0.7, 600);
      this.shake();
      this.announce('Stormens øye', `${alive} igjen · bare ${this.draw.winners.length} kommer frem`, 2600);
      await Eng.tween(1600, (p) => { this.storm = 0.4 + 0.6 * p; }, E.inOut);
      S().heartbeat();
      await Eng.wait(700);
      S().heartbeat();
      await Eng.wait(500);
    }
    async playBeat(b, i) {
      const boats = b.v.map((no) => this.byNo.get(no)).filter((x) => x && !x.gone);
      if (!boats.length) return;
      const last = i === this.lastIdx;
      this.card(b, i, false);
      const anim = (FL.DAnims[b.ev] || FL.DAnims.kraken)(this, boats, b, last);
      await Eng.wait(last ? 1200 : 800);
      this.card(b, i, true);
      try { await anim; } catch (e) { console.error(e); }
      if (!b.save) {
        boats.forEach((bt) => { if (!bt.gone) this.hide(bt); this.eliminate(this.pax.get(bt.p.no), b); });
        this.routeMark();
      }
      this.log(b, i);
      await Eng.wait(last ? 1500 : 1000);
    }
    fastForward() {
      const beats = this.draw.beats;
      for (let i = this.beatIdx; i < beats.length; i++) {
        const b = beats[i];
        if (b.save) continue;
        b.v.forEach((no) => { const bt = this.byNo.get(no); if (bt && !bt.gone) this.hide(bt); this.eliminate(this.pax.get(no), b); });
        this.log(b, i);
      }
      this.beatIdx = beats.length;
      this.g.fx.innerHTML = '';
      this.cam = { x: 0, y: 0, w: VW, h: VH };
      this.progress = Math.max(this.progress, 0.9);
      this.el.ev.innerHTML = '';
      this.skipping = false;
      Eng.speed = FL.Engine.userSpeed || 1;
    }
    async arrive(w) {
      const d = this.draw;
      this.henn = svgEl('g', {}, D.henningsvaer());
      this.g.back.appendChild(this.henn);
      S().storm(false);
      this.announce('Soloppgang', 'Mørketida er over · Henningsvær i sikte', 2800);
      await w(Promise.all([this.sailTo(1), Eng.tween(3400, (p) => { this.dawn = p; this.storm = 0.4 * (1 - p); }, E.inOut)]));
      await w(FL.DAnims.finale(this, d));
      this.finish();
    }
    finish() {
      this.running = false;
      this.stage.classList.remove('is-running');
      this.showEnd();
    }
    skip() {
      if (!this.running || this.skipping || this.beatIdx >= this.draw.beats.length) return;
      this.skipping = true;
      Eng.speed = 8;
      S().whoosh();
    }

    /* ---------- Overlays ---------- */
    renderStart() {
      if (this.running || !this.active) return;
      const t = Store.totals();
      const W = Store.settings.winners;
      let html;
      if (!t.tickets) {
        html = `<div class="ov-card"><p class="ov-kicker">Bodø havn · kl. 23.47</p><h3 class="ov-title">Ingen har <em>betalt</em></h3>
          <p class="ov-sub">${t.people ? 'Bekreft betaling i påmeldingen – bare de som har betalt får en færing.' : 'Legg inn passasjerer og bekreft betaling i påmeldingen først.'}</p>
          <div class="ov-btns"><a class="btn btn-primary" href="pamelding.html">Til påmeldingen</a><button class="btn btn-ghost" type="button" data-act="demo">🚣 Prøvetur</button></div>
          <p class="ov-fine">Prøveturer lagres ikke i skipsloggen.</p></div>`;
      } else {
        const left = Store.leftBehind();
        const am = Draugen.lastFourth();
        const amIn = am && Store.participants().some((p) => u.normName(p.name) === u.normName(am));
        html = `<div class="ov-card"><p class="ov-kicker">Bodø havn · kl. 23.47 · storm i anmarsj</p><h3 class="ov-title">Klar for <em>Lofotfisket</em></h3>
          <p class="ov-sub">${t.tickets} færinger ror over Vestfjorden i natt. Bare <b>${u.numberWord(Math.min(W, t.paidPeople))}</b> når Henningsvær før sola står opp.</p>
          <div class="ov-facts"><span><b>${t.paidPeople}</b> betalt</span><span><b>${t.tickets}</b> færinger</span><span><b>${u.kr(t.pot)}</b> i potten</span></div>
          <div class="ov-btns"><button class="btn btn-primary" type="button" data-act="go">🚣 Ro ut!</button><button class="btn btn-ghost" type="button" data-act="demo">Prøvetur først</button></div>
          ${amIn ? `<p class="ov-warn">🦷 Draugens tann går til <b>${u.esc(am)}</b> – nærmest å vinne sist.</p>` : ''}
          ${left.length ? `<p class="ov-warn">👻 ${u.esc(u.joinNames(left.slice(0, 6).map((p) => p.name)))}${left.length > 6 ? ` og ${left.length - 6} til` : ''} har ikke betalt – Draugen tar dem som mannskap.</p>` : ''}
          <p class="ov-fine">Vinnerne trekkes og låses i skipsloggen idet flåten ror ut.</p></div>`;
      }
      this.el.start.innerHTML = html;
      this.el.start.hidden = false;
    }
    showEnd() {
      const d = this.draw;
      const ws = d.winners.map((no, k) => ({ p: this.pax.get(no), rank: k + 1 }));
      const podOrder = ws.length >= 3 ? [ws[1], ws[0], ws[2]].concat(ws.slice(3)) : (ws.length === 2 ? [ws[1], ws[0]] : ws);
      const pods = podOrder.map(({ p, rank }) => `<div class="pod p${rank <= 3 ? rank : 'n'}"><div class="pod-av" style="background:${p.color}">${u.esc(p.label)}</div><div class="pod-name">${u.esc(p.name)}</div><div class="pod-tix">færing ${u.esc(p.label)}</div><div class="pod-block">${rank}</div></div>`).join('');
      const badge = this.mode === 'demo' ? '<span class="ov-badge">Prøvetur</span>' : (this.mode === 'replay' ? '<span class="ov-badge">Reprise</span>' : '');
      this.el.end.innerHTML = `<div class="ov-card">${badge}<p class="ov-kicker">Henningsvær · soloppgang · ${u.esc(u.dfLong.format(new Date(d.date)))}</p>
        <h3 class="ov-title">De overlevde <em>natta!</em></h3>
        <div class="podium">${pods}</div>
        <p class="ov-sub">Kraken har overrakt premiene. Innholdet er, som kjent, urelatert.</p>
        <div class="ov-btns">${this.mode === 'live' ? '<a class="btn btn-primary" href="historikk.html">Se skipsloggen</a>' : '<button class="btn btn-primary" type="button" data-act="close">Tilbake til Bodø</button>'}
        <button class="btn btn-ghost" type="button" data-act="replay">Se reprise</button><button class="btn btn-ghost" type="button" data-act="hide">Se havna</button></div>
        <p class="ov-fine">${this.mode === 'live' ? 'Lagret i skipsloggen.' : (this.mode === 'demo' ? 'Prøveturer lagres ikke.' : 'Reprise av en tidligere trekning.')}</p></div>`;
      this.el.end.hidden = false;
    }
    static lastFourth() {
      const r = Store.history.find((h) => !h.demo && Array.isArray(h.elim) && h.elim.length && Array.isArray(h.tickets));
      if (!r) return null;
      const t = r.tickets[r.elim[r.elim.length - 1] - 1];
      return t ? t.name : null;
    }

    /* ---------- Knapper ---------- */
    bind() {
      const mine = () => this.active && this.stage.dataset.game === 'draugen';
      u.$('#skipBtn', this.stage).addEventListener('click', () => { if (mine()) this.skip(); });
      const onAct = (e) => {
        if (!mine()) return;
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const act = b.dataset.act;
        if (act === 'go') this.startLive();
        else if (act === 'demo') this.startDemo();
        else if (act === 'replay') this.start(this.draw, this.mode === 'live' ? 'replay' : this.mode);
        else if (act === 'hide') this.hideOverlay(this.el.end);
        else if (act === 'close') { this.hideOverlay(this.el.end); this.idle(); }
      };
      this.el.start.addEventListener('click', onAct);
      this.el.end.addEventListener('click', onAct);
    }
    startLive() {
      const people = Store.participants();
      if (!people.length) { u.toast('Ingen har betalt ennå – bekreft betaling i påmeldingen.'); return; }
      S().unlock();
      const draw = Ev.createDraw(people, Store.settings, { game: 'draugen', leftBehind: Store.leftBehind(), amuletName: Draugen.lastFourth() });
      this.start(draw, 'live');
      Store.addRecord(draw);
      Store.resetPaid();
    }
    startDemo() {
      S().unlock();
      const max = Store.settings.maxPerPerson;
      const pool = u.shuffle(Array.from({ length: 99 }, (_, i) => i + 1));
      const people = u.shuffle(NAMES).slice(0, 14 + u.randInt(5)).map((n) => { const t = 1 + u.randInt(max); return { name: n, nums: pool.splice(0, t), tickets: t }; });
      const left = people.splice(0, 2 + u.randInt(2)).map((p) => ({ name: p.name, nums: p.nums }));
      const amuletName = people[u.randInt(people.length)].name;
      this.start(Ev.createDraw(people, Store.settings, { game: 'draugen', demo: true, leftBehind: left, amuletName }), 'demo');
    }
    replay(rec) { S().unlock(); this.start(rec, 'replay'); }
  }

  // generelle hjelpere deles med hurtigbåten
  ['announce', 'infoCard', 'log', 'buildManifest', 'updateCounts', 'scrollRow', 'markWinner', 'hideOverlay'].forEach((k) => { Draugen.prototype[k] = FL.Voyage.prototype[k]; });

  FL.Draugen = Draugen;
})();
