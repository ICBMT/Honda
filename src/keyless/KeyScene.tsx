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

        {/* Card reader: premium matte block, bevelled top edge, brushed grain and a soft sheen */}
        <div className="absolute" style={{ left: '33%', top: '66%', width: '42%', height: '7%', background: 'linear-gradient(180deg, #d6dbe2 0%, #9aa1ab 45%, #5f666f 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(0,0,0,0.35)' }} />
        <div
          className="absolute overflow-hidden"
          style={{
            left: '32.1%', top: '73.1%', width: '48.9%', height: '24.9%',
            background: 'linear-gradient(180deg, #41464f 0%, #2c3038 22%, #22252c 60%, #181a1f 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), inset 1px 0 0 rgba(255,255,255,0.08), inset 0 -2px 4px rgba(0,0,0,0.6), 0 3cqh 6cqh rgba(0,0,0,0.6)',
          }}
        >
          {/* brushed grain */}
          <div className="absolute inset-0 opacity-[0.35] mix-blend-overlay" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0) 1px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0) 3px)' }} />
          {/* soft diagonal sheen */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.09) 46%, rgba(255,255,255,0) 60%)' }} />
          {/* lit left edge */}
          <div className="absolute inset-y-0 left-0 w-[1.6%]" style={{ background: 'linear-gradient(90deg, rgba(200,206,214,0.55), rgba(200,206,214,0))' }} />
          {/* soft falloff at the bottom */}
          <div className="absolute inset-x-0 bottom-0 h-[30%]" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.35), rgba(0,0,0,0))' }} />
        </div>
        {/* soft floor shadow under the reader */}
        <div className="absolute" style={{ left: '30%', top: '97%', width: '52%', height: '4%', background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55), rgba(0,0,0,0) 70%)' }} />

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

        {/* Top hand: enters from the right, fingers reaching down-left toward the card */}
        <img
          src={handRight}
          alt=""
          draggable={false}
          className="sk-reach-r pointer-events-none absolute max-w-none select-none"
          style={{
            width: '30cqw', left: '66%', top: '24%', transform: 'rotate(-18deg)',
            WebkitMaskImage: 'linear-gradient(90deg, #000 70%, transparent 100%)',
            maskImage: 'linear-gradient(90deg, #000 70%, transparent 100%)',
          } as React.CSSProperties}
        />

        {/* Bottom hand: enters from the left, palm up, fingers reaching up-right toward the card */}
        <img
          src={handLeft}
          alt=""
          draggable={false}
          className="sk-reach-l pointer-events-none absolute max-w-none select-none"
          style={{
            width: '34cqw', left: '2%', top: '40%', transform: 'rotate(-32deg)',
            WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 25%), linear-gradient(0deg, transparent 0%, #000 25%)',
            WebkitMaskComposite: 'source-in',
            maskImage: 'linear-gradient(90deg, transparent 0%, #000 25%), linear-gradient(0deg, transparent 0%, #000 25%)',
            maskComposite: 'intersect',
          } as React.CSSProperties}
        />
      </div>
    </div>
  )
}
