/* Skipsloggen: statistikk, alle trekninger, vinnertavle, manuell registrering og backup */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u, Store = FL.Store, Ev = FL.Events;
  const { $, esc } = u;
  const MEDAL = ['🥇', '🥈', '🥉'];
  const GAME = { hurtigbat: 'Hurtigbåten', draugen: 'Draugen', keiser: 'Keiservarden GP', lyn: 'Avgangstavla', manuell: 'Manuelt registrert' };
  const isVoyage = (h) => h.game === 'hurtigbat' || h.game === 'draugen' || h.game === 'keiser';
  const LEFT = { draugen: ['👻', 'Mannskap hos Draugen'], keiser: ['🚧', 'Satt fast i startporten'] };
  const GOAL = { draugen: 'Kom frem til Henningsvær', keiser: 'Først ned til Bodø havn' };

  function renderStats(s) {
    const lead = s.leaders[0];
    const top = s.topCause ? Ev.EVENTS[s.topCause] : null;
    const tile = (lbl, val, sub, cls = '') => `<div class="hs ${cls}"><span class="hs-lbl">${lbl}</span><span class="hs-val">${val}</span><span class="hs-sub">${sub}</span></div>`;
    $('#histStats').innerHTML = tile('Trekninger', u.nf.format(s.draws), s.draws ? `${u.nf.format(s.tickets)} lodd totalt` : 'Ingen ennå')
      + tile('Omsatt totalt', u.kr(s.pot), 'Alt til urelaterte formål', 'hs-sun')
      + tile('Flest seire', lead ? esc(lead.name) : '—', lead ? `${lead.wins} ${lead.wins === 1 ? 'seier' : 'seire'}` : 'Ledig plass på toppen')
      + tile('Farligste fare', top ? `${top.icon} ${esc(top.title)}` : '—', top ? `${s.causes[s.topCause]} ofre` : 'Havet venter');
  }
  function winnerLine(h, i, name) {
    const lab = h.game !== 'manuell' ? ` <small>(${esc(Store.ticketLabel(h, h.winners[i]))})</small>` : '';
    return `<span>${MEDAL[i] || '🏁'} ${esc(name)}${lab}</span>`;
  }
  function tripLog(h) {
    let html = '';
    if (h.leftBehind && h.leftBehind.length) {
      const [ico, lbl] = LEFT[h.game] || ['🧳', 'Igjen på kaia'];
      html += `<li><span>${ico}</span><span>${lbl} (ikke betalt): ${h.leftBehind.map((p) => esc(p.name)).join(', ')}</span></li>`;
    }
    if (isVoyage(h) && h.beats && (h.beats.length || h.game === 'keiser')) {
      html += h.beats.map((b) => `<li><span>${(Ev.EVENTS[b.ev] || {}).icon || '•'}</span><span>${Ev.eventText(b, h.tickets, true)}</span></li>`).join('');
      html += `<li><span>🏁</span><span>${GOAL[h.game] || 'I land i Bodø'}: ${h.winners.map((no, i) => `${MEDAL[i] || ''} <b>${esc(h.tickets[no - 1].name)}</b>`).join(', ')}</span></li>`;
    } else if (h.people && h.people.length) {
      html += `<li><span>🎟️</span><span>Om bord: ${h.people.map((p) => `${esc(p.name)} (${(p.nums || []).filter(Boolean).join('/') || `${p.tickets} lodd`})`).join(', ')}</span></li>`;
    }
    return html;
  }
  function renderTimeline() {
    const list = Store.history.filter((h) => !h.demo);
    $('#histEmpty').hidden = list.length > 0;
    $('#timeline').innerHTML = list.map((h) => {
      const d = new Date(h.date);
      const names = Store.winnerNames(h);
      const tix = Store.recTickets(h);
      const logHtml = tripLog(h);
      const events = h.beats ? h.beats.length : 0;
      return `<li class="trip" data-id="${h.id}">
        <div class="trip-head">
          <div class="trip-date"><b>${d.getDate()}</b><small>${esc(u.dfMonth.format(d).replace('.', ''))}</small></div>
          <div><div class="trip-meta">${esc(u.dfLong.format(d))} · ${GAME[h.game] || 'Trekning'}${h.course && h.course.name ? ` · «${esc(h.course.name)}»` : ''}${tix ? ` · ${tix} lodd` : ''}</div>
          <div class="trip-winners">${names.map((n, i) => winnerLine(h, i, n)).join('') || '<span>Ingen vinnere registrert</span>'}</div></div>
          <div class="trip-pot">${h.pot ? u.kr(h.pot) : '—'}<small>i potten</small></div>
        </div>
        <details><summary>${isVoyage(h) ? `Reiseloggen · ${events} ${events === 1 ? 'hendelse' : 'hendelser'}` : 'Detaljer'} <span class="chev" aria-hidden="true">▾</span></summary>
          ${logHtml ? `<ol class="trip-log">${logHtml}</ol>` : ''}
          <div class="trip-btns">${isVoyage(h) ? `<a class="btn btn-small btn-aurora" href="trekning.html?reprise=${encodeURIComponent(h.id)}">▶ Se reprise</a>` : ''}<button class="btn btn-small btn-ghost" type="button" data-del>Slett fra loggen</button></div>
        </details></li>`;
    }).join('');
  }
  function renderLeader(s) {
    const top = s.leaders.slice(0, 12);
    $('#leaderEmpty').hidden = top.length > 0;
    $('#leader').innerHTML = top.map((e, i) => {
      const fav = Object.keys(e.causes).sort((a, b) => e.causes[b] - e.causes[a])[0];
      const medals = [e.gold ? `🥇${e.gold}` : '', e.silver ? `🥈${e.silver}` : '', e.bronze ? `🥉${e.bronze}` : ''].filter(Boolean).join(' ');
      const sub = [medals, e.tickets ? `${e.tickets} lodd` : '', fav ? `typisk: ${Ev.EVENTS[fav].icon}` : ''].filter(Boolean).join(' · ');
      const reg = Store.people.find((p) => u.normName(p.name) === u.normName(e.name));
      return `<li class="lb"><span class="lb-rank">${i + 1}</span><span class="av" style="background:${u.colorFor(e.name)}">${reg && reg.nums[0] ? reg.nums[0] : esc(u.initials(e.name))}</span><div class="lb-txt"><div class="lb-name">${esc(e.name)}</div><div class="lb-sub">${sub}</div></div><span class="lb-wins">${e.wins}</span></li>`;
    }).join('');
  }
  function render() {
    const s = Store.stats();
    renderStats(s);
    renderTimeline();
    renderLeader(s);
  }

  /* ---- Handlinger ---- */
  $('#timeline').addEventListener('click', async (e) => {
    const li = e.target.closest('.trip');
    if (!li || !e.target.closest('[data-del]')) return;
    const rec = Store.getRecord(li.dataset.id);
    if (rec && await u.confirmDlg('Slette trekningen?', `Trekningen ${u.dfLong.format(new Date(rec.date))} fjernes fra skipsloggen for godt.`, 'Slett')) Store.removeRecord(rec.id);
  });
  const form = $('#manualForm');
  $('#manualBtn').addEventListener('click', () => {
    form.hidden = !form.hidden;
    if (form.hidden) return;
    const W = Store.settings.winners;
    $('#manualWinners').innerHTML = Array.from({ length: W }, (_, i) => `<label class="field"><span class="field-label">${MEDAL[i] || ''} ${i + 1}. plass</span><input class="field-input" type="text" name="w${i}" maxlength="40" placeholder="Navn" list="nameList"></label>`).join('');
    $('#nameList').innerHTML = Store.people.map((p) => `<option value="${esc(p.name)}">`).join('');
    form.date.value = new Date().toISOString().slice(0, 10);
    form.tickets.value = '';
    form.querySelector('[name="w0"]').focus();
  });
  $('#manualCancel').addEventListener('click', () => { form.hidden = true; });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const names = Array.from(form.querySelectorAll('[name^="w"]')).map((i) => u.cleanName(i.value)).filter(Boolean);
    if (!form.date.value) { u.toast('Velg en dato.'); return; }
    if (!names.length) { u.toast('Skriv inn minst én vinner.'); return; }
    const tickets = Math.max(0, parseInt(form.tickets.value, 10) || 0);
    Store.addRecord({ id: u.uid('m'), date: new Date(form.date.value + 'T12:00:00').toISOString(), game: 'manuell', winnerNames: names, ticketCount: tickets, pot: tickets * Store.settings.price, price: Store.settings.price, people: null });
    names.forEach((n) => { if (!Store.people.some((p) => u.normName(p.name) === u.normName(n))) Store.addPerson({ name: n }); });
    form.hidden = true;
    u.toast('Lagt inn i skipsloggen.');
  });
  $('#exportBtn').addEventListener('click', () => { u.download(`fredagslotteriet-backup-${new Date().toISOString().slice(0, 10)}.json`, Store.exportData()); u.toast('Backup lastet ned.'); });
  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const r = Store.importData(JSON.parse(await f.text()));
      u.toast(r.added || r.newPeople ? `La til ${r.added} ${r.added === 1 ? 'trekning' : 'trekninger'} og ${r.newPeople} passasjerer.` : 'Ingenting nytt i fila.');
    } catch (err) { u.toast('Fila kunne ikke leses som backup.'); }
  });

  render();
  Store.subscribe(render);
})();
