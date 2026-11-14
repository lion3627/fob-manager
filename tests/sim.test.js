'use strict';
const test = require('node:test'); const assert = require('node:assert');
const F = require('../src/sim/index.js');
const H = 3600;
function outside(W, id, node, vehs) { // put a squad on the road network away from the base
  const u = W.units[id], n = W.map.nodes[node]; u.pos = { x: n.x, y: n.y }; u.node = node; u.plan = [{ k: 'halt', dur: 1e9 }]; u.pi = 0; u.task = 'test';
  if (vehs) { F.giveVeh(W, u, vehs); vehs.forEach((v, i) => { W.vehicles[v].pos = { x: n.x - i * 20, y: n.y }; W.vehicles[v].at = null; }); u.dis = false; } else { u.vehicles = []; u.dis = true; }
  u.members.forEach(m => { W.soldiers[m].pos = { x: n.x, y: n.y }; }); return u;
}

test('same seed gives the same world; a different seed does not', () => {
  const a = F.run(F.create(42), 6 * H), b = F.run(F.create(42), 6 * H), c = F.run(F.create(43), 6 * H);
  assert.strictEqual(F.hash(a), F.hash(b)); assert.notStrictEqual(F.hash(a), F.hash(c));
});

test('every resource type is conserved over three days of autonomous operation', () => {
  for (const seed of [3, 17, 91]) {
    const W = F.run(F.create(seed), 72 * H), a = F.audit(W);
    for (const ty in a) assert.ok(Math.abs(a[ty].delta) < 1e-3, `${ty} leaked ${a[ty].delta} with seed ${seed}`);
    assert.ok(a.JP8.used > 300, 'fuel was actually burned'); assert.ok(a.MRE.used > 150, 'meals were actually eaten');
  }
});

test('a transfer takes from the source exactly what the destination gains, within capacity and reservations', () => {
  const W = F.create(1), a = W.stores.dFuel, b = W.stores.fuelB, before = F.qty(a, 'JP8'), room = F.free(b, 'JP8');
  const moved = F.move(W, a, b, 'JP8', 99999);
  assert.strictEqual(moved, room); assert.strictEqual(F.qty(a, 'JP8'), before - room); assert.strictEqual(F.free(b, 'JP8'), 0);
  F.reserve(W.stores.rations, 'opX', 'MRE', 390);
  assert.strictEqual(F.avail(W.stores.rations, 'MRE'), 10);
  assert.strictEqual(F.move(W, W.stores.rations, W.stores['c2.cargo'], 'MRE', 100), 10, 'reserved stock is not handed out');
  assert.strictEqual(F.move(W, W.stores.asp, W.stores.fuelA, 'A556', 100), 0, 'ammunition does not go in a fuel tank');
});

test('the organisation runs for three days with no player input', () => {
  const W = F.run(F.create(5), 72 * H);
  assert.ok(W.s3.patrolN >= 15, 'routine patrols were launched'); assert.ok(W.stats.deliveries >= 2, 'convoys delivered');
  assert.strictEqual(W.player.cmds.length, 0); assert.strictEqual(W.ops[0].status, 'draft', 'the operation waits for the commander');
  assert.ok(W.incidents.every(i => i.by !== 'CDR'), 'incidents were handled by the staff');
  assert.ok(W.hq.logstat && W.hq.logstat.dos.MRE > 1, 'the base did not run out of rations');
});

test('a report reaches the command post only after transmission and processing', () => {
  const W = F.create(9), u = outside(W, 'u2', 'tol', ['v1', 'v2']), t0 = W.t;
  F.report(W, u, 'SPOT', 'P', 'test', { enemy: { pos: { x: 17000, y: 8000 }, size: [4, 6], act: 'moving' } });
  assert.strictEqual(W.hq.contacts.length, 0, 'not known the instant it is observed');
  F.run(W, 40); assert.strictEqual(W.hq.contacts.length, 0, 'still in transmission');
  F.run(W, 200); assert.strictEqual(W.hq.contacts.length, 1); const c = W.hq.contacts[0];
  assert.ok(c.tRecv - t0 >= 55, `delay was ${c.tRecv - t0} s`); assert.strictEqual(c.t, t0, 'the track keeps the time of observation, not of receipt');
});

