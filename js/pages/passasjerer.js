/* Passasjerer: registeret med navn og selvvalgte lodd-nummer */
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
  const missHtml = (p) => (p.nums.some(Boolean) ? '' : '<span class="reg-miss">Mangler nummer</span>');
  function row(p, stats) {
    const max = Store.settings.maxPerPerson;
    const nums = Array.from({ length: max }, (_, i) => `<label class="reg-numwrap"><span>Lodd ${i + 1}</span><input class="field-input reg-num" data-i="${i}" type="text" inputmode="numeric" maxlength="5" value="${p.nums[i] || ''}" placeholder="nr." aria-label="Lodd ${i + 1} for ${esc(p.name)}"></label>`).join('');
    return `<li class="reg${p.active ? '' : ' is-paused'}" data-id="${p.id}">
      <div class="reg-main">
        <input class="field-input reg-name" type="text" maxlength="40" value="${esc(p.name)}" aria-label="Navn">
        <div class="reg-meta"><span class="reg-stats">${statsFor(p, stats)}</span><span class="reg-flag">${missHtml(p)}</span></div>
      </div>
      <div class="reg-nums">${nums}</div>
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
    const miss = people.filter((p) => !p.nums.some(Boolean)).length;
    $('#regCount').textContent = people.length ? `(${act}${act !== people.length ? ` aktive av ${people.length}` : ''})` : '';
    const mn = $('#regMissing');
    mn.hidden = !miss;
    mn.textContent = `${miss} ${miss === 1 ? 'passasjer mangler' : 'passasjerer mangler'} nummer. Fyll inn numrene folk har valgt.`;
  }
  function refreshFlags(id) {
    const p = Store.people.find((x) => x.id === id);
    const li = document.querySelector(`.reg[data-id="${id}"]`);
    if (!p || !li) return render();
    li.querySelector('.reg-flag').innerHTML = missHtml(p);
    const miss = Store.people.filter((x) => !x.nums.some(Boolean)).length;
    const mn = $('#regMissing');
    mn.hidden = !miss;
    mn.textContent = `${miss} ${miss === 1 ? 'passasjer mangler' : 'passasjerer mangler'} nummer. Fyll inn numrene folk har valgt.`;
  }

  const list = $('#regList');
  list.addEventListener('change', (e) => {
    const li = e.target.closest('.reg');
    if (!li) return;
    const id = li.dataset.id;
    const p = Store.people.find((x) => x.id === id);
    if (!p) return;
    quiet = true;
    let res;
    if (e.target.classList.contains('reg-num')) res = Store.setNum(id, +e.target.dataset.i, e.target.value);
    else if (e.target.classList.contains('reg-name')) res = Store.updatePerson(id, { name: e.target.value });
    quiet = false;
    if (!res) return;
    if (!res.ok) {
      u.toast(res.msg);
      e.target.value = e.target.classList.contains('reg-num') ? (p.nums[+e.target.dataset.i] || '') : p.name;
      return;
    }
    if (e.target.classList.contains('reg-num')) e.target.value = p.nums[+e.target.dataset.i] || '';
    refreshFlags(id);
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
      const nums = p.nums.filter(Boolean);
      if (await u.confirmDlg(`Slette ${p.name}?`, `${p.name}${nums.length ? ` (lodd ${nums.join(' og ')})` : ''} fjernes fra passasjerlista. Skipsloggen beholdes. Vil hen bare ha en pause, bruk «På pause» i stedet.`, 'Slett')) Store.removePerson(id);
    }
  });
  FL.Shell.bindAddForm($('#regAdd'), $('#regAddNums'), $('#regAddNote'));

  render();
  Store.subscribe(() => { if (!quiet) render(); });
})();
