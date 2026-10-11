import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FEATURES } from './features'
import { SceneFor } from './scenes'

gsap.registerPlugin(ScrollTrigger)

// Night skyline silhouettes, drawn in SVG so they stay sharp at any size.
// Each tower: x, width, height (as % of the panel height), and whether it has a lit top.
const TOWERS = [
  [2, 6, 34], [9, 4, 46], [14, 7, 28], [22, 5, 52], [28, 3, 40],
  [32, 8, 62], [41, 4, 48], [46, 6, 36], [53, 5, 70], [59, 4, 44],
  [64, 7, 56], [72, 4, 38], [77, 6, 66], [84, 5, 42], [90, 4, 30], [95, 5, 50],
]

function Skyline() {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="sky-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#060a14" />
          <stop offset="0.6" stopColor="#0a1a33" />
          <stop offset="1" stopColor="#0b2a5c" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#sky-fade)" />
      {TOWERS.map(([x, w, h], i) => (
        <g key={i}>
          <rect x={x} y={100 - h} width={w} height={h} fill="#0a1424" />
          {Array.from({ length: Math.floor(h / 6) }, (_, r) => (
            <rect key={r} x={x + w * 0.3} y={100 - h + 3 + r * 5} width={w * 0.4} height={1.2} fill="#7fc2ff" opacity={0.25 + ((i + r) % 4) * 0.12} />
          ))}
        </g>
      ))}
    </svg>
  )
}

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

      // Part one fades and rolls in when the section comes into view.
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
        {/* Part 1: Honda SENSING, scanning the surroundings in a loop */}
        <div className="relative h-full w-screen overflow-hidden bg-[#0a0c10]">
          <div ref={part1} className="absolute inset-0">
            {/* Left panel: night city with blue light, as in the print */}
            <div className="absolute inset-y-0 left-0 w-[62%] overflow-hidden">
              <Skyline />
              {/* Blue light wash across the horizon */}
              <div className="absolute inset-x-0 bottom-[18%] h-[30%] bg-[radial-gradient(ellipse_at_40%_60%,rgba(40,130,255,0.55),transparent_65%)]" />
              {/* Glow pooled under the car */}
              <div className="absolute left-[8%] bottom-[2%] h-[46%] w-[80%] bg-[radial-gradient(ellipse_at_50%_55%,rgba(50,140,255,0.6),rgba(20,80,180,0.25)_45%,transparent_70%)]" />

              {/* Car + radar, sharing one coordinate space so the sensors stay on the car */}
              <div className="absolute left-[17%] top-[42%] w-[70%]">
                <img
                  src="/sensing/cars/blue_front.webp"
                  alt="Honda Civic with Honda SENSING"
                  className="relative z-10 block w-full select-none drop-shadow-[0_18px_30px_rgba(0,0,0,0.6)]"
                  draggable={false}
                />

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

              <p className="scan-status absolute left-[6%] top-[8%] text-[clamp(10px,1vw,14px)] tracking-[0.3em] text-cyan-200">● SCANNING · 360°</p>
            </div>

            {/* Right panel: title block, as in the print */}
            <div className="absolute inset-y-0 right-0 flex w-[38%] flex-col items-start justify-center bg-[#0b0c0f] pl-[4%]">
              <p className="text-[clamp(14px,1.5vw,24px)] font-light tracking-[0.12em] text-white">Honda</p>
              <h2 className="mt-[1vh] text-[clamp(40px,6.2vw,110px)] font-bold leading-none tracking-[0.04em]">SENSING</h2>
              <p className="mt-[4vh] text-[clamp(14px,1.6vw,26px)] font-bold leading-tight tracking-[0.02em]">
                STANDARD IN ALL
                <br />
                VARIANTS
              </p>
            </div>
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
