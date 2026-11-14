'use strict';
/* Operations page: pick a scenario, write the plan on the map, then run it from the command post.
   Command panels read only the command post's knowledge (W.hq) and the plan the player wrote;
   the observer view and the after-action review read the world itself. */
(function () {
  const F = globalThis.FOB, UI = F.ui, KEY = 'fob-manager-op-save-v1';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let W = null; const S = { mode: 'command', tab: { command: 'plan', observer: 'world' }, speed: 0, acc: 0, msg: null, selEl: null, grab: null, evFilter: 'all' };
  const TABS = { command: [['plan', 'Plan'], ['reports', 'Reports'], ['review', 'Review']], observer: [['world', 'World'], ['events', 'Events'], ['know', 'Knowledge']] };
  const msg = () => S.msg ? `<div class="msg${S.msg.ok ? ' ok' : ''}" role="status">${esc(S.msg.text)}</div>` : '';
  const sel = (id, key, opts, cur) => `<select id="${id}" data-c="${key}">${opts.map(o => `<option value="${o[0]}"${String(o[0]) === String(cur) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
  const ELCOL = ['friend', 'accent', 'ok', 'el4'];
  const elIds = () => Object.keys(W.op.plan.els);
  const colOf = id => UI.col[ELCOL[elIds().indexOf(id) % ELCOL.length]];
  const LEGNAME = { load: 'Load at the FOB', drive: 'Drive', hide: 'Wait in the hide', ride: 'Ride', move: 'Move', await: 'Wait', sbf: 'Support by fire', block: 'Block', assault: 'Assault' };
  const PACENAME = [['stealth', 'Stealth, 0.6 m/s'], ['patrol', 'Patrol, 1.15 m/s'], ['rush', 'Rush, 1.8 m/s']];
  const hOff = s => (s < 0 ? 'H−' : 'H+') + F.dur(Math.abs(s));

  /* ---------- describing the plan ---------- */
  function condText(c) { if (c.code) return 'on ' + c.code; if (c.h != null) return 'at ' + hOff(c.h) + ' (' + F.clock(W.op.h + c.h).slice(3) + ')'; if (c.compromise) return 'if compromised'; if (c.peer) return `when ${W.units[c.peer].call} reports ${c.phase}`; return '?'; }
  const conds = cs => cs.map(condText).join(', or ');
  function legLine(id, L, li, est) {
    const edit = W.op.status === 'planning', e = est[li], hide = W.map.nodes[W.op.plan.hide].name;
    let what = LEGNAME[L.k] || L.k, detail = '';
    if (L.k === 'drive') detail = 'to ' + (L.to === 'hide' ? hide : W.map.nodes[L.to].name);
    else if (L.k === 'ride') detail = `with ${W.units[L.carrier].call}, off at ${L.off === 'hide' ? hide : W.map.nodes[L.off].name}`;
    else if (L.k === 'hide' || L.k === 'load') detail = 'until ' + L.riders.map(r => W.units[r].call).join(', ') + ' are aboard';
    else if (L.k === 'await') detail = `(${esc(L.name)}): go ${conds(L.until)}`;
    else if (L.k === 'sbf') detail = `${L.name}: open fire ${conds(L.open)}; lift ${conds(L.until)}`;
    else if (L.k === 'block') detail = `${L.name}: hold ${conds(L.until).replace(/^on /, 'until ').replace(/^at /, 'until ').replace(/^when /, 'until ')}`;
    else if (L.k === 'assault') detail = `${W.op.obj.name}: silent until compromised, then fight through, then search`;
    else if (L.k === 'move') detail = 'to ' + L.name;
    let h = `<div class="num"><span><b>${what}</b> ${detail}${L.exfil ? ' <span class="tag">exfil</span>' : ''}${e && e.dist ? ` <span class="mute sm">${(e.dist / 1000).toFixed(1)} km, about ${F.dur(e.secs)}</span>` : ''}</span>`;
    if (edit && L.pts && L.pace) h += sel(`pace_${id}_${li}`, `pace:${id}:${li}`, PACENAME, L.pace);
    if (edit && L.pts && !L.pts.every(p => p.node)) h += `<span class="row"><button class="btn sm" data-a="addpt:${id}:${li}" title="Add a waypoint on this leg">+ point</button>${L.pts.filter(p => !p.node).length > 1 ? `<button class="btn sm" data-a="rmpt:${id}:${li}" title="Remove the last waypoint">− point</button>` : ''}</span>`;
    const field = L.k === 'await' ? 'until' : L.k === 'sbf' ? 'open' : null;
    if (edit && field && (L.k === 'await' || L[field].some(c => c.h != null) || L.hOff != null)) { const on = L[field].some(c => c.h != null); h += `<label class="ck" for="clk_${id}_${li}"><input type="checkbox" id="clk_${id}_${li}" data-c="clock:${id}:${li}:${field}"${on ? ' checked' : ''}>Also go on the clock</label>`; }
    return h + '</div>';
  }

  /* ---------- command panels ---------- */
  function menu() {
    let h = '<h2>Choose an operation</h2><p class="mute sm">Each operation runs on the same simulation: individual soldiers, line of sight, radio range, real ammunition. You write the plan and run it from the command post; the element leaders carry it out as they understand it.</p>';
    for (const id of Object.keys(F.SCENARIOS).sort((a, b) => (F.SCENARIOS[b].kind === 'compound') - (F.SCENARIOS[a].kind === 'compound'))) { const s = F.SCENARIOS[id]; h += `<div class="card acc"><div class="hd"><b>${esc(s.name)}</b><span class="tag">${esc(s.scale)}</span></div><p>${esc(s.brief)}</p><div class="kv">Planning begins ${F.clock(s.start)}.${s.kind === 'compound' ? ' The plan starts empty: you decide how the force gets in, then each team\'s way in and rooms, the perimeter and the timing.' : ' Suggested H-hour ' + F.clock(s.h) + '.'}</div><div class="row"><button class="btn pri" data-a="start:${id}">Plan this operation</button></div></div>`; }
    h += '<p class="mute sm">The living base from the earlier slice is still in <a href="index.html">index.html</a>.</p>';
    return h;
  }
  function plan() {
    if (!W) return menu();
    const O = W.op, P = O.plan; let h = msg();
    if (O.kind === 'compound' && O.status === 'planning') return UI.cq.plan(W, h);
    if (O.kind === 'compound' && O.status === 'running') return h + UI.cq.running(W, logLine);
    if (O.kind === 'compound') return h + `<div class="card ${O.outcome.success ? 'blue' : 'crit'}"><div class="hd"><b>${esc(O.name)}</b><span class="tag">complete</span></div><p>All elements are back. The debrief is in the Review tab.</p><div class="row"><button class="btn pri" data-a="tab:review">Open the review</button><button class="btn" data-a="start:${O.id}">Plan it again</button></div></div>`;
    if (O.status === 'planning') {
      const sc = F.SCENARIOS[O.id];
      h += `<div class="card acc"><div class="hd"><b>${esc(O.name)}</b><span class="tag">planning</span></div><p>${esc(sc.brief)}</p><p class="mute sm">Drag the square waypoints on the map to change routes and positions. The clock is stopped while you plan.</p></div>`;
      const slots = []; for (let k = 1; k <= 16; k++) slots.push(W.t + k * 900); const hs = []; for (let k = 2; k <= 36; k++) hs.push(W.t + k * 900);
      h += `<h2>Timings and vehicles</h2><div class="row"><label class="f" for="sp">Start point (leave the FOB)${sel('sp', 'sp', slots.map(t => [t, F.clock(t)]), P.sp)}</label><label class="f" for="hh">H-hour${sel('hh', 'h', hs.map(t => [t, F.clock(t) + (F.isNight(t) ? ' night' : ' day')]), O.h)}</label><label class="f" for="hide">Vehicles drop and wait at${sel('hide', 'hide', [['bend', 'Orchard bend (2.3 km from Sarak)'], ['vdo', 'Wadi crossing (4.6 km, behind Hill 611)']], P.hide)}</label></div>`;
      h += `<p class="mute sm">Code words travel by radio: an element only acts on one once the message has reached it. Dismounted FM reaches about 6 km to the FOB mast and needs line of sight, or a relay through vehicles within 5 km. Elements with a manpack satellite radio can use it once halted for a minute.</p>`;
    } else if (O.status === 'running') {
      h += codeBoard();
    } else h += `<div class="card ${O.outcome.success ? 'blue' : 'crit'}"><div class="hd"><b>${esc(O.name)}</b><span class="tag">complete</span></div><p>All elements are back. The debrief is in the Review tab.</p><div class="row"><button class="btn pri" data-a="tab:review">Open the review</button><button class="btn" data-a="start:${O.id}">Plan it again</button></div></div>`;
    h += '<h2>Elements</h2>';
    for (const id of elIds()) {
      const u = W.units[id], k = W.hq.units[id], E = W.hq.el[id] || {}, est = F.opEstimate(W, id), arms = {}; u.members.forEach(m => { const w = W.soldiers[m].weapon; arms[w] = (arms[w] || 0) + 1; });
      h += `<div class="card ${S.selEl === id ? 'acc' : 'blue'}" style="border-left-color:${colOf(id)}"><div class="hd"><b>${u.call}</b><span>${esc(u.name)}</span><span class="tag">${u.members.length} soldiers</span>${u.vehicles.length ? `<span class="tag">${u.vehicles.length} vehicles</span>` : ''}${u.tacsat ? '<span class="tag">manpack satcom</span>' : ''}</div>`;
      if (O.status !== 'planning') { const age = W.t - k.t; h += `<div class="kv">Last report: <b>${esc(E.phase || k.status || '')}</b>${E.t ? ' (' + F.clock(E.t).slice(3) + ')' : ''}. Position known ${k.src === 'fob' ? 'at the FOB' : F.dur(age) + ' ago by ' + k.src}. Strength <b>${k.str}</b>, ammunition <b>${k.ammo}%</b>, casualties <b>${k.cas || 0}</b>.${E.contact ? ' <b class="bad">Reported in contact ' + F.clock(E.contact).slice(3) + '.</b>' : ''}</div>`; }
      else h += `<div class="kv">${Object.keys(arms).map(w => arms[w] + ' × ' + w).join(', ')}</div>`;
      if (O.status === 'planning' || S.selEl === id) h += P.els[id].map((L, li) => legLine(id, L, li, est)).join('');
      h += `<div class="row"><button class="btn sm" data-a="selel:${id}">${S.selEl === id ? 'Hide route detail' : O.status === 'planning' ? 'Highlight on map' : 'Show the plan'}</button></div></div>`;
    }
    if (O.status === 'planning') h += `<div class="row"><button class="btn pri" data-a="launch">Approve the plan and start the clock</button></div><p class="mute sm">If you never call a code word, the elements go on the clock times in the plan. Untick "also go on the clock" to make a step wait for your code word only.</p>`;
    return h;
  }
  function codeBoard() {
    const O = W.op; let h = '<h2>Code words</h2><div class="kv">Called codes go to every element by radio. ';
    h += O.h > W.t ? `H-hour is ${F.clock(O.h)}, in ${F.dur(O.h - W.t)}.` : `H-hour was ${F.clock(O.h)}.`; h += '</div>';
    for (const c of F.CODES) {
      const uses = []; for (const id of elIds()) O.plan.els[id].forEach(L => { for (const f of ['until', 'open']) if (L[f] && L[f].some(x => x.code === c)) uses.push(`${W.units[id].call}: ${L.k === 'await' ? L.name : f === 'open' ? 'open fire' : L.k === 'block' ? 'leave the blocking position' : 'lift fire'}`); });
      if (!uses.length) continue; const t = O.called[c];
      h += `<div class="num"><span><b>${c}</b> ${uses.map(esc).join('; ')}${t ? ` <span class="tag ok">called ${F.clock(t).slice(3)}</span>` : ''}</span><button class="btn sm${t ? '' : ' pri'}" data-a="code:${c}"${t ? ' disabled' : ''}>Call ${c}</button></div>`;
    }
    const hv = W.hq.hvt; h += `<div class="kv">Target: <b>${hv ? { captured: 'detained', killed: 'reported killed', absent: 'not on the objective' }[hv.state] + ' (' + hv.from + ', ' + F.clock(hv.t).slice(3) + ')' : 'no report'}</b>. Objective: <b>${W.hq.secure ? 'secure (' + F.clock(W.hq.secure.t).slice(3) + ')' : 'not reported secure'}</b>.</div>`;
    h += `<div class="row"><button class="btn sm" data-a="abort"${O.aborted ? ' disabled' : ''}>${O.aborted ? 'Abort ordered ' + F.clock(O.aborted).slice(3) : 'Abort the operation'}</button></div>`;
    h += '<h2>Latest traffic</h2>' + W.hq.log.slice(-6).reverse().map(logLine).join('');
    return h;
  }
  const logLine = l => `<div class="ln p${l.prio}"><span class="tm">${F.clock(l.t).slice(3)}</span><span><span class="fr">${esc(l.from)}</span> <span class="tag">${l.type}</span> ${esc(l.text)}${l.t - l.t0 > 45 ? ` <span class="late">Sent ${F.clockS(l.t0).slice(-7)}, logged ${F.dur(l.t - l.t0)} later by ${l.chan}.</span>` : ''}</span></div>`;
  function reports() { if (!W) return menu(); return W.hq.log.slice(-200).reverse().map(logLine).join('') || '<p class="mute">No traffic logged yet.</p>'; }
  function review() {
    if (!W) return menu(); const O = W.op;
    if (O.status !== 'complete') return '<p class="mute">The review opens when the operation is over and every element is back.</p>';
    const R = O.outcome, believed = { captured: 'detained', killed: 'killed', absent: 'not on the objective', unknown: 'no report' }[R.believed];
    let h = O.kind === 'compound' ? UI.cq.reviewHead(W) : `<div class="card ${R.success ? 'blue' : 'crit'}"><div class="hd"><b>${R.success ? 'Mission accomplished' : 'Mission failed'}</b><span class="tag">${F.dur(O.tEnd - O.tLaunch)}</span></div><div class="kv">Target: <b>${esc(R.hvt)}</b>. The command post believed: <b>${believed}</b>.<br>Friendly: <b>${R.blue.kia} killed, ${R.blue.wia} wounded</b>. Enemy: <b>${R.red.kia} killed, ${R.red.wia} wounded</b>, ${R.red.ok} unhurt.<br>${R.alerted ? `The enemy was first alerted ${F.clock(R.alerted.t).slice(3)}: ${esc(R.alerted.text)}.` : 'The enemy was never alerted.'}</div><div class="row"><button class="btn pri" data-a="start:${O.id}">Plan it again</button><button class="btn" data-a="menu">Other operations</button></div></div>`;
    h += '<h2>What happened, and when you heard</h2><p class="mute sm">Ground truth on the left. On the right, the first report the command post logged after it.</p>';
    const key = ['op-launch', 'enemy-alert', 'enemy-armed', 'breach', 'hard-landing', 'detain', 'deny', 'contact', 'casualty', 'capture', 'identify', 'enemy-withdraw', 'break', 'contact-end', 'mission-end', 'op-end'];
    h += '<div class="tw"><table><thead><tr><th>Time</th><th>Truth</th><th>Command post</th></tr></thead><tbody>';
    W.events.filter(e => key.includes(e.type)).forEach(e => { const l = W.hq.log.find(x => x.t >= e.t && x.t0 >= e.t - 2); h += `<tr><td>${F.clockS(e.t).slice(3)}</td><td>${esc(e.text)}</td><td>${l ? `${F.clock(l.t).slice(3)} ${esc(l.from)}: ${esc(l.text)}` : '<span class="mute">nothing</span>'}</td></tr>`; });
    h += '</tbody></table></div><h2>Decisions</h2>' + W.decisions.slice(-80).map(d => `<div class="ln"><span class="tm">${F.clock(d.t).slice(3)}</span><span><span class="fr">${esc(d.actor)}</span> ${esc(d.text)}<span class="why">${esc(d.why)}</span></span></div>`).join('');
    return h;
  }

  /* ---------- observer panels ---------- */
  function world() {
    if (!W) return menu(); let h = '<p class="mute sm">Everything here is ground truth. The command post does not have it.</p>';
    for (const id in W.units) { const u = W.units[id]; if (u.kind === 'hq' || u.side === 'civ') continue; const ok = F.unitOk(W, u).length, blue = u.side === 'blue', l = blue ? F.link(W, u) : null, st = blue && u.plan && u.plan[u.pi];
      h += `<div class="card ${u.con ? 'crit' : blue ? 'blue' : 'red'}"><div class="hd"><b>${esc(blue ? u.call : u.name)}</b>${u.con ? '<span class="tag crit">in contact</span>' : ''}${blue ? `<span class="tag ${l ? 'ok' : 'crit'}">${l ? 'link: ' + l : 'no comms'}</span>` : `<span class="tag">${esc(u.st)}${u.alerted ? ', alerted' : ''}</span>`}</div><div class="kv">${F.grid(u.pos)} · <b>${ok}</b> of ${u.members.length} effective · ${blue ? 'ammunition ' + F.ammoPct(W, u) + '% · ' + esc(u.phase || u.task) + (st ? ' · step: ' + st.k : '') + (u.riding ? ' · riding with ' + W.units[u.riding].call : '') + (u.det && u.det.length ? ' · ' + u.det.length + ' detained' : '') : `${u.role} · tracking ${F.fresh(W, u, 90).length}`}</div><div class="row"><button class="btn sm" data-a="follow:${id}">Follow</button></div></div>`; }
    h += '<h2>Enemy reasoning</h2>' + (W.decisions.filter(d => W.units[Object.keys(W.units).find(k => W.units[k].name === d.actor)] && W.units[Object.keys(W.units).find(k => W.units[k].name === d.actor)].side === 'red').slice(-14).reverse().map(d => `<div class="ln"><span class="tm">${F.clock(d.t).slice(3)}</span><span><span class="fr">${esc(d.actor)}</span> ${esc(d.text)}<span class="why">${esc(d.why)}</span></span></div>`).join('') || '<p class="mute">Nothing yet.</p>');
    return h;
  }
  function events() {
    if (!W) return menu(); const flt = [['all', 'All'], ['fight', 'Combat'], ['comms', 'Comms'], ['enemy', 'Enemy']], G = { fight: ['contact', 'ambush', 'casualty', 'break', 'contact-end', 'capture', 'identify', 'vehicle-hit', 'casevac'], comms: ['hq-recv', 'no-comms', 'order-recv'], enemy: ['enemy-sighting', 'enemy-alert', 'enemy-withdraw'] };
    const by = {}; W.events.forEach(e => { by[e.id] = e; }); W.decisions.forEach(d => { by[d.id] = { text: d.actor + ': ' + d.text, t: d.t }; });
    let h = `<div class="chips">${flt.map(f => `<button class="chip" data-a="evf:${f[0]}" aria-pressed="${S.evFilter === f[0]}">${f[1]}</button>`).join('')}</div>`;
    return h + W.events.filter(e => S.evFilter === 'all' || G[S.evFilter].includes(e.type)).slice(-160).reverse().map(e => `<div class="ln"><span class="tm">${F.clockS(e.t).slice(3)}</span><span><span class="tag">${e.type}</span> ${esc(e.text)}${e.cause != null && by[e.cause] ? `<span class="why">because: ${esc(by[e.cause].text)} (${F.clockS(by[e.cause].t).slice(3)})</span>` : ''}</span></div>`).join('');
  }
  function know() {
    if (!W) return menu(); let h = '<h2>Elements: truth against belief</h2><div class="tw"><table><thead><tr><th>Element</th><th>Actually</th><th>Command post believes</th><th>Error</th></tr></thead><tbody>';
    for (const id of elIds()) { const u = W.units[id], k = W.hq.units[id], E = W.hq.el[id] || {}, e = F.dist(u.pos, k.pos); h += `<tr><td>${u.call}</td><td>${F.grid(u.pos)}, ${F.unitOk(W, u).length} effective, ${esc(u.phase || '')}</td><td>${F.grid(k.pos)}, ${k.str} effective, ${esc(E.phase || k.status || '')} (${F.dur(W.t - k.t)} old)</td><td class="${e > 500 ? 'bad' : ''}">${Math.round(e)} m</td></tr>`; }
    const t = Object.values(W.soldiers).find(s => s.hvt); h += `</tbody></table></div><h2>The target</h2><div class="kv">Actually: <b>${t.state}</b> at ${F.grid(t.pos)}${t.state === 'ok' ? ', ' + Math.round(F.dist(t.pos, W.op.obj)) + ' m from the objective' : ''}. Command post: <b>${W.hq.hvt ? W.hq.hvt.state : 'no report'}</b>.</div><h2>Messages in transit</h2>`;
    const m = W.msgs.filter(x => x.state !== 'done'); h += m.length ? m.map(x => `<div class="ln"><span class="tm">${F.clockS(x.t0).slice(3)}</span><span><span class="fr">${esc(W.units[x.from] ? W.units[x.from].call : x.from)} → ${esc(W.units[x.to] ? W.units[x.to].call : x.to)}</span> <span class="tag">${x.type}</span> ${x.state === 'q' ? `<b class="bad">no link, ${x.tries} tries</b>` : `by ${x.chan}, arrives in ${Math.max(0, x.tArr - W.t)} s`}<span class="why">${esc(x.text || '')}</span></span></div>`).join('') : '<p class="mute">Nothing in the air.</p>';
    return h;
  }
  const PAN = { plan, reports, review, world, events, know };

  /* ---------- map overlay: objective, routes, waypoints ---------- */
  function handles() { // every editable or visible plan point, with the leg it belongs to
    const out = []; for (const id of elIds()) W.op.plan.els[id].forEach((L, li) => (L.pts || []).forEach((p, pi) => { const q = F.opPt(W, p); out.push({ id, li, pi, x: q.x, y: q.y, fixed: !!p.node, L, last: pi === L.pts.length - 1 }); })); return out;
  }
  UI.under = (Wd, truth) => {
    if (!W) return; if (W.op.kind === 'compound') return UI.cq.under(W, truth); const ctx = UI.ctx(), X = UI.X, Y = UI.Y, c = UI.col, O = W.op, s = UI.scale(), planning = O.status === 'planning';
    const ob = O.obj; if (s > 0.3) { ctx.strokeStyle = c.ink; ctx.lineWidth = Math.max(1.5, s * 1.2); ctx.strokeRect(X(ob.x - 22), Y(ob.y + 20), 44 * s, 40 * s); ctx.fillStyle = c.raise; ctx.globalAlpha = 0.6; ctx.fillRect(X(ob.x - 8), Y(ob.y + 10), 18 * s, 14 * s); ctx.globalAlpha = 1; } // the compound wall and the house
    ctx.strokeStyle = c.host; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(X(ob.x), Y(ob.y), Math.max(10, 60 * s), 0, 7); ctx.stroke(); ctx.setLineDash([]); UI.text(ob.name, X(ob.x), Y(ob.y) - Math.max(14, 60 * s) - 4, c.host, '700 13px "Saira Extra Condensed", "Arial Narrow", sans-serif', 'center');
    const hide = W.map.nodes[O.plan.hide]; ctx.strokeStyle = c.friend; ctx.lineWidth = 1.5; ctx.strokeRect(X(hide.x) - 9, Y(hide.y) - 9, 18, 18); UI.text(planning ? 'VEHICLE DROP' : 'VEHICLES', X(hide.x) + 12, Y(hide.y) + 16, c.friend, '9px "B612 Mono", monospace');
    if (truth && !planning) return;
    ctx.globalAlpha = planning ? 1 : 0.45;
    for (const id of elIds()) {
      const legs = O.plan.els[id], col = colOf(id), hi = !S.selEl || S.selEl === id; ctx.strokeStyle = col; ctx.lineWidth = hi ? 2 : 1; ctx.globalAlpha = (planning ? 1 : 0.45) * (hi ? 1 : 0.35);
      const ex = legs.findIndex(L => L.exfil);
      legs.forEach((L, li) => { if (!L.pts) return; L = Object.assign({}, L, { exfil: ex >= 0 && li >= ex }); let a = F.opPrevEnd(W, id, li); ctx.setLineDash(L.exfil ? [2, 5] : L.pace === 'stealth' ? [7, 4] : []); ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.y)); for (const p of L.pts) { const q = F.opPt(W, p); ctx.lineTo(X(q.x), Y(q.y)); a = q; } ctx.stroke(); ctx.setLineDash([]);
        if (!L.exfil && L.name) { const e = F.opLegEnd(W, L); UI.text(`${W.units[id].call} ${L.name.toUpperCase()}`, X(e.x) + 8, Y(e.y) - 6, col, '700 10px "B612 Mono", monospace'); } });
    }
    ctx.globalAlpha = 1;
    if (planning) for (const p of handles()) { if (p.fixed || p.L.exfil && p.L.pts.length === 1 && handles().some(q => q !== p && !q.L.exfil && q.id === p.id && q.x === p.x && q.y === p.y)) continue; const g = S.grab && S.grab.id === p.id && S.grab.li === p.li && S.grab.pi === p.pi; ctx.fillStyle = g ? c.accent : UI.col.map; ctx.strokeStyle = colOf(p.id); ctx.lineWidth = 2; const r = p.last ? 6 : 4.5; ctx.fillRect(X(p.x) - r, Y(p.y) - r, 2 * r, 2 * r); ctx.strokeRect(X(p.x) - r, Y(p.y) - r, 2 * r, 2 * r); }
  };
  UI.onGrab = (p, r) => {
    if (!W || W.op.status !== 'planning' || S.mode !== 'command' || W.op.kind === 'compound') return false; let best = null, bd = r * 1.4;
    for (const h of handles()) { if (h.fixed) continue; const d = F.dist(p, h); if (d < bd) { bd = d; best = h; } }
    if (!best) return false; S.grab = { id: best.id, li: best.li, pi: best.pi }; S.selEl = best.id; return true;
  };
  UI.onGrabMove = p => { if (S.grab) F.opEdit.move(W, S.grab.id, S.grab.li, S.grab.pi, { x: F.clamp(p.x, 0, W.map.w), y: F.clamp(p.y, 0, W.map.h) }); };
  UI.onGrabEnd = () => { S.grab = null; renderPanel(true); };
  UI.onMapClick = (p, r) => { if (!W) return; if (W.op.kind === 'compound' && W.op.status === 'planning' && S.mode === 'command') { if (UI.cq.click(W, p, r)) { S.msg = null; renderPanel(true); } return; } let best = null, bd = r; for (const id in W.units) { const u = W.units[id]; if (u.kind === 'hq') continue; const q = S.mode === 'observer' ? u.pos : (W.hq.units[id] && W.hq.units[id].pos); if (!q) continue; const d = F.dist(p, q); if (d < bd) { bd = d; best = id; } } UI.sel = best; if (best && W.op.plan.els[best]) S.selEl = best; renderPanel(true); };

  /* ---------- shell ---------- */
  function renderTop() {
    const night = W ? F.isNight(W.t) : true; if (document.documentElement.dataset.phase !== (night ? 'night' : 'day')) { document.documentElement.dataset.phase = night ? 'night' : 'day'; setTimeout(UI.readColors, 50); setTimeout(UI.readColors, 1400); }
    $('clock').textContent = W ? F.clockS(W.t) : 'NO OPERATION';
    document.querySelectorAll('#speed button').forEach(b => { b.setAttribute('aria-pressed', String(+b.dataset.v === S.speed)); b.disabled = !W || W.op.status === 'planning' && +b.dataset.v > 0; });
    document.querySelectorAll('#mode button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.mode)));
    document.body.dataset.mode = S.mode;
    $('tabs').innerHTML = TABS[S.mode].map(t => `<button data-a="tab:${t[0]}" aria-current="${S.tab[S.mode] === t[0]}">${t[1]}</button>`).join('');
    $('alert').innerHTML = W && W.op.status === 'complete' && S.tab.command !== 'review' ? '<button class="btn sm hot" data-a="tab:review">Operation over: open the review</button>' : '';
  }
  function renderPanel(force) { const ae = document.activeElement; if (!force && ae && (ae.tagName === 'SELECT' || ae.tagName === 'INPUT')) return; const p = $('panel'), sc = p.scrollTop; p.innerHTML = W || S.mode === 'command' ? PAN[S.tab[S.mode]]() : menu(); p.scrollTop = sc; }
  function res(r, ok) { S.msg = r.ok ? { ok: true, text: ok } : { text: r.err || 'That did not work.' }; }
  function fitPlan() { // frame every planned point, the vehicle drop and the objective
    if (W.op.kind === 'compound') return UI.cq.fit(W);
    const ps = handles().concat([W.op.obj, W.map.nodes[W.op.plan.hide]]), r = $('map').getBoundingClientRect(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; ps.forEach(p => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
    UI.look({ x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, Math.min(0.5, (r.width - 60) / (x1 - x0 + 300), (r.height - 90) / (y1 - y0 + 300)));
  }
  function begin(id) {
    W = F.createOp((Date.now() % 2147483000) | 1, id); if (UI.cq) UI.cq.reset(); S.selEl = null; S.speed = 0; S.mode = 'command'; S.tab.command = 'plan';
    fitPlan(); S.msg = { ok: true, text: 'Planning. The clock is stopped until you approve the plan.' };
  }
  function act(a, p, q, r) {
    S.msg = null;
    switch (a) {
      case 'speed': S.speed = +p; break;
      case 'mode': S.mode = p; UI.cam.follow = null; break;
      case 'tab': S.mode = TABS.command.some(t => t[0] === p) ? 'command' : S.mode; S.tab[S.mode] = p; $('panel').scrollTop = 0; break;
      case 'menu': W = null; S.mode = 'command'; S.tab.command = 'plan'; break;
      case 'start': begin(p); break;
      case 'launch': { const x = F.opCmd.launch(W); res(x, 'Plan approved. The force is getting ready; the clock is running at 30×.'); if (x.ok) S.speed = 30; break; }
      case 'code': res(F.opCmd.code(W, p), `${p} sent. Each element acts on it when the message reaches it.`); break;
      case 'abort': res(F.opCmd.abort(W), 'Abort sent to every element.'); break;
      case 'selel': S.selEl = S.selEl === p ? null : p; break;
      case 'addpt': { const L = W.op.plan.els[p][+q]; F.opEdit.add(W, p, +q, L.pts.length - 1 - (L.pts[L.pts.length - 1].node ? 0 : 0)); S.selEl = p; break; }
      case 'rmpt': { const L = W.op.plan.els[p][+q]; const i = L.pts.length - 1; F.opEdit.remove(W, p, +q, L.pts[i].node ? i - 1 : i); break; }
      case 'follow': { UI.sel = p; UI.cam.follow = p; if (UI.cam.s < 0.25) UI.cam.s = 0.6; break; }
      case 'jump': { UI.cam.follow = null; if (!W) break; if (p === 'ao') UI.look({ x: W.map.w / 2, y: W.map.h / 2 }, Math.min(0.08, $('map').getBoundingClientRect().width / (W.map.w + 500))); else if (p === 'obj') UI.look(W.op.obj, W.op.kind === 'compound' ? 7 : 0.9); else if (p === 'fob') UI.look(W.map.nodes.fob, 2.6); break; }
      case 'zoom': UI.zoomBy(+p); break;
      case 'evf': S.evFilter = p; break;
      case 'cq': UI.cq.act(W, p, q, r); break;
    }
    renderTop(); renderPanel(true);
  }
  function chg(k, v, el) {
    const a = k.split(':');
    if (a[0] === 'cqsp') UI.cq.change(W, 'cqsp', v);
    else if (a[0] === 'sp') F.opEdit.times(W, +v, null); else if (a[0] === 'h') F.opEdit.times(W, null, +v); else if (a[0] === 'hide') F.opEdit.hide(W, v);
    else if (a[0] === 'pace') F.opEdit.pace(W, a[1], +a[2], v); else if (a[0] === 'clock') F.opEdit.clock(W, a[1], +a[2], a[3], el.checked);
    renderPanel(true);
  }
  let last = 0, lastPanel = 0;
  function frame(ts) {
    const dt = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
    if (W && S.speed > 0 && W.op.status !== 'planning') { S.acc += S.speed * dt; let n = Math.min(900, Math.floor(S.acc)); S.acc -= n; while (n-- > 0 && W.op.status !== 'complete') F.step(W); if (W.op.status === 'complete' && S.speed) { S.speed = 0; S.tab.command = 'review'; S.mode = 'command'; renderPanel(true); } }
    if (W) UI.draw(W, S.mode === 'observer'); else { const c = UI.ctx(); if (c) { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = UI.col.map; c.fillRect(0, 0, 4000, 4000); } }
    if (ts - lastPanel > 500) { lastPanel = ts; renderTop(); if (!S.grab) renderPanel(false); }
    requestAnimationFrame(frame);
  }
  function start() {
    UI.initMap($('map'));
    document.addEventListener('click', e => { const t = e.target.closest('[data-a]'); if (!t || t.disabled) return; const a = t.dataset.a.split(':'); act(a[0], a[1], a[2], a[3]); });
    document.addEventListener('change', e => { const t = e.target.closest('[data-c]'); if (t) chg(t.dataset.c, t.value, t); });
    const want = (location.hash || '').slice(1); if (F.SCENARIOS[want]) begin(want);
    renderTop(); renderPanel(true); requestAnimationFrame(frame);
  }
  UI.world = () => W; UI.act = act; F.ui.opsState = S;
  start();
})();