test('a dismounted unit behind the ridge cannot report until it has a link', () => {
  const W = F.create(9), u = outside(W, 'u2', 'rdg', null);
  assert.strictEqual(F.link(W, u), null);
  F.report(W, u, 'SPOT', 'F', 'test', { enemy: { pos: { x: 15800, y: 10900 }, size: [3, 5], act: 'moving' } });
  F.run(W, 900); assert.strictEqual(W.hq.contacts.length, 0, 'no link, no knowledge');
  const n = W.map.nodes.tol; u.pos = { x: n.x, y: n.y }; u.members.forEach(m => { W.soldiers[m].pos = { x: n.x, y: n.y }; });
  assert.strictEqual(F.link(W, u), 'voice'); F.run(W, 120); assert.strictEqual(W.hq.contacts.length, 1);
});

test('what headquarters believes stays put when the truth moves', () => {
  const W = F.create(9), u = outside(W, 'u2', 'tol', null), e = W.units.e1;
  F.report(W, u, 'SPOT', 'F', 'test', { enemy: { pos: { x: Math.round(e.pos.x), y: Math.round(e.pos.y) }, size: [6, 6], act: 'static' } }); F.run(W, 120);
  const believed = Object.assign({}, W.hq.contacts[0].pos);
  e.pos.x -= 3000; e.members.forEach(m => { W.soldiers[m].pos.x -= 3000; }); F.run(W, 300);
  assert.deepStrictEqual(W.hq.contacts[0].pos, believed, 'the enemy track is the last report, not the truth');
  const known = Object.assign({}, W.hq.units.u2.pos); const r = W.map.nodes.rdg; u.pos = { x: r.x, y: r.y }; u.members.forEach(m => { W.soldiers[m].pos = { x: r.x, y: r.y }; }); F.run(W, 600);
  assert.deepStrictEqual(W.hq.units.u2.pos, known, 'a unit out of contact is shown where it last reported');
  assert.ok(F.dist(W.hq.units.u2.pos, u.pos) > 2000);
});

test('an order does nothing until it has been delivered to the unit', () => {
  const W = F.create(9), u = outside(W, 'u2', 'tol', ['v1', 'v2']);
  F.send(W, 'HQ', 'u2', 'ORDER-HOLD', 'F', 'Hold.');
  F.run(W, 20); assert.strictEqual(u.ord, null); F.run(W, 200); assert.strictEqual(u.ord, 'HOLD');
});

test('vehicles burn fuel in proportion to the distance they drive', () => {
  const W = F.create(2), u = outside(W, 'u2', 'fob', ['v1', 'v2']), tank = W.stores['v1.tank'], f0 = F.qty(tank, 'JP8');
  u.plan = [{ k: 'drive', to: 'j3' }, { k: 'halt', dur: 1e9 }]; u.pi = 0; F.run(W, 900);
  const km = F.dist(W.map.nodes.fob, W.map.nodes.j3) / 1000, used = f0 - F.qty(tank, 'JP8');
  assert.strictEqual(u.node, 'j3'); assert.ok(Math.abs(used - km * 0.55) < 0.05, `used ${used} L over ${km} km`);
});

