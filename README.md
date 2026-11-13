# FOB Manager

A persistent, real-time military operations command simulation. You sit in the command post of a forward operating base. The world runs whether or not you are looking at it, and you influence it only through the organisation: plans, decisions and standing orders.

Working title for the base and scenario: FOB Kestrel.

## Run it

No install and no server. Open `index.html` in a browser.

```
node --test tests/sim.test.js     # 13 engine tests
node tools/probe.js 7 48          # headless: seed 7, 48 hours, prints audit and event counts
python3 tools/build.py            # one self-contained page at dist/index.html
```

Node 18 or later for the tests. The simulation itself has no dependencies.

## What you can do in it

1. Start it and watch: patrols, guard shifts, convoys, maintenance and the enemy all run on their own.
2. **Command post** view: the map shows only what headquarters knows (last reports, vehicle beacons, base cameras). Panels: Tasks, Reports, Units, Staff, Logistics, Orders.
3. **Observer** view: the true world, including what the commander does not know. Panels: World, Inventories, Events, Knowledge.
4. Watch units physically move, detect each other and fight. Zoom in on a firefight and you see individual soldiers, fire, suppression and casualties.
5. Inspect every store, tank and load, with a live conservation audit.
6. Review and approve the reconnaissance operation the operations officer drafts.
7. Receive a contact or overdue report after its real transmission delay, and decide the response. If you do not, the operations officer acts on standing procedure.
8. Take on more responsibility as the scenario goes on: patrol support, logistics standing orders, direct orders. The staff keeps working inside whatever you set.
9. Pause, run at 1×, 10×, 60× or 300×, save and load.

## Architecture

Three layers, kept apart:

| Layer | Where | What it holds |
| --- | --- | --- |
| World state | `W.units`, `W.soldiers`, `W.vehicles`, `W.stores`, `W.ledger` | The truth: positions, loads, fuel, wounds, time |
| Knowledge | `u.kb` per unit, `W.hq` for the command post | What each actor has observed or been told, with timestamps |
| Decisions | `W.so` standing orders, unit plans, `W.decisions` trace, `W.msgs` in transit | Orders, procedures, and why each decision was made |

```
src/sim/core.js        clock helpers, seeded random numbers, causal event log, decision trace
src/sim/inventory.js   resource types, stores with dated lots, transfers, ledger, conservation audit
src/sim/world.js       the scenario: map, roads, base, depot, units, vehicles, enemy cells
src/sim/mechanics.js   movement and fuel burn, observation, direct fire
src/sim/comms.js       links, message delays, command-post knowledge, beacons, base cameras
src/sim/units.js       subordinate leaders: plans, battle drill on contact, reports, orders received
src/sim/enemy.js       enemy cells: observe, find a pattern, ambush, withdraw, resupply
src/sim/staff.js       operations officer, logistics officer, depot dispatcher, life on the base
src/sim/player.js      the commander's responsibilities and commands
src/sim/sim.js         the one-second step, save and load
src/ui/map.js          one canvas map, drawn from truth or from knowledge
src/ui/app.js          clock, modes, panels
```

The engine is plain JavaScript with no DOM access. State is plain JSON, so a save is `JSON.stringify` of the world. The same seed always produces the same world.

## Documents

- [docs/DESIGN.md](docs/DESIGN.md): the vision, decisions and prototype history.
- [docs/DOCTRINE.md](docs/DOCTRINE.md): what follows US Army practice, with sources, and where the simulation simplifies.

## Earlier prototypes

`prototypes/` holds the two throwaway builds that led here. They are kept for reference and are not maintained.
