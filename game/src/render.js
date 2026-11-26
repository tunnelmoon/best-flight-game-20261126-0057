// Ridgeline Run: everything the eye sees.
// One clear job: draw the world. Sky, terrain, plane, rings, runway, clouds.

import { WORLD, SKIES } from './config.js';
import { heightAt, groundColor, riverX, isRunway } from './world.js';
import { clamp, lerp, makeNoise1D } from './random.js';

const ridgeNoise = makeNoise1D(8080);

function parseRgb(text) {
  if (text.startsWith('#')) {
    const n = parseInt(text.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = text.match(/rgb\((\d+), (\d+), (\d+)\)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [125, 154, 74];
}

function mixRgb(a, b, t) {
  return `rgb(${Math.round(lerp(a[0], b[0], t))}, ${Math.round(lerp(a[1], b[1], t))}, ${Math.round(lerp(a[2], b[2], t))})`;
}

// Camera basis from the plane: chase position, look ahead, bank a little with it.
export function makeCamera(plane, width, height) {
  const fx = Math.sin(plane.heading);
  const fz = Math.cos(plane.heading);
  const cam = {
    x: plane.x - fx * 14,
    y: plane.y + 4.4,
    z: plane.z - fz * 14,
    heading: plane.heading,
    pitch: -0.10 + plane.pitch * 0.45,
    roll: plane.roll * 0.35,
    focal: (height / 2) / Math.tan((68 * Math.PI) / 360),
    w: width,
    h: height,
  };
  // Forward vector from yaw/pitch.
  const cp = Math.cos(cam.pitch);
  cam.fx = Math.sin(cam.heading) * cp;
  cam.fy = Math.sin(cam.pitch);
  cam.fz = Math.cos(cam.heading) * cp;
  // Right = forward x worldUp, then up = right x forward, with roll applied.
  let rx = cam.fz;
  let rz = -cam.fx;
  const rl = Math.hypot(rx, rz) || 1;
  rx /= rl;
  rz /= rl;
  const ux = -cam.fz * 0;
  const uy = 1;
  const uz = 0;
  // Apply roll around the forward axis.
  const cosR = Math.cos(cam.roll);
  const sinR = Math.sin(cam.roll);
  cam.rx = rx * cosR + ux * sinR;
  cam.ry = 0 * cosR + uy * sinR;
  cam.rz = rz * cosR + uz * sinR;
  cam.ux = -rx * sinR + ux * cosR;
  cam.uy = -0 * sinR + uy * cosR;
  cam.uz = -rz * sinR + uz * cosR;
  return cam;
}

// Project a world point to screen space. Returns null behind the camera.
export function project(cam, x, y, z) {
  const dx = x - cam.x;
  const dy = y - cam.y;
  const dz = z - cam.z;
  const cx = dx * cam.rx + dy * cam.ry + dz * cam.rz;
  const cy = dx * cam.ux + dy * cam.uy + dz * cam.uz;
  const cz = dx * cam.fx + dy * cam.fy + dz * cam.fz;
  if (cz < 0.6) return null;
  const s = cam.focal / cz;
  return { x: cam.w / 2 + cx * s, y: cam.h / 2 - cy * s, d: cz, s };
}

function drawSky(ctx, cam, sky, time) {
  const g = ctx.createLinearGradient(0, 0, 0, cam.h);
  g.addColorStop(0, sky.top);
  g.addColorStop(0.45, sky.mid);
  g.addColorStop(0.72, sky.low);
  g.addColorStop(1, sky.low);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cam.w, cam.h);

  // Sun with a soft glow.
  const sunX = sky.sunX * cam.w;
  const sunY = sky.sunY * cam.h;
  const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 120);
  glow.addColorStop(0, sky.sun);
  glow.addColorStop(0.25, sky.sun + '');
  glow.addColorStop(1, 'rgba(255, 220, 160, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 120, sunY - 120, 240, 240);
  ctx.fillStyle = sky.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 22, 0, Math.PI * 2);
  ctx.fill();

  // Distant ridge silhouettes on the horizon.
  const horizonY = cam.h * 0.62;
  ctx.fillStyle = 'rgba(70, 80, 110, 0.55)';
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  for (let x = 0; x <= cam.w; x += 16) {
    const y = horizonY - (ridgeNoise(x * 0.004 + time * 0.0002) * 0.5 + 0.5) * 90;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(cam.w, horizonY);
  ctx.closePath();
  ctx.fill();
}

function drawClouds(ctx, cam, clouds, time) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  for (const cloud of clouds) {
    const cx = cloud.x + time * cloud.drift;
    const p = project(cam, cx, cloud.y, cloud.z);
    if (!p) continue;
    const s = p.s * cloud.s * 0.09;
    if (s < 2) continue;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, s, s * 0.36, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x - s * 0.55, p.y + s * 0.1, s * 0.6, s * 0.28, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x + s * 0.55, p.y + s * 0.08, s * 0.65, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTerrain(ctx, cam, plane, sky) {
  const step = WORLD.terrainStep;
  const fogRgb = parseRgb(sky.low);
  const zFar = plane.z + WORLD.viewDistance;
  const zNear = plane.z - 60;
  const xHalf = 170;
  // Far rows first so nearer ground paints over them.
  for (let z = zFar; z > zNear; z -= step) {
    for (let x = plane.x - xHalf; x < plane.x + xHalf; x += step) {
      const h00 = heightAt(x, z);
      const h10 = heightAt(x + step, z);
      const h01 = heightAt(x, z + step);
      const h11 = heightAt(x + step, z + step);
      const p00 = project(cam, x, h00, z);
      const p10 = project(cam, x + step, h10, z);
      const p01 = project(cam, x, h01, z + step);
      const p11 = project(cam, x + step, h11, z + step);
      if (!p00 || !p10 || !p01 || !p11) continue;
      const cx = x + step / 2;
      const cz = z + step / 2;
      const base = parseRgb(groundColor(cx, cz, (h00 + h11) / 2));
      // Slope shading: steeper faces go darker.
      const slope = clamp(Math.abs(h10 - h00) / step + Math.abs(h01 - h00) / step, 0, 1.4);
      const shade = 1 - slope * 0.22;
      const fogT = clamp((p00.d - 60) / WORLD.viewDistance, 0, 0.85);
      const r = Math.round(lerp(base[0] * shade, fogRgb[0], fogT));
      const g = Math.round(lerp(base[1] * shade, fogRgb[1], fogT));
      const b = Math.round(lerp(base[2] * shade, fogRgb[2], fogT));
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.beginPath();
      ctx.moveTo(p00.x, p00.y);
      ctx.lineTo(p10.x, p10.y);
      ctx.lineTo(p11.x, p11.y);
      ctx.lineTo(p01.x, p01.y);
      ctx.closePath();
      ctx.fill();
      // Same-colour stroke closes the hairline seams between neighbour quads.
      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

function drawRunwayMarkings(ctx, cam, sky) {
  // Centreline dashes and threshold bars, plus edge lights at dusk.
  const y = 4.15;
  ctx.fillStyle = '#e8e8e8';
  for (let z = 8; z < WORLD.runwayLength - 4; z += 14) {
    const a = project(cam, -0.8, y, z);
    const b = project(cam, 0.8, y, z);
    const c = project(cam, 0.8, y, z + 7);
    const d = project(cam, -0.8, y, z + 7);
    if (!a || !b || !c || !d) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
  }
  if (sky === 'dusk') {
    ctx.fillStyle = '#ffd27a';
    for (let z = 0; z <= WORLD.runwayLength; z += 18) {
      for (const side of [-WORLD.runwayHalfWidth, WORLD.runwayHalfWidth]) {
        const p = project(cam, side, 4.3, z);
        if (!p) continue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1.5, p.s * 0.35), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawTrees(ctx, cam, trees, plane) {
  // Only trees near the flight path, far to near.
  const near = trees.filter((t) => Math.abs(t.z - plane.z) < 380 && Math.abs(t.x - plane.x) < 150);
  near.sort((a, b) => b.z - a.z);
  for (const tree of near) {
    const p = project(cam, tree.x, tree.y, tree.z);
    if (!p) continue;
    const h = p.s * tree.s * 0.55;
    const w = h * 0.42;
    if (h < 1.5) continue;
    if (tree.pine) {
      ctx.fillStyle = '#2d4a22';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - h);
      ctx.lineTo(p.x - w, p.y);
      ctx.lineTo(p.x + w, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3a5c2c';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - h * 0.75);
      ctx.lineTo(p.x - w * 0.7, p.y - h * 0.25);
      ctx.lineTo(p.x + w * 0.7, p.y - h * 0.25);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#4a6a2a';
      ctx.beginPath();
      ctx.arc(p.x, p.y - h * 0.6, w * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#5a4632';
    ctx.fillRect(p.x - Math.max(1, w * 0.08), p.y - h * 0.18, Math.max(2, w * 0.16), h * 0.18);
  }
}

function drawRings(ctx, cam, rings, time) {
  for (const ring of rings) {
    const pts = [];
    for (let i = 0; i <= 24; i += 1) {
      const a = (i / 24) * Math.PI * 2;
      pts.push(project(cam, ring.x + Math.cos(a) * ring.r, ring.y + Math.sin(a) * ring.r, ring.z));
    }
    if (pts.some((p) => !p)) continue;
    const pulse = 0.75 + Math.sin(time * 3 + ring.z) * 0.25;
    ctx.save();
    ctx.lineWidth = 5;
    ctx.strokeStyle = ring.passed ? 'rgba(120, 220, 120, 0.9)' : `rgba(255, 190, 60, ${pulse})`;
    ctx.shadowColor = ring.passed ? '#78dc78' : '#ffbe3c';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    // Inner glow disc.
    const c = project(cam, ring.x, ring.y, ring.z);
    if (c) {
      const grad = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, c.s * ring.r * 0.12);
      grad.addColorStop(0, ring.passed ? 'rgba(120, 220, 120, 0.18)' : 'rgba(255, 190, 60, 0.14)');
      grad.addColorStop(1, 'rgba(255, 190, 60, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.s * ring.r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawParcelTarget(ctx, cam, field) {
  const p = project(cam, field.x, heightAt(field.x, field.z) + 1, field.z);
  if (!p) return;
  const r = p.s * field.r * 0.1;
  ctx.save();
  ctx.strokeStyle = '#ff5a5a';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.arc(p.x, p.y, Math.max(6, r), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ff5a5a';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// The Kestrel-7, drawn as a rear three-quarter view, banking with the roll.
function drawPlane(ctx, cam, plane) {
  const nose = project(cam, plane.x, plane.y + 0.4, plane.z + 1.5);
  if (!nose) return;
  const scale = clamp(nose.s * 0.11, 0.35, 1.5);
  const cx = nose.x;
  const cy = nose.y + 26 * scale;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-plane.roll * 0.9);
  ctx.scale(scale, scale);
  // Prop blur disc, just a whisper at the nose.
  ctx.fillStyle = 'rgba(220, 230, 240, 0.16)';
  ctx.beginPath();
  ctx.ellipse(0, -52, 18, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wings.
  ctx.fillStyle = '#c23b2e';
  ctx.beginPath();
  ctx.moveTo(-78, -18);
  ctx.lineTo(78, -18);
  ctx.lineTo(66, -2);
  ctx.lineTo(-66, -2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8f2a20';
  ctx.fillRect(-78, -18, 156, 4);
  // Fuselage.
  const body = ctx.createLinearGradient(0, -60, 0, 30);
  body.addColorStop(0, '#f2ede2');
  body.addColorStop(0.6, '#e8ddc8');
  body.addColorStop(1, '#b9a888');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -62);
  ctx.lineTo(13, -30);
  ctx.lineTo(15, 18);
  ctx.lineTo(8, 30);
  ctx.lineTo(-8, 30);
  ctx.lineTo(-15, 18);
  ctx.lineTo(-13, -30);
  ctx.closePath();
  ctx.fill();
  // Canopy.
  ctx.fillStyle = '#2e4a66';
  ctx.beginPath();
  ctx.ellipse(0, -38, 9, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(-3, -42, 3.5, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Tail fin and stabiliser.
  ctx.fillStyle = '#c23b2e';
  ctx.beginPath();
  ctx.moveTo(0, 30);
  ctx.lineTo(-12, 52);
  ctx.lineTo(12, 52);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-34, 44, 68, 7);
  // Registration.
  ctx.fillStyle = '#33414f';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('KESTREL-7', 0, 8);
  // Navigation lights.
  ctx.fillStyle = '#ff4040';
  ctx.beginPath();
  ctx.arc(-78, -10, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#40ff70';
  ctx.beginPath();
  ctx.arc(78, -10, 3, 0, Math.PI * 2);
  ctx.fill();
  // Landing gear.
  if (plane.gearDown) {
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, 28);
    ctx.lineTo(-14, 40);
    ctx.moveTo(10, 28);
    ctx.lineTo(14, 40);
    ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-14, 42, 4, 0, Math.PI * 2);
    ctx.arc(14, 42, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function render(ctx, state) {
  const { plane, mission, rings, field, trees, clouds, time } = state;
  const sky = SKIES[mission.sky];
  const cam = makeCamera(plane, ctx.canvas.width, ctx.canvas.height);
  drawSky(ctx, cam, sky, time);
  drawClouds(ctx, cam, clouds, time);
  drawTerrain(ctx, cam, plane, sky);
  drawRunwayMarkings(ctx, cam, mission.sky);
  drawTrees(ctx, cam, trees, plane);
  if (rings) drawRings(ctx, cam, rings, time);
  if (field) drawParcelTarget(ctx, cam, field);
  drawPlane(ctx, cam, plane);
  return cam;
}

export function screenPosOf(cam, x, y, z) {
  return project(cam, x, y, z);
}
