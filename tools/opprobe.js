// Run an operation scenario headless with the default (or, for the compound raid, a sample) plan:
// node tools/opprobe.js <scenario> <seed> [events] [yard|out|off]
const F = require('../src/sim/index.js');
const id = process.argv[2] || 'cobalt', seed = +process.argv[3] || 7, show = +process.argv[4] || 0;
const W = F.createOp(seed, id); if (W.op.kind === 'compound') F.cqbSamplePlan(W, process.argv[5]); const r = F.opCmd.launch(W); if (!r.ok) { console.log(r.err); process.exit(1); }
const t0 = Date.now(); while (W.op.status === 'running') F.step(W);
console.log(id, 'seed', seed, 'ended', F.clock(W.t), 'in', Date.now() - t0, 'ms');
console.log(JSON.stringify(W.op.outcome));
const a = F.audit(W); const bad = Object.keys(a).filter(k => Math.abs(a[k].delta) > 1e-3); console.log('audit', bad.length ? 'FAIL ' + bad : 'ok');
if (show) { W.events.filter(e => !['hq-recv', 'enemy-sighting', 'order-recv'].includes(e.type)).slice(-show).forEach(e => console.log(F.clockS(e.t), e.type, '|', e.text)); console.log('--decisions'); W.decisions.slice(-30).forEach(d => console.log(F.clock(d.t), d.actor, '|', d.text, '|', d.why)); console.log('--hq log'); W.hq.log.slice(-30).forEach(l => console.log(F.clock(l.t), l.from, l.type, l.text)); }
