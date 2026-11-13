/* Fredagslotteriet – «Keiservarden Grand Prix»: egen liten fysikkmotor for kuler, og løyper bygd av deler.
   Hele løpet simuleres først (deterministisk, med seed), og spilles deretter av.
   En løype er bare data: en liste med deler (start, rampe, vegg, hull, Glimt-hjul …).
   Originalløypa er beskrevet med de samme delene og gir nøyaktig samme løp som før. */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u;

  const R = 11;            // kuleradius (verdensenheter)
  const G = 1000;          // tyngdekraft
  const DT = 1 / 240;      // fysikk-steg
  const REC = 8;           // lagre hver 8. steg → 30 bilder i sekundet
  const T_MAX = 85;        // maks løpstid før resten «sitter fast»
  const GATE_T = 3.6;      // startporten åpner
  const ROLL = 0.25;       // rullemotstand ved kontakt (per sekund)
  const AIR = 0.03;
  const E_MM = 0.55;       // kule mot kule
  const VMAX = 700;
  const W_FAST = 5;        // Glimt-hjul raskere enn dette skyter kulene til værs (opp til 5 går alt som før)
  const W_MAX = 20;        // høyeste fart et Glimt-hjul kan få
  const V_LAUNCH = 2400;   // toppfart for en kule som er skutt ut av et raskt Glimt-hjul
  const FPS = 240 / REC;   // opptaket: 30 bilder i sekundet
  const ST = { RACE: 0, FIN: 1, OUT: 2, CARRY: 3, TUNNEL: 4 };
  const WORLD_W = 1600;    // løypa er alltid 1600 bred – høyden følger målet
  const MU_GRIP = 0.7;     // magneten på deler på skinne (styrke 100 %): kula blir med til plata heller mer enn rundt 35°
  const MAG_K = 1.5;       // over 100 % trekker magneten også kula inntil: 200 % = 1,5 × tyngden
  const MAG_R = 6;         // så nær plata må kula være for at magneten skal trekke den inntil
  const R_BIG = 16.5, R_SMALL = 7.5; // Kantina: vaffel gjør kula stor og tung, salat gjør den liten og lett
  const W_DOOR = 14;       // toppfart på svingdøra (radianer i sekundet)
  const DEG = Math.PI / 180;

  /* ---------- Originalløypa (1600 × 3720, y nedover) ---------- */
  const ORIGINAL_PIECES = [
    { type: 'start', x: 800, y: 300 },
    // Utforkjøring 1 → høyre
    { type: 'wall', ax: 610, ay: 262, bx: 610, by: 346 },
    { type: 'ramp', ax: 612, ay: 340, bx: 1460, by: 518 },
    { type: 'wall', ax: 1500, ay: 400, bx: 1500, by: 600 },
    { type: 'wall', ax: 1550, ay: 380, bx: 1550, by: 640 },
    // Utforkjøring 2 → venstre, inn i Glimt-hjulet
    { type: 'ramp', ax: 1530, ay: 610, bx: 330, by: 862 },
    { type: 'wall', ax: 380, ay: 880, bx: 380, by: 1075 },
    { type: 'wall', ax: 100, ay: 780, bx: 100, by: 1162 },
    { type: 'wall', ax: 100, ay: 780, bx: 250, by: 752 },
    { type: 'wheel', x: 240, y: 1000, len: 106, speed: 2.2, arms: 4 },
    // Utforkjøring 3: Bodø-vind og hoppet over Juvet
    { type: 'ramp', ax: 100, ay: 1160, bx: 900, by: 1332 },
    { type: 'ramp', ax: 1010, ay: 1405, bx: 1480, by: 1470 },
    { type: 'wall', ax: 1520, ay: 1280, bx: 1520, by: 1500 },
    { type: 'wall', ax: 1552, ay: 1300, bx: 1552, by: 1565 },
    { type: 'pit', x0: 898, x1: 1010, yl: 1342, yr: 1412, y1: 1540, sy: 1398, name: 'Juvet', cause: 'k_vind' },
    { type: 'wind', x0: 680, y0: 1180, x1: 1010, y1: 1420, dir: -1 },
    // Utforkjøring 4 → venstre, ned i Hurtigruta-feltet
    { type: 'ramp', ax: 1545, ay: 1555, bx: 300, by: 1810 },
    { type: 'wall', ax: 100, ay: 1700, bx: 100, by: 2292 },
    { type: 'wall', ax: 780, ay: 1850, bx: 780, by: 2292 },
    { type: 'ramp', ax: 100, ay: 2290, bx: 398, by: 2374 },
    { type: 'ramp', ax: 780, ay: 2290, bx: 482, by: 2374 },
    { type: 'pegs', x: 150, y: 1870, w: 590, rows: 7 },
    { type: 'bumper', x: 300, y: 2020 },
    { type: 'bumper', x: 560, y: 2130 },
    // Polarsirkel-vippa → to veier. Venstre: lang og trygg
    { type: 'seesaw', x: 440, y: 2472, half: 150 },
    { type: 'ramp', ax: 300, ay: 2552, bx: 124, by: 2604 },
    { type: 'wall', ax: 70, ay: 2510, bx: 70, by: 2685 },
    { type: 'ramp', ax: 80, ay: 2680, bx: 1180, by: 2900 },
    // Høyre: kort, men med Ørnes-luka
    { type: 'ramp', ax: 600, ay: 2552, bx: 860, by: 2600 },
    { type: 'trap', ax: 862, ay: 2601, bx: 958, by: 2619 },
    { type: 'ramp', ax: 960, ay: 2619, bx: 1180, by: 2660 },
    { type: 'pit', x0: 860, x1: 960, yl: 2606, yr: 2626, y1: 2770, sy: 2628, name: 'Ørnes', cause: 'k_ornes' },
    { type: 'wall', ax: 1240, ay: 2510, bx: 1240, by: 2970 },
    // Utforkjøring 7: Ørna jakter langs rampa
    { type: 'ramp', ax: 1252, ay: 2990, bx: 200, by: 3200 },
    { type: 'eagle', ax: 1252, ay: 2990, bx: 200, by: 3200 },
    { type: 'wall', ax: 90, ay: 3020, bx: 90, by: 3302 },
    // Sjøgata → mål i Bodø havn
    { type: 'ramp', ax: 100, ay: 3300, bx: 1360, by: 3470 },
    { type: 'finish', x: 1290, y: 3330 },
    { type: 'sign', x: 300, y: 110, text: 'KEISERVARDEN · 366 MOH' },
    { type: 'sign', x: 470, y: 840, text: 'GLIMT-HJULET' },
    { type: 'sign', x: 760, y: 1150, text: 'BODØ-VIND' },
    { type: 'sign', x: 955, y: 1575, text: 'JUVET' },
    { type: 'sign', x: 880, y: 1850, text: 'HURTIGRUTA-TUT' },
    { type: 'sign', x: 660, y: 2430, text: 'POLARSIRKEL-VIPPA' },
    { type: 'sign', x: 910, y: 2810, text: 'ØRNES ↓' },
    { type: 'sign', x: 980, y: 2950, text: 'ØRNA JAKTER' },
    { type: 'sign', x: 640, y: 3520, text: 'SJØGATA' },
  ];

  /* ---------- Rydding av løypedata (fra lagring, import og designeren) ---------- */
  const TYPES = ['start', 'finish', 'ramp', 'wall', 'pegs', 'bumper', 'wheel', 'seesaw', 'trap', 'pit', 'wind', 'eagle', 'sign',
    'vortex', 'belt', 'ferry', 'rocket', 'tunnel', 'rack', 'rein', 'slush', 'arm', 'boss', 'deco', 'shape', 'look',
    'tramp', 'boost', 'fan', 'door', 'split', 'kantine'];
  /* Utseende: pynt, bakgrunnsfelt, utseendet på hele løypa («look») og farger på deler. Ingenting av dette merkes av kulene,
     så det holdes utenfor godkjenningen (hash) – du kan pynte en godkjent løype uten å godkjenne den på nytt */
  const VISUAL = ['deco', 'shape', 'look'];
  const UNFELT = ['deco', 'shape', 'look', 'split']; // mellomtida måler bare – kulene merker den heller ikke
  const COL = /^#[0-9a-f]{6}$/i;
  const COLORS = { ramp: '#e9dfc9', wall: '#c9bda5', bumper: '#ee4a2f', sign: '#5a3d27', pegs: '#dbe3ec' }; // standardfargene
  const SKIES = ['natt', 'skumring', 'dag', 'sol', 'storm'];
  const colOf = (v, d) => (typeof v === 'string' && COL.test(v) ? v.toLowerCase() : d);
  const BOLT_V = 1700;     // farten på strålene fra Sjefen
  /* Skinner: ramper, vegger, TUT-bumpere og skilt kan kjøre fram og tilbake på en skinne, alene eller i gruppe.
     Skinnen er en flytting (dx, dy) fra der delen står, og programmet er en liste med steg som går i ring:
     { to: 0–100 (% av skinnen), t: sekunder, e: kurve } kjører dit, { t } venter. */
  const RIDERS = ['ramp', 'wall', 'bumper', 'sign', 'deco', 'tramp', 'boost'];
  /* Bagasjebånd og spikerbrett kan også kjøre, men bare når de selv har fått skinnen (det får de i designeren).
     I eldre løyper står de stille i gruppa si, akkurat som før */
  const RIDERS_OWN = ['belt', 'pegs'];
  const canRide = (type) => RIDERS.includes(type) || RIDERS_OWN.includes(type);
  const EASES = ['smooth', 'linear', 'throw', 'jump']; // myk start og stopp · jevn fart · fortere og fortere (kaster kulene) · hopper dit med en gang
  const STEPS_MAX = 12;
  const PTS_MAX = 11;      // punkt på banen i tillegg til det første
  const V_RAIL = 2400;     // toppfart på skinnen (raskere steg strekkes ut, så kulene ikke går gjennom)
  /* Skinnene kan mer enn å gå rett fram (alt er valgfritt, og feltene finnes bare når de er i bruk):
     pts: flere punkt, så banen går i knekk · curve: myke svinger · loop: rundbane tilbake til start
     px, py: dreiepunktet (fra midten av delene) · grip: magnet, så kulene blir med plata
     gs: magnetstyrke i prosent (100 = som før) · gr: slipper 1 = i steg med drop, 2 = etter gt sekunder (ellers når plata heller)
     steg { a: grader } vrir delene rundt dreiepunktet (alene, eller sammen med «to») · steg { hold: 1, t } venter på en kule
     ph: startpunkt i runden (%), så flere vogner kan gå etter hverandre på samme bane */
  const GRP = /^[a-z0-9]{1,12}$/i;
  // ingen grenser på antall deler – bare én start og ett mål
  const LIMITS = { start: 1, finish: 1, look: 1 };
  // i takt: fast startvinkel (grader, 0 = høyre, 90 = opp) i stedet for tilfeldig. Feltene finnes bare når det er på
  const syncOf = (p, o) => { if (+p.sync === 1) { o.sync = 1; o.ang = Math.round(num(p.ang, 0, 0, 359)); } return o; };
  const CAUSES = ['k_vind', 'k_ornes'];
  const num = (v, d, a, b) => { const n = typeof v === 'number' ? v : parseFloat(v); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : d; };
  const XN = (v, d) => num(v, d, -200, 1800);
  const YN = (v, d) => num(v, d, -3000, 30000);
  const txt = (v, d, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max) || d;
  const line = (type, p) => ({ type, ax: XN(p.ax, 600), ay: YN(p.ay, 500), bx: XN(p.bx, 900), by: YN(p.by, 560) });
  const SANE = {
    start: (p) => ({ type: 'start', x: num(p.x, 800, 340, 1260), y: YN(p.y, 300) }),
    finish: (p) => ({ type: 'finish', x: num(p.x, 1290, 0, 1300), y: YN(p.y, 3330) }),
    ramp: (p) => line('ramp', p),
    wall: (p) => line('wall', p),
    trap: (p) => line('trap', p),
    eagle: (p) => line('eagle', p),
    pegs: (p) => ({ type: 'pegs', x: XN(p.x, 300), y: YN(p.y, 600), w: num(p.w, 400, 64, 1600), rows: Math.round(num(p.rows, 5, 1, 14)) }),
    bumper: (p) => ({ type: 'bumper', x: XN(p.x, 800), y: YN(p.y, 600) }),
    wheel: (p) => {
      const o = syncOf(p, { type: 'wheel', x: XN(p.x, 800), y: YN(p.y, 600), len: num(p.len, 100, 50, 180), speed: num(p.speed, 2.2, -W_MAX, W_MAX), arms: Math.round(num(p.arms, 4, 2, 6)) });
      if (+p.hub === 0) o.hub = 0; // uten nav i midten (bare utseende – det er armene som slår)
      return o;
    },
    arm: (p) => syncOf(p, { type: 'arm', x: XN(p.x, 800), y: YN(p.y, 600), len: num(p.len, 150, 30, 400), speed: num(p.speed, 3, -W_MAX, W_MAX) }),
    boss: (p) => ({ type: 'boss', x: XN(p.x, 800), y: YN(p.y, 600), dir: +p.dir < 0 ? -1 : 1, range: num(p.range, 600, 150, 1200), cd: num(p.cd, 1.4, 0.4, 4), zap: +p.zap === 1 ? 1 : 0, force: num(p.force, 900, 100, 2400) }),
    seesaw: (p) => {
      const o = { type: 'seesaw', x: XN(p.x, 800), y: YN(p.y, 600), half: num(p.half, 140, 60, 260) };
      if (+p.phys === 1) o.phys = 1; // tyngde-vippe (feltet finnes bare når det er på, så eldre løyper er uendret)
      return o;
    },
    pit: (p) => {
      let x0 = XN(p.x0, 750), x1 = XN(p.x1, 860);
      if (x1 < x0) { const k = x0; x0 = x1; x1 = k; }
      if (x1 - x0 < 40) x1 = x0 + 40;
      const yl = YN(p.yl, 600), yr = YN(p.yr, 600);
      const y1 = Math.max(YN(p.y1, 760), Math.max(yl, yr) + 40);
      const o = { type: 'pit', x0, x1, yl, yr, y1, name: txt(p.name, 'Hullet', 24) };
      if (p.sy != null && Number.isFinite(+p.sy)) o.sy = num(p.sy, Math.max(yl, yr) + 2, Math.min(yl, yr) - 80, y1 - 10);
      if (CAUSES.includes(p.cause)) o.cause = p.cause;
      return o;
    },
    wind: (p) => {
      const ax = XN(p.x0, 600), bx = XN(p.x1, 900), ay = YN(p.y0, 500), by = YN(p.y1, 700);
      const x0 = Math.min(ax, bx), y0 = Math.min(ay, by);
      return { type: 'wind', x0, y0, x1: Math.max(ax, bx, x0 + 60), y1: Math.max(ay, by, y0 + 60), dir: +p.dir > 0 ? 1 : -1 };
    },
    sign: (p) => ({ type: 'sign', x: XN(p.x, 800), y: YN(p.y, 600), text: txt(p.text, 'SKILT', 28).toUpperCase() }),
    vortex: (p) => ({ type: 'vortex', x: XN(p.x, 800), y: YN(p.y, 600), r: num(p.r, 130, 70, 240), dir: +p.dir < 0 ? -1 : 1, drain: +p.drain === 1 ? 1 : 0 }),
    belt: (p) => ({ ...line('belt', p), speed: num(p.speed, 240, -600, 600) }),
    ferry: (p) => ({ ...line('ferry', p), speed: num(p.speed, 260, 120, 420) }),
    rocket: (p) => ({ type: 'rocket', x: XN(p.x, 800), y: YN(p.y, 600), ang: num(p.ang, 60, 0, 180), pow: num(p.pow, 1400, 500, 2400) }),
    tunnel: (p) => ({ ...line('tunnel', p), dir: +p.dir < 0 ? -1 : 1, ras: +p.ras === 0 ? 0 : 1 }),
    rack: (p) => ({ type: 'rack', x: XN(p.x, 600), y: YN(p.y, 600), w: num(p.w, 260, 80, 900), len: num(p.len, 70, 40, 120) }),
    rein: (p) => line('rein', p),
    slush: (p) => {
      const ax = XN(p.x0, 600), bx = XN(p.x1, 900), ay = YN(p.y0, 500), by = YN(p.y1, 620);
      const x0 = Math.min(ax, bx), y0 = Math.min(ay, by);
      return { type: 'slush', x0, y0, x1: Math.max(ax, bx, x0 + 60), y1: Math.max(ay, by, y0 + 40) };
    },
    // trampoline: spretter kulene rett ut fra duken
    tramp: (p) => ({ ...line('tramp', p), pow: num(p.pow, 800, 300, 1600) }),
    // kaffe-boost: full fart fra A mot B
    boost: (p) => ({ ...line('boost', p), pow: num(p.pow, 1000, 400, 1800) }),
    // kontorvifta: blåser jevnt i den retningen den peker (0 = høyre, 90 = rett opp)
    fan: (p) => {
      const ax = XN(p.x0, 600), bx = XN(p.x1, 800), ay = YN(p.y0, 400), by = YN(p.y1, 700);
      const x0 = Math.min(ax, bx), y0 = Math.min(ay, by);
      return { type: 'fan', x0, y0, x1: Math.max(ax, bx, x0 + 60), y1: Math.max(ay, by, y0 + 60), ang: Math.round(num(p.ang, 90, 0, 359)), pow: num(p.pow, 1600, 200, 3000) };
    },
    // svingdør: snurrer fritt, og det er kulene som dytter den rundt
    door: (p) => ({ type: 'door', x: XN(p.x, 800), y: YN(p.y, 600), len: num(p.len, 90, 40, 200), arms: Math.round(num(p.arms, 4, 2, 6)) }),
    // mellomtid: en målestrek som melder hvem som passerer først
    split: (p) => ({ ...line('split', p), name: txt(p.name, 'MELLOMTID', 20).toUpperCase() }),
    // kantina: vaffel (1) gjør kula stor og tung, salat (-1) liten og lett, vann (0) gjør den vanlig igjen
    kantine: (p) => {
      const ax = XN(p.x0, 600), bx = XN(p.x1, 900), ay = YN(p.y0, 500), by = YN(p.y1, 620);
      const x0 = Math.min(ax, bx), y0 = Math.min(ay, by);
      return { type: 'kantine', x0, y0, x1: Math.max(ax, bx, x0 + 60), y1: Math.max(ay, by, y0 + 40), mode: +p.mode < 0 ? -1 : +p.mode === 0 && p.mode != null ? 0 : 1 };
    },
    // pynt: en emoji (eller noen få tegn) som tegnes bak eller foran løypa
    deco: (p) => {
      const o = { type: 'deco', x: num(p.x, 800, -1400, 3000), y: YN(p.y, 600), ico: txt(p.ico, '🌲', 16), size: Math.round(num(p.size, 120, 24, 600)) };
      const ang = Math.round(num(p.ang, 0, -180, 180));
      if (ang) o.ang = ang;
      if (+p.flip === 1) o.flip = 1;
      if (+p.front === 1) o.front = 1;
      return o;
    },
    // bakgrunnsfelt: en farget firkant eller oval bak løypa
    shape: (p) => {
      const ax = num(p.x0, 500, -1400, 3000), bx = num(p.x1, 900, -1400, 3000), ay = YN(p.y0, 500), by = YN(p.y1, 700);
      const x0 = Math.min(ax, bx), y0 = Math.min(ay, by);
      const o = { type: 'shape', x0, y0, x1: Math.max(ax, bx, x0 + 20), y1: Math.max(ay, by, y0 + 20), col: colOf(p.col, '#2a6f8f'), alpha: Math.round(num(p.alpha, 60, 5, 100)) };
      if (+p.round === 1) o.round = 1;
      return o;
    },
    // utseendet på hele løypa (finnes høyst én gang, og bare feltene som ikke er standard)
    look: (p) => {
      const o = { type: 'look' };
      if (SKIES.includes(p.sky) && p.sky !== 'natt') o.sky = p.sky;
      if (+p.aur === 0) o.aur = 0;
      if (+p.mtn === 0) o.mtn = 0;
      if (+p.city === 0) o.city = 0;
      if (p.wx === 'sno' || p.wx === 'regn') o.wx = p.wx; // vær: snø eller regn
      const town = txt(p.town, '', 14).toUpperCase();
      if (town && town !== 'BODØ') o.town = town;
      const tr = colOf(p.track, null);
      if (tr && tr !== COLORS.ramp) o.track = tr;
      return o;
    },
  };
  function saneRail(r) {
    if (!r || typeof r !== 'object') return null;
    const o = { dx: Math.round(num(r.dx, 0, -1800, 1800)), dy: Math.round(num(r.dy, -240, -3000, 3000)) }, prog = [];
    // banen: flere punkt, rundbane, myke svinger, dreiepunkt og grep
    const pts = [];
    for (const q of Array.isArray(r.pts) ? r.pts.slice(0, PTS_MAX) : []) if (Array.isArray(q)) pts.push([Math.round(num(q[0], 0, -1800, 1800)), Math.round(num(q[1], 0, -3000, 3000))]);
    if (pts.length) o.pts = pts;
    if (+r.loop === 1) o.loop = 1;
    if (+r.curve === 1 && pts.length) o.curve = 1;
    const px = Math.round(num(r.px, 0, -1500, 1500)), py = Math.round(num(r.py, 0, -1500, 1500));
    if (px || py) { o.px = px; o.py = py; }
    if (+r.grip === 1) {
      o.grip = 1;
      // magneten: styrke og hvordan den slipper (feltene finnes bare når de ikke er standard)
      const gs = Math.round(num(r.gs, 100, 10, 400) / 5) * 5, gr = Math.round(num(r.gr, 0, 0, 2));
      if (gs !== 100) o.gs = gs;
      if (gr) o.gr = gr;
      if (gr === 2) o.gt = Math.round(num(r.gt, 2, 0.2, 10) * 10) / 10;
    }
    for (const s of Array.isArray(r.prog) ? r.prog.slice(0, STEPS_MAX) : []) {
      if (!s || typeof s !== 'object') continue;
      const go = s.to != null, turn = s.a != null && Number.isFinite(+s.a);
      // vent på kule: står til noen går om bord (t er lengste ventetid)
      if (!go && !turn && +s.hold === 1) { const o = { t: Math.round(num(s.t, 6, 0.1, 30) * 20) / 20, hold: 1 }; if (+s.drop === 1) o.drop = 1; prog.push(o); continue; }
      const t = Math.round(num(s.t, 1, 0.1, 10) * 20) / 20;
      const o = go ? { to: Math.round(num(s.to, 100, 0, 100)), t, e: EASES.includes(s.e) ? s.e : 'smooth' }
        : turn ? { a: 0, t, e: EASES.includes(s.e) ? s.e : 'smooth' } : { t };
      if (turn) o.a = Math.round(num(s.a, 0, -1080, 1080)); // vri til så mange grader (med klokka), alene eller mens den kjører
      // tilfeldig tid: et sted mellom t og t2 sekunder, trukket på nytt hver runde (hopp tar ingen tid)
      if (s.t2 != null && o.e !== 'jump') o.t2 = Math.max(t, Math.round(num(s.t2, t, 0.1, 10) * 20) / 20);
      if (+s.drop === 1) o.drop = 1; // magneten er av i dette steget (slipper kulene)
      prog.push(o);
    }
    o.prog = prog.length ? prog : [{ to: 100, t: 2, e: 'smooth' }, { to: 0, t: 2, e: 'smooth' }];
    if (+r.sync === 1) {
      o.sync = 1; o.off = Math.round(num(r.off, 0, 0, 20) * 10) / 10;
      const ph = Math.round(num(r.ph, 0, 0, 99)); // startpunkt i runden
      if (ph) o.ph = ph;
    }
    return o;
  }
  // gruppe og skinne: feltene finnes bare når de er i bruk, så eldre løyper er helt uendret
  function sanePiece(p) {
    if (!p || !SANE[p.type]) return null;
    const o = SANE[p.type](p);
    if (p.type === 'start' || p.type === 'finish' || p.type === 'look') return o;
    // egen farge (bare når den ikke er standardfargen)
    if (COLORS[p.type]) { const c = colOf(p.col, null); if (c && c !== COLORS[p.type]) o.col = c; }
    if (typeof p.grp === 'string' && GRP.test(p.grp)) o.grp = p.grp;
    if (p.rail && canRide(p.type)) { const r = saneRail(p.rail); if (r) o.rail = r; }
    return o;
  }
  /* Midten av det som kjører på skinnen (skinnen tegnes og dras herfra) */
  function railCenter(ps) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const at = (x, y) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; };
    for (const p of ps) {
      if (p.ax != null) { at(p.ax, p.ay); at(p.bx, p.by); }
      else if (p.type === 'pegs') { at(p.x, p.y); at(p.x + p.w, p.y + (p.rows - 1) * 56); }
      else at(p.x, p.y);
    }
    return x0 <= x1 ? { x: (x0 + x1) / 2, y: (y0 + y1) / 2 } : { x: 0, y: 0 };
  }
  /* Banen vogna følger, som en tabell med punkt og lengden fram til hvert av dem. En rett skinne med bare ett punkt
     trenger ingen tabell (null) og regnes akkurat som før */
  function railPath(rail) {
    if (!rail.pts && !rail.loop) return null;
    const Q = [[0, 0], [rail.dx, rail.dy]].concat(rail.pts || []), n = Q.length, xs = [], ys = [];
    if (rail.curve && n >= 3) {
      // myke svinger: en kurve som går gjennom alle punktene (i ring når det er rundbane)
      const at = (i) => (rail.loop ? Q[((i % n) + n) % n] : Q[Math.max(0, Math.min(n - 1, i))]);
      const spans = rail.loop ? n : n - 1, SUB = 14;
      const cr = (a, b, c, d, f) => 0.5 * (2 * b + (c - a) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (3 * b - a - 3 * c + d) * f * f * f);
      for (let i = 0; i < spans; i++) {
        const a = at(i - 1), b = at(i), c = at(i + 1), d = at(i + 2);
        for (let k = 0; k < SUB; k++) { xs.push(cr(a[0], b[0], c[0], d[0], k / SUB)); ys.push(cr(a[1], b[1], c[1], d[1], k / SUB)); }
      }
      const end = rail.loop ? Q[0] : Q[n - 1];
      xs.push(end[0]); ys.push(end[1]);
    } else {
      for (const q of Q) { xs.push(q[0]); ys.push(q[1]); }
      if (rail.loop) { xs.push(0); ys.push(0); }
    }
    const cum = [0];
    for (let i = 1; i < xs.length; i++) cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
    return { xs, ys, cum, L: cum[cum.length - 1] };
  }
  // stedet s (0–1) langs banen, og retningen den går der
  function pathAt(path, s) {
    const xs = path.xs, ys = path.ys, cum = path.cum, d = Math.min(1, Math.max(0, s)) * path.L;
    let lo = 0, hi = cum.length - 2;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid + 1] < d) lo = mid + 1; else hi = mid; }
    const len = cum[lo + 1] - cum[lo], f = len > 0 ? (d - cum[lo]) / len : 0, dx = xs[lo + 1] - xs[lo], dy = ys[lo + 1] - ys[lo];
    return { x: xs[lo] + dx * f, y: ys[lo] + dy * f, tx: len > 0 ? dx / len : 0, ty: len > 0 ? dy / len : 0 };
  }
  // hvor langt fra dreiepunktet delene rekker (det ytterste punktet går fortest når de vris)
  function railReach(ps, rail) {
    const c = railCenter(ps.filter((p) => canRide(p.type))), px = c.x + (rail.px || 0), py = c.y + (rail.py || 0);
    let far = 0;
    const at = (x, y, r) => { far = Math.max(far, Math.hypot(x - px, y - py) + r); };
    for (const p of ps) {
      if (p.ax != null) { at(p.ax, p.ay, 7); at(p.bx, p.by, 7); }
      else if (p.type === 'pegs') { at(p.x, p.y, 7); at(p.x + p.w, p.y, 7); at(p.x, p.y + (p.rows - 1) * 56, 7); at(p.x + p.w, p.y + (p.rows - 1) * 56, 7); }
      else if (p.type === 'bumper') at(p.x, p.y, 26);
    }
    return far;
  }
  /* Programmet som tidslinje: hvert steg går fra s0 til s1 (0–1 langs skinnen) og fra a0 til a1 (grader vridd).
     Runden starter der det siste steget slutter. Steg med tilfeldig tid bruker korteste tid, eller en trukket tid
     når rnd er med (én runde per kall). reach er hvor langt delene rekker fra dreiepunktet (bare når noe vris) */
  function railPlan(rail, rnd, reach = 0) {
    const path = railPath(rail), L = path ? path.L : Math.hypot(rail.dx, rail.dy), keys = [];
    let s = 0, a = 0, T = 0, Tmax = 0, rand = false;
    for (const st of rail.prog) { if (st.to != null) s = st.to / 100; if (st.a != null) a = st.a; }
    if (rail.loop && s === 1) s = 0;     // rundbane: 100 % er samme sted som 0 %, så neste runde fortsetter rett fram
    if (a % 360 === 0) a = 0;            // hele omdreininger: neste runde snurrer videre
    rail.prog.forEach((st, i) => {
      const r = st.t2 != null && st.t2 > st.t;
      if (r) rand = true;
      const want = r && rnd ? st.t + rnd() * (st.t2 - st.t) : st.t;
      if (st.to == null && st.a == null) {
        const key = { t0: T, t1: T + want, s0: s, s1: s, a0: a, a1: a, e: 'linear', peak: 0, want, st: i };
        if (st.hold) key.hold = 1;
        keys.push(key); T += want; Tmax += r ? st.t2 : st.t; return;
      }
      const s1 = st.to != null ? st.to / 100 : s, a1 = st.a != null ? st.a : a;
      // hopp: forsvinner og dukker opp der med en gang (tar ingen tid, og kulene blir ikke med)
      if (st.e === 'jump') { keys.push({ t0: T, t1: T, s0: s, s1, a0: a, a1, e: 'jump', peak: 0, want: 0, go: 1, jump: 1, st: i }); s = rail.loop && s1 === 1 ? 0 : s1; a = a1; return; }
      const pf = st.e === 'throw' ? 2 : st.e === 'smooth' ? 1.5 : 1, d = L * Math.abs(s1 - s), turn = Math.abs(a1 - a) * DEG * reach;
      const dt = Math.max(want, (pf * d) / V_RAIL, (pf * turn) / V_RAIL);
      keys.push({ t0: T, t1: T + dt, s0: s, s1, a0: a, a1, e: st.e, peak: (pf * Math.max(d, turn)) / dt, want, go: 1, st: i });
      T += dt; Tmax += Math.max(r ? st.t2 : st.t, (pf * d) / V_RAIL, (pf * turn) / V_RAIL); a = a1;
      s = rail.loop && s1 === 1 ? 0 : s1; // rundbane: framme ved 100 % er den tilbake på 0 %
    });
    for (const kk of keys) if (rail.prog[kk.st].drop) kk.drop = 1; // steg der magneten er av
    // bare hopp i programmet: står stille der det siste hoppet lander
    return { keys, period: Math.max(T, 0.05), periodMax: Math.max(Tmax, T, 0.05), rand, L, path };
  }
  /* Magneten på skinnen: friksjon (mu) og hvor hardt den trekker kula inntil plata (pull), og hvordan den slipper.
     Under 100 % blir den glattere, over 100 % trekker den – og ved rundt 220 % holder den kulene selv opp ned */
  function magOf(rail) {
    if (!rail || !rail.grip) return null;
    const S = (rail.gs || 100) / 100;
    return { mu: MU_GRIP * Math.min(1, S), pull: Math.max(0, S - 1) * MAG_K * G, rel: rail.gr || 0, hold: rail.gt || 2 };
  }
  // hvor langt plata kan helle (grader) før kula sklir av, når den vris rolig. 181 = holder selv opp ned
  function magHold(rail) {
    const m = magOf(rail);
    if (!m) return 0;
    for (let a = 1; a <= 180; a++) {
      const th = a * DEG, n = Math.cos(th) + m.pull / G; // det som presser kula mot plata (tyngde og magnet, i «tyngder»)
      if (!(n > 0 && Math.sin(th) <= m.mu * n + 1e-9)) return a;
    }
    return 181;
  }
  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.pieces)) return null;
    const count = {};
    const pieces = [];
    for (const p of raw.pieces) {
      const s = sanePiece(p);
      if (!s) continue;
      count[s.type] = (count[s.type] || 0) + 1;
      if (LIMITS[s.type] && count[s.type] > LIMITS[s.type]) continue;
      pieces.push(s);
    }
    if (!count.start) pieces.unshift({ type: 'start', x: 800, y: 300 });
    if (!count.finish) pieces.push({ type: 'finish', x: 1290, y: 3330 });
    return { id: txt(raw.id, 'c_' + u.hashStr(JSON.stringify(pieces)).toString(36), 40), name: txt(raw.name, 'Min løype', 40), pieces };
  }
  // godkjenningen gjelder bare det kulene merker: pynt, bakgrunn, utseende og farger er ikke med (eldre løyper får samme hash som før)
  const hash = (def) => u.hashStr(JSON.stringify(def.pieces
    .filter((p) => !UNFELT.includes(p.type))
    .map((p) => { if (p.col == null) return p; const { col, ...rest } = p; return rest; }))).toString(36);
  const ORIGINAL = normalize({ id: 'keiservarden', name: 'Keiservarden (original)', pieces: ORIGINAL_PIECES });

  /* ---------- Fra deler til en løype fysikken kan kjøre ---------- */
  function makeEagle(p, swoops) {
    const dir = p.ax >= p.bx ? 1 : -1;            // 1 = flyr mot venstre, som i originalen
    const x0 = p.ax + 128 * dir, span = x0 - (p.bx - 100 * dir);
    const ddx = (p.ax - p.bx) || 1;
    const lineY = (x) => p.ay + ((p.ax - x) * (p.by - p.ay)) / ddx;
    return {
      swoops, dur: 1.8, reach: 20, dir, ax: p.ax, ay: p.ay, bx: p.bx, by: p.by, lineY,
      at(t) { // klo-posisjon i et pågående stup, ellers null
        for (const t0 of swoops) {
          if (t >= t0 && t <= t0 + this.dur) {
            const q = (t - t0) / this.dur;
            const x = x0 - q * span;
            const y = lineY(x) - 16 - 250 * Math.pow(1 - Math.sin(q * Math.PI), 1.3);
            return { x, y, p: q, k: t0 };
          }
        }
        return null;
      },
    };
  }
  /* Ferga til Lofoten: legger til ved A, går over til B, tipper av passasjerene og går tom tilbake */
  function makeFerry(p, r0) {
    const dx = p.bx - p.ax, dist = Math.hypot(dx, p.by - p.ay);
    const hw = 80, dwell = 1.8, travel = Math.max(0.6, dist / p.speed), period = 2 * dwell + 2 * travel;
    const sA = dx >= 0 ? -1 : 1, top = Math.max(p.ay, p.by) + 70;
    return {
      ax: p.ax, ay: p.ay, bx: p.bx, by: p.by, hw, dwell, travel, period, phase: r0 * period, sA, sB: -sA,
      barX: p.ax + sA * (hw + 14), // ferjekø: bommen på kaia ved A er nede når ferga ikke ligger inne
      sea: { x0: Math.min(p.ax, p.bx) - hw - 20, x1: Math.max(p.ax, p.bx) + hw + 20, y0: top, y1: top + 150 },
    };
  }
  /* Reinen rusler fram og tilbake langs stien og stopper for å beite. Tidslinje med {t, s, f}: posisjon s langs stien, f = retning */
  function makeRein(p, rnd) {
    const len = Math.hypot(p.bx - p.ax, p.by - p.ay);
    let t = 0, s = rnd() * len, dir = rnd() < 0.5 ? -1 : 1;
    const keys = [{ t, s, f: dir }];
    while (t < T_MAX + 4) {
      if (rnd() < 0.42) { t += 1.2 + rnd() * 2.2; keys.push({ t, s, f: dir }); continue; } // beiter
      const to = Math.max(0, Math.min(len, s + dir * (60 + rnd() * 220)));
      t += Math.max(0.4, Math.abs(to - s) / 55); s = to; keys.push({ t, s, f: dir });
      if (s >= len || s <= 0 || rnd() < 0.3) dir = -dir;
    }
    // innimellom rusler den til skogs (bakover i bildet) – da slipper kulene forbi
    const away = [];
    for (let t0 = 5 + rnd() * 4; t0 < T_MAX + 4; ) { const d = 3 + rnd() * 3; away.push({ t0, t1: t0 + d }); t0 += d + 5 + rnd() * 5; }
    return { ax: p.ax, ay: p.ay, bx: p.bx, by: p.by, len, keys, away, ki: 0 };
  }
  function compile(def, seed) {
    const pieces = def.pieces;
    const rnd = u.mulberry32((seed ^ 0x5eed) >>> 0);
    const S = [], pegs = [], bumpers = [], gates = [], wheels = [], seesaws = [], traps = [], winds = [], eagles = [], sensors = [], pits = [], signs = [];
    const vortexes = [], ferries = [], rockets = [], tunnels = [], racks = [], reins = [], slushes = [], bosses = [];
    const fans = [], doors = [], splits = [], kantiner = [];
    const decoBack = [], decoFront = [], shapes = [];
    let start = null, fin = null, look = null;
    const seg = (ax, ay, bx, by, kind = 'track', col) => { const s = { ax, ay, bx, by, t: 7, e: 0.3, kind }; if (col) s.col = col; S.push(s); };
    // trampoline, kaffe-boost og bagasjebånd er streker som gjør noe med kula som treffer dem (fx: 1, 2 og 3)
    const fxSeg = (p) => {
      const L = Math.hypot(p.bx - p.ax, p.by - p.ay) || 1, g = { ax: p.ax, ay: p.ay, bx: p.bx, by: p.by, ux: (p.bx - p.ax) / L, uy: (p.by - p.ay) / L };
      if (p.type === 'tramp') return Object.assign(g, { t: 6, e: 0.3, kind: 'tramp', fx: 1, kick: p.pow });
      if (p.type === 'boost') return Object.assign(g, { t: 6, e: 0.15, kind: 'boost', fx: 2, pow: p.pow });
      return Object.assign(g, { t: 7, e: 0.15, kind: 'belt', fx: 3, belt: p.speed });
    };
    // deler på skinne (alene eller i gruppe med skinne) er ikke en del av den faste løypa.
    // Skinnen hentes fra en ekte del før pynt, så pynten aldri kan endre hvordan løypa kjører
    const unitKey = (p, i) => (p.grp ? 'g:' + p.grp : 'p:' + i), railOf = new Map();
    for (const deco of [false, true]) pieces.forEach((p, i) => { if (p.rail && canRide(p.type) && (p.type === 'deco') === deco && !railOf.has(unitKey(p, i))) railOf.set(unitKey(p, i), p.rail); });
    const rides = (p, i) => railOf.size > 0 && railOf.has(unitKey(p, i)) && (RIDERS.includes(p.type) || (RIDERS_OWN.includes(p.type) && !!p.rail));
    for (let pi = 0; pi < pieces.length; pi++) {
      const p = pieces[pi];
      if (rides(p, pi)) continue;
      if (p.type === 'start') {
        start = p;
        seg(p.x - 330, p.y - 260, p.x - 60, p.y, 'hopper'); seg(p.x + 330, p.y - 260, p.x + 60, p.y, 'hopper');
        seg(p.x - 330, p.y - 260, p.x - 330, p.y - 360, 'hopper'); seg(p.x + 330, p.y - 260, p.x + 330, p.y - 360, 'hopper');
        gates.push({ ax: p.x - 60, ay: p.y, bx: p.x + 60, by: p.y, t: 7 });
      } else if (p.type === 'ramp') seg(p.ax, p.ay, p.bx, p.by, 'track', p.col);
      else if (p.type === 'wall') seg(p.ax, p.ay, p.bx, p.by, 'wall', p.col);
      else if (p.type === 'pit') {
        seg(p.x0, p.yl, p.x0, p.y1, 'pit'); seg(p.x1, p.yr, p.x1, p.y1, 'pit'); seg(p.x0, p.y1, p.x1, p.y1, 'pit');
        const top = p.sy != null ? p.sy : Math.max(p.yl, p.yr) + 2;
        sensors.push({ x0: p.x0 + 7, y0: top, x1: p.x1 - 7, y1: p.y1 - 3, cause: p.cause || 'k_hull', pn: p.cause ? null : p.name });
        pits.push(p);
      } else if (p.type === 'finish') {
        fin = p;
        seg(p.x + 40, p.y + 250, p.x + 270, p.y + 280); seg(p.x + 292, p.y + 30, p.x + 292, p.y + 295, 'wall'); seg(p.x + 38, p.y + 210, p.x + 38, p.y + 256, 'wall');
      } else if (p.type === 'bumper') bumpers.push(p.col ? { x: p.x, y: p.y, r: 26, kick: 520, col: p.col } : { x: p.x, y: p.y, r: 26, kick: 520 });
      else if (p.type === 'sign') signs.push({ x: p.x, y: p.y, text: p.text, col: p.col });
      else if (p.type === 'deco') (p.front ? decoFront : decoBack).push(p);
      else if (p.type === 'shape') shapes.push(p);
      else if (p.type === 'look') look = p;
      else if (p.type === 'belt') {
        const L = Math.hypot(p.bx - p.ax, p.by - p.ay) || 1;
        S.push({ ax: p.ax, ay: p.ay, bx: p.bx, by: p.by, t: 7, e: 0.15, kind: 'belt', belt: p.speed, ux: (p.bx - p.ax) / L, uy: (p.by - p.ay) / L });
      } else if (p.type === 'rocket') S.push({ ax: p.x - 24, ay: p.y, bx: p.x + 24, by: p.y, t: 6, e: 0.2, kind: 'pad' });
      else if (p.type === 'tramp' || p.type === 'boost') S.push(fxSeg(p));
      else if (p.type === 'fan') {
        const a = p.ang * DEG;
        fans.push({ x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1, ang: a, pow: p.pow, fx: Math.cos(a) * p.pow, fy: -Math.sin(a) * p.pow });
      } else if (p.type === 'split') splits.push({ ax: p.ax, ay: p.ay, bx: p.bx, by: p.by, name: p.name });
      else if (p.type === 'kantine') kantiner.push({ x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1, mode: p.mode });
    }
    if (!start || !fin) throw new Error('Løypa mangler start eller mål');
    // spikerbrett: rad for rad, med plass rundt TUT-bumperne
    for (let pi = 0; pi < pieces.length; pi++) {
      const p = pieces[pi];
      if (p.type !== 'pegs' || rides(p, pi)) continue;
      for (let row = 0; row < p.rows; row++) {
        const y = p.y + row * 56, off = row % 2 ? 32 : 0;
        for (let x = p.x + off; x <= p.x + p.w; x += 64) {
          if (bumpers.some((b) => Math.hypot(x - b.x, y - b.y) < b.r + 34)) continue;
          pegs.push(p.col ? { x, y, r: 7, col: p.col } : { x, y, r: 7 });
        }
      }
    }
    // bevegelige deler får fase fra seeden, alltid i samme typerekkefølge
    const of = (type) => pieces.filter((p) => p.type === type);
    const makeWheel = (p, arms) => {
      const W = { cx: p.x, cy: p.y, len: p.len, w: p.speed, arms, t: 8, a0: rnd() * 6.28 };
      if (p.sync) W.a0 = (-p.ang * Math.PI) / 180; // i takt: fast startvinkel
      // raske hjul sjekkes i små steg, så armene ikke hopper over kulene
      if (Math.abs(p.speed) > W_FAST) { W.fast = true; W.sub = Math.max(1, Math.ceil((Math.abs(p.speed) * (p.len + R) * DT) / 5)); }
      return W;
    };
    of('wheel').forEach((p) => { const W = makeWheel(p, p.arms); if (p.hub === 0) W.nohub = true; wheels.push(W); });
    of('seesaw').forEach((p) => {
      const Pp = { px: p.x, py: p.y, half: p.half, amp: 0.2, period: 3.2, phase: rnd() * 3.2, t: 8 };
      if (p.phys) { // tyngde-vippe: vipper etter vekta av kulene (bjelken veier som ti kuler)
        const I = (10 * p.half * p.half) / 3;
        Object.assign(Pp, { dyn: true, I, k: I * 4.84, c: I * 1.1, max: 0.42 });
      }
      seesaws.push(Pp);
    });
    of('trap').forEach((p) => traps.push({ ax: p.ax, ay: p.ay, bx: p.bx, by: p.by, t: 7, period: 2.6, phase: rnd() * 2.6, openFrom: 1.7, openTo: 2.45 }));
    of('wind').forEach((p) => {
      const gusts = [];
      for (let t = 5 + rnd() * 3; t < T_MAX; t += 2.6 + rnd() * 3.2) gusts.push({ t0: t, t1: t + 0.9 + rnd() * 0.5, a: 300 + rnd() * 240 });
      winds.push({ x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1, dir: p.dir, base: 0, gusts });
    });
    of('eagle').forEach((p) => {
      const swoops = [];
      for (let t = 14 + rnd() * 4; t < T_MAX; t += 4.2 + rnd() * 3) swoops.push(t);
      eagles.push(makeEagle(p, swoops));
    });
    // de nye delene trekker fra seeden etter de gamle, så eldre løyper får nøyaktig samme faser som før
    of('vortex').forEach((p) => vortexes.push({ x: p.x, y: p.y, r: p.r, dir: p.dir, drain: p.drain, a0: rnd() * 6.28 }));
    of('ferry').forEach((p) => {
      const F = makeFerry(p, rnd());
      const s = F.sea;
      S.push({ ax: s.x0, ay: s.y0, bx: s.x0, by: s.y1, t: 7, e: 0.2, kind: 'sea' }, { ax: s.x1, ay: s.y0, bx: s.x1, by: s.y1, t: 7, e: 0.2, kind: 'sea' }, { ax: s.x0, ay: s.y1, bx: s.x1, by: s.y1, t: 7, e: 0.2, kind: 'sea' });
      sensors.push({ x0: s.x0 + 7, y0: s.y0 + 12, x1: s.x1 - 7, y1: s.y1 - 3, cause: 'k_ferje', pn: null });
      ferries.push(F);
    });
    of('rocket').forEach((p) => {
      const a = (p.ang * Math.PI) / 180;
      rockets.push({ x: p.x, y: p.y, ang: a, pow: p.pow, vx: Math.cos(a) * p.pow, vy: -Math.sin(a) * p.pow, hx: p.x, hy: p.y - R - 6 });
    });
    of('tunnel').forEach((p) => {
      const closures = [];
      if (p.ras) for (let t = 9 + rnd() * 10; t < T_MAX; t += 13 + rnd() * 15) closures.push({ t0: t, t1: t + 3 + rnd() * 2.5 });
      tunnels.push({ ax: p.ax, ay: p.ay, bx: p.bx, by: p.by, dir: p.dir, ras: p.ras, closures, transit: 0.35 + Math.hypot(p.bx - p.ax, p.by - p.ay) / 1400, mx: p.ax, my: p.ay - 20 });
    });
    of('rack').forEach((p) => {
      // hver fisk er en pendel (veier som tre kuler): vinden får den til å svinge, og kulene kan dytte den unna
      const fish = [];
      for (let px = p.x + 22; px <= p.x + p.w - 21; px += 44) {
        const I = p.len * p.len, kg = 1500 * p.len, wn = Math.sqrt(kg / I);
        const wd = wn * (0.92 + rnd() * 0.16), amp = 0.55 + rnd() * 0.25, c = 0.2 * Math.sqrt(kg * I);
        fish.push({ px, py: p.y, len: p.len, I, kg, c, wd, amp, drive: amp * c * wd, ph: rnd() * 6.28, th0: (rnd() - 0.5) * 0.8 });
      }
      racks.push({ x: p.x, y: p.y, w: p.w, len: p.len, fish });
    });
    of('rein').forEach((p) => reins.push(makeRein(p, rnd)));
    of('slush').forEach((p) => slushes.push({ x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1 }));
    // Glimt-armen: én arm som spinner rundt et punkt i enden (samme fysikk som hjulet, uten nav)
    of('arm').forEach((p) => { const W = makeWheel(p, 1); W.arm = true; wheels.push(W); });
    // Sjefen: står og skyter med strålepistol (skuddene lagres i shots under løpet, så tegningen kan vise dem)
    of('boss').forEach((p) => bosses.push({ x: p.x, y: p.y, dir: p.dir, range: p.range, cd: p.cd, zap: p.zap, force: p.force, gx: p.x + p.dir * 42, gy: p.y - 72, phase: rnd() * p.cd, shots: [] }));
    // skinnene: én «vogn» per del eller gruppe, med alt som kjører på den (trekker fra seeden sist, bare når de finnes)
    const movers = [];
    if (railOf.size) {
      const units = new Map();
      pieces.forEach((p, i) => { if (!rides(p, i)) return; const k = unitKey(p, i); if (!units.has(k)) units.set(k, []); units.get(k).push(p); });
      // pynt som kjører alene trekker fra sin egen seed, så den aldri endrer løpet
      const vrnd = u.mulberry32((seed ^ 0xdec0) >>> 0);
      units.forEach((ps, k) => {
        const rail = railOf.get(k), c = railCenter(ps), r = ps.every((p) => p.type === 'deco') ? vrnd : rnd;
        const rot = rail.prog.some((st) => st.a != null), reach = rot ? railReach(ps, rail) : 0, plan = railPlan(rail, null, reach);
        const M = { segs: [], bumps: [], signs: [], decos: [], rx: rail.dx, ry: rail.dy, L: plan.L, cx: c.x, cy: c.y, keys: plan.keys, period: plan.period, sync: rail.sync ? 1 : 0, off: rail.off || 0, phase: 0, key: k };
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, fx = false;
        const box = (x, y, rr) => { x0 = Math.min(x0, x - rr); x1 = Math.max(x1, x + rr); y0 = Math.min(y0, y - rr); y1 = Math.max(y1, y + rr); };
        for (const p of ps) {
          if (p.type === 'ramp' || p.type === 'wall') {
            const g = { ax: p.ax, ay: p.ay, bx: p.bx, by: p.by, t: 7, e: 0.3, kind: p.type === 'wall' ? 'wall' : 'track' };
            if (p.col) g.col = p.col;
            M.segs.push(g);
            box(p.ax, p.ay, 7 + R + 4); box(p.bx, p.by, 7 + R + 4);
          } else if (p.type === 'bumper') { M.bumps.push({ x: p.x, y: p.y, r: 26, kick: 520, col: p.col }); box(p.x, p.y, 26 + R + 4); }
          else if (p.type === 'deco') M.decos.push(p);
          else if (p.type === 'tramp' || p.type === 'boost' || p.type === 'belt') {
            M.segs.push(fxSeg(p)); fx = true;
            box(p.ax, p.ay, 7 + R_BIG + 4); box(p.bx, p.by, 7 + R_BIG + 4);
          } else if (p.type === 'pegs') {
            // spikerbrett på skinne: spikrene blir med (som små bumpere uten tut)
            for (let row = 0; row < p.rows; row++) {
              const y = p.y + row * 56, off = row % 2 ? 32 : 0;
              for (let x = p.x + off; x <= p.x + p.w; x += 64) { M.bumps.push({ x, y, r: 7, kick: 0, peg: 1, col: p.col }); box(x, y, 7 + R_BIG + 4); }
            }
            fx = true;
          } else M.signs.push({ x: p.x, y: p.y, text: p.text, col: p.col });
        }
        Object.assign(M, { x0, y0, x1, y1 });
        // det nye på skinnene: bane med flere punkt, vridning rundt et dreiepunkt, grep, venting på kuler og startpunkt
        if (plan.path) M.path = plan.path;
        M.pvx = c.x + (rail.px || 0); M.pvy = c.y + (rail.py || 0);
        if (rot) { M.rot = true; M.reach = reach; }
        if (rail.grip) M.mag = magOf(rail);
        if (rail.prog.some((st) => st.hold)) M.hold = true;
        if (rot || fx || M.mag || M.hold) M.adv = true; // disse regnes for seg i fysikken – resten går akkurat som før
        if (M.sync && rail.ph) M.shift = (rail.ph / 100) * plan.period;
        if (plan.rand) {
          // tilfeldig tid: hele løpet trekkes på forhånd fra seeden, runde for runde (så reprisen blir lik)
          if (!M.sync) M.phase = r() * ((plan.period + plan.periodMax) / 2);
          const keys = [];
          let T = 0;
          while (T < T_MAX + 8 + M.phase + (M.shift || 0)) {
            const c = railPlan(rail, r, reach);
            for (const kk of c.keys) keys.push({ ...kk, t0: kk.t0 + T, t1: kk.t1 + T });
            T += c.period;
          }
          M.keys = keys;
          M.period = T;
        } else if (!M.sync) M.phase = r() * M.period;
        if (M.shift) { // startpunkt i runden: delene står der de er tegnet når løpet starter, og banen går gjennom dem
          const b = railAt(M, M.shift), z = railAt(M, 0);
          M.bx = b.ox - z.ox; M.by = b.oy - z.oy;
        }
        movers.push(M);
      });
    }
    // svingdørene trekker fra seeden helt til slutt (hver arm veier som fem kuler)
    of('door').forEach((p) => {
      const I = (p.arms * 5 * p.len * p.len) / 3;
      doors.push({ cx: p.x, cy: p.y, len: p.len, arms: p.arms, t: 7, I, c: I * 0.5, a0: rnd() * 6.28 });
    });
    return {
      S, pegs, bumpers, gates, wheels, seesaws, traps, winds, eagles, sensors, pits, signs,
      vortexes, ferries, rockets, tunnels, racks, reins, slushes, bosses, movers,
      fans, doors, splits, kantiner,
      decoBack, decoFront, shapes, look: look || { type: 'look' },
      start: { x: start.x, y: start.y }, fin: { x: fin.x, y: fin.y },
      finish: { x0: fin.x, y0: fin.y, x1: fin.x + 40, y1: fin.y + 230 },
      W: WORLD_W, H: fin.y + 390, top: start.y - 440,
    };
  }
  function course(seed, def) {
    const d = def && def !== ORIGINAL ? (normalize(def) || ORIGINAL) : ORIGINAL;
    return compile(d, seed);
  }

  /* Verdi fra opptaket (30 bilder i sekundet) ved tid t */
  function recAt(arr, t) {
    if (!arr || !arr.length) return 0;
    const k = t * FPS;
    let a = Math.floor(k);
    if (a >= arr.length - 1) return arr[arr.length - 1];
    if (a < 0) a = 0;
    return arr[a] + (arr[a + 1] - arr[a]) * (k - a);
  }
  // hvor langt vogna er kommet i runden sin ved tid t
  const railTau = (M, t) => {
    if (M.rec) t += recAt(M.rec, t); // «vent på kule»: klokka til vogna hopper fram når noen går om bord (fra opptaket)
    let tau = M.sync ? Math.max(0, t - GATE_T - M.off) : t + M.phase;
    if (M.shift) tau += M.shift;     // startpunkt i runden
    return ((tau % M.period) + M.period) % M.period;
  };
  // hvor delene er flyttet når vogna er kommet s (0–1) langs banen
  const railPos = (M, s) => {
    const q = M.path ? pathAt(M.path, s) : { x: M.rx * s, y: M.ry * s };
    return { x: q.x - (M.bx || 0), y: q.y - (M.by || 0) };
  };
  /* Vogna ved tid tau i runden: hvor langt den har kjørt (s = 0–1), flyttingen, farten, og hvor mye den er vridd (a, w) */
  const railAt = (M, tau) => {
    const K = M.keys;
    // første steg som ikke er ferdig (binærsøk: med tilfeldig tid er hele løpet lagt ut på forhånd)
    let k = 0, hi = K.length - 1;
    while (k < hi) { const mid = (k + hi) >> 1; if (tau >= K[mid].t1) k = mid + 1; else hi = mid; }
    const a = K[k], span = a.t1 - a.t0, x = span > 0 ? Math.min(1, Math.max(0, (tau - a.t0) / span)) : 1;
    let f = x, df = 1;
    if (a.e === 'smooth') { f = x * x * (3 - 2 * x); df = 6 * x * (1 - x); }
    else if (a.e === 'throw') { f = x * x; df = 2 * x; }
    const s = a.s0 + (a.s1 - a.s0) * f, v = span > 0 ? ((a.s1 - a.s0) * df) / span : 0;
    const o = { s, k, ox: M.rx * s, oy: M.ry * s, vx: M.rx * v, vy: M.ry * v, a: 0, w: 0, tau };
    if (M.path) { // bane med flere punkt: stedet og retningen slås opp i tabellen
      const q = pathAt(M.path, s);
      o.ox = q.x; o.oy = q.y; o.vx = q.tx * v * M.path.L; o.vy = q.ty * v * M.path.L;
    }
    if (M.bx || M.by) { o.ox -= M.bx; o.oy -= M.by; }
    if (M.rot) { o.a = (a.a0 + (a.a1 - a.a0) * f) * DEG; o.w = span > 0 ? (((a.a1 - a.a0) * df) / span) * DEG : 0; }
    return o;
  };
  const JUMP_FX = 0.35; // så lenge glimtet etter et hopp vises
  // hoppet vogna (teleport) mellom tidene ta og tb?
  const railJumpsBetween = (M, ta, tb) => {
    if (M.sync && tb - GATE_T - M.off <= 0) return false;
    const A = railTau(M, ta), B = railTau(M, tb);
    for (const k of M.keys) {
      if (!k.jump) continue;
      const j = k.t1 >= M.period ? k.t1 - M.period : k.t1; // et hopp helt på slutten av runden skjer ved starten av neste
      if (A <= B ? j > A && j <= B : j > A || j <= B) return true;
    }
    return false;
  };
  /* Tilstander som avhenger av tid (brukes både i simulering og tegning) */
  const kin = {
    gateOpen: (t) => t >= GATE_T,
    wheelAngle: (W, t) => W.a0 + W.w * t,
    // tyngde-vippa styres av kulene: tegningen leser vinkelen fra opptaket (og står vannrett uten opptak)
    seesawAngle: (P, t) => P.dyn ? recAt(P.rec, t) : P.amp * Math.sin((2 * Math.PI * (t + P.phase)) / P.period),
    seesawRate: (P, t) => P.amp * ((2 * Math.PI) / P.period) * Math.cos((2 * Math.PI * (t + P.phase)) / P.period),
    trapOpen: (T, t) => { const ph = (t + T.phase) % T.period; return ph >= T.openFrom && ph <= T.openTo; },
    windAccel: (Z, t) => { let a = Z.base; for (const g of Z.gusts) if (t >= g.t0 && t <= g.t1) { a += g.a * Math.sin(((t - g.t0) / (g.t1 - g.t0)) * Math.PI); break; } return a; },
    // tørrfisken svinger fritt i løpet (opptak); uten opptak (i designeren) vises en rolig svingning
    fishAngle: (F, t) => F.rec ? recAt(F.rec, t) : F.amp * Math.sin(F.wd * t + F.ph),
    tunnelClosed: (T, t) => T.closures.some((c) => t >= c.t0 && t < c.t1),
    // ferga: posisjon (midt på dekket), fart, helning og hvilke porter som står åpne
    ferry: (F, t) => {
      const ph = (((t + F.phase) % F.period) + F.period) % F.period, d = F.dwell, tr = F.travel;
      let s = 0, ds = 0, at = 0;
      if (ph < d) at = 1;
      else if (ph < d + tr) { const x = (ph - d) / tr; s = x * x * (3 - 2 * x); ds = (6 * x * (1 - x)) / tr; }
      else if (ph < 2 * d + tr) { s = 1; at = 2; }
      else { const x = (ph - 2 * d - tr) / tr; s = 1 - x * x * (3 - 2 * x); ds = -(6 * x * (1 - x)) / tr; }
      // dekket heller litt mot B-porten, og tipper ordentlig når ferga ligger ved B
      let tilt = F.sB * 0.07, rate = 0;
      if (at === 2) {
        const k = ph - d - tr, full = F.sB * 0.17;
        if (k < 0.35) { tilt += full * (k / 0.35); rate = full / 0.35; }
        else if (d - k < 0.35) { tilt += full * ((d - k) / 0.35); rate = -full / 0.35; }
        else tilt += full;
      }
      return { x: F.ax + (F.bx - F.ax) * s, y: F.ay + (F.by - F.ay) * s, vx: (F.bx - F.ax) * ds, vy: (F.by - F.ay) * ds, tilt, rate, openA: at === 1, openB: at === 2, at };
    },
    rein: (Rn, t) => {
      const K = Rn.keys;
      let i = Rn.ki || 0;
      if (i >= K.length - 1 || t < K[i].t) i = 0;
      while (i < K.length - 2 && t >= K[i + 1].t) i++;
      Rn.ki = i;
      const a = K[i], b = K[i + 1] || a, span = b.t - a.t;
      const f = span > 0 ? Math.min(1, Math.max(0, (t - a.t) / span)) : 0;
      const s = a.s + (b.s - a.s) * f, v = span > 0 && t < b.t ? (b.s - a.s) / span : 0;
      const ux = Rn.len ? (Rn.bx - Rn.ax) / Rn.len : 1, uy = Rn.len ? (Rn.by - Rn.ay) / Rn.len : 0;
      // borte = i skogen; near = 0..1 hvor langt fram i bildet den står (for tegningen)
      let away = false, near = 1;
      for (const w of Rn.away) {
        if (t < w.t0 - 0.4) break;
        if (t < w.t1 + 0.4) { away = t >= w.t0 && t < w.t1; near = Math.min(1, Math.max(0, Math.max(w.t0 - t, t - w.t1) / 0.4)); break; }
      }
      return { x: Rn.ax + ux * s, y: Rn.ay + uy * s, vx: ux * v, vy: uy * v, dir: v > 0 ? 1 : v < 0 ? -1 : b.f, graze: v === 0, away, near };
    },
    // vogna på skinnen: hvor langt den har kjørt (s = 0–1), flyttingen, farten og vridningen. I takt starter programmet når porten åpner
    rail: (M, t) => railAt(M, railTau(M, t)),
    /* For tegningen: kulene tegnes fra opptaket (30 bilder i sekundet, rett linje imellom), og vogna må tegnes på samme måte –
       ellers ser kuler som står på en plattform som starter eller stopper brått ut til å sveve eller synke inn mellom bildene
       (mest synlig med høy skjermfrekvens). Et hopp mellom to bilder vises som et hopp, ikke som en sklie */
    railDraw: (M, t) => {
      const k = Math.max(0, t) * FPS, a = Math.floor(k), f = k - a, ta = a / FPS, tb = (a + 1) / FPS;
      if (f < 1e-9 || railJumpsBetween(M, ta, tb)) return kin.rail(M, t);
      const A = kin.rail(M, ta), B = kin.rail(M, tb);
      return { s: A.s + (B.s - A.s) * f, ox: A.ox + (B.ox - A.ox) * f, oy: A.oy + (B.oy - A.oy) * f, vx: B.vx, vy: B.vy, a: A.a + (B.a - A.a) * f, w: B.w, k: A.k };
    },
    // et hopp som nettopp skjedde (bare for tegningen): hvor den hoppet fra og til, og hvor lenge siden
    railJump: (M, t) => {
      if (M.sync && t - GATE_T - M.off < 0) return null;
      const tau = railTau(M, t);
      for (const k of M.keys) {
        if (!k.jump) continue;
        let age = tau - k.t1;
        if (age < 0) age += M.period;
        if (age < JUMP_FX) return { age, s0: k.s0, s1: k.s1, a0: (k.a0 || 0) * DEG, a1: (k.a1 || 0) * DEG };
      }
      return null;
    },
    // flyttingen når vogna står s (0–1) langs banen (for tegningen av hopp og stopp)
    railPos,
    // svingdøra snurrer etter kulene: tegningen leser vinkelen fra opptaket (og står stille uten opptak)
    doorAngle: (Dr, t) => (Dr.rec ? recAt(Dr.rec, t) : Dr.a0),
  };
  /* Hvor langt programmet har flyttet delene når runden er kommet ph prosent (uten startpunkt). Designeren bruker det
     til å sette flere vogner etter hverandre på samme bane */
  function railShift(rail, ph) {
    const plan = railPlan(rail), M = { keys: plan.keys, period: plan.period, rx: rail.dx, ry: rail.dy, path: plan.path };
    const b = railAt(M, (ph / 100) * plan.period), z = railAt(M, 0);
    return { x: b.ox - z.ox, y: b.oy - z.oy };
  }
  // kula forsvant ut av verden ved siden av et Glimt-hjul → hjulet slo den ut
  const segDist = (px, py, g) => {
    const abx = g.bx - g.ax, aby = g.by - g.ay, l2 = abx * abx + aby * aby;
    let q = l2 ? ((px - g.ax) * abx + (py - g.ay) * aby) / l2 : 0; q = q < 0 ? 0 : q > 1 ? 1 : q;
    return Math.hypot(px - g.ax - abx * q, py - g.ay - aby * q);
  };
  const flung = (C, x, y, arm) => C.wheels.some((w) => !w.arm === !arm && (x < 0 ? w.cx < C.W / 2 : x > C.W && w.cx > C.W / 2) && y > w.cy - 300 && y < w.cy + 250);

  /* Banen en kule fra Andøya-raketten vil fly (uten andre kuler og bevegelige deler) – forhåndsvisning i designeren */
  function aimPath(C, L) {
    const pts = [];
    let x = L.hx, y = L.hy, vx = L.vx, vy = L.vy, cp = V_LAUNCH;
    const near = (g) => {
      const abx = g.bx - g.ax, aby = g.by - g.ay, l2 = abx * abx + aby * aby;
      let q = l2 ? ((x - g.ax) * abx + (y - g.ay) * aby) / l2 : 0; q = q < 0 ? 0 : q > 1 ? 1 : q;
      return Math.hypot(x - g.ax - abx * q, y - g.ay - aby * q) < R + g.t;
    };
    for (let s = 1; s <= 240 * 4; s++) {
      vy += G * DT; vx *= 1 - AIR * DT;
      const sp = Math.hypot(vx, vy);
      if (sp > cp) { vx *= cp / sp; vy *= cp / sp; } else if (cp > VMAX) cp = sp > VMAX ? sp : VMAX;
      x += vx * DT; y += vy * DT;
      const hit = s > 10 && C.S.some(near);
      if (s % 3 === 0 || hit) pts.push(x, y);
      if (hit || x < -80 || x > C.W + 80 || y > C.H + 60) break;
    }
    return pts;
  }

  /* ---------- Simulering ---------- */
  function simulate(n, seed, def) {
    const C = course(seed, def);
    const rnd = u.mulberry32(seed >>> 0);
    const X = new Float64Array(n), Y = new Float64Array(n), VX = new Float64Array(n), VY = new Float64Array(n), ANG = new Float64Array(n);
    const state = new Uint8Array(n), tDone = new Float64Array(n).fill(-1), cause = new Array(n).fill(null), pn = new Array(n).fill(null);
    const carrier = new Int16Array(n).fill(-1);
    // startposisjoner i trakta, fra bunnen og opp
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const sx = C.start.x, sy = C.start.y, top = sy - 260;
    let k = 0;
    for (let y = sy - 24; k < n && y > sy - 340; y -= 2 * R + 3) {
      const yy = Math.max(y, top);
      const xl = (sx - 330) + (yy - top) * (270 / 260) + R + 9, xr = (sx + 330) - (yy - top) * (270 / 260) - R - 9;
      for (let x = xl; x <= xr && k < n; x += 2 * R + 3) { const i = order[k++]; X[i] = x + (rnd() - 0.5) * 3; Y[i] = y + (rnd() - 0.5) * 3; VX[i] = (rnd() - 0.5) * 40; }
    }
    for (let y = sy - 365; k < n; y -= 2 * R + 3) for (let x = sx - 310; x <= sx + 310 && k < n; x += 2 * R + 3) { const i = order[k++]; X[i] = x; Y[i] = y; }
    // statisk rutenett for kollisjon
    const CELL = 120, grid = new Map();
    const key = (cx, cy) => cx * 4096 + cy;
    const addTo = (minx, miny, maxx, maxy, item) => {
      for (let cx = Math.floor(minx / CELL); cx <= Math.floor(maxx / CELL); cx++) for (let cy = Math.floor(miny / CELL); cy <= Math.floor(maxy / CELL); cy++) {
        const kk = key(cx, cy); let a = grid.get(kk); if (!a) { a = []; grid.set(kk, a); } a.push(item);
      }
    };
    const RP = C.kantiner.length ? R_BIG : R; // med kantine kan kulene bli større – da må rutene ta med litt mer
    C.S.forEach((s) => { const pad = s.t + RP; addTo(Math.min(s.ax, s.bx) - pad, Math.min(s.ay, s.by) - pad, Math.max(s.ax, s.bx) + pad, Math.max(s.ay, s.by) + pad, { s }); });
    C.pegs.forEach((p) => addTo(p.x - p.r - RP, p.y - p.r - RP, p.x + p.r + RP, p.y + p.r + RP, { c: p }));
    C.bumpers.forEach((p) => addTo(p.x - p.r - RP, p.y - p.r - RP, p.x + p.r + RP, p.y + p.r + RP, { c: p, bump: true }));

    const events = [];
    const frames = [];
    const contact = new Uint8Array(n);
    // Kantina: kulene kan bli store og tunge eller små og lette. Uten kantine er alle like (radius R, vekt 1), som før
    const NKZ = C.kantiner.length, sized = NKZ > 0;
    const RAD = new Float64Array(n).fill(R), RT = new Float64Array(n).fill(R), MASS = new Float64Array(n).fill(1), kzIn = new Uint8Array(n * NKZ);

    function capsule(i, ax, ay, bx, by, t, e, svx, svy) {
      const abx = bx - ax, aby = by - ay, len2 = abx * abx + aby * aby;
      let q = len2 > 0 ? ((X[i] - ax) * abx + (Y[i] - ay) * aby) / len2 : 0;
      q = q < 0 ? 0 : q > 1 ? 1 : q;
      const qx = ax + abx * q, qy = ay + aby * q;
      const dx = X[i] - qx, dy = Y[i] - qy, d2 = dx * dx + dy * dy, min = RAD[i] + t;
      if (d2 >= min * min) return null;
      const d = Math.sqrt(d2) || 1e-6, nx = dx / d, ny = dy / d;
      X[i] = qx + nx * min; Y[i] = qy + ny * min;
      let rvx = VX[i] - svx, rvy = VY[i] - svy;
      const vn = rvx * nx + rvy * ny;
      if (vn < 0) { const ee = vn < -40 ? e : 0; rvx -= (1 + ee) * vn * nx; rvy -= (1 + ee) * vn * ny; }
      VX[i] = rvx + svx; VY[i] = rvy + svy;
      contact[i] = 1;
      return { qx, qy };
    }
    function circle(i, c, e) {
      const dx = X[i] - c.x, dy = Y[i] - c.y, min = RAD[i] + c.r, d2 = dx * dx + dy * dy;
      if (d2 >= min * min) return false;
      const d = Math.sqrt(d2) || 1e-6, nx = dx / d, ny = dy / d;
      X[i] = c.x + nx * min; Y[i] = c.y + ny * min;
      const vn = VX[i] * nx + VY[i] * ny;
      if (vn < 0) { VX[i] -= (1 + e) * vn * nx; VY[i] -= (1 + e) * vn * ny; }
      if (c.kick) { const out = VX[i] * nx + VY[i] * ny; if (out < c.kick) { VX[i] += (c.kick - out) * nx; VY[i] += (c.kick - out) * ny; } }
      contact[i] = 1;
      return true;
    }
    const NW = C.wheels.length, NS = C.seesaws.length, NT = C.traps.length, NZ = C.winds.length, NE = C.eagles.length;
    const wa = new Float64Array(NW), sa = new Float64Array(NS), sr = new Float64Array(NS), topen = new Uint8Array(NT), wv = new Float64Array(NZ);
    const claws = new Array(NE).fill(null), grabbed = C.eagles.map(() => new Set());
    const lastBump = new Float64Array(n).fill(-9);
    // raske Glimt-hjul: kula får fly fortere enn vanlig toppfart til den har bremset ned igjen
    const cap = new Float64Array(n).fill(VMAX), launchT = new Float64Array(n).fill(-Infinity), lastLaunch = new Float64Array(n).fill(-9);
    function spin(i, W, ang1) {
      let hit = false;
      for (let s = 1; s <= W.sub; s++) {
        const base = ang1 - (W.w * DT * (W.sub - s)) / W.sub; // fra forrige stegs vinkel fram til nå
        let touch = false;
        for (let a = 0; a < W.arms; a++) {
          const ang = base + (a * Math.PI * 2) / W.arms, ex = W.cx + Math.cos(ang) * W.len, ey = W.cy + Math.sin(ang) * W.len;
          const abx = ex - W.cx, aby = ey - W.cy, l2 = abx * abx + aby * aby;
          let qq = ((X[i] - W.cx) * abx + (Y[i] - W.cy) * aby) / l2; qq = qq < 0 ? 0 : qq > 1 ? 1 : qq;
          const qx = W.cx + abx * qq, qy = W.cy + aby * qq;
          if (capsule(i, W.cx, W.cy, ex, ey, W.t, 0.35, -W.w * (qy - W.cy), W.w * (qx - W.cx))) touch = true;
        }
        if (!touch) continue;
        hit = true;
        // løypa vinner over armen: kula skal ikke dyttes gjennom gulv, vegger eller lukker
        const cell = grid.get(key(Math.floor(X[i] / CELL), Math.floor(Y[i] / CELL)));
        if (cell) for (const it of cell) if (it.s) capsule(i, it.s.ax, it.s.ay, it.s.bx, it.s.by, it.s.t, it.s.e, 0, 0);
        for (let q = 0; q < NT; q++) if (!topen[q]) { const T = C.traps[q]; capsule(i, T.ax, T.ay, T.bx, T.by, T.t, 0.25, 0, 0); }
      }
      if (!hit) return;
      cap[i] = V_LAUNCH; launchT[i] = t; launchBy[i] = W.arm ? 4 : 1;
      if (Math.hypot(VX[i], VY[i]) > 1100 && t - lastLaunch[i] > 1) { lastLaunch[i] = t; events.push(W.arm ? { t, type: 'launch', i, x: X[i], y: Y[i], arm: 1 } : { t, type: 'launch', i, x: X[i], y: Y[i] }); }
    }
    /* ---- de nye delene (alt her er tomt for løyper uten dem) ---- */
    const NV = C.vortexes.length, NF = C.ferries.length, NK = C.rockets.length, NU = C.tunnels.length, NR = C.reins.length, NL = C.slushes.length;
    const NB = C.bosses.length, bolts = [], bNext = Float64Array.from(C.bosses, (b) => GATE_T + b.phase);
    const NMV = C.movers.length, mvs = new Array(NMV);
    /* Deler på skinne som vris, har grep eller venter på kuler: endepunktene der de er akkurat nå regnes ut én gang
       per steg (mtx). lead er hvor langt klokka til vogna har hoppet fram («vent på kule»), boarded om noen sto på den */
    const mtx = C.movers.map((M) => (M.adv ? new Float64Array(M.segs.length * 4 + M.bumps.length * 2) : null));
    const lead = new Float64Array(NMV), boarded = new Uint8Array(NMV), mrec = C.movers.map(() => []);
    // magnet som slipper etter tid: når hver kule landet på hver vogn, og sist den var borti den
    const magT = new Float64Array(n * NMV), magLast = new Float64Array(n * NMV).fill(-9);
    function place(M, s, T) {
      const c = Math.cos(s.a), sn = Math.sin(s.a), px = M.pvx, py = M.pvy, qx = px + s.ox, qy = py + s.oy;
      let k = 0;
      for (const g of M.segs) {
        T[k++] = qx + (g.ax - px) * c - (g.ay - py) * sn; T[k++] = qy + (g.ax - px) * sn + (g.ay - py) * c;
        T[k++] = qx + (g.bx - px) * c - (g.by - py) * sn; T[k++] = qy + (g.bx - px) * sn + (g.by - py) * c;
      }
      for (const b of M.bumps) { T[k++] = qx + (b.x - px) * c - (b.y - py) * sn; T[k++] = qy + (b.x - px) * sn + (b.y - py) * c; }
    }
    const segDistXY = (px, py, ax, ay, bx, by) => {
      const abx = bx - ax, aby = by - ay, l2 = abx * abx + aby * aby;
      let q = l2 ? ((px - ax) * abx + (py - ay) * aby) / l2 : 0; q = q < 0 ? 0 : q > 1 ? 1 : q;
      return Math.hypot(px - ax - abx * q, py - ay - aby * q);
    };
    // treffer punktet en rampe eller vegg som kjører på skinne (der den er nå)?
    const onMover = (px, py) => {
      for (let q = 0; q < NMV; q++) {
        const M = C.movers[q], s = mvs[q];
        if (M.adv) {
          const T = mtx[q];
          for (let k = 0; k < M.segs.length; k++) if (segDistXY(px, py, T[k * 4], T[k * 4 + 1], T[k * 4 + 2], T[k * 4 + 3]) < M.segs[k].t + 4) return true;
        } else for (const g of M.segs) if (segDist(px - s.ox, py - s.oy, g) < g.t + 4) return true;
      }
      return false;
    };
    // fri sikt fra pistolen til kula (ingen vegg eller rampe i veien)
    function clear(x0, y0, x1, y1) {
      const L = Math.hypot(x1 - x0, y1 - y0), m = Math.ceil(Math.max(0, L - R - 10) / 12);
      for (let s = 1; s <= m; s++) {
        const f = (s * 12) / L, px = x0 + (x1 - x0) * f, py = y0 + (y1 - y0) * f;
        const cell = grid.get(key(Math.floor(px / CELL), Math.floor(py / CELL)));
        if (cell) for (const it of cell) if (it.s && segDist(px, py, it.s) < it.s.t + 4) return false;
        if (NMV && onMover(px, py)) return false;
      }
      return true;
    }
    // TUT-bumper på skinne: som en vanlig bumper, men den kan komme farende
    function circleV(i, cx, cy, r, e, kick, svx, svy) {
      const dx = X[i] - cx, dy = Y[i] - cy, min = RAD[i] + r, d2 = dx * dx + dy * dy;
      if (d2 >= min * min) return false;
      const d = Math.sqrt(d2) || 1e-6, nx = dx / d, ny = dy / d;
      X[i] = cx + nx * min; Y[i] = cy + ny * min;
      let rvx = VX[i] - svx, rvy = VY[i] - svy;
      const vn = rvx * nx + rvy * ny;
      if (vn < 0) { rvx -= (1 + e) * vn * nx; rvy -= (1 + e) * vn * ny; }
      const out = rvx * nx + rvy * ny;
      if (out < kick) { rvx += (kick - out) * nx; rvy += (kick - out) * ny; }
      VX[i] = rvx + svx; VY[i] = rvy + svy;
      contact[i] = 1;
      return true;
    }
    const fish = [];
    C.racks.forEach((rk) => rk.fish.forEach((f) => fish.push(f)));
    const NFI = fish.length;
    const launchBy = new Uint8Array(n); // 1 = Glimt-hjul, 2 = Andøya-raketten, 3 = Saltstraumen, 4 = Glimt-armen, 5 = Sjefen, 6 = skinne
    const fishT = new Float64Array(n).fill(-Infinity), lastFish = new Float64Array(n).fill(-9), reinT = new Float64Array(n).fill(-9);
    const vIn = new Float64Array(n), vCool = new Float64Array(n), slushIn = new Uint8Array(n * NL);
    const hold = new Int32Array(n), noCatch = new Float64Array(n), loaded = new Int32Array(NK).fill(-1), loadT = new Float64Array(NK);
    const tunOut = new Float64Array(n), tunQ = new Int32Array(n), tunV = new Float64Array(n), noTun = new Float64Array(n);
    const fa = new Float64Array(NFI), fw = new Float64Array(NFI), fst = new Array(NF), rst = new Array(NR), tclosed = new Uint8Array(NU);
    const fth = Float64Array.from(fish, (f) => f.th0), fom = new Float64Array(NFI), fdL = new Float64Array(NFI), frec = fish.map(() => []);
    const dynS = C.seesaws.map((s) => !!s.dyn), anyDyn = dynS.some(Boolean);
    const th = new Float64Array(NS), om = new Float64Array(NS), dL = new Float64Array(NS), srec = C.seesaws.map(() => []);
    // bagasjebåndet: kula tar etter farten til båndet (også oppover)
    function belt(i, s) {
      const rel = VX[i] * s.ux + VY[i] * s.uy - s.belt, k = Math.min(1, 10 * DT);
      VX[i] -= s.ux * rel * k; VY[i] -= s.uy * rel * k;
    }
    // kula som ligger klar i raketten står bom fast; de andre spretter av den
    function pinned(i, j, nx, ny, ov) {
      if (hold[i] && hold[j]) return;
      if (hold[i]) {
        X[j] += nx * ov * 2; Y[j] += ny * ov * 2;
        const vn = VX[j] * nx + VY[j] * ny;
        if (vn < 0) { VX[j] -= (1 + E_MM) * vn * nx; VY[j] -= (1 + E_MM) * vn * ny; }
      } else {
        X[i] -= nx * ov * 2; Y[i] -= ny * ov * 2;
        const vn = VX[i] * nx + VY[i] * ny;
        if (vn > 0) { VX[i] -= (1 + E_MM) * vn * nx; VY[i] -= (1 + E_MM) * vn * ny; }
      }
    }
    let t = 0, step = 0, lastDoneT = -1;
    /* ---- trampoline, kaffe-boost, vifte, svingdør, mellomtid og kantine (tomt for løyper uten dem) ---- */
    const NFN = C.fans.length, ND = C.doors.length, NSP = C.splits.length;
    const fanT = new Float64Array(n).fill(-Infinity), lastBoing = new Float64Array(n).fill(-9), lastBoost = new Float64Array(n).fill(-9);
    const dth = Float64Array.from(C.doors, (d) => d.a0), dom = new Float64Array(ND), ddL = new Float64Array(ND), drec = C.doors.map(() => []);
    const passed = new Uint8Array(n * NSP), splitN = new Int32Array(NSP);
    // streker som gjør noe med kula: c er treffpunktet, (svx, svy) farten til underlaget og (ux, uy) retningen streken peker
    function segFx(i, g, c, svx, svy, ux, uy) {
      if (g.fx === 1) { // trampoline: spretter rett ut fra duken
        const m = RAD[i] + g.t, nx = (X[i] - c.qx) / m, ny = (Y[i] - c.qy) / m, out = (VX[i] - svx) * nx + (VY[i] - svy) * ny;
        if (out < g.kick) { VX[i] += (g.kick - out) * nx; VY[i] += (g.kick - out) * ny; }
        cap[i] = V_LAUNCH; launchT[i] = t; launchBy[i] = 7;
        if (t - lastBoing[i] > 0.25) { lastBoing[i] = t; events.push({ t, type: 'boing', i, x: c.qx, y: c.qy }); }
      } else if (g.fx === 2) { // kaffe-boost: full fart i pilretningen
        const al = (VX[i] - svx) * ux + (VY[i] - svy) * uy;
        if (al < g.pow) { VX[i] += (g.pow - al) * ux; VY[i] += (g.pow - al) * uy; }
        cap[i] = V_LAUNCH; launchT[i] = t; launchBy[i] = 8;
        if (t - lastBoost[i] > 0.6) { lastBoost[i] = t; events.push({ t, type: 'boost', i, x: X[i], y: Y[i] }); }
      } else { // bagasjebånd på skinne: kula tar etter farten til båndet, oppå farten til vogna
        const rel = (VX[i] - svx) * ux + (VY[i] - svy) * uy - g.belt, k = Math.min(1, 10 * DT);
        VX[i] -= ux * rel * k; VY[i] -= uy * rel * k;
      }
    }
    // det som kjører på skinne og samtidig vris, har grep, trampoline, bånd eller venter på kuler
    function advMover(i, q) {
      const M = C.movers[q], s = mvs[q], T = mtx[q], px = M.pvx + s.ox, py = M.pvy + s.oy; // (px, py): dreiepunktet der det er nå
      const mg = M.mag, pad = mg && mg.pull ? MAG_R : 0; // en magnet som trekker, rekker litt lenger
      if (M.rot) { const dx = X[i] - px, dy = Y[i] - py, far = M.reach + RAD[i] + 4 + pad; if (dx * dx + dy * dy > far * far) return; }
      else if (X[i] < M.x0 + s.ox - pad || X[i] > M.x1 + s.ox + pad || Y[i] < M.y0 + s.oy - pad || Y[i] > M.y1 + s.oy + pad) return;
      // er magneten på for denne kula akkurat nå? (av i «slipp»-steg, eller når kula har ligget på lenge nok)
      let on = !!mg;
      if (mg && mg.rel === 1) on = !M.keys[s.k].drop;
      else if (mg && mg.rel === 2) { const j = i * NMV + q; if (t - magLast[j] > 0.3) magT[j] = t; on = t - magT[j] < mg.hold; }
      let hit = false, shot = false, k = 0;
      for (const g of M.segs) {
        const ax = T[k], ay = T[k + 1], bx = T[k + 2], by = T[k + 3];
        k += 4;
        const abx = bx - ax, aby = by - ay, l2 = abx * abx + aby * aby;
        let qq = l2 > 0 ? ((X[i] - ax) * abx + (Y[i] - ay) * aby) / l2 : 0; qq = qq < 0 ? 0 : qq > 1 ? 1 : qq;
        const qx = ax + abx * qq, qy = ay + aby * qq;
        const svx = s.vx - s.w * (qy - py), svy = s.vy + s.w * (qx - px); // farten til plata akkurat der kula treffer (kjører og vrir seg)
        const l = Math.sqrt(l2) || 1, ux = abx / l, uy = aby / l;
        if (on && mg.pull && !g.fx) {
          // magneten trekker kula inntil plata – også fra undersiden. Kula som ligger inntil (eller et hårstrå unna, siden den
          // trekkes inn igjen hvert steg) holdes fast av friksjon fra magneten og den delen av tyngden som presser mot plata
          const dx = X[i] - qx, dy = Y[i] - qy, d2 = dx * dx + dy * dy, near = RAD[i] + g.t + MAG_R;
          if (d2 < near * near && d2 > 1e-9) {
            const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
            VX[i] -= nx * mg.pull * DT; VY[i] -= ny * mg.pull * DT;
            if (d < RAD[i] + g.t + 2) {
              // (farten plata ville gitt kula om den satt limt fast – slik kryper den ikke når plata vris)
              const press = mg.pull - G * ny, gvx = s.vx - s.w * (Y[i] - py), gvy = s.vy + s.w * (X[i] - px);
              if (press > 0) {
                const rel = (VX[i] - gvx) * ux + (VY[i] - gvy) * uy, lim = mg.mu * press * DT, cut = rel > lim ? lim : rel < -lim ? -lim : rel;
                VX[i] -= ux * cut; VY[i] -= uy * cut;
                X[i] -= ux * cut * DT; Y[i] -= uy * cut * DT; // og flyttet den gjorde i dette steget før magneten tok tak
              }
              hit = true;
            }
          }
        }
        const c = capsule(i, ax, ay, bx, by, g.t, g.e, svx, svy);
        if (!c) continue;
        hit = true;
        if (g.fx) { segFx(i, g, c, svx, svy, ux, uy); if (g.fx < 3) shot = true; }
        else if (on) {
          // magneten: kula blir med plata (friksjon) – til den heller for mye eller rykker for hardt
          const ny = (Y[i] - c.qy) / (RAD[i] + g.t);
          if (!mg.pull && ny < -0.3) { // bare tyngden presser kula mot plata (slik grepet alltid har virket). Med trekk er friksjonen tatt over
            const rel = (VX[i] - svx) * ux + (VY[i] - svy) * uy, lim = mg.mu * G * -ny * DT, cut = rel > lim ? lim : rel < -lim ? -lim : rel;
            VX[i] -= ux * cut; VY[i] -= uy * cut;
          }
        }
      }
      for (const b of M.bumps) {
        const cx = T[k], cy = T[k + 1];
        k += 2;
        if (!circleV(i, cx, cy, b.r, b.peg ? 0.45 : 0.6, b.kick, s.vx - s.w * (cy - py), s.vy + s.w * (cx - px))) continue;
        hit = true;
        if (!b.peg && t - lastBump[i] > 0.25) { lastBump[i] = t; events.push({ t, type: 'bump', i, x: cx, y: cy }); }
      }
      if (!hit) return;
      if (mg && mg.rel === 2) magLast[i * NMV + q] = t;
      if (state[i] === ST.RACE) boarded[q] = 1;
      if (!s.vx && !s.vy && !s.w) return;
      // løypa vinner over vogna: kula skal ikke dyttes gjennom gulv, vegger eller lukker
      const cell = grid.get(key(Math.floor(X[i] / CELL), Math.floor(Y[i] / CELL)));
      if (cell) for (const it of cell) if (it.s) capsule(i, it.s.ax, it.s.ay, it.s.bx, it.s.by, it.s.t, it.s.e, 0, 0);
      for (let j = 0; j < NT; j++) if (!topen[j]) { const Tr = C.traps[j]; capsule(i, Tr.ax, Tr.ay, Tr.bx, Tr.by, Tr.t, 0.25, 0, 0); }
      const sp = Math.hypot(VX[i], VY[i]);
      if (sp > VMAX && !shot) { // (trampolina og kaffen tar æren selv)
        cap[i] = V_LAUNCH; launchT[i] = t; launchBy[i] = 6;
        if (sp > 1100 && t - lastLaunch[i] > 1) { lastLaunch[i] = t; events.push(mg ? { t, type: 'launch', i, x: X[i], y: Y[i], lift: 1, mag: 1 } : { t, type: 'launch', i, x: X[i], y: Y[i], lift: 1 }); }
      }
    }
    const active = (i) => state[i] === ST.RACE || state[i] === ST.FIN || (state[i] === ST.OUT && cause[i] !== 'k_orna' && X[i] > -40 && X[i] < C.W + 40 && Y[i] < C.H + 40);

    while (t < T_MAX + 2) {
      const gateOpen = kin.gateOpen(t);
      for (let q = 0; q < NW; q++) wa[q] = kin.wheelAngle(C.wheels[q], t);
      for (let q = 0; q < NS; q++) {
        if (dynS[q]) { sa[q] = th[q]; sr[q] = om[q]; }
        else { sa[q] = kin.seesawAngle(C.seesaws[q], t); sr[q] = kin.seesawRate(C.seesaws[q], t); }
      }
      for (let q = 0; q < NT; q++) topen[q] = kin.trapOpen(C.traps[q], t) ? 1 : 0;
      for (let q = 0; q < NZ; q++) wv[q] = kin.windAccel(C.winds[q], t);
      for (let q = 0; q < NE; q++) claws[q] = C.eagles[q].at(t);
      for (let q = 0; q < NFI; q++) { fa[q] = fth[q]; fw[q] = fom[q]; }
      for (let q = 0; q < NF; q++) fst[q] = kin.ferry(C.ferries[q], t);
      for (let q = 0; q < NR; q++) rst[q] = kin.rein(C.reins[q], t);
      for (let q = 0; q < NU; q++) tclosed[q] = kin.tunnelClosed(C.tunnels[q], t) ? 1 : 0;
      for (let q = 0; q < NMV; q++) {
        const M = C.movers[q];
        if (!M.adv) { mvs[q] = kin.rail(M, t); continue; }
        let s = kin.rail(M, t + lead[q]);
        if (M.hold) {
          // «vent på kule»: går noen om bord mens vogna venter, hopper klokka dens fram til ventingen er over
          if (boarded[q] && M.keys[s.k].hold && !(M.sync && t + lead[q] - GATE_T - M.off <= 0)) { lead[q] += M.keys[s.k].t1 - s.tau; s = kin.rail(M, t + lead[q]); }
          boarded[q] = 0;
        }
        mvs[q] = s;
        place(M, s, mtx[q]);
      }
      for (let i = 0; i < n; i++) {
        if (state[i] === ST.CARRY) { const cl = claws[carrier[i]]; if (cl) { X[i] = cl.x; Y[i] = cl.y + 24; } else { X[i] = -200; Y[i] = 2500; } continue; }
        if (state[i] === ST.TUNNEL) { // kommer ut av tunnelen igjen
          if (t < tunOut[i]) continue;
          const T = C.tunnels[tunQ[i]];
          state[i] = ST.RACE; X[i] = T.bx + T.dir * 8; Y[i] = T.by - R - 9;
          VX[i] = T.dir * Math.min(650, Math.max(220, tunV[i])); VY[i] = 0; noTun[i] = t + 0.8;
        }
        if (hold[i]) { // ligger klar i Andøya-raketten
          const q = hold[i] - 1, L = C.rockets[q];
          if (state[i] !== ST.RACE) { loaded[q] = -1; hold[i] = 0; }
          else {
            X[i] = L.hx; Y[i] = L.hy; VX[i] = 0; VY[i] = 0;
            if (t - loadT[q] < 0.6) continue;
            loaded[q] = -1; hold[i] = 0; // 3 – 2 – 1 – AVFYR
            VX[i] = L.vx; VY[i] = L.vy; cap[i] = V_LAUNCH; launchT[i] = t; launchBy[i] = 2; noCatch[i] = t + 0.7;
            events.push({ t, type: 'rocket', i, x: L.hx, y: L.hy });
          }
        }
        if (!active(i)) continue;
        VY[i] += G * DT;
        if (state[i] === ST.RACE) {
          for (let q = 0; q < NZ; q++) {
            const Z = C.winds[q];
            if (X[i] > Z.x0 && X[i] < Z.x1 && Y[i] > Z.y0 && Y[i] < Z.y1) { if (Z.dir < 0) VX[i] -= wv[q] * DT; else VX[i] += wv[q] * DT; }
          }
          if (NV) { // Saltstraumen: virvelen drar kula rundt, og spytter den ut igjen etter et par runder
            let inV = false;
            for (let q = 0; q < NV; q++) {
              const V = C.vortexes[q];
              const dx = X[i] - V.x, dy = Y[i] - V.y, d = Math.hypot(dx, dy);
              if (d >= V.r || t < vCool[i]) continue;
              inV = true;
              const ux = d > 0 ? dx / d : 0, uy = d > 0 ? dy / d : -1, tx = -uy * V.dir, ty = ux * V.dir;
              // strømmen: fart rundt (mot 620), litt innover, og sentripetalkraft så kula går i ring
              let vr = VX[i] * ux + VY[i] * uy, vt = VX[i] * tx + VY[i] * ty;
              vt += (620 - vt) * Math.min(1, 6 * DT);
              vr += (-(V.drain ? 50 : 18) - vr) * Math.min(1, 10 * DT);
              vr -= (Math.min(vt * vt, 1e6) / Math.max(d, 25)) * DT;
              VX[i] = ux * vr + tx * vt; VY[i] = uy * vr + ty * vt;
              vIn[i] += DT;
              if (V.drain && d < 18) { // sugd ned i sluket
                state[i] = ST.OUT; tDone[i] = t; cause[i] = 'k_salt'; lastDoneT = t;
                events.push({ t, type: 'out', i, cause: 'k_salt' });
                X[i] = -500; Y[i] = V.y; VX[i] = 0; VY[i] = 0;
                break;
              }
              if (vIn[i] > 1.7 + ((i * 0.618034) % 1)) {
                VX[i] = tx * 1250 + ux * 260; VY[i] = ty * 1250 + uy * 260;
                cap[i] = V_LAUNCH; launchT[i] = t; launchBy[i] = 3; vCool[i] = t + 1.2; vIn[i] = 0;
                events.push({ t, type: 'spit', i, x: X[i], y: Y[i] });
                break;
              }
            }
            if (!inV) vIn[i] = 0;
          }
          for (let q = 0; q < NL; q++) { // slaps: alt går tregt
            const Z = C.slushes[q];
            if (X[i] > Z.x0 && X[i] < Z.x1 && Y[i] > Z.y0 && Y[i] < Z.y1) {
              const k = 1 - 2.4 * DT;
              VX[i] *= k; VY[i] *= k;
              if (!slushIn[i * NL + q]) { slushIn[i * NL + q] = 1; events.push({ t, type: 'slaps', i, x: X[i], y: Y[i] }); }
            }
          }
          for (let q = 0; q < NFN; q++) { // kontorvifta blåser jevnt dit den peker
            const Z = C.fans[q];
            if (X[i] > Z.x0 && X[i] < Z.x1 && Y[i] > Z.y0 && Y[i] < Z.y1) { VX[i] += Z.fx * DT; VY[i] += Z.fy * DT; fanT[i] = t; }
          }
          for (let q = 0; q < NKZ; q++) { // kantina: kula forsyner seg idet den triller inn
            const Z = C.kantiner[q], inside = X[i] > Z.x0 && X[i] < Z.x1 && Y[i] > Z.y0 && Y[i] < Z.y1;
            if (inside && !kzIn[i * NKZ + q]) {
              const r = Z.mode > 0 ? R_BIG : Z.mode < 0 ? R_SMALL : R;
              if (RT[i] !== r) { RT[i] = r; events.push({ t, type: 'size', i, r, x: X[i], y: Y[i] }); }
            }
            kzIn[i * NKZ + q] = inside ? 1 : 0;
          }
        }
        if (sized && RAD[i] !== RT[i]) { // vokser eller krymper litt om gangen, så den ikke sprenger seg fast
          const d = RT[i] - RAD[i], grow = 30 * DT;
          RAD[i] += d > grow ? grow : d < -grow ? -grow : d;
          MASS[i] = (RAD[i] * RAD[i]) / (R * R);
        }
        const damp = 1 - (contact[i] ? ROLL : AIR) * DT;
        VX[i] *= damp; VY[i] *= contact[i] ? damp : 1;
        const sp = Math.hypot(VX[i], VY[i]), cp = cap[i];
        if (sp > cp) { VX[i] *= cp / sp; VY[i] *= cp / sp; }
        else if (cp > VMAX) cap[i] = sp > VMAX ? sp : VMAX; // en skutt kule bremser ned til vanlig toppfart igjen
        X[i] += VX[i] * DT; Y[i] += VY[i] * DT;
        ANG[i] += (VX[i] / R) * DT;
        contact[i] = 0;
      }
      // kule mot kule (store kuler rekker lenger, så de ser i flere ruter rundt seg)
      const mg = new Map(), NEAR = sized ? 2 : 1;
      for (let i = 0; i < n; i++) {
        if (!active(i)) continue;
        const cx = Math.floor(X[i] / 24), cy = Math.floor(Y[i] / 24);
        for (let ox = -NEAR; ox <= NEAR; ox++) for (let oy = -NEAR; oy <= NEAR; oy++) {
          const list = mg.get(key(cx + ox, cy + oy));
          if (!list) continue;
          for (const j of list) {
            const dx = X[j] - X[i], dy = Y[j] - Y[i], d2 = dx * dx + dy * dy, rr = RAD[i] + RAD[j];
            if (d2 >= rr * rr || d2 === 0) continue;
            const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (rr - d) / 2;
            if (NK && (hold[i] || hold[j])) { pinned(i, j, nx, ny, ov); continue; }
            if (sized) { // ulik vekt: den tunge dytter den lette unna
              const wi = MASS[j] / (MASS[i] + MASS[j]), wj = 1 - wi;
              X[i] -= nx * ov * 2 * wi; Y[i] -= ny * ov * 2 * wi; X[j] += nx * ov * 2 * wj; Y[j] += ny * ov * 2 * wj;
              const vn = (VX[j] - VX[i]) * nx + (VY[j] - VY[i]) * ny;
              if (vn < 0) { const jm = -(1 + E_MM) * vn; VX[i] -= jm * wi * nx; VY[i] -= jm * wi * ny; VX[j] += jm * wj * nx; VY[j] += jm * wj * ny; }
              continue;
            }
            X[i] -= nx * ov; Y[i] -= ny * ov; X[j] += nx * ov; Y[j] += ny * ov;
            const vn = (VX[j] - VX[i]) * nx + (VY[j] - VY[i]) * ny;
            if (vn < 0) { const jm = (-(1 + E_MM) * vn) / 2; VX[i] -= jm * nx; VY[i] -= jm * ny; VX[j] += jm * nx; VY[j] += jm * ny; }
          }
        }
        const kk = key(cx, cy); let a = mg.get(kk); if (!a) { a = []; mg.set(kk, a); } a.push(i);
      }
      // kule mot løype
      for (let i = 0; i < n; i++) {
        if (!active(i)) continue;
        const cell = grid.get(key(Math.floor(X[i] / CELL), Math.floor(Y[i] / CELL)));
        if (cell) for (const it of cell) {
          if (it.s) {
            const c = capsule(i, it.s.ax, it.s.ay, it.s.bx, it.s.by, it.s.t, it.s.e, 0, 0);
            if (c) { if (it.s.fx) segFx(i, it.s, c, 0, 0, it.s.ux, it.s.uy); else if (it.s.kind === 'belt') belt(i, it.s); }
          }
          else if (circle(i, it.c, it.bump ? 0.6 : 0.45) && it.bump && t - lastBump[i] > 0.25) { lastBump[i] = t; events.push({ t, type: 'bump', i, x: it.c.x, y: it.c.y }); }
        }
        if (!gateOpen) for (const g of C.gates) capsule(i, g.ax, g.ay, g.bx, g.by, g.t, 0.2, 0, 0);
        for (let q = 0; q < NT; q++) if (!topen[q]) { const T = C.traps[q]; capsule(i, T.ax, T.ay, T.bx, T.by, T.t, 0.25, 0, 0); }
        // deler på skinne: kula blir med (og kastes til værs når vogna bråstopper)
        for (let q = 0; q < NMV; q++) {
          const M = C.movers[q], s = mvs[q], ox = s.ox, oy = s.oy;
          if (M.adv) { advMover(i, q); continue; }
          if (X[i] < M.x0 + ox || X[i] > M.x1 + ox || Y[i] < M.y0 + oy || Y[i] > M.y1 + oy) continue;
          let hit = false;
          for (const g of M.segs) if (capsule(i, g.ax + ox, g.ay + oy, g.bx + ox, g.by + oy, g.t, g.e, s.vx, s.vy)) hit = true;
          for (const b of M.bumps) {
            if (!circleV(i, b.x + ox, b.y + oy, b.r, 0.6, b.kick, s.vx, s.vy)) continue;
            hit = true;
            if (t - lastBump[i] > 0.25) { lastBump[i] = t; events.push({ t, type: 'bump', i, x: b.x + ox, y: b.y + oy }); }
          }
          if (!hit || (!s.vx && !s.vy)) continue;
          // løypa vinner over vogna: kula skal ikke dyttes gjennom gulv, vegger eller lukker
          const cell = grid.get(key(Math.floor(X[i] / CELL), Math.floor(Y[i] / CELL)));
          if (cell) for (const it of cell) if (it.s) capsule(i, it.s.ax, it.s.ay, it.s.bx, it.s.by, it.s.t, it.s.e, 0, 0);
          for (let k = 0; k < NT; k++) if (!topen[k]) { const T = C.traps[k]; capsule(i, T.ax, T.ay, T.bx, T.by, T.t, 0.25, 0, 0); }
          const sp = Math.hypot(VX[i], VY[i]);
          if (sp > VMAX) {
            cap[i] = V_LAUNCH; launchT[i] = t; launchBy[i] = 6;
            if (sp > 1100 && t - lastLaunch[i] > 1) { lastLaunch[i] = t; events.push({ t, type: 'launch', i, x: X[i], y: Y[i], lift: 1 }); }
          }
        }
        // Glimt-hjul
        for (let q = 0; q < NW; q++) {
          const W = C.wheels[q];
          if (Math.hypot(X[i] - W.cx, Y[i] - W.cy) < W.len + R + W.t + 4) {
            if (W.fast) { spin(i, W, wa[q]); continue; }
            for (let a = 0; a < W.arms; a++) {
              const ang = wa[q] + (a * Math.PI * 2) / W.arms, ex = W.cx + Math.cos(ang) * W.len, ey = W.cy + Math.sin(ang) * W.len;
              const abx = ex - W.cx, aby = ey - W.cy, l2 = abx * abx + aby * aby;
              let qq = ((X[i] - W.cx) * abx + (Y[i] - W.cy) * aby) / l2; qq = qq < 0 ? 0 : qq > 1 ? 1 : qq;
              const qx = W.cx + abx * qq, qy = W.cy + aby * qq;
              capsule(i, W.cx, W.cy, ex, ey, W.t, 0.35, -W.w * (qy - W.cy), W.w * (qx - W.cx));
            }
          }
        }
        // svingdøra: kulene dytter den rundt, og den dytter dem videre
        for (let q = 0; q < ND; q++) {
          const Dr = C.doors[q];
          if (Math.hypot(X[i] - Dr.cx, Y[i] - Dr.cy) >= Dr.len + RAD[i] + Dr.t + 4) continue;
          for (let a = 0; a < Dr.arms; a++) {
            const ang = dth[q] + (a * Math.PI * 2) / Dr.arms, ex = Dr.cx + Math.cos(ang) * Dr.len, ey = Dr.cy + Math.sin(ang) * Dr.len;
            const abx = ex - Dr.cx, aby = ey - Dr.cy, l2 = abx * abx + aby * aby;
            let qq = ((X[i] - Dr.cx) * abx + (Y[i] - Dr.cy) * aby) / l2; qq = qq < 0 ? 0 : qq > 1 ? 1 : qq;
            const qx = Dr.cx + abx * qq, qy = Dr.cy + aby * qq, vx0 = VX[i], vy0 = VY[i];
            if (capsule(i, Dr.cx, Dr.cy, ex, ey, Dr.t, 0.25, -dom[q] * (qy - Dr.cy), dom[q] * (qx - Dr.cx))) ddL[q] -= MASS[i] * ((qx - Dr.cx) * (VY[i] - vy0) - (qy - Dr.cy) * (VX[i] - vx0));
          }
        }
        // vipper
        for (let q = 0; q < NS; q++) {
          const Pp = C.seesaws[q];
          if (Math.abs(X[i] - Pp.px) < Pp.half + 30 && Math.abs(Y[i] - Pp.py) < (dynS[q] ? Pp.half * 0.42 + 40 : 80)) {
            const c = Math.cos(sa[q]), s = Math.sin(sa[q]);
            const ax = Pp.px - c * Pp.half, ay = Pp.py - s * Pp.half, bx = Pp.px + c * Pp.half, by = Pp.py + s * Pp.half;
            const abx = bx - ax, aby = by - ay, l2 = abx * abx + aby * aby;
            let qq = ((X[i] - ax) * abx + (Y[i] - ay) * aby) / l2; qq = qq < 0 ? 0 : qq > 1 ? 1 : qq;
            const qx = ax + abx * qq, qy = ay + aby * qq;
            if (dynS[q]) { // tyngde-vippe: støtet fra kula vrir bjelken motsatt vei
              const vx0 = VX[i], vy0 = VY[i];
              if (capsule(i, ax, ay, bx, by, Pp.t, 0.25, -sr[q] * (qy - Pp.py), sr[q] * (qx - Pp.px))) dL[q] -= (qx - Pp.px) * (VY[i] - vy0) - (qy - Pp.py) * (VX[i] - vx0);
            } else capsule(i, ax, ay, bx, by, Pp.t, 0.25, -sr[q] * (qy - Pp.py), sr[q] * (qx - Pp.px));
          }
        }
        // tørrfiskhjellet: fisken svinger og slår
        for (let q = 0; q < NFI; q++) {
          const F = fish[q];
          if (Math.abs(X[i] - F.px) > F.len + 24 || Y[i] < F.py - 24 || Y[i] > F.py + F.len + 24) continue;
          const ex = F.px + Math.sin(fa[q]) * F.len, ey = F.py + Math.cos(fa[q]) * F.len;
          const abx = ex - F.px, aby = ey - F.py, l2 = abx * abx + aby * aby;
          let qq = ((X[i] - F.px) * abx + (Y[i] - F.py) * aby) / l2; qq = qq < 0 ? 0 : qq > 1 ? 1 : qq;
          const qx = F.px + abx * qq, qy = F.py + aby * qq, vx0 = VX[i], vy0 = VY[i];
          if (capsule(i, F.px, F.py, ex, ey, 7, 0.5, fw[q] * (qy - F.py), -fw[q] * (qx - F.px))) {
            fdL[q] += (qx - F.px) * (VY[i] - vy0) - (qy - F.py) * (VX[i] - vx0); // kula dytter fisken unna
            if (Math.hypot(VX[i] - vx0, VY[i] - vy0) > 220) {
              if (t - lastFish[i] > 0.7) { lastFish[i] = t; events.push({ t, type: 'fish', i, x: X[i], y: Y[i] }); }
              fishT[i] = t;
            }
          }
        }
        // ferga: dekket og bildekk-portene
        for (let q = 0; q < NF; q++) {
          const F = C.ferries[q], s = fst[q];
          if (!s.openA && Math.abs(X[i] - F.barX) < 30 && Y[i] > F.ay - 60 && Y[i] < F.ay + 20) capsule(i, F.barX, F.ay + 6, F.barX, F.ay - 42, 5, 0.2, 0, 0);
          if (Math.abs(X[i] - s.x) > F.hw + 30 || Y[i] < s.y - 64 || Y[i] > s.y + 40) continue;
          const c = Math.cos(s.tilt), sn = Math.sin(s.tilt);
          const ax = s.x - c * F.hw, ay = s.y - sn * F.hw, bx = s.x + c * F.hw, by = s.y + sn * F.hw;
          const abx = bx - ax, aby = by - ay, l2 = abx * abx + aby * aby;
          let qq = ((X[i] - ax) * abx + (Y[i] - ay) * aby) / l2; qq = qq < 0 ? 0 : qq > 1 ? 1 : qq;
          const qx = ax + abx * qq, qy = ay + aby * qq;
          const svx = s.vx - s.rate * (qy - s.y), svy = s.vy + s.rate * (qx - s.x);
          if (capsule(i, ax, ay, bx, by, 7, 0.15, svx, svy)) { // kula blir med båten
            const rel = (VX[i] - svx) * c + (VY[i] - svy) * sn, k = Math.min(1, 3 * DT);
            VX[i] -= c * rel * k; VY[i] -= sn * rel * k;
          }
          if (!s.openA) { const ex = s.x + F.sA * c * F.hw, ey = s.y + F.sA * sn * F.hw; capsule(i, ex, ey, ex, ey - 32, 5, 0.2, s.vx, s.vy); }
          if (!s.openB) { const ex = s.x + F.sB * c * F.hw, ey = s.y + F.sB * sn * F.hw; capsule(i, ex, ey, ex, ey - 32, 5, 0.2, s.vx, s.vy); }
        }
        // reinen står i veien
        for (let q = 0; q < NR; q++) {
          const s = rst[q];
          if (s.away || Math.abs(X[i] - s.x) > 60 || Math.abs(Y[i] - (s.y - 30)) > 56) continue;
          const vx0 = VX[i], vy0 = VY[i];
          if (capsule(i, s.x - 16, s.y - 30, s.x + 16, s.y - 30, 18, 0.3, s.vx, s.vy) && Math.hypot(VX[i] - vx0, VY[i] - vy0) > 90 && t - reinT[i] > 1.5) {
            reinT[i] = t;
            events.push({ t, type: 'rein', i, x: s.x, y: s.y - 50 });
          }
        }
        // steinras foran tunnelåpningen
        for (let q = 0; q < NU; q++) if (tclosed[q]) { const T = C.tunnels[q]; capsule(i, T.mx, T.my, T.mx, T.my, 16, 0.3, 0, 0); }
      }
      // tyngde-vippene svarer på støtene fra kulene
      if (anyDyn) for (let q = 0; q < NS; q++) {
        if (!dynS[q]) continue;
        const Pp = C.seesaws[q];
        om[q] += (dL[q] - (Pp.k * th[q] + Pp.c * om[q]) * DT) / Pp.I;
        th[q] += om[q] * DT;
        if (th[q] > Pp.max) { th[q] = Pp.max; if (om[q] > 0) om[q] *= -0.2; }
        else if (th[q] < -Pp.max) { th[q] = -Pp.max; if (om[q] < 0) om[q] *= -0.2; }
        dL[q] = 0;
      }
      // svingdørene svarer på støtene, og bremser sakte opp av seg selv
      for (let q = 0; q < ND; q++) {
        const Dr = C.doors[q];
        dom[q] += (ddL[q] - Dr.c * dom[q] * DT) / Dr.I;
        if (dom[q] > W_DOOR) dom[q] = W_DOOR; else if (dom[q] < -W_DOOR) dom[q] = -W_DOOR;
        dth[q] += dom[q] * DT;
        ddL[q] = 0;
      }
      // tørrfisken: tyngde, vind og støt fra kulene
      for (let q = 0; q < NFI; q++) {
        const F = fish[q];
        fom[q] += ((-F.kg * Math.sin(fth[q]) - F.c * fom[q] + F.drive * Math.sin(F.wd * t + F.ph)) * DT + fdL[q]) / F.I;
        fth[q] += fom[q] * DT;
        if (fth[q] > 1.35) { fth[q] = 1.35; if (fom[q] > 0) fom[q] *= -0.3; }
        else if (fth[q] < -1.35) { fth[q] = -1.35; if (fom[q] < 0) fom[q] *= -0.3; }
        fdL[q] = 0;
      }
      // Sjefen sikter på nærmeste kule foran seg (litt foran den) og skyter
      for (let q = 0; q < NB; q++) {
        const Bq = C.bosses[q];
        if (t < bNext[q]) continue;
        const seen = [];
        for (let i = 0; i < n; i++) {
          if (state[i] !== ST.RACE || hold[i]) continue;
          const dx = X[i] - Bq.gx, dy = Y[i] - Bq.gy;
          if (Bq.dir * dx < 15 || Math.abs(dy) > Math.abs(dx) * 2 + 40) continue;
          const d = Math.hypot(dx, dy);
          if (d <= Bq.range) seen.push([d, i]);
        }
        seen.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        let best = -1, bd = Infinity;
        for (const [d, i] of seen.slice(0, 6)) if (clear(Bq.gx, Bq.gy, X[i], Y[i])) { best = i; bd = d; break; } // bare kuler han ser
        if (best < 0) { bNext[q] = t + 0.2; continue; }
        const tf = bd / BOLT_V, tx = X[best] + VX[best] * tf - Bq.gx, ty = Y[best] + VY[best] * tf - Bq.gy, tl = Math.hypot(tx, ty) || 1;
        const shot = { t0: t, x: Bq.gx, y: Bq.gy, vx: (tx / tl) * BOLT_V, vy: (ty / tl) * BOLT_V, t1: t + Bq.range / BOLT_V + 0.05, q };
        Bq.shots.push(shot); bolts.push(shot);
        events.push({ t, type: 'shot', q, x: Bq.gx, y: Bq.gy });
        bNext[q] = t + Bq.cd;
      }
      // strålene flyr rett fram og stopper i første kule, vegg eller rampe
      for (let k = bolts.length - 1; k >= 0; k--) {
        const s = bolts[k], bx = s.x + s.vx * (t - s.t0), by = s.y + s.vy * (t - s.t0);
        let done = t >= s.t1;
        if (!done) for (let i = 0; i < n; i++) {
          if (state[i] !== ST.RACE || hold[i] || Math.abs(X[i] - bx) > R + 8 || Math.abs(Y[i] - by) > R + 8 || Math.hypot(X[i] - bx, Y[i] - by) > R + 7) continue;
          if (C.bosses[s.q].zap) { // fordampet
            state[i] = ST.OUT; tDone[i] = t; cause[i] = 'k_sjef'; lastDoneT = t;
            events.push({ t, type: 'out', i, cause: 'k_sjef' });
            X[i] = -500; VX[i] = 0; VY[i] = 0;
          } else { // dyttet av gårde (kraften velges i designeren, litt løft oppover følger med)
            const Fp = C.bosses[s.q].force;
            VX[i] += (s.vx / BOLT_V) * Fp; VY[i] += (s.vy / BOLT_V) * Fp - (Fp * 260) / 900;
            cap[i] = V_LAUNCH; launchT[i] = t; launchBy[i] = 5;
            events.push({ t, type: 'zapped', i, x: X[i], y: Y[i] });
          }
          s.hit = i; done = true;
          break;
        }
        if (!done) {
          const cell = grid.get(key(Math.floor(bx / CELL), Math.floor(by / CELL)));
          if (cell) for (const it of cell) if (it.s && segDist(bx, by, it.s) < it.s.t + 4) { done = true; break; }
          if (!done && NMV && onMover(bx, by)) done = true;
        }
        if (done) { s.t1 = Math.min(s.t1, t); bolts.splice(k, 1); }
      }
      // ørna, sensorer, mål og fall ut av verden
      for (let i = 0; i < n; i++) {
        if (state[i] !== ST.RACE) continue;
        let got = false;
        for (let q = 0; q < NE; q++) {
          const cl = claws[q];
          if (cl && cl.p > 0.3 && cl.p < 0.75 && !grabbed[q].has(cl.k) && Math.hypot(X[i] - cl.x, Y[i] - cl.y) < R + C.eagles[q].reach) {
            if (hold[i]) { loaded[hold[i] - 1] = -1; hold[i] = 0; } // ørna tok kula rett fra raketten
            grabbed[q].add(cl.k); carrier[i] = q; state[i] = ST.CARRY; tDone[i] = t; cause[i] = 'k_orna'; lastDoneT = t;
            events.push({ t, type: 'out', i, cause: 'k_orna' });
            got = true;
            break;
          }
        }
        if (got) continue;
        const f = C.finish;
        if (X[i] > f.x0 && X[i] < f.x1 && Y[i] > f.y0 && Y[i] < f.y1) { state[i] = ST.FIN; tDone[i] = t; lastDoneT = t; events.push({ t, type: 'finish', i }); continue; }
        for (const s of C.sensors) {
          if (X[i] > s.x0 && X[i] < s.x1 && Y[i] > s.y0 && Y[i] < s.y1) {
            state[i] = ST.OUT; tDone[i] = t; cause[i] = s.cause; pn[i] = s.pn; lastDoneT = t;
            events.push(s.pn ? { t, type: 'out', i, cause: s.cause, pn: s.pn } : { t, type: 'out', i, cause: s.cause });
            break;
          }
        }
        if (state[i] === ST.RACE && NU) for (let q = 0; q < NU; q++) { // inn i tunnelen (hvis den ikke er stengt)
          const T = C.tunnels[q];
          if (!tclosed[q] && t >= noTun[i] && Math.hypot(X[i] - T.mx, Y[i] - T.my) < 24) {
            if (hold[i]) { loaded[hold[i] - 1] = -1; hold[i] = 0; }
            state[i] = ST.TUNNEL; tunQ[i] = q; tunOut[i] = t + T.transit; tunV[i] = Math.hypot(VX[i], VY[i]);
            events.push({ t, type: 'tunnel', i, x: T.mx, y: T.my });
            X[i] = T.mx; Y[i] = -99999; VX[i] = 0; VY[i] = 0; // gjemt mens den kjører gjennom fjellet
            break;
          }
        }
        if (state[i] === ST.RACE && NK && !hold[i]) for (let q = 0; q < NK; q++) { // raketten lastes
          const L = C.rockets[q];
          if (loaded[q] < 0 && t >= noCatch[i] && Math.hypot(X[i] - L.hx, Y[i] - L.hy) < 22) { loaded[q] = i; loadT[q] = t; hold[i] = q + 1; X[i] = L.hx; Y[i] = L.hy; VX[i] = 0; VY[i] = 0; break; }
        }
        if (state[i] === ST.RACE && NSP) for (let q = 0; q < NSP; q++) { // mellomtid: første gang kula passerer streken
          const Sp = C.splits[q];
          if (!passed[i * NSP + q] && segDistXY(X[i], Y[i], Sp.ax, Sp.ay, Sp.bx, Sp.by) < RAD[i] + 6) { passed[i * NSP + q] = 1; events.push({ t, type: 'split', i, q, rank: ++splitN[q] }); }
        }
        if (state[i] === ST.RACE && (X[i] < -30 || X[i] > C.W + 30 || Y[i] > C.H)) {
          // trampolina og kaffen får skylda bare en liten stund etterpå (og vifta tar den hvis kula nettopp var der)
          const lb = t - launchT[i] < (launchBy[i] >= 7 ? 2.5 : 6) ? launchBy[i] : 0;
          state[i] = ST.OUT; tDone[i] = t; lastDoneT = t;
          cause[i] = lb === 2 ? 'k_rakett' : lb === 3 ? 'k_salt' : lb === 4 ? 'k_arm' : lb === 5 ? 'k_sjef' : lb === 6 ? 'k_heis' : t - fanT[i] < 1.2 ? 'k_vifte' : lb === 7 ? 'k_tramp' : lb === 8 ? 'k_kaffe' : (flung(C, X[i], Y[i]) || lb === 1) ? 'k_glimt'
            : flung(C, X[i], Y[i], true) ? 'k_arm' : t - fishT[i] < 3 ? 'k_fisk' : t - fanT[i] < 3 ? 'k_vifte' : 'k_kant';
          events.push({ t, type: 'out', i, cause: cause[i] });
        }
      }
      if (step % REC === 0) {
        const fr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { fr[i * 3] = X[i]; fr[i * 3 + 1] = Y[i]; fr[i * 3 + 2] = ANG[i]; }
        frames.push(fr);
        if (anyDyn) for (let q = 0; q < NS; q++) if (dynS[q]) srec[q].push(th[q]);
        for (let q = 0; q < NFI; q++) frec[q].push(fth[q]);
        for (let q = 0; q < ND; q++) drec[q].push(dth[q]);
        for (let q = 0; q < NMV; q++) if (C.movers[q].hold) mrec[q].push(lead[q]);
      }
      t += DT; step++;
      let racing = 0;
      for (let i = 0; i < n; i++) if (state[i] === ST.RACE || state[i] === ST.TUNNEL) racing++;
      if (!racing && t > lastDoneT + 2) break;
      if (t >= T_MAX && racing) {
        for (let i = 0; i < n; i++) if (state[i] === ST.RACE || state[i] === ST.TUNNEL) { state[i] = ST.OUT; tDone[i] = t; cause[i] = 'k_fast'; events.push({ t, type: 'out', i, cause: 'k_fast' }); }
        lastDoneT = t;
      }
    }
    C.seesaws.forEach((s, q) => { if (dynS[q]) s.rec = Float32Array.from(srec[q]); });
    fish.forEach((f, q) => { f.rec = Float32Array.from(frec[q]); });
    C.doors.forEach((d, q) => { d.rec = Float32Array.from(drec[q]); });
    C.movers.forEach((M, q) => { if (M.hold) M.rec = Float32Array.from(mrec[q]); });
    events.sort((a, b) => a.t - b.t);
    const idx = Array.from({ length: n }, (_, i) => i);
    const fin = idx.filter((i) => state[i] === ST.FIN).sort((a, b) => tDone[a] - tDone[b]);
    const out = idx.filter((i) => state[i] !== ST.FIN).sort((a, b) => tDone[b] - tDone[a]);
    return { C, n, seed, frames, fps: 240 / REC, events, rank: fin.concat(out), finishers: fin.length, tDone, cause, pn, duration: t };
  }

  /* ---------- Usynlige sjekkpunkter: hvem leder? ----------
     Hvem som leder kan ikke leses av høyden når løypa går oppover (bagasjebånd, rakett, Glimt-hjul, Sjefen …).
     Etter simuleringen deles løypa i små ruter, og hver rute blir et usynlig sjekkpunkt med en verdi: hvor fort en
     kule har kommet seg i mål derfra, langs veiene kulene faktisk kjørte og i den retningen de kjørte (et bånd
     oppover teller altså som framover). Lederen er kula med minst tid igjen. Opptaket endres ikke, så alt er likt i reprisen. */
  const CPS = 24;          // sjekkpunkt-rute (mindre enn avstanden mellom en kule oppå og en kule under en rampe)
  const CP_MED = 5;        // glatting: median over ±5 bilder (±0,17 s), så et kort streif innom en snarvei ikke teller
  function checkpoints(res) {
    if (res.left) return res.left;
    const { n, frames, fps, tDone, C } = res;
    const F = frames.length;
    const cell = (x, y) => Math.floor(y / CPS) * 1000 + Math.floor(x / CPS) + 500;
    const fin = new Uint8Array(n);
    res.events.forEach((e) => { if (e.type === 'finish') fin[e.i] = 1; });
    const lastF = (i) => Math.max(0, Math.min(F - 1, fin[i] ? Math.ceil(tDone[i] * fps) : Math.floor(tDone[i] * fps)));
    // 1) hver gang en kule går fra en rute til en annen: fra → til, med tiden den brukte i ruta den forlot (korteste tid teller)
    const rev = new Map(), goal = new Set();
    const link = (a, b, w) => { let m = rev.get(b); if (!m) { m = new Map(); rev.set(b, m); } const o = m.get(a); if (o === undefined || w < o) m.set(a, w); };
    for (let i = 0; i < n; i++) {
      const L = lastF(i);
      let pc = null, enter = 0, px = 0, py = 0, pt = 0;
      for (let f = 0; f <= L; f++) {
        const x = frames[f][i * 3], y = frames[f][i * 3 + 1], t = f / fps;
        if (y < -50000) continue; // inne i en tunnel: tiden der inne regnes med når den kommer ut
        if (pc === null) { pc = cell(x, y); enter = t; px = x; py = y; pt = t; continue; }
        const d = Math.hypot(x - px, y - py), steps = d > 260 ? 1 : Math.max(1, Math.ceil(d / (CPS / 2))); // fort → gå gjennom rutene imellom
        for (let s = 1; s <= steps; s++) {
          const q = s / steps, c = cell(px + (x - px) * q, py + (y - py) * q);
          if (c === pc) continue;
          const ts = pt + (t - pt) * q;
          link(pc, c, ts - enter); pc = c; enter = ts;
        }
        px = x; py = y; pt = t;
      }
      if (fin[i] && pc !== null) goal.add(pc);
    }
    // 2) korteste tid til mål fra hver rute (Dijkstra baklengs fra rutene der kulene kom i mål)
    const dist = new Map(), hk = [], hc = [];
    const push = (k, c) => {
      let j = hk.length; hk.push(k); hc.push(c);
      while (j > 0) { const p = (j - 1) >> 1; if (hk[p] <= k) break; hk[j] = hk[p]; hc[j] = hc[p]; j = p; }
      hk[j] = k; hc[j] = c;
    };
    const pop = () => {
      const k0 = hk[0], c0 = hc[0], k = hk.pop(), c = hc.pop(), N = hk.length;
      if (N) {
        let j = 0;
        for (;;) { let m = 2 * j + 1; if (m >= N) break; if (m + 1 < N && hk[m + 1] < hk[m]) m++; if (hk[m] >= k) break; hk[j] = hk[m]; hc[j] = hc[m]; j = m; }
        hk[j] = k; hc[j] = c;
      }
      return [k0, c0];
    };
    goal.forEach((g) => { dist.set(g, 0); push(0, g); });
    while (hk.length) {
      const [d, c] = pop();
      if (d > dist.get(c)) continue;
      const r = rev.get(c);
      if (r) for (const [a, w] of r) { const nd = d + w, o = dist.get(a); if (o === undefined || nd < o) { dist.set(a, nd); push(nd, a); } }
    }
    let maxD = 0;
    dist.forEach((v) => { if (v > maxD) maxD = v; });
    // 3) tid igjen for hver kule i hvert bilde. En rute uten verdi er en rute ingen kom i mål fra – og siden kula selv
    //    også er med i kartet, kommer den aldri i mål herfra. Den havner bakerst blant dem som er igjen (i samme rekkefølge
    //    som før), så kameraet ikke følger en kule som faller utfor. Inne i tunnelen beholder kula verdien den hadde.
    const left = new Float32Array(F * n), raw = new Float64Array(F), win = new Float64Array(2 * CP_MED + 1);
    for (let i = 0; i < n; i++) {
      const L = lastF(i);
      let prev = null, known = 0;
      for (let f = 0; f < F; f++) {
        if (f > L) { raw[f] = raw[L]; continue; }
        const x = frames[f][i * 3], y = frames[f][i * 3 + 1];
        let v;
        if (y < -50000) v = prev !== null ? prev : maxD + 1;
        else if (!goal.size) v = (C.H - y) / 600; // ingen kom i mål (testkjøring i designeren): dypest leder, som før
        else { const d = dist.get(cell(x, y)); if (d === undefined) v = maxD + 1 + known; else v = known = d; }
        raw[f] = v; prev = v;
      }
      for (let f = 0; f < F; f++) {
        const a = Math.max(0, f - CP_MED), b = Math.min(F - 1, f + CP_MED), m = b - a + 1;
        for (let k = 0; k < m; k++) { const v = raw[a + k]; let j = k; while (j > 0 && win[j - 1] > v) { win[j] = win[j - 1]; j--; } win[j] = v; }
        left[f * n + i] = win[m >> 1];
      }
    }
    res.left = left;
    return left;
  }
  /* Tid igjen til mål for kule i ved tid t (lavest = leder) */
  function leftAt(res, i, t) {
    const L = res.left || checkpoints(res), n = res.n, F = res.frames.length, k = t * res.fps;
    let a = Math.floor(k);
    if (a >= F - 1) return L[(F - 1) * n + i];
    if (a < 0) a = 0;
    const A = L[a * n + i];
    return A + (L[(a + 1) * n + i] - A) * (k - a);
  }

  /* Kjør med nye seeds til minst «need» kuler kommer i mål (løypa er den samme, bare starten varierer) */
  function race(n, seed, need, def, tries = 8) {
    let best = null;
    for (let k = 0; k < tries; k++) {
      const res = simulate(n, (seed + k * 7919) >>> 0, def);
      if (!best || res.finishers > best.finishers) best = res;
      if (res.finishers >= need) return res;
    }
    return best;
  }

  /* ---------- Godkjenning av egne løyper ---------- */
  function summarize(res) {
    const times = res.events.filter((e) => e.type === 'finish').map((e) => e.t - GATE_T);
    const causes = {};
    res.events.forEach((e) => { if (e.type === 'out') { const k = e.pn ? `${e.cause}:${e.pn}` : e.cause; causes[k] = (causes[k] || 0) + 1; } });
    return { n: res.n, finishers: res.finishers, times, causes };
  }
  function assess(runs, need) {
    const tot = runs.reduce((s, r) => s + r.n, 0), fin = runs.reduce((s, r) => s + r.finishers, 0);
    const rate = tot ? fin / tot : 0;
    const minRate = runs.length ? Math.min(...runs.map((r) => r.finishers / r.n)) : 0;
    const med = (arr) => { const a = arr.slice().sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : Infinity; };
    const winT = med(runs.map((r) => (r.times.length >= need ? r.times[need - 1] : Infinity)));
    const firstT = med(runs.map((r) => (r.times.length ? r.times[0] : Infinity)));
    const causes = {};
    runs.forEach((r) => Object.keys(r.causes).forEach((k) => { causes[k] = (causes[k] || 0) + r.causes[k]; }));
    const reasons = [];
    if (minRate < 0.3 || runs.some((r) => r.finishers < need)) reasons.push(`For få kom i mål i ett av prøveløpene (ned til ${Math.round(minRate * 100)} %). Minst ${need} kuler og 30 % må klare det hver gang.`);
    if (rate < 0.45) reasons.push(`Bare ${Math.round(rate * 100)} % kom i mål totalt. Minst 45 % må klare det.`);
    if (!(winT <= T_MAX - GATE_T - 6)) reasons.push('Løpet tar for lang tid. Vinnerne må være nede på under 75 sekunder.');
    if (reasons.length) { // pek på det som mest sannsynlig er galt
      const share = (id) => Object.keys(causes).filter((c) => c === id || c.startsWith(id + ':')).reduce((s, c) => s + causes[c], 0) / Math.max(1, tot);
      if (share('k_fast') > 0.15) reasons.push('Tips: mange kuler blir liggende fast. Se etter steder der noe sperrer veien, eller ramper som er for slakke.');
      if (share('k_kant') > 0.15) reasons.push('Tips: mange triller utfor kanten. Sett vegger på endene av rampene.');
      if (share('k_hull') > 0.25) reasons.push('Tips: hullene sluker mange. Gjør dem smalere, eller flytt dem litt unna.');
      if (share('k_glimt') > 0.15) reasons.push('Tips: Glimt-hjulet skyter mange kuler ut av løypa. Sett opp vegger rundt det, eller skru ned farten.');
      if (share('k_salt') > 0.2) reasons.push('Tips: Saltstraumen tar mange. Gjør virvelen mindre, flytt den, eller skru av sluket.');
      if (share('k_ferje') > 0.15) reasons.push('Tips: mange rekker ikke ferga. La rampene ende rett ved kaiene, og la ferga gå litt saktere.');
      if (share('k_rakett') > 0.15) reasons.push('Tips: raketten skyter mange ut i verdensrommet. Senk kraften eller sikt bedre – designeren viser banen.');
      if (share('k_fisk') > 0.15) reasons.push('Tips: tørrfisken slår mange ut av løypa. Sett opp vegger ved hjellet.');
      if (share('k_arm') > 0.15) reasons.push('Tips: Glimt-armen slår mange ut av løypa. Sett opp vegger rundt den, eller skru ned farten.');
      if (share('k_heis') > 0.15) reasons.push('Tips: delene på skinne kaster mange ut av løypa. Sett opp vegger, kjør kortere, bruk «Myk» i stedet for «Kast», eller la magneten slippe før plata er i full fart.');
      if (share('k_tramp') > 0.15) reasons.push('Tips: trampolina spretter mange ut av løypa. Skru ned spretten, vri den, eller sett opp vegger der kulene lander.');
      if (share('k_kaffe') > 0.15) reasons.push('Tips: kaffen gir mange så mye fart at de flyr ut av løypa. Skru ned styrken, eller sett en vegg i enden.');
      if (share('k_vifte') > 0.15) reasons.push('Tips: kontorvifta blåser mange ut av løypa. Skru ned styrken, eller sett opp vegger rundt den.');
      if (share('k_sjef') > 0.15) reasons.push('Tips: Sjefen tar mange. Gi ham kortere rekkevidde, la ham bare dytte, eller sett opp en vegg foran ham.');
    }
    return { ok: !reasons.length, rate, minRate, winT: Number.isFinite(winT) ? winT : null, firstT: Number.isFinite(firstT) ? firstT : null, causes, reasons, runs: runs.length, marbles: tot, need };
  }

  FL.KPhys = { R, R_BIG, R_SMALL, GATE_T, T_MAX, ST, WORLD_W, W_FAST, W_MAX, TYPES, LIMITS, ORIGINAL, RIDERS, canRide, EASES, STEPS_MAX, PTS_MAX, V_RAIL, VISUAL, COLORS, SKIES, course, compile, normalize, sanePiece, hash, kin, simulate, race, summarize, assess, aimPath, checkpoints, leftAt, railCenter, railPlan, railPath, railReach, railShift, pathAt, magOf, magHold };
})();
