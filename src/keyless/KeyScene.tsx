import TwistText from '../lib/TwistText'

// Honda wing-H emblem, simplified.
export function Emblem({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 80" className={className} aria-hidden="true">
      <path d="M50 4 C36 16 24 20 6 20 L6 27 C24 29 33 33 37 41 L37 76 L45 76 L45 52 L55 52 L55 76 L63 76 L63 41 C67 33 76 29 94 27 L94 20 C76 20 64 16 50 4 Z" fill="currentColor" />
    </svg>
  )
}

// Chrome hand, stylised: a palm with four fingers reaching in one direction.
function Hand({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 320 240" className="h-full w-full" style={{ transform: flip ? 'scaleX(-1)' : undefined }} aria-hidden="true">
      <defs>
        <linearGradient id="sk-chrome" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f6f9" />
          <stop offset="0.35" stopColor="#7b828c" />
          <stop offset="0.6" stopColor="#1e222a" />
          <stop offset="0.82" stopColor="#e9edf3" />
          <stop offset="1" stopColor="#50565f" />
        </linearGradient>
      </defs>
      <g fill="url(#sk-chrome)">
        <ellipse cx="110" cy="170" rx="82" ry="60" transform="rotate(-18 110 170)" />
        <rect x="150" y="72" width="26" height="110" rx="13" transform="rotate(-38 163 127)" />
        <rect x="168" y="86" width="24" height="104" rx="12" transform="rotate(-30 180 138)" />
        <rect x="186" y="104" width="22" height="92" rx="11" transform="rotate(-22 197 150)" />
        <rect x="112" y="130" width="22" height="80" rx="11" transform="rotate(-42 123 170)" />
      </g>
    </svg>
  )
}

// Part one: the card key turns slowly in a loop and rises and falls, with a hand reaching in from each side.
export default function KeyScene() {
  return (
    <div className="relative h-full w-screen overflow-hidden bg-[radial-gradient(ellipse_at_40%_30%,#4a505b_0%,#23272f_45%,#0c0e13_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_60%_80%,rgba(60,140,255,0.12),transparent_60%)]" />

      <div className="absolute left-[4vw] top-[8vh] max-w-[28vw]">
        <p className="text-[clamp(11px,1vw,15px)] font-light tracking-[0.3em] text-white/80"><TwistText text="HONDA" /></p>
        <h2 className="mt-[1.5vh] text-[clamp(36px,5vw,84px)] font-bold leading-none tracking-[0.03em]"><TwistText text="SMART KEY" /></h2>
      </div>

      {/* Card key with its hands */}
      <div className="absolute left-[40%] top-[46%] w-[min(34vw,52vh)] -translate-x-1/2 -translate-y-1/2" style={{ perspective: 1400 }}>
        <div className="sk-float">
          <div className="sk-spin relative aspect-[1.585] w-full">
            {/* Front: black card, blue edge, Honda emblem */}
            <div className="sk-face overflow-hidden rounded-[2.2vmin] bg-gradient-to-br from-[#2b3442] via-[#0d0f14] to-[#050608] p-[1.4vmin] shadow-[0_3vh_6vh_rgba(0,0,0,0.6)]">
              <div className="flex h-full w-full items-center justify-center rounded-[1.6vmin] border border-white/5 bg-[linear-gradient(160deg,#15181f,#07080b)]">
                <Emblem className="h-[26%] w-auto text-white drop-shadow-[0_0_1.2vmin_rgba(255,255,255,0.35)]" />
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-[7%] bg-gradient-to-l from-[#4d8dff] to-transparent opacity-70" />
            </div>
            {/* Back */}
            <div className="sk-face sk-back rounded-[2.2vmin] bg-[linear-gradient(160deg,#0f1218,#040507)] p-[1.4vmin]">
              <div className="h-[18%] w-full rounded-sm bg-white/5" />
              <div className="mt-[6%] h-[2%] w-[60%] rounded-full bg-white/10" />
              <div className="mt-[2%] h-[2%] w-[40%] rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      </div>

      {/* Hands reaching from either side */}
      <div className="sk-hand-l pointer-events-none absolute bottom-[-4vh] left-[18vw] h-[46vh] w-[24vw]"><Hand /></div>
      <div className="sk-hand-r pointer-events-none absolute right-[30vw] top-[-2vh] h-[40vh] w-[22vw]"><Hand flip /></div>

      {/* Card reader, as in the print */}
      <div className="absolute right-[6vw] top-[22vh] h-[56vh] w-[18vw] rounded-sm bg-gradient-to-r from-[#8d939c] via-[#3a3f47] to-[#15181d] shadow-[inset_0_0_6vmin_rgba(0,0,0,0.5)]">
        <div className="absolute left-[22%] top-[44%] h-[12%] w-[4px] bg-gradient-to-b from-[#4d8dff] via-[#2b6bd6] to-transparent" />
      </div>

      <div className="absolute bottom-[8vh] left-[4vw] max-w-[24vw] text-[clamp(10px,0.95vw,14px)] leading-relaxed tracking-[0.08em] text-white/80">
        <p className="font-bold">CARD KEY:</p>
        <p>SMART DOOR CONTROL SYSTEM WITH THE NEW HONDA SMART KEY CARD. ELEGANT DESIGN, EASY TO CARRY, ALLOWING YOU TO LOCK AND UNLOCK THE CAR.</p>
      </div>
    </div>
  )
}
