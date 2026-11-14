// PROTOTYPE - NOT FOR PRODUCTION
// Question: Does working a contested village through partial reports, with platoon leaders planning their own missions, produce a steady flow of meaningful decisions for a 20-30 minute session?
// Date: 2026-11-14
// Every tuning value lives here, each with value, min, max and step. The game reads them live
// through tune.<name> (index.html); the tweak panel, an add-on, writes them back here.
window.CONFIG = {
  seed: 1, // every gameplay random call reads rng(), seeded from this (or ?seed= in the address)
  volume: { value: 0.5, min: 0, max: 1, step: 0.05 },

  // Time
  deadlineHours: { value: 48, min: 12, max: 120, step: 1 },          // battalion's deadline from 1800 day 1
  speed1: { value: 1, min: 0.25, max: 5, step: 0.25 },              // game minutes per real second
  speed2: { value: 4, min: 1, max: 20, step: 1 },
  speed3: { value: 12, min: 2, max: 60, step: 1 },
  speed4: { value: 30, min: 5, max: 120, step: 5 },

  // The village
  families: { value: 20, min: 8, max: 40, step: 1 },                 // compounds in the village
  leaningMean: { value: -0.05, min: -0.6, max: 0.6, step: 0.05 },    // -1 cell ... +1 us
  leaningSpread: { value: 0.35, min: 0, max: 0.8, step: 0.05 },
  neighbourSight: { value: 260, min: 50, max: 600, step: 10 },       // m: a family notices comings and goings this close

  // Your company
  footSpeed: { value: 55, min: 20, max: 100, step: 5 },              // m per game minute, dismounted
  planMinutes: { value: 45, min: 10, max: 180, step: 5 },            // troop leading procedures before the back-brief
  posrepEvery: { value: 30, min: 10, max: 120, step: 5 },            // minutes between position reports
  radioDelay: { value: 3, min: 0, max: 20, step: 1 },                // minutes from send to logged at the command post
  sightDay: { value: 380, min: 100, max: 1000, step: 20 },           // m: soldiers spot people outdoors
  sightNight: { value: 220, min: 50, max: 600, step: 10 },           // m with night vision
  idRange: { value: 140, min: 30, max: 400, step: 10 },              // m: close enough to match the target's description
  fatigueOut: { value: 7, min: 0, max: 20, step: 1 },                // per hour on a mission
  fatigueGuard: { value: 3, min: 0, max: 20, step: 1 },              // per hour on outpost security
  fatigueRest: { value: 9, min: 0, max: 30, step: 1 },               // recovered per hour at the outpost
  tiredAt: { value: 70, min: 30, max: 100, step: 5 },                // fatigue above which mistakes and rough handling start

  // The population
  tipChance: { value: 0.55, min: 0, max: 1, step: 0.05 },            // scale on a friendly family sharing what it knows
  goodVisit: { value: 0.03, min: 0, max: 0.2, step: 0.01 },          // leaning gained by a respectful visit
  roughVisit: { value: 0.06, min: 0, max: 0.3, step: 0.01 },         // leaning lost to rough handling by tired soldiers
  searchHit: { value: 0.12, min: 0, max: 0.6, step: 0.02 },          // leaning lost by a searched family (soft knock)
  forcedHit: { value: 0.3, min: 0, max: 0.8, step: 0.02 },           // leaning lost by forced entry with nothing found
  civcasHit: { value: 0.6, min: 0, max: 1, step: 0.05 },             // leaning lost by a family whose member was hurt
  taxResent: { value: 0.03, min: 0, max: 0.2, step: 0.01 },          // leaning gained when the cell taxes a family
  intimidFear: { value: 0.35, min: 0, max: 1, step: 0.05 },          // fear added by a night letter
  wellGain: { value: 0.08, min: 0, max: 0.3, step: 0.01 },           // every family, when a promised repair is done
  deceiveChance: { value: 0.25, min: 0, max: 1, step: 0.05 },        // a family loyal to the cell feeds a false lead

  // The cell
  fighters: { value: 6, min: 2, max: 20, step: 1 },
  explosives: { value: 2, min: 0, max: 6, step: 1 },                 // devices the cache can make
  spotRangeDay: { value: 520, min: 100, max: 1200, step: 20 },       // m: a rooftop spotter sees a patrol
  spotRangeNight: { value: 160, min: 0, max: 600, step: 10 },
  warnDelay: { value: 4, min: 0, max: 30, step: 1 },                 // minutes from a sighting to the cell knowing
  fleeRange: { value: 600, min: 100, max: 1500, step: 50 },          // m: the leader moves when soldiers are reported this close
  patternPasses: { value: 2, min: 1, max: 5, step: 1 },              // day passes on one stretch before a device is laid there
  iedHitChance: { value: 0.55, min: 0, max: 1, step: 0.05 },         // a device not spotted goes off
  iedSpotChance: { value: 0.3, min: 0, max: 1, step: 0.05 },         // a rested platoon spots a device as it passes
  harassChance: { value: 0.25, min: 0, max: 1, step: 0.05 },         // per daytime patrol the cell knows about in a hostile sector
  recruitChance: { value: 0.45, min: 0, max: 1, step: 0.05 },        // per day, when there is money and a willing family
  threatEscape: { value: 1.1, min: 0.3, max: 3, step: 0.1 },         // the leader leaves the area above this threat
  threatDecay: { value: 0.3, min: 0, max: 1, step: 0.05 },           // threat forgotten per day
};
