// Ridgeline Run: a tiny seeded random number generator.
// One clear job: deterministic numbers, so a screenshot pose always looks the same.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 1D value noise in [-1, 1] from a seeded generator.
export function makeNoise1D(seed) {
  const rand = mulberry32(seed);
  const grid = new Float32Array(512);
  for (let i = 0; i < grid.length; i += 1) grid[i] = rand() * 2 - 1;
  const fade = (t) => t * t * (3 - 2 * t);
  return function noise(x) {
    const xi = Math.floor(x);
    const xf = x - xi;
    const a = grid[((xi % 512) + 512) % 512];
    const b = grid[(((xi + 1) % 512) + 512) % 512];
    return a + (b - a) * fade(xf);
  };
}

// Smooth 2D value noise in [-1, 1] from a seeded generator.
export function makeNoise2D(seed) {
  const rand = mulberry32(seed);
  const size = 128;
  const grid = new Float32Array(size * size);
  for (let i = 0; i < grid.length; i += 1) grid[i] = rand() * 2 - 1;
  const fade = (t) => t * t * (3 - 2 * t);
  const at = (x, y) => grid[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  return function noise(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const a = at(xi, yi);
    const b = at(xi + 1, yi);
    const c = at(xi, yi + 1);
    const d = at(xi + 1, yi + 1);
    const u = fade(xf);
    const v = fade(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function degToRad(d) {
  return (d * Math.PI) / 180;
}
