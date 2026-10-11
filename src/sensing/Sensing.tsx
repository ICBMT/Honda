import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FEATURES } from './features'
import { SceneFor } from './scenes'

// Radar points on the blue car, as fractions of the car image.
const SENSORS = [
  { x: 0.18, y: 0.65, label: 'FRONT RADAR' },
  { x: 0.43, y: 0.83, label: '' },
  { x: 0.56, y: 0.42, label: '' },
  { x: 0.92, y: 0.56, label: 'REAR RADAR' },
]

// Deterministic skyline so the layout is stable between renders.
const SKYLINE = Array.from({ length: 28 }, (_, i) => ({
  left: i * 3.7 + (i % 3) * 0.6,
  width: 2 + ((i * 7) % 5) * 0.5,
  height: 14 + ((i * 37) % 44),
  lit: i % 3 === 0,
}))

export default function Sensing() {
  const wrap = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const part1 = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = wrap.current!
    const ctx = gsap.context(() => {
      const horizontal = gsap.to(track.current, {
        xPercent: -50,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          pin: true,
          scrub: 1,
          start: 'top top',
          end: () => '+=' + window.innerWidth * 1.6,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      })

      // Part one rolls in from the left when the section comes into view.
      gsap.fromTo(
        part1.current,
        { xPercent: -30, opacity: 0 },
        {
          xPercent: 0,
          opacity: 1,
          duration: 2.4,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 70%', once: true },
        },
      )

      gsap.utils.toArray<HTMLElement>('[data-card]').forEach((card, i) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            delay: (i % 2) * 0.12,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              containerAnimation: horizontal,
              start: 'left 92%',
              toggleActions: 'play none none reverse',
            },
          },
        )
      })
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={wrap} className="relative h-screen w-full overflow-hidden bg-[#05070d] text-white">
      <div ref={track} className="flex h-full w-[200vw]">
        {/* Part 1: Honda SENSING, scanning the road in a loop */}
        <div className="relative h-full w-screen overflow-hidden bg-[radial-gradient(ellipse_at_25%_75%,rgba(20,90,200,0.55),transparent_60%),linear-gradient(to_bottom,#05070d,#0b1220)]">
          <div ref={part1} className="absolute inset-0">
            {/* Skyline */}
            <div className="absolute inset-x-0 bottom-[30%] h-[40%] opacity-90">
              {SKYLINE.map((b, i) => (
                <div
                  key={i}
                  className="absolute bottom-0 bg-[#0b1426]"
                  style={{
                    left: `${b.left}%`,
                    width: `${b.width}%`,
                    height: `${b.height}%`,
                    boxShadow: b.lit ? '0 0 12px rgba(90,170,255,0.35)' : undefined,
                  }}
                />
              ))}
            </div>
            {/* Floor glow and road */}
            <div className="absolute inset-x-0 bottom-[22%] h-[2px] bg-[linear-gradient(to_right,transparent,rgba(103,232,249,0.6),transparent)]" />
            <div className="absolute inset-x-0 bottom-0 h-[22%] bg-[linear-gradient(to_top,#03050a,#0b1220)]" />

            {/* Car + radar, sharing one coordinate space so the sensors stay on the car */}
            <div className="absolute bottom-[16%] left-[4%] w-[62vw]">
              <img src="/sensing/cars/blue_side.webp" alt="Honda Civic with Honda SENSING" className="relative z-10 block w-full select-none" draggable={false} />

              {/* Scanning band sweeping across the car */}
              <span className="scan-band absolute inset-y-0 z-20 w-[16%]" />

              {/* Radar from the front of the car */}
              <div className="absolute z-20" style={{ left: `${SENSORS[0].x * 100}%`, top: `${SENSORS[0].y * 100}%` }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="radar-ring" style={{ width: '22%', height: 'auto', aspectRatio: '1', animationDelay: `${i * 1.05}s` }} />
                ))}
                <span className="radar-sweep" style={{ width: '36%', height: 'auto', aspectRatio: '1' }} />
                <span className="radar-core" />
              </div>

              {/* Sensor points on the body, pulsing in turn */}
              {SENSORS.map((s, i) => (
                <div key={i} className="absolute z-20" style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}>
                  <span className="sensor-dot" style={{ animationDelay: `${i * 0.5}s` }} />
                  {s.label && <span className="detect-label" style={{ left: '1.2%', top: '-2.4%' }}>{s.label}</span>}
                </div>
              ))}
            </div>

            <div className="absolute left-[5%] top-[8%]">
              <p className="scan-status text-[clamp(10px,1vw,14px)] tracking-[0.3em] text-cyan-200">● SCANNING · 360°</p>
            </div>

            {/* Title block, as in the printed panel */}
            <div className="absolute right-[6%] top-[30%] text-right">
              <p className="text-[clamp(14px,1.6vw,26px)] font-light tracking-[0.25em] text-white/90">Honda</p>
              <h2 className="text-[clamp(44px,7vw,120px)] font-black leading-[0.9] tracking-tight">SENSING</h2>
            </div>
            <p className="absolute bottom-[7%] right-[6%] text-[clamp(11px,1.1vw,16px)] tracking-[0.3em] text-white/75">
              STANDARD IN ALL VARIANTS
            </p>
            <p className="absolute bottom-[4%] left-[5%] text-[clamp(10px,0.9vw,14px)] tracking-[0.25em] text-cyan-200/70">SCROLL →</p>
          </div>
        </div>

        {/* Part 2: how each system works, animated from the printed illustrations */}
        <div className="relative grid h-full w-screen grid-cols-2 grid-rows-3 gap-[2.2vh] bg-[#0b0d12] px-[4vw] py-[5vh]">
          {FEATURES.map((f) => (
            <article
              key={f.code}
              data-card
              className="relative flex min-h-0 flex-col overflow-hidden rounded-md border border-white/10 bg-[#101318]"
            >
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <SceneFor code={f.code} />
              </div>
              <div className="border-t border-white/10 bg-[#0b0d12] px-[1.6vw] py-[1.2vh]">
                <h3 className="flex items-baseline gap-[0.6vw] text-[clamp(14px,1.3vw,20px)] font-semibold">
                  <span className="text-amber-400">{f.code}</span>
                  <span className="text-amber-300/90">{f.title}</span>
                </h3>
                <p className="mt-[0.6vh] text-[clamp(11px,0.95vw,14px)] leading-snug text-white/70">{f.text}</p>
              </div>
            </article>
          ))}
          <p className="absolute bottom-[1.2vh] right-[3vw] text-[clamp(8px,0.7vw,10px)] tracking-wide text-white/40">
            PLEASE SEE THE OWNER'S MANUAL OR OWNER'S GUIDE FOR ALL CONDITIONS & LIMITATIONS
          </p>
        </div>
      </div>
    </section>
  )
}
