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
    const nums = Store.ticketNums(p);
    const missing = nums.some((n) => !n);
    const seg = Array.from({ length: st.maxPerPerson }, (_, i) => `<button type="button" data-t="${i + 1}" class="${i + 1 === p.tickets ? 'on' : ''}" aria-pressed="${i + 1 === p.tickets}" aria-label="${i + 1} lodd">${i + 1}</button>`).join('');
    const numHtml = nums.map((n, i) => (n ? `<span class="tn">${n}</span>` : `<input class="tn-in" data-i="${i}" type="text" inputmode="numeric" maxlength="5" placeholder="nr." aria-label="Nummer for lodd ${i + 1} til ${esc(p.name)}">`)).join('<span class="tn-sep">·</span>');
    const badge = nums[0] || p.nums.find(Boolean) || '?';
    const pay = p.paid
      ? `<button type="button" class="pay on" data-pay aria-pressed="true"><span class="pay-ico">✓</span> Betalt ${sum} kr</button>`
      : (missing
        ? '<button type="button" class="pay is-blocked" data-pay aria-disabled="true">Velg nummer først</button>'
        : `<button type="button" class="pay" data-pay aria-pressed="false">Bekreft betalt <span class="pay-sum">${sum} kr</span></button>`);
    return `<li class="ci${p.paid ? ' is-paid' : ''}${missing ? ' is-missing' : ''}${p.id === justPaid ? ' just-paid' : ''}" data-id="${p.id}">
      <span class="ci-num${badge === '?' ? ' is-q' : ''}">${badge}</span>
      <div class="ci-info"><b>${esc(p.name)}</b><div class="ci-nums"><span class="tn-lbl">Lodd</span>${numHtml}</div></div>
      <div class="ci-ctrls"><div class="seg" role="group" aria-label="Antall lodd for ${esc(p.name)}">${seg}</div>${pay}</div>
    </li>`;
  }
  function list() {
    const all = Store.active;
    const shown = all
      .filter((p) => filter === 'all' || (filter === 'paid' ? p.paid : !p.paid))
      .filter((p) => !q || u.normName(p.name).includes(q) || p.nums.some((n) => n && String(n).startsWith(q)));
    $('#ciList').innerHTML = shown.map(row).join('');
    justPaid = null;
    const empty = $('#ciEmpty');
    empty.hidden = shown.length > 0;
    if (!all.length) empty.innerHTML = '<b>Ingen passasjerer ennå.</b>Legg til den første nederst – navn og nummer huskes til neste fredag.';
    else if (q) empty.innerHTML = `<b>Fant ingen «${esc(q)}».</b>Legg til som ny passasjer nederst?`;
    else if (filter === 'unpaid') empty.innerHTML = '<b>Alle har betalt 🎉</b>Båten kan gå når dere er klare.';
    else empty.innerHTML = '<b>Ingen har betalt ennå.</b>Trykk «Bekreft betalt» når noen har vippset.';
    const paused = Store.totals().paused;
    const pz = $('#ciPaused');
    pz.hidden = !paused;
    pz.innerHTML = `${paused} på pause vises ikke her. <a href="passasjerer.html">Endre under Passasjerer</a>.`;
    if (focusSel) { const el = document.querySelector(focusSel); if (el) el.focus({ preventScroll: true }); focusSel = null; }
  }
  function render() { bar(); list(); }
  function saveNum(inp) {
    const li = inp.closest('.ci');
    const v = inp.value.trim();
    if (!li || !v) return;
    const res = Store.setNum(li.dataset.id, +inp.dataset.i, v);
    if (!res.ok) { u.toast(res.msg); inp.select(); return; }
    focusSel = `.ci[data-id="${li.dataset.id}"] .tn-in, .ci[data-id="${li.dataset.id}"] [data-pay]`;
  }

  const listEl = $('#ciList');
  listEl.addEventListener('click', (e) => {
    const li = e.target.closest('.ci');
    if (!li) return;
    const id = li.dataset.id;
    const t = e.target.closest('[data-t]');
    if (t) { focusSel = `.ci[data-id="${id}"] [data-t="${t.dataset.t}"]`; Store.setTickets(id, +t.dataset.t); return; }
    if (e.target.closest('[data-pay]')) {
      const p = Store.active.find((x) => x.id === id);
      if (!p) return;
      const willPay = !p.paid;
      justPaid = willPay ? id : null;
      focusSel = `.ci[data-id="${id}"] [data-pay]`;
      const res = Store.setPaid(id, willPay);
      if (!res.ok) { justPaid = null; focusSel = null; u.toast(res.msg); const inp = li.querySelector('.tn-in'); if (inp) inp.focus(); }
    }
  });
  listEl.addEventListener('change', (e) => { if (e.target.classList.contains('tn-in')) saveNum(e.target); });
  listEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.classList.contains('tn-in')) { e.preventDefault(); saveNum(e.target); } });
  $('#ciFilter').addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]');
    if (!b) return;
    filter = b.dataset.f;
    u.$$('#ciFilter button').forEach((x) => x.classList.toggle('on', x === b));
    list();
  });
  $('#ciSearch').addEventListener('input', (e) => { q = u.normName(e.target.value); list(); });
  FL.Shell.bindAddForm($('#ciAdd'), $('#ciAddNums'), $('#ciAddNote'));

  render();
  Store.subscribe(render);
})();
