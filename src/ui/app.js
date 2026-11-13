'use strict';
/* Shell: clock, the two modes, and the panels. Command panels read only the command post's knowledge;
   observer panels read the world itself. Both look at the same simulation. */
(function () {
  const F = globalThis.FOB, UI = F.ui, KEY = 'fob-manager-save-v1';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let W = null; const S = UI.state = { mode: 'command', tab: { command: 'tasks', observer: 'world' }, speed: 60, acc: 0, msg: null, opEdit: {}, evFilter: 'all' };
  const TABS = { command: [['tasks', 'Tasks'], ['reports', 'Reports'], ['units', 'Units'], ['staff', 'Staff'], ['log', 'Logistics'], ['orders', 'Orders']], observer: [['world', 'World'], ['inv', 'Inventories'], ['events', 'Events'], ['know', 'Knowledge']] };
  const n0 = x => Math.round(x).toLocaleString('en-US');
  const age = t => F.dur(Math.max(0, W.t - t)) + ' ago';
  const msg = () => S.msg ? `<div class="msg${S.msg.ok ? ' ok' : ''}" role="status">${esc(S.msg.text)}</div>` : '';
  const sel = (id, key, opts, cur) => `<select id="${id}" data-c="${key}">${opts.map(o => `<option value="${o[0]}"${String(o[0]) === String(cur) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
  const friendly = d => ['S3', 'S4', 'CDR', 'DEPOT'].includes(d.actor);

  /* ---------- command panels: knowledge only ---------- */
  function tasks() {
    let h = msg(); const R = W.player.resp, op = W.ops[0];
    const open = W.incidents.filter(i => i.status === 'open');
    open.forEach(i => { const u = W.units[i.unit], left = Math.max(0, i.due - W.t);
      h += `<div class="card crit"><div class="hd"><b>${i.kind === 'overdue' ? 'Overdue' : 'Troops in contact'}: ${u.call}</b><span class="tag crit">${left} s to decide</span></div><p>${i.kind === 'overdue' ? `No report or beacon since ${F.clock(i.tEvent)}.` : `Reported ${F.clock(i.tEvent)} at ${F.grid(i.pos)}. ${i.enemy ? i.enemy.size[0] + ' to ' + i.enemy.size[1] + ' enemy, ' + esc(i.enemy.act) + '.' : ''}`} You are reading this ${F.dur(W.t - i.tEvent)} after it happened.</p><div class="kv"><b>S3 recommends: ${{ qrf: 'launch the QRF', break: 'break contact', hold: 'hold', monitor: 'keep monitoring' }[i.rec.k]}.</b> ${esc(i.rec.why)}</div><div class="row">${i.opts.map(o => `<button class="btn sm${o.k === i.rec.k ? ' pri' : ''}" data-a="dec:${i.id}:${o.k}"${o.ok ? '' : ' disabled title="' + esc(o.why) + '"'}>${esc(o.label)}</button>`).join('')}</div><p class="mute sm">If you do nothing, the S3 acts on the recommendation when the window closes.</p></div>`; });
    if (op.status === 'draft') { const E = S.opEdit; if (E.unit == null) { E.unit = op.unit; E.start = op.start; E.qrfReady = false; }
      const hrs = []; for (let k = 1; k <= 30; k++) { const t = Math.ceil(W.t / F.H) * F.H + k * F.H; hrs.push([t, F.clock(t) + (F.isNight(t) ? ' night' : ' day')]); } if (!hrs.some(x => x[0] === E.start)) hrs.unshift([E.start, F.clock(E.start)]);
      h += `<div class="card acc"><div class="hd"><b>${esc(op.name)}</b><span class="tag">Draft from the S3</span></div><p>${esc(op.note)}</p><div class="kv">S4: reserves ${op.res.MRE} meals, ${op.res.WATER} L water and ${op.res.JP8} L fuel, and needs two vehicles. S3: the squad you send comes off its current duty for about six hours.</div>
<div class="row"><label class="f" for="opu">Unit${sel('opu', 'op.unit', ['u1', 'u2', 'u3'].map(id => [id, W.units[id].call + ' (' + roleOf(id) + ')']), E.unit)}</label><label class="f" for="ops">Cross the gate${sel('ops', 'op.start', hrs, E.start)}</label></div>
<label class="ck" for="opq"><input type="checkbox" id="opq" data-c="op.qrfReady"${E.qrfReady ? ' checked' : ''}>Hold the QRF at five minutes' notice for the duration</label><div class="row"><button class="btn pri" data-a="approve">Approve the operation</button></div></div>`; }
    else if (op.status !== 'pending') h += `<div class="card"><div class="hd"><b>${esc(op.name)}</b><span class="tag ${op.status === 'done' ? 'ok' : op.status === 'aborted' ? 'crit' : 'blue'}">${op.status}</span></div><div class="kv">${W.units[op.unit].call}, gate ${F.clock(op.start)}${op.qrfReady ? ', QRF at five minutes' : ''}.${op.why ? ' Delayed: ' + esc(op.why) + '.' : ''}</div></div>`;
    else h += `<div class="card"><div class="kv">The S3 is drafting a reconnaissance operation for your approval. Routine operations are running without you.</div></div>`;
    if (!open.length) h += `<p class="mute sm">No decision is waiting on you. The staff is running patrols, supply and maintenance.</p>`;
    h += '<h2>Your responsibilities</h2>';
    F.RESP.forEach(r => { const st = R[r.id]; h += `<div class="lock${st === 'held' ? ' held' : ''}"><b>${esc(r.name)}</b><span class="tag ${st === 'held' ? 'ok' : ''}">${st === 'held' ? 'yours' : st === 'pending' ? 'coming' : 'not yet'}</span><span>${esc(r.what)}</span></div>`; });
    h += '<p class="mute sm">Taking a responsibility does not switch the staff off. They keep running it inside the standing orders you set.</p>';
    return h;
  }
  const roleOf = id => { const R = W.s3.roles; return R.guard === id ? 'base security' : R.patrol === id ? 'patrols' : 'QRF'; };
  function reports() { return W.hq.log.slice(-150).reverse().map(l => `<div class="ln p${l.prio}"><span class="tm">${F.clock(l.t)}</span><span><span class="fr">${esc(l.from)}</span> <span class="tag">${l.type}</span> ${esc(l.text)}${l.t - l.t0 > 45 ? ` <span class="late">Sent ${F.clockS(l.t0).slice(-7)}, logged ${F.dur(l.t - l.t0)} later by ${l.chan}.</span>` : ''}</span></div>`).join('') || '<p class="mute">No traffic logged yet.</p>'; }
  function units() {
    let h = msg(); const can = W.player.resp.command === 'held';
    for (const id of ['u1', 'u2', 'u3', 'cv']) { const u = W.units[id], k = W.hq.units[id], a = W.t - k.t, od = a > W.so.overdue && k.src !== 'fob';
      h += `<div class="card ${od ? 'crit' : a > 300 ? 'warn' : 'blue'}"><div class="hd"><b>${u.call}</b><span class="tag blue">${id === 'cv' ? 'convoy' : roleOf(id)}</span>${od ? '<span class="tag crit">overdue</span>' : ''}</div><div class="kv">Last known <b>${F.grid(k.pos)}</b>, ${k.src === 'fob' ? 'at the base' : age(k.t) + ' by ' + k.src}${k.veh ? ' (vehicle beacon; the dismounted element is elsewhere)' : ''}.<br>Reported strength <b>${k.str}</b>, ammunition <b>${k.ammo}%</b>, casualties <b>${k.cas || 0}</b>. ${esc(k.status || '')}</div><div class="row"><button class="btn sm" data-a="follow:${id}">Show on map</button>${can && k.src !== 'fob' ? `<button class="btn sm" data-a="recall:${id}">Order return to base</button>` : ''}</div></div>`; }
    return h;
  }
  function staff() {
    const L = W.hq.logstat, q = W.units[W.s3.roles.qrf], p = W.units[W.s3.roles.patrol];
    let h = `<h2>Operations officer</h2><div class="kv">Base security <b>${W.units[W.s3.roles.guard].call}</b> · patrols <b>${p.call}</b> · QRF <b>${q.call}</b>, ${F.dur(F.qrfNTM(W))} notice to move. Next shift change ${F.clock(W.s3.nextRot)}.<br>Next routine patrol ${F.clock(W.s3.nextPatrol)} on the ${W.so.patrolRoute} route, every ${F.dur(W.so.patrolEvery)}.${W.s3.note ? ' <b class="amber">Delayed: ' + esc(W.s3.note) + '.</b>' : ''}</div>`;
    h += `<h2>Logistics officer</h2><div class="kv">${L ? `LOGSTAT ${F.clock(L.t)}: fuel <b>${L.dos.JP8.toFixed(1)}</b> days, water <b>${L.dos.WATER.toFixed(1)}</b>, rations <b>${L.dos.MRE.toFixed(1)}</b>. Reorder below ${W.so.dosReorder}, target ${W.so.dosTarget}.` : 'First LOGSTAT is being compiled.'} ${W.s4.req ? 'A resupply request is with the depot.' : ''}</div>`;
    h += '<h2>Decisions and reasons</h2>' + W.decisions.filter(friendly).slice(-60).reverse().map(d => `<div class="ln"><span class="tm">${F.clock(d.t)}</span><span><span class="fr">${d.actor}</span> ${esc(d.text)}<span class="why">${esc(d.why)}</span></span></div>`).join('');
    return h;
  }
  function logistics() {
    const L = W.hq.logstat; if (!L) return '<p class="mute">First LOGSTAT is being compiled.</p>'; const T = F.TYPES, C = W.hq.convoy, P = W.fob.project;
    let h = `<p class="mute sm">As counted by the S4 at ${F.clock(L.t)} for ${L.pax} personnel. Not live.</p><div class="tw"><table><thead><tr><th>Class</th><th>Item</th><th>On hand</th><th>Per day</th><th>Days</th></tr></thead><tbody>`;
    for (const ty of ['JP8', 'WATER', 'MRE', 'A556', 'A556L', 'A762L', 'PARTS', 'CL4']) h += `<tr><td>${T[ty].cls}</td><td>${T[ty].name}</td><td>${n0(L.on[ty])} ${T[ty].unit}</td><td>${L.rates[ty] ? n0(L.rates[ty]) : ''}</td><td class="${L.dos[ty] != null && L.dos[ty] < W.so.dosReorder ? 'bad' : ''}">${L.dos[ty] != null ? L.dos[ty].toFixed(1) : ''}</td></tr>`;
    h += '</tbody></table></div><h2>Convoy</h2>';
    h += C ? `<div class="kv">PACKHORSE ${esc(C.state)} as of ${F.clock(C.t)}. Manifest: ${Object.keys(C.manifest).map(ty => n0(C.manifest[ty]) + ' ' + T[ty].unit + ' ' + T[ty].name).join(', ')}.</div>` : `<div class="kv">No convoy reported. ${W.s4.req ? 'Request sent ' + F.clock(W.s4.req.t) + '.' : 'Next routine request at ' + F.p2(W.so.logpacHour) + '00.'}</div>`;
    h += '<h2>Vehicles</h2><div class="tw"><table><thead><tr><th>Vehicle</th><th>Status</th><th>Fuel</th><th>Condition</th><th>Since service</th></tr></thead><tbody>' + L.veh.map(v => `<tr><td>${v.name}</td><td>${v.status === 'service' ? '<b class="amber">maintenance bay</b>' : v.unit ? 'out with ' + W.units[v.unit].call : 'on the line'}</td><td>${v.unit ? 'as dispatched' : v.fuel + ' L'}</td><td>${v.cond}%</td><td>${v.kmSvc} km</td></tr>`).join('') + '</tbody></table></div>';
    h += `<h2>Construction</h2><div class="kv">${esc(P.name)}: <b>${Math.round(P.doneH / P.needH * 100)}%</b>${P.done ? ', complete' : P.stalled ? ', <b class="bad">stalled for barrier material</b>' : ''}. Four soldiers from the QRF squad work on it 0800 to 1600 while the work detail order stands.</div>`;
    return h;
  }
  const SO = { patrolRoute: ['Patrol route', [['full', 'Full loop, including the ridge road'], ['short', 'Two short legs, avoiding the ridge road']]], patrolEvery: ['Routine patrol every', [[7200, '2 hours'], [10800, '3 hours'], [14400, '4 hours'], [21600, '6 hours']]], qrfNTM: ['QRF notice to move', [[300, '5 minutes'], [600, '10 minutes'], [900, '15 minutes'], [1800, '30 minutes']]], overdue: ['Unit is overdue after', [[900, '15 minutes'], [1500, '25 minutes'], [2700, '45 minutes']]], varyRoute: ['Alternate patrol direction', [[false, 'No'], [true, 'Yes']]],
    dosTarget: ['Days of supply to hold', [[4, '4'], [6, '6'], [8, '8']]], dosReorder: ['Emergency reorder below', [[2, '2 days'], [3, '3 days'], [4, '4 days']]], logpacHour: ['Daily LOGPAC request at', [[5, '0500'], [12, '1200'], [20, '2000']]], reserveQrfVeh: ['Hold two vehicles for the QRF', [[true, 'Yes'], [false, 'No']]], maintFirst: ['Service vehicles even when short', [[false, 'No'], [true, 'Yes']]], workDetail: ['QRF squad provides the work detail', [[true, 'Yes'], [false, 'No']]],
    incidentWindow: ['Your window to decide an incident', [[90, '90 seconds'], [180, '3 minutes'], [420, '7 minutes']]], roe: ['Rules of engagement', [['engage', 'Engage identified armed enemy'], ['return', 'Return fire only']]] };
  function orders() {
    let h = msg() + '<p class="mute sm">Standing orders are what the staff works inside. Change them and the organisation changes how it runs; nothing here is a one-off command.</p>';
    F.RESP.filter(r => r.keys).forEach(r => { const held = W.player.resp[r.id] === 'held'; h += `<h2>${esc(r.name)}${held ? '' : ' <span class="tag">not yet yours</span>'}</h2>`; r.keys.forEach(k => { h += `<div class="num"><label for="so_${k}">${SO[k][0]}</label>${held ? sel('so_' + k, 'so.' + k, SO[k][1], W.so[k] == null ? false : W.so[k]) : `<b>${esc((SO[k][1].find(o => String(o[0]) === String(W.so[k] == null ? false : W.so[k])) || ['', W.so[k]])[1])}</b>`}</div>`; }); });
    return h;
  }

  /* ---------- observer panels: the world itself ---------- */
  function world() {
    let h = `<p class="mute sm">Everything here is ground truth. The commander does not have it.</p><div class="row"><label class="ck" for="lnk"><input type="checkbox" id="lnk" data-c="ui.links"${UI.showLinks ? ' checked' : ''}>Draw each unit's link to the base</label></div>`;
    const st = W.stats; h += `<div class="kv">Friendly: <b>${st.blueKia} killed, ${st.blueWia} wounded</b>. Enemy: <b>${st.redKia} killed, ${st.redWia} wounded</b>. Convoy deliveries <b>${st.deliveries}</b>. Enemy replacements still available outside the area: ${W.redPool}.</div>`;
    for (const id in W.units) { const u = W.units[id]; if (u.kind === 'hq' || u.kind === 'support') continue; const ok = F.unitOk(W, u).length, blue = u.side === 'blue', l = blue ? F.link(W, u) : null;
      h += `<div class="card ${u.con ? 'crit' : blue ? 'blue' : 'red'}"><div class="hd"><b>${esc(blue ? u.call : u.name)}</b>${u.con ? '<span class="tag crit">in contact</span>' : ''}${blue ? `<span class="tag ${l ? 'ok' : 'crit'}">${l ? 'link: ' + l : 'no comms'}</span>` : `<span class="tag">${u.st}${u.mode && u.st !== 'base' ? ' → ' + u.mode : ''}</span>`}</div><div class="kv">${F.grid(u.pos)} · <b>${ok}</b> of ${u.members.filter(m => !W.soldiers[m].evac).length} effective · ${blue ? 'ammunition ' + F.ammoPct(W, u) + '% · ' + esc(u.task) + (u.plan && u.plan[u.pi] ? ' · step: ' + u.plan[u.pi].k : '') : `${u.kb.sight.length} sightings logged · tracking ${F.fresh(W, u, 90).length}`}${u.vehicles.length ? ' · ' + u.vehicles.join(', ') : ''}</div><div class="row"><button class="btn sm" data-a="follow:${id}">Follow</button></div></div>`; }
    h += '<h2>Enemy reasoning</h2>' + (W.decisions.filter(d => !friendly(d)).slice(-12).reverse().map(d => `<div class="ln"><span class="tm">${F.clock(d.t)}</span><span><span class="fr">${esc(d.actor)}</span> ${esc(d.text)}<span class="why">${esc(d.why)}</span></span></div>`).join('') || '<p class="mute">Nothing yet.</p>');
    return h;
  }
  function inv() {
    const T = F.TYPES, a = F.audit(W); let h = '<h2>Conservation audit</h2><div class="tw"><table><thead><tr><th>Item</th><th>Initial</th><th>On hand</th><th>Used</th><th>Lost</th><th>Unaccounted</th></tr></thead><tbody>';
    for (const ty in a) h += `<tr><td>${T[ty].name}</td><td>${n0(a[ty].initial)}</td><td>${n0(a[ty].onHand)}</td><td>${n0(a[ty].used)}</td><td>${n0(a[ty].lost + a[ty].expired)}</td><td class="${Math.abs(a[ty].delta) > 1e-3 ? 'bad' : 'good'}">${a[ty].delta.toFixed(3)}</td></tr>`;
    h += '</tbody></table></div><h2>Where it went</h2><div class="kv">' + Object.keys(W.ledger.why).sort().map(k => { const p = k.split(':'); return `${T[p[0]].name}, ${p[1]}: <b>${n0(W.ledger.why[k])} ${T[p[0]].unit}</b>`; }).join('<br>') + '</div>';
    const grp = { fob: 'FOB Kestrel', depot: 'RSA Dakota' };
    for (const g of ['fob', 'depot', 'veh', 'enemy']) { h += `<h2>${grp[g] || (g === 'veh' ? 'Vehicles' : 'Enemy caches')}</h2><div class="tw"><table><thead><tr><th>Store</th><th>Contents</th><th>Capacity</th></tr></thead><tbody>`;
      for (const id in W.stores) { const s = W.stores[id], k = s.at === 'fob' ? 'fob' : s.at === 'depot' ? 'depot' : s.kind === 'cache' ? 'enemy' : 'veh'; if (k !== g) continue; const c = {}; s.lots.forEach(l => { c[l.ty] = (c[l.ty] || 0) + l.q; });
        h += `<tr><td>${esc(s.name)}${F.reserved(s, 'MRE') + F.reserved(s, 'WATER') + F.reserved(s, 'JP8') > 0 ? ' <span class="tag">reserved stock</span>' : ''}</td><td>${Object.keys(c).map(ty => `${n0(c[ty])} ${T[ty].unit} ${T[ty].name}`).join('<br>') || '<span class="mute">empty</span>'}</td><td>${s.capL != null ? n0(F.litres(s)) + ' / ' + n0(s.capL) + ' L' : n0(F.kgOf(s)) + ' / ' + n0(s.capKg) + ' kg'}${s.kind === 'tank' && s.at === 'fob' && s.accepts[0] === 'JP8' ? '<br><span class="mute">sampled ' + F.clock(s.inspectedAt) + '</span>' : ''}</td></tr>`; }
      h += '</tbody></table></div>'; }
    h += '<h2>Carried by soldiers</h2><div class="tw"><table><thead><tr><th>Unit</th><th>Ammunition</th><th>Rations</th><th>Water</th></tr></thead><tbody>';
    for (const id in W.units) { const u = W.units[id]; const c = {}; u.members.forEach(m => { const x = W.soldiers[m].carry; for (const ty in x) c[ty] = (c[ty] || 0) + x[ty]; }); h += `<tr><td>${esc(u.name)}</td><td>${['A556', 'A556L', 'E762', 'ERPG'].filter(t => c[t]).map(t => n0(c[t]) + ' ' + T[t].name).join(', ')}</td><td>${n0(c.MRE || 0)}</td><td>${(c.WATER || 0).toFixed(1)} L</td></tr>`; }
    return h + '</tbody></table></div>';
  }
  function events() {
    const flt = [['all', 'All'], ['fight', 'Combat'], ['log', 'Logistics'], ['comms', 'Comms'], ['enemy', 'Enemy']], G = { fight: ['contact', 'ambush', 'casualty', 'break', 'contact-end', 'qrf', 'vehicle-hit', 'casevac'], log: ['delivery', 'convoy-sp', 'rearm', 'service', 'breakdown', 'repair', 'halt', 'construction', 'power', 'water', 'expiry', 'mission-end'], comms: ['hq-recv', 'no-comms', 'order-recv'], enemy: ['enemy-sighting', 'enemy-withdraw', 'enemy-resupply', 'enemy-reinforce', 'ambush'] };
    const by = {}; W.events.forEach(e => { by[e.id] = e; }); W.decisions.forEach(d => { by[d.id] = { text: d.actor + ': ' + d.text, t: d.t }; });
    let h = `<div class="chips">${flt.map(f => `<button class="chip" data-a="evf:${f[0]}" aria-pressed="${S.evFilter === f[0]}">${f[1]}</button>`).join('')}</div>`;
    h += W.events.filter(e => S.evFilter === 'all' || G[S.evFilter].includes(e.type)).slice(-140).reverse().map(e => `<div class="ln"><span class="tm">${F.clockS(e.t).slice(3)}</span><span><span class="tag">${e.type}</span> ${esc(e.text)}${e.cause != null && by[e.cause] ? `<span class="why">because: ${esc(by[e.cause].text)} (${F.clockS(by[e.cause].t).slice(3)})</span>` : ''}</span></div>`).join('');
    return h;
  }
  function know() {
    let h = '<h2>Friendly units: truth against belief</h2><div class="tw"><table><thead><tr><th>Unit</th><th>Actually at</th><th>HQ believes</th><th>Error</th><th>Belief is</th></tr></thead><tbody>';
    for (const id of ['u1', 'u2', 'u3', 'cv']) { const u = W.units[id], k = W.hq.units[id], e = F.dist(u.pos, k.pos); h += `<tr><td>${u.call}</td><td>${F.grid(u.pos)}</td><td>${F.grid(k.pos)}</td><td class="${e > 500 ? 'bad' : ''}">${n0(e)} m</td><td>${k.src === 'fob' ? 'live' : F.dur(W.t - k.t) + ' old, ' + k.src}</td></tr>`; }
    h += '</tbody></table></div><h2>Enemy: truth against belief</h2><div class="tw"><table><thead><tr><th>Cell</th><th>Actually</th><th>Nearest HQ track</th></tr></thead><tbody>';
    for (const id of ['e1', 'e2']) { const u = W.units[id]; let b = null, bd = 1e12; W.hq.contacts.forEach(c => { const d = F.dist(c.pos, u.pos); if (d < bd) { bd = d; b = c; } }); h += `<tr><td>${esc(u.name)}</td><td>${F.unitOk(W, u).length} at ${F.grid(u.pos)}, ${u.st}</td><td>${b ? `${b.id}: ${b.size[0]}–${b.size[1]} at ${F.grid(b.pos)}, ${F.dur(W.t - b.t)} old, ${n0(bd)} m off` : '<span class="mute">HQ has no track</span>'}</td></tr>`; }
    h += '</tbody></table></div><h2>Messages in transit</h2>';
    const m = W.msgs.filter(x => x.state !== 'done'); h += m.length ? m.map(x => `<div class="ln"><span class="tm">${F.clockS(x.t0).slice(3)}</span><span><span class="fr">${esc(W.units[x.from] ? W.units[x.from].call : x.from)} → ${esc(W.units[x.to] ? W.units[x.to].call : x.to)}</span> <span class="tag">${x.type}</span> ${x.state === 'q' ? `<b class="bad">no link, ${x.tries} tries</b>` : `by ${x.chan}, arrives in ${Math.max(0, x.tArr - W.t)} s`}<span class="why">${esc(x.text || '')}</span></span></div>`).join('') : '<p class="mute">Nothing in the air.</p>';
    return h;
  }
  const PAN = { tasks, reports, units, staff, log: logistics, orders, world, inv, events, know };

  /* ---------- shell ---------- */
  function renderTop() {
    const night = F.isNight(W.t); if (document.documentElement.dataset.phase !== (night ? 'night' : 'day')) { document.documentElement.dataset.phase = night ? 'night' : 'day'; setTimeout(UI.readColors, 50); setTimeout(UI.readColors, 1400); }
    $('clock').textContent = F.clockS(W.t);
    document.querySelectorAll('#speed button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v === S.speed)));
    document.querySelectorAll('#mode button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.mode)));
    document.body.dataset.mode = S.mode; const open = W.incidents.filter(i => i.status === 'open').length, draft = W.ops[0].status === 'draft';
    $('tabs').innerHTML = TABS[S.mode].map(t => `<button data-a="tab:${t[0]}" aria-current="${S.tab[S.mode] === t[0]}">${t[1]}${t[0] === 'tasks' && (open || draft) ? `<span class="badge">${open + (draft ? 1 : 0)}</span>` : ''}</button>`).join('');
    $('alert').innerHTML = S.mode === 'observer' && (open || draft) ? `<button class="btn sm hot" data-a="mode:command">The commander has ${open + (draft ? 1 : 0)} item${open + (draft ? 1 : 0) > 1 ? 's' : ''} waiting</button>` : '';
  }
  function renderPanel(force) { const ae = document.activeElement; if (!force && ae && (ae.tagName === 'SELECT' || ae.tagName === 'INPUT')) return; const p = $('panel'), sc = p.scrollTop; p.innerHTML = PAN[S.tab[S.mode]](); p.scrollTop = sc; }
  function res(r, ok) { S.msg = r.ok ? { ok: true, text: ok } : { text: r.err || 'That did not work.' }; }
  function act(a, p, q) {
    S.msg = null;
    switch (a) {
      case 'speed': S.speed = +p; break;
      case 'mode': S.mode = p; UI.cam.follow = null; break;
      case 'tab': S.tab[S.mode] = p; $('panel').scrollTop = 0; break;
      case 'dec': res(F.cmd.decide(W, p, q), 'Decision passed to the S3.'); break;
      case 'approve': { const r = F.cmd.approveOp(W, 'op1', S.opEdit); res(r, 'Operation approved. The S3 will launch it and the S4 has reserved its supplies.'); break; }
      case 'recall': res(F.cmd.recall(W, p), 'Order sent. It takes effect when it reaches them.'); break;
      case 'follow': { UI.sel = p; UI.cam.follow = p; if (UI.cam.s < 0.25) UI.cam.s = 0.5; break; }
      case 'jump': { UI.cam.follow = null; const N = W.map.nodes; if (p === 'ao') UI.look({ x: 10000, y: 7000 }, Math.min(0.05, UI.cam.s)); else if (p === 'fob') UI.look(N.fob, 2.6); else if (p === 'depot') UI.look(N.depot, 1.5); else if (p === 'fight') { const u = Object.values(W.units).find(x => x.con); const i = W.incidents.filter(x => x.kind === 'contact').slice(-1)[0]; if (S.mode === 'observer' && u) { UI.look(u.pos, 0.7); UI.cam.follow = u.id; } else if (i) UI.look(i.pos, 0.2); else S.msg = { text: S.mode === 'observer' ? 'Nobody is in contact right now.' : 'No contact has been reported.' }; } break; }
      case 'zoom': UI.zoomBy(+p); break;
      case 'evf': S.evFilter = p; break;
      case 'save': try { localStorage.setItem(KEY, F.save(W)); S.msg = { ok: true, text: 'Saved in this browser at ' + F.clock(W.t) + '.' }; } catch (e) { S.msg = { text: 'This browser would not store the save.' }; } break;
      case 'load': try { const s = localStorage.getItem(KEY); if (s) { W = F.load(s); W.fx = []; S.msg = { ok: true, text: 'Loaded the save from ' + F.clock(W.t) + '.' }; } else S.msg = { text: 'There is no save in this browser.' }; } catch (e) { S.msg = { text: 'The save could not be read.' }; } break;
      case 'new': W = F.create((Date.now() % 2147483000) | 1); S.opEdit = {}; S.msg = { ok: true, text: 'New scenario started.' }; break;
    }
    renderTop(); renderPanel(true);
  }
  function chg(k, v, el) {
    if (k.indexOf('op.') === 0) { const f = k.slice(3); S.opEdit[f] = f === 'qrfReady' ? el.checked : f === 'start' ? +v : v; }
    else if (k.indexOf('so.') === 0) { const key = k.slice(3), val = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v; res(F.cmd.setSO(W, key, val), 'Standing order changed. The staff will work to it from now on.'); }
    else if (k === 'ui.links') UI.showLinks = el.checked;
    renderPanel(true);
  }
  UI.onMapClick = (p, r) => { let best = null, bd = r; for (const id in W.units) { const u = W.units[id]; if (u.kind === 'hq' || u.kind === 'support') continue; const q = S.mode === 'observer' ? u.pos : (W.hq.units[id] && W.hq.units[id].pos); if (!q) continue; const d = F.dist(p, q); if (d < bd) { bd = d; best = id; } } UI.sel = best; };
  let last = 0, lastPanel = 0;
  function frame(ts) {
    const dt = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
    if (S.speed > 0) { S.acc += S.speed * dt; let n = Math.min(900, Math.floor(S.acc)); S.acc -= n; while (n-- > 0) F.step(W); }
    UI.draw(W, S.mode === 'observer');
    if (ts - lastPanel > 500) { lastPanel = ts; renderTop(); renderPanel(false); }
    requestAnimationFrame(frame);
  }
  function start(data) {
    W = data && data.W && data.W.v === 1 ? data.W : F.create((Date.now() % 2147483000) | 1); W.fx = W.fx || [];
    UI.initMap($('map')); UI.look({ x: 10000, y: 7000 }, Math.min(0.06, $('map').getBoundingClientRect().width / 21000));
    document.addEventListener('click', e => { const t = e.target.closest('[data-a]'); if (!t || t.disabled) return; const a = t.dataset.a.split(':'); act(a[0], a[1], a[2]); });
    document.addEventListener('change', e => { const t = e.target.closest('[data-c]'); if (t) chg(t.dataset.c, t.value, t); });
    if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ W: JSON.parse(F.save(W)) }));
    renderTop(); renderPanel(true); requestAnimationFrame(frame);
  }
  UI.world = () => W; UI.act = act;
  const hot = window.claude && window.claude.hot; if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
})();
