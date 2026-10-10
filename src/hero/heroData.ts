// Coordinates are in pixels of the source brochure photo, re-based to the hero stage.
// Stage = the brochure area of the photo (1190 x 880).
export const STAGE = { w: 1190, h: 880 }

export type CarKey = 'red' | 'white' | 'blue'

// Position (stage px) and size (px) of each car cut-out.
export const CARS: Record<CarKey, { x: number; y: number; w: number; h: number; file: string; alt: string }> = {
  red: { x: -20, y: 420, w: 660, h: 340, file: 'red.webp', alt: 'Civic RS in red' },
  white: { x: 470, y: 390, w: 310, h: 175, file: 'white.webp', alt: 'Civic in white' },
  blue: { x: 675, y: 410, w: 485, h: 260, file: 'blue.webp', alt: 'Civic Oriel in blue' },
}

// Wheel centre (car-local px) and radius, used for the spinning rims.
export const WHEELS: { car: CarKey; file: string; cx: number; cy: number; r: number }[] = [
  { car: 'red', file: 'wheel_red_f.webp', cx: 275, cy: 245, r: 58 },
  { car: 'red', file: 'wheel_red_r.webp', cx: 55, cy: 195, r: 42 },
  { car: 'blue', file: 'wheel_blue_f.webp', cx: 278, cy: 193, r: 36 },
  { car: 'white', file: 'wheel_white_f.webp', cx: 160, cy: 130, r: 30 },
  { car: 'white', file: 'wheel_white_r.webp', cx: 272, cy: 95, r: 22 },
]

// Tyre contact points (car-local px) where tyre smoke is emitted.
export const SMOKE: Record<CarKey, [number, number][]> = {
  red: [[275, 310], [55, 245]],
  blue: [[278, 225]],
  white: [[160, 160], [272, 118]],
}

// Headlight centres (car-local px) and glow width, in the order they blink: 1, 2, 3.
export const LIGHTS: { car: CarKey; cx: number; cy: number; w: number }[] = [
  { car: 'red', cx: 380, cy: 165, w: 160 },
  { car: 'blue', cx: 195, cy: 130, w: 105 },
  { car: 'white', cx: 80, cy: 90, w: 80 },
]

// When each car starts rolling in and when it lands (seconds from the start).
export const TIMING: Record<CarKey, { start: number; land: number }> = {
  red: { start: 1.0, land: 3.0 },
  blue: { start: 1.15, land: 3.15 },
  white: { start: 1.4, land: 3.4 },
}
