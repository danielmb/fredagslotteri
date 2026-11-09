/* Fredagslotteriet – spillmotor: klokke, scene, aktører og reisen til Bodø */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u, Ev = FL.Events;
  const NS = 'http://www.w3.org/2000/svg';
  const VW = 1600, HORIZON = 520, WATER = 640, BOAT_X = 600, PORT_Y = WATER - 44;
  const CRUISE = 300, DECEL = 170;
  const ABORT = { abort: true };

  /* ---------- Klokke og tweens (følger farten 1×/2×/4×) ---------- */
  const E = {
    linear: (t) => t,
    in: (t) => t * t * t,
    out: (t) => 1 - Math.pow(1 - t, 3),
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outBack: (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  };
  const Eng = {
    speed: 1, t: 0, waiters: [], tweens: [],
    wait(ms) { return new Promise((res) => this.waiters.push({ at: this.t + ms, res })); },
    tween(dur, fn, ease = E.inOut) { return new Promise((res) => { fn(0); this.tweens.push({ t: 0, dur: Math.max(1, dur), fn, ease, res }); }); },
    step(dt) {
      this.t += dt;
      if (this.tweens.length) {
        const list = this.tweens; this.tweens = [];
        for (const tw of list) {
          tw.t += dt;
          const p = Math.min(1, tw.t / tw.dur);
          try { tw.fn(tw.ease(p)); } catch (e) { console.error(e); }
          if (p >= 1) tw.res(); else this.tweens.push(tw);
        }
      }
      if (this.waiters.length) this.waiters = this.waiters.filter((w) => { if (this.t >= w.at) { w.res(); return false; } return true; });
    },
  };
  const svgEl = (tag, attrs = {}, html = '') => { const el = document.createElementNS(NS, tag); Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k])); if (html) el.innerHTML = html; return el; };

  /* ---------- Aktør (en passasjer, kokk, ørn …) ---------- */
  class Actor {
    constructor(scene, p, art) {
      this.sc = scene; this.p = p;
      this.el = svgEl('g', { class: 'actor' });
      this.inner = svgEl('g');
      this.el.appendChild(this.inner);
      this.x = 0; this.y = 0; this.r = 0; this.s = 1; this.sx = 1; this.o = 1;
      this.layer = 'deck'; this.mark = null;
      this.setArt(art || 'fig');
    }
    setArt(kind) {
      this.kind = kind;
      if (kind === 'fig') this.inner.innerHTML = FL.Art.figure(this.p);
      else if (kind === 'swim') this.inner.innerHTML = FL.Art.swimmer(this.p);
      else this.inner.innerHTML = kind; // rå markup
    }
    apply() {
      this.el.setAttribute('transform', `translate(${this.x.toFixed(1)} ${this.y.toFixed(1)}) rotate(${this.r.toFixed(2)} 0 -28) scale(${(this.s * this.sx).toFixed(3)} ${this.s.toFixed(3)})`);
      this.el.style.opacity = this.o;
      return this;
    }
    addClass(c) { this.el.classList.add(c); return this; }
    tag(text, sub, dy) { const t = svgEl('g', { class: 'tag' }, FL.Art.nameTag(text, sub, dy)); this.el.appendChild(t); return t; }
    remove() { this.el.remove(); this.dead = true; }
  }

  /* ---------- Scene ---------- */
  class Scene {
    constructor(svg, fx) {
      this.svg = svg; this.fx = fx;
      this.travel = 0; this.v = 0; this.targetV = 0; this.stopAt = null; this.dockRes = null; this.reachers = [];
      this.time = 0; this.bobY = 0; this.bobR = 0;
      this.bx = BOAT_X; // båtens skjermposisjon (kan panoreres i finalen)
      this.layers = []; this.marks = [];
      this.build();
      fx.worldOffset = () => this.bx - this.travel;
    }
    build() {
      const A = FL.Art;
      this.svg.innerHTML = `
      <defs>
        <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16395a"/><stop offset=".22" stop-color="#0c2742"/><stop offset="1" stop-color="#03101e"/></linearGradient>
        <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e29a7c" stop-opacity=".42"/><stop offset="1" stop-color="#e29a7c" stop-opacity="0"/></linearGradient>
        <linearGradient id="frontSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b2742" stop-opacity=".96"/><stop offset="1" stop-color="#020b16"/></linearGradient>
        <radialGradient id="lampGlow"><stop offset="0" stop-color="#ffd68c" stop-opacity=".6"/><stop offset="1" stop-color="#ffd68c" stop-opacity="0"/></radialGradient>
        <radialGradient id="auroraRefl"><stop offset="0" stop-color="#5ef2b5" stop-opacity=".22"/><stop offset="1" stop-color="#5ef2b5" stop-opacity="0"/></radialGradient>
        <radialGradient id="spot" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#fff6d8" stop-opacity=".55"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></radialGradient>
      </defs>
      <g>${A.stars(11, 150)}</g>
      <g data-f="0.035">${A.mountainLayer(101, { base: 528, amp: 210, step: 14, top: '#8796c4', mid: 0.32, color: '#2c3a6a', bottom: '#1e2b55', rim: '#c9d6ff', rimO: 0.35, sharp: 1.7 })}</g>
      <g data-f="0.11">${A.mountainLayer(202, { base: 540, amp: 130, step: 18, top: '#4a5b8e', mid: 0.4, color: '#17244a', bottom: '#111d3d', sharp: 1.35, jag: 0.5 })}</g>
      <rect x="0" y="${HORIZON}" width="${VW}" height="${900 - HORIZON}" fill="url(#seaGrad)"/>
      <rect x="0" y="${HORIZON}" width="${VW}" height="54" fill="url(#glowGrad)"/>
      <ellipse cx="430" cy="585" rx="360" ry="34" fill="url(#auroraRefl)"/><ellipse cx="1130" cy="600" rx="300" ry="26" fill="url(#auroraRefl)"/>
      <g data-f="0.26">${A.islands(303, { base: 566, count: 5 })}</g>
      <g data-f="0.5" data-drift="6">${A.waveLines(404, { y0: 530, y1: 632, rows: 12, alpha: 0.85 })}</g>
      <g id="sFar"></g>
      <g id="sBack"></g>
      <g id="sNear"></g>
      <g id="sBoat"><g id="sWake">${A.boatWake()}</g>${A.boatBack()}<g id="sDeck"></g><g>${A.boatRails()}</g></g>
      <g data-f="1" data-drift="10">${A.frontWave(VW, WATER - 2)}</g>
      <g data-f="1" data-drift="16">${A.waveLines(505, { y0: 656, y1: 890, rows: 13 })}</g>
      <g id="sWorld"></g>
      <g id="sSky"></g>`;
      this.layers = Array.from(this.svg.querySelectorAll('[data-f]')).map((el) => ({ el, f: +el.dataset.f, drift: +(el.dataset.drift || 0), w: VW }));
      const q = (id) => this.svg.querySelector('#' + id);
      this.el = { far: q('sFar'), back: q('sBack'), near: q('sNear'), boat: q('sBoat'), wake: q('sWake'), deck: q('sDeck'), world: q('sWorld'), sky: q('sSky') };
    }
    clearDynamic() {
      ['far', 'back', 'near', 'deck', 'world', 'sky'].forEach((k) => { this.el[k].innerHTML = ''; });
      this.marks = []; this.reachers = []; this.stopAt = null; this.dockRes = null;
      this.fx.clear();
    }
    addMark(markup, x, f, y, w0 = 700, w1 = 700) {
      const el = svgEl('g', {}, markup);
      this.el.back.appendChild(el);
      const m = { el, x, f, y, w0, w1, vis: true, sx: 0 };
      this.marks.push(m);
      this.placeMark(m);
      return m;
    }
    placeMark(m) {
      m.sx = this.bx + (m.x - this.travel) * m.f;
      const vis = m.sx > -m.w1 - 60 && m.sx < VW + m.w0 + 60;
      if (vis !== m.vis) { m.el.style.display = vis ? '' : 'none'; m.vis = vis; }
      if (vis) m.el.setAttribute('transform', `translate(${m.sx.toFixed(1)} ${m.y})`);
    }
    reach(x) { if (this.travel >= x) return Promise.resolve(); return new Promise((res) => this.reachers.push({ x, res })); }
    dock(x) {
      if (Math.abs(this.travel - x) < 1 && this.v < 1) return Promise.resolve();
      this.stopAt = x; this.targetV = Math.max(this.targetV, CRUISE * 0.6);
      return new Promise((res) => { this.dockRes = res; });
    }
    update(dt) {
      const s = dt / 1000;
      this.time += s;
      if (this.stopAt != null) {
        const rem = this.stopAt - this.travel;
        const vb = Math.sqrt(2 * DECEL * Math.max(0, rem));
        if (this.v > vb) this.v = vb; else this.v += (Math.min(this.targetV, vb) - this.v) * (1 - Math.exp(-s * 1.4));
        if (rem <= 0.8 || (this.v < 2 && rem < 6)) {
          this.travel = this.stopAt; this.v = 0; this.targetV = 0; this.stopAt = null;
          const r = this.dockRes; this.dockRes = null; if (r) r();
        }
      } else {
        this.v += (this.targetV - this.v) * (1 - Math.exp(-s * 1.3));
      }
      this.travel += this.v * s;
      if (this.reachers.length) this.reachers = this.reachers.filter((r) => { if (this.travel >= r.x) { r.res(); return false; } return true; });

      const sea = Math.min(1, this.v / CRUISE);
      this.bobY = Math.sin(this.time * 1.7) * (2 + sea * 1.2) + Math.sin(this.time * 0.63) * 1.4;
      this.bobR = Math.sin(this.time * 1.1 + 0.6) * (0.5 + sea * 0.4) + (this.v - this.targetV > 40 ? -0.3 : 0);
      this.el.boat.setAttribute('transform', `translate(${this.bx.toFixed(1)} ${(WATER + this.bobY).toFixed(2)}) rotate(${this.bobR.toFixed(3)})`);
      this.el.wake.style.opacity = (0.05 + sea * 0.95).toFixed(2);
      for (const L of this.layers) {
        const off = -((this.travel * L.f + this.time * L.drift * 10) % L.w);
        L.el.setAttribute('transform', `translate(${off.toFixed(1)} 0)`);
      }
      this.el.world.setAttribute('transform', `translate(${(this.bx - this.travel).toFixed(1)} 0)`);
      for (const m of this.marks) this.placeMark(m);
    }
    /* koordinater: lag → skjerm (viewBox) og tilbake */
    toScreen(a) {
      if (a.layer === 'deck') {
        const rad = (this.bobR * Math.PI) / 180, c = Math.cos(rad), sn = Math.sin(rad);
        return { x: this.bx + a.x * c - a.y * sn, y: WATER + this.bobY + a.x * sn + a.y * c };
      }
      if (a.layer === 'world') return { x: a.x + this.bx - this.travel, y: a.y };
      if (a.layer === 'mark') return { x: a.x + a.mark.sx, y: a.y + a.mark.y };
      return { x: a.x, y: a.y };
    }
    fromScreen(layer, p, mark) {
      if (layer === 'deck') {
        const rad = (-this.bobR * Math.PI) / 180, c = Math.cos(rad), sn = Math.sin(rad);
        const x = p.x - this.bx, y = p.y - WATER - this.bobY;
        return { x: x * c - y * sn, y: x * sn + y * c };
      }
      if (layer === 'world') return { x: p.x - this.bx + this.travel, y: p.y };
      if (layer === 'mark') return { x: p.x - mark.sx, y: p.y - mark.y };
      return { x: p.x, y: p.y };
    }
    layerEl(layer, mark) { return layer === 'mark' ? mark.el : this.el[layer]; }
    move(a, layer, mark) {
      const p = this.toScreen(a);
      const q = this.fromScreen(layer, p, mark);
      if (a.layer === 'deck' && layer !== 'deck') a.r += this.bobR;
      if (layer === 'deck' && a.layer !== 'deck') a.r -= this.bobR;
      a.layer = layer; a.mark = mark || null; a.x = q.x; a.y = q.y;
      this.layerEl(layer, mark).appendChild(a.el);
      return a.apply();
    }
    spawn(p, art, layer, x, y, mark) {
      const a = new Actor(this, p, art);
      a.layer = layer; a.mark = mark || null; a.x = x; a.y = y;
      this.layerEl(layer, mark).appendChild(a.el);
      return a.apply();
    }
  }

  /* ---------- Plasser på dekk ---------- */
  const SLOTS = [
    { x: -258, y: -58, d: 'aft' }, { x: -230, y: -58, d: 'aft' }, { x: -202, y: -58, d: 'aft' }, { x: -175, y: -58, d: 'aft' },
    { x: -136, y: -122, d: 'sun' }, { x: -106, y: -122, d: 'sun' }, { x: -76, y: -122, d: 'sun' }, { x: -46, y: -122, d: 'sun' }, { x: -16, y: -122, d: 'sun' }, { x: 12, y: -122, d: 'sun' },
  ];
  const DOOR = { x: -146, y: -59 };

  FL.Engine = { E, Eng, svgEl, Actor, Scene, SLOTS, DOOR, ABORT, VW, HORIZON, WATER, BOAT_X, PORT_Y, CRUISE };
})();
