'use strict';
/* The clock. One step is one second of world time; everything else hangs off it in a fixed order. */
(function () {
  const F = globalThis.FOB;
  F.step = W => {
    W.t++;
    F.stepStaff(W);
    if (W.t % 60 === 0) F.stepPlayer(W);
    F.stepEnemy(W);
    F.stepUnits(W);
    const hot = W.t % 5 === 0 || Object.values(W.units).some(u => u.con);
    if (hot && (W.t % 5 === 0 || W.t % 2 === 0)) F.sense(W);
    F.fight(W);
    F.stepComms(W);
    if (W.t % 5 === 0) F.stepAwareness(W);
  };
  F.run = (W, secs) => { for (let i = 0; i < secs; i++) F.step(W); return W; };
  F.create = seed => { const W = F.newWorld(seed); W.stats = { blueKia: 0, blueWia: 0, redKia: 0, redWia: 0, deliveries: 0, missedMeals: 0 }; F.setGuard(W, W.units.u1); F.setRest(W, W.units.u2, 'awaiting patrol'); F.setRest(W, W.units.u3, 'QRF standby'); F.stepPlayer(W); return W; };
  F.save = W => { const fx = W.fx; W.fx = []; const s = JSON.stringify(W); W.fx = fx; return s; };
  F.load = s => JSON.parse(s);
  F.hash = W => { const s = F.save(W); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
})();
