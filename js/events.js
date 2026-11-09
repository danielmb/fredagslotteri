/* Fredagslotteriet – farer underveis, ruten og selve trekningen */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u;

  /* Ruta følger Hurtigrutas nordgående vei: Sandnessjøen → Nesna → (Polarsirkelen) → Ørnes → Bodø */
  const ROUTE = [
    { id: 'ssj', name: 'Sandnessjøen', type: 'start', at: 0 },
    { id: 'nesna', name: 'Nesna', type: 'port', at: 0.25 },
    { id: 'polar', name: 'Polarsirkelen', type: 'marker', at: 0.47 },
    { id: 'ornes', name: 'Ørnes', type: 'port', at: 0.69 },
    { id: 'bodo', name: 'Bodø', type: 'end', at: 1 },
  ];
  const AT = Object.fromEntries(ROUTE.map((r) => [r.id, r.at]));
  const PORT_NAME = { nesna: 'Nesna', ornes: 'Ørnes' };
  const PLACE_LABEL = { sea: 'Til sjøs', nesna: 'Kaia i Nesna', ornes: 'Kaia i Ørnes', polar: 'Polarsirkelen', final: 'Innseilingen til Bodø' };

  /* t = standardtekster, p = tekster ved kai ({p} = stedsnavn), g = flere ofre samtidig */
  const EVENTS = {
    orna: {
      title: 'Ørna!', name: 'Ørna tar personen', icon: '🦅', folk: true, anim: 'eagle', color: 'rgba(201,140,70,.28)', ec: '#f1d9b6',
      desc: 'Havørna i Saltstraumen er sulten og har null respekt for lotterier.',
      t: ['{n} sto på soldekket med en vaffel. Ørna ville ha vaffelen. Ørna tok alt.',
        'En havørn fra Saltstraumen så sitt snitt. {n} ble sist sett på vei mot Landegode.',
        '{n} vinket til en havørn. Havørna tolket det som en invitasjon.'],
    },
    tut: {
      title: 'Hurtigruta tutet', name: 'Hurtigruta tutet', icon: '📯', folk: true, anim: 'horn', color: 'rgba(238,74,47,.25)', ec: '#f6c9bd',
      desc: 'Hurtigruta hilser alltid. Ikke alle hjerter tåler det.',
      t: ['Hurtigruta tutet idet den passerte. {n} skvatt så mye at hjertet tok helg.',
        'TUUUUUT! {n} hoppet to meter rett opp og landet i det hinsidige.',
        '{n} sto rett ved rekka da Hurtigruta hilste. Kardiologen kaller det «helt forventet».'],
    },
    noro: {
      title: 'Norovirus!', name: 'Norovirus', icon: '🦠', folk: true, anim: 'virus', group: 4, color: 'rgba(111,191,115,.28)', ec: '#d6efc4',
      desc: 'Rekesmørbrødet i kiosken hadde en fortid.',
      t: ['{n} spiste rekesmørbrødet fra kiosken. Tilbringer resten av turen på do.',
        '{n} fikk norovirus av gelenderet. Er nå i karantene på akterdekk.'],
      g: ['Norovirus-utbrudd i salongen! {n} kom seg aldri ut av toalettet.',
        'Rekesmørbrødet i kiosken var fra 2019. {n} er satt i karantene.'],
    },
    kokken: {
      title: 'Kjærlighet i byssa', name: 'Hemmelig forhold med kokken', icon: '👨‍🍳', folk: true, anim: 'chef', color: 'rgba(223,79,134,.25)', ec: '#f5cddd',
      desc: 'Det som skjer i byssa, blir i byssa. Inkludert passasjeren.',
      t: ['{n} innledet et hemmelig forhold med kokken og rakk ikke å gå i land. Lever nå lykkelig i byssa.',
        '{n} og kokken fant tonen over en fiskesuppe. Ingen har sett dem siden.',
        '{n} ble så forelsket i kokken at hen glemte både lodd, båt og fredag.'],
    },
    trappa: {
      title: 'Datt ned trappa', name: 'Datt ned trappa', icon: '🪜', folk: true, anim: 'stairs', color: 'rgba(185,128,42,.25)', ec: '#ecd9b5',
      desc: 'Det står «Hold i rekkverket» på tre språk.',
      t: ['{n} tok trappa ned til salongen i én bevegelse. Ikke med vilje.',
        '{n} snublet i trappa, rullet gjennom kiosken og ut akterdøra.',
        'Det står «Hold i rekkverket» på tre språk. {n} leste ingen av dem.'],
    },
    overbord: {
      title: 'Mann over bord!', name: 'Datt ut av båten', icon: '💦', folk: true, anim: 'overboard', color: 'rgba(79,125,255,.25)', ec: '#cdd9f7',
      desc: 'Rekka er der av en grunn.',
      t: ['{n} lente seg ut for å ta bilde av nordlyset. Bildet ble bra. {n} ble borte.',
        '{n} skulle «bare sjekke noe» på akterdekk. PLASK.',
        'En bølge, en glatt dørk og {n}. I den rekkefølgen.'],
    },
    drukning: {
      title: 'Blubb blubb', name: 'Drukning', icon: '🌊', folk: true, anim: 'drown', color: 'rgba(21,151,189,.28)', ec: '#c4e6ef',
      desc: 'Havet ved Polarsirkelen holder seks grader. Hele året.',
      t: ['{n} ville sjekke hvor kaldt vannet var. Svar: 6 grader. Blubb.',
        '{n} prøvde å svømme det siste stykket for å spare tid. Det sparte ikke tid.',
        '{n} trodde redningsvesten var pynt. Blubb blubb.'],
    },
    full: {
      title: 'Full', name: 'Full', icon: '🥴', folk: true, anim: 'drunk', group: 3, color: 'rgba(148,102,255,.25)', ec: '#ddd2f7',
      desc: 'Vinen er urelatert. Det er ikke rusen.',
      t: ['{n} feiret seieren litt for tidlig og danset over rekka.',
        '{n} spurte etter vin i kiosken, fikk vite at vinen er urelatert, og drakk alt annet. Gikk over bord i protest.'],
      p: ['{n} sang Halvdan Sivertsen så høyt på soldekket at mannskapet satte hen i land i {p}.',
        '{n} spurte etter vin i kiosken, fikk vite at vinen er urelatert, og drakk alt annet. Satt i land i {p}.',
        '{n} skulle ta «en liten en» mot sjøsyken. Så en til. Ble båret i land i {p}.'],
      g: ['{n} startet nachspiel i salongen klokka ti på formiddagen. Alle ble satt i land i {p}.'],
    },
    ornes: {
      title: 'Feil stopp', name: 'Gikk av på feil plass (Ørnes)', icon: '📍', folk: true, anim: 'ashore', group: 3, color: 'rgba(246,189,71,.25)', ec: '#f5e2b0',
      desc: 'Ørnes er et fint sted. Men det er ikke Bodø.',
      t: ['{n} hørte «neste stopp: …nes» og gikk av. Det var Ørnes. Ørnes er fint. Ørnes er ikke Bodø.',
        '{n} gikk i land i Ørnes for å strekke på beina. Båten ventet ikke.',
        '{n} så skiltet «Ørnes» og tenkte «nesten Bodø». Det var det ikke.'],
      g: ['{n} gikk av i Ørnes sammen. De har startet et nytt liv der.'],
    },
    svolvaer: {
      title: 'Våknet i Svolvær', name: 'Sov på Hurtigruta', icon: '😴', folk: true, anim: 'sleep', color: 'rgba(108,124,242,.25)', ec: '#d4d8f7',
      desc: 'Hurtigruta stopper ikke i Bodø for alltid. Neste stopp: Svolvær.',
      t: ['{n} gikk om bord på Hurtigruta for å låne doen, sovnet i en lugar og våknet i Svolvær.',
        '{n} tok seg en blund på feil båt. Våknet i Svolvær med en tørrfisk i fanget.',
        '{n} byttet til Hurtigruta for å få bedre kaffe. Sovnet. Er nå i Lofoten.'],
    },
    feilrute: {
      title: 'Feil rute', name: 'Tok feil rute', icon: '🔀', folk: true, anim: 'wrongboat', group: 3, color: 'rgba(32,169,142,.25)', ec: '#c6eadf',
      desc: 'Det går mange båter i Nordland. Bare én av dem til Bodø.',
      t: ['En annen hurtigbåt kom forbi, og {n} hoppet over for å «ta en snarvei». Neste stopp: Træna.',
        '{n} fulgte Google Maps. Google Maps sa Moskenes.'],
      p: ['{n} gikk på feil båt i {p} og er nå på vei til Træna. Det blir en lang helg.',
        '{n} fulgte Google Maps fra {p}. Google Maps sa Moskenes.',
        '{n} tok bussen fra {p} i stedet. Den står fortsatt i kø ved Saltstraumen bru.'],
      g: ['{n} fulgte etter hverandre om bord på feil båt i {p}. Neste stopp: Træna.'],
    },
    sjosyk: {
      title: 'Sjøsyk', name: 'Sjøsyk', icon: '🤢', folk: true, anim: 'seasick', color: 'rgba(79,174,62,.25)', ec: '#d3ecc2',
      desc: 'Bølgehøyde: 1,2 meter. Moral: 0.',
      t: ['{n} ble grønn i ansiktet ved første bølge og har ikke sett opp siden.',
        'Bølgehøyde: 1,2 meter. {n}: «Aldri. Mer. Båt.»'],
      p: ['{n} ble så sjøsyk at hen gikk i land i {p} og nektet å gå om bord igjen.',
        '{n} kysset kaia i {p}. Bokstavelig talt. Blir der.'],
    },
    maake: {
      title: 'Måka!', name: 'Måka stjal loddet', icon: '🐦', folk: false, anim: 'gull', color: 'rgba(200,215,230,.18)', ec: '#e3e9ef',
      desc: 'Uten lodd, ingen premie. Det står i reglene (nå).',
      t: ['En måke nappet loddet ut av hånda til {n}. Uten lodd, ingen premie.',
        '{n} delte reka si med en måke. Måka ville ha resten også. Og loddet.'],
    },
    nordlys: {
      title: 'Nordlyset', name: 'Nordlyset', icon: '🌌', folk: false, anim: 'aurora', color: 'rgba(94,242,181,.22)', ec: '#c8f5e2',
      desc: 'Det danser. Du danser. Rekka danser ikke.',
      t: ['{n} ble så trollbundet av nordlyset at hen svevde rett av gårde.',
        '{n} prøvde å ta bilde av nordlyset med blits. Nordlyset tok igjen.'],
    },
    vind: {
      title: 'Bodø-vind', name: 'Bodø-vind', icon: '🌬️', folk: false, anim: 'wind', group: 3, color: 'rgba(160,190,220,.2)', ec: '#dbe5ee',
      desc: '28 m/s fra nordvest. Helt vanlig fredag.',
      t: ['Vindkast på 28 m/s. {n} ble blåst av dekk. Helt vanlig fredag i Bodø.',
        '{n} åpnet døra til soldekket. Det var en feil.'],
      g: ['{n} åpnet døra til soldekket samtidig. Det var en feil.',
        'Vindkast på 28 m/s. {n} ble blåst av dekk. Helt vanlig fredag i Bodø.'],
    },
    spekkhogger: {
      title: 'Spekkhoggere!', name: 'Spekkhoggere', icon: '🐋', folk: false, anim: 'orca', group: 3, color: 'rgba(80,110,140,.25)', ec: '#d0dae4',
      desc: 'Alle løper til samme side. Båten krenger. Noen faller.',
      t: ['Spekkhoggere på styrbord! Alle løp til samme side, og {n} løp litt for langt.'],
      g: ['Spekkhoggere! Båten krenget, og {n} gled rett ut i havet.'],
    },
    polar: {
      title: 'Polarsirkeldåp', name: 'Polarsirkeldåp', icon: '🧊', folk: false, anim: 'polar', color: 'rgba(159,214,255,.22)', ec: '#d3ecfb',
      desc: 'Isvann nedover ryggen. Tradisjon er tradisjon.',
      t: ['Polarsirkeldåp! {n} fikk en øse isvann nedover ryggen og frøs fast til et isflak.',
        '{n} krysset polarsirkelen, fikk dåpen og kuldesjokk. Driver nå sørover på et isflak.'],
    },
    glimt: {
      title: 'Kampdag!', name: 'Glimt-kamp', icon: '💛', folk: false, anim: 'glimt', color: 'rgba(255,212,0,.22)', ec: '#fbeaa0',
      desc: 'Ingenting slår avspark på Aspmyra.',
      t: ['{n} hørte at Glimt spilte på Aspmyra og svømte i land for å rekke avspark.',
        '{n} hoppet over bord i gult skjerf. Rakk neppe avspark, men ånden var der.'],
    },
  };
  Object.keys(EVENTS).forEach((k) => { EVENTS[k].id = k; });
  const ORDER = ['orna', 'tut', 'noro', 'kokken', 'trappa', 'overbord', 'drukning', 'full', 'ornes', 'svolvaer', 'feilrute', 'sjosyk', 'maake', 'nordlys', 'vind', 'spekkhogger', 'polar', 'glimt'];

  const CORE_SEA = ['orna', 'tut', 'noro', 'kokken', 'trappa', 'overbord', 'drukning', 'full', 'svolvaer', 'sjosyk', 'feilrute'];
  const BONUS_SEA = ['maake', 'nordlys', 'vind', 'spekkhogger'];
  const GROUP_SEA = ['noro', 'vind', 'spekkhogger'];
  const SHIP_EVENTS = ['tut', 'svolvaer'];

  /* ---------- Trekning ---------- */
  function createDraw(people, settings, opts = {}) {
    const tickets = [];
    // lodd-nummer: det hver passasjer har valgt selv, ett per lodd (f.eks. 7 og 70)
    people.forEach((p) => { const nums = p.nums || []; for (let i = 0; i < p.tickets; i++) tickets.push({ no: tickets.length + 1, name: u.cleanName(p.name), k: u.normName(p.name), label: nums[i] > 0 ? String(nums[i]) : '' }); });
    tickets.forEach((t) => { if (!t.label) t.label = u.pad(t.no); });
    const order = u.shuffle(tickets.map((t) => t.no)); // kryptografisk stokking – dette ER trekningen
    const uniq = settings.uniqueWinners !== false;
    const owners = new Set(tickets.map((t) => t.k)).size;
    const W = Math.min(settings.winners, uniq ? owners : tickets.length);
    const winners = [];
    const won = new Set();
    for (const no of order) {
      if (winners.length >= W) break;
      const t = tickets[no - 1];
      if (uniq && won.has(t.k)) continue;
      winners.push(no);
      won.add(t.k);
    }
    const rest = order.filter((no) => !winners.includes(no));
    const contenders = rest.filter((no) => !won.has(tickets[no - 1].k));
    const extra = rest.filter((no) => won.has(tickets[no - 1].k));
    const elim = contenders.slice().reverse(); // sist i stokken ryker først
    // vinneres ekstra lodd ryker et tilfeldig sted, men aldri i den dramatiske slutten
    extra.forEach((no) => { const max = Math.max(0, elim.length - 3); elim.splice(u.randInt(max + 1), 0, no); });
    const seed = u.randInt(0x7fffffff);
    const beats = buildBeats(elim, u.mulberry32(seed));
    return {
      id: u.uid('d'), date: new Date().toISOString(), game: opts.game || 'hurtigbat', demo: !!opts.demo,
      price: settings.price, winnersCount: winners.length, pot: tickets.length * settings.price,
      people: people.map((p) => ({ name: u.cleanName(p.name), nums: (p.nums || []).slice(0, p.tickets), tickets: p.tickets })),
      tickets: tickets.map((t) => ({ no: t.no, name: t.name, label: t.label })),
      leftBehind: (opts.leftBehind || []).map((p) => ({ name: u.cleanName(p.name), nums: (p.nums || []).filter(Boolean) })),
      winners, elim, seed, beats,
    };
  }

  function buildBeats(elim, rnd) {
    const E = elim.length;
    if (!E) return [];
    const ri = (n) => Math.floor(rnd() * n);
    let B = E <= 14 ? E : Math.round(14 + (E - 14) * 0.4);
    B = Math.min(B, 28);
    if (E >= 8 && B === E) B = E - 1;

    // spesielle steder
    const special = [];
    if (B >= 2) special.push({ place: 'ornes', at: AT.ornes, ord: 0 });
    if (B >= 4) special.push({ place: 'nesna', at: AT.nesna, ord: 0 });
    if (B >= 6) special.push({ place: 'polar', at: AT.polar + 0.012, ord: 0 });
    if (B >= 14) special.push({ place: 'ornes', at: AT.ornes, ord: 1 });
    if (B >= 19) special.push({ place: 'nesna', at: AT.nesna, ord: 1 });
    const nSea = B - special.length;

    // fordel sjø-hendelser på etappene (største rest)
    const anchors = [0, AT.nesna, AT.polar, AT.ornes, 1];
    const m = 0.045;
    const segs = [];
    for (let i = 0; i < anchors.length - 1; i++) segs.push({ a: anchors[i] + (i === 0 ? 0.06 : m), b: anchors[i + 1] - (i === anchors.length - 2 ? 0.11 : m) });
    const total = segs.reduce((s, g) => s + (g.b - g.a), 0);
    const quota = segs.map((g) => (nSea * (g.b - g.a)) / total);
    const alloc = quota.map(Math.floor);
    let left = nSea - alloc.reduce((s, x) => s + x, 0);
    quota.map((q, i) => ({ i, r: q - Math.floor(q) })).sort((x, y) => y.r - x.r).forEach((x) => { if (left > 0) { alloc[x.i]++; left--; } });
    const slots = special.slice();
    segs.forEach((g, i) => {
      const k = alloc[i];
      for (let j = 0; j < k; j++) {
        const span = (g.b - g.a) / k;
        const at = g.a + span * (j + 0.5) + (rnd() - 0.5) * span * 0.45;
        slots.push({ place: 'sea', at, ord: 0 });
      }
    });
    slots.sort((x, y) => x.at - y.at || x.ord - y.ord);
    slots.forEach((s, i) => { s.size = 1; s.last = i >= slots.length - 3; });
    slots.forEach((s) => { if (s.place === 'sea' && s.at > 0.84) s.place = 'final'; });

    // gruppehendelser når det er flere ofre enn hendelser
    let extra = E - B;
    const groupable = slots.filter((s) => !s.last && s.place !== 'polar');
    let guard = 0;
    while (extra > 0 && groupable.length && guard++ < 5000) {
      const s = groupable[ri(groupable.length)];
      const cap = guard > 2000 ? 8 : 4;
      if (s.size < cap) { s.size++; extra--; }
    }
    if (extra > 0) slots[0].size += extra; // nødløsning, bør aldri skje

    // velg hendelse for hver plass
    let bag = [];
    // folkets egne hendelser først, deretter bonus – ingen gjentakelser før posen er tom
    const refill = () => { bag = u.shuffle(CORE_SEA, ri).concat(u.shuffle(BONUS_SEA, ri)); };
    refill();
    const fromBag = (ok) => {
      for (let tries = 0; tries < 2; tries++) {
        const idx = bag.findIndex(ok);
        if (idx >= 0) return bag.splice(idx, 1)[0];
        refill();
      }
      return 'overbord';
    };
    let prev = null;
    let victimIdx = 0;
    const beats = slots.map((s, i) => {
      let ev;
      const notPrev = (e) => e !== prev && !(SHIP_EVENTS.includes(e) && SHIP_EVENTS.includes(prev));
      if (s.place === 'polar') ev = 'polar';
      else if (s.place === 'ornes' && s.ord === 0) ev = 'ornes';
      else if (s.place === 'ornes') ev = s.size > 1 ? ['full', 'feilrute'][ri(2)] : ['svolvaer', 'full', 'feilrute'][ri(3)];
      else if (s.place === 'nesna') ev = s.size > 1 ? ['full', 'feilrute'][ri(2)] : ['feilrute', 'full', 'sjosyk'][ri(3)];
      else if (s.size > 1) { const c = GROUP_SEA.filter(notPrev); ev = c[ri(c.length)] || 'noro'; }
      else if (i === slots.length - 1) { const c = ['orna', 'orna', 'glimt', 'tut', 'overbord', 'kokken'].filter(notPrev); ev = c[ri(c.length)]; }
      else ev = fromBag((e) => notPrev(e) && (s.place === 'final' || e !== 'glimt'));
      if (s.place === 'final' && s.size === 1 && i !== slots.length - 1 && rnd() < 0.18 && notPrev('glimt')) ev = 'glimt';
      prev = ev;
      const v = elim.slice(victimIdx, victimIdx + s.size);
      victimIdx += s.size;
      return { at: +s.at.toFixed(4), place: s.place, ev, v, t: ri(6) };
    });
    return beats.filter((b) => b.v.length);
  }

  /* ---------- Tekst ---------- */
  function eventText(beat, tickets, asHtml = true) {
    const ev = EVENTS[beat.ev] || EVENTS.overbord;
    const count = {};
    tickets.forEach((t) => { const k = u.normName(t.name); count[k] = (count[k] || 0) + 1; });
    const names = beat.v.map((no) => {
      const t = tickets[no - 1];
      if (!t) return '#' + no;
      return count[u.normName(t.name)] > 1 ? `${t.name} (lodd ${t.label || u.pad(no)})` : t.name; // to lodd? vis hvilket som røk
    });
    const port = PORT_NAME[beat.place];
    let list = ev.t;
    if (names.length > 1 && ev.g) list = ev.g;
    else if (port && ev.p) list = ev.p;
    const tpl = list[beat.t % list.length];
    const who = asHtml ? u.joinNames(names.map((n) => `<b>${u.esc(n)}</b>`)) : u.joinNames(names);
    const place = port || 'nærmeste kai';
    const body = asHtml ? u.esc(tpl) : tpl;
    return body.split('{n}').join(who).split('{p}').join(asHtml ? u.esc(place) : place);
  }

  FL.Events = { EVENTS, ORDER, ROUTE, AT, PORT_NAME, PLACE_LABEL, createDraw, eventText };
})();
