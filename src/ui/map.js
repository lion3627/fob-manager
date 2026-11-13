'use strict';
/* One map, two sources. In observer mode it draws the world as it is. In command mode it draws only
   what the command post knows: last reports, beacons, and what the base's own cameras can see. */
(function () {
  const F = globalThis.FOB, UI = F.ui = F.ui || {};
  const cam = UI.cam = { x: 11000, y: 7000, s: 0.045, follow: null };
  let cv, ctx, col = {}, dpr = 1, Wd = 0, Ht = 0;
  const X = x => (x - cam.x) * cam.s + Wd / 2, Y = y => Ht / 2 - (y - cam.y) * cam.s;
  UI.toWorld = (px, py) => ({ x: (px - Wd / 2) / cam.s + cam.x, y: (Ht / 2 - py) / cam.s + cam.y });
  UI.readColors = () => { const cs = getComputedStyle(document.documentElement); ['map', 'ink', 'mute', 'line', 'accent', 'friend', 'host', 'ok', 'warn', 'contour', 'water', 'veg', 'raise'].forEach(k => { col[k] = cs.getPropertyValue('--' + k).trim(); }); };
  UI.initMap = el => {
    cv = el; ctx = cv.getContext('2d'); UI.readColors();
    const fit = () => { dpr = window.devicePixelRatio || 1; const r = cv.getBoundingClientRect(); Wd = r.width; Ht = r.height; cv.width = Math.round(Wd * dpr); cv.height = Math.round(Ht * dpr); };
    fit(); window.addEventListener('resize', fit); UI.fitMap = fit;
    let drag = null, pts = new Map(), pinch = 0;
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.offsetX, y: e.offsetY }); drag = { x: e.offsetX, y: e.offsetY, moved: 0 }; if (pts.size === 2) { const a = [...pts.values()]; pinch = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); } });
    cv.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; const p = pts.get(e.pointerId), dx = e.offsetX - p.x, dy = e.offsetY - p.y; pts.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      if (pts.size === 2) { const a = [...pts.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); if (pinch) zoom(d / pinch, (a[0].x + a[1].x) / 2, (a[0].y + a[1].y) / 2); pinch = d; return; }
      cam.x -= dx / cam.s; cam.y += dy / cam.s; if (drag) drag.moved += Math.abs(dx) + Math.abs(dy); if (drag && drag.moved > 6) cam.follow = null;
    });
    const up = e => { pts.delete(e.pointerId); pinch = 0; if (drag && drag.moved < 6 && UI.onMapClick) UI.onMapClick(UI.toWorld(e.offsetX, e.offsetY), 14 / cam.s); drag = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.offsetX, e.offsetY); }, { passive: false });
  };
  function zoom(k, px, py) { const w = UI.toWorld(px, py); cam.s = F.clamp(cam.s * k, 0.02, 6); const w2 = UI.toWorld(px, py); cam.x += w.x - w2.x; cam.y += w.y - w2.y; }
  UI.zoomBy = k => zoom(k, Wd / 2, Ht / 2);
  UI.look = (p, s) => { cam.x = p.x; cam.y = p.y; if (s) cam.s = s; };

  const text = (t, x, y, c, f, al) => { ctx.font = f || '11px "B612 Mono", ui-monospace, monospace'; ctx.textAlign = al || 'left'; ctx.lineWidth = 3; ctx.strokeStyle = col.map; ctx.strokeText(t, x, y); ctx.fillStyle = c || col.ink; ctx.fillText(t, x, y); };
  function terrain(W) {
    ctx.fillStyle = col.map; ctx.fillRect(0, 0, Wd, Ht);
    const km = cam.s * 1000; if (km > 18) { ctx.strokeStyle = col.line; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.5; ctx.beginPath(); for (let x = 0; x <= W.map.w; x += 1000) { ctx.moveTo(X(x), Y(0)); ctx.lineTo(X(x), Y(W.map.h)); } for (let y = 0; y <= W.map.h; y += 1000) { ctx.moveTo(X(0), Y(y)); ctx.lineTo(X(W.map.w), Y(y)); } ctx.stroke(); ctx.globalAlpha = 1; }
    for (const z of W.map.cover) { ctx.beginPath(); ctx.arc(X(z.x), Y(z.y), z.r * cam.s, 0, 7); ctx.fillStyle = z.kind === 'village' ? col.contour : col.veg; ctx.globalAlpha = z.kind === 'village' ? 0.28 : 0.2; ctx.fill(); ctx.globalAlpha = 1; }
    for (const b of W.map.blockers) { ctx.strokeStyle = col.contour; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(X(b.x), Y(b.y), b.r * cam.s * (1 - i * 0.18), b.r * cam.s * (1 - i * 0.18) * 0.82, -0.5, 0, 7); ctx.stroke(); } text(b.name.toUpperCase(), X(b.x), Y(b.y) + 4, col.mute, '700 11px "Saira Extra Condensed", "Arial Narrow", sans-serif', 'center'); }
    ctx.lineCap = 'round'; for (const pass of [[col.ink, 4.4, 8], [col.map, 2, 6]]) { ctx.strokeStyle = pass[0]; ctx.lineWidth = Math.max(pass[1], pass[2] * cam.s); ctx.beginPath(); for (const e of W.map.edges) { const a = W.map.nodes[e[0]], b = W.map.nodes[e[1]]; ctx.moveTo(X(a.x), Y(a.y)); ctx.lineTo(X(b.x), Y(b.y)); } ctx.stroke(); }
    for (const id in W.map.nodes) { const n = W.map.nodes[id]; if (n.kind === 'fob' && cam.s > 0.6) continue; ctx.fillStyle = n.kind === 'fob' ? col.friend : col.map; ctx.strokeStyle = col.ink; ctx.lineWidth = 1.5; ctx.beginPath(); if (n.kind === 'fob' || n.kind === 'depot') ctx.rect(X(n.x) - 6, Y(n.y) - 6, 12, 12); else ctx.arc(X(n.x), Y(n.y), 4, 0, 7); ctx.fill(); ctx.stroke(); text(n.name.toUpperCase(), X(n.x) + 10, Y(n.y) - 8, col.ink, '700 13px "Saira Extra Condensed", "Arial Narrow", sans-serif'); }
  }
  function base(W, truth) { // the base close up: wall, facilities, tank levels
    if (cam.s < 0.6) return; const f = W.map.nodes.fob, L = F.FOBLAY, h = L.half;
    ctx.fillStyle = col.map; ctx.fillRect(X(f.x - h.x), Y(f.y + h.y), 2 * h.x * cam.s, 2 * h.y * cam.s);
    ctx.strokeStyle = col.ink; ctx.lineWidth = 3; ctx.strokeRect(X(f.x - h.x), Y(f.y + h.y), 2 * h.x * cam.s, 2 * h.y * cam.s);
    const box = (k, w, hh, label, fill) => { const p = L[k], x = X(f.x + p.x - w / 2), y = Y(f.y + p.y + hh / 2); ctx.fillStyle = col.raise; ctx.strokeStyle = col.ink; ctx.lineWidth = 1; ctx.fillRect(x, y, w * cam.s, hh * cam.s); if (fill != null) { ctx.fillStyle = col.accent; ctx.globalAlpha = 0.45; ctx.fillRect(x, y + hh * cam.s * (1 - fill), w * cam.s, hh * cam.s * fill); ctx.globalAlpha = 1; } ctx.strokeRect(x, y, w * cam.s, hh * cam.s); text(label, x + 2, y - 3, col.mute, '9px "B612 Mono", monospace'); };
    const S = W.stores, lv = (a, c) => F.clamp(a / c, 0, 1), ls = W.hq.logstat, kn = (ty, cap) => truth ? null : ls ? lv(ls.on[ty], cap) : 0;
    box('toc', 22, 14, 'OPS'); box('aid', 16, 12, 'AID'); box('tents', 60, 14, 'TENTS'); box('motor', 50, 16, 'MOTOR POOL');
    box('fuel', 22, 12, 'FUEL', truth ? lv(F.qty(S.fuelA, 'JP8') + F.qty(S.fuelB, 'JP8'), 3800) : kn('JP8', 3800)); box('water', 14, 12, 'WATER', truth ? lv(F.qty(S.water, 'WATER'), 3000) : kn('WATER', 3000));
    box('rations', 14, 12, 'RATIONS', truth ? lv(F.qty(S.rations, 'MRE'), 1800) : kn('MRE', 1800)); box('asp', 20, 14, 'AMMO', truth ? lv(F.kgOf(S.asp), 2500) : null); box('yard', 16, 12, 'YARD', truth ? lv(F.qty(S.yard, 'CL4'), 100) : kn('CL4', 100));
    const P = W.fob.project, w = L.work; ctx.setLineDash(P.done ? [] : [4, 3]); ctx.strokeStyle = P.done ? col.ink : col.accent; ctx.strokeRect(X(f.x + w.x - 6), Y(f.y + w.y + 6), 12 * cam.s, 12 * cam.s); ctx.setLineDash([]); text(P.done ? 'TOWER 3' : 'TOWER 3 ' + Math.round(P.doneH / P.needH * 100) + '%', X(f.x + w.x - 6), Y(f.y + w.y + 6) - 3, col.accent, '9px "B612 Mono", monospace');
    L.posts.forEach(p => { ctx.fillStyle = col.ink; ctx.fillRect(X(f.x + p.x) - 4, Y(f.y + p.y) - 4, 8, 8); });
  }
  function vehicles(W) { for (const id in W.vehicles) { const v = W.vehicles[id], x = X(v.pos.x), y = Y(v.pos.y); if (x < -20 || y < -20 || x > Wd + 20 || y > Ht + 20) continue; const w = Math.max(7, 6 * cam.s), h = Math.max(4, 2.6 * cam.s); ctx.fillStyle = v.status === 'ok' ? col.friend : col.warn; ctx.globalAlpha = v.unit ? 1 : 0.55; ctx.fillRect(x - w / 2, y - h / 2, w, h); ctx.globalAlpha = 1; if (cam.s > 0.5) text(v.name + ' ' + Math.round(F.qty(W.stores[v.tank], 'JP8')) + 'L', x + w / 2 + 3, y + 3, col.mute, '9px "B612 Mono", monospace'); } }
  function soldiers(W) {
    const r = F.clamp(cam.s * 1.6, 1.6, 4.5);
    for (const id in W.soldiers) {
      const s = W.soldiers[id]; if (s.evac) continue; const x = X(s.pos.x), y = Y(s.pos.y); if (x < -5 || y < -5 || x > Wd + 5 || y > Ht + 5) continue;
      if (s.inVeh && cam.s < 1.2) continue;
      if (s.state === 'kia') { ctx.strokeStyle = col.mute; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke(); continue; }
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = s.state === 'wia' ? col.warn : s.side === 'blue' ? col.friend : col.host; ctx.fill();
      if (s.supp > 0.5) { ctx.strokeStyle = col.warn; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, 7); ctx.stroke(); }
    }
    ctx.lineWidth = 1; for (const f of W.fx) { const a = 1 - (W.t - f.t) / 3; if (a <= 0) continue; ctx.globalAlpha = a; ctx.strokeStyle = f.side === 'blue' ? col.friend : col.host; ctx.lineWidth = f.big ? 3 : 1; ctx.beginPath(); ctx.moveTo(X(f.ax), Y(f.ay)); ctx.lineTo(X(f.bx), Y(f.by)); ctx.stroke(); } ctx.globalAlpha = 1;
  }
  function frame(x, y, label, c, dashed, sub, sel) { ctx.font = '700 10px "B612 Mono", monospace'; const w = Math.max(34, ctx.measureText(label).width + 10); ctx.fillStyle = col.map; ctx.strokeStyle = c; ctx.lineWidth = sel ? 3 : 1.7; ctx.setLineDash(dashed ? [4, 3] : []); ctx.fillRect(x - w / 2, y - 8, w, 16); ctx.strokeRect(x - w / 2, y - 8, w, 16); ctx.setLineDash([]); ctx.fillStyle = c; ctx.textAlign = 'center'; ctx.fillText(label, x, y + 3.5); if (sub) text(sub, x, y + 20, col.mute, '9px "B612 Mono", monospace', 'center'); }
  function truthLayer(W) {
    vehicles(W); soldiers(W);
    for (const id in W.units) {
      const u = W.units[id]; if (u.kind === 'hq' || u.kind === 'support') continue; const ok = F.unitOk(W, u).length; if (!ok && u.side === 'red') continue;
      const x = X(u.pos.x), y = Y(u.pos.y) - 16 - Math.min(18, cam.s * 30), c = u.side === 'blue' ? col.friend : col.host;
      if (u.side === 'blue' && UI.showLinks && !F.atFob(W, u.pos) && (u.plan || u.con)) { const l = F.link(W, u), f = W.map.nodes.fob; ctx.strokeStyle = l ? col.ok : col.host; ctx.lineWidth = 1; ctx.setLineDash(l === 'voice' ? [] : l === 'data' ? [2, 5] : [1, 8]); ctx.beginPath(); ctx.moveTo(X(u.pos.x), Y(u.pos.y)); ctx.lineTo(X(f.x), Y(f.y)); ctx.stroke(); ctx.setLineDash([]); }
      if (F.atFob(W, u.pos) && cam.s < 0.6 && u.side === 'blue') continue;
      frame(x, y, u.side === 'blue' ? u.call : u.name.toUpperCase(), u.con ? col.host : c, false, `${ok} · ${u.con ? 'IN CONTACT' : (u.st || u.task)}`.slice(0, 44), UI.sel === id);
    }
  }
  function knownLayer(W) {
    const H = W.hq, f = W.map.nodes.fob, R = (F.isNight(W.t) ? 700 : 1300) + (W.fob.project.done ? 300 : 0);
    ctx.strokeStyle = col.friend; ctx.setLineDash([3, 5]); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(X(f.x), Y(f.y), R * cam.s, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    if (cam.s > 0.25) text('BASE CAMERAS', X(f.x), Y(f.y + R) - 4, col.friend, '9px "B612 Mono", monospace', 'center');
    for (const o of W.ops) if (o.status !== 'pending' && o.status !== 'done' && o.status !== 'aborted') { ctx.strokeStyle = col.accent; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.arc(X(o.nai.x), Y(o.nai.y), 500 * cam.s, 0, 7); ctx.stroke(); const d = W.map.nodes[o.drop]; ctx.beginPath(); ctx.moveTo(X(d.x), Y(d.y)); ctx.lineTo(X(o.op.x), Y(o.op.y)); ctx.stroke(); ctx.setLineDash([]); text('NAI 1', X(o.nai.x), Y(o.nai.y) + 4, col.accent, '700 12px "Saira Extra Condensed", "Arial Narrow", sans-serif', 'center'); text('OP', X(o.op.x) + 6, Y(o.op.y), col.accent, '9px "B612 Mono", monospace'); }
    for (const c of H.contacts) { const age = W.t - c.t; if (age > 8 * F.H) continue; const x = X(c.pos.x), y = Y(c.pos.y); ctx.globalAlpha = age > 2 * F.H ? 0.4 : age > 1800 ? 0.7 : 1; ctx.fillStyle = col.host; ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 9, y); ctx.lineTo(x, y + 9); ctx.lineTo(x - 9, y); ctx.closePath(); ctx.fill(); text(`${c.size[0]}–${c.size[1]} · ${F.clock(c.t).slice(-4)} (${F.dur(age)} ago)`, x + 13, y + 4, col.host, '700 10px "B612 Mono", monospace'); ctx.globalAlpha = 1; }
    for (const id in H.units) {
      const k = H.units[id], u = W.units[id]; if (u.kind === 'hq' || u.kind === 'support') continue; if (k.src === 'fob' && cam.s < 0.6) continue;
      const age = W.t - k.t, stale = age > 90; frame(X(k.pos.x), Y(k.pos.y) - (k.src === 'fob' ? 0 : 14), u.call, age > W.so.overdue ? col.host : col.friend, stale, k.src === 'fob' ? k.status : `${k.veh ? 'vehicles only · ' : ''}${k.src} ${stale ? F.dur(age) + ' ago' : 'now'}`, UI.sel === id);
    }
    for (const i of W.incidents) if (i.status === 'open') { ctx.strokeStyle = col.host; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(i.pos.x), Y(i.pos.y), 16 + (Date.now() / 120 % 8), 0, 7); ctx.stroke(); }
  }
  UI.draw = (W, truth) => {
    if (!ctx) return; if (cam.follow) { const u = W.units[cam.follow]; const p = truth ? (u && u.pos) : (W.hq.units[cam.follow] && W.hq.units[cam.follow].pos); if (p) { cam.x += (p.x - cam.x) * 0.2; cam.y += (p.y - cam.y) * 0.2; } }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); terrain(W); base(W, truth); if (truth) truthLayer(W); else knownLayer(W);
    const m = 1000 * cam.s, bar = m > 160 ? 100 : m > 30 ? 1000 : 5000; ctx.strokeStyle = col.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(14, Ht - 14); ctx.lineTo(14 + bar * cam.s, Ht - 14); ctx.stroke(); text(bar >= 1000 ? bar / 1000 + ' km' : bar + ' m', 14, Ht - 20, col.ink, '10px "B612 Mono", monospace');
    text(truth ? 'OBSERVER: THE WORLD AS IT IS' : 'COMMAND POST PICTURE: REPORTS, BEACONS AND BASE CAMERAS ONLY', Wd - 12, Ht - 14, truth ? col.host : col.friend, '700 10px "B612 Mono", monospace', 'right');
  };
})();
