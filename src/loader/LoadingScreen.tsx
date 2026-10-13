import { useEffect, useRef, useState } from 'react'
import { loadState } from '../lib/preload'

const PHRASES: [number, string][] = [
  [0, 'WARMING UP THE TURBO'],
  [0.35, 'CALIBRATING THE SENSORS'],
  [0.7, 'TUNING THE TYRES'],
  [0.95, 'READY TO DRIVE'],
]
const MIN_SHOW_MS = 2400
const FADE_MS = 900

type Props = { ready: boolean; onDone: () => void }

// Top-down roundabout. The car drifts round it while the site loads; it speeds up as progress climbs.
export default function LoadingScreen({ ready, onDone }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const pct = useRef<HTMLSpanElement>(null)
  const phrase = useRef<HTMLParagraphElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const [leaving, setLeaving] = useState(false)
  const readyRef = useRef(ready)
  const doneRef = useRef(onDone)
  readyRef.current = ready
  doneRef.current = onDone

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const cv = canvas.current!
    const ctx = cv.getContext('2d')!
    let w = 0
    let h = 0
    let dpr = 1
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      cv.style.width = `${w}px`
      cv.style.height = `${h}px`
    }
    resize()
    window.addEventListener('resize', resize)

    const start = performance.now()
    let last = start
    let shown = 0
    let theta = 0
    let t = 0
    let finishedAt = 0
    let finished = false
    let raf = 0
    type Puff = { x: number; y: number; age: number; r: number }
    const puffs: Puff[] = []

    const roundRect = (x: number, y: number, rw: number, rh: number, r: number) => {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.arcTo(x + rw, y, x + rw, y + rh, r)
      ctx.arcTo(x + rw, y + rh, x, y + rh, r)
      ctx.arcTo(x, y + rh, x, y, r)
      ctx.arcTo(x, y, x + rw, y, r)
      ctx.closePath()
    }

    // Top-down Civic: faces +X, length L.
    const drawCar = (x: number, y: number, heading: number, L: number) => {
      const Wd = L * 0.44
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(heading)
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      roundRect(-L / 2 + 3, -Wd / 2 + 4, L, Wd, Wd * 0.4)
      ctx.fill()
      ctx.fillStyle = '#0b0c0f'
      for (const fx of [-0.3, 0.3]) for (const side of [-1, 1]) {
        roundRect(L * fx - L * 0.09, side * (Wd / 2) - L * 0.05, L * 0.18, L * 0.1, L * 0.02)
        ctx.fill()
      }
      ctx.fillStyle = '#f2f2ef'
      roundRect(-L / 2, -Wd / 2, L, Wd, Wd * 0.4)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,43,69,0.85)'
      ctx.fillRect(-L * 0.46, -Wd * 0.05, L * 0.92, Wd * 0.1)
      ctx.fillStyle = '#1b2430'
      ctx.beginPath()
      ctx.moveTo(L * 0.12, -Wd * 0.38); ctx.lineTo(L * 0.28, -Wd * 0.3); ctx.lineTo(L * 0.28, Wd * 0.3); ctx.lineTo(L * 0.12, Wd * 0.38); ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(-L * 0.12, -Wd * 0.38); ctx.lineTo(-L * 0.28, -Wd * 0.3); ctx.lineTo(-L * 0.28, Wd * 0.3); ctx.lineTo(-L * 0.12, Wd * 0.38); ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#eaf6ff'
      ctx.fillRect(L / 2 - 3, -Wd * 0.36, 3, Wd * 0.2)
      ctx.fillRect(L / 2 - 3, Wd * 0.16, 3, Wd * 0.2)
      ctx.shadowColor = '#ff1030'
      ctx.shadowBlur = 10
      ctx.fillStyle = '#ff2b45'
      ctx.fillRect(-L / 2, -Wd * 0.36, 3, Wd * 0.2)
      ctx.fillRect(-L / 2, Wd * 0.16, 3, Wd * 0.2)
      ctx.shadowBlur = 0
      ctx.restore()
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const nowMs = Math.max(now, last)
      const dt = Math.min((nowMs - last) / 1000, 0.1)
      last = nowMs
      t += dt
      shown += (loadState.progress - shown) * Math.min(1, dt * 4)

      if (readyRef.current && !finished && nowMs - start > MIN_SHOW_MS) {
        finished = true
        finishedAt = nowMs
        setLeaving(true)
      }
      if (finished && nowMs - finishedAt > FADE_MS) {
        cancelAnimationFrame(raf)
        window.removeEventListener('resize', resize)
        doneRef.current()
        return
      }

      const cx = w / 2
      const cy = h / 2
      const R = Math.min(w, h) * 0.3
      const RW = R * 0.5
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = '#05070d'
      ctx.fillRect(0, 0, w, h)
      const glow = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R * 2.2)
      glow.addColorStop(0, 'rgba(255,30,50,0.10)')
      glow.addColorStop(1, 'rgba(255,30,50,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, w, h)

      // Junction arms.
      ctx.fillStyle = '#0d0f14'
      for (let k = 0; k < 4; k++) {
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate((k * Math.PI) / 2 + Math.PI / 4)
        ctx.fillRect(R - RW / 2, -RW / 2 * 0.6, R * 1.6, RW * 0.6)
        ctx.restore()
      }

      // Ring road.
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.lineWidth = RW
      ctx.strokeStyle = '#14161c'
      ctx.stroke()

      // Neon red edges and a dashed centre line that rotates.
      ctx.shadowColor = '#ff1030'
      ctx.shadowBlur = 16
      ctx.strokeStyle = '#ff2b45'
      ctx.lineWidth = 3
      for (const r of [R - RW / 2, R + RW / 2]) {
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.setLineDash([R * 0.09, R * 0.08])
      ctx.lineDashOffset = -t * 40
      ctx.strokeStyle = 'rgba(245,245,240,0.85)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.shadowBlur = 0

      // The car: heading follows the ring, with a drift angle that swings in and out.
      theta += dt * (0.5 + shown * 1.1)
      const px = cx + R * Math.cos(theta)
      const py = cy + R * Math.sin(theta)
      const slip = 0.3 * (0.65 + 0.35 * Math.sin(t * 1.9))
      const heading = theta + Math.PI / 2 + slip
      const L = Math.max(34, Math.min(w, h) * 0.075)

      // Tyre smoke from the rear axle.
      const rx = px - Math.cos(heading) * L * 0.36
      const ry = py - Math.sin(heading) * L * 0.36
      for (const side of [-1, 1]) {
        if (Math.random() < 0.6) {
          puffs.push({
            x: rx - Math.sin(heading) * side * L * 0.25,
            y: ry + Math.cos(heading) * side * L * 0.25,
            age: 0,
            r: L * 0.18,
          })
        }
      }
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i]
        p.age += dt
        if (p.age > 1.6) { puffs.splice(i, 1); continue }
        const a = 0.32 * (1 - p.age / 1.6)
        const rr = p.r + p.age * L * 0.9
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr)
        g.addColorStop(0, `rgba(210,235,255,${a})`)
        g.addColorStop(1, 'rgba(210,235,255,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p.x, p.y, rr, 0, Math.PI * 2)
        ctx.fill()
      }

      drawCar(px, py, heading, L)

      // Progress text, bar and phrase.
      const pctNum = Math.floor(shown * 100)
      if (pct.current) pct.current.textContent = `${pctNum}%`
      if (bar.current) bar.current.style.transform = `scaleX(${shown})`
      if (phrase.current) {
        let text = PHRASES[0][1]
        for (const [at, label] of PHRASES) if (shown >= at) text = label
        if (phrase.current.textContent !== text) phrase.current.textContent = text
      }
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className={`fixed inset-0 z-[100] bg-[#05070d] transition-opacity ${leaving ? 'opacity-0' : 'opacity-100'}`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <canvas ref={canvas} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span ref={pct} className="font-black tabular-nums text-white" style={{ fontSize: 'clamp(28px, 6vmin, 60px)' }}>0%</span>
        <p className="mt-1 text-[9px] font-semibold tracking-[0.35em] text-[#ff3340]">CIVIC TYPE-R</p>
      </div>
      <div className="pointer-events-none absolute bottom-[12vh] left-1/2 w-[min(320px,70vw)] -translate-x-1/2 text-center">
        <p ref={phrase} className="mb-3 text-[11px] font-light tracking-[0.3em] text-white/70">WARMING UP THE TURBO</p>
        <div className="h-[2px] w-full bg-white/15">
          <div ref={bar} className="h-full origin-left bg-[#ff3340]" style={{ transform: 'scaleX(0)' }} />
        </div>
      </div>
    </div>
  )
}
