import { useEffect, useRef } from 'react'
import { Emblem } from './KeyScene'
import redSeat from './assets/hand-card-red-seat.jpg'
import doorHandle from './assets/door-handle-fob.jpg'

const BULLETS = [
  'With the key in your pocket, the doors will unlock as you approach',
  'Start the vehicle engine with a simple push of a button even before entering the car',
  'Car doors lock automatically when the remote key is away from the vehicle',
]

// Key variants, measured from the print (percent of the 1568 x 1176 print, left/top/width/height).
// The largest carries the chrome key blade on top; the shelf sits under them.
const VARIANTS = [
  { left: 14.2, width: 1.5, height: 23.6, logo: 0 },
  { left: 16.3, width: 4.7, height: 23.4, logo: 1.3 },
  { left: 21.6, width: 6.2, height: 23.8, logo: 1.6 },
  { left: 29.7, width: 11.9, height: 23.9, logo: 2.7 },
]

// Part two (section4-2), on the same fixed 4:3 stage as part one. Positions are measured from the print.
export default function EntryScene() {
  const bullets = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = bullets.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.classList.add('sk-in')
        io.disconnect()
      }
    }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div className="flex h-full w-screen items-center justify-center overflow-hidden bg-[#0d0f12]">
      <div
        className="relative overflow-hidden"
        style={{
          width: 'min(100vw, 133.333vh)',
          height: 'min(100vh, 75vw)',
          containerType: 'size',
          background: 'radial-gradient(ellipse 80% 70% at 35% 30%, #2a2d33 0%, #1e2025 55%, #15171b 100%)',
        } as React.CSSProperties}
      >
        {/* Red seat photo, top-left */}
        <div className="absolute overflow-hidden" style={{ left: '13.2%', top: '17.9%', width: '29.9%', height: '28.5%' }}>
          <img src={redSeat} alt="" draggable={false} className="h-full w-full object-cover" />
        </div>

        {/* Door handle photo with fob, top-right */}
        <div className="absolute overflow-hidden" style={{ left: '45.2%', top: '17%', width: '43.5%', height: '28.9%' }}>
          <img src={doorHandle} alt="" draggable={false} className="h-full w-full object-cover" />
        </div>
        {/* Dashed sensor ring on the handle, as in the print */}
        <div
          className="sk-ring-wrap absolute rounded-full border border-dashed border-white/70"
          style={{ left: '77.8%', top: '34%', width: '4.5%', aspectRatio: '1 / 1', transform: 'translate(-50%, -50%)' }}
        />

        {/* Key variants on a shelf, bottom-left */}
        {VARIANTS.map((v, i) => (
          <div
            key={i}
            className="sk-variant absolute rounded-[0.6cqw] border border-white/10 bg-[linear-gradient(180deg,#2e3138_0%,#17181c_45%,#0c0d10_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
            style={{ left: `${v.left}%`, top: `${(728 / 1176) * 100 + (i === 0 ? 0.6 : 0)}%`, width: `${v.width}%`, height: `${v.height}%`, ['--i' as string]: i } as React.CSSProperties}
          >
            {v.logo > 0 && (
              <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2" style={{ width: `${v.logo}cqw` }}>
                <Emblem className="w-full" />
              </div>
            )}
          </div>
        ))}

        {/* Chrome key blade on top of the largest variant */}
        <div className="absolute bg-[linear-gradient(180deg,#f2f5f8,#8c939c)]" style={{ left: '35%', top: '55.4%', width: '4.9%', height: '1.1%' }} />
        <div className="absolute bg-[linear-gradient(90deg,#8c939c,#f2f5f8,#8c939c)]" style={{ left: '39.8%', top: '55.4%', width: '0.45%', height: '7.1%' }} />

        {/* Shelf line */}
        <div className="absolute bg-[linear-gradient(90deg,transparent,#3a3d44_8%,#3a3d44_92%,transparent)]" style={{ left: '0.6%', top: '86.7%', width: '57.5%', height: '0.3%' }} />

        {/* Heading and bullets, bottom-right */}
        <div ref={bullets} className="absolute" style={{ left: '46.6%', top: '62.3%', width: '41.3%' }}>
          <h3 className="font-semibold uppercase tracking-[0.02em] text-white" style={{ fontSize: '1.15cqw', lineHeight: 1.3 }}>
            Smart entry with remote engine start:
          </h3>
          <ul className="mt-[2.6cqh] space-y-[2.4cqh]">
            {BULLETS.map((b, i) => (
              <li key={i} className="sk-bullet flex gap-[1cqw] font-light uppercase text-white/90" style={{ fontSize: '0.9cqw', lineHeight: 1.5, letterSpacing: '0.03em', ['--i' as string]: i } as React.CSSProperties}>
                <span className="mt-[0.6em] h-[0.7em] w-[0.7em] flex-none rounded-full bg-white" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
