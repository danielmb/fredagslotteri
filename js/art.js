/* Fredagslotteriet – SVG-kunst (alt tegnes i kode, ingen bildefiler) */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u;
  const f1 = (n) => Math.round(n * 10) / 10;

  /* ---------- Fjell (sømløst flisbare) ---------- */
  function ridge(seed, { w = 1600, base, amp, step = 16, sharp = 1.6, jag = 0.35, floor = 900 }) {
    const r = u.mulberry32(seed);
    const comps = [1, 2, 3, 4, 6, 9, 13].map((k) => ({ k, a: (r() * 0.7 + 0.3) / Math.pow(k, 0.85), ph: r() * Math.PI * 2 }));
    const N = Math.round(w / step);
    const noise = Array.from({ length: N }, () => r() - 0.5);
    const hs = [];
    for (let i = 0; i <= N; i++) {
      let h = 0;
      comps.forEach((c) => { h += c.a * Math.sin(((i * step) / w) * Math.PI * 2 * c.k + c.ph); });
      hs.push(h);
    }
    const min = Math.min(...hs), max = Math.max(...hs);
    const pts = hs.map((h, i) => {
      let n = Math.pow((h - min) / (max - min), sharp);
      n += noise[i % N] * jag * 0.22 * (0.4 + n);
      return [i * step, f1(base - n * amp)];
    });
    let line = `M0 ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) line += ` L${pts[i][0]} ${pts[i][1]}`;
    return { fill: `${line} L${w} ${floor} L0 ${floor} Z`, line };
  }
  let gid = 0;
  function mountainLayer(seed, o) {
    const w = o.w || 1600;
    const { fill, line } = ridge(seed, o);
    const id = 'mg' + (++gid);
    const one = `<path d="${fill}" fill="url(#${id})"/>` + (o.rim ? `<path d="${line}" fill="none" stroke="${o.rim}" stroke-width="1.3" stroke-opacity="${o.rimO || 0.45}"/>` : '');
    return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.top}"/><stop offset="${o.mid || 0.4}" stop-color="${o.color}"/><stop offset="1" stop-color="${o.bottom || o.color}"/></linearGradient></defs>`
      + `<g>${one}</g><g transform="translate(${w} 0)">${one}</g>`;
  }
  function islands(seed, { w = 1600, base = 560, color = '#0b1830', top = '#1a2c52', count = 5 }) {
    const r = u.mulberry32(seed);
    const id = 'ig' + (++gid);
    let paths = '';
    let x = 60 + r() * 100;
    for (let i = 0; i < count && x < w - 220; i++) {
      const wd = 140 + r() * 260;
      const h = 22 + r() * 58;
      const pk = 0.25 + r() * 0.5;
      const x0 = x, x1 = x + wd, xp = x + wd * pk;
      paths += `<path d="M${f1(x0)} ${base} C${f1(x0 + wd * 0.12)} ${f1(base - h * 0.5)} ${f1(xp - wd * 0.18)} ${f1(base - h)} ${f1(xp)} ${f1(base - h)} C${f1(xp + wd * 0.2)} ${f1(base - h)} ${f1(x1 - wd * 0.1)} ${f1(base - h * 0.35)} ${f1(x1)} ${base} Z" fill="url(#${id})"/>`;
      x = x1 + 80 + r() * 220;
    }
    return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${color}"/></linearGradient></defs><g>${paths}</g><g transform="translate(${w} 0)">${paths}</g>`;
  }
  function stars(seed, n, w = 1600, h = 470) {
    const r = u.mulberry32(seed);
    let s = '';
    for (let i = 0; i < n; i++) {
      const rad = r() < 0.08 ? 1.7 : 0.5 + r() * 0.9;
      const tw = r() < 0.3 ? ` class="twinkle" style="animation-delay:${f1(-r() * 3)}s"` : '';
      s += `<circle cx="${f1(r() * w)}" cy="${f1(r() * h * (0.35 + r() * 0.65))}" r="${f1(rad)}" fill="#fff" opacity="${f1(0.35 + r() * 0.6)}"${tw}/>`;
    }
    return s;
  }
  function waveLines(seed, { w = 1600, y0, y1, rows, alpha = 0.5 }) {
    const r = u.mulberry32(seed);
    let s = '';
    for (let i = 0; i < rows; i++) {
      const t = i / Math.max(1, rows - 1);
      const y = y0 + (y1 - y0) * Math.pow(t, 1.35);
      const len = 10 + t * 70;
      const n = Math.round(10 - t * 5);
      for (let j = 0; j < n; j++) {
        const x = r() * (w - len - 4);
        s += `<path d="M${f1(x)} ${f1(y)} q${f1(len / 2)} ${f1(-1 - t * 2)} ${f1(len)} 0" stroke="#cfe6ff" stroke-opacity="${f1((0.12 + t * 0.32) * alpha)}" stroke-width="${f1(1 + t * 1.6)}" fill="none" stroke-linecap="round"/>`;
      }
    }
    return `<g>${s}</g><g transform="translate(${w} 0)">${s}</g>`;
  }
  function frontWave(w = 1600, y = 640) {
    let d = `M0 ${y}`;
    const seg = 80;
    for (let x = 0; x < w; x += seg) d += ` q${seg / 4} -5 ${seg / 2} 0 t${seg / 2} 0`;
    d += ` L${w} 900 L0 900 Z`;
    const p = `<path d="${d}" fill="url(#frontSea)"/>`;
    return `<g>${p}</g><g transform="translate(${w} 0)">${p}</g>`;
  }

  /* ---------- Hurtigbåten «MS Fredag» (ser mot høyre, vannlinje y=0) ---------- */
  function boatWake() {
    return `<path d="M-760 6 Q-430 -1 -282 2 L-282 10 Q-430 13 -760 14 Z" fill="rgba(225,240,255,.42)"/>`
      + `<path class="wake-dash" d="M-820 9 L-290 5" stroke="#fff" stroke-width="3" stroke-dasharray="26 34" stroke-opacity=".75" fill="none"/>`
      + `<path class="wake-dash" d="M-700 16 L-300 11" stroke="#fff" stroke-width="2" stroke-dasharray="12 40" stroke-opacity=".55" fill="none" style="animation-duration:.7s"/>`
      + `<path d="M258 -8 Q292 -16 322 2 Q298 6 268 8 Z" fill="#fff" fill-opacity=".85"/>`;
  }
  function boatBack(seed = 7) {
    const r = u.mulberry32(seed);
    let panes = '';
    for (let x = -126; x <= 132; x += 27) {
      panes += `<rect x="${x}" y="-102" width="23" height="25" rx="3" fill="#ffcf73" fill-opacity="${f1(0.55 + r() * 0.4)}"/>`;
      if (r() < 0.45) panes += `<circle cx="${x + 11.5}" cy="-88" r="5" fill="#3a2414" fill-opacity=".45"/><path d="M${x + 4} -77 q7.5 -9 15 0" fill="#3a2414" fill-opacity=".45"/>`;
    }
    return ''
      + `<path d="M-284 -12 L274 -12 L262 10 L-270 10 Q-284 10 -284 -2 Z" fill="#132539"/>`
      + `<path d="M-284 -58 L232 -60 Q276 -58 298 -40 L272 -10 L-284 -10 Z" fill="#f1ede4"/>`
      + `<path d="M-284 -36 L250 -38 Q276 -37 290 -31 L286 -25 L-284 -24 Z" fill="#ee4a2f"/>`
      + `<path d="M-284 -21 L283 -22 L281 -19 L-284 -18 Z" fill="#132539" fill-opacity=".85"/>`
      + `<text class="b-name" x="-56" y="-43">MS FREDAG</text><text class="b-port" x="-274" y="-43">BODØ</text>`
      + `<path d="M-160 -58 L-160 -112 Q-160 -122 -150 -122 L148 -122 Q168 -122 182 -108 L230 -60 Z" fill="#f7f4ec"/>`
      + `<path d="M-128 -106 L148 -106 Q160 -106 170 -97 L196 -74 L-128 -74 Q-132 -74 -132 -78 L-132 -102 Q-132 -106 -128 -106 Z" fill="#0f1d2c"/>`
      + panes
      + `<rect x="-155" y="-104" width="19" height="45" rx="3" fill="#dfe6ea" stroke="#9fb0bd"/><rect x="-151" y="-99" width="11" height="14" rx="2" fill="#ffcf73" fill-opacity=".8"/><circle cx="-139.5" cy="-80" r="1.6" fill="#5f7891"/>`
      + `<path d="M28 -122 L28 -150 Q28 -158 36 -158 L116 -158 Q130 -158 140 -148 L166 -122 Z" fill="#f7f4ec"/>`
      + `<path d="M38 -152 L116 -152 Q126 -152 134 -144 L150 -128 L38 -128 Z" fill="#0f1d2c"/>`
      + `<rect x="46" y="-136" width="40" height="3" rx="1.5" fill="#5ef2b5" fill-opacity=".35"/><rect x="96" y="-137" width="14" height="4" rx="1.5" fill="#ffcf73" fill-opacity=".35"/>`
      + `<rect x="66" y="-204" width="4" height="46" fill="#c9d3da"/>`
      + `<g transform="translate(68 -204)"><rect class="b-radar" x="-24" y="-3" width="48" height="5" rx="2" fill="#e6ecef"/></g>`
      + `<circle cx="68" cy="-212" r="11" fill="#fff" fill-opacity=".12"/><circle class="b-blink" cx="68" cy="-212" r="3.5" fill="#fff"/>`
      + `<circle cx="150" cy="-126" r="9" fill="#3dff9a" fill-opacity=".18"/><circle cx="150" cy="-126" r="3.2" fill="#3dff9a"/>`
      + `<rect x="-280" y="-124" width="3" height="66" fill="#c9d3da"/>`
      + `<g transform="translate(-278.5 -124)"><g class="b-flag" style="transform-origin:right center">`
      + `<rect x="-40" y="0" width="40" height="29" fill="#ba0c2f"/><rect x="-18.2" y="0" width="7.3" height="29" fill="#fff"/><rect x="-40" y="10.9" width="40" height="7.3" fill="#fff"/>`
      + `<rect x="-16.4" y="0" width="3.6" height="29" fill="#00205b"/><rect x="-40" y="12.7" width="40" height="3.6" fill="#00205b"/></g></g>`;
  }
  function boatRails() {
    let s = '<g stroke="#e3e9ec" stroke-width="2" fill="none" stroke-linecap="round">';
    s += '<path d="M-282 -82 L-162 -82 M-282 -70 L-162 -70"/>';
    for (let x = -282; x <= -162; x += 20) s += `<path d="M${x} -82 V-58"/>`;
    s += '<path d="M-156 -140 L22 -140"/>';
    for (let x = -156; x <= 22; x += 22.25) s += `<path d="M${f1(x)} -140 V-122"/>`;
    s += '</g>';
    s += '<circle cx="-226" cy="-72" r="8" fill="none" stroke="#ee4a2f" stroke-width="4.5"/><circle cx="-226" cy="-72" r="8" fill="none" stroke="#fff" stroke-width="4.5" stroke-dasharray="6.3 6.3"/>';
    return s;
  }

  /* ---------- Passasjerer (hodet viser lodd-nummeret) ---------- */
  const torso = (fill) => `<path class="fig-torso" d="M-12 0 L-12 -21 Q-12 -32 0 -32 Q12 -32 12 -21 L12 0 Z" fill="${fill}"/>`;
  const iniSize = (s) => { const n = String(s || '').length; return n >= 4 ? 7.5 : n === 3 ? 9.5 : 11.5; };
  function figure(p) {
    return torso(p.color) + '<path d="M-12 -9 H12" stroke="rgba(0,0,0,.16)" stroke-width="2.5"/>'
      + '<circle class="fig-head" cx="0" cy="-44" r="13" fill="#f3ecdf"/>'
      + `<text class="fig-ini" x="0" y="-40" text-anchor="middle" fill="#0f1b29" style="font-size:${iniSize(p.ini)}px">${u.esc(p.ini)}</text>`;
  }
  function swimmer(p) {
    return '<ellipse cx="0" cy="1" rx="27" ry="6" fill="none" stroke="#dcefff" stroke-opacity=".6" stroke-width="2"/>'
      + `<path class="fig-torso" d="M-10 2 Q-10 -8 0 -8 Q10 -8 10 2 Z" fill="${p.color}"/>`
      + '<path class="swim-arm" d="M9 -5 Q21 -18 17 -31" stroke="#f3ecdf" stroke-width="4.5" stroke-linecap="round" fill="none"/>'
      + '<circle class="fig-head" cx="0" cy="-18" r="12" fill="#f3ecdf"/>'
      + `<text class="fig-ini" x="0" y="-14" text-anchor="middle" fill="#0f1b29" style="font-size:${iniSize(p.ini)}px">${u.esc(p.ini)}</text>`;
  }
  function chef() {
    return torso('#ffffff') + '<path d="M-12 -14 H12" stroke="#cfd8de" stroke-width="2"/>'
      + '<circle cx="0" cy="-44" r="13" fill="#f0cfb2"/>'
      + '<path d="M-11 -54 Q-17 -67 -6 -68 Q0 -77 7 -68 Q17 -67 11 -54 Z" fill="#fff" stroke="#cfd8de" stroke-width="1.5"/>'
      + '<path d="M-6 -39 Q-3 -36 0 -39 Q3 -36 6 -39" stroke="#3a2a1e" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
      + '<circle cx="-4.5" cy="-46" r="1.6" fill="#222"/><circle cx="4.5" cy="-46" r="1.6" fill="#222"/>';
  }
  function nameTag(text, sub, dy = 0) {
    const w = Math.max(70, text.length * 8.4 + 26);
    return `<g transform="translate(0 ${-92 - dy})"><rect x="${f1(-w / 2)}" y="-30" width="${f1(w)}" height="${sub ? 40 : 28}" rx="8" fill="#f3ecdf"/>`
      + `<path d="M-7 ${sub ? 10 : -2} L0 ${sub ? 18 : 6} L7 ${sub ? 10 : -2} Z" fill="#f3ecdf"/>`
      + (sub ? `<text class="tag-rank" x="0" y="-15" text-anchor="middle" fill="#c9381f">${u.esc(sub)}</text>` : '')
      + `<text class="tag-txt" x="0" y="${sub ? 2 : -11}" text-anchor="middle" fill="#0f1b29">${u.esc(text)}</text></g>`;
  }

  /* ---------- Dyr og farkoster ---------- */
  function eagle() { // ser mot høyre, klør i (0, 18)
    return '<g class="wing wing-back"><path d="M-4 -6 C-38 -58 -88 -66 -122 -44 C-96 -42 -72 -32 -54 -20 C-74 -22 -90 -14 -100 -4 C-68 -10 -38 -4 -4 4 Z" fill="#2f2117"/></g>'
      + '<path d="M-36 4 C-22 -10 20 -12 42 -4 C32 6 -10 14 -36 4 Z" fill="#4a3322"/>'
      + '<path d="M-36 3 L-60 -4 L-62 10 Z" fill="#f1ede4"/>'
      + '<circle cx="46" cy="-8" r="10.5" fill="#efe6d4"/><path d="M54 -11 L70 -6 L56 -1 Z" fill="#f6bd47"/><circle cx="49" cy="-10" r="1.8" fill="#111"/>'
      + '<path d="M-2 9 L-6 20 M7 9 L9 20" stroke="#f6bd47" stroke-width="3.2" stroke-linecap="round"/>'
      + '<g class="wing wing-front"><path d="M0 -4 C-8 -70 42 -98 100 -86 C74 -76 54 -62 44 -46 C64 -52 80 -48 90 -42 C58 -34 32 -20 10 2 Z" fill="#5a3d27"/></g>';
  }
  function gull() {
    return '<g class="gull-wing"><path d="M-30 0 Q-16 -16 0 -2 Q16 -16 30 0" stroke="#f4f7fa" stroke-width="4" fill="none" stroke-linecap="round"/></g>'
      + '<ellipse cx="0" cy="0" rx="12" ry="5" fill="#f4f7fa"/><path d="M11 -1 L19 1 L11 3 Z" fill="#f6bd47"/><circle cx="8" cy="-1.5" r="1.2" fill="#111"/>';
  }
  function orca() { // ser mot venstre
    return '<path d="M60 0 C40 -26 -30 -30 -62 -6 C-50 4 -20 10 20 8 C40 8 52 6 60 0 Z" fill="#0b0f14"/>'
      + '<path d="M6 -24 L-4 -56 L-14 -24 Z" fill="#0b0f14"/>'
      + '<path d="M-30 -10 C-38 -14 -46 -12 -50 -8 C-44 -6 -36 -6 -30 -10 Z" fill="#fff"/>'
      + '<path d="M30 4 C10 10 -30 8 -52 -2 C-40 6 -10 12 30 4 Z" fill="#e8eef2"/>'
      + '<path d="M60 0 L80 -16 L76 4 L82 18 Z" fill="#0b0f14"/>';
  }
  function liner(seed = 3) { // «Hurtigruta», ser mot høyre, vannlinje y=0
    const r = u.mulberry32(seed);
    let win = '';
    const row = (y, x0, x1) => { for (let x = x0; x <= x1; x += 14) if (r() < 0.85) win += `<rect x="${x}" y="${y}" width="8" height="6" fill="#ffd27a" fill-opacity="${f1(0.45 + r() * 0.5)}"/>`; };
    row(-82, -236, 226); row(-118, -188, 164); row(-148, -108, 96); row(-34, -280, 250);
    return '<path d="M-306 -46 L262 -50 Q300 -48 318 -24 L300 4 L-290 4 Q-306 -8 -306 -46 Z" fill="#14171c"/>'
      + '<path d="M-250 -46 L-250 -94 L210 -94 Q232 -94 244 -78 L256 -48 Z" fill="#ece8df"/>'
      + '<path d="M-200 -94 L-200 -130 L150 -130 Q170 -130 180 -114 L190 -94 Z" fill="#ece8df"/>'
      + '<path d="M-120 -130 L-120 -158 L84 -158 Q100 -158 108 -144 L114 -130 Z" fill="#ece8df"/>'
      + '<path d="M60 -152 L84 -152 Q96 -152 102 -142 L106 -136 L60 -136 Z" fill="#0f1d2c"/>'
      + win
      + '<path d="M-42 -158 L-36 -206 L12 -206 L18 -158 Z" fill="#c62828"/><path d="M-37 -206 L-36 -194 L12 -194 L12 -206 Z" fill="#111"/>'
      + '<rect x="120" y="-198" width="4" height="40" fill="#c9d3da"/><circle cx="122" cy="-202" r="3" fill="#fff"/>'
      + '<path d="M-290 2 Q-420 6 -560 10 L-560 14 Q-420 12 -288 8 Z" fill="rgba(225,240,255,.3)"/>';
  }
  function smallBoat(sign) { // ser mot venstre
    let panes = '';
    for (let x = -96; x <= 124; x += 22) panes += `<rect x="${x}" y="-77" width="17" height="13" rx="2" fill="#ffcf73" fill-opacity=".8"/>`;
    return '<path d="M-200 -40 Q-188 -52 -150 -52 L190 -50 L190 -8 L-176 -8 Z" fill="#f0e9dc"/>'
      + '<path d="M-196 -28 L190 -30 L190 -22 L-186 -20 Z" fill="#14a3a0"/>'
      + '<path d="M-176 -8 L190 -8 L184 8 L-166 8 Z" fill="#132539"/>'
      + '<path d="M-140 -52 L-110 -88 L150 -88 L150 -52 Z" fill="#f7f4ec"/>'
      + '<path d="M-126 -60 L-106 -82 L140 -82 L140 -62 Z" fill="#0f1d2c"/>' + panes
      + `<g transform="translate(0 -116)"><rect x="-74" y="-17" width="148" height="30" rx="5" fill="#0b1420" stroke="#f6bd47" stroke-width="2"/><text class="sign-txt" x="0" y="4" text-anchor="middle" fill="#f6bd47">← ${u.esc(sign)}</text></g>`
      + '<path d="M-176 -2 Q-214 -10 -238 4 Q-212 9 -176 7 Z" fill="#fff" fill-opacity=".8"/>';
  }

  /* ---------- Steder ---------- */
  const HOUSE = ['#6b2622', '#8e8a80', '#7d6426', '#2f465b', '#5a2b24', '#9a958a'];
  function houses(r, x0, x1, yb, n) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = x0 + ((x1 - x0) * (i + r() * 0.6)) / n;
      const w = 30 + r() * 26, h = 20 + r() * 16, y = yb - r() * 46;
      s += `<rect x="${f1(x)}" y="${f1(y - h)}" width="${f1(w)}" height="${f1(h)}" fill="${HOUSE[Math.floor(r() * HOUSE.length)]}"/>`;
      s += `<path d="M${f1(x - 3)} ${f1(y - h)} L${f1(x + w / 2)} ${f1(y - h - 13 - r() * 6)} L${f1(x + w + 3)} ${f1(y - h)} Z" fill="#141820"/>`;
      const k = 1 + Math.floor(r() * 3);
      for (let j = 0; j < k; j++) if (r() < 0.8) s += `<rect x="${f1(x + 5 + j * ((w - 12) / k))}" y="${f1(y - h + 6)}" width="7" height="7" fill="#ffd27a" fill-opacity="${f1(0.6 + r() * 0.4)}"/>`;
    }
    return s;
  }
  function lamp(x, h = 62) {
    return `<rect x="${x - 1.5}" y="${-12 - h}" width="3" height="${h}" fill="#3a404a"/><circle cx="${x}" cy="${-14 - h}" r="22" fill="url(#lampGlow)"/><circle cx="${x}" cy="${-14 - h}" r="4" fill="#ffe7a8"/>`;
  }
  function pier(x0, x1) {
    let s = `<rect x="${x0}" y="-12" width="${x1 - x0}" height="14" fill="#25262b"/><rect x="${x0}" y="-12" width="${x1 - x0}" height="3" fill="#3d3f46"/>`;
    for (let x = x0 + 10; x < x1; x += 46) s += `<rect x="${x}" y="2" width="6" height="12" fill="#1a1b1f"/>`;
    for (let x = x0 + 40; x < x1; x += 160) s += `<rect x="${x}" y="-18" width="9" height="7" rx="2" fill="#16171a"/>`;
    return s;
  }
  function signBoard(x, name) {
    const w = Math.max(130, name.length * 15 + 40);
    return `<g transform="translate(${x} -12)"><rect x="${f1(-w / 2 + 8)}" y="-58" width="4" height="58" fill="#3a404a"/><rect x="${f1(w / 2 - 12)}" y="-58" width="4" height="58" fill="#3a404a"/>`
      + `<rect x="${f1(-w / 2)}" y="-92" width="${f1(w)}" height="36" rx="4" fill="#0f2a4a" stroke="#dce6f0" stroke-width="2"/>`
      + `<text class="sign-txt" x="0" y="-68" text-anchor="middle" fill="#f3ecdf">${u.esc(name.toUpperCase())}</text></g>`;
  }
  function port(name, seed) {
    const r = u.mulberry32(seed);
    return '<path d="M-600 2 C-480 -70 -400 -170 -230 -158 C-120 -150 -60 -100 40 -122 C170 -150 320 -190 450 -110 C510 -72 560 -34 600 2 Z" fill="#0a172d"/>'
      + houses(r, -520, 480, -8, 11)
      + '<rect x="-130" y="-66" width="150" height="54" fill="#aaa69c"/><path d="M-138 -66 L-55 -92 L28 -66 Z" fill="#20242c"/>'
      + '<rect x="-118" y="-56" width="36" height="22" fill="#ffd27a" fill-opacity=".85"/><rect x="-74" y="-56" width="36" height="22" fill="#ffd27a" fill-opacity=".7"/><rect x="-30" y="-56" width="36" height="22" fill="#ffd27a" fill-opacity=".8"/>'
      + pier(-470, 430) + lamp(-400) + lamp(-180) + lamp(150) + signBoard(330, name);
  }
  function startPier() { return port('Sandnessjøen', 991); }
  function globe() {
    return '<path d="M-140 4 Q-100 -28 -30 -32 Q40 -36 96 -22 Q134 -12 146 4 Z" fill="#0b182d"/>'
      + '<rect x="-5" y="-62" width="10" height="34" fill="#8a9bb0"/>'
      + '<g transform="translate(0 -100)" fill="none" stroke="#dce6f0" stroke-width="2.5"><circle r="36"/><ellipse rx="15" ry="36"/><ellipse rx="36" ry="12"/><path d="M-36 0 H36 M0 -36 V36"/></g>'
      + '<circle cx="0" cy="-100" r="60" fill="url(#lampGlow)" opacity=".5"/>'
      + '<text class="sign-txt" x="0" y="-150" text-anchor="middle" fill="#cfe9ff">66°33′N</text>';
  }
  function bodo() {
    const r = u.mulberry32(2026);
    let city = '';
    let x = -700;
    while (x < 1280) {
      const w = 40 + r() * 60, h = 40 + r() * (x > 200 && x < 700 ? 150 : 90);
      city += `<rect x="${f1(x)}" y="${f1(-12 - h)}" width="${f1(w)}" height="${f1(h)}" fill="${r() < 0.5 ? '#1b2436' : '#232c40'}"/>`;
      for (let wy = -12 - h + 8; wy < -24; wy += 14) for (let wx = x + 6; wx < x + w - 10; wx += 12) if (r() < 0.42) city += `<rect x="${f1(wx)}" y="${f1(wy)}" width="6" height="7" fill="#ffd27a" fill-opacity="${f1(0.45 + r() * 0.5)}"/>`;
      x += w + 4 + r() * 10;
    }
    return '<path d="M-900 2 C-700 -120 -520 -250 -300 -260 C-120 -268 0 -200 160 -230 C340 -262 520 -330 760 -250 C960 -180 1160 -120 1400 2 Z" fill="#0d1a33"/>'
      + '<path d="M-300 -260 C-260 -262 -230 -250 -200 -244" stroke="#9fb3d6" stroke-opacity=".4" stroke-width="3" fill="none"/>'
      + city
      + '<g transform="translate(-120 -12)"><rect x="-12" y="-150" width="24" height="150" fill="#2a3346"/><path d="M-12 -150 L0 -230 L12 -150 Z" fill="#2a3346"/><path d="M0 -246 V-228 M-6 -240 H6" stroke="#ffd27a" stroke-width="2.5"/><rect x="-5" y="-130" width="10" height="16" fill="#ffd27a" fill-opacity=".7"/></g>'
      + '<path d="M-600 -12 L-600 -70 L-360 -96 L-300 -12 Z" fill="#203a5c"/><path d="M-590 -20 L-590 -64 L-370 -86 L-320 -20 Z" fill="#7fd0ff" fill-opacity=".25"/>'
      + '<g stroke="#e9eef2" stroke-width="3">' + [640, 710, 780, 850].map((sx) => `<path d="M${sx} -12 V-210"/>`).join('') + '</g>'
      + [640, 710, 780, 850].map((sx) => `<circle cx="${sx}" cy="-214" r="40" fill="url(#lampGlow)"/><rect x="${sx - 12}" y="-220" width="24" height="10" fill="#fff8d2"/>`).join('')
      + '<g transform="translate(-690 -12)" stroke="#5c6878" stroke-width="5" fill="none"><path d="M0 0 V-150 L120 -150 M0 -150 L-40 -150 M0 -130 L90 -150"/><path d="M110 -150 V-110" stroke-width="2"/></g>'
      + pier(-760, 760) + lamp(-640) + lamp(-250) + lamp(-60) + lamp(240) + lamp(600)
      + '<g transform="translate(330 -24)"><rect x="-6" y="-12" width="232" height="10" fill="#3a404a"/>'
      + '<text x="110" y="-24" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="900" font-size="72" letter-spacing="6" fill="#fff6dc" stroke="#f6bd47" stroke-width="2" style="filter:drop-shadow(0 0 14px rgba(246,189,71,.75))">BODØ</text></g>';
  }

  /* ---------- Rekvisitter ---------- */
  const heart = (c = '#ee4a2f') => `<path d="M0 7 C-14 -4 -11 -18 0 -10 C11 -18 14 -4 0 7 Z" fill="${c}"/>`;
  function virus() {
    let s = '<circle r="8" fill="#7ad36b"/>';
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; s += `<circle cx="${f1(Math.cos(a) * 11)}" cy="${f1(Math.sin(a) * 11)}" r="2.6" fill="#5fb553"/>`; }
    return s + '<circle cx="-2.5" cy="-2" r="1.6" fill="#244d1e"/><circle cx="3" cy="-2" r="1.6" fill="#244d1e"/>';
  }
  const bucket = () => '<path d="M-16 -18 L16 -18 L12 14 L-12 14 Z" fill="#9aa7b4"/><path d="M-16 -18 Q0 -38 16 -18" stroke="#c9d3da" stroke-width="2.5" fill="none"/><ellipse cx="0" cy="-18" rx="16" ry="4" fill="#7fd0ff"/>';
  const iceBlock = () => '<rect x="-24" y="-66" width="48" height="72" rx="8" fill="#cbeeff" fill-opacity=".35" stroke="#f2fbff" stroke-opacity=".85" stroke-width="2"/><path d="M-14 -56 L-4 -46 M8 -60 L16 -50" stroke="#fff" stroke-opacity=".8" stroke-width="2"/>';
  const ticket = () => '<rect x="-11" y="-7" width="22" height="14" rx="2" fill="#f3ecdf"/><rect x="-11" y="-7" width="6" height="14" fill="#ee4a2f"/>';

  FL.Art = { ridge, mountainLayer, islands, stars, waveLines, frontWave, boatWake, boatBack, boatRails, figure, swimmer, chef, nameTag, eagle, gull, orca, liner, smallBoat, port, startPier, globe, bodo, heart, virus, bucket, iceBlock, ticket };
})();
