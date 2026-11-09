/* Fredagslotteriet – «Hurtigbåten til Bodø»: spillflyt og scene-UI */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u, Ev = FL.Events, Store = FL.Store, A = FL.Art;
  const { Eng, E, Scene, SLOTS, DOOR, ABORT, PORT_Y, CRUISE } = FL.Engine;
  const S = () => FL.Audio;
  const U = () => FL.Anims.util;
  const DEMO = ['Kari Nordmann', 'Ola Nordmann', 'Tor-Erik', 'Siv', 'Bjørnar', 'Hanne', 'Frode', 'Mona', 'Geir', 'Lise', 'Arnt', 'Trine', 'Rune', 'Ingrid', 'Stig', 'Unni', 'Kjell-Ove', 'Randi'];
  const shortName = (n) => { const p = u.cleanName(n).split(' '); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]; };

  class Voyage {
    constructor(stage) {
      this.stage = stage;
      this.sceneEl = u.$('#scene', stage);
      this.fx = new FL.FX(u.$('#fxCanvas', stage));
      this.sc = new Scene(u.$('#sceneSvg', stage), this.fx);
      this.el = {
        route: u.$('#route', stage), an: u.$('#announce', stage), ev: u.$('#evWrap', stage),
        pax: u.$('#paxList', stage), log: u.$('#logList', stage), paxCount: u.$('#paxCount', stage), logCount: u.$('#logCount', stage),
        start: u.$('#startOverlay', stage), end: u.$('#endOverlay', stage), sideBody: u.$('.side-body', stage),
      };
      this.token = 0; this.userSpeed = 1; this.running = false; this.skipping = false; this._rp = -1; this.ports = {};
      this.bindControls();
      this.idle();
    }

    /* ---------- Hjelpere brukt av animasjonene ---------- */
    prop(markup, layer, x, y, mark) { return this.sc.spawn({}, markup, layer, x, y, mark); }
    pop(text, x, y, { size = 48, color = '#ffffff', rot = -6, life = 1200 } = {}) {
      const g = FL.Engine.svgEl('g', {}, `<text class="pop-txt" text-anchor="middle" font-size="${size}" fill="${color}" stroke-width="${Math.max(4, size / 7).toFixed(1)}">${u.esc(text)}</text>`);
      this.sc.el.sky.appendChild(g);
      const set = (s, o, dy) => { g.setAttribute('transform', `translate(${x.toFixed(1)} ${(y - dy).toFixed(1)}) rotate(${rot}) scale(${s.toFixed(3)})`); g.style.opacity = o; };
      Eng.tween(260, (p) => set(0.3 + 0.7 * p, 1, 0), E.outBack)
        .then(() => Eng.tween(life, (p) => set(1, p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4, p * 26), E.linear))
        .then(() => g.remove());
    }
    shake() { const s = this.sceneEl; s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); }
    ship(markup, { layer = 'far', y, scale = 0.5, from, to, dur, flip = false }) {
      const g = FL.Engine.svgEl('g', {}, markup);
      this.sc.el[layer].appendChild(g);
      const o = { x: from };
      const apply = () => g.setAttribute('transform', `translate(${o.x.toFixed(1)} ${y}) scale(${flip ? -scale : scale} ${scale})`);
      apply();
      const done = Eng.tween(dur, (p) => { o.x = from + (to - from) * p; apply(); }, E.linear).then(() => g.remove());
      return { g, o, y, scale, done };
    }
    portMark(place) { return this.ports[place] || null; }

    /* ---------- Oppsett ---------- */
    idle() {
      this.sc.clearDynamic();
      this.sc.travel = 0; this.sc.v = 0; this.sc.targetV = 0; this.sc.bx = FL.Engine.BOAT_X;
      this.L = 6000;
      this.sc.addMark(A.startPier(), 0, 1, PORT_Y, 640, 640);
      this.buildRoute();
      this.el.ev.innerHTML = ''; this.el.an.innerHTML = '';
      this.renderStart();
      this.renderEmptySide();
    }
    renderEmptySide() {
      this.el.pax.innerHTML = '<li class="side-empty">Passasjerlista fylles når båten legger fra kai.</li>';
      this.el.log.innerHTML = '<li class="side-empty">Reiseloggen er tom. Foreløpig.</li>';
      this.el.paxCount.textContent = '0'; this.el.logCount.textContent = '0';
    }
    setup() {
      const d = this.draw, sc = this.sc;
      sc.clearDynamic();
      sc.travel = 0; sc.v = 0; sc.targetV = 0; sc.bx = FL.Engine.BOAT_X;
      this.L = Math.max(5600, (d.beats.length + 2) * 640);
      const L = this.L;
      this.startMark = sc.addMark(A.startPier(), 0, 1, PORT_Y, 640, 640);
      this.ports = {
        nesna: sc.addMark(A.port('Nesna', 11), Ev.AT.nesna * L, 1, PORT_Y, 640, 640),
        ornes: sc.addMark(A.port('Ørnes', 22), Ev.AT.ornes * L, 1, PORT_Y, 640, 640),
      };
      sc.addMark(A.globe(), Ev.AT.polar * L + 420, 0.62, 562, 160, 160);
      this.bodo = sc.addMark(A.bodo(), L, 1, PORT_Y, 1000, 1400);
      this.pax = new Map();
      d.tickets.forEach((t) => { const label = t.label || u.pad(t.no); this.pax.set(t.no, { no: t.no, name: t.name, label, color: u.colorFor(t.name), ini: label, alive: true, actor: null, slot: null, row: null }); });
      this.slots = new Array(SLOTS.length).fill(null);
      this.out = 0; this.beatIdx = 0; this.logN = 0;
      this.buildRoute();
      this.buildManifest();
      this.el.ev.innerHTML = ''; this.el.an.innerHTML = '';
      // de som ikke betalte står igjen på kaia i Sandnessjøen
      const XS = [-320, -362, -404, -446, 318, 360, 402];
      this.docked = (d.leftBehind || []).slice(0, XS.length).map((p, i) => {
        const a = sc.spawn({ color: u.colorFor(p.name), ini: p.num ? String(p.num) : u.initials(p.name) }, 'fig', 'mark', XS[i], -12, this.startMark);
        return a;
      });
    }
    leaveDocked() {
      const left = this.draw.leftBehind || [];
      if (!left.length) return;
      const shouts = ['VENT!', 'HALLO?!', 'Jeg skulle vippse!', 'Kom tilbake!', 'NEI!', 'Seriøst?'];
      this.docked.forEach((a, i) => {
        const y0 = a.y;
        Eng.tween(2600, (p) => { a.y = y0 - Math.abs(Math.sin(p * Math.PI * 7 + i)) * 9; a.apply(); }, E.linear);
        if (i < 4) Eng.wait(150 + i * 260).then(() => { const s = this.sc.toScreen(a); this.pop(shouts[i % shouts.length], s.x, s.y - 74, { size: i ? 24 : 30, color: '#f6bd47', rot: i % 2 ? 6 : -6, life: 1300 }); });
      });
    }

    /* ---------- Rute ---------- */
    buildRoute() {
      this.el.route.innerHTML = '<div class="route-line"><div class="route-fill"></div></div>'
        + Ev.ROUTE.map((s) => `<div class="route-stop${s.type === 'marker' ? ' is-marker' : ''}" data-at="${s.at}" style="left:${s.at * 100}%"><i></i><span>${u.esc(s.name)}</span></div>`).join('')
        + '<svg class="route-boat" viewBox="0 0 34 20" aria-hidden="true"><path d="M9 11.6 L9 7 Q9 6 10 6 L21 6 Q24 6 26 8.5 L28 11.5 Z" fill="currentColor"/><path d="M2 12 L28 11.5 Q32 12 33 14 L30 18 L4 18 Z" fill="currentColor"/><path d="M2 14.5 L33 14 L32.4 15.4 L2 15.8 Z" fill="#ee4a2f"/></svg>';
      this.routeFill = u.$('.route-fill', this.el.route);
      this.routeBoat = u.$('.route-boat', this.el.route);
      this.routeStops = u.$$('.route-stop', this.el.route);
      this._rp = -1;
      this.tick();
    }
    tick() {
      if (!this.routeFill) return;
      const p = u.clamp(this.sc.travel / this.L, 0, 1);
      if (Math.abs(p - this._rp) < 0.0004) return;
      this._rp = p;
      const pc = (p * 100).toFixed(2) + '%';
      this.routeFill.style.width = pc; this.routeBoat.style.left = pc;
      this.routeStops.forEach((s) => s.classList.toggle('is-passed', p >= +s.dataset.at - 0.003));
    }
    routeMark() {
      const m = document.createElement('div');
      m.className = 'route-mark';
      m.style.left = (u.clamp(this.sc.travel / this.L, 0, 1) * 100).toFixed(2) + '%';
      this.el.route.appendChild(m);
    }

    /* ---------- Passasjerliste og logg ---------- */
    buildManifest() {
      this.el.pax.innerHTML = this.draw.tickets.map((t) => {
        const p = this.pax.get(t.no);
        return `<li class="px" data-no="${t.no}"><span class="px-no">${u.esc(p.label)}</span><span class="px-dot" style="background:${p.color}"></span><span class="px-name">${u.esc(t.name)}</span><span class="px-st"></span></li>`;
      }).join('');
      u.$$('.px', this.el.pax).forEach((row) => { this.pax.get(+row.dataset.no).row = row; });
      this.el.log.innerHTML = '';
      this.updateCounts();
    }
    updateCounts() {
      const T = this.draw.tickets.length;
      this.el.paxCount.textContent = `${T - this.out}/${T}`;
      this.el.logCount.textContent = String(this.logN);
    }
    scrollRow(row) {
      const body = this.el.sideBody;
      if (this.el.pax.hidden) return;
      const top = row.offsetTop, h = row.offsetHeight;
      if (top < body.scrollTop || top + h > body.scrollTop + body.clientHeight) body.scrollTo({ top: Math.max(0, top - body.clientHeight / 2), behavior: 'smooth' });
    }
    eliminate(p, b) {
      if (!p.alive) return;
      p.alive = false;
      if (p.slot != null) { this.slots[p.slot] = null; p.slot = null; }
      p.actor = null;
      this.out++;
      const ev = Ev.EVENTS[b.ev];
      p.row.classList.add('is-out');
      p.row.classList.remove('is-hit'); void p.row.offsetWidth; p.row.classList.add('is-hit');
      p.row.querySelector('.px-st').textContent = ev.icon;
      p.row.title = ev.name;
      this.scrollRow(p.row);
      this.updateCounts();
    }
    log(b, i) {
      const ev = Ev.EVENTS[b.ev];
      const li = document.createElement('li');
      li.className = 'lg';
      li.innerHTML = `<span>${ev.icon}</span><div><small>${i + 1}. ${u.esc(Ev.PLACE_LABEL[b.place] || '')}</small>${Ev.eventText(b, this.draw.tickets, true)}</div>`;
      const first = this.el.log.querySelector('.side-empty');
      if (first) first.remove();
      this.el.log.prepend(li);
      this.logN++;
      this.updateCounts();
    }
    logDock(left) {
      const li = document.createElement('li');
      li.className = 'lg';
      li.innerHTML = `<span>🧳</span><div><small>Sandnessjøen · før avgang</small>Ble igjen på kaia (ikke betalt): ${u.joinNames(left.map((p) => `<b>${u.esc(p.name)}</b>`))}</div>`;
      const first = this.el.log.querySelector('.side-empty');
      if (first) first.remove();
      this.el.log.prepend(li);
    }
    markWinner(p, rank) {
      p.row.classList.add('is-win');
      p.row.querySelector('.px-st').textContent = ['🥇', '🥈', '🥉'][rank - 1] || '🏁';
      this.scrollRow(p.row);
    }

    /* ---------- Kort og annonseringer ---------- */
    announce(html, sub, ms = 2300) {
      const el = document.createElement('div');
      el.className = 'an';
      el.innerHTML = (sub ? `<small>${u.esc(sub)}</small>` : '') + html;
      this.el.an.innerHTML = '';
      this.el.an.appendChild(el);
      clearTimeout(this.anT);
      this.anT = setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 520); }, ms / Math.max(1, Eng.speed * 0.75));
    }
    infoCard(icon, title, html, meta = '') {
      this.el.ev.innerHTML = `<div class="evcard is-info"><div class="ec-ico">${icon}</div><div><div class="ec-meta">${meta}</div><h3 class="ec-title">${title}</h3><p class="ec-text">${html}</p></div></div>`;
    }
    card(b, i, reveal) {
      const ev = Ev.EVENTS[b.ev];
      const last = i === this.draw.beats.length - 1;
      if (!reveal) {
        this.el.ev.innerHTML = `<div class="evcard${last ? ' is-final' : ''}" style="--ec:${ev.ec}"><div class="ec-ico">${ev.icon}</div><div>`
          + `<div class="ec-meta">${last ? 'Siste offer før Bodø' : `Hendelse ${i + 1} av ${this.draw.beats.length}`} · ${u.esc(Ev.PLACE_LABEL[b.place] || '')}${ev.folk ? ' · <span class="folk">Folkets innslag</span>' : ''}</div>`
          + `<h3 class="ec-title">${u.esc(ev.title)}</h3><p class="ec-text"><span class="dots">• • •</span></p></div></div>`;
      } else {
        const p = u.$('.ec-text', this.el.ev);
        if (p) { p.innerHTML = Ev.eventText(b, this.draw.tickets, true); p.classList.add('reveal'); }
      }
    }

    /* ---------- Folk på dekk ---------- */
    freeSlot(pref) {
      let i = this.slots.findIndex((no, k) => no == null && SLOTS[k].d === pref);
      if (i < 0) i = this.slots.findIndex((no) => no == null);
      return i;
    }
    spawnInSlot(p, i, emerge) {
      const s = SLOTS[i];
      p.slot = i; this.slots[i] = p.no;
      let a;
      if (emerge && s.d === 'aft') {
        a = this.sc.spawn(p, 'fig', 'deck', DOOR.x, DOOR.y);
        a.o = 0; a.apply();
        p.actor = a;
        return U().tw(a, { o: 1 }, 180).then(() => U().walk(a, s.x, Math.max(160, Math.abs(s.x - DOOR.x) * 7), s.y));
      }
      a = this.sc.spawn(p, 'fig', 'deck', s.x, s.y - 18);
      a.o = 0; a.apply();
      p.actor = a;
      return U().tw(a, { o: 1, y: s.y }, 360, E.outBack);
    }
    async bringOut(victims, evId) {
      const pref = evId === 'trappa' ? 'sun' : 'aft';
      const vic = new Set(victims.map((v) => v.no));
      const waits = [];
      for (const v of victims) {
        if (v.actor && v.slot != null) continue;
        let i = this.freeSlot(pref);
        if (i < 0) {
          i = this.slots.findIndex((no, k) => no != null && !vic.has(no) && SLOTS[k].d === pref);
          if (i < 0) i = this.slots.findIndex((no) => no != null && !vic.has(no));
          if (i < 0) i = 0;
          const o = this.pax.get(this.slots[i]);
          if (o) { const oa = o.actor; o.actor = null; o.slot = null; if (oa) U().fadeOut(oa, 220); }
          this.slots[i] = null;
        }
        waits.push(this.spawnInSlot(v, i, true));
      }
      await Promise.all(waits);
      victims.forEach((v) => { if (v.slot != null) { this.slots[v.slot] = null; v.slot = null; } });
      return victims.map((v) => v.actor);
    }
    refill() {
      const waiting = Array.from(this.pax.values()).filter((p) => p.alive && p.slot == null && !p.actor);
      const order = u.shuffle(waiting, (n) => Math.floor(Math.random() * n));
      for (let i = 0; i < SLOTS.length && order.length; i++) if (this.slots[i] == null) this.spawnInSlot(order.shift(), i, true);
    }
    board() {
      const all = Array.from(this.pax.values());
      const seen = new Set();
      const mixed = u.shuffle(all, (n) => Math.floor(Math.random() * n));
      const first = mixed.filter((p) => { const k = u.normName(p.name); if (seen.has(k)) return false; seen.add(k); return true; });
      const pick = first.concat(mixed.filter((p) => !first.includes(p))).slice(0, SLOTS.length);
      const order = [0, 4, 1, 5, 2, 6, 3, 7, 8, 9];
      return Promise.all(pick.map((p, k) => Eng.wait(k * 110).then(() => { S().pop(); return this.spawnInSlot(p, order[k], false); })));
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
      Eng.speed = this.userSpeed;
      this.stage.classList.remove('is-running');
      S().sea(false);
      if (!silent) this.idle();
    }
    async play(token) {
      const d = this.draw, sc = this.sc;
      const chk = () => { if (token !== this.token) throw ABORT; };
      const w = async (p) => { await p; chk(); };
      this.setup();
      this.running = true; this.skipping = false;
      Eng.speed = this.userSpeed;
      this.stage.classList.add('is-running');
      this.hideOverlay(this.el.start); this.hideOverlay(this.el.end);
      S().unlock(); S().sea(true);
      const T = d.tickets.length, W = d.winners.length;
      this.announce('Ombord&shy;stigning', 'Sandnessjøen · kai 1', 2400);
      this.infoCard('🎟️', 'Ombordstigning', `${T} lodd går om bord på MS Fredag. Bare <b>${u.numberWord(W)}</b> kommer frem til Bodø.`, this.mode === 'live' ? 'Trekningen er låst i skipsloggen' : (this.mode === 'demo' ? 'Prøvetur · lagres ikke' : 'Reprise'));
      await w(this.board());
      await w(Eng.wait(1300));
      const left = d.leftBehind || [];
      if (left.length) {
        const names = left.map((p) => `<b>${u.esc(p.name)}</b>`);
        this.infoCard('🧳', 'Igjen på kaia', `${u.joinNames(names)} har ikke betalt. Båten venter ikke.`, `${left.length} ${left.length === 1 ? 'passasjer' : 'passasjerer'} uten bekreftet betaling`);
        this.logDock(left);
        await w(Eng.wait(1600));
      }
      S().horn(1.3);
      this.announce('Avgang!', 'Hold dæ fast', 1800);
      this.leaveDocked();
      sc.targetV = CRUISE;

      const beats = d.beats;
      const wps = beats.map((b, i) => ({ kind: 'beat', at: b.at, b, i }));
      ['nesna', 'ornes'].forEach((pl) => { if (!beats.some((b) => b.place === pl)) wps.push({ kind: 'pass', at: Ev.AT[pl], place: pl }); });
      wps.push({ kind: 'polar', at: Ev.AT.polar });
      wps.sort((a, b) => a.at - b.at || (a.kind === 'beat') - (b.kind === 'beat'));
      let docked = null;
      for (const wp of wps) {
        if (this.skipping) break;
        const x = wp.at * this.L;
        const here = wp.kind === 'beat' && Ev.PORT_NAME[wp.b.place] ? wp.b.place : null;
        if (docked && here !== docked) { S().toot(); sc.targetV = CRUISE; docked = null; await w(Eng.wait(500)); }
        if (wp.kind === 'pass') { await w(sc.reach(x - 120)); this.announce(`Passerer ${u.esc(Ev.PORT_NAME[wp.place])}`, 'Ingen skal av her. Forhåpentligvis.', 1900); continue; }
        if (wp.kind === 'polar') { await w(sc.reach(x - 140)); this.announce('Polar&shy;sirkelen', '66°33′N · velkommen til Nord-Norge', 2100); S().ding(); continue; }
        const b = wp.b;
        if (here) {
          if (docked !== here) {
            await w(sc.reach(x - 700));
            this.announce(`Neste stopp: <em>${u.esc(Ev.PORT_NAME[here])}</em>`, 'Anløp', 2200);
            S().ding();
            await w(sc.dock(x));
            docked = here;
          }
        } else {
          if (wp.i === beats.length - 1 && beats.length > 1) {
            const alive = T - this.out;
            this.announce('Siste etappe', `${alive} om bord · bare ${W} kommer frem`, 2400);
            S().roll(2.2);
            sc.targetV = CRUISE * 0.55;
            await w(Eng.wait(2300));
            sc.targetV = CRUISE;
          }
          await w(sc.reach(x));
        }
        await w(this.playBeat(b, wp.i, !here));
        this.beatIdx = wp.i + 1;
      }
      if (this.skipping) this.fastForward();
      await this.arrive(w);
    }
    async playBeat(b, i, atSea) {
      const ev = Ev.EVENTS[b.ev];
      const victims = b.v.map((no) => this.pax.get(no)).filter((p) => p && p.alive);
      if (!victims.length) return;
      const last = i === this.draw.beats.length - 1;
      this.card(b, i, false);
      const actors = await this.bringOut(victims, b.ev);
      if (atSea) this.sc.dock(this.sc.travel + 230); // «mann over bord» – båten bremser opp
      const anim = (FL.Anims[ev.anim] || FL.Anims.overboard)(this, actors, b);
      await Eng.wait(last ? 1000 : 700);
      this.card(b, i, true);
      try { await anim; } catch (e) { console.error(e); actors.forEach((a) => a && a.remove()); }
      victims.forEach((p) => this.eliminate(p, b));
      this.routeMark();
      this.log(b, i);
      await Eng.wait(last ? 1700 : 1150);
      if (atSea) { this.sc.stopAt = null; this.sc.dockRes = null; this.sc.targetV = CRUISE; }
      this.refill();
    }
    fastForward() {
      const beats = this.draw.beats;
      for (let i = this.beatIdx; i < beats.length; i++) {
        const b = beats[i];
        b.v.forEach((no) => { const p = this.pax.get(no); if (p && p.alive) { if (p.actor) p.actor.remove(); this.eliminate(p, b); } });
        this.log(b, i);
      }
      this.beatIdx = beats.length;
      const sc = this.sc;
      sc.stopAt = null; sc.dockRes = null;
      sc.travel = Math.max(sc.travel, this.L - 1700);
      sc.v = CRUISE; sc.targetV = CRUISE;
      this.el.ev.innerHTML = '';
      this.refill();
      this.skipping = false;
      Eng.speed = this.userSpeed;
    }
    async arrive(w) {
      const sc = this.sc, d = this.draw;
      if (sc.targetV < CRUISE * 0.5) { S().toot(); sc.targetV = CRUISE; }
      await w(sc.reach(this.L - 1500));
      this.announce('Neste stopp: <em>Bodø</em>', 'Innseilingen', 2400);
      S().ding();
      await w(sc.dock(this.L));
      S().horn(1.2);
      const W = d.winners.length;
      this.infoCard('🏁', 'Ankommet Bodø', W ? `${u.numberWord(W).replace(/^./, (c) => c.toUpperCase())} passasjer${W === 1 ? '' : 'er'} kom seg helskinnet frem. Hvem velger premie først?` : 'Ingen kom frem. Havet vant.', 'Bodø havn');
      this.announce('Velkommen til <em>Bodø!</em>', 'Endestasjon', 2600);
      await w(Eng.tween(1400, (p) => { sc.bx = FL.Engine.BOAT_X + 260 * p; }, E.inOut));
      await w(Eng.wait(700));
      const order = d.winners.map((no, k) => ({ p: this.pax.get(no), rank: k + 1 })).reverse();
      const gap = Math.min(100, 470 / Math.max(1, W));
      for (const { p, rank } of order) {
        if (!p.actor) { let i = this.freeSlot('aft'); if (i < 0) i = 0; await w(this.spawnInSlot(p, i, true)); }
        const a = p.actor;
        if (p.slot != null) { this.slots[p.slot] = null; p.slot = null; }
        this.announce(`${rank}. plass`, '', 1500);
        await w(U().toAftDeck(a));
        await w(U().walk(a, -276, Math.max(160, Math.abs(a.x + 276) * 7)));
        sc.move(a, 'mark', this.bodo);
        await w(U().hop(a, a.x - 26, -12, 16, 240));
        await w(U().walk(a, -330 - (rank - 1) * gap, 520, -12));
        a.tag(shortName(p.name), `${rank}. PLASS`, (rank % 2 === 0) ? 40 : 0);
        this.markWinner(p, rank);
        this.el.ev.innerHTML = `<div class="evcard is-final" style="--ec:#ffe08a"><div class="ec-ico">${['🥇', '🥈', '🥉'][rank - 1] || '🏁'}</div><div><div class="ec-meta">${rank}. plass · lodd ${u.esc(p.label)}</div><h3 class="ec-title">${u.esc(p.name)}</h3><p class="ec-text">${rank === 1 ? 'Velger premie først. Premien er, som kjent, urelatert.' : 'Kom seg helskinnet til Bodø.'}</p></div></div>`;
        S().pop();
        if (rank === 1) { S().fanfare(); this.fireworks(3); this.fx.confetti(200); } else S().ding();
        await w(Eng.wait(rank === 1 ? 900 : 1500));
      }
      this.fireworks(6);
      await w(Eng.wait(2400));
      this.finish();
    }
    fireworks(n) {
      for (let i = 0; i < n; i++) setTimeout(() => { this.fx.firework(700 + Math.random() * 760, 110 + Math.random() * 220); S().boom(); }, i * 380 + Math.random() * 200);
    }
    finish() {
      this.running = false;
      this.stage.classList.remove('is-running');
      S().sea(false);
      this.showEnd();
    }
    skip() {
      if (!this.running || this.skipping || this.beatIdx >= this.draw.beats.length) return;
      this.skipping = true;
      Eng.speed = 8;
      S().whoosh();
    }
    setSpeed(n) {
      this.userSpeed = n;
      if (!this.skipping) Eng.speed = n;
      u.$$('#speedCtl button', this.stage).forEach((b) => b.classList.toggle('is-on', +b.dataset.speed === n));
    }

    /* ---------- Overlays ---------- */
    hideOverlay(el) { if (el.hidden) return; el.classList.add('fade-out'); setTimeout(() => { el.hidden = true; el.classList.remove('fade-out'); }, 480); }
    renderStart() {
      if (this.running) return;
      const t = Store.totals();
      const st = Store.settings;
      const el = this.el.start;
      const W = st.winners;
      let html;
      if (!t.tickets) {
        html = `<div class="ov-card"><p class="ov-kicker">Kai 1 · Sandnessjøen</p><h3 class="ov-title">Ingen har <em>betalt</em></h3>
          <p class="ov-sub">${t.people ? 'Bekreft betaling i påmeldingen – bare de som har betalt får gå om bord.' : 'Legg inn passasjerer og bekreft betaling i påmeldingen først.'}</p>
          <div class="ov-btns"><a class="btn btn-primary" href="pamelding.html">Til påmeldingen</a><button class="btn btn-ghost" type="button" data-act="demo">⛴ Prøvetur</button></div>
          <p class="ov-fine">Prøveturer lagres ikke i skipsloggen.</p></div>`;
      } else {
        const few = t.tickets <= W;
        const left = Store.leftBehind();
        const leftTxt = left.length ? `<p class="ov-warn">🧳 ${u.esc(u.joinNames(left.slice(0, 6).map((p) => p.name)))}${left.length > 6 ? ` og ${left.length - 6} til` : ''} har ikke betalt og blir igjen på kaia.</p>` : '';
        html = `<div class="ov-card"><p class="ov-kicker">Kai 1 · Sandnessjøen · ${u.esc(u.dfLong.format(new Date()))}</p><h3 class="ov-title">Klar for <em>avgang</em></h3>
          <p class="ov-sub">${few ? 'Færre lodd enn premier – alle kommer frem. Men turen tar vi likevel.' : `${t.tickets} lodd går om bord. Bare <b>${u.numberWord(Math.min(W, t.paidPeople))}</b> kommer seg helskinnet til Bodø.`}</p>
          <div class="ov-facts"><span><b>${t.paidPeople}</b> betalt</span><span><b>${t.tickets}</b> lodd</span><span><b>${u.kr(t.pot)}</b> i potten</span></div>
          <div class="ov-btns"><button class="btn btn-primary" type="button" data-act="go">⛴ Gå om bord</button><button class="btn btn-ghost" type="button" data-act="demo">Prøvetur først</button></div>
          ${leftTxt}
          <p class="ov-fine">Resultatet trekkes og låses i skipsloggen i det båten legger fra kai.</p></div>`;
      }
      el.innerHTML = html;
      el.hidden = false;
    }
    showEnd() {
      const d = this.draw;
      const el = this.el.end;
      const ws = d.winners.map((no, k) => ({ p: this.pax.get(no), rank: k + 1 }));
      const podOrder = ws.length >= 3 ? [ws[1], ws[0], ws[2]].concat(ws.slice(3)) : (ws.length === 2 ? [ws[1], ws[0]] : ws);
      const pods = podOrder.map(({ p, rank }) => `<div class="pod p${rank <= 3 ? rank : 'n'}"><div class="pod-av" style="background:${p.color}">${u.esc(p.ini)}</div><div class="pod-name">${u.esc(p.name)}</div><div class="pod-tix">lodd ${u.esc(p.label)}</div><div class="pod-block">${rank}</div></div>`).join('');
      const badge = this.mode === 'demo' ? '<span class="ov-badge">Prøvetur</span>' : (this.mode === 'replay' ? '<span class="ov-badge">Reprise</span>' : '');
      el.innerHTML = `<div class="ov-card">${badge}<p class="ov-kicker">Ankommet Bodø · ${u.esc(u.dfLong.format(new Date(d.date)))}</p>
        <h3 class="ov-title">Gratulerer, <em>helter!</em></h3>
        <div class="podium">${pods}</div>
        <p class="ov-sub">Vinnerne velger premie i rekkefølge. Premiene er, som kjent, urelatert.</p>
        <div class="ov-btns">${this.mode === 'live' ? '<a class="btn btn-primary" href="historikk.html">Se skipsloggen</a>' : '<button class="btn btn-primary" type="button" data-act="close">Tilbake til kaia</button>'}
        <button class="btn btn-ghost" type="button" data-act="replay">Se reprise</button><button class="btn btn-ghost" type="button" data-act="hide">Se havna</button></div>
        <p class="ov-fine">${this.mode === 'live' ? 'Lagret i skipsloggen.' : (this.mode === 'demo' ? 'Prøveturer lagres ikke.' : 'Reprise av en tidligere trekning.')}</p></div>`;
      el.hidden = false;
    }

    /* ---------- Knapper ---------- */
    bindControls() {
      const st = this.stage;
      u.$('#speedCtl', st).addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) this.setSpeed(+b.dataset.speed); });
      u.$('#skipBtn', st).addEventListener('click', () => this.skip());
      const snd = u.$('#soundBtn', st);
      const syncSnd = () => { const on = Store.settings.sound; snd.textContent = on ? '🔊' : '🔇'; snd.classList.toggle('is-off', !on); FL.Audio.setEnabled(on); };
      snd.addEventListener('click', () => { Store.setSettings({ sound: !Store.settings.sound }); syncSnd(); if (Store.settings.sound && this.running) { S().unlock(); S().sea(true); } });
      syncSnd();
      u.$('#fsBtn', st).addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (st.requestFullscreen) st.requestFullscreen().catch(() => u.toast('Fullskjerm er ikke tilgjengelig her.'));
      });
      document.addEventListener('fullscreenchange', () => setTimeout(() => this.fx.resize(), 60));
      u.$('.side-tabs', st).addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        u.$$('.side-tabs button', st).forEach((x) => x.classList.toggle('is-on', x === b));
        this.el.pax.hidden = b.dataset.side !== 'pax';
        this.el.log.hidden = b.dataset.side !== 'log';
        this.el.sideBody.scrollTop = 0;
      });
      const onAct = (e) => {
        const b = e.target.closest('[data-act]'); if (!b) return;
        const act = b.dataset.act;
        if (act === 'go') this.startLive();
        else if (act === 'demo') this.startDemo();
        else if (act === 'replay') this.start(this.draw, this.mode === 'live' ? 'replay' : this.mode);
        else if (act === 'hide') this.hideOverlay(this.el.end);
        else if (act === 'close' || act === 'newround') { this.hideOverlay(this.el.end); this.idle(); }
      };
      this.el.start.addEventListener('click', onAct);
      this.el.end.addEventListener('click', onAct);
    }
    startLive() {
      const people = Store.participants();
      if (!people.length) { u.toast('Ingen har betalt ennå – bekreft betaling i påmeldingen.'); return; }
      S().unlock();
      const draw = Ev.createDraw(people, Store.settings, { game: 'hurtigbat', leftBehind: Store.leftBehind() });
      this.start(draw, 'live'); // låses i loggen med en gang, før animasjonen viser resultatet
      Store.addRecord(draw);
      Store.resetPaid(); // neste fredag starter alle som «ikke betalt» igjen
    }
    startDemo() {
      S().unlock();
      const max = Store.settings.maxPerPerson;
      const nums = u.shuffle(Array.from({ length: 30 }, (_, i) => i + 1)).filter((n) => n % 10);
      const people = u.shuffle(DEMO).slice(0, 14 + u.randInt(4)).map((n, i) => ({ name: n, num: nums[i], tickets: 1 + u.randInt(max) }));
      const left = people.splice(0, 2 + u.randInt(3)).map((p) => ({ name: p.name, num: p.num }));
      this.start(Ev.createDraw(people, Store.settings, { game: 'hurtigbat', demo: true, leftBehind: left }), 'demo');
    }
    replay(rec) { S().unlock(); this.start(rec, 'replay'); }
  }

  FL.Voyage = Voyage;
})();
