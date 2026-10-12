import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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

// Labels sit on an ellipse around the radar dome (centre 52%, 58% of the left panel).
// Order runs clockwise from upper-left so the six systems read in sequence.
type Side = 'top' | 'bottom' | 'left' | 'right'
const HOTSPOTS: { x: string; y: string; side: Side }[] = [
  { x: '14%', y: '42%', side: 'left' },
  { x: '52%', y: '18%', side: 'top' },
  { x: '90%', y: '42%', side: 'right' },
  { x: '90%', y: '74%', side: 'right' },
  { x: '52%', y: '92%', side: 'bottom' },
  { x: '14%', y: '74%', side: 'left' },
]

const DETAIL_POS: Record<Side, string> = {
  top: 'top-full mt-3 left-1/2 -translate-x-1/2',
  bottom: 'bottom-full mb-3 left-1/2 -translate-x-1/2',
  left: 'left-full ml-3 top-1/2 -translate-y-1/2',
  right: 'right-full mr-3 top-1/2 -translate-y-1/2',
}


export default function Sensing() {
  const wrap = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const part1 = useRef<HTMLDivElement>(null)
  const signRef = useRef<HTMLDivElement>(null)
  const carImg = useRef<HTMLImageElement>(null)

  // 3D tilt: the car leans toward the pointer and settles back when it leaves.
  const onTilt = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    if (carImg.current) carImg.current.style.transform = `perspective(1400px) rotateX(${(-y * 10).toFixed(2)}deg) rotateY(${(x * 14).toFixed(2)}deg)`
  }
  const onTiltReset = () => {
    if (carImg.current) carImg.current.style.transform = "perspective(1400px) rotateX(0deg) rotateY(0deg)"
  }

  // The hazard sign follows the pointer while it is over the radar scan area.
  const showSign = (on: boolean) => {
    if (signRef.current) signRef.current.style.opacity = on ? '1' : '0'
  }
  const moveSign = (e: React.PointerEvent) => {
    if (signRef.current) signRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`
  }

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

      // Part one entrance: backdrop, glow, car, radar dome, then the title lines.
      const intro = gsap.timeline({
        paused: true,
        defaults: { ease: 'power3.out' },
      })
      intro
        .fromTo('[data-intro="sky"]', { opacity: 0 }, { opacity: 1, duration: 1.6, ease: 'power1.out' }, 0)
        .fromTo('[data-intro="glow"]', { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 1.8 }, 0.3)
        .fromTo(
          '[data-intro="car"]',
          { x: -90, opacity: 0, filter: 'blur(14px)' },
          { x: 0, opacity: 1, filter: 'blur(0px)', duration: 1.9, ease: 'power3.out' },
          0.5,
        )
        .fromTo(
          '[data-intro="dome"]',
          { opacity: 0, scale: 0.9 },
          { opacity: 1, scale: 1, duration: 1.2, ease: 'power2.out' },
          2.1,
        )
        .fromTo(
          '[data-intro="title"] > *',
          { y: 36, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, stagger: 0.18 },
          1.0,
        )

      ScrollTrigger.create({
        trigger: el,
        start: 'top 70%',
        once: true,
        onEnter: () => intro.play(),
      })

      // 3D tilt on each system card: it leans toward the pointer and settles back.
      gsap.utils.toArray<HTMLElement>('[data-card]').forEach((card) => {
        gsap.set(card, { transformPerspective: 900, transformOrigin: 'center center' })
        const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' })
        const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' })
        card.addEventListener('pointermove', (e) => {
          const r = card.getBoundingClientRect()
          rx(-((e.clientY - r.top) / r.height - 0.5) * 8)
          ry(((e.clientX - r.left) / r.width - 0.5) * 10)
        })
        card.addEventListener('pointerleave', () => {
          rx(0)
          ry(0)
        })
      })

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
            <div data-intro="sky" onPointerMove={onTilt} onPointerLeave={onTiltReset} className="absolute inset-y-0 left-0 w-[62%] overflow-hidden">
              <Skyline />
              {/* Blue light wash across the horizon */}
              <div className="absolute inset-x-0 bottom-[22%] h-[26%] bg-[radial-gradient(ellipse_at_30%_50%,rgba(40,120,255,0.4),transparent_70%)]" />
              {/* Glow pooled under the car */}
              <div data-intro="glow" className="absolute left-[8%] bottom-[2%] h-[46%] w-[80%] bg-[radial-gradient(ellipse_at_50%_55%,rgba(50,140,255,0.6),rgba(20,80,180,0.25)_45%,transparent_70%)]" />

              {/* Car with its blue glow */}
              <div data-intro="car" className="absolute left-[17%] top-[42%] w-[70%]">
                <img
                  ref={carImg} src="/sensing/cars/blue_front.webp"
                  alt="Honda Civic with Honda SENSING"
                  className="relative z-10 block w-full select-none drop-shadow-[0_18px_30px_rgba(0,0,0,0.6)]"
                  draggable={false}
                />

                {/* Soft floor reflection of the car */}
                <img
                  src="/sensing/cars/blue_front.webp"
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="pointer-events-none absolute inset-x-0 top-full block w-full select-none opacity-[0.16]"
                  style={{ transform: 'scaleY(-1)', transformOrigin: 'top', maskImage: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent 55%)', WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent 55%)' }}
                />

                {/* Radar dome: rotating sweep and expanding rings around the car */}
                <div data-intro="dome" className="radar-dome" aria-hidden="true" onPointerEnter={() => showSign(true)} onPointerLeave={() => showSign(false)} onPointerMove={moveSign}>
                  <span className="radar-dome-edge" />
                  <span className="radar-dome-sweep" />
                  <span className="radar-dome-ring" style={{ animationDelay: '0s' }} />
                  <span className="radar-dome-ring" style={{ animationDelay: '1.07s' }} />
                  <span className="radar-dome-ring" style={{ animationDelay: '2.13s' }} />
                </div>
              </div>
            {/* The six systems around the car: hover a label to read about it */}
            {FEATURES.map((f, i) => {
              const pos = HOTSPOTS[i]
              return (
                <div
                  key={f.code}
                  className="group absolute z-30 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: pos.x, top: pos.y }}
                >
                  <span className="block cursor-default rounded-full border border-cyan-300/40 bg-[#0a1420]/80 px-3 py-1 text-[clamp(10px,0.9vw,13px)] font-semibold tracking-[0.2em] text-cyan-100 backdrop-blur transition-colors duration-300 group-hover:border-amber-300 group-hover:text-amber-300">
                    {f.code}
                  </span>
                  <div
                    className={`pointer-events-none absolute w-[clamp(200px,20vw,280px)] rounded-md border border-white/10 bg-[#0b0f16]/95 p-3 text-left opacity-0 shadow-xl transition duration-300 group-hover:opacity-100 ${DETAIL_POS[pos.side]}`}
                  >
                    <p className="text-sm font-semibold text-amber-300">{f.title}</p>
                    <p className="mt-1 text-xs leading-snug text-white/70">{f.text}</p>
                  </div>
                </div>
              )
            })}
            </div>

            {/* Right panel: title block, as in the print */}
            <div data-intro="title" className="absolute inset-y-0 right-0 flex w-[38%] flex-col items-start justify-center bg-[#0b0c0f] pl-[4%]">
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
              className="relative flex min-h-0 flex-col overflow-hidden rounded-md border border-white/10 bg-[#101318] transition-colors duration-500 hover:border-cyan-300/30"
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
      {createPortal(
        <div ref={signRef} className="pointer-events-none fixed left-0 top-0 z-[1000] opacity-0 transition-opacity duration-200" style={{ width: 40, height: 36 }}>
          <svg viewBox="0 0 100 90" className="block h-full w-full drop-shadow-[0_0_8px_rgba(255,60,60,0.6)]" aria-hidden="true">
            <path d="M50 4 L96 84 L4 84 Z" fill="#d7262e" stroke="#b81d24" strokeWidth="5" strokeLinejoin="round" />
            <path d="M50 17 L83 74 L17 74 Z" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinejoin="round" />
            <rect x="45" y="32" width="10" height="28" rx="3" fill="#ffffff" />
            <circle cx="50" cy="69" r="5.5" fill="#ffffff" />
          </svg>
        </div>,
        document.body,
      )}
    </section>
  )
}
