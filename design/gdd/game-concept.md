# Game Concept: Find, Fix, Finish

*Created: 2026-11-14*
*Status: Approved*

Supersedes the pillars in `docs/DESIGN.md`. The existing `living-sim` build is disregarded; this game is built fresh.

---

## Elevator Pitch

> It's a real-time military command simulation where you, a US Army company commander at a combat outpost, hunt a named insurgent leader before battalion's deadline, by working a contested population and starving his network while he does the same to you.

---

## Core Identity

| Aspect | Detail |
| ---- | ---- |
| **Genre** | Command simulation (mil sim), counterinsurgency, management |
| **Platform** | Desktop web browser |
| **Target Audience** | Strategy and simulation players who want mastery of a hard, honest system (see Target Player Profile) |
| **Player Count** | Single-player |
| **Session Length** | About 1 hour (a few in-game days with time acceleration) |
| **Monetization** | None yet |
| **Estimated Scope** | Large (9+ months, owner plus Claude; no timeline set) |
| **Comparable Titles** | Football Manager, Command: Modern Operations, Rebel Inc., RimWorld (sales not researched) |

---

## Core Fantasy

You run a company in a valley that isn't yours. You never see the whole picture: you see what your patrols report, what your sources whisper, and what your trackers show. From that you decide where to push, whom to trust and when to commit. Your platoon leaders plan and fight; you give them the mission and the limits, and you carry the result.

---

## Unique Hook

Like Football Manager, and also the match is a patrol you can't see and the season is a manhunt with a deadline, fought through two living economies and one population that feeds whichever side it favours.

---

## Player Experience Analysis (MDA Framework)

### Target Aesthetics

| Aesthetic | Priority | How We Deliver It |
| ---- | ---- | ---- |
| **Challenge** | 1 | An adaptive enemy under the same constraints as you; every tasking is a trade |
| **Discovery** | 2 | Uncovering the network and the leader's pattern from partial reports |
| **Fantasy** | 3 | Being a company commander in a real command post, with real procedure |
| **Narrative** | 4 | Emergent stories from people with histories (a family that turned, a source who was found out) |
| **Submission** | 5 | The calm, procedural rhythm of the command post between bursts |
| **Sensation** | 6 | Realistic command post products, radio traffic |
| **Expression** | 7 | Many valid strategies (starve him, turn the village, fast raid) |
| **Fellowship** | N/A | Single-player |

### Key Dynamics
- Players cross-check sources and learn which kind of report to trust.
- Players vary patrol timing and routes once they realise the enemy watches them.
- Players weigh pressure on the network against the wear on their own company.
- Players protect the people who help them, because losing them dries up intelligence.

### Core Mechanics
1. **Two combat economies.** Each side recruits, resupplies and disrupts the other in its own way, with physical stock and real transfers.
2. **A contested population.** Each family has a hidden leaning that feeds intelligence to you or recruits, shelter, caches and spotters to him, changed only by real causes.
3. **Separate knowledge for every actor.** The command post and the enemy each know only what they observed or were told, late and incomplete.
4. **Mission command.** You give mission, intent and limits; platoon leaders back-brief their plan for approval and execute it themselves.
5. **A continuous clock with standing reporting requirements.** Time acceleration that your staff interrupt when one of your requirements is met.

---

## Player Motivation Profile

| Need | How This Game Satisfies It | Strength |
| ---- | ---- | ---- |
| **Autonomy** | Many valid strategies; you choose where to push and what to risk | Core |
| **Competence** | Reading your own information better over time; a real after-action review built from what your side learned | Core |
| **Relatedness** | Soldiers and local contacts are people with histories who remember what you did | Supporting |

### Player Type Appeal
- [x] **Achievers**: capture the leader before the deadline, with your company intact.
- [x] **Explorers**: learn how the network and the population really work.
- [ ] **Socializers**: not served.
- [ ] **Killers/Competitors**: not served.

### Flow State Design
- **Onboarding curve**: the first objective starts with a known area and a small set of tasks; more arrive as the problem grows.
- **Difficulty scaling**: an enemy that adapts to your habits; later objectives with less certain intelligence.
- **Feedback clarity**: debriefs and the after-action review show what your side learned and how it led to each outcome.
- **Recovery from failure**: the leader slipping away is a setback, not an end; you can keep hunting, at a cost with battalion.

---

## Core Loop

### Moment-to-Moment (30 seconds)
A report arrives, late and partial. You decide what it means and what to do: divert the quick reaction force, hold a convoy, task a follow-up, or let the leader on the ground handle it.

