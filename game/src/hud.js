// Ridgeline Run: the instruments.
// One clear job: draw the HUD. Lit gauges, tapes, compass, fuel, throttle, messages.

import { clamp } from './random.js';
import { FLIGHT } from './config.js';

const AMBER = '#ffb63c';
const GREEN = '#7ee081';
const RED = '#ff5a4e';
const PANEL = 'rgba(12, 18, 28, 0.72)';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PANEL;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 182, 60, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function label(ctx, text, x, y, size = 11, color = '#cfe0f0') {
  ctx.fillStyle = color;
  ctx.font = `600 ${size}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function drawArtificialHorizon(ctx, plane, x, y, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(-plane.roll);
  const pitchPx = clamp(plane.pitch, -0.6, 0.6) * r * 1.6;
  ctx.fillStyle = '#3f7fd0';
  ctx.fillRect(-r, -r + pitchPx, r * 2, r - pitchPx);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-r, pitchPx, r * 2, r - pitchPx + 1);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, pitchPx);
  ctx.lineTo(r, pitchPx);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  // Fixed wings marker.
  ctx.strokeStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.55, y);
  ctx.lineTo(x - r * 0.2, y);
  ctx.moveTo(x + r * 0.2, y);
  ctx.lineTo(x + r * 0.55, y);
  ctx.stroke();
  ctx.fillStyle = AMBER;
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawCompass(ctx, plane, w) {
  const cx = w / 2;
  const y = 30;
  const headings = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const deg = ((plane.heading * 180) / Math.PI % 360 + 360) % 360;
  panel(ctx, cx - 190, 10, 380, 40);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 190, 10, 380, 40);
  ctx.clip();
  for (let d = -180; d <= 180; d += 15) {
    let hd = Math.round((deg + d) / 15) * 15;
    const norm = ((hd % 360) + 360) % 360;
    const sx = cx + (d / 15) * 26 - ((deg % 15) / 15) * 26;
    if (sx < cx - 185 || sx > cx + 185) continue;
    const major = norm % 45 === 0;
    ctx.strokeStyle = major ? '#fff' : 'rgba(207, 224, 240, 0.5)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(sx, 22);
    ctx.lineTo(sx, major ? 34 : 29);
    ctx.stroke();
    if (major) {
      ctx.fillStyle = '#fff';
      ctx.font = '700 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(headings[Math.round(norm / 45) % 8], sx, 46);
    }
  }
  ctx.restore();
  // Centre caret and digital heading.
  ctx.fillStyle = AMBER;
  ctx.beginPath();
  ctx.moveTo(cx - 7, 10);
  ctx.lineTo(cx + 7, 10);
  ctx.lineTo(cx, 20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${String(Math.round(deg)).padStart(3, '0')} deg`, cx, 66);
}

function drawTape(ctx, value, unit, x, y, w, h, format) {
  panel(ctx, x, y, w, h);
  label(ctx, unit, x + 10, y + 16, 10, AMBER);
  ctx.fillStyle = '#fff';
  ctx.font = '700 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(format(value), x + 10, y + 46);
}

function drawBar(ctx, x, y, w, h, frac, color, text) {
  panel(ctx, x, y, w, h);
  const inner = 6;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.roundRect(x + inner, y + inner + 14, w - inner * 2, h - inner * 2 - 18, 4);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x + inner, y + inner + 14, (w - inner * 2) * clamp(frac, 0, 1), h - inner * 2 - 18, 4);
  ctx.fill();
  label(ctx, text, x + 10, y + 16, 10, '#cfe0f0');
}

export function drawHud(ctx, state) {
  const { plane, mission, score, ringsLeft, message, messageTime, time } = state;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  drawCompass(ctx, plane, w);

  // Altitude and speed tapes, top corners.
  const altitudeFt = Math.max(0, Math.round((plane.y - 4) * 3.28));
  const speedKt = Math.round(plane.speed * 1.94);
  drawTape(ctx, altitudeFt, 'ALTITUDE FT', 16, 12, 150, 58, (v) => String(v));
  drawTape(ctx, speedKt, 'AIRSPEED KT', w - 166, 12, 150, 58, (v) => String(v));

  // Artificial horizon, bottom left.
  drawArtificialHorizon(ctx, plane, 86, h - 86, 52);

  // Fuel and throttle bars, bottom right.
  const fuelColor = plane.fuel < 20 ? RED : plane.fuel < 45 ? AMBER : GREEN;
  drawBar(ctx, w - 240, h - 118, 224, 48, plane.fuel / 100, fuelColor, `FUEL ${Math.round(plane.fuel)}%`);
  drawBar(ctx, w - 240, h - 62, 224, 48, plane.throttle, '#7fb8ff', `THROTTLE ${Math.round(plane.throttle * 100)}%`);

  // Gear + flaps line.
  label(ctx, `GEAR ${plane.gearDown ? 'DOWN' : 'UP'}   ${plane.stalled ? 'STALL!' : ''}   ${plane.outOfFuel ? 'FUEL EMPTY' : ''}`, 16, h - 24, 12, plane.stalled || plane.outOfFuel ? RED : '#cfe0f0');

  // Rotate hint: once the wheels are fast enough, tell the pilot to pull up.
  if (plane.onGround && plane.speed >= FLIGHT.minSpeed && !plane.landed) {
    ctx.font = '700 20px sans-serif';
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText('ROTATE - PULL UP', w / 2, h - 76);
    ctx.shadowBlur = 0;
  }

  // Objective strip.
  const obj = `${mission.name}  |  ${mission.objective}${ringsLeft !== null ? `  |  Rings ${ringsLeft}` : ''}  |  Score ${score}`;
  ctx.font = '600 14px sans-serif';
  const objW = ctx.measureText(obj).width + 28;
  panel(ctx, (w - objW) / 2, h - 44, objW, 30);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(obj, w / 2, h - 24);

  // Centre message, fading.
  if (message && time - messageTime < 3) {
    const alpha = clamp(3 - (time - messageTime), 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '700 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 10;
    ctx.fillText(message, w / 2, h * 0.34);
    ctx.restore();
  }
}

export function drawDebrief(ctx, state) {
  const { w, h, debrief } = state;
  ctx.fillStyle = 'rgba(8, 12, 22, 0.62)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = debrief.win ? '#7ee081' : '#ff8a7a';
  ctx.font = '700 48px sans-serif';
  ctx.fillText(debrief.title, w / 2, h * 0.34);
  ctx.fillStyle = '#fff';
  ctx.font = '400 20px sans-serif';
  ctx.fillText(debrief.detail, w / 2, h * 0.34 + 40);
  ctx.font = '700 26px sans-serif';
  ctx.fillStyle = AMBER;
  ctx.fillText(`Score ${debrief.score}`, w / 2, h * 0.34 + 88);
  ctx.font = '400 16px sans-serif';
  ctx.fillStyle = '#dfe9f5';
  ctx.fillText('Press M for the next sortie, or Enter to fly this one again.', w / 2, h * 0.34 + 128);
}
