# FOB Kestrel: design

Status: first working vertical slice of the living-world engine is in `src/`. Last updated 2026-11-13.

The brief that governs the current build is the "Persistent Military Operations Command Simulator" specification: a world that exists independently of the player's awareness, three separated layers (true state, knowledge, decisions), physical logistics, watchable combat, two observation interfaces, and responsibility that grows from a narrow start inside an organisation that already functions. Where that brief and the earlier notes below differ (for example, starting from a bare site versus starting inside a working base), the brief wins; the bare-site build-up is deferred.

## Vision

You command a single forward operating base. You manage logistics and the deployment of soldiers from it. It is a mil sim, not an arcade game: outcomes come from planning, routines, supply and information, and the pleasure of watching simulated individuals carry out what you set up.

Reference points: Door Kickers and the original Rainbow Six for planning then watching; Football Manager for persistent people, staff, routines and a match you influence but do not play.

## Pillars

1. **Mil sim, not arcade.** Base procedure on real practice wherever possible. Where the game simplifies, say so.
2. **Watchable simulation.** Individual soldiers are simulated and visible, even if only as dots. Movement, guard rotation and firefights play out on screen. This is where the fun is.
3. **Logistics is the game.** Fuel, ammunition, rations, casualty evacuation, maintenance and fatigue decide what is possible.
4. **You know less than the truth.** The game tracks what is happening and what you know separately. Comms depend on distance, terrain and signal. Reports arrive late or not at all.
5. **No arbitrary constraints.** What is available to you is produced by a simulated wider context, coarse but causal. Every "no" from higher has a reason in the world state.
6. **Detail on demand.** The world outside your view is coarse numbers (resources, effects, values, a frontline). Detail is generated only when something needs it, then persists as fact.
7. **Natural progression.** Start small and simple. Each new system arrives when the problem it solves first hurts.

## Decisions so far

### Scope and scale
- Start with a single base and a single operation; grow from there to simulating much more.
- The vertical-slice loop: establish and secure the supply route with patrols, adequate defence and a quick-reaction-force protocol, while planning decisive operations. Success brings more options and harder operations with less certain intel.

### Information and comms
- Modern setting. Feeds from the field are part of the simulation and depend on distance and signal.
- The real constraint in the ops center is people and screens: who is watching what.
- Protocols are defined in advance: check-in windows, lost-comms plans, rescue and reserve criteria, what is expected and what is not.
- Who provides assessments and assets matters: what is overhead, how remote the deployment is, who tells you what.

### The wider world
- Context outside your responsibility is simulated very coarsely: resource, effect, value and frontline based.
- Lazy instantiation: "40 in this area" stays a number until something needs to simulate the region and movement inside it.

### Feel (from prototype feedback)
- v0.0.1 was too complex at the start and too turn based.
- Begin with setting up the base, then a guided process of establishing schedules and routines.
- The progression needs to feel natural, not a timed checklist.
- Staff recommendations and automation should only exist once you have the specialised staff who provide them.
- A guard does not stand on one spot, and a squad is several people, not one marker. Simulate and draw individuals.
- Engineers should arrive, help set up, and leave, with at most a few remaining.

## Real procedure to model

From general knowledge of US Army practice; to be checked against published doctrine on base camps and company-level defence before the next build, with simplifications noted.

**Standing up a small base**
1. Reconnaissance and site selection by leaders with an engineer: defensibility, drainage, access, landing zone.
2. Advance party secures the site and marks the layout.
3. Occupation, security first. The unit follows its priorities of work: post security, site key weapons, establish comms, dig in, then rest and maintenance plans.
4. Engineer build. An attached engineer element with heavy equipment pushes berms, fills barriers, builds towers and bunkers over days to weeks.
5. Engineers leave for the next job. The occupying unit keeps improving positions by hand, indefinitely.

**Guard**
- The perimeter is a set of posts (towers, gate, wall sections the towers cannot see), each manned by a pair.
- One squad covers several posts and has a sergeant of the guard.
- Pairs rotate within the shift.
- A roving pair walks the wire between posts.
- Stand-to at dawn and dusk.

**Tasks that are not the infantry's**
- Route clearance is done by dedicated engineer teams with specialist vehicles; bomb disposal is its own team. Both are requested from higher. The base provides escort.

## Proposed progression for v0.0.3

Each specialist takes over a chore the player has already been doing by hand, and brings an automation, a recommendation and the estimates for their area. Without them the player sees raw facts only.

1. **Arrival, one platoon.** Three squads, trucks in a circle, no staff. Assign who watches, who digs, who sleeps, by hand.
2. **First night.** Manual rotation breaks down. The first sergeant arrives with the duty roster and fatigue trends.
3. **The base earns its garrison.** Second platoon arrives when the wire is up, third when there is shelter. Engineers are present early with a departure date.
4. **First movement in the dark.** Building the ops center brings an operations officer: standing procedures and a patrol schedule.
5. **First patrol out of sight.** The mast brings a signals sergeant: check-in windows and a lost-comms procedure.
6. **First casualty.** Aid station and a medic: casualty procedure and evacuation times.
7. **First shortage.** A supply sergeant: forecasts and the convoy routine.
8. **First pattern.** An intelligence sergeant: threat estimates and warnings about predictable timings.
9. **Fully operational.** Battalion assigns a first mission; the raid layer from v0.0.1 returns.

## Technical direction for v0.0.3

- Individuals as the unit of simulation: position, post, task, fatigue; squads are groups of them.
- A continuous top-down view where soldiers are dots that move: guard rotation, work parties, patrols leaving and returning, firefights resolving visibly.
- Posts and arcs of observation, so unwatched ground is visible as a gap.
- Keep the simulation pure and seeded, with headless playthrough tests, as in both prototypes.

## Open questions

- Do specialists arrive in a fixed order at milestones, or does the player choose whom to request first from limited slots?
- How much of the base layout does the player place by hand?
- How are firefights shown when the player has no feed from that location: withheld, or reconstructed afterwards?
- What is the unit of time on screen that keeps individual movement watchable but lets a ten-day deployment finish?

## What the prototypes are worth keeping for

- **v0.0.1:** comms coverage with relays, check-in windows and lost-comms plans; reports queued in the field and delivered late; lazy enemy generation with pinned facts; higher-command asset pool with stated reasons; raid planner with release point, GO hold and abort criteria; after-action review of truth against knowledge.
- **v0.0.2:** continuous clock; standing procedures with a countdown and override; roster projection and sustainability estimate; build queue; incident review listing the routines that drove each outcome.

## Current slice: what exists and what does not

Built and tested: seeded one-second engine; physical inventories with conservation audit; road movement with fuel burn and breakdowns; individual soldiers with line-of-sight observation; direct fire from carried ammunition with suppression and casualties; voice and satellite links with delays; command-post knowledge separate from truth; autonomous squads with battle drill on contact; two enemy cells that act on their own observations; operations officer, logistics officer and depot dispatcher with decision traces; reconnaissance operation the player approves; incident decisions with a window after which the staff acts; five responsibilities that unlock; command and observer views of the same simulation; save and load.

Not yet: guard posts as manned positions with arcs and gaps; engineers and base build-up; staff as people with skill; air MEDEVAC, fires and unmanned aircraft; route clearance; the coarse wider theatre; lazy detail generation; more than one base or operation; an after-action review.
