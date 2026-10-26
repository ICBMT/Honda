import { useEffect, useRef, useState } from 'react'
import { drive, MAX_KMH, stepDrive } from '../lib/drive'
import { sound } from '../lib/sound'

// Speedometer, five-speed gearbox and three pedals. Hold a pedal (mouse, touch, or Space/Enter with focus) to press it.
// Keyboard, with the panel focused: ArrowUp accelerator, ArrowDown brake, hold C for the clutch,
// then 1–5 to select a gear (N for neutral). Gears only change while the clutch is down, as in a real manual.
// The needle, the rev bar and the readouts are written straight to the DOM each frame, so React does not re-render.

type Pedal = 'throttle' | 'brake' | 'clutch'

const PEDALS: { key: Pedal; label: string; hint: string }[] = [
  { key: 'clutch', label: 'Clutch', hint: 'C' },
  { key: 'brake', label: 'Brake', hint: '↓' },
  { key: 'throttle', label: 'Accelerator', hint: '↑' },
]

const GEARS = [0, 1, 2, 3, 4, 5] // 0 is neutral

// Dial geometry: 270 degrees of sweep, from 7:30 (0 km/h) to 4:30 (MAX_KMH).
const START = -135
const SWEEP = 270
const angleFor = (kmh: number) => START + (kmh / MAX_KMH) * SWEEP
const polar = (deg: number, r: number) => {
  const a = ((deg - 90) * Math.PI) / 180
  return [100 + r * Math.cos(a), 100 + r * Math.sin(a)] as const
}
const arc = (from: number, to: number, r: number) => {
  const [x1, y1] = polar(from, r)
  const [x2, y2] = polar(to, r)
  const large = to - from > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
}

