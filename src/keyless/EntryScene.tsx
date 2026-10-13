import { useEffect, useRef } from 'react'
import { Emblem } from './KeyScene'
import redSeat from './assets/hand-card-red-seat.jpg'
import doorHandle from './assets/door-handle-fob.jpg'
import keysShelf from './assets/keys-shelf.jpg'

const BULLETS = [
  'With the key in your pocket, the doors will unlock as you approach',
  'Start the vehicle engine with a simple push of a button even before entering the car',
  'Car doors lock automatically when the remote key is away from the vehicle',
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

        {/* Key variants on the shelf, bottom-left: regenerated from the print's shelf crop, at the crop's measured position */}
        <img
          src={keysShelf}
          alt=""
          draggable={false}
          className="absolute select-none object-cover"
          style={{
            left: '12.8%', top: '53.33%', width: '29.06%', height: '32.5%',
            WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 6%, #000 94%, transparent 100%), linear-gradient(180deg, transparent 0%, #000 8%, #000 92%, transparent 100%)',
            WebkitMaskComposite: 'source-in',
            maskImage: 'linear-gradient(90deg, transparent 0%, #000 6%, #000 94%, transparent 100%), linear-gradient(180deg, transparent 0%, #000 8%, #000 92%, transparent 100%)',
            maskComposite: 'intersect',
          } as React.CSSProperties}
        />

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
