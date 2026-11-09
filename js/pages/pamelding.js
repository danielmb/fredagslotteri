/* Påmelding: faste passasjerer, antall lodd og bekreftet betaling */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u, Store = FL.Store;
  const { $, esc } = u;
  let filter = 'all', q = '', justPaid = null, focusSel = null;

  function bar() {
    const t = Store.totals();
    const pct = t.people ? Math.round((t.paidPeople / t.people) * 100) : 0;
    $('#ciBar').innerHTML = `
      <div class="ci-stats">
        <div class="ci-stat"><b>${t.paidPeople}<small> / ${t.people}</small></b><span>har betalt</span></div>
        <div class="ci-stat"><b>${t.tickets}</b><span>lodd om bord</span></div>
        <div class="ci-stat ci-pot"><b>${u.kr(t.pot)}</b><span>i potten</span></div>
      </div>
      <a class="btn btn-primary ci-go" href="trekning.html">Til trekningen <span aria-hidden="true">→</span></a>
      <div class="ci-progress" aria-hidden="true"><i style="width:${pct}%"></i></div>`;
  }
  function row(p) {
    const st = Store.settings;
    const sum = p.tickets * st.price;
    const seg = Array.from({ length: st.maxPerPerson }, (_, i) => `<button type="button" data-t="${i + 1}" class="${i + 1 === p.tickets ? 'on' : ''}" aria-pressed="${i + 1 === p.tickets}" aria-label="${i + 1} lodd">${i + 1}</button>`).join('');
    return `<li class="ci${p.paid ? ' is-paid' : ''}${p.id === justPaid ? ' just-paid' : ''}" data-id="${p.id}">
      <span class="ci-num">${p.num}</span>
      <div class="ci-info"><b>${esc(p.name)}</b><small>Lodd ${Store.labelsFor(p.num, p.tickets).join(' · ')}</small></div>
      <div class="ci-ctrls"><div class="seg" role="group" aria-label="Antall lodd for ${esc(p.name)}">${seg}</div>
      <button type="button" class="pay${p.paid ? ' on' : ''}" data-pay aria-pressed="${p.paid}">${p.paid ? `<span class="pay-ico">✓</span> Betalt ${sum} kr` : `Bekreft betalt <span class="pay-sum">${sum} kr</span>`}</button></div>
    </li>`;
  }
  function list() {
    const all = Store.active;
    const shown = all
      .filter((p) => filter === 'all' || (filter === 'paid' ? p.paid : !p.paid))
      .filter((p) => !q || u.normName(p.name).includes(q) || String(p.num).startsWith(q));
    $('#ciList').innerHTML = shown.map(row).join('');
    justPaid = null;
    const empty = $('#ciEmpty');
    empty.hidden = shown.length > 0;
    if (!all.length) empty.innerHTML = '<b>Ingen passasjerer ennå.</b>Legg til den første nederst – navnet huskes til neste fredag.';
    else if (q) empty.innerHTML = `<b>Fant ingen «${esc(q)}».</b>Legg til som ny passasjer nederst?`;
    else if (filter === 'unpaid') empty.innerHTML = '<b>Alle har betalt 🎉</b>Båten kan gå når dere er klare.';
    else empty.innerHTML = '<b>Ingen har betalt ennå.</b>Trykk «Bekreft betalt» når noen har vippset.';
    const paused = Store.totals().paused;
    const pz = $('#ciPaused');
    pz.hidden = !paused;
    pz.innerHTML = `${paused} på pause vises ikke her. <a href="passasjerer.html">Endre under Passasjerer</a>.`;
    if (focusSel) { const el = document.querySelector(focusSel); if (el) el.focus({ preventScroll: true }); focusSel = null; }
  }
  function addNote() {
    const f = $('#ciAdd');
    const num = parseInt(f.num.value, 10);
    const note = $('#ciAddNote');
    if (!(num > 0)) { note.textContent = ''; return; }
    const chk = Store.checkNum(num);
    note.className = 'add-note' + (chk.ok ? (chk.warn ? ' warn' : '') : ' bad');
    note.textContent = chk.ok ? (chk.warn || `Får lodd ${Store.labelsFor(num, Store.settings.maxPerPerson).join(' og ')}.`) : chk.msg;
  }
  function render() { bar(); list(); }

  $('#ciList').addEventListener('click', (e) => {
    const li = e.target.closest('.ci');
    if (!li) return;
    const id = li.dataset.id;
    const t = e.target.closest('[data-t]');
    if (t) { focusSel = `.ci[data-id="${id}"] [data-t="${t.dataset.t}"]`; Store.setTickets(id, +t.dataset.t); return; }
    if (e.target.closest('[data-pay]')) {
      const p = Store.active.find((x) => x.id === id);
      if (!p) return;
      if (!p.paid) justPaid = id;
      focusSel = `.ci[data-id="${id}"] [data-pay]`;
      Store.setPaid(id, !p.paid);
    }
  });
  $('#ciFilter').addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]');
    if (!b) return;
    filter = b.dataset.f;
    u.$$('#ciFilter button').forEach((x) => x.classList.toggle('on', x === b));
    list();
  });
  $('#ciSearch').addEventListener('input', (e) => { q = u.normName(e.target.value); list(); });
  const form = $('#ciAdd');
  form.num.addEventListener('input', addNote);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!u.cleanName(form.name.value)) { form.name.classList.remove('shake'); void form.name.offsetWidth; form.name.classList.add('shake'); form.name.focus(); return; }
    const res = Store.addPerson({ name: form.name.value, num: form.num.value, tickets: 1 });
    if (!res.ok) { u.toast(res.msg); return; }
    u.toast(res.warn ? `${res.person.name} er lagt til. ${res.warn}` : `${res.person.name} er lagt til med nr. ${res.person.num}.`);
    form.name.value = '';
    form.num.value = Store.nextNum();
    addNote();
    form.name.focus();
  });

  form.num.value = Store.nextNum();
  addNote();
  render();
  Store.subscribe(() => { render(); if (document.activeElement !== form.num) { form.num.value = form.num.value || Store.nextNum(); addNote(); } });
})();
