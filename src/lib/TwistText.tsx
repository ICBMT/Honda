import { createElement, useRef, type CSSProperties } from 'react'
import gsap from 'gsap'

type Tag = 'span' | 'div' | 'p' | 'h2' | 'h3'

// Hover text: each letter flips in 3D in a staggered wave and hops back into place.
export default function TwistText({
  text,
  as = 'span',
  className = '',
  style,
}: {
  text: string
  as?: Tag
  className?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLElement>(null)

  const play = () => {
    const letters = ref.current?.querySelectorAll<HTMLElement>('[data-ch]')
    if (!letters || !letters.length) return
    gsap.killTweensOf(letters)
    gsap.fromTo(
      letters,
      { rotationX: 0, rotationY: 0, y: 0 },
      {
        rotationX: 360,
        rotationY: 25,
        y: -6,
        duration: 0.55,
        ease: 'back.out(1.8)',
        stagger: { each: 0.035, from: 'start' },
        yoyo: true,
        repeat: 1,
        clearProps: 'transform',
      },
    )
  }

  return createElement(
    as,
    {
      ref,
      className: `inline-block whitespace-pre ${className}`,
      style: { perspective: 500, ...style },
      onPointerEnter: play,
      'aria-label': text,
    },
    [...text].map((ch, i) =>
      createElement(
        'span',
        {
          key: i,
          'data-ch': true,
          'aria-hidden': true,
          className: 'inline-block',
          style: { transformStyle: 'preserve-3d', transformOrigin: '50% 50%' },
        },
        ch === ' ' ? '\u00A0' : ch,
      ),
    ),
  )
}
