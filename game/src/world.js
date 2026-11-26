// Ridgeline Run: the Kestrel valley.
// One clear job: know the ground. Height, river, runway, rings, trees and clouds.

import { WORLD, RING, MISSIONS } from './config.js';
import { makeNoise2D, makeNoise1D, mulberry32, clamp, lerp } from './random.js';

const noise2 = makeNoise2D(1337);
const noiseRidge = makeNoise1D(4242);
const noiseRiver = makeNoise1D(777);

// The river meanders down the valley floor.
export function riverX(z) {
  return noiseRiver(z * 0.004) * 26;
}

// Height of the terrain at world (x, z). Deterministic, no state.
export function heightAt(x, z) {
  const valley = Math.abs(x - riverX(z));
  const wall = clamp((valley - WORLD.valleyHalfWidth) / 60, 0, 1);
  const hills = noise2(x * 0.012, z * 0.012) * 26 + noise2(x * 0.045, z * 0.045) * 7;
  const ridge = Math.max(0, noiseRidge(z * 0.006)) * 40;
  let h = 2 + hills * (0.25 + wall) + wall * wall * WORLD.mountainHeight + ridge * wall;
  // River channel carves the valley floor.
  const riverDist = Math.abs(x - riverX(z));
  if (riverDist < 14) {
    const carve = 1 - riverDist / 14;
    h -= carve * carve * 3.5;
  }
  // The runway strip is graded flat.
  const rz = z - WORLD.runwayZ;
  if (Math.abs(x) < WORLD.runwayHalfWidth + 6 && rz > -20 && rz < WORLD.runwayLength + 20) {
    const edge = clamp((Math.abs(x) - WORLD.runwayHalfWidth) / 6, 0, 1);
    const zEdge = clamp((Math.min(rz + 20, WORLD.runwayLength + 20 - rz)) / 20, 0, 1);
    const blend = Math.min(edge, zEdge);
    h = h * blend + 4 * (1 - blend);
  }
  return h;
}

export function isWater(x, z) {
  return Math.abs(x - riverX(z)) < 7 && heightAt(x, z) < 1.2;
}

export function isRunway(x, z) {
  const rz = z - WORLD.runwayZ;
  return Math.abs(x) < WORLD.runwayHalfWidth && rz > 0 && rz < WORLD.runwayLength;
}

// Ring positions for the Ring Run, strung down the valley.
export function ringPositions() {
  const rings = [];
  const rand = mulberry32(90210);
  for (let i = 0; i < RING.count; i += 1) {
    const z = 220 + i * 95;
    const x = riverX(z) + (rand() * 2 - 1) * 22;
    const y = heightAt(x, z) + 26 + rand() * 22;
    rings.push({ x, y, z, r: RING.radius, passed: false });
  }
  return rings;
}

// The hay field where the parcel belongs, beside the river.
export function parcelField() {
  return { x: riverX(560) + 34, z: 560, r: 12 };
}

// Trees: seeded scatter, kept off the river and the runway.
export function treePositions() {
  const rand = mulberry32(5150);
  const trees = [];
  for (let i = 0; i < 420; i += 1) {
    const x = (rand() * 2 - 1) * 260;
    const z = -40 + rand() * 1100;
    if (Math.abs(x - riverX(z)) < 12) continue;
    if (isRunway(x, z)) continue;
    const h = heightAt(x, z);
    if (h > 60) continue;
    trees.push({ x, z, y: h, s: 5 + rand() * 7, pine: rand() < 0.7 });
  }
  return trees;
}

// Clouds: seeded billboards that drift slowly with the wind.
export function cloudPositions() {
  const rand = mulberry32(31337);
  const clouds = [];
  for (let i = 0; i < 26; i += 1) {
    clouds.push({
      x: (rand() * 2 - 1) * 500,
      y: 150 + rand() * 70,
      z: rand() * 1200,
      s: 40 + rand() * 70,
      drift: 1.5 + rand() * 2,
    });
  }
  return clouds;
}

// Mission start: on the strip, nose down the valley, engines warm.
export function startPose(missionIndex) {
  const mission = MISSIONS[missionIndex];
  return {
    x: 0,
    y: heightAt(0, 10) + 2.0,
    z: 10,
    heading: 0,
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0,
    fuel: 100,
    damage: 0,
    gearDown: true,
    sky: mission.sky,
  };
}

// Colour of the ground at a point, blended smoothly so the valley reads as
// fields and the high ground grades from rock into snow instead of banding.
export function groundColor(x, z, h) {
  if (isRunway(x, z)) return '#3a3d42';
  if (isWater(x, z)) return '#3f7fb8';
  const n = noise2(x * 0.09, z * 0.09);
  // Base grass, mixed between two field tones by the noise field.
  const t = clamp((n + 0.5) / 1, 0, 1);
  let r = lerp(125, 93, t);
  let g = lerp(154, 122, t);
  let b = lerp(74, 53, t);
  if (n > 0.45) {
    // Dry hay patch.
    const k = clamp((n - 0.45) / 0.25, 0, 1);
    r = lerp(r, 168, k);
    g = lerp(g, 154, k);
    b = lerp(b, 85, k);
  }
  // Rock from 55 up, snow from 90 up, both blended.
  const rock = clamp((h - 55) / 25, 0, 1);
  r = lerp(r, 138, rock);
  g = lerp(g, 122, rock);
  b = lerp(b, 104, rock);
  const snow = clamp((h - 90) / 25, 0, 1);
  r = lerp(r, 207, snow);
  g = lerp(g, 212, snow);
  b = lerp(b, 216, snow);
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}
