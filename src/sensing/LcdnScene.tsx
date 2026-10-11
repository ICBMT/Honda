// LCDN (Lead Car Departure Notification): at a traffic light the lead car pulls away.
// The sensor sees it move and the driver gets an alert.
const C = '/sensing/cars/'
const ROAD = '#3a3f48'

function Shadow({ cx, cy, rx }: { cx: number; cy: number; rx: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={rx * 0.07} fill="rgba(0,0,0,0.45)" />
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

      {/* Far buildings */}
      <g fill="#cfc6b3" opacity="0.8">
        <rect x="0" y="60" width="90" height="120" />
        <rect x="110" y="90" width="70" height="90" />
        <rect x="200" y="50" width="110" height="130" />
        <rect x="330" y="95" width="80" height="85" />
        <rect x="430" y="70" width="120" height="110" />
        <rect x="570" y="100" width="90" height="80" />
      </g>

      {/* Traffic light: green, so the lead car is free to go */}
      <rect x="700" y="50" width="36" height="92" rx="6" fill="#222" />
      <circle cx="718" cy="72" r="8" fill="#2d3238" />
      <circle cx="718" cy="96" r="8" fill="#2d3238" />
      <circle cx="718" cy="120" r="8" fill="#33e07a" className="light-blink" />

      {/* Road in front of the stopped car */}
      <rect y="190" width="800" height="110" fill={ROAD} />
      <line x1="0" x2="800" y1="246" y2="246" stroke="#fff" strokeWidth="4" strokeDasharray="36 22" className="lcdn-lane" />

      {/* Lead car (white): waits, then pulls away. Drawn in front of the road. */}
      <g className="lcdn-lead">
        <Shadow cx={450} cy={252} rx={145} />
        <image href={C + 'white_side.webp'} x="300" y="150" width="300" height="101" />
      </g>

      {/* Ego car (red): stopped and watching with the sensor */}
      <Shadow cx={165} cy={262} rx={140} />
      <image href={C + 'red_side.webp'} x="30" y="162" width="270" height="91" />

      {/* Sensor field from the front of the ego car, reaching the lead car */}
      <g className="lcdn-sense">
        <path d="M 306 198 A 24 24 0 0 1 306 228" fill="none" stroke="#bfe9ff" strokeWidth="3" strokeLinecap="round" />
        <path d="M 318 186 A 42 42 0 0 1 318 240" fill="none" stroke="#bfe9ff" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        <path d="M 330 174 A 60 60 0 0 1 330 252" fill="none" stroke="#bfe9ff" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      </g>

      {/* Driver alert above the ego car */}
      <g className="lcdn-notify">
        <rect x="70" y="92" width="178" height="36" rx="18" fill="#0d1620" stroke="#33e07a" strokeWidth="2" />
        <circle cx="92" cy="110" r="6" fill="#33e07a" />
        <text x="108" y="115" fontSize="14" fontWeight="700" fill="#ffffff" fontFamily="sans-serif" letterSpacing="0.5">LEAD CAR MOVING</text>
      </g>
    </svg>
  )
}
