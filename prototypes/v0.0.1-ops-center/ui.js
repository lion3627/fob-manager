'use strict';
(function () {
  const { N, NODES, EDGES, ADJ, SEGS, REG, OBJS, DAY, hhmm, dtg } = SIM;
  const K = 24, MW = 14 * K, MH = 19.5 * K, KEY = 'fob-kestrel-save-v1';
  const X = x => +(x * K).toFixed(1), Y = y => +((19.5 - y) * K).toFixed(1);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const p2 = n => String(n).padStart(2, '0');
  const $ = id => document.getElementById(id);
  const LAB = { lz: 'r', c1: 'r', c2: 'r', c3: 'l', fob: 'r', rdg: 'l', orc: 'r', mir: 'r', wad: 'r', tol: 'l', obC: 'r', obA: 'r', obB: 'l', pas: 'r' };
  const KIND = { patrol: 'Patrol', op: 'Observation post', escort: 'Convoy escort', assault: 'Assault force', support: 'Support element', qrf: 'Quick reaction force' };
  let S = null;
  const UI = { tab: 'map', ptab: 'force', sel: null, plan: null, sheet: null, filter: 'all', acc: 0, msg: null, decErr: null, last: 1, req: { type: 'isr', node: 'obA', d: 1, h: 20, dur: 240 } };

  function ageTxt(m) { m = Math.max(0, Math.round(m)); return m < 60 ? m + ' min' : m < DAY ? Math.floor(m / 60) + ' h' : Math.floor(m / DAY) + ' d'; }
  function posLabel(p) { return p.at ? N[p.at].name : `between ${N[p.from].short} and ${N[p.to].short}`; }
  function posXY(p) { if (p.at) return [X(N[p.at].x), Y(N[p.at].y)]; const a = N[p.from], b = N[p.to]; return [X(a.x + (b.x - a.x) * p.frac), Y(a.y + (b.y - a.y) * p.frac)]; }
  function tOf(d, h) { return h === 'now' ? Math.ceil((S.t + 10) / 5) * 5 : (d - 1) * DAY + h * 60; }

  /* ---------- map ---------- */
  const STATIC = (function () {
    let s = '';
    for (let x = 0; x <= 14; x++) s += `<line class="g${x % 5 === 0 ? ' g5' : ''}" x1="${X(x)}" y1="0" x2="${X(x)}" y2="${MH}"/>`;
    for (let y = 0; y <= 19; y++) s += `<line class="g${y % 5 === 0 ? ' g5' : ''}" x1="0" y1="${Y(y)}" x2="${MW}" y2="${Y(y)}"/>`;
    for (let x = 1; x < 14; x += 2) s += `<text class="gl" x="${X(x)}" y="7" text-anchor="middle">${40 + x}</text>`;
    for (let y = 1; y < 19; y += 2) s += `<text class="gl" x="2" y="${Y(y) + 2.5}">${70 + y}</text>`;
    const hills = [[4.0, 12.6, 46, 32, -25, 5], [8.8, 18.3, 52, 26, 8, 4], [12.9, 9.4, 38, 70, 6, 5], [0.9, 7.4, 34, 58, -8, 4], [10.6, 2.6, 54, 30, 12, 3], [4.4, 18.6, 40, 20, -12, 3], [12.8, 18.0, 28, 34, 0, 3]];
    hills.forEach(h => { for (let i = 0; i < h[5]; i++) { const k = 1 - i / (h[5] + 0.6); s += `<ellipse class="ct${i % 2 ? '' : ' ct2'}" cx="${X(h[0])}" cy="${Y(h[1])}" rx="${(h[2] * k).toFixed(1)}" ry="${(h[3] * k).toFixed(1)}" transform="rotate(${h[4]} ${X(h[0])} ${Y(h[1])})"/>`; } });
    const w = [[7.7, 19.5], [7.2, 17.6], [6.3, 15.8], [6.4, 14.4], [5.3, 13.4], [3.2, 11.2], [2.6, 8.4], [3.3, 5.7], [4.2, 4.2], [5.0, 2.3], [4.7, 0]];
    s += `<polyline class="wadi" points="${w.map(p => X(p[0]) + ',' + Y(p[1])).join(' ')}"/>`;
    for (let i = 0; i < 26; i++) s += `<circle class="veg" cx="${X(9.2 + ((i * 37) % 13 - 6) * 0.13)}" cy="${Y(12.0 + ((i * 53) % 11 - 5) * 0.12)}" r="1.7"/>`;
    [['c2', 7], ['mir', 8], ['tol', 7], ['obA', 4], ['obB', 5], ['obC', 5]].forEach(v => { const n = N[v[0]]; for (let i = 0; i < v[1]; i++) s += `<rect class="bld" x="${X(n.x + ((i * 29) % 9 - 4) * 0.11)}" y="${Y(n.y + ((i * 47) % 7 - 3) * 0.12)}" width="3" height="2.4"/>`; });
    s += `<circle class="rng" cx="${X(6.2)}" cy="${Y(10.2)}" r="${5.6 * K}"/><text class="mt mtb" x="${X(7.25)}" y="${Y(4.45)}">81MM RANGE 5.6 KM</text>`;
    EDGES.forEach(e => { const a = N[e[0]], b = N[e[1]]; const c = `x1="${X(a.x)}" y1="${Y(a.y)}" x2="${X(b.x)}" y2="${Y(b.y)}"`; if (e[3] === 'road') s += `<line class="rd1" ${c}/><line class="rd2" ${c}/>`; else s += `<line class="${e[3] === 'track' ? 'trk' : 'ft'}" ${c}/>`; });
    s += `<text class="rt" x="${X(5.55)}" y="${Y(5.05)}" transform="rotate(-47 ${X(5.55)} ${Y(5.05)})" text-anchor="middle">ROUTE AMBER</text>`;
    const sx = X(9.4), sy = Y(0.55);
    s += `<path class="nx" d="M${sx} ${sy}h${5 * K}M${sx} ${sy - 3}v6M${sx + 5 * K} ${sy - 3}v6M${sx + 2.5 * K} ${sy - 2}v4"/><text class="mt" x="${sx}" y="${sy - 5}">0</text><text class="mt" x="${sx + 5 * K}" y="${sy - 5}" text-anchor="end">5 KM</text>`;
    s += `<path class="nx" d="M${X(13.2)} ${Y(1.5)}v-22l-4 8M${X(13.2)} ${Y(1.5) - 22}l4 8"/><text class="mt" x="${X(13.2)}" y="${Y(1.5) - 25}" text-anchor="middle">N</text>`;
    s += `<text class="mt" x="${MW - 4}" y="${MH - 4}" text-anchor="end">AO KESTREL · 1 KM GRID · ROAD ═ TRACK ╌ FOOTPATH ┈</text>`;
    return s;
  })();
  function chain(wps, mounted, back) {
    let cur = 'fob'; const out = ['fob'];
    for (const w of wps) { const p = SIM.path(cur, w, mounted); if (!p) return out; p.forEach(n => out.push(n)); cur = w; }
    if (back && cur !== 'fob') SIM.path(cur, 'fob', mounted).forEach(n => out.push(n));
    return out;
  }
  function mapSvg() {
    const sig = S._sig, P = UI.plan, I = S.intel; let s = STATIC;
    if (P) {
      let pts = [];
      if (P.mode === 'op') { if (P.obj) pts = chain((P.via ? [P.via] : []).concat([P.obj]), P.mounted, false); }
      else if (P.kind === 'escort') pts = ['fob', 'c3', 'c2', 'c1', 'lz'];
      else if (P.wps.length) pts = chain(P.wps, P.mounted, true);
      if (pts.length > 1) s += `<polyline class="pp" points="${pts.map(n => X(N[n].x) + ',' + Y(N[n].y)).join(' ')}"/>`;
      if (P.mode === 'op' && P.support.length && P.supNode) { const sp = chain([P.supNode], P.mounted, false); s += `<polyline class="pp" style="stroke-dasharray:2 7" points="${sp.map(n => X(N[n].x) + ',' + Y(N[n].y)).join(' ')}"/>`; }
    }
    S.higher.windows.forEach(w => { if (w.on && w.type === 'isr') { const n = N[w.node]; s += `<circle class="isr" cx="${X(n.x)}" cy="${Y(n.y)}" r="24"/><text class="isrl" x="${X(n.x)}" y="${Y(n.y) - 27}" text-anchor="middle">${w.call}</text>`; } });
    const top = OBJS.slice().sort((a, b) => I.hvt[b] - I.hvt[a])[0];
    NODES.forEach(n => {
      const x = X(n.x), y = Y(n.y), r = LAB[n.id] === 'r';
      if (UI.sel === n.id) s += `<circle class="sel" cx="${x}" cy="${y}" r="14"/>`;
      if (n.kind === 'fob') s += `<rect class="nf" x="${x - 6.5}" y="${y - 6.5}" width="13" height="13"/>`;
      else if (n.kind === 'high') s += `<path class="ns" d="M${x} ${y - 7}L${x + 7} ${y + 5}H${x - 7}Z"/>`;
      else if (n.kind === 'village') s += `<rect class="ns" x="${x - 4.5}" y="${y - 4.5}" width="9" height="9"/>`;
      else if (n.kind === 'obj') s += `<circle class="ns" cx="${x}" cy="${y}" r="5.5"/><path class="nx" d="M${x - 5.5} ${y}h11M${x} ${y - 5.5}v11"/>`;
      else s += `<circle class="ns" cx="${x}" cy="${y}" r="4"/>`;
      s += `<text class="nl" x="${x + (r ? 10 : -10)}" y="${y + 4}" text-anchor="${r ? 'start' : 'end'}">${n.short}</text>`;
      if (n.id !== 'fob') {
        const v = sig[n.id], bx = x - 5, by = y - 10;
        if (v === 0) s += `<text class="c0" x="${x}" y="${by + 1}" text-anchor="middle">×</text>`;
        else for (let i = 0; i < 3; i++) s += `<rect class="cb${i < v ? ' on' : ''}" x="${bx + i * 3.6}" y="${by - 3 - i * 2}" width="2.4" height="${3 + i * 2}"/>`;
        const e = I.est[n.id];
        if (e) {
          const age = S.t - e.asOf, ac = age > 720 ? ' a3' : age > 180 ? ' a2' : '';
          s += `<path class="hd${e.hi ? '' : ' z'}${ac}" d="M${x - 5} ${y + 15}l5 -5l5 5l-5 5z"/><text class="ht${ac}" x="${x + 8}" y="${y + 18.5}">${e.hi ? e.lo + '–' + e.hi : '0'}${e.amb ? ' AMBUSH' : ''}${age > 180 ? ' ' + ageTxt(age).replace(' ', '') : ''}</text>`;
        }
        if (OBJS.includes(n.id)) s += `<text class="hvt${n.id === top && I.hvt[top] > 0.4 ? ' top' : ''}" x="${x + (r ? 10 : -10)}" y="${r ? y - 7 : y + 15}" text-anchor="${r ? 'start' : 'end'}">HVT ${Math.round(I.hvt[n.id] * 100)}%${I.cache && I.cache.node === n.id ? ' · CACHE' + (I.cache.conf === 'probable' ? '' : '?') : ''}</text>`;
      }
    });
    S.engs.forEach(en => { if (!en.known) return; const n = N[en.node], x = X(n.x), y = Y(n.y); let d = ''; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, rr = i % 2 ? 6 : 13; d += (i ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(1) + ' ' + (y + Math.sin(a) * rr).toFixed(1); } s += `<path class="bst" d="${d}Z"/>`; });
    const stack = {};
    S.els.forEach(el => {
      const k = el.known; if (k.state === 'staged') return;
      const age = S.t - k.t, stale = age > 10; const xy = posXY(k.pos); const key = Math.round(xy[0] / 12) + ':' + Math.round(xy[1] / 12); const i = stack[key] = (stack[key] || 0) + 1;
      const side = k.pos.at ? (LAB[k.pos.at] === 'r' ? -1 : 1) : 1; const cx = xy[0] + side * 31, cy = xy[1] + (i - 1) * 16;
      if (age > 15) { const g = posXY(SIM.planPos(el, S.t)); s += `<line class="gh" x1="${xy[0]}" y1="${xy[1]}" x2="${g[0]}" y2="${g[1]}"/><circle class="ghc" cx="${g[0]}" cy="${g[1]}" r="7"/>`; }
      const nm = el.kind === 'qrf' ? 'QRF' : el.squads[0] + (el.squads.length > 1 ? '+' + (el.squads.length - 1) : '');
      s += `<line class="ul" x1="${xy[0]}" y1="${xy[1]}" x2="${cx}" y2="${cy}"/><rect class="um${stale ? ' st' : ''}${k.state === 'contact' ? ' ctc' : ''}" x="${cx - 16}" y="${cy - 7}" width="32" height="14"/><text class="ut" x="${cx}" y="${cy + 3.2}" text-anchor="middle">${nm}</text>`;
      if (stale) s += `<text class="ua" x="${cx}" y="${cy + 15}" text-anchor="middle">+${ageTxt(age).replace(' ', '')}</text>`;
    });
    S.convoys.forEach(c => { if (c.state !== 'moving') return; const xy = posXY(c.loc.at ? { at: c.loc.at } : { from: c.loc.from, to: c.loc.to, frac: Math.min(1, c.loc.done / c.loc.km) }); s += `<rect class="cv" x="${xy[0] - 15}" y="${xy[1] - 20}" width="30" height="11"/><text class="cvt" x="${xy[0]}" y="${xy[1] - 11.8}" text-anchor="middle">LOG ${c.trucks}</text>`; });
    if (P && P.mode !== 'op') P.wps.forEach((w, i) => { const n = N[w]; s += `<circle class="pw" cx="${X(n.x) + 9}" cy="${Y(n.y) + 10}" r="5.5"/><text class="pwt" x="${X(n.x) + 9}" y="${Y(n.y) + 12.8}" text-anchor="middle">${i + 1}</text>`; });
    if (P && P.mode === 'op' && P.obj) { const n = N[P.obj]; s += `<circle class="sel" cx="${X(n.x)}" cy="${Y(n.y)}" r="15" style="stroke-dasharray:none"/>`; }
    NODES.forEach(n => { s += `<circle class="hit" data-a="node:${n.id}" cx="${X(n.x)}" cy="${Y(n.y)}" r="18"><title>${n.name}</title></circle>`; });
    return s;
  }

  /* ---------- shared bits ---------- */
  function lnHtml(l) {
    const late = l.t - l.ts > 10;
    return `<div class="ln s${l.sev}"><span class="tm">${dtg(l.t)}</span><span><span class="fr">${esc(l.from)}</span> ${esc(l.text)}${late ? ` <span class="late">Sent ${hhmm(l.ts)}, reached you ${SIM.fmtDur(l.t - l.ts)} later.</span>` : ''}</span></div>`;
  }
  function msgHtml() { return UI.msg ? `<div class="msg${UI.msg.ok ? ' ok' : ''}" role="status">${esc(UI.msg.text)}</div>` : ''; }
  function timeSel(id, d, h, now) {
    const d0 = SIM.dayOf(S.t); let s = `<select id="${id}d" data-c="${id}d" aria-label="Day">`;
    for (let x = d0; x <= Math.min(11, d0 + 3); x++) s += `<option value="${x}"${x === d ? ' selected' : ''}>D${x}</option>`;
    s += `</select><select id="${id}h" data-c="${id}h" aria-label="Hour">`;
    if (now) s += `<option value="now"${h === 'now' ? ' selected' : ''}>ASAP</option>`;
    for (let x = 0; x < 24; x++) s += `<option value="${x}"${x === h ? ' selected' : ''}>${p2(x)}00</option>`;
    return s + '</select>';
  }
  function opt(list, cur) { return list.map(o => `<option value="${o[0]}"${String(o[0]) === String(cur) ? ' selected' : ''}>${esc(o[1])}</option>`).join(''); }
  const planBtns = () => `<div class="row"><button class="btn" data-a="plan-order">New patrol or OP</button><button class="btn" data-a="plan-escort">Convoy escort</button><button class="btn pri" data-a="plan-op">Plan operation</button></div>`;

  /* ---------- map info and planner ---------- */
  function nodeCard(id) {
    const n = N[id], sig = S._sig[id], est = S.intel.est[id], reg = S.intel.reg[n.reg];
    let h = `<div class="card acc"><div class="hd"><b>${esc(n.name)}</b><span class="tag">Grid ${SIM.grid(id)}</span>`;
    if (id !== 'fob') h += `<span class="tag ${sig === 0 ? 'crit' : sig === 1 ? 'warn' : 'ok'}">${['No radio coverage', 'Intermittent radio', 'Voice', 'Voice and data'][sig]}</span>`;
    h += `</div><p>${esc(n.desc)}</p>`;
    if (id !== 'fob') {
      h += `<div class="kv">Enemy here: ${est ? `<b>${est.lo} to ${est.hi}</b>, ${est.conf} confidence, ${ageTxt(S.t - est.asOf)} old, from ${esc(est.src)}${est.amb ? ' · <b class="bad">ambush reported</b>' : ''}` : '<b>no estimate</b>'}<br>${REG[n.reg]} area: ${reg ? `<b>${reg.lo} to ${reg.hi}</b> as of ${dtg(reg.asOf)}` : 'unknown'}</div>`;
      if (OBJS.includes(id)) h += `<div class="kv">S2 puts the network leader here at <b>${Math.round(S.intel.hvt[id] * 100)}%</b>.${S.intel.cache && S.intel.cache.node === id ? ` Cache <b>${S.intel.cache.conf}</b> here.` : ''}</div>`;
      h += `<div class="kv">${SIM.distKm(id, 'fob').toFixed(1)} km from the FOB, ${SIM.distKm(id, 'fob') <= 5.6 ? 'inside' : 'outside'} mortar range.</div>`;
      const here = S.els.filter(el => el.known.pos.at === id && el.known.state !== 'staged'); if (here.length) h += `<div class="kv">Friendly here: <b>${here.map(e => esc(e.name)).join(', ')}</b></div>`;
      h += `<div class="row"><button class="btn sm" data-a="order-here:${id}">Send patrol or OP</button><button class="btn sm" data-a="op-here:${id}">Plan operation here</button><button class="btn sm" data-a="isr-here:${id}">Request ISR here</button><button class="btn sm" data-a="qrf-node:${id}">Launch QRF here</button></div>`;
    }
    return h + '</div>';
  }
  function orderOf(P) { return { kind: P.kind, squads: P.squads.slice(), mounted: P.kind === 'escort' ? true : P.mounted, sat: P.sat, wps: P.wps.slice(), sp: tOf(P.d, P.h), dwellH: P.dwellH, lost: { after: P.lostAfter, action: P.lostAction } }; }
  function opOfP(P) { return { obj: P.obj, assault: P.squads.slice(), support: P.support.slice(), supNode: P.supNode, mounted: P.mounted, hhour: tOf(P.d, P.h), needGo: P.needGo, noGo: P.noGo, abortCas: P.abortCas, lost: { after: P.lostAfter, action: P.lostAction }, satA: P.sat, satS: P.satS, via: P.via ? [P.via] : [] }; }
  function tlText(T) { return T.tl.slice(1).map(x => `${N[x.node].short} ${hhmm(x.arr)}${S._sig[x.node] === 0 ? ' (no comms)' : ''}`).join(' › '); }
  function estHtml(P) {
    let h = '<div class="est"><b>STAFF ESTIMATE</b>';
    if (P.mode === 'op') {
      const o = opOfP(P), b = SIM.buildOp(S, o);
      if (!b.ok) return h + `<span class="err">${esc(b.err)}</span></div>`;
      h += `<span>Assault: gate ${dtg(b.sp)} › ${tlText(b.A.T)}. Back about ${dtg(b.A.T.ret)}.</span><span>Release point ${N[b.orp].name}. Launch ${hhmm(b.launch)}, H-hour ${dtg(o.hhour)}. Fatigue on return about ${b.A.T.fatEst}.</span>`;
      if (b.B) h += `<span>Support: gate ${dtg(b.B.sp)} › ${tlText(b.B.T)}.</span>`; else h += `<span class="wn">S3: no support element. Nothing will cordon the objective if the target runs.</span>`;
      h += `<span>${esc(b.s2)}</span>`; b.warn.forEach(w => { h += `<span class="wn">${esc(w)}</span>`; });
    } else {
      const o = orderOf(P), b = SIM.build(S, o);
      if (!b.ok) return h + `<span class="err">${esc(b.err)}</span></div>`;
      h += `<span>Gate ${dtg(o.sp)} › ${tlText(b)}. Back about ${dtg(b.ret)}.</span>`;
      if (P.kind !== 'escort') h += `<span>Fuel ${b.fuel} L. Fatigue on return about ${b.fatEst}.</span>`;
      b.warn.forEach(w => { h += `<span class="wn">${esc(w)}</span>`; });
    }
    return h + '</div>';
  }
  function planHtml() {
    const P = UI.plan, isOp = P.mode === 'op'; let h = `<h2>${isOp ? 'Plan operation' : 'New order'}</h2>` + msgHtml();
    if (!isOp) h += `<div class="seg" role="group" aria-label="Order type">${[['patrol', 'Patrol'], ['op', 'Observation post'], ['escort', 'Convoy escort']].map(k => `<button data-a="kind:${k[0]}" aria-pressed="${P.kind === k[0]}">${k[1]}</button>`).join('')}</div>`;
    h += `<h3>${isOp ? 'Squads: tap once for assault, twice for support' : 'Squads'}</h3><div class="chips sqs">` + S.squads.filter(s => s.task !== 'out').map(s => {
      const a = P.squads.includes(s.id), b = isOp && P.support.includes(s.id);
      return `<button class="chip${b ? ' sup' : ''}" data-a="sq:${s.id}" aria-pressed="${a || b}"><b>${s.id}</b>${isOp && a ? ' ASSAULT' : b ? ' SUPPORT' : ''}<small>${s.str} pax · fatigue ${Math.round(s.fat)} · ${s.task === 'qrf' ? 'QRF' : s.task}</small></button>`;
    }).join('') + '</div>';
    if (isOp) h += `<h3>Objective: tap the map</h3><div class="kv">${P.obj ? `<b>${esc(N[P.obj].name)}</b>` : 'None chosen yet.'}</div>`;
    else if (P.kind === 'escort') { const c = S.convoys.find(x => x.state === 'sched'); h += `<div class="kv">${c ? `Next convoy leaves LP Dakota at <b>${dtg(c.due)}</b>. The escort drives there, waits, and rides in with it.` : 'No convoy is scheduled.'}</div>`; }
    else h += `<h3>Waypoints: tap the map in order</h3><div class="chips">${P.wps.length ? P.wps.map((w, i) => `<button class="chip" data-a="wpdel:${i}" aria-label="Remove ${N[w].name}">${i + 1}. ${N[w].short}<span class="x">×</span></button>`).join('') : '<span class="mute">None yet.</span>'}</div>`;
    h += '<div class="row">';
    h += `<label class="f">${isOp ? 'H-hour' : 'Leave the gate'}<span class="row">${timeSel('p', P.d, P.h, !isOp)}</span></label>`;
    if (!isOp && P.kind === 'op') h += `<label class="f" for="pdw">Stay for<select id="pdw" data-c="dwellH">${opt([6, 12, 18, 24, 36, 48].map(x => [x, x + ' hours']), P.dwellH)}</select></label>`;
    if (isOp && P.obj) {
      h += `<label class="f" for="pvia">Approach<select id="pvia" data-c="via">${opt([['', 'Fastest route']].concat(ADJ[P.obj].filter(a => a.to !== 'fob').map(a => [a.to, 'Via ' + N[a.to].name])), P.via || '')}</select></label>`;
      h += `<label class="f" for="psup">Support position<select id="psup" data-c="supNode">${opt(NODES.filter(n => n.id !== 'fob' && n.id !== P.obj).map(n => [n.id, n.name + (ADJ[P.obj].some(a => a.to === n.id) ? ' (adjacent)' : '')]), P.supNode)}</select></label>`;
    }
    if (isOp || P.kind !== 'escort') h += `<label class="f">If comms are lost<span class="row"><select id="pla" data-c="lostAfter" aria-label="Lost comms time limit">${opt([[60, 'After 1 h'], [120, 'After 2 h'], [240, 'After 4 h'], [360, 'After 6 h'], [99999, 'Never']], P.lostAfter)}</select><select id="plx" data-c="lostAction" aria-label="Lost comms action">${opt([['rtb', 'Return to base'], ['continue', 'Continue mission']], P.lostAction)}</select></span></label>`;
    if (isOp) {
      h += `<label class="f" for="pab">Break contact at<select id="pab" data-c="abortCas">${opt([[1, '1 casualty'], [2, '2 casualties'], [3, '3 casualties'], [4, '4 casualties'], [5, '5 casualties'], [99, 'No limit']], P.abortCas)}</select></label>`;
      h += `<label class="f" for="png">No GO received<select id="png" data-c="noGo">${opt([['abort', 'Abort and return'], ['execute', 'Execute at H+30']], P.noGo)}</select></label>`;
    }
    h += '</div>';
    if (P.kind !== 'escort' || isOp) h += `<label class="ck" for="pmt"><input type="checkbox" id="pmt" data-c="mounted"${P.mounted ? ' checked' : ''}>Mounted: fast and tracked on roads and tracks, but loud</label>`;
    h += `<label class="ck" for="pst"><input type="checkbox" id="pst" data-c="sat"${P.sat ? ' checked' : ''}>Issue a SATCOM terminal${isOp ? ' to the assault force' : ''} (${SIM.satFree(S)} of 2 free): slow text link anywhere</label>`;
    if (isOp) {
      if (P.support.length) h += `<label class="ck" for="pss"><input type="checkbox" id="pss" data-c="satS"${P.satS ? ' checked' : ''}>SATCOM terminal for the support element</label>`;
      h += `<label class="ck" for="pgo"><input type="checkbox" id="pgo" data-c="needGo"${P.needGo ? ' checked' : ''}>Hold at the release point for my GO</label>`;
    }
    h += estHtml(P);
    h += `<div class="row"><button class="btn pri" data-a="plan-issue">${isOp ? 'Issue operation order' : 'Issue order'}</button><button class="btn" data-a="plan-cancel">Cancel</button></div>`;
    return h;
  }
  function infoHtml() {
    if (UI.plan) return planHtml();
    let h = msgHtml();
    h += UI.sel ? nodeCard(UI.sel) : `<p class="mute">Tap a place on the map for its radio coverage, intel and options.</p>`;
    h += planBtns();
    h += `<h2>Latest on the net</h2>` + S.log.slice(-4).reverse().map(lnHtml).join('');
    h += `<p class="mute" style="font-size:12.5px">Solid blue box: live position. Dashed box: last report, with its age. Dashed circle: where the plan says they are now. Red diamond: enemy estimate, fading with age. Bars: radio coverage; × means none.</p>`;
    return h;
  }

  /* ---------- panels ---------- */
  function elCard(el) {
    const k = el.known, age = S.t - k.t, op = el.opId ? S.ops.find(o => o.id === el.opId) : null; const contact = k.state === 'contact';
    let h = `<div class="card ${contact ? 'crit' : age > 60 ? 'warn' : 'blue'}"><div class="hd"><b>${esc(el.name)}</b><span class="tag blue">${KIND[el.kind]}${op ? ' · ' + op.name : ''}</span>${contact ? '<span class="tag crit">In contact</span>' : ''}${el.missed >= 2 ? '<span class="tag crit">No comms</span>' : age > 20 ? `<span class="tag warn">Report ${ageTxt(age)} old</span>` : ''}</div>`;
    if (k.state === 'staged') h += `<div class="kv">Staged at the FOB. Crosses the gate <b>${dtg(el.steps[0].until)}</b>. Back about ${dtg(el.ret)}.</div>`;
    else {
      const pp = SIM.planPos(el, S.t);
      h += `<div class="kv">Last report <b>${dtg(k.t)}</b>: ${posLabel(k.pos)}. ${esc(k.note || '')}<br>Strength <b>${k.str}</b> · ammo <b>${k.ammo}%</b> · fatigue <b>${k.fat}</b>${k.carry ? ` · <b class="bad">${k.carry} urgent casualt${k.carry > 1 ? 'ies' : 'y'}</b>` : ''}</div>`;
      h += `<div class="kv">By the plan they are now ${posLabel(pp)}, back about ${dtg(el.ret)}. Lost comms: ${SIM.lostText(el)}.${el.sat ? ' Carries SATCOM.' : ''}</div>`;
    }
    h += `<div class="row">${k.state !== 'staged' ? `<button class="btn sm" data-a="recall:${el.id}">Recall</button><button class="btn sm" data-a="qrf-el:${el.id}">Send QRF to them</button>` : `<button class="btn sm" data-a="recall:${el.id}">Cancel order</button>`}${contact ? `<button class="btn sm" data-a="brk:${el.id}">Order break contact</button><button class="btn sm hot" data-a="awt">Request attack aviation</button>` : ''}</div></div>`;
    return h;
  }
  function forceHtml() {
    const qrf = S.squads.filter(s => s.task === 'qrf'), grd = S.squads.filter(s => s.task === 'guard');
    let h = msgHtml() + `<div class="sum"><span>${S.squads.reduce((a, s) => a + s.str, 0)} of 81 pax</span><span class="${grd.length ? '' : 'bad'}">Guard: ${grd.map(s => s.id).join(', ') || 'none posted'}</span><span class="${qrf.length ? '' : 'bad'}">QRF: ${qrf.map(s => s.id).join(', ') || 'none on standby'}</span></div>` + planBtns();
    if (S.els.length) { h += '<h2>Outside the wire</h2>'; S.els.forEach(el => { h += elCard(el); }); }
    h += '<h2>Squads</h2>';
    for (let p = 1; p <= 3; p++) {
      h += `<h3>${p}${['st', 'nd', 'rd'][p - 1]} Platoon</h3>`;
      S.squads.filter(s => s.plt === p).forEach(s => {
        const f = Math.round(s.fat), el = s.task === 'out' ? S.els.find(e => e.squads.includes(s.id)) : null;
        h += `<div class="sq"><div><span class="id">${s.id}</span>${esc(s.ldr.name)} <span class="pips" title="Tactical skill ${s.ldr.tac} of 5">${'●'.repeat(s.ldr.tac)}${'○'.repeat(5 - s.ldr.tac)}</span> <span class="mute">${s.ldr.nerve >= 1 ? 'bold' : s.ldr.nerve <= -1 ? 'cautious' : 'steady'}</span></div>`;
        h += el ? `<span class="tag blue">${KIND[el.kind]}</span>` : `<div class="seg" role="group" aria-label="Task for ${s.id}">${[['rest', 'Rest'], ['guard', 'Guard'], ['qrf', 'QRF']].map(t => `<button data-a="task:${s.id}:${t[0]}" aria-pressed="${s.task === t[0]}">${t[1]}</button>`).join('')}</div>`;
        h += `<div class="st"><span>${s.str}/9 pax</span><span>fatigue <span class="bar ${f > 70 ? 'h' : f > 45 ? 'm' : ''}"><i style="width:${f}%"></i></span> ${f}</span><span>ammo ${Math.round(s.ammo)}%</span></div></div>`;
      });
    }
    return h;
  }
  function intelHtml() {
    const I = S.intel; let h = '<h2>Network leader</h2>';
    if (S.enemy.leader !== 'atlarge') h += `<div class="card blue"><div class="kv">Leader <b>${S.enemy.leader}</b>.</div></div>`;
    else { OBJS.forEach(k => { const p = Math.round(I.hvt[k] * 100); h += `<div class="hv"><span>${N[k].name}</span><span class="tr"><i style="width:${p}%"></i></span><b>${p}%</b></div>`; }); h += `<p class="mute">S2 assessment, last updated ${dtg(I.hvtAsOf)}. It drifts back toward even odds as evidence ages; he relocates every day or two.</p>`; }
    h += `<div class="kv">Main cache: ${S.enemy.cacheDestroyed ? '<b class="good">destroyed</b>' : I.cache ? `<b>${I.cache.conf}</b> at ${N[I.cache.node].name}, as of ${dtg(I.cache.asOf)}` : 'location unknown'}</div>`;
    h += '<h2>Enemy strength</h2><div class="tw"><table><thead><tr><th>Place</th><th>Estimate</th><th>Conf.</th><th>Age</th><th>Source</th></tr></thead><tbody>';
    ['route', 'near', 'valley', 'deep'].forEach(r => {
      const g = I.reg[r]; h += `<tr><td><b>${REG[r]} area</b></td><td>${g ? g.lo + ' to ' + g.hi : 'unknown'}</td><td>${g ? 'low' : ''}</td><td>${g ? ageTxt(S.t - g.asOf) : ''}</td><td>${g ? 'Battalion S2' : ''}</td></tr>`;
      NODES.filter(n => n.reg === r).forEach(n => { const e = I.est[n.id]; h += `<tr><td>${n.name}</td><td>${e ? (e.hi ? e.lo + ' to ' + e.hi : 'none seen') + (e.amb ? ' <b class="bad">ambush</b>' : '') : '<span class="mute">not observed</span>'}</td><td>${e ? e.conf : ''}</td><td>${e ? ageTxt(S.t - e.asOf) : ''}</td><td>${e ? esc(e.src) : ''}</td></tr>`; });
    });
    h += '</tbody></table></div><h2>Source reporting</h2>';
    h += I.tips.length ? I.tips.map(t => `<div class="ln"><span class="tm">${dtg(t.t)}</span><span><span class="fr">${t.grade}</span> ${esc(t.text)}</span></div>`).join('') : '<p class="mute">Nothing yet. Patrols that halt in Kessa, Mirab or Tolan bring back source reports; reliability improves with repeat visits.</p>';
    return h;
  }
  function supportHtml() {
    const H = S.higher, Kk = S.stocks, R = UI.req; let h = msgHtml() + '<h2>Battalion and brigade</h2>';
    h += `<div class="kv">Your priority <b>${Math.round(SIM.prio(S))}</b>${H.mainEffort > S.t ? ` (main effort until ${dtg(H.mainEffort)})` : ''}. Activity elsewhere: ${H.sectors.map(s => `${s.name} <b class="${s.spike ? 'bad' : ''}">${Math.round(s.p)}${s.spike ? ' in contact' : ''}</b>`).join(' · ')}.</div>`;
    h += '<div class="tw"><table><thead><tr><th>Asset</th><th>Role</th><th>Status</th></tr></thead><tbody>' + H.assets.map(a => `<tr><td><b>${a.call}</b></td><td>${{ isr: 'ISR and relay', awt: 'Attack aviation', mev: 'MEDEVAC' }[a.type]}</td><td>${a.busy ? `${esc(a.busy.why)}, ${esc(a.busy.who)}, until ${dtg(a.busy.until)}` : a.res ? `<b>Yours ${dtg(a.res.start)} to ${hhmm(a.res.end)}</b>` : 'Available on request'}</td></tr>`).join('') + '</tbody></table></div>';
    const pend = H.reqs.filter(r => !r.done); if (pend.length) h += `<div class="kv">Awaiting answer: ${pend.map(r => `${r.type === 'isr' ? 'ISR over ' + N[r.node].name : 'attack aviation'} for ${dtg(r.start)}`).join('; ')}.</div>`;
    h += `<h3>Request a window</h3><div class="row"><label class="f" for="rty">Asset<select id="rty" data-c="rtype">${opt([['isr', 'ISR aircraft'], ['awt', 'Attack aviation on call']], R.type)}</select></label>`;
    if (R.type === 'isr') h += `<label class="f" for="rno">Orbit over<select id="rno" data-c="rnode">${opt(NODES.filter(n => n.id !== 'fob').map(n => [n.id, n.name]), R.node)}</select></label>`;
    h += `<label class="f">From<span class="row">${timeSel('r', R.d, R.h, false)}</span></label><label class="f" for="rdu">For<select id="rdu" data-c="rdur">${opt([[120, '2 hours'], [240, '4 hours'], [360, '6 hours']], R.dur)}</select></label></div>`;
    h += `<div class="row"><button class="btn pri" data-a="req-send">Send request</button><button class="btn" data-a="me"${H.meUsed ? ' disabled' : ''}>Ask to be main effort (once)</button></div>`;
    h += '<h2>Logistics</h2><div class="tw"><table><thead><tr><th>Stock</th><th>On hand</th><th>Lasts</th></tr></thead><tbody>';
    h += `<tr><td>Fuel</td><td>${Math.round(Kk.fuel)} L</td><td>${(Kk.fuel / 300).toFixed(1)} days of generators</td></tr><tr><td>Rations and water</td><td>${Kk.rations.toFixed(1)} days</td><td>${Kk.rations.toFixed(1)} days</td></tr><tr><td>Small-arms ammunition</td><td>${Kk.ammo.toFixed(1)} squad loads</td><td>${Math.floor(Kk.ammo / 0.5)} squad firefights</td></tr><tr><td>81mm rounds</td><td>${Kk.mortar}</td><td>${Math.floor(Kk.mortar / 6)} fire missions</td></tr></tbody></table></div>`;
    const c = S.convoys.find(x => x.state === 'moving') || S.convoys.find(x => x.state === 'sched');
    h += `<div class="kv">Convoys delivered <b>${S.stats.convoys} of 5</b>. ${c ? (c.state === 'moving' ? `Convoy ${c.id} is on Route Amber with <b>${c.trucks} trucks</b>.` : `Convoy ${c.id} reaches LP Dakota <b>${dtg(c.due)}</b>.`) : 'No more convoys this deployment.'}</div>`;
    h += '<div class="tw"><table><thead><tr><th>Route Amber</th><th>Status</th><th>Strikes</th></tr></thead><tbody>' + SEGS.map(sg => { const r = S.route.segs[sg.k]; return `<tr><td>${sg.name}</td><td>${r.susp ? '<b class="bad">device suspected</b>' : r.cleared ? 'cleared ' + dtg(r.cleared) + ', ' + ageTxt(S.t - r.cleared) + ' ago' : '<span class="mute">not cleared</span>'}</td><td>${r.inc}</td></tr>`; }).join('') + '</tbody></table></div>';
    const fld = S.cas.filter(x => x.state === 'field'); h += '<h2>Casualties</h2>';
    h += `<div class="kv">${S.stats.kia} killed in action · ${S.stats.dow} died of wounds · ${S.stats.wia} wounded.</div>`;
    fld.forEach(x => { const el = S.els.find(e => e.id === x.el); const m = S.t - x.t0; h += `<div class="card ${m > 60 ? 'crit' : 'warn'}"><div class="kv"><b>Urgent surgical, ${x.sq}</b>, wounded ${hhmm(x.t0)}, <b>${m} minutes</b> ago${el ? ', with ' + esc(el.name) : ''}.</div></div>`; });
    return h;
  }
  function netHtml() {
    const f = UI.filter; const F = [['all', 'All'], ['flash', 'Flash'], ['contact', 'Contact'], ['intel', 'Intel'], ['comms', 'Comms'], ['log', 'Logistics'], ['higher', 'Higher']];
    let h = `<div class="chips">${F.map(x => `<button class="chip" data-a="filter:${x[0]}" aria-pressed="${f === x[0]}">${x[1]}</button>`).join('')}</div>`;
    const rows = S.log.filter(l => f === 'all' || (f === 'flash' ? l.sev >= 2 : l.cat === f)).slice(-160).reverse();
    return h + (rows.length ? rows.map(lnHtml).join('') : '<p class="mute">Nothing logged in this category.</p>');
  }
  function panelHtml() { return { force: forceHtml, intel: intelHtml, support: supportHtml, net: netHtml }[UI.ptab](); }

  /* ---------- sheets ---------- */
  function briefHtml(resume) {
    return `<h1><small>OPERATION ORDER · AO KESTREL</small>FOB Kestrel</h1><dl class="brief">
<dt>SITUATION</dt><dd>An insurgent network of 60 to 90 fighters works the ground north of your base and attacks Route Amber, your only supply line. Its leader moves between three sites: the Ruins, the Brick kilns and the Upper farms. Its main cache sits at one of them.</dd>
<dt>MISSION</dt><dd>Keep Route Amber open for five convoys and capture or kill the leader within ten days.</dd>
<dt>YOU HAVE</dt><dd>Nine rifle squads, an 81mm mortar section and two SATCOM terminals. Battalion can lend an ISR aircraft, attack helicopters and MEDEVAC when brigade can spare them.</dd>
<dt>HOW THIS WORKS</dt><dd><ul>
<li>You never move units yourself. You issue orders, then follow the radio net and the map.</li>
<li>The map shows what your ops center knows. A dashed marker is an old report; the dashed circle is where the plan says they should be.</li>
<li>Radio coverage follows the terrain. A squad on an observation post relays for the places around it, and Hill 402 is the best site.</li>
<li>Enemy numbers are estimates. Patrols, observation posts and ISR narrow them, and old reports go stale.</li>
<li>Every squad outside the wire is one that is not resting, guarding the base or standing by as the quick reaction force.</li>
</ul></dd>
<dt>A SOUND FIRST DAY</dt><dd>A guard and a quick reaction force are already posted. Put an observation post on Hill 402, then clear Route Amber with a mounted patrol before the first convoy at D2 0900.</dd></dl>
<div class="row">${resume ? `<button class="btn pri" data-a="begin">Continue deployment, ${dtg(S.t)}</button><button class="btn" data-a="new">Start a new deployment</button>` : `<button class="btn pri" data-a="begin">Take command</button>`}</div>`;
  }
  function decsHtml() {
    let h = `<h1><small>${dtg(S.t)} · CLOCK STOPPED</small>Your call</h1>`; if (UI.decErr) h += `<div class="msg">${esc(UI.decErr)}</div>`;
    S.decs.forEach(d => { h += `<div class="card crit"><div class="hd"><b>${esc(d.title)}</b></div><p>${esc(d.text)}</p><div class="row">${d.opts.map((o, i) => `<button class="btn${i === 0 ? ' pri' : ''}" data-a="dec:${d.id}:${o.k}">${esc(o.label)}</button>`).join('')}</div></div>`; });
    return h + `<button class="btn" data-a="close">Look at the map first</button>`;
  }
  function aarHtml() {
    const R = S.result, E = S.enemy, st = S.stats;
    let h = `<h1><small>AFTER-ACTION REVIEW · ${dtg(S.t)}</small>Deployment over</h1><div class="grade">${R.grade}</div><p>${esc(R.why)} Score ${R.pts}.</p>`;
    h += `<div class="card ${E.leader !== 'atlarge' ? 'blue' : 'crit'}"><div class="kv">Network leader: <b>${E.leader === 'atlarge' ? 'still at large, at ' + N[E.leaderAt].name + ' when the clock ran out' : E.leader}</b><br>Main cache: <b>${E.cacheDestroyed ? 'destroyed' : 'intact at ' + N[E.cacheAt].name}</b><br>Convoys: <b>${st.convoys} of 5 delivered</b>, ${st.convoyLost} turned back, ${st.ied} IED strikes<br>Friendly: <b>${st.kia} killed in action, ${st.dow} died of wounds, ${st.wia} wounded</b><br>Enemy: <b>${st.enemyKia} killed</b>, about ${R.enemyLeft} remain</div></div>`;
    h += `<h2>What happened, and when you knew</h2><p class="mute">Every event the simulation recorded, with the delay before your ops center learned of it.</p>`;
    h += S.truth.map(x => { const k = x.knownAt == null ? ['never', 'Never reported to you'] : x.knownAt - x.t <= 5 ? ['now', 'Known at once'] : ['lateK', 'You learned ' + SIM.fmtDur(x.knownAt - x.t) + ' later']; return `<div class="tl"><span>${dtg(x.t)}</span><span>${esc(x.text)}</span><span class="k ${k[0]}">${k[1]}</span></div>`; }).join('');
    return h + `<div class="row"><button class="btn pri" data-a="new">New deployment</button><button class="btn" data-a="close">Look around the map</button></div>`;
  }
  function menuHtml() { return `<h1><small>${dtg(S.t)}</small>Menu</h1><div class="row"><button class="btn" data-a="sheet:brief">Read the order again</button>${S.over ? `<button class="btn" data-a="sheet:aar">After-action review</button>` : `<button class="btn" data-a="end">End the deployment now and review it</button>`}<button class="btn" data-a="new">Start a new deployment</button><button class="btn pri" data-a="close">Back</button></div><p class="mute">Prototype 0.0.1. Progress saves in this browser each game hour.</p>`; }
  function renderSheet() {
    const el = $('sheet'); el.classList.toggle('on', !!UI.sheet); if (!UI.sheet) return;
    $('sheetIn').innerHTML = UI.sheet === 'decs' ? decsHtml() : UI.sheet === 'aar' ? aarHtml() : UI.sheet === 'menu' ? menuHtml() : briefHtml(UI.sheet === 'resume');
  }

  /* ---------- render ---------- */
  function renderTop() {
    const night = SIM.isNight(S.t); document.documentElement.dataset.phase = night ? 'night' : 'day';
    $('clock').textContent = `D${SIM.dayOf(S.t)} ${hhmm(S.t)}`;
    document.querySelectorAll('#speed button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v === S.speed)));
    const Kk = S.stocks, L = SIM.tocLoad(S); const c = (v, lo, out) => v <= out ? 'out' : v <= lo ? 'lo' : '';
    $('strip').innerHTML = `<span class="ph">${night ? 'NIGHT' : 'DAY'}</span><span class="${c(Kk.fuel, 450, 0)}">FUEL <b>${Math.round(Kk.fuel)} L</b></span><span class="${c(Kk.rations, 1.2, 0.05)}">RATIONS <b>${Kk.rations.toFixed(1)} d</b></span><span class="${c(Kk.ammo, 2, 0.3)}">AMMO <b>${Kk.ammo.toFixed(1)}</b></span><span class="${c(Kk.mortar, 12, 5)}">81MM <b>${Kk.mortar}</b></span><span class="${L.load > L.cap ? 'out' : L.load === L.cap ? 'lo' : ''}">OPS CENTER LOAD <b>${L.load}/${L.cap}</b></span><span>LOSSES <b>${S.stats.kia + S.stats.dow} KIA · ${S.stats.wia} WIA</b></span>`;
    const w = $('why'), paused = S.speed === 0 && !S.over; w.classList.toggle('on', paused || S.over);
    if (S.over) w.innerHTML = `<span class="t"><b>OVER</b> ${esc(S.result.why)}</span><button class="hot" data-a="sheet:aar">Review</button>`;
    else if (paused) { const d = S.decs.length; w.innerHTML = `<span class="t"><b>PAUSED</b> ${esc(S.pauseWhy || 'Clock stopped.')}</span>` + (d ? `<button class="hot" data-a="sheet:decs">${d} decision${d > 1 ? 's' : ''}</button>` : `<button data-a="resume">Resume</button>`); }
    document.querySelectorAll('#nav button, #sideTabs button').forEach(b => { const t = b.dataset.a.split(':')[1]; b.setAttribute('aria-current', String(b.parentNode.id === 'nav' ? UI.tab === t : UI.ptab === t)); });
  }
  function render() {
    document.body.dataset.tab = UI.tab; renderTop(); $('map').innerHTML = mapSvg(); $('info').innerHTML = infoHtml(); $('panel').innerHTML = panelHtml(); renderSheet();
  }
  function renderLive() {
    renderTop(); $('map').innerHTML = mapSvg();
    const ae = document.activeElement, busy = ae && (ae.tagName === 'SELECT' || ae.tagName === 'INPUT');
    if (!UI.plan && !busy) $('info').innerHTML = infoHtml();
    if (!busy) $('panel').innerHTML = panelHtml();
    if (S.over && UI.sheet !== 'aar') { UI.sheet = 'aar'; renderSheet(); }
    else if (S.decs.length && !UI.sheet) { UI.sheet = 'decs'; renderSheet(); }
  }

  /* ---------- actions ---------- */
  function save() { try { const g = S._sig; delete S._sig; localStorage.setItem(KEY, JSON.stringify(S)); S._sig = g; } catch (e) { if (S && !S._sig) S._sig = SIM.sigMap(S); } }
  function load() { try { const j = localStorage.getItem(KEY); if (!j) return null; const o = JSON.parse(j); if (o && o.v === 1 && o.squads) { o._sig = SIM.sigMap(o); o.speed = 0; return o; } } catch (e) { /* no saved game */ } return null; }
  function newGame() { S = SIM.newGame(((Date.now() % 2147483000) | 1)); UI.plan = null; UI.sel = null; UI.msg = null; UI.tab = 'map'; UI.sheet = 'brief'; UI.req.d = 1; UI.req.h = 20; }
  function setSpeed(v) { if (S.over) { UI.sheet = 'aar'; return; } if (v > 0 && S.decs.length) { UI.sheet = 'decs'; return; } S.speed = v; if (v > 0) { UI.last = v; S.pauseWhy = ''; } else S.pauseWhy = 'You stopped the clock.'; }
  function openPlan(mode, preset) {
    S.speed = 0; S.pauseWhy = 'Planning. Resume when the order is issued.'; UI.tab = 'map'; UI.sel = null;
    const P = Object.assign({ mode, kind: 'patrol', squads: [], support: [], mounted: false, sat: false, satS: false, wps: [], d: SIM.dayOf(S.t), h: 'now', dwellH: 12, lostAfter: 120, lostAction: 'rtb', obj: null, supNode: null, via: null, needGo: true, noGo: 'abort', abortCas: 3 }, preset);
    if (mode === 'op') { const t = Math.floor((S.t + 12 * 60) / DAY) * DAY + DAY + 120; P.d = SIM.dayOf(t); P.h = 2; P.lostAfter = 360; P.lostAction = 'continue'; if (P.obj) setObj(P, P.obj); }
    if (P.kind === 'escort') { P.mounted = true; const c = S.convoys.find(x => x.state === 'sched'); if (c) { const t = c.due - 90; if (t > S.t) { P.d = SIM.dayOf(t); P.h = SIM.hour(t); } } }
    UI.plan = P;
  }
  function setObj(P, id) { P.obj = id; P.via = null; const nb = ADJ[id].map(a => a.to).filter(x => x !== 'fob').sort((a, b) => (OBJS.includes(a) ? 2 : N[a].high ? 0 : 1) - (OBJS.includes(b) ? 2 : N[b].high ? 0 : 1)); P.supNode = nb[0] || null; }
  function tapNode(id) {
    const P = UI.plan;
    if (!P) { UI.sel = UI.sel === id ? null : id; return; }
    if (id === 'fob') return;
    if (P.mode === 'op') { setObj(P, id); return; }
    if (P.kind === 'escort') return;
    if (P.wps[P.wps.length - 1] === id) P.wps.pop(); else if (P.wps.length < 6) P.wps.push(id);
  }
  function toggleSq(id) {
    const P = UI.plan, a = P.squads.indexOf(id), b = P.support.indexOf(id);
    if (P.mode !== 'op') { if (a >= 0) P.squads.splice(a, 1); else P.squads.push(id); return; }
    if (a >= 0) { P.squads.splice(a, 1); P.support.push(id); } else if (b >= 0) P.support.splice(b, 1); else P.squads.push(id);
  }
  function res(r, okText) { UI.msg = r.ok ? { ok: true, text: okText } : { text: r.err || 'That did not work.' }; }
  function act(a, p, q) {
    UI.msg = null; UI.decErr = null; const el = () => S.els.find(e => e.id === +p);
    switch (a) {
      case 'tab': UI.tab = p; if (p !== 'map') UI.ptab = p; break;
      case 'speed': setSpeed(+p); break;
      case 'resume': setSpeed(UI.last || 1); break;
      case 'node': tapNode(p); break;
      case 'plan-order': openPlan('order', { kind: 'patrol' }); break;
      case 'plan-escort': openPlan('order', { kind: 'escort' }); break;
      case 'plan-op': openPlan('op', {}); break;
      case 'order-here': openPlan('order', { kind: 'op', wps: [p] }); break;
      case 'op-here': openPlan('op', { obj: p }); break;
      case 'isr-here': UI.req.node = p; UI.req.type = 'isr'; UI.tab = UI.ptab = 'support'; break;
      case 'plan-cancel': UI.plan = null; break;
      case 'plan-issue': { const P = UI.plan; const r = P.mode === 'op' ? SIM.planOp(S, opOfP(P)) : SIM.issue(S, orderOf(P)); if (r.ok) { UI.plan = null; UI.msg = { ok: true, text: 'Order issued. Resume the clock when ready.' }; } else UI.msg = { text: r.err }; break; }
      case 'kind': UI.plan.kind = p; if (p === 'escort') { UI.plan.wps = []; UI.plan.mounted = true; } break;
      case 'sq': toggleSq(p); break;
      case 'wpdel': UI.plan.wps.splice(+p, 1); break;
      case 'task': SIM.setTask(S, p, q); break;
      case 'recall': if (el()) res(SIM.cmd(S, el(), 'rtb'), 'Recall order sent.'); break;
      case 'brk': if (el()) res(SIM.cmd(S, el(), 'break'), 'Break contact ordered.'); break;
      case 'qrf-el': res(SIM.launchQRF(S, { el: +p }), 'QRF alerted. Post another squad to QRF if you want a second reserve.'); break;
      case 'qrf-node': res(SIM.launchQRF(S, { node: p }), 'QRF alerted. Post another squad to QRF if you want a second reserve.'); break;
      case 'awt': res(SIM.reqAwtNow(S), 'Attack aviation scrambled.'); break;
      case 'dec': { const r = SIM.decide(S, +p, q); if (!r.ok && r.err) UI.decErr = r.err; if (!S.decs.length && !UI.decErr) { UI.sheet = null; S.pauseWhy = 'Decision made. Resume when ready.'; } break; }
      case 'sheet': UI.sheet = p; break;
      case 'close': case 'begin': UI.sheet = null; break;
      case 'filter': UI.filter = p; break;
      case 'req-send': { const R = UI.req; res(SIM.request(S, { type: R.type, node: R.node, start: tOf(R.d, R.h), dur: R.dur }), 'Request sent to battalion.'); break; }
      case 'me': res(SIM.reqMainEffort(S), 'Request sent to battalion.'); break;
      case 'new': newGame(); break;
      case 'end': SIM.endGame(S, 'You closed the deployment early.'); UI.sheet = 'aar'; break;
    }
    save(); render();
  }
  function chg(k, v) {
    const P = UI.plan, R = UI.req;
    switch (k) {
      case 'pd': P.d = +v; break; case 'ph': P.h = v === 'now' ? 'now' : +v; break;
      case 'dwellH': case 'lostAfter': case 'abortCas': P[k] = +v; break;
      case 'lostAction': case 'noGo': case 'supNode': P[k] = v; break;
      case 'via': P.via = v || null; break;
      case 'mounted': case 'sat': case 'satS': case 'needGo': P[k] = !!v; break;
      case 'rtype': R.type = v; break; case 'rnode': R.node = v; break; case 'rd': R.d = +v; break; case 'rh': R.h = +v; break; case 'rdur': R.dur = +v; break;
    }
    render();
  }
  document.addEventListener('click', e => { const t = e.target.closest('[data-a]'); if (!t || t.disabled) return; const a = t.dataset.a.split(':'); act(a[0], a[1], a[2]); });
  document.addEventListener('change', e => { const t = e.target.closest('[data-c]'); if (!t) return; chg(t.dataset.c, t.type === 'checkbox' ? t.checked : t.value); });

  const RATE = { 1: 1, 2: 6, 3: 30 };
  function loop() {
    if (!S || S.over || !S.speed || UI.sheet) return;
    if (S.decs.length) { S.speed = 0; renderLive(); return; }
    UI.acc += RATE[S.speed] * 0.1; let n = 0;
    while (UI.acc >= 1 && S.speed > 0 && n < 6) { SIM.tick(S); UI.acc -= 1; n++; if (S.t % 60 === 0) save(); }
    if (!S.speed) UI.acc = 0;
    if (n) renderLive();
  }
  function start(data) {
    if (data && data.S && data.S.v === 1) { S = data.S; S._sig = SIM.sigMap(S); S.speed = 0; }
    else { S = load(); if (S) UI.sheet = S.over ? 'aar' : 'resume'; else newGame(); }
    UI.req.d = Math.min(11, SIM.dayOf(S.t));
    if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => { const c = JSON.parse(JSON.stringify(S)); delete c._sig; return { S: c }; });
    render(); setInterval(loop, 100);
  }
  const hot = window.claude && window.claude.hot;
  if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
  window.__fob = { get S() { return S; }, UI, act, render };
})();