export default function DriveControls() {
  const needle = useRef<SVGGElement>(null)
  const readout = useRef<HTMLSpanElement>(null)
  const gearReadout = useRef<HTMLSpanElement>(null)
  const rev = useRef<HTMLDivElement>(null)
  const [pressed, setPressed] = useState<Record<Pedal, boolean>>({ throttle: false, brake: false, clutch: false })
  const [gear, setGearState] = useState(0)
  const [soundOn, setSoundOn] = useState(sound.enabled)
  const clutchDown = pressed.clutch

  // Run the drive model, the engine sound and the pops. Stops when the panel is off screen.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let visible = true
    // Whether this panel switched the engine sound on. Only then does it switch it off again.
    let owned = false
    let prevThrottle = 0
    let prevGear = drive.gear
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    const el = needle.current?.ownerSVGElement?.parentElement
    if (el) io.observe(el)
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      // The first frame can carry a timestamp from before this effect ran, so never let the step go negative.
      const dt = Math.max(0, Math.min((now - last) / 1000, 0.05))
      last = now
      if (!visible) {
        if (owned) { sound.setActive(false); owned = false }
        return
      }
      stepDrive(dt)
      needle.current?.setAttribute('transform', `rotate(${angleFor(drive.speed)} 100 100)`)
      if (readout.current) readout.current.textContent = String(Math.round(drive.speed)).padStart(3, '0')
      if (gearReadout.current) gearReadout.current.textContent = drive.gear === 0 ? 'N' : String(drive.gear)
      if (rev.current) rev.current.style.transform = `scaleX(${Math.min(1, drive.rpm)})`

      if (sound.enabled) {
        if (!owned) { sound.setActive(true); owned = true }
        // Engine follows the revs and the load; the tyres squeal under braking.
        sound.update(drive.rpm, drive.brake * 0.8, drive.throttle)

        // Pops: the throttle lifted with the revs high (most with the clutch down), crackle while revving
        // with the clutch down, and a clunk when a gear is selected.
        if (prevThrottle > 0.5 && drive.throttle < 0.2 && drive.rpm > 0.3) {
          sound.pop(0.35 + drive.rpm * 0.6, drive.clutch > 0.5 || drive.gear === 0 ? 1300 : 900)
        } else if (drive.clutch > 0.5 && drive.throttle > 0.6 && Math.random() < dt * 5) {
          sound.pop(0.25, 1000)
        }
        if (drive.gear !== prevGear) sound.pop(0.3, 320)
      }
      prevThrottle = drive.throttle
      prevGear = drive.gear
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [])

  // Set one pedal, both for the model and for the pressed visual.
  const set = (key: Pedal, on: boolean) => {
    drive[key] = on ? 1 : 0
    setPressed((p) => (p[key] === on ? p : { ...p, [key]: on }))
  }

  // Gears change only with the clutch down. Neutral is also selected with the clutch down.
  const setGear = (g: number) => {
    if (drive.clutch < 0.5) return
    drive.gear = g
    setGearState(g)
  }

  const onKey = (e: React.KeyboardEvent, on: boolean) => {
    if (on && /^[1-5nN]$/.test(e.key)) {
      e.preventDefault()
      setGear(e.key.toLowerCase() === 'n' ? 0 : Number(e.key))
      return
    }
    const map: Record<string, Pedal | undefined> = { ArrowUp: 'throttle', ArrowDown: 'brake', c: 'clutch', C: 'clutch' }
    const key = map[e.key]
    if (!key) return
    e.preventDefault()
    if (!e.repeat || on) set(key, on)
  }

  const ticks = Array.from({ length: 14 }, (_, i) => i) // every 20 km/h

  return (
    <div
      className="w-full max-w-[340px] rounded-2xl border border-white/15 bg-black/55 p-4 text-white backdrop-blur-md"
      role="group"
      aria-label="Driving controls"
      tabIndex={0}
      onKeyDown={(e) => onKey(e, true)}
      onKeyUp={(e) => onKey(e, false)}
      onBlur={() => { set('throttle', false); set('brake', false); set('clutch', false) }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">Drive</p>
        <button
          type="button"
          onClick={() => setSoundOn(sound.toggle())}
          aria-pressed={soundOn}
          className="min-h-11 min-w-11 rounded-full border border-white/25 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 transition hover:border-white/60"
        >
          {soundOn ? 'Sound on' : 'Sound off'}
        </button>
      </div>

      <div className="flex items-center gap-4">
        <svg viewBox="0 0 200 200" className="h-[120px] w-[120px] shrink-0" aria-hidden="true">
          <circle cx="100" cy="100" r="96" fill="#07090e" stroke="rgba(255,255,255,0.12)" />
          <path d={arc(START, START + SWEEP, 84)} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="3" />
          <path d={arc(angleFor(220), angleFor(MAX_KMH), 84)} fill="none" stroke="#dc2626" strokeWidth="5" />
          {ticks.map((i) => {
            const deg = angleFor(i * 20)
            const major = i % 2 === 0
            const [x1, y1] = polar(deg, 72)
            const [x2, y2] = polar(deg, major ? 80 : 77)
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.7)" strokeWidth={major ? 2 : 1} />
          })}
          {[0, 60, 120, 180, 240].map((v) => {
            const [x, y] = polar(angleFor(v), 56)
            return <text key={v} x={x} y={y} fill="rgba(255,255,255,0.8)" fontSize="10" textAnchor="middle" dominantBaseline="middle">{v}</text>
          })}
          <g ref={needle} transform={`rotate(${angleFor(0)} 100 100)`}>
            <line x1="100" y1="112" x2="100" y2="30" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
          </g>
          <circle cx="100" cy="100" r="6" fill="#f5f7fa" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">Speed</p>
          <p className="font-mono text-[34px] font-bold leading-none tabular-nums">
            <span ref={readout}>000</span>
            <span className="ml-1 text-[12px] font-normal text-white/70">km/h</span>
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-white/70">
            Gear <span ref={gearReadout} className="ml-1 font-mono text-[13px] text-white">{gear === 0 ? 'N' : gear}</span>
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-white/70">Engine</p>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/15">
            <div ref={rev} className="h-full origin-left rounded-full bg-gradient-to-r from-white via-amber-300 to-[#dc2626]" style={{ transform: 'scaleX(0.12)' }} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-6 gap-1" role="group" aria-label="Gears">
        {GEARS.map((g) => (
          <button
            key={g}
            type="button"
            disabled={!clutchDown}
            aria-pressed={gear === g}
            aria-label={g === 0 ? 'Neutral' : `Gear ${g}`}
            onClick={() => setGear(g)}
            className={`min-h-11 rounded-md border text-[12px] font-semibold transition disabled:opacity-35 ${
              gear === g ? 'border-white bg-white text-black' : 'border-white/25 text-white/90 hover:border-white/60'
            }`}
          >
            {g === 0 ? 'N' : g}
          </button>
        ))}
      </div>
      <p className="mt-1 text-[10px] tracking-[0.12em] text-white/55">
        {clutchDown ? 'Clutch down: press 1–5 to change gear' : 'Hold C (or the clutch) to change gear'}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Pedals">
        {PEDALS.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-label={`${p.label} pedal, hold to press`}
            aria-pressed={pressed[p.key]}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); set(p.key, true) }}
            onPointerUp={() => set(p.key, false)}
            onPointerCancel={() => set(p.key, false)}
            onLostPointerCapture={() => set(p.key, false)}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); set(p.key, true) } }}
            onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') set(p.key, false) }}
            className="group flex min-h-16 select-none flex-col items-center justify-end gap-1 pb-2 pt-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span
              className={`block h-12 w-full rounded-t-lg rounded-b-md border border-white/25 transition-transform duration-75 ${
                pressed[p.key]
                  ? 'translate-y-1.5 bg-gradient-to-b from-zinc-600 to-zinc-800 shadow-none'
                  : 'bg-gradient-to-b from-zinc-300 to-zinc-500 shadow-[0_4px_0_#3f3f46]'
              } ${p.key === 'throttle' && pressed.throttle ? 'shadow-[0_0_18px_rgba(220,38,38,0.6)]' : ''}`}
            />
            <span className="text-[10px] uppercase tracking-[0.16em] text-white/80">
              {p.label} <span className="text-white/50">{p.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
