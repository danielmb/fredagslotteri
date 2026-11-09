/* Fredagslotteriet – partikler på canvas (plask, bobler, gnister, konfetti, fyrverkeri) */
(function () {
  'use strict';
  const FL = window.FL;
  const VW = 1600, VH = 900;

  class FX {
    constructor(canvas) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.parts = [];
      this.map = { s: 1, ox: 0, oy: 0 };
      this.dpr = 1;
      this.worldOffset = () => 0; // skjermX = verdenX + offset
      this.resize();
      if ('ResizeObserver' in window) new ResizeObserver(() => this.resize()).observe(canvas);
    }
    resize() {
      const r = this.c.getBoundingClientRect();
      if (!r.width || !r.height) return;
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.c.width = Math.round(r.width * this.dpr);
      this.c.height = Math.round(r.height * this.dpr);
      const s = Math.max(r.width / VW, r.height / VH); // samme som preserveAspectRatio="xMidYMid slice"
      this.map = { s, ox: (r.width - VW * s) / 2, oy: (r.height - VH * s) / 2 };
    }
    add(p) {
      if (this.parts.length > 1400) return;
      this.parts.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, life: 1, age: 0, size: 3, color: '#fff', kind: 'dot', world: false, drag: 0, rot: 0, vr: 0 }, p));
    }
    splash(x, y, n = 26, world = true) {
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
        const sp = 140 + Math.random() * 300;
        this.add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 900, life: 0.7 + Math.random() * 0.5, size: 2 + Math.random() * 3.5, color: Math.random() < 0.6 ? '#e8f6ff' : '#9fd6ff', world });
      }
      for (let i = 0; i < 3; i++) this.add({ x, y: y + 4, kind: 'ring', life: 1.1 + i * 0.25, size: 10 + i * 6, color: '#dcefff', world, age: -i * 0.12 });
    }
    bubbles(x, y, n = 10, world = true) {
      for (let i = 0; i < n; i++) this.add({ x: x + (Math.random() - 0.5) * 30, y, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 60, life: 1 + Math.random() * 1.2, size: 2 + Math.random() * 4, kind: 'bubble', color: '#cfeeff', world, age: -Math.random() * 0.8 });
    }
    sparkles(x, y, n = 18, color = '#c8ffe6', world = false) {
      for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 120; this.add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 1.5, life: 0.8 + Math.random() * 0.8, size: 1.5 + Math.random() * 2.5, kind: 'star', color, world }); }
    }
    drops(x, y, n = 20, color = '#9fd6ff', world = false) {
      for (let i = 0; i < n; i++) this.add({ x: x + (Math.random() - 0.5) * 20, y, vx: (Math.random() - 0.5) * 80, vy: 40 + Math.random() * 120, g: 900, life: 0.6 + Math.random() * 0.4, size: 2 + Math.random() * 2.5, color, world });
    }
    confetti(n = 160) {
      const cols = ['#ee4a2f', '#f6bd47', '#5ef2b5', '#8a7dff', '#f3ecdf', '#4f7dff', '#ff8fb1'];
      for (let i = 0; i < n; i++) this.add({ x: Math.random() * VW, y: -20 - Math.random() * 300, vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 160, g: 40, drag: 0.4, life: 4 + Math.random() * 2, size: 5 + Math.random() * 6, kind: 'paper', color: cols[i % cols.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12 });
    }
    firework(x, y) {
      const cols = [['#f6bd47', '#fff1c4'], ['#5ef2b5', '#d6fff0'], ['#ee4a2f', '#ffd0c4'], ['#8a7dff', '#e2ddff'], ['#4f9dff', '#d7e9ff']];
      const [c1, c2] = cols[Math.floor(Math.random() * cols.length)];
      const n = 70;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, sp = 120 + Math.random() * 190; this.add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 110, drag: 1.1, life: 1.2 + Math.random() * 0.8, size: 2 + Math.random() * 1.8, kind: 'spark', color: Math.random() < 0.5 ? c1 : c2 }); }
      this.add({ x, y, kind: 'flash', life: 0.35, size: 90, color: c2 });
    }
    clear() { this.parts = []; }
    update(dtMs) {
      const dt = Math.min(0.05, dtMs / 1000);
      const { ctx } = this;
      const { s, ox, oy } = this.map;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.c.width, this.c.height);
      if (!this.parts.length) return;
      ctx.setTransform(this.dpr * s, 0, 0, this.dpr * s, this.dpr * ox, this.dpr * oy);
      const wo = this.worldOffset();
      const keep = [];
      for (const p of this.parts) {
        p.age += dt;
        if (p.age < 0) { keep.push(p); continue; }
        if (p.age > p.life) continue;
        p.vy += p.g * dt;
        if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        const t = p.age / p.life;
        const x = p.world ? p.x + wo : p.x;
        ctx.globalAlpha = Math.max(0, 1 - t * t);
        if (p.kind === 'ring') {
          ctx.globalAlpha = Math.max(0, 0.7 * (1 - t));
          ctx.strokeStyle = p.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(x, p.y, p.size + t * 50, (p.size + t * 50) * 0.22, 0, 0, Math.PI * 2); ctx.stroke();
        } else if (p.kind === 'bubble') {
          ctx.strokeStyle = p.color; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(x + Math.sin(p.age * 6) * 3, p.y, p.size, 0, Math.PI * 2); ctx.stroke();
        } else if (p.kind === 'paper') {
          ctx.save(); ctx.translate(x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.rot * 1.7));
          ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66); ctx.restore();
        } else if (p.kind === 'flash') {
          const g = ctx.createRadialGradient(x, p.y, 0, x, p.y, p.size);
          g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = 0.6 * (1 - t); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        } else if (p.kind === 'star' || p.kind === 'spark') {
          ctx.fillStyle = p.color;
          const r = p.size * (p.kind === 'star' ? (0.6 + 0.4 * Math.sin(p.age * 18)) : 1);
          ctx.beginPath(); ctx.arc(x, p.y, Math.max(0.3, r), 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        }
        keep.push(p);
      }
      ctx.globalAlpha = 1;
      this.parts = keep;
    }
  }

  FL.FX = FX;
})();
