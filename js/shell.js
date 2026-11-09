/* Fredagslotteriet – felles ramme for alle sider: toppmeny, bunntekst, innstillinger og dialoger */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u, Store = FL.Store;
  const { $, esc } = u;
  const NAV = [
    { id: 'pamelding', href: 'pamelding.html', label: 'Påmelding' },
    { id: 'trekning', href: 'trekning.html', label: 'Trekning' },
    { id: 'historikk', href: 'historikk.html', label: 'Skipsloggen' },
    { id: 'passasjerer', href: 'passasjerer.html', label: 'Passasjerer' },
    { id: 'regler', href: 'regler.html', label: 'Regler' },
  ];
  const page = document.body.dataset.page || 'hjem';

  function nextLabel() {
    const f = u.nextFriday();
    const today = u.sameDay(f, new Date());
    const time = Store.settings.drawTime ? ` kl. ${Store.settings.drawTime}` : '';
    return { text: (today ? 'i dag' : u.dfShort.format(f)) + time, long: (today ? 'i dag' : u.dfLong.format(f).replace(/ \d{4}$/, '')) + time, today };
  }

  function renderHeader() {
    const bar = $('#topbar');
    if (!bar) return;
    bar.innerHTML = `
      <a class="brand" href="index.html" aria-label="Fredagslotteriet – forsiden">
        <svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="none" stroke="currentColor" stroke-opacity=".25"/><path d="M7 24 L31 23.4 Q35 24 36 26.5 L33.5 30 L8.5 30 Z" fill="#f3ecdf"/><path d="M14 23.6 L14 17.5 Q14 16.5 15 16.5 L26 16.5 Q28 16.5 29.5 18.4 L31.6 23.4 Z" fill="#f3ecdf"/><path d="M7 27 L35.2 26.4 L34.6 27.6 L7 28.2 Z" fill="#ee4a2f"/><circle cx="28" cy="10" r="2.6" fill="#5ef2b5"/></svg>
        <span class="brand-name">Fredags<em>lotteriet</em></span>
      </a>
      <nav class="nav" aria-label="Hovedmeny">${NAV.map((n) => `<a href="${n.href}"${n.id === page ? ' class="is-active" aria-current="page"' : ''}>${n.label}</a>`).join('')}</nav>
      <div class="topbar-right">
        <span class="next-pill"><span class="dot"></span><span id="nextPill"></span></span>
        <button class="icon-btn" id="settingsBtn" type="button" aria-label="Innstillinger" title="Innstillinger"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/></svg></button>
      </div>`;
    const onScroll = () => bar.classList.toggle('is-scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  function renderPill() {
    const el = $('#nextPill');
    if (!el) return;
    const n = nextLabel();
    el.textContent = 'Neste avgang: ' + n.text;
    el.parentElement.classList.toggle('is-today', n.today);
  }
  function renderFooter() {
    const f = $('#footer');
    if (!f) return;
    f.innerHTML = `<div class="wrap"><p class="footer-mark" aria-hidden="true">Fredagslotteriet</p>
      <div class="footer-row"><p>Ingen ekte passasjerer ble skadet under trekningen.<br>Premiene er flasker med urelatert innhold.</p>
      <p>Laget i Bodø med havsalt, nordlys og en sunn mistillit til Hurtigruta.</p></div></div>`;
  }
  function renderDialogs() {
    document.body.insertAdjacentHTML('beforeend', `
      <dialog class="dlg" id="settingsDlg"><form method="dialog" class="dlg-body" id="settingsForm">
        <h3>Innstillinger</h3>
        <div class="dlg-grid">
          <label class="field"><span class="field-label">Pris per lodd (kr)</span><input class="field-input" type="number" name="price" min="1" max="1000" step="1" required></label>
          <label class="field"><span class="field-label">Maks lodd per person</span><input class="field-input" type="number" name="maxPerPerson" min="1" max="4" step="1" required></label>
          <label class="field"><span class="field-label">Antall vinnere</span><input class="field-input" type="number" name="winners" min="1" max="10" step="1" required></label>
          <label class="field"><span class="field-label">Trekningstid (valgfritt)</span><input class="field-input" type="text" name="drawTime" maxlength="20" placeholder="F.eks. 14:00"></label>
          <label class="field field-wide"><span class="field-label">Vipps til (valgfritt)</span><input class="field-input" type="text" name="vipps" maxlength="60" placeholder="F.eks. Daniel · 123 45 678"></label>
          <label class="check field-wide"><input type="checkbox" name="uniqueWinners"><span>Én person kan bare vinne én gang per trekning</span></label>
        </div>
        <div class="dlg-foot">
          <button class="link-btn danger" type="button" id="wipeBtn">Slett alle data…</button>
          <div class="dlg-btns"><button class="btn btn-ghost btn-small" value="cancel" type="submit" formnovalidate>Avbryt</button><button class="btn btn-primary btn-small" value="save" type="submit">Lagre</button></div>
        </div>
      </form></dialog>
      <dialog class="dlg dlg-small" id="confirmDlg"><form method="dialog" class="dlg-body">
        <h3 id="confirmTitle">Er du sikker?</h3><p id="confirmText"></p>
        <div class="dlg-btns"><button class="btn btn-ghost btn-small" value="no" type="submit">Avbryt</button><button class="btn btn-primary btn-small" value="yes" type="submit" id="confirmOk">Ja</button></div>
      </form></dialog>
      <div class="toasts" id="toasts" aria-live="polite"></div>`);
    const dlg = $('#settingsDlg');
    const form = $('#settingsForm');
    $('#settingsBtn').addEventListener('click', () => {
      const st = Store.settings;
      form.price.value = st.price; form.maxPerPerson.value = st.maxPerPerson; form.winners.value = st.winners;
      form.drawTime.value = st.drawTime; form.vipps.value = st.vipps; form.uniqueWinners.checked = st.uniqueWinners;
      dlg.returnValue = '';
      dlg.showModal();
    });
    dlg.addEventListener('close', () => {
      if (dlg.returnValue !== 'save') return;
      Store.setSettings({ price: form.price.value, maxPerPerson: form.maxPerPerson.value, winners: form.winners.value, drawTime: form.drawTime.value, vipps: form.vipps.value, uniqueWinners: form.uniqueWinners.checked });
      u.toast('Innstillingene er lagret.');
    });
    $('#wipeBtn').addEventListener('click', async () => {
      dlg.close();
      if (await u.confirmDlg('Slette alt?', 'Passasjerregister, skipslogg og innstillinger slettes fra denne nettleseren. Last ned backup fra skipsloggen først om du vil beholde noe.', 'Slett alt')) { Store.wipe(); u.toast('Alt er slettet. Blanke ark.'); }
    });
  }
  /* Tekster som følger innstillingene, brukt på flere sider */
  function renderTexts() {
    const st = Store.settings;
    document.querySelectorAll('.js-price-num').forEach((e) => { e.textContent = st.price; });
    document.querySelectorAll('.js-max-word').forEach((e) => { e.textContent = u.numberWord(st.maxPerPerson); });
    document.querySelectorAll('.js-winners-word').forEach((e) => { e.textContent = u.numberWord(st.winners); });
    document.querySelectorAll('.js-next-long').forEach((e) => { e.textContent = nextLabel().long; });
    renderPill();
  }

  renderHeader();
  renderFooter();
  renderDialogs();
  renderTexts();
  Store.subscribe(renderTexts);

  FL.Shell = { page, nextLabel, NAV, esc };
})();
