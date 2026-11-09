/* Forsiden: nordlys, hurtigbåten og tre snarveier */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u, Store = FL.Store, A = FL.Art;
  const { $ } = u;

  function buildHero() {
    const svg = $('#heroArt');
    svg.innerHTML = `<defs>
        <linearGradient id="hSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a3d5e"/><stop offset=".3" stop-color="#0c2742"/><stop offset="1" stop-color="#061628"/></linearGradient>
        <linearGradient id="hGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e39a7d" stop-opacity=".38"/><stop offset="1" stop-color="#e39a7d" stop-opacity="0"/></linearGradient>
        <linearGradient id="hFront" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b2742" stop-opacity=".97"/><stop offset="1" stop-color="#061628"/></linearGradient>
      </defs>
      <g class="hp hp-stars">${A.stars(77, 110, 1600, 560)}</g>
      <g class="hp hp-far">${A.mountainLayer(131, { base: 646, amp: 250, step: 14, top: '#8a98c8', mid: 0.3, color: '#2c3a6a', bottom: '#1e2b55', rim: '#d5e0ff', rimO: 0.35, sharp: 1.75 })}</g>
      <g class="hp hp-mid">${A.mountainLayer(232, { base: 656, amp: 150, step: 18, top: '#4a5b8e', mid: 0.4, color: '#17244a', bottom: '#111d3d', sharp: 1.3, jag: 0.5 })}</g>
      <rect x="0" y="640" width="1600" height="260" fill="url(#hSea)"/>
      <rect x="0" y="640" width="1600" height="60" fill="url(#hGlow)"/>
      <g class="hp hp-isl">${A.islands(333, { base: 690, count: 5 })}</g>
      <g class="hp hp-waves">${A.waveLines(434, { y0: 650, y1: 780, rows: 10, alpha: 0.9 })}</g>
      <g class="hero-boat"><g transform="translate(0 792) scale(.6)"><g class="hero-bob">${A.boatWake()}${A.boatBack(5)}${A.boatRails()}</g></g></g>
      <path d="M0 800 ${Array.from({ length: 20 }, () => 'q20 -5 40 0 t40 0').join(' ')} L1600 900 L0 900 Z" fill="url(#hFront)"/>
      <g class="hp hp-near">${A.waveLines(535, { y0: 808, y1: 895, rows: 6 })}</g>`;
    const hero = $('.hero');
    let mx = 0, sy = 0, raf = 0;
    const apply = () => { raf = 0; hero.style.setProperty('--mx', mx.toFixed(3)); hero.style.setProperty('--sy', sy.toFixed(1)); };
    const queue = () => { if (!raf) raf = requestAnimationFrame(apply); };
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      hero.addEventListener('pointermove', (e) => { const r = hero.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - 0.5; queue(); });
      window.addEventListener('scroll', () => { sy = Math.min(window.scrollY, 1200); queue(); }, { passive: true });
    }
  }
  function renderCards() {
    const t = Store.totals();
    $('#hcPam').textContent = !t.people ? 'Legg inn de faste passasjerene' : (t.paidPeople ? `${t.paidPeople} av ${t.people} har betalt` : `${t.people} passasjerer · ingen har betalt ennå`);
    $('#hcTrek').textContent = t.tickets ? `${t.tickets} lodd · ${u.kr(t.pot)} i potten` : 'Hurtigbåten til Bodø';
    const last = Store.lastRecord();
    $('#hcHist').textContent = last ? `Sist: ${Store.winnerNames(last).join(', ')}` : 'Ingen trekninger ennå';
  }
  buildHero();
  renderCards();
  Store.subscribe(renderCards);
})();
