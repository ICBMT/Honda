import { useEffect, useRef, useState } from 'react'
import { Emblem } from './KeyScene'

const BULLETS = [
  'With the key in your pocket, the doors will unlock as you approach',
  'Start the vehicle engine with a simple push of a button even before entering the car',
  'Car doors lock automatically when the remote key is away from the vehicle',
]
const BUTTONS = ['lock', 'unlock', 'trunk', 'engine'] as const

// Top-left: a red seat with the card key slipping in and out of the pocket.
function PocketPanel() {
  return (
    <div className="relative overflow-hidden rounded-sm bg-[linear-gradient(160deg,#7d1719,#c53a33_55%,#5e1012)]">
      <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-30" aria-hidden="true">
        <path d="M0 42 C30 30 60 34 100 22" stroke="#2a0607" strokeWidth="1.2" fill="none" />
        <path d="M0 52 C34 42 62 48 100 36" stroke="#2a0607" strokeWidth="0.8" fill="none" />
      </svg>
      <div className="sk-pocket absolute left-[30%] top-[22%] h-[52%] w-[46%] rounded-md bg-gradient-to-br from-[#2b3442] via-[#0d0f14] to-[#050608] shadow-[0_2vh_3vh_rgba(0,0,0,0.5)]">
        <Emblem className="absolute left-1/2 top-1/2 h-[30%] w-auto -translate-x-1/2 -translate-y-1/2 text-white" />
      </div>
    </div>
  )
}

// Top-right: the door handle, the fob, and the proximity ring that pulses where you reach.
function HandlePanel() {
  return (
    <div className="relative overflow-hidden rounded-sm bg-[linear-gradient(170deg,#1f242c,#0c0e13)]">
      <div className="absolute right-[10%] top-[34%] h-[30%] w-[52%] rounded-full bg-gradient-to-b from-[#f2f5f9] via-[#6e757f] to-[#1a1d23] shadow-[0_1.5vh_2vh_rgba(0,0,0,0.5)]" />
      <div className="absolute right-[18%] top-[46%] h-[7%] w-[7%]">
        <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
          <circle cx="10" cy="10" r="9" fill="none" stroke="#e9edf3" strokeWidth="0.4" strokeDasharray="1.2 1.2" className="sk-ring" />
          <circle cx="10" cy="10" r="9" fill="none" stroke="#e9edf3" strokeWidth="0.4" strokeDasharray="1.2 1.2" className="sk-ring sk-ring-2" />
        </svg>
      </div>
      <div className="absolute left-[8%] top-[18%] h-[64%] w-[26%] rounded-[28%] border border-white/15 bg-gradient-to-b from-[#2a2f38] to-[#07080b] p-[7%] shadow-[0_2vh_3vh_rgba(0,0,0,0.6)]">
        <div className="grid h-full grid-rows-4 gap-[6%]">
          {BUTTONS.map((b, i) => (
            <div key={b} className="flex items-center justify-center rounded-[25%] bg-[#0a0b0f]">
              <svg viewBox="0 0 20 20" className="h-[60%] w-[60%]" aria-hidden="true">
                <rect x="2" y="2" width="16" height="16" rx="4" className="sk-btn" style={{ ['--i' as string]: i, fill: '#1a1d24' } as React.CSSProperties} />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Bottom-left: the four key variants, rising in turn.
function VariantsPanel() {
  const heights = [44, 58, 58, 72]
  return (
    <div className="relative flex items-end justify-center gap-[2.5%] overflow-hidden rounded-sm bg-[linear-gradient(180deg,#14171d,#0a0b0e)] px-[6%] pb-[10%]">
      {heights.map((h, i) => (
        <div key={i} className="sk-variant relative rounded-[6%] border border-white/10 bg-gradient-to-b from-[#2a2f38] to-[#050608]" style={{ width: '18%', height: `${h}%`, ['--i' as string]: i } as React.CSSProperties}>
          <Emblem className="absolute left-1/2 top-[38%] h-[18%] w-auto -translate-x-1/2 text-white/80" />
        </div>
      ))}
    </div>
  )
}

// Part two of the print, with the bullets stepping in as the panel comes on screen.
export default function EntryScene() {
  const bullets = useRef<HTMLDivElement>(null)
  const [, setSeen] = useState(false)

  useEffect(() => {
    const el = bullets.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.classList.add('sk-in')
        setSeen(true)
        io.disconnect()
      }
    }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div className="relative grid h-full w-screen grid-cols-2 grid-rows-2 gap-[2.4vh] bg-[#0b0d12] px-[4vw] py-[7vh]">
      <PocketPanel />
      <HandlePanel />
      <VariantsPanel />
      <div ref={bullets} className="flex flex-col justify-center pl-[2vw]">
        <h3 className="text-[clamp(14px,1.5vw,24px)] font-bold tracking-[0.04em]">SMART ENTRY WITH REMOTE ENGINE START:</h3>
        <ul className="mt-[3vh] space-y-[2.4vh]">
          {BULLETS.map((b, i) => (
            <li key={i} className="sk-bullet flex gap-[1vw] text-[clamp(11px,1.1vw,17px)] leading-snug tracking-[0.04em] text-white/85" style={{ ['--i' as string]: i } as React.CSSProperties}>
              <span className="mt-[0.5em] h-[0.5em] w-[0.5em] flex-none rounded-full bg-white/90" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
