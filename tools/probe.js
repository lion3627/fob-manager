const F=require('../src/sim/index.js');
const seed=+process.argv[2]||7, hours=+process.argv[3]||48;
const W=F.create(seed); const t0=Date.now();
// commander approves the draft op when it appears (optional via arg)
const auto=process.argv[4]==='op';
for(let i=0;i<hours*3600;i++){ F.step(W); if(auto&&W.ops[0].status==='draft') F.cmd.approveOp(W,'op1',{}); }
console.log('ran',hours,'h in',Date.now()-t0,'ms; t=',F.clock(W.t));
const a=F.audit(W); for(const k in a) if(Math.abs(a[k].delta)>1e-3||true) console.log(k.padEnd(6),'init',Math.round(a[k].initial),'on',Math.round(a[k].onHand),'used',Math.round(a[k].used),'delta',a[k].delta.toFixed(4));
console.log('stats',JSON.stringify(W.stats),'patrols',W.s3.patrolN,'incidents',W.incidents.length,'op',W.ops[0].status);
console.log('logstat',W.hq.logstat&&JSON.stringify(W.hq.logstat.dos));
const types={}; W.events.forEach(e=>types[e.type]=(types[e.type]||0)+1); console.log(JSON.stringify(types));
if(process.argv[5]) { W.events.filter(e=>!['hq-recv','enemy-sighting','order-recv'].includes(e.type)).slice(-+process.argv[5]).forEach(e=>console.log(F.clockS(e.t),e.type,'|',e.text)); console.log('--decisions'); W.decisions.slice(-25).forEach(d=>console.log(F.clock(d.t),d.actor,'|',d.text,'|',d.why)); }
