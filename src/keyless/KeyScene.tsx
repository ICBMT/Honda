import handRight from './assets/hand-right.png'
import handLeft from './assets/hand-left.png'
import logo from './assets/honda-logo.png'

// Honda H emblem (generated logo, transparent background).
export function Emblem({ className = '' }: { className?: string }) {
  return <img src={logo} alt="" aria-hidden="true" className={className} draggable={false} />
}

// Part one (section4-1), turned to read horizontally. Everything is placed in percentages of a
// fixed 4:3 stage (the print's proportions), measured from the print after the turn:
//   copy     x 35–46, y 20–34
//   card     centre (56.5, 42.5), tilted ~5.5°, long edge vertical
//   reader   x 32–81, y 73–98 (solid block), light side face above it at y 66–73
//   top hand (right, wrist low)   x 82–99, y 29–75
//   bottom hand (left, wrist up)  x 18–39, y 32–65
export default function KeyScene() {
  return (
    <div className="flex h-full w-screen items-center justify-center overflow-hidden bg-[#0d0f12]">
      <div
        className="relative overflow-hidden"
        style={{
          width: 'min(100vw, 133.333vh)',
          height: 'min(100vh, 75vw)',
          containerType: 'size',
          background: 'radial-gradient(ellipse 70% 60% at 78% 28%, #a3a9b2 0%, #6c727b 35%, #3a3e46 68%, #191b20 100%)',
        } as React.CSSProperties}
      >
        {/* Copy */}
        <div
          className="absolute font-light uppercase text-white/90"
          style={{ left: '35%', top: '19.6%', fontSize: '1.15cqh', lineHeight: '1.75cqh', letterSpacing: '0.06em' }}
        >
          <p className="font-semibold">CARD KEY:</p>
          <p>SMART DOOR</p>
          <p>CONTROL SYSTEM</p>
          <p>WITH THE NEW HONDA</p>
          <p>SMART KEY CARD,</p>
          <p>ELEGANT DESIGN, EASY</p>
          <p>TO CARRY, ALLOWING</p>
          <p>YOU TO LOCK AND</p>
          <p>UNLOCK THE CAR.</p>
        </div>

        {/* Card reader: light side face above, solid front face below */}
        <div className="absolute" style={{ left: '33%', top: '66%', width: '42%', height: '7%', background: 'linear-gradient(90deg, #c4c9d0, #8a9099 60%, #5d636c)' }} />
        <div
          className="absolute"
          style={{
            left: '32.1%', top: '73.1%', width: '48.9%', height: '24.9%',
            background: 'linear-gradient(180deg, #3b3f47 0%, #2a2d34 45%, #1c1e23 100%)',
            boxShadow: '0 1.5cqh 3cqh rgba(0,0,0,0.45)',
          }}
        >
          <div className="absolute inset-y-0 left-0 w-[2.2%] bg-gradient-to-r from-[#9ca2aa] to-transparent" />
        </div>

        {/* Card key: long edge vertical, tilted, floating and turning in a loop */}
        <div className="absolute" style={{ left: '48.25%', top: '19.05%', width: '16.5%', height: '46.8%', transform: 'rotate(5.5deg)' }}>
          <div className="sk-float h-full w-full [perspective:1400px]">
            <div
              className="sk-spin relative h-full w-full overflow-hidden rounded-[1.2cqw] bg-[linear-gradient(180deg,#22262d,#0c0d10_60%,#0b0c0f)] shadow-[0_2cqh_4cqh_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(255,255,255,0.07)]"
            >
              <div className="absolute inset-x-0 bottom-0 h-[6%] bg-gradient-to-r from-[#1b4f94] via-[#2d6bb8] to-[#153a70]" />
              <div className="absolute inset-[4%] rounded-[1cqw] border border-white/5" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Emblem className="w-[27%] rotate-90 drop-shadow-[0_0_0.4cqw_rgba(255,255,255,0.3)]" />
              </div>
            </div>
          </div>
        </div>

        {/* Top hand: from the right edge, turned with the print */}
        <div className="sk-reach-r pointer-events-none absolute" style={{ left: '90.5%', top: '52%', width: 0, height: 0 }}>
          <img
            src={handRight}
            alt=""
            draggable={false}
            className="absolute max-w-none select-none object-contain"
            style={{ width: '46cqh', height: '22.7cqh', left: '-23cqh', top: '-11.35cqh', transform: 'rotate(90deg)' }}
          />
        </div>

        {/* Bottom hand: from the left, reaching up toward the card */}
        <div className="sk-reach-l pointer-events-none absolute" style={{ left: '28.5%', top: '48.5%', width: 0, height: 0 }}>
          <img
            src={handLeft}
            alt=""
            draggable={false}
            className="absolute max-w-none select-none object-contain"
            style={{ width: '33cqh', height: '28cqh', left: '-16.5cqh', top: '-14cqh', transform: 'rotate(90deg)' }}
          />
        </div>
      </div>
    </div>
  )
}
