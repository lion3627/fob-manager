'use strict';
/* Communications and organisational knowledge. Nothing reaches the command post except by a message
   that travelled over a link, a position beacon, or a sensor the command post owns. */
(function () {
  const F = globalThis.FOB;
  /* Which channel can this unit use right now?
     direct: inside the base. voice: FM radio, needs range and line of sight to the mast (or one relay).
     data: vehicle-mounted satellite messaging, slow but terrain-independent. null: no communications. */
  F.link = (W, u) => {
    const mast = W.map.nodes.fob, pwr = W.fob.power ? 1 : 0.5;
    if (u.riding && W.units[u.riding]) return F.link(W, W.units[u.riding]); // passengers talk on the vehicle's sets
    if (F.atFob(W, u.pos)) return 'direct';
    const vpos = u.vehicles.length ? W.vehicles[u.vehicles[0]].pos : null;
    const withVeh = vpos && (!u.dis || F.dist(u.pos, vpos) < 150);
    const range = (withVeh ? 12000 : 6000) * pwr;
    if (F.dist(u.pos, mast) <= range && !F.blocked(W, u.pos, mast)) return 'voice';
    for (const id in W.units) { const r = W.units[id]; if (r === u || r.side !== 'blue' || r.kind === 'hq' || r.kind === 'support' || !F.unitOk(W, r).length) continue; if (F.atFob(W, r.pos)) continue; if (F.dist(u.pos, r.pos) <= 5000 && !F.blocked(W, u.pos, r.pos) && F.dist(r.pos, mast) <= 12000 * pwr && !F.blocked(W, r.pos, mast)) return 'voice'; }
    if (vpos && (withVeh || (F.dist(u.pos, vpos) <= 3000 && !F.blocked(W, u.pos, vpos)))) return 'data';
    if (u.tacsat && !u.moving && W.t - (u.stillSince == null ? W.t : u.stillSince) >= 60) return 'tacsat'; // manpack satellite radio: only once halted with the antenna up
    return null;
  };
  F.send = (W, from, to, type, prio, text, data, cause) => {
    const m = { id: W.nid++, t0: W.t, from, to, type, prio: prio || 'R', text, data: data || {}, state: 'q', chan: null, tArr: 0, tries: 0, cause: cause == null ? null : cause };
    W.msgs.push(m); return m;
  };
  function self(W, u) { const ok = F.unitOk(W, u); let am = 0, cap = 0; for (const id of u.members) { const s = W.soldiers[id]; if (s.state !== 'ok') continue; const w = F.WEAPONS[s.weapon]; am += s.carry[w.ammo] || 0; cap += w.load; } return { pos: { x: Math.round(u.pos.x), y: Math.round(u.pos.y) }, str: ok.length, ammo: cap ? Math.round(am / cap * 100) : 0, cas: u.members.length - ok.length - u.members.filter(id => W.soldiers[id].evac).length, status: u.task }; }
  F.selfRep = self;
  /* A unit reports to the command post. The content is what the unit itself knows. */
  F.report = (W, u, type, prio, text, extra, cause) => F.send(W, u.id, 'HQ', type, prio, text, Object.assign({ self: self(W, u) }, extra || {}), cause);

  function upsert(W, c) {
    const H = W.hq; let k = H.contacts.find(x => F.dist(x.pos, c.pos) < 700 && c.t - x.t < 3600 && c.t >= x.t);
    if (k) { k.pos = c.pos; k.t = c.t; k.tRecv = W.t; k.size = [Math.max(k.size[0], c.size[0]), Math.max(k.size[1], c.size[1])]; k.act = c.act; k.src = c.src; k.n++; }
    else { k = Object.assign({ id: 'C' + (H.cseq++), tRecv: W.t, n: 1 }, c); H.contacts.push(k); if (H.contacts.length > 40) H.contacts.shift(); }
    return k;
  }
  F.hqContact = upsert;
  function hqRecv(W, m) {
    const H = W.hq, u = W.units[m.from];
    H.log.push({ id: m.id, t: W.t, t0: m.t0, from: u ? u.call : m.from, type: m.type, prio: m.prio, text: m.text, chan: m.chan }); if (H.log.length > 400) H.log.splice(0, 80);
    if (m.data.self && u) H.units[u.id] = Object.assign({ t: m.t0, src: m.chan }, m.data.self);
    if (m.data.enemy) m.contact = upsert(W, { pos: m.data.enemy.pos, t: m.t0, size: m.data.enemy.size, act: m.data.enemy.act, src: u ? u.call : m.from }).id;
    if (m.data.convoy) H.convoy = Object.assign({ t: m.t0 }, m.data.convoy);
    F.ev(W, 'hq-recv', `Command post logged ${m.type} from ${u ? u.call : m.from} (sent ${F.clockS(m.t0)}, ${m.chan})`, { msg: m.id }, m.cause);
    F.staffOnReport(W, m, u);
  }
  F.stepComms = W => {
    if (!W.msgs.length) return;
    for (const m of W.msgs) {
      if (m.state === 'q') {
        const unit = W.units[m.from === 'HQ' ? m.to : m.from]; let chan, delay;
        if (m.from === 'DEPOT' || m.to === 'DEPOT') { chan = 'sat'; delay = F.ri(W, 60, 120); }
        else {
          if (!unit) { m.state = 'done'; continue; }
          chan = F.link(W, unit);
          if (!chan) { if (!m.tries) F.ev(W, 'no-comms', `${m.type} ${m.from === 'HQ' ? 'to' : 'from'} ${unit.call} cannot be passed: no link from ${F.grid(unit.pos)}`, null, m.cause); m.tries++; continue; }
          delay = chan === 'direct' ? 5 : chan === 'voice' ? F.ri(W, 10, 25) : chan === 'tacsat' ? F.ri(W, 30, 90) : F.ri(W, 120, 300);
        }
        const proc = m.to === 'HQ' ? (m.prio === 'F' ? F.ri(W, 20, 45) : m.prio === 'P' ? F.ri(W, 45, 120) : F.ri(W, 90, 240)) : m.from === 'HQ' ? F.ri(W, 30, 75) + F.ri(W, 15, 40) : F.ri(W, 30, 90);
        m.chan = chan; m.tArr = W.t + delay + proc; m.state = 'air';
      } else if (m.state === 'air' && W.t >= m.tArr) {
        m.state = 'done';
        if (m.to === 'HQ') hqRecv(W, m); else if (m.to === 'DEPOT') F.depotRecv(W, m); else if (W.units[m.to]) F.unitRecv(W, W.units[m.to], m);
      }
    }
    if (W.t % 60 === 0) W.msgs = W.msgs.filter(m => m.state !== 'done' && W.t - m.t0 < 6 * F.H);
  };
  /* Position beacons from vehicles, and what the base can see for itself. */
  F.stepAwareness = W => {
    const H = W.hq, mast = W.map.nodes.fob, night = F.isNight(W.t);
    for (const id in W.units) {
      const u = W.units[id]; if (u.side !== 'blue') continue; const k = H.units[id];
      if (F.atFob(W, u.pos)) { H.units[id] = Object.assign({ t: W.t, src: 'fob' }, self(W, u)); continue; }
      if (u.riding && W.units[u.riding] && k) { const c = W.units[u.riding]; if ((c.lastBeacon || 0) > (u.lastBeacon || 0)) { u.lastBeacon = c.lastBeacon; k.pos = { x: Math.round(c.pos.x), y: Math.round(c.pos.y) }; k.t = W.t; k.src = 'beacon'; k.veh = false; } continue; }
      if (u.vehicles.length && W.t - u.lastBeacon >= 300) { u.lastBeacon = W.t; const v = W.vehicles[u.vehicles[0]]; if (k) { k.pos = { x: Math.round(v.pos.x), y: Math.round(v.pos.y) }; k.t = W.t; k.src = 'beacon'; k.veh = u.dis && F.dist(u.pos, v.pos) > 150; } }
    }
    const R = (night ? 700 : 1300) + (W.fob.project.done ? 300 : 0);
    const seen = []; for (const id in W.soldiers) { const e = W.soldiers[id]; if (e.side !== 'red' || e.state === 'kia') continue; const r = F.dist(e.pos, mast); if (r <= R && !F.blocked(W, e.pos, mast) && F.ch(W, 0.45 * (1 - F.coverAt(W, e.pos) * (e.moving ? 0.4 : 1)))) seen.push(e); }
    if (seen.length) { const c = { x: 0, y: 0 }; seen.forEach(e => { c.x += e.pos.x / seen.length; c.y += e.pos.y / seen.length; }); upsert(W, { pos: { x: Math.round(c.x), y: Math.round(c.y) }, t: W.t, size: [seen.length, seen.length + 1], act: 'observed by base cameras', src: 'TOWER' }); }
  };
})();
