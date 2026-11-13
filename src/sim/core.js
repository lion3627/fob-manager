'use strict';
/* Core helpers. Everything hangs off one namespace so the same files run in Node and in a browser. */
(function () {
  const F = globalThis.FOB = globalThis.FOB || {};
  F.H = 3600; F.D = 86400;
  F.rnd = W => { W.rs = (W.rs + 0x6D2B79F5) | 0; let t = Math.imul(W.rs ^ (W.rs >>> 15), 1 | W.rs); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  F.ri = (W, a, b) => a + Math.floor(F.rnd(W) * (b - a + 1));
  F.ch = (W, p) => F.rnd(W) < p;
  F.pick = (W, a) => a[Math.floor(F.rnd(W) * a.length)];
  F.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  F.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  F.p2 = n => String(Math.floor(n)).padStart(2, '0');
  F.hour = t => Math.floor((t % F.D) / 3600);
  F.clock = t => 'D' + (Math.floor(t / F.D) + 1) + ' ' + F.p2(F.hour(t)) + F.p2((t % 3600) / 60);
  F.clockS = t => F.clock(t) + ':' + F.p2(t % 60);
  F.isNight = t => { const h = F.hour(t); return h >= 19 || h < 5; };
  F.grid = p => String(Math.round(p.x / 100)).padStart(3, '0') + ' ' + String(Math.round(p.y / 100)).padStart(3, '0');
  F.dur = s => s >= 3600 ? Math.floor(s / 3600) + ' h ' + F.p2((s % 3600) / 60) + ' min' : Math.round(s / 60) + ' min';
  /* Causal event log: every entry may name the event that caused it. */
  F.ev = (W, type, text, data, cause) => { const e = { id: W.nid++, t: W.t, type, text, data: data || null, cause: cause == null ? null : cause }; W.events.push(e); if (W.events.length > 5000) W.events.splice(0, 1000); return e.id; };
  /* Decision trace: who decided what, and on what grounds. */
  F.trace = (W, actor, text, why, cause) => { const d = { id: W.nid++, t: W.t, actor, text, why: why || '', cause: cause == null ? null : cause }; W.decisions.push(d); if (W.decisions.length > 1500) W.decisions.splice(0, 300); return d.id; };
  F.alive = s => s.state === 'ok';
  F.unitOk = (W, u) => u.members.filter(id => W.soldiers[id].state === 'ok');
})();
