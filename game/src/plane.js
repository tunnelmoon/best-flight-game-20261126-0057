// Ridgeline Run: the bush plane itself.
// One clear job: fly. Throttle, pitch, roll, lift, stall, fuel, damage, landing.

import { FLIGHT } from './config.js';
import { heightAt, isRunway, isWater } from './world.js';
import { clamp } from './random.js';

export function makePlane(pose) {
  return {
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
    verticalSpeed: 0,
    stalled: false,
    crashed: false,
    landed: false,
    onGround: true,
    time: 0,
  };
}

// One simulation step. input: { pitch, roll, throttleDelta, gear } each -1..1 or boolean.
export function stepPlane(plane, input, dt, crosswind) {
  if (plane.crashed || plane.landed) return plane;
  plane.time += dt;

  // Throttle.
  plane.throttle = clamp(plane.throttle + input.throttleDelta * FLIGHT.throttleStep * dt, 0, 1);
  if (plane.fuel <= 0) plane.throttle = 0;

  // Attitude follows the stick, eased toward it.
  const targetRoll = input.roll * 0.9;
  const targetPitch = input.pitch * 0.35;
  plane.roll += (targetRoll - plane.roll) * Math.min(1, FLIGHT.rollRate * dt * 2.4);
  plane.pitch += (targetPitch - plane.pitch) * Math.min(1, FLIGHT.pitchRate * dt * 2.4);

  // Speed: thrust minus drag, plus a little help downhill in a dive.
  const thrust = plane.throttle * 34;
  const drag = 0.0062 * plane.speed * plane.speed + 4;
  plane.speed += (thrust - drag) * dt;
  plane.speed = clamp(plane.speed, 0, FLIGHT.maxSpeed);

  // Stall: below the line the nose drops and the wings stop answering.
  // A parked plane (speed near zero, on the ground) never stalls.
  plane.stalled = plane.speed < FLIGHT.stallSpeed && !plane.onGround && plane.speed > 5;
  if (plane.stalled) {
    plane.pitch -= 0.35 * dt;
    plane.speed = Math.max(plane.speed, 12);
  }

  // Turn rate follows the bank.
  plane.heading += -Math.sin(plane.roll) * FLIGHT.turnRate * (plane.speed / FLIGHT.cruiseSpeed) * dt;

  // Vertical speed from pitch, capped by climb and sink limits.
  const climb = Math.sin(plane.pitch) * plane.speed;
  plane.verticalSpeed = clamp(climb, -FLIGHT.sinkRate * 2.2, FLIGHT.climbRate * 1.6);
  if (plane.onGround && plane.speed < FLIGHT.minSpeed) plane.verticalSpeed = 0;

  // Move.
  const forwardX = Math.sin(plane.heading);
  const forwardZ = Math.cos(plane.heading);
  plane.x += forwardX * plane.speed * dt;
  plane.z += forwardZ * plane.speed * dt;
  plane.y += plane.verticalSpeed * dt;
  if (crosswind) plane.x += crosswind * dt * 0.3;

  // Lift-off and touch-down.
  const ground = heightAt(plane.x, plane.z);
  if (plane.y <= ground + 2.1) {
    if (!plane.onGround) {
      // Touching down: judge the landing.
      const sink = -plane.verticalSpeed;
      const onStrip = isRunway(plane.x, plane.z);
      if (onStrip && plane.speed < FLIGHT.gearSpeed && sink < FLIGHT.safeLandingSink && plane.gearDown) {
        plane.landed = true;
        plane.landingSink = sink;
      } else if (onStrip && sink < 9 && plane.gearDown) {
        plane.damage += 35;
        plane.landed = true;
        plane.landingSink = sink;
        plane.hardLanding = true;
      } else {
        plane.crashed = true;
        plane.crashReason = isWater(plane.x, plane.z) ? 'ditched in the river' : 'hit the ground';
      }
    }
    plane.y = ground + 2.1;
    plane.onGround = true;
    plane.verticalSpeed = 0;
    if (!plane.landed && !plane.crashed) {
      // Rolling on the ground: friction.
      plane.speed = Math.max(0, plane.speed - 14 * dt);
      if (plane.speed < 1 && plane.throttle < 0.1) plane.speed = 0;
    }
  } else {
    plane.onGround = false;
  }

  // Fuel burns with the throttle.
  plane.fuel = Math.max(0, plane.fuel - plane.throttle * FLIGHT.fuelBurn * dt);
  if (plane.fuel <= 0 && plane.speed < 5 && plane.onGround) plane.outOfFuel = true;

  return plane;
}

export function toggleGear(plane) {
  if (!plane.onGround) plane.gearDown = !plane.gearDown;
  return plane.gearDown;
}
