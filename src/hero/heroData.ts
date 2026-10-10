// Coordinates are in pixels of the brochure stage (1190 x 880).
// Car-local values are in the car image's own pixels.
export const STAGE = { w: 1190, h: 880 }

export type CarKey = 'red' | 'white' | 'blue'

// Position (stage px) and size (px) of each car image.
export const CARS: Record<CarKey, { x: number; y: number; w: number; h: number; file: string; alt: string }> = {
  red: { x: -20, y: 420, w: 660, h: 318, file: 'red.webp', alt: 'Civic RS in red' },
  white: { x: 470, y: 390, w: 310, h: 155, file: 'white.webp', alt: 'Civic in white' },
  blue: { x: 675, y: 410, w: 485, h: 240, file: 'blue.webp', alt: 'Civic Oriel in blue' },
}

// Rim discs: centre (car-local px), circular radius r, and vertical squash k
// so the spinning rim matches the tyre ellipse in the 3/4 view.
export const WHEELS: { car: CarKey; file: string; cx: number; cy: number; r: number; k: number }[] = [
  { car: 'red', file: 'wheel_red_f.webp', cx: 275, cy: 243, r: 32, k: 1.231 },
  { car: 'red', file: 'wheel_red_r.webp', cx: 45, cy: 195, r: 16, k: 1.8 },
  { car: 'blue', file: 'wheel_blue_f.webp', cx: 290, cy: 185, r: 19, k: 1.333 },
  { car: 'white', file: 'wheel_white_f.webp', cx: 160, cy: 115, r: 16, k: 1.2 },
  { car: 'white', file: 'wheel_white_r.webp', cx: 290, cy: 75, r: 9, k: 1.429 },
]

// Tyre contact points (car-local px) where tyre smoke is emitted.
export const SMOKE: Record<CarKey, [number, number][]> = {
  red: [[275, 308], [45, 240]],
  blue: [[290, 226], [455, 186]],
  white: [[160, 146], [290, 90]],
}

// Headlight centres (car-local px) and glow width, in the order they blink: 1, 2, 3.
export const LIGHTS: { car: CarKey; cx: number; cy: number; w: number }[] = [
  { car: 'red', cx: 400, cy: 155, w: 150 },
  { car: 'blue', cx: 185, cy: 120, w: 95 },
  { car: 'white', cx: 100, cy: 85, w: 70 },
]

// When each car starts rolling in and when it lands (seconds from the start).
export const TIMING: Record<CarKey, { start: number; land: number }> = {
  red: { start: 1.0, land: 3.0 },
  blue: { start: 1.15, land: 3.15 },
  white: { start: 1.4, land: 3.4 },
}
