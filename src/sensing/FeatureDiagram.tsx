import type { FeatureCode } from './features'

// Side-view car drawn in a 100 x 36 box, origin at its top-left.
function SideCar({ x, y, color, className }: { x: number; y: number; color: string; className?: string }) {
  return (
    <g transform={`translate(${x} ${y})`} className={className}>
      <path
        d="M0 28 Q2 20 14 18 L36 12 Q46 2 66 2 L78 12 Q92 16 98 22 L100 30 Q100 36 94 36 L80 36 A10 10 0 0 0 60 36 L40 36 A10 10 0 0 0 20 36 L6 36 Q0 36 0 30 Z"
        fill={color}
      />
      <path d="M38 13 Q46 6 62 6 L70 13 Z" fill="#0b1220" opacity="0.8" />
      <g>
        <circle cx="20" cy="36" r="9" fill="#111" />
        <circle cx="20" cy="36" r="4" fill="#9aa4b2" className="wheel-spin" style={{ transformOrigin: '20px 36px', transformBox: 'view-box' }} />
        <circle cx="80" cy="36" r="9" fill="#111" />
        <circle cx="80" cy="36" r="4" fill="#9aa4b2" className="wheel-spin" style={{ transformOrigin: '80px 36px', transformBox: 'view-box' }} />
      </g>
    </g>
  )
}

// Top-view car drawn horizontally around (0,0), front toward +x.
function TopCar({ x, y, angle = 0, color }: { x: number; y: number; angle?: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <rect x="-23" y="-11" width="46" height="22" rx="8" fill={color} />
      <rect x="-2" y="-8" width="11" height="16" rx="3" fill="#0b1220" opacity="0.85" />
      <rect x="-14" y="-8" width="8" height="16" rx="2" fill="#0b1220" opacity="0.7" />
      <rect x="-24" y="-14" width="6" height="4" rx="1" fill="#111" />
      <rect x="-24" y="10" width="6" height="4" rx="1" fill="#111" />
      <rect x="14" y="-14" width="6" height="4" rx="1" fill="#111" />
      <rect x="14" y="10" width="6" height="4" rx="1" fill="#111" />
    </g>
  )
}

function Road({ y = 110, h = 50 }: { y?: number; h?: number }) {
  return (
    <>
      <rect x="0" y={y} width="300" height={h} fill="#161b25" />
      <line x1="0" x2="300" y1={y + h / 2} y2={y + h / 2} stroke="#e8eaf0" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="14 12" className="lane-flow-x" />
    </>
  )
}

