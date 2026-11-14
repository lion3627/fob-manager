'use strict';
/* Compound raid planning and running. The plan starts empty and the panel only asks the next question:
   how the force gets in, then each team's way in and its rooms, then the perimeter, then the timing.
   Each answer is drawn on the map as soon as it is given. While running, the panel shows only what the
   command post has been told. */
(function () {
  const F = globalThis.FOB, UI = F.ui, Q = UI.cq = {};
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TEAMS = ['t1', 't2', 't3'], TCOL = { t1: 'friend', t2: 'accent', t3: 'ok', p1: 'el4', air: 'mute' };
  const st = Q.state = { ok: {}, floor: 0, open: { intel: true } };
  Q.reset = () => { st.ok = {}; st.floor = 0; st.open = { intel: true }; };
  const cqName = rid => F.CQB.ROOMS[rid].name;
  const doorName = id => F.CQB.DOORS[id].name;
  const roomNo = rid => ['guest', 'h0w', 'h0e', 'h1e', 'h1w'].indexOf(rid) + 1;

  /* ---------- which question is open now ---------- */
  function focus(W) {
    const P = W.op.plan; if (!P.insert) return 'insert';
    for (const id of TEAMS) if (!st.ok[id]) return id;
    if (!P.cordon) return 'cordon'; if (P.together == null || !st.ok.timing) return 'timing'; return 'approve';
  }
  Q.focus = focus;
  const teamDone = (W, id) => { const T = W.op.plan.teams[id]; return T.reserve || (T.rooms.length && (T.entry || W.op.plan.insert === 'yard')); };
  function teamLine(W, id) {
    const T = W.op.plan.teams[id], u = W.units[id];
    if (T.reserve) return `<b>${u.call}</b> stays at the landing zone in reserve.`;
    const wk = F.cqbTeamWalk(W, id), extra = wk.rooms.filter(r => !T.rooms.includes(r));
    return `<b>${u.call}</b> ${T.entry ? `in through the <b>${esc(doorName(T.entry).toLowerCase())}</b> (${T.how === 'explosive' ? 'charge' : 'by hand'})` : 'from the courtyard'}, clearing ${wk.rooms.map(r => `<b>${roomNo(r)}</b> ${esc(cqName(r).toLowerCase())}`).join(', then ') || 'nothing yet'}${extra.length ? ` <span class="mute sm">(${extra.map(r => roomNo(r)).join(', ')} on the way)</span>` : ''}.`;
  }

  /* ---------- planning panel ---------- */
  Q.plan = (W, msg) => {
    const O = W.op, P = O.plan, sc = F.SCENARIOS[O.id], f = focus(W); let h = msg;
    const done = (title, body, a) => `<div class="card blue"><div class="hd"><b>${title}</b><button class="btn sm" data-a="${a}">Change</button></div><div class="kv">${body}</div></div>`;
    h += `<div class="card acc"><div class="hd"><b>${esc(O.name)}</b><span class="tag">planning</span><button class="btn sm" data-a="cq:intel">${st.open.intel ? 'Hide' : 'Show'} the intelligence</button></div><p>${esc(sc.brief)}</p>${st.open.intel ? `<div class="kv">${sc.intel.map(esc).join('<br>')}</div>` : ''}<p class="mute sm">The clock is stopped while you plan. Each answer is drawn on the map. Rooms are numbered on the map: 1 guesthouse, 2 and 3 the ground floor of the house, 4 and 5 the upper floor.</p></div>`;
    /* 1. insertion */
    if (f === 'insert') {
      h += '<h2>1. How does the force get to the compound?</h2><p class="mute sm">Two helicopters carry three assault teams, a perimeter team and an interpreter from FOB Kestrel, 6.5 km away.</p>';
      for (const k in F.INSERTS) { const I = F.INSERTS[k]; h += `<div class="card"><div class="hd"><b>${esc(I.name)}</b></div><p class="sm">${esc(I.note)}</p><div class="row"><button class="btn pri" data-a="cq:insert:${k}">Choose this</button></div></div>`; }
      return h;
    }
    h += done('1. Insertion', esc(F.INSERTS[P.insert].name) + '. ' + `<span class="mute sm">${esc(F.INSERTS[P.insert].note)}</span>`, 'cq:reinsert');
    /* 2. teams */
    for (const id of TEAMS) {
      const u = W.units[id], T = P.teams[id];
      if (st.ok[id]) { h += done('2. ' + u.call, teamLine(W, id), 'cq:reteam:' + id); continue; }
      if (f !== id) continue;
      h += `<h2>2. ${u.call}, ${u.members.length} men: where do they go?</h2>`;
      if (!T.entry && P.insert !== 'yard') {
        h += `<p class="sm">Pick the opening in the outer wall ${u.call} uses: click it on the map, or choose here.</p><div class="chips">${['gate', 'side', 'brE', 'brW'].map(d => `<button class="chip" data-a="cq:entry:${id}:${d}">${esc(doorName(d))}${F.CQB.DOORS[d].kind === 'wall' ? ' (blow a hole)' : ''}</button>`).join('')}</div>`;
        h += `<div class="row"><button class="btn sm" data-a="cq:reserve:${id}">Keep ${u.call} in reserve at the landing zone</button></div>`;
        return h;
      }
      if (!T.entry && P.insert === 'yard') {
        h += `<p class="sm">The aircraft land in the east yard. Pick the door ${u.call} goes through first, on the map or here.</p><div class="chips">${['dF', 'dK', 'inner', 'dG'].map(d => `<button class="chip" data-a="cq:entry:${id}:${d}">${esc(doorName(d))}</button>`).join('')}</div>`;
        h += `<div class="row"><button class="btn sm" data-a="cq:reserve:${id}">Keep ${u.call} in reserve in the courtyard</button></div>`;
        return h;
      }
      const D = F.CQB.DOORS[T.entry];
      h += `<div class="kv">Entry: <b>${esc(D.name)}</b>. <button class="btn sm" data-a="cq:noentry:${id}">Pick another</button></div>`;
      if (D.kind === 'wall') h += '<p class="sm">A wall can only be breached with a charge. The blast wakes the compound.</p>';
      else h += `<p class="sm">How is it opened?</p><div class="chips"><button class="chip" data-a="cq:how:${id}:explosive" aria-pressed="${T.how === 'explosive'}">Breaching charge: 25 seconds to place, certain, and loud</button><button class="chip" data-a="cq:how:${id}:manual" aria-pressed="${T.how === 'manual'}">By hand: quiet${D.locked ? ', but a locked ' + (D.kind === 'gate' ? 'steel gate takes one to two minutes and may not give' : 'door takes up to a minute and may not give') : ', it is not locked'}</button></div>`;
      h += `<p class="sm">Then which rooms, in order? Click them on the map${P.insert ? '' : ''}, or here. Rooms on the way are cleared as the team passes through.</p><div class="chips">${Object.keys(F.CQB.ROOMS).map(r => { const i = T.rooms.indexOf(r); return `<button class="chip" data-a="cq:room:${id}:${r}" aria-pressed="${i >= 0}">${i >= 0 ? (i + 1) + '. ' : ''}${roomNo(r)} ${esc(cqName(r))}</button>`; }).join('')}</div>`;
      h += `<div class="row"><button class="btn sm" data-a="cq:floor:${st.floor ? 0 : 1}">Map clicks pick the ${st.floor ? 'upper' : 'ground'} floor: switch to ${st.floor ? 'ground' : 'upper'}</button></div>`;
      if (T.rooms.length) h += `<div class="kv">${teamLine(W, id)}</div>`;
      const wk = F.cqbTeamWalk(W, id);
      h += `<div class="row"><button class="btn pri" data-a="cq:teamok:${id}"${T.rooms.length && wk.ok ? '' : ' disabled'}>${id === 't3' ? 'Done with the assault teams' : 'Next team'}</button></div>`;
      return h;
    }
    /* 3. perimeter */
    if (f === 'cordon') {
      h += `<h2>3. Where does the perimeter team set?</h2><p class="sm">SPEAR 4 has four men including the interpreter. They keep people from the town away and catch anyone leaving. Pick a side on the map or here.</p><div class="chips">${Object.keys(F.CORDON).map(k => `<button class="chip" data-a="cq:cordon:${k}">${esc(F.CORDON[k].name)}</button>`).join('')}</div>`;
      return h;
    }
    h += done('3. Perimeter', `SPEAR 4 on the ${esc(F.CORDON[P.cordon].name.toLowerCase())}.`, 'cq:recordon');
    /* 4. timing */
    if (f === 'timing') {
      const anyCharge = TEAMS.some(id => P.teams[id].entry && P.teams[id].how === 'explosive');
      h += '<h2>4. Timing and code words</h2>';
      h += `<p class="sm">Breaches:</p><div class="chips"><button class="chip" data-a="cq:together:1" aria-pressed="${P.together === true}">Together: each team sets its charge and waits until every team is set, then all go at once</button><button class="chip" data-a="cq:together:0" aria-pressed="${P.together === false}">Each team goes as soon as it is ready</button></div>${anyCharge ? '' : '<p class="mute sm">Only breaches with a charge wait for the others.</p>'}`;
      h += `<p class="sm">Time on target, from the first team at the wall to everyone heading for the pickup:</p><div class="chips">${[20, 30, 45].map(m => `<button class="chip" data-a="cq:tot:${m}" aria-pressed="${P.tot === m}">${m} minutes</button>`).join('')}</div>`;
      const slots = []; for (let k = 2; k <= 16; k++) slots.push(W.t + k * 900);
      h += `<label class="f" for="cqsp">Wheels up from the FOB <select id="cqsp" data-c="cqsp">${slots.map(t => `<option value="${t}"${t === P.sp ? ' selected' : ''}>${F.clock(t)}${F.isNight(t + F.cqbFlight(W)) ? '' : ' (arrives in daylight)'}</option>`).join('')}</select></label>`;
      h += `<div class="kv">Code words: <b>ALPHA</b> breach now, for any team waiting at its charge. <b>DELTA</b> leave for the pickup now. The ground teams also hear each other on the internal net, so "all set" and "ready for extraction" pass between them at once.</div>`;
      h += `<div class="row"><button class="btn pri" data-a="cq:timeok"${P.together == null ? ' disabled' : ''}>Done</button></div>`;
      return h;
    }
    h += done('4. Timing', `${P.together ? 'Breach together on the signal' : 'Each team breaches when ready'}; ${P.tot} minutes on target; wheels up ${F.clock(P.sp)}, about ${F.dur(F.cqbFlight(W))} to the objective.`, 'cq:retime');
    const err = F.cqbCheck(W);
    h += `<h2>Approve</h2><p class="sm">Once approved, the teams act on what they hear. You can call ALPHA, DELTA or abort from here; nothing else reaches them.</p>${err ? `<div class="msg">${esc(err)}</div>` : ''}<div class="row"><button class="btn pri" data-a="launch"${err ? ' disabled' : ''}>Approve the plan and start the clock</button></div>`;
    return h;
  };
  Q.act = (W, a, p, q) => {
    const E = F.cqbEdit, P = W.op.plan;
    switch (a) {
      case 'intel': st.open.intel = !st.open.intel; break;
      case 'insert': E.insert(W, p); break;
      case 'reinsert': P.insert = null; break;
      case 'entry': E.entry(W, p, q); st.floor = 0; break;
      case 'noentry': P.teams[p].entry = null; P.teams[p].rooms = []; break;
      case 'how': E.how(W, p, q); break;
      case 'room': E.room(W, p, q); break;
      case 'floor': st.floor = +p; break;
      case 'reserve': E.reserve(W, p, true); st.ok[p] = true; break;
      case 'teamok': if (teamDone(W, p)) st.ok[p] = true; break;
      case 'reteam': st.ok[p] = false; E.reserve(W, p, false); for (const id of TEAMS) if (TEAMS.indexOf(id) > TEAMS.indexOf(p) && !teamDone(W, id)) st.ok[id] = false; break;
      case 'cordon': E.cordon(W, p); break;
      case 'recordon': P.cordon = null; break;
      case 'together': E.together(W, p === '1'); break;
      case 'tot': E.tot(W, +p); break;
      case 'timeok': if (P.together != null) st.ok.timing = true; break;
      case 'retime': st.ok.timing = false; break;
    }
  };
  Q.change = (W, k, v) => { if (k === 'cqsp') F.cqbEdit.sp(W, +v); };
  /* A click on the map answers the open question. */
  Q.click = (W, p, r) => {
    const f = focus(W), P = W.op.plan, E = F.cqbEdit;
    if (f === 'insert') { for (const k in F.INSERTS) if (F.dist(p, W.map.nodes[F.INSERTS[k].node]) < Math.max(r * 1.5, 8)) { E.insert(W, k); return true; } return false; }
    if (TEAMS.includes(f)) {
      const T = P.teams[f];
      if (!T.entry) { let best = null, bd = Math.max(r * 1.5, 3); for (const id in W.map.doors) { const d = W.map.doors[id], dd = F.dist(p, d); if (dd < bd && d.f === 0) { bd = dd; best = id; } } if (best && E.entry(W, f, best)) return true; return false; }
      const a = F.cqbArea(p, st.floor); if (F.CQB.ROOMS[a]) { E.room(W, f, a); return true; } return false;
    }
    if (f === 'cordon') { const C = F.CQB.C; for (const k in F.CORDON) { const c = F.CORDON[k]; if (F.dist(p, { x: C.x + c.x, y: C.y + c.y }) < Math.max(r * 1.5, 8)) { E.cordon(W, k); return true; } } }
    return false;
  };

  /* ---------- running panel: the command post's picture ---------- */
  Q.running = (W, logLine) => {
    const O = W.op, P = O.plan; let h = '<h2>Code words</h2>';
    const waiting = TEAMS.some(id => !P.teams[id].reserve && P.teams[id].how === 'explosive' && P.together);
    for (const [c, what] of [['ALPHA', waiting ? 'Breach now: teams waiting at a charge blow it on receipt.' : 'Breach now (no team in this plan waits for it).'], ['DELTA', 'Every team stops where it is and heads for the pickup; the aircraft come in.']]) {
      const t = O.called[c]; h += `<div class="num"><span><b>${c}</b> ${esc(what)}${t ? ` <span class="tag ok">called ${F.clock(t).slice(3)}</span>` : ''}</span><button class="btn sm${t ? '' : ' pri'}" data-a="code:${c}"${t ? ' disabled' : ''}>Call ${c}</button></div>`;
    }
    const hv = W.hq.hvt; h += `<div class="kv">Target: <b>${hv ? { captured: 'JACKPOT, detained', killed: 'JACKPOT, killed', absent: 'not found' }[hv.state] + ' (' + esc(hv.from) + ', ' + F.clock(hv.t).slice(3) + ')' : 'no report'}</b>.</div>`;
    const rooms = W.hq.rooms || {}; h += `<div class="kv">Rooms reported clear: ${Object.keys(F.CQB.ROOMS).map(r => rooms[r] ? `<b>${roomNo(r)}</b> ${F.clock(rooms[r].t).slice(3)}` : `<span class="mute">${roomNo(r)}</span>`).join(' · ')}</div>`;
    h += `<div class="row"><button class="btn sm" data-a="abort"${O.aborted ? ' disabled' : ''}>${O.aborted ? 'Abort ordered ' + F.clock(O.aborted).slice(3) : 'Abort the operation'}</button></div>`;
    h += '<h2>Elements</h2>';
    for (const id of Object.keys(P.els)) { const u = W.units[id], k = W.hq.units[id], E = W.hq.el[id] || {}; h += `<div class="card blue" style="border-left-color:${UI.col[TCOL[id]]}"><div class="hd"><b>${u.call}</b><span>${esc(u.name)}</span></div><div class="kv">Last report: <b>${esc(E.phase || k.status || '')}</b>${E.t ? ' (' + F.clock(E.t).slice(3) + ')' : ''}. Strength <b>${k.str}</b>, casualties <b>${k.cas || 0}</b>.${E.contact ? ' <b class="bad">In contact ' + F.clock(E.contact).slice(3) + '.</b>' : ''}</div></div>`; }
    h += '<h2>Latest traffic</h2>' + W.hq.log.slice(-8).reverse().map(logLine).join('');
    return h;
  };
  Q.reviewHead = W => {
    const O = W.op, R = O.outcome, believed = { captured: 'detained', killed: 'killed', absent: 'not found', unknown: 'no report' }[R.believed];
    return `<div class="card ${R.success ? 'blue' : 'crit'}"><div class="hd"><b>${R.success ? 'Mission accomplished' : 'Mission failed'}</b><span class="tag">${F.dur(O.tEnd - O.tLaunch)}</span></div><div class="kv">Target: <b>${esc(R.hvt)}</b>. The command post believed: <b>${believed}</b>.<br>Detained: <b>${R.red.det}</b>. Enemy killed <b>${R.red.kia}</b>, wounded <b>${R.red.wia}</b>.<br>Women and children: <b>${R.civ.n}</b> in the compound, <b>${R.civ.kia}</b> killed, <b>${R.civ.wia}</b> wounded.<br>Friendly: <b>${R.blue.kia} killed, ${R.blue.wia} wounded</b>.${R.aircraftLost ? ` Aircraft lost: <b>${R.aircraftLost}</b>.` : ''}<br>${R.timeOnTarget ? `Time on the ground: <b>${F.dur(R.timeOnTarget)}</b>. ` : ''}${R.alerted ? `The compound was first alerted ${F.clock(R.alerted).slice(3)}${R.firstBreach ? `, ${R.firstBreach >= R.alerted ? F.dur(R.firstBreach - R.alerted) + ' before the first breach' : 'after the first breach'}` : ''}.` : 'The compound was never alerted.'}</div><div class="row"><button class="btn pri" data-a="start:${O.id}">Plan it again</button><button class="btn" data-a="menu">Other operations</button></div></div>`;
  };

  /* ---------- the map: the compound, the plan as it stands, and what has been reported ---------- */
  Q.fit = W => { const r = document.getElementById('map').getBoundingClientRect(), C = F.CQB.C; UI.look({ x: C.x + 4, y: C.y + 6 }, Math.min(9, (r.width - 40) / 150, (r.height - 80) / 150)); };
  function pathPts(W, id) { // where the team will walk, from the plan as it stands
    const u = W.units[id], keep = u.exfilAt; let steps; try { steps = F.cqbCompile(W, id); } finally { u.exfilAt = keep; }
    const I = F.INSERTS[W.op.plan.insert], out = [W.map.nodes[I.node]], marks = [];
    for (const s of steps) { if (s.k === 'phase') break; if (s.k === 'cwalk') out.push(s.to); if (s.k === 'clear') marks.push(s.room); if (s.k === 'block' && id === 'p1') break; }
    return { pts: out, marks };
  }
  Q.under = (W, truth) => {
    const ctx = UI.ctx(), X = UI.X, Y = UI.Y, c = UI.col, s = UI.scale(), C = F.CQB.C, O = W.op, P = O.plan, planning = O.status === 'planning', fl = planning ? st.floor : 0;
    const rect = (r, fill, a) => { ctx.globalAlpha = a == null ? 1 : a; ctx.fillStyle = fill; ctx.fillRect(X(C.x + r[0]), Y(C.y + r[3]), (r[2] - r[0]) * s, (r[3] - r[1]) * s); ctx.globalAlpha = 1; };
    if (s < 0.4) { ctx.strokeStyle = c.host; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(O.obj.x), Y(O.obj.y), 10, 0, 7); ctx.stroke(); UI.text(O.obj.name, X(O.obj.x), Y(O.obj.y) - 16, c.host, '700 13px "Saira Extra Condensed", "Arial Narrow", sans-serif', 'center'); }
    rect(F.CQB.OUTER, c.raise, 0.35); rect(F.CQB.GUEST, c.raise, 0.9); rect(F.CQB.HOUSE, c.raise, 0.9);
    if (fl === 1) rect(F.CQB.HOUSE, c.accent, 0.12);
    /* rooms the command post has heard are clear, or (observer) are clear */
    const clear = truth ? O.cleared || {} : W.hq.rooms || {};
    for (const rid in F.CQB.ROOMS) { const R = F.CQB.ROOMS[rid]; if (clear[rid] && (R.f === fl || !planning)) rect(R.r, c.ok, 0.18); }
    ctx.lineCap = 'butt';
    for (const w of W.map.walls) {
      if (w.f && !w.f.includes(fl) && !(w.f.includes(0) && !planning)) continue; const d = w.door && W.map.doors[w.door];
      if (d) { const open = truth && d.open; ctx.strokeStyle = d.kind === 'wall' ? c.ink : open ? c.ok : c.warn; ctx.lineWidth = Math.max(1.5, s * (d.kind === 'wall' ? 0.5 : 0.25)); ctx.setLineDash(d.kind === 'wall' ? [Math.max(2, s * 0.6), Math.max(2, s * 0.6)] : open ? [2, 3] : []); }
      else { ctx.strokeStyle = c.ink; ctx.lineWidth = Math.max(1.2, s * 0.5); ctx.setLineDash([]); }
      ctx.beginPath(); ctx.moveTo(X(w.x1), Y(w.y1)); ctx.lineTo(X(w.x2), Y(w.y2)); ctx.stroke();
    }
    ctx.setLineDash([]);
    const st2 = { x: C.x + F.CQB.STAIRS.x, y: C.y + F.CQB.STAIRS.y }; if (s > 2) { ctx.strokeStyle = c.mute; ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(X(st2.x - 1.5), Y(st2.y - 1.5 + i)); ctx.lineTo(X(st2.x + 1.5), Y(st2.y - 1.5 + i)); ctx.stroke(); } UI.text('STAIRS', X(st2.x), Y(st2.y - 2.2) + 10, c.mute, '9px "B612 Mono", monospace', 'center'); }
    if (s > 2.2) for (const rid in F.CQB.ROOMS) { const R = F.CQB.ROOMS[rid]; if (R.f !== fl && planning) continue; if (!planning && R.f === 1) continue; const r = R.r; UI.text(String(roomNo(rid)), X(C.x + (r[0] + r[2]) / 2), Y(C.y + (r[1] + r[3]) / 2) + 6, c.mute, `700 ${Math.round(F.clamp(s * 2.2, 12, 26))}px "Saira Extra Condensed", sans-serif`, 'center'); }
    if (s > 2.2 && planning) { UI.text(fl ? 'SHOWING: UPPER FLOOR (rooms 4 and 5)' : 'SHOWING: GROUND FLOOR', X(C.x - 30), Y(C.y - 25) + 16, fl ? c.accent : c.mute, '700 10px "B612 Mono", monospace'); }
    if (s > 3.5) for (const id in W.map.doors) { const d = W.map.doors[id]; if (d.f !== fl && planning) continue; if (d.f === 1 && !planning) continue; UI.text(d.name.replace('House ', '').replace(', ground floor', '').replace(', upper floor', ''), X(d.x) + 6, Y(d.y) - 5, c.mute, '9px "B612 Mono", monospace'); }
    /* insertion choices, cordon choices */
    const f = planning ? focus(W) : null;
    if (planning && f === 'insert') for (const k in F.INSERTS) { const n = W.map.nodes[F.INSERTS[k].node]; ctx.strokeStyle = c.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(n.x), Y(n.y), 10, 0, 7); ctx.stroke(); }
    if (P.insert) { const n = W.map.nodes[F.INSERTS[P.insert].node]; ctx.strokeStyle = c.friend; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(n.x) - 8, Y(n.y) - 8); ctx.lineTo(X(n.x) + 8, Y(n.y) + 8); ctx.moveTo(X(n.x) + 8, Y(n.y) - 8); ctx.lineTo(X(n.x) - 8, Y(n.y) + 8); ctx.stroke(); }
    for (const k in F.CORDON) { const q = F.CORDON[k], x = X(C.x + q.x), y = Y(C.y + q.y); if (P.cordon === k) { ctx.fillStyle = c.el4; ctx.fillRect(x - 6, y - 6, 12, 12); UI.text('SPEAR 4', x + 9, y + 4, c.el4, '700 10px "B612 Mono", monospace'); } else if (f === 'cordon') { ctx.strokeStyle = c.el4; ctx.lineWidth = 2; ctx.strokeRect(x - 6, y - 6, 12, 12); } }
    if (planning && TEAMS.includes(f) && !P.teams[f].entry) for (const id in W.map.doors) { const d = W.map.doors[id]; if (d.f !== 0 || id === 'dI0' || (P.insert === 'yard' && d.a === 'out') || (P.insert !== 'yard' && d.a !== 'out')) continue; ctx.strokeStyle = c.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(d.x), Y(d.y), Math.max(8, s * 2.2), 0, 7); ctx.stroke(); }
    /* each team's walk, as planned */
    if (truth && !planning) return;
    if (P.insert) for (const id of TEAMS.concat(P.cordon ? ['p1'] : [])) {
      const T = P.teams[id]; if (T && (T.reserve || (!T.entry && !T.rooms.length))) continue;
      const pp = pathPts(W, id), col = c[TCOL[id]]; ctx.globalAlpha = planning ? (f === id || !TEAMS.includes(f) ? 1 : 0.5) : 0.4; ctx.strokeStyle = col; ctx.lineWidth = f === id ? 2.6 : 1.8; ctx.setLineDash(P.insert === 'off' ? [6, 4] : []);
      ctx.beginPath(); pp.pts.forEach((q, i) => { const o = TEAMS.indexOf(id) * 0.6; if (i) ctx.lineTo(X(q.x + o), Y(q.y + o)); else ctx.moveTo(X(q.x + o), Y(q.y + o)); }); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      if (T && T.entry) { const d = W.map.doors[T.entry]; ctx.fillStyle = T.how === 'explosive' ? c.host : col; ctx.beginPath(); ctx.arc(X(d.x), Y(d.y), Math.max(4, s * 0.9), 0, 7); ctx.fill(); if (s > 1.5) UI.text(`${W.units[id].call} ${T.how === 'explosive' ? 'CHARGE' : 'BY HAND'}`, X(d.x) + 8, Y(d.y) + 14, col, '700 10px "B612 Mono", monospace'); }
      if (id !== 'p1' && s > 2.2) pp.marks.forEach((rid, i) => { const r = F.CQB.ROOMS[rid].r, x = X(C.x + r[0] + 1.2 + TEAMS.indexOf(id) * 2.6), y = Y(C.y + r[3] - 1.2); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y + 8, 8, 0, 7); ctx.fill(); UI.text(String(i + 1), x, y + 12, c.map, '700 10px "B612 Mono", monospace', 'center'); });
    }
  };
})();
