'use strict';
(function () {
  const { DAY, ST, STN, PTS, STEPS, TASKN, hhmm, dtg, plural } = SIM;
  const KEY = 'fob-kestrel-save-v2';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = id => document.getElementById(id);
  let S = null; const UI = { tab: 'base', ptab: 'routines', sheet: null, acc: 0, last: 1, seen: 0 };
  const COPY = {
    posture: ['Security first', 'Nothing is built and nobody knows this ground yet. Every squad on the perimeter is one that is not digging. Set the guard, then the clock starts.', 'Now'],
    build: ['Build order', 'Work parties and the engineer section build one thing at a time, top of the list first. Reorder it whenever your needs change.', 'After the guard is set'],
    cycle: ['Work and rest cycle', 'At each shift change the most tired squads go down to rest and the freshest take the wall. Everyone else works. Too little rest and the company wears out within days.', 'After the build order'],
    night: ['First night', 'Probes come in the dark, most often just before dawn. Stand-to puts every squad on the wall for an hour at dawn and dusk, at the cost of sleep. A QRF squad waits at the gate: ready, but resting poorly.', 'D1 1400'],
    comms: ['Radio routine', 'The mast is up, so patrols can check in on a schedule. Short intervals find trouble sooner but slow the patrol down. Decide what happens when a patrol goes quiet.', 'When the ops center is built'],
    patrols: ['Patrol routine', 'Patrols keep rocket teams off Hill 402 and out of the Orchards, and make night probes less likely. They come out of the work party. Fixed times are simple to run and simple to ambush.', 'When the wire is up, or D2 0600'],
    supply: ['Resupply routine', 'Convoys bring rations, fuel and mortar rounds up Route Amber. Clearing the route and riding escort each take a squad off the work party for the morning.', 'D2 1000'],
    cas: ['Casualty procedure', 'Decide now how an urgent casualty leaves the base, so nobody has to ask when it happens.', 'When the aid station or landing zone is built']
  };

  /* ---------- controls ---------- */
  const get = k => k.indexOf('sop.') === 0 ? S.cfg.sop[k.slice(4)] : S.cfg[k];
  const put = (k, v) => { if (k.indexOf('sop.') === 0) S.cfg.sop[k.slice(4)] = v; else S.cfg[k] = v; };
  const num = (k, label) => `<div class="num"><span>${label}</span><span class="stp"><button data-a="adj:${k}:-1" aria-label="Fewer: ${label}">−</button><b>${get(k)}</b><button data-a="adj:${k}:1" aria-label="More: ${label}">+</button></span></div>`;
  const seg = (k, label, opts) => `<div class="num"><span>${label}</span><span class="seg" role="group" aria-label="${label}">${opts.map(o => `<button data-a="set:${k}:${o[0]}" aria-pressed="${String(get(k)) === String(o[0])}">${o[1]}</button>`).join('')}</span></div>`;
  const chk = (k, label) => `<label class="ck" for="c_${k}"><input type="checkbox" id="c_${k}" data-c="${k}"${get(k) ? ' checked' : ''}>${label}</label>`;
  function rosterGrid(hours) {
    const P = SIM.project(S, hours), h0 = SIM.hour(S.t); let h = `<div class="rg" style="grid-template-columns:34px repeat(${hours},1fr)"><span></span>`;
    for (let i = 0; i < hours; i++) h += `<span class="rh">${(h0 + i) % 3 === 0 ? String((h0 + i) % 24).padStart(2, '0') : ''}</span>`;
    Object.keys(P.grid).forEach(id => { h += `<span class="ri">${id}</span>` + P.grid[id].map(t => `<span class="rc t-${t}" title="${TASKN[t]}"></span>`).join(''); });
    return h + `</div><div class="lg"><span><i class="rc t-sec"></i>Security</span><span><i class="rc t-work"></i>Work</span><span><i class="rc t-qrf"></i>QRF</span><span><i class="rc t-rest"></i>Rest</span></div>`;
  }
  function sustain() {
    const P = SIM.project(S, 72), c = S.cfg, w = 9 - c.sec - c.rest - c.qrf;
    const s = P.exhaustAt == null ? `<b class="good">Sustainable.</b> Worst squad peaks at fatigue ${P.worst} over the next three days.` : `<b class="bad">Not sustainable.</b> A squad reaches exhaustion in about ${P.exhaustAt} hours.`;
    return `<div class="est"><span>${plural(c.sec, 'squad')} on security, ${c.qrf} on QRF, ${c.rest} resting, <b>${w} working</b>. Shifts change every ${c.shift} hours.</span><span>${s}</span></div>`;
  }
  function ctrl(step) {
    const c = S.cfg;
    switch (step) {
      case 'posture': return num('sec', 'Squads on security') + `<p class="mute">You have nine squads. Two is a thin but workable guard for a quiet first day.</p>`;
      case 'build': return `<ol class="bq">` + S.queue.map((id, i) => { const b = STN[id], left = Math.max(0, b.h - (S.prog[id] || 0)); return `<li><span class="bn"><b>${b.name}</b><small>${b.fx} ${Math.round(left)} squad-hours left.</small></span><span class="stp"><button data-a="q:${id}:-1"${i === 0 ? ' disabled' : ''} aria-label="Move ${b.name} up">↑</button><button data-a="q:${id}:1"${i === S.queue.length - 1 ? ' disabled' : ''} aria-label="Move ${b.name} down">↓</button></span></li>`; }).join('') + `</ol>` + (S.queue.length ? '' : '<p class="mute">Everything is built.</p>');
      case 'cycle': return seg('shift', 'Shift length', [[6, '6 h'], [8, '8 h'], [12, '12 h']]) + num('rest', 'Squads resting') + sustain() + rosterGrid(24);
      case 'night': return chk('standto', 'Stand-to at dawn (0500) and dusk (1830), one hour each') + num('qrf', 'Squads on QRF standby') + seg('sop.probe', 'Movement seen outside the wire', [['standto', 'All hands'], ['observe', 'Observe']].concat(SIM.built(S, 'mort') ? [['illum', 'Illuminate']] : [])) + sustain();
      case 'comms': return seg('check', 'Patrol check-in every', [[30, '30 min'], [60, '60 min'], [120, '2 h']]) + seg('sop.lost', 'Two check-ins missed', [['wait', 'Keep trying'], ['qrf', 'Launch QRF']]);
      case 'patrols': return num('patrols', 'Patrols per day') + chk('vary', 'Vary start times by up to two hours each day') + `<div class="num"><span>Visit</span><span class="chips">${Object.keys(PTS).map(p => `<button class="chip" data-a="pt:${p}" aria-pressed="${c.pts.includes(p)}">${PTS[p].name}</button>`).join('')}</span></div>` + seg('sop.contact', 'Patrol in contact', [['break', 'Break contact'], ['qrf', 'Launch QRF']].concat(SIM.built(S, 'mort') ? [['mort', 'Mortars']] : []));
      case 'supply': return seg('convEvery', 'Convoy every', [[2, '2 days'], [3, '3 days']]) + chk('clear', 'Clear Route Amber before each convoy (one squad, 3 h)') + chk('escort', 'Escort each convoy in (one squad, 3 h)') + `<p class="mute">Next convoy ${dtg(S.nextConvoy)}. Fewer convoys carry more each and are exposed less often, but losing one hurts more.</p>`;
      case 'cas': return seg('sop.cas', 'Urgent casualty', [['air', 'Air MEDEVAC'], ['ground', 'By road']]) + `<p class="mute">${SIM.built(S, 'lz') ? 'The landing zone is built, so helicopters can lift from the base.' : 'Air MEDEVAC needs the landing zone. Until it is built, casualties go by road whatever you choose.'}${SIM.built(S, 'aid') ? '' : ' With no aid station, the road trip is the dangerous part.'}</p>`;
    }
    return '';
  }

  /* ---------- base diagram ---------- */
  const POS = { toc: [106, 120, 46, 26], shel: [162, 120, 92, 22], aid: [106, 156, 30, 22], pts: [146, 198, 48, 20] };
  const POSTS = [[104, 116], [256, 116], [256, 224], [104, 224], [180, 114], [259, 170], [101, 170], [140, 226], [220, 226]];
  const G = [180, 238], PT = { fob: G, rdg: [52, 52], orc: [308, 60], kes: [252, 298] };
  const LEG = { 'fob>rdg': [G, [84, 238], [84, 104], PT.rdg], 'fob>orc': [G, [276, 238], [276, 104], PT.orc], 'fob>kes': [G, [190, 262], PT.kes], 'rdg>orc': [PT.rdg, [180, 38], PT.orc], 'rdg>kes': [PT.rdg, [58, 262], PT.kes], 'orc>kes': [PT.orc, [322, 250], PT.kes] };
  function legPts(a, b) { return LEG[a + '>' + b] || LEG[b + '>' + a].slice().reverse(); }
  function along(pts, f) {
    let tot = 0; const d = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); d.push(l); tot += l; }
    let r = f * tot; for (let i = 0; i < d.length; i++) { if (r <= d[i]) { const k = r / d[i]; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; } r -= d[i]; }
    return pts[pts.length - 1];
  }
  const pl = pts => pts.map(p => p[0] + ',' + p[1]).join(' ');
  function baseSvg() {
    const b = id => SIM.built(S, id), pr = id => b(id) ? 1 : Math.min(1, (S.prog[id] || 0) / STN[id].h), cls = id => b(id) ? 'sb' : (S.queue[0] === id && S.started ? 'sw' : 'sp');
    let s = '';
    for (let x = 0; x <= 360; x += 30) s += `<line class="g" x1="${x}" y1="0" x2="${x}" y2="330"/>`; for (let y = 0; y <= 330; y += 30) s += `<line class="g" x1="0" y1="${y}" x2="360" y2="${y}"/>`;
    [[52, 52, 44, 30, -20, 4], [308, 250, 40, 60, 10, 3], [30, 280, 50, 34, 15, 3]].forEach(h => { for (let i = 0; i < h[5]; i++) { const k = 1 - i / (h[5] + 0.6); s += `<ellipse class="ct" cx="${h[0]}" cy="${h[1]}" rx="${h[2] * k}" ry="${h[3] * k}" transform="rotate(${h[4]} ${h[0]} ${h[1]})"/>`; } });
    for (let i = 0; i < 22; i++) s += `<circle class="veg" cx="${308 + ((i * 37) % 13 - 6) * 3.4}" cy="${60 + ((i * 53) % 11 - 5) * 3}" r="1.8"/>`;
    for (let i = 0; i < 7; i++) s += `<rect class="bld" x="${252 + ((i * 29) % 9 - 4) * 3}" y="${298 + ((i * 47) % 7 - 3) * 3}" width="3.4" height="2.6"/>`;
    s += `<polyline class="rd1" points="${pl([G, [190, 262], PT.kes, [330, 330]])}" fill="none"/><polyline class="rd2" points="${pl([G, [190, 262], PT.kes, [330, 330]])}" fill="none"/>`;
    ['rdg', 'orc'].forEach(p => { s += `<polyline class="ft" fill="none" points="${pl(legPts('fob', p))}"/>`; });
    s += `<text class="rt" x="296" y="322" transform="rotate(36 296 322)" text-anchor="middle">ROUTE AMBER</text>`;
    s += `<path class="ns" d="M52 44L60 58H44Z"/><text class="nl" x="64" y="56">HILL 402</text><circle class="ns" cx="308" cy="60" r="4"/><text class="nl" x="300" y="48" text-anchor="end">ORCHARDS</text><rect class="ns" x="247.5" y="293.5" width="9" height="9"/><text class="nl" x="240" y="306" text-anchor="end">KESSA</text>`;
    ['rdg', 'orc'].forEach(p => { if (S.cover[p] > S.t - 720) s += `<text class="mt mtb" x="${PT[p][0]}" y="${PT[p][1] + 22}" text-anchor="middle">PATROLLED ${Math.round((S.t - S.cover[p]) / 60)}H AGO</text>`; });
    s += `<rect class="${b('wire') ? 'wall' : 'wallp'}" x="95" y="110" width="170" height="120"/>`;
    if (!b('wire') && pr('wire') > 0) s += `<rect class="wall" x="95" y="110" width="170" height="120" pathLength="100" stroke-dasharray="${(pr('wire') * 100).toFixed(1)} 100"/>`;
    s += `<rect class="gate" x="170" y="226" width="20" height="8"/><text class="mt" x="180" y="250" text-anchor="middle">GATE</text>`;
    [[95, 110], [265, 110], [265, 230], [95, 230]].forEach(p => { s += `<rect class="${cls('tow')}" x="${p[0] - 6}" y="${p[1] - 6}" width="12" height="12"/>`; });
    const box = (id, label) => { const p = POS[id]; s += `<rect class="${cls(id)}" x="${p[0]}" y="${p[1]}" width="${p[2]}" height="${p[3]}"/>` + (b(id) ? '' : `<rect class="fill" x="${p[0]}" y="${p[1]}" width="${(p[2] * pr(id)).toFixed(1)}" height="${p[3]}"/>`) + `<text class="sl" x="${p[0] + p[2] / 2}" y="${p[1] + p[3] / 2 + 3}" text-anchor="middle">${label}</text>`; };
    box('toc', 'OPS'); box('shel', 'SHELTERS'); box('aid', 'AID'); box('pts', 'FUEL · AMMO');
    if (b('toc')) s += `<path class="nx" d="M152 120V98M146 104L152 98L158 104"/>`;
    s += `<circle class="${cls('mort')}" cx="232" cy="176" r="12"/><text class="sl" x="232" y="179" text-anchor="middle">81</text><circle class="${cls('lz')}" cx="312" cy="190" r="15"/><text class="sl" x="312" y="194" text-anchor="middle">LZ</text>`;
    if (S.queue.length && S.started) { const id = S.queue[0]; const at = POS[id] ? [POS[id][0] + POS[id][2] / 2, POS[id][1] - 4] : id === 'mort' ? [232, 160] : id === 'lz' ? [312, 171] : id === 'tow' ? [180, 100] : [180, 100]; s += `<text class="mt wk" x="${at[0]}" y="${at[1]}" text-anchor="middle">BUILDING ${Math.round(pr(id) * 100)}%</text>`; }
    const st = SIM.standTo(S), cnt = {}; const n = k => { cnt[k] = (cnt[k] || 0) + 1; return cnt[k] - 1; };
    const wp = S.queue.length ? (POS[S.queue[0]] ? [POS[S.queue[0]][0] + 4, POS[S.queue[0]][1] + POS[S.queue[0]][3] + 9] : S.queue[0] === 'mort' ? [214, 198] : S.queue[0] === 'lz' ? [286, 214] : [112, 190]) : [112, 190];
    S.squads.forEach(q => {
      if (q.str < 1) return; let x, y, c = q.task;
      if (q.task === 'patrol') { const P = S.patrols.find(p => p.sq === q.id); if (!P) return; const L = P.legs[Math.min(P.li, P.legs.length - 1)]; const prev = P.halting > 0 && P.li > 0 ? P.legs[P.li - 1] : null; const xy = prev ? PT[prev.to] : along(legPts(L.from, L.to), Math.min(1, (L.done || 0) / L.min)); x = xy[0]; y = xy[1] - 12; }
      else if (q.task === 'convoy') { const i = n('cv'); x = 214 + i * 26; y = 280; }
      else if (q.task === 'qrfout') { x = 206; y = 256; }
      else if (st || q.task === 'sec') { const p = POSTS[n('sec') % POSTS.length]; x = p[0]; y = p[1]; c = 'sec'; }
      else if (q.task === 'qrf') { const i = n('qrf'); x = 168 + i * 26; y = 214; }
      else if (q.task === 'rest') { const i = n('rest'); x = 172 + (i % 4) * 24; y = 152 + Math.floor(i / 4) * 13; }
      else { const i = n('work'); x = wp[0] + 8 + (i % 3) * 24; y = wp[1] + Math.floor(i / 3) * 13; }
      s += `<g class="sq t-${c}"><rect x="${(x - 11).toFixed(1)}" y="${(y - 5.5).toFixed(1)}" width="22" height="11"/><text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="middle">${q.id}</text></g>`;
    });
    if (!S.started) s += `<text class="mt" x="180" y="96" text-anchor="middle">PLANNED LAYOUT · NOTHING BUILT</text>`;
    return s;
  }

  /* ---------- panels ---------- */
  function lnHtml(l) { return `<div class="ln s${l.sev}"><span class="tm">${dtg(l.t)}</span><span><span class="fr">${esc(l.from)}</span> ${esc(l.text)}</span></div>`; }
  function flashHtml() {
    return S.prompts.map(p => { const left = Math.max(0, p.at - S.t); return `<div class="card crit"><div class="hd"><b>${esc(p.title)}</b><span class="tag crit">${left} min</span></div><p>${esc(p.text)}</p><div class="cd"><i style="width:${(left / 30 * 100).toFixed(0)}%"></i></div><div class="row">${p.opts.map(o => `<button class="btn sm${o.k === p.sop ? ' pri' : ''}" data-a="pr:${p.id}:${o.k}">${esc(o.label)}${o.k === p.sop ? ' · standing' : ''}</button>`).join('')}</div><p class="mute" style="font-size:12px">The standing procedure applies if you do nothing.</p></div>`; }).join('');
  }
  function staffHtml() {
    if (S.over) return `<div class="card acc"><div class="hd"><b>Deployment over</b></div><div class="row"><button class="btn pri" data-a="sheet:review">Read the review</button></div></div>`;
    const st = S.guide.cur;
    if (st) { const i = STEPS.indexOf(st) + 1; return `<div class="card acc"><div class="hd"><span class="tag">Step ${i} of ${STEPS.length}</span><b>${COPY[st][0]}</b></div><p>${COPY[st][1]}</p>${ctrl(st)}<div class="row"><button class="btn pri" data-a="ok:${st}">${st === 'posture' ? 'Set the guard and start the clock' : 'Confirm'}</button><button class="btn" data-a="rec:${st}">Use the staff recommendation</button></div></div>`; }
    let h = `<div class="card"><div class="hd"><b>Routines running</b></div>`; const next = STEPS.find(x => !S.guide.done[x]);
    if (S.queue.length) { const id = S.queue[0]; h += `<div class="kv">Building <b>${STN[id].name}</b>, ${Math.round(STN[id].h - (S.prog[id] || 0))} squad-hours left. ${S.queue.length - 1} more after it.</div>`; } else h += `<div class="kv">Base fully built ${dtg(S.buildDone)}.</div>`;
    h += `<div class="kv">Next shift change <b>${dtg(S.nextShift)}</b>. Next convoy <b>${dtg(S.nextConvoy)}</b>.${S.sched.length ? ` Next patrol about <b>${hhmm(S.sched[0])}</b>.` : ''}</div>`;
    h += next ? `<div class="kv">Next staff question: <b>${COPY[next][0]}</b> (${COPY[next][2]}).</div>` : `<div class="kv">All routines are set. Adjust them under Routines as the enemy adapts. Review at D7 0600.</div>`;
    return h + '</div>';
  }
  function routinesHtml() {
    let h = ''; STEPS.forEach(st => { if (st === 'posture' && !S.guide.done.posture) return; if (S.guide.done[st]) h += `<h2>${COPY[st][0]}</h2>${ctrl(st)}`; else h += `<div class="lock"><b>${COPY[st][0]}</b><span>${st === S.guide.cur ? 'Waiting for your answer on the Base view' : 'Opens: ' + COPY[st][2]}</span></div>`; });
    return h || '<p class="mute">Routines appear here once you have set them.</p>';
  }
  function rosterHtml() {
    let h = `<h2>Next 24 hours</h2>${S.started ? rosterGrid(24) : '<p class="mute">The roster starts when you set the guard.</p>'}<h2>Squads</h2>`;
    S.squads.forEach(q => { const f = Math.round(q.fat); h += `<div class="sq2"><div><span class="id">${q.id}</span>${esc(q.ldr)}</div><span class="tag t-${q.task}">${S.started ? TASKN[q.task] : 'Unloading'}</span><div class="st"><span>${q.str}/9 pax</span><span>fatigue <span class="bar ${f > 70 ? 'h' : f > 45 ? 'm' : ''}"><i style="width:${f}%"></i></span> ${f}</span></div></div>`; });
    return h;
  }
  function netHtml() { return S.log.slice(-120).reverse().map(lnHtml).join(''); }
  function panelHtml() { return { routines: routinesHtml, roster: rosterHtml, net: netHtml }[UI.ptab](); }
  function reviewHtml() {
    const R = S.result, st = S.stats;
    let h = `<h1><small>DEPLOYMENT REVIEW · ${dtg(S.t)}</small>FOB Kestrel</h1><div class="grade">${R.grade}</div><p>Score ${R.pts}.</p>`;
    h += `<div class="card"><div class="kv">Initial operating capability: <b>${S.ioc ? dtg(S.ioc) : 'not reached'}</b><br>Fully built: <b>${S.buildDone ? dtg(S.buildDone) : 'not finished'}</b><br>Losses: <b>${st.kia} killed, ${st.wia} wounded</b><br>Probes driven off: <b>${st.repelled}</b> · breaches: <b>${st.breaches}</b><br>Convoys: <b>${st.convoys}</b>, ${st.convoyHit} hit on the road<br>Hours without rations: <b>${st.dryHours}</b> · most tired squad at the end: <b>${R.worst}</b></div></div>`;
    h += `<h2>What happened, and what drove it</h2>` + (S.review.length ? S.review.map(r => `<div class="card ${r.good ? 'blue' : 'crit'}"><div class="hd"><b>${esc(r.title)}</b><span class="tag">${dtg(r.t)}</span></div><p>${esc(r.text)}</p><div class="kv">${r.why.map(esc).join(' · ')}</div></div>`).join('') : '<p class="mute">Nothing happened. Suspicious.</p>');
    return h + `<div class="row"><button class="btn pri" data-a="new">New deployment</button><button class="btn" data-a="close">Look around</button></div>`;
  }
  function menuHtml() { return `<h1><small>${dtg(S.t)}</small>Menu</h1><div class="row">${S.over ? '<button class="btn" data-a="sheet:review">Deployment review</button>' : '<button class="btn" data-a="end">End now and review</button>'}<button class="btn" data-a="new">Start a new deployment</button><button class="btn pri" data-a="close">Back</button></div><p class="mute">Prototype 0.0.2. Progress saves in this browser.</p>`; }

  /* ---------- render ---------- */
  function renderTop() {
    const night = SIM.isNight(S.t); document.documentElement.dataset.phase = night ? 'night' : 'day';
    $('clock').textContent = `D${SIM.dayOf(S.t)} ${hhmm(S.t)}`;
    document.querySelectorAll('#speed button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v === S.speed)));
    const K = S.stocks, sec = SIM.security(S), tot = ST.reduce((a, b) => a + b.h, 0), dn = ST.reduce((a, b) => a + (SIM.built(S, b.id) ? b.h : Math.min(b.h, S.prog[b.id] || 0)), 0);
    const avg = Math.round(S.squads.reduce((a, q) => a + q.fat, 0) / S.squads.length), worst = Math.round(Math.max.apply(null, S.squads.map(q => q.fat)));
    $('strip').innerHTML = `<span class="ph">${night ? 'NIGHT' : 'DAY'}${SIM.standTo(S) ? ' · STAND-TO' : ''}</span><span class="${sec < 40 ? 'out' : sec < 60 ? 'lo' : ''}">SECURITY <b>${sec}</b></span><span>BUILT <b>${Math.round(dn / tot * 100)}%</b></span><span class="${worst > 85 ? 'out' : worst > 70 ? 'lo' : ''}">FATIGUE <b>${avg}</b> avg · <b>${worst}</b> worst</span><span class="${K.rations <= 0 ? 'out' : K.rations < 1 ? 'lo' : ''}">RATIONS <b>${K.rations.toFixed(1)} d</b></span><span class="${K.fuel <= 0 ? 'out' : K.fuel < 120 ? 'lo' : ''}">FUEL <b>${Math.round(K.fuel)} L</b></span><span>81MM <b>${K.mortar}</b></span><span>LOSSES <b>${S.stats.kia} KIA · ${S.stats.wia} WIA</b></span>`;
    document.querySelectorAll('#nav button, #sideTabs button').forEach(b => { const t = b.dataset.a.split(':')[1]; b.setAttribute('aria-current', String(b.parentNode.id === 'nav' ? UI.tab === t : UI.ptab === t)); });
    const nb = document.querySelector('#nav button[data-a="tab:base"]'); if (nb) nb.innerHTML = 'Base' + (S.prompts.length || (S.guide.cur && UI.tab !== 'base') ? `<span class="badge">${S.prompts.length || '?'}</span>` : '');
  }
  function busy() { const ae = document.activeElement; return ae && ae.tagName === 'INPUT'; }
  function render(live) {
    document.body.dataset.tab = UI.tab; renderTop(); $('map').innerHTML = baseSvg(); $('flash').innerHTML = flashHtml();
    if (!live || !busy()) { if (!live || !S.guide.cur || S.guide.cur === 'build') $('staff').innerHTML = staffHtml(); if (!live || UI.ptab !== 'routines') $('panel').innerHTML = panelHtml(); }
    if (!live) { const el = $('sheet'); el.classList.toggle('on', !!UI.sheet); if (UI.sheet) $('sheetIn').innerHTML = UI.sheet === 'review' ? reviewHtml() : menuHtml(); }
  }

  /* ---------- actions ---------- */
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
  function load() { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && o.v === 2 && o.squads) return o; } catch (e) { /* none */ } return null; }
  function act(a, p, q) {
    const c = S.cfg;
    switch (a) {
      case 'tab': UI.tab = p; if (p !== 'base') UI.ptab = p; break;
      case 'speed': if (!S.started || S.over) break; S.speed = +p; if (+p) UI.last = +p; break;
      case 'adj': put(p, get(p) + (+q)); SIM.setCfg(S); break;
      case 'set': put(p, isNaN(+q) ? q : +q); SIM.setCfg(S); break;
      case 'pt': { const i = c.pts.indexOf(p); if (i >= 0) c.pts.splice(i, 1); else c.pts.push(p); break; }
      case 'q': { const i = S.queue.indexOf(p), j = i + (+q); if (i >= 0 && j >= 0 && j < S.queue.length) { S.queue.splice(i, 1); S.queue.splice(j, 0, p); } break; }
      case 'ok': SIM.completeStep(S, p); break;
      case 'rec': SIM.recommend(S, p); SIM.completeStep(S, p); break;
      case 'pr': SIM.resolvePrompt(S, +p, q, true); break;
      case 'sheet': UI.sheet = p; break; case 'close': UI.sheet = null; break;
      case 'new': S = SIM.newGame((Date.now() % 2147483000) | 1); UI.sheet = null; UI.tab = 'base'; break;
      case 'end': SIM.endGame(S); UI.sheet = 'review'; break;
    }
    save(); render(false);
  }
  document.addEventListener('click', e => { const t = e.target.closest('[data-a]'); if (!t || t.disabled) return; const a = t.dataset.a.split(':'); act(a[0], a[1], a[2]); });
  document.addEventListener('change', e => { const t = e.target.closest('[data-c]'); if (!t) return; put(t.dataset.c, t.checked); SIM.setCfg(S); save(); render(false); });
  const RATE = { 1: 1, 2: 10, 3: 60 };
  function loop() {
    if (!S || S.over || !S.speed || UI.sheet) return;
    UI.acc += RATE[S.speed] * 0.05; let n = 0; const g0 = S.guide.cur, p0 = S.prompts.length, l0 = S.log.length;
    while (UI.acc >= 1 && n < 4 && !S.over) { SIM.tick(S); UI.acc -= 1; n++; if (S.prompts.length > p0 || S.guide.cur !== g0) { if (S.speed > 1) S.speed = 1; UI.acc = 0; break; } }
    if (!n) return; if (S.t % 30 === 0) save();
    if (S.over) { UI.sheet = 'review'; save(); render(false); } else if (S.guide.cur !== g0 || S.prompts.length !== p0 || (UI.ptab === 'net' && S.log.length !== l0)) render(false); else render(true);
  }
  function start(data) {
    S = (data && data.S && data.S.v === 2) ? data.S : (load() || SIM.newGame((Date.now() % 2147483000) | 1));
    if (S.over) UI.sheet = 'review';
    if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ S: JSON.parse(JSON.stringify(S)) }));
    render(false); setInterval(loop, 50);
  }
  const hot = window.claude && window.claude.hot;
  if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
  window.__fob = { get S() { return S; }, UI, act, render };
})();
