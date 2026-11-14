'use strict';
/* Operations. A scenario sets up a force, a target and the ground; the player writes the plan (routes,
   positions, timings and go codes) and then runs it from the command post. Once launched, each element
   leader carries out the plan as they understand it: they move on the codes they have actually received
   or on the times in the order, and they act on their own initiative when compromised. */
(function () {
  const F = globalThis.FOB;
  const H = 3600;
  const PACE = { stealth: 0.6, patrol: 1.15, rush: 1.8 };
  F.PACE = PACE;
  F.CODES = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA'];

  /* ---------- the ground: Sarak valley ---------- */
  function valley() {
    return {
      w: 12000, h: 9000,
      nodes: {
        fob: { x: 1500, y: 1500, name: 'FOB Kestrel', kind: 'fob' },
        j1: { x: 4200, y: 2000, name: 'Copper junction', kind: 'junction' },
        vdo: { x: 6000, y: 3400, name: 'Wadi crossing', kind: 'checkpoint' },
        bend: { x: 7900, y: 4600, name: 'Orchard bend', kind: 'checkpoint' },
        sarak: { x: 9400, y: 6200, name: 'Sarak', kind: 'village' },
        dara: { x: 11000, y: 7800, name: 'Dara', kind: 'village' }
      },
      edges: [['fob', 'j1'], ['j1', 'vdo'], ['vdo', 'bend'], ['bend', 'sarak'], ['sarak', 'dara']],
      blockers: [{ x: 7300, y: 5300, r: 900, name: 'Hill 611' }],
      cover: [{ x: 9450, y: 6250, r: 380, c: 0.5, kind: 'village' }, { x: 11000, y: 7800, r: 320, c: 0.5, kind: 'village' },
        { x: 7300, y: 5300, r: 900, c: 0.4, kind: 'rough', name: 'Hill 611' }, { x: 8500, y: 5650, r: 480, c: 0.5, kind: 'scrub', name: 'Orchards' },
        { x: 9300, y: 7350, r: 520, c: 0.45, kind: 'scrub', name: 'North wadi' }, { x: 4800, y: 4800, r: 1100, c: 0.45, kind: 'rough', name: 'West hills' }]
    };
  }

  /* ---------- scenarios ---------- */
  const SQUAD = [['SL', 'M4'], ['TL', 'M4'], ['AR', 'M249'], ['GR', 'M4'], ['R', 'M4'], ['TL', 'M4'], ['AR', 'M249'], ['GR', 'M4'], ['R', 'M4']];
  F.SCENARIOS = {
    cobalt: {
      name: 'Raid on Objective Cobalt', scale: 'Special Forces team, 12',
      brief: 'A facilitator who moves fighters into the valley sleeps in a walled compound on the east side of Sarak, guarded by about five armed men. Kill or capture him and bring the team home. Intelligence is twelve hours old.',
      start: 22 * H, h: 26 * H,
      obj: { x: 9500, y: 6300, name: 'OBJ COBALT' },
      force: [
        { id: 'a3', name: 'Mobility element', call: 'SABER 3', kind: 'mounted', roles: [['DRV', 'M4'], ['DRV', 'M4'], ['DRV', 'M4']], vehicles: 3, vtype: 'GMV' },
        { id: 'a1', name: 'Assault element', call: 'SABER 1', roles: [['TL', 'M4'], ['R', 'M4'], ['R', 'M4'], ['R', 'M4'], ['AR', 'M249'], ['MED', 'M4']], tacsat: true },
        { id: 'a2', name: 'Support element', call: 'SABER 2', roles: [['TL', 'M4'], ['MG', 'M240'], ['R', 'M4']], tacsat: true }
      ],
      enemy: [
        { id: 'g1', name: 'Compound guard', role: 'guard', pos: { x: 9500, y: 6300 }, alt: { x: 10500, y: 7400 }, roles: [['LDR', 'AK'], ['MG', 'PKM'], ['FTR', 'AK'], ['FTR', 'AK'], ['FTR', 'AK']] },
        { id: 'h1', name: 'Target party', role: 'hvt', pos: { x: 9520, y: 6320 }, alt: { x: 10600, y: 7550 }, roles: [['HVT', 'AK'], ['BG', 'AK']], nerve: 0.5 }
      ],
      plan: {
        hide: 'bend', sp: 22 * H + 1800,
        els: {
          a3: [{ k: 'load', riders: ['a1', 'a2'] }, { k: 'drive', to: 'hide' }, { k: 'hide', riders: ['a1', 'a2'], name: 'vehicle hide' }, { k: 'drive', to: 'fob', exfil: true }],
          a1: [{ k: 'ride', carrier: 'a3', off: 'hide' },
            { k: 'move', pts: [{ x: 8300, y: 5200 }, { x: 8450, y: 5550 }], pace: 'patrol', name: 'ORP', rally: true },
            { k: 'await', until: [{ code: 'ALPHA' }, { h: -3000 }], name: 'leave the ORP' },
            { k: 'move', pts: [{ x: 8900, y: 5850 }, { x: 9200, y: 6080 }], pace: 'stealth', name: 'assault position' },
            { k: 'await', until: [{ code: 'BRAVO' }, { h: 0 }, { compromise: true }], name: 'assault' },
            { k: 'assault', obj: 'obj' },
            { k: 'move', pts: [{ x: 8450, y: 5550 }], pace: 'patrol', name: 'ORP', exfil: true },
            { k: 'move', pts: [{ node: 'hide' }], pace: 'patrol', name: 'vehicle hide' },
            { k: 'ride', carrier: 'a3', off: 'fob' }],
          a2: [{ k: 'ride', carrier: 'a3', off: 'hide' },
            { k: 'move', pts: [{ x: 8300, y: 5200 }, { x: 8450, y: 5550 }], pace: 'patrol', name: 'ORP', rally: true },
            { k: 'await', until: [{ code: 'ALPHA' }, { h: -3000 }], name: 'leave the ORP' },
            { k: 'sbf', pts: [{ x: 8800, y: 6200 }, { x: 9150, y: 6550 }], pace: 'stealth', name: 'support by fire', open: [{ compromise: true }, { code: 'CHARLIE' }], until: [{ peer: 'a1', phase: 'objective secure' }, { h: 3600 }] },
            { k: 'await', until: [{ code: 'DELTA' }, { peer: 'a1', phase: 'search complete' }, { h: 5400 }], name: 'exfiltrate' },
            { k: 'move', pts: [{ x: 8450, y: 5550 }], pace: 'patrol', name: 'ORP', exfil: true },
            { k: 'move', pts: [{ node: 'hide' }], pace: 'patrol', name: 'vehicle hide' },
            { k: 'ride', carrier: 'a3', off: 'fob' }]
        }
      }
    },
    iron: {
      name: 'Cordon and raid on Objective Iron', scale: 'Rifle platoon, 4 elements',
      brief: 'A cell of about eight fighters holds a compound in Sarak and protects a bomb maker. Another cell lives in Dara, two kilometres north-east, and will come if it hears a fight. Isolate the compound, take it, and get the platoon back.',
      start: 22 * H, h: 27 * H,
      obj: { x: 9500, y: 6300, name: 'OBJ IRON' },
      force: [
        { id: 'p4', name: 'Vehicle section', call: 'RED 4', kind: 'mounted', roles: [['DRV', 'M4'], ['GNR', 'M4'], ['DRV', 'M4'], ['GNR', 'M4'], ['DRV', 'M4'], ['GNR', 'M4'], ['DRV', 'M4'], ['GNR', 'M4'], ['DRV', 'M4'], ['GNR', 'M4']], vehicles: 5, vtype: 'M-ATV' },
        { id: 'p1', name: '1st Squad (assault)', call: 'RED 1', roles: SQUAD },
        { id: 'p2', name: '2nd Squad (support)', call: 'RED 2', roles: SQUAD.concat([['MG', 'M240'], ['AG', 'M4']]) },
        { id: 'p3', name: '3rd Squad (block)', call: 'RED 3', roles: SQUAD }
      ],
      enemy: [
        { id: 'g1', name: 'Compound cell', role: 'guard', pos: { x: 9500, y: 6300 }, alt: { x: 10500, y: 7400 }, roles: [['LDR', 'AK'], ['MG', 'PKM'], ['RPG', 'RPG'], ['FTR', 'AK'], ['FTR', 'AK'], ['MG', 'PKM'], ['FTR', 'AK'], ['FTR', 'AK']] },
        { id: 'h1', name: 'Bomb maker and guards', role: 'hvt', pos: { x: 9530, y: 6330 }, alt: { x: 10600, y: 7550 }, roles: [['HVT', 'AK'], ['BG', 'AK'], ['BG', 'AK']], nerve: 0.5 },
        { id: 'r1', name: 'Dara cell', role: 'reinforce', pos: { x: 11000, y: 7800 }, joinAt: { x: 9600, y: 6400 }, alt: { x: 11600, y: 8400 }, roles: [['LDR', 'AK'], ['MG', 'PKM'], ['FTR', 'AK'], ['FTR', 'AK'], ['FTR', 'AK'], ['RPG', 'RPG']] }
      ],
      plan: {
        hide: 'bend', sp: 22 * H + 1800,
        els: {
          p4: [{ k: 'load', riders: ['p1', 'p2', 'p3'] }, { k: 'drive', to: 'hide' }, { k: 'hide', riders: ['p1', 'p2', 'p3'], name: 'dismount point' }, { k: 'drive', to: 'fob', exfil: true }],
          p3: [{ k: 'ride', carrier: 'p4', off: 'hide' },
            { k: 'block', pts: [{ x: 8400, y: 5900 }, { x: 9000, y: 7300 }, { x: 10050, y: 7050 }], pace: 'stealth', name: 'blocking position', until: [{ code: 'DELTA' }, { peer: 'p1', phase: 'search complete' }, { h: 5400 }] },
            { k: 'move', pts: [{ x: 9000, y: 7300 }, { x: 8400, y: 5900 }], pace: 'patrol', name: 'release point', exfil: true },
            { k: 'move', pts: [{ node: 'hide' }], pace: 'patrol', name: 'dismount point' },
            { k: 'ride', carrier: 'p4', off: 'fob' }],
          p1: [{ k: 'ride', carrier: 'p4', off: 'hide' },
            { k: 'move', pts: [{ x: 8300, y: 5200 }, { x: 8450, y: 5550 }], pace: 'patrol', name: 'ORP', rally: true },
            { k: 'await', until: [{ code: 'ALPHA' }, { h: -2700 }], name: 'leave the ORP' },
            { k: 'move', pts: [{ x: 8900, y: 5850 }, { x: 9200, y: 6080 }], pace: 'stealth', name: 'assault position' },
            { k: 'await', until: [{ code: 'BRAVO' }, { h: 0 }, { compromise: true }], name: 'assault' },
            { k: 'assault', obj: 'obj' },
            { k: 'move', pts: [{ x: 8450, y: 5550 }], pace: 'patrol', name: 'ORP', exfil: true },
            { k: 'move', pts: [{ node: 'hide' }], pace: 'patrol', name: 'dismount point' },
            { k: 'ride', carrier: 'p4', off: 'fob' }],
          p2: [{ k: 'ride', carrier: 'p4', off: 'hide' },
            { k: 'move', pts: [{ x: 8300, y: 5200 }, { x: 8450, y: 5550 }], pace: 'patrol', name: 'ORP', rally: true },
            { k: 'await', until: [{ code: 'ALPHA' }, { h: -2700 }], name: 'leave the ORP' },
            { k: 'sbf', pts: [{ x: 8800, y: 6200 }, { x: 9150, y: 6550 }], pace: 'stealth', name: 'support by fire', open: [{ compromise: true }, { code: 'CHARLIE' }], until: [{ peer: 'p1', phase: 'objective secure' }, { h: 3600 }] },
            { k: 'await', until: [{ code: 'DELTA' }, { peer: 'p1', phase: 'search complete' }, { h: 5400 }], name: 'exfiltrate' },
            { k: 'move', pts: [{ x: 8450, y: 5550 }], pace: 'patrol', name: 'ORP', exfil: true },
            { k: 'move', pts: [{ node: 'hide' }], pace: 'patrol', name: 'dismount point' },
            { k: 'ride', carrier: 'p4', off: 'fob' }]
        }
      }
    }
  };

  F.createOp = (seed, id) => {
    const S = F.SCENARIOS[id]; if (!S) throw new Error('No scenario ' + id);
    const W = { v: 1, scn: id, seed, rs: seed | 0, t: S.start, nid: 1, map: S.kind === 'compound' ? F.cqbMap() : valley(),
      stores: {}, vehicles: {}, soldiers: {}, units: {}, msgs: [], events: [], decisions: [], noise: [],
      ledger: { initial: {}, used: {}, lost: {}, expired: {}, why: {} },
      hq: { units: {}, contacts: [], log: [], logstat: null, cseq: 1, convoy: null, el: {}, hvt: null, secure: null },
      so: { overdue: 2700, incidentWindow: 180, roe: 'engage' },
      fob: { pump: null, power: true, project: { name: '', needH: 1, doneH: 1, done: true }, aid: [] },
      ops: [], incidents: [], iseq: 1, player: { resp: {}, cmds: [] }, fx: [], redPool: 0,
      stats: { blueKia: 0, blueWia: 0, redKia: 0, redWia: 0, deliveries: 0, missedMeals: 0 } };
    const fob = W.map.nodes.fob, st = (sid, name, o) => F.mkStore(W, Object.assign({ id: sid, name, at: 'fob' }, o));
    F.stock(W, st('fuelA', 'Fuel tank A', { kind: 'tank', capL: 1900, accepts: ['JP8'] }), 'JP8', 1500);
    F.stock(W, st('fuelB', 'Fuel tank B', { kind: 'tank', capL: 1900, accepts: ['JP8'] }), 'JP8', 800);
    F.stock(W, st('water', 'Water tanks', { kind: 'tank', capL: 3000, accepts: ['WATER'] }), 'WATER', 2000);
    F.stock(W, st('rations', 'Ration store', { kind: 'store', capKg: 1500, accepts: ['MRE'] }), 'MRE', 600, W.t - 100 * F.D);
    const asp = st('asp', 'Ammunition holding area', { kind: 'store', capKg: 2500, accepts: ['A556', 'A556L', 'A762L'] });
    F.stock(W, asp, 'A556', 9000); F.stock(W, asp, 'A556L', 4800); F.stock(W, asp, 'A762L', 3200);
    F.stock(W, st('parts', 'Parts cage', { kind: 'store', capKg: 500, accepts: ['PARTS'] }), 'PARTS', 2);
    F.stock(W, st('yard', 'Engineer yard', { kind: 'store', capKg: 5000, accepts: ['CL4'] }), 'CL4', 10);
    const tents = F.fobPos(W, 'tents'), mp = F.fobPos(W, 'motor');
    if (S.kind === 'compound') {
      W.op = { id, name: S.name, status: 'planning', plan: null, h: 0, obj: S.obj, called: {}, tLaunch: null, tEnd: null, outcome: null };
      const hq = F.mkUnit(W, { id: 'hq', name: 'Command post', call: 'KESTREL', side: 'blue', kind: 'hq', pos: { x: fob.x, y: fob.y + 12 }, node: 'fob', task: 'command post' });
      ['CDR', 'RTO'].forEach((r, k) => F.mkSoldier(W, hq, r, 'M4', { x: fob.x + k * 3, y: fob.y + 12 }));
      F.cqbSetup(W, S);
      for (const uid in W.units) { const u = W.units[uid]; if (u.side === 'blue') W.hq.units[uid] = { pos: { x: u.pos.x, y: u.pos.y }, t: W.t, src: 'fob', str: u.members.length, ammo: 100, status: u.task, cas: 0 }; }
      F.ev(W, 'start', `${S.name}: planning. ${S.brief}`);
      return W;
    }
    S.force.forEach((f, fi) => {
      const u = F.mkUnit(W, { id: f.id, name: f.name, call: f.call, side: 'blue', kind: f.kind || 'element', pos: { x: tents.x, y: tents.y }, node: 'fob', task: 'preparing', opEl: true, tacsat: !!f.tacsat, codes: {}, det: [], net: {}, fire: 'hold' });
      f.roles.forEach((r, k) => F.mkSoldier(W, u, r[0], r[1], { x: tents.x + (k % 6) * 4 - 20 + fi * 26 - 30, y: tents.y + Math.floor(k / 6) * 4 }));
      if (f.vehicles) {
        u.pos = { x: mp.x, y: mp.y };
        for (let i = 0; i < f.vehicles; i++) { const v = F.mkVehicle(W, { id: f.id + 'v' + (i + 1), name: f.vtype + ' ' + (i + 1), type: f.vtype, tankL: 150, lPerKm: f.vtype === 'GMV' ? 0.42 : 0.55, gun: 'M240', pos: { x: mp.x + (i - 2) * 9, y: mp.y }, at: 'fob' }); F.stock(W, W.stores[v.tank], 'JP8', 140); F.stock(W, W.stores[v.ammo], 'A762L', 800); v.unit = u.id; u.vehicles.push(v.id); }
        u.crew = u.members.slice(); u.members.forEach((m, i) => { if (i % 2 === 1 || f.roles.length <= f.vehicles) W.soldiers[m].gun = u.vehicles[Math.floor(i / (f.roles.length <= f.vehicles ? 1 : 2)) % u.vehicles.length]; });
        u.members.forEach((m, i) => { W.soldiers[m].pos = { x: mp.x + (i % 5) * 9 - 18, y: mp.y - 4 - Math.floor(i / 5) * 3 }; });
      }
    });
    S.enemy.forEach(e => {
      const u = F.mkUnit(W, { id: e.id, name: e.name, call: e.name, side: 'red', kind: 'cell', pos: { x: e.pos.x, y: e.pos.y }, home: null, base: e.pos, alt: e.alt, joinAt: e.joinAt || null, post: true, role: e.role, st: 'post', n0: e.roles.length, nerve: e.nerve, observing: false });
      e.roles.forEach((r, k) => { const s = F.mkSoldier(W, u, r[0], r[1], { x: e.pos.x + (k % 3) * 7 - 7, y: e.pos.y + Math.floor(k / 3) * 7 - 7 }); if (r[0] === 'HVT') s.hvt = true; });
      if (e.role === 'guard') u.members.forEach((m, k) => { const a = k / u.members.length * Math.PI * 2; W.soldiers[m].pos = { x: e.pos.x + Math.cos(a) * 28, y: e.pos.y + Math.sin(a) * 22 }; }); // a guard spreads round the compound wall
    });
    const hq = F.mkUnit(W, { id: 'hq', name: 'Command post', call: 'KESTREL', side: 'blue', kind: 'hq', pos: { x: fob.x, y: fob.y + 12 }, node: 'fob', task: 'command post' });
    ['CDR', 'RTO'].forEach((r, k) => F.mkSoldier(W, hq, r, 'M4', { x: fob.x + k * 3, y: fob.y + 12 }));
    for (const uid in W.units) { const u = W.units[uid]; if (u.side === 'blue') W.hq.units[uid] = { pos: { x: u.pos.x, y: u.pos.y }, t: W.t, src: 'fob', str: u.members.length, ammo: 100, status: u.task, cas: 0 }; }
    W.op = { id, name: S.name, status: 'planning', plan: JSON.parse(JSON.stringify(S.plan)), h: S.h, obj: S.obj, called: {}, tLaunch: null, tEnd: null, outcome: null };
    F.ev(W, 'start', `${S.name}: planning. ${S.brief}`);
    return W;
  };

  /* ---------- the plan: resolving points and compiling legs into steps ---------- */
  F.opPt = (W, p) => p.node ? W.map.nodes[p.node === 'hide' ? W.op.plan.hide : p.node] : p;
  F.opLegEnd = (W, leg) => leg.pts && leg.pts.length ? F.opPt(W, leg.pts[leg.pts.length - 1]) : leg.k === 'assault' ? W.op.obj : null;
  const resolveConds = (W, c) => (c || []).map(x => x.h != null ? { t: W.op.h + x.h, h: x.h } : Object.assign({}, x));
  function compile(W, id) {
    if (W.op.kind === 'compound') return F.cqbCompile(W, id);
    const legs = W.op.plan.els[id], u = W.units[id], steps = [], call = u.call; let exfilAt = -1;
    const say = (text, extra) => steps.push(Object.assign({ k: 'say', text }, extra || {}));
    steps.push({ k: 'wait', until: W.op.plan.sp - (u.kind === 'mounted' ? 600 : 900) }, { k: 'prep', dur: u.kind === 'mounted' ? 600 : 900 });
    legs.forEach(L => {
      if (L.exfil && exfilAt < 0) { exfilAt = steps.length; steps.push({ k: 'phase', exfil: true }); }
      const walk = () => (L.pts || []).forEach(p => { const q = F.opPt(W, p); steps.push({ k: 'walk', to: { x: q.x, y: q.y }, spd: PACE[L.pace || 'patrol'], pace: L.pace || 'patrol' }); });
      switch (L.k) {
        case 'load': steps.push({ k: 'mount' }, { k: 'load', riders: L.riders }); break;
        case 'drive': { const to = L.to === 'hide' ? W.op.plan.hide : L.to; if (to === 'fob') steps.push({ k: 'drive', to, spd: 7 }, { k: 'dismount' }, { k: 'casualties' }, { k: 'refuel' }, { k: 'rearm' }, { k: 'end' }); else steps.push({ k: 'drive', to, spd: 7 }); say(`${call} at ${W.map.nodes[to].name}.`, { phase: 'at ' + W.map.nodes[to].name }); break; }
        case 'hide': steps.push({ k: 'hide', riders: L.riders }); break;
        case 'ride': { const off = L.off === 'hide' ? W.op.plan.hide : L.off; steps.push({ k: 'ride', carrier: L.carrier, off }); if (off === 'fob') steps.push({ k: 'casualties' }, { k: 'rearm' }, { k: 'end' }); break; }
        case 'move': walk(); say(`${call} at ${L.name}.`, { phase: 'at ' + L.name, rally: !!L.rally }); break;
        case 'await': steps.push({ k: 'await', until: resolveConds(W, L.until), name: L.name }); break;
        case 'sbf': walk(); say(`${call} set in ${L.name} position, observing ${W.op.obj.name}.`, { phase: L.name + ' set' }); steps.push({ k: 'sbf', open: resolveConds(W, L.open), until: resolveConds(W, L.until) }); say(`${call} fires lifted.`, { phase: 'fires lifted' }); break;
        case 'block': walk(); say(`${call} set in ${L.name}.`, { phase: L.name + ' set' }); steps.push({ k: 'block', until: resolveConds(W, L.until) }); break;
        case 'assault': steps.push({ k: 'assault', obj: { x: W.op.obj.x, y: W.op.obj.y } }, { k: 'sse', dur: 900 }); break;
      }
    });
    u.exfilAt = exfilAt; return steps;
  }
  F.opCompile = compile;

  /* ---------- launching and the go codes ---------- */
  F.opCmd = {
    launch: W => {
      const O = W.op; if (O.status !== 'planning') return { ok: false, err: 'The operation is already under way.' };
      if (O.kind === 'compound') { const e = F.cqbCheck(W); if (e) return { ok: false, err: e }; }
      if (O.plan.sp < W.t + 600) return { ok: false, err: 'The start point time is too close: the force needs at least ten minutes to get ready.' };
      if (O.kind !== 'compound' && O.h < O.plan.sp + 1800) return { ok: false, err: 'H-hour must be at least thirty minutes after the start point time.' };
      for (const id in O.plan.els) { const u = W.units[id]; F.setPlan(W, u, compile(W, id), 'preparing for ' + O.name); u.codes = {}; }
      O.status = 'running'; O.tLaunch = W.t;
      F.trace(W, 'CDR', `Approved the plan for ${O.name}`, O.kind === 'compound' ? `Wheels up ${F.clock(O.plan.sp)}, ${F.INSERTS[O.plan.insert].name.toLowerCase()}` : `Start point ${F.clock(O.plan.sp)}, H-hour ${F.clock(O.h)}, vehicles to ${W.map.nodes[O.plan.hide].name}`);
      F.ev(W, 'op-launch', `${O.name} approved. Start point ${F.clock(O.plan.sp)}, H-hour ${F.clock(O.h)}.`); return { ok: true };
    },
    code: (W, code) => {
      const O = W.op; if (O.status !== 'running') return { ok: false, err: 'The operation is not running.' };
      if (!F.CODES.includes(code)) return { ok: false, err: 'Unknown code word.' };
      O.called[code] = O.called[code] || W.t; const c = F.trace(W, 'CDR', `Called ${code}`, 'Commander\'s decision', null);
      for (const id in O.plan.els) F.send(W, 'HQ', id, 'ORDER-CODE', 'F', code + '.', { code }, c);
      return { ok: true };
    },
    abort: W => {
      const O = W.op; if (O.status !== 'running') return { ok: false, err: 'The operation is not running.' };
      O.aborted = W.t; const c = F.trace(W, 'CDR', 'Ordered the operation aborted', 'Commander\'s decision');
      for (const id in O.plan.els) F.send(W, 'HQ', id, 'ORDER-ABORT', 'F', 'Abort, abort, abort. Exfiltrate now.', {}, c); return { ok: true };
    }
  };
  /* Plan editing, only while planning. Every change is to the plan, never to the world. */
  F.opEdit = {
    move: (W, id, li, pi, p) => { const L = W.op.plan.els[id][li]; if (W.op.status !== 'planning' || !L || !L.pts || !L.pts[pi] || L.pts[pi].node) return false; L.pts[pi] = { x: Math.round(p.x), y: Math.round(p.y) }; return true; },
    add: (W, id, li, pi) => { const L = W.op.plan.els[id][li]; if (W.op.status !== 'planning' || !L || !L.pts) return false; const b = F.opPt(W, L.pts[pi]), a = pi > 0 ? F.opPt(W, L.pts[pi - 1]) : prevEnd(W, id, li) || b; L.pts.splice(pi, 0, { x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) }); return true; },
    remove: (W, id, li, pi) => { const L = W.op.plan.els[id][li]; if (W.op.status !== 'planning' || !L || !L.pts || L.pts.length < 2 || L.pts[pi].node) return false; L.pts.splice(pi, 1); return true; },
    pace: (W, id, li, v) => { const L = W.op.plan.els[id][li]; if (W.op.status !== 'planning' || !L || !PACE[v]) return false; L.pace = v; return true; },
    clock: (W, id, li, field, on) => { const L = W.op.plan.els[id][li]; if (W.op.status !== 'planning' || !L || !L[field]) return false; const hc = L[field].find(c => c.h != null); if (on && !hc) L[field].push({ h: L.hOff != null ? L.hOff : 0 }); if (!on && hc) { L.hOff = hc.h; L[field] = L[field].filter(c => c.h == null); } return true; },
    hide: (W, node) => { if (W.op.status !== 'planning' || !['vdo', 'bend'].includes(node)) return false; W.op.plan.hide = node; return true; },
    times: (W, sp, h) => { if (W.op.status !== 'planning') return false; if (sp != null) W.op.plan.sp = sp; if (h != null) W.op.h = h; return true; }
  };
  function prevEnd(W, id, li) { const legs = W.op.plan.els[id]; for (let i = li - 1; i >= 0; i--) { const e = F.opLegEnd(W, legs[i]); if (e) return e; if (legs[i].k === 'ride') return W.map.nodes[legs[i].off === 'hide' ? W.op.plan.hide : legs[i].off]; } return W.map.nodes.fob; }
  F.opPrevEnd = prevEnd;
  /* Estimated time for each element to walk its legs, for the planning table. */
  F.opEstimate = (W, id) => {
    const legs = W.op.plan.els[id], out = []; let at = null;
    legs.forEach((L, li) => { let d = 0; if (L.pts) { let a = prevEnd(W, id, li); for (const p of L.pts) { const q = F.opPt(W, p); d += F.dist(a, q); a = q; } } const s = L.pts ? d / (PACE[L.pace || 'patrol'] * 0.85) : L.k === 'drive' ? F.routeLen(W, 'fob', F.route(W, 'fob', W.op.plan.hide) || []) / 5.6 : 0; out.push({ li, dist: Math.round(d), secs: Math.round(s) }); });
    return out;
  };

  /* ---------- carrying out the plan ---------- */
  const okN = (W, u) => F.unitOk(W, u).length;
  function met(W, u, conds, s) {
    for (const c of conds || []) {
      if (c.code && u.codes[c.code]) return 'code ' + c.code;
      if (c.t != null && W.t >= c.t) return 'time ' + F.clock(c.t);
      if (c.compromise && (u.con || (u.heard && u.heard >= s.t0))) return 'compromised';
      if (c.peer && u.net[c.peer + ':' + c.phase]) return `${W.units[c.peer].call} reporting ${c.phase}`;
      if (c.all && c.all.every(id => !okN(W, W.units[id]) || u.net[id + ':' + c.phase])) return 'every team reporting ' + c.phase;
    }
    return null;
  }
  function aboard(W, carrier, riders) { return riders.every(r => { const x = W.units[r]; return x.riding === carrier.id || !okN(W, x); }); }
  function capture(W, u) { // a target who is cornered, wounded or alone gives up
    for (const sid in W.soldiers) {
      const h = W.soldiers[sid]; if (!h.hvt || (h.state !== 'ok' && h.state !== 'wia')) continue;
      if (!u.members.some(id => { const s = W.soldiers[id]; return s.state === 'ok' && F.dist(s.pos, h.pos) < 25; })) continue;
      const R = W.units[h.unit], alone = !R.members.some(id => id !== sid && W.soldiers[id].state === 'ok' && F.dist(W.soldiers[id].pos, h.pos) < 40);
      if (h.state === 'wia' || ((alone || h.supp > 0.4) && F.ch(W, 0.08))) {
        h.state = 'det'; h.captor = u.id; h.moving = false; u.det.push(sid);
        const e = F.ev(W, 'capture', `${u.name} detained the target ${F.grid(h.pos)}${h.downAt ? ' (wounded)' : ''}`, { soldier: sid }, u.con ? u.con.ev : null); W.op.capEv = e;
        say(W, u, 'F', `JACKPOT. ${u.call} has detained the target.`, { phase: 'target detained', hvt: 'captured' });
      }
    }
  }
  /* Once the shooting stops, a position checks the bodies and the wounded in front of it. */
  function sweep(W, u, s, last) {
    if (u.con) { s.quiet = W.t; return; } if (!last && W.t - (s.quiet || s.t0) < 60) return;
    for (const sid in W.soldiers) {
      const h = W.soldiers[sid]; if (!h.hvt || F.dist(h.pos, u.pos) > 250 || F.fresh(W, u, 90).some(t => F.dist(t, h.pos) < 120)) continue;
      if (h.state === 'wia') { h.state = 'det'; h.captor = u.id; u.det.push(sid); F.ev(W, 'capture', `${u.name} found the target wounded ${F.grid(h.pos)} and detained him`, { soldier: sid }); say(W, u, 'F', `JACKPOT. ${u.call} has detained the target, wounded, at the ${s.k === 'block' ? 'blocking position' : 'support position'}.`, { phase: 'target detained', hvt: 'captured' }); }
      else if (h.state === 'kia' && !W.op.idKill) { W.op.idKill = W.t; F.ev(W, 'identify', `${u.name} identified the target among the dead ${F.grid(h.pos)}`, { soldier: sid }); say(W, u, 'F', `JACKPOT. Target killed ${F.grid(h.pos)}, identity confirmed by ${u.call}.`, { phase: 'target killed', hvt: 'killed' }); }
    }
  }
  function sseFind(W, u) {
    if (u.det.some(id => W.soldiers[id].hvt)) return { hvt: 'captured', text: `JACKPOT. ${u.call} has the target in custody.` };
    for (const sid in W.soldiers) { const h = W.soldiers[sid]; if (h.hvt && h.state === 'kia' && F.dist(h.pos, u.pos) < 120 && (W.op.idKill = W.op.idKill || W.t)) return { hvt: 'killed', text: `JACKPOT. Target killed on the objective, identity confirmed.` }; }
    return { hvt: 'absent', text: `${u.call} objective searched. Target is not on the objective.` };
  }
  /* A report goes to the command post, and every element close enough on the same net hears it at once. */
  function say(W, u, prio, text, extra) {
    u.phase = extra.phase; F.report(W, u, 'CHECKIN', prio, text, extra);
    for (const id in W.op.plan.els) { const p = W.units[id]; if (p === u || !okN(W, p)) continue; if (F.dist(p.pos, u.pos) <= 5000 && !F.blocked(W, p.pos, u.pos, true)) p.net[u.id + ':' + extra.phase] = W.t; }
  }
  F.opStep = (W, u, s, el, next) => {
    switch (s.k) {
      case 'say': { if (s.rally) u.rally = { x: u.pos.x, y: u.pos.y }; say(W, u, 'P', s.text, { phase: s.phase }); next(); break; }
      case 'phase': u.exfiling = true; u.fire = 'hold'; u.cease = false; u.engR = null; next(); break;
      case 'fire': u.fire = s.mode; next(); break;
      case 'await': { const why = met(W, u, s.until, s); u.phase = 'waiting: ' + s.name; if (why) { F.trace(W, u.call, `${s.name[0].toUpperCase() + s.name.slice(1)}`, `On ${why}`); u.lastWhy = why; u.phase = `${s.name} (on ${why})`; next(); } break; }
      case 'load': if (aboard(W, u, s.riders)) next(); break;
      case 'hide': if (!s.empty) { if (s.riders.every(r => W.units[r].riding !== u.id)) s.empty = 1; } else if (aboard(W, u, s.riders)) next(); u.phase = 'in the vehicle hide'; break;
      case 'ride': {
        const c = W.units[s.carrier]; if (!c) { next(); break; }
        if (u.riding !== c.id) { // board
          if (s.done) { if (el > 20) next(); break; }
          const v = c.vehicles.length ? W.vehicles[c.vehicles[0]] : null;
          if (v && !c.moving && F.dist(u.pos, v.pos) < 150) { s.board = (s.board || 0) + 1; if (s.board >= 30) { u.riding = c.id; u.dis = false; u.mv = null; u.phase = 'mounted'; } }
          else if (v && !u.mv && F.dist(u.pos, v.pos) >= 150 && F.dist(u.pos, v.pos) < 800) F.walk(W, u, v.pos, 1.3); // the vehicles are in sight: go to them
          break;
        }
        if (c.node === s.off && !c.mv && (!c.plan || !c.plan[c.pi] || c.plan[c.pi].k !== 'drive')) { u.riding = null; u.dis = true; const v = W.vehicles[c.vehicles[0]]; u.pos = { x: v.pos.x + 8, y: v.pos.y + 8 }; u.members.forEach(id => { W.soldiers[id].inVeh = false; }); s.done = 1; s.t0 = W.t; u.phase = 'dismounted'; }
        break;
      }
      case 'sbf': {
        if (!s.set) { s.set = 1; u.holdPos = true; u.fire = 'hold'; u.observing = true; u.engR = 700; }
        if (!s.firing && met(W, u, s.open, s)) { s.firing = 1; u.fire = 'free'; u.cease = false; F.trace(W, u.call, 'Opened fire on the objective', 'On ' + met(W, u, s.open, s)); }
        u.phase = s.firing ? 'support by fire: firing' : 'support by fire: set'; if (s.firing) sweep(W, u, s);
        if (met(W, u, s.until, s)) { u.fire = 'hold'; u.cease = true; u.holdPos = false; u.observing = false; u.engR = null; next(); }
        break;
      }
      case 'block': if (!s.set) { s.set = 1; u.holdPos = true; u.fire = 'free'; u.engR = 400; u.observing = true; } u.phase = 'blocking'; sweep(W, u, s); if (met(W, u, s.until, s)) { sweep(W, u, s, true); u.holdPos = false; u.observing = false; u.engR = null; u.fire = 'hold'; next(); } break;
      case 'assault': {
        /* Silent until compromised: the assault creeps in under fire control, and only fights its way forward once found. */
        if (!s.loud && (u.con || u.members.some(id => W.t - W.soldiers[id].hitAt < 8))) { s.loud = 1; s.go = 0; F.trace(W, u.call, 'Assault compromised: fighting through', 'In contact short of the objective'); }
        if (!s.go) { s.go = 1; u.assaulting = true; u.fire = s.loud ? 'free' : 'hold'; u.engR = 450; u.pace = s.loud ? null : 'stealth'; u.cease = false; F.walk(W, u, s.obj, s.loud ? 1.6 : PACE.stealth); if (!s.said) { s.said = 1; say(W, u, 'F', `${u.call} moving onto ${W.op.obj.name}.`, { phase: 'assaulting' }); } }
        u.phase = 'assaulting'; capture(W, u);
        if (!u.mv) { const near = F.fresh(W, u, 60).filter(t => F.dist(t, u.pos) < 160).length; if (near || u.con) s.quiet = W.t; else if (!s.quiet) s.quiet = W.t; if (W.t - s.quiet >= 60) { u.assaulting = false; say(W, u, 'F', `${u.call} ${W.op.obj.name} secure. ${F.selfRep(W, u).cas} casualties. Beginning search.`, { phase: 'objective secure', secure: true }); next(); } }
        break;
      }
      case 'sse': u.phase = 'searching the objective'; capture(W, u); if (el >= s.dur) { const f = sseFind(W, u); say(W, u, 'F', f.text, { phase: 'search complete', hvt: f.hvt }); u.fire = 'hold'; next(); } break;
      default: if (!(F.cqbStep && F.cqbStep(W, u, s, el, next))) next();
    }
  };
  F.opRecv = (W, u, m) => {
    if (m.type === 'ORDER-CODE') { if (!u.codes[m.data.code]) u.codes[m.data.code] = W.t; }
    else if (m.type === 'ORDER-ABORT') { u.codes.ABORT = W.t; if (u.riding || u.kind === 'mounted' || u.kind === 'air') return; if (u.con) u.ord = 'BREAK'; else if (!u.exfiling) F.opFallback(W, u, 'aborted by the command post'); }
  };
  /* Break contact, or abort: fall back to the rally point, then carry on with the exfiltration legs. */
  F.opFallback = (W, u, why) => {
    u.assaulting = false; u.holdPos = false; u.fire = 'hold'; u.cease = false; u.engR = null; u.observing = false;
    if (u.kind === 'mounted' || u.kind === 'air') return;
    u.spots = null; u.cqb = false;
    const all = compile(W, u.id), rest = u.exfilAt >= 0 ? all.slice(u.exfilAt) : [];
    const fall = (u.rally && F.dist(u.rally, u.pos) > 100 ? [{ k: 'walk', to: { x: u.rally.x, y: u.rally.y }, spd: 1.7, pace: 'rush' }] : []).concat(rest);
    F.setPlan(W, u, fall, 'falling back: ' + why); u.exfiling = true; u.phase = 'falling back';
    F.trace(W, u.call, 'Falling back to the rally point and exfiltrating', why);
  };
  F.opOnReport = (W, m, u) => {
    const E = W.hq.el[u.id] = W.hq.el[u.id] || {}; if (m.data.phase) { E.phase = m.data.phase; E.t = m.t0; }
    if (m.data.hvt && !(m.data.hvt === 'absent' && W.hq.hvt && W.hq.hvt.state !== 'absent')) W.hq.hvt = { state: m.data.hvt, t: m.t0, from: u.call }; // a later "not on the objective" does not undo a report of him taken elsewhere
    if (m.data.secure) W.hq.secure = { t: m.t0, from: u.call };
    if (m.type === 'CONTACT') E.contact = m.t0; if (m.type === 'LACE') E.contact = null;
  };

  /* ---------- once a second: hearing, end of the operation ---------- */
  F.stepOp = W => {
    const O = W.op; if (!O || O.status !== 'running') return;
    for (const id in O.plan.els) { const u = W.units[id]; if (W.noise && W.noise.some(n => n.u !== u.id && W.t - n.t < 6 && F.dist(n, u.pos) < 1500)) u.heard = W.t; }
    if (W.t % 30) return;
    const home = Object.keys(O.plan.els).every(id => { const u = W.units[id]; return !u.plan && (u.done || !okN(W, u)); });
    if (home || W.t > O.h + 8 * H) { O.status = 'complete'; O.tEnd = W.t; O.outcome = O.kind === 'compound' ? F.cqbOutcome(W) : F.opOutcome(W); F.ev(W, 'op-end', `${O.name} complete: ${O.outcome.summary}`); }
  };
  /* Ground truth, for the after-action review. */
  F.opOutcome = W => {
    const O = W.op, h = Object.values(W.soldiers).find(s => s.hvt), dObj = F.dist(h.pos, O.obj);
    const hvt = h.state === 'det' ? (W.units[h.captor] && F.atFob(W, h.pos) ? 'captured and brought back' : 'captured') : h.state === 'kia' ? 'killed' : h.state === 'wia' ? 'wounded, left behind' : dObj > 900 ? 'escaped' : 'alive in Sarak';
    const blue = { kia: 0, wia: 0 }, red = { kia: 0, wia: 0, ok: 0 }; for (const id in W.soldiers) { const s = W.soldiers[id]; const b = s.side === 'blue' ? blue : red; if (s.state === 'kia') b.kia++; else if (s.state === 'wia') b.wia++; else if (s.side === 'red' && s.state === 'ok') red.ok++; }
    const success = h.state === 'det' || h.state === 'kia', firstContact = W.events.find(e => e.type === 'contact' || e.type === 'ambush'), alert = W.events.find(e => e.type === 'enemy-alert');
    return { hvt, success, blue, red, believed: W.hq.hvt ? W.hq.hvt.state : 'unknown', firstContact: firstContact ? firstContact.t : null, alerted: alert ? { t: alert.t, text: alert.text } : null,
      summary: `${success ? 'target ' + hvt : 'target ' + hvt}; friendly ${blue.kia} killed, ${blue.wia} wounded; enemy ${red.kia} killed, ${red.wia} wounded` };
  };
})();
