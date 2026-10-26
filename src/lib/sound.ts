// Procedural car sound for the sections that show a car. Everything is synthesised with the Web Audio API,
// so there are no audio files to download. Audio only starts after the visitor presses the sound button,
// because browsers block sound that starts without a user gesture.

type Ctx = AudioContext

let ctx: Ctx | null = null
let master: GainNode | null = null
let engineOsc: OscillatorNode | null = null
let engineOsc2: OscillatorNode | null = null
let engineGain: GainNode | null = null
let engineFilter: BiquadFilterNode | null = null
let skidGain: GainNode | null = null
let skidFilter: BiquadFilterNode | null = null
let noise: AudioBufferSourceNode | null = null

let enabled = false
let active = false

function build(): boolean {
  if (ctx) return true
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AC) return false
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  // Engine: two detuned sawtooths through a low-pass filter, pitch follows throttle.
  engineFilter = ctx.createBiquadFilter()
  engineFilter.type = 'lowpass'
  engineFilter.frequency.value = 600
  engineGain = ctx.createGain()
  engineGain.gain.value = 0
  engineOsc = ctx.createOscillator()
  engineOsc.type = 'sawtooth'
  engineOsc.frequency.value = 55
  engineOsc2 = ctx.createOscillator()
  engineOsc2.type = 'sawtooth'
  engineOsc2.frequency.value = 55.6
  engineOsc.connect(engineFilter)
  engineOsc2.connect(engineFilter)
  engineFilter.connect(engineGain).connect(master)
  engineOsc.start()
  engineOsc2.start()

  // Tyre squeal: band-passed noise, loud only while sliding.
  const len = ctx.sampleRate * 2
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  noise = ctx.createBufferSource()
  noise.buffer = buf
  noise.loop = true
  skidFilter = ctx.createBiquadFilter()
  skidFilter.type = 'bandpass'
  skidFilter.frequency.value = 1900
  skidFilter.Q.value = 6
  skidGain = ctx.createGain()
  skidGain.gain.value = 0
  noise.connect(skidFilter).connect(skidGain).connect(master)
  noise.start()
  return true
}

function applyMaster() {
  if (!ctx || !master) return
  master.gain.setTargetAtTime(enabled && active ? 0.55 : 0, ctx.currentTime, 0.15)
}

export const sound = {
  get enabled() {
    return enabled
  },

  // Called from the sound button. Returns the new state.
  toggle(): boolean {
    if (!build() || !ctx) return false
    enabled = !enabled
    if (enabled && ctx.state === 'suspended') void ctx.resume()
    applyMaster()
    return enabled
  },

  // Pauses the sound while the section is off screen.
  setActive(on: boolean) {
    if (active === on) return
    active = on
    applyMaster()
  },

  // rpm 0..1 sets engine pitch and loudness. skid 0..1 sets the tyre squeal.
  update(rpm: number, skid: number) {
    if (!ctx || !engineOsc || !engineOsc2 || !engineGain || !engineFilter || !skidGain || !skidFilter) return
    const t = ctx.currentTime
    const f = 42 + rpm * 120
    engineOsc.frequency.setTargetAtTime(f, t, 0.08)
    engineOsc2.frequency.setTargetAtTime(f * 1.007, t, 0.08)
    engineFilter.frequency.setTargetAtTime(380 + rpm * 1400, t, 0.1)
    engineGain.gain.setTargetAtTime(0.12 + rpm * 0.22, t, 0.1)
    skidGain.gain.setTargetAtTime(skid * 0.22, t, 0.06)
    skidFilter.frequency.setTargetAtTime(1500 + skid * 900, t, 0.1)
  },
}
