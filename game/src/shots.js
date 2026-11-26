// Ridgeline Run: fixed poses for the screenshots.
// One clear job: put the plane somewhere photogenic, deterministically.
// ?shot=start  plane on the strip at dawn, title up.
// ?shot=play   mid-flight over the river, ring ahead, day.
// ?shot=ring   threading a ring low over the valley.
// ?shot=landing  dusk final approach, gear down, runway lights on.

import { heightAt, riverX } from './world.js';

export function shotPose(shot) {
  if (shot === 'play') {
    return {
      x: riverX(430) + 6,
      y: heightAt(riverX(430) + 6, 430) + 34,
      z: 430,
      heading: 0.06,
      pitch: 0.02,
      roll: -0.22,
      speed: 62,
      throttle: 0.72,
      fuel: 68,
      damage: 0,
      gearDown: false,
      sky: 'day',
      mission: 0,
      ringPassed: 2,
      message: 'RING! 6 left',
    };
  }
  if (shot === 'ring') {
    return {
      x: riverX(620) - 4,
      y: heightAt(riverX(620) - 4, 620) + 30,
      z: 600,
      heading: -0.04,
      pitch: 0.0,
      roll: 0.3,
      speed: 70,
      throttle: 0.85,
      fuel: 54,
      damage: 0,
      gearDown: false,
      sky: 'day',
      mission: 0,
      ringPassed: 5,
      message: 'RING! 3 left',
    };
  }
  if (shot === 'landing') {
    return {
      x: 2,
      y: heightAt(2, -110) + 34,
      z: -110,
      heading: 0.02,
      pitch: -0.05,
      roll: 0.05,
      speed: 42,
      throttle: 0.3,
      fuel: 31,
      damage: 0,
      gearDown: true,
      sky: 'dusk',
      mission: 2,
      ringPassed: 0,
      message: 'FINAL APPROACH',
    };
  }
  // Default: start.
  return {
    x: 0,
    y: heightAt(0, 10) + 2.0,
    z: 10,
    heading: 0,
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0.25,
    fuel: 100,
    damage: 0,
    gearDown: true,
    sky: 'dawn',
    mission: 1,
    ringPassed: 0,
    message: null,
  };
}