test('a firefight spends real ammunition and produces casualties that stay consistent', () => {
  const W = F.create(4), u = outside(W, 'u2', 'tol', null), e = W.units.e1, p = { x: u.pos.x + 160, y: u.pos.y + 40 };
  e.pos = { x: p.x, y: p.y }; e.st = 'ambush'; e.until = W.t + 9 * H; e.members.forEach((m, i) => { W.soldiers[m].pos = { x: p.x + i * 5, y: p.y }; });
  const carried = () => u.members.concat(e.members).reduce((a, m) => { const c = W.soldiers[m].carry; return a + (c.A556 || 0) + (c.A556L || 0) + (c.E762 || 0); }, 0), c0 = carried();
  F.run(W, 400);
  const fired = (W.ledger.why['A556:combat'] || 0) + (W.ledger.why['A556L:combat'] || 0) + (W.ledger.why['E762:combat'] || 0);
  assert.ok(fired > 200, `only ${fired} rounds fired`); assert.strictEqual(c0 - carried(), fired, 'every round fired came out of a load someone carried');
  assert.ok(W.events.some(x => x.type === 'contact' || x.type === 'ambush'));
  for (const id in W.soldiers) assert.ok(['ok', 'wia', 'kia'].includes(W.soldiers[id].state));
  const a = F.audit(W); for (const ty in a) assert.ok(Math.abs(a[ty].delta) < 1e-6);
});

test('a saved world reloads and continues identically', () => {
  const W = F.run(F.create(12), 5 * H), W2 = F.load(F.save(W)); W2.fx = [];
  F.run(W, 3 * H); F.run(W2, 3 * H); assert.strictEqual(F.hash(W), F.hash(W2));
});

test('expired stock leaves the store and is accounted for', () => {
  const W = F.create(1); F.stock(W, W.stores.rations, 'MRE', 24, W.t - 4 * 365 * 86400); const before = F.qty(W.stores.rations, 'MRE');
  F.expire(W); assert.strictEqual(F.qty(W.stores.rations, 'MRE'), before - 24); assert.strictEqual(W.ledger.expired.MRE, 24); assert.ok(Math.abs(F.audit(W).MRE.delta) < 1e-9);
});

test('the commander cannot change standing orders that are not yet theirs, and approving the plan launches it', () => {
  const W = F.create(8); assert.strictEqual(F.cmd.setSO(W, 'qrfNTM', 300).ok, false);
  F.run(W, 1200); assert.strictEqual(W.ops[0].status, 'draft'); assert.strictEqual(F.cmd.approveOp(W, 'op1', { start: W.t + 2 * H }).ok, true);
  assert.strictEqual(F.avail(W.stores.rations, 'MRE'), F.qty(W.stores.rations, 'MRE') - 27, 'supplies were reserved');
  F.run(W, 4 * H); assert.ok(['active', 'done', 'aborted'].includes(W.ops[0].status), 'status ' + W.ops[0].status);
  assert.strictEqual(W.player.resp.support, 'held'); assert.strictEqual(F.cmd.setSO(W, 'qrfNTM', 300).ok, true); assert.strictEqual(W.so.qrfNTM, 300);
});

test('soldiers cannot see an enemy on the far side of the ridge, but see one at the same range in the open', () => {
  const place = (W, id, p) => { const u = W.units[id]; u.pos = { ...p }; u.plan = [{ k: 'halt', dur: 1e9 }]; u.pi = 0; u.task = 'test'; u.vehicles = []; u.dis = true; u.members.forEach(m => { const s = W.soldiers[m]; s.pos = { ...p }; s.inVeh = false; s.moving = true; }); return u; };
  const seen = (W, u, e) => e.members.filter(m => u.kb.con[m]).length;
  // Arrange: 1,200 m apart, either side of Hill 402 (centre 13800,8900, radius 1400)
  const A = F.create(9), ua = place(A, 'u2', { x: 12550, y: 8300 }), ea = place(A, 'e1', { x: 12550, y: 9500 });
  const B = F.create(9), ub = place(B, 'u2', { x: 10000, y: 8300 }), eb = place(B, 'e1', { x: 10000, y: 9500 });
  assert.ok(F.blocked(A, ua.pos, ea.pos) && !F.blocked(B, ub.pos, eb.pos));
  // Act
  for (let i = 0; i < 300; i++) { F.sense(A); F.sense(B); }
  // Assert
  assert.strictEqual(seen(A, ua, ea), 0, 'the ridge blocks sight');
  assert.ok(seen(B, ub, eb) > 0, 'the same range in the open is visible');
});
