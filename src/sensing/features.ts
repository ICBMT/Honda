// Text and artwork taken from the printed Honda SENSING brochure.
export type FeatureCode = 'CMBS' | 'ACC' | 'LCDN' | 'LKAS' | 'RDM' | 'AHB'

export type Overlay = { x: number; y: number; kind: 'warn' | 'cone' | 'green' | 'wheel' | 'dot' | 'blue' }

export const FEATURES: {
  code: FeatureCode
  title: string
  text: string
  img: string
  ratio: number // width / height of the artwork crop
  overlays: Overlay[]
}[] = [
  {
    code: 'CMBS',
    title: 'Collision Mitigation Braking System',
    text: 'This system detects preceding cars, oncoming cars, motorbikes and pedestrians to support collision avoidance by using a front wide view camera.',
    img: '/sensing/cmbs.jpg',
    ratio: 682 / 197,
    overlays: [{ x: 0.58, y: 0.3, kind: 'warn' }],
  },
  {
    code: 'ACC',
    title: 'Adaptive Cruise Control (Low-Speed Follow)',
    text: 'Adaptive Cruise Control is a support function to keep a distance with a preceding car. When driving on a highway, the system supports acceleration and braking operation to reduce load on the driver.',
    img: '/sensing/acc.jpg',
    ratio: 639 / 199,
    overlays: [{ x: 0.66, y: 0.73, kind: 'cone' }],
  },
  {
    code: 'LCDN',
    title: 'Lead Car Departure Notification System',
    text: 'At stops such as at a traffic light, it is a function to notify the driver about the departure of a preceding car.',
    img: '/sensing/lcdn.jpg',
    ratio: 714 / 235,
    overlays: [{ x: 0.914, y: 0.196, kind: 'green' }],
  },
  {
    code: 'LKAS',
    title: 'Lane Keeping Assist System',
    text: "LKAS is a function that reduces the driver's load by supporting steering operation to keep driving along the center of a lane while driving.",
    img: '/sensing/lkas.jpg',
    ratio: 667 / 206,
    overlays: [
      { x: 0.742, y: 0.777, kind: 'wheel' },
      { x: 0.824, y: 0.777, kind: 'wheel' },
    ],
  },
  {
    code: 'RDM',
    title: 'Road Departure Mitigation System',
    text: 'Road Departure Mitigation, or RDM System supports steering operation when the vehicle is likely to stray from the Road.',
    img: '/sensing/rdm.jpg',
    ratio: 737 / 227,
    overlays: [{ x: 0.547, y: 0.287, kind: 'dot' }],
  },
  {
    code: 'AHB',
    title: 'Auto High Beam',
    text: 'When the headlight control is in the AUTO position, this system automatically turns on the high beam when there are no other vehicles detected. When another vehicle is detected, the high beam is automatically switched to low.',
    img: '/sensing/ahb.jpg',
    ratio: 680 / 216,
    overlays: [
      { x: 0.38, y: 0.384, kind: 'blue' },
      { x: 0.38, y: 0.87, kind: 'blue' },
    ],
  },
]
