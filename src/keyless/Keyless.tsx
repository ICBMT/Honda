import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import KeyScene from './KeyScene'
import EntryScene from './EntryScene'
import './keyless.css'

gsap.registerPlugin(ScrollTrigger)

// Section 4: pinned, scrolling right to left. Part one starts in view on the right; part two slides in from the left.
export default function Keyless() {
  const wrap = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)

  // Pause the looping card, hand and reader animations while the section is off screen.
  useEffect(() => {
    const el = wrap.current!
    const io = new IntersectionObserver(([entry]) => {
      el.classList.toggle('kl-idle', !entry.isIntersecting)
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useLayoutEffect(() => {
    const el = wrap.current!
    const ctx = gsap.context(() => {
      gsap.fromTo(track.current, { xPercent: -50 }, {
        xPercent: 0,
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
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={wrap} className="relative h-screen w-full overflow-hidden bg-[#0b0d12] text-white" aria-label="Smart key">
      <div ref={track} className="flex h-full w-[200vw] flex-row-reverse">
        <KeyScene />
        <EntryScene />
      </div>
    </section>
  )
}
