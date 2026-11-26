// Ridgeline Run: boot, loop and screens.
// One clear job: run the game. Title, flying, pause, debrief, and the fixed shot poses.

import { MISSIONS, GAME_TITLE, GAME_SUBTITLE } from './config.js';
import { makePlane, stepPlane, toggleGear } from './plane.js';
import { makeInput, attachInput, pollInput } from './input.js';
import { render } from './render.js';
import { drawHud, drawDebrief } from './hud.js';
import { makeMissionState, stepMission, ringsLeft, nextMissionIndex, startPose } from './missions.js';
import { treePositions, cloudPositions, heightAt } from './world.js';
import { makeAudio, unlockAudio, updateAudio } from './audio.js';
import { shotPose } from './shots.js';

const W = 1280;
const H = 720;

const canvas = document.getElementById('game');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const shotMode = shot !== null;

const input = makeInput();
const audio = makeAudio();
const trees = treePositions();
const clouds = cloudPositions();

let missionState = makeMissionState(0);
let plane = makePlane(startPose(0));
let screen = 'title';
let message = null;
let messageTime = 0;
let time = 0;
let lastFrame = performance.now();
let titleButtons = [];

function startMission(index) {
  missionState = makeMissionState(index);
  plane = makePlane(startPose(index));
  missionState.startTime = 0;
  plane.time = 0;
  screen = 'flying';
  message = MISSIONS[index].brief;
  messageTime = 0;
  unlockAudio(audio);
}

function showMessage(text) {
  message = text;
  messageTime = time;
}

function titleLayout() {
  const bw = 340;
  const bh = 64;
  const gap = 18;
  const total = MISSIONS.length * bw + (MISSIONS.length - 1) * gap;
  const x0 = (W - total) / 2;
  const y = H * 0.62;
  return MISSIONS.map((m, i) => ({ x: x0 + i * (bw + gap), y, w: bw, h: bh, index: i, name: m.name }));
}

function drawTitleScreen() {
  ctx.fillStyle = 'rgba(8, 12, 22, 0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = '700 62px sans-serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 16;
  ctx.fillText(GAME_TITLE, W / 2, H * 0.3);
  ctx.shadowBlur = 0;
  ctx.font = '400 20px sans-serif';
  ctx.fillStyle = '#ffd9a0';
  ctx.fillText(GAME_SUBTITLE, W / 2, H * 0.3 + 36);
  ctx.font = '400 16px sans-serif';
  ctx.fillStyle = '#dfe9f5';
  ctx.fillText('W / S throttle    Arrow keys pitch and bank    G gear    P pause', W / 2, H * 0.46);
  ctx.fillText('Thread the rings. Mind the fuel. Bring her down soft.', W / 2, H * 0.46 + 28);
  titleButtons = titleLayout();
  for (const b of titleButtons) {
    const hover = input.mouseX >= b.x && input.mouseX <= b.x + b.w && input.mouseY >= b.y && input.mouseY <= b.y + b.h;
    ctx.fillStyle = hover ? 'rgba(255, 182, 60, 0.9)' : 'rgba(12, 18, 28, 0.78)';
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 182, 60, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = hover ? '#1a2432' : '#fff';
    ctx.font = '700 17px sans-serif';
    ctx.fillText(MISSIONS[b.index].name, b.x + b.w / 2, b.y + 28);
    ctx.font = '400 13px sans-serif';
    ctx.fillStyle = hover ? '#3a2c14' : '#cfe0f0';
    ctx.fillText(MISSIONS[b.index].objective, b.x + b.w / 2, b.y + 48);
  }
  ctx.font = '400 14px sans-serif';
  ctx.fillStyle = '#cfe0f0';
  ctx.fillText('Click a sortie, or press Enter for Sortie 1.', W / 2, H * 0.62 + 96);
}

