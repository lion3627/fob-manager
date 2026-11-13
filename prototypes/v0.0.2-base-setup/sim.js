'use strict';
/* FOB Kestrel v0.0.2: stand up the base, run it on routines. Pure logic, plain-JSON state, 1 tick = 1 game minute. */
(function (root) {
  const DAY = 1440;
  const ST = [
    { id: 'wire', name: 'Wire and berm', h: 56, fx: 'Stops most breaches and cuts casualties from probes.' },
    { id: 'tow', name: 'Guard towers', h: 34, fx: 'Early warning: probes are seen before they reach the wire.' },
    { id: 'toc', name: 'Ops center and radio mast', h: 25, fx: 'Radio link to patrols and battalion. Starts the generator.' },
    { id: 'shel', name: 'Covered shelters', h: 42, fx: 'Squads recover faster and rockets hurt fewer people.' },
    { id: 'aid', name: 'Aid station', h: 17, fx: 'Wounded are stabilised on site.' },
    { id: 'pts', name: 'Fuel and ammunition points', h: 20, fx: 'Bunkered stocks survive rocket hits.' },
    { id: 'mort', name: 'Mortar pit', h: 14, fx: 'Illumination and counter-fire.' },
    { id: 'lz', name: 'Helicopter landing zone', h: 14, fx: 'Air MEDEVAC straight from the base.' }
  ];
  const STN = {}; ST.forEach(s => { STN[s.id] = s; });
  const PTS = { rdg: { name: 'Hill 402', leg: 25, miss: 0.08 }, orc: { name: 'Orchards', leg: 25, miss: 0.15 }, kes: { name: 'Kessa', leg: 20, miss: 0.05 } };
  const STEPS = ['posture', 'build', 'cycle', 'night', 'comms', 'patrols', 'supply', 'cas'];
  const TASKN = { sec: 'Security', work: 'Work party', rest: 'Rest', qrf: 'QRF standby', patrol: 'Patrol', convoy: 'Convoy task', qrfout: 'QRF deployed' };

  function rnd(S) { S.rs = (S.rs + 0x6D2B79F5) | 0; let t = Math.imul(S.rs ^ (S.rs >>> 15), 1 | S.rs); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const ri = (S, a, b) => a + Math.floor(rnd(S) * (b - a + 1));
  const ch = (S, p) => rnd(S) < p;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hour = t => Math.floor((t % DAY) / 60);
  const dayOf = t => Math.floor(t / DAY) + 1;
  const p2 = n => String(n).padStart(2, '0');
  const hhmm = t => p2(hour(t)) + p2(t % 60);
  const dtg = t => 'D' + dayOf(t) + ' ' + hhmm(t);
  const isNight = t => { const h = hour(t); return h >= 19 || h < 5; };
  const eff = f => f < 60 ? 1 : f < 80 ? 0.8 : 0.55;
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

  function log(S, from, text, sev) { S.log.push({ t: S.t, from, text, sev: sev || 0 }); if (S.log.length > 300) S.log.splice(0, 60); }
  function review(S, title, good, text, why) { S.review.push({ t: S.t, title, good, text, why }); }
  const built = (S, id) => !!S.built[id];
  const inBase = s => s.task !== 'patrol' && s.task !== 'convoy' && s.task !== 'qrfout';
  function standTo(S) { if (!S.cfg.standto) return false; const m = S.t % DAY; return (m >= 300 && m < 360) || (m >= 1110 && m < 1170); }

  /* ---------- roster ---------- */
  function assign(list, cfg) {
    const out = {}, tired = list.slice().sort((a, b) => b.fat - a.fat);
    const R = Math.min(cfg.rest, Math.max(0, list.length - 1));
    tired.slice(0, R).forEach(s => { out[s.id] = 'rest'; });
    const rem = tired.slice(R).reverse(); let i = 0;
    for (let k = 0; k < cfg.sec && i < rem.length; k++) out[rem[i++].id] = 'sec';
    for (let k = 0; k < cfg.qrf && i < rem.length; k++) out[rem[i++].id] = 'qrf';
    for (; i < rem.length; i++) out[rem[i].id] = 'work';
    return out;
  }
  function rate(task, S, t) {
    const n = isNight(t), done = S.buildDone;
    switch (task) {
      case 'sec': return n ? 3 : 2.5; case 'work': return done ? 2 : (n ? 5 : 4.5); case 'rest': return -(built(S, 'shel') ? 12 : 8);
      case 'qrf': return -1.5; case 'patrol': return 6; case 'convoy': return 5; case 'qrfout': return 7;
    }
    return 0;
  }
  function reshift(S) {
    const free = S.squads.filter(s => inBase(s) && s.str >= 3);
    const a = assign(free, S.cfg); free.forEach(s => { s.task = a[s.id]; });
    S.nextShift = S.t + S.cfg.shift * 60;
  }
  /* Project the roster forward: hours x squads, plus the worst fatigue reached. */
  function project(S, hours) {
    const sq = S.squads.filter(s => s.str >= 3).map(s => ({ id: s.id, fat: s.fat, task: inBase(s) ? s.task : 'work' }));
    const grid = {}; sq.forEach(s => { grid[s.id] = []; }); let next = S.nextShift || S.t, worst = 0, at = null;
    for (let i = 0; i < hours; i++) {
      const t = S.t + i * 60;
      if (t >= next) { const a = assign(sq, S.cfg); sq.forEach(s => { s.task = a[s.id]; }); next += S.cfg.shift * 60; }
      sq.forEach(s => { grid[s.id].push(s.task); s.fat = clamp(s.fat + rate(s.task, S, t), 0, 100); if (s.fat > worst) worst = s.fat; if (s.fat >= 85 && at == null) at = i; });
    }
    return { grid, worst: Math.round(worst), exhaustAt: at };
  }
  function security(S) {
    const st = standTo(S); let wall = 0;
    S.squads.forEach(s => { if (s.str >= 3 && (s.task === 'sec' || (st && inBase(s)))) wall += eff(s.fat) * 18 * s.str / 9; });
    return Math.round(Math.min(72, wall) + (built(S, 'tow') ? 14 : 0) + (built(S, 'wire') ? 14 : 0));
  }
  function threat(S) { return clamp((S.t - 360 - 1080) / 2880, 0, 1) * clamp(S.enemy / 35, 0, 1.3); }
  function covered(S) { return ['rdg', 'orc'].some(p => S.cover[p] > S.t - 720); }

  /* ---------- casualties ---------- */
  function hit(S, sq, n, away) {
    let k = 0, w = 0, how = '';
    for (let i = 0; i < n; i++) {
      if (sq.str <= 0) break; sq.str--;
      if (!ch(S, 0.45)) { w++; continue; }
      let p;
      if (built(S, 'lz') && S.cfg.sop.cas === 'air' && ch(S, 0.85)) { p = 0.05; how = 'air MEDEVAC from the landing zone'; }
      else if (built(S, 'aid')) { p = 0.15; how = 'stabilised at the aid station, then moved by road'; }
      else { p = 0.35; how = 'ground evacuation to battalion, 90 minutes by road'; }
      if (away && !built(S, 'toc')) p += 0.15;
      if (ch(S, p)) k++; else w++;
    }
    S.stats.kia += k; S.stats.wia += w; S.guideFlags.cas = true;
    return { k, w, how, text: (k || w) ? `${k ? plural(k, 'killed') + ', ' : ''}${w} wounded${how ? ' (urgent case: ' + how + ')' : ''}` : 'no casualties' };
  }
  function qrfSquad(S) { return S.squads.find(s => s.task === 'qrf' && s.str >= 4); }
  function sendQrf(S) { const q = qrfSquad(S); if (!q) return null; q.task = 'qrfout'; q.until = S.t + 90; return q; }

  /* ---------- prompts: standing procedure applies unless you step in ---------- */
  function prompt(S, p) { if (!p.opts.some(o => o.k === p.sop)) p.sop = p.opts[0].k; p.id = S.pSeq++; p.at = S.t + 30; p.t0 = S.t; S.prompts.push(p); log(S, p.from, p.text + ' Standing procedure: ' + p.opts.find(o => o.k === p.sop).label.toLowerCase() + '.', 2); }
  function resolvePrompt(S, id, k, byYou) {
    const p = S.prompts.find(x => x.id === id); if (!p) return; S.prompts = S.prompts.filter(x => x !== p);
    const tag = byYou ? 'On your order' : 'By standing procedure';
    if (p.kind === 'probe') {
      const wire = built(S, 'wire'); const sq = S.squads.find(s => s.task === 'sec' && s.str > 0) || S.squads.find(s => inBase(s) && s.str > 0);
      if (k === 'standto') { const e = ri(S, 1, 3); S.enemy -= e; const c = ch(S, wire ? 0.05 : 0.15) && sq ? hit(S, sq, 1) : { text: 'no casualties' }; S.squads.forEach(s => { if (s.task === 'rest') s.fat = clamp(s.fat + 3, 0, 100); }); S.stats.repelled++; log(S, 'KESTREL', `${tag}: all hands to the wall. Probe driven off, ${e} enemy hit, ${c.text}. Sleeping squads lost an hour.`, 1); review(S, 'Night probe driven off', true, `${e} enemy hit, ${c.text}.`, p.why.concat(['response: stand-to'])); }
      else if (k === 'illum') { const e = ri(S, 0, 2); S.enemy -= e; S.stocks.mortar = Math.max(0, S.stocks.mortar - 4); S.stats.repelled++; log(S, 'THUNDER', `${tag}: illumination over the north wire. Probe withdrew, ${e} enemy hit. Nobody woken.`, 1); review(S, 'Night probe driven off', true, `Mortar illumination exposed them; ${e} enemy hit.`, p.why.concat(['response: mortar illumination'])); }
      else if (ch(S, 0.5)) { log(S, 'KESTREL', `${tag}: observed only. The probe withdrew after mapping your positions.`, 1); S.enemy += 1; review(S, 'Night probe watched', true, 'They withdrew, having studied the perimeter.', p.why.concat(['response: observe only'])); }
      else { const c = sq ? hit(S, sq, ri(S, 0, 2)) : { text: 'no casualties' }; log(S, 'KESTREL', `${tag}: observed only. The probe pressed in and engaged the wall: ${c.text}.`, 2); review(S, 'Night probe pressed home', false, c.text + '.', p.why.concat(['response: observe only'])); }
    } else if (p.kind === 'contact' || p.kind === 'lost') {
      const sq = S.squads.find(s => s.id === p.sq); if (!sq) return; const real = p.kind === 'contact' || p.real;
      if (k === 'qrf') {
        const q = sendQrf(S);
        if (!real) { log(S, 'QRF', q ? `${tag}: QRF rolled to ${p.where}. ${sq.id} was fine: radio fault. QRF out of the base for 90 minutes.` : `${tag}: no QRF squad was on standby to send.`, 1); review(S, 'Lost comms: false alarm', true, q ? 'QRF launched for a radio fault and was away 90 minutes.' : 'Nothing happened; no QRF was available anyway.', p.why); return; }
        const c = hit(S, sq, q ? ri(S, 0, 1) : ri(S, 0, 2) + p.extra, true), e = q ? ri(S, 2, 4) : ri(S, 0, 2); S.enemy -= e;
        log(S, sq.id, q ? `${tag}: QRF reached us at ${p.where}. Enemy broke, ${e} hit. ${c.text}.` : `${tag}: QRF requested but none on standby. Broke contact alone at ${p.where}: ${c.text}.`, 2);
        review(S, `Patrol contact at ${p.where}`, c.k === 0, `${e} enemy hit, ${c.text}.`, p.why.concat([q ? 'QRF launched' : 'no QRF on standby']));
      } else if (k === 'mort') { const c = hit(S, sq, ri(S, 0, 1), true), e = ri(S, 1, 3); S.enemy -= e; S.stocks.mortar = Math.max(0, S.stocks.mortar - 6); log(S, 'THUNDER', `${tag}: fire mission at ${p.where}. Enemy broke, ${e} hit. ${sq.id}: ${c.text}.`, 2); review(S, `Patrol contact at ${p.where}`, c.k === 0, `${e} enemy hit, ${c.text}.`, p.why.concat(['mortars fired in support'])); }
      else if (!real) { log(S, sq.id, `Back in contact with ${sq.id}. Radio fault, nothing to report.`, 0); }
      else { const c = hit(S, sq, (p.kind === 'lost' ? ri(S, 1, 3) : ri(S, 0, 2)) + p.extra, true), e = ri(S, 0, 2); S.enemy -= e; log(S, sq.id, `${tag}: ${p.kind === 'lost' ? 'nobody came. We were in contact with the radio down' : 'broke contact alone'} at ${p.where}: ${c.text}.`, 2); review(S, p.kind === 'lost' ? `Patrol in trouble at ${p.where}, no help sent` : `Patrol contact at ${p.where}`, c.k === 0 && c.w <= 1, `${e} enemy hit, ${c.text}.`, p.why.concat([p.kind === 'lost' ? 'lost-comms procedure: wait' : 'patrol fought alone'])); }
    }
  }

  /* ---------- events ---------- */
  function probe(S) {
    const sec = security(S), st = standTo(S);
    const det = clamp(0.1 + (built(S, 'tow') ? 0.25 : 0) + sec / 500 + (st ? 0.3 : 0) + (covered(S) ? 0.1 : 0), 0.05, 0.95);
    const why = [plural(S.squads.filter(s => s.task === 'sec').length, 'squad') + ' on the wall', built(S, 'tow') ? 'towers built' : 'no towers yet', built(S, 'wire') ? 'wire and berm complete' : 'no wire yet', st ? 'stand-to in progress' : (S.cfg.standto ? 'outside stand-to hours' : 'no stand-to routine'), covered(S) ? 'patrols out in the last 12 h' : 'no recent patrols'];
    if (ch(S, det)) {
      const opts = [{ k: 'standto', label: 'All hands to the wall' }, { k: 'observe', label: 'Observe only' }]; if (built(S, 'mort') && S.stocks.mortar >= 4) opts.push({ k: 'illum', label: 'Mortar illumination' });
      prompt(S, { kind: 'probe', from: built(S, 'tow') ? 'TOWER 2' : 'NORTH WALL', title: 'Movement outside the wire', text: `Four to eight figures moving ${ri(S, 2, 5) * 100} m north of the perimeter.`, opts, sop: opts.some(o => o.k === S.cfg.sop.probe) ? S.cfg.sop.probe : 'standto', why });
      return;
    }
    const breach = ch(S, (built(S, 'wire') ? 0.25 : 0.7) * (sec < 40 ? 1.3 : 1)); const pool = S.squads.filter(s => inBase(s) && s.str > 0); const sq = pool[ri(S, 0, pool.length - 1)];
    if (breach) {
      const c = sq ? hit(S, sq, ri(S, 1, 3)) : { text: 'no casualties' }; const lose = built(S, 'pts') ? 0.1 : 0.3; S.stocks.fuel *= 1 - lose; S.stocks.rations = Math.max(0, S.stocks.rations - (built(S, 'pts') ? 0.2 : 0.6)); S.stats.breaches++;
      log(S, 'KESTREL', `Perimeter breached without warning. Charges in the stores: ${Math.round(lose * 100)}% of fuel lost. ${c.text}.`, 2); review(S, 'Perimeter breached', false, `Stores hit, ${c.text}.`, why.concat(['not detected']));
    } else { const c = sq && ch(S, 0.35) ? hit(S, sq, 1) : { text: 'no casualties' }; log(S, 'KESTREL', `Harassing fire from the dark, unseen until they opened up: ${c.text}.`, 1); review(S, 'Harassing fire at night', c.text === 'no casualties', c.text + '.', why.concat(['not detected'])); }
  }
  function rockets(S) {
    const n = ri(S, 1, 3); let txt = `Incoming: ${plural(n, 'rocket')} inside the perimeter.`; const why = [built(S, 'shel') ? 'covered shelters built' : 'troops in the open', built(S, 'pts') ? 'stocks bunkered' : 'stocks in the open', covered(S) ? 'launch sites patrolled in the last 12 h' : 'launch sites not patrolled'];
    let bad = false; const pool = S.squads.filter(s => inBase(s) && s.str > 0);
    if (ch(S, built(S, 'shel') ? 0.12 : 0.45) && pool.length) { const c = hit(S, pool[ri(S, 0, pool.length - 1)], 1); txt += ' ' + c.text + '.'; bad = true; }
    if (ch(S, built(S, 'pts') ? 0.08 : 0.3)) { const f = Math.round(S.stocks.fuel * 0.25); S.stocks.fuel -= f; txt += ` Fuel hit, ${f} L lost.`; bad = true; }
    S.disturbed = S.t + 120;
    if (built(S, 'mort') && S.stocks.mortar >= 6) { S.stocks.mortar -= 6; const e = ri(S, 0, 2); S.enemy -= e; S.rocketF *= 0.8; txt += ` Counter-fire on the launch point${e ? ', secondary explosion seen' : ''}.`; why.push('mortar counter-fire'); }
    log(S, 'KESTREL', txt, 2); review(S, 'Rocket attack', !bad, bad ? 'It cost you.' : 'No damage.', why);
  }
  function startPatrol(S) {
    const c = S.cfg; if (!c.pts.length) return;
    const sq = S.squads.filter(s => (s.task === 'work' || (s.task === 'rest' && s.fat < 35)) && s.str >= 6 && s.fat < 80).sort((a, b) => a.fat - b.fat)[0];
    if (!sq) { log(S, 'KESTREL', 'No squad fit and free for the scheduled patrol. Patrol skipped.', 1); return; }
    const foot = S.stocks.fuel < 15; if (!foot) S.stocks.fuel -= 12;
    const mul = (foot ? 2.4 : 1) * (c.check <= 30 && built(S, 'toc') ? 1.2 : 1); const route = ['fob'].concat(c.pts, ['fob']); const legs = [];
    for (let i = 1; i < route.length; i++) { const a = route[i - 1], b = route[i]; const m = Math.round((a === 'fob' || b === 'fob' ? PTS[a === 'fob' ? b : a].leg : 30) * mul); legs.push({ from: a, to: b, min: m, halt: b === 'fob' ? 0 : 20 }); }
    sq.task = 'patrol'; S.patrols.push({ sq: sq.id, legs, li: 0, t0: S.t, halting: 0, miss: 0, foot });
    log(S, sq.id, `Leaving the gate for ${c.pts.map(p => PTS[p].name).join(' and ')}${foot ? ', on foot: no fuel' : ''}.`, 0);
  }
  function patrolArrive(S, P, pt) {
    const sq = S.squads.find(s => s.id === P.sq), c = S.cfg, th = threat(S); S.cover[pt] = S.t;
    const pat = !c.vary && S.patDays >= 2; const radio = built(S, 'toc') && S.stocks.fuel > 0;
    const why = [c.vary ? 'patrol times varied' : (pat ? 'same patrol times for ' + S.patDays + ' days' : 'fixed patrol times'), radio ? 'radio link up' : 'no radio link', qrfSquad(S) ? 'QRF on standby' : 'no QRF on standby'];
    if (ch(S, 0.065 * th * (pat ? 2.5 : 1))) {
      const where = PTS[pt].name;
      if (!radio) { const cc = hit(S, sq, ri(S, 0, 2) + (pat ? 1 : 0), true), e = ri(S, 0, 2); S.enemy -= e; P.note = `Ambushed at ${where} with no radio link: ${cc.text}.`; review(S, `Patrol ambushed at ${where}`, cc.k === 0 && cc.w <= 1, `You heard nothing until they walked back in. ${cc.text}.`, why); return; }
      const opts = [{ k: 'break', label: 'Break contact alone' }, { k: 'qrf', label: 'Launch the QRF' }]; if (built(S, 'mort') && S.stocks.mortar >= 6) opts.push({ k: 'mort', label: 'Mortar fire mission' });
      prompt(S, { kind: 'contact', from: sq.id, sq: sq.id, where, extra: pat ? 1 : 0, title: `${sq.id} in contact at ${where}`, text: `CONTACT at ${where}. ${ri(S, 4, 9)} enemy, small arms${pat ? '. They were waiting for us' : ''}.`, opts, sop: c.sop.contact, why });
    } else if (radio && ch(S, PTS[pt].miss)) {
      const real = ch(S, 0.15 * clamp(th * 2, 0.3, 1)); const delay = c.check * 2;
      prompt(S, { kind: 'lost', from: 'KESTREL', sq: sq.id, where: PTS[pt].name, real, extra: delay >= 120 ? 1 : 0, title: `No comms with ${sq.id}`, text: `${sq.id} has missed two check-ins (${delay} minutes of silence). Last known near ${PTS[pt].name}.`, opts: [{ k: 'wait', label: 'Keep trying the radio' }, { k: 'qrf', label: 'Launch the QRF' }], sop: c.sop.lost, why: why.concat([`check-ins every ${c.check} min`]) });
    } else if (ch(S, 0.08)) { S.rocketF *= 0.7; S.enemy -= 1; log(S, sq.id, `Found and destroyed a rocket hide near ${PTS[pt].name}.`, 1); }
  }
  function convoy(S) {
    const c = S.cfg, th = threat(S); const n = S.convoyN++; const helpers = S.squads.filter(s => (s.task === 'work' || (s.task === 'rest' && s.fat < 45)) && s.str >= 6).sort((a, b) => a.fat - b.fat);
    const clr = c.clear ? helpers.shift() : null, esc = c.escort ? helpers.shift() : null; [clr, esc].forEach(s => { if (s) { s.task = 'convoy'; s.until = S.t + 180; } });
    let cargo = 1; const why = [c.clear ? (clr ? 'route cleared first' : 'clearance ordered but no squad free') : 'no route clearance', c.escort ? (esc ? 'escorted' : 'escort ordered but no squad free') : 'no escort']; let txt = '';
    if (ch(S, 0.5 * th + 0.05)) { if (clr && ch(S, 0.8)) txt += ' Clearance team found and reduced an IED.'; else { cargo *= 0.6; txt += ' IED strike on the route: two trucks lost.'; if (esc && ch(S, 0.3)) txt += ' ' + hit(S, esc, 1, true).text + '.'; } }
    if (ch(S, 0.4 * th + 0.03)) { if (esc) { const e = ri(S, 1, 3); S.enemy -= e; txt += ` Ambush at Kessa beaten off by the escort, ${e} enemy hit.`; if (ch(S, 0.25)) txt += ' ' + hit(S, esc, 1, true).text + '.'; } else { cargo *= 0.6; txt += ' Ambushed at Kessa with no escort: trucks burned.'; } }
    const K = S.stocks, d = c.convEvery; K.rations = Math.min(8, K.rations + d * 1.15 * cargo); K.fuel = Math.min(1500, K.fuel + d * 240 * cargo); K.mortar = Math.min(60, K.mortar + Math.round(d * 6 * cargo)); S.stats.convoys++; if (cargo < 1) S.stats.convoyHit++;
    log(S, 'PACKHORSE', `Convoy ${n} in the gate with ${Math.round(cargo * 100)}% of its load.${txt}`, cargo < 1 ? 2 : 1); review(S, `Convoy ${n}`, cargo === 1, `${Math.round(cargo * 100)}% of the load arrived.${txt}`, why);
    S.nextConvoy += d * DAY;
  }

  /* ---------- guide ---------- */
  function trig(S, step) {
    const d = S.guide.done;
    switch (step) {
      case 'posture': return true; case 'build': return d.posture; case 'cycle': return d.build;
      case 'night': return S.t >= 840; case 'comms': return built(S, 'toc'); case 'patrols': return built(S, 'wire') || S.t >= DAY + 360;
      case 'supply': return S.t >= DAY + 600; case 'cas': return built(S, 'aid') || built(S, 'lz') || S.guideFlags.cas || S.t >= 2 * DAY + 360;
    }
    return false;
  }
  function nextGuide(S) { S.guide.cur = STEPS.find(s => !S.guide.done[s] && trig(S, s)) || null; }
  function recommend(S, step) {
    const c = S.cfg;
    if (step === 'posture') c.sec = 2; else if (step === 'build') S.queue = ST.map(s => s.id).filter(id => !built(S, id));
    else if (step === 'cycle') { c.shift = 6; c.rest = 3; } else if (step === 'night') { c.standto = true; c.qrf = 1; c.sop.probe = 'standto'; }
    else if (step === 'comms') { c.check = 60; c.sop.lost = 'qrf'; } else if (step === 'patrols') { c.patrols = 2; c.vary = true; c.pts = ['rdg', 'orc']; c.sop.contact = 'qrf'; }
    else if (step === 'supply') { c.convEvery = 2; c.clear = true; c.escort = true; } else if (step === 'cas') c.sop.cas = 'air';
    fixCfg(S);
  }
  function fixCfg(S) { const c = S.cfg; c.sec = clamp(c.sec, 1, 5); c.qrf = clamp(c.qrf, 0, 2); c.rest = clamp(c.rest, 1, 5); while (c.sec + c.qrf + c.rest > 9) { if (c.rest > 1) c.rest--; else if (c.qrf > 0) c.qrf--; else c.sec--; } c.patrols = clamp(c.patrols, 0, 3); }
  function completeStep(S, step) {
    if (S.guide.done[step]) return; S.guide.done[step] = true;
    if (step === 'posture') { S.started = true; S.speed = 1; reshift(S); log(S, 'KESTREL', `Clock started. ${plural(S.cfg.sec, 'squad')} on security, the rest digging.`, 0); }
    else if (step === 'cycle' || step === 'night') reshift(S);
    else if (step === 'supply') log(S, 'ANVIL', `Resupply set: a convoy every ${S.cfg.convEvery} days at 0900, first one ${dtg(S.nextConvoy)}.`, 0);
    nextGuide(S);
  }
  function setCfg(S) { fixCfg(S); if (S.started) reshift(S); }

  /* ---------- tick ---------- */
  function hourly(S) {
    const h = hour(S.t), K = S.stocks, th = threat(S);
    K.rations = Math.max(0, K.rations - 1 / 24); if (built(S, 'toc')) K.fuel = Math.max(0, K.fuel - 8);
    if (K.rations <= 0) { S.stats.dryHours++; if (h % 6 === 0) log(S, 'KESTREL', 'Rations and water are out. Squads are not recovering.', 2); }
    if (built(S, 'toc') && K.fuel <= 0 && h % 6 === 0) log(S, 'KESTREL', 'No fuel: generator down, radios off, patrols on foot.', 2);
    if (h === 0) { S.patDays = S.cfg.patrols > 0 && !S.cfg.vary ? S.patDays + 1 : 0; S.sched = [420, 780, 1260].slice(0, S.cfg.patrols).map(m => dayOf(S.t) * DAY - DAY + m + (S.cfg.vary ? ri(S, -110, 110) : 0)); }
    if ((h >= 19 || h < 6) && !S.prompts.some(p => p.kind === 'probe') && ch(S, 0.07 * th * (h === 5 ? 5 : h === 19 ? 2 : 1) * (covered(S) ? 0.65 : 1))) probe(S);
    if (ch(S, 0.09 * th * (covered(S) ? 0.25 : 1) * S.rocketF)) rockets(S);
    if (S.t >= S.nextConvoy) convoy(S);
    if (S.enemy < 6) S.enemy = 6;
    if (!S.guide.cur) nextGuide(S);
  }
  function tick(S) {
    if (!S.started || S.over) return;
    S.t++; const st = standTo(S), bad = S.stocks.rations <= 0 || S.disturbed > S.t;
    if (S.t >= S.nextShift) reshift(S);
    let work = 0;
    S.squads.forEach(s => {
      if (s.until && S.t >= s.until && (s.task === 'convoy' || s.task === 'qrfout')) { s.task = 'rest'; s.until = 0; }
      let d = rate(s.task, S, S.t) / 60; if (st && inBase(s)) d = Math.max(d, 0) + 2 / 60; else if (d < 0 && bad) d *= 0.5;
      s.fat = clamp(s.fat + d, 0, 100);
      if (s.task === 'work' && !st && s.str >= 3) work += eff(s.fat) * (s.str / 9) * (isNight(S.t) ? 0.5 : 1);
    });
    const h = hour(S.t); if (h >= 6 && h < 20) work += 1.5;
    if (S.queue.length) {
      const id = S.queue[0]; S.prog[id] = (S.prog[id] || 0) + work / 60;
      if (S.prog[id] >= STN[id].h) { S.built[id] = S.t; S.queue.shift(); log(S, 'ENGINEERS', `${STN[id].name} complete. ${STN[id].fx}`, 1); if (!S.ioc && built(S, 'wire') && built(S, 'tow') && built(S, 'toc')) { S.ioc = S.t; log(S, 'ANVIL', 'FOB Kestrel declared at initial operating capability.', 1); } if (!S.queue.length) { S.buildDone = S.t; log(S, 'ANVIL', 'FOB Kestrel fully built. Work parties shift to maintenance.', 1); } nextGuide(S); }
    }
    if (S.sched.length && S.t >= S.sched[0]) { S.sched.shift(); startPatrol(S); }
    S.patrols = S.patrols.filter(P => {
      const sq = S.squads.find(s => s.id === P.sq); if (!sq || sq.str < 1) return false;
      if (P.halting > 0) { P.halting--; return true; }
      const L = P.legs[P.li]; L.done = (L.done || 0) + 1;
      if (L.done >= L.min) { if (L.to === 'fob') { sq.task = 'rest'; log(S, sq.id, P.note || 'Back inside the wire. Nothing significant to report.', P.note ? 2 : 0); return false; } P.halting = L.halt; P.li++; patrolArrive(S, P, L.to); }
      return true;
    });
    S.prompts.slice().forEach(p => { if (S.t >= p.at) resolvePrompt(S, p.id, p.sop, false); });
    if (S.t % 60 === 0) hourly(S);
    if (S.t >= S.end) endGame(S);
  }
  function endGame(S) {
    if (S.over) return; S.over = true; S.speed = 0; const st = S.stats; let pts = 60;
    pts += S.buildDone ? (S.buildDone <= 4 * DAY + 720 ? 20 : 10) : -15; pts -= st.kia * 12 + st.wia * 3 + st.breaches * 10 + st.convoyHit * 6 + Math.min(20, st.dryHours); pts += Math.min(10, st.repelled * 3);
    const worst = Math.max.apply(null, S.squads.map(s => s.fat)); if (worst > 85) pts -= 8;
    S.result = { pts: Math.round(pts), grade: pts >= 80 ? 'Squared away' : pts >= 60 ? 'Holding' : pts >= 40 ? 'Strained' : 'Failing', worst: Math.round(worst) };
  }
  function newGame(seed) {
    const S = { v: 2, seed, rs: seed | 0, t: 360, end: 6 * DAY + 360, speed: 0, started: false, over: false, squads: [], queue: ST.map(s => s.id), prog: {}, built: {}, buildDone: 0, ioc: 0, nextShift: 360,
      cfg: { sec: 2, rest: 3, qrf: 0, shift: 8, standto: false, check: 60, patrols: 0, vary: false, pts: ['rdg', 'orc'], clear: false, escort: false, convEvery: 2, sop: { probe: 'standto', contact: 'break', lost: 'wait', cas: 'ground' } },
      stocks: { rations: 3, fuel: 500, mortar: 30 }, enemy: 0, rocketF: 1, cover: {}, patDays: 0, sched: [], patrols: [], prompts: [], pSeq: 1, nextConvoy: 2 * DAY + 540, convoyN: 1, disturbed: 0,
      guide: { done: {}, cur: 'posture' }, guideFlags: {}, log: [], review: [], stats: { kia: 0, wia: 0, breaches: 0, repelled: 0, convoys: 0, convoyHit: 0, dryHours: 0 }, result: null };
    const names = ['Okafor', 'Reyes', 'Lindqvist', 'Tran', 'Whitaker', 'Mbeki', 'Castellano', 'Novak', 'Harlan'];
    for (let p = 1; p <= 3; p++) for (let i = 1; i <= 3; i++) S.squads.push({ id: p + '-' + i, ldr: 'SSG ' + names[(p - 1) * 3 + i - 1], str: 9, fat: ri(S, 18, 30), task: 'work', until: 0 });
    S.enemy = ri(S, 30, 42);
    log(S, 'ANVIL', 'KESTREL, you are on the ground at the new site. Three days of supply on the trucks. First convoy D3 0900.', 0);
    return S;
  }
  root.SIM = { DAY, ST, STN, PTS, STEPS, TASKN, newGame, tick, endGame, project, security, threat, standTo, built, completeStep, recommend, setCfg, fixCfg, resolvePrompt, reshift, hour, dayOf, hhmm, dtg, isNight, plural, covered, inBase };
})(typeof window !== 'undefined' ? window : globalThis);
