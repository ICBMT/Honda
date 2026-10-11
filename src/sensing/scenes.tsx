// Animated re-creations of the six printed Honda SENSING illustrations.
// Every scene is one SVG in an 800 x 300 space, built from the generated
// car cut-outs, so it scales cleanly to any card.
import type { FeatureCode } from './features'

const C = '/sensing/cars/'
const ROAD = '#3a3f48'
const ROAD_DARK = '#2b2f36'
const EDGE = '#f2b632'

// Yellow and white hazard stripes along the top and bottom of the road,
// as in the printed panels.
function HazardEdges({ top, bottom }: { top: number; bottom: number }) {
  return (
    <>
      {[top, bottom].map((y) => (
        <g key={y}>
          <line x1="0" x2="800" y1={y} y2={y} stroke="#f4f6f8" strokeWidth="7" />
          <line x1="0" x2="800" y1={y} y2={y} stroke={EDGE} strokeWidth="7" strokeDasharray="22 22" />
        </g>
      ))}
    </>
  )
}

// Soft contact shadow under a car so it sits on the road.
function Shadow({ cx, cy, rx }: { cx: number; cy: number; rx: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={rx * 0.07} fill="rgba(0,0,0,0.45)" />
}

function Wheel({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="spin-slow">
        <circle r="26" fill="#111" />
        <circle r="16" fill="none" stroke="#d6dbe3" strokeWidth="5" />
        <line x1="-16" x2="16" y1="0" y2="0" stroke="#d6dbe3" strokeWidth="5" />
        <line x1="0" x2="0" y1="0" y2="16" stroke="#d6dbe3" strokeWidth="5" />
      </g>
    </g>
  )
}

export function CmbsScene() {
  return (
    <svg viewBox="0 0 800 300" className="block h-full w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="cmbs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f6f9" />
          <stop offset="1" stopColor="#c7d0db" />
        </linearGradient>
      </defs>
      <rect width="800" height="300" fill="url(#cmbs-sky)" />
      <rect y="150" width="800" height="150" fill={ROAD} />
      <line x1="0" x2="800" y1="222" y2="222" stroke="#fff" strokeWidth="4" strokeDasharray="36 22" className="lane-x" />
      <Shadow cx={170} cy={200} rx={130} />
      <Shadow cx={660} cy={196} rx={120} />
      <image href={C + 'white_side.webp'} x="540" y="112" width="240" height="80" />
      <g className="cmbs-ego">
        <image href={C + 'red_side.webp'} x="40" y="112" width="250" height="86" />
        <rect x="262" y="128" width="10" height="6" rx="2" fill="#ff3b3b" className="brake-light" />
      </g>
      <polygon points="400,30 432,88 368,88" fill="#e0202a" className="blink" />
      <text x="400" y="72" textAnchor="middle" fontSize="30" fontWeight="800" fill="#fff" className="blink">!</text>
      <g className="cmbs-warn">
        <line x1="330" y1="130" x2="380" y2="130" stroke="#e0202a" strokeWidth="6" strokeLinecap="round" />
        <polyline points="372,118 386,130 372,142" fill="none" stroke="#e0202a" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M438 118 L470 142 M470 118 L438 142" stroke="#e0202a" strokeWidth="6" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function AccScene() {
  return (
    <svg viewBox="0 0 800 300" className="block h-full w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="acc-cone" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(190,235,255,0.85)" />
          <stop offset="1" stopColor="rgba(190,235,255,0)" />
        </linearGradient>
      </defs>
      <rect width="800" height="300" fill={ROAD} />
      <HazardEdges top={6} bottom={294} />
      <line x1="0" x2="800" y1="100" y2="100" stroke="#fff" strokeWidth="4" strokeDasharray="36 22" className="lane-x" />
      <line x1="0" x2="800" y1="200" y2="200" stroke="#fff" strokeWidth="4" strokeDasharray="36 22" className="lane-x" />
      {/* Top lane: car at 120 km/h */}
      <Shadow cx={205} cy={88} rx={52} />
      <image href={C + 'red_top.webp'} x="150" y="30" width="110" height="55" />
      <text x="205" y="124" textAnchor="middle" fontSize="16" fill="#fff" fontFamily="serif">@ 120 km/h</text>
      {/* Bottom lane: ego car at 80 km/h with the radar cone */}
      <polygon points="292,165 380,108 380,222" fill="url(#acc-cone)" className="cone-pulse" />
      <path d="M320 165 A46 46 0 0 1 320 118" fill="none" stroke="#dff6ff" strokeWidth="3" className="cone-pulse" />
      <path d="M340 165 A70 70 0 0 1 340 96" fill="none" stroke="#dff6ff" strokeWidth="3" className="cone-pulse" />
      <Shadow cx={230} cy={195} rx={55} />
      <image href={C + 'red_top.webp'} x="170" y="137" width="120" height="58" />
      <Shadow cx={590} cy={195} rx={55} />
      <image href={C + 'grey_top.webp'} x="530" y="137" width="120" height="55" />
      <text x="230" y="222" textAnchor="middle" fontSize="16" fill="#fff" fontFamily="serif">@ 80 km/h</text>
      <text x="590" y="222" textAnchor="middle" fontSize="16" fill="#fff" fontFamily="serif">@ 80 km/h</text>
    </svg>
  )
}

export function LcdnScene() {
  return (
    <svg viewBox="0 0 800 300" className="block h-full w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="lcdn-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6f1e7" />
          <stop offset="1" stopColor="#d9d2c2" />
        </linearGradient>
      </defs>
      <rect width="800" height="300" fill="url(#lcdn-sky)" />
      <g fill="#cfc6b3" opacity="0.8">
        <rect x="0" y="60" width="90" height="120" />
        <rect x="110" y="90" width="70" height="90" />
        <rect x="200" y="50" width="110" height="130" />
        <rect x="330" y="95" width="80" height="85" />
        <rect x="430" y="70" width="120" height="110" />
        <rect x="570" y="100" width="90" height="80" />
      </g>
      <rect y="190" width="800" height="110" fill={ROAD} />
      <line x1="0" x2="800" y1="246" y2="246" stroke="#fff" strokeWidth="4" strokeDasharray="36 22" className="lane-x" />
      {/* Traffic light: green blinks when the lead car is away */}
      <rect x="682" y="50" width="36" height="92" rx="6" fill="#222" />
      <circle cx="700" cy="72" r="8" fill="#2d3238" />
      <circle cx="700" cy="96" r="8" fill="#2d3238" />
      <circle cx="700" cy="120" r="8" fill="#33e07a" className="light-blink" />
      <Shadow cx={185} cy={262} rx={150} />
      <image href={C + 'red_side.webp'} x="30" y="150" width="310" height="106" />
    </svg>
  )
}

export function LkasScene() {
  const path = 'M120 150 C260 150 320 95 520 95 L700 95'
  return (
    <svg viewBox="0 0 800 300" className="block h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect width="800" height="300" fill={ROAD} />
      <HazardEdges top={6} bottom={294} />
      <line x1="0" x2="800" y1="50" y2="50" stroke="#fff" strokeWidth="4" />
      <line x1="0" x2="800" y1="250" y2="250" stroke="#fff" strokeWidth="4" />
      <line x1="0" x2="800" y1="150" y2="150" stroke="#fff" strokeOpacity="0.45" strokeWidth="3" strokeDasharray="36 22" className="lane-x" />
      <path d={path} fill="none" stroke="#f4f7fb" strokeWidth="6" strokeLinecap="round" pathLength="1" className="path-draw" />
      <g>
        <Shadow cx={0} cy={6} rx={56} />
        <image href={C + 'red_top.webp'} x="-60" y="-29" width="120" height="58" />
        <animateMotion dur="5s" repeatCount="indefinite" rotate="auto" path={path} />
      </g>
      <g transform="translate(640 210)"><Wheel x={0} y={0} /></g>
      <g transform="translate(700 210)"><Wheel x={0} y={0} /></g>
    </svg>
  )
}

export function RdmScene() {
  const path = 'M90 170 C210 170 270 80 420 80 L720 80'
  return (
    <svg viewBox="0 0 800 300" className="block h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect width="800" height="300" fill={ROAD} />
      <HazardEdges top={6} bottom={294} />
      <line x1="0" x2="800" y1="50" y2="50" stroke="#fff" strokeWidth="4" />
      <line x1="0" x2="800" y1="250" y2="250" stroke="#fff" strokeWidth="4" />
      <line x1="0" x2="800" y1="160" y2="160" stroke="#fff" strokeOpacity="0.45" strokeWidth="3" strokeDasharray="36 22" className="lane-x" />
      <path d={path} fill="none" stroke="#f4f7fb" strokeWidth="6" strokeLinecap="round" pathLength="1" className="path-draw" />
      <circle cx="210" cy="170" r="7" fill="#e0202a" className="fx-pulse-dot" />
      <circle cx="300" cy="120" r="7" fill="#e0202a" className="fx-pulse-dot" />
      <circle cx="420" cy="80" r="7" fill="#e0202a" className="fx-pulse-dot" />
      <g>
        <Shadow cx={0} cy={6} rx={56} />
        <image href={C + 'red_top.webp'} x="-60" y="-29" width="120" height="58" />
        <animateMotion dur="5s" repeatCount="indefinite" rotate="auto" path={path} />
      </g>
      <g transform="translate(640 210)"><Wheel x={0} y={0} /></g>
      <g transform="translate(700 210)"><Wheel x={0} y={0} /></g>
    </svg>
  )
}

function BeamIcon({ x, y, className }: { x: number; y: number; className: string }) {
  return (
    <g transform={`translate(${x} ${y})`} className={className}>
      <rect x="-22" y="-14" width="44" height="28" rx="5" fill="#2f7bff" />
      <path d="M-10 -6 A8 8 0 0 1 -10 6 Z" fill="#fff" />
      <line x1="2" x2="14" y1="-6" y2="-6" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <line x1="2" x2="14" y1="0" y2="0" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <line x1="2" x2="14" y1="6" y2="6" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </g>
  )
}

export function AhbScene() {
  return (
    <svg viewBox="0 0 800 300" className="block h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect width="800" height="300" fill={ROAD} />
      <HazardEdges top={6} bottom={294} />
      <line x1="0" x2="800" y1="100" y2="100" stroke="#fff" strokeOpacity="0.6" strokeWidth="3" strokeDasharray="30 20" className="lane-x" />
      <line x1="0" x2="800" y1="200" y2="200" stroke="#fff" strokeWidth="4" />
      <Shadow cx={300} cy={80} rx={52} />
      <image href={C + 'red_top.webp'} x="240" y="22" width="120" height="58" />
      <Shadow cx={300} cy={208} rx={52} />
      <image href={C + 'red_top.webp'} x="240" y="150" width="120" height="58" />
      <Shadow cx={620} cy={208} rx={52} />
      <image href={C + 'grey_top.webp'} x="560" y="150" width="120" height="55" />
      <BeamIcon x={300} y={108} className="blink-a" />
      <BeamIcon x={300} y={248} className="blink-b" />
    </svg>
  )
}

export function SceneFor({ code }: { code: FeatureCode }) {
  switch (code) {
    case 'CMBS': return <CmbsScene />
    case 'ACC': return <AccScene />
    case 'LCDN': return <LcdnScene />
    case 'LKAS': return <LkasScene />
    case 'RDM': return <RdmScene />
    case 'AHB': return <AhbScene />
  }
}
