'use strict';
/* Physical inventory. Stock lives in stores as dated lots; soldiers carry items; every unit of every
   type is always in exactly one place or in the ledger as used, lost or expired. */
(function () {
  const F = globalThis.FOB;
  F.TYPES = {
    JP8:   { name: 'JP-8 fuel',        unit: 'L',     kg: 0.8,    cls: 'III', liquid: true },
    WATER: { name: 'Potable water',    unit: 'L',     kg: 1.0,    cls: 'I',   liquid: true },
    MRE:   { name: 'MRE rations',      unit: 'meals', kg: 0.83,   cls: 'I',   shelf: 3 * 365 * 86400 },
    A556:  { name: '5.56mm ball',      unit: 'rds',   kg: 0.0155, cls: 'V' },
    A556L: { name: '5.56mm linked',    unit: 'rds',   kg: 0.0165, cls: 'V' },
    A762L: { name: '7.62mm linked',    unit: 'rds',   kg: 0.033,  cls: 'V' },
    PARTS: { name: 'Repair parts kit', unit: 'kits',  kg: 25,     cls: 'IX' },
    CL4:   { name: 'Barrier material', unit: 'units', kg: 50,     cls: 'IV' },
    E762:  { name: '7.62x39mm',        unit: 'rds',   kg: 0.016,  cls: 'V' },
    ERPG:  { name: 'RPG-7 rounds',     unit: 'rds',   kg: 2.6,    cls: 'V' }
  };
  F.WEAPONS = {
    M4:   { ammo: 'A556',  rof: 0.22, range: 400, acc: 1.0, load: 210 },
    M249: { ammo: 'A556L', rof: 0.85, range: 600, acc: 0.8, load: 600 },
    M240: { ammo: 'A762L', rof: 1.6,  range: 800, acc: 0.9, load: 800, crew: true },
    AK:   { ammo: 'E762',  rof: 0.3,  range: 300, acc: 0.85, load: 150 },
    PKM:  { ammo: 'E762',  rof: 1.3,  range: 600, acc: 0.8, load: 400 },
    RPG:  { ammo: 'ERPG',  rof: 0.04, range: 300, acc: 1.0, load: 3, at: true }
  };
  F.mkStore = (W, o) => { const st = Object.assign({ lots: [], res: {}, capKg: null, capL: null, accepts: null, inspectedAt: W.t }, o); W.stores[st.id] = st; return st; };
  F.qty = (st, ty) => { let q = 0; for (const l of st.lots) if (l.ty === ty) q += l.q; return q; };
  F.kgOf = st => st.lots.reduce((a, l) => a + l.q * F.TYPES[l.ty].kg, 0);
  F.litres = st => st.lots.reduce((a, l) => a + (F.TYPES[l.ty].liquid ? l.q : 0), 0);
  F.reserved = (st, ty) => { let q = 0; for (const k in st.res) q += st.res[k][ty] || 0; return q; };
  F.avail = (st, ty) => Math.max(0, F.qty(st, ty) - F.reserved(st, ty));
  F.free = (st, ty) => {
    if (st.accepts && !st.accepts.includes(ty)) return 0;
    if (st.capL != null) return F.TYPES[ty].liquid ? Math.max(0, st.capL - F.litres(st)) : 0;
    if (st.capKg != null) return Math.max(0, (st.capKg - F.kgOf(st)) / F.TYPES[ty].kg);
    return Infinity;
  };
  function take(st, ty, q) { // oldest lots first
    const out = []; let need = q;
    st.lots.sort((a, b) => a.born - b.born);
    for (const l of st.lots) { if (l.ty !== ty || need <= 1e-9) continue; const d = Math.min(l.q, need); l.q -= d; need -= d; out.push({ ty, q: d, born: l.born }); }
    st.lots = st.lots.filter(l => l.q > 1e-9);
    return out;
  }
  function put(st, lots) { for (const l of lots) { const m = st.lots.find(x => x.ty === l.ty && x.born === l.born); if (m) m.q += l.q; else st.lots.push({ ty: l.ty, q: l.q, born: l.born }); } }
  const led = (W, k, ty, q, why) => { W.ledger[k][ty] = (W.ledger[k][ty] || 0) + q; if (why) { const kk = ty + ':' + why; W.ledger.why[kk] = (W.ledger.why[kk] || 0) + q; } };
  /* Scenario stocking only: this is the one place matter enters the world. */
  F.stock = (W, st, ty, q, born) => { put(st, [{ ty, q, born: born == null ? W.t : born }]); led(W, 'initial', ty, q); };
  F.move = (W, a, b, ty, q, ignoreRes) => {
    q = Math.min(q, ignoreRes ? F.qty(a, ty) : F.avail(a, ty), F.free(b, ty)); if (!(q > 1e-9)) return 0;
    if (!F.TYPES[ty].liquid && F.TYPES[ty].kg >= 0.5) q = Math.floor(q + 1e-9); else if (!F.TYPES[ty].liquid) q = Math.floor(q + 1e-9);
    if (q <= 0) return 0;
    put(b, take(a, ty, q)); return q;
  };
  F.burn = (W, st, ty, q, why) => { q = Math.min(q, F.qty(st, ty)); if (!(q > 0)) return 0; take(st, ty, q); led(W, 'used', ty, q, why); return q; };
  F.lose = (W, st, ty, q, why) => { q = Math.min(q, F.qty(st, ty)); if (!(q > 0)) return 0; take(st, ty, q); led(W, 'lost', ty, q, why); return q; };
  F.issue = (W, st, s, ty, q) => { q = Math.floor(Math.min(q, F.avail(st, ty))); if (q <= 0) return 0; take(st, ty, q); s.carry[ty] = (s.carry[ty] || 0) + q; return q; };
  F.issueL = (W, st, s, ty, q) => { q = Math.min(q, F.avail(st, ty)); if (!(q > 0)) return 0; take(st, ty, q); s.carry[ty] = (s.carry[ty] || 0) + q; return q; };
  F.turnIn = (W, s, st, ty, q) => { q = Math.min(q, s.carry[ty] || 0, F.free(st, ty)); if (!(q > 0)) return 0; s.carry[ty] -= q; put(st, [{ ty, q, born: W.t }]); return q; };
  F.expend = (W, s, ty, q, why) => { q = Math.min(q, s.carry[ty] || 0); if (!(q > 0)) return 0; s.carry[ty] -= q; led(W, 'used', ty, q, why); return q; };
  F.reserve = (st, key, ty, q) => { st.res[key] = st.res[key] || {}; st.res[key][ty] = (st.res[key][ty] || 0) + q; };
  F.release = (st, key) => { delete st.res[key]; };
  F.expire = W => { for (const id in W.stores) { const st = W.stores[id]; st.lots = st.lots.filter(l => { const sh = F.TYPES[l.ty].shelf; if (sh && W.t - l.born > sh) { led(W, 'expired', l.ty, l.q); F.ev(W, 'expiry', `${Math.round(l.q)} ${F.TYPES[l.ty].unit} of ${F.TYPES[l.ty].name} expired in ${st.name}`); return false; } return true; }); } };
  /* Conservation audit: initial = on hand + used + lost + expired, for every type. */
  F.audit = W => {
    const on = {}; for (const id in W.stores) for (const l of W.stores[id].lots) on[l.ty] = (on[l.ty] || 0) + l.q;
    for (const id in W.soldiers) { const c = W.soldiers[id].carry; for (const ty in c) on[ty] = (on[ty] || 0) + c[ty]; }
    const out = {};
    for (const ty in F.TYPES) { const i = W.ledger.initial[ty] || 0, u = W.ledger.used[ty] || 0, l = W.ledger.lost[ty] || 0, x = W.ledger.expired[ty] || 0, o = on[ty] || 0; out[ty] = { initial: i, onHand: o, used: u, lost: l, expired: x, delta: i - o - u - l - x }; }
    return out;
  };
  F.fobStores = (W, ty) => Object.values(W.stores).filter(s => s.at === 'fob' && (!s.accepts || s.accepts.includes(ty)) && (F.TYPES[ty].liquid ? s.capL != null : s.capKg != null));
  F.fobQty = (W, ty) => F.fobStores(W, ty).reduce((a, s) => a + F.qty(s, ty), 0);
  F.fobFree = (W, ty) => F.fobStores(W, ty).reduce((a, s) => a + F.free(s, ty), 0);
})();
