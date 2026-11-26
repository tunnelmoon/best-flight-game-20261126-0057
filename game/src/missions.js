// Ridgeline Run: the sorties.
// One clear job: what counts as done. Rings, parcel, landing, score, win and lose.

import { MISSIONS, SCORE } from './config.js';
import { ringPositions, parcelField, startPose } from './world.js';
import { chimeRing, chimeParcel, thud, fanfare } from './audio.js';

export function makeMissionState(missionIndex) {
  const mission = MISSIONS[missionIndex];
  return {
    index: missionIndex,
    mission,
    rings: mission.rings ? ringPositions() : null,
    field: mission.parcel ? parcelField() : null,
    parcelDropped: false,
    parcelScored: false,
    score: 0,
    startTime: 0,
    elapsed: 0,
    done: false,
    win: false,
    debrief: null,
  };
}

function distance3(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function ringsLeft(state) {
  if (!state.rings) return null;
  return state.rings.filter((r) => !r.passed).length;
}

// Called every frame while flying. Returns a message to show, or null.
export function stepMission(state, plane, audio) {
  if (state.done) return null;
  state.elapsed = plane.time - state.startTime;

  // Rings.
  if (state.rings) {
    for (const ring of state.rings) {
      if (ring.passed) continue;
      if (distance3(plane, ring) < ring.r + 4) {
        ring.passed = true;
        state.score += SCORE.ring;
        chimeRing(audio);
        const left = ringsLeft(state);
        if (left === 0) {
          state.score += Math.max(0, Math.round((state.mission.timeLimit - state.elapsed) * SCORE.timeBonusPerSecond));
          finishMission(state, true, 'All rings threaded. Valley cleared.');
          fanfare(audio);
          return 'ALL RINGS!';
        }
        return `RING! ${left} left`;
      }
    }
  }

  // Parcel drop: press Space... no, the parcel drops itself over the field.
  if (state.field && !state.parcelDropped) {
    const f = state.field;
    const dx = plane.x - f.x;
    const dz = plane.z - f.z;
    if (Math.sqrt(dx * dx + dz * dz) < f.r + 6 && plane.y < 60) {
      state.parcelDropped = true;
      state.parcelScored = true;
      state.score += SCORE.parcel;
      chimeParcel(audio);
      return 'PARCEL AWAY! Now land on the strip.';
    }
  }

  // Out of time.
  if (state.elapsed > state.mission.timeLimit) {
    finishMission(state, false, 'Out of time. The valley keeps its secrets.');
    return 'TIME UP';
  }

  // Out of fuel while airborne.
  if (plane.fuel <= 0 && !plane.onGround && !plane.crashed) {
    finishMission(state, false, 'Fuel empty. She glides, but not far enough.');
    return 'FUEL EMPTY';
  }

  // Crash.
  if (plane.crashed) {
    thud(audio);
    finishMission(state, false, `Crashed: ${plane.crashReason}. The Kestrel is built tough, but not that tough.`);
    return 'CRASHED';
  }

  // Landing.
  if (plane.landed) {
    const soft = !plane.hardLanding;
    state.score += soft ? SCORE.landingSoft : SCORE.landingHard;
    thud(audio);
    const win = state.mission.id !== 'delivery' || state.parcelDropped;
    const detail = soft
      ? `Down soft on the strip${state.mission.id === 'delivery' && !state.parcelDropped ? ', but the parcel never left the plane' : ''}.`
      : 'Down, but hard. The landing gear will remember that one.';
    finishMission(state, win, detail);
    if (win) fanfare(audio);
    return soft ? 'LANDED!' : 'LANDED HARD';
  }

  return null;
}

function finishMission(state, win, detail) {
  state.done = true;
  state.win = win;
  state.debrief = {
    title: win ? 'SORTIE COMPLETE' : 'SORTIE FAILED',
    detail,
    score: state.score,
    win,
  };
}

export function nextMissionIndex(state) {
  return (state.index + 1) % MISSIONS.length;
}

export { startPose };
