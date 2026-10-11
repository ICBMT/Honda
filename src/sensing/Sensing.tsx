import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FEATURES } from './features'
import FeatureImage from './FeatureDiagram'

// Sensor points on the car in part one, as fractions of the printed artwork.
const SENSORS = [
  { x: 0.19, y: 0.68, label: 'FRONT RADAR' },
  { x: 0.3, y: 0.73, label: '' },
  { x: 0.395, y: 0.587, label: '' },
  { x: 0.507, y: 0.646, label: 'REAR RADAR' },
]

export default function Sensing() {
  const wrap = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const part1 = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = wrap.current!
    const ctx = gsap.context(() => {
      // The section pins while the track slides sideways with the scroll.
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

      // Part two cards reveal as they enter the sideways view.
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
        {/* Part 1: the printed car panel, with the sensors scanning in a loop */}
        <div className="relative h-full w-screen overflow-hidden bg-black">
          <div ref={part1} className="absolute inset-0">
            <div
              className="absolute left-1/2 top-1/2 aspect-[4/3] -translate-x-1/2 -translate-y-1/2"
              style={{ width: 'max(100vw, 133.333vh)' }}
            >
              <img src="/sensing/part1.jpg" alt="Honda SENSING, standard in all variants" className="absolute inset-0 h-full w-full select-none object-fill" draggable={false} />

              {/* Continuous scanning band sweeping across the car */}
              <span className="scan-band absolute inset-y-0 w-[14%]" />

              {/* Radar rings from the front of the car */}
              <div className="absolute" style={{ left: `${SENSORS[0].x * 100}%`, top: `${SENSORS[0].y * 100}%` }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="radar-ring" style={{ width: '16%', height: 'auto', aspectRatio: '1', animationDelay: `${i * 1.05}s` }} />
                ))}
                <span className="radar-sweep" style={{ width: '24%', height: 'auto', aspectRatio: '1' }} />
                <span className="radar-core" />
              </div>

              {/* Sensor points on the body, pulsing in turn */}
              {SENSORS.map((s, i) => (
                <div key={i} className="absolute" style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}>
                  <span className="sensor-dot" style={{ animationDelay: `${i * 0.5}s` }} />
                  {s.label && <span className="detect-label" style={{ left: '1.2%', top: '-2.4%' }}>{s.label}</span>}
                </div>
              ))}

              <div className="absolute left-[5%] top-[8%]">
                <p className="scan-status text-[clamp(10px,1vw,14px)] tracking-[0.3em] text-cyan-200">● SCANNING · 360°</p>
              </div>
            </div>
          </div>
        </div>

        {/* Part 2: how each system works, using the printed illustrations */}
        <div className="relative grid h-full w-screen grid-cols-2 grid-rows-3 gap-[2.2vh] bg-[#0b0d12] px-[4vw] py-[5vh]">
          {FEATURES.map((f) => (
            <article
              key={f.code}
              data-card
              className="relative flex min-h-0 flex-col overflow-hidden rounded-md border border-white/10 bg-[#101318]"
            >
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <FeatureImage img={f.img} ratio={f.ratio} overlays={f.overlays} />
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
