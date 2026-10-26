// Shared driving state for the drive panel and the Civic RS engine sound.
// The pedals write to it; the scene and the sound read it. Nothing here touches the DOM.

export const MAX_KMH = 240

export const drive = {
  throttle: 0, // accelerator, 0..1
  brake: 0, // brake, 0..1
  clutch: 0, // clutch, 0..1 (down = engine revs free of the wheels)
  speed: 0, // km/h
  rpm: 0.12, // engine speed, 0..1 (idle is 0.12)
}

// Advances the simple driving model by dt seconds.
export function stepDrive(dt: number) {
  const engaged = 1 - drive.clutch
  // Accelerator pushes the car on while the clutch is up; the brake slows it; drag always slows it slightly.
  const accel = drive.throttle * engaged * (60 * (1 - drive.speed / MAX_KMH) + 8)
  const decel = drive.brake * 110 + 3
  drive.speed = Math.min(MAX_KMH, Math.max(0, drive.speed + (accel - decel) * dt))
  // Revs follow the throttle, and the road speed when the clutch is up. Idle is the floor.
  const roadRpm = (drive.speed / MAX_KMH) * 0.6
  const target = 0.12 + drive.throttle * 0.55 + (drive.clutch > 0.5 ? 0 : roadRpm)
  drive.rpm = Math.max(0, drive.rpm + (Math.min(1, target) - drive.rpm) * Math.min(1, dt * 8))
}
