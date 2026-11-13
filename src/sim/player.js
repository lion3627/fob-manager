'use strict';
/* The commander. The player acts only through the organisation: approving plans, deciding incidents,
   and changing standing orders. Holding a responsibility never switches the staff off. */
(function () {
  const F = globalThis.FOB;
  F.RESP = [
    { id: 'recon', name: 'Plan the reconnaissance operation', what: 'Review the operations officer\'s draft, adjust it and approve it.' },
    { id: 'incident', name: 'Respond to incidents', what: 'When a unit reports contact or goes quiet, decide the response. If you do not, the S3 acts on standing procedure.' },
    { id: 'support', name: 'Patrol support arrangement', what: 'Patrol route, patrol interval, QRF notice to move and overdue threshold.', keys: ['patrolRoute', 'patrolEvery', 'qrfNTM', 'overdue', 'varyRoute'] },
    { id: 'logistics', name: 'Logistics standing orders', what: 'Days-of-supply target and reorder point, LOGPAC hour, vehicle reserve, maintenance priority, work detail.', keys: ['dosTarget', 'dosReorder', 'logpacHour', 'reserveQrfVeh', 'maintFirst', 'workDetail'] },
    { id: 'command', name: 'Direct orders', what: 'Recall any unit, set the incident decision window and the rules of engagement.', keys: ['incidentWindow', 'roe'] }
  ];
  F.stepPlayer = W => {
    const R = W.player.resp, set = (id, v, why) => { if (R[id] !== v) { R[id] = v; if (v === 'held') F.ev(W, 'responsibility', `Commander given responsibility: ${F.RESP.find(r => r.id === id).name} (${why})`); } };
    const op = W.ops[0], firstInc = W.incidents.find(i => i.status === 'closed' || i.status === 'decided');
    if (op.status !== 'pending') set('recon', 'held', 'draft plan ready'); else R.recon = R.recon || 'pending';
    set('incident', 'held', 'standing duty of the commander');
    if (firstInc || op.status === 'active' || op.status === 'done' || W.t >= F.D + 12 * F.H) set('support', 'held', firstInc ? 'after the first incident' : 'after the operation was launched'); else R.support = R.support || 'locked';
    if (R.support === 'held' && (W.decisions.some(d => d.text.indexOf('delayed') >= 0 || d.text.indexOf('deferred') >= 0) && W.t >= W.tSupport + 2 * F.H || W.t >= 2 * F.D + 6 * F.H)) set('logistics', 'held', 'operations and logistics are now pulling on the same vehicles'); else R.logistics = R.logistics || 'locked';
    if (R.support === 'held' && !W.tSupport) W.tSupport = W.t;
    if (R.logistics === 'held' && (op.status === 'done' || op.status === 'aborted' || W.t >= 3 * F.D + 6 * F.H)) set('command', 'held', 'the operation is complete'); else R.command = R.command || 'locked';
  };
  const log = (W, text, why) => { W.player.cmds.push({ t: W.t, text }); return F.trace(W, 'CDR', text, why || 'Commander\'s decision'); };
  F.cmd = {
    approveOp: (W, id, edits) => { const o = W.ops.find(x => x.id === id); if (!o || o.status !== 'draft') return { ok: false, err: 'There is no draft to approve.' }; Object.assign(o, edits || {}); if (o.start < W.t + 900) return { ok: false, err: 'Start time is too soon: the squad needs 15 minutes of preparation.' };
      o.status = 'approved'; F.reserve(W.stores.rations, o.id, 'MRE', o.res.MRE); F.reserve(W.stores.water, o.id, 'WATER', o.res.WATER); F.reserve(W.stores.fuelA, o.id, 'JP8', o.res.JP8);
      log(W, `Approved ${o.name}: ${W.units[o.unit].call}, start ${F.clock(o.start)}${o.qrfReady ? ', QRF at five minutes\' notice' : ''}`, 'S4 has reserved rations, water and fuel for it'); return { ok: true }; },
    decide: (W, incId, choice) => { const inc = W.incidents.find(i => i.id === incId); if (!inc || inc.status !== 'open') return { ok: false, err: 'That incident is no longer open.' }; const o = inc.opts.find(x => x.k === choice); if (o && !o.ok) return { ok: false, err: o.why }; inc.by0 = true; F.execIncident(W, inc, choice, 'CDR'); return { ok: true }; },
    setSO: (W, key, val) => { const r = F.RESP.find(x => x.keys && x.keys.includes(key)); if (!r || W.player.resp[r.id] !== 'held') return { ok: false, err: 'That is not yet your responsibility.' }; const old = W.so[key]; W.so[key] = val; log(W, `Standing order changed: ${key} from ${old} to ${val}`); if (key === 'patrolEvery') W.s3.nextPatrol = Math.min(W.s3.nextPatrol, W.t + val); return { ok: true }; },
    recall: (W, unitId) => { if (W.player.resp.command !== 'held') return { ok: false, err: 'Direct orders are not yet your responsibility.' }; const u = W.units[unitId]; if (!u || !u.plan) return { ok: false, err: 'That unit is not on a mission.' }; const c = log(W, `Ordered ${u.call} to return to base`); F.send(W, 'HQ', u.id, 'ORDER-RTB', 'P', 'Return to base.', {}, c); return { ok: true }; }
  };
})();
