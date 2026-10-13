import { useEffect, useRef } from 'react'
import { Emblem } from './KeyScene'
import redSeat from './assets/hand-card-red-seat.jpg'
import doorHandle from './assets/door-handle-fob.jpg'

const BULLETS = [
  'With the key in your pocket, the doors will unlock as you approach',
  'Start the vehicle engine with a simple push of a button even before entering the car',
  'Car doors lock automatically when the remote key is away from the vehicle',
]

// Part two (section4-2): the four-panel print layout, with the bullets revealed when the panel comes into view.
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
    <div className="relative h-full w-screen bg-[#16181d] px-[6vw] py-[8vh]">
      <div className="grid h-full grid-cols-2 grid-rows-[1fr_1fr] gap-[3vh] gap-x-[4vw]">
        {/* Top-left: red seat photo */}
        <div className="relative overflow-hidden">
          <img src={redSeat} alt="" className="h-full w-full object-cover" />
        </div>

        {/* Top-right: door handle with fob and sensor ring */}
        <div className="relative overflow-hidden">
          <img src={doorHandle} alt="" className="h-full w-full object-cover" />
          <svg viewBox="0 0 100 60" className="pointer-events-none absolute right-[22%] top-[38%] h-[30%] w-[14%]" aria-hidden="true">
            <circle cx="50" cy="30" r="28" fill="none" stroke="#e9edf3" strokeWidth="0.8" strokeDasharray="2 2" className="sk-ring" />
          </svg>
        </div>

        {/* Bottom-left: four key variants on a shelf */}
        <div className="relative flex items-end justify-start gap-[1.6vw] border-b border-white/10 pb-[2vh]">
          {[
            { w: '3%', h: '62%' },
            { w: '9%', h: '66%' },
            { w: '11%', h: '72%' },
            { w: '16%', h: '82%' },
          ].map((v, i) => (
            <div key={i} className="sk-variant relative rounded-[4%] border border-white/10 bg-gradient-to-b from-[#2a2e36] to-[#07080b]" style={{ width: v.w, height: v.h, ['--i' as string]: i } as React.CSSProperties}>
              {i > 0 && <Emblem className="absolute left-1/2 top-[40%] h-[16%] w-auto -translate-x-1/2 text-white/80" />}
            </div>
          ))}
          <div className="absolute -top-[4vh] left-[78%] h-[8vh] w-[2.2vw] border-t-4 border-l-4 border-[#c5cbd3]" />
        </div>

        {/* Bottom-right: heading and bullets */}
        <div ref={bullets} className="flex flex-col justify-center">
          <h3 className="text-[clamp(12px,1.1vw,18px)] font-bold uppercase tracking-[0.06em]">Smart entry with remote engine start:</h3>
          <ul className="mt-[3vh] space-y-[2.4vh]">
            {BULLETS.map((b, i) => (
              <li key={i} className="sk-bullet flex gap-[1vw] text-[clamp(10px,0.95vw,15px)] uppercase leading-snug tracking-[0.05em] text-white/85" style={{ ['--i' as string]: i } as React.CSSProperties}>
                <span className="mt-[0.5em] h-[0.5em] w-[0.5em] flex-none rounded-full bg-white/90" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
