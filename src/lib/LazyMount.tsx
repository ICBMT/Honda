import { useEffect, useRef, useState, type ReactNode } from 'react'

// Renders its children only once the placeholder comes within `rootMargin` of the viewport.
// The placeholder keeps the same height so the page layout does not shift when the children mount.
// Once mounted, the children stay mounted, so a heavy scene is only ever built once.
type Props = { children: ReactNode; placeholderClass: string; rootMargin?: string }

export default function LazyMount({ children, placeholderClass, rootMargin = '100% 0px' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    if (on || !ref.current) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOn(true)
          io.disconnect()
        }
      },
      { rootMargin },
    )
    io.observe(ref.current)
    return () => io.disconnect()
  }, [on, rootMargin])

  return (
    <div ref={ref} className={on ? undefined : placeholderClass}>
      {on ? children : null}
    </div>
  )
}
