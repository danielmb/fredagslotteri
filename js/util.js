/* Fredagslotteriet – hjelpefunksjoner */
(function () {
  'use strict';
  const FL = (window.FL = window.FL || {});

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---- Kryptografisk tilfeldighet (selve trekningen) ---- */
  function randU32() { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0]; }
  function randInt(n) { // uten skjevhet, 0..n-1
    if (n <= 1) return 0;
    const limit = Math.floor(0x100000000 / n) * n;
    let x;
    do { x = randU32(); } while (x >= limit);
    return x % n;
  }
  function shuffle(arr, rnd = randInt) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* ---- Seedet PRNG (kun pynt: hendelser, kunst) ---- */
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* ---- Navn ---- */
  const PALETTE = ['#ee4a2f', '#e8912c', '#20a98e', '#4f7dff', '#9466ff', '#df4f86', '#1597bd', '#b9802a', '#4fae3e', '#f0684a', '#6c7cf2', '#cf4762', '#178f7c', '#a95fd6', '#d39a12', '#3290f0'];
  const cleanName = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const normName = (s) => cleanName(s).toLowerCase();
  const colorFor = (name) => PALETTE[hashStr(normName(name)) % PALETTE.length];
  function initials(name) {
    const parts = cleanName(name).split(' ').filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  function joinNames(list) {
    if (list.length <= 1) return list.join('');
    return list.slice(0, -1).join(', ') + ' og ' + list[list.length - 1];
  }
  const WORDS = ['null', 'én', 'to', 'tre', 'fire', 'fem', 'seks', 'sju', 'åtte', 'ni', 'ti'];
  const numberWord = (n) => WORDS[n] || String(n);

  /* ---- Tall og datoer ---- */
  const nf = new Intl.NumberFormat('nb-NO');
  const kr = (n) => nf.format(Math.round(n || 0)) + ' kr';
  const dfLong = new Intl.DateTimeFormat('nb-NO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const dfShort = new Intl.DateTimeFormat('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' });
  const dfMonth = new Intl.DateTimeFormat('nb-NO', { month: 'short' });
  function nextFriday(from = new Date()) {
    const d = new Date(from);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7));
    return d;
  }
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const uid = (p = 'id') => p + '_' + Date.now().toString(36) + randU32().toString(36).slice(0, 5);

  /* ---- UI-småting ---- */
  function toast(msg, ms = 2600) {
    const box = $('#toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, ms);
  }
  function confirmDlg(title, text, okLabel = 'Ja') {
    return new Promise((resolve) => {
      const dlg = $('#confirmDlg');
      $('#confirmTitle').textContent = title;
      $('#confirmText').textContent = text;
      $('#confirmOk').textContent = okLabel;
      dlg.returnValue = '';
      dlg.addEventListener('close', () => resolve(dlg.returnValue === 'yes'), { once: true });
      dlg.showModal();
    });
  }
  const counters = new WeakMap();
  function countTo(el, value, dur = 650) {
    if (!el) return;
    const from = counters.get(el) ?? (parseFloat(String(el.textContent).replace(/\s/g, '')) || 0);
    counters.set(el, value);
    if (from === value || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = nf.format(value); return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = nf.format(Math.round(from + (value - from) * e));
      if (p < 1 && counters.get(el) === value) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function download(filename, text, type = 'application/json') {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  FL.u = { $, $$, esc, clamp, lerp, randInt, shuffle, mulberry32, hashStr, cleanName, normName, colorFor, initials, pad, joinNames, numberWord, nf, kr, dfLong, dfShort, dfMonth, nextFriday, sameDay, uid, toast, confirmDlg, countTo, download };
})();
