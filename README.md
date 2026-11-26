[![make.fun bounty](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/tunnelmoon/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/tunnelmoon/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

# Ridgeline Run

A bush-plane courier game for the [Make the best flight game](https://make.fun/bounty/best-flight-game-20261126-0057) bounty. Fly the Kestrel-7 through the Kestrel valley: thread the rings, drop the parcel on the hay field, and bring her down soft on the strip at dusk.

## Play

Serve `game/` and open it in a desktop browser:

```
node serve.ts
```

Then open http://localhost:8080. No network request, no build step, no library.

- **W / S** throttle
- **Arrow keys** pitch and bank
- **G** landing gear
- **P** pause, **M** next sortie, **1 / 2 / 3** pick a sortie

## The three sorties

1. **Ring Run** (day): thread all 8 rings down the valley before the fuel runs dry.
2. **River Delivery** (dawn): follow the river, drop the parcel on the hay field, land on the strip.
3. **Dusk Landing** (dusk): crosswind at dusk. Bring her down soft. No second chances.

Fuel burns with the throttle, speed below 30 knots stalls the wings, and a hard landing bends the gear. The HUD shows altitude, airspeed, heading, an artificial horizon, fuel and throttle.

## How it is built

Plain canvas 2D, no engine. The valley is a seeded heightfield with a river, a graded runway strip, pine and oak scatter, and drifting clouds. The camera chases the plane; the terrain projects with a small perspective camera and paints far to near. All sound is synthesized with WebAudio: engine drone, wind, ring chimes, landing thuds. The source is split by job: `world.js` knows the ground, `plane.js` flies, `render.js` draws, `hud.js` instruments, `missions.js` scores, `audio.js` sounds, `shots.js` poses the screenshots.

## Hand in

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's `buildDossier`.

## License

MIT. See [LICENSE](LICENSE).
