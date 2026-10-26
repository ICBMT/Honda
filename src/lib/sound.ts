// Procedural car sound for the sections that show a car, built with the Web Audio API so there are no audio files.
// Audio only starts after the visitor presses a sound button, because browsers block sound without a user gesture.
//
// The engine is modelled as a four-cylinder, four-stroke petrol engine (the 1.5 VTEC TURBO in the Civic RS):
// - Firing frequency = rpm / 30 Hz (two firings per revolution), so the note climbs with the revs.
// - A harmonic series weighted for a four-cylinder (strong 2nd and 4th harmonics), with a slightly detuned
//   second oscillator so the note beats and breathes the way a real engine does.
// - Intake and exhaust are noise layers shaped by the revs. The turbo whistle rises with load.
// - A compressor keeps the bass controlled, so it doesn't turn into a low drone.

type Ctx = AudioContext

const IDLE_RPM = 800
const REDLINE_RPM = 7000

let ctx: Ctx | null = null
let master: GainNode | null = null
let limiter: DynamicsCompressorNode | null = null

let engineOsc: OscillatorNode | null = null
let engineOsc2: OscillatorNode | null = null
let engineFilter: BiquadFilterNode | null = null
let engineGain: GainNode | null = null
let bodyFilter: BiquadFilterNode | null = null
let bodyGain: GainNode | null = null

let intakeFilter: BiquadFilterNode | null = null
let intakeGain: GainNode | null = null
let turboFilter: BiquadFilterNode | null = null
let turboGain: GainNode | null = null
let exhaustFilter: BiquadFilterNode | null = null
let exhaustGain: GainNode | null = null

let skidFilter: BiquadFilterNode | null = null
let skidGain: GainNode | null = null

let enabled = false
let noiseBuf: AudioBuffer | null = null
let active = false

// Harmonic amplitudes for a four-cylinder: fundamental, 2nd (strong), 3rd, 4th (strong), then decaying.
const HARMONICS = [1.0, 0.7, 0.35, 0.55, 0.2, 0.22, 0.09, 0.07]

function engineWave(c: Ctx): PeriodicWave {
  const real = new Float32Array(HARMONICS.length + 1)
  const imag = new Float32Array(HARMONICS.length + 1)
  HARMONICS.forEach((a, i) => { imag[i + 1] = a })
  return c.createPeriodicWave(real, imag)
}

function noiseBuffer(c: Ctx): AudioBuffer {
  const len = c.sampleRate * 2
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return buf
}

function loopNoise(c: Ctx, buf: AudioBuffer): AudioBufferSourceNode {
  const src = c.createBufferSource()
  src.buffer = buf
  src.loop = true
  src.start()
  return src
}

function build(): boolean {
  if (ctx) return true
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AC) return false
  const c = new AC()
  ctx = c

  master = c.createGain()
  master.gain.value = 0
  limiter = c.createDynamicsCompressor()
  limiter.threshold.value = -20
  limiter.knee.value = 12
  limiter.ratio.value = 4
  limiter.attack.value = 0.005
  limiter.release.value = 0.2
  limiter.connect(master)
  master.connect(c.destination)

  // Engine tone: two detuned oscillators with the four-cylinder harmonic series.
  const wave = engineWave(c)
  engineFilter = c.createBiquadFilter()
  engineFilter.type = 'lowpass'
  engineFilter.Q.value = 0.7
  engineGain = c.createGain()
  engineGain.gain.value = 0
  engineOsc = c.createOscillator()
  engineOsc.setPeriodicWave(wave)
  engineOsc2 = c.createOscillator()
  engineOsc2.setPeriodicWave(wave)
  engineOsc.connect(engineFilter)
  engineOsc2.connect(engineFilter)
  engineFilter.connect(engineGain).connect(limiter)
  engineOsc.start()
  engineOsc2.start()

  // Body: a mid-range resonance, the part of the note that makes it sound like metal and combustion.
  bodyFilter = c.createBiquadFilter()
  bodyFilter.type = 'bandpass'
  bodyFilter.Q.value = 1.2
  bodyGain = c.createGain()
  bodyGain.gain.value = 0
  engineOsc.connect(bodyFilter)
  bodyFilter.connect(bodyGain).connect(limiter)

  const buf = noiseBuffer(c)
  noiseBuf = buf

  // Intake: air through the throttle body, brighter with the revs and load.
  intakeFilter = c.createBiquadFilter()
  intakeFilter.type = 'bandpass'
  intakeFilter.Q.value = 0.8
  intakeGain = c.createGain()
  intakeGain.gain.value = 0
  loopNoise(c, buf).connect(intakeFilter)
  intakeFilter.connect(intakeGain).connect(limiter)

  // Turbo: the high whine that rises under load.
  turboFilter = c.createBiquadFilter()
  turboFilter.type = 'highpass'
  turboFilter.frequency.value = 2500
  turboGain = c.createGain()
  turboGain.gain.value = 0
  loopNoise(c, buf).connect(turboFilter)
  turboFilter.connect(turboGain).connect(limiter)

  // Exhaust: low rumble from the pipe.
  exhaustFilter = c.createBiquadFilter()
  exhaustFilter.type = 'lowpass'
  exhaustFilter.frequency.value = 320
  exhaustGain = c.createGain()
  exhaustGain.gain.value = 0
  loopNoise(c, buf).connect(exhaustFilter)
  exhaustFilter.connect(exhaustGain).connect(limiter)

  // Tyres: band-passed noise, loud only while sliding or braking hard.
  skidFilter = c.createBiquadFilter()
  skidFilter.type = 'bandpass'
  skidFilter.frequency.value = 1900
  skidFilter.Q.value = 6
  skidGain = c.createGain()
  skidGain.gain.value = 0
  loopNoise(c, buf).connect(skidFilter)
  skidFilter.connect(skidGain).connect(limiter)

  return true
}

