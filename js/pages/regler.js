/* Regler og farer underveis */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u, Store = FL.Store, Ev = FL.Events;
  const { $, esc } = u;

  function renderRules() {
    const st = Store.settings;
    const W = st.winners;
    const rules = [
      `Ett lodd koster <b>${st.price} kr</b>. Betales med Vipps til ${st.vipps ? `<b>${esc(st.vipps)}</b>` : 'arrangøren'} før avgang.`,
      `Maks <b>${st.maxPerPerson} lodd</b> per person.<small>Grådighet straffes av havet.</small>`,
      'Alle har faste lodd-nummer som de har valgt selv – ett per lodd.<small>Har du valgt 7 og 70, er det dine nummer hver fredag.</small>',
      'Den som tar imot betalingen, bekrefter den før båten går.<small>Ikke bekreftet? Da blir du igjen på kaia i Sandnessjøen. Båten venter ikke.</small>',
      W === 1 ? 'Den <b>ene</b> som kommer seg helskinnet til Bodø, vinner.' : `De <b>${u.numberWord(W)}</b> som kommer seg helskinnet til Bodø, vinner. Førstemann i land velger premie først.`,
      st.uniqueWinners ? 'Én person kan bare vinne én gang per trekning.<small>Har du to lodd, er det andre et reservehjerte.</small>' : 'Har du flere lodd, kan du vinne flere ganger.<small>I teorien.</small>',
      'Vinnerne trekkes med kryptografisk tilfeldighet idet båten legger fra kai, og låses i skipsloggen.<small>Det som skjer underveis, er ren underholdning.</small>',
      'Premiene er flasker med <b>urelatert innhold</b>.<small>Fredagslotteriet har ingenting med vin å gjøre.</small>',
      'Klager rettes skriftlig til ørna.',
    ];
    $('#rules').innerHTML = rules.map((r) => `<li><span>${r}</span></li>`).join('');
  }
  function renderHazards() {
    const s = Store.stats();
    $('#hazards').innerHTML = Ev.ORDER.map((id) => {
      const e = Ev.EVENTS[id];
      const n = s.causes[id] || 0;
      return `<article class="hz" style="--hz:${e.color}"><div class="hz-ico" aria-hidden="true">${e.icon}</div><h3>${esc(e.name)}</h3><p>${esc(e.desc)}</p>
        <div class="hz-foot">${e.folk ? '<span class="tag tag-folk">Folkets innslag</span>' : '<span class="tag tag-bonus">Bonus</span>'}<span class="hz-count">☠ <b>${n}</b> ${n === 1 ? 'offer' : 'ofre'}</span></div></article>`;
    }).join('');
  }
  const render = () => { renderRules(); renderHazards(); };
  render();
  Store.subscribe(render);
})();
