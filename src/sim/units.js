'use strict';
/* Subordinate leaders. A unit carries out its plan step by step, reacts to contact by drill,
   reports what it knows, and acts on orders only once they have actually reached it. */
(function () {
  const F = globalThis.FOB;
  const next = u => { u.pi++; };
  const fobPos = (W, k) => ({ x: W.map.nodes.fob.x + F.FOBLAY[k].x, y: W.map.nodes.fob.y + F.FOBLAY[k].y });
  F.fobPos = fobPos;
  F.ammoPct = (W, u) => F.selfRep(W, u).ammo;
  function enemyEst(W, u) { const fr = F.fresh(W, u, 150); if (!fr.length) return { pos: { x: Math.round(u.pos.x), y: Math.round(u.pos.y) }, size: [1, 6], act: 'firing from unknown position', n: 0 }; const c = { x: 0, y: 0 }; fr.forEach(t => { c.x += t.x / fr.length; c.y += t.y / fr.length; }); return { pos: { x: Math.round(c.x + F.ri(W, -80, 80)), y: Math.round(c.y + F.ri(W, -80, 80)) }, size: [fr.length, fr.length + 2], act: fr.some(t => W.t - W.soldiers[t.id].firedAt < 30) ? 'engaging with small arms' : 'armed, moving', n: fr.length }; }
  F.enemyEst = enemyEst;

  /* ---------- plans ---------- */
  F.planReturn = (W, u) => {
    const p = [];
    if (u.vehicles.length) { const v = W.vehicles[u.vehicles[0]]; if (u.dis && F.dist(u.pos, v.pos) > 60) p.push({ k: 'walk', to: { x: v.pos.x, y: v.pos.y }, spd: 1.4 }); p.push({ k: 'mount' }); p.push({ k: 'drive', to: u.home }); p.push({ k: 'dismount' }); }
    else p.push({ k: 'walk', to: fobPos(W, 'gate'), spd: 1.3 });
    if (u.home === 'fob') { p.push({ k: 'casualties' }); if (u.vehicles.length) p.push({ k: 'refuel' }); p.push({ k: 'rearm' }); }
    p.push({ k: 'end' }); return p;
  };
  F.setPlan = (W, u, plan, task) => { u.plan = plan; u.pi = 0; u.task = task; u.mv = null; u.observing = false; };
  F.abort = (W, u, why) => { F.setPlan(W, u, F.planReturn(W, u), 'returning to base: ' + why); u.aborted = why; };

  function draw(W, u) { // rations and water for the mission, straight out of the base stores
    const r = W.stores.rations, wt = W.stores.water;
    for (const id of u.members) { const s = W.soldiers[id]; if (s.state !== 'ok') continue; F.issue(W, r, s, 'MRE', Math.max(0, 3 - (s.carry.MRE || 0))); F.issueL(W, wt, s, 'WATER', Math.max(0, 4 - (s.carry.WATER || 0))); }
    F.release(r, u.id); F.release(wt, u.id);
  }
  function runStep(W, u) {
    const s = u.plan[u.pi]; if (!s) { if (u.afterPlan) return; u.plan = null; u.task = 'idle'; return; }
    if (!s.t0) s.t0 = W.t; const el = W.t - s.t0;
    switch (s.k) {
      case 'wait': if (W.t >= s.until) next(u); break;
      case 'prep': if (!s.did) { s.did = 1; draw(W, u); } if (el >= s.dur) { F.report(W, u, 'SP', 'R', `${u.call} departing the gate, ${F.unitOk(W, u).length} pax, ${u.vehicles.length} vehicles. Task: ${u.task}.`); next(u); } break;
      case 'mount': if (!u.vehicles.length) { next(u); break; }
        if (u.dis && F.dist(u.pos, W.vehicles[u.vehicles[0]].pos) > 80) { if (!u.mv) F.walk(W, u, W.vehicles[u.vehicles[0]].pos, 1.5); s.t0 = W.t; break; }
        if (el >= 45) { u.dis = false; u.pos = { x: W.vehicles[u.vehicles[0]].pos.x, y: W.vehicles[u.vehicles[0]].pos.y }; next(u); } break;
      case 'dismount': if (el >= 20) { u.dis = true; next(u); } break;
      case 'drive':
        if (!s.go) { s.go = 1; if (!F.drive(W, u, s.to, s.spd, s.stop)) { next(u); break; } }
        else if (!u.mv) { if (s.rep && W.map.nodes[u.node]) F.report(W, u, 'CHECKIN', 'R', `${u.call} at ${W.map.nodes[u.node].name}, continuing mission.`); next(u); }
        break;
      case 'walk': if (!s.go) { s.go = 1; F.walk(W, u, s.to, s.spd); } else if (!u.mv) next(u); break;
      case 'halt': if (el >= s.dur) next(u); break;
      case 'observe':
        u.observing = true; if (!s.said) { s.said = 1; F.report(W, u, 'CHECKIN', 'R', `${u.call} set in observation post ${F.grid(u.pos)}. Observing.`); }
        if (el >= s.dur) { u.observing = false; const e = enemyEst(W, u); F.report(W, u, 'SITREP', 'P', e.n ? `${u.call} observation complete. ${e.size[0]} to ${e.size[1]} armed personnel observed vic ${F.grid(e.pos)}.` : `${u.call} observation complete. No enemy observed at the NAI.`, e.n ? { enemy: e } : null); next(u); }
        break;
      case 'support': { // QRF on scene: stay until the fight is over
        const sup = W.units[s.unit]; if ((!u.con && (!sup || !sup.con) && el > 240) || el > 2400) next(u); break; }
      case 'casualties': {
        let n = 0; for (const id of u.members) { const x = W.soldiers[id]; if (x.state !== 'ok' && !x.evac) { x.evac = true; n++; if (x.state === 'wia') W.fob.aid.push({ id, t: W.t, wounded: x.downAt }); x.pos = fobPos(W, 'aid'); } }
        if (n) F.ev(W, 'casevac', `${u.name} delivered ${n} casualt${n === 1 ? 'y' : 'ies'} to the aid station`, null, u.lastCasEv); next(u); break; }
      case 'refuel': { // one pump, 150 L a minute, out of the base tanks into each vehicle in turn
        if (W.fob.pump && W.fob.pump !== u.id) break; W.fob.pump = u.id; let busy = false;
        for (const vid of u.vehicles) { const tk = W.stores[W.vehicles[vid].tank]; if (F.free(tk, 'JP8') > 0.5) { let got = F.move(W, W.stores.fuelA, tk, 'JP8', 2.5, true); if (got < 2.5) got += F.move(W, W.stores.fuelB, tk, 'JP8', 2.5 - got, true); W.fob.fuelDrawn = (W.fob.fuelDrawn || 0) + got; if (got > 0) { busy = true; break; } } }
        if (!busy) { W.fob.pump = null; next(u); } break; }
      case 'rearm': if (el >= 300) {
        const asp = W.stores.asp; let drawn = 0;
        for (const id of u.members) { const x = W.soldiers[id]; if (x.state !== 'ok') continue; const w = F.WEAPONS[x.weapon]; drawn += F.issue(W, asp, x, w.ammo, w.load - (x.carry[w.ammo] || 0)); x.dry = false; }
        for (const vid of u.vehicles) { const v = W.vehicles[vid]; if (v.ammo) drawn += F.move(W, asp, W.stores[v.ammo], 'A762L', 800 - F.qty(W.stores[v.ammo], 'A762L')); }
        if (drawn > 0) F.ev(W, 'rearm', `${u.name} drew ${Math.round(drawn)} rounds from the ammunition holding area`); next(u); } break;
      case 'unload': F.convoyUnload(W, u, s) && next(u); break;
      case 'backload': F.convoyBackload(W, u, s) && next(u); break;
      case 'end':
        for (const vid of u.vehicles) { const v = W.vehicles[vid]; if (u.kind !== 'convoy') { v.unit = null; v.at = u.home; } }
        if (u.kind !== 'convoy') { u.vehicles = []; u.crew = []; for (const id of u.members) W.soldiers[id].gun = null; }
        u.plan = null; u.task = 'idle'; u.availAt = W.t + (u.aborted ? 3600 : 1800); u.abortedLast = !!u.aborted; u.aborted = null; u.ord = null; u.done = W.t; F.ev(W, 'mission-end', `${u.name} closed on ${W.map.nodes[u.home].name}`);
        break;
    }
  }

  /* ---------- contact ---------- */
  function startContact(W, u, why) {
    const e = enemyEst(W, u);
    u.con = { t0: W.t, phase: 'fight', last: W.t, lastFire: W.t, evalAt: W.t + 30, repAt: W.t + 180, settle: u.task === 'base security' ? 0 : W.t + 12, ev: null };
    u.con.ev = F.ev(W, 'contact', `${u.name} in contact ${F.grid(u.pos)} (${why})`, { unit: u.id });
    if (u.kind !== 'convoy') { u.hold = u.mv; u.mv = null; if (u.vehicles.length && !u.dis) u.dis = true; }
    F.report(W, u, 'CONTACT', 'F', `CONTACT. ${u.call} ${why === 'ambushed' ? 'ambushed' : 'troops in contact'} vic ${F.grid(u.pos)}. ${e.n ? e.size[0] + ' to ' + e.size[1] + ' enemy' : 'Enemy strength unknown'}, small arms. ${e.n ? 'Enemy vic ' + F.grid(e.pos) + '.' : ''}`, { enemy: e }, u.con.ev);
  }
  function breakContact(W, u, why) {
    u.con.phase = 'break'; u.hold = null;
    F.report(W, u, 'SITREP', 'F', `${u.call} breaking contact: ${why}. ${F.selfRep(W, u).cas} casualties.`, { enemy: enemyEst(W, u) }, u.con.ev);
    F.ev(W, 'break', `${u.name} breaking contact: ${why}`, null, u.con.ev);
    const fr = F.fresh(W, u, 150); let ax = 0, ay = 0; if (fr.length) { fr.forEach(t => { ax += t.x / fr.length; ay += t.y / fr.length; }); } else { ax = u.pos.x + 1; ay = u.pos.y; }
    if (u.vehicles.length && F.dist(u.pos, W.vehicles[u.vehicles[0]].pos) > 150) { u.plan = F.planReturn(W, u); u.plan[0].spd = 1.8; u.pi = 0; u.task = 'breaking contact'; }
    else if (u.vehicles.length) { const back = u.prevNode && u.prevNode !== u.node ? u.prevNode : u.home; u.plan = [{ k: 'mount' }, { k: 'drive', to: back, spd: 10 }].concat(F.planReturn(W, u).filter(s => s.k !== 'mount' && s.k !== 'walk')); u.pi = 0; u.task = 'breaking contact'; }
    else { const d = Math.hypot(u.pos.x - ax, u.pos.y - ay) || 1; const rally = { x: u.pos.x + (u.pos.x - ax) / d * 700, y: u.pos.y + (u.pos.y - ay) / d * 700 }; u.plan = [{ k: 'walk', to: rally, spd: 1.7 }].concat(F.planReturn(W, u)); u.pi = 0; u.task = 'breaking contact'; }
    u.aborted = why; u.observing = false;
  }
  function endContact(W, u) {
    const r = F.selfRep(W, u), wia = u.members.filter(id => { const s = W.soldiers[id]; return s.state === 'wia' && !s.evac; }).length;
    F.ev(W, 'contact-end', `${u.name}: contact over after ${F.dur(W.t - u.con.t0)}`, null, u.con.ev);
    F.report(W, u, 'LACE', 'P', `${u.call} contact over. LACE: water ${Math.round(u.members.reduce((a, id) => a + (W.soldiers[id].carry.WATER || 0), 0))} L, ammunition ${r.ammo}%, casualties ${r.cas}, equipment ${u.vehicles.filter(v => W.vehicles[v].status === 'ok').length} of ${u.vehicles.length} vehicles.`, { over: true }, u.con.ev);
    if (wia) F.report(W, u, 'MEDEVAC', 'F', `${u.call} requests MEDEVAC. Line 1 ${F.grid(u.pos)}. Line 3 ${wia} urgent. Line 6 ${F.fresh(W, u, 300).length ? 'enemy in area' : 'no enemy'}.`, { medevac: wia }, u.con.ev);
    const was = u.con.phase; u.con = null; u.ord = null;
    if (u.kind === 'convoy') return;
    if (was === 'break') return;
    if (r.cas > 0 || r.ammo < 50) F.abort(W, u, r.cas ? 'casualties' : 'ammunition');
    else if (u.plan) { u.hold = null; const st = u.plan[u.pi]; if (st && st.k === 'drive') { st.go = 0; if (u.vehicles.length) u.plan.splice(u.pi, 0, { k: 'mount' }); } else if (st && st.k === 'walk') st.go = 0; }
  }
  function think(W, u) {
    const under = u.members.some(id => W.t - W.soldiers[id].hitAt < 8);
    const fr = F.fresh(W, u, 90); let near = 1e9; for (const t of fr) near = Math.min(near, F.dist(u.pos, t));
    if (!u.con) {
      if (under) startContact(W, u, 'ambushed');
      else if (fr.length && near <= 350 && W.so.roe === 'engage' && u.kind !== 'convoy') startContact(W, u, 'engaging armed enemy');
      else if (u.newCon) { u.newCon = null; if (fr.length && W.t - (u.lastSpot || -9999) > 600) { u.lastSpot = W.t; const e = enemyEst(W, u); F.report(W, u, 'SPOT', 'P', `SPOT report. Size ${e.size[0]} to ${e.size[1]}. Activity ${e.act}. Location ${F.grid(e.pos)}. Time ${F.clock(W.t)}. Equipment small arms.`, { enemy: e }); } }
      return;
    }
    const c = u.con; if (fr.length || under) c.last = W.t;
    if (c.phase === 'fight' && W.t >= c.evalAt) {
      c.evalAt = W.t + 30; const ok = F.unitOk(W, u).length, cas = u.members.length - ok, ammo = F.ammoPct(W, u), K = fr.length;
      const limit = u.ord === 'HOLD' ? 4 : Math.max(2, Math.ceil(u.members.length * 0.25));
      if (u.ord === 'BREAK') breakContact(W, u, 'ordered by the command post');
      else if (ok <= 2) breakContact(W, u, 'combat ineffective');
      else if (cas >= limit) breakContact(W, u, 'casualties');
      else if (ammo < 25) breakContact(W, u, 'ammunition black');
      else if (K > ok * 1.4 && u.ord !== 'HOLD') breakContact(W, u, 'outnumbered');
      else if (W.t >= c.repAt) { c.repAt = W.t + 180; F.report(W, u, 'SITREP', 'P', `${u.call} still in contact vic ${F.grid(u.pos)}. Strength ${ok}, ammunition ${ammo}%, ${cas} casualties. ${K} enemy observed.`, { enemy: enemyEst(W, u) }, c.ev); }
    }
    if (W.t - Math.max(c.last, c.lastFire) > 150) endContact(W, u);
  }
  /* An order arrives. Only now does the unit know about it. */
  F.unitRecv = (W, u, m) => {
    F.ev(W, 'order-recv', `${u.call} received ${m.type}: ${m.text}`, null, m.cause);
    if (m.type === 'ORDER-BREAK') { u.ord = 'BREAK'; if (u.con) u.con.evalAt = W.t; else if (u.plan) F.abort(W, u, 'recalled'); }
    else if (m.type === 'ORDER-HOLD') u.ord = 'HOLD';
    else if (m.type === 'ORDER-RTB') { if (!u.con) F.abort(W, u, 'recalled'); else u.ord = 'BREAK'; }
  };

  /* ---------- base duties ---------- */
  F.setGuard = (W, u) => { u.task = 'base security'; u.dis = true; const f = W.map.nodes.fob, P = F.FOBLAY.posts; F.unitOk(W, u).forEach((id, i) => { const s = W.soldiers[id], p = i === 0 ? F.FOBLAY.toc : P[Math.floor((i - 1) / 2) % P.length]; s.pos = { x: f.x + p.x + (i % 2) * 3, y: f.y + p.y }; s.post = i === 0 ? 'sergeant of the guard' : i >= 7 ? 'rover' : 'post ' + (Math.floor((i - 1) / 2) + 1); }); u.pos = { x: f.x, y: f.y }; };
  F.setRest = (W, u, task) => { u.task = task; u.dis = true; const t = fobPos(W, 'tents'); u.members.forEach((id, i) => { const s = W.soldiers[id]; if (s.evac) return; s.pos = { x: t.x + (i % 5) * 4 - 20 + (parseInt(u.id.slice(1)) || 0) * 22 - 40, y: t.y + Math.floor(i / 5) * 4 }; s.post = null; }); u.pos = { x: t.x, y: t.y }; };
  function rove(W, u) { // the roving pair walks the wire
    const f = W.map.nodes.fob, h = F.FOBLAY.half, per = 2 * (2 * h.x + 2 * h.y), d = (W.t * 1.1) % per; let x, y;
    if (d < 2 * h.x) { x = -h.x + d; y = -h.y; } else if (d < 2 * h.x + 2 * h.y) { x = h.x; y = -h.y + (d - 2 * h.x); } else if (d < 4 * h.x + 2 * h.y) { x = h.x - (d - 2 * h.x - 2 * h.y); y = h.y; } else { x = -h.x; y = h.y - (d - 4 * h.x - 2 * h.y); }
    u.members.forEach(id => { const s = W.soldiers[id]; if (s.post === 'rover' && s.state === 'ok') { s.pos.x = f.x + x * 0.94; s.pos.y = f.y + y * 0.94; s.moving = true; } });
  }

  F.stepUnits = W => {
    for (const id in W.units) {
      const u = W.units[id]; if (u.side !== 'blue' || u.kind === 'hq' || u.kind === 'support') continue;
      if (!F.unitOk(W, u).length) continue;
      const away = !F.atFob(W, u.pos) && !(u.kind === 'convoy' && u.node === 'depot' && !u.mv);
      if (away || u.con || u.newCon || u.members.some(sid => W.t - W.soldiers[sid].hitAt < 8)) think(W, u);
      if (u.plan && (!u.con || u.con.phase === 'break' || u.kind === 'convoy')) runStep(W, u);
      if (u.mv && (!u.con || u.con.phase === 'break' || u.kind === 'convoy')) F.stepMove(W, u); else u.moving = false;
      if (u.plan || u.con || away) F.place(W, u); else if (u.task === 'base security' && W.t % 3 === 0) rove(W, u);
    }
  };
})();
