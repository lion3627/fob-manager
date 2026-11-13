'use strict';
require('./sim.js'); const SIM = globalThis.SIM;
function run(seed, mode) {
  const S = SIM.newGame(seed); let rs = seed * 13 + 5; const r = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
  let guard = 0;
  while (!S.over && guard++ < 20000) {
    if (S.guide.cur) { const st = S.guide.cur; if (mode === 'rec') SIM.recommend(S, st); else if (mode === 'rand') { const c = S.cfg; c.sec = 1 + Math.floor(r() * 4); c.rest = 1 + Math.floor(r() * 5); c.qrf = Math.floor(r() * 3); c.shift = [6, 8, 12][Math.floor(r() * 3)]; c.standto = r() < 0.5; c.patrols = Math.floor(r() * 4); c.vary = r() < 0.5; c.clear = r() < 0.5; c.escort = r() < 0.5; c.convEvery = r() < 0.5 ? 2 : 3; c.sop.contact = ['break', 'qrf', 'mort'][Math.floor(r() * 3)]; c.sop.lost = r() < 0.5 ? 'qrf' : 'wait'; c.sop.cas = r() < 0.5 ? 'air' : 'ground'; c.sop.probe = ['standto', 'observe', 'illum'][Math.floor(r() * 3)]; SIM.fixCfg(S); if (r() < 0.5) S.queue.reverse(); } SIM.completeStep(S, st); }
    if (mode === 'rand' && S.prompts.length && r() < 0.3) { const p = S.prompts[0]; SIM.resolvePrompt(S, p.id, p.opts[Math.floor(r() * p.opts.length)].k, true); }
    for (let i = 0; i < 30 && !S.over; i++) SIM.tick(S);
    if (!S.started) throw new Error('not started');
    S.squads.forEach(s => { if (!isFinite(s.fat) || s.str < 0) throw new Error('squad ' + JSON.stringify(s)); });
    for (const k in S.stocks) if (!isFinite(S.stocks[k]) || S.stocks[k] < 0) throw new Error('stock ' + k);
    SIM.project(S, 24); SIM.security(S);
  }
  if (!S.over) throw new Error('never ended');
  return S;
}
for (const mode of ['rec', 'none', 'rand']) {
  const a = { pts: 0, kia: 0, wia: 0, breaches: 0, repelled: 0, convoyHit: 0, dry: 0, focDay: 0, foc: 0, rev: 0, worst: 0, grades: {} }; const n = 150; let fails = 0;
  for (let s = 1; s <= n; s++) { try { const S = run(s, mode); const st = S.stats; a.pts += S.result.pts; a.kia += st.kia; a.wia += st.wia; a.breaches += st.breaches; a.repelled += st.repelled; a.convoyHit += st.convoyHit; a.dry += st.dryHours; a.foc += S.buildDone ? 1 : 0; a.focDay += S.buildDone ? S.buildDone / 1440 : 0; a.rev += S.review.length; a.worst += S.result.worst; a.grades[S.result.grade] = (a.grades[S.result.grade] || 0) + 1; } catch (e) { fails++; if (fails < 4) console.log(mode, 'SEED', s, e.stack.split('\n').slice(0, 3).join(' | ')); } }
  const o = {}; for (const k in a) o[k] = typeof a[k] === 'number' ? +(a[k] / n).toFixed(2) : a[k]; o.focDay = +(a.focDay / Math.max(1, a.foc)).toFixed(2);
  console.log(mode, 'fails', fails, JSON.stringify(o));
}
