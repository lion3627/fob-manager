# FOB Kestrel

A military simulation about running a forward operating base: logistics, routines and deployments, managed from the commander's chair. Think Door Kickers and the original Rainbow Six planning, run like Football Manager.

The design is in [docs/DESIGN.md](docs/DESIGN.md). Read that first; it records what has been decided, what the two prototypes taught us, and what the next build should be.

## Prototypes

Each prototype is a self-contained browser page with no dependencies.

| Folder | What it is | Verdict |
| --- | --- | --- |
| `prototypes/v0.0.1-ops-center` | Ten-day deployment run from the ops center: orders, comms coverage, lazy enemy generation, higher-command assets, raid planning, after-action review | Too complex at the start and too stop-start |
| `prototypes/v0.0.2-base-setup` | Stand up the base on a continuous clock; eight guided routine steps; standing procedures handle events | Progression felt arbitrary; squads drawn as single static markers |

To build and test either one:

```
cd prototypes/v0.0.2-base-setup
python3 build.py        # writes dist/index.html
node test.js            # automated playthroughs across many seeds
```

Open `dist/index.html` in a browser to play.

## Layout of a prototype

- `sim.js`: the simulation. Pure logic, no DOM, state is plain JSON, seeded random numbers.
- `ui.js`: rendering and input.
- `style.css`, `template.html`: presentation. `build.py` inlines everything into one page.
- `test.js`: headless playthroughs that check for crashes and report outcome averages.
