import { useEffect, useRef, useState } from 'react'
import { CARS, type CarKey } from './heroData'

// Phone layout for Section 1: portrait stack with a swipeable row of the three Civics.
const ORDER: CarKey[] = ['red', 'blue', 'white']
const LABEL: Record<CarKey, string> = {
  red: 'Civic RS · Red',
  blue: 'Civic Oriel · Blue',
  white: 'Civic · White',
}

export default function PhoneHero() {
  const scroller = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [ready, setReady] = useState(false)

  // Trigger the entrance once the first paint is done, so the transitions play.
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 120)
    return () => window.clearTimeout(t)
  }, [])

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <section data-active={ready} className="relative h-screen w-full overflow-hidden bg-[#05070d] text-white">
      <img src="/hero/backdrop.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-[30%_center]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#05070d]/60 via-transparent to-[#05070d]/85" />

      <div className="relative flex h-full flex-col justify-between px-6 pb-7 pt-[7vh]">
        {/* Header */}
        <div className="slide-reveal" style={{ '--d': 0 } as React.CSSProperties}>
          <p className="text-[clamp(28px,9vw,44px)] font-extrabold leading-none tracking-wide text-[#e0202a]">HONDA</p>
          <p className="mt-1 text-[12px] italic text-white/80">The Power of Dreams</p>
        </div>

        {/* Title */}
        <div className="text-center">
          <p className="slide-reveal text-[11px] font-light tracking-[0.3em] text-white/90" style={{ '--d': 1 } as React.CSSProperties}>
            WHERE CLASS MEETS THRILL
          </p>
          <h1 className="slide-reveal mt-2 text-[27vw] font-semibold leading-none tracking-tight" style={{ '--d': 2 } as React.CSSProperties}>
            CIVIC
          </h1>
        </div>

        {/* Cars: swipe carousel */}
        <div className="-mx-6">
          <div
            ref={scroller}
            onScroll={onScroll}
            className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {ORDER.map((car, i) => {
              const c = CARS[car]
              return (
                <div key={car} data-active={index === i} className="flex w-screen flex-none snap-center flex-col items-center justify-end">
                  <img
                    src={`/hero/${c.file}`}
                    alt={c.alt}
                    className="slide-reveal block w-[92%] select-none"
                    style={{ '--d': 3 } as React.CSSProperties}
                    draggable={false}
                  />
                  <p className="slide-reveal mt-2 text-[11px] tracking-[0.25em] text-white/80" style={{ '--d': 4 } as React.CSSProperties}>
                    {LABEL[car].toUpperCase()}
                  </p>
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            {ORDER.map((car, i) => (
              <span key={car} className={`h-1.5 rounded-full transition-all duration-300 ${index === i ? 'w-6 bg-[#e0202a]' : 'w-1.5 bg-white/40'}`} />
            ))}
          </div>
        </div>

        {/* Footer line */}
        <div className="slide-reveal flex items-end justify-between text-right" style={{ '--d': 5 } as React.CSSProperties}>
          <div className="flex flex-col items-start gap-2">
            <a
              href="#civic-rs"
              className="inline-flex min-h-11 items-center rounded-full bg-[#dc2626] px-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#b91c1c]"
            >
              Explore Civic RS
            </a>
            <p className="text-left text-[10px] tracking-[0.2em] text-white/70">SWIPE ←→</p>
          </div>
          <div>
            <p className="text-sm font-semibold">How we move you.</p>
            <p className="text-[9px] tracking-[0.2em] text-white/70">CREATE ▸ TRANSCEND, AUGMENT</p>
          </div>
        </div>
      </div>
    </section>
  )
}
