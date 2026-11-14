'use strict';
/* Movement, observation and fire. Units move through real space, burn real fuel, see what line of
   sight and range allow, and shoot real rounds out of what they carry. */
(function () {
  const F = globalThis.FOB;
  const SLOTS = [[0, 0], [-8, -7], [8, -7], [-16, -14], [16, -14], [-24, -21], [24, -21], [-32, -28], [32, -28], [0, -14], [0, -28], [-8, -35]];

  F.drive = (W, u, to, spd, stop) => {
    let p = F.route(W, u.node, to); if (!p) { u.mv = null; return false; }
    const off = F.dist(u.pos, W.map.nodes[u.node]) > 30; // part-way along a road: go on if that is the way, otherwise back to the last node first
    if (off && p[0] !== u.edgeTo) p = [u.node].concat(p);
    if (!p.length) { u.mv = null; return false; }
    u.mv = { k: 'road', path: p, i: 0, spd: spd || 8.3, stop: stop || null }; return true; };
  F.walk = (W, u, to, spd) => { u.mv = { k: 'foot', to: { x: to.x, y: to.y }, spd: spd || 1.3 }; };

  F.stepMove = (W, u) => {
    const m = u.mv; u.moving = false; if (!m) return;
    if (m.k === 'road') {
      const vs = u.vehicles.map(id => W.vehicles[id]);
      for (const v of vs) if (v.status === 'down' && W.t >= v.downUntil) { v.status = 'ok'; v.cond = Math.min(1, v.cond + 0.15); F.ev(W, 'repair', `${v.name} repaired by its crew, moving again`); }
      const dry = vs.find(v => F.qty(W.stores[v.tank], 'JP8') <= 0.01), down = vs.find(v => v.status === 'down');
      if (dry || down) { if (!u.stuck) { u.stuck = W.t; u.stuckWhy = dry ? dry.name + ' out of fuel' : down.name + ' broken down'; F.ev(W, 'halt', `${u.name} halted: ${u.stuckWhy}`); } return; }
      u.stuck = 0;
      const tgt = W.map.nodes[m.path[m.i]], dx = tgt.x - u.pos.x, dy = tgt.y - u.pos.y, d = Math.hypot(dx, dy); const step = m.spd * (F.isNight(W.t) ? 0.8 : 1), mv = Math.min(step, d);
      if (d > 0.01) u.hdg = Math.atan2(dy, dx); u.edgeTo = m.path[m.i];
      if (step >= d) { u.pos = { x: tgt.x, y: tgt.y }; if (u.node !== m.path[m.i]) u.prevNode = u.node; u.node = m.path[m.i]; u.edgeTo = null; m.i++; if (m.i >= m.path.length) u.mv = null; }
      else { u.pos.x += dx / d * step; u.pos.y += dy / d * step; }
      vs.forEach((v, k) => {
        F.burn(W, W.stores[v.tank], 'JP8', mv / 1000 * v.lPerKm, 'vehicle movement'); v.km += mv / 1000; v.kmSvc += mv / 1000; v.cond = Math.max(0.2, v.cond - mv / 1000 * 0.0009);
        v.pos = { x: u.pos.x - Math.cos(u.hdg) * 24 * k, y: u.pos.y - Math.sin(u.hdg) * 24 * k };
        if (v.cond < 0.75 && F.ch(W, (0.8 - v.cond) * 0.00004 * mv)) { v.status = 'down'; v.downUntil = W.t + F.ri(W, 15, 40) * 60; F.ev(W, 'breakdown', `${v.name} broke down ${F.grid(v.pos)} (condition ${Math.round(v.cond * 100)}%)`); }
      });
      if (m.stop && F.dist(u.pos, m.stop.p) < m.stop.r) u.mv = null;
      u.moving = true;
    } else if (m.k === 'air') { // aircraft fly straight; each aircraft keeps its slot behind the lead
      const dx = m.to.x - u.pos.x, dy = m.to.y - u.pos.y, d = Math.hypot(dx, dy), step = Math.min(m.spd, d); if (d > 0.01) u.hdg = Math.atan2(dy, dx);
      if (m.spd >= d) { u.pos = { x: m.to.x, y: m.to.y }; u.mv = null; if (m.node) u.node = m.node; } else { u.pos.x += dx / d * m.spd; u.pos.y += dy / d * m.spd; }
      u.vehicles.forEach((id, k) => { const v = W.vehicles[id]; if (v.status === 'down') return; F.burn(W, W.stores[v.tank], 'JP8', step / 1000 * v.lPerKm, 'flying'); v.km += step / 1000; v.pos = { x: u.pos.x - Math.cos(u.hdg) * 30 * k + Math.sin(u.hdg) * 20 * k, y: u.pos.y - Math.sin(u.hdg) * 30 * k - Math.cos(u.hdg) * 20 * k }; });
      u.moving = true;
    } else {
      const dx = m.to.x - u.pos.x, dy = m.to.y - u.pos.y, d = Math.hypot(dx, dy);
      const carry = u.members.some(id => { const s = W.soldiers[id]; return s.state === 'wia' && !s.mobile && !s.evac; });
      const bound = u.con && u.assaulting && !u.cqb ? (Math.floor(W.t / 10) % 3 ? 1 : 0) : 1; // under fire an assault moves by bounds: rush, then get down and fire
      const step = m.spd * (F.coverAt(W, u.pos) > 0.3 ? 0.8 : 1) * (F.isNight(W.t) ? 0.85 : 1) * (carry ? 0.6 : 1) * bound;
      if (d > 0.01) u.hdg = Math.atan2(dy, dx);
      if (step >= d) { u.pos = { x: m.to.x, y: m.to.y }; u.mv = null; } else { u.pos.x += dx / d * step; u.pos.y += dy / d * step; }
      u.moving = true;
    }
  };
  /* Put each soldier where the unit's situation says they are. */
  F.place = (W, u) => {
    const nv = u.vehicles.length, c = Math.cos(u.hdg - Math.PI / 2), sn = Math.sin(u.hdg - Math.PI / 2); let k = 0;
    const hold = u.con && u.con.phase === 'fight' && !u.con.settle && !u.assaulting;
    if (u.file) { const T = u.trail = u.trail || [], h = T[0]; if (!h || F.dist(h, u.pos) > 12) T.length = 0; if (!T.length || F.dist(T[0], u.pos) >= 0.75) { T.unshift({ x: u.pos.x, y: u.pos.y }); if (T.length > 40) T.pop(); } } else u.trail = null; // in file, each man steps where the man in front stepped
    if (u.riding) { const cr = W.units[u.riding], cv = cr.vehicles.map(v => W.vehicles[v]); u.pos = { x: cr.pos.x, y: cr.pos.y }; u.members.forEach((id, i) => { const s = W.soldiers[id]; if (s.evac) return; const v = cv[i % cv.length]; s.pos.x = v.pos.x; s.pos.y = v.pos.y; s.inVeh = true; s.moving = !!cr.moving; }); placeDet(W, u); return; }
    u.members.forEach((id, i) => {
      const s = W.soldiers[id]; if (s.evac || s.state === 'det') return; let tx, ty; s.sneak = u.pace === 'stealth'; if (u.f != null && !s.inVeh && s.state === 'ok') s.pos.f = u.f;
      if (u.spots && s.state === 'ok' && !(nv && (!u.dis || u.crew.indexOf(id) >= 0))) { const t = u.spots[k++ % u.spots.length]; const dx = t.x - s.pos.x, dy = t.y - s.pos.y, d = Math.hypot(dx, dy); if (d <= 2.2) { s.pos.x = t.x; s.pos.y = t.y; s.moving = false; } else { s.pos.x += dx / d * 2.2; s.pos.y += dy / d * 2.2; s.moving = true; } s.inVeh = false; return; } // clearing a room: each to a point of domination
      const crew = u.crew.indexOf(id);
      if (nv && (!u.dis || crew >= 0)) { const v = W.vehicles[u.vehicles[(crew >= 0 ? crew : i) % nv]]; tx = v.pos.x; ty = v.pos.y; s.pos.x = tx; s.pos.y = ty; s.inVeh = true; s.moving = !!u.moving && !u.dis; return; }
      s.inVeh = false;
      if (s.state !== 'ok' && !(u.moving)) { s.moving = false; return; }
      if (hold && s.state === 'ok') { s.moving = false; return; }
      if (u.file && u.trail) { const p = u.trail[Math.min(u.trail.length - 1, 2 * k++)]; tx = p.x; ty = p.y; } else { const o = SLOTS[k++ % SLOTS.length]; const wide = u.file ? 1 : u.con ? 1.3 : 1; // inside a compound a team moves in file
      tx = u.pos.x + (o[0] * c - o[1] * sn) * wide; ty = u.pos.y + (o[0] * sn + o[1] * c) * wide; }
      const dx = tx - s.pos.x, dy = ty - s.pos.y, d = Math.hypot(dx, dy), sp = 2.4;
      if (d <= sp) { s.pos.x = tx; s.pos.y = ty; s.moving = d > 0.4 || !!u.moving; } else { s.pos.x += dx / d * sp; s.pos.y += dy / d * sp; s.moving = true; }
    });
    if (u.con && u.con.settle && W.t >= u.con.settle) u.con.settle = 0;
    placeDet(W, u);
  };
  function placeDet(W, u) { // detainees go where their captors go
    if (!u.det) return; const v = u.riding ? W.vehicles[W.units[u.riding].vehicles[0]] : null;
    u.det.forEach((id, i) => { const s = W.soldiers[id]; if (u.f != null) s.pos.f = u.f; if (v) { s.pos.x = v.pos.x; s.pos.y = v.pos.y; s.inVeh = true; return; } s.inVeh = false; const tx = u.pos.x - Math.cos(u.hdg) * (6 + i * 3), ty = u.pos.y - Math.sin(u.hdg) * (6 + i * 3), dx = tx - s.pos.x, dy = ty - s.pos.y, d = Math.hypot(dx, dy); if (d <= 2.4) { s.pos.x = tx; s.pos.y = ty; } else { s.pos.x += dx / d * 2.4; s.pos.y += dy / d * 2.4; } s.moving = d > 0.4; });
  }

  /* Observation. Each soldier's eyes, limited by range, darkness, concealment and terrain. */
  F.sense = W => {
    const night = F.isNight(W.t), units = Object.values(W.units);
    for (const U of units) {
      if (U.kind === 'hq' || U.kind === 'support' || U.side === 'civ') continue;
      const eyes = U.members.map(id => W.soldiers[id]).filter(s => s.state === 'ok' && s.supp < 0.9 && !s.evac); if (!eyes.length) continue;
      const maxR = night ? (U.side === 'blue' ? 450 : 260) : 1300;
      for (const V of units) {
        if (V.side === U.side || V.side === 'civ') continue;
        let near = F.dist(U.pos, V.pos); if (U.vehicles.length) near = Math.min(near, F.dist(W.vehicles[U.vehicles[0]].pos, V.pos)); if (V.vehicles.length) near = Math.min(near, F.dist(U.pos, W.vehicles[V.vehicles[0]].pos));
        if (near > maxR + 400) continue;
        let any = false;
        for (const e of V.members.map(id => W.soldiers[id])) {
          if (e.evac) continue; const tr = U.kb.con[e.id]; if (e.state === 'kia' && (!tr || tr.down)) continue;
          const firing = W.t - e.firedAt < 6; let conceal = F.coverAt(W, e.pos) * (e.moving ? 0.5 : 1); if ((V.side === 'red' || V.opEl) && !e.moving && !firing) conceal += 0.3; if (V.observing) conceal += 0.25;
          const vb = e.inVeh ? 3 : 1;
          for (const s of eyes) {
            const r = F.dist(s.pos, e.pos); if (r > (e.inVeh && e.moving ? Math.max(maxR * 1.5, 900) : maxR)) continue; // moving vehicles are heard as well as seen
            if (F.blocked(W, s.pos, e.pos)) continue;
            let p = F.clamp(1.15 - r / maxR, 0.03, 0.9) * 0.3 * (firing ? 5 : 1) * (e.moving ? (e.sneak ? 0.8 : 1.6) : 1) * (1 - Math.min(0.975, conceal)) * (U.observing ? 1.7 : 1) * (U.post && !U.alerted ? 0.15 : 1) * vb * (s.inVeh && s.moving && !firing ? 0.2 : 1);
            if (tr && W.t - tr.t < 30) p = Math.max(p, 0.5);
            if (F.ch(W, Math.min(0.97, p))) { U.kb.con[e.id] = { x: e.pos.x, y: e.pos.y, f: e.pos.f || 0, t: W.t, down: e.state !== 'ok', unit: V.id }; any = true; break; }
          }
        }
        if (any) {
          U.seen = U.seen || {}; const first = !(U.seen[V.id] > W.t - 600); U.seen[V.id] = W.t;
          if (first) { if (U.side === 'red') { U.kb.sight.push({ t: W.t, x: V.pos.x, y: V.pos.y, n: F.unitOk(W, V).length, veh: V.vehicles.length, u: V.id }); if (U.kb.sight.length > 60) U.kb.sight.shift(); F.ev(W, 'enemy-sighting', `${U.name} observed ${V.name} near ${F.grid(V.pos)}`); } else U.newCon = V.id; }
        }
      }
      for (const id in U.kb.con) if (W.t - U.kb.con[id].t > 1800) delete U.kb.con[id];
    }
  };
  F.fresh = (W, u, age) => { const out = []; for (const id in u.kb.con) { const c = u.kb.con[id]; if (!c.down && W.t - c.t <= (age || 90)) out.push(Object.assign({ id }, c)); } return out; };

  function wound(W, e, s, U, V) {
    const r = F.rnd(W); e.state = r < 0.3 ? 'kia' : 'wia'; e.mobile = e.state === 'wia' && r > 0.7; e.downAt = W.t;
    W.stats = W.stats || { blueKia: 0, blueWia: 0, redKia: 0, redWia: 0 }; const sk = (e.side === 'blue' ? 'blue' : e.side === 'civ' ? 'civ' : 'red') + (e.state === 'kia' ? 'Kia' : 'Wia'); W.stats[sk] = (W.stats[sk] || 0) + 1;
    const id = F.ev(W, 'casualty', `${V.name}: ${e.role} ${e.state === 'kia' ? 'killed' : 'wounded' + (e.mobile ? ' (walking)' : ' (litter)')} by ${F.WEAPONS[s.gun && s.inVeh ? 'M240' : s.weapon] ? (s.gun && s.inVeh ? 'M240' : s.weapon) : 'small arms'} fire from ${U.name} at ${Math.round(F.dist(s.pos, e.pos))} m`, { soldier: e.id, by: s.id }, U.con ? U.con.ev : null);
    V.lastCasEv = id;
  }
  /* Direct fire. Only units that have decided to fight shoot; every round comes out of a real load. */
  F.fight = W => {
    const night = F.isNight(W.t);
    for (const id in W.units) {
      const U = W.units[id]; let any = false;
      for (const sid of U.members) { const s = W.soldiers[sid]; if (s.supp > 0) s.supp = Math.max(0, s.supp - 0.045); }
      if (!U.con || U.cease) continue;
      const tracks = F.fresh(W, U, 150); if (!tracks.length) continue;
      const surprise = U.side === 'red' && W.t - U.con.t0 < 20 ? 2.5 : 1; // the opening burst of an ambush lands on people who are not yet behind cover
      for (const sid of U.members) {
        const s = W.soldiers[sid]; if (s.state !== 'ok' || s.evac || s.armed === false) continue;
        const gunner = s.gun && s.inVeh; if (s.inVeh && !gunner) continue;
        const wk = gunner ? 'M240' : s.weapon, w = F.WEAPONS[wk];
        if (w.at) { // anti-vehicle rocket: only worth firing at a vehicle
          const tv = tracks.find(tr => W.soldiers[tr.id].inVeh && W.t - tr.t <= 45 && F.dist(s.pos, tr) <= w.range); if (!tv) continue;
          s.fa += W.t - U.con.t0 < 3 ? 1 : w.rof; if (s.fa < 1) continue; s.fa = 0; if (!F.expend(W, s, w.ammo, 1, 'combat')) continue; s.firedAt = W.t; any = true;
          const e = W.soldiers[tv.id], V = W.units[e.unit], veh = V.vehicles.map(v => W.vehicles[v]).sort((a, b) => F.dist(a.pos, e.pos) - F.dist(b.pos, e.pos))[0];
          if (W.fx.length < 240) W.fx.push({ ax: s.pos.x, ay: s.pos.y, bx: tv.x, by: tv.y, t: W.t, side: U.side, big: 1 });
          if (veh && F.ch(W, 0.3 * (night ? 0.6 : 1))) { veh.status = 'down'; veh.downUntil = W.t + F.ri(W, 25, 50) * 60; veh.cond = Math.max(0.2, veh.cond - 0.3); F.ev(W, 'vehicle-hit', `${veh.name} hit by an RPG from ${U.name}: mobility kill`, null, U.con.ev); for (const oid of V.members) { const o = W.soldiers[oid]; if (o.state === 'ok' && o.inVeh && F.dist(o.pos, veh.pos) < 5 && F.ch(W, 0.3)) wound(W, o, s, U, V); } }
          continue;
        }
        let best = null, bd = 1e9, aimed = false;
        for (const tr of tracks) { const r = F.dist(s.pos, tr); if (r > w.range) continue; if (U.side === 'blue' && W.soldiers[tr.id].armed === false) continue; /* positive identification: no shooting at the unarmed */ const a = W.t - tr.t <= 45; if ((a && !aimed) || (a === aimed && r < bd)) { if (F.blocked(W, s.pos, tr)) continue; best = tr; bd = r; aimed = a; } }
        if (!best) continue;
        const cqb = bd < 20 && aimed ? 4 : 1; // close quarters: aimed pairs at a few metres
        s.fa += w.rof * cqb * (1 - 0.6 * s.supp) * (aimed ? 1 : 0.35); let n = Math.floor(s.fa); s.fa -= n; if (n <= 0) continue;
        if (gunner) n = F.burn(W, W.stores[W.vehicles[s.gun].ammo], 'A762L', n, 'combat'); else n = F.expend(W, s, w.ammo, n, 'combat');
        if (n <= 0) { s.dry = true; continue; }
        s.firedAt = W.t; any = true;
        const e = W.soldiers[best.id], V = W.units[e.unit], md = F.dist(best, e.pos);
        const cov = Math.min(0.8, F.coverAt(W, e.pos) + (e.moving ? 0 : 0.3) + (e.inVeh ? 0.45 : 0));
        for (let k = 0; k < n; k++) {
          e.supp = Math.min(1, e.supp + (md < 25 ? 0.028 : 0.008)); e.hitAt = W.t;
          const p = 0.02 * w.acc * Math.exp(-bd / 260) * (1 - 0.55 * s.supp) * (1 - cov) * (aimed && md < 8 ? 1 : 0.12) * (night ? (U.side === 'blue' ? 0.85 : 0.5) : 1) * surprise * (cqb > 1 ? 6 : 1); // night vision devices: friendly forces lose little at night, the enemy a lot
          if (e.state === 'ok' && F.ch(W, p)) wound(W, e, s, U, V);
          else if (cqb > 1 && W.civ) { const c = W.civ.find(id => { const x = W.soldiers[id]; return x.state === 'ok' && (x.pos.f || 0) === (e.pos.f || 0) && F.dist(x.pos, e.pos) < 2; }); if (c && F.ch(W, 0.04)) { const cv = W.soldiers[c]; wound(W, cv, s, U, W.units[cv.unit]); } } // a miss in a crowded room can hit someone else
        }
        const o = W.soldiers[F.pick(W, V.members)]; if (o && o !== e && F.dist(o.pos, e.pos) < 20) o.supp = Math.min(1, o.supp + 0.02 * n);
        if (F.ch(W, 0.12)) V.kb.con[s.id] = { x: s.pos.x + F.ri(W, -25, 25) * (s.pos.f != null ? 0.1 : 1), y: s.pos.y + F.ri(W, -25, 25) * (s.pos.f != null ? 0.1 : 1), f: s.pos.f || 0, t: W.t, down: false, unit: U.id }; // muzzle flash and sound
        if (W.fx.length < 240) W.fx.push({ ax: s.pos.x, ay: s.pos.y, bx: best.x + F.ri(W, -6, 6), by: best.y + F.ri(W, -6, 6), t: W.t, side: U.side });
      }
      if (any) { U.con.lastFire = W.t; if (W.t % 3 === 0) (W.noise = W.noise || []).push({ x: Math.round(U.pos.x), y: Math.round(U.pos.y), t: W.t, side: U.side, u: U.id }); }
    }
    if (W.noise && W.noise.length && W.t % 5 === 0) W.noise = W.noise.filter(n => W.t - n.t < 12); // gunfire carries for kilometres; anyone in earshot hears it
    if (W.fx.length && W.t % 2 === 0) W.fx = W.fx.filter(f => W.t - f.t < 3);
  };
})();
