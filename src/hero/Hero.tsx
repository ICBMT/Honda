import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { STAGE, CARS, WHEELS, SMOKE, LIGHTS, TIMING, type CarKey } from './heroData'

const pct = (v: number, total: number) => `${(v / total) * 100}%`
const CIVIC = 'CIVIC'.split('')
const CAR_KEYS = Object.keys(CARS) as CarKey[]

export default function Hero() {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = root.current!
    const wrappers = Object.fromEntries(
      CAR_KEYS.map((k) => [k, el.querySelector<HTMLElement>(`[data-car="${k}"]`)!]),
    ) as Record<CarKey, HTMLElement>
    const stage = el.querySelector<HTMLElement>('[data-stage]')!
    const lights = Array.from(el.querySelectorAll<HTMLElement>('[data-light]'))
    const letters = Array.from(el.querySelectorAll<HTMLElement>('[data-letter]'))
    const blurs = Array.from(el.querySelectorAll<HTMLElement>('[data-blur]'))
    const spinners = Array.from(el.querySelectorAll<HTMLElement>('[data-spin]'))
    const smokeTimers: Partial<Record<CarKey, number>> = {}

    const spawnSmoke = (car: CarKey) => {
      SMOKE[car].forEach(([lx, ly]) => {
        const d = document.createElement('div')
        d.className = 'puff'
        d.style.left = pct(lx, CARS[car].w)
        d.style.top = pct(ly, CARS[car].h)
        wrappers[car].appendChild(d)
        gsap.fromTo(
          d,
          { scale: 0.3, opacity: 0.85, xPercent: -50, yPercent: -50 },
          {
            scale: 2.4 + Math.random(),
            opacity: 0,
            x: (Math.random() - 0.5) * 60,
            y: -20 - Math.random() * 40,
            duration: 1.4 + Math.random() * 0.4,
            ease: 'power1.out',
            onComplete: () => d.remove(),
          },
        )
      })
    }

    const ctx = gsap.context(() => {
      // Initial states
      gsap.set(stage, { autoAlpha: 0, scale: 0.92, filter: 'blur(14px)' })
      // Each car sits level on the floor: a slight tilt so the rear doesn't ride high.
      gsap.set(wrappers.red, { xPercent: -160, rotation: -1.2, transformOrigin: '50% 90%' })
      gsap.set(wrappers.blue, { xPercent: 160, rotation: 1.0, transformOrigin: '50% 90%' })
      gsap.set(wrappers.white, { rotation: 1.0, transformOrigin: '50% 90%' })
      gsap.set(wrappers.white, { autoAlpha: 0, scale: 0.5, yPercent: -30 })
      gsap.set(letters, { yPercent: 110, autoAlpha: 0 })
      gsap.set('[data-header], [data-tagline]', { autoAlpha: 0, y: 16 })
      gsap.set(lights, { opacity: 0 })
      gsap.set(blurs, { opacity: 0 })

      // Headlight sequence: 1 -> 2 -> 3, looping.
      const flash = gsap.timeline({ repeat: -1, repeatDelay: 0.9, paused: true })
      lights.forEach((light) => {
        flash
          .to(light, { opacity: 1, duration: 0.12 })
          .to(light, { opacity: 0.1, duration: 0.18 })
          .to(light, { opacity: 1, duration: 0.12 })
          .to(light, { opacity: 0.1, duration: 0.3 })
      })

      const tl = gsap.timeline()
      // 1. Empty entrance pops up
      tl.to(stage, { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 1.1, ease: 'expo.out' }, 0)
        .to('[data-header]', { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.5)
        .to(letters, { yPercent: 0, autoAlpha: 1, duration: 0.9, stagger: 0.07, ease: 'power4.out' }, 0.8)
        .to('[data-tagline]', { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 1.2)

      // 2. Cars roll in from their brochure positions
      tl.to(wrappers.red, { xPercent: 0, duration: 2.0, ease: 'power3.out' }, TIMING.red.start)
        .to(wrappers.blue, { xPercent: 0, duration: 2.0, ease: 'power3.out' }, TIMING.blue.start)
        .to(wrappers.white, { autoAlpha: 1, scale: 1, yPercent: 0, duration: 2.0, ease: 'power2.out' }, TIMING.white.start)

      CAR_KEYS.forEach((k) => {
        const { start, land } = TIMING[k]
        const carBlurs = blurs.filter((b) => b.dataset.blur === k)
        const carSpin = gsap.to(spinners.filter((s) => s.dataset.spin === k), {
          rotation: 360, duration: 0.35, ease: 'none', repeat: -1, paused: true,
        })
        // Spoke pattern over each tyre rotates while the car rolls and slows to a stop on landing.
        tl.to(carBlurs, { opacity: 1, duration: 0.4, ease: 'power1.out' }, start)
          .call(() => carSpin.play(), [], start)
          .to(carSpin, { timeScale: 0, duration: 0.6, ease: 'power2.out' }, land - 0.6)
          .to(carBlurs, { opacity: 0, duration: 0.6, ease: 'power2.out' }, land - 0.4)
          .call(() => { smokeTimers[k] = window.setInterval(() => spawnSmoke(k), 80) }, [], start)
          .call(() => window.clearInterval(smokeTimers[k]), [], land)
      })

      // 3. Headlights start blinking once all three cars have landed
      tl.call(() => flash.play(), [], Math.max(...CAR_KEYS.map((k) => TIMING[k].land)) + 0.1)
    }, el)

    return () => {
      Object.values(smokeTimers).forEach((t) => window.clearInterval(t))
      ctx.revert()
    }
  }, [])

  return (
    <section ref={root} className="relative h-screen w-full overflow-hidden bg-[#05070d] grid place-items-center">
      <div
        data-stage
        className="relative overflow-hidden"
        style={{
          width: 'max(100vw, calc(100vh * 1.3523))',
          flex: 'none',
          aspectRatio: `${STAGE.w} / ${STAGE.h}`,
          containerType: 'inline-size',
        }}
      >
        <img src="/hero/backdrop.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />

        {CAR_KEYS.map((car) => {
          const c = CARS[car]
          return (
            <div
              key={car}
              data-car={car}
              className="absolute will-change-transform"
              style={{ left: pct(c.x, STAGE.w), top: pct(c.y, STAGE.h), width: pct(c.w, STAGE.w) }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute"
                style={{
                  left: '4%',
                  width: '92%',
                  top: '86%',
                  height: '16%',
                  background:
                    'radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0) 72%)',
                  filter: 'blur(3px)',
                }}
              />
              <img src={`/hero/${c.file}`} alt={c.alt} className="block h-auto w-full select-none" draggable={false} />

              {WHEELS.filter((w) => w.car === car).map((w) => {
                const rx = w.r / 0.62
                const ry = rx * w.k
                return (
                  <div
                    key={w.file}
                    data-blur={car}
                    className="pointer-events-none absolute"
                    style={{
                      left: pct(w.cx - rx, c.w),
                      top: pct(w.cy - ry, c.h),
                      width: pct(2 * rx, c.w),
                      height: pct(2 * ry, c.h),
                      borderRadius: '50%',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      data-spin={car}
                      className="absolute inset-0"
                      style={{
                        borderRadius: '50%',
                        background:
                          'repeating-conic-gradient(from 0deg, rgba(225,225,230,0.75) 0deg 14deg, rgba(60,60,66,0.0) 14deg 60deg)',
                        filter: 'blur(1.5px)',
                        WebkitMaskImage: 'radial-gradient(closest-side, rgba(0,0,0,0) 35%, #000 70%, #000 92%, rgba(0,0,0,0) 100%)',
                        maskImage: 'radial-gradient(closest-side, rgba(0,0,0,0) 35%, #000 70%, #000 92%, rgba(0,0,0,0) 100%)',
                      }}
                    />
                  </div>
                )
              })}

              {LIGHTS.map((l, i) => (l.car === car ? (
                <div
                  key={i}
                  data-light
                  className="pointer-events-none absolute mix-blend-screen"
                  style={{
                    left: pct(l.cx - l.w / 2, c.w),
                    top: pct(l.cy - (l.w * 0.45) / 2, c.h),
                    width: pct(l.w, c.w),
                    height: pct(l.w * 0.45, c.h),
                    background:
                      'radial-gradient(closest-side, rgba(255,255,240,1), rgba(255,248,210,0.6) 45%, rgba(255,240,180,0) 100%)',
                  }}
                />
              ) : null))}
            </div>
          )
        })}

        <div data-header className="fixed left-[3vw] top-[4vh] z-10 text-white">
          <div className="font-extrabold tracking-wide text-[#e0202a]" style={{ fontSize: 'clamp(28px, 4.2vw, 96px)', lineHeight: 1 }}>HONDA</div>
          <div className="mt-[0.6vw] font-light italic" style={{ fontSize: 'clamp(11px, 1.2vw, 26px)' }}>The Power of Dreams</div>
        </div>
        <div data-header className="fixed right-[3vw] top-[4vh] z-10 text-right text-white">
          <div className="font-semibold" style={{ fontSize: 'clamp(16px, 2.2vw, 48px)' }}>How we move you.</div>
          <div className="tracking-[0.2em] opacity-80" style={{ fontSize: 'clamp(9px, 0.95vw, 20px)' }}>CREATE ▸ TRANSCEND, AUGMENT</div>
        </div>

        <div
          data-tagline
          className="absolute left-1/2 top-[11%] -translate-x-1/2 whitespace-nowrap font-light tracking-[0.25em] text-white"
          style={{ fontSize: '2.1cqw' }}
        >
          WHERE CLASS MEETS THRILL
        </div>

        <div
          className="absolute left-[47.7%] top-[16%] -translate-x-1/2 font-semibold leading-none text-white"
          style={{ fontSize: '17cqw', letterSpacing: '-0.01em' }}
          aria-label="CIVIC"
        >
          {CIVIC.map((ch, i) => (
            <span key={i} className="inline-block overflow-hidden align-top">
              <span data-letter className="inline-block">{ch}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
