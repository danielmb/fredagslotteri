/* Trekningssiden: starter spillene og hovedløkka */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u, Store = FL.Store;
  const stage = document.getElementById('stage');
  const voyage = new FL.Voyage(stage);
  const board = new FL.Board(stage);
  let game = 'hurtigbat';
  FL.app = { voyage, board };

  function setGame(g) {
    game = g;
    stage.dataset.game = g;
    u.$$('.game-tab[data-game]').forEach((t) => { const on = t.dataset.game === g; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on); });
    if (g === 'lyn') {
      voyage.abort(true);
      u.$('#startOverlay').hidden = true; u.$('#endOverlay').hidden = true;
      u.$('#evWrap').innerHTML = ''; u.$('#announce').innerHTML = '';
      board.show();
    } else { board.hide(); voyage.idle(); }
  }
  u.$$('.game-tab[data-game]').forEach((t) => t.addEventListener('click', () => { if (t.dataset.game !== game) setGame(t.dataset.game); }));
  Store.subscribe(() => {
    if (game === 'hurtigbat') voyage.renderStart();
    else if (board.state === 'idle') board.show();
  });

  // reprise fra skipsloggen: trekning.html?reprise=<id>
  const rid = new URLSearchParams(location.search).get('reprise');
  const rec = rid && Store.getRecord(rid);
  if (rec && rec.game === 'hurtigbat') setTimeout(() => voyage.replay(rec), 400);

  /* hovedløkke – pauser når scenen ikke er synlig */
  const { Eng } = FL.Engine;
  let visible = true;
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { rootMargin: '120px' }).observe(stage);
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(60, now - last);
    last = now;
    if (visible || document.fullscreenElement) {
      const d = dt * Eng.speed;
      Eng.step(d);
      voyage.sc.update(d);
      voyage.tick();
      voyage.fx.update(dt * Math.min(2, Eng.speed));
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select, dialog')) return;
    if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) document.getElementById('fsBtn').click();
  });
})();
