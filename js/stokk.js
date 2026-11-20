/* Fredagslotteriet – premierekkefølgen trekkes én og én, med kort.
   Når de overlevende er fremme, legges kortene deres på bordet med navnet opp. De snus og stokkes synlig,
   så alle kan følge sitt eget, og ett kort trekkes og snus: 1. plass først. Vinneren går i land og henter premien,
   alt står stille til noen trykker «Trekk 2. plass», og de som er igjen stokkes på nytt.
   Rekkefølgen ble trukket kryptografisk idet spillet startet – kortet som trekkes, er alltid det trekningen sier. */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u;
  const { Eng, E } = FL.Engine;
  const S = () => FL.Audio;
  const ASPECT = 1.4; // kortets høyde delt på bredden
  const MEDAL = ['🥇', '🥈', '🥉'];
  const rnd = (n) => Math.floor(Math.random() * n); // bare til pynten: startrekkefølge, bytter og hvor kortet trekkes fra
  const cap = (s) => s.replace(/^./, (c) => c.toUpperCase());
  const shortName = (n) => { const p = u.cleanName(n).split(' '); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]; };

  /* Byttene i stokkingen: noen tilfeldige, og til slutt det som trengs for at kortet som skal trekkes, ligger på plass «at» */
  function swapPlan(shown, target, at) {
    const N = shown.length, arr = shown.slice(), out = [];
    const swap = (i, j) => { out.push([i, j]); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; };
    const n = N === 2 ? 4 : Math.min(2 + N * 2, 9);
    for (let k = 0; k < n; k++) { const i = rnd(N); let j = rnd(N - 1); if (j >= i) j++; swap(i, j); }
    const j = arr.indexOf(target);
    if (j !== at) swap(j, at);
    return out;
  }
  /* Lyset som hopper mellom kortene før ett trekkes: tilfeldige hopp som ender på «at» */
  function hopPlan(N, at) {
    const h = 7 + rnd(4), out = new Array(h);
    out[h - 1] = at;
    for (let i = h - 2; i >= 0; i--) { let s = rnd(N - 1); if (s >= out[i + 1]) s++; out[i] = s; }
    return out;
  }

  class Stokk {
    constructor(stage) {
      this.stage = stage;
      this.scene = u.$('#scene', stage);
      this.gen = 0; this.busy = false; this.fast = false; this.cutRes = null; this.cut = Promise.resolve();
      this.layer = null; this.ro = null; this.lastTick = 0;
    }
    static of(stage) { if (!stage._stokk) stage._stokk = new Stokk(stage); return stage._stokk; }

    /* Fjerner det som vises (kort eller knapp) */
    clear() {
      this.gen++;
      this.busy = false; this.fast = false;
      if (this.cutRes) { this.cutRes(); this.cutRes = null; }
      if (this.ro) { this.ro.disconnect(); this.ro = null; }
      if (this.layer) { this.layer.remove(); this.layer = null; }
      if (this.scene) this.scene.classList.remove('is-stokk');
    }
    /* ⏭: hopp over resten av stokkingen, eller gå videre fra ventingen */
    hurry() { if (!this.busy) return; this.fast = true; if (this.cutRes) this.cutRes(); }

    /* Tidtaking som følger farten (1×/2×/4×) og kan kuttes med hurry() eller clear() */
    run(gen, dur, fn) {
      if (gen !== this.gen) return Promise.resolve();
      if (this.fast) { fn(1); return Promise.resolve(); }
      return Promise.race([Eng.tween(dur, (p) => { if (gen === this.gen && !this.fast) fn(p); }, E.linear), this.cut])
        .then(() => { if (gen === this.gen && this.fast) fn(1); });
    }
    pause(gen, ms) { return gen !== this.gen || this.fast ? Promise.resolve() : Promise.race([Eng.wait(ms), this.cut]); }
    tick() { const n = performance.now(); if (!this.fast && n - this.lastTick > 45) { this.lastTick = n; S().flap(); } }

    /* Vent til premien er hentet: en knapp (eller mellomrom/Enter/pil høyre). Løses når noen trykker, eller ved avbrudd. */
    next(label, hint = 'Når premien er hentet · eller mellomrom') {
      this.clear();
      const gen = this.gen;
      if (!this.scene) return Promise.resolve();
      this.busy = true;
      this.cut = new Promise((r) => { this.cutRes = r; });
      const el = document.createElement('div');
      el.className = 'sk-next';
      el.innerHTML = `<button type="button" class="btn btn-primary">${u.esc(label)} ▸</button><small>${u.esc(hint)}</small>`;
      this.layer = el;
      this.scene.appendChild(el);
      return new Promise((res) => {
        let fired = false;
        const onKey = (e) => {
          if (e.target.closest && e.target.closest('input, textarea, select, dialog, button, a')) return;
          if (e.key !== ' ' && e.key !== 'Enter' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          go();
        };
        const go = () => {
          if (fired) return;
          fired = true;
          document.removeEventListener('keydown', onKey);
          if (gen === this.gen) {
            this.busy = false; this.fast = false;
            el.remove();
            if (this.layer === el) this.layer = null;
            if (this.cutRes) { this.cutRes(); this.cutRes = null; }
          }
          res();
        };
        el.querySelector('button').addEventListener('click', go);
        document.addEventListener('keydown', onKey);
        this.cut.then(go);
      });
    }

    /* Trekk plass nr. pick+1 blant vinnerne som ikke er trukket ennå. opts: pick, kicker, icon (kortenes bakside).
       Løses når kortet er snudd og bordet ryddet, eller ved avbrudd. */
    async show(d, opts = {}) {
      this.clear();
      const gen = this.gen;
      const pick = opts.pick || 0;
      if (d.winners.length - pick < 2 || !this.scene || !this.scene.clientWidth) return;
      this.busy = true;
      this.cut = new Promise((r) => { this.cutRes = r; });
      try {
        await this.animate(d, gen, pick, opts);
      } catch (e) {
        console.error(e);
      } finally {
        if (gen === this.gen) {
          this.busy = false; this.fast = false;
          if (this.ro) { this.ro.disconnect(); this.ro = null; }
          if (this.layer) { this.layer.remove(); this.layer = null; }
          this.scene.classList.remove('is-stokk');
          if (this.cutRes) { this.cutRes(); this.cutRes = null; }
        }
      }
    }

    async animate(d, gen, pick, opts) {
      const live = () => gen === this.gen;
      const rank = pick + 1;
      const left = d.winners.slice(pick); // de som ikke er trukket ennå
      const N = left.length;
      const target = d.winners[pick];
      const byNo = new Map(d.tickets.map((t) => [t.no, t]));
      const shown = u.shuffle(left, rnd); // kortene legges på bordet i tilfeldig rekkefølge
      const at = rnd(N); // plassen kortet trekkes fra
      const kicker = opts.kicker || 'Premierekkefølgen';

      /* ---- Oppsett: kortene på rad midt på scenen ----
         Kortene har posisjon i rutenett-enheter (kolonne, rad), så alt skaleres om scenen endrer størrelse (f.eks. fullskjerm) */
      let cols = 1, rows = 1, M = null;
      const measure = (choose) => {
        const SW = this.scene.clientWidth, SH = this.scene.clientHeight;
        const small = SH < 430;
        const fs = u.clamp(SW * 0.042, 20, 58);
        const headTop = small ? 10 : Math.max(66, SH * 0.1);
        const AY = headTop + fs * (small ? 1.5 : 2.2) + (small ? 18 : 44);
        const AX = SW * 0.06, AW = SW * 0.88, AH = Math.max(40, SH - AY - Math.max(30, SH * 0.08));
        const fit = (c, r) => Math.min(170, AW / (c + (c - 1) * 0.3), AH / (r * ASPECT + (r - 1) * 0.4));
        if (choose) {
          let bw = 0;
          for (let c = 1; c <= N; c++) { const r = Math.ceil(N / c), w = fit(c, r); if (w > bw * 1.02) { bw = w; cols = c; rows = r; } }
        }
        const cw = fit(cols, rows), ch = cw * ASPECT, gx = cw * 0.3, gy = cw * 0.4;
        const gw = cols * cw + (cols - 1) * gx, gh = rows * ch + (rows - 1) * gy;
        M = { small, fs, headTop, cw, ch, px: cw + gx, py: ch + gy, x0: AX + (AW - gw) / 2, y0: AY + (AH - gh) / 2 };
      };
      measure(true);
      const cell = (k) => {
        const r = Math.floor(k / cols), c = k % cols;
        const inRow = r === rows - 1 ? N - r * cols : cols;
        return { gx: (cols - inRow) / 2 + c, gy: r };
      };

      const L = document.createElement('div');
      L.className = 'stokk';
      L.innerHTML = '<div class="sk-dim"></div><div class="sk-head"></div><div class="sk-pick"></div>';
      const icon = u.esc(opts.icon || '★');
      const cards = shown.map((no, k) => {
        const t = byNo.get(no) || { no, name: '', label: '' };
        const el = document.createElement('div');
        el.className = 'sk-card';
        el.innerHTML = `<div class="sk-in"><div class="sk-face" style="--pc:${u.colorFor(t.name)}"><b>${u.esc(t.label || u.pad(t.no))}</b><span>${u.esc(shortName(t.name))}</span></div><div class="sk-back"><i>${icon}</i></div></div>`;
        L.appendChild(el);
        const p = cell(k);
        return { el, inner: el.firstChild, face: el.querySelector('.sk-face'), t, gx: p.gx, gy: p.gy, lift: 0, s: 0.7, o: 0, ry: 0, z: 0, mv: null };
      });
      const put = (c) => {
        const x = M.x0 + c.gx * M.px, y = M.y0 + c.gy * M.py + c.lift * M.ch;
        c.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${c.s.toFixed(3)})`;
        c.el.style.opacity = c.o;
        c.el.style.zIndex = c.z;
        c.inner.style.transform = `rotateY(${c.ry.toFixed(1)}deg)`;
      };
      const H = u.$('.sk-head', L);
      const P = u.$('.sk-pick', L);
      let pickAt = -1;
      const placePick = () => { if (pickAt < 0) return; const p = cell(pickAt); P.style.transform = `translate(${(M.x0 + p.gx * M.px).toFixed(1)}px,${(M.y0 + p.gy * M.py).toFixed(1)}px)`; };
      const layout = () => { // størrelser og faste ting; kortene plasseres av put()
        L.classList.toggle('is-small', M.cw < 60);
        L.style.setProperty('--cw', `${M.cw.toFixed(1)}px`);
        L.style.setProperty('--fs', `${M.fs.toFixed(1)}px`);
        H.style.top = `${M.headTop.toFixed(1)}px`;
        placePick();
      };
      layout();
      cards.forEach(put);
      this.layer = L;
      this.scene.appendChild(L);
      this.scene.classList.add('is-stokk');
      if ('ResizeObserver' in window) {
        let w0 = this.scene.clientWidth, h0 = this.scene.clientHeight;
        this.ro = new ResizeObserver(() => {
          const w = this.scene.clientWidth, h = this.scene.clientHeight;
          if (!live() || (w === w0 && h === h0) || !w || !h) return;
          w0 = w; h0 = h;
          measure(false); layout(); cards.forEach(put);
        });
        this.ro.observe(this.scene);
      }
      const head = (title, sub) => {
        H.innerHTML = `<small>${u.esc(kicker)}</small><b>${u.esc(title)}</b>${M.small || !sub ? '' : `<span>${u.esc(sub)}</span>`}`;
        H.classList.remove('is-new'); void H.offsetWidth; H.classList.add('is-new');
      };

      /* ---- 1. Kortene som er igjen, med navnet opp ---- */
      head(pick === 0 ? 'Hvem velger premie først?' : `Hvem velger som nummer ${u.numberWord(rank)}?`,
        pick === 0 ? `${cap(u.numberWord(N))} kom frem. Følg med på kortet ditt.` : `${cap(u.numberWord(N))} kort igjen. Følg med på ditt.`);
      await this.run(gen, 700, (p) => {
        const t = p * 700;
        cards.forEach((c, k) => { const q = u.clamp((t - k * (300 / N)) / 400, 0, 1); c.o = q; c.s = 0.7 + 0.3 * E.outBack(q); put(c); });
      });
      if (!live()) return;
      if (!this.fast) S().pop();
      await this.pause(gen, 1600);
      if (!live()) return;

      /* ---- 2. Kortene snus ---- */
      head('Stokker …', 'Følg med på kortet ditt.');
      await this.run(gen, 560, (p) => {
        const t = p * 560;
        cards.forEach((c, k) => { const q = u.clamp((t - k * (200 / N)) / 360, 0, 1); c.ry = 180 * E.inOut(q); c.s = 1 + 0.06 * Math.sin(Math.PI * q); put(c); });
        this.tick();
      });
      if (!live()) return;
      await this.pause(gen, 450);
      if (!live()) return;

      /* ---- 3. Stokkingen: to og to bytter plass, som i et skjell-spill ---- */
      const steps = swapPlan(shown, target, at);
      const S0 = steps.length;
      let clock = 0;
      const plan = steps.map(([i, j], n) => {
        const slow = n < 2 || n >= S0 - 2;
        const s = { i, j, t0: clock, dur: slow ? 540 : 360 };
        clock += slow ? 630 : 410;
        return s;
      });
      const dD = S0 ? plan[S0 - 1].t0 + plan[S0 - 1].dur + 200 : 0;
      const slot = cards.slice(); // slot[k] = kortet som ligger på plass k
      const moving = new Set();
      let next = 0;
      if (S0) {
        await this.run(gen, dD, (p) => {
          const now = p * dD;
          while (next < S0 && plan[next].t0 <= now) {
            const s = plan[next++];
            const A = slot[s.i], B = slot[s.j];
            slot[s.i] = B; slot[s.j] = A;
            const pi = cell(s.i), pj = cell(s.j);
            A.mv = { fx: A.gx, fy: A.gy, tx: pj.gx, ty: pj.gy, t0: s.t0, dur: s.dur, up: 1 };
            B.mv = { fx: B.gx, fy: B.gy, tx: pi.gx, ty: pi.gy, t0: s.t0, dur: s.dur, up: -1 };
            moving.add(A); moving.add(B);
            if (!this.fast) S().flap();
          }
          moving.forEach((c) => {
            const m = c.mv, q = u.clamp((now - m.t0) / m.dur, 0, 1), e = E.inOut(q), b = Math.sin(Math.PI * q);
            c.gx = m.fx + (m.tx - m.fx) * e;
            c.gy = m.fy + (m.ty - m.fy) * e;
            c.lift = -m.up * b * 0.3;
            c.s = 1 + b * (m.up > 0 ? 0.1 : 0);
            c.z = q < 1 ? (m.up > 0 ? 3 : 2) : 0;
            put(c);
            if (q >= 1) moving.delete(c);
          });
        });
        if (!live()) return;
      }
      await this.pause(gen, 450);
      if (!live()) return;

      /* ---- 4. Trekningen: lyset hopper mellom kortene og stopper på ett ---- */
      head('Trekker …', `${rank}. plass`);
      L.classList.add('is-picking');
      const hops = hopPlan(N, at);
      let hclock = 0;
      const hplan = hops.map((s, i) => { const h = { s, t0: hclock }; hclock += Math.round(110 * Math.pow(1.3, i)); return h; });
      const dH = hplan[hplan.length - 1].t0 + 350;
      let hn = 0;
      await this.run(gen, dH, (p) => {
        const now = p * dH;
        while (hn < hplan.length && hplan[hn].t0 <= now) { pickAt = hplan[hn++].s; placePick(); this.tick(); }
      });
      if (!live()) return;
      pickAt = at; placePick();
      if (!this.fast) S().pop();

      /* ---- 5. Kortet løftes ut og snus ---- */
      const c = slot[at], t = c.t;
      if (rank === 1) {
        head('Og 1. plass …', 'Velger premie først.');
        if (!this.fast) S().heartbeat();
      }
      await this.run(gen, 600, (p) => {
        const e = E.inOut(p);
        c.lift = -0.14 * e; c.s = 1 + 0.12 * e; c.z = 3; put(c);
        slot.forEach((o) => { if (o !== c) { o.o = 1 - 0.65 * e; put(o); } });
      });
      if (!live()) return;
      if (rank === 1) { await this.pause(gen, 700); if (!live()) return; }
      c.face.classList.add('is-win');
      c.face.insertAdjacentHTML('beforeend', `<em class="sk-fate">${MEDAL[pick] || '🏁'}</em>`);
      await this.run(gen, 560, (p) => { c.ry = 180 + 180 * E.inOut(p); c.s = 1.12 + 0.12 * Math.sin(Math.PI * p); put(c); });
      if (!live()) return;
      L.classList.add('is-won');
      head(`${rank}. plass`, `${t.name}${d.noNums ? '' : ` · lodd ${t.label || u.pad(t.no)}`}`);
      if (!this.fast) { if (rank === 1) S().sparkle(); else S().ding(); }
      await this.pause(gen, 1800);
      if (!live()) return;

      /* ---- 6. Bordet ryddes – vinneren går i land ---- */
      L.classList.add('is-done');
      await this.run(gen, 450, (p) => { slot.forEach((o) => { o.o = (o === c ? 1 : 0.35) * (1 - p); put(o); }); });
    }
  }

  FL.Stokk = Stokk;
  FL.Stokk.swapPlan = swapPlan;
  FL.Stokk.hopPlan = hopPlan;
})();
