'use strict';
/* The staff. The operations officer (S3) runs routine operations and incidents; the logistics officer
   (S4) runs supply, vehicles and maintenance; the depot dispatcher answers requests. All of them act on
   what the command post knows, inside standing orders, and record why they decided what they did. */
(function () {
  const F = globalThis.FOB;
  const U = (W, id) => W.units[id];
  const idleAtFob = (W, u) => !u.plan && !u.con && F.atFob(W, u.pos) && W.t >= u.availAt;
  const paxFob = W => Object.values(W.soldiers).filter(s => s.side === 'blue' && s.state !== 'kia' && W.units[s.unit].home === 'fob').length;

  /* ---------- S4: vehicles ---------- */
  F.s4Alloc = (W, n, purpose, dry) => {
    const c = Object.values(W.vehicles).filter(v => v.at === 'fob' && !v.unit && v.status === 'ok' && F.qty(W.stores[v.tank], 'JP8') >= 50);
    let usable = c.length;
    if (purpose !== 'qrf' && W.so.reserveQrfVeh) { const q = U(W, W.s3.roles.qrf); usable -= Math.max(0, 2 - (q ? q.vehicles.length : 0)); }
    if (usable < n) { const all = Object.values(W.vehicles).filter(v => v.type === 'M-ATV'); W.s4.note = `${c.length} of ${all.length} vehicles ready (${all.filter(v => v.unit).length} out, ${all.filter(v => v.status !== 'ok').length} in maintenance, ${all.filter(v => !v.unit && v.status === 'ok' && F.qty(W.stores[v.tank], 'JP8') < 50).length} low on fuel)${purpose !== 'qrf' && W.so.reserveQrfVeh ? '; two held for the QRF' : ''}`; return null; }
    const pick = c.sort((a, b) => b.cond - a.cond).slice(0, n).map(v => v.id); return pick;
  };
  F.giveVeh = (W, u, vehs) => {
    u.vehicles = vehs; vehs.forEach(v => { W.vehicles[v].unit = u.id; });
    const ok = F.unitOk(W, u); u.crew = ok.slice(-Math.min(4, ok.length - 1)); u.members.forEach(id => { W.soldiers[id].gun = null; });
    vehs.forEach((v, i) => { if (u.crew[i]) W.soldiers[u.crew[i]].gun = v; });
  };

  /* ---------- S3: routine operations ---------- */
  function patrolPlan(W) {
    const full = W.so.patrolRoute === 'full';
    let legs = full ? [['j2'], ['cpn', 1], ['mir', 1, 600], ['rdg', 1], ['tol', 1, 600], ['j3', 1]] : [['j2'], ['cpn', 1], ['mir', 1, 600], ['cpn', 1], ['j2'], ['j3', 1], ['tol', 1, 600], ['j3']];
    if (W.so.varyRoute && W.s3.patrolN % 2 === 1) legs = legs.slice().reverse();
    const p = [{ k: 'prep', dur: 600 }, { k: 'mount' }];
    legs.forEach(l => { p.push({ k: 'drive', to: l[0], rep: !!l[1] }); if (l[2]) p.push({ k: 'dismount' }, { k: 'halt', dur: l[2] }, { k: 'mount' }); });
    p.push({ k: 'drive', to: 'fob' }, { k: 'dismount' }, { k: 'casualties' }, { k: 'refuel' }, { k: 'rearm' }, { k: 'end' }); return p;
  }
  function nearestEdge(W, p) { let best = null, bd = 1e9; for (const e of W.map.edges) { const a = W.map.nodes[e[0]], b = W.map.nodes[e[1]], dx = b.x - a.x, dy = b.y - a.y; const t = F.clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy), 0, 1); const d = Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y); if (d < bd) { bd = d; best = e; } } return best; }
  function qrfRoute(W, pos) { const e = nearestEdge(W, pos), ra = F.route(W, 'fob', e[0]) || [], rb = F.route(W, 'fob', e[1]) || []; if (rb.includes(e[0]) || e[0] === 'fob') return rb; if (ra.includes(e[1]) || e[1] === 'fob') return ra; return ra.length <= rb.length ? ra : rb; }
  F.qrfNTM = W => W.ops.some(o => o.status === 'active' && o.qrfReady) ? 300 : W.so.qrfNTM;
  function qrfEta(W, pos) { const p = qrfRoute(W, pos); return F.qrfNTM(W) + 45 + F.routeLen(W, 'fob', p) / 8.3 * 0.85 + 120; }
  function recommend(W, inc) {
    const q = U(W, W.s3.roles.qrf), ready = q && idleAtFob(W, q) && F.unitOk(W, q).length >= 6, veh = F.s4Alloc(W, 2, 'qrf', true), eta = qrfEta(W, inc.pos);
    const canQ = !!(ready && veh && q.id !== inc.unit);
    inc.opts = [{ k: 'qrf', label: `Launch the QRF (${q ? q.call : 'none'}), on scene in about ${F.dur(eta)}`, ok: canQ, why: canQ ? '' : !ready ? 'QRF squad is not available' : 'no vehicles ready: ' + W.s4.note }, { k: 'break', label: 'Order them to break contact', ok: true }, { k: 'hold', label: 'Order them to hold, no reinforcement', ok: true }];
    const k = W.hq.units[inc.unit] || {}, big = inc.enemy && inc.enemy.size[1] >= 8;
    if (inc.kind === 'overdue') inc.rec = { k: canQ && W.t - k.t > W.so.overdue * 2 ? 'qrf' : 'monitor', why: `No report or beacon from them for ${F.dur(W.t - k.t)}. Last known ${F.grid(k.pos || inc.pos)}.` };
    else if (canQ && eta < 3000) inc.rec = { k: 'qrf', why: `QRF can be on scene in about ${F.dur(eta)} (${F.dur(F.qrfNTM(W))} notice to move plus the drive). ${big ? 'Enemy reported in strength.' : 'Reinforcing should let them win the fight.'}` };
    else inc.rec = { k: 'break', why: canQ ? `QRF would take ${F.dur(eta)}: too slow to matter.` : `No QRF available (${inc.opts[0].why}). They should break contact.` };
  }
  function launchQrf(W, inc, cause) {
    const q = U(W, W.s3.roles.qrf); if (!q || !idleAtFob(W, q) || q.id === inc.unit) return false; const vehs = F.s4Alloc(W, 2, 'qrf'); if (!vehs) return false;
    F.giveVeh(W, q, vehs); const path = qrfRoute(W, inc.pos), last = path[path.length - 1] || 'fob', e = inc.enemy ? inc.enemy.pos : inc.pos;
    const d = Math.hypot(e.x - inc.pos.x, e.y - inc.pos.y) || 1, to = inc.kind === 'overdue' ? inc.pos : { x: e.x + (inc.pos.x - e.x) / d * 180, y: e.y + (inc.pos.y - e.y) / d * 180 };
    const plan = [{ k: 'prep', dur: F.qrfNTM(W) }, { k: 'mount' }, { k: 'drive', to: last, spd: 9.5, stop: { p: inc.pos, r: 380 } }, { k: 'dismount' }, { k: 'walk', to, spd: 1.6 }, { k: 'support', unit: inc.unit }];
    F.setPlan(W, q, plan, `QRF to ${F.grid(inc.pos)}`); q.qrfFor = inc.id; q.afterPlan = true;
    F.ev(W, 'qrf', `QRF (${q.name}) alerted for ${F.grid(inc.pos)}, notice to move ${F.dur(F.qrfNTM(W))}`, null, cause); return true;
  }
  F.execIncident = (W, inc, choice, by) => {
    if (inc.status !== 'open') return false; if (choice === 's3') choice = inc.rec.k; const u = U(W, inc.unit);
    const cause = F.trace(W, by, `${inc.kind === 'overdue' ? 'Overdue unit' : 'Contact'} ${u.call}: ${{ qrf: 'launch the QRF', break: 'order break contact', hold: 'order hold', monitor: 'keep monitoring' }[choice]}`, by === 'S3' ? inc.rec.why + (inc.by0 ? '' : ' No decision from the commander inside the window; acting on standing procedure.') : 'Commander\'s decision. S3 had recommended: ' + inc.rec.k + '.');
    if (choice === 'qrf') { if (!launchQrf(W, inc, cause)) { F.trace(W, 'S3', 'QRF could not launch; ordering break contact instead', W.s4.note || 'QRF squad not available', cause); choice = 'break'; } else if (inc.kind !== 'overdue') F.send(W, 'HQ', u.id, 'ORDER-HOLD', 'F', `Hold your position. QRF en route, about ${F.dur(qrfEta(W, inc.pos))}.`, {}, cause); }
    if (choice === 'break') F.send(W, 'HQ', u.id, 'ORDER-BREAK', 'F', 'Break contact and return to base.', {}, cause);
    if (choice === 'hold') F.send(W, 'HQ', u.id, 'ORDER-HOLD', 'F', 'Hold your position and develop the situation.', {}, cause);
    inc.status = choice === 'monitor' ? 'open' : 'decided'; inc.choice = choice; inc.by = by; inc.tDec = W.t; if (choice === 'monitor') inc.due = W.t + 600;
    return true;
  };
  F.staffOnReport = (W, m, u) => {
    if (!u || u.side !== 'blue') return; const open = W.incidents.find(i => i.unit === u.id && i.status !== 'closed');
    if (m.type === 'CONTACT' && !(open && open.kind === 'contact')) {
      if (open) open.status = 'closed';
      const inc = { id: 'I' + (W.iseq++), kind: 'contact', unit: u.id, pos: m.data.self.pos, enemy: m.data.enemy, t: W.t, tEvent: m.t0, status: 'open', due: W.t + W.so.incidentWindow, rec: null, opts: [], choice: null, by: null, msg: m.id };
      recommend(W, inc); W.incidents.push(inc); F.trace(W, 'S3', `Recommend: ${{ qrf: 'launch the QRF', break: 'break contact', hold: 'hold' }[inc.rec.k]} for ${u.call}`, inc.rec.why);
    } else if (open && open.kind === 'contact' && m.data.enemy) open.enemy = m.data.enemy;
    if (open && (m.data.over || m.type === 'LACE')) { open.status = 'closed'; open.tClose = W.t; }
    if (open && open.kind === 'overdue') { open.status = 'closed'; open.tClose = W.t; }
    if (m.type === 'MEDEVAC') F.trace(W, 'S3', `${u.call}: casualties come back by ground to the aid station`, 'No air MEDEVAC is on call for this base; the unit carries its own wounded.');
  };
  function s3(W) {
    const S = W.s3, so = W.so, R = S.roles;
    if (W.t >= S.nextRot) { S.nextRot += 8 * F.H; const o = Object.assign({}, R); R.guard = o.qrf; R.patrol = o.guard; R.qrf = o.patrol; F.trace(W, 'S3', `Shift change: ${U(W, R.guard).call} to base security, ${U(W, R.patrol).call} to patrols, ${U(W, R.qrf).call} to QRF`, 'Eight-hour rotation of the three squads'); for (const k in R) { const u = U(W, R[k]); if (!u.plan) u.task = 'idle'; } }
    const g = U(W, R.guard), p = U(W, R.patrol), q = U(W, R.qrf);
    if (g && !g.plan && !g.con && F.atFob(W, g.pos) && g.task !== 'base security') F.setGuard(W, g);
    if (q && !q.plan && !q.con && F.atFob(W, q.pos) && q.task.indexOf('QRF standby') !== 0) F.setRest(W, q, 'QRF standby');
    if (p && !p.plan && !p.con && F.atFob(W, p.pos) && p.task === 'idle') F.setRest(W, p, W.t < p.availAt ? 'recovering' : 'awaiting patrol');
    if (q && q.afterPlan && q.plan && q.pi >= q.plan.length) { q.afterPlan = false; F.setPlan(W, q, F.planReturn(W, q), 'QRF returning'); }
    /* routine patrol */
    if (W.t >= S.nextPatrol) {
      const op = W.ops.find(o => (o.status === 'approved' || o.status === 'active') && o.unit === p.id && o.start - W.t < 3 * F.H);
      let why = null;
      if (p.plan || p.con) why = `${p.call} is still out`; else if (!idleAtFob(W, p)) why = `${p.call} is recovering from its last mission`; else if (F.unitOk(W, p).length < 6) why = `${p.call} is below strength`; else if (op) why = `${p.call} is held for ${op.name}`; else if (W.incidents.some(i => i.status === 'open' && i.kind === 'contact')) why = 'an incident is open';
      const vehs = why ? null : F.s4Alloc(W, 2, 'patrol'); if (!why && !vehs) why = 'no vehicles: ' + W.s4.note;
      if (why) { if (S.note !== why) { S.note = why; F.trace(W, 'S3', 'Routine patrol delayed', why); } S.nextPatrol = W.t + 600; }
      else { S.note = ''; S.patrolN++; F.giveVeh(W, p, vehs); F.setPlan(W, p, patrolPlan(W), `routine patrol ${S.patrolN} (${so.patrolRoute} route)`); S.nextPatrol = W.t + so.patrolEvery; F.trace(W, 'S3', `Launched routine patrol ${S.patrolN} with ${p.call} in ${vehs.join(', ')}`, `Patrol every ${F.dur(so.patrolEvery)} on the ${so.patrolRoute} route`); }
    }
    /* the planned operation */
    for (const o of W.ops) {
      if (o.status === 'pending' && W.t >= o.draftAt) { o.status = 'draft'; o.unit = R.patrol; let st = Math.floor(W.t / F.D) * F.D + 20 * F.H; if (st - W.t < 3 * F.H) st += F.D; o.start = st; o.note = `Recommend ${U(W, o.unit).call}, mounted to Tolan then 3.4 km on foot to an observation post overlooking the NAI, two hours on station, at night. The post is behind the ridge: no voice radio, satellite text only through the vehicles at Tolan.`; F.trace(W, 'S3', `Drafted ${o.name} for the commander's approval`, o.note); }
      if (o.status === 'approved' && W.t >= o.start - 900) {
        const u = U(W, o.unit); let why = null; if (!idleAtFob(W, u)) why = `${u.call} is not available`; const vehs = why ? null : F.s4Alloc(W, 2, 'recon'); if (!why && !vehs) why = 'no vehicles: ' + W.s4.note;
        if (why) { if (o.why !== why) { o.why = why; F.trace(W, 'S3', `${o.name} delayed`, why); } o.start = W.t + 1500; continue; }
        F.giveVeh(W, u, vehs); o.status = 'active';
        F.setPlan(W, u, [{ k: 'prep', dur: 900 }, { k: 'mount' }, { k: 'drive', to: o.drop, rep: true }, { k: 'dismount' }, { k: 'walk', to: o.op, spd: 1.15 }, { k: 'observe', dur: o.dwell }], o.name);
        u.opId = o.id; u.afterPlan = true; F.trace(W, 'S3', `Launched ${o.name} with ${u.call}`, 'Approved by the commander');
      }
      if (o.status === 'active') { const u = U(W, o.unit); if (u.afterPlan && u.plan && u.pi >= u.plan.length) { u.afterPlan = false; F.setPlan(W, u, F.planReturn(W, u), o.name + ': exfiltrating'); } if (!u.plan && u.done > o.start) { o.status = u.abortedLast ? 'aborted' : 'done'; o.tEnd = W.t; ['rations', 'water', 'fuelA'].forEach(s => F.release(W.stores[s], o.id)); F.ev(W, 'op-end', `${o.name} ${o.status}`); } }
    }
    /* incidents: the window for the commander, then standing procedure */
    for (const inc of W.incidents) {
      if (inc.status === 'open' && W.t >= inc.due) { recommend(W, inc); F.execIncident(W, inc, inc.rec.k, 'S3'); }
      if (inc.status === 'decided') { const u = U(W, inc.unit); if (!u.con && F.atFob(W, u.pos)) { inc.status = 'closed'; inc.tClose = W.t; } }
    }
    /* overdue units */
    for (const id of ['u1', 'u2', 'u3', 'cv']) {
      const u = U(W, id), k = W.hq.units[id]; if (!u.plan || !k || F.atFob(W, u.pos) || (id === 'cv' && u.node === 'depot' && !u.mv)) continue;
      if (W.t - k.t > so.overdue && !W.incidents.some(i => i.unit === id && i.status !== 'closed')) { const inc = { id: 'I' + (W.iseq++), kind: 'overdue', unit: id, pos: k.pos, enemy: null, t: W.t, tEvent: k.t, status: 'open', due: W.t + so.incidentWindow, rec: null, opts: [], choice: null, by: null }; recommend(W, inc); W.incidents.push(inc); F.trace(W, 'S3', `${u.call} is overdue`, inc.rec.why); }
    }
    for (const inc of W.incidents) if (inc.kind === 'overdue' && inc.status !== 'closed') { const k = W.hq.units[inc.unit]; if (k && k.t > inc.t) { inc.status = 'closed'; inc.tClose = W.t; } }
  }

  /* ---------- S4: supply ---------- */
  function logstat(W) {
    const S = W.s4, pax = paxFob(W); S.hist.push({ t: W.t, d: W.fob.fuelDrawn || 0 }); while (S.hist.length > 30) S.hist.shift();
    const old = S.hist[0]; let fr = 360; if (W.t - old.t >= 6 * F.H) fr = Math.max(150, ((W.fob.fuelDrawn || 0) - old.d) / (W.t - old.t) * F.D);
    const on = {}; for (const ty of ['JP8', 'WATER', 'MRE', 'A556', 'A556L', 'A762L', 'PARTS', 'CL4']) on[ty] = F.fobQty(W, ty);
    const rates = { JP8: fr, WATER: pax * 12, MRE: pax * 3 }, dos = {}; for (const k in rates) dos[k] = on[k] / rates[k];
    W.hq.logstat = { t: W.t, pax, on, rates, dos, veh: Object.values(W.vehicles).filter(v => v.type === 'M-ATV').map(v => ({ id: v.id, name: v.name, fuel: Math.round(F.qty(W.stores[v.tank], 'JP8')), cond: Math.round(v.cond * 100), status: v.status, unit: v.unit, kmSvc: Math.round(v.kmSvc) })) };
  }
  function request(W, why) {
    const L = W.hq.logstat, so = W.so, req = {}, P = W.fob.project;
    const want = (ty, target) => { const n = Math.floor(Math.min(target - L.on[ty], F.fobFree(W, ty))); if (n >= 1) req[ty] = n; };
    want('JP8', so.dosTarget * L.rates.JP8); want('WATER', so.dosTarget * L.rates.WATER); want('MRE', so.dosTarget * L.rates.MRE);
    want('A556', 9000); want('A556L', 4800); want('A762L', 3200); want('PARTS', 6); if (!P.done) want('CL4', Math.ceil((P.needH - P.doneH) * P.perH) + 4);
    if (req.JP8) req.JP8 = Math.min(req.JP8, 9500);
    let kg = 0; for (const ty of ['MRE', 'WATER', 'A556', 'A556L', 'A762L', 'PARTS', 'CL4']) { if (!req[ty]) continue; const room = Math.max(0, 4500 - kg), fit = Math.floor(room / F.TYPES[ty].kg); if (req[ty] > fit) req[ty] = fit; kg += req[ty] * F.TYPES[ty].kg; if (req[ty] <= 0) delete req[ty]; }
    if (!Object.keys(req).length) return;
    W.s4.req = { t: W.t, req, why }; const txt = Object.keys(req).map(ty => `${req[ty]} ${F.TYPES[ty].unit} ${F.TYPES[ty].name}`).join(', ');
    const c = F.trace(W, 'S4', `LOGPAC requested from the depot: ${txt}`, why); F.send(W, 'HQ', 'DEPOT', 'REQ', 'R', `LOGSTAT and resupply request: ${txt}.`, { req }, c);
  }
  function s4(W) {
    const S = W.s4, so = W.so;
    if (W.t >= S.nextStat) { S.nextStat += F.H; logstat(W); }
    const L = W.hq.logstat; if (!L) return;
    if (!S.req && W.depot.state === 'idle') {
      const day = Math.floor(W.t / F.D), low = Object.keys(L.dos).filter(k => L.dos[k] < so.dosReorder);
      if (F.hour(W.t) === so.logpacHour && S.lastLogpacDay !== day) { S.lastLogpacDay = day; request(W, `Daily LOGPAC cycle. Days of supply: fuel ${L.dos.JP8.toFixed(1)}, water ${L.dos.WATER.toFixed(1)}, rations ${L.dos.MRE.toFixed(1)}. Target ${so.dosTarget}.`); }
      else if (low.length && W.t - (S.lastEmerg || 0) > 8 * F.H) { S.lastEmerg = W.t; request(W, `Emergency resupply: ${low.map(k => F.TYPES[k].name + ' at ' + L.dos[k].toFixed(1) + ' days').join(', ')}, below the ${so.dosReorder}-day reorder point.`); }
    }
    /* fuel sampling, daily */
    if (W.t - S.lastSample >= F.D && F.hour(W.t) === 6) { S.lastSample = W.t; W.stores.fuelA.inspectedAt = W.t; W.stores.fuelB.inspectedAt = W.t; F.trace(W, 'S4', 'Fuel tanks A and B sampled and passed', 'Daily fuel quality surveillance'); }
    /* top up parked vehicles when the pump is free */
    if (!W.fob.pump) for (const v of Object.values(W.vehicles)) { if (v.at !== 'fob' || v.unit || v.status !== 'ok') continue; const tk = W.stores[v.tank]; if (F.qty(tk, 'JP8') < v.tankL * 0.6) { let got = F.move(W, W.stores.fuelA, tk, 'JP8', 75, true); if (got < 75) got += F.move(W, W.stores.fuelB, tk, 'JP8', 75 - got, true); W.fob.fuelDrawn = (W.fob.fuelDrawn || 0) + got; break; } }
    /* maintenance: one bay, two mechanics */
    if (S.mech) { const v = W.vehicles[S.mech.v]; if (W.t >= S.mech.until) { v.status = 'ok'; v.cond = 1; v.kmSvc = 0; F.ev(W, 'service', `${v.name} service complete, returned to the line`); S.mech = null; } }
    else for (const v of Object.values(W.vehicles)) {
      if (v.at !== 'fob' || v.unit || v.status !== 'ok' || (v.kmSvc < 110 && v.cond >= 0.7)) continue;
      const out = Object.values(W.vehicles).filter(x => x.type === 'M-ATV' && (x.unit || x.status !== 'ok')).length;
      if (F.qty(W.stores.parts, 'PARTS') < 1) { if (S.note !== 'parts') { S.note = 'parts'; F.trace(W, 'S4', `${v.name} service deferred`, 'No repair parts kits on hand'); } break; }
      if (out >= 2 && v.cond >= 0.55 && !so.maintFirst) { if (S.mnote !== v.id) { S.mnote = v.id; F.trace(W, 'S4', `${v.name} service deferred`, `Due (${Math.round(v.kmSvc)} km since service, condition ${Math.round(v.cond * 100)}%) but ${out} vehicles are already off the line`); } continue; }
      F.burn(W, W.stores.parts, 'PARTS', 1, 'vehicle service'); v.status = 'service'; S.mech = { v: v.id, until: W.t + 5400 }; S.mnote = null;
      F.trace(W, 'S4', `${v.name} into the maintenance bay for 90 minutes`, `${Math.round(v.kmSvc)} km since service, condition ${Math.round(v.cond * 100)}%; one parts kit drawn`); break;
    }
  }

  /* ---------- depot ---------- */
  const DEST = { MRE: ['rations'], WATER: ['water'], A556: ['asp'], A556L: ['asp'], A762L: ['asp'], PARTS: ['parts'], CL4: ['yard'], JP8: ['fuelA', 'fuelB'] };
  const SRC = ty => ty === 'JP8' ? 'dFuel' : ty === 'WATER' ? 'dWater' : 'dWare';
  F.depotRecv = (W, m) => { if (m.type !== 'REQ') return; const D = W.depot; if (D.state !== 'idle') { D.pending = m.data.req; F.trace(W, 'DEPOT', 'Request queued', 'Convoy is already committed'); return; } D.state = 'loading'; D.left = Object.assign({}, m.data.req); D.t0 = W.t; D.cause = m.cause; W.units.cv.task = 'loading at the depot'; F.trace(W, 'DEPOT', 'Loading LOGPAC for FOB Kestrel', 'Request received from the FOB logistics officer', m.cause); };
  function depot(W) { // called every 30 s: loading takes real time
    const D = W.depot, cv = W.units.cv;
    if (D.state === 'loading') {
      let kg = 200, busy = false;
      for (const ty in D.left) {
        if (D.left[ty] <= 0) continue; const dst = W.stores[ty === 'JP8' ? 'c3.bulk' : 'c2.cargo'];
        const n = ty === 'JP8' ? Math.min(300, D.left[ty]) : Math.min(D.left[ty], Math.max(1, Math.floor(kg / F.TYPES[ty].kg)));
        const got = F.move(W, W.stores[SRC(ty)], dst, ty, n, true); if (ty !== 'JP8') kg -= got * F.TYPES[ty].kg; D.left[ty] -= got > 0 ? got : D.left[ty]; if (got > 0) busy = true; if (kg <= 0) break;
      }
      if (!busy) {
        for (const v of cv.vehicles) { const tk = W.stores[W.vehicles[v].tank]; F.move(W, W.stores.dFuel, tk, 'JP8', F.free(tk, 'JP8'), true); }
        const man = {}; for (const l of W.stores['c2.cargo'].lots) man[l.ty] = (man[l.ty] || 0) + l.q; const f = F.qty(W.stores['c3.bulk'], 'JP8'); if (f) man.JP8 = f;
        D.state = 'out'; D.manifest = man; cv.crew = cv.members.slice();
        F.setPlan(W, cv, [{ k: 'prep', dur: 300 }, { k: 'mount' }, { k: 'drive', to: 'fob', spd: 11 }, { k: 'dismount' }, { k: 'unload' }, { k: 'mount' }, { k: 'drive', to: 'depot', spd: 11 }, { k: 'dismount' }, { k: 'backload' }, { k: 'end' }], 'LOGPAC to FOB Kestrel');
        const txt = Object.keys(man).map(ty => `${Math.round(man[ty])} ${F.TYPES[ty].unit} ${F.TYPES[ty].name}`).join(', ');
        F.send(W, 'DEPOT', 'HQ', 'CONVOY', 'R', `PACKHORSE loaded and departing RSA Dakota: ${txt}.`, { convoy: { manifest: man, sp: W.t + 300, state: 'en route' } }, D.cause);
        F.ev(W, 'convoy-sp', `Convoy loaded at the depot after ${F.dur(W.t - D.t0)}: ${txt}`, null, D.cause);
      }
    } else if (D.state === 'out' && !cv.plan) { D.state = 'idle'; cv.task = 'at the depot'; W.s4.req = null; if (W.hq.convoy) W.hq.convoy.state = 'complete'; if (D.pending) { const r = D.pending; D.pending = null; F.depotRecv(W, { type: 'REQ', data: { req: r }, cause: null }); } }
  }
  F.convoyUnload = (W, u, s) => { // 200 kg a minute off the truck, 300 L a minute out of the tanker
    s.del = s.del || {}; s.acc = s.acc || 0; s.acc += 200 / 60; let busy = false; const cargo = W.stores['c2.cargo'], bulk = W.stores['c3.bulk'];
    for (const l of cargo.lots.slice()) { const per = F.TYPES[l.ty].kg, n = Math.floor(s.acc / per); if (n < 1) { if (DEST[l.ty].some(d => F.free(W.stores[d], l.ty) >= 1)) busy = true; continue; } let got = 0; for (const d of DEST[l.ty]) got += F.move(W, cargo, W.stores[d], l.ty, n - got, true); if (got > 0) { s.acc -= got * per; s.del[l.ty] = (s.del[l.ty] || 0) + got; busy = true; break; } }
    let f = 0; for (const d of DEST.JP8) f += F.move(W, bulk, W.stores[d], 'JP8', 5 - f, true); if (f > 0) { s.del.JP8 = (s.del.JP8 || 0) + f; busy = true; }
    if (busy) { s.idle = 0; return false; } s.idle = (s.idle || 0) + 1; if (s.idle < 5) return false;
    const txt = Object.keys(s.del).map(ty => `${Math.round(s.del[ty])} ${F.TYPES[ty].unit} ${F.TYPES[ty].name}`).join(', ') || 'nothing';
    const left = F.kgOf(cargo) + F.qty(bulk, 'JP8'); F.ev(W, 'delivery', `LOGPAC unloaded at FOB Kestrel: ${txt}${left > 1 ? '. Some load could not be stored and goes back' : ''}`);
    F.report(W, u, 'LOGPAC', 'R', `PACKHORSE unloaded: ${txt}. Returning to RSA Dakota.`, { convoy: { manifest: s.del, state: 'unloaded' } }); W.stats.deliveries++; return true;
  };
  F.convoyBackload = (W, u, s) => { if (W.t - s.t0 < 300) return false; const cargo = W.stores['c2.cargo'], bulk = W.stores['c3.bulk']; for (const l of cargo.lots.slice()) F.move(W, cargo, W.stores[SRC(l.ty)], l.ty, l.q, true); F.move(W, bulk, W.stores.dFuel, 'JP8', F.qty(bulk, 'JP8'), true); for (const v of u.vehicles) { const tk = W.stores[W.vehicles[v].tank]; F.move(W, W.stores.dFuel, tk, 'JP8', F.free(tk, 'JP8'), true); if (W.vehicles[v].ammo) F.move(W, W.stores.dWare, W.stores[W.vehicles[v].ammo], 'A762L', 800 - F.qty(W.stores[W.vehicles[v].ammo], 'A762L'), true); } for (const id of u.members) { const x = W.soldiers[id]; if (x.state === 'ok') F.issue(W, W.stores.dWare, x, 'A556', 210 - (x.carry.A556 || 0)); } return true; };

  /* ---------- life on the base, once a minute ---------- */
  function fobLife(W) {
    const fb = W.fob, A = W.stores.fuelA, B = W.stores.fuelB;
    let g = F.burn(W, A, 'JP8', 0.15, 'generators'); if (g < 0.15) g += F.burn(W, B, 'JP8', 0.15 - g, 'generators'); fb.fuelDrawn = (fb.fuelDrawn || 0) + g;
    if (g < 0.149 && fb.power) { fb.power = false; F.ev(W, 'power', 'FOB generators out of fuel: radio range halved'); } else if (g >= 0.149 && !fb.power) { fb.power = true; F.ev(W, 'power', 'FOB generators running again'); }
    let at = 0; const tod = W.t % F.D, meal = tod === 7 * F.H || tod === 12 * F.H || tod === 18 * F.H;
    for (const id in W.soldiers) {
      const s = W.soldiers[id]; if (s.side !== 'blue' || s.state === 'kia') continue; const u = W.units[s.unit], here = u.home === 'fob' && (s.evac || F.atFob(W, s.pos));
      if (u.home !== 'fob') { if (meal && !F.expend(W, s, 'MRE', 1, 'meals')) { if (u.node === 'depot') F.burn(W, W.stores.dWare, 'MRE', 1, 'meals'); } continue; }
      if (here) at++; else F.expend(W, s, 'WATER', 0.0035, 'drinking');
      if (meal) { if (here) { if (!F.burn(W, W.stores.rations, 'MRE', 1, 'meals')) { s.hungry++; W.stats.missedMeals++; } } else if (!F.expend(W, s, 'MRE', 1, 'meals')) { s.hungry++; W.stats.missedMeals++; } }
    }
    if (F.burn(W, W.stores.water, 'WATER', at * 12 / 1440, 'life support') < at * 12 / 1440 - 1e-6 && !fb.dry) { fb.dry = true; F.ev(W, 'water', 'FOB water tanks are empty'); } else if (F.qty(W.stores.water, 'WATER') > 50) fb.dry = false;
    const P = fb.project, h = F.hour(W.t), q = U(W, W.s3.roles.qrf);
    if (!P.done && W.so.workDetail && h >= 8 && h < 16 && q && !q.plan && !q.con && F.atFob(W, q.pos)) {
      const need = 4 / 60 * P.perH; if (F.burn(W, W.stores.yard, 'CL4', need, 'construction') >= need - 1e-9) { P.doneH += 4 / 60; P.stalled = false; q.task = 'QRF standby, four on the work detail'; const w = F.fobPos(W, 'work'); F.unitOk(W, q).slice(-4).forEach((id, i) => { W.soldiers[id].pos = { x: w.x + i * 3 - 4, y: w.y + (i % 2) * 3 }; }); if (P.doneH >= P.needH) { P.done = true; F.ev(W, 'construction', `${P.name} complete: base cameras now see 300 m further`); } }
      else if (!P.stalled) { P.stalled = true; F.ev(W, 'construction', `${P.name} stalled at ${Math.round(P.doneH / P.needH * 100)}%: no barrier material in the engineer yard`); }
    } else if (q && q.task === 'QRF standby, four on the work detail' && (h >= 16 || h < 8)) F.setRest(W, q, 'QRF standby');
    if (tod % F.H === 0) F.expire(W);
  }
  F.stepStaff = W => { if (W.t % 30 === 0) { s3(W); s4(W); depot(W); } if (W.t % 60 === 0) fobLife(W); };
  F.qrfEta = qrfEta; F.patrolPlanFor = patrolPlan;
})();
