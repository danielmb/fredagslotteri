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

  /* ---------- Skinner: ferdige program ---------- */
  // et program går i ring: { to: % av skinnen, t: sekunder, e: kurve } kjører dit, { t } venter
  const PRESET = {
    pendel: {
      label: '↔ Fram og tilbake',
      prog: [
        { to: 100, t: 2, e: 'smooth' },
        { to: 0, t: 2, e: 'smooth' },
      ],
    },
    heis: {
      label: '🛗 Heis',
      prog: [
        { t: 1.5 },
        { to: 100, t: 2.5, e: 'smooth' },
        { t: 1.5 },
        { to: 0, t: 2.5, e: 'smooth' },
      ],
    },
    kast: {
      label: '🚀 Utskyter',
      prog: [
        { t: 1.5 },
        { to: 100, t: 0.3, e: 'throw' },
        { t: 0.5 },
        { to: 0, t: 2.5, e: 'smooth' },
      ],
    },
    stempel: {
      label: '💥 Stempel',
      prog: [
        { t: 1.2 },
        { to: 100, t: 0.15, e: 'linear' },
        { t: 0.3 },
        { to: 0, t: 1.2, e: 'smooth' },
      ],
    },
    // tilfeldig tid på alt: ingen vet når den går
    lune: {
      label: '🎲 Lunefull',
      prog: [
        { t: 0.5, t2: 3 },
        { to: 100, t: 0.4, e: 'smooth', t2: 2 },
        { t: 0.3, t2: 2 },
        { to: 0, t: 0.6, e: 'smooth', t2: 2.5 },
      ],
    },
    // kjører fram, og teleporterer tilbake i stedet for å kjøre
    hopp: {
      label: '✨ Teleport tilbake',
      prog: [
        { t: 1 },
        { to: 100, t: 2.5, e: 'linear' },
        { t: 0.6 },
        { to: 0, t: 1, e: 'jump' },
      ],
    },
  };
  const EASE_NAME = [
    ['smooth', 'Myk'],
    ['linear', 'Jevn'],
    ['throw', 'Kast'],
    ['jump', 'Hopp'], // teleporterer dit med en gang
  ];

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
      help: 'Spinner som en kontring. Kuler som kommer for nær, kan bli slått rett ut av løypa. Skru farten over 5, så skyter det kulene til værs. Velg «I takt», så går flere hjul helt likt. Navet i midten kan tas bort.',
      make: (x, y) => ({ x, y, len: 100, speed: 2.2, arms: 4 }),
    },
    arm: {
      name: 'Glimt-arm',
      ico: '🦾',
      help: 'Glimt-hjulet uten hjul: én arm som spinner rundt bolten i enden. Skru farten over 5, så slår den kulene til værs. Velg «I takt» og en startvinkel for å time flere armer.',
      make: (x, y) => ({ x, y, len: 150, speed: 3 }),
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
    // en rampe på skinne (alt som er på skinne, er vanlige deler med en «rail»)
    lift: {
      name: 'Heis',
      pal: 'Heis',
      ico: '🛗',
      as: 'ramp',
      help: 'En plattform som kjører opp og ned på en skinne.',
      make: (x, y) => ({
        ax: x - 100,
        ay: y,
        bx: x + 100,
        by: y + 10,
        rail: { dx: 0, dy: -300, prog: clone(PRESET.heis.prog) },
      }),
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
    deco: {
      name: 'Pynt',
      pal: 'Pynt',
      ico: '🌲',
      help: 'Trær, hus, båter, skyer … Bare pynt – kulene merker den ikke, og løypa trenger ikke godkjennes på nytt. Sett den på skinne, så kan skyer og fly kjøre over himmelen.',
      make: (x, y) => ({ x, y, ico: '🌲', size: 120 }),
    },
    shape: {
      name: 'Bakgrunnsfelt',
      pal: 'Bakgrunn',
      ico: '🟦',
      help: 'Et farget felt bak løypa: sjø, gress, en husvegg … Bare pynt – kulene merker det ikke. Ta tak i kanten for å flytte det, og dra i hjørnene for å endre størrelsen.',
      make: (x, y) => ({ x0: x - 200, y0: y - 120, x1: x + 200, y1: y + 120, col: '#2a6f8f', alpha: 60 }),
    },
    boss: {
      name: 'Sjefen',
      pal: 'Sjefen',
      ico: '👔',
      help: 'Sjefen liker ikke fredagslotteriet. Han står og skyter grønne stråler med strålepistolen på kulene han ser foran seg. Vegger og ramper stopper strålene. Velg om strålen dytter kulene eller fordamper dem.',
      make: (x, y) => ({ x, y, dir: 1, range: 600, cd: 1.4, zap: 0, force: 900 }),
    },
  };
  const PALETTE = [
    'ramp',
    'wall',
    'pegs',
    'bumper',
    'wheel',
    'arm',
    'seesaw',
    'trap',
    'pit',
    'wind',
    'eagle',
    'vortex',
    'belt',
    'lift',
    'ferry',
    'rocket',
    'tunnel',
    'rack',
    'rein',
    'slush',
    'boss',
    'sign',
    'deco',
    'shape',
  ];
  // pynt å velge mellom (du kan også lime inn en hvilken som helst emoji)
  const DECOS = ['🌲', '🌳', '🌴', '🌵', '🏔️', '🏠', '🏡', '⛪', '🏰', '🗼', '🏭', '⛵', '🚢', '🛶', '🐋', '🦭', '🐟', '🦌', '🦊', '🐧', '🐻', '☁️', '🌧️', '❄️', '⛄', '🌙', '⭐', '☀️', '🌈', '🎄', '✈️', '🚁', '🎈', '🏆', '⚽', '💛', '☕', '🧇', '🎉', '👻'];
  // fargeprøver (i tillegg til fri fargevelger)
  const SWATCH = ['#ffffff', '#e9dfc9', '#c9bda5', '#8b97a6', '#2b2f36', '#ffd400', '#f6bd47', '#ee4a2f', '#df4f86', '#9466ff', '#4f7dff', '#1597bd', '#5ef2b5', '#4fae3e', '#8a5a3b'];
  const SKY_NAME = [
    ['natt', '🌌 Natt'],
    ['skumring', '🌆 Skumring'],
    ['dag', '☀️ Dag'],
    ['sol', '🌅 Midnattssol'],
    ['storm', '⛈️ Storm'],
  ];
  const COLOR = { k: 'col', label: 'Farge', color: true };
  // i takt: fast startvinkel i stedet for tilfeldig (vinkelen vises bare når takt er på)
  const SYNC = [
    {
      k: 'sync',
      label: 'Takt',
      opts: [
        [0, 'Tilfeldig'],
        [1, 'I takt'],
      ],
    },
    {
      k: 'ang',
      label: 'Startvinkel (grader, 90 = opp)',
      min: 0,
      max: 359,
      step: 1,
      when: (p) => p.sync,
    },
  ];
  const FIELDS = {
    ramp: [COLOR],
    wall: [COLOR],
    bumper: [COLOR],
    pegs: [
      { k: 'rows', label: 'Rader', min: 1, max: 14, step: 1 },
      { k: 'w', label: 'Bredde', min: 64, max: 1500, step: 2 },
      COLOR,
    ],
    deco: [
      { k: 'ico', label: 'Figur', deco: true },
      { k: 'size', label: 'Størrelse', min: 24, max: 600, step: 2 },
      { k: 'ang', label: 'Vridd (grader)', min: -180, max: 180, step: 1, def: 0 },
      {
        k: 'flip',
        label: 'Speilvendt',
        opts: [
          [0, 'Nei'],
          [1, 'Ja ⇋'],
        ],
      },
      {
        k: 'front',
        label: 'Ligger',
        opts: [
          [0, 'Bak løypa'],
          [1, 'Foran løypa'],
        ],
      },
    ],
    shape: [
      COLOR,
      { k: 'alpha', label: 'Synlighet (%)', min: 5, max: 100, step: 1 },
      {
        k: 'round',
        label: 'Form',
        opts: [
          [0, '▭ Firkant'],
          [1, '⬭ Oval'],
        ],
      },
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
      {
        k: 'hub',
        label: 'Nav i midten',
        def: 1,
        opts: [
          [1, 'Med'],
          [0, 'Uten'],
        ],
      },
      ...SYNC,
    ],
    arm: [
      { k: 'len', label: 'Lengde', min: 30, max: 400, step: 2 },
      {
        k: 'speed',
        label: 'Fart (minus = andre veien)',
        min: -P.W_MAX,
        max: P.W_MAX,
        step: 0.1,
      },
      ...SYNC,
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
    sign: [{ k: 'text', label: 'Tekst på skiltet', text: 28 }, COLOR],
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
    boss: [
      { k: 'dir', label: 'Ser mot', dir: true },
      { k: 'range', label: 'Rekkevidde', min: 150, max: 1200, step: 10 },
      { k: 'cd', label: 'Sekunder mellom skuddene', min: 0.4, max: 4, step: 0.1 },
      {
        k: 'zap',
        label: 'Strålen',
        opts: [
          [0, 'Dytter kulene'],
          [1, 'Fordamper dem'],
        ],
      },
      {
        k: 'force',
        label: 'Kraft på strålen',
        min: 100,
        max: 2400,
        step: 50,
        when: (p) => !p.zap,
      },
    ],
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
    k_arm: 'ble slått ut av Glimt-armen',
    k_sjef: 'ble tatt av Sjefen',
    k_heis: 'ble kastet ut av løypa av heisen',
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

  // demo med deler på skinne: en heis med skjørt (stenger sjakta når den er oppe) og en utskyter (godkjent: rundt 98 % i mål)
  const DEMO_RAIL = [
    { type: 'start', x: 400, y: 300 },
    { type: 'ramp', ax: 520, ay: 360, bx: 150, by: 520 },
    { type: 'wall', ax: 100, ay: 420, bx: 100, by: 1560 },
    { type: 'ramp', ax: 110, ay: 1450, bx: 350, by: 1500 },
    { type: 'ramp', ax: 360, ay: 1505, bx: 560, by: 1525, grp: 'heis', rail: { dx: 0, dy: -560, prog: clone(PRESET.heis.prog) } },
    { type: 'wall', ax: 352, ay: 1515, bx: 352, by: 2070, grp: 'heis', rail: { dx: 0, dy: -560, prog: clone(PRESET.heis.prog) } },
    { type: 'wall', ax: 572, ay: 990, bx: 572, by: 1560 },
    { type: 'ramp', ax: 572, ay: 966, bx: 1090, by: 1140 },
    { type: 'ramp', ax: 1100, ay: 1130, bx: 1260, by: 1225, grp: 'kast', rail: { dx: 40, dy: -260, prog: clone(PRESET.kast.prog) } },
    { type: 'wall', ax: 1268, ay: 1185, bx: 1268, by: 1235, grp: 'kast', rail: { dx: 40, dy: -260, prog: clone(PRESET.kast.prog) } },
    { type: 'wall', ax: 1590, ay: -200, bx: 1590, by: 1500 },
    { type: 'ramp', ax: 1585, ay: 1450, bx: 700, by: 1650 },
    { type: 'wall', ax: 650, ay: 1550, bx: 650, by: 1800 },
    { type: 'ramp', ax: 660, ay: 1780, bx: 1280, by: 1960 },
    { type: 'finish', x: 1300, y: 1830 },
    { type: 'sign', x: 300, y: 110, text: 'HEIS OG UTSKYTER' },
    { type: 'sign', x: 470, y: 1660, text: 'HEISEN ↑' },
    { type: 'sign', x: 1180, y: 1330, text: 'UTSKYTEREN' },
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
      case 'arm':
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
      case 'boss':
        return { x0: p.x - 34, y0: p.y - 128, x1: p.x + 34, y1: p.y + 22 };
      case 'deco':
        return { x0: p.x - p.size / 2, y0: p.y - p.size / 2, x1: p.x + p.size / 2, y1: p.y + p.size / 2 };
      case 'shape':
        return { x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1 };
      case 'look': // utseendet har ingen plass i løypa
        return { x0: 0, y0: 0, x1: 0, y1: 0 };
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
    if (p.type === 'look') return Infinity;
    if (p.type === 'shape') {
      // bakgrunnsfeltet tas i kanten, så du kan dra i bakgrunnen inni det for å flytte deg rundt
      if (x < p.x0 - tol || x > p.x1 + tol || y < p.y0 - tol || y > p.y1 + tol) return Infinity;
      const edge = Math.min(Math.abs(x - p.x0), Math.abs(p.x1 - x), Math.abs(y - p.y0), Math.abs(p.y1 - y));
      return edge <= 10 + tol ? (p.x1 - p.x0) * (p.y1 - p.y0) * 2 : Infinity;
    }
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
    if (p.type === 'wheel' || p.type === 'arm')
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
    if (p.type === 'boss')
      return x > p.x - 40 - tol && x < p.x + 40 + tol && y > p.y - 130 - tol && y < p.y + 22 + tol
        ? 1100
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
      case 'boss':
        return [{ k: 'r', x: p.x + p.dir * (42 + p.range), y: p.y - 72 }];
      case 'slush':
      case 'shape':
        return [
          { k: 'tl', x: p.x0, y: p.y0 },
          { k: 'br', x: p.x1, y: p.y1 },
        ];
      case 'deco':
        return [{ k: 's', x: p.x + p.size / 2, y: p.y + p.size / 2 }];
      case 'pegs':
        return [{ k: 'se', x: p.x + p.w, y: p.y + (p.rows - 1) * 56 }];
      case 'wheel':
      case 'arm': {
        // i takt: håndtaket står der armen starter, så du kan dra den dit du vil
        const a = p.sync ? (p.ang * Math.PI) / 180 : 0;
        return [{ k: 'r', x: p.x + Math.cos(a) * p.len, y: p.y - Math.sin(a) * p.len }];
      }
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
      case 'boss': {
        // dra rekkevidden; drar du forbi Sjefen, snur han seg
        const dx = x - (p.x + p.dir * 42);
        if (Math.sign(dx) && Math.sign(dx) !== p.dir && Math.abs(dx) > 60) p.dir = Math.sign(dx);
        p.range = u.clamp(Math.round(Math.hypot(x - (p.x + p.dir * 42), y - (p.y - 72)) / 10) * 10, 150, 1200);
        break;
      }
      case 'slush':
      case 'shape': {
        const mw = p.type === 'shape' ? 20 : 60,
          mh = p.type === 'shape' ? 20 : 40;
        if (k === 'tl') {
          p.x0 = Math.min(x, p.x1 - mw);
          p.y0 = Math.min(y, p.y1 - mh);
        } else {
          p.x1 = Math.max(x, p.x0 + mw);
          p.y1 = Math.max(y, p.y0 + mh);
        }
        break;
      }
      case 'deco':
        p.size = u.clamp(Math.round(2 * Math.max(Math.abs(x - p.x), Math.abs(y - p.y))), 24, 600);
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
      case 'arm':
        p.len = u.clamp(
          Math.round(Math.hypot(x - p.x, y - p.y)),
          p.type === 'arm' ? 30 : 50,
          p.type === 'arm' ? 400 : 180,
        );
        if (p.sync)
          p.ang =
            (((Math.round((Math.atan2(p.y - y, x - p.x) * 180) / Math.PI)) % 360) + 360) % 360;
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
  let picked = [], // alle valgte deler (indekser, sortert)
    sel = -1, // den ene valgte delen (bare når nøyaktig én er valgt)
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
  // signaturen for «ulagrede endringer» tar med alt – også pynt og farger, som godkjenningen ser bort fra
  const sigOf = (c) => {
    const d = P.normalize(c);
    return d ? `${d.name}|${u.hashStr(JSON.stringify(d.pieces)).toString(36)}` : '';
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
    if (kind === 'rail')
      return { id: u.uid('c'), name: 'Heis og utskyter', pieces: clone(DEMO_RAIL) };
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
      home: !test, // delene på skinne står hjemme mens du bygger (spøkelset viser programmet)
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
      } else if (p.type === 'shape') {
        // kanten på bakgrunnsfeltet er der du tar tak i det
        ctx.strokeStyle = 'rgba(255,255,255,.22)';
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
    // hvor langt Sjefen ser (han skyter bare framover)
    for (const p of doc.pieces) {
      if (p.type !== 'boss') continue;
      const gx = p.x + p.dir * 42,
        gy = p.y - 72,
        a0 = p.dir > 0 ? -1.1 : Math.PI - 1.1;
      ctx.strokeStyle = 'rgba(94,242,138,.45)';
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.arc(gx, gy, p.range, a0, a0 + 2.2);
      ctx.closePath();
      ctx.stroke();
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
    drawRails(px);
    if (hover >= 0 && !isPicked(hover) && doc.pieces[hover])
      for (const i of grpOf(hover)) outline(doc.pieces[i], 'rgba(255,255,255,.55)');
    if (drag && drag.kind === 'box') {
      // rammen du drar for å velge flere
      const a = drag.w0,
        b = drag.w1;
      ctx.save();
      ctx.fillStyle = 'rgba(94,242,181,.08)';
      ctx.strokeStyle = 'rgba(94,242,181,.8)';
      ctx.lineWidth = 1.5 * px;
      ctx.setLineDash([6 * px, 5 * px]);
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
      ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
      ctx.restore();
    }
    if (drag && drag.guide) {
      // Shift: stiplet hjelpelinje langs den rette linjen
      const g = drag.guide,
        L = (v.w + v.h) * 2;
      ctx.save();
      ctx.setLineDash([10 * px, 8 * px]);
      ctx.lineWidth = 2 * px;
      ctx.strokeStyle = 'rgba(94,242,181,.65)';
      ctx.beginPath();
      ctx.moveTo(g.x - g.ux * L, g.y - g.uy * L);
      ctx.lineTo(g.x + g.ux * L, g.y + g.uy * L);
      ctx.stroke();
      ctx.restore();
    }
    for (const i of picked) if (doc.pieces[i]) outline(doc.pieces[i], '#5ef2b5');
    const p = doc.pieces[sel];
    if (p)
      for (const h of handles(p)) {
        ctx.beginPath();
        ctx.arc(h.x, h.y, 8 * px, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.lineWidth = 3 * px;
        ctx.strokeStyle = '#5ef2b5';
        ctx.stroke();
      }
    // skinnehåndtaket: gult, i enden av skinnen
    const rh = railHandle();
    if (rh) {
      ctx.save();
      ctx.setLineDash([8 * px, 6 * px]);
      ctx.lineWidth = 2 * px;
      ctx.strokeStyle = 'rgba(246,189,71,.8)';
      ctx.beginPath();
      ctx.moveTo(rh.cx, rh.cy);
      ctx.lineTo(rh.x, rh.y);
      ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(rh.x, rh.y, 10 * px, 0, Math.PI * 2);
      ctx.fillStyle = '#f6bd47';
      ctx.fill();
      ctx.lineWidth = 3 * px;
      ctx.strokeStyle = '#23272e';
      ctx.stroke();
      ctx.fillStyle = '#f6bd47';
      ctx.font = `800 ${11 * px}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('100 %', rh.x, rh.y - 22 * px);
    }
  }
  /* Skinnene i designeren: spøkelset som kjører programmet, og merker for hvor stegene stopper */
  function drawRails(px) {
    if (!C.movers.length) return;
    const t = (time % 80) + 4;
    for (const M of C.movers) {
      const s = P.kin.railDraw(M, t);
      ctx.save();
      ctx.globalAlpha = 0.42;
      D.teleport(ctx, M, t, C.look);
      D.mover(ctx, M, s.ox, s.oy, {}, C.look);
      ctx.restore();
      if (M.L < 2) continue;
      // stoppene langs skinnen: «1, 3» der steg 1 og 3 kjører til
      const at = new Map();
      // (med tilfeldig tid er hele løpet lagt ut, så samme steg finnes mange ganger)
      for (const k of M.keys) {
        if (!k.go) continue; // venting
        const key = k.s1.toFixed(3);
        if (!at.has(key)) at.set(key, { s: k.s1, n: [] });
        const g = at.get(key);
        if (!g.n.includes(k.st + 1)) g.n.push(k.st + 1);
      }
      for (const g of at.values()) g.n.sort((a, b) => a - b);
      ctx.font = `700 ${11 * px}px "JetBrains Mono", monospace`;
      ctx.textBaseline = 'middle';
      const nx = -M.ry / M.L,
        ny = M.rx / M.L;
      for (const { s, n } of at.values()) {
        const x = M.cx + M.rx * s,
          y = M.cy + M.ry * s;
        ctx.fillStyle = 'rgba(246,189,71,.9)';
        ctx.beginPath();
        ctx.arc(x, y, 4.5 * px, 0, Math.PI * 2);
        ctx.fill();
        ctx.textAlign = nx >= 0 ? 'left' : 'right';
        ctx.fillText(n.join(', '), x + nx * 16 * px + (nx >= 0 ? 4 : -4) * px, y + ny * 16 * px);
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
        rank && rank <= 3
          ? ['#ffd34d', '#dfe6ee', '#e0a070'][rank - 1]
          : i === T.lead && !st && T.t > P.GATE_T + 1 && !T.fin.length
            ? '#5ef2b5' // leder etter sjekkpunktene, som i spillet
            : null,
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
    pickQuiet([]);
    afterEdit();
  }
  function redo() {
    if (!redoStack.length || test) return;
    undoStack.push(snapshot());
    doc.pieces = JSON.parse(redoStack.pop());
    pickQuiet([]);
    afterEdit();
  }

  /* ---------- Valg, grupper og skinner ---------- */
  const fixedType = (p) => p.type === 'start' || p.type === 'finish' || p.type === 'look';
  const isVisual = (p) => P.VISUAL.includes(p.type); // pynt og bakgrunn kan ligge utenfor kanten av løypa
  const isPicked = (i) => picked.includes(i);
  // velg uten å tegne panelet på nytt (gjøres av changed/afterEdit)
  function pickQuiet(arr) {
    picked = [...new Set(arr)]
      .filter((i) => doc.pieces[i])
      .sort((a, b) => a - b);
    sel = picked.length === 1 ? picked[0] : -1;
    hover = -1;
  }
  function setPicked(arr) {
    pickQuiet(arr);
    renderPanel();
  }
  // hele gruppa en del hører til (eller bare delen selv)
  function grpOf(i) {
    const g = doc.pieces[i] && doc.pieces[i].grp;
    if (!g) return [i];
    const out = [];
    doc.pieces.forEach((p, j) => {
      if (p.grp === g) out.push(j);
    });
    return out;
  }
  // gruppa som er valgt, hvis det som er valgt er nøyaktig én hel gruppe
  function pickedGroup() {
    if (picked.length < 2) return null;
    const g = doc.pieces[picked[0]].grp;
    if (!g) return null;
    const all = grpOf(picked[0]);
    return all.length === picked.length && all.every((i, k) => i === picked[k])
      ? g
      : null;
  }
  // delene som kjører sammen på en skinne: én del uten gruppe, eller en hel gruppe
  function railUnit() {
    if (sel >= 0) return grpOf(sel).length > 1 ? null : [sel];
    return pickedGroup() ? picked.slice() : null;
  }
  const riders = (idxs) =>
    idxs.filter((i) => P.RIDERS.includes(doc.pieces[i].type));
  function unitRail(idxs) {
    for (const i of idxs) if (doc.pieces[i] && doc.pieces[i].rail) return doc.pieces[i].rail;
    return null;
  }
  // skinnehåndtaket: der skinnen slutter (fra midten av delene)
  function railHandle() {
    const idxs = railUnit(),
      rail = idxs && unitRail(idxs);
    if (!rail) return null;
    const c = P.railCenter(riders(idxs).map((i) => doc.pieces[i]));
    return { k: 'rail', x: c.x + rail.dx, y: c.y + rail.dy, cx: c.x, cy: c.y };
  }
  // samme skinne og program på alle delene som kan kjøre (null = står stille)
  function setRail(idxs, rail) {
    for (const i of idxs) {
      const p = doc.pieces[i];
      if (!p || !P.RIDERS.includes(p.type)) continue;
      const c = clone(p);
      if (rail) c.rail = clone(rail);
      else delete c.rail;
      doc.pieces[i] = P.sanePiece(c);
    }
  }
  const curRail = (idxs) =>
    clone(
      unitRail(idxs) || { dx: 0, dy: -300, prog: clone(PRESET.pendel.prog) },
    );
  function newGrp() {
    let g;
    do g = 'g' + Math.random().toString(36).slice(2, 8);
    while (doc.pieces.some((p) => p.grp === g));
    return g;
  }
  // en gruppe med bare én del igjen er ingen gruppe
  function tidyGroups() {
    const n = {};
    doc.pieces.forEach((p) => {
      if (p.grp) n[p.grp] = (n[p.grp] || 0) + 1;
    });
    doc.pieces.forEach((p, i) => {
      if (p.grp && n[p.grp] < 2) {
        const c = clone(p);
        delete c.grp;
        doc.pieces[i] = c;
      }
    });
  }
  // kopier delene (grupper får nye navn, så kopien blir sin egen gruppe)
  function copyPieces(idxs, off) {
    const map = {},
      out = [];
    for (const i of idxs) {
      const p = doc.pieces[i];
      if (!p || fixedType(p)) continue;
      const c = clone(p);
      if (c.grp) c.grp = map[c.grp] || (map[c.grp] = newGrp());
      move(c, off, off);
      doc.pieces.push(P.sanePiece(c));
      out.push(doc.pieces.length - 1);
    }
    tidyGroups();
    return out;
  }
  function group() {
    const idxs = picked.filter((i) => !fixedType(doc.pieces[i]));
    if (idxs.length < 2) {
      u.toast('Velg minst to deler først (Ctrl + klikk), så kan de grupperes.');
      return;
    }
    const before = snapshot(),
      g = newGrp(),
      rail = unitRail(idxs);
    for (const i of idxs) {
      const c = clone(doc.pieces[i]);
      c.grp = g;
      doc.pieces[i] = P.sanePiece(c);
    }
    if (rail) setRail(idxs, rail); // har én av dem skinne, kjører hele gruppa på den
    tidyGroups();
    pickQuiet(idxs);
    changed(before);
  }
  function ungroup() {
    const gs = new Set(picked.map((i) => doc.pieces[i].grp).filter(Boolean));
    if (!gs.size) return;
    const before = snapshot();
    doc.pieces.forEach((p, i) => {
      if (!gs.has(p.grp)) return;
      const c = clone(p);
      delete c.grp;
      doc.pieces[i] = c;
    });
    changed(before);
  }
  // ingen grenser – bare start og mål finnes én av
  function roomFor(type) {
    const max = P.LIMITS[type];
    if (max && doc.pieces.filter((p) => p.type === type).length >= max) {
      u.toast(`Det kan bare være én «${KINDS[type].name}».`);
      return false;
    }
    return true;
  }
  function add(type) {
    stopTest(true);
    const K = KINDS[type],
      real = K.as || type; // «Heis» er en rampe på skinne
    if (!roomFor(real)) return;
    const before = snapshot();
    const v = view();
    const p = P.sanePiece({
      type: real,
      ...K.make(sv(u.clamp(v.x + v.w / 2, 260, 1340)), sv(v.y + v.h / 2)),
    });
    doc.pieces.push(p);
    pickQuiet([doc.pieces.length - 1]);
    changed(before);
  }
  // slett alt som er valgt (start og mål blir stående)
  function removeMany(idxs) {
    const del = idxs.filter((i) => doc.pieces[i] && !fixedType(doc.pieces[i]));
    if (!del.length) {
      if (idxs.length) u.toast('Start og mål kan flyttes, men ikke slettes.');
      return;
    }
    const before = snapshot();
    doc.pieces = doc.pieces.filter((p, i) => !del.includes(i));
    tidyGroups();
    pickQuiet([]);
    changed(before);
  }
  const remove = (i) => removeMany([i]);
  function duplicateMany(idxs) {
    if (!idxs.some((i) => doc.pieces[i] && !fixedType(doc.pieces[i]))) return;
    const before = snapshot();
    pickQuiet(copyPieces(idxs, 40));
    changed(before);
  }
  const duplicate = (i) => duplicateMany([i]);
  function select(i) {
    setPicked(i >= 0 ? [i] : []);
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
  // håndtakene til den valgte delen, og skinnehåndtaket
  function handleAt(sx, sy) {
    const hs = sel >= 0 && doc.pieces[sel] ? handles(doc.pieces[sel]) : [];
    const rh = railHandle();
    if (rh) hs.unshift(rh);
    return (
      hs.find((h) => {
        const s = toScreen(h.x, h.y);
        return Math.hypot(s.x - sx, s.y - sy) <= 13;
      }) || null
    );
  }
  // flytt delene uten at noen klemmes skjev mot kanten av verden
  function clampMove(origs, dx) {
    let x0 = Infinity,
      x1 = -Infinity;
    for (const o of [].concat(origs)) {
      if (isVisual(o)) continue;
      const b = bounds(o);
      x0 = Math.min(x0, b.x0);
      x1 = Math.max(x1, b.x1);
    }
    return x0 === Infinity ? dx : u.clamp(dx, -150 - x0, 1750 - x1);
  }
  // delene som ligger helt inni rammen (hele grupper)
  function inBox(a, b) {
    const x0 = Math.min(a.x, b.x),
      x1 = Math.max(a.x, b.x),
      y0 = Math.min(a.y, b.y),
      y1 = Math.max(a.y, b.y),
      out = [];
    doc.pieces.forEach((p, i) => {
      if (p.type === 'look') return;
      const r = bounds(p);
      if (r.x0 >= x0 && r.x1 <= x1 && r.y0 >= y0 && r.y1 <= y1) out.push(...grpOf(i));
    });
    return out;
  }

  /* ---------- Shift: rette linjer ---------- */
  const LINE_TYPES = ['ramp', 'wall', 'trap', 'eagle', 'belt', 'ferry', 'tunnel', 'rein'];
  const ROT_STEP = 15; // rakettsiktet og armer i takt går i hopp på 15°
  // (x, y) trukket inn på nærmeste rette linje fra (ox, oy): vannrett, loddrett eller 45° på skrå
  function straight(ox, oy, x, y) {
    const a = Math.round(Math.atan2(y - oy, x - ox) / (Math.PI / 4)) * (Math.PI / 4),
      ux = Math.round(Math.cos(a)),
      uy = Math.round(Math.sin(a)),
      t = sv(((x - ox) * ux + (y - oy) * uy) / (ux * ux + uy * uy));
    return { x: ox + ux * t, y: oy + uy * t, ux, uy };
  }
  // legg inn de nye versjonene av delene (bare hvis noe faktisk endret seg)
  function putAll(idxs, ps) {
    let ch = false;
    idxs.forEach((j, k) => {
      const clean = P.sanePiece(ps[k]);
      if (JSON.stringify(clean) !== JSON.stringify(doc.pieces[j])) {
        doc.pieces[j] = clean;
        ch = true;
      }
    });
    if (ch) {
      drag.changed = true;
      rebuild();
    }
  }
  // flytt delene eller dra håndtaket dit pekeren er. Med Shift: rette linjer og låst retning
  function dragTo(sx, sy, shift) {
    const w = toWorld(sx, sy);
    drag.guide = null; // stiplet hjelpelinje mens Shift holdes
    if (drag.kind === 'move') {
      let dx = w.x - drag.w0.x,
        dy = w.y - drag.w0.y;
      if (shift) {
        // bare rett bortover eller rett ned/opp – det du drar mest
        const flat = Math.abs(dx) >= Math.abs(dy);
        if (flat) dy = 0;
        else dx = 0;
        drag.guide = { x: drag.w0.x, y: drag.w0.y, ux: flat ? 1 : 0, uy: flat ? 0 : 1 };
      }
      const mx = clampMove(drag.origs, sv(dx)),
        my = sv(dy);
      putAll(
        drag.idxs,
        drag.origs.map((o) => {
          const p = clone(o);
          move(p, mx, my);
          return p;
        }),
      );
      return;
    }
    if (drag.kind === 'rail') {
      // skinnen: hvor langt og hvilken vei delene kjører (Shift: rett opp, bortover eller 45°)
      const c = drag.c;
      let x = c.x + sv(w.x - c.x),
        y = c.y + sv(w.y - c.y);
      if (shift) {
        const s = straight(c.x, c.y, w.x, w.y);
        x = s.x;
        y = s.y;
        drag.guide = { x: c.x, y: c.y, ux: s.ux, uy: s.uy };
      }
      const r = clone(drag.rail);
      r.dx = Math.round(x - c.x);
      r.dy = Math.round(y - c.y);
      putAll(
        drag.idxs,
        drag.origs.map((o) => {
          const p = clone(o);
          if (P.RIDERS.includes(p.type)) p.rail = r;
          return p;
        }),
      );
      return;
    }
    const o = drag.orig,
      p = clone(o);
    // et håndtak på én del
    {
      let x = isVisual(o) ? u.clamp(w.x, -1400, 3000) : u.clamp(w.x, -150, 1750),
        y = w.y;
      if (shift && LINE_TYPES.includes(o.type)) {
        // rampa (veggen, båndet …) legger seg rett ut fra den andre enden
        const ax = drag.key === 'a' ? o.bx : o.ax,
          ay = drag.key === 'a' ? o.by : o.ay,
          s = straight(ax, ay, x, y);
        x = s.x;
        y = s.y;
        drag.guide = { x: ax, y: ay, ux: s.ux, uy: s.uy };
      } else if (shift && o.type === 'pit' && drag.key !== 'b') {
        // kantene på hullet i samme høyde
        x = sv(x);
        y = drag.key === 'l' ? o.yr : o.yl;
        drag.guide = { x, y, ux: 1, uy: 0 };
      } else {
        x = sv(x);
        y = sv(y);
      }
      setHandle(p, drag.key, x, y);
      if (shift && o.type === 'rocket')
        p.ang = Math.round(p.ang / ROT_STEP) * ROT_STEP; // 0–180
      else if (shift && o.sync && (o.type === 'wheel' || o.type === 'arm'))
        p.ang = (Math.round(p.ang / ROT_STEP) * ROT_STEP) % 360;
    }
    const clean = P.sanePiece(p);
    if (JSON.stringify(clean) !== JSON.stringify(doc.pieces[drag.idx])) {
      doc.pieces[drag.idx] = clean;
      drag.changed = true;
      rebuild();
    }
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
      const h = handleAt(sx, sy);
      if (h && h.k === 'rail') {
        // skinnehåndtaket: hele delen eller gruppa følger med
        const idxs = railUnit();
        drag = {
          kind: 'rail',
          idxs,
          c: { x: h.cx, y: h.cy },
          rail: clone(unitRail(idxs)),
          before: snapshot(),
          origs: idxs.map((j) => clone(doc.pieces[j])),
          changed: false,
        };
        return;
      }
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
      // Ctrl/Cmd eller Shift: velg flere (klikk på en valgt del tar den ut igjen)
      const multi = e.ctrlKey || e.metaKey || e.shiftKey;
      if (i >= 0) {
        const before = snapshot(),
          unit = grpOf(i); // klikk på en del i en gruppe velger hele gruppa
        let toggleOff = null,
          clickSel = null;
        if (multi) {
          if (unit.every(isPicked)) toggleOff = unit;
          else setPicked(picked.concat(unit));
        } else if (!isPicked(i)) setPicked(unit);
        else if (picked.length > unit.length) clickSel = unit; // bare et klikk: velg bare denne
        let idxs = picked.slice(),
          copied = false;
        // Alt + dra: dra ut en kopi, originalene blir stående
        if (e.altKey && idxs.some((j) => !fixedType(doc.pieces[j]))) {
          idxs = copyPieces(idxs, 0);
          pickQuiet(idxs);
          renderPanel();
          rebuild();
          copied = true;
        }
        drag = {
          kind: 'move',
          idxs,
          w0: w,
          sx0: sx,
          sy0: sy,
          moved: false,
          before,
          origs: idxs.map((j) => clone(doc.pieces[j])),
          changed: copied,
          toggleOff,
          clickSel,
        };
        canvas.style.cursor = 'grabbing';
        return;
      }
      if (multi) {
        // Shift/Ctrl + dra i bakgrunnen: ramme rundt det som skal velges
        drag = { kind: 'box', w0: w, w1: w, base: picked.slice() };
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
      const h = handleAt(sx, sy);
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
    } else if (drag.kind === 'box') {
      drag.w1 = toWorld(sx, sy);
      pickQuiet(drag.base.concat(inBox(drag.w0, drag.w1)));
    } else {
      // et lite skjelv i klikket flytter ingenting
      if (drag.kind === 'move' && !drag.moved) {
        if (Math.hypot(sx - drag.sx0, sy - drag.sy0) < 4) return;
        drag.moved = true;
      }
      drag.sx = sx;
      drag.sy = sy;
      dragTo(sx, sy, e.shiftKey);
    }
  });
  // trykker eller slipper du Shift midt i et drag, retter den seg opp med en gang
  const onShift = (e) => {
    if (e.key !== 'Shift' || !drag || drag.sx == null) return;
    if (drag.kind === 'move' || drag.kind === 'handle' || drag.kind === 'rail')
      dragTo(drag.sx, drag.sy, e.type === 'keydown');
  };
  window.addEventListener('keydown', onShift);
  window.addEventListener('keyup', onShift);
  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (!drag) return;
    if (drag.kind === 'pinch') {
      if (!pointers.size) drag = null;
      return;
    }
    if (drag.kind === 'pan' && drag.click && !test) select(-1);
    if (drag.kind === 'move' && !drag.moved) {
      // bare et klikk
      if (drag.toggleOff) pickQuiet(picked.filter((j) => !drag.toggleOff.includes(j)));
      else if (drag.clickSel) pickQuiet(drag.clickSel);
    }
    if (
      (drag.kind === 'move' || drag.kind === 'handle' || drag.kind === 'rail') &&
      drag.changed
    )
      changed(drag.before);
    else if (drag.kind !== 'pan') renderPanel();
    drag = null;
    canvas.style.cursor = 'grab';
  };
  // dobbeltklikk på en del i en gruppe: velg bare den delen
  canvas.addEventListener('dblclick', (e) => {
    if (test) return;
    const { sx, sy } = local(e),
      w = toWorld(sx, sy),
      i = pick(w.x, w.y);
    if (i >= 0 && grpOf(i).length > 1) select(i);
  });
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
      if (picked.length && !test) duplicateMany(picked);
    } else if (mod && key === 's') {
      e.preventDefault();
      save();
    } else if (mod && key === 'g') {
      // Ctrl+G grupperer, Ctrl+Shift+G deler opp
      e.preventDefault();
      if (test) return;
      if (e.shiftKey) ungroup();
      else group();
    } else if (mod && key === 'a') {
      e.preventDefault();
      if (!test)
        setPicked(
          doc.pieces.map((p, i) => (p.type === 'look' ? -1 : i)).filter((i) => i >= 0),
        );
    } else if (
      (e.key === 'Delete' || e.key === 'Backspace') &&
      picked.length &&
      !test
    ) {
      e.preventDefault();
      removeMany(picked);
    } else if (e.key === 'Escape') {
      if (test) stopTest();
      else select(-1);
    } else if (e.key.startsWith('Arrow') && picked.length && !test) {
      e.preventDefault();
      const step = e.shiftKey ? 50 : snapOn ? GRID : 1;
      const dx =
          e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0,
        dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      if (!nudge) nudge = { before: snapshot() };
      const mx = clampMove(
        picked.map((i) => doc.pieces[i]),
        dx,
      );
      for (const i of picked) {
        const p = clone(doc.pieces[i]);
        move(p, mx, dy);
        doc.pieces[i] = P.sanePiece(p);
      }
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
        <dl class="dz-facts"><div><dt>Deler</dt><dd>${doc.pieces.filter((p) => p.type !== 'look').length}</dd></div><div><dt>Fallhøyde</dt><dd>${u.nf.format(Math.round(C.fin.y - C.start.y))}</dd></div><div><dt>Hull</dt><dd>${counts.pit || 0}</dd></div></dl>
      </section>
      ${lookSection()}
      <section class="dz-sec">
        <h3 class="dz-h">Slik bygger du</h3>
        <ul class="dz-tips">
          <li>Trykk på en del i lista for å legge den midt i bildet.</li>
          <li>Dra delene dit du vil ha dem. Dra i de runde håndtakene for å endre størrelse og helning.</li>
          <li>Dra i bakgrunnen for å flytte deg rundt. Rull eller knip for å zoome.</li>
          <li><kbd>Delete</kbd> sletter, <kbd>Ctrl</kbd>+<kbd>Z</kbd> angrer, <kbd>Ctrl</kbd>+<kbd>D</kbd> dupliserer, piltastene flytter litt.</li>
          <li>Hold <kbd>Alt</kbd> mens du drar en del, så drar du ut en kopi.</li>
          <li>Hold <kbd>Shift</kbd> mens du drar, så blir det rett: ramper og vegger legger seg vannrett, loddrett eller 45°, deler flyttes rett bortover eller rett ned, og rakettsiktet går i hopp på 15°.</li>
          <li><kbd>Ctrl</kbd>+klikk (eller <kbd>Shift</kbd>+klikk) velger flere deler. <kbd>Shift</kbd>+dra i bakgrunnen velger alt inni rammen, og <kbd>Ctrl</kbd>+<kbd>A</kbd> velger alt.</li>
          <li><kbd>Ctrl</kbd>+<kbd>G</kbd> grupperer det du har valgt, så holder delene sammen. Dobbeltklikk på en del i en gruppe for å endre bare den.</li>
          <li>Gi deler egen farge i panelet, og pynt løypa med 🌲 Pynt og 🟦 Bakgrunn. Himmel, vær og by velger du under Utseende. Pynt trenger aldri ny godkjenning.</li>
          <li>Ramper, vegger, TUT-bumpere, skilt og pynt kan kjøre på skinne. Velg «På skinne», dra i det gule håndtaket og lag et program – eller ta en 🛗 Heis fra lista. En gruppe kjører sammen, «Hopp» teleporterer i stedet for å kjøre, og 🎲 gir tilfeldig tid.</li>
          <li>Testkjør ofte. Når du er fornøyd: godkjenn løypa, så kan den brukes i trekningen.</li>
        </ul>
      </section>
      ${saved ? '<section class="dz-sec dz-sec-end"><button class="link-btn danger" type="button" data-a="delete">Slett løypa…</button></section>' : ''}`;
  }
  // fargeprøver + fri fargevelger. «Standard» tar bort den egne fargen
  function swatches(attr, cur, std) {
    return `<div class="dz-swatches">${std ? `<button type="button" ${attr} data-v="" class="dz-sw-std${cur ? '' : ' on'}" title="Standardfarge">Standard</button>` : ''}${SWATCH.map(
      (c) =>
        `<button type="button" ${attr} data-v="${c}" class="${cur === c ? 'on' : ''}" style="--c:${c}" title="${c}" aria-label="Farge ${c}"></button>`,
    ).join('')}</div>`;
  }
  /* Utseendet på hele løypa: himmel, vær, nordlys, fjell, byen ved målet og løypefargen */
  const lookPiece = () => doc.pieces.find((p) => p.type === 'look') || { type: 'look' };
  function lookSection() {
    const L = lookPiece();
    const seg = (k, opts, cur) =>
      `<div class="dz-seg">${opts.map(([v, l]) => `<button type="button" data-look="${k}" data-v="${v}" class="${cur === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    return `<section class="dz-sec">
        <h3 class="dz-h">Utseende</h3>
        <p class="dz-note">Bare pynt – kulene merker det ikke, så en godkjent løype forblir godkjent. Legg til 🌲 Pynt og 🟦 Bakgrunn fra delelista.</p>
        <div class="dz-field"><span>Himmel</span><div class="dz-presets">${SKY_NAME.map(([k, l]) => `<button type="button" data-look="sky" data-v="${k}" class="${(L.sky || 'natt') === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        <div class="dz-field"><span>Vær</span>${seg('wx', [['', 'Klart'], ['sno', '❄️ Snø'], ['regn', '🌧️ Regn']], L.wx || '')}</div>
        <div class="dz-field"><span>Nordlys</span>${seg('aur', [['1', 'Med'], ['0', 'Uten']], L.aur === 0 ? '0' : '1')}</div>
        <div class="dz-field"><span>Fjellet</span>${seg('mtn', [['1', 'Med'], ['0', 'Uten']], L.mtn === 0 ? '0' : '1')}</div>
        <div class="dz-field"><span>Byen ved målet</span>${seg('city', [['1', 'Med'], ['0', 'Uten']], L.city === 0 ? '0' : '1')}</div>
        ${L.city === 0 ? '' : `<label class="dz-field"><span>Navn på byen</span><input class="field-input" type="text" data-lf="town" maxlength="14" value="${esc(L.town || 'BODØ')}" spellcheck="false"></label>`}
        <div class="dz-field"><span>Farge på løypa</span>${swatches('data-look="track"', L.track || '', true)}<label class="dz-ownc">Egen farge <input type="color" data-lf="track" value="${L.track || '#e9dfc9'}"></label></div>
      </section>`;
  }
  // endre utseendet (lages når du endrer noe, og tas bort igjen når alt er standard)
  function setLook(fn, live) {
    const before = live ? null : snapshot(),
      i = doc.pieces.findIndex((p) => p.type === 'look'),
      L = clone(lookPiece());
    fn(L);
    const clean = P.sanePiece(L),
      plain = Object.keys(clean).length === 1;
    if (i >= 0) {
      if (plain) doc.pieces.splice(i, 1);
      else doc.pieces[i] = clean;
    } else if (!plain) doc.pieces.push(clean);
    if (live) {
      rebuild();
      dirtyCheck();
      saveDraft();
      renderBar();
    } else if (snapshot() !== before) changed(before);
    else renderPanel();
  }
  function field(p, f) {
    if (f.color) {
      const std = P.COLORS[p.type]; // deler med standardfarge kan gå tilbake til den
      return `<div class="dz-field"><span>${esc(f.label)}</span>${swatches(`data-col="${f.k}"`, p[f.k] || '', !!std)}<label class="dz-ownc">Egen farge <input type="color" data-f="${f.k}" value="${p[f.k] || std || '#2a6f8f'}"></label></div>`;
    }
    if (f.deco)
      return `<div class="dz-field"><span>${esc(f.label)}</span><div class="dz-emojis">${DECOS.map(
        (e) => `<button type="button" data-ico="${e}" class="${p.ico === e ? 'on' : ''}" title="${e}">${e}</button>`,
      ).join('')}</div><input class="field-input dz-ico-in" type="text" data-f="ico" maxlength="16" value="${esc(p.ico)}" aria-label="Egen figur: lim inn en emoji eller skriv noen tegn" placeholder="…eller lim inn en emoji"></div>`;
    if (f.text)
      return `<label class="dz-field"><span>${esc(f.label)}</span><input class="field-input" type="text" data-f="${f.k}" maxlength="${f.text}" value="${esc(p[f.k])}" spellcheck="false"></label>`;
    if (f.dir)
      return `<div class="dz-field"><span>${esc(f.label)}</span><div class="dz-seg"><button type="button" data-dir="-1" class="${p.dir < 0 ? 'on' : ''}">← Venstre</button><button type="button" data-dir="1" class="${p.dir > 0 ? 'on' : ''}">Høyre →</button></div></div>`;
    if (f.opts)
      return `<div class="dz-field"><span>${esc(f.label)}</span><div class="dz-seg">${f.opts
        .map(
          ([v, lab]) =>
            `<button type="button" data-opt="${f.k}" data-v="${v}" class="${(p[f.k] != null ? p[f.k] : f.def || 0) === v ? 'on' : ''}">${esc(lab)}</button>`,
        )
        .join('')}</div></div>`;
    const val = p[f.k] != null ? p[f.k] : f.def || 0; // felt som ikke lagres når de er 0 (vridd pynt)
    return `<label class="dz-field"><span>${esc(f.label)} <output>${u.nf.format(val)}</output></span><input type="range" data-f="${f.k}" min="${f.min}" max="${f.max}" step="${f.step}" value="${val}"></label>`;
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
    if (p.type === 'wheel' || p.type === 'arm') {
      const takt = p.sync
        ? ` · i takt, starter på ${r(p.ang)}°`
        : ' · tilfeldig start';
      return `x ${r(p.x)} · y ${r(p.y)}${takt}${Math.abs(p.speed) > P.W_FAST ? `<br><span class="warn">🚀 Rakettfart! ${p.type === 'arm' ? 'Armen slår' : 'Hjulet skyter'} kulene til værs. Pass på at de lander et sted.</span>` : ''}`;
    }
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
    if (p.type === 'deco')
      return `Størrelse ${r(p.size)}${p.ang ? ` · vridd ${p.ang}°` : ''} · ${p.front ? 'foran' : 'bak'} løypa<br>Bare pynt – kulene merker den ikke.`;
    if (p.type === 'shape')
      return `${r(p.x1 - p.x0)} × ${r(p.y1 - p.y0)} · synlighet ${p.alpha} %<br>Bare pynt – kulene merker det ikke. Ta tak i kanten for å flytte det.`;
    if (p.type === 'boss')
      return `Ser mot ${p.dir > 0 ? 'høyre' : 'venstre'} · rekkevidde ${r(p.range)} · skyter hvert ${secs(p.cd)}<br>${p.zap ? '<span class="warn">⚡ Strålen fordamper kulene – de er ute.</span>' : `Strålen dytter kulene av gårde med kraft ${r(p.force)}${p.force >= 1600 ? ' – de flyr langt!' : p.force <= 300 ? ' – bare et lite puff.' : '.'}`} Den grønne buen viser hvor han ser.`;
    return `x ${r(p.x)} · y ${r(p.y)}`;
  }
  function piecePanel(p) {
    const K = KINDS[p.type];
    const fixed = fixedType(p),
      inGrp = grpOf(sel).length;
    return `<section class="dz-sec">
      <div class="dz-piece"><span class="dz-piece-ico">${p.rail ? '🛤️' : K.ico}</span><div><h3 class="dz-h">${esc(K.name)}${p.rail ? ' på skinne' : ''}</h3><p>${esc(K.help)}</p></div></div>
      ${(FIELDS[p.type] || [])
        .filter((f) => !f.when || f.when(p))
        .map((f) => field(p, f))
        .join('')}
      <p class="dz-pos">${posText(p)}</p>
      ${
        inGrp > 1
          ? `<div class="dz-grp"><span>🔗 Del av en gruppe med ${inGrp} deler.${p.rail ? ' Bevegelsen styres av gruppa.' : ''}</span><button type="button" data-a="selgrp">Velg hele gruppa</button></div>`
          : P.RIDERS.includes(p.type)
            ? motionSection([sel])
            : ''
      }
      <div class="dz-btns">${fixed ? '' : '<button class="btn btn-ghost btn-small" type="button" data-a="dup">Dupliser</button><button class="btn btn-ghost btn-small dz-del" type="button" data-a="del">Slett</button>'}<button class="btn btn-ghost btn-small" type="button" data-a="done">Ferdig</button></div>
    </section>`;
  }
  // flere deler valgt, eller en hel gruppe
  function multiPanel() {
    const g = pickedGroup(),
      n = picked.length;
    const chips = picked
      .map((i) => {
        const p = doc.pieces[i],
          K = KINDS[p.type];
        return `<li><button type="button" data-pick="${i}" title="Velg bare denne">${K.ico.startsWith('<svg') ? '' : K.ico + ' '}${esc(K.pal || K.name)}</button></li>`;
      })
      .join('');
    return `<section class="dz-sec">
      <div class="dz-piece"><span class="dz-piece-ico">${g ? '🔗' : '▦'}</span><div><h3 class="dz-h">${g ? `Gruppe med ${n} deler` : `${n} deler valgt`}</h3><p>${
        g
          ? 'Delene flyttes, kopieres og kjører sammen. Dobbeltklikk på en del (eller trykk på den under) for å endre bare den.'
          : 'Dra i en av dem for å flytte alle. Grupper dem, så holder de sammen – og kan kjøre sammen på skinne.'
      }</p></div></div>
      <ul class="dz-chips">${chips}</ul>
      ${
        picked.some((i) => P.COLORS[doc.pieces[i].type] || doc.pieces[i].type === 'shape')
          ? `<div class="dz-field"><span>Farge på alle</span>${swatches('data-mcol="1"', '', true)}</div>`
          : ''
      }
      ${g ? motionSection(picked) : ''}
      <div class="dz-btns">${
        g
          ? '<button class="btn btn-ghost btn-small" type="button" data-a="ungroup">Del opp gruppa</button>'
          : '<button class="btn btn-aurora btn-small" type="button" data-a="group">🔗 Grupper</button>'
      }<button class="btn btn-ghost btn-small" type="button" data-a="dup">Dupliser</button><button class="btn btn-ghost btn-small dz-del" type="button" data-a="del">Slett</button><button class="btn btn-ghost btn-small" type="button" data-a="done">Ferdig</button></div>
    </section>`;
  }
  /* Bevegelse: står stille eller kjører på skinne, med et program som går i ring */
  // tid eller tidsrom («1–3 s» når tiden er tilfeldig)
  const stepTime = (st) =>
    st.t2 != null
      ? `${u.nf.format(Math.round(st.t * 10) / 10)}–${secs(st.t2)}`
      : secs(st.t);
  function stepHead(st, k, n) {
    const go = st.to != null,
      jump = go && st.e === 'jump',
      rnd = st.t2 != null;
    return `<b>${k + 1}</b><span class="dz-step-t">${
      jump
        ? `Hopp til <output>${st.to} %</output> ✨`
        : `${go ? `Kjør til <output>${st.to} %</output> på` : 'Vent'} <output>${stepTime(st)}</output>`
    }</span>
        ${jump ? '' : `<button class="dz-step-x${rnd ? ' on' : ''}" type="button" data-step-rnd="${k}" title="Tilfeldig tid" aria-label="Tilfeldig tid på steg ${k + 1}" aria-pressed="${rnd}">🎲</button>`}<button class="dz-step-x" type="button" data-step-up="${k}" title="Flytt opp" aria-label="Flytt steg ${k + 1} opp"${k ? '' : ' disabled'}>↑</button><button class="dz-step-x" type="button" data-step-del="${k}" title="Fjern" aria-label="Fjern steg ${k + 1}"${n > 1 ? '' : ' disabled'}>✕</button>`;
  }
  function stepHtml(st, k, key, n) {
    const go = st.to != null,
      jump = go && st.e === 'jump', // hopp tar ingen tid
      rnd = st.t2 != null,
      slow = go && !jump && key && key.t1 - key.t0 > st.t + 0.01;
    const time = (sk, label, v) =>
      `<label class="dz-step-r">${label}<input type="range" data-rs="${k}" data-sk="${sk}" min="0.1" max="10" step="0.05" value="${v}" aria-label="${label === 'Tid' ? 'Sekunder' : label === 'Min' ? 'Korteste tid i sekunder' : 'Lengste tid i sekunder'}"></label>`;
    return `<li class="dz-step">
      <div class="dz-step-h">${stepHead(st, k, n)}</div>
      ${go ? `<label class="dz-step-r">Til<input type="range" data-rs="${k}" data-sk="to" min="0" max="100" step="5" value="${st.to}" aria-label="Hvor langt på skinnen (prosent)"></label>` : ''}
      ${jump ? '' : rnd ? time('t', 'Min', st.t) + time('t2', 'Maks', st.t2) : time('t', 'Tid', st.t)}
      ${go ? `<div class="dz-seg">${EASE_NAME.map(([v, l]) => `<button type="button" data-step-e="${k}" data-v="${v}" class="${st.e === v ? 'on' : ''}">${l}</button>`).join('')}</div>` : ''}
      ${slow ? `<span class="warn">For fort for skinnen – tar ${secs(key.t1 - key.t0)}.</span>` : ''}
    </li>`;
  }
  function railSum(rail) {
    const plan = P.railPlan(rail),
      top = Math.max(0, ...plan.keys.map((k) => k.peak)),
      dir =
        Math.abs(rail.dy) > Math.abs(rail.dx) * 2
          ? rail.dy < 0
            ? 'opp'
            : 'ned'
          : Math.abs(rail.dx) > Math.abs(rail.dy) * 2
            ? rail.dx > 0
              ? 'mot høyre'
              : 'mot venstre'
            : 'på skrå';
    const lap = plan.rand
      ? `${u.nf.format(Math.round(plan.period * 10) / 10)}–${secs(plan.periodMax)} (tilfeldig hver runde)`
      : secs(plan.period);
    return `Skinnen er ${Math.round(plan.L)} lang og går ${dir}. En runde tar ${lap}, toppfart ${Math.round(top)}.${
      top > 1100
        ? '<br><span class="warn">🚀 Så fort at kulene kan kastes til værs når den stopper.</span>'
        : ''
    }`;
  }
  function motionSection(idxs) {
    const rail = unitRail(idxs),
      can = riders(idxs).length;
    if (!can)
      return '<div class="dz-motion"><p class="dz-note">Bare ramper, vegger, TUT-bumpere, skilt og pynt kan kjøre på skinne. Grupper dem med noe av det, så kan resten være med.</p></div>';
    const off = rail && rail.sync ? rail.off || 0 : 0;
    let h = `<div class="dz-motion">
      <div class="dz-field"><span>Bevegelse</span><div class="dz-seg"><button type="button" data-rail="0" class="${rail ? '' : 'on'}">Står stille</button><button type="button" data-rail="1" class="${rail ? 'on' : ''}">🛤️ På skinne</button></div></div>`;
    if (!rail)
      return `${h}<p class="dz-note">Sett den på skinne, så kjører den fram og tilbake etter et program du lager selv: heis, stempel, utskyter …</p></div>`;
    const plan = P.railPlan(rail);
    h += `<p class="dz-note">Dra i det gule håndtaket for å legge skinnen dit den skal kjøre. 0 % er der den står nå, 100 % er enden av skinnen. «Hopp» teleporterer den dit med en gang i stedet for å kjøre, og 🎲 gir steget tilfeldig tid hver runde.</p>
      <div class="dz-field"><span>Ferdige program</span><div class="dz-presets">${Object.keys(PRESET)
        .map((k) => `<button type="button" data-preset="${k}">${PRESET[k].label}</button>`)
        .join('')}</div></div>
      <div class="dz-field"><span>Programmet (går i ring)</span></div>
      <ol class="dz-prog">${rail.prog.map((st, k) => stepHtml(st, k, plan.keys[k], rail.prog.length)).join('')}</ol>
      ${
        rail.prog.length < P.STEPS_MAX
          ? '<div class="dz-btns dz-add"><button class="btn btn-ghost btn-small" type="button" data-step-add="go">＋ Kjør</button><button class="btn btn-ghost btn-small" type="button" data-step-add="wait">＋ Vent</button></div>'
          : ''
      }
      <div class="dz-field"><span>Takt</span><div class="dz-seg"><button type="button" data-rsync="0" class="${rail.sync ? '' : 'on'}">Tilfeldig start</button><button type="button" data-rsync="1" class="${rail.sync ? 'on' : ''}">Starter med løpet</button></div></div>
      ${rail.sync ? `<label class="dz-field"><span>Venter etter at porten åpner <output data-o="off">${secs(off)}</output></span><input type="range" data-roff="1" min="0" max="20" step="0.1" value="${off}"></label>` : ''}
      <p class="dz-pos dz-rsum">${railSum(rail)}</p>
      ${idxs.length > can ? '<p class="dz-note">Hjul, vipper og de andre delene i gruppa står stille. Bare ramper, vegger, TUT-bumpere, skilt og pynt kjører på skinne.</p>' : ''}
    </div>`;
    return h;
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
      panel.innerHTML = p
        ? piecePanel(p)
        : picked.length > 1
          ? multiPanel()
          : coursePanel();
    }
  }
  let fieldBefore = null;
  // endre programmet på skinnen (alle delene som kjører sammen får det samme)
  function editRail(fn, live) {
    const idxs = railUnit();
    if (!idxs || test) return;
    const before = live ? null : snapshot(),
      r = curRail(idxs);
    if (fn(r) === false) return;
    setRail(idxs, r);
    if (live) return;
    if (snapshot() !== before) changed(before);
    else renderPanel();
  }
  panel.addEventListener('input', (e) => {
    const lf = e.target.closest('[data-lf]');
    if (lf) {
      // navnet på byen og løypefargen: oppdater mens du skriver/velger
      if (test) return;
      if (!fieldBefore) fieldBefore = snapshot();
      const k = lf.dataset.lf,
        v = lf.value;
      setLook((L) => {
        L[k] = v;
      }, true);
      return;
    }
    const rs = e.target.closest('[data-rs], [data-roff]');
    if (rs) {
      // skyvere i programmet: oppdater mens du drar, lagre i angre-lista når du slipper
      if (!railUnit() || test) return;
      if (!fieldBefore) fieldBefore = snapshot();
      const k = +rs.dataset.rs,
        sk = rs.dataset.sk,
        v = +rs.value;
      editRail((r) => {
        if (rs.dataset.roff) r.off = v;
        else if (r.prog[k]) r.prog[k][sk] = v;
      }, true);
      const sum = panel.querySelector('.dz-rsum'),
        r = unitRail(railUnit());
      if (rs.dataset.roff) {
        const o = panel.querySelector('[data-o="off"]');
        if (o) o.textContent = secs(v);
      } else if (r && r.prog[k]) {
        // overskriften på steget («Kjør til 100 % på 1–3 s»)
        const h = rs.closest('.dz-step').querySelector('.dz-step-h');
        if (h) h.innerHTML = stepHead(r.prog[k], k, r.prog.length);
      }
      if (sum && r) sum.innerHTML = railSum(r);
      rebuild();
      dirtyCheck();
      saveDraft();
      renderBar();
      return;
    }
    const f = e.target.closest('[data-f]');
    if (!f || sel < 0 || test) return;
    if (!fieldBefore) fieldBefore = snapshot();
    const p = clone(doc.pieces[sel]);
    const k = f.dataset.f;
    p[k] = f.type === 'range' ? +f.value : f.value;
    if (p.type === 'pit' && k === 'name') delete p.cause; // omdøpt hull får sitt eget navn i loggen
    doc.pieces[sel] = P.sanePiece(p);
    const out = f.closest('.dz-field').querySelector('output');
    if (out) out.textContent = u.nf.format(doc.pieces[sel][k] || 0);
    const posEl = panel.querySelector('.dz-pos');
    if (posEl) posEl.innerHTML = posText(doc.pieces[sel]);
    rebuild();
    dirtyCheck();
    saveDraft();
    renderBar();
  });
  panel.addEventListener('change', (e) => {
    if (!e.target.closest('[data-f], [data-rs], [data-roff], [data-lf]') || !fieldBefore)
      return;
    const b = fieldBefore;
    fieldBefore = null;
    changed(b);
  });
  panel.addEventListener('click', (e) => {
    const on = (q) => e.target.closest(q);
    let el;
    if ((el = on('[data-pick]'))) {
      select(+el.dataset.pick);
      return;
    }
    if ((el = on('[data-look]'))) {
      const k = el.dataset.look,
        v = el.dataset.v;
      setLook((L) => {
        L[k] = v;
      });
      return;
    }
    // farge og figur på den valgte delen («Standard» tar bort den egne fargen)
    const setOne = (fn) => {
      if (sel < 0 || test) return;
      const before = snapshot(),
        p = clone(doc.pieces[sel]);
      fn(p);
      doc.pieces[sel] = P.sanePiece(p);
      if (snapshot() !== before) changed(before);
    };
    if ((el = on('[data-col]'))) {
      const k = el.dataset.col,
        v = el.dataset.v;
      setOne((p) => {
        if (v) p[k] = v;
        else delete p[k];
      });
      return;
    }
    if ((el = on('[data-ico]'))) {
      const v = el.dataset.ico;
      setOne((p) => {
        p.ico = v;
      });
      return;
    }
    if ((el = on('[data-mcol]'))) {
      // samme farge på alt som er valgt
      const before = snapshot(),
        v = el.dataset.v;
      for (const i of picked) {
        const p = doc.pieces[i];
        if (!P.COLORS[p.type] && p.type !== 'shape') continue;
        const c = clone(p);
        if (v) c.col = v;
        else if (c.type !== 'shape') delete c.col;
        doc.pieces[i] = P.sanePiece(c);
      }
      if (snapshot() !== before) changed(before);
      return;
    }
    if ((el = on('[data-rail]'))) {
      const idxs = railUnit();
      if (!idxs) return;
      const before = snapshot();
      setRail(idxs, +el.dataset.rail ? curRail(idxs) : null);
      if (snapshot() !== before) changed(before);
      return;
    }
    if ((el = on('[data-preset]'))) {
      const pr = PRESET[el.dataset.preset];
      editRail((r) => {
        r.prog = clone(pr.prog);
      });
      return;
    }
    if ((el = on('[data-step-e]'))) {
      const k = +el.dataset.stepE;
      editRail((r) => {
        if (r.prog[k]) r.prog[k].e = el.dataset.v;
      });
      return;
    }
    if ((el = on('[data-step-del]'))) {
      const k = +el.dataset.stepDel;
      editRail((r) => (r.prog.length > 1 ? void r.prog.splice(k, 1) : false));
      return;
    }
    if ((el = on('[data-step-rnd]'))) {
      // 🎲 tilfeldig tid: fra tiden steget har nå til dobbelt så lang (minst et halvt sekund mer)
      const k = +el.dataset.stepRnd;
      editRail((r) => {
        const st = r.prog[k];
        if (!st || st.e === 'jump') return false;
        if (st.t2 != null) delete st.t2;
        else st.t2 = Math.min(10, Math.max(st.t + 0.5, st.t * 2));
      });
      return;
    }
    if ((el = on('[data-step-up]'))) {
      const k = +el.dataset.stepUp;
      editRail((r) => {
        if (k < 1) return false;
        [r.prog[k - 1], r.prog[k]] = [r.prog[k], r.prog[k - 1]];
      });
      return;
    }
    if ((el = on('[data-step-add]'))) {
      const go = el.dataset.stepAdd === 'go';
      editRail((r) => {
        if (r.prog.length >= P.STEPS_MAX) return false;
        // et nytt kjør-steg går til den andre enden av der den står
        let last = 0;
        for (const st of r.prog) if (st.to != null) last = st.to;
        r.prog.push(go ? { to: last >= 50 ? 0 : 100, t: 1.5, e: 'smooth' } : { t: 1 });
      });
      return;
    }
    if ((el = on('[data-rsync]'))) {
      editRail((r) => {
        if (+el.dataset.rsync) {
          r.sync = 1;
          r.off = r.off || 0;
        } else {
          delete r.sync;
          delete r.off;
        }
      });
      return;
    }
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
    else if (a === 'dup') duplicateMany(picked);
    else if (a === 'del') removeMany(picked);
    else if (a === 'group') group();
    else if (a === 'ungroup') ungroup();
    else if (a === 'selgrp') setPicked(grpOf(sel));
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
      <optgroup label="Lag ny"><option value="new:simple">＋ Ny enkel løype</option><option value="new:copy">＋ Kopi av Keiservarden</option><option value="new:demo">＋ Demo med alle delene</option><option value="new:rail">＋ Demo: heis og utskyter</option></optgroup>`;
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
    picked = [];
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
    if (v.startsWith('new:')) {
      const kind = v.slice(4);
      load(fromTemplate(kind), null);
      u.toast(
        kind === 'copy'
          ? 'Kopi av originalen – gjør den til din egen!'
          : kind === 'demo'
            ? 'Demo med Saltstraumen, ferga, raketten og resten. Trykk Testkjør!'
            : kind === 'rail'
              ? 'Heisen og utskyteren kjører på skinner. Trykk på dem for å se programmet – og trykk Testkjør!'
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
    picked = [];
    sel = -1;
    const n = parseInt($('#dzN').value, 10) || 24;
    const msg = $('#dzMsg');
    msg.textContent = 'Kulene stilles opp i porten…';
    msg.hidden = false;
    setTimeout(() => {
      const res = P.simulate(n, u.randInt(0x7fffffff), doc);
      P.checkpoints(res); // usynlige sjekkpunkter: hvem leder, også der løypa går oppover
      msg.hidden = true;
      test = {
        res,
        n,
        t: 0,
        speed: 1,
        follow: true,
        lead: -1,
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
        html: `<b>Kule ${e.i + 1}</b> ${e.type === 'rocket' ? 'ble skutt opp fra Andøya' : e.lift ? 'ble kastet til værs av heisen' : e.arm ? 'ble slått til værs av Glimt-armen' : 'ble skutt til værs'}`,
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
    findLeader(T);
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
  /* Leder: kula med minst tid igjen til mål etter de usynlige sjekkpunktene – ikke den
     som ligger lavest, for løypa kan gå oppover (bånd, rakett, Glimt-hjul …) */
  function findLeader(T) {
    let best = -1,
      bl = Infinity;
    for (let i = 0; i < T.n; i++) {
      if (T.state[i]) continue;
      const l = P.leftAt(T.res, i, T.t);
      if (l < bl) {
        bl = l;
        best = i;
      }
    }
    // litt treghet, så den ikke hopper fram og tilbake mellom to kuler side om side
    const cur = T.lead;
    if (
      best >= 0 &&
      cur >= 0 &&
      best !== cur &&
      !T.state[cur] &&
      bl > P.leftAt(T.res, cur, T.t) - 0.12
    )
      best = cur;
    T.lead = best;
  }
  function followCam(dt) {
    const T = test,
      res = T.res;
    let tx = res.C.start.x,
      ty = res.C.start.y - 100;
    if (T.t >= P.GATE_T - 0.3) {
      // lederen, eller den som har kommet lengst av dem som ikke er inne i en tunnel
      let best = T.lead;
      if (best >= 0 && pos(res, best, T.t)[1] < -50000) {
        best = -1;
        let bl = Infinity;
        for (let i = 0; i < T.n; i++) {
          if (T.state[i] || pos(res, i, T.t)[1] < -50000) continue;
          const l = P.leftAt(res, i, T.t);
          if (l < bl) {
            bl = l;
            best = i;
          }
        }
      }
      if (best >= 0) {
        const p = pos(res, best, T.t);
        tx = p[0];
        ty = p[1];
      } else if (T.lead >= 0) {
        tx = cam.x; // alle som er igjen, er inne i tunnelen
        ty = cam.y;
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
    get picked() {
      return picked.slice();
    },
    get C() {
      return C;
    },
    cam,
    tick,
    load,
    add,
    select,
    setPicked,
    group,
    ungroup,
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
