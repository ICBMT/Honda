// Shared driving state for the drive panel, the Type-R scene and the engine sound.
// The pedals and gear selector write to it; the scene and the sound read it. Nothing here touches the DOM.
//
// A five-speed manual: 0 is neutral, 1–5 are gears. The clutch decouples the engine from the wheels, so the
// revs can rise while the car is still (hold C, press the throttle). Each gear has a top speed and the revs
// follow the road speed through it. The rev limiter stops the car from pulling past the top speed of a gear.

export const MAX_KMH = 260
export const REDLINE = 0.94 // normalised engine speed where the rev limiter cuts in

// Top road speed for each gear (index = gear). Index 0 (neutral) is not used for coupling.
export const GEAR_TOP = [0, 60, 100, 150, 200, 260]
// How hard the engine pushes the car in each gear, in km/h per second at full throttle.
const GEAR_PUSH = [0, 55, 40, 28, 20, 15]

export const drive = {
  throttle: 0, // accelerator, 0..1
  brake: 0, // brake, 0..1
  clutch: 0, // clutch, 0..1 (down = engine revs free of the wheels)
  gear: 0, // 0 = neutral, 1..5
  speed: 0, // km/h
  rpm: 0.12, // engine speed, 0..1 (idle is 0.12)
}

// Advances the driving model by dt seconds.
export function stepDrive(dt: number) {
  const coupled = drive.gear > 0 && drive.clutch < 0.5
  const top = GEAR_TOP[drive.gear] || MAX_KMH

  if (coupled) {
    // The engine drives the wheels: throttle pushes, the rev limiter cuts in at the top of the gear.
    const push = drive.rpm >= REDLINE ? 0 : drive.throttle * GEAR_PUSH[drive.gear] * (1 - drive.speed / top * 0.6)
    const engineBrake = drive.throttle < 0.05 ? 6 : 0
    const slow = drive.brake * 120 + 3 + engineBrake
    drive.speed += (push - slow) * dt
    // Above the gear's top speed (after a downshift) the car slows toward it.
    if (drive.speed > top) drive.speed = Math.max(top, drive.speed - 40 * dt)
    drive.speed = Math.min(MAX_KMH, Math.max(0, drive.speed))
    // Revs come straight from the road speed through the gear, with a little from the throttle.
    const fromRoad = 0.12 + (drive.speed / top) * 0.82
    drive.rpm = Math.min(1, fromRoad + drive.throttle * 0.04)
  } else {
    // Clutch down or in neutral: the engine revs freely, the car coasts and brakes on its own.
    const target = 0.12 + drive.throttle * 0.85
    drive.rpm = Math.max(0, drive.rpm + (Math.min(1, target) - drive.rpm) * Math.min(1, dt * 10))
    const slow = drive.brake * 120 + 3
    drive.speed = Math.max(0, drive.speed - slow * dt)
  }
}
