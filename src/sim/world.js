'use strict';
/* Scenario: one FOB, one regional support area, a road network, a rifle platoon with support,
   a logistics convoy element, and two independent enemy cells. Distances in metres, time in seconds. */
(function () {
  const F = globalThis.FOB;
  const NODES = {
    depot: { x: 2000, y: 2000, name: 'RSA Dakota', kind: 'depot' },
    j1: { x: 5000, y: 3000, name: 'Junction 1', kind: 'junction' },
    kes: { x: 8000, y: 4500, name: 'Kessa', kind: 'village' },
    j2: { x: 10000, y: 6000, name: 'CP 1', kind: 'checkpoint' },
    fob: { x: 11500, y: 7000, name: 'FOB Kestrel', kind: 'fob' },
    cpn: { x: 9500, y: 9500, name: 'CP 2', kind: 'checkpoint' },
    mir: { x: 12500, y: 11500, name: 'Mirab', kind: 'village' },
    rdg: { x: 15500, y: 10500, name: 'Ridge road', kind: 'checkpoint' },
    tol: { x: 16500, y: 7500, name: 'Tolan', kind: 'village' },
    j3: { x: 14000, y: 6500, name: 'CP 3', kind: 'checkpoint' }
  };
  const EDGES = [['depot', 'j1'], ['j1', 'kes'], ['kes', 'j2'], ['j2', 'fob'], ['j2', 'cpn'], ['cpn', 'mir'], ['mir', 'rdg'], ['rdg', 'tol'], ['tol', 'j3'], ['j3', 'fob']];
  /* FOB facility positions, metres from the FOB centre. */
  F.FOBLAY = {
    toc: { x: 0, y: 12, name: 'Ops center' }, fuel: { x: -58, y: -34, name: 'Fuel point' }, water: { x: -34, y: -40, name: 'Water point' }, rations: { x: -10, y: -40, name: 'Ration store' },
    asp: { x: 60, y: -38, name: 'Ammunition holding area' }, motor: { x: 44, y: 28, name: 'Motor pool' }, aid: { x: -56, y: 22, name: 'Aid station' }, tents: { x: -6, y: 44, name: 'Tents' },
    yard: { x: 20, y: -42, name: 'Engineer yard' }, gate: { x: 0, y: -62, name: 'Gate' }, work: { x: 84, y: 0, name: 'Tower 3 site' },
    posts: [{ x: -82, y: -62 }, { x: 82, y: -62 }, { x: 82, y: 62 }, { x: -82, y: 62 }, { x: 0, y: -66 }], half: { x: 84, y: 64 }
  };
  const ROLES = [['SL', 'M4'], ['TL', 'M4'], ['AR', 'M249'], ['GR', 'M4'], ['R', 'M4'], ['TL', 'M4'], ['AR', 'M249'], ['GR', 'M4'], ['R', 'M4']];

  function soldier(W, u, role, weapon, pos) {
    const id = 's' + (W.nid++); const w = F.WEAPONS[weapon];
    const s = { id, unit: u.id, side: u.side, role, weapon, state: 'ok', mobile: true, pos: { x: pos.x, y: pos.y }, supp: 0, fa: 0, firedAt: -999, hitAt: -999, moving: false, carry: {}, gun: null, hungry: 0, evac: false };
    s.carry[w.ammo] = w.load; W.ledger.initial[w.ammo] = (W.ledger.initial[w.ammo] || 0) + w.load;
    W.soldiers[id] = s; u.members.push(id); return s;
  }
  function unit(W, o) {
    const u = Object.assign({ members: [], vehicles: [], crew: [], dis: true, pos: { x: 0, y: 0 }, hdg: 0, node: null, mv: null, plan: null, pi: 0, task: 'idle', con: null, ord: null, kb: { con: {}, sight: [] }, lastRep: 0, lastBeacon: 0, availAt: 0, home: 'fob' }, o);
    W.units[u.id] = u; return u;
  }
  function vehicle(W, o) {
    const v = Object.assign({ unit: null, status: 'ok', km: 0, kmSvc: 0, cond: 1, gun: null, cargo: null, bulk: null, at: 'fob' }, o);
    v.tank = F.mkStore(W, { id: v.id + '.tank', name: v.name + ' fuel tank', at: v.id, kind: 'vehtank', capL: v.tankL, accepts: ['JP8'] }).id;
    if (v.gun) v.ammo = F.mkStore(W, { id: v.id + '.ammo', name: v.name + ' gun ammunition', at: v.id, kind: 'vehammo', capKg: 60, accepts: ['A762L'] }).id;
    if (v.payloadKg) v.cargo = F.mkStore(W, { id: v.id + '.cargo', name: v.name + ' cargo bed', at: v.id, kind: 'cargo', capKg: v.payloadKg }).id;
    if (v.bulkL) v.bulk = F.mkStore(W, { id: v.id + '.bulk', name: v.name + ' tanker module', at: v.id, kind: 'tanker', capL: v.bulkL, accepts: ['JP8'] }).id;
    W.vehicles[v.id] = v; return v;
  }

  F.addFighter = (W, u) => soldier(W, u, 'FTR', 'AK', u.base);
  F.mkSoldier = soldier; F.mkUnit = unit; F.mkVehicle = vehicle;
  F.newWorld = seed => {
    const W = { v: 1, seed, rs: seed | 0, t: 5 * F.H, nid: 1, map: { w: 20000, h: 14000, nodes: NODES, edges: EDGES,
      blockers: [{ x: 13800, y: 8900, r: 1400, name: 'Hill 402 ridge' }],
      cover: [{ x: 8000, y: 4500, r: 350, c: 0.5, kind: 'village' }, { x: 12500, y: 11500, r: 350, c: 0.5, kind: 'village' }, { x: 16500, y: 7500, r: 350, c: 0.5, kind: 'village' },
        { x: 17600, y: 11600, r: 1500, c: 0.45, kind: 'rough', name: 'NE hills' }, { x: 6200, y: 6700, r: 1300, c: 0.45, kind: 'rough', name: 'South hills' }, { x: 13800, y: 8900, r: 1400, c: 0.4, kind: 'rough', name: 'Hill 402' },
        { x: 16300, y: 9000, r: 520, c: 0.45, kind: 'scrub' }, { x: 14100, y: 11300, r: 460, c: 0.45, kind: 'scrub' }, { x: 8850, y: 5500, r: 420, c: 0.45, kind: 'scrub' }, { x: 6350, y: 4000, r: 420, c: 0.45, kind: 'scrub' }] },
      stores: {}, vehicles: {}, soldiers: {}, units: {}, msgs: [], events: [], decisions: [],
      ledger: { initial: {}, used: {}, lost: {}, expired: {}, why: {} },
      hq: { units: {}, contacts: [], log: [], logstat: null, cseq: 1, convoy: null },
      so: { patrolEvery: 3 * F.H, patrolRoute: 'full', qrfNTM: 1800, overdue: 1500, dosTarget: 6, dosReorder: 3, logpacHour: 5, incidentWindow: 180, reserveQrfVeh: true, roe: 'engage', workDetail: true },
      s3: { roles: { guard: 'u1', patrol: 'u2', qrf: 'u3' }, nextRot: 14 * F.H, nextPatrol: 5 * F.H + 1500, patrolN: 0, note: '' },
      s4: { nextStat: 5 * F.H + 60, req: null, mech: null, lastSample: 0, hist: [], lastLogpacDay: 0, note: '' },
      depot: { state: 'idle', req: null, manifest: null },
      fob: { pump: null, power: true, project: { name: 'Guard tower 3 and gate barrier', needH: 64, doneH: 0, perH: 0.6, done: false }, aid: [] },
      ops: [], incidents: [], iseq: 1, player: { resp: {}, cmds: [] }, fx: [], redPool: 9 };
    const fob = NODES.fob, dep = NODES.depot;
    /* FOB stores, with real capacities */
    const st = (id, name, at, o) => F.mkStore(W, Object.assign({ id, name, at }, o));
    F.stock(W, st('fuelA', 'Fuel tank A', 'fob', { kind: 'tank', capL: 1900, accepts: ['JP8'] }), 'JP8', 900);
    F.stock(W, st('fuelB', 'Fuel tank B', 'fob', { kind: 'tank', capL: 1900, accepts: ['JP8'] }), 'JP8', 500);
    F.stock(W, st('water', 'Water tanks', 'fob', { kind: 'tank', capL: 3000, accepts: ['WATER'] }), 'WATER', 1800);
    F.stock(W, st('rations', 'Ration store', 'fob', { kind: 'store', capKg: 1500, accepts: ['MRE'] }), 'MRE', 400, W.t - 200 * F.D);
    const asp = st('asp', 'Ammunition holding area', 'fob', { kind: 'store', capKg: 2500, accepts: ['A556', 'A556L', 'A762L'] });
    F.stock(W, asp, 'A556', 9000); F.stock(W, asp, 'A556L', 4800); F.stock(W, asp, 'A762L', 3200);
    F.stock(W, st('parts', 'Parts cage', 'fob', { kind: 'store', capKg: 500, accepts: ['PARTS'] }), 'PARTS', 3);
    F.stock(W, st('yard', 'Engineer yard', 'fob', { kind: 'store', capKg: 5000, accepts: ['CL4'] }), 'CL4', 10);
    /* Depot stores */
    F.stock(W, st('dFuel', 'Depot bulk fuel', 'depot', { kind: 'tank', capL: 200000, accepts: ['JP8'] }), 'JP8', 60000);
    F.stock(W, st('dWater', 'Depot water', 'depot', { kind: 'tank', capL: 100000, accepts: ['WATER'] }), 'WATER', 40000);
    const dw = st('dWare', 'Depot warehouse', 'depot', { kind: 'store', capKg: 2e6 });
    F.stock(W, dw, 'MRE', 20000, W.t - 120 * F.D); F.stock(W, dw, 'A556', 150000); F.stock(W, dw, 'A556L', 80000); F.stock(W, dw, 'A762L', 60000); F.stock(W, dw, 'PARTS', 60); F.stock(W, dw, 'CL4', 300);
    /* Vehicles */
    const mp = F.FOBLAY.motor;
    for (let i = 1; i <= 4; i++) {
      const v = vehicle(W, { id: 'v' + i, name: 'M-ATV ' + i, type: 'M-ATV', tankL: 150, lPerKm: 0.55, gun: 'M240', pos: { x: fob.x + mp.x + (i - 2.5) * 9, y: fob.y + mp.y }, at: 'fob' });
      F.stock(W, W.stores[v.tank], 'JP8', [120, 135, 60, 140][i - 1]); F.stock(W, W.stores[v.ammo], 'A762L', 800);
      v.kmSvc = [40, 20, 105, 0][i - 1]; v.cond = [0.9, 0.95, 0.72, 1][i - 1];
    }
    const cg = vehicle(W, { id: 'c1', name: 'Gun truck', type: 'M1151', tankL: 95, lPerKm: 0.4, gun: 'M240', pos: { x: dep.x + 30, y: dep.y }, at: 'depot' });
    const ct = vehicle(W, { id: 'c2', name: 'Cargo truck', type: 'LMTV', tankL: 220, lPerKm: 0.45, payloadKg: 4500, pos: { x: dep.x + 45, y: dep.y }, at: 'depot' });
    const cf = vehicle(W, { id: 'c3', name: 'Fuel tanker', type: 'M978', tankL: 580, lPerKm: 0.9, bulkL: 9500, pos: { x: dep.x + 60, y: dep.y }, at: 'depot' });
    F.stock(W, W.stores[cg.tank], 'JP8', 90); F.stock(W, W.stores[ct.tank], 'JP8', 200); F.stock(W, W.stores[cf.tank], 'JP8', 520); F.stock(W, W.stores[cg.ammo], 'A762L', 800);
    /* Friendly units */
    const tents = { x: fob.x + F.FOBLAY.tents.x, y: fob.y + F.FOBLAY.tents.y };
    ['1st Squad', '2nd Squad', '3rd Squad'].forEach((n, i) => {
      const u = unit(W, { id: 'u' + (i + 1), name: n, call: 'RED ' + (i + 1), side: 'blue', kind: 'squad', pos: { x: tents.x, y: tents.y }, node: 'fob' });
      ROLES.forEach((r, k) => soldier(W, u, r[0], r[1], { x: tents.x + (k % 5) * 4 - 20 + i * 24, y: tents.y + Math.floor(k / 5) * 4 }));
    });
    const hq = unit(W, { id: 'hq', name: 'Command post', call: 'KESTREL', side: 'blue', kind: 'hq', pos: { x: fob.x, y: fob.y + 12 }, node: 'fob', task: 'command post' });
    ['PL', 'PSG', 'RTO', 'MED'].forEach((r, k) => soldier(W, hq, r, 'M4', { x: fob.x + k * 3 - 4, y: fob.y + 12 }));
    const sp = unit(W, { id: 'spt', name: 'Support section', call: 'KESTREL SPT', side: 'blue', kind: 'support', pos: { x: fob.x + 30, y: fob.y }, node: 'fob', task: 'base support' });
    [['MECH', 'motor'], ['MECH', 'motor'], ['FUEL', 'fuel'], ['SUP', 'rations'], ['SUP', 'asp']].forEach(r => soldier(W, sp, r[0], 'M4', { x: fob.x + F.FOBLAY[r[1]].x + 4, y: fob.y + F.FOBLAY[r[1]].y + 4 }));
    const cv = unit(W, { id: 'cv', name: 'Logistics convoy', call: 'PACKHORSE', side: 'blue', kind: 'convoy', pos: { x: dep.x, y: dep.y }, node: 'depot', home: 'depot', dis: true, task: 'at the depot' });
    ['TL', 'R', 'R', 'R', 'DRV', 'DRV', 'DRV', 'DRV'].forEach((r, k) => soldier(W, cv, r, 'M4', { x: dep.x + 20 + k * 3, y: dep.y - 10 }));
    cv.vehicles = ['c1', 'c2', 'c3']; ['c1', 'c2', 'c3'].forEach(v => { W.vehicles[v].unit = 'cv'; });
    W.soldiers[cv.members[1]].gun = 'c1'; cv.crew = cv.members.slice();
    /* Enemy cells: each has a base, a finite cache, and candidate sites it may watch or ambush from. */
    const cell = (id, name, base, n, sites) => {
      const u = unit(W, { id, name, call: name, side: 'red', kind: 'cell', pos: { x: base.x, y: base.y }, home: null, base, alt: { x: base.x + 900, y: base.y + 700 }, sites, st: 'base', until: W.t + F.ri(W, 2, 5) * F.H, site: null, mode: null, visits: {}, n0: n, nextRepl: W.t + F.D });
      for (let k = 0; k < n; k++) soldier(W, u, k === 0 ? 'LDR' : k === 1 ? 'MG' : k === 2 ? 'RPG' : 'FTR', k === 1 ? 'PKM' : k === 2 ? 'RPG' : 'AK', { x: base.x + (k % 3) * 6, y: base.y + Math.floor(k / 3) * 6 });
      u.cache = F.mkStore(W, { id: id + '.cache', name: name + ' cache', at: id, kind: 'cache', capKg: 400, accepts: ['E762'] }).id; F.stock(W, W.stores[u.cache], 'E762', 2400);
      return u;
    };
    cell('e1', 'Cell North', { x: 17800, y: 11900 }, 6, [{ id: 'a1', pos: { x: 16150, y: 9050 }, obs: { x: 16620, y: 9060 }, road: { x: 16000, y: 9000 } }, { id: 'a2', pos: { x: 14060, y: 11160 }, obs: { x: 14160, y: 11620 }, road: { x: 14000, y: 11000 } }]);
    cell('e2', 'Cell South', { x: 6300, y: 6900 }, 5, [{ id: 'b1', pos: { x: 8900, y: 5420 }, obs: { x: 8740, y: 5760 }, road: { x: 9000, y: 5250 } }, { id: 'b2', pos: { x: 6420, y: 3920 }, obs: { x: 6240, y: 4260 }, road: { x: 6500, y: 3750 } }]);
    /* The cells were here before the scenario opened and have already watched the routine patrols go by. */
    [[-30, 16000, 9000], [-21, 16050, 8900], [-9, 14000, 11000]].forEach(g => W.units.e1.kb.sight.push({ t: W.t + g[0] * F.H, x: g[1], y: g[2], n: 9, veh: 2, u: 'u2' }));
    W.units.e2.kb.sight.push({ t: W.t - 20 * F.H, x: 9000, y: 5250, n: 8, veh: 3, u: 'cv' });
    /* The planned reconnaissance operation: the staff will draft it, the player approves it. */
    W.ops.push({ id: 'op1', name: 'Reconnaissance of NAI 1', status: 'pending', nai: { x: 17700, y: 11700 }, op: { x: 16900, y: 10900 }, drop: 'tol', dwell: 2 * F.H, unit: null, start: null, qrfReady: false, draftAt: W.t + 900, res: { JP8: 60, MRE: 27, WATER: 36 } });
    /* HQ starts knowing its own units at the base, and nothing about the enemy beyond the assessment. */
    for (const id in W.units) { const u = W.units[id]; if (u.side === 'blue') W.hq.units[id] = { pos: { x: u.pos.x, y: u.pos.y }, t: W.t, src: 'fob', str: u.members.length, ammo: 100, status: u.task, cas: 0 }; }
    F.ev(W, 'start', 'Scenario start. FOB Kestrel operating; staff running routine operations.');
    return W;
  };
  F.route = (W, a, b) => { // Dijkstra over the road graph, by distance
    if (a === b) return [];
    const N = W.map.nodes, dist = {}, prev = {}, done = {}; for (const k in N) dist[k] = 1e12; dist[a] = 0;
    for (;;) {
      let u = null, best = 1e12; for (const k in dist) if (!done[k] && dist[k] < best) { best = dist[k]; u = k; }
      if (u == null || u === b) break; done[u] = 1;
      for (const e of W.map.edges) { const v = e[0] === u ? e[1] : e[1] === u ? e[0] : null; if (!v) continue; const d = best + F.dist(N[u], N[v]); if (d < dist[v]) { dist[v] = d; prev[v] = u; } }
    }
    if (dist[b] >= 1e12) return null; const p = []; let c = b; while (c !== a) { p.unshift(c); c = prev[c]; } return p;
  };
  F.routeLen = (W, a, path) => { let d = 0, c = a; for (const n of path) { d += F.dist(W.map.nodes[c], W.map.nodes[n]); c = n; } return d; };
  F.blocked = (W, a, b) => { // line of sight against ridge circles
    for (const c of W.map.blockers) { const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy; let t = l2 ? ((c.x - a.x) * dx + (c.y - a.y) * dy) / l2 : 0; t = F.clamp(t, 0, 1); if (Math.hypot(a.x + dx * t - c.x, a.y + dy * t - c.y) < c.r * 0.92) return true; }
    return false;
  };
  F.coverAt = (W, p) => { let c = 0; for (const z of W.map.cover) if (Math.hypot(p.x - z.x, p.y - z.y) <= z.r && z.c > c) c = z.c; return c; };
  F.atFob = (W, p) => Math.abs(p.x - W.map.nodes.fob.x) < 130 && Math.abs(p.y - W.map.nodes.fob.y) < 110;
})();
