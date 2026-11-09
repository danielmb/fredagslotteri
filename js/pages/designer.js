/* Løypedesigneren for Keiservarden GP: bygg egne løyper av deler, testkjør med ekte fysikk,
   godkjenn dem og bruk dem i trekningen. Selve trekningen er like rettferdig som før –
   løypa bestemmer bare hvordan det ser ut når vinnerne triller ned. */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u,
    Store = FL.Store,
    P = FL.KPhys,
    D = FL.KDraw,
    Ev = FL.Events;
  const { $, esc } = u;
  const DRAFT = 'fredagslotteriet:designer';
  const GRID = 10;
  const VAL_RUNS = 5,
    VAL_N = 30;
  const COLORS = [
    '#ee4a2f',
    '#e8912c',
    '#20a98e',
    '#4f7dff',
    '#9466ff',
    '#df4f86',
    '#1597bd',
    '#b9802a',
    '#4fae3e',
    '#f0684a',
    '#6c7cf2',
    '#cf4762',
    '#178f7c',
    '#a95fd6',
    '#d39a12',
    '#3290f0',
  ];
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------- Delene ---------- */
  const SVG = {
    ramp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8 L21 16" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/><circle cx="7" cy="5.6" r="2.4" fill="#5ef2b5"/></svg>',
    wall: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 V21" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/></svg>',
    pegs: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="5" cy="6" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="8.5" cy="12" r="2"/><circle cx="15.5" cy="12" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="19" cy="18" r="2"/></svg>',
  };
  const KINDS = {
    start: {
      name: 'Startporten',
      ico: '🚦',
      help: 'Trakta på toppen. Kulene slippes herfra etter nedtellingen. Kan flyttes, men ikke slettes.',
    },
    finish: {
      name: 'Mål i Bodø havn',
      ico: '🏁',
      help: 'Første kule gjennom målstreken vinner. Byen og havna følger med målet. Kan flyttes, men ikke slettes.',
    },
    ramp: {
      name: 'Rampe',
      ico: SVG.ramp,
      help: 'Kulene ruller nedover den. Dra i endene for å endre lengde og helning.',
      make: (x, y) => ({ ax: x - 220, ay: y - 40, bx: x + 220, by: y + 40 }),
    },
    wall: {
      name: 'Vegg',
      ico: SVG.wall,
      help: 'Stopper kuler som spretter. Fin å sette på enden av en rampe.',
      make: (x, y) => ({ ax: x, ay: y - 100, bx: x, by: y + 100 }),
    },
    pegs: {
      name: 'Spikerbrett',
      ico: SVG.pegs,
      help: 'Kulene spretter mellom spikrene og kommer ut et tilfeldig sted. Dra i hjørnet for å endre størrelsen.',
      make: (x, y) => ({ x: x - 200, y: y - 110, w: 400, rows: 5 }),
    },
    bumper: {
      name: 'TUT-bumper',
      ico: '🔴',
      help: 'Hurtigruta-tut! Skyter kulene unna med et smell.',
      make: (x, y) => ({ x, y }),
    },
    wheel: {
      name: 'Glimt-hjul',
      ico: '💛',
      help: 'Spinner som en kontring. Kuler som kommer for nær, kan bli slått rett ut av løypa. Skru farten over 5, så skyter det kulene til værs.',
      make: (x, y) => ({ x, y, len: 100, speed: 2.2, arms: 4 }),
    },
    seesaw: {
      name: 'Vippe',
      ico: '⚖️',
      help: 'Vipper fram og tilbake og sender kulene to veier. Velg «Tyngde», så vipper den etter vekta av kulene som lander på den.',
      make: (x, y) => ({ x, y, half: 140 }),
    },
    trap: {
      name: 'Luke',
      ico: '🚪',
      help: 'Går opp innimellom. Legg et hull under, så blir det spennende.',
      make: (x, y) => ({ ax: x - 50, ay: y, bx: x + 50, by: y + 10 }),
    },
    pit: {
      name: 'Hull',
      ico: '🕳️',
      help: 'Kuler som havner her, er ute. Gi hullet et navn – det står i loggen når noen faller nedi.',
      make: (x, y) => ({
        x0: x - 56,
        x1: x + 56,
        yl: y - 70,
        yr: y - 70,
        y1: y + 80,
        name: 'Hullet',
      }),
    },
    wind: {
      name: 'Vind',
      ico: '🌬️',
      help: 'Vindkast som blåser kulene sidelengs inne i feltet.',
      make: (x, y) => ({
        x0: x - 160,
        y0: y - 120,
        x1: x + 160,
        y1: y + 120,
        dir: -1,
      }),
    },
    eagle: {
      name: 'Ørna',
      ico: '🦅',
      help: 'Stuper langs den stiplede linja og tar med seg en kule nå og da. Legg linja langs en rampe.',
      make: (x, y) => ({ ax: x + 320, ay: y - 60, bx: x - 320, by: y + 60 }),
    },
    sign: {
      name: 'Skilt',
      ico: '🪧',
      help: 'Bare pynt. Skriv hva du vil.',
      make: (x, y) => ({ x, y, text: 'NYTT SKILT' }),
    },
    vortex: {
      name: 'Saltstraumen',
      pal: 'Saltstraumen',
      ico: '🌀',
      help: 'Verdens sterkeste malstrøm, rett utenfor Bodø. Suger kulene inn, spinner dem et par runder og spytter dem ut et tilfeldig sted. Med sluk forsvinner noen ned i dypet.',
      make: (x, y) => ({ x, y, r: 130, dir: 1, drain: 0 }),
    },
    belt: {
      name: 'Bagasjebånd',
      pal: 'Bagasjebånd',
      ico: '🧳',
      help: 'Fra Bodø lufthavn: frakter kulene i den retningen pilene går – også oppover. «Kula di kommer på bånd 2.»',
      make: (x, y) => ({ ax: x - 160, ay: y + 30, bx: x + 160, by: y - 30, speed: 240 }),
    },
    ferry: {
      name: 'Ferga til Lofoten',
      pal: 'Ferga',
      ico: '⛴️',
      help: 'Går mellom kaia ved A og kaia ved B. Bommen på A-kaia er nede når ferga er borte. Ved B tipper ferga av passasjerene. Rakk du ikke ferga, havner du i havet.',
      make: (x, y) => ({ ax: x - 200, ay: y, bx: x + 200, by: y, speed: 260 }),
    },
    rocket: {
      name: 'Andøya-raketten',
      pal: 'Raketten',
      ico: '🚀',
      help: 'Fanger én kule om gangen, teller ned og fyrer den av. Dra i pilspissen for å sikte – den stiplede linja viser hvor kula flyr.',
      make: (x, y) => ({ x, y, ang: 60, pow: 1300 }),
    },
    tunnel: {
      name: 'Tunnel',
      pal: 'Tunnel',
      ico: '🚇',
      help: 'Kuler som triller inn i åpningen ved A, kommer ut ved B. Av og til er tunnelen stengt på grunn av ras – da må kulene vente.',
      make: (x, y) => ({ ax: x - 250, ay: y, bx: x + 250, by: y + 200, dir: 1, ras: 1 }),
    },
    rack: {
      name: 'Tørrfiskhjell',
      pal: 'Tørrfisk',
      ico: '🐟',
      help: 'Tørrfisk som henger og svinger i vinden og slår til kulene. Kulene kan dytte fisken unna. Dra i høyre ende for å gjøre hjellet lengre.',
      make: (x, y) => ({ x: x - 130, y: y - 60, w: 260, len: 70 }),
    },
    rein: {
      name: 'Rein i veien',
      pal: 'Rein',
      ico: '🦌',
      help: 'Rusler fram og tilbake langs streken, beiter og stenger veien. Innimellom går den til skogs, og da slipper kulene forbi. Legg streken langs en rampe.',
      make: (x, y) => ({ ax: x - 180, ay: y, bx: x + 180, by: y + 30 }),
    },
    slush: {
      name: 'Slaps',
      pal: 'Slaps',
      ico: '🌨️',
      help: 'November i Bodø. Alt som triller gjennom feltet, sakker kraftig ned.',
      make: (x, y) => ({ x0: x - 150, y0: y - 60, x1: x + 150, y1: y + 60 }),
    },
  };
  const PALETTE = [
    'ramp',
    'wall',
    'pegs',
    'bumper',
    'wheel',
    'seesaw',
    'trap',
    'pit',
    'wind',
    'eagle',
    'vortex',
    'belt',
    'ferry',
    'rocket',
    'tunnel',
    'rack',
    'rein',
    'slush',
    'sign',
  ];
  const FIELDS = {
    pegs: [
      { k: 'rows', label: 'Rader', min: 1, max: 14, step: 1 },
      { k: 'w', label: 'Bredde', min: 64, max: 1500, step: 2 },
    ],
    wheel: [
      { k: 'len', label: 'Armlengde', min: 50, max: 180, step: 1 },
      {
        k: 'speed',
        label: 'Fart (minus = andre veien)',
        min: -P.W_MAX,
        max: P.W_MAX,
        step: 0.1,
      },
      { k: 'arms', label: 'Armer', min: 2, max: 6, step: 1 },
    ],
    seesaw: [
      { k: 'half', label: 'Lengde (halv)', min: 60, max: 260, step: 2 },
      {
        k: 'phys',
        label: 'Vipper av',
        opts: [
          [0, '⚙️ Motor'],
          [1, '⚖️ Tyngde'],
        ],
      },
    ],
    pit: [{ k: 'name', label: 'Navn på hullet', text: 24 }],
    sign: [{ k: 'text', label: 'Tekst på skiltet', text: 28 }],
    wind: [{ k: 'dir', label: 'Blåser mot', dir: true }],
    vortex: [
      { k: 'r', label: 'Størrelse', min: 70, max: 240, step: 2 },
      {
        k: 'dir',
        label: 'Snurrer',
        opts: [
          [1, '↻ Med klokka'],
          [-1, '↺ Mot klokka'],
        ],
      },
      {
        k: 'drain',
        label: 'Sluk i midten',
        opts: [
          [0, 'Nei'],
          [1, 'Ja – noen forsvinner'],
        ],
      },
    ],
    belt: [
      {
        k: 'speed',
        label: 'Fart (minus = andre veien)',
        min: -600,
        max: 600,
        step: 10,
      },
    ],
    ferry: [{ k: 'speed', label: 'Fart', min: 120, max: 420, step: 10 }],
    rocket: [
      { k: 'ang', label: 'Retning (grader)', min: 0, max: 180, step: 1 },
      { k: 'pow', label: 'Kraft', min: 500, max: 2400, step: 10 },
    ],
    tunnel: [
      { k: 'dir', label: 'Kommer ut mot', dir: true },
      {
        k: 'ras',
        label: 'Ras',
        opts: [
          [1, 'Innimellom'],
          [0, 'Aldri'],
        ],
      },
    ],
    rack: [{ k: 'len', label: 'Lengde på fisken', min: 40, max: 120, step: 1 }],
  };
  const TEST_SAY = {
    k_vind: 'blåste ned i Juvet',
    k_ornes: 'falt gjennom Ørnes-luka',
    k_orna: 'ble tatt av ørna',
    k_glimt: 'ble slått ut av Glimt-hjulet',
    k_kant: 'trillet utfor kanten',
    k_fast: 'satt fast',
    k_hull: 'falt ned i et hull',
    k_salt: 'ble tatt av Saltstraumen',
    k_ferje: 'rakk ikke ferga og havnet i havet',
    k_rakett: 'ble skutt ut i verdensrommet',
    k_fisk: 'fikk en tørrfisk i trynet',
  };
  const SIMPLE = [
    { type: 'start', x: 800, y: 300 },
    { type: 'wall', ax: 610, ay: 262, bx: 610, by: 346 },
    { type: 'ramp', ax: 612, ay: 340, bx: 1460, by: 518 },
    { type: 'wall', ax: 1500, ay: 400, bx: 1500, by: 600 },
    { type: 'wall', ax: 1550, ay: 380, bx: 1550, by: 640 },
    { type: 'ramp', ax: 1530, ay: 610, bx: 330, by: 862 },
    { type: 'wall', ax: 90, ay: 760, bx: 90, by: 975 },
    { type: 'ramp', ax: 100, ay: 960, bx: 1360, by: 1130 },
    { type: 'finish', x: 1290, y: 990 },
    { type: 'sign', x: 300, y: 110, text: 'MIN EGEN LØYPE' },
  ];
  // demo med alle de nye delene (godkjent: rundt 75 % kommer i mål)
  const DEMO = [
    { type: 'start', x: 800, y: 300 },
    { type: 'wall', ax: 610, ay: 262, bx: 610, by: 346 },
    { type: 'ramp', ax: 612, ay: 340, bx: 1080, by: 430 },
    { type: 'vortex', x: 1250, y: 600, r: 130, dir: 1, drain: 0 },
    { type: 'wall', ax: 1590, ay: 380, bx: 1590, by: 900 },
    { type: 'ramp', ax: 1585, ay: 880, bx: 330, by: 1080 },
    { type: 'wall', ax: 90, ay: 900, bx: 90, by: 1340 },
    { type: 'seesaw', x: 340, y: 1170, half: 140, phys: 1 },
    { type: 'ramp', ax: 95, ay: 1330, bx: 880, by: 1450 },
    { type: 'rack', x: 300, y: 1300, w: 340, len: 50 },
    { type: 'slush', x0: 560, y0: 1340, x1: 820, y1: 1460 },
    { type: 'ferry', ax: 975, ay: 1475, bx: 1360, by: 1475, speed: 280 },
    { type: 'ramp', ax: 1452, ay: 1500, bx: 1530, by: 1525 },
    { type: 'wall', ax: 1590, ay: 1350, bx: 1590, by: 1800 },
    { type: 'ramp', ax: 1585, ay: 1780, bx: 420, by: 2010 },
    { type: 'rein', ax: 1350, ay: 1826, bx: 900, by: 1915 },
    { type: 'tunnel', ax: 520, ay: 1990, bx: 700, by: 2250, dir: 1, ras: 1 },
    { type: 'wall', ax: 90, ay: 1950, bx: 90, by: 2160 },
    { type: 'ramp', ax: 95, ay: 2150, bx: 1000, by: 2300 },
    { type: 'rocket', x: 1035, y: 2325, ang: 60, pow: 680 },
    { type: 'wall', ax: 1590, ay: 2150, bx: 1590, by: 2460 },
    { type: 'ramp', ax: 1585, ay: 2440, bx: 250, by: 2620 },
    { type: 'wall', ax: 90, ay: 2500, bx: 90, by: 2720 },
    { type: 'ramp', ax: 95, ay: 2700, bx: 900, by: 2830 },
    { type: 'belt', ax: 900, ay: 2835, bx: 1250, by: 2755, speed: 300 },
    { type: 'finish', x: 1290, y: 2730 },
    { type: 'sign', x: 300, y: 110, text: 'ALT I ETT' },
    { type: 'sign', x: 1250, y: 410, text: 'SALTSTRAUMEN' },
    { type: 'sign', x: 470, y: 1230, text: 'TØRRFISK OG SLAPS' },
    { type: 'sign', x: 1170, y: 1390, text: 'LOFOTFERGA' },
    { type: 'sign', x: 1040, y: 2150, text: 'ANDØYA' },
  ];

  /* ---------- Geometri: rammer, treff og håndtak ---------- */
  const mctx = document.createElement('canvas').getContext('2d');
  const isLine = (p) =>
    p.type === 'ramp' ||
    p.type === 'wall' ||
    p.type === 'trap' ||
    p.type === 'eagle' ||
    p.type === 'belt';
  const segD = (px, py, ax, ay, bx, by) => {
    const abx = bx - ax,
      aby = by - ay,
      l2 = abx * abx + aby * aby;
    let q = l2 ? ((px - ax) * abx + (py - ay) * aby) / l2 : 0;
    q = Math.max(0, Math.min(1, q));
    return Math.hypot(px - (ax + abx * q), py - (ay + aby * q));
  };
  function bounds(p) {
    switch (p.type) {
      case 'start':
        return { x0: p.x - 340, y0: p.y - 370, x1: p.x + 340, y1: p.y + 16 };
      case 'finish':
        return { x0: p.x - 8, y0: p.y - 64, x1: p.x + 300, y1: p.y + 300 };
      case 'pegs':
        return {
          x0: p.x - 12,
          y0: p.y - 12,
          x1: p.x + p.w + 12,
          y1: p.y + (p.rows - 1) * 56 + 12,
        };
      case 'bumper':
        return { x0: p.x - 30, y0: p.y - 30, x1: p.x + 30, y1: p.y + 30 };
      case 'wheel':
        return {
          x0: p.x - p.len - 10,
          y0: p.y - p.len - 10,
          x1: p.x + p.len + 10,
          y1: p.y + p.len + 10,
        };
      case 'seesaw':
        return {
          x0: p.x - p.half - 10,
          y0: p.y - 44,
          x1: p.x + p.half + 10,
          y1: p.y + 40,
        };
      case 'pit':
        return {
          x0: p.x0 - 8,
          y0: Math.min(p.yl, p.yr) - 6,
          x1: p.x1 + 8,
          y1: p.y1 + 8,
        };
      case 'wind':
        return { x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1 };
      case 'sign': {
        const w = D.signW(mctx, p.text);
        return { x0: p.x - w / 2, y0: p.y - 18, x1: p.x + w / 2, y1: p.y + 48 };
      }
      case 'eagle':
        return {
          x0: Math.min(p.ax, p.bx) - 10,
          y0: Math.min(p.ay, p.by) - 64,
          x1: Math.max(p.ax, p.bx) + 10,
          y1: Math.max(p.ay, p.by) + 10,
        };
      case 'vortex':
        return { x0: p.x - p.r, y0: p.y - p.r, x1: p.x + p.r, y1: p.y + p.r + 22 };
      case 'ferry':
        return {
          x0: Math.min(p.ax, p.bx) - 100,
          y0: Math.min(p.ay, p.by) - 64,
          x1: Math.max(p.ax, p.bx) + 100,
          y1: Math.max(p.ay, p.by) + 222,
        };
      case 'rocket':
        return { x0: p.x - 56, y0: p.y - 110, x1: p.x + 32, y1: p.y + 26 };
      case 'tunnel':
        return {
          x0: Math.min(p.ax, p.bx) - 48,
          y0: Math.min(p.ay, p.by) - 80,
          x1: Math.max(p.ax, p.bx) + 48,
          y1: Math.max(p.ay, p.by) + 6,
        };
      case 'rack':
        return {
          x0: p.x - 14,
          y0: p.y - 26,
          x1: p.x + p.w + 14,
          y1: p.y + p.len + 10,
        };
      case 'rein':
        return {
          x0: Math.min(p.ax, p.bx) - 40,
          y0: Math.min(p.ay, p.by) - 90,
          x1: Math.max(p.ax, p.bx) + 40,
          y1: Math.max(p.ay, p.by) + 10,
        };
      case 'slush':
        return { x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1 };
      default:
        return {
          x0: Math.min(p.ax, p.bx) - 10,
          y0: Math.min(p.ay, p.by) - 10,
          x1: Math.max(p.ax, p.bx) + 10,
          y1: Math.max(p.ay, p.by) + 10,
        };
    }
  }
  // lavest poeng vinner: små ting foran store felt
  function hitScore(p, x, y, tol) {
    if (isLine(p)) {
      if (
        p.type === 'eagle' &&
        Math.hypot(x - p.ax, y - (p.ay - 34)) < 30 + tol
      )
        return 900;
      const d = segD(x, y, p.ax, p.ay, p.bx, p.by);
      return d <= 9 + tol
        ? Math.hypot(p.bx - p.ax, p.by - p.ay) * 4 + d
        : Infinity;
    }
    if (p.type === 'bumper')
      return Math.hypot(x - p.x, y - p.y) <= 28 + tol ? 1500 : Infinity;
    if (p.type === 'wheel')
      return Math.hypot(x - p.x, y - p.y) <= p.len + 10 + tol
        ? Math.PI * p.len * p.len
        : Infinity;
    if (p.type === 'vortex')
      return Math.hypot(x - p.x, y - p.y) <= p.r + tol
        ? Math.PI * p.r * p.r
        : Infinity;
    if (p.type === 'rocket')
      return Math.hypot(x - p.x, y - (p.y - 20)) <= 40 + tol ||
        (Math.abs(x - (p.x - 40)) <= 12 + tol && y > p.y - 106 - tol && y < p.y)
        ? 1200
        : Infinity;
    if (p.type === 'tunnel')
      return Math.hypot(x - p.ax, y - (p.ay - 30)) <= 46 + tol ||
        Math.hypot(x - p.bx, y - (p.by - 30)) <= 46 + tol
        ? 1300
        : Infinity;
    if (p.type === 'rein') {
      const d = segD(x, y, p.ax, p.ay - 30, p.bx, p.by - 30);
      return d <= 34 + tol ? 2500 + d : Infinity;
    }
    if (p.type === 'ferry') {
      for (const [dx, dy] of [
        [p.ax, p.ay],
        [p.bx, p.by],
      ])
        if (Math.abs(x - dx) <= 92 + tol && y > dy - 44 - tol && y < dy + 46 + tol)
          return 1800;
    }
    const b = bounds(p);
    if (x < b.x0 - tol || x > b.x1 + tol || y < b.y0 - tol || y > b.y1 + tol)
      return Infinity;
    return (
      (b.x1 - b.x0) *
      (b.y1 - b.y0) *
      (p.type === 'start' || p.type === 'finish' ? 1.5 : 1)
    );
  }
  function handles(p) {
    switch (p.type) {
      case 'ramp':
      case 'wall':
      case 'trap':
      case 'eagle':
      case 'belt':
      case 'ferry':
      case 'tunnel':
      case 'rein':
        return [
          { k: 'a', x: p.ax, y: p.ay },
          { k: 'b', x: p.bx, y: p.by },
        ];
      case 'vortex':
        return [{ k: 'r', x: p.x + p.r, y: p.y }];
      case 'rocket': {
        const a = (p.ang * Math.PI) / 180,
          L = p.pow / 8;
        return [
          { k: 'aim', x: p.x + Math.cos(a) * L, y: p.y - 17 - Math.sin(a) * L },
        ];
      }
      case 'rack':
        return [{ k: 'w', x: p.x + p.w, y: p.y }];
      case 'slush':
        return [
          { k: 'tl', x: p.x0, y: p.y0 },
          { k: 'br', x: p.x1, y: p.y1 },
        ];
      case 'pegs':
        return [{ k: 'se', x: p.x + p.w, y: p.y + (p.rows - 1) * 56 }];
      case 'wheel':
        return [{ k: 'r', x: p.x + p.len, y: p.y }];
      case 'seesaw':
        return [{ k: 'r', x: p.x + p.half, y: p.y }];
      case 'pit':
        return [
          { k: 'l', x: p.x0, y: p.yl },
          { k: 'r', x: p.x1, y: p.yr },
          { k: 'b', x: (p.x0 + p.x1) / 2, y: p.y1 },
        ];
      case 'wind':
        return [
          { k: 'tl', x: p.x0, y: p.y0 },
          { k: 'br', x: p.x1, y: p.y1 },
        ];
      default:
        return [];
    }
  }
  function setHandle(p, k, x, y) {
    switch (p.type) {
      case 'vortex':
        p.r = u.clamp(Math.round(Math.hypot(x - p.x, y - p.y)), 70, 240);
        break;
      case 'rocket': {
        const dx = x - p.x,
          dy = p.y - 17 - y;
        p.ang = u.clamp(Math.round((Math.atan2(dy, dx) * 180) / Math.PI), 0, 180);
        p.pow = u.clamp(Math.round((Math.hypot(dx, dy) * 8) / 10) * 10, 500, 2400);
        break;
      }
      case 'rack':
        p.w = u.clamp(Math.round(x - p.x), 80, 900);
        break;
      case 'slush':
        if (k === 'tl') {
          p.x0 = Math.min(x, p.x1 - 60);
          p.y0 = Math.min(y, p.y1 - 40);
        } else {
          p.x1 = Math.max(x, p.x0 + 60);
          p.y1 = Math.max(y, p.y0 + 40);
        }
        break;
      case 'ramp':
      case 'wall':
      case 'trap':
      case 'eagle':
      case 'belt':
      case 'ferry':
      case 'tunnel':
      case 'rein':
        if (k === 'a') {
          p.ax = x;
          p.ay = y;
        } else {
          p.bx = x;
          p.by = y;
        }
        break;
      case 'pegs':
        p.w = Math.max(64, x - p.x);
        p.rows = u.clamp(Math.round((y - p.y) / 56) + 1, 1, 14);
        break;
      case 'wheel':
        p.len = u.clamp(Math.round(Math.hypot(x - p.x, y - p.y)), 50, 180);
        break;
      case 'seesaw':
        p.half = u.clamp(Math.round(Math.abs(x - p.x)), 60, 260);
        break;
      case 'pit':
        delete p.sy;
        if (k === 'l') {
          p.x0 = Math.min(x, p.x1 - 40);
          p.yl = y;
        } else if (k === 'r') {
          p.x1 = Math.max(x, p.x0 + 40);
          p.yr = y;
        } else p.y1 = Math.max(y, Math.max(p.yl, p.yr) + 40);
        break;
      case 'wind':
        if (k === 'tl') {
          p.x0 = Math.min(x, p.x1 - 60);
          p.y0 = Math.min(y, p.y1 - 60);
        } else {
          p.x1 = Math.max(x, p.x0 + 60);
          p.y1 = Math.max(y, p.y0 + 60);
        }
        break;
      default:
        break;
    }
  }
  function move(p, dx, dy) {
    for (const k of ['x', 'ax', 'bx', 'x0', 'x1']) if (k in p) p[k] += dx;
    for (const k of ['y', 'ay', 'by', 'y0', 'y1', 'yl', 'yr', 'sy'])
      if (k in p) p[k] += dy;
  }

  /* ---------- Tilstand ---------- */
  let doc = null; // løypa som redigeres: { id, name, pieces, ok, stats }
  let C = null; // kompilert løype (det fysikken og tegningen bruker)
  let savedSig = null; // signaturen til den lagrede versjonen
  let dirty = false;
  let sel = -1,
    hover = -1;
  let snapOn = true;
  let test = null; // pågående testkjøring
  let val = { running: false, done: 0 };
  let lastFail = null;
  let time = 0;
  const undoStack = [],
    redoStack = [];
  const stars = D.stars(42);
  const canvas = $('#dzCanvas'),
    ctx = canvas.getContext('2d'),
    stage = $('#dzStage'),
    panel = $('#dzPanel');
  let cw = 0,
    ch = 0,
    dpr = 1,
    needFit = 'top';
  const cam = { x: 800, y: 600, s: 0.5 };

  const sv = (v) => (snapOn ? Math.round(v / GRID) * GRID : Math.round(v));
  const def = () => P.normalize(doc);
  const sigOf = (c) => {
    const d = P.normalize(c);
    return d ? `${d.name}|${P.hash(d)}` : '';
  };
  const isOk = () => !!(doc.ok && doc.ok === P.hash(def()));
  const pct = (r) => `${Math.round(r * 100)} %`;
  const secs = (s) =>
    s == null ? '–' : `${u.nf.format(Math.round(s * 10) / 10)} s`;
  function fromTemplate(kind) {
    if (kind === 'copy')
      return {
        id: u.uid('c'),
        name: 'Keiservarden – min versjon',
        pieces: clone(P.ORIGINAL.pieces),
      };
    if (kind === 'demo')
      return { id: u.uid('c'), name: 'Alt i ett', pieces: clone(DEMO) };
    return { id: u.uid('c'), name: 'Min løype', pieces: clone(SIMPLE) };
  }

  /* ---------- Kamera ---------- */
  const view = () => ({
    x: cam.x - cw / 2 / cam.s,
    y: cam.y - ch / 2 / cam.s,
    w: cw / cam.s,
    h: ch / cam.s,
  });
  const toWorld = (sx, sy) => ({
    x: cam.x + (sx - cw / 2) / cam.s,
    y: cam.y + (sy - ch / 2) / cam.s,
  });
  const toScreen = (x, y) => ({
    x: (x - cam.x) * cam.s + cw / 2,
    y: (y - cam.y) * cam.s + ch / 2,
  });
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cw = r.width;
    ch = r.height;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    if (needFit) fit(needFit === 'all');
  }
  function fit(all) {
    if (!cw || !ch || !C) {
      needFit = all ? 'all' : 'top';
      return;
    }
    needFit = null;
    const y0 = C.top + 40,
      y1 = C.H;
    if (all) {
      cam.s = u.clamp(Math.min(cw / 1700, ch / (y1 - y0 + 80)), 0.03, 2.5);
      cam.x = 800;
      cam.y = (y0 + y1) / 2;
    } else {
      cam.s = u.clamp(cw / 1700, 0.12, 0.9);
      cam.x = 800;
      cam.y = y0 + ch / 2 / cam.s;
    }
  }
  function zoomAt(sx, sy, f) {
    const w = toWorld(sx, sy);
    cam.s = u.clamp(cam.s * f, 0.03, 2.5);
    cam.x = w.x - (sx - cw / 2) / cam.s;
    cam.y = w.y - (sy - ch / 2) / cam.s;
    if (test) test.follow = false;
  }

  /* ---------- Tegning ---------- */
  function pos(res, i, t) {
    const fr = res.frames,
      k = t * res.fps;
    let a = Math.floor(k);
    const f = k - a;
    if (a >= fr.length - 1) {
      const L = fr[fr.length - 1];
      return [L[i * 3], L[i * 3 + 1], L[i * 3 + 2]];
    }
    if (a < 0) a = 0;
    const A = fr[a],
      B = fr[a + 1];
    // hopp i opptaket (tunnel, ørna, sluket): ikke tegn kula på veien mellom
    if (
      Math.abs(B[i * 3] - A[i * 3]) > 260 ||
      Math.abs(B[i * 3 + 1] - A[i * 3 + 1]) > 260
    ) {
      const S = f < 0.5 ? A : B;
      return [S[i * 3], S[i * 3 + 1], S[i * 3 + 2]];
    }
    return [
      A[i * 3] + (B[i * 3] - A[i * 3]) * f,
      A[i * 3 + 1] + (B[i * 3 + 1] - A[i * 3 + 1]) * f,
      A[i * 3 + 2] + (B[i * 3 + 2] - A[i * 3 + 2]) * f,
    ];
  }
  function draw() {
    if (!cw || !C) return;
    const v = view();
    const CC = test ? test.res.C : C;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    D.sky(ctx, cw, ch, v, time, stars, CC);
    ctx.setTransform(
      dpr * cam.s,
      0,
      0,
      dpr * cam.s,
      -v.x * cam.s * dpr,
      -v.y * cam.s * dpr,
    );
    D.scene(ctx, CC, v, test ? test.t : (time % 80) + 4, time, {
      gateClosed: !test,
    });
    if (test) drawMarbles(v);
    else {
      if (snapOn) drawGrid(v);
      drawOverlay(v);
    }
  }
  function drawGrid(v) {
    const step = cam.s >= 0.5 ? 50 : cam.s >= 0.2 ? 100 : 200;
    ctx.lineWidth = 1 / cam.s;
    ctx.strokeStyle = 'rgba(255,255,255,.045)';
    ctx.beginPath();
    for (let x = Math.floor(v.x / step) * step; x <= v.x + v.w; x += step) {
      ctx.moveTo(x, v.y);
      ctx.lineTo(x, v.y + v.h);
    }
    for (let y = Math.floor(v.y / step) * step; y <= v.y + v.h; y += step) {
      ctx.moveTo(v.x, y);
      ctx.lineTo(v.x + v.w, y);
    }
    ctx.stroke();
  }
  function outline(p, color) {
    const px = 1 / cam.s;
    ctx.save();
    ctx.strokeStyle = color;
    if (isLine(p)) {
      ctx.globalAlpha = 0.35;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(26, 10 * px);
      ctx.beginPath();
      ctx.moveTo(p.ax, p.ay);
      ctx.lineTo(p.bx, p.by);
      ctx.stroke();
    } else {
      const b = bounds(p);
      ctx.lineWidth = 2 * px;
      ctx.setLineDash([8 * px, 6 * px]);
      ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    }
    ctx.restore();
  }
  function drawOverlay(v) {
    const px = 1 / cam.s;
    ctx.save();
    ctx.lineWidth = 2 * px;
    ctx.setLineDash([12 * px, 10 * px]);
    // kanten av verden: utenfor her triller kulene utfor
    ctx.strokeStyle = 'rgba(238,74,47,.45)';
    ctx.beginPath();
    ctx.moveTo(0, v.y);
    ctx.lineTo(0, v.y + v.h);
    ctx.moveTo(P.WORLD_W, v.y);
    ctx.lineTo(P.WORLD_W, v.y + v.h);
    ctx.stroke();
    // vind og ørn synes ikke når de er rolige – vis dem i designeren
    for (const p of doc.pieces) {
      if (p.type === 'wind') {
        ctx.strokeStyle = 'rgba(207,230,255,.45)';
        ctx.strokeRect(p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0);
      } else if (p.type === 'eagle') {
        ctx.strokeStyle = 'rgba(241,217,182,.75)';
        ctx.beginPath();
        ctx.moveTo(p.ax, p.ay);
        ctx.lineTo(p.bx, p.by);
        ctx.stroke();
      } else if (p.type === 'tunnel' || p.type === 'ferry' || p.type === 'rein') {
        // hvor tunnelen går, hvor ferga går og hvor reinen rusler
        const lift = p.type === 'tunnel' ? 22 : p.type === 'rein' ? 30 : 0;
        ctx.strokeStyle =
          p.type === 'tunnel'
            ? 'rgba(243,236,223,.35)'
            : p.type === 'ferry'
              ? 'rgba(160,210,240,.5)'
              : 'rgba(234,223,204,.45)';
        ctx.beginPath();
        ctx.moveTo(p.ax, p.ay - lift);
        ctx.lineTo(p.bx, p.by - lift);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    // banen raketten skyter kulene (uten andre kuler og bevegelige deler)
    if (C.rockets.length) {
      if (!C.aims) C.aims = C.rockets.map((L) => P.aimPath(C, L));
      ctx.fillStyle = 'rgba(255,154,122,.85)';
      for (const pts of C.aims)
        for (let k = 0; k < pts.length; k += 4) {
          ctx.beginPath();
          ctx.arc(pts[k], pts[k + 1], 3.2 * px, 0, Math.PI * 2);
          ctx.fill();
        }
    }
    for (const p of doc.pieces) {
      if (p.type !== 'eagle') continue;
      ctx.save();
      ctx.translate(p.ax, p.ay - 34);
      if (p.ax >= p.bx) ctx.scale(-1, 1);
      ctx.font = `44px ${D.EMOJI}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🦅', 0, 0);
      ctx.restore();
    }
    ctx.restore();
    if (hover >= 0 && hover !== sel && doc.pieces[hover])
      outline(doc.pieces[hover], 'rgba(255,255,255,.55)');
    const p = doc.pieces[sel];
    if (p) {
      outline(p, '#5ef2b5');
      for (const h of handles(p)) {
        ctx.beginPath();
        ctx.arc(h.x, h.y, 8 * px, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.lineWidth = 3 * px;
        ctx.strokeStyle = '#5ef2b5';
        ctx.stroke();
      }
    }
  }
  function drawMarbles(v) {
    const T = test,
      res = T.res;
    for (let i = 0; i < T.n; i++) {
      const [x, y, ang] = pos(res, i, T.t);
      if (
        x < v.x - 40 ||
        x > v.x + v.w + 40 ||
        y < v.y - 40 ||
        y > v.y + v.h + 40
      )
        continue;
      const st = T.state[i];
      const gone = st === 'out' && res.cause[i] !== 'k_orna';
      const rank = st === 'fin' ? T.fin.indexOf(i) + 1 : 0;
      if (!(st === 'out' && res.cause[i] === 'k_orna')) {
        const [px, py] = pos(res, i, Math.max(0, T.t - 0.1));
        D.trail(ctx, px, py, x, y, gone ? '#6b7480' : COLORS[i % COLORS.length]);
      }
      D.ball(
        ctx,
        x,
        y,
        gone ? '#6b7480' : COLORS[i % COLORS.length],
        String(i + 1),
        ang,
        gone ? 0.55 : 1,
        rank && rank <= 3 ? ['#ffd34d', '#dfe6ee', '#e0a070'][rank - 1] : null,
      );
    }
  }

  /* ---------- Redigering ---------- */
  const snapshot = () => JSON.stringify(doc.pieces);
  function rebuild() {
    C = P.course(1, doc);
  }
  function dirtyCheck() {
    dirty = sigOf(doc) !== savedSig;
  }
  let draftT = 0;
  function saveDraft() {
    clearTimeout(draftT);
    draftT = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT, JSON.stringify({ doc }));
      } catch (e) {
        /* ikke viktig */
      }
    }, 300);
  }
  function afterEdit() {
    rebuild();
    dirtyCheck();
    saveDraft();
    renderPanel();
    renderBar();
  }
  function changed(before) {
    undoStack.push(before);
    if (undoStack.length > 120) undoStack.shift();
    redoStack.length = 0;
    afterEdit();
  }
  function undo() {
    if (!undoStack.length || test) return;
    redoStack.push(snapshot());
    doc.pieces = JSON.parse(undoStack.pop());
    sel = -1;
    afterEdit();
  }
  function redo() {
    if (!redoStack.length || test) return;
    undoStack.push(snapshot());
    doc.pieces = JSON.parse(redoStack.pop());
    sel = -1;
    afterEdit();
  }
  function roomFor(type) {
    if (doc.pieces.length >= P.LIMITS.total) {
      u.toast(`Løypa er full (${P.LIMITS.total} deler).`);
      return false;
    }
    if (doc.pieces.filter((p) => p.type === type).length >= P.LIMITS[type]) {
      u.toast(`Maks ${P.LIMITS[type]} av typen «${KINDS[type].name}».`);
      return false;
    }
    return true;
  }
  function add(type) {
    stopTest(true);
    if (!roomFor(type)) return;
    const before = snapshot();
    const v = view();
    const p = P.sanePiece({
      type,
      ...KINDS[type].make(
        sv(u.clamp(v.x + v.w / 2, 260, 1340)),
        sv(v.y + v.h / 2),
      ),
    });
    doc.pieces.push(p);
    sel = doc.pieces.length - 1;
    changed(before);
  }
  function remove(i) {
    const p = doc.pieces[i];
    if (!p) return;
    if (p.type === 'start' || p.type === 'finish') {
      u.toast('Start og mål kan flyttes, men ikke slettes.');
      return;
    }
    const before = snapshot();
    doc.pieces.splice(i, 1);
    sel = -1;
    hover = -1;
    changed(before);
  }
  function duplicate(i) {
    const p = doc.pieces[i];
    if (!p || p.type === 'start' || p.type === 'finish' || !roomFor(p.type))
      return;
    const before = snapshot();
    const c = clone(p);
    move(c, 40, 40);
    doc.pieces.push(P.sanePiece(c));
    sel = doc.pieces.length - 1;
    changed(before);
  }
  function select(i) {
    sel = i;
    hover = -1;
    renderPanel();
  }
  function pick(x, y) {
    const tol = 8 / cam.s;
    let best = -1,
      bs = Infinity;
    doc.pieces.forEach((p, i) => {
      const s = hitScore(p, x, y, tol);
      if (s < bs) {
        bs = s;
        best = i;
      }
    });
    return best;
  }
  function handleAt(i, sx, sy) {
    const p = doc.pieces[i];
    if (!p) return null;
    return (
      handles(p).find((h) => {
        const s = toScreen(h.x, h.y);
        return Math.hypot(s.x - sx, s.y - sy) <= 13;
      }) || null
    );
  }
  // flytt hele delen uten at den klemmes skjev mot kanten av verden
  function clampMove(orig, dx) {
    const b = bounds(orig);
    return u.clamp(dx, -150 - b.x0, 1750 - b.x1);
  }

  /* ---------- Mus, finger og tastatur ---------- */
  const pointers = new Map();
  let drag = null;
  const local = (e) => {
    const r = canvas.getBoundingClientRect();
    return { sx: e.clientX - r.left, sy: e.clientY - r.top };
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {
      /* syntetiske hendelser har ingen ekte peker */
    }
    const { sx, sy } = local(e);
    pointers.set(e.pointerId, { sx, sy });
    if (pointers.size === 2) {
      if (drag && drag.changed) {
        changed(drag.before);
      }
      const [a, b] = [...pointers.values()];
      drag = {
        kind: 'pinch',
        d0: Math.max(10, Math.hypot(a.sx - b.sx, a.sy - b.sy)),
        s0: cam.s,
        m0: toWorld((a.sx + b.sx) / 2, (a.sy + b.sy) / 2),
      };
      return;
    }
    if (pointers.size > 2) return;
    if (!test) {
      const h = sel >= 0 ? handleAt(sel, sx, sy) : null;
      if (h) {
        drag = {
          kind: 'handle',
          idx: sel,
          key: h.k,
          before: snapshot(),
          orig: clone(doc.pieces[sel]),
          changed: false,
        };
        return;
      }
      const w = toWorld(sx, sy);
      const i = pick(w.x, w.y);
      if (i >= 0) {
        const before = snapshot(),
          src = doc.pieces[i];
        let idx = i;
        // Alt + dra: dra ut en kopi, originalen blir stående
        if (
          e.altKey &&
          src.type !== 'start' &&
          src.type !== 'finish' &&
          roomFor(src.type)
        ) {
          doc.pieces.push(clone(src));
          idx = doc.pieces.length - 1;
          rebuild();
        }
        if (idx !== sel) select(idx);
        drag = {
          kind: 'move',
          idx,
          w0: w,
          before,
          orig: clone(doc.pieces[idx]),
          changed: idx !== i,
        };
        canvas.style.cursor = 'grabbing';
        return;
      }
    }
    drag = { kind: 'pan', sx0: sx, sy0: sy, cx: cam.x, cy: cam.y, click: true };
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    const { sx, sy } = local(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { sx, sy });
    if (!drag) {
      if (test || e.pointerType !== 'mouse') return;
      const h = sel >= 0 && handleAt(sel, sx, sy);
      const w = toWorld(sx, sy);
      hover = h ? -1 : pick(w.x, w.y);
      canvas.style.cursor = h
        ? 'crosshair'
        : hover >= 0
          ? e.altKey
            ? 'copy'
            : 'move'
          : 'grab';
      return;
    }
    if (drag.kind === 'pinch') {
      const pts = [...pointers.values()];
      if (pts.length < 2) return;
      const [a, b] = pts;
      cam.s = u.clamp(
        (drag.s0 * Math.hypot(a.sx - b.sx, a.sy - b.sy)) / drag.d0,
        0.03,
        2.5,
      );
      cam.x = drag.m0.x - ((a.sx + b.sx) / 2 - cw / 2) / cam.s;
      cam.y = drag.m0.y - ((a.sy + b.sy) / 2 - ch / 2) / cam.s;
      if (test) test.follow = false;
    } else if (drag.kind === 'pan') {
      cam.x = drag.cx - (sx - drag.sx0) / cam.s;
      cam.y = drag.cy - (sy - drag.sy0) / cam.s;
      if (Math.hypot(sx - drag.sx0, sy - drag.sy0) > 4) {
        drag.click = false;
        if (test) {
          test.follow = false;
          renderHud();
        }
      }
    } else {
      const w = toWorld(sx, sy);
      const p = clone(drag.orig);
      if (drag.kind === 'move')
        move(p, clampMove(drag.orig, sv(w.x - drag.w0.x)), sv(w.y - drag.w0.y));
      else setHandle(p, drag.key, sv(u.clamp(w.x, -150, 1750)), sv(w.y));
      const clean = P.sanePiece(p);
      if (JSON.stringify(clean) !== JSON.stringify(doc.pieces[drag.idx])) {
        doc.pieces[drag.idx] = clean;
        drag.changed = true;
        rebuild();
      }
    }
  });
  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (!drag) return;
    if (drag.kind === 'pinch') {
      if (!pointers.size) drag = null;
      return;
    }
    if (drag.kind === 'pan' && drag.click && !test) select(-1);
    if ((drag.kind === 'move' || drag.kind === 'handle') && drag.changed)
      changed(drag.before);
    else if (drag.kind !== 'pan') renderPanel();
    drag = null;
    canvas.style.cursor = 'grab';
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => {
    if (!drag && hover >= 0) hover = -1;
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const { sx, sy } = local(e);
      zoomAt(sx, sy, Math.exp(-e.deltaY * 0.0015));
    },
    { passive: false },
  );

  let nudge = null;
  window.addEventListener('keydown', (e) => {
    const tg = e.target;
    if (
      (tg &&
        tg.closest &&
        tg.closest('input, textarea, select, [contenteditable]')) ||
      document.querySelector('dialog[open]')
    )
      return;
    const mod = e.ctrlKey || e.metaKey,
      key = e.key.toLowerCase();
    if (mod && key === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    } else if (mod && key === 'y') {
      e.preventDefault();
      redo();
    } else if (mod && key === 'd') {
      e.preventDefault();
      if (sel >= 0) duplicate(sel);
    } else if (mod && key === 's') {
      e.preventDefault();
      save();
    } else if (
      (e.key === 'Delete' || e.key === 'Backspace') &&
      sel >= 0 &&
      !test
    ) {
      e.preventDefault();
      remove(sel);
    } else if (e.key === 'Escape') {
      if (test) stopTest();
      else select(-1);
    } else if (e.key.startsWith('Arrow') && sel >= 0 && !test) {
      e.preventDefault();
      const step = e.shiftKey ? 50 : snapOn ? GRID : 1;
      const dx =
          e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0,
        dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      if (!nudge) nudge = { before: snapshot() };
      const p = clone(doc.pieces[sel]);
      move(p, clampMove(p, dx), dy);
      doc.pieces[sel] = P.sanePiece(p);
      rebuild();
      clearTimeout(nudge.t);
      nudge.t = setTimeout(() => {
        const b = nudge.before;
        nudge = null;
        changed(b);
      }, 450);
    }
  });

  /* ---------- Panelet til høyre ---------- */
  function causeChips(causes) {
    const keys = Object.keys(causes || {})
      .sort((a, b) => causes[b] - causes[a])
      .slice(0, 6);
    if (!keys.length) return '';
    return `<ul class="dz-causes">${keys
      .map((k) => {
        const at = k.indexOf(':');
        const id = at > 0 ? k.slice(0, at) : k,
          name = at > 0 ? k.slice(at + 1) : '';
        const ev = Ev.EVENTS[id] || Ev.EVENTS.k_kant;
        return `<li>${ev.icon} ${esc(name || ev.name)} <b>${causes[k]}</b></li>`;
      })
      .join('')}</ul>`;
  }
  function coursePanel() {
    const ok = isOk();
    const saved = !!Store.getCourse(doc.id);
    const active = saved && Store.courseId === doc.id;
    const h = P.hash(def());
    const st = doc.stats || {};
    let check;
    if (val.running)
      check = `<div class="dz-check is-run"><b>Prøvekjører løypa…</b><span>${val.done} av ${VAL_RUNS} prøveløp med ${VAL_N} kuler.</span><i style="--p:${val.done / VAL_RUNS}"></i></div>`;
    else if (ok)
      check = `<div class="dz-check is-ok"><b>✓ Godkjent</b><span>${pct(st.rate || 0)} kom i mål i prøveløpene. Vinnerne er nede etter rundt ${secs(st.winT)}.</span>${active ? '<span>Brukes i neste Keiservarden GP. <a href="trekning.html">Til trekningen →</a></span>' : ''}</div>${causeChips(st.causes)}`;
    else if (lastFail && lastFail.hash === h)
      check = `<div class="dz-check is-bad"><b>Ikke godkjent ennå</b>${lastFail.reasons.map((r) => `<span>${esc(r)}</span>`).join('')}</div>${causeChips(lastFail.causes)}`;
    else
      check = `<div class="dz-check"><b>Ikke godkjent ennå</b><span>Godkjenningen kjører ${VAL_RUNS} prøveløp med ${VAL_N} kuler. Minst 45 % må komme i mål, og vinnerne må være nede på under 75 sekunder.</span></div>`;
    const counts = {};
    doc.pieces.forEach((p) => {
      counts[p.type] = (counts[p.type] || 0) + 1;
    });
    return `<section class="dz-sec">
        <h3 class="dz-h">Løypa</h3>
        ${check}
        <div class="dz-btns">
          <button class="btn btn-aurora btn-small" type="button" data-a="validate"${val.running || ok ? ' disabled' : ''}>${ok ? 'Godkjent ✓' : '✓ Godkjenn løypa'}</button>
          <button class="btn btn-primary btn-small" type="button" data-a="use"${ok && !active ? '' : ' disabled'}>${active ? 'Brukes i trekningen' : '🏁 Bruk i trekningen'}</button>
        </div>
        <dl class="dz-facts"><div><dt>Deler</dt><dd>${doc.pieces.length}</dd></div><div><dt>Fallhøyde</dt><dd>${u.nf.format(Math.round(C.fin.y - C.start.y))}</dd></div><div><dt>Hull</dt><dd>${counts.pit || 0}</dd></div></dl>
      </section>
      <section class="dz-sec">
        <h3 class="dz-h">Slik bygger du</h3>
        <ul class="dz-tips">
          <li>Trykk på en del i lista for å legge den midt i bildet.</li>
          <li>Dra delene dit du vil ha dem. Dra i de runde håndtakene for å endre størrelse og helning.</li>
          <li>Dra i bakgrunnen for å flytte deg rundt. Rull eller knip for å zoome.</li>
          <li><kbd>Delete</kbd> sletter, <kbd>Ctrl</kbd>+<kbd>Z</kbd> angrer, <kbd>Ctrl</kbd>+<kbd>D</kbd> dupliserer, piltastene flytter litt.</li>
          <li>Hold <kbd>Alt</kbd> mens du drar en del, så drar du ut en kopi.</li>
          <li>Testkjør ofte. Når du er fornøyd: godkjenn løypa, så kan den brukes i trekningen.</li>
        </ul>
      </section>
      ${saved ? '<section class="dz-sec dz-sec-end"><button class="link-btn danger" type="button" data-a="delete">Slett løypa…</button></section>' : ''}`;
  }
  function field(p, f) {
    if (f.text)
      return `<label class="dz-field"><span>${esc(f.label)}</span><input class="field-input" type="text" data-f="${f.k}" maxlength="${f.text}" value="${esc(p[f.k])}" spellcheck="false"></label>`;
    if (f.dir)
      return `<div class="dz-field"><span>${esc(f.label)}</span><div class="dz-seg"><button type="button" data-dir="-1" class="${p.dir < 0 ? 'on' : ''}">← Venstre</button><button type="button" data-dir="1" class="${p.dir > 0 ? 'on' : ''}">Høyre →</button></div></div>`;
    if (f.opts)
      return `<div class="dz-field"><span>${esc(f.label)}</span><div class="dz-seg">${f.opts
        .map(
          ([v, lab]) =>
            `<button type="button" data-opt="${f.k}" data-v="${v}" class="${(p[f.k] || 0) === v ? 'on' : ''}">${esc(lab)}</button>`,
        )
        .join('')}</div></div>`;
    return `<label class="dz-field"><span>${esc(f.label)} <output>${u.nf.format(p[f.k])}</output></span><input type="range" data-f="${f.k}" min="${f.min}" max="${f.max}" step="${f.step}" value="${p[f.k]}"></label>`;
  }
  function posText(p) {
    const r = Math.round;
    if (isLine(p)) {
      const dx = p.bx - p.ax,
        dy = p.by - p.ay;
      const len = Math.hypot(dx, dy),
        deg = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;
      if (p.type === 'wall' || p.type === 'eagle') return `Lengde ${r(len)}`;
      if (p.type === 'belt') {
        const fwd = p.speed >= 0,
          to = fwd ? { x: p.bx, y: p.by } : { x: p.ax, y: p.ay },
          from = fwd ? { x: p.ax, y: p.ay } : { x: p.bx, y: p.by };
        return `Lengde ${r(len)} · helning ${r(deg)}° · frakter ${to.y < from.y - 2 ? 'oppover' : to.y > from.y + 2 ? 'nedover' : 'bortover'} mot ${to.x >= from.x ? 'høyre' : 'venstre'}`;
      }
      const low = p.by > p.ay ? p.bx - p.ax : p.ax - p.bx;
      return `Lengde ${r(len)} · helning ${r(deg)}° · ruller mot ${low > 0 ? 'høyre' : 'venstre'}${p.type === 'ramp' && deg < 4 ? '<br><span class="warn">⚠ Slakk rampe – kulene kan bli liggende.</span>' : ''}`;
    }
    if (p.type === 'pit')
      return `Bredde ${r(p.x1 - p.x0)} · dybde ${r(p.y1 - Math.max(p.yl, p.yr))}`;
    if (p.type === 'wind') return `${r(p.x1 - p.x0)} × ${r(p.y1 - p.y0)}`;
    if (p.type === 'wheel' && Math.abs(p.speed) > P.W_FAST)
      return `x ${r(p.x)} · y ${r(p.y)}<br><span class="warn">🚀 Rakettfart! Hjulet skyter kulene til værs. Pass på at de lander et sted.</span>`;
    if (p.type === 'vortex')
      return `x ${r(p.x)} · y ${r(p.y)} · størrelse ${r(p.r)}`;
    if (p.type === 'ferry') {
      const d = Math.hypot(p.bx - p.ax, p.by - p.ay);
      return `Avstand ${r(d)} · overfarten tar ${secs(Math.max(0.6, d / p.speed))}<br>La rampa ende rett ved bommen på A-kaia, og la det være noe som tar imot kulene ved B.`;
    }
    if (p.type === 'rocket')
      return `Retning ${r(p.ang)}° · kraft ${r(p.pow)}<br>Dra i pilspissen for å sikte. Prikkene viser hvor kula flyr.`;
    if (p.type === 'tunnel')
      return `Inn ved ${r(p.ax)}, ${r(p.ay)} · ut ved ${r(p.bx)}, ${r(p.by)}`;
    if (p.type === 'rack')
      return `${Math.max(1, Math.floor((p.w - 43) / 44) + 1)} tørrfisk · bredde ${r(p.w)}`;
    if (p.type === 'rein')
      return `Beitestrekning ${r(Math.hypot(p.bx - p.ax, p.by - p.ay))}`;
    if (p.type === 'slush') return `${r(p.x1 - p.x0)} × ${r(p.y1 - p.y0)}`;
    return `x ${r(p.x)} · y ${r(p.y)}`;
  }
  function piecePanel(p) {
    const K = KINDS[p.type];
    const fixed = p.type === 'start' || p.type === 'finish';
    return `<section class="dz-sec">
      <div class="dz-piece"><span class="dz-piece-ico">${K.ico}</span><div><h3 class="dz-h">${esc(K.name)}</h3><p>${esc(K.help)}</p></div></div>
      ${(FIELDS[p.type] || []).map((f) => field(p, f)).join('')}
      <p class="dz-pos">${posText(p)}</p>
      <div class="dz-btns">${fixed ? '' : '<button class="btn btn-ghost btn-small" type="button" data-a="dup">Dupliser</button><button class="btn btn-ghost btn-small dz-del" type="button" data-a="del">Slett</button>'}<button class="btn btn-ghost btn-small" type="button" data-a="done">Ferdig</button></div>
    </section>`;
  }
  function logLi(l) {
    return `<li><span>${l.icon}</span><span>${l.html}</span><small>${secs(l.t)}</small></li>`;
  }
  function testPanel() {
    const T = test;
    const fin = T.fin.length,
      run = T.n - fin - T.out;
    let note =
      '<p class="dz-note">Kulene har nummer etter startrekkefølgen. Ringene viser de tre første i mål.</p>';
    if (T.done) {
      const first = T.res.events.find((e) => e.type === 'finish');
      const rate = fin / T.n;
      note = `<div class="dz-check ${rate >= 0.45 ? 'is-ok' : 'is-bad'}"><b>${fin} av ${T.n} kom i mål (${pct(rate)})</b><span>${first ? `Vinneren brukte ${secs(first.t - P.GATE_T)}.` : 'Ingen kom i mål.'}${rate < 0.45 ? ' For å bli godkjent må minst 45 % komme i mål.' : ''}</span></div>`;
    }
    return `<section class="dz-sec">
      <h3 class="dz-h">${T.done ? 'Testkjøringen er ferdig' : 'Testkjøring'}</h3>
      <div class="dz-stats"><div><b data-ts="fin">${fin}</b><span>i mål</span></div><div><b data-ts="out">${T.out}</b><span>ute</span></div><div><b data-ts="run">${run}</b><span>i løypa</span></div></div>
      ${note}
      <ol class="dz-tlog" id="dzTlog">${T.log.slice().reverse().map(logLi).join('')}</ol>
      <div class="dz-btns"><button class="btn btn-primary btn-small" type="button" data-a="retest">↻ Kjør igjen</button><button class="btn btn-ghost btn-small" type="button" data-a="stop">Tilbake til redigering</button></div>
    </section>`;
  }
  function renderPanel() {
    if (test) panel.innerHTML = testPanel();
    else {
      const p = doc.pieces[sel];
      panel.innerHTML = p ? piecePanel(p) : coursePanel();
    }
  }
  let fieldBefore = null;
  panel.addEventListener('input', (e) => {
    const f = e.target.closest('[data-f]');
    if (!f || sel < 0 || test) return;
    if (!fieldBefore) fieldBefore = snapshot();
    const p = clone(doc.pieces[sel]);
    const k = f.dataset.f;
    p[k] = f.type === 'range' ? +f.value : f.value;
    if (p.type === 'pit' && k === 'name') delete p.cause; // omdøpt hull får sitt eget navn i loggen
    doc.pieces[sel] = P.sanePiece(p);
    const out = f.closest('.dz-field').querySelector('output');
    if (out) out.textContent = u.nf.format(doc.pieces[sel][k]);
    const posEl = panel.querySelector('.dz-pos');
    if (posEl) posEl.innerHTML = posText(doc.pieces[sel]);
    rebuild();
    dirtyCheck();
    saveDraft();
    renderBar();
  });
  panel.addEventListener('change', (e) => {
    if (!e.target.closest('[data-f]') || !fieldBefore) return;
    const b = fieldBefore;
    fieldBefore = null;
    changed(b);
  });
  panel.addEventListener('click', (e) => {
    const dir = e.target.closest('[data-dir]');
    if (dir && sel >= 0) {
      const before = snapshot();
      const p = clone(doc.pieces[sel]);
      p.dir = +dir.dataset.dir;
      doc.pieces[sel] = P.sanePiece(p);
      changed(before);
      return;
    }
    const opt = e.target.closest('[data-opt]');
    if (opt && sel >= 0) {
      const before = snapshot();
      const p = clone(doc.pieces[sel]);
      p[opt.dataset.opt] = +opt.dataset.v;
      doc.pieces[sel] = P.sanePiece(p);
      if (snapshot() !== before) changed(before);
      return;
    }
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a;
    if (a === 'validate') validate();
    else if (a === 'use') use();
    else if (a === 'delete') delCourse();
    else if (a === 'dup') duplicate(sel);
    else if (a === 'del') remove(sel);
    else if (a === 'done') select(-1);
    else if (a === 'retest') startTest();
    else if (a === 'stop') stopTest();
  });

  /* ---------- Toppen: navn, status, åpne, lagre ---------- */
  function renderBar() {
    const saved = !!Store.getCourse(doc.id),
      ok = isOk();
    const chip = $('#dzState');
    chip.className = `dz-state${!saved || dirty ? ' is-dirty' : ok ? ' is-ok' : ''}`;
    chip.textContent = !saved
      ? 'Ikke lagret'
      : dirty
        ? 'Ulagrede endringer'
        : ok
          ? Store.courseId === doc.id
            ? 'Godkjent · i bruk'
            : 'Godkjent'
          : 'Lagret · ikke godkjent';
    $('#dzSave').disabled = saved && !dirty;
    $('#dzUndo').disabled = !undoStack.length || !!test;
    $('#dzRedo').disabled = !redoStack.length || !!test;
    $('#dzTest').disabled = val.running;
  }
  function fillOpen() {
    const list = Store.courses;
    const cur = Store.getCourse(doc.id) ? doc.id : '';
    const mark = (c) => {
      const d = P.normalize(c);
      return d && c.ok === P.hash(d) ? ' ✓' : '';
    };
    $('#dzOpen').innerHTML =
      `${cur ? '' : `<option value="" selected>${esc(doc.name)} (ikke lagret)</option>`}
      ${list.length ? `<optgroup label="Mine løyper">${list.map((c) => `<option value="${esc(c.id)}"${c.id === cur ? ' selected' : ''}>${esc(c.name)}${mark(c)}${Store.courseId === c.id ? ' · i bruk' : ''}</option>`).join('')}</optgroup>` : ''}
      <optgroup label="Lag ny"><option value="new:simple">＋ Ny enkel løype</option><option value="new:copy">＋ Kopi av Keiservarden</option><option value="new:demo">＋ Demo med alle delene</option></optgroup>`;
  }
  function load(c, savedVersion) {
    stopTest(true);
    const d = P.normalize(c);
    // godkjenningen følger med fra den lagrede versjonen (den gjelder bare så lenge delene er like – isOk sjekker det)
    const sv0 = savedVersion || {};
    doc = {
      id: d.id,
      name: d.name,
      pieces: d.pieces,
      ok: c.ok || sv0.ok || null,
      stats: c.stats || sv0.stats || null,
    };
    undoStack.length = 0;
    redoStack.length = 0;
    sel = -1;
    hover = -1;
    lastFail = null;
    rebuild();
    savedSig = savedVersion ? sigOf(savedVersion) : null;
    dirtyCheck();
    $('#dzName').value = doc.name;
    fillOpen();
    renderPanel();
    renderBar();
    saveDraft();
    fit(false);
  }
  function save(silent) {
    const d = def();
    doc.pieces = d.pieces;
    doc.name = d.name;
    $('#dzName').value = doc.name;
    const ok = doc.ok && doc.ok === P.hash(d) ? doc.ok : null;
    const stored = Store.saveCourse({
      id: doc.id,
      name: doc.name,
      pieces: doc.pieces,
      ok,
      stats: ok ? doc.stats : null,
    });
    if (!stored) {
      u.toast('Klarte ikke å lagre løypa.');
      return;
    }
    savedSig = sigOf(stored);
    dirtyCheck();
    fillOpen();
    renderBar();
    renderPanel();
    saveDraft();
    if (!silent) u.toast(`«${doc.name}» er lagret.`);
  }
  async function confirmDiscard() {
    if (!dirty) return true;
    return u.confirmDlg(
      'Forkaste endringene?',
      `Endringene i «${doc.name}» er ikke lagret. De forsvinner hvis du fortsetter.`,
      'Forkast',
    );
  }
  $('#dzName').addEventListener('input', (e) => {
    doc.name = e.target.value;
    dirtyCheck();
    renderBar();
    saveDraft();
  });
  $('#dzName').addEventListener('change', (e) => {
    doc.name = u.cleanName(e.target.value) || 'Min løype';
    e.target.value = doc.name;
    dirtyCheck();
    fillOpen();
    renderBar();
    saveDraft();
  });
  $('#dzName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') e.target.blur();
  });
  $('#dzOpen').addEventListener('change', async (e) => {
    const v = e.target.value;
    if (!(await confirmDiscard())) {
      fillOpen();
      return;
    }
    if (v === 'new:simple' || v === 'new:copy' || v === 'new:demo') {
      const kind = v.slice(4);
      load(fromTemplate(kind), null);
      u.toast(
        kind === 'copy'
          ? 'Kopi av originalen – gjør den til din egen!'
          : kind === 'demo'
            ? 'Demo med Saltstraumen, ferga, raketten og resten. Trykk Testkjør!'
            : 'Ny løype. Start og mål er på plass – resten er opp til deg.',
      );
    } else {
      const c = Store.getCourse(v);
      if (c) load(c, c);
    }
  });
  $('#dzSave').addEventListener('click', () => save());

  /* ---------- Testkjøring ---------- */
  function startTest() {
    if (val.running) return;
    stopTest(true);
    sel = -1;
    const n = parseInt($('#dzN').value, 10) || 24;
    const msg = $('#dzMsg');
    msg.textContent = 'Kulene stilles opp i porten…';
    msg.hidden = false;
    setTimeout(() => {
      const res = P.simulate(n, u.randInt(0x7fffffff), doc);
      msg.hidden = true;
      test = {
        res,
        n,
        t: 0,
        speed: 1,
        follow: true,
        ei: 0,
        state: new Array(n).fill(null),
        fin: [],
        out: 0,
        done: false,
        log: [],
        flown: new Uint8Array(n),
      };
      cam.x = res.C.start.x;
      cam.y = res.C.start.y - 100;
      renderPanel();
      renderHud();
      renderBar();
    }, 40);
  }
  function stopTest(silent) {
    if (!test) return;
    test = null;
    renderHud();
    if (!silent) {
      renderPanel();
      renderBar();
    }
  }
  function onTestEvent(e) {
    const T = test;
    if (e.type === 'bump') return;
    let entry;
    if (e.type === 'launch' || e.type === 'rocket') {
      if (T.flown[e.i]) return; // logg bare første oppskyting for hver kule
      T.flown[e.i] = 1;
      entry = {
        icon: '🚀',
        html: `<b>Kule ${e.i + 1}</b> ${e.type === 'rocket' ? 'ble skutt opp fra Andøya' : 'ble skutt til værs'}`,
        t: Math.max(0, e.t - P.GATE_T),
      };
    } else if (e.type !== 'finish' && e.type !== 'out') {
      return; // tunnel, slaps, tørrfisk, rein og Saltstraumen vises bare i bildet
    } else if (e.type === 'finish') {
      T.state[e.i] = 'fin';
      T.fin.push(e.i);
      const r = T.fin.length;
      entry = {
        icon: r <= 3 ? ['🥇', '🥈', '🥉'][r - 1] : '🏁',
        html: `<b>Kule ${e.i + 1}</b> i mål som nr. ${r}`,
        t: e.t - P.GATE_T,
      };
    } else {
      T.state[e.i] = 'out';
      T.out++;
      const ev = Ev.EVENTS[e.cause] || Ev.EVENTS.k_kant;
      entry = {
        icon: ev.icon,
        html: `<b>Kule ${e.i + 1}</b> ${esc(e.pn ? `falt ned i ${e.pn}` : TEST_SAY[e.cause] || 'røk ut')}`,
        t: Math.max(0, e.t - P.GATE_T),
      };
    }
    T.log.push(entry);
    const list = $('#dzTlog');
    if (list) list.insertAdjacentHTML('afterbegin', logLi(entry));
    const set = (k, v) => {
      const el = panel.querySelector(`[data-ts="${k}"]`);
      if (el) el.textContent = v;
    };
    set('fin', T.fin.length);
    set('out', T.out);
    set('run', T.n - T.fin.length - T.out);
  }
  function stepTest(dt) {
    const T = test;
    T.t = Math.min(T.res.duration, T.t + dt * T.speed);
    while (T.ei < T.res.events.length && T.res.events[T.ei].t <= T.t)
      onTestEvent(T.res.events[T.ei++]);
    if (T.t >= T.res.duration && !T.done) {
      T.done = true;
      renderPanel();
      renderHud();
    }
    const clock = $('#dzClock');
    if (clock)
      clock.textContent =
        T.t < P.GATE_T
          ? `Klar … ${Math.ceil(P.GATE_T - T.t)}`
          : secs(T.t - P.GATE_T);
  }
  function followCam(dt) {
    const T = test,
      res = T.res;
    let tx = res.C.start.x,
      ty = res.C.start.y - 100;
    if (T.t >= P.GATE_T - 0.3) {
      let best = -1,
        by = -1e9;
      for (let i = 0; i < T.n; i++) {
        if (T.state[i]) continue;
        const y = pos(res, i, T.t)[1];
        if (y < -50000) continue; // inne i en tunnel
        if (y > by) {
          by = y;
          best = i;
        }
      }
      if (best >= 0) {
        const p = pos(res, best, T.t);
        tx = p[0];
        ty = p[1];
      } else {
        tx = res.C.fin.x + 60;
        ty = res.C.fin.y + 120;
      }
    }
    const k = 1 - Math.exp(-dt * 3);
    cam.x += (tx - cam.x) * k;
    cam.y += (ty - cam.y) * k;
    cam.s += (u.clamp(ch / 950, 0.3, 1.2) - cam.s) * k;
  }
  function renderHud() {
    const h = $('#dzHud');
    if (!test) {
      h.hidden = true;
      h.innerHTML = '';
      return;
    }
    h.hidden = false;
    h.innerHTML = `<span class="dz-clock" id="dzClock">Klar …</span>
      <div class="dz-speed">${[1, 2, 4].map((s) => `<button type="button" data-sp="${s}" class="${test.speed === s ? 'on' : ''}">${s}×</button>`).join('')}</div>
      <button type="button" class="dz-hb${test.follow ? ' on' : ''}" data-h="follow" aria-pressed="${test.follow}">🎯 Følg ledere</button>
      <button type="button" class="dz-hb" data-h="stop">✕ Stopp</button>`;
  }
  $('#dzHud').addEventListener('click', (e) => {
    if (!test) return;
    const sp = e.target.closest('[data-sp]');
    if (sp) {
      test.speed = +sp.dataset.sp;
      renderHud();
      return;
    }
    const b = e.target.closest('[data-h]');
    if (!b) return;
    if (b.dataset.h === 'follow') {
      test.follow = !test.follow;
      renderHud();
    } else stopTest();
  });
  $('#dzTest').addEventListener('click', startTest);

  /* ---------- Godkjenning ---------- */
  async function validate() {
    if (val.running) return;
    stopTest(true);
    const d = def(),
      h = P.hash(d);
    const need = Math.max(3, Store.settings.winners);
    val = { running: true, done: 0 };
    renderPanel();
    renderBar();
    const runs = [];
    for (let k = 0; k < VAL_RUNS; k++) {
      await new Promise((r) => setTimeout(r, 30));
      runs.push(
        P.summarize(P.simulate(VAL_N, (u.hashStr(h) + k * 104729) >>> 0, d)),
      );
      val.done = k + 1;
      renderPanel();
    }
    const a = P.assess(runs, need);
    val = { running: false, done: 0 };
    if (a.ok) {
      doc.ok = h;
      doc.stats = {
        rate: a.rate,
        winT: a.winT,
        firstT: a.firstT,
        causes: a.causes,
      };
      lastFail = null;
      save(true);
      u.toast('Godkjent! Løypa er lagret og kan brukes i trekningen.', 3200);
    } else {
      doc.ok = null;
      lastFail = { hash: h, reasons: a.reasons, causes: a.causes };
      saveDraft();
      u.toast('Ikke godkjent ennå – se hvorfor i panelet.', 3200);
    }
    renderPanel();
    renderBar();
  }
  function use() {
    if (!isOk()) return;
    if (dirty || !Store.getCourse(doc.id)) save(true);
    Store.setCourse(doc.id);
    try {
      localStorage.setItem('fredagslotteriet:spill', 'keiser');
    } catch (e) {
      /* ikke viktig */
    }
    fillOpen();
    renderPanel();
    renderBar();
    u.toast(`Neste Keiservarden GP kjøres i «${doc.name}».`, 3200);
  }
  async function delCourse() {
    const c = Store.getCourse(doc.id);
    if (
      !c ||
      !(await u.confirmDlg(
        'Slette løypa?',
        `«${c.name}» slettes fra denne nettleseren. Trekninger som er kjørt i den, kan fortsatt ses i reprise.`,
        'Slett',
      ))
    )
      return;
    Store.removeCourse(c.id);
    load(fromTemplate('copy'), null);
    u.toast('Løypa er slettet.');
  }

  /* ---------- Deling: løypa som lenke ---------- */
  function encode(d) {
    const json = JSON.stringify({ v: 1, n: d.name, p: P.normalize(d).pieces });
    const bytes = new TextEncoder().encode(json);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return (
      'KGP1.' +
      btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    );
  }
  function decode(str) {
    try {
      const m = String(str || '').match(/KGP1\.([A-Za-z0-9_-]+)/);
      if (!m) return null;
      let b = m[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      const bin = atob(b),
        bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const o = JSON.parse(new TextDecoder().decode(bytes));
      return o && Array.isArray(o.p)
        ? P.normalize({ id: u.uid('c'), name: o.n, pieces: o.p })
        : null;
    } catch (e) {
      return null;
    }
  }
  const shareDlg = $('#shareDlg');
  $('#dzShare').addEventListener('click', () => {
    const code = encode(doc);
    $('#shareName').textContent = doc.name;
    $('#shareCode').value = /^https?:$/.test(location.protocol)
      ? `${location.origin}${location.pathname}#l=${code}`
      : code;
    $('#importCode').value = '';
    shareDlg.showModal();
  });
  $('#shareCopy').addEventListener('click', async () => {
    const t = $('#shareCode');
    try {
      await navigator.clipboard.writeText(t.value);
    } catch (e) {
      t.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        /* marker teksten i stedet */
      }
    }
    u.toast('Kopiert! Lim den inn i en melding.');
  });
  async function openShared(d) {
    if (!(await confirmDiscard())) return;
    load({ ...d, id: u.uid('c') }, null);
    u.toast(`«${d.name}» er åpnet. Trykk Lagre for å beholde den.`, 3600);
  }
  $('#importGo').addEventListener('click', () => {
    const d = decode($('#importCode').value);
    if (!d) {
      u.toast('Fant ingen løype i teksten. Lim inn hele lenken eller koden.');
      return;
    }
    shareDlg.close();
    openShared(d);
  });
  function fromHash() {
    const m = location.hash.match(/^#l=(.+)$/);
    if (!m) return null;
    history.replaceState(null, '', location.pathname + location.search);
    return decode(decodeURIComponent(m[1]));
  }
  window.addEventListener('hashchange', () => {
    const d = fromHash();
    if (d) openShared(d);
  });

  /* ---------- Verktøy på lerretet og delelista ---------- */
  $('#dzPal').innerHTML = PALETTE.map(
    (t) =>
      `<button type="button" data-add="${t}" title="Legg til ${esc(KINDS[t].name.toLowerCase())}"><span class="dz-ico">${KINDS[t].ico}</span>${esc(KINDS[t].pal || KINDS[t].name)}</button>`,
  ).join('');
  $('#dzPal').addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]');
    if (b) add(b.dataset.add);
  });
  stage.querySelector('.dz-tools').addEventListener('click', (e) => {
    const z = e.target.closest('[data-z]');
    if (z) {
      if (z.dataset.z === 'fit') {
        if (test) test.follow = false;
        fit(true);
      } else zoomAt(cw / 2, ch / 2, z.dataset.z === 'in' ? 1.3 : 1 / 1.3);
    }
  });
  $('#dzUndo').addEventListener('click', undo);
  $('#dzRedo').addEventListener('click', redo);
  $('#dzSnap').addEventListener('click', (e) => {
    snapOn = !snapOn;
    e.currentTarget.classList.toggle('is-on', snapOn);
    e.currentTarget.setAttribute('aria-pressed', snapOn);
  });
  Store.subscribe(() => {
    if (!doc) return;
    const sc = Store.getCourse(doc.id);
    savedSig = sc ? sigOf(sc) : null;
    dirtyCheck();
    fillOpen();
    renderBar();
  });

  /* ---------- Hovedløkke ---------- */
  let last = performance.now();
  function tick(dt) {
    time += dt;
    if (test) {
      stepTest(dt);
      if (test && test.follow) followCam(dt);
    }
    draw();
  }
  function loop(now) {
    const dt = Math.min(0.06, (now - last) / 1000);
    last = now;
    tick(dt);
    requestAnimationFrame(loop);
  }

  /* ---------- Oppstart: delt lenke → kladd → løypa i bruk → kopi av originalen ---------- */
  function init() {
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
    window.addEventListener('resize', resize);
    resize();
    const shared = fromHash();
    let draft = null;
    try {
      draft = JSON.parse(localStorage.getItem(DRAFT) || 'null');
    } catch (e) {
      draft = null;
    }
    if (shared) {
      load({ ...shared, id: u.uid('c') }, null);
      u.toast(
        `Delt løype åpnet: «${shared.name}». Trykk Lagre for å beholde den.`,
        4200,
      );
    } else if (
      draft &&
      draft.doc &&
      Array.isArray(draft.doc.pieces) &&
      P.normalize(draft.doc)
    )
      load(draft.doc, Store.getCourse(draft.doc.id));
    else {
      const active =
        Store.courseId !== P.ORIGINAL.id
          ? Store.getCourse(Store.courseId)
          : null;
      load(active || fromTemplate('copy'), active);
    }
    requestAnimationFrame(loop);
  }
  init();
  FL.Designer = {
    get doc() {
      return doc;
    },
    get test() {
      return test;
    },
    get sel() {
      return sel;
    },
    cam,
    tick,
    load,
    add,
    select,
    startTest,
    stopTest,
    validate,
    save,
    use,
    encode,
    decode,
    fit,
  };
})();
