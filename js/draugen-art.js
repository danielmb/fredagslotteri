/* Fredagslotteriet – «Draugen»: SVG-kunst (nordlandsbåter, sagnvesener og Henningsvær) */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u;
  const f1 = (n) => Math.round(n * 10) / 10;

  /* Nordlandsbåt (færing) med råseil – nummeret står på seilet. Vannlinje y=0, baugen mot høyre. */
  function faering(p) {
    const lab = String(p.label);
    const fs = lab.length >= 4 ? 17 : lab.length === 3 ? 22 : 29;
    return ''
      + '<ellipse class="fb-foam" cx="0" cy="1" rx="62" ry="5" fill="#dcefff" fill-opacity=".28"/>'
      + '<g class="fb-act"><g class="fb-rock">'
      + '<path d="M-46 -12 L-30 4" stroke="#c9b48a" stroke-width="3" stroke-linecap="round" class="fb-oar"/>'
      + '<path d="M-62 -44 C-60 -24 -56 -10 -46 -3 Q0 7 46 -3 C56 -10 60 -24 62 -44 L57 -44 C54 -28 50 -18 42 -14 L-42 -14 C-50 -18 -54 -28 -57 -44 Z" fill="#4f3422"/>'
      + `<path d="M-55 -36 C-52 -24 -48 -16 -42 -14 L42 -14 C48 -16 52 -24 55 -36 L53 -32 C50 -22 46 -18 40 -17 L-40 -17 C-46 -18 -50 -22 -53 -32 Z" fill="${p.color}"/>`
      + '<path d="M-44 -8 Q0 0 44 -8" stroke="#6e4a30" stroke-width="2" fill="none"/>'
      + '<circle cx="-24" cy="-25" r="6.5" fill="#f0d2b8"/><path d="M-31 -14 L-31 -19 Q-31 -21 -24 -21 Q-17 -21 -17 -19 L-17 -14 Z" fill="' + p.color + '"/>'
      + '<rect x="-1.6" y="-106" width="3.2" height="94" fill="#3a2a1d"/>'
      + '<rect x="-36" y="-101" width="72" height="3.4" rx="1.5" fill="#3a2a1d"/>'
      + '<path class="fb-sail" d="M-33 -98 Q0 -93 33 -98 L31 -36 Q0 -28 -31 -36 Z" fill="#efe6d4"/>'
      + `<path d="M-33 -98 L-25 -97 L-23 -35 L-31 -36 Z M33 -98 L25 -97 L23 -35 L31 -36 Z" fill="${p.color}" fill-opacity=".9"/>`
      + `<text class="fb-num" x="0" y="${-58 + fs * 0.36}" text-anchor="middle" font-size="${fs}">${u.esc(lab)}</text>`
      + '</g></g>';
  }

  /* Draugen: halv båt, hodeløs fisker i oljehyre, grønn lykt */
  function draugenBoat() {
    return '<ellipse cx="20" cy="-40" rx="110" ry="80" fill="url(#dGhost)"/>'
      + '<path d="M-14 -14 L52 -14 C60 -24 63 -34 64 -46 L70 -46 C66 -20 58 -6 48 -2 Q20 6 -12 4 L-6 -1 L-14 -5 L-6 -9 Z" fill="#9fe8c8" fill-opacity=".28" stroke="#c8ffe6" stroke-opacity=".7" stroke-width="2"/>'
      + '<path d="M2 -14 L4 -54 Q6 -62 14 -64 L30 -64 Q38 -62 38 -54 L40 -14 Z" fill="#b8f5da" fill-opacity=".3" stroke="#d6fff0" stroke-opacity=".75" stroke-width="2"/>'
      + '<path d="M17 -64 Q21 -70 26 -64" stroke="#d6fff0" stroke-opacity=".7" stroke-width="2.5" fill="none"/>'
      + '<path d="M34 -56 L62 -84" stroke="#d6fff0" stroke-opacity=".8" stroke-width="5" stroke-linecap="round"/>'
      + '<circle cx="66" cy="-90" r="22" fill="url(#dLantern)"/><circle cx="66" cy="-90" r="5" fill="#eafff6"/>'
      + '<path d="M8 -40 q-4 10 2 18 q4 8 -1 16 M30 -38 q5 12 -1 22 q-4 8 2 14 M-4 -10 q-3 10 3 16" stroke="#6fd3a3" stroke-opacity=".7" stroke-width="2" fill="none"/>';
  }

  /* Tentakkel – base i (0,0), spissen ca. 300 opp */
  function tentacle() {
    let s = '<path d="M-28 0 C-34 -80 30 -140 18 -210 C10 -256 -30 -276 -22 -302 C-16 -314 -2 -310 -6 -297 C-10 -281 18 -262 27 -214 C42 -138 -6 -84 24 0 Z" fill="url(#dTent)"/>';
    [[-16, -40, 6.5], [-12, -82, 6], [0, -122, 5.5], [9, -160, 5], [6, -200, 4.4], [-5, -234, 3.8], [-13, -262, 3.2], [-10, -287, 2.6]].forEach(([x, y, r]) => { s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#efc0d3" fill-opacity=".85"/><circle cx="${x}" cy="${y}" r="${f1(r * 0.45)}" fill="#8a3358"/>`; });
    return s;
  }
  function krakenHead() {
    return '<ellipse cx="0" cy="-70" rx="170" ry="130" fill="url(#dTent)"/>'
      + '<ellipse cx="-60" cy="-150" rx="16" ry="10" fill="#c46a92" fill-opacity=".6"/><ellipse cx="40" cy="-170" rx="22" ry="12" fill="#c46a92" fill-opacity=".5"/><ellipse cx="90" cy="-110" rx="12" ry="8" fill="#c46a92" fill-opacity=".55"/>'
      + '<circle cx="-58" cy="-60" r="30" fill="#fff8e6"/><circle cx="58" cy="-60" r="30" fill="#fff8e6"/>'
      + '<circle class="kr-pupil" cx="-52" cy="-56" r="14" fill="#141018"/><circle class="kr-pupil" cx="64" cy="-56" r="14" fill="#141018"/>'
      + '<circle cx="-47" cy="-62" r="4.5" fill="#fff"/><circle cx="69" cy="-62" r="4.5" fill="#fff"/>'
      + '<path d="M-92 -100 Q-58 -118 -26 -98 M26 -98 Q58 -118 92 -100" stroke="#5a1f3b" stroke-width="7" stroke-linecap="round" fill="none"/>';
  }
  function bottle() {
    return '<path d="M-6 -70 L6 -70 L6 -52 Q18 -44 18 -28 L18 14 Q18 20 12 20 L-12 20 Q-18 20 -18 14 L-18 -28 Q-18 -44 -6 -52 Z" fill="#1f5a3c" stroke="#9fe0b8" stroke-opacity=".5" stroke-width="1.5"/>'
      + '<rect x="-7" y="-80" width="14" height="12" rx="2" fill="#8a2a3c"/>'
      + '<rect x="-15" y="-16" width="30" height="20" rx="2" fill="#efe6d4"/>'
      + '<text x="0" y="-3" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700" font-size="5.6" fill="#0f1b29">URELATERT</text>';
  }

  /* Kongekrabbeklo */
  function claw() {
    let s = '<path d="M-14 0 C-18 -24 -16 -46 -8 -62 L10 -62 C14 -46 14 -24 12 0 Z" fill="#b8381f"/>'
      + '<g class="claw-top"><path d="M-12 -60 C-46 -82 -44 -134 8 -146 C42 -150 58 -126 46 -110 C32 -122 2 -120 -2 -96 Z" fill="#d24a2c"/></g>'
      + '<g class="claw-bot"><path d="M-6 -64 C22 -70 44 -88 52 -104 C34 -94 12 -92 -6 -82 Z" fill="#c4402a"/></g>';
    [[-30, -96], [-34, -116], [-22, -134], [-2, -144], [20, -146]].forEach(([x, y]) => { s += `<path d="M${x} ${y} l-7 -5 l3 8 Z" fill="#f08a64"/>`; });
    return s;
  }

  /* Trollet på Vågakallen (silhuett over fjellkammen) */
  function troll() {
    return '<path d="M-150 120 C-150 40 -110 0 -60 -10 L60 -10 C110 0 150 40 150 120 Z" fill="#141b24"/>'
      + '<path d="M-70 -10 C-90 -60 -86 -130 -40 -160 C-10 -178 30 -176 56 -156 C92 -128 96 -60 70 -10 Z" fill="#18212c"/>'
      + '<path d="M-70 -120 l-26 -34 l30 10 l-6 -40 l26 26 l8 -40 l18 34 l18 -38 l12 40 l26 -30 l-4 40 l30 -14 l-22 36 Z" fill="#0e141b"/>'
      + '<circle cx="-24" cy="-104" r="9" fill="#f6d36a"/><circle cx="28" cy="-104" r="9" fill="#f6d36a"/>'
      + '<circle cx="-24" cy="-104" r="22" fill="#f6d36a" fill-opacity=".18"/><circle cx="28" cy="-104" r="22" fill="#f6d36a" fill-opacity=".18"/>'
      + '<path d="M0 -96 C12 -80 14 -54 -2 -44 C-16 -40 -18 -56 -8 -60" fill="#1d2733"/>'
      + '<g class="troll-arm"><path d="M100 20 C130 -20 150 -80 170 -140 L196 -132 C180 -70 158 -10 130 40 Z" fill="#141b24"/></g>';
  }
  function boulder() {
    return '<circle r="34" fill="#5f6469"/><circle cx="-10" cy="-8" r="9" fill="#4d5156"/><circle cx="12" cy="10" r="7" fill="#4d5156"/><circle cx="14" cy="-14" r="4" fill="#7a7f84"/><path d="M-28 6 Q-10 20 10 26" stroke="#3e4246" stroke-width="3" fill="none"/>';
  }

  /* Huldra på en holme, med kuhale */
  function huldra() {
    return '<path d="M-90 10 C-70 -18 -30 -26 0 -24 C40 -22 70 -12 90 10 Z" fill="#1b2430"/>'
      + '<circle cx="-40" cy="-30" r="34" fill="url(#dFire)"/><path d="M-46 -22 L-40 -40 L-34 -22 Z" fill="#ffb347"/><path d="M-43 -22 L-40 -32 L-37 -22 Z" fill="#fff1a8"/>'
      + '<path d="M-6 -24 L-14 -78 Q0 -86 14 -78 L6 -24 Z" fill="#ece5f2" fill-opacity=".92"/>'
      + '<circle cx="0" cy="-92" r="9" fill="#f3dcc8"/>'
      + '<path d="M-9 -96 C-22 -86 -22 -60 -16 -40 L-10 -42 C-14 -60 -12 -80 -4 -90 Z M9 -96 C22 -86 24 -64 18 -44 L12 -46 C16 -62 14 -82 4 -90 Z" fill="#d8b04e"/>'
      + '<path class="hul-tail" d="M4 -34 C30 -30 34 -6 22 4 C16 9 24 14 28 10" stroke="#c99a7a" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="28" cy="10" r="4" fill="#7a5a44"/>';
  }

  /* Malstrømmen – ringer i perspektiv */
  function whirlpool() {
    let s = '<ellipse rx="240" ry="78" fill="url(#dWhirl)"/>';
    [220, 175, 132, 92, 56].forEach((rx, i) => { s += `<ellipse class="wp-ring" rx="${rx}" ry="${f1(rx * 0.32)}" fill="none" stroke="#cfe8ff" stroke-opacity="${f1(0.25 + i * 0.12)}" stroke-width="${f1(2 + i * 0.6)}" stroke-dasharray="${f1(rx * 0.5)} ${f1(rx * 0.3)}" style="animation-duration:${f1(2.4 - i * 0.35)}s"/>`; });
    return s + '<ellipse rx="34" ry="11" fill="#02060a"/>';
  }

  function waffle() {
    return '<path d="M0 22 C-34 0 -30 -26 -12 -26 C-4 -26 0 -18 0 -14 C0 -18 4 -26 12 -26 C30 -26 34 0 0 22 Z" fill="#e3a14b"/>'
      + '<path d="M-20 -14 L18 -14 M-22 -4 L22 -4 M-16 6 L16 6 M-8 -24 L-8 14 M4 -22 L4 18 M14 -20 L14 8 M-18 -20 L-18 4" stroke="#b8782c" stroke-width="1.6"/>';
  }
  function tooth() {
    return '<circle r="30" fill="url(#dGold)"/><path d="M-14 -22 Q0 -34 14 -22" stroke="#c9a24a" stroke-width="2" fill="none"/><path d="M-8 -14 Q0 -18 8 -14 Q7 4 0 16 Q-7 4 -8 -14 Z" fill="#f5efe0" stroke="#d9c79a" stroke-width="1"/>';
  }
  function bolt(x0, y0, x1, y1) {
    let d = `M${f1(x0)} ${f1(y0)}`;
    const n = 9;
    for (let i = 1; i < n; i++) { const t = i / n; d += ` L${f1(x0 + (x1 - x0) * t + (Math.random() - 0.5) * 70)} ${f1(y0 + (y1 - y0) * t)}`; }
    d += ` L${f1(x1)} ${f1(y1)}`;
    return `<path d="${d}" stroke="#a9c8ff" stroke-opacity=".45" stroke-width="14" fill="none" stroke-linejoin="round"/><path d="${d}" stroke="#ffffff" stroke-width="4" fill="none" stroke-linejoin="round"/>`;
  }

  /* Skyer (to lag, flisbare) */
  function clouds(seed, { w = 1600, y0 = 40, y1 = 330, n = 7, dark = '#0b111b', rim = '#3b4a63' }) {
    const r = u.mulberry32(seed);
    let s = '';
    for (let i = 0; i < n; i++) {
      const cx = (w / n) * (i + 0.2 + r() * 0.6), cy = y0 + r() * (y1 - y0), sc = 0.7 + r() * 0.9;
      let blob = '';
      for (let k = 0; k < 5; k++) blob += `<ellipse cx="${f1(cx + (k - 2) * 52 * sc + r() * 20)}" cy="${f1(cy - Math.sin((k / 4) * Math.PI) * 26 * sc)}" rx="${f1((60 + r() * 40) * sc)}" ry="${f1((26 + r() * 16) * sc)}"/>`;
      s += `<g fill="${dark}" stroke="${rim}" stroke-opacity=".35" stroke-width="2">${blob}</g>`;
    }
    return `<g>${s}</g><g transform="translate(${w} 0)">${s}</g>`;
  }

  /* Henningsvær i morgengry: fjell, rorbuer, hjeller og fotballbanen på berget */
  function henningsvaer() {
    const r = u.mulberry32(7);
    let s = '<path d="M-760 0 L-700 -160 L-640 -120 L-580 -300 L-520 -210 L-470 -380 L-400 -250 L-340 -320 L-280 -200 L-220 -260 L-160 -150 L-100 -210 L-40 -90 L20 -150 L80 -60 L140 -120 L220 -40 L260 0 Z" fill="#4a3f5f"/>'
      + '<path d="M-470 -380 L-452 -330 L-488 -330 Z M-580 -300 L-566 -262 L-596 -262 Z" fill="#f2e4ee" fill-opacity=".8"/>';
    s += '<path d="M120 0 C140 -30 220 -40 320 -38 C420 -36 470 -26 500 0 Z" fill="#6d6a66"/>'
      + '<rect x="190" y="-46" width="250" height="10" fill="#3f8f4a"/><path d="M190 -46 h250 M315 -46 v10 M190 -36 h250" stroke="#f2f5f0" stroke-width="1.5" fill="none"/>'
      + '<path d="M192 -54 v8 M192 -54 h6 M438 -54 v8 M438 -54 h-6" stroke="#f2f5f0" stroke-width="1.5" fill="none"/>';
    for (let i = 0; i < 9; i++) {
      const x = -620 + i * 72 + r() * 20, w = 46 + r() * 14, h = 30 + r() * 12;
      s += `<path d="M${f1(x + 6)} 0 v14 M${f1(x + w - 6)} 0 v14" stroke="#2a211b" stroke-width="3"/>`
        + `<rect x="${f1(x)}" y="${f1(-h)}" width="${f1(w)}" height="${f1(h)}" fill="${r() < 0.75 ? '#a8322a' : '#e6c34a'}"/>`
        + `<path d="M${f1(x - 4)} ${f1(-h)} L${f1(x + w / 2)} ${f1(-h - 16)} L${f1(x + w + 4)} ${f1(-h)} Z" fill="#2b2a33"/>`
        + `<rect x="${f1(x + 8)}" y="${f1(-h + 8)}" width="9" height="9" fill="#ffd27a"/><rect x="${f1(x + w - 17)}" y="${f1(-h + 8)}" width="9" height="9" fill="#ffd27a" fill-opacity=".8"/>`;
    }
    for (let i = 0; i < 3; i++) {
      const x = -180 + i * 70;
      s += `<path d="M${x} 0 L${x + 14} -46 L${x + 28} 0 M${x + 50} 0 L${x + 64} -46 L${x + 78} 0 M${x + 14} -40 L${x + 64} -40" stroke="#5a4636" stroke-width="3" fill="none"/>`;
      for (let k = 0; k < 6; k++) s += `<path d="M${x + 20 + k * 8} -40 v14" stroke="#9aa3ab" stroke-width="3" stroke-linecap="round"/>`;
    }
    s += '<rect x="-700" y="-8" width="640" height="10" fill="#3a2f27"/>';
    return s;
  }

  const DEFS = `
    <linearGradient id="dSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03050a"/><stop offset=".35" stop-color="#09111e"/><stop offset=".5" stop-color="#132131"/><stop offset=".54" stop-color="#1f3043"/></linearGradient>
    <linearGradient id="dDawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26355e"/><stop offset=".28" stop-color="#6a5a8c"/><stop offset=".44" stop-color="#d97c74"/><stop offset=".53" stop-color="#f6b26b"/></linearGradient>
    <linearGradient id="dSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16292f"/><stop offset=".3" stop-color="#0d1a1f"/><stop offset="1" stop-color="#04090b"/></linearGradient>
    <linearGradient id="dSeaDawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a6a7c"/><stop offset=".25" stop-color="#3a4a62"/><stop offset="1" stop-color="#16222e"/></linearGradient>
    <linearGradient id="dTent" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#4a1a33"/><stop offset=".5" stop-color="#8c3460"/><stop offset="1" stop-color="#c25a86"/></linearGradient>
    <radialGradient id="dGhost"><stop offset="0" stop-color="#7affc4" stop-opacity=".35"/><stop offset="1" stop-color="#7affc4" stop-opacity="0"/></radialGradient>
    <radialGradient id="dLantern"><stop offset="0" stop-color="#b8ffde" stop-opacity=".9"/><stop offset="1" stop-color="#5ef2b5" stop-opacity="0"/></radialGradient>
    <radialGradient id="dFire"><stop offset="0" stop-color="#ffb347" stop-opacity=".7"/><stop offset="1" stop-color="#ff7a3a" stop-opacity="0"/></radialGradient>
    <radialGradient id="dGold"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".95"/><stop offset="1" stop-color="#f6bd47" stop-opacity="0"/></radialGradient>
    <radialGradient id="dWhirl"><stop offset="0" stop-color="#010407"/><stop offset=".55" stop-color="#0b2230" stop-opacity=".9"/><stop offset="1" stop-color="#0b2230" stop-opacity="0"/></radialGradient>
    <radialGradient id="dMoon"><stop offset="0" stop-color="#e8f0ff" stop-opacity=".45"/><stop offset="1" stop-color="#e8f0ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="dInk"><stop offset="0" stop-color="#000" stop-opacity="1"/><stop offset=".7" stop-color="#000" stop-opacity=".96"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <linearGradient id="dFog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe9e0" stop-opacity="0"/><stop offset=".5" stop-color="#cfe9e0" stop-opacity=".24"/><stop offset="1" stop-color="#cfe9e0" stop-opacity="0"/></linearGradient>
    <clipPath id="fbClip" clipPathUnits="userSpaceOnUse"><rect x="-400" y="-800" width="800" height="806"/></clipPath>`;

  FL.DArt = { faering, draugenBoat, tentacle, krakenHead, bottle, claw, troll, boulder, huldra, whirlpool, waffle, tooth, bolt, clouds, henningsvaer, DEFS };
})();
