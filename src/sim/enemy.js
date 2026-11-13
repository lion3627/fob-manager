'use strict';
/* The opposing force. Each cell acts on what it has itself observed: it watches roads, counts what
   passes, and sets an ambush where traffic has been regular. Nothing here reads friendly plans. */
(function () {
  const F = globalThis.FOB;
  function ammo(W, u) { let a = 0, c = 0; for (const id of u.members) { const s = W.soldiers[id]; if (s.state !== 'ok') continue; a += s.carry.E762 || 0; c += F.WEAPONS[s.weapon].load; } return c ? a / c : 0; }
  function go(W, u, to, then, spd) { F.walk(W, u, to, spd || 1.25); u.st = 'move'; u.then = then; }
  function decide(W, u) {
    const ok = F.unitOk(W, u).length;
    if (ammo(W, u) < 0.6) { const c = W.stores[u.cache]; let n = 0; for (const id of u.members) { const s = W.soldiers[id]; if (s.state === 'ok') n += F.issue(W, c, s, 'E762', F.WEAPONS[s.weapon].load - (s.carry.E762 || 0)); } if (n) F.ev(W, 'enemy-resupply', `${u.name} drew ${n} rounds from its cache`); }
    if (ok < 3) { u.st = 'base'; u.until = W.t + 12 * F.H; F.trace(W, u.name, 'Staying hidden', 'Too few fighters left to operate'); return; }
    let best = null, bn = 0;
    for (const s of u.sites) { const n = u.kb.sight.filter(g => W.t - g.t < 36 * F.H && Math.hypot(g.x - s.road.x, g.y - s.road.y) < 900).length; if (n > bn) { bn = n; best = s; } }
    if (best && bn >= 2 && F.ch(W, 0.75)) { u.site = best; u.mode = 'ambush'; F.trace(W, u.name, `Setting an ambush at ${F.grid(best.pos)}`, `Observed friendly movement there ${bn} times in the last 36 hours`); go(W, u, best.pos, 'ambush'); u.until = W.t + 9 * F.H; return; }
    const s = u.sites.slice().sort((a, b) => (u.visits[a.id] || 0) - (u.visits[b.id] || 0))[0]; u.visits[s.id] = W.t; u.site = s; u.mode = 'observe';
    F.trace(W, u.name, `Moving to observe the road from ${F.grid(s.obs)}`, bn ? `Only ${bn} sighting there so far; needs a pattern before committing` : 'No pattern of friendly movement known yet');
    go(W, u, s.obs, 'observe'); u.until = W.t + F.ri(W, 4, 7) * F.H;
  }
  function home(W, u, fast) { u.observing = false; if (fast) u.dispAt = W.t + 480; go(W, u, u.base, 'base', fast ? 2.0 : 1.25); u.until = W.t + F.ri(W, 2, 4) * F.H; }
  F.stepEnemy = W => {
    for (const id in W.units) {
      const u = W.units[id]; if (u.side !== 'red') continue; const ok = F.unitOk(W, u).length; if (!ok) continue;
      const fr = F.fresh(W, u, 90); let near = 1e9, tgt = null; for (const t of fr) { const d = F.dist(u.pos, t); if (d < near) { near = d; tgt = t; } }
      const under = u.members.some(sid => W.t - W.soldiers[sid].hitAt < 8);
      if (u.con) {
        const c = u.con; if (fr.length || under) c.last = W.t;
        const cas = u.members.length - ok - (u.cas0 || 0);
        if (W.t - c.t0 > 20 && (cas >= 2 || fr.length > ok * 2.2 || W.t - c.t0 > 330 || ammo(W, u) < 0.2 || W.t - c.last > 90)) {
          F.ev(W, 'enemy-withdraw', `${u.name} breaking off: ${cas >= 2 ? 'casualties' : fr.length > ok * 2.2 ? 'outnumbered' : W.t - c.t0 > 330 ? 'time on target' : 'lost sight of the target'}`, null, c.ev);
          u.con = null; home(W, u, true);
        }
      } else if (u.st === 'ambush' && tgt && near <= 240 && fr.length <= 14) {
        u.cas0 = u.members.length - ok; u.con = { t0: W.t, phase: 'fight', last: W.t, lastFire: W.t, ev: F.ev(W, 'ambush', `${u.name} initiated an ambush at ${F.grid(u.pos)} on ${W.units[tgt.unit].name}`) };
      } else if (under && W.t > (u.dispAt || 0) + 120) { // found and fired on: fight if the odds allow, otherwise get out
        if (fr.length <= ok + 1) { u.cas0 = u.members.length - ok; u.con = { t0: W.t, phase: 'fight', last: W.t, lastFire: W.t, ev: F.ev(W, 'contact', `${u.name} engaged at close range ${F.grid(u.pos)}`) }; }
        else { u.dispAt = W.t; F.ev(W, 'enemy-withdraw', `${u.name} displacing: friendly force too close`); go(W, u, u.alt, 'base', 2.0); const b = u.base; u.base = u.alt; u.alt = b; u.until = W.t + 3 * F.H; }
      }
      if (u.con) { u.moving = false; continue; }
      if (u.st === 'move') { F.stepMove(W, u); F.place(W, u); if (!u.mv) { u.st = u.then; u.observing = u.st !== 'base'; u.moving = false; for (const sid of u.members) W.soldiers[sid].moving = false; } }
      else if (W.t % 10 === 0) {
        if (u.st === 'base') {
          if (W.t >= u.nextRepl) { u.nextRepl = W.t + F.ri(W, 10, 20) * F.H; if (ok < u.n0 && W.redPool > 0) { W.redPool--; F.addFighter(W, u); F.ev(W, 'enemy-reinforce', `A replacement fighter joined ${u.name} from outside the area`); } }
          if (W.t >= u.until) decide(W, u);
        }
        else if (W.t >= u.until) { F.trace(W, u.name, 'Returning to base', u.st === 'ambush' ? 'Nothing came through the ambush site' : 'Observation period over'); home(W, u, false); }
      }
    }
  };
})();
