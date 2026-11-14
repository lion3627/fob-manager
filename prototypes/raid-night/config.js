// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is watching a night raid through the drone and helmet cams, with go, wait, abort and reserve calls, tense and full of real decisions?
// Date: 2026-11-14
// Every tuning value lives here, each with value, min, max and step. The game reads them live
// through tune.<name> (index.html); the tweak panel, an add-on, writes them back here.
window.CONFIG = {
  seed: 1, // every gameplay random call reads rng(), seeded from this (or ?seed= in the address)
  volume: { value: 0.5, min: 0, max: 1, step: 0.05 },

  // The tip: how likely each truth is (normalised)
  pPresent: { value: 0.5, min: 0, max: 1, step: 0.05 },        // he is in the house
  pNextDoor: { value: 0.3, min: 0, max: 1, step: 0.05 },       // he is in the compound next door
  pSetup: { value: 0.2, min: 0, max: 1, step: 0.05 },          // fighters wait on a roof

  // Movement, m/s
  walk: { value: 1.3, min: 0.5, max: 3, step: 0.1 },           // soldiers moving tactically
  rush: { value: 2.6, min: 1, max: 5, step: 0.1 },             // soldiers chasing or assaulting
  limp: { value: 1.6, min: 0.5, max: 4, step: 0.1 },           // the target running on his bad leg
  runner: { value: 2.9, min: 1, max: 5, step: 0.1 },           // anyone else running
  truck: { value: 7, min: 2, max: 15, step: 0.5 },             // the reserve's vehicle

  // Being noticed
  dogHear: { value: 24, min: 5, max: 80, step: 1 },            // m: the dog hears soldiers moving
  eyeRange: { value: 30, min: 10, max: 120, step: 1 },         // m: someone awake outdoors sees soldiers
  wakeChance: { value: 0.0003, min: 0, max: 0.02, step: 0.0001 },// per second: a sleeper gets up for a while
  warnDelay: { value: 14, min: 0, max: 60, step: 1 },          // s: from alarm to the target moving
  waitAsk: { value: 25, min: 5, max: 90, step: 5 },            // s: a WAIT before the commander asks again

  leaveMin: { value: 1500, min: 60, max: 9000, step: 60 },     // s after 01:45: earliest the target moves on by himself tonight
  leaveMax: { value: 4500, min: 60, max: 9000, step: 60 },     // s after 01:45: latest he moves on
  planSpeed: { value: 6, min: 1, max: 30, step: 1 },           // clock speed while planning and on the convoy
  convoyFar: { value: 600, min: 60, max: 1800, step: 30 },     // s: launch to boots on the ground, far drop-off (drive and walk in)
  convoyNear: { value: 300, min: 60, max: 1800, step: 30 },    // s: launch to boots on the ground, near drop-off
  challenge: { value: 18, min: 3, max: 60, step: 1 },          // m: a soldier challenges a moving person
  haltChance: { value: 0.8, min: 0, max: 4, step: 0.1 },       // per second: a challenged unarmed person stops
  sseTime: { value: 40, min: 5, max: 300, step: 5 },           // s: site exploitation before exfil

  // Fighting
  rangeOut: { value: 70, min: 10, max: 200, step: 5 },         // m: aimed fire outdoors
  hitBase: { value: 0.16, min: 0, max: 1, step: 0.01 },        // chance per aimed shot at close range
  fireGap: { value: 1.1, min: 0.2, max: 4, step: 0.1 },        // s between shots per shooter
  civHit: { value: 0.05, min: 0, max: 0.5, step: 0.01 },       // a civilian near the line of fire is hit

  // The feeds
  orbit: { value: 0.012, min: 0, max: 0.2, step: 0.002 },      // rad/s the drone's view turns as it orbits
  zoomStart: { value: 5.5, min: 1, max: 12, step: 0.1 },       // px per m
  camFov: { value: 1.2, min: 0.6, max: 2, step: 0.05 },        // rad, helmet camera field of view
  timeFast: { value: 3, min: 1, max: 8, step: 1 },             // speed when T is pressed
};
