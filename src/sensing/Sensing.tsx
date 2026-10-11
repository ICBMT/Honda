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
          <stop offset="0" stopColor="#05070b" />
          <stop offset="0.55" stopColor="#090e18" />
          <stop offset="1" stopColor="#04060a" />
        </linearGradient>
        <filter id="sky-blur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.35" />
        </filter>
      </defs>
      <rect width="100" height="100" fill="url(#sky-fade)" />
      <g filter="url(#sky-blur)" fill="#131c2d" opacity="0.85">
        {TOWERS.map(([x, w, h], i) => (
          <rect key={i} x={x} y={100 - h * 0.8} width={w} height={h * 0.8} />
        ))}
      </g>
      <g fill="#9fd6ff">
        {TOWERS.filter((_, i) => i % 3 === 0).map(([x, w, h], i) => (
          <rect key={i} x={x + w * 0.4} y={100 - h * 0.8 + 2} width={0.5} height={0.5} opacity="0.45" />
        ))}
      </g>
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

              {/* Car with its blue glow */}
              <div className="absolute left-[17%] top-[42%] w-[70%]">
                <img
                  src="/sensing/cars/blue_front.webp"
                  alt="Honda Civic with Honda SENSING"
                  className="relative z-10 block w-full select-none drop-shadow-[0_18px_30px_rgba(0,0,0,0.6)]"
                  draggable={false}
                />

                {/* Radar dome: rotating sweep and expanding rings around the car */}
                <div className="radar-dome" aria-hidden="true">
                  <span className="radar-dome-edge" />
                  <span className="radar-dome-sweep" />
                  <span className="radar-dome-ring" style={{ animationDelay: '0s' }} />
                  <span className="radar-dome-ring" style={{ animationDelay: '1.07s' }} />
                  <span className="radar-dome-ring" style={{ animationDelay: '2.13s' }} />
                </div>
              </div>
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
