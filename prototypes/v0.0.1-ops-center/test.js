'use strict';
require('./sim.js');
const SIM = globalThis.SIM; const { DAY, N, ADJ, OBJS } = SIM;
function free(S) { return S.squads.filter(s => s.task !== 'out' && s.str >= 5).sort((a, b) => a.fat - b.fat); }
function check(S, seed) {
  const bad = v => typeof v !== 'number' || !isFinite(v);
  for (const k in S.stocks) if (bad(S.stocks[k]) || S.stocks[k] < 0) throw new Error('stock ' + k + ' ' + S.stocks[k]);
  for (const r in S.enemy.pools) if (bad(S.enemy.pools[r]) || S.enemy.pools[r] < -0.01) throw new Error('pool ' + r + ' ' + S.enemy.pools[r]);
  S.squads.forEach(s => { if (bad(s.fat) || bad(s.ammo) || s.str < 0) throw new Error('squad ' + JSON.stringify(s)); });
  S.els.forEach(el => { if (!el.loc.at && (bad(el.loc.done) || !el.loc.to)) throw new Error('loc ' + JSON.stringify(el.loc)); if (S.t - el.tl[0].arr > 6 * DAY) throw new Error('element stuck ' + el.name + ' ' + el.kind + ' ' + el.state + ' ' + JSON.stringify(el.steps[el.si]) + ' si=' + el.si); });
  OBJS.forEach(k => { if (bad(S.intel.hvt[k])) throw new Error('hvt'); });
}
function run(seed, verbose) {
  const S = SIM.newGame(seed); let rs = seed * 7 + 1; const r = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
  let opsPlanned = 0, guard = 0;
  while (!S.over) {
    // decisions
    while (S.decs.length) {
      const d = S.decs[0]; let k = d.opts[0].k;
      if (d.type === 'convoy') k = r() < 0.9 ? 'green' : 'hold';
      else if (d.type === 'medevac') k = d.opts.find(o => o.k === 'air') ? 'air' : (r() < 0.5 ? 'ground' : 'self');
      else if (d.type === 'go') k = r() < 0.85 ? 'go' : r() < 0.5 ? 'hold' : 'abort';
      else if (d.type === 'abortreq') k = r() < 0.5 ? 'abort' : 'cont';
      else if (d.type === 'comp') k = r() < 0.7 ? 'extract' : 'stay';
      const res = SIM.decide(S, d.id, k);
      if (!res.ok && S.decs.includes(d)) { const alt = d.opts.find(o => o.k === 'self') || d.opts[d.opts.length - 1]; SIM.decide(S, d.id, alt.k); if (S.decs.includes(d)) S.decs.shift(); }
    }
    const h = SIM.hour(S.t), d = SIM.dayOf(S.t), m = S.t % 60;
    if (m === 0) {
      const f = free(S);
      if (h === 5) { S.squads.forEach(s => { if (s.task !== 'out') s.task = 'rest'; }); const g = free(S); if (g[0]) g[0].task = 'guard'; if (g[1]) g[1].task = 'qrf'; }
      const idle = () => S.squads.filter(s => s.task === 'rest' && s.str >= 5 && s.fat < 60).sort((a, b) => a.fat - b.fat);
      if (h === 6 && r() < 0.8) { const a = idle(); if (a[0]) SIM.issue(S, { kind: 'patrol', squads: [a[0].id], mounted: r() < 0.8, wps: r() < 0.5 ? ['c3', 'c2', 'c1'] : ['c2', 'orc'], sp: S.t + 30, lost: { after: 120, action: 'rtb' } }); }
      if (h === 7 && d % 2 === 0 && r() < 0.7) { const a = idle(); if (a[0]) SIM.issue(S, { kind: 'escort', squads: [a[0].id], mounted: true, sp: S.t + 15 }); }
      if (h === 19 && r() < 0.6) { const a = idle(); if (a[0]) SIM.issue(S, { kind: 'op', squads: [a[0].id], mounted: false, wps: [r() < 0.6 ? 'rdg' : (r() < 0.5 ? 'wad' : 'orc')], sp: S.t + 60, dwellH: 12 + Math.floor(r() * 30), sat: r() < 0.4, lost: { after: 240, action: r() < 0.5 ? 'continue' : 'rtb' } }); }
      if (h === 10 && r() < 0.3) { const a = idle(); if (a[0]) SIM.issue(S, { kind: 'patrol', squads: [a[0].id], mounted: false, wps: [r() < 0.5 ? 'mir' : 'tol'], sp: S.t + 30, lost: { after: 240, action: 'continue' } }); }
      if (h === 12 && r() < 0.3) SIM.request(S, { type: r() < 0.7 ? 'isr' : 'awt', node: OBJS[Math.floor(r() * 3)], start: S.t + (10 + Math.floor(r() * 10)) * 60, dur: 240 });
      if (h === 13 && d === 3) SIM.reqMainEffort(S);
      if (h === 14 && d >= 3 && S.enemy.leader === 'atlarge' && !S.ops.some(o => ['planned', 'orp', 'assault', 'sse', 'exfil'].includes(o.state)) && r() < 0.6) {
        const a = idle(); if (a.length >= 3) {
          const hv = S.intel.hvt; const obj = OBJS.slice().sort((x, y) => hv[y] - hv[x])[0]; const sup = a.length >= 4 ? [a[3].id] : null;
          const supNode = ADJ[obj].map(x => x.to).find(x => !OBJS.includes(x)) || ADJ[obj][0].to;
          const res = SIM.planOp(S, { obj, assault: a.slice(0, 3).map(s => s.id), support: sup, supNode, mounted: r() < 0.2, hhour: Math.floor(S.t / DAY) * DAY + DAY + 120, needGo: r() < 0.6, noGo: r() < 0.6 ? 'execute' : 'abort', abortCas: 2 + Math.floor(r() * 3), lost: { after: 360, action: 'continue' }, satA: r() < 0.5, satS: false });
          if (res.ok) opsPlanned++; else if (verbose) console.log('op err', res.err);
        }
      }
      if (S.engs.length && r() < 0.5) { const q = SIM.launchQRF(S, { node: S.engs[0].node }); if (!q.ok && r() < 0.5) SIM.reqAwtNow(S); }
    }
    const n0 = S.log.length; SIM.tick(S); check(S, seed); S.minFuel = Math.min(S.minFuel == null ? 1e9 : S.minFuel, S.stocks.fuel); S.flash = (S.flash || 0) + S.log.slice(n0).filter(l => l.sev >= 2).length;
  }
  if (verbose) { S.log.slice(-80).forEach(l => console.log(SIM.dtg(l.t), '[' + l.from + ']', l.text)); console.log('--- truth'); S.truth.forEach(x => console.log(SIM.dtg(x.t), x.text, x.knownAt == null ? '(never known)' : '(+' + (x.knownAt - x.t) + ')')); }
  return { S, opsPlanned };
}
const args = process.argv.slice(2);
if (args[0] === 'one') { const { S } = run(+args[1] || 1, true); console.log(S.result, S.stats, S.stocks, S.enemy.leader, S.enemy.cacheDestroyed); }
else {
  const n = +args[0] || 100; const agg = { kia: 0, wia: 0, dow: 0, ek: 0, conv: 0, convLost: 0, ied: 0, jackpot: 0, cache: 0, ops: 0, opDone: 0, opAbort: 0, pts: 0, fuel0: 0, grades: {}, enemyLeft: 0, truth: 0, unknown: 0, logs: 0, flash: 0, rat0: 0, ldrHere: 0, asslt: 0, trucks: 0, fuelEnd: 0, ratEnd: 0, minFuel: 0 }; let fails = 0;
  for (let s = 1; s <= n; s++) {
    try {
      const { S, opsPlanned } = run(s, false); const st = S.stats;
      agg.kia += st.kia; agg.wia += st.wia; agg.dow += st.dow; agg.ek += st.enemyKia; agg.conv += st.convoys; agg.convLost += st.convoyLost; agg.ied += st.ied; agg.jackpot += S.enemy.leader !== 'atlarge' ? 1 : 0; agg.cache += S.enemy.cacheDestroyed ? 1 : 0;
      agg.ops += opsPlanned; agg.opDone += S.ops.filter(o => o.state === 'done').length; agg.opAbort += S.ops.filter(o => o.state === 'aborted').length; agg.pts += S.result.pts; agg.grades[S.result.grade] = (agg.grades[S.result.grade] || 0) + 1; agg.enemyLeft += S.result.enemyLeft; agg.fuel0 += S.stocks.fuel <= 0 ? 1 : 0;
      agg.truth += S.truth.length; agg.unknown += S.truth.filter(x => x.knownAt == null).length; agg.logs += S.log.length; agg.rat0 += S.stocks.rations <= 0.05 ? 1 : 0; agg.flash += S.flash; agg.asslt += S.ops.filter(o => o.ldrHere != null).length; agg.ldrHere += S.ops.filter(o => o.ldrHere).length; agg.trucks += S.convoys.filter(c => c.state === 'arrived').reduce((a, c) => a + c.trucks, 0); agg.fuelEnd += S.stocks.fuel; agg.ratEnd += S.stocks.rations; agg.minFuel += S.minFuel;
    } catch (e) { fails++; console.log('SEED', s, e.stack.split('\n').slice(0, 4).join('\n')); if (fails > 6) break; }
  }
  for (const k in agg) if (typeof agg[k] === 'number') agg[k] = +(agg[k] / n).toFixed(2);
  console.log('fails', fails, JSON.stringify(agg, null, 1));
}