### Short-Term (5-15 minutes)
A tasking cycle: assign a platoon a mission with intent and limits, approve its back-brief, watch reports come in. Each tasking pulls people from guard, rest and other pressures.

### Session-Level (30-120 minutes)
A few in-game days balancing what you know of his network, your company's state and the village's mood. Natural stops at the daily report to battalion; the hook is the latest lead and the pressure on your route.

### Long-Term Progression
Capture the leader, then larger objectives (secure a route, hold a village). Battalion's trust brings enablers; later the step up to battalion operations officer (S3).

### Retention Hooks
- **Curiosity**: an unconfirmed lead, a source who went quiet.
- **Investment**: soldiers and families with histories; a network you have half mapped.
- **Mastery**: reading the picture faster and more accurately.

---

## Game Pillars

In priority order; a higher pillar wins a conflict.

### Pillar 1: Mil sim first
Real US Army procedure, timelines and friction (late and partial reports, comms limits, fatigue, breakage). The fog applies to both sides: the enemy knows only what it observed or was told. Simplifications are recorded in `docs/DOCTRINE.md`.

*Design test*: torn between how it really works and what plays better, choose how it really works unless there is a recorded reason.

### Pillar 2: Command, don't control
You set mission, intent and limits; leaders on the ground choose how. Where a real commander would direct something specific, pillar 1 wins.

*Design test*: if a feature lets you steer individuals, give the choice to the subordinate leader and give you the approval.

### Pillar 3: Every person has a history
Every person and distinct item in the region of play exists and changes for traceable reasons. Routine life runs as schedules and states and is resolved in detail only when something interacts with it; histories record meaningful events. The player sees only what their side could see.

*Design test*: scripted event or emergent one, choose emergent, even if less dramatic.

### Pillar 4: Two economies, one population
Both sides recruit, resupply and disrupt each other. Each family's leaning is hidden truth, learned only through reports and changed only by recorded causes.

*Design test*: route an effect through stocks and people's leaning, never a direct bonus.

### Pillar 5: Always a next decision
Slow, methodical planning with bursts. You set standing reporting requirements; you may accelerate time, and staff interrupt when one is met.

*Design test*: if there is nothing to decide, look for real activity the player isn't seeing rather than adding drama.

### Anti-Pillars
- **NOT moving individual soldiers yourself**: breaks *Command, don't control*.
- **NOT scripted missions or forced outcomes**: breaks *Every person has a history*.
- **NOT a true picture in the command view**: breaks *Mil sim first*. The truth view is a developer tool, off in play.
- **NOT an enemy that knows anything it hasn't observed or been told**: breaks *Mil sim first*.
- **NOT turns, phases or end-of-day screens that stop the world**: breaks *Always a next decision*.
- **NOT flat bonuses or sliders standing in for people and stock**: breaks *Two economies, one population*.
- **NOT invented events or difficulty spikes to make pressure**: breaks *Mil sim first*.

Standing rules carried from `docs/DESIGN.md`: natural progression, and staff-gated automation (recommendations exist only once the staff who provide them exist).

---

## Visual Identity Anchor

**Direction: the command post itself.**
**Rule:** each kind of information appears in the form it really takes in a company command post, with its real delay and reliability.

- **Map board**: operations map with overlays and MIL-STD-2525 symbols, updated from reports, only as fresh as the last report. Marks age (solid when fresh, dashed and faded when old); lost contacts stay as last-known-position ghosts; estimates are uncertainty ellipses. *Test:* nothing on the board without a report behind it.
- **Blue Force Tracker**: live positions of your own tracked vehicles only. *Test:* dismounts never appear on it.
- **Radio and duty log**: traffic in standard formats (spot report, SALUTE, 9-line), logged with time. *Test:* every log entry was transmitted by someone.
- **Status boards**: personnel, logistics and maintenance as reported by platoons, often hours old.
- **Debriefs and intelligence products**: patrol debriefs, source reports, target file, network chart, in paperwork style.
- **Feeds**: tower cameras; aircraft video only when an aircraft is overhead.

**Colour philosophy:** doctrinal affiliation colours (blue friendly, red hostile, yellow unknown, green neutral), frame shapes carrying affiliation too for colour-blind players. Orange is reserved for "a decision is waiting on you". Paper by day, a dimmed ops room at night.

---

## Inspiration and References

