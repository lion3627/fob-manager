# Game Brief: Find, Fix, Finish

## In your words
(/prototype typed with nothing after it; built from the approved concept, design/gdd/game-concept.md.)
Answer to the questions: "Idk man whatever is realistic to the role"

**Pitch:** As a US Army company commander at a combat outpost, find and capture a cell leader hiding in one village within 48 hours, working only from late, partial reports while he watches you back. *(inferred (strong))*

**Genre:** real-time command simulation, counterinsurgency *(inferred (strong))*

**Controls:** mouse: select a platoon, open a task form (mission, intent, limits), approve or return the back-brief; space pauses; 1-4 sets time acceleration; the staff stop the clock on your reporting requirements. *(provisional)*

**Question:** does working a contested village through partial reports, with platoon leaders planning their own missions, produce a steady flow of meaningful decisions for a 20-30 minute session? *(inferred (strong))*

**Hooks:** families' hidden leaning feeds either your intelligence or his support; both sides know only what they observed or were told. *(inferred (strong))*

**Intent:** payoff builds *(provisional)*

## Look and references
- Look: a company command post at night. A dark map board with MIL-STD-2525 frames (blue rectangle friendly, red diamond hostile, yellow unknown), grease-pencil control measures, report marks that fade and dash with age, last-known-position ghosts with a time label, uncertainty ellipses. Beside it the radio and duty log in standard report formats, a platoon status board, and the intelligence cell's target file. Orange only for "a decision is waiting on you". Every figure drawn as a symbol, no emoji, no plain circles. *(inferred (strong))*
- References: Command: Modern Operations (fog, sensor-driven picture); Football Manager (indirect control, people you come to know). *(inferred (strong))*
- View: 2D · Camera: top-down map board with pan and zoom. *(provisional)*

## First minute
The ops room at 1800. The duty log shows battalion's order: capture the cell leader, call sign unknown, believed in the village, within 48 hours. The map board shows your outpost, the village compounds and the road; the status board shows three platoons, one on outpost security. The executive officer's note suggests a presence patrol and a meeting with the village elder. You task 2nd Platoon: mission, intent, limits. A few minutes of game time later the platoon leader back-briefs his route, timing and actions on contact; you approve. On the map, the platoon symbol moves only as its position reports come in. An hour later a spot report arrives, and the first marks appear on the board. *(guessed)*

## Challenge
Within the first few in-game hours, a spotter on a rooftop reports your patrol to the cell, so the leader avoids where you are. A heavy-handed search or a civilian casualty turns families against you, drying up tips. Tired platoons make mistakes. He escapes if spooked into leaving the area or when 48 hours run out; the session ends with a debrief built only from what your side learned. Later sessions grow the area and the deadline. *(provisional)*

## Core loop
- Read the incoming reports and the map board; decide where the leader might be and what you need to know.
- Task a platoon with mission, intent and limits; approve or return its back-brief.
- The platoon acts on its own; reports come back late and partial; families' leanings shift for real reasons.
- With a confirmed location, task a raid; capture him, or adjust and try again before the deadline.

## Goal & fail state
- Win: the cell leader detained by the deadline.
- Fail: 48 hours pass, or he leaves the area. Losing soldiers or civilians is a cost noted at the debrief, not an instant end.

## Features
- [x] The village: about 20 families in compounds, each with routines and a hidden leaning with recorded causes
- [x] The cell: the leader, a handful of fighters, a cache, rooftop spotters, taxing the road, intimidating informants, acting only on what it has seen or been told
- [x] Your company: three platoons with soldiers, fatigue and a rotation (outpost security, available, resting)
- [x] Tasking by mission, intent and limits, with the platoon leader's back-brief to approve or return: presence patrol, compound search, meeting with an elder, raid
- [x] Reports from the field: delayed and partial spot reports, debriefs on return, tips from families who lean your way
- [x] The command post: map board updated only from reports, radio and duty log, status board, target file
- [x] Standing reporting requirements and time acceleration that the staff interrupt
- [x] Debrief at the end: what your side learned, and when

## Your systems
- two combat economies (recruiting, resupply, disruption) · thin stand-in *(guessed)*
- contested population · in the slice
- separate knowledge for each side · in the slice
- mission command with back-briefs · in the slice
- reporting requirements and time acceleration · in the slice
- intelligence chain to a target · in the slice
- detention and questioning · thin stand-in *(guessed)*
- casualty evacuation by ground · thin stand-in *(guessed)*
- smuggling route · later
- enablers (air medical evacuation, aircraft video, route clearance) · later
- staff who arrive as the outpost grows · later

## Keep
-

## Avoid
- The old living-sim build: nothing reused
- Steering individual soldiers
- A true picture in the command view; the enemy knowing anything it hasn't observed or been told
- Scripted outcomes or invented events
- Sliders or flat bonuses standing in for people
- Simulating routine life second by second

## Out of scope
- Smuggling route: grow it
- Enablers (air medical evacuation, aircraft video, route clearance): grow it
- Local police: grow it
- Staff who arrive as the outpost grows: grow it
- More villages and a five-day objective: grow it
- Saving and loading mid-hunt: change it after play

## Build order
1. The slice: one village, three platoons, one cell, 48 hours, capture or escape, with the debrief.
2. Deeper interrogation and sources.
3. More villages and the five-day objective.

---
**Kill condition:** if after two tuning rounds the session has long stretches with nothing to decide, or the leader's capture feels like luck rather than reading the picture.

**Who it's for / what they feel:** serious mil-sim players; methodical command with bursts of pressure.

**Games you love / don't:** Love Door Kickers and the original Rainbow Six (plan then watch), Football Manager (persistent people, a match you influence but don't play).