export default function FeatureDiagram({ code }: { code: FeatureCode }) {
  switch (code) {
    case 'CMBS':
      return (
        <svg viewBox="0 0 300 160" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          <rect width="300" height="160" fill="#0c1018" />
          <Road />
          <g className="cmbs-ego">
            <SideCar x={28} y={72} color="#d7262a" />
          </g>
          <SideCar x={186} y={72} color="#dfe6f0" />
          <polygon points="82,44 98,70 66,70" fill="#e0202a" className="blink" opacity="0.95" />
          <text x="82" y="64" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff" className="blink">!</text>
          <line x1="104" y1="58" x2="150" y2="58" stroke="#e0202a" strokeWidth="3" strokeLinecap="round" className="cmbs-arrow" />
        </svg>
      )

    case 'ACC':
      return (
        <svg viewBox="0 0 300 160" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          <rect width="300" height="160" fill="#0c1018" />
          <rect x="30" y="0" width="240" height="160" fill="#161b25" />
          <line x1="100" x2="100" y1="0" y2="160" stroke="#e8eaf0" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="14 12" className="lane-flow-y" />
          <line x1="200" x2="200" y1="0" y2="160" stroke="#e8eaf0" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="14 12" className="lane-flow-y" />
          <polygon points="150,100 112,52 188,52" fill="rgba(90,200,255,0.28)" className="cone-pulse" />
          <TopCar x={150} y={40} angle={-90} color="#8c96a6" />
          <TopCar x={150} y={124} angle={-90} color="#d7262a" />
          <text x="150" y="20" textAnchor="middle" fontSize="11" fill="#8fd3ff">80 km/h</text>
        </svg>
      )

    case 'LCDN':
      return (
        <svg viewBox="0 0 300 160" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          <rect width="300" height="160" fill="#0c1018" />
          <Road />
          <rect x="256" y="14" width="18" height="46" rx="4" fill="#1d222c" />
          <circle cx="265" cy="26" r="4" fill="#3a3f48" />
          <circle cx="265" cy="38" r="4" fill="#3a3f48" />
          <circle cx="265" cy="50" r="4" fill="#33e07a" className="light-blink" />
          <SideCar x={24} y={72} color="#d7262a" />
          <g className="lead-depart">
            <SideCar x={148} y={72} color="#dfe6f0" />
          </g>
        </svg>
      )

    case 'LKAS':
      return (
        <svg viewBox="0 0 300 160" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          <rect width="300" height="160" fill="#0c1018" />
          <rect x="0" y="28" width="300" height="104" fill="#161b25" />
          <line x1="0" x2="300" y1="30" y2="30" stroke="#e8eaf0" strokeWidth="2" />
          <line x1="0" x2="300" y1="130" y2="130" stroke="#e8eaf0" strokeWidth="2" />
          <line x1="0" x2="300" y1="80" y2="80" stroke="#e8eaf0" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="14 12" className="lane-flow-x" />
          <path id="lkas-path" d="M20 80 C 100 80 140 60 280 60" fill="none" stroke="#8fd3ff" strokeWidth="2" strokeDasharray="4 6" opacity="0.8" />
          <g>
            <TopCar x={0} y={0} color="#d7262a" />
            <animateMotion dur="4.5s" repeatCount="indefinite" rotate="auto" path="M20 80 C 100 80 140 60 280 60" />
          </g>
          <g transform="translate(262 120)" className="spin-slow">
            <circle r="13" fill="none" stroke="#9aa4b2" strokeWidth="3" />
            <line x1="-13" x2="13" y1="0" y2="0" stroke="#9aa4b2" strokeWidth="3" />
            <line x1="0" x2="0" y1="0" y2="13" stroke="#9aa4b2" strokeWidth="3" />
          </g>
        </svg>
      )

    case 'RDM':
      return (
        <svg viewBox="0 0 300 160" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          <rect width="300" height="160" fill="#0c1018" />
          <rect x="0" y="28" width="300" height="104" fill="#161b25" />
          <line x1="0" x2="300" y1="30" y2="30" stroke="#e8eaf0" strokeWidth="2" />
          <line x1="0" x2="300" y1="130" y2="130" stroke="#e8eaf0" strokeWidth="2" />
          <line x1="0" x2="300" y1="80" y2="80" stroke="#e8eaf0" strokeOpacity="0.4" strokeWidth="2" strokeDasharray="14 12" />
          <path d="M20 100 C 110 100 130 62 280 58" fill="none" stroke="#e0202a" strokeWidth="2" strokeDasharray="4 6" opacity="0.9" />
          <circle r="4" fill="#e0202a" className="cone-pulse">
            <animateMotion dur="4.5s" repeatCount="indefinite" path="M20 100 C 110 100 130 62 280 58" />
          </circle>
          <g>
            <TopCar x={0} y={0} color="#d7262a" />
            <animateMotion dur="4.5s" repeatCount="indefinite" rotate="auto" path="M20 100 C 110 100 130 62 280 58" />
          </g>
          <g transform="translate(262 120)" className="spin-slow">
            <circle r="13" fill="none" stroke="#9aa4b2" strokeWidth="3" />
            <line x1="-13" x2="13" y1="0" y2="0" stroke="#9aa4b2" strokeWidth="3" />
            <line x1="0" x2="0" y1="0" y2="13" stroke="#9aa4b2" strokeWidth="3" />
          </g>
        </svg>
      )

    case 'AHB':
      return (
        <svg viewBox="0 0 300 160" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          <rect width="300" height="160" fill="#0c1018" />
          <rect x="0" y="10" width="300" height="140" fill="#161b25" />
          <line x1="0" x2="300" y1="80" y2="80" stroke="#e8eaf0" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="14 12" className="lane-flow-x" />
          <TopCar x={70} y={40} color="#d7262a" />
          <TopCar x={70} y={120} color="#8c96a6" />
          <TopCar x={240} y={40} color="#3b4251" />
          <g className="blink-a">
            <rect x="92" y="34" width="10" height="12" rx="2" fill="#2f7bff" />
            <rect x="92" y="114" width="10" height="12" rx="2" fill="#2f7bff" />
          </g>
          <g className="blink-b">
            <rect x="214" y="34" width="10" height="12" rx="2" fill="#2f7bff" />
          </g>
        </svg>
      )
  }
}
