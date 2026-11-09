/* Passasjerer: registeret med faste numre (7 → lodd 7 og 70) */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u, Store = FL.Store;
  const { $, esc } = u;
  let quiet = false; // egne endringer oppdaterer bare raden, så markøren ikke hopper

  function statsFor(p, stats) {
    const e = stats.byName.get(u.normName(p.name));
    if (!e) return 'Ikke vært med ennå';
    const bits = [`${e.draws} ${e.draws === 1 ? 'tur' : 'turer'}`];
    if (e.wins) bits.push(`🏆 ${e.wins}`);
    if (e.docks) bits.push(`🧳 ${e.docks} på kaia`);
    return bits.join(' · ');
  }
  function warnFor(p) {
    const c = Store.conflicts(p.num, p.id).filter((x) => !x.same);
    return c.length ? `⚠ Lodd ${c[0].label} kolliderer med ${esc(c[0].person.name)}` : '';
  }
  function row(p, stats) {
    const max = Store.settings.maxPerPerson;
    return `<li class="reg${p.active ? '' : ' is-paused'}" data-id="${p.id}">
      <input class="field-input reg-num" type="number" min="1" max="99999" inputmode="numeric" value="${p.num}" aria-label="Nummer for ${esc(p.name)}">
      <div class="reg-main">
        <input class="field-input reg-name" type="text" maxlength="40" value="${esc(p.name)}" aria-label="Navn">
        <div class="reg-meta"><span class="reg-labels">Lodd ${Store.labelsFor(p.num, max).join(' · ')}</span><span class="reg-stats">${statsFor(p, stats)}</span></div>
        <div class="reg-warn">${warnFor(p)}</div>
      </div>
      <div class="reg-ctrls">
        <button type="button" class="reg-pause${p.active ? '' : ' off'}" data-pause aria-pressed="${!p.active}">${p.active ? 'Aktiv' : 'På pause'}</button>
        <button type="button" class="x-btn" data-del aria-label="Slett ${esc(p.name)}">×</button>
      </div>
    </li>`;
  }
  function render() {
    const people = Store.people;
    const stats = Store.stats();
    $('#regList').innerHTML = people.map((p) => row(p, stats)).join('');
    $('#regEmpty').hidden = people.length > 0;
    const act = people.filter((p) => p.active).length;
    $('#regCount').textContent = people.length ? `(${act}${act !== people.length ? ` aktive av ${people.length}` : ''})` : '';
  }
  function refreshRow(id) {
    const li = document.querySelector(`.reg[data-id="${id}"]`);
    const p = Store.people.find((x) => x.id === id);
    if (!li || !p) return render();
    li.querySelector('.reg-labels').textContent = 'Lodd ' + Store.labelsFor(p.num, Store.settings.maxPerPerson).join(' · ');
    li.querySelector('.reg-warn').innerHTML = warnFor(p);
    // andre rader kan ha fått/mistet en kollisjon
    Store.people.forEach((o) => { const r = document.querySelector(`.reg[data-id="${o.id}"] .reg-warn`); if (r) r.innerHTML = warnFor(o); });
  }
  function commit(id, patch, input) {
    quiet = true;
    const res = Store.updatePerson(id, patch);
    quiet = false;
    if (!res.ok) {
      u.toast(res.msg);
      const p = Store.people.find((x) => x.id === id);
      if (p && input) input.value = 'num' in patch ? p.num : p.name;
      return;
    }
    if (res.warn) u.toast(res.warn);
    refreshRow(id);
  }

  const list = $('#regList');
  list.addEventListener('change', (e) => {
    const li = e.target.closest('.reg');
    if (!li) return;
    if (e.target.classList.contains('reg-num')) commit(li.dataset.id, { num: e.target.value }, e.target);
    else if (e.target.classList.contains('reg-name')) commit(li.dataset.id, { name: e.target.value }, e.target);
  });
  list.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('input')) e.target.blur(); });
  list.addEventListener('click', async (e) => {
    const li = e.target.closest('.reg');
    if (!li) return;
    const id = li.dataset.id;
    const p = Store.people.find((x) => x.id === id);
    if (!p) return;
    if (e.target.closest('[data-pause]')) Store.updatePerson(id, { active: !p.active });
    else if (e.target.closest('[data-del]')) {
      if (await u.confirmDlg(`Slette ${p.name}?`, `${p.name} (nr. ${p.num}) fjernes fra passasjerlista. Skipsloggen beholdes. Vil hen bare ha en pause, bruk «På pause» i stedet.`, 'Slett')) Store.removePerson(id);
    }
  });

  const form = $('#regAdd');
  const note = () => {
    const num = parseInt(form.num.value, 10);
    const el = $('#regAddNote');
    if (!(num > 0)) { el.textContent = ''; return; }
    const chk = Store.checkNum(num);
    el.className = 'add-note' + (chk.ok ? (chk.warn ? ' warn' : '') : ' bad');
    el.textContent = chk.ok ? (chk.warn || `Får lodd ${Store.labelsFor(num, Store.settings.maxPerPerson).join(' og ')}.`) : chk.msg;
  };
  form.num.addEventListener('input', note);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!u.cleanName(form.name.value)) { form.name.classList.remove('shake'); void form.name.offsetWidth; form.name.classList.add('shake'); form.name.focus(); return; }
    const res = Store.addPerson({ name: form.name.value, num: form.num.value, tickets: 1 });
    if (!res.ok) { u.toast(res.msg); return; }
    u.toast(res.warn ? `${res.person.name} er lagt til. ${res.warn}` : `${res.person.name} er lagt til med nr. ${res.person.num}.`);
    form.name.value = '';
    form.num.value = Store.nextNum();
    note();
    form.name.focus();
  });

  form.num.value = Store.nextNum();
  note();
  render();
  Store.subscribe(() => { if (!quiet) render(); });
})();
