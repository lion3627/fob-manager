'use strict';
/* Compound raid. The simulation drops to room scale: walls, doors and two floors block sight and fire,
   occupants are asleep and must wake and reach for their weapons, and most of the people inside are
   noncombatants. The plan starts empty and is built one decision at a time: how the force gets in,
   which openings each team takes and how they breach them, which rooms each team clears, where the
   perimeter sits, and how the breaches are timed. Nothing here decides an outcome; it sets up the
   ground and the people, and the teams carry out the plan as they understand it. */
(function () {
  const F = globalThis.FOB;
  const H = 3600;
  F.TYPES.CHG = { name: 'Breaching charge', unit: 'charges', kg: 1.5, cls: 'V' };
  F.WEAPONS.NONE = { ammo: 'NONE', rof: 0, range: 0, acc: 0, load: 0 };
  F.TYPES.NONE = { name: 'None', unit: '', kg: 0, cls: '' };

  /* ---------- the ground: local metres around the compound centre, +y is north ---------- */
  const C = { x: 8000, y: 4000 };
  const OUTER = [-30, -25, 30, 25], GUEST = [-26, -17, -14, -5], HOUSE = [2, -18, 24, 0];
  const DOORS = { // a and b are the areas either side; kind decides how it can be breached
    gate: { name: 'Main gate', kind: 'gate', locked: true, ax: 'y', at: -25, from: -20, to: -16, f: 0 },
    side: { name: 'North door', kind: 'door', locked: true, ax: 'y', at: 25, from: 9, to: 11, f: 0 },
    brE: { name: 'East wall', kind: 'wall', locked: true, ax: 'x', at: 30, from: 8, to: 12, f: 0 },
    brW: { name: 'North-west wall', kind: 'wall', locked: true, ax: 'y', at: 25, from: -22, to: -18, f: 0 },
    inner: { name: 'Yard door', kind: 'door', locked: false, ax: 'x', at: -8, from: 4, to: 6, f: 0 },
    dG: { name: 'Guesthouse door', kind: 'door', locked: true, ax: 'y', at: -5, from: -21, to: -19, f: 0 },
    dF: { name: 'House front door', kind: 'door', locked: true, ax: 'y', at: 0, from: 7, to: 9, f: 0 },
    dK: { name: 'House kitchen door', kind: 'door', locked: true, ax: 'x', at: 24, from: -8, to: -6, f: 0 },
    dI0: { name: 'Inner door, ground floor', kind: 'door', locked: false, ax: 'x', at: 13, from: -10, to: -8, f: 0 },
    dI1: { name: 'Inner door, upper floor', kind: 'door', locked: true, ax: 'x', at: 13, from: -10, to: -8, f: 1 }
  };
  const STAIRS = { x: 20, y: -14 };
  const ROOMS = {
    guest: { name: 'Guesthouse', f: 0, r: GUEST },
    h0w: { name: 'House, ground floor west', f: 0, r: [2, -18, 13, 0] },
    h0e: { name: 'House, ground floor east', f: 0, r: [13, -18, 24, 0] },
    h1e: { name: 'House, upper floor east', f: 1, r: [13, -18, 24, 0] },
    h1w: { name: 'House, upper floor west', f: 1, r: [2, -18, 13, 0] }
  };
  F.CQB = { C, OUTER, GUEST, HOUSE, DOORS, ROOMS, STAIRS };
  const inR = (p, r, m) => p.x > r[0] - (m || 0) && p.x < r[2] + (m || 0) && p.y > r[1] - (m || 0) && p.y < r[3] + (m || 0);
  const loc = p => ({ x: p.x - C.x, y: p.y - C.y });
  const abs = (x, y, f) => { const p = { x: C.x + x, y: C.y + y }; if (f) p.f = f; return p; };
  /* Which area a point is in, by floor. */
  function areaAt(p, f) {
    const q = loc(p);
    if (!inR(q, OUTER)) return 'out';
    if (f === 1) return q.x < 13 ? 'h1w' : 'h1e';
    if (inR(q, HOUSE)) return q.x < 13 ? 'h0w' : 'h0e';
    if (inR(q, GUEST)) return 'guest';
    return q.x < -8 ? 'wyard' : 'eyard';
  }
  F.cqbArea = areaAt;
  /* Walls as segments, with each doorway a segment of its own that stops blocking once open. */
  function walls() {
    const segs = [];
    const edge = (ax, at, a, b, f, gaps) => {
      let cur = a; const put = (u, v, ff, door) => { if (v - u < 1e-6) return; segs.push(ax === 'y' ? { x1: C.x + u, y1: C.y + at, x2: C.x + v, y2: C.y + at, f: ff, door } : { x1: C.x + at, y1: C.y + u, x2: C.x + at, y2: C.y + v, f: ff, door }); };
      for (const g of gaps.sort((p, q) => p.from - q.from)) { put(cur, g.from, f); put(g.from, g.to, [g.f], g.id); const rest = f.filter(x => x !== g.f); if (rest.length) put(g.from, g.to, rest); cur = g.to; }
      put(cur, b, f);
    };
    const gapsOn = (ax, at, lo, hi) => Object.keys(DOORS).filter(id => { const d = DOORS[id]; return d.ax === ax && d.at === at && d.from >= lo && d.to <= hi; }).map(id => Object.assign({ id }, DOORS[id]));
    const rect = (r, f, inner) => { edge('y', r[1], r[0], r[2], f, gapsOn('y', r[1], r[0], r[2])); edge('y', r[3], r[0], r[2], f, gapsOn('y', r[3], r[0], r[2])); edge('x', r[0], r[1], r[3], f, gapsOn('x', r[0], r[1], r[3])); edge('x', r[2], r[1], r[3], f, gapsOn('x', r[2], r[1], r[3])); };
    rect(OUTER, [0]); rect(GUEST, [0]); rect(HOUSE, [0, 1]);
    edge('x', -8, -25, 25, [0], gapsOn('x', -8, -25, 25)); edge('x', 13, -18, 0, [0, 1], gapsOn('x', 13, -18, 0));
    return segs;
  }
  function doors() {
    const out = {};
    for (const id in DOORS) {
      const d = DOORS[id], m = (d.from + d.to) / 2, mid = d.ax === 'y' ? { x: m, y: d.at } : { x: d.at, y: m };
      const n = d.ax === 'y' ? { x: 0, y: 1.6 } : { x: 1.6, y: 0 }, p1 = abs(mid.x + n.x, mid.y + n.y), p2 = abs(mid.x - n.x, mid.y - n.y);
      const a1 = areaAt(p1, d.f), a2 = areaAt(p2, d.f);
      out[id] = { id, name: d.name, kind: d.kind, locked: d.locked, open: false, f: d.f, x: C.x + mid.x, y: C.y + mid.y, w: d.to - d.from, ax: d.ax, sides: { [a1]: { x: p1.x, y: p1.y }, [a2]: { x: p2.x, y: p2.y } }, a: a1, b: a2 };
    }
    return out;
  }
  /* The connections between areas: doorways, plus the stairs. */
  function links(W) {
    const L = [];
    for (const id in W.map.doors) { const d = W.map.doors[id]; L.push({ door: id, a: d.a, b: d.b, pa: d.sides[d.a], pb: d.sides[d.b], fa: d.f, fb: d.f }); }
    const s = abs(STAIRS.x, STAIRS.y); L.push({ door: null, stairs: true, a: 'h0e', b: 'h1e', pa: s, pb: s, fa: 0, fb: 1 });
    return L;
  }
  /* Walking inside one area: around the buildings in it, by their corners. */
  function obstacles(area) { return area === 'out' ? [OUTER] : area === 'wyard' ? [GUEST] : area === 'eyard' ? [HOUSE] : []; }
  function hitsRect(a, b, r) { // does segment a-b (local) pass through rectangle r?
    const m = 0.6, x0 = r[0] - m, y0 = r[1] - m, x1 = r[2] + m, y1 = r[3] + m;
    if (inR(a, [x0, y0, x1, y1]) || inR(b, [x0, y0, x1, y1])) return false; // a point on the face (a doorway) is reached from outside
    const e = [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]];
    return e.some(s => F.segX(a.x, a.y, b.x, b.y, s[0], s[1], s[2], s[3]));
  }
  function areaPath(area, p, q) {
    const obs = obstacles(area), a = loc(p), b = loc(q); if (!obs.some(r => hitsRect(a, b, r))) return [q];
    const pts = [a, b]; obs.forEach(r => { const k = 2.2; pts.push({ x: r[0] - k, y: r[1] - k }, { x: r[2] + k, y: r[1] - k }, { x: r[2] + k, y: r[3] + k }, { x: r[0] - k, y: r[3] + k }); });
    if (area === 'out') { /* stay clear of the wall by a few metres more */ }
    const n = pts.length, dist = Array(n).fill(1e9), prev = Array(n).fill(-1), done = Array(n).fill(false); dist[0] = 0;
    for (;;) { let u = -1; for (let i = 0; i < n; i++) if (!done[i] && dist[i] < 1e9 && (u < 0 || dist[i] < dist[u])) u = i; if (u < 0 || u === 1) break; done[u] = true;
      for (let v = 0; v < n; v++) { if (done[v] || obs.some(r => hitsRect(pts[u], pts[v], r))) continue; const d = dist[u] + Math.hypot(pts[u].x - pts[v].x, pts[u].y - pts[v].y); if (d < dist[v]) { dist[v] = d; prev[v] = u; } } }
    if (prev[1] < 0) return [q]; const out = []; for (let i = 1; i !== 0; i = prev[i]) out.unshift(i === 1 ? q : abs(pts[i].x, pts[i].y)); return out;
  }
  F.cqbAreaPath = areaPath;
  /* Area to area through the doorways, shortest by walking distance, closed doors cost a little more. */
  function route(W, fromA, fromP, toA, toP, avoid) {
    const L = links(W), best = {}, prev = {}; best[fromA] = 0; const done = {}; const pos = { [fromA]: fromP };
    for (;;) { let u = null; for (const k in best) if (!done[k] && (u == null || best[k] < best[u])) u = k; if (u == null || u === toA) break; done[u] = 1;
      for (const l of L) { let from, to, pf, pt; if (l.a === u) { from = l.pa; to = l.b; pt = l.pb; } else if (l.b === u) { from = l.pb; to = l.a; pt = l.pa; } else continue; if (avoid && avoid.includes(l.door)) continue; if (l.door && W.map.doors[l.door].kind === 'wall' && !W.map.doors[l.door].open) continue;
        const d = best[u] + F.dist(pos[u], from) + (l.door && !W.map.doors[l.door].open ? 25 : 0); if (best[to] == null || d < best[to]) { best[to] = d; prev[to] = { l, from: u }; pos[to] = pt; } } }
    if (best[toA] == null) return null; const out = []; for (let a = toA; a !== fromA; a = prev[a].from) out.unshift({ l: prev[a].l, from: prev[a].from, to: a }); return out;
  }
  F.cqbRoute = route;

  /* ---------- the scenario ---------- */
  F.cqbMap = () => ({
    w: 10000, h: 8000,
    nodes: {
      fob: { x: 1500, y: 4000, name: 'FOB Kestrel', kind: 'fob' },
      lzY: { x: C.x + 16, y: C.y + 12, name: 'LZ Courtyard', kind: 'lz' },
      lzO: { x: C.x + 4, y: C.y + 70, name: 'LZ North field', kind: 'lz' },
      lzF: { x: C.x - 1600, y: C.y + 250, name: 'LZ Offset', kind: 'lz' },
      hold: { x: C.x - 3200, y: C.y + 2200, name: 'Holding area', kind: 'lz' },
      town: { x: C.x + 650, y: C.y - 750, name: 'Bazgir', kind: 'village' }
    },
    edges: [],
    blockers: [],
    cover: [{ x: C.x + 650, y: C.y - 750, r: 420, c: 0.5, kind: 'village', name: 'Bazgir' }, { x: C.x - 900, y: C.y + 700, r: 380, c: 0.45, kind: 'scrub', name: 'Orchards' }, { x: C.x - 300, y: C.y - 500, r: 260, c: 0.45, kind: 'scrub' }],
    walls: walls(), doors: doors(), cqb: true
  });
  F.INSERTS = {
    yard: { name: 'Land in the courtyard', node: 'lzY', area: 'eyard', note: 'Fastest. The teams are inside the wall the moment the wheels touch, but everyone in the compound hears the aircraft land, and a heavy aircraft settling in a walled yard can land hard.' },
    out: { name: 'Land outside the wall', node: 'lzO', area: 'out', note: 'The aircraft are heard on approach, so the occupants have perhaps a minute or two. The teams have to breach the outer wall or a gate to get in.' },
    off: { name: 'Offset landing, walk in', node: 'lzF', area: 'out', note: 'Land 1.6 km away, out of earshot, and walk in. The compound stays asleep until the first breach, but the walk takes most of an hour and the aircraft are far away when you want them back.' }
  };
  F.CORDON = { n: { name: 'North field', x: 0, y: 48 }, s: { name: 'South track, facing the town', x: -10, y: -45 }, e: { name: 'East side, facing the town', x: 50, y: -8 }, w: { name: 'West side', x: -52, y: 0 } };
  F.SCENARIOS.lantern = {
    kind: 'compound', name: 'Raid on Objective Lantern', scale: 'Special operations, 3 assault teams, perimeter and 2 helicopters',
    brief: 'A senior organiser of the network is believed to live on the upper floor of the main house in a walled compound 650 m north-west of Bazgir. Kill or capture him and bring the force back. Imagery shows the layout; a source says several families live there and two or three men in the compound carry weapons. Nobody has seen inside.',
    intel: ['Walled compound, about 60 by 50 m. Outer gate on the south side, a smaller door on the north side.', 'Main house of two floors in the south-east corner; a one-storey guesthouse in the west yard.', 'Target: adult male, believed to sleep on the upper floor of the main house.', 'Two or three armed men, probably a courier in the guesthouse and family members in the house.', 'About ten women and children. Positive identification before engaging is required.'],
    start: 23 * H, obj: { x: C.x + 13, y: C.y - 9, name: 'OBJ LANTERN' }
  };

  /* Occupants. The seed varies who sleeps where and who is awake; the structure is what the source described. */
  function people(W) {
    const civs = W.civ = [];
    const room = (rid, k, n) => { const r = ROOMS[rid].r; return abs(r[0] + 1.6 + (k % 3) * ((r[2] - r[0] - 3.2) / 2), r[1] + 2 + Math.floor(k / 3) * 3.4 + (n > 3 ? 0 : 4), ROOMS[rid].f); };
    const red = (id, name, rid, roles, o) => {
      const r = ROOMS[rid].r, u = F.mkUnit(W, Object.assign({ id, name, call: name, side: 'red', kind: 'cell', pos: abs((r[0] + r[2]) / 2, (r[1] + r[3]) / 2), home: null, base: null, alt: null, post: true, role: 'guard', st: 'post', n0: roles.length, asleep: true, room: rid, f: ROOMS[rid].f }, o || {}));
      roles.forEach((ro, k) => { const s = F.mkSoldier(W, u, ro[0], ro[1], room(rid, k + 3, 6)); s.pos.f = ROOMS[rid].f; s.armed = false; if (ro[0] === 'HVT') s.hvt = true; });
      return u;
    };
    const civ = (id, rid, roles) => {
      const r = ROOMS[rid].r, u = F.mkUnit(W, { id, name: 'Family, ' + ROOMS[rid].name.toLowerCase(), call: 'Civilians', side: 'civ', kind: 'civ', pos: abs((r[0] + r[2]) / 2, (r[1] + r[3]) / 2), room: rid });
      roles.forEach((ro, k) => { const s = F.mkSoldier(W, u, ro, 'NONE', room(rid, k, 3)); s.pos.f = ROOMS[rid].f; s.armed = false; civs.push(s.id); });
    };
    const hvtRoom = F.ch(W, 0.8) ? 'h1e' : 'h1w', other = hvtRoom === 'h1e' ? 'h1w' : 'h1e';
    red('g1', 'Courier', 'guest', [['M', 'AK']]);
    red('g2', 'Courier\'s brother', 'h0w', [['M', 'AK']]);
    red('g3', 'Adult son', 'h0e', [['M', 'AK']]);
    red('h1', 'Target', hvtRoom, [['HVT', 'AK']]);
    civ('c1', 'guest', ['W', 'C'].concat(F.ch(W, 0.5) ? ['C'] : []));
    civ('c2', 'h0w', ['W', 'C', 'C']);
    civ('c3', 'h0e', ['W'].concat(F.ch(W, 0.5) ? ['C'] : []));
    civ('c4', hvtRoom, ['W']);
    civ('c5', other, ['C', 'C', 'C'].concat(F.ch(W, 0.5) ? ['W'] : []));
    const light = F.pick(W, ['g1', 'g2', 'g3', null, null, null]); // now and then one of them is still awake
    if (light) { const u = W.units[light]; u.asleep = false; u.members.forEach(id => { W.soldiers[id].armed = true; }); F.trace(W, u.name, 'Awake late', 'Not asleep when the operation began'); }
  }

  F.cqbSetup = (W, S) => {
    const fob = W.map.nodes.fob, tents = F.fobPos(W, 'tents');
    const force = [
      { id: 't1', name: 'Assault team 1', call: 'SPEAR 1', roles: [['TL', 'M4'], ['BR', 'M4'], ['R', 'M4'], ['R', 'M4'], ['R', 'M4'], ['MED', 'M4']] },
      { id: 't2', name: 'Assault team 2', call: 'SPEAR 2', roles: [['TL', 'M4'], ['BR', 'M4'], ['R', 'M4'], ['R', 'M4'], ['R', 'M4'], ['R', 'M4']] },
      { id: 't3', name: 'Assault team 3', call: 'SPEAR 3', roles: [['TL', 'M4'], ['BR', 'M4'], ['R', 'M4'], ['R', 'M4'], ['R', 'M4']] },
      { id: 'p1', name: 'Perimeter team', call: 'SPEAR 4', roles: [['TL', 'M4'], ['R', 'M4'], ['R', 'M4'], ['INT', 'M4']] }
    ];
    force.forEach((f, fi) => {
      const u = F.mkUnit(W, { id: f.id, name: f.name, call: f.call, side: 'blue', kind: 'element', pos: { x: tents.x + fi * 14 - 20, y: tents.y }, node: 'fob', task: 'preparing', opEl: true, tacsat: true, codes: {}, det: [], net: {}, fire: 'hold' });
      f.roles.forEach((r, k) => { const s = F.mkSoldier(W, u, r[0], r[1], { x: u.pos.x + (k % 3) * 3, y: u.pos.y + Math.floor(k / 3) * 3 }); if (r[0] === 'BR') { s.carry.CHG = 3; W.ledger.initial.CHG = (W.ledger.initial.CHG || 0) + 3; } });
    });
    const pad = { x: fob.x + 60, y: fob.y - 90 };
    const air = F.mkUnit(W, { id: 'air', name: 'Helicopter flight', call: 'RAVEN', side: 'blue', kind: 'air', pos: { x: pad.x, y: pad.y }, node: 'fob', task: 'preparing', opEl: true, codes: {}, det: [], net: {}, fire: 'hold', dis: false });
    ['PLT', 'CC', 'PLT', 'CC'].forEach((r, k) => F.mkSoldier(W, air, r, 'M4', { x: pad.x, y: pad.y }));
    for (let i = 0; i < 2; i++) { const v = F.mkVehicle(W, { id: 'air' + (i + 1), name: 'Chalk ' + (i + 1), type: 'UH-60', tankL: 1400, lPerKm: 2.2, pos: { x: pad.x + i * 30, y: pad.y }, at: 'fob' }); F.stock(W, W.stores[v.tank], 'JP8', 1250); v.unit = 'air'; v.air = true; air.vehicles.push(v.id); }
    air.crew = air.members.slice();
    people(W);
    W.op.kind = 'compound'; W.op.intel = S.intel; W.op.cleared = {}; W.op.obj = S.obj;
    W.op.plan = { insert: null, teams: { t1: { entry: null, how: null, rooms: [] }, t2: { entry: null, how: null, rooms: [] }, t3: { entry: null, how: null, rooms: [] } }, cordon: null, together: null, tot: 30, sp: W.t + 45 * 60, els: { t1: 1, t2: 1, t3: 1, p1: 1, air: 1 } };
    W.op.h = W.op.plan.sp + 600;
  };

  /* ---------- planning: the decisions, and what each one still needs ---------- */
  F.cqbNeeds = W => {
    const P = W.op.plan, out = [];
    if (!P.insert) out.push('insert');
    for (const id of ['t1', 't2', 't3']) { const T = P.teams[id]; if (T.reserve) continue; if (!T.entry && !(P.insert === 'yard' && T.rooms.length)) out.push('entry:' + id); else if (!T.rooms.length) out.push('rooms:' + id); }
    if (!P.cordon) out.push('cordon'); if (P.together == null) out.push('timing');
    return out;
  };
  /* Which areas a team's chosen opening leaves it in, and every room it will pass through on the way to its rooms. */
  function teamWalk(W, id) {
    const P = W.op.plan, T = P.teams[id], I = F.INSERTS[P.insert]; if (!I || T.reserve) return { rooms: [], ok: true };
    let area = I.area, pos = W.map.nodes[I.node]; const seq = [], legs = [];
    const go = (toA, toP, force) => {
      let r = null; if (force) { const d = W.map.doors[force]; for (const [x, y] of [[d.a, d.b], [d.b, d.a]]) { const r1 = x === area ? [] : route(W, area, pos, x, d.sides[x]); const r2 = y === toA ? [] : route(W, y, d.sides[y], toA, toP); if (r1 && r2) { const c = r1.concat([{ l: { door: force, a: x, b: y, pa: d.sides[x], pb: d.sides[y], fa: d.f, fb: d.f }, from: x, to: y }], r2); if (!r || c.length < r.length) r = c; } } }
      else r = route(W, area, pos, toA, toP); if (!r) return false;
      for (const c of r) { legs.push(c); if (ROOMS[c.to] && !seq.includes(c.to)) seq.push(c.to); area = c.to; pos = c.from === c.l.a ? c.l.pb : c.l.pa; }
      return true;
    };
    const targets = T.rooms.slice(); let ok = true;
    if (T.entry) { const d = W.map.doors[T.entry]; const first = targets[0]; if (first) ok = go(first, centre(first), T.entry); else ok = go(d.b === area ? d.a : d.b, d.sides[d.b === area ? d.a : d.b], T.entry); targets.shift(); }
    for (const r of targets) { if (!go(r, centre(r))) ok = false; if (!seq.includes(r)) seq.push(r); }
    return { rooms: seq, legs, ok };
  }
  const centre = rid => { const r = ROOMS[rid].r; return abs((r[0] + r[2]) / 2, (r[1] + r[3]) / 2); };
  F.cqbTeamWalk = teamWalk;
  F.cqbEdit = {
    insert: (W, k) => { if (W.op.status !== 'planning' || !F.INSERTS[k]) return false; W.op.plan.insert = k; for (const id in W.op.plan.teams) { const T = W.op.plan.teams[id]; if (k === 'yard' && T.entry && W.map.doors[T.entry].a === 'out') T.entry = null; } return true; },
    entry: (W, id, door) => { const T = W.op.plan.teams[id]; if (W.op.status !== 'planning' || !T || !W.map.doors[door]) return false; const d = W.map.doors[door]; if (d.f !== 0 || door === 'dI0') return false; if (W.op.plan.insert === 'yard' && d.a === 'out') return false; T.entry = door; T.reserve = false; T.how = d.kind === 'wall' ? 'explosive' : T.how || (d.locked ? 'explosive' : 'manual'); T.rooms = T.rooms.filter(r => r); return true; },
    how: (W, id, how) => { const T = W.op.plan.teams[id]; if (W.op.status !== 'planning' || !T || !['explosive', 'manual'].includes(how)) return false; if (how === 'manual' && T.entry && W.map.doors[T.entry].kind === 'wall') return false; T.how = how; return true; },
    room: (W, id, rid) => { const T = W.op.plan.teams[id]; if (W.op.status !== 'planning' || !T || !ROOMS[rid]) return false; const i = T.rooms.indexOf(rid); if (i >= 0) T.rooms.splice(i, 1); else T.rooms.push(rid); return true; },
    reserve: (W, id, on) => { const T = W.op.plan.teams[id]; if (W.op.status !== 'planning' || !T) return false; T.reserve = !!on; if (on) { T.entry = null; T.rooms = []; } return true; },
    cordon: (W, k) => { if (W.op.status !== 'planning' || !F.CORDON[k]) return false; W.op.plan.cordon = k; return true; },
    together: (W, on) => { if (W.op.status !== 'planning') return false; W.op.plan.together = !!on; return true; },
    tot: (W, m) => { if (W.op.status !== 'planning') return false; W.op.plan.tot = F.clamp(Math.round(m), 10, 90); return true; },
    sp: (W, t) => { if (W.op.status !== 'planning') return false; W.op.plan.sp = t; W.op.h = t + F.cqbFlight(W); return true; }
  };
  F.cqbFlight = W => { const I = F.INSERTS[W.op.plan.insert]; if (!I) return 600; const n = W.map.nodes[I.node]; return Math.round(F.dist(W.map.nodes.fob, n) / 50 + 60 + (W.op.plan.insert === 'off' ? 1600 / 0.9 : 0)); };

  /* ---------- compiling the plan into each element's steps ---------- */
  const SPD = { stealth: 0.6, walk: 1.2, rush: 1.8 };
  function crossSteps(W, steps, c, how, together) { // walk to the near side of a doorway, get it open, step through
    const l = c.l, nearP = c.from === l.a ? l.pa : l.pb, farP = c.from === l.a ? l.pb : l.pa, fa = c.from === l.a ? l.fa : l.fb, fb = c.from === l.a ? l.fb : l.fa;
    return { nearP, farP, fa, fb, door: l.door, stairs: !!l.stairs };
  }
  function walkTo(steps, area, from, to, f, pace) { for (const p of areaPath(area, from, to)) steps.push({ k: 'cwalk', to: { x: p.x, y: p.y }, f, area, spd: SPD[pace] || 1.2, pace }); }
  function pathSteps(W, steps, legs, start, pace, entry, how, together) {
    let pos = start;
    for (const c of legs) {
      const x = crossSteps(W, steps, c);
      walkTo(steps, c.from, pos, x.nearP, x.fa, c.from === 'out' ? pace : 'walk');
      if (x.door) steps.push({ k: 'breach', door: x.door, how: x.door === entry ? how : 'manual', together: x.door === entry && together, from: c.from });
      steps.push({ k: 'cwalk', to: { x: x.farP.x, y: x.farP.y }, f: x.fb, area: c.to, spd: 1.4, pace: 'walk', inside: c.to !== 'out' });
      if (ROOMS[c.to]) steps.push({ k: 'clear', room: c.to });
      pos = x.farP;
    }
    return pos;
  }
  F.cqbCompile = (W, id) => {
    const P = W.op.plan, u = W.units[id], I = F.INSERTS[P.insert], steps = [], call = u.call;
    const say = (text, phase, extra) => steps.push(Object.assign({ k: 'say', text, phase }, extra || {}));
    steps.push({ k: 'wait', until: P.sp - 600 }, { k: 'prep', dur: 300 });
    if (id === 'air') {
      const pick = P.insert === 'yard' ? 'lzY' : 'lzO', riders = ['t1', 't2', 't3', 'p1'];
      steps.push({ k: 'mount' }, { k: 'load', riders }, { k: 'say', text: `${call} wheels up, ${riders.length} teams aboard.`, phase: 'wheels up' }, { k: 'fly', to: I.node, spd: 50 }, { k: 'land', hard: P.insert === 'yard' }, { k: 'drop', riders },
        { k: 'say', text: `${call} teams inserted at ${W.map.nodes[I.node].name}. Moving to the holding area.`, phase: 'inserted' }, { k: 'fly', to: 'hold', spd: 40 }, { k: 'say', text: `${call} in the holding area.`, phase: 'holding' },
        { k: 'hold', until: [{ code: 'DELTA' }, { code: 'ABORT' }, { all: riders, phase: 'ready for extraction' }] }, { k: 'fly', to: pick, spd: 50 }, { k: 'land' }, { k: 'pickup', riders },
        { k: 'say', text: `${call} wheels up from the objective, all teams aboard.`, phase: 'wheels up, objective' }, { k: 'fly', to: 'fob', spd: 50 }, { k: 'land' }, { k: 'casualties' }, { k: 'refuel' }, { k: 'end' });
      u.exfilAt = -1; return steps;
    }
    steps.push({ k: 'ride', carrier: 'air', off: I.node }, { k: 'landed' });
    say(`${call} on the ground at ${W.map.nodes[I.node].name}.`, 'on the ground');
    let pos = W.map.nodes[I.node], pace = P.insert === 'off' ? 'stealth' : 'rush';
    if (P.insert === 'off') { const rp = { x: C.x - 260, y: C.y + 60 }; steps.push({ k: 'cwalk', to: rp, f: 0, area: 'out', spd: 1.15, pace: 'patrol' }); say(`${call} at the release point.`, 'at the release point'); pos = rp; }
    if (id === 'p1') {
      const cp = F.CORDON[P.cordon] || F.CORDON.n, q = abs(cp.x, cp.y); if (I.area !== 'out') pos = pathSteps(W, steps, route(W, I.area, pos, 'out', q, ['brE', 'brW']) || [], pos, 'rush'); walkTo(steps, 'out', pos, q, 0, pace);
      say(`${call} set on the perimeter, ${cp.name.toLowerCase()}.`, 'perimeter set'); steps.push({ k: 'block', until: [{ code: 'DELTA' }, { code: 'ABORT' }, { all: ['t1', 't2', 't3'], phase: 'ready for extraction' }] });
    } else {
      const T = P.teams[id];
      if (T.reserve) { say(`${call} in reserve at the landing zone.`, 'in reserve'); steps.push({ k: 'block', until: [{ code: 'DELTA' }, { code: 'ABORT' }, { all: ['t1', 't2', 't3'].filter(x => x !== id), phase: 'search complete' }] }); }
      else {
        const wk = teamWalk(W, id); pathSteps(W, steps, wk.legs, pos, pace, T.entry, T.how, P.together);
        say(`${call} all rooms clear. Beginning search.`, 'rooms clear', { count: true });
        steps.push({ k: 'search', dur: 420 }); say(`${call} search complete.`, 'search complete', { count: true });
      }
    }
    u.exfilAt = steps.length; steps.push({ k: 'phase', exfil: true }, { k: 'exfil' });
    say(`${call} at the pickup point, ready for extraction.`, 'ready for extraction');
    steps.push({ k: 'ride', carrier: 'air', off: 'fob' }, { k: 'casualties' }, { k: 'rearm' }, { k: 'end' });
    return steps;
  };
  F.cqbCheck = W => { const n = F.cqbNeeds(W); if (n.length) return 'The plan is not finished: ' + n.map(x => x.split(':')[0]).filter((v, i, a) => a.indexOf(v) === i).join(', ') + '.'; for (const id of ['t1', 't2', 't3']) if (!teamWalk(W, id).ok) return `${W.units[id].call} cannot reach its rooms from its entry point.`; return null; };

  /* ---------- carrying it out ---------- */
  const okN = (W, u) => F.unitOk(W, u).length;
  function sayNet(W, u, prio, text, phase, extra) { // the internal net: the command post gets it by radio, every element hears it at once
    u.phase = phase; F.report(W, u, 'CHECKIN', prio, text, Object.assign({ phase }, extra || {}));
    for (const id in W.op.plan.els) { const p = W.units[id]; if (p !== u && okN(W, p)) p.net[u.id + ':' + phase] = W.t; }
  }
  F.cqbSay = sayNet;
  function inRoom(W, s, rid) { const R = ROOMS[rid]; return (s.pos.f || 0) === R.f && inR(loc(s.pos), R.r, 0.3); }
  function occupants(W, rid) { const out = []; for (const id in W.soldiers) { const s = W.soldiers[id]; if (s.side !== 'blue' && !s.evac && inRoom(W, s, rid)) out.push(s); } return out; }
  F.cqbOccupants = occupants;
  function spots(rid) { const r = ROOMS[rid].r, k = 1.3, mx = (r[0] + r[2]) / 2, my = (r[1] + r[3]) / 2; return [[r[0] + k, r[3] - k], [r[2] - k, r[1] + k], [r[2] - k, r[3] - k], [r[0] + k, r[1] + k], [mx, my + 2], [mx, my - 2]].map(p => abs(p[0], p[1], ROOMS[rid].f)); }
  function detain(W, u, s, rid) {
    s.state = 'det'; s.captor = u.id; s.moving = false; u.det.push(s.id);
    const e = F.ev(W, s.hvt ? 'capture' : 'detain', `${u.name} detained ${s.hvt ? 'the target' : 'a man'} in the ${ROOMS[rid].name.toLowerCase()}${s.downAt ? ' (wounded)' : ''}`, { soldier: s.id });
    if (s.hvt) { W.op.capEv = e; sayNet(W, u, 'F', `JACKPOT. ${u.call} has detained the target in the ${ROOMS[rid].name.toLowerCase()}.`, 'target detained', { hvt: 'captured' }); }
  }
  function fly(W, u, node, spd) { const n = W.map.nodes[node]; u.mv = { k: 'air', to: { x: n.x, y: n.y }, spd, node }; }
  function blast(W, u, p, r, why) { (W.noise = W.noise || []).push({ x: Math.round(p.x), y: Math.round(p.y), t: W.t, side: 'blue', u: u.id, r, blast: true }); if (W.fx.length < 240) W.fx.push({ ax: p.x - 2, ay: p.y - 2, bx: p.x + 2, by: p.y + 2, t: W.t, side: 'blue', big: 1, boom: 1 }); }
  function met(W, u, conds, s) {
    for (const c of conds || []) {
      if (c.code && u.codes[c.code]) return 'code ' + c.code;
      if (c.all && c.all.every(id => !okN(W, W.units[id]) || u.net[id + ':' + c.phase])) return 'every team reporting ' + c.phase;
      if (c.t != null && W.t >= c.t) return 'time ' + F.clock(c.t);
    }
    return null;
  }
  F.cqbMet = met;
  /* Steps belonging to the compound raid. Returns false for a step kind it does not know. */
  F.cqbStep = (W, u, s, el, next) => {
    const P = W.op.plan;
    if (u.kind !== 'air' && u.landed && !u.exfiling && s.k !== 'ride') { // the time on target is in the order; DELTA and abort are on the net
      const why = u.codes.DELTA ? 'DELTA received' : u.codes.ABORT ? 'abort received' : u.onObj && W.t > u.onObj + P.tot * 60 ? `time on target of ${P.tot} minutes is up` : null;
      if (why) { F.opFallback(W, u, why); return true; }
    }
    switch (s.k) {
      case 'landed': u.landed = W.t; u.f = 0; u.area = areaAt(u.pos, 0); u.fire = 'free'; u.engR = 120; W.op.tGround = W.op.tGround || W.t; next(); return true;
      case 'cwalk':
        if (!s.go) { s.go = 1; if (s.area !== 'out' && !u.onObj) u.onObj = W.t; u.f = s.f || 0; u.area = s.area; u.pace = s.pace === 'stealth' ? 'stealth' : null; u.file = true; if (u.file) { u.assaulting = true; u.cqb = true; u.engR = 40; } u.spots = null; F.walk(W, u, s.to, s.spd); }
        else if (!u.mv) next();
        return true;
      case 'breach': {
        const D = W.map.doors[s.door]; u.phase = 'at the ' + D.name.toLowerCase(); if (!u.onObj) u.onObj = W.t;
        if (D.open) { next(); return true; }
        if (!s.set) {
          s.set = 1; s.how = D.kind === 'wall' ? 'explosive' : s.how; if (s.how === 'explosive' && !u.members.some(id => (W.soldiers[id].carry.CHG || 0) > 0 && W.soldiers[id].state === 'ok')) s.how = 'manual';
          s.ready = W.t + (s.how === 'explosive' ? 25 : D.locked ? (D.kind === 'gate' ? F.ri(W, 40, 120) : F.ri(W, 15, 50)) : 3);
          if (s.how === 'explosive') F.trace(W, u.call, `Placing a charge on the ${D.name.toLowerCase()}`, s.together ? 'Explosive breach, on the signal' : 'Explosive breach as planned');
        }
        if (W.t < s.ready) { if (s.how === 'manual' && D.locked && W.t % 8 === 0) (W.noise = W.noise || []).push({ x: D.x, y: D.y, t: W.t, side: 'blue', u: u.id, r: 30 }); return true; }
        if (s.how === 'explosive' && s.together && !s.go) {
          if (!s.said) { s.said = 1; sayNet(W, u, 'P', `${u.call} set at the ${D.name.toLowerCase()}.`, 'set at the breach'); }
          const others = ['t1', 't2', 't3'].filter(x => x !== u.id && !P.teams[x].reserve && okN(W, W.units[x]));
          const why = u.codes.ALPHA ? 'code ALPHA' : others.every(x => u.net[x + ':set at the breach']) ? 'all teams set' : u.con ? 'in contact' : u.heard && u.heard > s.t0 ? 'heard a breach' : W.t > s.t0 + 900 ? 'fifteen minutes at the breach' : null;
          u.phase = 'set at the ' + D.name.toLowerCase() + ', waiting'; if (!why) return true; s.go = 1; F.trace(W, u.call, 'Breach', 'On ' + why);
        }
        if (s.how === 'explosive') {
          const br = u.members.map(id => W.soldiers[id]).find(x => x.state === 'ok' && (x.carry.CHG || 0) > 0); F.expend(W, br, 'CHG', 1, 'breaching');
          D.open = true; D.breached = 'explosive'; D.locked = false; const ev = F.ev(W, 'breach', `${u.name} blew the ${D.name.toLowerCase()} open`, { door: D.id }); blast(W, u, D, D.kind === 'door' ? 2500 : 3500);
          for (const id in W.soldiers) { const x = W.soldiers[id]; if (x.state !== 'ok' || x.unit === u.id || (x.pos.f || 0) !== D.f || F.dist(x.pos, D) > 3.5 || x.inVeh) continue; if (F.ch(W, 0.2)) { x.state = 'wia'; x.mobile = F.ch(W, 0.5); x.downAt = W.t; F.ev(W, 'casualty', `${W.units[x.unit].name}: ${x.role} wounded by the breaching charge`, { soldier: id }, ev); } }
          W.op.tBreach = W.op.tBreach || W.t;
        } else if (D.locked && !s.tried && F.ch(W, D.kind === 'gate' ? 0.35 : 0.15)) {
          s.tried = 1; const has = u.members.some(id => (W.soldiers[id].carry.CHG || 0) > 0 && W.soldiers[id].state === 'ok');
          F.trace(W, u.call, `Manual breach of the ${D.name.toLowerCase()} failed`, has ? 'Going explosive' : 'No charges left: forcing it again');
          if (has) { s.how = 'explosive'; s.together = false; s.ready = W.t + 25; } else s.ready = W.t + F.ri(W, 30, 90); return true;
        } else { D.open = true; D.locked = false; D.breached = D.breached || 'manual'; F.ev(W, 'breach', `${u.name} opened the ${D.name.toLowerCase()} by hand`, { door: D.id }); W.op.tBreach = W.op.tBreach || W.t; }
        next(); return true;
      }
      case 'clear': {
        const R = ROOMS[s.room]; u.phase = 'clearing the ' + R.name.toLowerCase();
        if (!s.in) { s.in = W.t; s.det0 = u.det.length; u.f = R.f; u.area = s.room; u.spots = spots(s.room); u.assaulting = true; u.cqb = true; u.file = false; u.fire = 'free'; u.engR = 30; u.mv = null; u.pos = centre(s.room); if (R.f) u.pos.f = R.f; }
        const occ = occupants(W, s.room), armed = occ.filter(x => x.state === 'ok' && x.armed !== false && x.side === 'red');
        if (el >= 4) for (const x of occ) {
          if (x.side === 'red' && (x.state === 'wia' || (x.state === 'ok' && x.armed === false)) && F.ch(W, x.state === 'wia' ? 0.5 : 0.3)) detain(W, u, x, s.room);
          else if (x.side === 'civ' && x.state === 'ok' && !x.secured) x.secured = W.t;
          else if (x.side === 'red' && x.hvt && x.state === 'kia' && !W.op.idKill) { W.op.idKill = W.t; F.ev(W, 'identify', `${u.name} identified the target among the dead in the ${R.name.toLowerCase()}`, { soldier: x.id }); sayNet(W, u, 'F', `JACKPOT. Target killed in the ${R.name.toLowerCase()}, identity confirmed by ${u.call}.`, 'target killed', { hvt: 'killed' }); }
        }
        const left = occ.filter(x => x.side === 'red' && (x.state === 'ok' || x.state === 'wia'));
        if ((el >= 10 && !left.length) || el > 300) {
          W.op.cleared[s.room] = W.op.cleared[s.room] || W.t; u.spots = null; u.file = true;
          const kia = occ.filter(x => x.side === 'red' && x.state === 'kia').length, civ = occ.filter(x => x.side === 'civ'), cd = civ.filter(x => x.state !== 'ok').length, det = u.det.length - (s.det0 || 0);
          const parts = []; if (det) parts.push(`${det} detained`); if (kia) parts.push(`${kia} enemy killed`); if (civ.length) parts.push(`${civ.length} women and children${cd ? `, ${cd} hurt` : ''}`);
          sayNet(W, u, kia || cd ? 'P' : 'R', `${u.call} ${R.name.toLowerCase()} clear${parts.length ? ': ' + parts.join(', ') : ''}.`, R.name.toLowerCase() + ' clear', { room: s.room, civHurt: cd || undefined });
          next();
        }
        return true;
      }
      case 'search': u.phase = 'searching'; u.assaulting = false; if (el >= s.dur) { next(); } return true;
      case 'exfil': { // from wherever the team actually is, back the way the doors are open to the pickup point
        const pick = W.map.nodes[P.insert === 'yard' ? 'lzY' : 'lzO'], toA = P.insert === 'yard' ? 'eyard' : 'out', from = u.area || areaAt(u.pos, u.f || 0), add = [];
        u.spots = null; u.assaulting = false;
        const dn = W.op.downed && W.vehicles[W.op.downed]; let start = { x: u.pos.x, y: u.pos.y };
        const r = route(W, from, start, toA, pick) || [];
        for (const c of r) { const x = crossSteps(W, add, c); walkTo(add, c.from, start, x.nearP, x.fa, 'rush'); if (x.door) add.push({ k: 'breach', door: x.door, how: 'manual' }); add.push({ k: 'cwalk', to: { x: x.farP.x, y: x.farP.y }, f: x.fb, area: c.to, spd: 1.6, pace: 'rush', inside: c.to !== 'out' }); start = x.farP; }
        if (dn && dn.status === 'down' && !W.op.denyBy) { W.op.denyBy = u.id; walkTo(add, toA, start, dn.pos, 0, 'rush'); add.push({ k: 'deny', v: dn.id, dur: 240 }); start = dn.pos; }
        walkTo(add, toA, start, { x: pick.x + 10, y: pick.y - 10 }, 0, 'rush');
        u.plan.splice(u.pi + 1, 0, ...add); next(); return true;
      }
      case 'deny': { const v = W.vehicles[s.v]; u.phase = 'destroying the downed aircraft'; if (el >= s.dur) { F.burn(W, W.stores[v.tank], 'JP8', F.qty(W.stores[v.tank], 'JP8'), 'aircraft destroyed'); v.status = 'destroyed'; blast(W, u, v.pos, 4000); F.ev(W, 'deny', `${u.name} destroyed the downed ${v.name} so it cannot be used`, { vehicle: v.id }); F.trace(W, u.call, `Destroyed ${v.name}`, 'Damaged aircraft cannot fly; it is not left intact'); next(); } return true; }
      /* the aircraft */
      case 'fly': if (!s.go) { s.go = 1; u.dis = false; fly(W, u, s.to, s.spd); } else if (!u.mv) next(); u.phase = 'flying to ' + W.map.nodes[s.to].name; return true;
      case 'land':
        if (!s.done) { s.done = 1; if (s.hard && F.ch(W, 0.15)) hardLanding(W, u); }
        if (el >= 15) next(); return true;
      case 'drop': u.phase = 'on the landing zone'; if (s.riders.every(r => W.units[r].riding !== u.id) && el >= 10) next(); return true;
      case 'hold': { u.phase = 'in the holding area'; const why = met(W, u, s.until, s); if (why) { F.trace(W, u.call, 'Flying in for the pickup', 'On ' + why); W.op.tCall = W.t; next(); } return true; }
      case 'pickup': { u.phase = 'on the pickup zone'; const all = s.riders.every(r => { const x = W.units[r]; return x.riding === u.id || !okN(W, x); }); if (all && el >= 20) { W.op.tUp = W.t; next(); } return true; }
    }
    return false;
  };
  function hardLanding(W, u) {
    const v = W.vehicles[u.vehicles[u.vehicles.length - 1]]; v.status = 'down'; v.downUntil = 1e12; W.op.downed = v.id;
    const ev = F.ev(W, 'hard-landing', `${v.name} landed hard in the courtyard: it will not fly again`, { vehicle: v.id });
    F.trace(W, u.call, `${v.name} down in the courtyard`, 'Lost lift settling into the walled yard');
    (W.noise = W.noise || []).push({ x: Math.round(v.pos.x), y: Math.round(v.pos.y), t: W.t, side: 'blue', u: u.id, r: 900, blast: true });
    for (const id in W.soldiers) { const x = W.soldiers[id]; if (x.side === 'blue' && x.state === 'ok' && F.dist(x.pos, v.pos) < 3 && F.ch(W, 0.05)) { x.state = 'wia'; x.mobile = true; x.downAt = W.t; F.ev(W, 'casualty', `${W.units[x.unit].name}: ${x.role} hurt in the hard landing`, { soldier: id }, ev); } }
    /* the crew get out and go with the perimeter team; the aircraft stays where it is */
    const k = u.vehicles.indexOf(v.id), crew = u.crew.filter((id, i) => i % u.vehicles.length === k), p = W.units.p1;
    crew.forEach(id => { u.members.splice(u.members.indexOf(id), 1); u.crew.splice(u.crew.indexOf(id), 1); p.members.push(id); W.soldiers[id].unit = 'p1'; W.soldiers[id].inVeh = false; });
    u.vehicles.splice(k, 1); v.unit = null;
  }

  /* ---------- the after-action truth ---------- */
  F.cqbOutcome = W => {
    const O = W.op, h = Object.values(W.soldiers).find(s => s.hvt);
    const hvt = h.state === 'det' ? (F.atFob(W, h.pos) ? 'captured and brought back' : 'captured') : h.state === 'kia' ? 'killed' : h.state === 'wia' ? 'wounded, left behind' : 'not found';
    const c = { kia: 0, wia: 0, n: 0 }, blue = { kia: 0, wia: 0 }, red = { kia: 0, wia: 0, det: 0, ok: 0 };
    for (const id in W.soldiers) { const s = W.soldiers[id]; const b = s.side === 'blue' ? blue : s.side === 'civ' ? c : red; if (s.side === 'civ') c.n++; if (s.state === 'kia') b.kia++; else if (s.state === 'wia') b.wia++; else if (s.state === 'det') red.det++; else if (s.side === 'red') red.ok++; }
    const tot = O.tGround && O.tUp ? O.tUp - O.tGround : null, success = h.state === 'det' || h.state === 'kia';
    const lost = Object.values(W.vehicles).filter(v => v.air && v.status !== 'ok').length;
    return { hvt, success, blue, red, civ: c, aircraftLost: lost, timeOnTarget: tot, believed: W.hq.hvt ? W.hq.hvt.state : 'unknown', firstBreach: O.tBreach || null, alerted: (W.events.find(e => e.type === 'enemy-alert') || {}).t || null,
      summary: `target ${hvt}; ${red.det} detained; enemy ${red.kia} killed, ${red.wia} wounded; noncombatants ${c.kia} killed, ${c.wia} wounded; friendly ${blue.kia} killed, ${blue.wia} wounded${lost ? '; ' + lost + ' aircraft lost' : ''}${tot ? '; ' + Math.round(tot / 60) + ' minutes on target' : ''}` };
  };

  /* A complete plan, for tests and the headless probe only: the page always starts from an empty plan. */
  F.cqbSamplePlan = (W, variant) => {
    const E = F.cqbEdit, v = variant || 'out';
    E.insert(W, v);
    if (v === 'yard') { E.entry(W, 't1', 'dF'); E.how(W, 't1', 'manual'); E.room(W, 't1', 'h0w'); E.room(W, 't1', 'h0e'); E.room(W, 't1', 'h1e'); E.room(W, 't1', 'h1w'); E.entry(W, 't2', 'inner'); E.how(W, 't2', 'manual'); E.room(W, 't2', 'guest'); E.entry(W, 't3', 'dK'); E.room(W, 't3', 'h0e'); }
    else { E.entry(W, 't1', 'side'); E.room(W, 't1', 'h0w'); E.room(W, 't1', 'h0e'); E.room(W, 't1', 'h1e'); E.room(W, 't1', 'h1w'); E.entry(W, 't2', 'gate'); E.room(W, 't2', 'guest'); E.entry(W, 't3', 'brE'); E.room(W, 't3', 'h0e'); }
    E.cordon(W, 'e'); E.together(W, v !== 'off'); E.sp(W, W.t + 1800);
  };
})();
