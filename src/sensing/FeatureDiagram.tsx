import type { Overlay } from './features'

// Positions are fractions of the artwork, so highlights stay on the right spot at any size.
function OverlayDot({ o }: { o: Overlay }) {
  const style = { left: `${o.x * 100}%`, top: `${o.y * 100}%` }
  switch (o.kind) {
    case 'warn':
      return <span className="fx-ring fx-warn" style={style} />
    case 'cone':
      return <span className="fx-ring fx-cone" style={style} />
    case 'green':
      return <span className="fx-ring fx-green" style={style} />
    case 'wheel':
      return <span className="fx-wheel" style={style} />
    case 'dot':
      return <span className="fx-ring fx-dot" style={style} />
    case 'blue':
      return <span className="fx-ring fx-blue" style={style} />
  }
}

export default function FeatureImage({ img, ratio, overlays }: { img: string; ratio: number; overlays: Overlay[] }) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden">
      <div className="relative h-full" style={{ aspectRatio: `${ratio}` }}>
        <img src={img} alt="" className="block h-full w-full select-none object-fill" draggable={false} />
        <span className="fx-shine" />
        {overlays.map((o, i) => (
          <OverlayDot key={i} o={o} />
        ))}
      </div>
    </div>
  )
}
