# FOB Manager: working instructions

A persistent, real-time military operations command simulation. The player sits in a command post; the world runs whether or not they are watching.

Read `docs/DESIGN.md` for the vision and decisions and `docs/DOCTRINE.md` for what follows US Army practice. The governing brief is the "Persistent Military Operations Command Simulator" specification summarised at the top of the design document.

## Rules that do not bend

- **Three layers stay separate.** True world state, each actor's knowledge, and decisions. Command-post panels and the command map read only `W.hq`. Only the observer view reads truth.
- **Nothing is faked.** Every report originates from an observation or message in the simulation. Every resource movement is a transfer between stores, and the conservation audit must stay at zero.
- **No scripted outcomes.** Events happen because entities interact. Scenario setup may create conditions; it may not force a result.
- **The organisation runs without the player.** Taking a responsibility never switches the staff off.
- **Mil sim, not arcade.** Follow published US Army practice where it exists. When simplifying, record it in `docs/DOCTRINE.md`.
- **Watchable.** Individuals are simulated and drawn. Combat is seen happening, not announced.

## Engineering conventions

- The engine in `src/sim/` is plain JavaScript with no DOM access and no dependencies. State is plain JSON. Randomness comes only from the seeded generator in `core.js`.
- Files attach to the `FOB` namespace and load as classic scripts, so `index.html` opens directly from disk.
- Every decision by staff, enemy or commander goes through `F.trace` with its reason. Every significant event goes through `F.ev`, naming its cause where there is one.
- Add or update a test in `tests/sim.test.js` for any change to world state, inventories, reporting or knowledge.

## Commands

```
node --test tests/sim.test.js
node tools/probe.js <seed> <hours> [op]
python3 tools/build.py
```

## Working agreement

- Work on a branch per change; do not commit to `main` directly.
- Build the smallest working version and show it running. Do not substitute a design document for implementation.
- The owner wants natural progression, staff-gated automation, and real procedure. Check `docs/DESIGN.md` before proposing features.
