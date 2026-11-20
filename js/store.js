/* Fredagslotteriet – tilstand, lagring (localStorage), passasjerregister, historikk og statistikk */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u;
  const KEY = 'fredagslotteriet:v1'; // samme nøkkel hele veien – eldre data migreres automatisk
  const VERSION = 3;
  const DEFAULTS = { price: 30, maxPerPerson: 2, winners: 3, uniqueWinners: true, sound: true, vipps: '', drawTime: '', noNums: false, schedule: 'weekly', jul: 'auto' };
  const SCHEDULES = ['weekly', 'even', 'odd', 'last']; // hver fredag, partallsuker, oddetallsuker, siste fredag i måneden
  const JUL = ['auto', 'on', 'off']; // juletema i Hurtigbåten: automatisk i desember, alltid, aldri

  const ORIGINAL_COURSE = 'keiservarden';
  const blank = () => ({ v: VERSION, settings: normSettings(), people: [], history: [], courses: [], courseId: ORIGINAL_COURSE });
  /* Egne Keiservarden-løyper fra løypedesigneren. Delene vaskes av fysikkmotoren når de brukes –
     her sjekkes bare formen, så ingenting går tapt på sider som ikke laster fysikken. */
  function normCourse(c) {
    if (!c || typeof c !== 'object' || typeof c.id !== 'string' || !c.id || c.id === ORIGINAL_COURSE || !Array.isArray(c.pieces)) return null;
    return {
      id: c.id.slice(0, 40), name: u.cleanName(c.name) || 'Uten navn', pieces: c.pieces.slice(0, 400),
      ok: typeof c.ok === 'string' ? c.ok : null, stats: c.stats && typeof c.stats === 'object' ? c.stats : null,
      updated: typeof c.updated === 'string' ? c.updated : null,
    };
  }
  const intIn = (v, a, b, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? u.clamp(n, a, b) : d; };
  const toNum = (v) => { const s = String(v == null ? '' : v).trim(); if (!/^\d+$/.test(s)) return 0; const n = parseInt(s, 10); return n > 0 && n <= 99999 ? n : 0; };
  const trimNums = (arr) => { while (arr.length && !arr[arr.length - 1]) arr.pop(); return arr; };

  /* Hver passasjer har selvvalgte lodd-nummer (bingotall), ett per lodd (f.eks. 7 og 70).
     Uten bingotall (settings.noNums) har alle ett lodd, og ingen trenger nummer. */
  const ticketNums = (p) => Array.from({ length: p.tickets }, (_, i) => p.nums[i] || 0);
  const missingCount = (p, st = state.settings) => (st.noNums ? 0 : ticketNums(p).filter((n) => !n).length);

  function normSettings(st = {}) {
    const noNums = st.noNums === true;
    // husk hvor mange lodd som var lov med bingotall, så det kommer tilbake når valget slås av igjen
    const maxNums = intIn(noNums ? st.maxNums : st.maxPerPerson, 1, 4, DEFAULTS.maxPerPerson);
    return {
      price: intIn(st.price, 1, 1000, DEFAULTS.price),
      maxPerPerson: noNums ? 1 : maxNums,
      maxNums,
      noNums,
      winners: intIn(st.winners, 1, 10, DEFAULTS.winners),
      uniqueWinners: st.uniqueWinners !== false,
      sound: st.sound !== false,
      vipps: u.cleanName(st.vipps || '').slice(0, 60),
      drawTime: u.cleanName(st.drawTime || '').slice(0, 20),
      schedule: SCHEDULES.includes(st.schedule) ? st.schedule : DEFAULTS.schedule,
      jul: JUL.includes(st.jul) ? st.jul : DEFAULTS.jul,
    };
  }
  function validRecord(h) {
    if (!h || typeof h !== 'object' || !h.id || !h.date || isNaN(new Date(h.date))) return false;
    if (h.game === 'manuell') return Array.isArray(h.winnerNames);
    return Array.isArray(h.tickets) && Array.isArray(h.winners);
  }

  function normalize(s) {
    const out = blank();
    if (!s || typeof s !== 'object') return out;
    out.settings = normSettings(s.settings);
    out.history = Array.isArray(s.history) ? s.history.filter(validRecord) : [];
    out.history.sort((a, b) => new Date(b.date) - new Date(a.date));
    const seenCourse = new Set();
    out.courses = (Array.isArray(s.courses) ? s.courses : []).map(normCourse).filter((c) => c && !seenCourse.has(c.id) && seenCourse.add(c.id)).slice(0, 60);
    out.courseId = out.courses.some((c) => c.id === s.courseId) ? s.courseId : ORIGINAL_COURSE;
    const max = out.settings.maxPerPerson;
    const keys = new Set(), taken = new Set();
    const add = (p, nums) => {
      const name = u.cleanName(p && p.name);
      if (!name || keys.has(u.normName(name))) return;
      keys.add(u.normName(name));
      const clean = (Array.isArray(nums) ? nums : []).map((v) => { const n = toNum(v); if (!n || taken.has(n)) return 0; taken.add(n); return n; });
      out.people.push({ id: p.id || u.uid('p'), name, nums: trimNums(clean), tickets: intIn(p.tickets, 1, max, 1), paid: !!p.paid, active: p.active !== false });
    };
    if (Array.isArray(s.people)) {
      // Fra v3 er numrene valgt av folk selv. Versjon 2 delte ut nummer automatisk – de fjernes.
      const own = (s.v || 0) >= 3;
      s.people.forEach((p) => add(p, own ? p.nums : []));
    } else {
      // Første versjon: billettluka + alle som har vært med før
      ((s.round && s.round.people) || []).forEach((p) => add({ name: p.name, tickets: p.tickets }, []));
      out.history.forEach((h) => {
        (h.people || []).forEach((p) => add({ name: p.name, tickets: p.tickets }, []));
        if (h.game === 'manuell') h.winnerNames.forEach((n) => add({ name: n }, []));
      });
    }
    out.people.forEach((p) => { if (p.paid && missingCount(p, out.settings)) p.paid = false; });
    return out;
  }

  /* ---- Den gamle «Fredagstrekningen» (én HTML-fil, før denne nettsiden) ----
     Den lagret alt i nettleseren under FT_KEY, og «Lagre sikkerhetskopi» der gir hele tilstanden som JSON:
     people [{ name, numbers: [{ no, on }] }] og history [{ id, date, tickets, participants, price, mode, results: [{ place, no, name }] }].
     Den kom med eksempelnavn som lå igjen til man trykket «Fjern eksemplene» (sample: true). */
  const FT_KEY = 'fredagstrekningen.v1';
  const FT_SAMPLE = new Set(['Anders Berg', 'Berit Haugen', 'Camilla Lie', 'David Nilsen', 'Elin Dahl', 'Fredrik Moe', 'Guro Strand',
    'Henrik Aas', 'Ingrid Solberg', 'Jonas Eide', 'Kari Lunde', 'Lars Vik', 'Maja Holm', 'Nils Brekke'].map(u.normName));
  const FT_MODES = ['wheel', 'slot', 'drum', 'hurtig', 'gp'];
  function isOldApp(s) {
    if (!s || typeof s !== 'object' || s.app === 'fredagslotteriet' || s.settings) return false;
    return 'onePerPerson' in s
      || (Array.isArray(s.people) && s.people.some((p) => p && Array.isArray(p.numbers)))
      || (Array.isArray(s.history) && s.history.some((h) => h && Array.isArray(h.results)));
  }
  function fromOldApp(s) {
    const sample = s.sample !== false;
    const people = (Array.isArray(s.people) ? s.people : [])
      .filter((p) => p && u.cleanName(p.name) && !(sample && FT_SAMPLE.has(u.normName(p.name))))
      .map((p) => {
        // versjon 1 delte ut nummer automatisk, så bare versjon 2 har numre folk har valgt selv
        const ns = (s.v === 2 && Array.isArray(p.numbers) ? p.numbers : []).filter((n) => n && Number.isInteger(n.no) && n.no > 0);
        const on = ns.filter((n) => n.on !== false), off = ns.filter((n) => n.on === false);
        // lodd som «står over» kommer sist, så de ikke blir med før noen velger flere lodd
        return { name: p.name, nums: on.concat(off).map((n) => n.no), tickets: Math.max(1, on.length || ns.length), active: !ns.length || on.length > 0 };
      });
    const history = (Array.isArray(s.history) ? s.history : [])
      .filter((h) => h && Array.isArray(h.results) && h.results.some((r) => r && r.name) && h.date && !isNaN(new Date(h.date)))
      .map((h) => {
        const res = h.results.filter((r) => r && u.cleanName(r.name)).sort((a, b) => (a.place || 0) - (b.place || 0));
        const tickets = Math.max(0, parseInt(h.tickets, 10) || 0);
        const price = Math.max(0, Number(h.price) || 0);
        return {
          id: 'ft_' + String(h.id || new Date(h.date).getTime()).slice(0, 40), date: new Date(h.date).toISOString(),
          game: 'manuell', src: 'fredagstrekningen', mode: FT_MODES.includes(h.mode) ? h.mode : null,
          winnerNames: res.map((r) => u.cleanName(r.name)), winnerNos: res.map((r) => (Number.isInteger(r.no) && r.no > 0 ? r.no : 0)),
          ticketCount: tickets, participantCount: Math.max(0, parseInt(h.participants, 10) || 0), pot: tickets * price, price, people: null,
        };
      });
    return { v: VERSION, settings: { price: Number(s.price) > 0 ? s.price : undefined }, people, history };
  }
  // Data fra den gamle fila i denne nettleseren (bare synlig når begge er åpnet fra samme sted, f.eks. som filer i Chrome/Edge)
  function oldAppData() {
    try {
      const raw = localStorage.getItem(FT_KEY);
      const s = raw && JSON.parse(raw);
      if (!isOldApp(s)) return null;
      const d = fromOldApp(s);
      return d.people.length || d.history.length ? { raw: s, people: d.people, history: d.history } : null;
    } catch (e) { return null; }
  }

  let state = blank();
  try { const raw = localStorage.getItem(KEY); if (raw) state = normalize(JSON.parse(raw)); } catch (e) { /* tom start */ }
  const subs = new Set();
  function commit() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { u.toast('Klarte ikke å lagre i nettleseren 😬'); }
    subs.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } });
  }
  // andre faner/sider med samme nettsted holdes i synk
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try { state = normalize(JSON.parse(e.newValue)); subs.forEach((fn) => fn(state)); } catch (err) { /* ignorer */ }
  });

  function winnerNames(h) {
    if (h.game === 'manuell') return h.winnerNames.slice();
    return h.winners.map((no) => (h.tickets[no - 1] || {}).name || ('#' + no));
  }
  const recTickets = (h) => (h.game === 'manuell' ? (h.ticketCount || 0) : h.tickets.length);
  const ticketLabel = (h, no) => { const t = h.tickets && h.tickets[no - 1]; return (t && t.label) || u.pad(no); };
  const firstNum = (p) => p.nums.find(Boolean) || Infinity;
  const byNum = (a, b) => firstNum(a) - firstNum(b) || a.name.localeCompare(b.name, 'nb');
  const find = (id) => state.people.find((p) => p.id === id);

  const Store = {
    DEFAULTS, toNum, ticketNums, missingCount, winnerNames, recTickets, ticketLabel,
    get state() { return state; },
    get settings() { return state.settings; },
    get people() { return state.people.slice().sort(byNum); },
    get active() { return state.people.filter((p) => p.active).sort(byNum); },
    get history() { return state.history; },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    /* Juletema i Hurtigbåten: automatisk hele desember, eller slått på/av i innstillingene */
    julActive(date = new Date()) { const j = state.settings.jul; return j === 'on' || (j === 'auto' && date.getMonth() === 11); },
    /* Neste trekningsfredag etter innstillingen «Hvor ofte» */
    nextDraw(from = new Date(), schedule = state.settings.schedule) { return u.nextFriday(from, schedule); },

    setSettings(patch) {
      const prev = state.settings;
      const next = { ...prev, ...patch };
      if (prev.noNums && patch.noNums === false && !('maxPerPerson' in patch)) next.maxPerPerson = prev.maxNums;
      state.settings = normSettings(next);
      const m = state.settings.maxPerPerson;
      state.people.forEach((p) => {
        p.tickets = Math.min(p.tickets, m);
        if (p.paid && missingCount(p)) p.paid = false; // bingotall slått på igjen, men nummer mangler
      });
      commit();
    },

    /* ---- Passasjerregisteret ---- */
    numOwner(n, excludeId) { return state.people.find((p) => p.id !== excludeId && p.nums.includes(n)) || null; },
    checkNum(v, id, idx) {
      const n = toNum(v);
      if (!n) return { ok: false, msg: 'Nummeret må være et helt tall fra 1 og oppover.' };
      const owner = Store.numOwner(n, id);
      if (owner) return { ok: false, msg: `Nr. ${n} er allerede ${owner.name} sitt.` };
      const p = id && find(id);
      if (p && p.nums.some((x, i) => x === n && i !== idx)) return { ok: false, msg: `${p.name} har allerede nr. ${n}.` };
      return { ok: true, n };
    },
    setNum(id, idx, v) {
      const p = find(id);
      if (!p) return { ok: false, msg: 'Fant ikke passasjeren.' };
      if (String(v == null ? '' : v).trim() === '') {
        p.nums[idx] = 0;
        trimNums(p.nums);
        if (p.paid && missingCount(p)) p.paid = false;
        commit();
        return { ok: true };
      }
      const chk = Store.checkNum(v, id, idx);
      if (!chk.ok) return chk;
      while (p.nums.length < idx) p.nums.push(0);
      p.nums[idx] = chk.n;
      commit();
      return { ok: true };
    },
    addPerson({ name, nums = [], tickets } = {}) {
      name = u.cleanName(name);
      if (!name) return { ok: false, msg: 'Skriv inn et navn først.' };
      const ex = state.people.find((p) => u.normName(p.name) === u.normName(name));
      if (ex) return { ok: false, msg: `${ex.name} står allerede på lista.`, person: ex };
      const clean = [];
      for (let i = 0; i < nums.length; i++) {
        if (String(nums[i] == null ? '' : nums[i]).trim() === '') { clean[i] = 0; continue; }
        const chk = Store.checkNum(nums[i]);
        if (!chk.ok) return chk;
        if (clean.includes(chk.n)) return { ok: false, msg: `Nr. ${chk.n} er skrevet inn to ganger.` };
        clean[i] = chk.n;
      }
      trimNums(clean);
      const max = state.settings.maxPerPerson;
      const t = tickets ? u.clamp(parseInt(tickets, 10) || 1, 1, max) : u.clamp(clean.filter(Boolean).length || 1, 1, max);
      const p = { id: u.uid('p'), name, nums: clean, tickets: t, paid: false, active: true };
      state.people.push(p);
      commit();
      return { ok: true, person: p };
    },
    updatePerson(id, patch) {
      const p = find(id);
      if (!p) return { ok: false, msg: 'Fant ikke passasjeren.' };
      if ('name' in patch) {
        const name = u.cleanName(patch.name);
        if (!name) return { ok: false, msg: 'Navnet kan ikke være tomt.' };
        const ex = state.people.find((x) => x.id !== id && u.normName(x.name) === u.normName(name));
        if (ex) return { ok: false, msg: `Det finnes allerede en ${ex.name}.` };
        // nytt navn følger med bakover i skipsloggen, så statistikken henger sammen
        const old = u.normName(p.name);
        const fix = (o) => { if (o && u.normName(o.name) === old) o.name = name; };
        state.history.forEach((h) => {
          (h.people || []).forEach(fix); (h.tickets || []).forEach(fix); (h.leftBehind || []).forEach(fix);
          if (Array.isArray(h.winnerNames)) h.winnerNames = h.winnerNames.map((n) => (u.normName(n) === old ? name : n));
        });
        p.name = name;
      }
      if ('active' in patch) { p.active = !!patch.active; if (!p.active) p.paid = false; }
      commit();
      return { ok: true };
    },
    removePerson(id) { state.people = state.people.filter((p) => p.id !== id); commit(); },

    /* ---- Dagens tur ---- */
    setTickets(id, n) {
      const p = find(id);
      if (!p) return;
      p.tickets = u.clamp(n, 1, state.settings.maxPerPerson);
      if (p.paid && missingCount(p)) p.paid = false; // mangler nummer for nytt lodd → må bekreftes på nytt
      commit();
    },
    setPaid(id, v) {
      const p = find(id);
      if (!p) return { ok: false, msg: 'Fant ikke passasjeren.' };
      if (v && missingCount(p)) return { ok: false, msg: `Velg lodd-nummer for ${p.name} først.` };
      p.paid = !!v;
      commit();
      return { ok: true };
    },
    resetPaid() { state.people.forEach((p) => { p.paid = false; }); commit(); },
    participants() {
      const no = state.settings.noNums;
      return Store.active.filter((p) => p.paid && !missingCount(p)).map((p) => ({ id: p.id, name: p.name, nums: no ? [] : ticketNums(p), tickets: no ? 1 : p.tickets }));
    },
    leftBehind() { return Store.active.filter((p) => !p.paid).map((p) => ({ name: p.name, nums: state.settings.noNums ? [] : p.nums.filter(Boolean) })); },
    totals() {
      const price = state.settings.price;
      const act = Store.active;
      const paid = act.filter((p) => p.paid);
      const tickets = paid.reduce((s, p) => s + p.tickets, 0);
      return { people: act.length, paidPeople: paid.length, unpaid: act.length - paid.length, tickets, pot: tickets * price, paused: state.people.length - act.length, missing: act.filter((p) => missingCount(p)).length };
    },

    /* ---- Historikk ---- */
    addRecord(rec) { state.history.unshift(rec); state.history.sort((a, b) => new Date(b.date) - new Date(a.date)); commit(); },
    // Trommelen legger til én vinner om gangen i samme trekning
    updateRecord(id, patch) { const h = state.history.find((x) => x.id === id); if (!h) return null; Object.assign(h, patch); commit(); return h; },
    removeRecord(id) { state.history = state.history.filter((h) => h.id !== id); commit(); },
    getRecord(id) { return state.history.find((h) => h.id === id); },
    lastRecord() { return state.history.find((h) => !h.demo) || null; },

    /* ---- Egne løyper (Keiservarden GP) ---- */
    get courses() { return state.courses; },
    get courseId() { return state.courseId; },
    getCourse(id) { return state.courses.find((c) => c.id === id) || null; },
    saveCourse(c) {
      const clean = normCourse({ ...c, updated: new Date().toISOString() });
      if (!clean) return null;
      const i = state.courses.findIndex((x) => x.id === clean.id);
      if (i >= 0) state.courses[i] = clean; else state.courses.unshift(clean);
      commit();
      return clean;
    },
    removeCourse(id) {
      state.courses = state.courses.filter((c) => c.id !== id);
      if (state.courseId === id) state.courseId = ORIGINAL_COURSE;
      commit();
    },
    setCourse(id) { state.courseId = state.courses.some((c) => c.id === id) ? id : ORIGINAL_COURSE; commit(); },

    stats() {
      const recs = state.history.filter((h) => !h.demo);
      const ppl = new Map();
      const ent = (name) => {
        const k = u.normName(name);
        let e = ppl.get(k);
        if (!e) { e = { name, wins: 0, gold: 0, silver: 0, bronze: 0, tickets: 0, draws: 0, docks: 0, causes: {} }; ppl.set(k, e); }
        return e;
      };
      let pot = 0, tickets = 0;
      const causes = {};
      recs.forEach((h) => {
        pot += h.pot || 0;
        tickets += recTickets(h);
        (h.people || []).forEach((p) => { const e = ent(p.name); e.tickets += p.tickets; e.draws++; });
        (h.leftBehind || []).forEach((p) => { ent(p.name).docks++; });
        winnerNames(h).forEach((n, i) => { const e = ent(n); e.wins++; if (i === 0) e.gold++; else if (i === 1) e.silver++; else if (i === 2) e.bronze++; });
        (h.beats || []).filter((b) => !b.save).forEach((b) => (b.v || []).forEach((no) => {
          const t = h.tickets[no - 1];
          if (!t) return;
          causes[b.ev] = (causes[b.ev] || 0) + 1;
          const e = ent(t.name);
          e.causes[b.ev] = (e.causes[b.ev] || 0) + 1;
        }));
      });
      const all = Array.from(ppl.values());
      const leaders = all.filter((e) => e.wins > 0).sort((a, b) => b.wins - a.wins || b.gold - a.gold || b.silver - a.silver || a.tickets - b.tickets || a.name.localeCompare(b.name, 'nb'));
      let topCause = null;
      Object.keys(causes).forEach((k) => { if (!topCause || causes[k] > causes[topCause]) topCause = k; });
      return { draws: recs.length, pot, tickets, leaders, causes, topCause, byName: ppl };
    },

    exportData() { return JSON.stringify({ app: 'fredagslotteriet', exported: new Date().toISOString(), ...state }, null, 2); },
    isOldApp, oldAppData,
    importData(obj) {
      const old = isOldApp(obj);
      const inc = normalize(old ? fromOldApp(obj) : obj);
      const fresh = !state.history.length && !state.people.length;
      if (fresh) state.settings = inc.settings;
      const have = new Set(state.history.map((h) => h.id));
      let added = 0;
      inc.history.forEach((h) => { if (!have.has(h.id)) { state.history.push(h); added++; } });
      state.history.sort((a, b) => new Date(b.date) - new Date(a.date));
      let newPeople = 0, gotNums = 0;
      inc.people.forEach((p) => {
        const nums = trimNums(p.nums.map((n) => (n && !Store.numOwner(n) ? n : 0)));
        const ex = state.people.find((x) => u.normName(x.name) === u.normName(p.name));
        if (ex) {
          // står allerede på lista uten nummer: få numrene fra fila, men ikke rør noe annet
          if (!ex.nums.some(Boolean) && nums.some(Boolean)) { ex.nums = nums; gotNums++; }
          return;
        }
        state.people.push({ ...p, id: u.uid('p'), nums, paid: false });
        newPeople++;
      });
      inc.courses.forEach((c) => { if (!state.courses.some((x) => x.id === c.id)) state.courses.push(c); });
      commit();
      return { added, newPeople, gotNums, old };
    },
    wipe() { state = blank(); commit(); },
  };

  FL.Store = Store;
})();
