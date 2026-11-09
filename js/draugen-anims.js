/* Fredagslotteriet – «Draugen»: animasjonene for farene i Vestfjorden */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u, D = FL.DArt, A = FL.Art;
  const { Eng, E, svgEl } = FL.Engine;
  const S = () => FL.Audio;
  const SEA = 470;
  const lerp = u.lerp;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const shortName = (n) => { const p = u.cleanName(n).split(' '); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]; };

  /* ---------- Byggeklosser ---------- */
  function place(el, x, y, sx, sy, rot = 0) { el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${sx.toFixed(3)} ${(sy == null ? sx : sy).toFixed(3)})`); }
  function sink(dg, b, { dur = 1300, tilt = 18, bubbles = true } = {}) {
    const p = dg.pos(b);
    if (bubbles) dg.fx.bubbles(p.x, p.y - 4, 12, false);
    const a0 = b.ar, y0 = b.ay;
    return Eng.tween(dur, (t) => { b.ay = y0 + t * 150; b.ar = a0 + tilt * t; dg.setAct(b); }, E.in).then(() => dg.hide(b));
  }
  async function capsize(dg, b, dur = 700) {
    const a0 = b.ar;
    await Eng.tween(dur, (t) => { b.ar = a0 + 180 * t; b.ay = 30 * t; dg.setAct(b); }, E.inOut);
    const p = dg.pos(b);
    dg.fx.splash(p.x, p.y, 18, false);
    await sink(dg, b, { dur: 900, tilt: 0 });
  }
  function hearts(dg, x, y, n = 6) {
    for (let i = 0; i < n; i++) {
      const h = dg.prop(A.heart(i % 3 ? '#ff6b8a' : '#ffd0dc'), 'sky');
      const dx = rnd(-40, 40);
      Eng.wait(i * 160).then(() => Eng.tween(1500, (p) => { place(h, x + dx * p + Math.sin(p * 6) * 8, y - p * 110, 0.5 + p * 0.6); h.style.opacity = 1 - p; }, E.out)).then(() => h.remove());
    }
  }
  function ghostText(dg, text) {
    const c = dg.cam;
    const size = c.w * 0.075;
    const g = dg.prop(`<text class="ghost-txt" text-anchor="middle" font-size="${size.toFixed(1)}">${u.esc(text)}</text>`, 'sky');
    const x = c.x + c.w * 0.64, y = c.y + c.h * 0.36;
    return Eng.tween(2600, (p) => { place(g, x + Math.sin(p * 9) * 6, y - p * 30, 0.9 + p * 0.15); g.style.opacity = p < 0.15 ? p / 0.15 : p > 0.7 ? (1 - p) / 0.3 : 1; }, E.linear).then(() => g.remove());
  }
  function ghostBoat(dg, scale, parent = 'fx') {
    const g = dg.prop(D.draugenBoat(), parent);
    (dg.crew || []).slice(0, 5).forEach((lab, i) => {
      const f = svgEl('g', { class: 'actor ghost', transform: `translate(${-2 + i * 11} -14) scale(.32)` }, A.figure({ color: '#bff5dd', ini: lab }));
      g.insertBefore(f, g.children[3] || null);
    });
    g.dataset.s = scale;
    return g;
  }
  function tentacleFor(dg, b, side = 1) {
    const el = dg.prop(D.tentacle(), 'fx');
    const o = { grow: 0, sway: 0 };
    const p = dg.pos(b);
    const x = p.x + side * 56 * b.s, y = p.y + 10;
    const apply = () => place(el, x, y, b.s * 0.95 * side, b.s * 0.95 * o.grow, o.sway);
    apply();
    return { el, o, apply };
  }

  const DAnims = {
    /* Draugen henter dem som ikke betalte */
    async recruit(dg, left) {
      const names = left.map((p) => `<b>${u.esc(p.name)}</b>`);
      dg.infoCard('👻', 'Draugen henter mannskap', `${u.joinNames(names)} har ikke betalt. Nå ror de for Draugen.`, `${left.length} uten bekreftet betaling`);
      dg.logCrew(left);
      dg.crew = left.map((p) => (p.nums && p.nums[0] ? String(p.nums[0]) : u.initials(p.name)));
      const ghosts = left.slice(0, 8).map((p, i) => {
        const el = svgEl('g', { class: 'actor ghost' }, A.figure({ color: '#bff5dd', ini: dg.crew[i] }));
        dg.g.back.appendChild(el);
        const o = { x: 230 + i * 30, y: SEA + 40, s: 0.55, op: 0 };
        const ap = () => { place(el, o.x, o.y, o.s); el.style.opacity = o.op; };
        ap();
        return { el, o, ap };
      });
      await Eng.tween(500, (p) => ghosts.forEach((g) => { g.o.op = p * 0.85; g.ap(); }), E.linear);
      const boat = ghostBoat(dg, 0.75, 'back');
      const bo = { x: -260 };
      const by = SEA + 58;
      const bap = () => place(boat, bo.x, by + Math.sin(dg.time * 2) * 3, 0.75);
      S().wail();
      await Eng.tween(1800, (p) => { bo.x = lerp(-260, 150, p); bap(); }, E.out);
      await Promise.all(ghosts.map((g, i) => Eng.wait(i * 120).then(() => {
        const sx = g.o.x, sy = g.o.y;
        return Eng.tween(900, (p) => { g.o.x = lerp(sx, 160 + i * 8, p); g.o.y = lerp(sy, by - 12, p) - Math.sin(p * Math.PI) * 50; g.o.s = lerp(0.55, 0.28, p); g.ap(); }, E.inOut);
      })));
      await Eng.tween(2400, (p) => { const x = lerp(150, 1900, E.in(p)); const dx = x - bo.x; bo.x = x; bap(); ghosts.forEach((g) => { g.o.x += dx; g.ap(); }); boat.style.opacity = 1 - Math.max(0, p - 0.7) / 0.3; }, E.linear);
      boat.remove();
      ghosts.forEach((g) => g.el.remove());
    },

    async amuletIntro(dg, am) {
      const b = dg.byNo.get(am.no);
      if (!b) return;
      const t = svgEl('g', { class: 'fb-tooth', transform: 'translate(0 -128) scale(.75)' }, D.tooth());
      b.act.appendChild(t);
      const s = dg.sail(b);
      dg.announce('Draugens tann', `${u.esc(am.name)} var nærmest å vinne sist`, 2400);
      S().sparkle();
      await dg.camTo(s.x, s.y + 20, 900, 700);
      dg.fx.sparkles(s.x, s.y - 60 * b.s, 22, '#ffe08a');
      await Eng.wait(1500);
      await dg.camReset();
    },

    async kraken(dg, boats, beat, last) {
      const main = boats[0];
      const sp = dg.sail(main);
      if (boats.length === 1) await dg.camTo(sp.x, sp.y + 30, last ? 700 : 860, 650);
      S().roar();
      const tents = boats.map((b, i) => ({ b, ...tentacleFor(dg, b, i % 2 ? -1 : 1) }));
      await Eng.tween(650, (p) => tents.forEach((t) => { t.o.grow = 0.65 * p; t.o.sway = Math.sin(p * 4) * 6; t.apply(); }), E.out);
      dg.pop('KRAKEN!', sp.x, sp.y - 120 * main.s, { size: 64, color: '#ff8fb8', rot: -6 });
      dg.shake();
      await Eng.tween(900, (p) => tents.forEach((t) => { t.b.ay = -150 * p; t.b.ar = Math.sin(p * 11) * 12; dg.setAct(t.b); t.o.grow = 0.65 + 0.45 * p; t.o.sway = Math.sin(p * 7) * 8; t.apply(); }), E.out);
      await Eng.wait(last ? 650 : 350);
      await Eng.tween(520, (p) => tents.forEach((t) => { t.b.ay = -150 + 330 * p; dg.setAct(t.b); t.o.grow = 1.1 * (1 - p); t.apply(); }), E.in);
      tents.forEach((t) => { const p = { x: t.b.x + t.b.ox, y: t.b.y + t.b.oy }; dg.fx.splash(p.x, p.y, 32, false); dg.hide(t.b); t.el.remove(); });
      S().splash(1.3);
      if (boats.length === 1) await dg.camReset();
    },

    async draugen(dg, boats, beat, last) {
      const b = boats[0];
      const p = dg.pos(b);
      const fog = dg.prop(`<rect x="-200" y="${SEA - 160}" width="2000" height="460" fill="url(#dFog)"/>`, 'back');
      fog.style.opacity = 0;
      await Eng.tween(700, (t) => { fog.style.opacity = t; }, E.linear);
      const boat = ghostBoat(dg, b.s * 1.15);
      const sc = b.s * 1.15;
      const by = p.y - 4;
      const gx = { x: -260 };
      const ap = () => place(boat, gx.x, by + Math.sin(dg.time * 1.8) * 4 * sc, sc);
      ap();
      if (last) await dg.camTo(p.x - 80, p.y - 60, 760, 900);
      await Eng.tween(2000, (t) => { gx.x = lerp(-260, p.x - 170 * sc, t); ap(); }, E.out);
      if (last) { S().heartbeat(); await Eng.wait(650); S().heartbeat(); await Eng.wait(500); }
      await dg.slowmo(async () => {
        S().wail();
        dg.skyFlash(0.25);
        const txt = ghostText(dg, (dg.pax.get(b.p.no) || {}).name || '');
        await Eng.wait(900);
        await sink(dg, b, { dur: 2200, tilt: 26 });
        await txt;
      }, last ? 0.6 : 0.8);
      await Eng.tween(1500, (t) => { gx.x = lerp(p.x - 170 * sc, p.x + 500, t); ap(); boat.style.opacity = 1 - t; fog.style.opacity = 1 - t; }, E.in);
      boat.remove(); fog.remove();
      if (last) await dg.camReset(800);
    },

    async malstrom(dg, boats) {
      const pts = boats.map((b) => dg.pos(b));
      const cx = pts.reduce((s, q) => s + q.x, 0) / pts.length;
      const cy = Math.max(SEA + 90, pts.reduce((s, q) => s + q.y, 0) / pts.length);
      if (boats.length <= 3) await dg.camTo(cx, cy - 60, 1100, 600);
      const wp = dg.prop(D.whirlpool(), 'back');
      const sc = 0.6 + (cy - SEA) / 600;
      S().whoosh();
      await Eng.tween(800, (t) => place(wp, cx, cy, sc * t, sc * t), E.out);
      dg.pop('MALSTRØM!', cx, cy - 160, { size: 60, color: '#bfe3ff', rot: -4 });
      S().wind();
      await Promise.all(boats.map((b, i) => {
        const x0 = b.x + b.ox, y0 = b.y + b.oy;
        const dx = x0 - cx, dy = (y0 - cy) / 0.32;
        const r0 = Math.max(60, Math.hypot(dx, dy)), a0 = Math.atan2(dy, dx);
        return Eng.wait(i * 120).then(() => Eng.tween(2300, (t) => {
          const r = r0 * (1 - t), a = a0 + t * Math.PI * 4;
          b.ox = cx + Math.cos(a) * r - b.x;
          b.oy = cy + Math.sin(a) * r * 0.32 - b.y;
          b.as = 1 - t * 0.75; b.ar = t * 540; dg.setAct(b);
        }, E.in)).then(() => dg.hide(b));
      }));
      S().blub();
      await Eng.tween(600, (t) => place(wp, cx, cy, sc * (1 - t), sc * (1 - t)), E.in);
      wp.remove();
      if (boats.length <= 3) await dg.camReset();
    },

    async blekk(dg, boats) {
      S().roar();
      const ox = rnd(500, 1100);
      const blob = dg.prop('<circle r="60" fill="url(#dInk)"/>', 'fx');
      await Eng.tween(900, (t) => place(blob, ox, 860, 1 + t * 26), E.in);
      await Eng.tween(300, (t) => dg.g.ink.setAttribute('opacity', t.toFixed(2)), E.linear);
      boats.forEach((b) => dg.hide(b));
      const sounds = ['plask', 'AAAH!', 'uff', 'blubb', 'hjelp?', 'nei nei nei'];
      for (let i = 0; i < 4; i++) {
        await Eng.wait(380);
        const x = dg.cam.x + rnd(0.2, 0.8) * dg.cam.w, y = dg.cam.y + rnd(0.35, 0.75) * dg.cam.h;
        dg.pop(sounds[(i + Math.floor(rnd(0, 6))) % sounds.length], x, y, { size: 30, color: '#9aa7b4', rot: rnd(-10, 10), life: 700 });
        if (i % 2) S().splash(0.6); else S().blub();
      }
      await Eng.wait(500);
      blob.remove();
      await Eng.tween(800, (t) => dg.g.ink.setAttribute('opacity', (1 - t).toFixed(2)), E.linear);
    },

    async huldra(dg, boats) {
      const b = boats[0];
      const left = b.x > 800;
      const hx = left ? 170 : 1430, hy = SEA + 36;
      const h = dg.prop(D.huldra(), 'back');
      h.style.opacity = 0;
      place(h, hx, hy, 1.05);
      await Eng.tween(700, (t) => { h.style.opacity = t; }, E.linear);
      S().love();
      hearts(dg, hx, hy - 110, 7);
      dg.pop('♥', hx, hy - 150, { size: 58, color: '#ff8fb8', rot: 0, life: 1300 });
      const x0 = b.x + b.ox, y0 = b.y + b.oy;
      await Eng.tween(2600, (t) => { b.ox = lerp(x0, hx + (left ? 60 : -60), t) - b.x; b.oy = lerp(y0, hy + 14, t) - b.y; b.as = 1 - t * 0.45; dg.setAct(b); }, E.inOut);
      dg.pop('Kuhale?!', hx, hy - 130, { size: 30, color: '#ffd0dc', rot: 6, life: 1100 });
      await Eng.wait(600);
      await Eng.tween(700, (t) => { b.g.style.opacity = 1 - t; h.style.opacity = 1 - t; }, E.linear);
      dg.hide(b); h.remove();
    },

    async krabbe(dg, boats) {
      const b = boats[0];
      const p = dg.pos(b);
      await dg.camTo(p.x, p.y - 70, 760, 600);
      const c = dg.prop(D.claw(), 'fx');
      const top = c.querySelector('.claw-top');
      const x = p.x + 46 * b.s, y = p.y + 12;
      await Eng.tween(500, (t) => place(c, x, y, b.s, b.s * t), E.out);
      S().crunch();
      dg.pop('KNIP!', x, y - 170 * b.s, { size: 52, color: '#ff9a7a' });
      await Eng.tween(700, (t) => top.setAttribute('transform', `rotate(${(Math.sin(t * Math.PI * 4) * 16).toFixed(1)} -10 -60)`), E.linear);
      for (let i = 0; i < 26; i++) dg.fx.add({ x: p.x + rnd(-10, 10) * b.s, y: p.y - 8 * b.s, vx: rnd(-60, 60), vy: -rnd(160, 320), g: 700, life: 0.9, size: rnd(1.5, 3.2), color: '#cfeeff' });
      S().splash(0.5);
      await Promise.all([sink(dg, b, { dur: 1500, tilt: -22 }), Eng.tween(1400, (t) => place(c, x, y + t * 60, b.s, b.s * (1 - t)), E.in)]);
      c.remove();
      await dg.camReset();
    },

    async lyn(dg, boats, beat, last) {
      const b = boats[0];
      const s = dg.sail(b);
      const topY = s.y - 46 * b.s;
      const bolt = dg.prop(D.bolt(s.x + rnd(-200, 200), dg.cam.y - 20, s.x, topY), 'fx');
      dg.flash(0.95, 500);
      S().thunder();
      dg.shake();
      dg.pop('BRAK!', s.x, topY - 70, { size: 70, color: '#ffe38a', rot: -8 });
      await Eng.wait(240);
      bolt.remove();
      await dg.camTo(s.x, s.y, last ? 700 : 900, 500);
      const sailEl = b.g.querySelector('.fb-sail');
      if (sailEl) sailEl.setAttribute('fill', '#2b2420');
      const fire = setInterval(() => {
        const q = dg.sail(b);
        for (let i = 0; i < 5; i++) dg.fx.add({ x: q.x + rnd(-24, 24) * b.s, y: q.y + rnd(-20, 20) * b.s, vx: rnd(-30, 30), vy: -rnd(60, 140), g: -40, drag: 0.6, life: rnd(0.5, 1), size: rnd(1.5, 3.5), kind: 'spark', color: Math.random() < 0.5 ? '#ffb347' : '#ffe08a' });
      }, 60);
      await Eng.wait(900);
      await sink(dg, b, { dur: 1600, tilt: 14 });
      clearInterval(fire);
      await dg.camReset();
    },

    async troll(dg, boats) {
      const tr = dg.prop(D.troll(), 'far');
      const tx = 1240, ty = SEA + 8;
      const o = { y: 260 };
      const ap = () => place(tr, tx, ty + o.y, 0.95);
      ap();
      await Eng.tween(900, (t) => { o.y = 260 * (1 - t); ap(); }, E.out);
      dg.pop('Vågakallen våknet!', tx, ty - 260, { size: 34, color: '#f6d36a', rot: -4, life: 1200 });
      S().roar();
      const pts = boats.map((b) => dg.pos(b));
      const ix = pts.reduce((s, q) => s + q.x, 0) / pts.length, iy = pts.reduce((s, q) => s + q.y, 0) / pts.length;
      const rock = dg.prop(D.boulder(), 'fx');
      const sx = tx + 170, sy = ty - 140;
      S().whoosh();
      await Eng.tween(1150, (t) => place(rock, lerp(sx, ix, t), lerp(sy, iy, t) - Math.sin(t * Math.PI) * 300, 0.5 + t * 0.9, null, t * 540), E.linear);
      rock.remove();
      dg.fx.splash(ix, iy, 70, false);
      S().splash(1.6);
      dg.shake();
      dg.pop('PLASK!', ix, iy - 120, { size: 66, color: '#dff4ff' });
      const ring = dg.prop(`<ellipse rx="40" ry="12" fill="none" stroke="#e6f4ff" stroke-width="5" stroke-opacity=".7"/>`, 'fx');
      Eng.tween(1100, (t) => { place(ring, ix, iy, 1 + t * 9, 1 + t * 9); ring.style.opacity = 1 - t; }, E.out).then(() => ring.remove());
      await Promise.all(boats.map((b, i) => Eng.wait(120 + i * 110).then(() => capsize(dg, b, 600))));
      await Eng.tween(700, (t) => { o.y = 260 * t; ap(); }, E.in);
      tr.remove();
    },

    async vaffellukt(dg, boats) {
      const b = boats[0];
      const p = dg.pos(b);
      const steam = dg.prop([0, 1, 2].map((i) => `<path d="M0 ${i * 16} q20 -10 40 0 t40 0 t40 0 t40 0" stroke="#f3e2c4" stroke-opacity=".55" stroke-width="3" fill="none" stroke-linecap="round"/>`).join('') + `<g transform="translate(-30 10)">${D.waffle()}</g>`, 'fx');
      await Eng.tween(1400, (t) => place(steam, lerp(-180, p.x - 260 * b.s, t), p.y - 120 * b.s, b.s * 1.1), E.out);
      dg.pop('Snif snif…', p.x, p.y - 140 * b.s, { size: 34, color: '#f5ddb0', rot: -6 });
      S().pop();
      const x0 = b.ox;
      let k = 0;
      await Eng.tween(2000, (t) => { b.ox = x0 - 1500 * E.in(t); dg.setAct(b); if (k++ % 4 === 0) { const q = dg.pos(b); dg.fx.splash(q.x + 50 * b.s, q.y, 3, false); } }, E.linear);
      steam.remove();
      dg.hide(b);
    },

    async volleyball(dg, boats, beat, last) {
      const b = boats[0];
      const p = dg.pos(b);
      await dg.camTo(p.x, p.y - 110, last ? 900 : 1100, 600);
      const L = dg.prop(A.orca(), 'fx'), R = dg.prop(A.orca(), 'fx');
      const span = 230 * b.s;
      const jump = (el, x0, dir) => Eng.tween(650, (t) => place(el, x0 + dir * 60 * t, p.y + 30 - Math.sin(t * Math.PI) * 170 * b.s, -dir * b.s * 1.1, b.s * 1.1, dir * lerp(-30, 40, t)), E.linear);
      place(L, -9999, 0, 1); place(R, -9999, 0, 1);
      let side = 1;
      for (let k = 0; k < 3; k++) {
        const el = side > 0 ? L : R;
        jump(el, p.x - side * span - side * 40, side);
        await Eng.wait(260);
        S().boing();
        dg.pop(k === 2 ? 'SMASH!' : 'POING!', p.x, p.y - 220 * b.s, { size: 44, color: '#d0e6ff', rot: side * 8, life: 700 });
        const fromX = b.ox;
        const toX = (side > 0 ? 1 : -1) * span * 0.9;
        await Eng.tween(620, (t) => { b.ox = lerp(fromX, toX, t); b.ay = -Math.sin(t * Math.PI) * 220; b.ar += 9 * side; dg.setAct(b); }, E.linear);
        side = -side;
      }
      dg.fx.splash(p.x + b.ox, p.y, 34, false);
      S().splash(1.1);
      b.ar = 180; dg.setAct(b);
      await sink(dg, b, { dur: 900, tilt: 0 });
      L.remove(); R.remove();
      await dg.camReset();
    },

    async hurtigrutebolge(dg, boats) {
      const ship = dg.prop(A.liner(), 'back');
      const o = { x: 1950 };
      const ap = () => place(ship, o.x, SEA + 34, -0.55, 0.55);
      ap();
      S().horn(1.4);
      dg.pop('TUUUT!', 800, SEA - 120, { size: 70, color: '#f6bd47', rot: -4 });
      Eng.tween(3600, (t) => { o.x = lerp(1950, -800, t); ap(); }, E.linear).then(() => ship.remove());
      await Eng.wait(900);
      const wave = dg.prop('<path d="M-100 0 Q400 -26 800 0 T1700 0 L1700 22 Q800 6 -100 22 Z" fill="#e8f4ff" fill-opacity=".35"/>', 'fx');
      const ys = boats.map((b) => b.y + b.oy);
      const hit = new Set();
      const st0 = dg.storm;
      dg.pop('BØLGE!', 800, SEA + 60, { size: 54, color: '#dff4ff', rot: 4 });
      const caps = [];
      await Eng.tween(1500, (t) => {
        const wy = lerp(SEA + 20, 920, t);
        place(wave, 0, wy, 1);
        dg.storm = st0 + Math.sin(t * Math.PI) * 0.6;
        boats.forEach((b, i) => { if (!hit.has(i) && wy >= ys[i] - 10) { hit.add(i); caps.push(capsize(dg, b, 520)); } });
      }, E.linear);
      wave.remove();
      dg.storm = st0;
      boats.forEach((b, i) => { if (!hit.has(i)) caps.push(capsize(dg, b, 520)); });
      await Promise.all(caps);
    },

    async amulett(dg, boats) {
      const b = boats[0];
      const s = dg.sail(b);
      await dg.camTo(s.x, s.y + 10, 860, 600);
      S().roar();
      const t1 = tentacleFor(dg, b, 1);
      await Eng.tween(600, (t) => { t1.o.grow = 0.65 * t; t1.apply(); }, E.out);
      await Eng.tween(700, (t) => { b.ay = -120 * t; b.ar = Math.sin(t * 9) * 10; dg.setAct(b); t1.o.grow = 0.65 + 0.35 * t; t1.apply(); }, E.out);
      const tooth = b.g.querySelector('.fb-tooth');
      S().sparkle();
      const q = dg.sail(b);
      dg.fx.sparkles(q.x, q.y - 60 * b.s, 40, '#ffe08a');
      dg.pop('DRAUGENS TANN!', q.x, q.y - 150 * b.s, { size: 46, color: '#ffe08a', rot: -5 });
      if (tooth) Eng.tween(700, (t) => tooth.setAttribute('transform', `translate(0 -128) scale(${(0.75 + Math.sin(t * Math.PI) * 0.9).toFixed(3)})`), E.linear);
      await Eng.tween(500, (t) => { t1.o.sway = Math.sin(t * 30) * 10 * (1 - t); t1.apply(); }, E.linear);
      await Eng.tween(450, (t) => { t1.o.grow = 1 - t; t1.apply(); b.ay = -120 * (1 - t); dg.setAct(b); }, E.in);
      t1.el.remove();
      b.ar = 0; dg.setAct(b);
      dg.fx.splash(q.x, dg.pos(b).y, 20, false);
      S().splash(0.7);
      dg.pop('Reddet!', q.x, q.y - 120 * b.s, { size: 40, color: '#5ef2b5', rot: 4 });
      if (tooth) Eng.tween(800, (t) => { tooth.style.opacity = 1 - t; }, E.linear).then(() => tooth.remove());
      await Eng.wait(500);
      await dg.camReset();
    },

    /* Finalen: soloppgang, Henningsvær og Kraken med premien */
    async finale(dg, d) {
      const surv = d.winners.map((no, k) => ({ b: dg.byNo.get(no), p: dg.pax.get(no), rank: k + 1 })).filter((x) => x.b && !x.b.gone);
      const order = surv.slice().sort((a, b) => a.b.x - b.b.x);
      const n = order.length;
      const step = n > 1 ? Math.min(170, 560 / (n - 1)) : 0;
      const starts = order.map((s) => ({ ox: s.b.ox, oy: s.b.oy, sc: s.b.s }));
      await Eng.tween(2400, (t) => order.forEach((s, k) => {
        const tx = 560 + k * step, ty = SEA + 128;
        s.b.ox = lerp(starts[k].ox, tx - s.b.x, t); s.b.oy = lerp(starts[k].oy, ty - s.b.y, t);
        s.b.s = lerp(starts[k].sc, 0.95, t);
      }), E.inOut);
      const kr = dg.prop(D.krakenHead(), 'back');
      const ko = { y: 200 };
      const kap = () => place(kr, 1290, SEA + 150 + ko.y, 0.7);
      kap();
      S().roar();
      await Eng.tween(1500, (t) => { ko.y = 200 * (1 - t); kap(); }, E.out);
      dg.pop('God morgen!', 1290, SEA - 40, { size: 40, color: '#ffd0e4', rot: -4, life: 1400 });
      const arm = dg.prop(D.tentacle(), 'back');
      const bottle = dg.prop(D.bottle(), 'fx');
      const armX = 1140, armY = SEA + 160;
      await Eng.tween(900, (t) => { place(arm, armX, armY, -0.55, 0.55 * t, -10); place(bottle, armX - 20, armY - 170 * t, 0.9); }, E.out);
      for (let i = surv.length - 1; i >= 0; i--) {
        const { b, p, rank } = surv[i];
        const tag = svgEl('g', { transform: 'translate(0 -36)' }, A.nameTag(shortName(p.name), `${rank}. PLASS`, rank % 2 === 0 ? 30 : 0));
        b.act.appendChild(tag);
        dg.markWinner(p, rank);
        dg.el.ev.innerHTML = `<div class="evcard is-final" style="--ec:#ffe08a"><div class="ec-ico">${['🥇', '🥈', '🥉'][rank - 1] || '🏁'}</div><div><div class="ec-meta">${rank}. plass · færing ${u.esc(p.label)}</div><h3 class="ec-title">${u.esc(p.name)}</h3><p class="ec-text">${rank === 1 ? 'Kraken rekker frem premien. Innholdet er urelatert.' : 'Overlevde natta på Vestfjorden.'}</p></div></div>`;
        dg.announce(`${rank}. plass`, '', 1500);
        const q = dg.sail(b);
        dg.fx.sparkles(q.x, q.y - 60, 24, rank === 1 ? '#ffe08a' : '#c8ffe6');
        if (rank === 1) {
          S().fanfare();
          const bx0 = armX - 20, by0 = armY - 170;
          await Eng.tween(1200, (t) => place(bottle, lerp(bx0, q.x + 30, t), lerp(by0, q.y - 20, t) - Math.sin(t * Math.PI) * 220, 0.9 - t * 0.4, null, t * 360), E.inOut);
          dg.fx.sparkles(q.x, q.y - 30, 50, '#ffe08a');
          dg.fx.confetti(220);
          S().pop();
        } else { S().ding(); await Eng.wait(1400); }
      }
      await Eng.wait(2600);
    },
  };

  FL.DAnims = DAnims;
})();
