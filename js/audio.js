/* Fredagslotteriet – lyd, syntetisert med WebAudio (ingen lydfiler) */
(function () {
  'use strict';
  const FL = window.FL;
  let ctx = null, master = null, noiseBuf = null, sea = null, storm = null;
  let enabled = true;

  function ensure() {
    if (!enabled) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const now = () => ctx.currentTime;
  function env(g, t, a, peak, hold, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  }
  function osc(type, freq, t, dur, peak = 0.3, dest = master) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    env(g, t, 0.01, peak, Math.max(0, dur - 0.05), 0.08);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + dur + 0.2);
    return o;
  }
  function noise(t, dur, { type = 'bandpass', f0 = 1200, f1 = 300, q = 0.8, peak = 0.4, a = 0.01 } = {}) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    env(g, t, a, peak, dur * 0.2, dur * 0.8);
    s.connect(f).connect(g).connect(master);
    s.start(t); s.stop(t + dur + 0.3);
  }

  const S = {
    horn(len = 1.6, vol = 0.32) { // Hurtigruta-tut: to dype sagtenner gjennom lavpass
      if (!ensure()) return;
      const t = now();
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 2;
      const g = ctx.createGain(); env(g, t, 0.12, vol, len, 0.5);
      lp.connect(g).connect(master);
      [92.5, 138.6, 185].forEach((fq, i) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fq; o.detune.value = i * 4 - 4;
        o.connect(lp); o.start(t); o.stop(t + len + 0.8);
      });
    },
    toot() { S.horn(0.45, 0.22); },
    ding() { // høyttaler-pling
      if (!ensure()) return;
      const t = now();
      [[1046.5, 0], [784, 0.32]].forEach(([fq, dt]) => { osc('sine', fq, t + dt, 0.9, 0.18); osc('sine', fq * 2, t + dt, 0.4, 0.04); });
    },
    splash(big = 1) { if (!ensure()) return; const t = now(); noise(t, 0.7 * big, { f0: 2200, f1: 260, q: 0.6, peak: 0.45 * big }); noise(t + 0.05, 0.4, { type: 'lowpass', f0: 500, f1: 120, peak: 0.3 }); },
    thud() { if (!ensure()) return; const t = now(); const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.18); env(g, t, 0.005, 0.5, 0.02, 0.2); o.connect(g).connect(master); o.start(t); o.stop(t + 0.35); },
    whoosh() { if (!ensure()) return; noise(now(), 0.9, { type: 'bandpass', f0: 300, f1: 2400, q: 1.2, peak: 0.25, a: 0.3 }); },
    launch() { // Glimt-hjulet skyter en kule til værs: stigende plystring og et sus
      if (!ensure()) return;
      const t = now();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(1500, t + 0.24);
      env(g, t, 0.005, 0.15, 0.08, 0.14); o.connect(g).connect(master); o.start(t); o.stop(t + 0.5);
      noise(t, 0.4, { type: 'bandpass', f0: 700, f1: 3400, q: 1.4, peak: 0.12 });
    },
    screech() { // ørneskrik
      if (!ensure()) return;
      const t = now();
      for (let i = 0; i < 3; i++) {
        const o = ctx.createOscillator(), g = ctx.createGain(), t0 = t + i * 0.16;
        o.type = 'sawtooth'; o.frequency.setValueAtTime(2300, t0); o.frequency.exponentialRampToValueAtTime(1400, t0 + 0.12);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 3;
        env(g, t0, 0.01, 0.18, 0.05, 0.08); o.connect(bp).connect(g).connect(master); o.start(t0); o.stop(t0 + 0.25);
      }
    },
    gull() { if (!ensure()) return; const t = now(); [0, 0.22].forEach((dt) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(1500, t + dt); o.frequency.linearRampToValueAtTime(900, t + dt + 0.18); env(g, t + dt, 0.01, 0.16, 0.08, 0.1); o.connect(g).connect(master); o.start(t + dt); o.stop(t + dt + 0.3); }); },
    hic() { if (!ensure()) return; const t = now(); const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.setValueAtTime(380, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.08); env(g, t, 0.005, 0.1, 0.03, 0.06); o.connect(g).connect(master); o.start(t); o.stop(t + 0.2); },
    blub() { if (!ensure()) return; const t = now(); for (let i = 0; i < 4; i++) { const t0 = t + i * 0.14, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(220 + i * 40, t0); o.frequency.exponentialRampToValueAtTime(700 + i * 80, t0 + 0.09); env(g, t0, 0.005, 0.2, 0.02, 0.07); o.connect(g).connect(master); o.start(t0); o.stop(t0 + 0.18); } },
    pop() { if (!ensure()) return; osc('sine', 660, now(), 0.08, 0.12); },
    love() { if (!ensure()) return; const t = now(); [659, 784, 988].forEach((fq, i) => osc('triangle', fq, t + i * 0.12, 0.25, 0.12)); },
    sick() { if (!ensure()) return; const t = now(); const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(220, t); o.frequency.linearRampToValueAtTime(110, t + 0.6); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; env(g, t, 0.05, 0.14, 0.3, 0.3); o.connect(lp).connect(g).connect(master); o.start(t); o.stop(t + 0.8); },
    wind() { if (!ensure()) return; noise(now(), 1.6, { type: 'bandpass', f0: 400, f1: 1600, q: 2, peak: 0.3, a: 0.4 }); },
    sparkle() { if (!ensure()) return; const t = now(); [1568, 1976, 2349, 2637, 3136].forEach((fq, i) => osc('sine', fq, t + i * 0.07, 0.3, 0.05)); },
    roll(dur = 2) { if (!ensure()) return; const t = now(); for (let i = 0; i < dur * 18; i++) noise(t + i / 18, 0.05, { type: 'bandpass', f0: 260, f1: 180, q: 1, peak: 0.07 + (i / (dur * 18)) * 0.18 }); noise(t + dur, 0.5, { type: 'lowpass', f0: 300, f1: 80, peak: 0.5 }); },
    fanfare() { if (!ensure()) return; const t = now(); [[523, 0], [659, 0.14], [784, 0.28], [1046, 0.42], [784, 0.62], [1046, 0.76]].forEach(([fq, dt], i) => { osc('triangle', fq, t + dt, i === 5 ? 0.9 : 0.16, 0.16); osc('sawtooth', fq / 2, t + dt, i === 5 ? 0.9 : 0.16, 0.035); }); },
    boom() { if (!ensure()) return; const t = now(); noise(t, 0.9, { type: 'lowpass', f0: 900, f1: 60, peak: 0.35 }); noise(t + 0.05, 1.2, { type: 'highpass', f0: 4000, f1: 2000, peak: 0.05, a: 0.1 }); },
    flap() { if (!ensure()) return; noise(now(), 0.035, { type: 'highpass', f0: 3500, f1: 2500, peak: 0.08 }); },
    roar() { // Kraken
      if (!ensure()) return;
      const t = now();
      const lp = ctx.createBiquadFilter(), g = ctx.createGain();
      lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 6;
      env(g, t, 0.15, 0.32, 0.9, 0.7);
      lp.connect(g).connect(master);
      [['sawtooth', 70, 38], ['square', 73, 36]].forEach(([type, f0, f1]) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + 1.6); o.connect(lp); o.start(t); o.stop(t + 2); });
      noise(t, 1.6, { type: 'lowpass', f0: 500, f1: 90, q: 1, peak: 0.25, a: 0.2 });
    },
    wail() { // Draugens skrik
      if (!ensure()) return;
      const t = now();
      const o = ctx.createOscillator(), g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(980, t + 0.5); o.frequency.linearRampToValueAtTime(420, t + 2.2);
      vib.frequency.value = 7; vg.gain.value = 22; vib.connect(vg).connect(o.frequency);
      env(g, t, 0.2, 0.16, 1.4, 0.7);
      o.connect(g).connect(master); o.start(t); vib.start(t); o.stop(t + 2.6); vib.stop(t + 2.6);
      noise(t, 2.2, { type: 'bandpass', f0: 1800, f1: 700, q: 4, peak: 0.08, a: 0.3 });
    },
    thunder() {
      if (!ensure()) return;
      const t = now();
      noise(t, 0.25, { type: 'highpass', f0: 3000, f1: 1200, peak: 0.35 });
      noise(t + 0.05, 2.8, { type: 'lowpass', f0: 600, f1: 50, q: 0.7, peak: 0.55, a: 0.08 });
    },
    heartbeat() {
      if (!ensure()) return;
      const t = now();
      [0, 0.22].forEach((dt) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(60, t + dt); o.frequency.exponentialRampToValueAtTime(38, t + dt + 0.15); env(g, t + dt, 0.005, 0.55, 0.03, 0.15); o.connect(g).connect(master); o.start(t + dt); o.stop(t + dt + 0.3); });
    },
    boing() { if (!ensure()) return; const t = now(); const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(620, t + 0.18); env(g, t, 0.005, 0.2, 0.06, 0.15); o.connect(g).connect(master); o.start(t); o.stop(t + 0.35); },
    crunch() { if (!ensure()) return; const t = now(); for (let i = 0; i < 3; i++) noise(t + i * 0.06, 0.06, { type: 'bandpass', f0: 2500 - i * 400, f1: 900, q: 2, peak: 0.25 }); },
    storm(on) { // regn og vind i bakgrunnen
      if (on) {
        if (!ensure() || storm) return;
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.4;
        g.gain.value = 0.07; lfo.frequency.value = 0.2; lg.gain.value = 0.04;
        lfo.connect(lg).connect(g.gain); s.connect(f).connect(g).connect(master);
        s.start(); lfo.start();
        storm = { s, lfo, g };
      } else if (storm) {
        try { storm.g.gain.setTargetAtTime(0, now(), 0.4); storm.s.stop(now() + 1.5); storm.lfo.stop(now() + 1.5); } catch (e) { /* allerede stoppet */ }
        storm = null;
      }
    },
    sea(on) { // havsus i bakgrunnen
      if (on) {
        if (!ensure() || sea) return;
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        s.buffer = noiseBuf; s.loop = true; f.type = 'lowpass'; f.frequency.value = 420;
        g.gain.value = 0.05; lfo.frequency.value = 0.13; lg.gain.value = 0.035;
        lfo.connect(lg).connect(g.gain); s.connect(f).connect(g).connect(master);
        s.start(); lfo.start();
        sea = { s, lfo, g };
      } else if (sea) {
        try { sea.g.gain.setTargetAtTime(0, now(), 0.3); sea.s.stop(now() + 1); sea.lfo.stop(now() + 1); } catch (e) { /* allerede stoppet */ }
        sea = null;
      }
    },
  };

  FL.Audio = {
    ...S,
    unlock() { ensure(); },
    get enabled() { return enabled; },
    setEnabled(v) { enabled = !!v; if (!enabled) { S.sea(false); S.storm(false); if (ctx) ctx.suspend(); } else if (ctx) ctx.resume(); },
  };
})();