| Reference | What We Take From It | What We Do Differently | Why It Matters |
| ---- | ---- | ---- | ---- |
| Football Manager | Persistent people; a match you influence but don't play | The match is unseen; information is partial | Shows players enjoy indirect control |
| Door Kickers / original Rainbow Six | Plan, then watch | Subordinates make the plan; you approve it | The plan-then-watch pleasure |
| Command: Modern Operations | Realism, sensors, fog | Company level, counterinsurgency, population | An audience for serious mil sim |
| Rebel Inc. | Counterinsurgency as a game | No sliders; people and stock instead | Shows the theme is playable |

**Non-game inspirations**: US Army counterinsurgency doctrine (FM 3-24), company-level command post practice, accounts of company commanders in Iraq and Afghanistan.

---

## Target Player Profile

| Attribute | Detail |
| ---- | ---- |
| **Age range** | 25-50 |
| **Gaming experience** | Hardcore simulation and strategy |
| **Time availability** | Hour-long sessions, longer at weekends |
| **Platform preference** | PC |
| **Current games they play** | Football Manager, Command: Modern Operations, RimWorld |
| **What they're looking for** | A realistic command experience at company level with a living opponent |
| **What would turn them away** | Arcade shortcuts, scripted missions, an enemy that cheats |

---

## Technical Considerations

| Consideration | Assessment |
| ---- | ---- |
| **Recommended Engine** | None: plain browser JavaScript, no dependencies (project rule) |
| **Key Technical Challenges** | Performance at full population (spatial grid, activity-based update rates, event-driven sensing); causal history without unbounded memory; doctrinal plan templates for platoon back-briefs; tuning an unscripted manhunt |
| **Art Style** | 2D command post: map symbols, forms, logs |
| **Art Pipeline Complexity** | Low (a hand-drawn 2525 symbol subset first) |
| **Audio Needs** | Minimal to moderate (radio traffic) |
| **Networking** | None |
| **Content Volume** | One valley, a few villages, one cell, one 5-day objective in the MVP |
| **Procedural Systems** | Seeded generation of population, families and the insurgent network |

---

## Risks and Open Questions

### Design Risks
- The population model must be causal, readable and fair; no doctrine gives a ready formula. Prototype it alone first.
- An unscripted manhunt may be impossible or trivial depending on the seed.
- Fog may make it hard to tell bad luck from a bad decision.

### Technical Risks
- Performance with hundreds to about 2,000 people over 5 in-game days.
- Memory and save size for causal histories.
- The command post UI is about half the work.

### Market Risks
- Niche audience (not researched).

### Scope Risks
- Two deep systems at once (intelligence and people). Mitigated by the build order below.
- Owner is the only playtester and decision-maker, so throughput is limited by review.

### Open Questions
- What share of seeds should end in capture without player input? Answer with a batch probe across many seeds.
- How fast does time accelerate, and which reporting requirements exist by default?

---

## MVP Definition

**Core hypothesis**: hunting a leader through a contested population, with partial information and real costs, produces a steady flow of meaningful decisions for an hour-long session.

**Required for MVP** (in build order, each step playable):
1. A three-platoon company at one outpost, every soldier simulated.
2. One village of families with routines and a traced leaning.
3. The insurgent leader and cell: recruiting from families that lean his way, a cache, taxing the road.
4. Orders by mission, intent and limits, with back-brief approval, for patrols and searches.
5. An intelligence chain (tips, sources, sightings, target) plus basic detention and questioning, ending in capture.
6. Standing reporting requirements with time acceleration.
7. The five-day clock, end state, and a debrief built from what your side learned.
8. Meetings with elders.
9. Checkpoints.
10. Second and third villages.

Ground casualty evacuation and the supply route from battalion are included throughout.

**Explicitly NOT in MVP**:
- Smuggling route (caches and taxing stay).
- Air medical evacuation, route clearance, aircraft video.
- Local police.
- Staff who arrive as the outpost grows.

### Scope Tiers

| Tier | Content | Features | Timeline |
| ---- | ---- | ---- | ---- |
| **MVP** | One valley, one cell | Steps 1-10 above | 9-12 playable increments (low confidence) |
| **Vertical Slice** | Same valley, richer | Enablers, smuggling, police, full after-action review | Not set |
| **Alpha (3a)** | Outpost growth | Staff who arrive as the outpost grows | Not set |
| **Beta (3b)** | More objectives | Deeper economies on both sides, new objectives | Not set |
| **Full Vision (3c)** | Battalion | S3 role and a wider front | Not set |

---

## Next Steps

- [ ] Prototype the core idea (`/prototype`), starting with the population and intelligence chain in one village
- [ ] If the prototype proceeds: `/map-systems`, then `/design-system` per system
- [ ] `/art-bible` for the command post look
- [ ] `/vertical-slice` before committing to production
