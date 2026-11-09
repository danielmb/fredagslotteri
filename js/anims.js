/* Fredagslotteriet – animasjoner for hver fare underveis */
(function () {
  'use strict';
  const FL = window.FL;
  const { Eng, E, DOOR, VW, WATER, BOAT_X } = FL.Engine;
  const A = FL.Art;
  const S = () => FL.Audio;
  const lerp = FL.u.lerp;
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- Byggeklosser ---------- */
  function tw(a, to, dur, ease = E.inOut) {
    const from = {};
    Object.keys(to).forEach((k) => { from[k] = a[k]; });
    return Eng.tween(dur, (p) => { Object.keys(to).forEach((k) => { a[k] = from[k] + (to[k] - from[k]) * p; }); a.apply(); }, ease);
  }
  function walk(a, toX, dur, toY) {
    const x0 = a.x, y0 = a.y, y1 = toY == null ? a.y : toY;
    const steps = Math.max(1, Math.round(Math.abs(toX - x0) / 14));
    return Eng.tween(dur, (p) => { a.x = x0 + (toX - x0) * p; a.y = y0 + (y1 - y0) * p - Math.abs(Math.sin(p * Math.PI * steps)) * 3.5; a.apply(); }, E.linear);
  }
  function hop(a, x1, y1, h, dur, spin = 0, ease = E.linear) {
    const x0 = a.x, y0 = a.y, r0 = a.r;
    return Eng.tween(dur, (p) => { a.x = x0 + (x1 - x0) * p; a.y = y0 + (y1 - y0) * p - h * 4 * p * (1 - p); a.r = r0 + spin * p; a.apply(); }, ease);
  }
  function wobble(a, dur, deg = 10, n = 3) { const r0 = a.r; return Eng.tween(dur, (p) => { a.r = r0 + Math.sin(p * Math.PI * 2 * n) * deg * (1 - p * 0.3); a.apply(); }, E.linear); }
  function fadeOut(a, dur = 500) { return tw(a, { o: 0 }, dur, E.linear).then(() => a.remove()); }
  async function lieDown(a, dur = 380) { await tw(a, { r: a.r > 0 ? 90 : -90, y: a.y + 14 }, dur, E.in); S().thud(); }
  async function toAftDeck(a) { // ned fra soldekket om nødvendig
    if (a.layer === 'deck' && a.y < -100) await hop(a, Math.min(a.x, -166) - 12, -58, 36, 420);
  }
  function screen(vg, a) { return vg.sc.toScreen(a); }

  async function fallIntoSea(vg, a, { dx = -60, h = 70, spin = -160, dur = 640, big = 1 } = {}) {
    vg.sc.move(a, 'world');
    const yW = WATER + 44 + rnd(0, 18);
    await hop(a, a.x + dx, yW + 26, h, dur, spin, E.linear);
    vg.fx.splash(a.x, yW, Math.round(26 * big), true);
    S().splash(big);
    const s = screen(vg, a);
    vg.pop('PLASK!', s.x, yW - 70, { size: 54, color: '#dff4ff' });
    a.r = 0; a.setArt('swim'); a.y = yW + 6; a.apply();
    return a;
  }
  function swimAway(a, ms = 2600) {
    const y0 = a.y;
    Eng.tween(ms, (p) => { a.y = y0 + Math.sin(p * 16) * 2.2; a.o = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3; a.apply(); }, E.linear).then(() => a.remove());
  }
  async function intoDoor(a) {
    if (a.y < -100) { await tw(a, { o: 0, y: a.y + 10 }, 500); a.remove(); return; }
    await walk(a, DOOR.x, Math.max(200, Math.abs(DOOR.x - a.x) * 9));
    await fadeOut(a, 300);
  }
  function hearts(vg, x, y, n = 6) {
    for (let i = 0; i < n; i++) {
      const h = vg.prop(A.heart(i % 3 ? '#ee4a2f' : '#ff8fb1'), 'sky', x + rnd(-20, 20), y);
      h.s = 0.4;
      const x0 = h.x, dx = rnd(-50, 50);
      Eng.wait(i * 170).then(() => Eng.tween(1500, (p) => { h.y = y - p * 120; h.x = x0 + Math.sin(p * 6) * 10 + dx * p; h.s = 0.4 + p * 0.8; h.o = 1 - p; h.apply(); }, E.out)).then(() => h.remove());
    }
  }
  function zzz(vg, a, n = 3) {
    for (let i = 0; i < n; i++) Eng.wait(i * 420).then(() => { const p = screen(vg, a); vg.pop('z', p.x + 18 + i * 10, p.y - 70 - i * 16, { size: 30 + i * 8, color: '#c8d4ff', rot: -12, life: 900 }); });
  }

  /* ---------- Hendelsene ---------- */
  const Anims = {
    async eagle(vg, actors) {
      const a = actors[0];
      const p = screen(vg, a);
      const e = vg.prop(A.eagle(), 'sky', VW + 180, 110);
      e.s = 0.78; e.sx = -1; e.apply();
      S().whoosh(); S().screech();
      const P0 = { x: VW + 180, y: 110 }, P1 = { x: p.x + 6, y: p.y - 57 - 14 }, C = { x: p.x + 330, y: p.y + 30 };
      await Eng.tween(1150, (t) => { const q = 1 - t; e.x = q * q * P0.x + 2 * q * t * C.x + t * t * P1.x; e.y = q * q * P0.y + 2 * q * t * C.y + t * t * P1.y; e.apply(); }, E.inOut);
      vg.sc.move(a, 'sky');
      vg.pop('SKRIIK!', p.x + 40, p.y - 150, { size: 50, color: '#f6bd47', rot: 8 });
      S().flap();
      const Q0 = { x: e.x, y: e.y }, Q1 = { x: -260, y: -160 }, D = { x: p.x - 160, y: p.y - 40 };
      e.sx = -1;
      await Eng.tween(1500, (t) => {
        const q = 1 - t;
        e.x = q * q * Q0.x + 2 * q * t * D.x + t * t * Q1.x; e.y = q * q * Q0.y + 2 * q * t * D.y + t * t * Q1.y; e.apply();
        a.x = e.x - 6; a.y = e.y + 14 + 57; a.r = Math.sin(t * 14) * 12; a.apply();
      }, E.in);
      e.remove(); a.remove();
    },

    async horn(vg, actors) {
      vg.ship(A.liner(), { layer: 'far', y: 574, scale: 0.46, from: VW + 240, to: -520, dur: 5600, flip: true });
      await Eng.wait(1150);
      S().horn(1.9);
      vg.pop('TUUUUUT!', VW / 2 + 80, 250, { size: 116, color: '#f6bd47', rot: -4, life: 1700 });
      vg.shake();
      await Promise.all(actors.map(async (a) => {
        const y0 = a.y;
        await tw(a, { y: y0 - 72 }, 230, E.out);
        const p = screen(vg, a);
        vg.pop('!', p.x, p.y - 70, { size: 64, color: '#ee4a2f', rot: 0, life: 700 });
        await tw(a, { y: y0 }, 260, E.in);
        await lieDown(a);
      }));
      await Promise.all(actors.map(async (a) => {
        const g = vg.prop(A.figure(a.p), a.layer, a.x, a.y - 14, a.mark);
        g.addClass('ghost'); g.o = 0.85; g.apply();
        fadeOut(a, 900);
        await tw(g, { y: g.y - 150, o: 0 }, 1500, E.out);
        g.remove();
      }));
    },

    async virus(vg, actors) {
      S().sick();
      const bugs = [];
      actors.forEach((a) => { for (let i = 0; i < 3; i++) { const v = vg.prop(A.virus(), a.layer, a.x + rnd(-26, 26), a.y - rnd(30, 70)); v.s = 0.9; v.apply(); bugs.push(v); } });
      bugs.forEach((v, i) => { const x0 = v.x, y0 = v.y; Eng.tween(2200, (p) => { v.x = x0 + Math.sin(p * 8 + i) * 12; v.y = y0 - p * 50; v.o = p < 0.8 ? 1 : (1 - p) * 5; v.r = p * 180; v.apply(); }, E.linear).then(() => v.remove()); });
      actors.forEach((a) => a.addClass('sick'));
      const p0 = screen(vg, actors[0]);
      vg.pop('ÆSJ!', p0.x + 30, p0.y - 110, { size: 56, color: '#9be38c' });
      await Promise.all(actors.map((a) => wobble(a, 1000, 9)));
      await Promise.all(actors.map((a, i) => Eng.wait(i * 140).then(() => intoDoor(a))));
    },

    async chef(vg, actors) {
      const a = actors[0];
      const sun = a.y < -100;
      const c = vg.prop(A.chef(), 'deck', sun ? a.x + 46 : DOOR.x, sun ? a.y : DOOR.y);
      c.o = 0; c.apply();
      await tw(c, { o: 1 }, 300);
      if (!sun) await walk(c, a.x + 30, 520);
      S().love();
      const p = screen(vg, a);
      hearts(vg, p.x + 15, p.y - 64);
      vg.pop('♥', p.x + 15, p.y - 120, { size: 70, color: '#ff6b8a', rot: 0, life: 1100 });
      await Eng.wait(1100);
      if (sun) { await Promise.all([tw(a, { o: 0, x: a.x + 14 }, 600), tw(c, { o: 0 }, 600)]); a.remove(); c.remove(); return; }
      await Promise.all([intoDoor(c), Eng.wait(120).then(() => intoDoor(a))]);
      vg.pop('KLAKK', DOOR.x + BOAT_X, WATER - 130, { size: 30, color: '#f3ecdf', rot: -8, life: 700 });
    },

    async stairs(vg, actors) {
      const a = actors[0];
      if (a.y < -100) {
        await walk(a, -150, Math.max(200, Math.abs(a.x + 150) * 9));
        const pts = [[-182, -96], [-212, -76], [-246, -58]];
        for (const [x, y] of pts) {
          await hop(a, x, y, 22, 300, 240, E.linear);
          S().thud();
          const p = screen(vg, a);
          vg.pop(Math.random() < 0.5 ? 'DUNK!' : 'AU!', p.x, p.y - 80, { size: 38, color: '#f6bd47', rot: rnd(-14, 14), life: 650 });
        }
      } else {
        await hop(a, a.x - 30, a.y, 30, 320, 360);
        S().thud();
        const p = screen(vg, a);
        vg.pop('DUNK!', p.x, p.y - 80, { size: 40, color: '#f6bd47' });
      }
      a.r = 0;
      await lieDown(a);
      await Eng.wait(700);
      await fadeOut(a, 500);
    },

    async overboard(vg, actors) {
      await Promise.all(actors.map(async (a, i) => {
        await Eng.wait(i * 180);
        if (a.y > -100) await walk(a, Math.max(-276, a.x - 16), 260);
        const s = await fallIntoSea(vg, a, { dx: -50 - i * 26 });
        swimAway(s);
      }));
      await Eng.wait(500);
    },

    async drown(vg, actors) {
      await Promise.all(actors.map(async (a) => {
        if (a.y > -100) await walk(a, Math.max(-276, a.x - 16), 260);
        const s = await fallIntoSea(vg, a, { dx: -40 });
        await Eng.wait(500);
        const p = screen(vg, s);
        vg.pop('BLUBB', p.x + 34, p.y - 50, { size: 34, color: '#9fd6ff', rot: 6, life: 900 });
        S().blub();
        vg.fx.bubbles(s.x, s.y - 4, 14, true);
        await tw(s, { y: s.y + 26, o: 0 }, 1300, E.in);
        s.remove();
        vg.fx.bubbles(s.x, s.y - 8, 8, true);
      }));
    },

    async drunk(vg, actors, beat) {
      for (let k = 0; k < 2; k++) {
        S().hic();
        const p = screen(vg, actors[0]);
        vg.pop('HIKK!', p.x + 26, p.y - 96 - k * 20, { size: 40, color: '#c8b8ff', rot: rnd(-12, 12), life: 700 });
        await Promise.all(actors.map((a) => wobble(a, 650, 14, 2)));
      }
      if (FL.Events.PORT_NAME[beat.place]) return Anims.ashore(vg, actors, beat, { lie: true });
      return Anims.overboard(vg, actors);
    },

    async ashore(vg, actors, beat, opt = {}) {
      const mark = vg.portMark(beat.place);
      if (!mark) return Anims.overboard(vg, actors);
      await Promise.all(actors.map(async (a, i) => {
        await Eng.wait(i * 260);
        await toAftDeck(a);
        await walk(a, -276, Math.max(160, Math.abs(a.x + 276) * 8));
        vg.sc.move(a, 'mark', mark);
        await hop(a, a.x - 26, -12, 16, 260);
        await walk(a, -330 - i * 42, 420 + i * 60, -12);
        if (opt.lie) { await lieDown(a); vg.pop('Zzz', screen(vg, a).x, screen(vg, a).y - 60, { size: 28, color: '#c8d4ff', life: 900 }); return; }
        if (opt.leave) { await walk(a, a.x - 170, 1300, -12); await fadeOut(a, 300); return; }
        const y0 = a.y;
        Eng.tween(4200, (p) => { a.y = y0 - Math.abs(Math.sin(p * Math.PI * 9)) * 7; a.apply(); }, E.linear);
      }));
      const s = screen(vg, actors[0]);
      if (beat.ev === 'ornes') vg.pop('Ups.', s.x, s.y - 110, { size: 40, color: '#f6bd47', life: 900 });
    },

    async sleep(vg, actors) {
      const a = actors[0];
      const ship = vg.ship(A.liner(), { layer: 'far', y: 572, scale: 0.5, from: -560, to: VW + 560, dur: 6400 });
      zzz(vg, a, 3);
      S().toot();
      await Eng.wait(1700);
      vg.sc.move(a, 'sky');
      const sx = a.x, sy = a.y, r0 = a.r;
      await Eng.tween(1500, (p) => {
        const tx = ship.o.x + 36, ty = ship.y - 94 * ship.scale;
        a.x = lerp(sx, tx, p); a.y = lerp(sy, ty, p) - Math.sin(p * Math.PI) * 90; a.s = lerp(1, ship.scale, p); a.r = lerp(r0, -80, p); a.apply();
      }, E.inOut);
      a.layer = 'ship'; ship.g.appendChild(a.el);
      a.x = 36 / ship.scale; a.y = -94; a.s = 1; a.apply();
      vg.pop('→ SVOLVÆR', ship.o.x + 90, ship.y - 150, { size: 26, color: '#c8d4ff', rot: 0, life: 1400 });
      await Eng.wait(600);
    },

    async wrongboat(vg, actors, beat) {
      if (FL.Events.PORT_NAME[beat.place]) return Anims.ashore(vg, actors, beat, { leave: true });
      const from = VW + 320, to = -420, dur = 5200, sc = 0.62, y = 618;
      const boat = vg.ship(A.smallBoat(['TRÆNA', 'MOSKENES', 'LOVUND'][beat.t % 3]), { layer: 'near', y, scale: sc, from, to, dur });
      const tLand = ((from - (BOAT_X - 60)) / (from - to)) * dur;
      await Eng.wait(Math.max(0, tLand - 800));
      await Promise.all(actors.map(async (a, i) => {
        await Eng.wait(i * 120);
        vg.sc.move(a, 'sky');
        const sx = a.x, sy = a.y, off = -40 + i * 34;
        await Eng.tween(780, (p) => { const tx = boat.o.x + off, ty = y - 52 * sc; a.x = lerp(sx, tx, p); a.y = lerp(sy, ty, p) - Math.sin(p * Math.PI) * 70; a.s = lerp(1, sc, p); a.apply(); }, E.linear);
        a.layer = 'ship'; boat.g.appendChild(a.el);
        a.x = off / sc; a.y = -52; a.s = 1; a.r = 0; a.apply();
      }));
      const p = { x: boat.o.x, y: y - 90 };
      vg.pop('Feil båt!', p.x, p.y - 40, { size: 34, color: '#5ef2b5', life: 900 });
      await Eng.wait(700);
    },

    async seasick(vg, actors, beat) {
      actors.forEach((a) => a.addClass('sick'));
      S().sick();
      const p = screen(vg, actors[0]);
      vg.pop('BLÆ!', p.x + 26, p.y - 100, { size: 50, color: '#9be38c' });
      await Promise.all(actors.map((a) => wobble(a, 1100, 16, 2)));
      if (FL.Events.PORT_NAME[beat.place]) return Anims.ashore(vg, actors, beat, { lie: true });
      await Promise.all(actors.map(async (a) => { await lieDown(a); await Eng.wait(600); await fadeOut(a, 500); }));
    },

    async gull(vg, actors) {
      const a = actors[0];
      const t = vg.prop(A.ticket(), a.layer, a.x + 15, a.y - 30, a.mark);
      const g = vg.prop(A.gull(), 'sky', -80, 170);
      g.s = 1.3; g.apply();
      S().gull();
      const tp = screen(vg, t);
      const G0 = { x: -80, y: 170 }, C = { x: tp.x - 200, y: tp.y + 40 };
      await Eng.tween(1000, (p) => { const q = 1 - p; g.x = q * q * G0.x + 2 * q * p * C.x + p * p * tp.x; g.y = q * q * G0.y + 2 * q * p * C.y + p * p * (tp.y - 8); g.apply(); }, E.inOut);
      vg.sc.move(t, 'sky');
      const p0 = screen(vg, a);
      vg.pop('HEI!', p0.x - 10, p0.y - 100, { size: 46, color: '#f3ecdf' });
      S().gull();
      const gx = g.x, gy = g.y;
      const fly = Eng.tween(1300, (p) => { g.x = lerp(gx, VW + 140, p); g.y = lerp(gy, 90, p) - Math.sin(p * Math.PI) * 40; g.apply(); t.x = g.x; t.y = g.y + 10; t.r = p * 200; t.apply(); }, E.in).then(() => { g.remove(); t.remove(); });
      await Eng.wait(250);
      await toAftDeck(a);
      const s = await fallIntoSea(vg, a, { dx: 50, h: 90, spin: 120 });
      swimAway(s);
      await fly;
    },

    async aurora(vg, actors) {
      const a = actors[0];
      vg.sceneEl.classList.add('aurora-burst');
      S().sparkle();
      vg.sc.move(a, 'sky');
      const y0 = a.y, x0 = a.x;
      const spark = setInterval(() => vg.fx.sparkles(a.x, a.y - 30, 6), 160);
      await Eng.tween(2400, (p) => { a.y = y0 - p * 300; a.x = x0 + Math.sin(p * 5) * 26; a.r = Math.sin(p * 3) * 20; a.o = p < 0.65 ? 1 : 1 - (p - 0.65) / 0.35; a.apply(); }, E.inOut);
      clearInterval(spark);
      a.remove();
      setTimeout(() => vg.sceneEl.classList.remove('aurora-burst'), 900);
    },

    async wind(vg, actors) {
      S().wind();
      for (let i = 0; i < 12; i++) {
        const y = rnd(300, 640), len = rnd(80, 220);
        const l = vg.prop(`<path d="M0 0 H${len}" stroke="#dbe7f3" stroke-opacity=".55" stroke-width="2.5" stroke-linecap="round"/>`, 'sky', VW + rnd(0, 300), y);
        Eng.tween(900 + rnd(0, 500), (p) => { l.x = VW + 200 - p * (VW + 600); l.apply(); }, E.linear).then(() => l.remove());
      }
      const p0 = screen(vg, actors[0]);
      vg.pop('SVISJ!', p0.x, p0.y - 120, { size: 58, color: '#dbe7f3', rot: -10 });
      await Eng.wait(250);
      await Promise.all(actors.map(async (a, i) => {
        await Eng.wait(i * 130);
        vg.sc.move(a, 'sky');
        const x0 = a.x, y0 = a.y, r0 = a.r;
        await Eng.tween(1500, (p) => { a.x = x0 - p * (900 + i * 90); a.y = y0 - Math.sin(p * Math.PI) * (140 + i * 30) + p * 60; a.r = r0 - p * 760; a.apply(); }, E.in);
        a.remove();
      }));
    },

    async orca(vg, actors) {
      const o = vg.prop(A.orca(), 'sky', BOAT_X + 300, WATER + 80);
      const x0 = BOAT_X + 300, x1 = BOAT_X - 80;
      vg.fx.splash(x0, WATER + 60, 22, false);
      S().splash(0.8);
      vg.pop('SPEKKHOGGER!', BOAT_X + 120, 300, { size: 62, color: '#f3ecdf', rot: -5, life: 1300 });
      const lean = Promise.all(actors.map((a) => tw(a, { r: -18 }, 600)));
      await Eng.tween(1300, (p) => { o.x = lerp(x0, x1, p); o.y = WATER + 80 - Math.sin(p * Math.PI) * 190; o.r = lerp(-35, 50, p); o.apply(); }, E.linear);
      vg.fx.splash(o.x, WATER + 60, 30, false);
      S().splash(1.2);
      o.remove();
      await lean;
      await Promise.all(actors.map(async (a, i) => { await Eng.wait(i * 150); const s = await fallIntoSea(vg, a, { dx: 40 + i * 30, h: 50, spin: 140 }); swimAway(s); }));
    },

    async polar(vg, actors) {
      const a = actors[0];
      const b = vg.prop(A.bucket(), a.layer, a.x + 22, a.y - 104, a.mark);
      b.o = 0; b.apply();
      await tw(b, { o: 1, y: b.y + 10 }, 300);
      await tw(b, { r: -130 }, 380, E.in);
      const p = screen(vg, a);
      vg.fx.drops(p.x + 6, p.y - 90, 30, '#9fd6ff');
      S().splash(0.4);
      await Eng.wait(240);
      a.addClass('frozen');
      a.inner.insertAdjacentHTML('beforeend', A.iceBlock());
      vg.pop('BRRR!', p.x + 20, p.y - 120, { size: 52, color: '#bfe6ff' });
      fadeOut(b, 400);
      await wobble(a, 600, 4, 4);
      await walk(a, Math.max(-276, a.x - 20), 300);
      const s = await fallIntoSea(vg, a, { dx: -50, spin: -90 });
      s.setArt(`<g transform="translate(0 6) scale(.9)">${A.iceBlock()}</g>` + A.swimmer(a.p));
      s.addClass('frozen');
      swimAway(s, 3000);
    },

    async glimt(vg, actors) {
      const a = actors[0];
      a.addClass('glimt');
      const p = screen(vg, a);
      vg.pop('HEIA GLIMT!', p.x + 40, p.y - 120, { size: 52, color: '#ffd400', rot: -6 });
      S().fanfare();
      await Eng.wait(450);
      await toAftDeck(a);
      const s = await fallIntoSea(vg, a, { dx: 90, h: 100, spin: 360 });
      const x0 = s.x;
      let k = 0;
      await Eng.tween(2100, (q) => { s.x = x0 + q * 1500; s.apply(); if (k++ % 6 === 0) vg.fx.splash(s.x - 16, s.y - 2, 4, true); }, E.in);
      s.remove();
    },
  };

  Anims.util = { tw, walk, hop, wobble, fadeOut, lieDown, toAftDeck, fallIntoSea, swimAway };
  FL.Anims = Anims;
})();
