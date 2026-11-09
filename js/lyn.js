/* Fredagslotteriet – «Avgangstavla»: lyntrekning med splitflap-tavle */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u, Ev = FL.Events, Store = FL.Store;
  const S = () => FL.Audio;
  const CHARS = 'ABCDEFGHIJKLMNOPRSTUVWYZÆØÅ0123456789';
  const NAME_LEN = 14;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fit = (s, n) => { s = u.cleanName(s).toUpperCase(); return s.length > n ? s.slice(0, n - 1) + '.' : s.padEnd(n, ' '); };

  class Board {
    constructor(stage) {
      this.stage = stage;
      this.el = u.$('#board', stage);
      this.token = 0;
      this.clockT = null;
      this.state = 'hidden';
    }
    cells(text) { return `<span class="flap">${Array.from(text).map((c) => `<i>${c === ' ' ? '&nbsp;' : u.esc(c)}</i>`).join('')}</span>`; }
    show() {
      this.token++;
      this.state = 'idle';
      const W = Store.settings.winners;
      const t = Store.totals();
      const rows = Array.from({ length: Math.min(W, 6) }, (_, i) => `<div class="brow" data-rank="${i + 1}">${this.cells(String(i + 1).padStart(2, '0'))}${this.cells(fit('', NAME_LEN))}${this.cells('---')}<span class="bstatus">VENTER</span></div>`).join('');
      this.el.innerHTML = `<div class="board-head"><div class="board-title">Avganger<small>Fredagslotteriet · Bodø</small></div><div class="board-clock" id="bClock"></div></div>
        <div class="board-table"><div class="brow brow-head"><span>Plass</span><span>Passasjer</span><span>Lodd</span><span>Status</span></div>${rows}</div>
        <div class="board-foot">${t.tickets ? `<button class="btn btn-primary" type="button" data-b="go">⚡ Trekk nå – ${t.tickets} lodd</button>` : '<a class="btn btn-ghost" href="pamelding.html">Til påmeldingen</a>'}<button class="btn btn-ghost" type="button" data-b="demo">Prøv med demo</button></div>`;
      this.el.hidden = false;
      this.el.onclick = (e) => { const b = e.target.closest('[data-b]'); if (!b) return; if (b.dataset.b === 'go') this.startLive(); else if (b.dataset.b === 'demo') this.startDemo(); else if (b.dataset.b === 'again') this.show(); };
      this.tickClock();
      clearInterval(this.clockT);
      this.clockT = setInterval(() => this.tickClock(), 10000);
      this.sideIdle();
    }
    hide() { this.token++; this.state = 'hidden'; this.el.hidden = true; clearInterval(this.clockT); }
    tickClock() { const c = u.$('#bClock', this.el); if (c) c.textContent = new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }); }
    sideIdle() {
      u.$('#paxList', this.stage).innerHTML = '<li class="side-empty">Avgangstavla trekker blant dem som har betalt.</li>';
      u.$('#paxCount', this.stage).textContent = String(Store.totals().tickets);
      u.$('#logList', this.stage).innerHTML = '<li class="side-empty">Avgangstavla fører ingen reiselogg. Ingen skadet, ingen ørn.</li>';
      u.$('#logCount', this.stage).textContent = '0';
    }
    startLive() {
      const people = Store.participants();
      if (!people.length) { u.toast('Ingen har betalt ennå – bekreft betaling i påmeldingen.'); return; }
      const d = Ev.createDraw(people, Store.settings, { game: 'lyn', leftBehind: Store.leftBehind() });
      d.beats = [];
      this.run(d, 'live');
      Store.addRecord(d);
      Store.resetPaid();
    }
    startDemo() {
      const names = ['Kari Nordmann', 'Ola Nordmann', 'Tor-Erik', 'Siv', 'Bjørnar', 'Hanne', 'Frode', 'Mona', 'Geir', 'Lise', 'Arnt', 'Trine'];
      const pool = u.shuffle(Array.from({ length: 99 }, (_, i) => i + 1));
      const d = Ev.createDraw(names.map((n) => { const t = 1 + u.randInt(Store.settings.maxPerPerson); return { name: n, nums: pool.splice(0, t), tickets: t }; }), Store.settings, { game: 'lyn', demo: true });
      d.beats = [];
      this.run(d, 'demo');
    }
    async run(d, mode) {
      const token = ++this.token;
      this.state = 'run';
      S().unlock();
      const W = d.winners.length;
      const rows = d.winners.map((no, i) => `<div class="brow" data-rank="${i + 1}">${this.cells(String(i + 1).padStart(2, '0'))}${this.cells(fit('', NAME_LEN))}${this.cells('---')}<span class="bstatus">VENTER</span></div>`).join('');
      u.$('.board-table', this.el).innerHTML = `<div class="brow brow-head"><span>Plass</span><span>Passasjer</span><span>Lodd</span><span>Status</span></div>${rows}`;
      u.$('.board-foot', this.el).innerHTML = `<span class="ov-fine">${mode === 'demo' ? 'Prøvetur · lagres ikke' : 'Trekningen er låst i skipsloggen'}</span>`;
      const pax = u.$('#paxList', this.stage);
      pax.innerHTML = d.tickets.map((t) => `<li class="px" data-no="${t.no}"><span class="px-no">${u.esc(t.label || u.pad(t.no))}</span><span class="px-dot" style="background:${u.colorFor(t.name)}"></span><span class="px-name">${u.esc(t.name)}</span><span class="px-st"></span></li>`).join('');
      u.$('#paxCount', this.stage).textContent = String(d.tickets.length);
      const names = d.tickets.map((t) => t.name);
      for (let r = W; r >= 1; r--) {
        if (token !== this.token) return;
        const row = u.$(`.brow[data-rank="${r}"]`, this.el);
        const st = u.$('.bstatus', row);
        st.textContent = 'TREKKES'; st.className = 'bstatus wait';
        const no = d.winners[r - 1];
        const t = d.tickets[no - 1];
        const [, nameCells, noCells] = u.$$('.flap', row);
        await this.spin(nameCells, fit(t.name, NAME_LEN), names, r === 1 ? 2600 : 1700, token);
        await this.spin(noCells, String(t.label || u.pad(no)).slice(-3).padStart(3, ' '), null, 500, token);
        if (token !== this.token) return;
        st.textContent = r === 1 ? 'VINNER ✓' : 'I RUTE ✓'; st.className = 'bstatus ok';
        row.classList.add('is-win');
        const li = u.$(`.px[data-no="${no}"]`, pax);
        if (li) { li.classList.add('is-win'); u.$('.px-st', li).textContent = ['🥇', '🥈', '🥉'][r - 1] || '🏁'; }
        if (r === 1) S().fanfare(); else S().ding();
        await sleep(r === 1 ? 600 : 900);
      }
      if (token !== this.token) return;
      this.state = 'done';
      u.$('.board-foot', this.el).innerHTML = `<button class="btn btn-primary" type="button" data-b="again">Ny trekning</button>${mode === 'live' ? '<a class="btn btn-ghost" href="historikk.html">Se skipsloggen</a>' : ''}`;
    }
    async spin(span, target, pool, dur, token) {
      const cells = u.$$('i', span);
      const n = cells.length;
      const t0 = performance.now();
      const settleAt = cells.map((_, i) => dur * (0.55 + (0.45 * i) / Math.max(1, n - 1)));
      let last = 0;
      return new Promise((resolve) => {
        const step = (now) => {
          if (token !== this.token) return resolve();
          const el = now - t0;
          if (now - last > 65) {
            last = now;
            let pick = pool && pool.length ? fit(pool[Math.floor(Math.random() * pool.length)], n) : null;
            cells.forEach((c, i) => {
              if (c.dataset.done) return;
              let ch;
              if (el >= settleAt[i]) { ch = target[i]; c.dataset.done = '1'; } else ch = pick && Math.random() < 0.5 ? pick[i] : CHARS[Math.floor(Math.random() * CHARS.length)];
              c.innerHTML = ch === ' ' ? '&nbsp;' : u.esc(ch);
              c.classList.remove('flip'); void c.offsetWidth; c.classList.add('flip');
            });
            S().flap();
          }
          if (cells.every((c) => c.dataset.done)) { cells.forEach((c) => delete c.dataset.done); return resolve(); }
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }
  }

  FL.Board = Board;
})();
