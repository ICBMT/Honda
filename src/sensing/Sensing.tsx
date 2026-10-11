import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FEATURES } from './features'
import FeatureDiagram from './FeatureDiagram'

// Deterministic skyline so the layout is stable between renders.
const SKYLINE = Array.from({ length: 26 }, (_, i) => ({
  left: i * 4.1 + (i % 3) * 0.7,
  width: 2.2 + ((i * 7) % 5) * 0.6,
  height: 18 + ((i * 37) % 46),
  lit: i % 3 === 0,
}))

export default function Sensing() {
  const wrap = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const car = useRef<HTMLDivElement>(null)
  const farLayer = useRef<HTMLDivElement>(null)
  const nearLayer = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = wrap.current!
    const ctx = gsap.context(() => {
      // The whole section pins while the track slides sideways with the scroll.
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

      // Parallax city layers: far moves slowly, near moves faster, so the car feels like it's cruising right.
      gsap.to(farLayer.current, {
        xPercent: -8,
        ease: 'none',
        scrollTrigger: { trigger: el, scrub: 1, start: 'top top', end: () => '+=' + window.innerWidth * 1.6 },
      })
      gsap.to(nearLayer.current, {
        xPercent: -18,
        ease: 'none',
        scrollTrigger: { trigger: el, scrub: 1, start: 'top top', end: () => '+=' + window.innerWidth * 1.6 },
      })

      // Entrance: the car rolls in from the left, like the hero.
      gsap.fromTo(
        car.current,
        { xPercent: -140, opacity: 0 },
        {
          xPercent: 0,
          opacity: 1,
          duration: 2.4,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 70%', once: true },
        },
      )

      // Feature cards reveal as they enter the sideways view.
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
        {/* Panel 1: Honda SENSING, scanning the road while cruising */}
        <div className="relative h-full w-screen overflow-hidden">
          <div ref={farLayer} className="absolute inset-y-0 -left-[10%] w-[120%]">
            <div className="absolute inset-x-0 bottom-[26%] h-[36%] bg-[linear-gradient(to_top,#0a1830,transparent)] opacity-80" />
            {SKYLINE.map((b, i) => (
              <div
                key={i}
                className="absolute bottom-[26%] bg-[#0b1426]"
                style={{
                  left: `${b.left}%`,
                  width: `${b.width}%`,
                  height: `${b.height}%`,
                  boxShadow: b.lit ? '0 0 14px rgba(90,170,255,0.35)' : undefined,
                }}
              />
            ))}
          </div>

          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_70%,rgba(30,110,220,0.45),transparent_60%)]" />

          <div ref={nearLayer} className="absolute inset-x-[-20%] bottom-[24%] h-[6vh]">
            <div className="road-dashes absolute inset-0 opacity-70" />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-[24%] bg-[linear-gradient(to_top,#03050a,#0b1220)]" />
          <div className="absolute inset-x-0 bottom-[24%] h-[1px] bg-[linear-gradient(to_right,transparent,rgba(103,232,249,0.4),transparent)]" />

          {/* Car + radar, sharing one coordinate space so the sensors stay on the car */}
          <div ref={car} className="absolute bottom-[18%] left-[6%] w-[min(62vw,860px)]">
            <img src="/hero/blue.webp" alt="Honda Civic with Honda SENSING" className="relative z-10 block w-full select-none" draggable={false} />

            {/* Radar origin: front of the car */}
            <div className="absolute left-[3%] top-[62%] z-0 h-0 w-0">
              {[0, 1, 2].map((i) => (
                <span key={i} className="radar-ring" style={{ animationDelay: `${i * 1.05}s` }} />
              ))}
              <span className="radar-sweep" />
              <span className="radar-core" />
            </div>

            {/* Sensor beams */}
            <span className="sensor-beam absolute left-[2%] top-[58%] h-[2px] w-[34%] origin-left -rotate-[8deg]" />
            <span className="sensor-beam absolute left-[2%] top-[62%] h-[2px] w-[30%] origin-left" />
            <span className="sensor-beam absolute left-[2%] top-[66%] h-[2px] w-[34%] origin-left rotate-[8deg]" />
            <span className="sensor-dot absolute left-[1%] top-[58%]" />
            <span className="sensor-dot absolute left-[3%] top-[66%]" />
            <span className="sensor-dot absolute right-[6%] top-[60%]" />
          </div>

          {/* Traffic ahead, with detection boxes popping up as the radar sweeps */}
          <div className="absolute bottom-[20%] right-[10%] w-[min(22vw,320px)]">
            <img src="/hero/white.webp" alt="" className="block w-full opacity-90" draggable={false} />
            <div className="detect-box absolute inset-[-6%_-4%] border border-cyan-300" style={{ animationDelay: '2.4s' }}>
              <span className="detect-label">CAR · 42 m</span>
            </div>
          </div>
          <div className="detect-box absolute bottom-[42%] right-[34%] h-[9%] w-[7%] border border-cyan-300" style={{ animationDelay: '5.2s' }}>
            <span className="detect-label">MOTORBIKE · 18 m</span>
          </div>

          <div className="absolute left-[5%] top-[10%] max-w-[46vw]">
            <p className="text-[clamp(14px,1.4vw,20px)] font-light tracking-[0.3em] text-white/80">Honda</p>
            <h2 className="text-[clamp(56px,11vw,160px)] font-black leading-[0.9] tracking-tight">SENSING</h2>
          </div>
          <p className="absolute bottom-[7%] right-[5%] text-[clamp(12px,1.1vw,16px)] tracking-[0.3em] text-white/70">
            STANDARD IN ALL VARIANTS
          </p>
          <p className="absolute bottom-[4%] left-[5%] text-[clamp(11px,0.9vw,14px)] tracking-[0.25em] text-cyan-200/70">
            SCROLL →
          </p>
        </div>

        {/* Panel 2: how each system works */}
        <div className="relative grid h-full w-screen grid-cols-2 grid-rows-3 gap-[2.2vh] bg-[#0b0d12] px-[4vw] py-[5vh]">
          {FEATURES.map((f) => (
            <article
              key={f.code}
              data-card
              className="relative flex min-h-0 flex-col overflow-hidden rounded-md border border-white/10 bg-[linear-gradient(to_bottom,#161a22,#0e1117)]"
            >
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <FeatureDiagram code={f.code} />
              </div>
              <div className="border-t border-white/10 px-[1.6vw] py-[1.2vh]">
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
