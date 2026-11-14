# Game Brief: Raid Night

## In your words
raid night on an uncertain tip, watched through drone and helmet-cam feeds, with real go, wait and abort calls
(No answers to the questions: the usual picks were taken, realistic to a company commander. The earlier game's brief stays in prototypes/find-fix-finish/brief.md.)

**Pitch:** From the company command post, you watch one night raid on an uncertain tip through a drone's thermal feed and your team leaders' helmet cams, and make the go, wait, abort and reserve calls while the ground force commander runs the house. *(inferred (strong))*

**Genre:** real-time command, plan-then-watch *(inferred (strong))*

**Controls:** drag to slew the drone's sensor, wheel to zoom, click a figure to track it; G go, W wait, X abort, R release the reserve to a point, I send the nearest team to intercept the tracked person; 1-4 pick the main feed; Space pause. *(provisional)*

**Question:** is watching a night raid through real feeds, with go, wait, abort and reserve calls, tense and full of real decisions?

**Hooks:** the drone sees heat but not through roofs, and the helmet cams see inside but only where a man looks; the tip may be right, wrong or a setup. *(inferred (strong))*

**Intent:** staged failure *(provisional)*

## Look and references
- Look: a white-hot thermal drone feed, grey terrain, walls and roofs, people as warm figures with heads and moving limbs, friendly soldiers with blinking IR strobes, muzzle flashes as bright pulses, a slow orbit, reticle and telemetry. Helmet cams as low-resolution green night-vision views from the team leaders' eyes, with grain. Every figure drawn, no emoji, no plain circles. *(provisional)*
- References: Door Kickers and the original Rainbow Six (plan, then watch it unfold); real ISR feed conventions (white-hot, telemetry, IR strobes). *(inferred (strong))*
- View: 2D · Camera: top-down drone sensor with slew, zoom and a slow orbit; first-person helmet-cam panels. *(provisional)*

## First minute
0230. The drone feed shows the target compound cold and quiet; the helmet cams show three teams walking in file from the vehicles, strobes blinking. A dog in the courtyard lifts its head. The ground force commander reports at the release point and asks to isolate: go or wait. You watch the courtyard: two warm figures by the gate, one smoking. Go. The cordon teams slip around the walls. *(guessed)*

## Challenge
The tip is right, wrong (he is next door) or a setup (fighters on a nearby roof), chosen by the seed. Waiting to watch costs time and raises the chance a dog, a man on the roof or a phone call gives you away. A runner over the back wall forces a choice: send the south cordon after him and open a gap, or release the reserve. A loss is the target escaping, an empty house, or casualties; the debrief counts them. *(provisional)*

## Core loop
- Watch the feeds for indicators; decide go, wait or abort at each gate.
- The ground force acts on its own; the compound reacts to what it notices.
- React to what the drone shows: track a runner, intercept, release the reserve.
- The raid ends in a capture, an empty house or an escape, then a debrief.

## Goal & fail state
- Win: the target detained with positive identification, at the lowest cost.
- Fail: he escapes, the house is empty, or the raid is aborted; casualties and civilian harm count against you.

## Features
- [ ] A drone thermal feed with slew, zoom, orbit and tracking, blind under roofs
- [ ] Three helmet cams rendering the team leaders' view in green night vision
- [ ] A ground force that walks in, isolates, breaches and clears on its own
- [ ] Gates at the release point and before the breach: go, wait, abort
- [ ] A compound that reacts: a dog, guards, a family, a target who runs when warned
- [ ] Three possible truths behind the tip: right, next door, a setup
- [ ] A reserve you can release, and intercept orders for a tracked runner
- [ ] Gunfire seen as flashes, casualties, a debrief at the end

## Your systems
- thermal drone feed · in the slice
- helmet cams · in the slice
- go, wait and abort calls · in the slice

## Keep
-

## Avoid
- Form-filling as the main verb; text and symbols instead of something to watch
- Steering individual soldiers; the ground force commander runs the house
- The command post seeing what no feed shows

## Out of scope
- The wider hunt (tips, village, days): grow it
- More than one compound: grow it

## Build order
1. The slice: one raid, start to debrief.

---
**Kill condition:** if after a tuning round the raid still feels like watching without deciding.

**Who it's for / what they feel:** mil-sim players; quiet tension, then a burst.

**Games you love / don't:** Love Door Kickers and the original Rainbow Six (plan then watch), Football Manager. Didn't like the find-fix-finish prototype: bad control, non-choices, nothing to look at.
