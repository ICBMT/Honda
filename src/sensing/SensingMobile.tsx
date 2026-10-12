import { useRef, useState } from 'react'
import { FEATURES } from './features'
import { SceneFor } from './scenes'

// Phone layout for Section 2: a swipe carousel, one screen per slide.
// Slide 1 is the blue car with its radar dome; then one slide per system.
export default function SensingMobile() {
  const scroller = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const slides = FEATURES.length + 1

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  const goTo = (i: number) => {
    const el = scroller.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <section className="relative h-screen w-full overflow-hidden bg-[#05070d] text-white">
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Intro: the blue car with its radar dome */}
        <article className="relative flex h-full w-screen flex-none snap-center flex-col items-center justify-between overflow-hidden bg-[radial-gradient(ellipse_at_50%_55%,rgba(40,120,255,0.35),transparent_65%),linear-gradient(to_bottom,#05070d,#0b1220)] px-6 pb-24 pt-[12vh]">
          <div className="w-full">
            <p className="text-lg font-extrabold tracking-wide text-[#e0202a]">HONDA</p>
            <p className="text-[11px] italic text-white/70">The Power of Dreams</p>
          </div>

          <div className="relative w-[70vw]">
            <img
              src="/sensing/cars/blue_front.webp"
              alt="Honda Civic with Honda SENSING"
              className="relative z-10 block w-full select-none drop-shadow-[0_18px_30px_rgba(0,0,0,0.6)]"
              draggable={false}
            />
            <div className="radar-dome" aria-hidden="true">
              <span className="radar-dome-edge" />
              <span className="radar-dome-sweep" />
              <span className="radar-dome-ring" style={{ animationDelay: '0s' }} />
              <span className="radar-dome-ring" style={{ animationDelay: '1.07s' }} />
              <span className="radar-dome-ring" style={{ animationDelay: '2.13s' }} />
            </div>
          </div>

          <div className="w-full">
            <p className="text-sm font-light tracking-[0.12em]">Honda</p>
            <h2 className="text-[15vw] font-bold leading-none tracking-[0.04em]">SENSING</h2>
            <p className="mt-3 text-sm font-bold tracking-wide">STANDARD IN ALL VARIANTS</p>
            <p className="mt-4 text-[11px] tracking-[0.25em] text-white/50">SWIPE TO EXPLORE →</p>
          </div>
        </article>

        {/* One slide per system */}
        {FEATURES.map((f) => (
          <article
            key={f.code}
            className="flex h-full w-screen flex-none snap-center flex-col justify-center gap-5 px-5 pb-24 pt-[12vh]"
          >
            <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-[#101318]">
              <div className="aspect-[800/300] w-full">
                <SceneFor code={f.code} />
              </div>
            </div>
            <div>
              <h3 className="flex flex-wrap items-baseline gap-x-2 text-lg font-semibold leading-snug">
                <span className="text-amber-400">{f.code}</span>
                <span className="text-amber-300/90">{f.title}</span>
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/70">{f.text}</p>
            </div>
          </article>
        ))}
      </div>

      {/* Slide indicator */}
      <nav className="pointer-events-auto absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-2" aria-label="Sensing slides">
        {Array.from({ length: slides }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={i === 0 ? 'Honda SENSING' : FEATURES[i - 1].title}
            aria-current={index === i}
            className={`h-2 rounded-full transition-all duration-300 ${index === i ? 'w-6 bg-amber-400' : 'w-2 bg-white/30'}`}
          />
        ))}
      </nav>
    </section>
  )
}
