// Coordinates are in pixels of the source brochure photo, re-based to the hero stage.
// Stage = the brochure area of the photo (1190 x 880).
export const STAGE = { w: 1190, h: 880 }

export type CarKey = 'red' | 'white' | 'blue'

// Position (stage px) and size (px) of each car cut-out.
export const CARS: Record<CarKey, { x: number; y: number; w: number; h: number; file: string; alt: string }> = {
  red: { x: -10, y: 430, w: 640, h: 320, file: 'red.webp', alt: 'Civic RS in red' },
  white: { x: 480, y: 400, w: 290, h: 155, file: 'white.webp', alt: 'Civic in white' },
  blue: { x: 685, y: 420, w: 465, h: 240, file: 'blue.webp', alt: 'Civic Oriel in blue' },
}

// Wheel centre (car-local px) and radius, used for the spinning rims.
export const WHEELS: { car: CarKey; file: string; cx: number; cy: number; r: number }[] = [
  { car: 'red', file: 'wheel_red_f.webp', cx: 265, cy: 235, r: 58 },
  { car: 'red', file: 'wheel_red_r.webp', cx: 45, cy: 185, r: 42 },
  { car: 'blue', file: 'wheel_blue_f.webp', cx: 268, cy: 183, r: 36 },
  { car: 'white', file: 'wheel_white_f.webp', cx: 150, cy: 120, r: 30 },
  { car: 'white', file: 'wheel_white_r.webp', cx: 262, cy: 85, r: 22 },
]

// Tyre contact points (car-local px) where tyre smoke is emitted.
export const SMOKE: Record<CarKey, [number, number][]> = {
  red: [[265, 300], [45, 235]],
  blue: [[268, 215]],
  white: [[150, 150], [262, 108]],
}

// Headlight centres (car-local px) and glow width, in the order they blink: 1, 2, 3.
export const LIGHTS: { car: CarKey; cx: number; cy: number; w: number }[] = [
  { car: 'red', cx: 395, cy: 152, w: 150 },
  { car: 'blue', cx: 175, cy: 125, w: 95 },
  { car: 'white', cx: 80, cy: 75, w: 70 },
]
