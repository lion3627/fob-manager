'use strict';
/* FOB Kestrel simulation core. Pure logic, no DOM. State is plain JSON. */
(function (root) {
  const TICK = 5, DAY = 1440;
  const NODES = [
    { id: 'lz',  name: 'LP Dakota',          short: 'DAKOTA',   x: 6.0,  y: 0.7,  reg: 'route',  sig: 2, w: 0.10, kind: 'road',    desc: 'Link-up point with battalion logistics at the edge of the AO.' },
    { id: 'c1',  name: 'CP 1 Wadi crossing', short: 'CP 1',     x: 4.2,  y: 4.2,  reg: 'route',  sig: 2, w: 0.35, kind: 'road',    desc: 'Ford with steep banks. Vehicles slow to a crawl.' },
    { id: 'c2',  name: 'CP 2 Kessa',         short: 'KESSA',    x: 6.4,  y: 6.6,  reg: 'route',  sig: 3, w: 0.30, kind: 'village', desc: 'Market village astride Route Amber. Locals talk to patrols that stop.' },
    { id: 'c3',  name: 'CP 3 Culvert bend',  short: 'CP 3',     x: 5.2,  y: 8.6,  reg: 'route',  sig: 3, w: 0.25, kind: 'road',    desc: 'Blind bend over a culvert, 2 km short of the gate.' },
    { id: 'fob', name: 'FOB Kestrel',        short: 'KESTREL',  x: 6.2,  y: 10.2, reg: 'fob',    sig: 3, w: 0,    kind: 'fob',     desc: 'Your base. Aid station, 81mm mortars, ops center.' },
    { id: 'rdg', name: 'Hill 402',           short: 'HILL 402', x: 4.0,  y: 12.6, reg: 'near',   sig: 3, w: 0.40, kind: 'high', high: true, desc: 'Dominant ground. Sees the valley and is the best relay site.' },
    { id: 'orc', name: 'Orchards',           short: 'ORCHARDS', x: 9.2,  y: 12.0, reg: 'near',   sig: 2, w: 0.60, kind: 'close',   desc: 'Walled orchards with short sight lines.' },
    { id: 'mir', name: 'Mirab',              short: 'MIRAB',    x: 2.4,  y: 15.0, reg: 'valley', sig: 1, w: 0.40, kind: 'village', desc: 'Valley village. Radio is intermittent without a relay.' },
    { id: 'wad', name: 'North Wadi',         short: 'N. WADI',  x: 6.4,  y: 14.4, reg: 'valley', sig: 0, w: 0.25, kind: 'dead',    desc: 'Dead ground. No line of sight to the FOB.' },
    { id: 'tol', name: 'Tolan',              short: 'TOLAN',    x: 11.4, y: 14.6, reg: 'valley', sig: 1, w: 0.35, kind: 'village', desc: 'Valley village on the track to the kilns.' },
    { id: 'obC', name: 'Upper farms',        short: 'FARMS',    x: 2.0,  y: 17.2, reg: 'deep',   sig: 0, w: 0.25, kind: 'obj',     desc: 'Terraced farm compounds above Mirab.' },
    { id: 'obA', name: 'Ruins',              short: 'RUINS',    x: 6.8,  y: 16.6, reg: 'deep',   sig: 0, w: 0.30, kind: 'obj',     desc: 'Old fort ruins at the head of the wadi.' },
    { id: 'obB', name: 'Brick kilns',        short: 'KILNS',    x: 11.0, y: 16.9, reg: 'deep',   sig: 1, w: 0.30, kind: 'obj',     desc: 'Kiln yard at the end of the Tolan track.' },
    { id: 'pas', name: 'The Saddle',         short: 'SADDLE',   x: 8.8,  y: 18.3, reg: 'deep',   sig: 0, w: 0.15, kind: 'high', high: true, desc: 'Pass into the next valley. Enemy fighters and supplies arrive this way.' }
  ];
  const EDGES = [
    ['lz', 'c1', 4.5, 'road'], ['c1', 'c2', 3.6, 'road'], ['c2', 'c3', 2.6, 'road'], ['c3', 'fob', 2.1, 'road'],
    ['fob', 'rdg', 3.8, 'track'], ['fob', 'orc', 3.9, 'track'], ['c2', 'orc', 6.8, 'track'],
    ['rdg', 'mir', 3.3, 'foot'], ['rdg', 'wad', 3.4, 'foot'], ['orc', 'wad', 4.0, 'foot'], ['orc', 'tol', 3.8, 'track'],
    ['mir', 'wad', 4.4, 'foot'], ['mir', 'obC', 2.3, 'foot'], ['wad', 'obA', 2.5, 'foot'], ['tol', 'obB', 2.6, 'track'],
    ['obA', 'obB', 4.6, 'foot'], ['obA', 'obC', 5.2, 'foot'], ['obA', 'pas', 3.0, 'foot'], ['obB', 'pas', 3.0, 'foot']
  ];
  const SEGS = [
    { k: 'lz-c1', a: 'lz', b: 'c1', name: 'Dakota to CP 1' }, { k: 'c1-c2', a: 'c1', b: 'c2', name: 'CP 1 to Kessa' },
    { k: 'c2-c3', a: 'c2', b: 'c3', name: 'Kessa to CP 3' }, { k: 'c3-fob', a: 'c3', b: 'fob', name: 'CP 3 to the FOB' }
  ];
  const REG = { route: 'Route Amber', near: 'Near north', valley: 'Valley', deep: 'Deep north' };
  const OBJS = ['obA', 'obB', 'obC'];
  const N = {}, ADJ = {}, SEGK = {}, SEGN = {};
  NODES.forEach(n => { N[n.id] = n; ADJ[n.id] = []; });
  EDGES.forEach(e => { ADJ[e[0]].push({ to: e[1], km: e[2], type: e[3] }); ADJ[e[1]].push({ to: e[0], km: e[2], type: e[3] }); });
  SEGS.forEach(s => { SEGK[s.a + '>' + s.b] = s.k; SEGK[s.b + '>' + s.a] = s.k; SEGN[s.k] = s.name; });

  /* ---------- helpers ---------- */
  function rnd(S) { S.rs = (S.rs + 0x6D2B79F5) | 0; let t = Math.imul(S.rs ^ (S.rs >>> 15), 1 | S.rs); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const ri = (S, a, b) => a + Math.floor(rnd(S) * (b - a + 1));
  const ch = (S, p) => rnd(S) < p;
  const pick = (S, a) => a[Math.floor(rnd(S) * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hour = t => Math.floor((((t % DAY) + DAY) % DAY) / 60);
  const dayOf = t => Math.floor(t / DAY) + 1;
  const isNight = t => { const h = hour(t); return h >= 19 || h < 5; };
  const p2 = n => String(n).padStart(2, '0');
  const hhmm = t => { t = Math.round(t); return p2(hour(t)) + p2(((t % 60) + 60) % 60); };
  const dtg = t => 'D' + dayOf(t) + ' ' + hhmm(t);
  const grid = id => String(Math.round((40 + N[id].x) * 10)) + ' ' + String(Math.round((70 + N[id].y) * 10));
  const distKm = (a, b) => Math.hypot(N[a].x - N[b].x, N[a].y - N[b].y);
  const edge = (a, b) => ADJ[a].find(e => e.to === b);
  const sq = (S, id) => S.squads.find(s => s.id === id);
  const elById = (S, id) => S.els.find(e => e.id === id);
  const opOf = (S, el) => el.opId ? S.ops.find(o => o.id === el.opId) : null;
  const ldr = (S, el) => sq(S, el.squads[0]).ldr;
  const elStr = (S, el) => el.squads.reduce((a, id) => a + sq(S, id).str, 0);
  const avgOf = (S, el, k) => el.squads.reduce((a, id) => a + sq(S, id)[k], 0) / el.squads.length;
  const veh = el => el.mounted && el.lastType !== 'foot';
  const nodeOf = el => el.loc.at || (el.loc.done < el.loc.km / 2 ? el.loc.from : el.loc.to);

  function spd(type, mounted, night) { if (mounted && type === 'road') return 28; if (mounted && type === 'track') return 14; return night ? 3.2 : 4; }
  function path(from, to, mounted) {
    if (from === to) return [];
    const dist = {}, prev = {}, done = {};
    NODES.forEach(n => { dist[n.id] = 1e9; }); dist[from] = 0;
    for (;;) {
      let u = null, b = 1e9;
      for (const k in dist) if (!done[k] && dist[k] < b) { b = dist[k]; u = k; }
      if (u == null || u === to) break;
      done[u] = 1;
      ADJ[u].forEach(e => { const d = b + e.km / spd(e.type, mounted, false); if (d < dist[e.to]) { dist[e.to] = d; prev[e.to] = u; } });
    }
    if (dist[to] >= 1e9) return null;
    const p = []; let c = to; while (c !== from) { p.unshift(c); c = prev[c]; }
    return p;
  }

  /* ---------- logs ---------- */
  function pause(S, why) { S.speed = 0; S.pauseWhy = why || ''; }
  function tocLog(S, from, text, sev, cat, ts) {
    S.log.push({ t: S.t, ts: ts == null ? S.t : ts, from, text, sev: sev || 0, cat: cat || 'ops' });
    if (S.log.length > 500) S.log.splice(0, 100);
    if ((sev || 0) >= 2) pause(S, from + ': ' + text);
  }
  function truth(S, text, cat, known) { S.truth.push({ t: S.t, text, cat: cat || 'enemy', knownAt: known ? S.t : null }); return S.truth.length - 1; }
  function tocLoad(S) {
    let load = 0;
    S.els.forEach(el => { if (el.state !== 'staged') load += el.eng ? 3 : 1; });
    S.higher.windows.forEach(w => { if (w.on && w.type === 'isr') load += 2; });
    S.convoys.forEach(c => { if (c.state === 'moving') load += 1; });
    return { load, cap: isNight(S.t) ? 6 : 8 };
  }
  function toToc(S, m) {
    const L = tocLoad(S); const delay = (m.sev || 0) >= 2 ? 0 : Math.max(0, L.load - L.cap) * 8;
    if (!delay) { tocLog(S, m.from, m.text, m.sev, m.cat, m.ts); if (m.tid != null && S.truth[m.tid].knownAt == null) S.truth[m.tid].knownAt = S.t; }
    else S.inbox.push(Object.assign({ at: S.t + delay }, m));
  }
  function flushInbox(S) {
    if (!S.inbox.length) return;
    S.inbox = S.inbox.filter(m => {
      if (m.at > S.t) return true;
      tocLog(S, m.from, m.text + ' (logged late: ops center saturated)', m.sev, m.cat, m.ts);
      if (m.tid != null && S.truth[m.tid].knownAt == null) S.truth[m.tid].knownAt = S.t;
      return false;
    });
  }
  function addDec(S, d) { d.id = S.decSeq++; d.t = S.t; S.decs.push(d); pause(S, d.title); return d; }

  /* ---------- comms ---------- */
  function sigMap(S) {
    const base = {}, boost = {}; const genOut = S.stocks.fuel <= 0;
    NODES.forEach(n => { base[n.id] = Math.max(0, n.sig - (genOut ? 1 : 0)); boost[n.id] = 0; });
    S.higher.windows.forEach(w => {
      if (w.type === 'isr' && w.on) { boost[w.node] = Math.max(boost[w.node], 2); ADJ[w.node].forEach(e => { boost[e.to] = Math.max(boost[e.to], 1); }); }
    });
    const relays = S.els.filter(e => e.relay && e.loc.at);
    for (let i = 0; i < 4; i++) {
      let changed = false;
      relays.forEach(e => {
        const n = e.loc.at;
        if (Math.min(3, base[n] + boost[n]) >= 1) { const b = N[n].high ? 2 : 1; ADJ[n].forEach(a => { if (boost[a.to] < b) { boost[a.to] = b; changed = true; } }); }
      });
      if (!changed) break;
    }
    const out = {}; NODES.forEach(n => { out[n.id] = Math.min(3, base[n.id] + boost[n.id]); });
    return out;
  }
  function elSig(S, el) { return el.state === 'staged' ? 3 : S._sig[nodeOf(el)]; }
  function snap(S, el) {
    const pos = el.loc.at ? { at: el.loc.at } : { from: el.loc.from, to: el.loc.to, frac: clamp(el.loc.done / el.loc.km, 0, 1) };
    return { pos, str: elStr(S, el), ammo: Math.round(avgOf(S, el, 'ammo')), fat: Math.round(avgOf(S, el, 'fat')), carry: el.carry, state: el.state, note: el.note || '' };
  }
  function setKnown(el, ts, s) { if (ts >= el.known.t) el.known = Object.assign({ t: ts }, s); }
  function rep(S, el, text, o) {
    o = o || {};
    el.outbox.push({ ts: S.t, text, sev: o.sev || 0, cat: o.cat || 'ops', fx: o.fx || null, tid: o.tid == null ? null : o.tid, dec: o.dec || null, eng: o.eng || null, chk: !!o.chk, snap: snap(S, el) });
  }
  function deliver(S, el, m, via) {
    el.lastRx = S.t; setKnown(el, m.ts, m.snap);
    if (m.fx) applyFx(S, m.fx, m.ts);
    if (m.tid != null && S.truth[m.tid].knownAt == null && !m.text) S.truth[m.tid].knownAt = S.t;
    if (m.text) toToc(S, { from: el.name, text: m.text + (via ? ' [' + via + ']' : ''), sev: m.sev, cat: m.cat, ts: m.ts, tid: m.tid });
    if (m.eng) { const en = S.engs.find(e => e.id === m.eng); if (en) { en.known = true; callAwt(S, en); } }
    if (m.dec) makeDec(S, el, m.dec);
  }
  function comms(S, el) {
    if (el.state === 'staged') return;
    const s = elSig(S, el); let two = false;
    if (s >= 2) { if (el.outbox.length) { el.outbox.forEach(m => deliver(S, el, m)); el.outbox = []; } two = true; }
    else if (s === 1) { el.outbox = el.outbox.filter(m => { if (ch(S, 0.3)) { deliver(S, el, m); two = true; return false; } return true; }); }
    else if (el.sat) { el.outbox = el.outbox.filter(m => { if ((m.sev >= 1 || m.chk) && S.t >= m.ts + 15) { deliver(S, el, m, 'SATCOM text'); two = true; return false; } return true; }); }
    if (two) el.noComms = 0; else el.noComms += TICK;
    if (s >= 3 || veh(el)) { setKnown(el, S.t, snap(S, el)); el.lastRx = S.t; }
    if (S.t >= el.nextCheck) {
      el.nextCheck += 60;
      if (!el.eng && (s >= 2 || (s === 1 && ch(S, 0.6)) || (s === 0 && el.sat))) rep(S, el, null, { chk: true });
      el.chkDue = S.t + (s === 0 && el.sat ? 25 : 10); el.chkAt = S.t;
    }
    if (el.chkDue && S.t >= el.chkDue) {
      el.chkDue = 0;
      if (el.lastRx >= el.chkAt - 10) el.missed = 0;
      else {
        el.missed++;
        const pp = planPos(el, S.t); const exp = pp.at || (pp.frac < 0.5 ? pp.from : pp.to);
        const dark = S._sig[exp] === 0 && !el.sat;
        if (dark) { if (el.missed === 1 || el.missed % 4 === 0) tocLog(S, 'KESTREL TOC', `${el.name}: no check-in at ${hhmm(el.chkAt)}. Planned position ${N[exp].name} is outside coverage.`, 0, 'comms'); }
        else if (el.missed === 1) tocLog(S, 'KESTREL TOC', `${el.name} missed the ${hhmm(el.chkAt)} comms window. Last contact ${hhmm(el.lastRx)}.`, 1, 'comms');
        else if (el.missed === 2) tocLog(S, 'KESTREL TOC', `NO COMMS with ${el.name}. Two windows missed. Last contact ${hhmm(el.lastRx)}; by the plan they should be at ${N[exp].name}. Lost-comms plan: ${lostText(el)}.`, 2, 'comms');
        else if (el.missed % 2 === 0) tocLog(S, 'KESTREL TOC', `Still no comms with ${el.name} (${el.missed} windows).`, 1, 'comms');
      }
    }
    if (!el.lostTrig && el.noComms >= el.lost.after && !el.eng && el.state !== 'rtb') {
      el.lostTrig = true;
      truth(S, `${el.name} reached its lost-comms limit (${el.lost.after} min) and ${el.lost.action === 'rtb' ? 'turned for home' : 'continued the mission'}`, 'comms');
      if (el.lost.action === 'rtb') abortMission(S, el, 'lost-comms plan');
    }
  }
  function lostText(el) { return el.lost.after > 9000 ? 'none' : `${el.lost.action === 'rtb' ? 'return to base' : 'continue mission'} after ${el.lost.after / 60} h without contact`; }
  function cmd(S, el, k) {
    const s = elSig(S, el);
    if (s >= 1) { runCmd(S, el, k); return { ok: true }; }
    if (el.sat) { S.cmds.push({ at: S.t + 15, el: el.id, k }); tocLog(S, 'KESTREL TOC', `Order to ${el.name} sent by SATCOM text. Expect 15 minutes to acknowledge.`, 0, 'comms'); return { ok: true }; }
    tocLog(S, 'KESTREL TOC', `Unable to raise ${el.name}. Order not passed.`, 1, 'comms');
    return { ok: false, err: `No comms with ${el.name}. The order did not get through.` };
  }
  function runCmd(S, el, k) {
    if (k === 'rtb') abortMission(S, el, 'recalled by ops center');
    else if (k === 'go') el.go = true;
    else if (k === 'cont') el.abortAns = 'continue';
    else if (k === 'break') { const en = S.engs.find(e => e.id === el.eng); if (en && !en.breaking) breakContact(S, en, 'ordered by ops center'); }
    else if (k === 'stay') { /* acknowledged */ }
  }
  function stepCmds(S) { if (!S.cmds.length) return; S.cmds = S.cmds.filter(c => { if (c.at > S.t) return true; const el = elById(S, c.el); if (el) runCmd(S, el, c.k); return false; }); }

  /* ---------- intel ---------- */
  function hvtUp(S, node, ratio) { const h = S.intel.hvt; h[node] *= ratio; const t = h.obA + h.obB + h.obC; OBJS.forEach(k => { h[k] = h[k] / t; }); S.intel.hvtAsOf = S.t; }
  function applyFx(S, fx, ts) {
    const I = S.intel;
    switch (fx.k) {
      case 'est': { const c = I.est[fx.node]; if (!c || c.asOf <= ts) I.est[fx.node] = { lo: fx.lo, hi: fx.hi, conf: fx.conf, asOf: ts, src: fx.src, amb: !!fx.amb }; break; }
      case 'hvt': hvtUp(S, fx.node, fx.ratio); break;
      case 'hvtmove': hvtUp(S, fx.from, 0.15); hvtUp(S, fx.to, 7); break;
      case 'cache': if (!I.cache || fx.conf === 'probable' || I.cache.conf !== 'probable') I.cache = { node: fx.node, conf: fx.conf, asOf: ts }; break;
      case 'iedwarn': S.route.segs[fx.seg].susp = true; break;
      case 'iedclear': S.route.segs[fx.seg].susp = false; S.route.segs[fx.seg].cleared = ts; break;
      case 'tip': I.tips.unshift({ t: ts, text: fx.text, grade: fx.grade }); if (I.tips.length > 30) I.tips.pop(); if (fx.sub) applyFx(S, fx.sub, ts); break;
      case 'reg': I.reg[fx.reg] = { lo: fx.lo, hi: fx.hi, asOf: ts }; break;
    }
  }
  function nodeEnemy(S, node) { return S.enemy.groups.reduce((a, g) => a + (g.node === node ? g.size : 0), 0); }
  function spawn(S, node, size, posture, o) {
    const E = S.enemy, r = N[node].reg; o = o || {};
    size = Math.max(o.min || 0, Math.min(size, Math.floor(E.pools[r])));
    if (size <= 0) return null;
    E.pools[r] = Math.max(0, E.pools[r] - size);
    const g = Object.assign({ id: E.gSeq++, node, size, posture, since: S.t }, o);
    E.groups.push(g); return g;
  }
  /* Lazy instantiation: a region holds a number until something looks at a node. */
  function resolve(S, node, hold) {
    const E = S.enemy, r = N[node].reg; if (r === 'fob') return;
    if (!(E.res[node] > S.t)) {
      if (E.leader === 'atlarge' && E.leaderAt === node && !E.groups.some(g => g.leader)) spawn(S, node, ri(S, 10, 15), 'guard', { leader: true, pin: true, min: 7 });
      if (!E.cacheDestroyed && E.cacheAt === node && !E.groups.some(g => g.cache)) spawn(S, node, ri(S, 5, 8), 'guard', { cache: true, pin: true, min: 4 });
      if (!E.groups.some(g => g.node === node && g.posture === 'transient')) {
        const unres = NODES.filter(n => n.reg === r && !(E.res[n.id] > S.t));
        const tw = unres.reduce((a, n) => a + n.w, 0) || 1;
        let n = Math.round(E.pools[r] * N[node].w / tw * (0.4 + rnd(S) * 1.2));
        const k = S.intel.est[node];
        if (k && k.conf === 'high' && S.t - k.asOf < 360) n = clamp(n, Math.max(0, k.lo - nodeEnemy(S, node)), Math.max(0, k.hi - nodeEnemy(S, node)));
        n = clamp(n, 0, Math.floor(E.pools[r]));
        if (n >= 3) spawn(S, node, n, 'transient', {});
      }
    }
    E.res[node] = Math.max(E.res[node] || 0, S.t + (hold || 180));
  }
  function observe(S, node, err) {
    resolve(S, node); const n = nodeEnemy(S, node); const e = err * (isNight(S.t) ? 1.3 : 1);
    let lo = Math.max(0, Math.round(n * (1 - e * rnd(S)) - (e > 0.25 ? 1 : 0)));
    let hi = Math.round(n * (1 + e * rnd(S)) + (e > 0.25 ? 2 : e > 0.12 ? 1 : 0));
    if (n === 0) { lo = 0; hi = e > 0.3 && ch(S, 0.25) ? 3 : 0; }
    const amb = S.enemy.groups.some(g => g.node === node && g.posture === 'ambush');
    return { n, lo, hi, conf: e <= 0.15 ? 'high' : e <= 0.3 ? 'med' : 'low', amb };
  }
  function opAt(S, node) { return S.els.some(e => e.relay && e.loc.at === node); }
  function friendAt(S, node) { return S.els.some(e => e.loc.at === node); }
  function objLook(S, src, x, here, viaEl) {
    const E = S.enemy; if (!OBJS.includes(x)) return;
    const say = (text, fx, tid) => { if (viaEl) rep(S, viaEl, text, { sev: 1, cat: 'intel', fx, tid }); else { applyFx(S, fx, S.t); toToc(S, { from: src, text, sev: 1, cat: 'intel', tid }); } };
    if (E.leader === 'atlarge' && E.leaderAt === x) {
      if (ch(S, here ? 0.14 : 0.08)) say(`Pattern of life at ${N[x].name} is consistent with the HVT: rooftop sentries, couriers in and out.`, { k: 'hvt', node: x, ratio: 4 });
    } else if (ch(S, 0.3)) { const fx = { k: 'hvt', node: x, ratio: 0.7 }; if (viaEl) rep(S, viaEl, null, { fx }); else applyFx(S, fx, S.t); }
    if (!E.cacheDestroyed && E.cacheAt === x && !(S.intel.cache && S.intel.cache.conf === 'probable' && S.intel.cache.node === x) && ch(S, here ? 0.1 : 0.05))
      say(`Probable cache at ${N[x].name}: motorcycles unloading into a guarded storehouse.`, { k: 'cache', node: x, conf: 'probable' });
  }
  function opObserve(S, el) {
    const n = el.loc.at, L = ldr(S, el); const hrs = Math.floor((S.t - el.dwellStart) / 60);
    const err = Math.max(0.08, 0.32 - 0.03 * L.tac - 0.015 * hrs);
    [n].concat(ADJ[n].map(a => a.to)).forEach(x => {
      if (x === 'fob') return;
      const o = observe(S, x, x === n ? err : err + (N[n].high ? 0.1 : 0.2));
      const prev = el.lastObs[x]; const fx = { k: 'est', node: x, lo: o.lo, hi: o.hi, conf: o.conf, src: el.name, amb: o.amb };
      const change = !prev || prev.lo !== o.lo || prev.hi !== o.hi || (o.amb && !prev.amb);
      el.lastObs[x] = { lo: o.lo, hi: o.hi, amb: o.amb };
      if (o.amb && !(prev && prev.amb)) rep(S, el, `${o.lo} to ${o.hi} armed pax moving into ambush positions vic ${N[x].name}, grid ${grid(x)}.`, { sev: 2, cat: 'intel', fx });
      else if (change && (o.hi > 0 || (prev && prev.hi > 0))) rep(S, el, o.hi ? `Observing ${o.lo} to ${o.hi} armed pax vic ${N[x].name}.` : `${N[x].name}: enemy no longer observed.`, { cat: 'intel', fx });
      else rep(S, el, null, { fx });
      objLook(S, el.name, x, x === n, el);
    });
  }
  function isrStep(S) {
    S.higher.windows.forEach(w => {
      if (!w.on || w.type !== 'isr') return;
      [w.node].concat(ADJ[w.node].map(a => a.to)).forEach(x => {
        if (x === 'fob') return;
        const o = observe(S, x, x === w.node ? 0.12 : 0.25); const prev = w.obs[x];
        applyFx(S, { k: 'est', node: x, lo: o.lo, hi: o.hi, conf: o.conf, src: w.call, amb: o.amb }, S.t);
        if (o.amb && !(prev && prev.amb)) toToc(S, { from: w.call, text: `${o.lo} to ${o.hi} pax setting an ambush vic ${N[x].name}, grid ${grid(x)}.`, sev: 2, cat: 'intel' });
        else if (!prev || prev.lo !== o.lo || prev.hi !== o.hi) toToc(S, { from: w.call, text: o.hi ? `${o.lo} to ${o.hi} armed pax vic ${N[x].name}.` : `${N[x].name} shows cold.`, sev: 0, cat: 'intel' });
        w.obs[x] = { lo: o.lo, hi: o.hi, amb: o.amb };
        objLook(S, w.call, x, x === w.node, null);
      });
    });
  }
  function humint(S, el, node) {
    const E = S.enemy; S.rapport[node] = Math.min(3, (S.rapport[node] || 0) + 1); const rap = S.rapport[node];
    if (!ch(S, 0.35 + 0.12 * rap - (E.alert[N[node].reg] >= 2 ? 0.15 : 0))) { rep(S, el, `Engagement with elders at ${N[node].name} complete. Locals guarded, nothing of value.`, { cat: 'intel' }); return; }
    const rel = 0.5 + 0.1 * rap, grade = ['', 'C3', 'B3', 'B2'][rap], r = rnd(S); let text, sub;
    if (r < 0.4 && E.leader === 'atlarge') { const n = ch(S, rel) ? E.leaderAt : pick(S, OBJS.filter(x => x !== E.leaderAt)); text = `Source in ${N[node].name} says "the commander" has been sleeping at ${N[n].name}.`; sub = { k: 'hvt', node: n, ratio: 1.5 + rap * 0.5 }; }
    else if (r < 0.65) { const live = E.ieds.filter(i => !i.gone); const seg = live.length && ch(S, rel) ? pick(S, live).seg : pick(S, SEGS).k; text = `Source warns of a device buried on the road, ${SEGN[seg]}.`; sub = { k: 'iedwarn', seg }; }
    else if (r < 0.85 && !E.cacheDestroyed) { const n = ch(S, rel) ? E.cacheAt : pick(S, OBJS.filter(x => x !== E.cacheAt)); text = `Source reports weapons and explosives stored at ${N[n].name}.`; sub = { k: 'cache', node: n, conf: 'reported' }; }
    else { const rg = pick(S, ['near', 'valley', 'deep']); const n = regTotal(S, rg); const lo = Math.max(0, Math.round(n * 0.6)), hi = Math.round(n * 1.5) + 2; text = `Source estimates ${lo} to ${hi} fighters around the ${REG[rg].toLowerCase()} area.`; sub = { k: 'reg', reg: rg, lo, hi }; }
    rep(S, el, `HUMINT, graded ${grade}. ${text}`, { cat: 'intel', fx: { k: 'tip', text, grade, sub } });
  }
  function regTotal(S, r) { return S.enemy.pools[r] + S.enemy.groups.reduce((a, g) => a + (N[g.node].reg === r ? g.size : 0), 0); }
  function totalEnemy(S) { return ['route', 'near', 'valley', 'deep'].reduce((a, r) => a + regTotal(S, r), 0); }
  function intsum(S) {
    const parts = [];
    ['route', 'near', 'valley', 'deep'].forEach(r => { const n = regTotal(S, r); const lo = Math.max(0, Math.round(n * (0.55 + rnd(S) * 0.25))), hi = Math.round(n * (1.2 + rnd(S) * 0.5)) + 2; S.intel.reg[r] = { lo, hi, asOf: S.t }; parts.push(`${REG[r]} ${lo} to ${hi}`); });
    tocLog(S, 'ANVIL S2', `INTSUM D${dayOf(S.t)}. Estimated enemy strength by area, low confidence: ${parts.join('; ')}.`, 0, 'intel');
  }
  function sigint(S) {
    const E = S.enemy; const n = ch(S, 0.65) ? E.leaderAt : pick(S, OBJS.filter(x => x !== E.leaderAt));
    applyFx(S, { k: 'hvt', node: n, ratio: 2.0 }, S.t);
    tocLog(S, 'ANVIL S2', `SIGINT. Emitter tied to network leadership active vic ${N[n].name} at ${hhmm(S.t - ri(S, 20, 90))}. Single hit, moderate confidence.`, 1, 'intel');
  }

  /* ---------- orders ---------- */
  function timeline(S, steps, mounted, clear) {
    let t = S.t, cur = 'fob'; const tl = [{ node: 'fob', arr: S.t, dep: S.t }]; let footMin = 0, vehKm = 0;
    steps.forEach(st => {
      const last = tl[tl.length - 1];
      if (st.k === 'wait') { t = Math.max(t, st.until); last.dep = t; }
      else if (st.k === 'move') {
        const e = edge(cur, st.to); let v = spd(e.type, mounted, isNight(t)); if (clear && mounted && e.type === 'road') v *= 0.5;
        const d = Math.round(e.km / v * 60); if (mounted && e.type !== 'foot') vehKm += e.km; else footMin += d;
        last.dep = t; t += d; tl.push({ node: st.to, arr: t, dep: t }); cur = st.to;
      }
      else if (st.k === 'dwell') {
        if (st.kind === 'orp' || st.kind === 'overwatch' || st.kind === 'await') t = Math.max(t, st.until || t); else t += st.min || 0;
        last.dep = t;
      }
      else if (st.k === 'assault') { t += 30; last.dep = t; }
      else if (st.k === 'ride') { last.dep = t; ['c1', 'c2', 'c3', 'fob'].forEach((n, i) => { t += Math.round([4.5, 3.6, 2.6, 2.1][i] / 22 * 60); tl.push({ node: n, arr: t, dep: t }); }); cur = 'fob'; }
    });
    return { tl, ret: t, footMin, vehKm };
  }
  function planPos(el, t) {
    const tl = el.tl;
    for (let i = 0; i < tl.length; i++) {
      if (t < tl[i].arr) { const a = tl[i - 1]; return { from: a.node, to: tl[i].node, frac: clamp((t - a.dep) / Math.max(1, tl[i].arr - a.dep), 0, 1) }; }
      if (t <= tl[i].dep) return { at: tl[i].node };
    }
    return { at: tl[tl.length - 1].node };
  }
  function legs(from, wps, mounted) {
    const out = []; let cur = from;
    for (const w of wps) { const p = path(cur, w, mounted); if (p == null) return null; p.forEach(n => out.push(n)); cur = w; }
    return out;
  }
  function availErr(S, ids) {
    if (!ids || !ids.length) return 'Assign at least one squad.';
    for (const id of ids) { const s = sq(S, id); if (!s || s.task === 'out') return `${id} is already committed.`; if (s.str < 4) return `${id} is combat ineffective.`; }
    return null;
  }
  function satFree(S) { return 2 - S.els.filter(e => e.sat).length; }
  /* o: {kind:'patrol'|'op'|'escort', squads, mounted, sat, wps, sp, dwellH, lost:{after,action}} */
  function build(S, o) {
    let err = availErr(S, o.squads); if (err) return { ok: false, err };
    if (o.sp < S.t) return { ok: false, err: 'Start time has already passed.' };
    if (o.sat && satFree(S) < 1) return { ok: false, err: 'Both SATCOM terminals are already issued.' };
    if (o.mounted && S.stocks.fuel < 60) return { ok: false, err: 'Not enough fuel for a mounted move.' };
    const steps = [{ k: 'wait', until: o.sp }]; const warn = [];
    if (o.kind === 'escort') {
      const c = S.convoys.find(x => x.state === 'sched'); if (!c) return { ok: false, err: 'No convoy is scheduled.' };
      path('fob', 'lz', true).forEach(n => steps.push({ k: 'move', to: n }));
      steps.push({ k: 'dwell', kind: 'await', conv: c.id, until: c.due }); steps.push({ k: 'ride', conv: c.id }); steps.push({ k: 'end' });
      const T = timeline(S, steps, true, false); const arr = T.tl.find(x => x.node === 'lz').arr;
      if (arr > c.due) return { ok: false, err: `Escort would reach LP Dakota at ${hhmm(arr)}, after the convoy leaves at ${hhmm(c.due)}. Start earlier.` };
      return Object.assign({ ok: true, steps, warn, conv: c.id }, T);
    }
    if (!o.wps || !o.wps.length) return { ok: false, err: 'Tap the map to add at least one waypoint.' };
    if (o.wps.includes('fob')) return { ok: false, err: 'The FOB cannot be a waypoint.' };
    let cur = 'fob';
    for (let i = 0; i < o.wps.length; i++) {
      const p = path(cur, o.wps[i], o.mounted); p.forEach(n => steps.push({ k: 'move', to: n })); cur = o.wps[i];
      if (o.kind === 'op') { if (i === o.wps.length - 1) steps.push({ k: 'dwell', kind: 'op', min: (o.dwellH || 6) * 60 }); }
      else steps.push({ k: 'dwell', kind: 'visit', min: 20 });
    }
    path(cur, 'fob', o.mounted).forEach(n => steps.push({ k: 'move', to: n })); steps.push({ k: 'end' });
    const T = timeline(S, steps, o.mounted, o.kind === 'patrol');
    estWarn(S, o, T, warn);
    return Object.assign({ ok: true, steps, warn }, T);
  }
  function estWarn(S, o, T, warn) {
    let dark = 0, longest = 0, run = 0;
    for (let i = 1; i < T.tl.length; i++) {
      const a = T.tl[i - 1], b = T.tl[i]; const d0 = S._sig[b.node] === 0;
      const seg = (b.arr - a.dep) * (d0 ? 1 : 0) + (b.dep - b.arr) * (d0 ? 1 : 0);
      if (d0) { dark += seg; run += seg; longest = Math.max(longest, run); } else run = 0;
    }
    T.dark = Math.round(dark);
    if (dark > 0 && !o.sat) warn.push(`S6: about ${fmtDur(dark)} of this plan is outside radio coverage as it stands now. A relay on high ground, an ISR line overhead or a SATCOM terminal would cover it.`);
    if (o.lost && o.lost.action === 'rtb' && longest >= o.lost.after && !o.sat) warn.push(`S3: the lost-comms plan turns the element around after ${o.lost.after / 60} h, which is shorter than the planned dark leg (${fmtDur(longest)}).`);
    const fat = Math.max(...o.squads.map(id => sq(S, id).fat)) + T.footMin / 60 * 6.6 + (T.ret - o.sp - T.footMin) / 60 * 1.0;
    T.fatEst = Math.round(Math.min(100, fat));
    if (fat > 80) warn.push(`S3: the element will finish close to exhaustion (fatigue about ${Math.round(Math.min(100, fat))}).`);
    T.fuel = Math.round(T.vehKm * 1.8 * o.squads.length);
  }
  function fmtDur(m) { m = Math.round(m); return m >= 60 ? Math.floor(m / 60) + ' h ' + p2(m % 60) + ' min' : m + ' min'; }
  function mkEl(S, o, steps, T) {
    const el = {
      id: S.elSeq++, name: o.name || o.squads.join('/'), kind: o.kind, squads: o.squads.slice(), mounted: !!o.mounted, sat: !!o.sat, clear: o.kind === 'patrol',
      loc: { at: 'fob' }, lastType: 'road', steps, si: 0, tl: T.tl, ret: T.ret, lost: o.lost || { after: 99999, action: 'continue' }, lostTrig: false, noComms: 0, lastRx: S.t,
      nextCheck: 1e9, missed: 0, chkDue: 0, chkAt: 0, outbox: [], state: 'staged', relay: false, spotted: false, comp: null, carry: 0, casTaken: 0, abortCas: o.abortCas || 99,
      eng: null, opId: o.opId || null, objNode: o.objNode || null, fric: 1, lastObs: {}, wps: o.wps || [], offPlan: false, halt: 0, note: 'Staged at the FOB', dwellStart: 0, go: false, aborted: null
    };
    el.known = Object.assign({ t: S.t }, { pos: { at: 'fob' }, str: 0, ammo: 100, fat: 0, carry: 0, state: 'staged', note: el.note });
    o.squads.forEach(id => { sq(S, id).task = 'out'; });
    S.els.push(el); setKnown(el, S.t, snap(S, el)); return el;
  }
  function issue(S, o) {
    const b = build(S, o); if (!b.ok) return b;
    const el = mkEl(S, o, b.steps, b);
    const what = o.kind === 'escort' ? 'convoy escort' : o.kind === 'op' ? `observation post at ${N[o.wps[o.wps.length - 1]].name}` : `patrol via ${o.wps.map(w => N[w].short).join(', ')}`;
    tocLog(S, 'KESTREL TOC', `Order issued: ${el.name}, ${what}. SP ${dtg(o.sp)}, back about ${dtg(b.ret)}.`, 0, 'ops');
    return { ok: true, el };
  }
  /* p: {obj, assault, support, supNode, mounted, hhour, needGo, noGo, abortCas, lost, satA, satS, via} */
  function buildOp(S, p) {
    let err = availErr(S, p.assault); if (err) return { ok: false, err };
    if (!p.obj || p.obj === 'fob') return { ok: false, err: 'Tap the map to choose an objective.' };
    const sup = p.support && p.support.length ? p.support : null;
    if (sup) { err = availErr(S, sup); if (err) return { ok: false, err }; if (sup.some(x => p.assault.includes(x))) return { ok: false, err: 'A squad cannot be in both elements.' }; if (!p.supNode) return { ok: false, err: 'Choose a support position.' }; }
    if ((p.satA ? 1 : 0) + (sup && p.satS ? 1 : 0) > satFree(S)) return { ok: false, err: 'Not enough SATCOM terminals free.' };
    const full = legs('fob', (p.via || []).concat([p.obj]), p.mounted); if (!full || !full.length) return { ok: false, err: 'No route to the objective.' };
    const orp = full.length > 1 ? full[full.length - 2] : 'fob';
    const back = t0 => { let t = t0, prev = full.slice(); const seq = ['fob'].concat(prev); for (let i = seq.length - 1; i > 0; i--) { const e = edge(seq[i - 1], seq[i]); t -= e.km / spd(e.type, p.mounted, isNight(t)) * 60; } return t; };
    const sp = Math.floor((back(p.hhour) - 25) / 5) * 5;
    if (sp < S.t) { const need = p.hhour - sp; return { ok: false, err: `H-hour is too early. The assault force needs ${fmtDur(need)} from the gate to the objective; earliest H-hour is about ${dtg(Math.ceil((S.t + need) / 60) * 60)}.` }; }
    const last = edge(orp, p.obj); const launch = p.hhour - Math.round(last.km / spd(last.type, p.mounted, isNight(p.hhour)) * 60);
    const stA = [{ k: 'wait', until: sp }];
    full.slice(0, -1).forEach(n => stA.push({ k: 'move', to: n }));
    stA.push({ k: 'dwell', kind: 'orp', until: launch }); stA.push({ k: 'move', to: p.obj }); stA.push({ k: 'assault' }); stA.push({ k: 'dwell', kind: 'sse', min: 30 });
    full.slice(0, -1).reverse().forEach(n => stA.push({ k: 'move', to: n })); stA.push({ k: 'move', to: 'fob' }); stA.push({ k: 'end' });
    const warn = []; const TA = timeline(S, stA, p.mounted, false);
    estWarn(S, { squads: p.assault, sat: p.satA, lost: p.lost, sp }, TA, warn);
    let stS = null, TS = null, spS = null;
    if (sup) {
      const ps = path('fob', p.supNode, p.mounted); let t = p.hhour - 30; const seq = ['fob'].concat(ps);
      for (let i = seq.length - 1; i > 0; i--) { const e = edge(seq[i - 1], seq[i]); t -= e.km / spd(e.type, p.mounted, isNight(t)) * 60; }
      spS = Math.floor(t / 5) * 5; if (spS < S.t) return { ok: false, err: 'H-hour is too early for the support element to get into position.' };
      stS = [{ k: 'wait', until: spS }]; ps.forEach(n => stS.push({ k: 'move', to: n })); stS.push({ k: 'dwell', kind: 'overwatch', until: p.hhour + 75 });
      ps.slice(0, -1).reverse().forEach(n => stS.push({ k: 'move', to: n })); stS.push({ k: 'move', to: 'fob' }); stS.push({ k: 'end' });
      TS = timeline(S, stS, p.mounted, false);
      if (!ADJ[p.obj].some(a => a.to === p.supNode)) warn.push('S3: the support position is not adjacent to the objective, so it cannot cordon or overwatch the assault.');
    }
    const est = S.intel.est[p.obj]; const f = p.assault.reduce((a, id) => a + sq(S, id).str, 0);
    let s2;
    if (est && S.t - est.asOf < 720) { const r = f / Math.max(1, est.hi); s2 = `S2: ${est.lo} to ${est.hi} enemy on the objective as of ${dtg(est.asOf)} (${est.conf} confidence). Assault force ${f}: ${r >= 3 ? 'better than 3 to 1' : r >= 1.5 ? 'about ' + r.toFixed(1) + ' to 1, below the 3 to 1 planning ratio' : 'UNFAVOURABLE at ' + r.toFixed(1) + ' to 1'}.`; }
    else s2 = 'S2: no current estimate for the objective. You would be assaulting blind.';
    if (S._sig[orp] === 0 && p.needGo && !p.satA) warn.push(`S6: the release point (${N[orp].name}) has no coverage. Your GO cannot reach the assault force there; the no-comms rule will decide.`);
    if (!isNight(p.hhour)) warn.push('S3: a daylight assault gives up most of the chance of surprise.');
    if (p.mounted && last.type !== 'foot') warn.push('S3: a mounted final approach will be heard well before arrival.');
    return { ok: true, warn, s2, orp, sp, launch, A: { steps: stA, T: TA }, B: sup ? { steps: stS, T: TS, sp: spS } : null };
  }
  const OPNAMES = ['IRON GATE', 'SLOW RIVER', 'COLD LANTERN', 'GREY HERON', 'LONG SHADOW', 'DRY THUNDER', 'BLACK KETTLE', 'QUIET ANVIL'];
  function planOp(S, p) {
    const b = buildOp(S, p); if (!b.ok) return b;
    const op = { id: S.opSeq++, name: 'Op ' + OPNAMES[(S.opSeq + S.seed) % OPNAMES.length], obj: p.obj, hhour: p.hhour, launch: b.launch, orp: b.orp, supNode: p.supNode || null, needGo: !!p.needGo, noGo: p.noGo || 'abort', state: 'planned', result: null, secured: false, dry: false };
    S.ops.push(op);
    const est = S.intel.est[p.obj]; op.planHi = est ? est.hi : 10;
    const a = mkEl(S, { kind: 'assault', squads: p.assault, mounted: p.mounted, sat: p.satA, lost: p.lost, abortCas: p.abortCas, opId: op.id, objNode: p.obj, name: p.assault.join('/') }, b.A.steps, b.A.T);
    op.assaultEl = a.id;
    if (b.B) { const s = mkEl(S, { kind: 'support', squads: p.support, mounted: p.mounted, sat: p.satS, lost: p.lost, abortCas: p.abortCas, opId: op.id, name: p.support.join('/') }, b.B.steps, b.B.T); op.supportEl = s.id; }
    tocLog(S, 'KESTREL TOC', `${op.name} issued. Objective ${N[p.obj].name}, H-hour ${dtg(p.hhour)}. Assault ${a.name} crosses the gate ${dtg(b.sp)}.`, 1, 'ops');
    return { ok: true, op };
  }
  function setTask(S, id, task) { const s = sq(S, id); if (!s || s.task === 'out') return; s.task = task; }
  function launchQRF(S, target) {
    const sqs = S.squads.filter(s => s.task === 'qrf' && s.str >= 4); if (!sqs.length) return { ok: false, err: 'No squad is on QRF standby.' };
    let node = target.node, tel = null;
    if (target.el) { tel = elById(S, target.el); if (!tel) return { ok: false, err: 'That element is no longer out.' }; const p = S.t - tel.known.t <= 30 ? tel.known.pos : planPos(tel, S.t); node = p.at || (p.frac < 0.5 ? p.from : p.to); if (node === 'fob') node = p.to || p.from; }
    if (!node || node === 'fob') return { ok: false, err: 'The QRF needs a destination outside the wire.' };
    const pth = path('fob', node, true); const ready = S.t + ri(S, 10, 20);
    const steps = [{ k: 'wait', until: ready }]; pth.forEach(n => steps.push({ k: 'move', to: n })); steps.push({ k: 'assist', tel: tel ? tel.id : null });
    path(node, 'fob', true).forEach(n => steps.push({ k: 'move', to: n })); steps.push({ k: 'end' });
    const ids = sqs.map(s => s.id); const T = timeline(S, steps, true, false);
    const el = mkEl(S, { kind: 'qrf', squads: ids, mounted: true, abortCas: 4, name: 'QRF ' + ids.join('/') }, steps, T);
    tocLog(S, 'KESTREL TOC', `QRF alerted for ${N[node].name}${tel ? ' to reach ' + tel.name : ''}. Rolling about ${hhmm(ready)}, on scene about ${hhmm(T.tl.find(x => x.node === node).arr)}.`, 1, 'ops');
    return { ok: true, el };
  }
  function abortMission(S, el, why) {
    if (el.state === 'rtb' && el.aborted) return;
    el.offPlan = true; el.aborted = why; el.relay = false; el.ride = null; el.state = 'rtb'; el.note = 'Returning to base: ' + why;
    let cur, pre = [];
    if (el.loc.at) cur = el.loc.at;
    else { const l = el.loc; el.loc = { from: l.to, to: l.from, km: l.km, done: l.km - l.done, type: l.type, chk: true }; cur = l.from; pre = [{ k: 'move', to: l.from }]; }
    el.steps = pre.concat((path(cur, 'fob', el.mounted) || []).map(n => ({ k: 'move', to: n })), [{ k: 'end' }]); el.si = 0;
    const op = opOf(S, el); if (op && el.kind === 'assault' && op.state !== 'exfil' && op.state !== 'done') { op.state = 'aborted'; truth(S, `${op.name} aborted: ${why}`, 'op'); }
    rep(S, el, `Returning to base. Reason: ${why}.`, { sev: 1 });
  }

  /* ---------- element stepping ---------- */
  function stepEl(S, el) {
    if (el.eng) return;
    const st = el.steps[el.si]; if (!st) { finishEl(S, el); return; }
    switch (st.k) {
      case 'wait':
        if (S.t >= st.until) {
          el.state = 'moving'; el.note = 'Moving'; el.si++; el.nextCheck = S.t + 60; el.lastRx = S.t; el.fric = 0.9 + rnd(S) * 0.15;
          if (el.kind === 'patrol') {
            const key = el.wps.join('>') + '@' + Math.floor(hour(S.t) / 2); const days = S.patterns[key] || []; const d = dayOf(S.t);
            const prior = days.filter(x => x !== d && d - x <= 3).length; if (!days.includes(d)) days.push(d); S.patterns[key] = days;
            if (prior >= 1 && ch(S, Math.min(0.65, 0.25 + 0.2 * (prior - 1))) && S.enemy.pools.route >= 6) {
              const cand = el.wps.filter(w => N[w].reg === 'route' || N[w].reg === 'near');
              if (cand.length) { const node = pick(S, cand); const g = spawn(S, node, ri(S, 6, 11), 'ambush', { until: S.t + 300 }); if (g && g.size < 5) { S.enemy.pools[N[node].reg] += g.size; g.size = 0; S.enemy.groups = S.enemy.groups.filter(x => x.size > 0); } else if (g) truth(S, `Enemy had watched the same patrol timing on ${prior} earlier day(s) and set an ambush at ${N[node].name} (${g.size} fighters)`, 'enemy'); }
            }
          }
          rep(S, el, `SP FOB Kestrel. ${elStr(S, el)} pax${el.mounted ? ', mounted' : ', on foot'}.`, {});
        }
        break;
      case 'move': moveEl(S, el, st); break;
      case 'dwell': dwellEl(S, el, st); break;
      case 'ride': {
        const c = S.convoys.find(x => x.id === st.conv);
        if (!c || c.state === 'arrived') { el.loc = { at: 'fob' }; el.ride = null; el.si++; }
        else if (c.state === 'turned' || c.state === 'sched') { el.ride = null; const n = c.loc ? (c.loc.at || c.loc.to) : 'lz'; el.loc = { at: n }; abortMission(S, el, 'convoy turned back'); }
        else { el.loc = c.loc.at ? { at: c.loc.at } : { from: c.loc.from, to: c.loc.to, km: c.loc.km, done: c.loc.done, type: 'road', chk: true }; el.lastType = 'road'; S.stocks.fuel = Math.max(0, S.stocks.fuel - 22 * TICK / 60 * 1.8 * el.squads.length * (c.halt > S.t ? 0 : 1)); }
        break;
      }
      case 'assault': doAssault(S, el); break;
      case 'assist': doAssist(S, el, st); break;
      case 'end': finishEl(S, el); break;
    }
  }
  function moveEl(S, el, st) {
    if (el.halt > S.t) return;
    if (el.loc.at) {
      if (el.loc.at === st.to) { el.si++; return; }
      const e = edge(el.loc.at, st.to);
      if (!e) { abortMission(S, el, 'route lost'); return; }
      el.loc = { from: el.loc.at, to: st.to, km: e.km, done: 0, type: e.type, chk: false }; el.lastType = e.type; el.fric = 0.9 + rnd(S) * 0.15;
      if (el.state !== 'rtb') { el.state = 'moving'; el.note = 'Moving to ' + N[st.to].name; }
    }
    const l = el.loc; let v = spd(l.type, el.mounted, isNight(S.t)); const af = avgOf(S, el, 'fat');
    if (af > 70) v *= 0.8; if (af > 90) v *= 0.75;
    if (el.carry > 0 && !veh(el)) v *= 0.6;
    if (el.clear && el.mounted && l.type === 'road' && el.state !== 'rtb') v *= 0.5;
    const dk = v * el.fric * TICK / 60; l.done += dk;
    if (veh(el)) S.stocks.fuel = Math.max(0, S.stocks.fuel - dk * 1.8 * el.squads.length);
    const sk = SEGK[l.from + '>' + l.to];
    if (sk && !l.chk && l.done >= l.km / 2) { l.chk = true; iedEl(S, el, sk); if (el.steps[el.si] !== st) return; }
    if (l.done >= l.km) {
      el.loc = { at: st.to }; el.si++;
      if (N[st.to].reg === 'route') S.route.vis[st.to] = S.t;
      if (st.to !== 'fob') arriveChecks(S, el, st.to);
    }
  }
  function iedEl(S, el, sk) {
    const E = S.enemy, R = S.route.segs[sk]; const ied = E.ieds.find(i => i.seg === sk && !i.gone); R.passed = S.t;
    if (!ied) { if (el.clear && el.state !== 'rtb') { const was = R.susp; R.cleared = S.t; rep(S, el, was ? `${SEGN[sk]} checked. Nothing found.` : null, { cat: 'log', fx: { k: 'iedclear', seg: sk } }); } return; }
    const L = ldr(S, el); let p = el.clear && el.state !== 'rtb' ? 0.5 + 0.07 * L.tac : 0.18;
    if (R.susp) p += 0.25; if (isNight(S.t)) p -= 0.12; if (avgOf(S, el, 'fat') > 70) p -= 0.15; if (!el.mounted) p += 0.1;
    if (ch(S, clamp(p, 0.05, 0.97))) {
      ied.gone = true; el.halt = S.t + 25; const tid = truth(S, `${el.name} found and reduced the IED on ${SEGN[sk]}`, 'ied');
      rep(S, el, `IED found, ${SEGN[sk]}. Pressure-plate device. Reducing in place, 25 mikes.`, { sev: 1, cat: 'log', fx: { k: 'iedclear', seg: sk }, tid }); return;
    }
    if (!el.mounted && !ch(S, 0.3)) return;
    ied.gone = true; R.inc++; R.lastInc = S.t; S.stats.ied++; el.halt = S.t + 30;
    const n = el.mounted ? (ch(S, 0.45) ? 1 : 0) + (ch(S, 0.15) ? 1 : 0) : 1; for (let i = 0; i < n; i++) casualty(S, el, null);
    const tid = truth(S, `IED strike on ${el.name}, ${SEGN[sk]}: ${n} casualt${n === 1 ? 'y' : 'ies'}`, 'ied');
    rep(S, el, `IED STRIKE, ${SEGN[sk]}. ${n ? n + ' casualt' + (n === 1 ? 'y' : 'ies') : 'No casualties'}${el.mounted ? ', one vehicle mobility kill' : ''}.`, { sev: 2, cat: 'contact', tid });
    if (el.carry > 0) casevacHold(S, el); else if (n > 0) abortMission(S, el, 'casualties from IED');
  }
  function arriveChecks(S, el, node) {
    const E = S.enemy, r = N[node].reg, L = ldr(S, el), loud = veh(el);
    resolve(S, node, 120);
    if (r !== 'route') {
      let ps = loud ? 0.75 : (isNight(S.t) ? 0.10 : 0.35); ps *= (1.15 - 0.06 * L.tac); if (N[node].kind === 'village') ps *= 1.4;
      if (!el.spotted && ch(S, clamp(ps, 0.03, 0.95))) { el.spotted = true; E.alert[r] = Math.min(3, E.alert[r] + 1); truth(S, `${el.name} was seen arriving at ${N[node].name}; enemy alert in ${REG[r]} now ${E.alert[r]} of 3`, 'enemy'); }
    } else if (el.kind === 'patrol' || el.kind === 'op') E.alert.route = Math.min(3, E.alert.route + (ch(S, 0.25) ? 1 : 0));
    const gs = E.groups.filter(g => g.node === node && g.size > 0 && !g.inEng);
    const amb = gs.find(g => g.posture === 'ambush');
    if (amb) {
      const pd = (loud ? 0.15 : 0.35) + 0.05 * L.tac - (avgOf(S, el, 'fat') > 70 ? 0.15 : 0);
      startEng(S, node, [el], amb, ch(S, pd) ? 'meeting' : 'ambush', {}); return;
    }
    if (el.kind === 'assault' && el.objNode === node) return;
    const g = gs.find(x => x.posture === 'guard') || gs[0];
    if (g) {
      let pc = g.posture === 'guard' ? (el.kind === 'patrol' || el.kind === 'qrf' ? 0.5 : 0.08) : (g.size >= 4 ? 0.2 : 0.05);
      if (el.spotted) pc += 0.12; if (isNight(S.t) && !loud) pc *= 0.5;
      if (el.kind === 'assault' || el.kind === 'support') pc *= 0.5;
      if (ch(S, pc)) { startEng(S, node, [el], g, 'meeting', {}); return; }
    }
    if (el.state === 'rtb') return;
    const o = observe(S, node, 0.45);
    rep(S, el, `At ${N[node].name}. ${o.hi ? `Observed ${o.lo} to ${o.hi} armed pax in the area.` : 'Negative enemy observed.'}`, { cat: 'intel', fx: { k: 'est', node, lo: o.lo, hi: o.hi, conf: 'low', src: el.name } });
  }
  function dwellEl(S, el, st) {
    const node = el.loc.at, E = S.enemy;
    if (st.start == null) {
      st.start = S.t; el.dwellStart = S.t; el.state = 'dwell';
      if (st.kind === 'op') { el.relay = true; el.note = 'Observation post set'; rep(S, el, `OP set at ${N[node].name}. Relay up. Observing.`, {}); opObserve(S, el); }
      else if (st.kind === 'overwatch') { el.relay = true; el.note = 'Support position set'; rep(S, el, `Support by fire position set at ${N[node].name}.`, { sev: 1 }); opObserve(S, el); }
      else if (st.kind === 'visit') el.note = 'Halted at ' + N[node].name;
      else if (st.kind === 'sse') { el.note = 'Exploiting the objective'; const op = opOf(S, el); if (op) op.state = 'sse'; }
      else if (st.kind === 'await') { el.note = 'Waiting for the convoy'; rep(S, el, 'At LP Dakota. Waiting for PACKHORSE.', {}); }
      else if (st.kind === 'casevac') el.note = 'Holding for casualty evacuation';
      else if (st.kind === 'orp') {
        const op = opOf(S, el); op.state = 'orp'; el.note = 'Set at release point';
        const o = observe(S, op.obj, 0.3);
        rep(S, el, `Set at release point ${N[node].name}. Leader's recon of ${N[op.obj].name}: ${o.hi ? o.lo + ' to ' + o.hi + ' enemy' : 'no movement'}.`, { sev: 1, cat: 'ops', fx: { k: 'est', node: op.obj, lo: o.lo, hi: o.hi, conf: 'med', src: el.name } });
        if (o.lo > op.planHi * 1.5 && o.lo > elStr(S, el) / 2.5) { el.abortRec = true; rep(S, el, `Objective is stronger than briefed (${o.lo} to ${o.hi} against a planning figure of ${op.planHi}). Recommend abort.`, { sev: 2, dec: { type: 'abortreq' } }); }
      }
      return;
    }
    const dt = S.t - st.start;
    switch (st.kind) {
      case 'visit':
        if (dt >= st.min) { if (N[node].kind === 'village') humint(S, el, node); el.si++; }
        break;
      case 'op': case 'overwatch': {
        if (dt % 60 === 0) opObserve(S, el);
        const op = opOf(S, el);
        const done = st.kind === 'op' ? dt >= st.min : (op && (op.state === 'exfil' || op.state === 'done' || op.state === 'aborted')) || S.t > st.until + 180;
        const tired = avgOf(S, el, 'fat') >= 96;
        if (done || tired) { el.relay = false; el.comp = null; el.state = 'moving'; el.si++; rep(S, el, `${tired && !done ? 'Element exhausted. ' : ''}Collapsing position at ${N[node].name}, moving to FOB.`, {}); }
        break;
      }
      case 'await': {
        const c = S.convoys.find(x => x.id === st.conv);
        if (c && c.state === 'moving') { el.ride = c.id; el.si++; el.state = 'moving'; el.note = 'Escorting PACKHORSE'; }
        else if (!c || c.state !== 'sched' || S.t > st.until + 120 || c.due > st.until + 60) abortMission(S, el, 'convoy not moving today');
        break;
      }
      case 'casevac':
        if (el.carry <= 0) abortMission(S, el, 'casualties evacuated');
        else if (dt >= st.min) abortMission(S, el, 'moving casualties by ground');
        break;
      case 'sse':
        if (dt >= st.min) {
          const op = opOf(S, el); el.si++; el.state = 'moving'; if (op) op.state = 'exfil';
          if (E.cacheAt === node && !E.cacheDestroyed) {
            E.cacheDestroyed = true; ['route', 'near', 'valley', 'deep'].forEach(r => { E.pools[r] *= 0.85; }); S.higher.priority += 5; if (op) op.result = op.result ? op.result + '+cache' : 'cache';
            const tid = truth(S, `Main cache destroyed at ${N[node].name}`, 'op');
            rep(S, el, `Exploitation complete. Major cache found and destroyed in place: rockets, IED components, small arms. Moving to exfil.`, { sev: 2, tid });
          } else if (E.leader === 'atlarge' && ch(S, 0.6)) rep(S, el, `Exploitation complete. Phones and a ledger recovered; first look points to ${N[E.leaderAt].name}. Moving to exfil.`, { sev: 1, cat: 'intel', fx: { k: 'hvt', node: E.leaderAt, ratio: 3 } });
          else rep(S, el, 'Exploitation complete. Nothing significant. Moving to exfil.', { sev: 1 });
        }
        break;
      case 'orp': {
        const op = opOf(S, el); const s = elSig(S, el); const link = s >= 1 || el.sat;
        if (el.abortRec && !el.abortAns && !link && S.t >= st.until) { if (ldr(S, el).nerve >= 1) { el.abortAns = 'continue'; truth(S, `${el.name} leader chose to assault despite a stronger objective (no comms)`, 'op'); } else { abortMission(S, el, 'objective stronger than briefed'); return; } }
        if (el.abortRec && !el.abortAns) return;
        if (op.needGo && !el.go) {
          if (!el.goAsked && S.t >= st.until - 15) { el.goAsked = true; rep(S, el, `At release point, ready. Request GO for H-hour ${hhmm(op.hhour)}.`, { sev: 2, dec: { type: 'go' } }); }
          if (S.t >= st.until + 30 && !link) {
            if (op.noGo === 'execute') { el.go = true; truth(S, `${el.name} had no comms at the release point and executed on the no-comms rule`, 'op'); }
            else { abortMission(S, el, 'no GO received at release point'); return; }
          }
          if (!el.go) return;
        }
        if (S.t >= st.until) { el.si++; el.state = 'moving'; el.note = 'Moving to the objective'; }
        break;
      }
    }
  }
  function doAssault(S, el) {
    const op = opOf(S, el), node = el.loc.at, E = S.enemy; resolve(S, node, 240);
    const gs = E.groups.filter(g => g.node === node && g.size > 0 && !g.inEng);
    el.si++; op.state = 'assault'; op.ldrHere = E.leader === 'atlarge' && E.leaderAt === node; op.cacheHere = !E.cacheDestroyed && E.cacheAt === node;
    let g = gs.find(x => x.leader) || gs.find(x => x.cache) || gs[0];
    if (!g) { op.dry = true; op.secured = true; E.alert[N[node].reg] = Math.max(E.alert[N[node].reg], 2); truth(S, `${op.name}: ${N[node].name} was empty at H-hour`, 'op'); rep(S, el, `Objective ${N[node].name} secure. Dry hole, negative enemy.`, { sev: 2 }); return; }
    gs.forEach(x => { if (x !== g) { g.size += x.size; g.leader = g.leader || x.leader; g.cache = g.cache || x.cache; x.size = 0; } });
    E.groups = E.groups.filter(x => x.size > 0);
    if (E.alert[N[node].reg] >= 2 && !g.reinf) { g.reinf = true; const r = N[node].reg; const add = Math.min(Math.floor(E.pools[r]), ri(S, 4, 8)); g.size += add; E.pools[r] -= add; g.prepared = true; }
    const ps = el.spotted ? 0.15 : veh(el) ? 0.2 : isNight(S.t) ? 0.85 : 0.4;
    const sur = !g.prepared && ch(S, ps);
    const sup = S.els.find(x => x.opId === op.id && x.kind === 'support' && x.relay && x.loc.at === op.supNode && ADJ[node].some(a => a.to === op.supNode));
    const en = startEng(S, node, [el], g, 'assault', { surprise: sur }); en.support = !!sup; en.opId = op.id;
  }
  function doAssist(S, el, st) {
    const node = el.loc.at; const en = S.engs.find(e => e.node === node);
    if (en) { en.els.push(el.id); el.eng = en.id; el.state = 'contact'; el.note = 'In contact'; el.si++; rep(S, el, `QRF at ${N[node].name}, joining the fight.`, { sev: 1, cat: 'contact' }); return; }
    const others = S.els.filter(o => o !== el && o.carry > 0 && (o.loc.at === node || o.loc.from === node || o.loc.to === node));
    if (others.length) {
      others.forEach(o => { S.cas.forEach(c => { if (c.el === o.id && c.state === 'field') c.el = el.id; }); el.carry += o.carry; o.carry = 0; });
      rep(S, el, `Linked up with ${others.map(o => o.name).join(', ')}. Casualties cross-loaded, moving to the aid station.`, { sev: 1 }); el.si++; return;
    }
    if (st.tel && !st.redir) {
      const tel = elById(S, st.tel);
      if (tel) {
        const tn = tel.loc.at || tel.loc.to;
        if (tn !== node && tn !== 'fob' && ADJ[node].some(a => a.to === tn)) {
          st.redir = true; el.steps = el.steps.slice(0, el.si).concat([{ k: 'move', to: tn }, st], (path(tn, 'fob', true) || []).map(n => ({ k: 'move', to: n })), [{ k: 'end' }]);
          rep(S, el, `Raised ${tel.name} on the platoon net. They are near ${N[tn].name}. Moving to them.`, { sev: 1 }); return;
        }
      }
    }
    rep(S, el, `QRF at ${N[node].name}. Negative contact, negative link-up. Returning.`, { sev: 1 }); el.si++;
  }
  function finishEl(S, el) {
    let dow = 0;
    S.cas.forEach(c => { if (c.el === el.id && c.state === 'field') { const age = S.t - c.t0; const ps = age <= 60 ? 0.95 : age <= 90 ? 0.86 : age <= 120 ? 0.74 : 0.5; if (ch(S, ps)) c.state = 'saved'; else { c.state = 'dow'; S.stats.dow++; S.stats.wia--; dow++; } c.doneAt = S.t; } });
    el.squads.forEach(id => { const s = sq(S, id); s.task = 'rest'; const need = (100 - s.ammo) / 100; const give = Math.min(need, S.stocks.ammo); S.stocks.ammo -= give; s.ammo = Math.min(100, s.ammo + give * 100); s.exp++; });
    const op = opOf(S, el); if (op && el.kind === 'assault') op.state = op.state === 'aborted' ? 'aborted' : 'done';
    tocLog(S, el.name, `RP FOB Kestrel. ${el.aborted ? 'Mission ended early: ' + el.aborted + '.' : 'Mission complete.'} ${elStr(S, el)} pax in.${el.carry ? ' ' + el.carry + ' urgent to the aid station' + (dow ? ', ' + dow + ' died of wounds' : '') + '.' : ''}`, 1, 'ops');
    S.els = S.els.filter(e => e !== el);
  }

  /* ---------- combat ---------- */
  function fPow(S, el) { return el.squads.reduce((a, id) => { const s = sq(S, id); return a + s.str * (0.75 + 0.07 * s.ldr.tac) * (1 - Math.max(0, s.fat - 50) / 100) * (s.ammo < 20 ? 0.5 : 1) * (veh(el) ? 1.4 : 1); }, 0); }
  function startEng(S, node, els, g, kind, o) {
    o = o || {};
    const en = { id: S.engSeq++, node, els: els.map(e => e.id), conv: o.conv || null, gid: g.id, kind, surprise: !!o.surprise, round: 0, t0: S.t, next: S.t + TICK, eInit: g.size, fCas: 0, eCas: 0, awtAt: 0, awtOn: false, mort: 0, breaking: 0, known: !!o.conv, support: false, aware: false, opId: null };
    S.engs.push(en); g.inEng = true;
    const szl = Math.max(3, Math.round(g.size * (0.6 + rnd(S) * 0.8)));
    const tid = truth(S, `${kind === 'ambush' ? 'Enemy ambush on' : kind === 'assault' ? 'Assault by' : kind === 'defence' ? 'Enemy attack on' : 'Contact involving'} ${els.map(e => e.name).join(', ') || 'the convoy'} at ${N[node].name}. Actual enemy strength ${g.size}`, 'contact', !!o.conv);
    els.forEach(el => {
      el.eng = en.id; el.state = 'contact'; el.offPlan = true; el.note = 'In contact';
      rep(S, el, kind === 'assault' ? `Assault initiated on ${N[node].name}. ${o.surprise ? 'Surprise achieved.' : 'Enemy was alert, receiving heavy fire.'}` : `CONTACT. ${kind === 'ambush' ? 'Ambushed' : kind === 'defence' ? 'Position under attack' : 'Troops in contact'} vic ${N[node].name}, grid ${grid(node)}. Estimate ${Math.max(2, szl - 2)} to ${szl + 2} enemy, small arms${g.size > 8 ? ' and RPG' : ''}.`, { sev: 2, cat: 'contact', eng: en.id, tid });
    });
    if (o.conv) { tocLog(S, 'PACKHORSE', `CONTACT. Convoy ambushed vic ${N[node].name}, grid ${grid(node)}. Small arms and RPG.`, 2, 'contact'); callAwt(S, en); }
    return en;
  }
  function callAwt(S, en) {
    if (en.awtAt) return; const w = S.higher.windows.find(x => x.type === 'awt' && x.on); if (!w) return;
    en.awtAt = S.t + ri(S, 10, 20); toToc(S, { from: w.call, text: `Copy troops in contact. Inbound ${N[en.node].short}, ETA ${en.awtAt - S.t} mikes.`, sev: 1, cat: 'higher' });
  }
  function breakContact(S, en, why) { en.breaking = 2; en.els.forEach(id => { const el = elById(S, id); if (el) rep(S, el, `Breaking contact: ${why}.`, { sev: 1, cat: 'contact' }); }); }
  function casualty(S, el, en) {
    const c = el.squads.map(id => sq(S, id)).filter(s => s.str > 0); if (!c.length) return;
    const s = pick(S, c); s.str--; el.casTaken++; if (en) en.fCas++;
    const r = rnd(S); const type = r < (veh(el) ? 0.08 : 0.15) ? 'kia' : r < 0.5 ? 'urgent' : 'priority';
    if (type === 'kia') { S.stats.kia++; s.mor = Math.max(0, s.mor - 8); }
    else if (type === 'priority') { S.stats.wia++; s.mor = Math.max(0, s.mor - 3); }
    else { S.stats.wia++; el.carry++; S.cas.push({ id: S.casSeq++, sq: s.id, el: el.id, t0: S.t, state: 'field' }); s.mor = Math.max(0, s.mor - 5); }
  }
  function casevacHold(S, el) {
    el.steps.splice(el.si, 0, { k: 'dwell', kind: 'casevac', min: 45 }); el.state = 'dwell'; el.relay = false;
    medRequest(S, el);
  }
  function medRequest(S, el) { rep(S, el, `MEDEVAC request. ${el.carry} urgent surgical, vic ${N[nodeOf(el)].name}, grid ${grid(nodeOf(el))}.`, { sev: 2, cat: 'contact', dec: { type: 'medevac' } }); }
  function stepEng(S, en) {
    if (S.t < en.next) return; en.next = S.t + 10; en.round++;
    const E = S.enemy, g = E.groups.find(x => x.id === en.gid);
    const els = en.els.map(id => elById(S, id)).filter(Boolean);
    const cv = en.conv ? S.convoys.find(c => c.id === en.conv) : null;
    if (!g || g.size <= 0 || (!els.length && !cv)) { endEng(S, en, 'enemy_broke'); return; }
    let fp = els.reduce((a, el) => a + fPow(S, el), 0) + (cv ? 3 : 0), ep = g.size * 0.65;
    let fm = 1, em = 1, flm = 1, elm = 1;
    if (en.surprise && en.round <= 2) { fm *= 1.5; em *= 0.6; }
    if (en.kind === 'ambush' && en.round === 1) { em *= 1.8; flm *= 1.3; }
    if (en.kind === 'assault') { flm *= 1.4; if (g.prepared) { em *= 1.3; elm *= 0.75; } }
    if (en.kind === 'defence') { elm *= 1.1; flm *= en.aware ? 0.75 : 1.2; }
    if (isNight(S.t)) fm *= 1.15;
    if (en.support) fm *= 1.25;
    const link = !!cv || els.some(el => elSig(S, el) >= 1);
    if (link && en.mort < 3 && distKm(en.node, 'fob') <= 5.6 && S.stocks.mortar >= 6 && !(en.kind === 'assault' && en.surprise && en.round === 1)) {
      fm *= 1.2; S.stocks.mortar -= 6; en.mort++;
      if (en.mort === 1) toToc(S, { from: 'THUNDER', text: `Fire mission vic ${N[en.node].short}. 81mm HE in effect.`, sev: 1, cat: 'ops' });
    }
    if (en.awtAt && S.t >= en.awtAt) { fm *= 1.6; if (!en.awtOn) { en.awtOn = true; toToc(S, { from: 'LANCER 31', text: `On station ${N[en.node].short}. Engaging.`, sev: 1, cat: 'higher' }); } }
    fp *= fm; ep *= em;
    if (en.breaking) { flm *= 0.5; elm *= 0.3; }
    if (els.some(veh)) flm *= 0.8;
    const eL = fp * 0.07 * (0.6 + rnd(S) * 0.8) * elm, fL = ep * 0.035 * (0.5 + rnd(S)) * flm;
    const ek = Math.min(g.size, Math.floor(eL) + (ch(S, eL % 1) ? 1 : 0)); g.size -= ek; en.eCas += ek; S.stats.enemyKia += ek;
    const fk = Math.floor(fL) + (ch(S, fL % 1) ? 1 : 0);
    for (let i = 0; i < fk; i++) { if (cv && (!els.length || ch(S, 0.5))) cv.trucks = Math.max(0, cv.trucks - 1); else if (els.length) casualty(S, pick(S, els), en); }
    if (cv && en.kind === 'ambush' && en.round <= 3 && ch(S, els.length ? 0.15 : 0.35)) cv.trucks = Math.max(0, cv.trucks - 1);
    els.forEach(el => el.squads.forEach(id => { const s = sq(S, id); s.ammo = Math.max(0, s.ammo - ri(S, 6, 12)); }));
    const lossFrac = en.eCas / en.eInit, brk = (g.leader || g.cache) ? 0.5 : 0.35;
    if (g.size <= 2 || lossFrac >= brk || (en.kind === 'ambush' && en.round >= 3 && ch(S, 0.5)) || (en.round >= 2 && fp / Math.max(1, ep) > 3.5 && ch(S, 0.5)) || en.round >= 12) { endEng(S, en, 'enemy_broke'); return; }
    if (en.breaking) { en.breaking--; if (en.breaking <= 0) endEng(S, en, 'friendly_broke'); return; }
    if (cv && cv.trucks <= 4) { endEng(S, en, 'convoy_broke'); return; }
    if (!els.length) return;
    const casT = els.reduce((a, el) => a + el.casTaken, 0), thr = Math.min.apply(null, els.map(el => el.abortCas || 99));
    const left = els.reduce((a, el) => a + elStr(S, el), 0), L = ldr(S, els[0]), ratio = fp / Math.max(1, ep);
    if (casT >= thr) breakContact(S, en, `abort criteria met, ${casT} casualties`);
    else if (left <= 4 * els.length) breakContact(S, en, 'element combat ineffective');
    else if (en.round >= 2 && ratio < 0.7 && ch(S, 0.5 - 0.15 * L.nerve)) breakContact(S, en, 'outgunned');
    else if (en.round % 2 === 0) rep(S, els[0], `Still in contact vic ${N[en.node].name}. ${casT ? casT + ' casualties so far. ' : ''}Enemy ${lossFrac > 0.2 ? 'taking losses' : 'holding'}.`, { sev: 1, cat: 'contact' });
  }
  function endEng(S, en, how) {
    const E = S.enemy, g = E.groups.find(x => x.id === en.gid); S.engs = S.engs.filter(e => e !== en);
    const els = en.els.map(id => elById(S, id)).filter(Boolean); const r = N[en.node].reg;
    const cv = en.conv ? S.convoys.find(c => c.id === en.conv) : null; const op = en.opId ? S.ops.find(o => o.id === en.opId) : null;
    els.forEach(el => { el.eng = null; });
    if (g) g.inEng = false;
    E.alert[r] = en.kind === 'assault' ? 3 : Math.min(3, E.alert[r] + 1);
    let msg = '';
    const endTid = truth(S, `Contact at ${N[en.node].name} ended after ${en.round * 10} min: ${how === 'enemy_broke' ? 'enemy withdrew' : how === 'convoy_broke' ? 'convoy turned back' : 'friendly force broke contact'}. Enemy lost ${en.eCas}, friendly casualties ${en.fCas}`, 'contact', !!cv);
    if (how === 'enemy_broke') {
      msg = `Enemy has broken contact. ${en.eCas} enemy KIA confirmed.`;
      if (en.kind === 'assault' && op) {
        op.secured = true; msg = `Objective ${N[en.node].name} secure. ${en.eCas} enemy KIA.`;
        if (g && g.leader && E.leader === 'atlarge') {
          const p = 0.3 + (en.surprise ? 0.2 : 0) + (en.support ? 0.3 : 0) - (g.prepared ? 0.15 : 0);
          if (ch(S, p)) { E.leader = ch(S, 0.6) ? 'captured' : 'killed'; op.result = 'jackpot'; S.higher.priority += 10; truth(S, `${op.name}: network leader ${E.leader} at ${N[en.node].name}`, 'op'); msg = `JACKPOT. HVT ${E.leader === 'captured' ? 'detained' : 'killed'} on the objective. ${en.eCas} enemy KIA.`; }
          else { const to = pick(S, OBJS.filter(x => x !== en.node)); E.leaderAt = to; E.nextMove = S.t + ri(S, 30, 50) * 60; E.alert.deep = 3; op.result = 'escaped'; truth(S, `${op.name}: leader escaped the objective toward ${N[to].name}${en.support ? '' : ' (no cordon in place)'}`, 'op'); msg = `Objective ${N[en.node].name} secure, ${en.eCas} enemy KIA. HVT not on target: squirters broke out during the assault.`; hvtUp(S, en.node, 0.1); }
        }
        if (g) { E.pools[r] += Math.floor(g.size * 0.6); g.size = 0; }
      } else if (g) { if (g.pin && (g.leader || g.cache)) { /* guards hold their ground */ } else { E.pools[r] += Math.floor(g.size * 0.8); g.size = 0; } }
    } else if (how === 'friendly_broke') {
      msg = `Contact broken. ${en.fCas} friendly casualties, ${en.eCas} enemy KIA estimated.`;
      if (g && g.posture !== 'guard') { E.pools[r] += g.size; g.size = 0; }
    }
    E.groups = E.groups.filter(x => x.size > 0);
    if (cv) { cv.eng = null; if (how === 'convoy_broke' || cv.trucks <= 4) turnConvoy(S, cv, 'ambush'); else { cv.halt = S.t + 15; tocLog(S, 'PACKHORSE', `Ambush beaten off. ${cv.trucks} of 8 trucks rolling.`, 1, 'log'); } }
    const qrf = els.find(el => el.kind === 'qrf');
    if (qrf) els.forEach(o => { if (o !== qrf && o.carry > 0) { S.cas.forEach(c => { if (c.el === o.id && c.state === 'field') c.el = qrf.id; }); qrf.carry += o.carry; o.carry = 0; } });
    els.forEach((el, i) => {
      const lace = `Strength ${elStr(S, el)}, ammo ${avgOf(S, el, 'ammo') > 60 ? 'green' : avgOf(S, el, 'ammo') > 30 ? 'amber' : 'red'}.`;
      rep(S, el, (i === 0 ? msg + ' ' : '') + lace, { sev: i === 0 ? 2 : 1, cat: 'contact', tid: i === 0 ? endTid : null });
      if (el.kind === 'assault' && en.kind === 'assault' && how === 'enemy_broke') { el.state = 'dwell'; if (el.carry > 0) medRequest(S, el); return; }
      if (how === 'friendly_broke') { abortMission(S, el, 'broke contact'); if (el.carry > 0) medRequest(S, el); return; }
      if (el.ride) { el.state = 'moving'; el.note = 'Escorting PACKHORSE'; if (el.carry > 0) medRequest(S, el); return; }
      if (el.carry > 0 && el.kind !== 'qrf') casevacHold(S, el);
      else if (el.casTaken > 0 || avgOf(S, el, 'ammo') < 30) abortMission(S, el, el.casTaken ? 'casualties' : 'ammunition low');
      else { el.state = el.steps[el.si] && el.steps[el.si].k === 'dwell' ? 'dwell' : 'moving'; el.note = 'Continuing mission'; }
    });
  }
  function stepCas(S) {
    S.cas.forEach(c => {
      if (c.state !== 'field') return; const age = S.t - c.t0; const h = age > 120 ? 0.012 : age > 60 ? 0.004 : 0.0006;
      if (ch(S, h)) { c.state = 'dow'; c.doneAt = S.t; S.stats.dow++; S.stats.wia--; const el = elById(S, c.el); if (el) { el.carry = Math.max(0, el.carry - 1); rep(S, el, `Urgent casualty died of wounds, ${Math.round(age)} minutes after wounding.`, { sev: 2, cat: 'contact', tid: truth(S, `Casualty from ${c.sq} died of wounds after ${Math.round(age)} min without surgery`, 'cas') }); } }
    });
  }
  function medevac(S, el) {
    const H = S.higher, a = H.assets.find(x => x.type === 'mev' && !x.busy);
    if (!a) { const why = H.assets.filter(x => x.type === 'mev').map(x => `${x.call}: ${x.busy.why}, ${x.busy.who}, until about ${dtg(x.busy.until)}`).join('; '); tocLog(S, 'ANVIL MAIN', `No MEDEVAC aircraft available. ${why}.`, 2, 'higher'); return false; }
    const node = nodeOf(el); const eta = S.t + 15 + Math.round(distKm(node, 'fob') * 2) + ri(S, 0, 8);
    a.busy = { who: 'KESTREL', until: eta + 45, why: 'MEDEVAC for ' + el.name }; S.mev.push({ asset: a.id, call: a.call, el: el.id, at: eta, tries: 0 });
    tocLog(S, a.call, `Wheels up for ${el.name}. ETA ${hhmm(eta)} at LZ vic ${N[node].name}.`, 1, 'higher'); return true;
  }
  function stepMev(S) {
    if (!S.mev.length) return;
    S.mev = S.mev.filter(m => {
      if (S.t < m.at) return true; const el = elById(S, m.el); const a = S.higher.assets.find(x => x.id === m.asset);
      if (!el || el.carry <= 0) { if (a) a.busy = null; return false; }
      const hot = !!el.eng, mute = elSig(S, el) === 0 && !el.sat;
      if (hot || mute) { m.tries++; if (m.tries > 4) { tocLog(S, m.call, hot ? 'LZ still hot. Bingo fuel, returning to base.' : `Cannot raise ${el.name} to mark the LZ. Bingo fuel, returning to base.`, 2, 'higher'); if (a) a.busy = null; return false; } m.at = S.t + 10; if (m.tries === 1) tocLog(S, m.call, hot ? 'LZ is hot. Holding to the south.' : `No comms with ${el.name}, searching for the LZ.`, 1, 'higher'); return true; }
      let n = 0; S.cas.forEach(c => { if (c.el === el.id && c.state === 'field') { const age = S.t + 12 - c.t0; const ps = age <= 60 ? 0.97 : age <= 90 ? 0.88 : age <= 120 ? 0.75 : 0.55; if (ch(S, ps)) c.state = 'saved'; else { c.state = 'dow'; S.stats.dow++; S.stats.wia--; } c.doneAt = S.t; c.air = true; n++; } });
      el.carry = 0; tocLog(S, m.call, `${n} patient${n === 1 ? '' : 's'} on board from ${el.name}. Wheels up for the surgical team.`, 1, 'higher'); truth(S, `${m.call} lifted ${n} urgent casualt${n === 1 ? 'y' : 'ies'} from ${el.name}`, 'cas', true);
      return false;
    });
  }

  /* ---------- decisions ---------- */
  function makeDec(S, el, d) {
    if (d.type === 'medevac') addDec(S, { type: 'medevac', el: el.id, title: `MEDEVAC request from ${el.name}`, text: `${el.carry} urgent surgical casualt${el.carry === 1 ? 'y' : 'ies'} with ${el.name} near ${N[nodeOf(el)].name}. Survival drops sharply after 60 minutes without surgery.`, opts: [{ k: 'air', label: 'Request air MEDEVAC from brigade' }, { k: 'ground', label: 'Launch the QRF for ground evacuation' }, { k: 'self', label: 'Element carries its own casualties back' }] });
    else if (d.type === 'go') { const op = opOf(S, el); addDec(S, { type: 'go', el: el.id, title: `${op.name}: GO request`, text: `${el.name} is set at the release point (${N[op.orp].name}) and requests GO for H-hour ${hhmm(op.hhour)} on ${N[op.obj].name}.`, opts: [{ k: 'go', label: 'GO' }, { k: 'hold', label: 'Hold 30 minutes' }, { k: 'abort', label: 'Abort the operation' }] }); }
    else if (d.type === 'abortreq') addDec(S, { type: 'abortreq', el: el.id, title: `${el.name} recommends abort`, text: `The leader's recon shows more enemy on the objective than you briefed.`, opts: [{ k: 'abort', label: 'Abort and return' }, { k: 'cont', label: 'Continue the assault' }] });
    else if (d.type === 'comp') addDec(S, { type: 'comp', el: el.id, title: `${el.name} believes it is compromised`, text: `Staying risks a deliberate attack on an isolated position at ${N[nodeOf(el)].name}.`, opts: [{ k: 'extract', label: 'Extract now' }, { k: 'stay', label: 'Stay and keep observing' }] });
  }
  function decide(S, id, k) {
    const d = S.decs.find(x => x.id === id); if (!d) return { ok: false };
    const el = d.el ? elById(S, d.el) : null; let res = { ok: true };
    const drop = () => { S.decs = S.decs.filter(x => x !== d); };
    if (d.type === 'convoy') {
      const c = S.convoys.find(x => x.id === d.conv);
      if (k === 'green') { c.go = true; tocLog(S, 'KESTREL TOC', 'Route Amber reported GREEN to battalion. PACKHORSE will roll on time.', 0, 'log'); }
      else { c.due += DAY; c.asked = false; c.amb = false; S.higher.priority = Math.max(10, S.higher.priority - 5); tocLog(S, 'ANVIL MAIN', `PACKHORSE held 24 hours on your call. New time at LP Dakota ${dtg(c.due)}.`, 1, 'log'); }
      drop(); return res;
    }
    if (!el) { drop(); return res; }
    if (d.type === 'medevac') {
      if (el.carry <= 0) { drop(); return res; }
      if (k === 'air') { if (medevac(S, el)) drop(); else { d.opts = d.opts.filter(o => o.k !== 'air'); d.text += ' Brigade has no aircraft free right now.'; res = { ok: false, err: 'No MEDEVAC aircraft available. See the net for why.' }; } }
      else if (k === 'ground') { const q = launchQRF(S, { el: el.id }); if (q.ok) drop(); else res = q; }
      else { res = cmd(S, el, 'rtb'); drop(); }
    }
    else if (d.type === 'go') {
      const op = opOf(S, el);
      if (k === 'go') { res = cmd(S, el, 'go'); drop(); }
      else if (k === 'hold') { op.hhour += 30; const st = el.steps.find(x => x.k === 'dwell' && x.kind === 'orp'); if (st) st.until += 30; el.goAsked = false; tocLog(S, 'KESTREL TOC', `${op.name}: H-hour slipped to ${hhmm(op.hhour)}.`, 0, 'ops'); drop(); }
      else { res = cmd(S, el, 'rtb'); drop(); }
    }
    else if (d.type === 'abortreq') { res = cmd(S, el, k === 'abort' ? 'rtb' : 'cont'); drop(); }
    else if (d.type === 'comp') { res = k === 'extract' ? cmd(S, el, 'rtb') : { ok: true }; drop(); }
    return res;
  }

  /* ---------- enemy ---------- */
  function leaderMove(S) {
    const E = S.enemy, from = E.leaderAt; const opts = OBJS.filter(n => n !== from);
    const w = opts.map(n => (friendAt(S, n) ? 0.1 : 1) * (S.intel.est[n] && S.t - S.intel.est[n].asOf < 720 ? 0.6 : 1));
    const to = rnd(S) * (w[0] + w[1]) < w[0] ? opts[0] : opts[1];
    const via = from !== 'obA' && to !== 'obA' ? ['obA'] : [];
    const g = E.groups.find(x => x.leader);
    if (g && !g.inEng) { const stay = Math.max(0, g.size - ri(S, 6, 8)); E.pools.deep += stay; g.size -= stay; g.node = to; g.prepared = E.alert.deep >= 2; g.reinf = false; g.since = S.t; }
    E.leaderAt = to; E.spooked = false; E.nextMove = S.t + ri(S, 26, 54) * 60;
    const tid = truth(S, `Network leader moved from ${N[from].name} to ${N[to].name}`, 'hvt');
    const watch = [from, to].concat(via); const text = `Six to eight armed pax escorting one individual, moving from ${N[from].name} toward ${N[to].name}.`;
    S.els.forEach(el => { if (el.relay && el.loc.at && watch.some(n => n === el.loc.at || ADJ[el.loc.at].some(a => a.to === n)) && ch(S, 0.55)) rep(S, el, text, { sev: 1, cat: 'intel', fx: { k: 'hvtmove', from, to }, tid }); });
    S.higher.windows.forEach(w2 => { if (w2.type === 'isr' && w2.on && watch.some(n => n === w2.node || ADJ[w2.node].some(a => a.to === n)) && ch(S, 0.8)) { applyFx(S, { k: 'hvtmove', from, to }, S.t); toToc(S, { from: w2.call, text, sev: 1, cat: 'intel', tid }); } });
  }
  function rockets(S) {
    const E = S.enemy, n = ri(S, 1, 3); S.fobDisturbed = S.t + 180; let txt = `Incoming. ${n} rocket impact${n > 1 ? 's' : ''} inside the wire.`; const r = rnd(S);
    if (r < 0.25) { const f = ri(S, 100, 300); S.stocks.fuel = Math.max(0, S.stocks.fuel - f); txt += ` Fuel bladder hit, ${f} L lost.`; }
    else if (r < 0.38) { S.stocks.ammo = Math.max(0, S.stocks.ammo - 1); txt += ' Ammunition point hit, one basic load destroyed.'; }
    else if (r < 0.5) { const c = S.squads.filter(s => s.task !== 'out' && s.str > 0); if (c.length) { const s = pick(S, c); s.str--; if (ch(S, 0.2)) { S.stats.kia++; txt += ` One KIA (${s.id}).`; } else { S.stats.wia++; txt += ` One WIA (${s.id}), treated at the aid station.`; } } }
    else txt += ' No casualties.';
    const poo = ch(S, 0.6) ? 'rdg' : 'orc'; txt += ` Point of origin assessed vic ${N[poo].name}.`;
    truth(S, `Rocket attack on the FOB from ${N[poo].name}`, 'enemy', true); tocLog(S, 'KESTREL TOC', txt, 2, 'contact');
    if (S.stocks.mortar >= 8) { S.stocks.mortar -= 8; const k = Math.min(Math.floor(E.pools.near), ri(S, 0, 2)); E.pools.near -= k; S.stats.enemyKia += k; tocLog(S, 'THUNDER', `Counter-fire, 8 rounds on the point of origin. ${k ? 'Secondary explosion observed.' : 'Effect unknown.'}`, 0, 'ops'); }
  }
  function enemyHourly(S) {
    const E = S.enemy, h = hour(S.t), night = isNight(S.t);
    if (S.t % 720 === 0) { for (const r in E.alert) E.alert[r] = Math.max(0, E.alert[r] - 1); const old = E.intent; E.intent = E.alert.deep >= 2 ? 'protect' : (E.alert.route >= 2 || E.pools.route < 5) ? 'harass' : 'interdict'; if (old !== E.intent) truth(S, `Enemy shifted effort from ${old} to ${E.intent}`, 'enemy'); }
    if (h === 0 && totalEnemy(S) < 105) { const inflow = Math.round(ri(S, 3, 7) * (E.cacheDestroyed ? 0.5 : 1)); E.pools.deep += inflow; truth(S, `${inflow} enemy fighters arrived over the Saddle`, 'enemy'); }
    if (S.t % 360 === 0) { const sh = { interdict: { route: 0.25, near: 0.15, valley: 0.2, deep: 0.4 }, harass: { route: 0.12, near: 0.3, valley: 0.2, deep: 0.38 }, protect: { route: 0.08, near: 0.12, valley: 0.25, deep: 0.55 } }[E.intent]; const tot = E.pools.route + E.pools.near + E.pools.valley + E.pools.deep; for (const r in sh) E.pools[r] += (sh[r] * tot - E.pools[r]) * 0.15; }
    E.groups = E.groups.filter(g => { if (g.inEng || (g.pin && g.posture !== 'ambush' && g.posture !== 'attack')) return true; if (g.posture === 'ambush' || g.posture === 'attack') { if (S.t < (g.until || 0)) return true; } else if (E.res[g.node] > S.t) return true; E.pools[N[g.node].reg] += g.size; return false; });
    if (h >= 21 || h <= 3) SEGS.forEach(seg => {
      if (E.ieds.some(i => i.seg === seg.k && !i.gone)) return;
      let p = 0.045 * clamp(E.pools.route / 12, 0.3, 1.5); if (opAt(S, seg.a) || opAt(S, seg.b)) p *= 0.15; else if (S.route.segs[seg.k].passed > S.t - 360) p *= 0.6; if (E.intent === 'interdict') p *= 1.4;
      if (!ch(S, p)) return;
      E.ieds.push({ seg: seg.k, t: S.t, gone: false }); const tid = truth(S, `IED emplaced on the road, ${seg.name}`, 'ied'); const text = `Two to three pax digging at the road edge, ${seg.name}. Possible IED emplacement.`;
      S.els.forEach(el => { if (el.relay && (el.loc.at === seg.a || el.loc.at === seg.b) && ch(S, 0.6)) rep(S, el, text, { sev: 1, cat: 'intel', fx: { k: 'iedwarn', seg: seg.k }, tid }); });
      S.higher.windows.forEach(w => { if (w.on && w.type === 'isr' && (w.node === seg.a || w.node === seg.b) && ch(S, 0.7)) { applyFx(S, { k: 'iedwarn', seg: seg.k }, S.t); toToc(S, { from: w.call, text, sev: 1, cat: 'intel', tid }); } });
    });
    if (night) {
      let p = 0.035 * clamp(E.pools.near / 10, 0.2, 1.6) * (E.intent === 'harass' ? 1.6 : 1); if (opAt(S, 'rdg')) p *= 0.3; if (opAt(S, 'orc')) p *= 0.6; if (ch(S, p)) rockets(S);
      const guards = S.squads.filter(s => s.task === 'guard' && s.str >= 4).length;
      if (!guards && ch(S, 0.08 * clamp(E.pools.near / 10, 0.3, 1.5))) { const f = ri(S, 150, 400); S.stocks.fuel = Math.max(0, S.stocks.fuel - f); const c = S.squads.filter(s => s.task !== 'out' && s.str > 0); let cas = ''; if (c.length && ch(S, 0.6)) { const s = pick(S, c); s.str--; S.stats.wia++; cas = ` One WIA (${s.id}).`; } truth(S, 'Sappers breached the unguarded perimeter', 'enemy', true); tocLog(S, 'KESTREL TOC', `Perimeter breached. No guard force was posted. Satchel charge in the fuel point, ${f} L lost.${cas}`, 2, 'contact'); }
      else if (guards && ch(S, 0.012)) tocLog(S, 'KESTREL TOC', 'Guard force engaged two pax probing the east wire. Probe withdrew.', 1, 'contact');
    }
    S.els.forEach(el => {
      if (el.eng || !el.relay || !el.loc.at) return; const node = el.loc.at, r = N[node].reg, L = ldr(S, el);
      if (!el.comp) {
        let p = (night ? 0.004 : 0.012) * (1 + E.alert[r] / 2) * (1.3 - 0.06 * L.tac) * (r === 'deep' ? 1.5 : r === 'route' ? 0.5 : 1); if (S.t - el.dwellStart > DAY) p *= 1.5;
        if (ch(S, p)) { const size = Math.min(Math.floor(E.pools[r]), ri(S, 8, 15)); if (size >= 5) { el.comp = { at: S.t + ri(S, 2, 5) * 60, size, aware: false }; truth(S, `${el.name} was compromised at ${N[node].name}; enemy began massing ${size} fighters`, 'enemy'); if (ch(S, 0.35 + 0.08 * L.tac)) { el.comp.aware = true; rep(S, el, `Assess we are compromised. ${night ? 'Signalling lights on the far slope.' : 'A herder walked onto the position.'} Recommend extraction.`, { sev: 2, dec: { type: 'comp' } }); } } }
      } else if (S.t >= el.comp.at) { const g = spawn(S, node, el.comp.size, 'attack', { pin: true, min: 5, until: S.t + 240 }); if (g) { const en = startEng(S, node, [el], g, 'defence', {}); en.aware = el.comp.aware; } el.comp = null; }
    });
    if (E.leader === 'atlarge') { if (E.alert.deep >= 2 && !E.spooked) { E.spooked = true; E.nextMove = Math.min(E.nextMove, S.t + ri(S, 1, 3) * 60); } if (S.t >= E.nextMove && (night || E.alert.deep >= 2)) leaderMove(S); }
    S.convoys.forEach((c, i) => {
      if (c.state !== 'sched' || c.amb || S.t < c.due - 120 || S.t >= c.due) return; c.amb = true;
      let p = [0.15, 0.35, 0.45, 0.5, 0.5][i] * clamp(E.pools.route / 12, 0.3, 1.3) * (E.intent === 'interdict' ? 1.3 : 0.8);
      const pres = ['c1', 'c2', 'c3'].filter(n => S.route.vis[n] > S.t - 600).length; p *= Math.max(0.3, 1 - 0.2 * pres);
      if (!ch(S, p)) return; const cand = ['c1', 'c2', 'c3'].filter(n => !friendAt(S, n)); if (!cand.length) return;
      const node = pick(S, cand); const g = spawn(S, node, ri(S, 7, 12), 'ambush', { until: c.due + 300 }); if (g) truth(S, `Enemy set an ambush for the convoy at ${N[node].name} (${g.size} fighters)`, 'enemy');
    });
  }

  /* ---------- higher ---------- */
  function prio(S) { const H = S.higher; return H.priority + (H.mainEffort > S.t ? 40 : 0) + (S.engs.length ? 25 : 0); }
  function endWindow(S, w, why, sev) { w.on = false; w.ended = true; const a = S.higher.assets.find(x => x.id === w.asset); if (a) a.res = null; tocLog(S, w.call, `Off station. ${why}.`, sev || 1, 'higher'); }
  function decideReq(S, r) {
    const H = S.higher; r.done = true; const end = r.start + r.dur; const cands = H.assets.filter(a => a.type === r.type);
    const free = cands.find(a => !a.res && (!a.busy || a.busy.until <= r.start)); const avgP = H.sectors.reduce((a, s) => a + s.p, 0) / H.sectors.length; const label = r.type === 'isr' ? 'ISR' : 'Attack aviation';
    if (free && prio(S) >= avgP - 15) {
      free.res = { start: r.start, end }; H.windows.push({ id: H.wSeq++, type: r.type, node: r.node, start: r.start, end, asset: free.id, call: free.call, on: false, ended: false, obs: {} }); r.ok = true;
      tocLog(S, 'ANVIL MAIN', `${label} request approved. ${free.call}, ${dtg(r.start)} to ${hhmm(end)}${r.type === 'isr' ? ', over ' + N[r.node].name : ', on call'}. Subject to retask.`, 1, 'higher');
    } else {
      const why = free ? `Brigade priorities are elsewhere this period (sector activity averages ${Math.round(avgP)}, your priority is ${Math.round(prio(S))})` : cands.map(a => `${a.call}: ${a.res ? 'already allocated ' + hhmm(a.res.start) + ' to ' + hhmm(a.res.end) : a.busy ? a.busy.why + ', ' + a.busy.who + ', until ' + dtg(a.busy.until) : 'held'}`).join('; ');
      r.ok = false; r.why = why; tocLog(S, 'ANVIL MAIN', `${label} request denied. ${why}.`, 1, 'higher');
    }
  }
  function higherHourly(S) {
    const H = S.higher;
    H.assets.forEach(a => { if (a.busy && a.busy.until <= S.t) a.busy = null; });
    H.sectors.forEach(s => {
      if (s.spike && s.spike <= S.t) { s.spike = 0; s.p = clamp(s.p - 25, 15, 90); }
      s.p = clamp(s.p + ri(S, -5, 5) + (40 - s.p) * 0.05, 10, 99);
      if (!s.spike && ch(S, 0.035)) {
        s.spike = S.t + ri(S, 3, 6) * 60; s.p = clamp(s.p + ri(S, 30, 45), 0, 99);
        tocLog(S, 'BRIGADE NET', `${s.name} reports troops in contact. Brigade assets shifting to support.`, 0, 'higher');
        ['isr', 'awt', 'mev'].forEach(tp => {
          if (tp === 'mev' && !ch(S, 0.5)) return;
          let a = H.assets.find(x => x.type === tp && !x.busy && (!x.res || x.res.start > s.spike));
          if (!a && s.p > prio(S)) { a = H.assets.find(x => x.type === tp && !x.busy && x.res); if (a) { const w = H.windows.find(x => x.asset === a.id && !x.ended); if (w) { if (w.on) endWindow(S, w, `Retasked to ${s.name}, troops in contact there outrank your window`, 2); else { w.ended = true; a.res = null; tocLog(S, 'ANVIL MAIN', `${a.call} window ${hhmm(w.start)} to ${hhmm(w.end)} cancelled. Aircraft retasked to ${s.name}.`, 2, 'higher'); } } } }
          if (a) a.busy = { who: s.name, until: s.spike, why: 'supporting troops in contact' };
        });
      }
    });
    if (hour(S.t) === 4) H.assets.forEach(a => { if (!a.busy && !a.res && ch(S, 0.07)) a.busy = { who: 'brigade aviation', until: S.t + ri(S, 12, 30) * 60, why: 'unscheduled maintenance' }; });
    H.reqs.forEach(r => { if (!r.done && S.t >= r.decideAt) decideReq(S, r); });
    if (H.meReq && S.t >= H.meReq) { H.meReq = 0; if (H.priority >= 45) { H.mainEffort = S.t + DAY; tocLog(S, 'ANVIL MAIN', `KESTREL is battalion main effort until ${dtg(H.mainEffort)}. Your asset requests go to the front of the queue.`, 1, 'higher'); } else tocLog(S, 'ANVIL MAIN', 'Main effort request denied. Battalion has lost confidence after recent convoy holds and setbacks.', 1, 'higher'); }
    H.windows.forEach(w => {
      if (!w.on && !w.ended && S.t >= w.start) { const a = H.assets.find(x => x.id === w.asset); if (a.busy) { w.ended = true; a.res = null; tocLog(S, 'ANVIL MAIN', `${w.call} will not make its window: ${a.busy.why}, ${a.busy.who}.`, 2, 'higher'); } else { w.on = true; tocLog(S, w.call, w.type === 'isr' ? `On station over ${N[w.node].name}. Feed is up, relay is up.` : `On call for KESTREL until ${hhmm(w.end)}.`, 1, 'higher'); } }
      if (w.on && S.t >= w.end) endWindow(S, w, 'Window complete');
    });
    if (hour(S.t) === 6) intsum(S);
    if (S.t % 360 === 0 && S.enemy.leader === 'atlarge' && ch(S, 0.22)) sigint(S);
  }
  function request(S, r) {
    if (r.start < S.t + 60) return { ok: false, err: 'Brigade needs at least an hour of notice.' };
    if (r.type === 'isr' && (!r.node || r.node === 'fob')) return { ok: false, err: 'Choose where the aircraft should orbit.' };
    S.higher.reqs.push({ id: S.higher.reqs.length + 1, type: r.type, node: r.node, start: r.start, dur: r.dur, t: S.t, decideAt: S.t + ri(S, 1, 2) * 60, done: false });
    tocLog(S, 'KESTREL TOC', `${r.type === 'isr' ? 'ISR' : 'Attack aviation'} request sent to battalion for ${dtg(r.start)}, ${r.dur / 60} h. Expect an answer within two hours.`, 0, 'higher');
    return { ok: true };
  }
  function reqMainEffort(S) { const H = S.higher; if (H.meUsed) return { ok: false, err: 'You have already asked once this deployment.' }; H.meUsed = true; H.meReq = S.t + 60; tocLog(S, 'KESTREL TOC', 'Requested main effort designation for the next 24 hours.', 0, 'higher'); return { ok: true }; }
  function reqAwtNow(S) {
    if (!S.engs.length) return { ok: false, err: 'No troops in contact.' };
    const H = S.higher, a = H.assets.find(x => x.type === 'awt' && !x.busy);
    if (!a) { const b = H.assets.find(x => x.type === 'awt'); tocLog(S, 'ANVIL MAIN', `Immediate attack aviation denied. ${b.call}: ${b.busy.why}, ${b.busy.who}, until ${dtg(b.busy.until)}.`, 1, 'higher'); return { ok: false, err: 'No attack aviation available. See the net.' }; }
    const eta = S.t + ri(S, 20, 35); a.busy = { who: 'KESTREL', until: eta + 60, why: 'supporting troops in contact' }; S.engs.forEach(en => { if (!en.awtAt) en.awtAt = eta; });
    tocLog(S, a.call, `Scrambled for KESTREL troops in contact. ETA ${hhmm(eta)}.`, 1, 'higher'); return { ok: true };
  }

  /* ---------- logistics ---------- */
  function logiHourly(S) {
    const K = S.stocks; K.rations = Math.max(0, K.rations - 1 / 24); const had = K.fuel > 0; K.fuel = Math.max(0, K.fuel - 300 / 24);
    if (had && K.fuel <= 0) tocLog(S, 'KESTREL TOC', 'Fuel is out. Generators down, radios on batteries: coverage is degraded across the AO. No mounted movement.', 2, 'log');
    if (K.rations <= 0 && S.t % 360 === 0) tocLog(S, 'KESTREL TOC', 'Rations and water exhausted. Troops will not recover properly.', 1, 'log');
    const h = S.intel.hvt; OBJS.forEach(k => { h[k] = h[k] * 0.985 + 0.005; });
  }
  function turnConvoy(S, c, why) { c.state = 'turned'; S.stats.convoyLost++; S.higher.priority = Math.max(10, S.higher.priority - 3); truth(S, `Convoy ${c.id} turned back (${why})`, 'log', true); tocLog(S, 'PACKHORSE', `Convoy combat ineffective, ${c.trucks} of 8 trucks left. Turning back to battalion. No delivery.`, 2, 'log'); }
  function stepConvoys(S) {
    S.convoys.forEach((c, i) => {
      if (c.state === 'sched') {
        if (!c.asked && S.t >= c.due - 90) {
          c.asked = true; const segs = SEGS.map(s => { const R = S.route.segs[s.k]; return `${s.name}: ${R.susp ? 'device suspected' : R.cleared ? 'cleared ' + dtg(R.cleared) : 'not cleared'}`; }).join('; ');
          addDec(S, { type: 'convoy', conv: c.id, title: `Convoy ${i + 1} of 5: route status`, text: `PACKHORSE (8 trucks: fuel, ammunition, rations, mortar rounds) reaches LP Dakota at ${hhmm(c.due)}. Battalion asks for your route status. ${segs}.`, opts: [{ k: 'green', label: 'Route GREEN: send it' }, { k: 'hold', label: 'Route RED: hold 24 hours' }] });
        }
        if (S.t >= c.due && c.go) { c.state = 'moving'; c.loc = { at: 'lz' }; c.pi = 0; tocLog(S, 'PACKHORSE', `SP LP Dakota, ${c.trucks} trucks, moving on Route Amber.`, 1, 'log'); }
        return;
      }
      if (c.state !== 'moving' || c.eng || c.halt > S.t) return;
      const seq = ['c1', 'c2', 'c3', 'fob'];
      if (c.loc.at) { const to = seq[c.pi]; const e = edge(c.loc.at, to); c.loc = { from: c.loc.at, to, km: e.km, done: 0, chk: false }; }
      const l = c.loc; l.done += 22 * TICK / 60; const riders = S.els.filter(el => el.ride === c.id);
      if (!l.chk && l.done >= l.km / 2) {
        l.chk = true; const sk = SEGK[l.from + '>' + l.to], R = S.route.segs[sk]; R.passed = S.t; const ied = S.enemy.ieds.find(x => x.seg === sk && !x.gone);
        if (ied) {
          ied.gone = true;
          if (ch(S, 0.2 + (riders.length ? 0.25 : 0) + (R.susp ? 0.2 : 0))) { c.halt = S.t + 25; R.susp = false; R.cleared = S.t; truth(S, `Convoy found the IED on ${SEGN[sk]}`, 'ied', true); tocLog(S, 'PACKHORSE', `IED found, ${SEGN[sk]}. Halted while it is reduced.`, 1, 'log'); }
          else { const k = ri(S, 1, 2); c.trucks = Math.max(0, c.trucks - k); c.halt = S.t + 35; R.inc++; R.lastInc = S.t; S.stats.ied++; truth(S, `IED strike on the convoy, ${SEGN[sk]}: ${k} truck(s) destroyed`, 'ied', true); tocLog(S, 'PACKHORSE', `IED STRIKE, ${SEGN[sk]}. ${k} truck${k > 1 ? 's' : ''} destroyed. Recovering.`, 2, 'contact'); if (riders.length && ch(S, 0.3)) casualty(S, riders[0], null); if (c.trucks <= 4) { turnConvoy(S, c, 'IED losses'); return; } }
        }
      }
      if (l.done >= l.km) {
        const n = l.to; c.loc = { at: n }; c.pi++;
        if (n === 'fob') {
          const f = c.trucks / 8, K = S.stocks; K.fuel = Math.min(2400, K.fuel + 800 * f); K.ammo = Math.min(12, K.ammo + 4 * f); K.rations = Math.min(6, K.rations + 2.2 * f); K.mortar = Math.min(72, K.mortar + Math.round(24 * f));
          c.state = 'arrived'; S.stats.convoys++; S.higher.priority += 2; truth(S, `Convoy ${c.id} delivered with ${c.trucks} of 8 trucks`, 'log', true); tocLog(S, 'PACKHORSE', `RP FOB Kestrel. ${c.trucks} of 8 trucks delivered.`, 1, 'log'); return;
        }
        resolve(S, n, 60); const amb = S.enemy.groups.find(g => g.node === n && g.posture === 'ambush' && !g.inEng);
        if (amb) { const here = S.els.filter(el => !el.eng && (el.ride === c.id || el.loc.at === n)); const en = startEng(S, n, here, amb, 'ambush', { conv: c.id }); c.eng = en.id; }
      }
    });
  }

  /* ---------- tick ---------- */
  function stepSquads(S) {
    const bad = S.fobDisturbed > S.t || S.stocks.rations <= 0;
    S.squads.forEach(s => {
      let d;
      if (s.task === 'out') { const el = S.els.find(e => e.squads.includes(s.id)); if (!el || el.state === 'staged') d = -0.5; else if (el.eng) d = 1.0; else if (el.state === 'moving' || el.state === 'rtb') d = veh(el) ? 0.25 : (isNight(S.t) ? 0.62 : 0.52); else d = 0.08; }
      else d = s.task === 'guard' ? 0.17 : s.task === 'qrf' ? -0.12 : -0.6;
      if (d < 0 && bad) d *= 0.5; s.fat = clamp(s.fat + d, 0, 100);
    });
  }
  function tick(S) {
    if (S.over) return;
    S.t += TICK; S._sig = sigMap(S);
    if (S.t % 60 === 0) { enemyHourly(S); higherHourly(S); logiHourly(S); }
    if (S.t % 30 === 0) isrStep(S);
    stepConvoys(S);
    S.els.slice().forEach(el => { if (S.els.includes(el)) stepEl(S, el); });
    S.engs.slice().forEach(en => { if (S.engs.includes(en)) stepEng(S, en); });
    S._sig = sigMap(S);
    S.els.slice().forEach(el => comms(S, el));
    stepCas(S); stepMev(S); stepCmds(S); stepSquads(S); flushInbox(S);
    if (S.t >= S.end) endGame(S, 'Deployment window closed.');
    else if (S.enemy.leader !== 'atlarge' && S.enemy.cacheDestroyed && !S.els.length) endGame(S, 'Both decisive objectives achieved.');
  }
  function endGame(S, why) {
    if (S.over) return; S.over = true; const E = S.enemy, st = S.stats; let pts = 0;
    if (E.leader !== 'atlarge') pts += 40; if (E.cacheDestroyed) pts += 25;
    pts += Math.min(25, st.convoys * 6); pts -= (st.kia + st.dow) * 6 + st.wia * 1.5; pts += Math.min(10, st.enemyKia / 4);
    S.result = { pts: Math.round(pts), grade: pts >= 75 ? 'Decisive' : pts >= 50 ? 'Effective' : pts >= 25 ? 'Marginal' : 'Failed', why, enemyLeft: Math.round(totalEnemy(S)) };
    pause(S, 'Deployment over');
  }

  function newGame(seed) {
    const S = {
      v: 1, seed, rs: seed | 0, t: 360, end: 10 * DAY + 360, speed: 0, pauseWhy: '', squads: [], els: [], elSeq: 1, engs: [], engSeq: 1, cas: [], casSeq: 1, mev: [], cmds: [], decs: [], decSeq: 1,
      log: [], inbox: [], truth: [], ops: [], opSeq: 1, stocks: { fuel: 1100, ammo: 6, rations: 3, mortar: 36 },
      stats: { kia: 0, wia: 0, dow: 0, enemyKia: 0, convoys: 0, ied: 0, convoyLost: 0 }, route: { segs: {}, vis: {} }, rapport: {}, patterns: {}, fobDisturbed: 0, over: false, result: null
    };
    SEGS.forEach(s => { S.route.segs[s.k] = { passed: 0, cleared: 0, susp: false, inc: 0, lastInc: 0 }; });
    const names = ['Okafor', 'Reyes', 'Lindqvist', 'Tran', 'Whitaker', 'Mbeki', 'Castellano', 'Novak', 'Harlan', 'Ishikawa', 'Dubois', 'Petrov'];
    for (let i = names.length - 1; i > 0; i--) { const j = Math.floor(rnd(S) * (i + 1)); const t = names[i]; names[i] = names[j]; names[j] = t; }
    for (let p = 1; p <= 3; p++) for (let i = 1; i <= 3; i++) S.squads.push({ id: p + '-' + i, plt: p, ldr: { name: 'SSG ' + names.pop(), tac: ri(S, 2, 5), nerve: ri(S, -2, 2), comms: ri(S, 2, 5) }, str: 9, fat: ri(S, 5, 25), mor: 70, ammo: 100, exp: 0, task: 'rest' });
    S.squads[0].task = 'guard'; S.squads[3].task = 'qrf';
    const la = pick(S, OBJS), ca = pick(S, OBJS.filter(x => x !== la));
    S.enemy = { pools: { route: ri(S, 9, 14), near: ri(S, 8, 13), valley: ri(S, 14, 20), deep: ri(S, 28, 38) }, groups: [], gSeq: 1, ieds: [], leaderAt: la, cacheAt: ca, cacheDestroyed: false, leader: 'atlarge', nextMove: S.t + ri(S, 24, 50) * 60, alert: { route: 0, near: 0, valley: 0, deep: 0 }, intent: 'interdict', res: {}, spooked: false };
    S.intel = { est: {}, reg: {}, hvt: { obA: 1 / 3, obB: 1 / 3, obC: 1 / 3 }, hvtAsOf: S.t, tips: [], cache: null };
    S.convoys = [2, 4, 6, 8, 10].map((d, i) => ({ id: i + 1, due: (d - 1) * DAY + 540, state: 'sched', trucks: 8, asked: false, go: false, amb: false, halt: 0, eng: null, loc: null, pi: 0 }));
    S.higher = { priority: 50, mainEffort: 0, meUsed: false, meReq: 0, wSeq: 1, reqs: [], windows: [],
      sectors: [{ id: 'w', name: 'AO West', p: ri(S, 30, 50), spike: 0 }, { id: 'e', name: 'AO East', p: ri(S, 25, 45), spike: 0 }, { id: 'n', name: 'AO North', p: ri(S, 40, 60), spike: 0 }],
      assets: [['isr1', 'isr', 'GREY 1'], ['isr2', 'isr', 'GREY 2'], ['awt1', 'awt', 'LANCER 31'], ['mev1', 'mev', 'DUSTOFF 1'], ['mev2', 'mev', 'DUSTOFF 2']].map(a => ({ id: a[0], type: a[1], call: a[2], busy: null, res: null })) };
    S._sig = sigMap(S);
    tocLog(S, 'ANVIL MAIN', 'KESTREL, you have the AO as of 0600. First logistics convoy reaches LP Dakota D2 0900. Network leadership is assessed at the Ruins, the Brick kilns or the Upper farms. Good hunting.', 0, 'higher');
    intsum(S);
    return S;
  }

  root.SIM = { TICK, DAY, NODES, EDGES, SEGS, REG, OBJS, N, ADJ, SEGN, newGame, tick, sigMap, path, build, issue, buildOp, planOp, setTask, launchQRF, cmd, decide, request, reqMainEffort, reqAwtNow, planPos, tocLoad, endGame, hour, dayOf, isNight, hhmm, dtg, grid, distKm, fmtDur, elSig, elStr, nodeOf, satFree, regTotal, totalEnemy, lostText, prio };
})(typeof window !== 'undefined' ? window : globalThis);