function applyMaster() {
  if (!ctx || !master) return
  master.gain.setTargetAtTime(enabled && active ? 0.6 : 0, ctx.currentTime, 0.15)
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export const sound = {
  get enabled() {
    return enabled
  },

  // Called from a sound button. Returns the new state.
  toggle(): boolean {
    if (!build() || !ctx) return false
    enabled = !enabled
    if (enabled && ctx.state === 'suspended') void ctx.resume()
    applyMaster()
    return enabled
  },

  // A short burst of exhaust: a pop when the throttle is lifted with the revs high, or a clunk when a gear is selected.
  // intensity 0..1 sets how loud it is; freq sets its colour (higher is a crisper crack).
  pop(intensity: number, freq = 1100) {
    if (!ctx || !enabled || !noiseBuf || !limiter) return
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = noiseBuf
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = freq
    filter.Q.value = 1.4
    const gain = ctx.createGain()
    const peak = clamp01(intensity) * 0.5
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.003)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
    src.connect(filter).connect(gain).connect(limiter)
    src.start(t, Math.random())
    src.stop(t + 0.1)
  },

  // Pauses the sound while the section is off screen.
  setActive(on: boolean) {
    if (active === on) return
    active = on
    applyMaster()
  },

  // rpm 0..1 sets the engine speed (idle to redline). load 0..1 is how hard the engine is working (throttle).
  // skid 0..1 sets the tyre squeal. load defaults to the revs.
  update(rpm: number, skid: number, load: number = rpm) {
    if (!ctx || !engineOsc || !engineOsc2 || !engineFilter || !engineGain || !bodyFilter || !bodyGain ||
      !intakeFilter || !intakeGain || !turboFilter || !turboGain || !exhaustFilter || !exhaustGain ||
      !skidGain || !skidFilter) return
    const t = ctx.currentTime
    const r = clamp01(rpm)
    const l = clamp01(load)
    const rpmReal = IDLE_RPM + r * (REDLINE_RPM - IDLE_RPM)
    const firing = rpmReal / 30 // Hz: two firings per revolution on a four-cylinder

    engineOsc.frequency.setTargetAtTime(firing, t, 0.05)
    engineOsc2.frequency.setTargetAtTime(firing * 1.011, t, 0.05) // slight detune for beating
    engineFilter.frequency.setTargetAtTime(900 + l * 2600 + r * 1200, t, 0.08)
    engineGain.gain.setTargetAtTime(0.05 + l * 0.16 + r * 0.05, t, 0.08)
    bodyFilter.frequency.setTargetAtTime(280 + r * 520, t, 0.08)
    bodyGain.gain.setTargetAtTime(0.04 + l * 0.12, t, 0.08)

    intakeFilter.frequency.setTargetAtTime(450 + r * 2200, t, 0.08)
    intakeGain.gain.setTargetAtTime(0.01 + l * 0.05 + r * 0.01, t, 0.08)

    turboFilter.frequency.setTargetAtTime(2200 + r * 2600, t, 0.1)
    turboGain.gain.setTargetAtTime(Math.pow(l, 2) * 0.035, t, 0.1)

    exhaustGain.gain.setTargetAtTime(0.03 + l * 0.1, t, 0.08)
    exhaustFilter.frequency.setTargetAtTime(260 + l * 160, t, 0.1)

    skidGain.gain.setTargetAtTime(clamp01(skid) * 0.2, t, 0.06)
    skidFilter.frequency.setTargetAtTime(1500 + clamp01(skid) * 900, t, 0.1)
  },
}