function drawPaused() {
  ctx.fillStyle = 'rgba(8, 12, 22, 0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = '700 44px sans-serif';
  ctx.fillText('PAUSED', W / 2, H / 2 - 10);
  ctx.font = '400 17px sans-serif';
  ctx.fillStyle = '#dfe9f5';
  ctx.fillText('Press P to keep flying, or Esc for the title screen.', W / 2, H / 2 + 28);
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000 || 0.016);
  lastFrame = now;
  if (!shotMode) time += dt;

  if (screen === 'title') {
    render(ctx, { plane, mission: MISSIONS[0], rings: null, field: null, trees, clouds, time });
    drawTitleScreen();
  } else if (screen === 'paused') {
    render(ctx, {
      plane,
      mission: missionState.mission,
      rings: missionState.rings,
      field: missionState.field,
      trees,
      clouds,
      time,
    });
    drawHud(ctx, {
      plane,
      mission: missionState.mission,
      score: missionState.score,
      ringsLeft: ringsLeft(missionState),
      message,
      messageTime,
      time,
    });
    drawPaused();
  } else if (screen === 'debrief') {
    render(ctx, {
      plane,
      mission: missionState.mission,
      rings: missionState.rings,
      field: missionState.field,
      trees,
      clouds,
      time,
    });
    drawDebrief(ctx, { w: W, h: H, debrief: missionState.debrief });
  } else {
    // Flying.
    if (!shotMode) {
      pollInput(input);
      const crosswind = missionState.mission.crosswind || 0;
      stepPlane(plane, input, dt, crosswind);
      const msg = stepMission(missionState, plane, audio);
      if (msg) showMessage(msg);
      updateAudio(audio, plane);
      if (missionState.done) screen = 'debrief';
    }
    render(ctx, {
      plane,
      mission: missionState.mission,
      rings: missionState.rings,
      field: missionState.field,
      trees,
      clouds,
      time,
    });
    drawHud(ctx, {
      plane,
      mission: missionState.mission,
      score: missionState.score,
      ringsLeft: ringsLeft(missionState),
      message,
      messageTime,
      time,
    });
  }
  requestAnimationFrame(frame);
}

attachInput(input, canvas, {
  onGear: () => {
    if (screen === 'flying') toggleGear(plane);
  },
  onPause: () => {
    if (screen === 'flying') screen = 'paused';
    else if (screen === 'paused') screen = 'flying';
  },
  onMission: () => {
    if (screen === 'flying' || screen === 'debrief') startMission(nextMissionIndex(missionState));
  },
  onConfirm: () => {
    if (screen === 'title') startMission(0);
    else if (screen === 'debrief') startMission(missionState.index);
  },
  onBack: () => {
    if (screen === 'paused' || screen === 'debrief') {
      missionState = makeMissionState(0);
      plane = makePlane(startPose(0));
      screen = 'title';
    }
  },
  onClick: (x, y) => {
    unlockAudio(audio);
    if (screen === 'title') {
      for (const b of titleButtons) {
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          startMission(b.index);
          return;
        }
      }
    }
  },
});

window.addEventListener('keydown', (event) => {
  if (screen === 'title' && ['1', '2', '3'].includes(event.key)) {
    startMission(Number(event.key) - 1);
  }
});

// Fixed screenshot poses: no physics, no clock, just the frame.
if (shotMode) {
  const pose = shotPose(shot);
  const missionIndex = pose.mission;
  missionState = makeMissionState(missionIndex);
  missionState.mission.sky = pose.sky;
  plane = makePlane({
    x: pose.x,
    y: pose.y,
    z: pose.z,
    heading: pose.heading,
    pitch: pose.pitch,
    roll: pose.roll,
    speed: pose.speed,
    throttle: pose.throttle,
    fuel: pose.fuel,
    damage: pose.damage,
    gearDown: pose.gearDown,
  });
  plane.time = 12;
  // A frozen pose never steps the physics, so set ground contact from the pose
  // altitude itself, or the ROTATE hint would show while the plane is airborne.
  plane.onGround = pose.y - heightAt(pose.x, pose.z) < 3;
  if (missionState.rings) {
    for (let i = 0; i < pose.ringPassed; i += 1) missionState.rings[i].passed = true;
    missionState.score = pose.ringPassed * 100;
  }
  time = 8;
  message = pose.message;
  messageTime = 8;
  screen = 'flying';
  document.title = `Ridgeline Run - ${shot}`;
}

requestAnimationFrame(frame);
