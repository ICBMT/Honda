// Text taken from the printed Honda SENSING brochure.
export type FeatureCode = 'CMBS' | 'ACC' | 'LCDN' | 'LKAS' | 'RDM' | 'AHB'

export const FEATURES: { code: FeatureCode; title: string; text: string }[] = [
  {
    code: 'CMBS',
    title: 'Collision Mitigation Braking System',
    text: 'This system detects preceding cars, oncoming cars, motorbikes and pedestrians to support collision avoidance by using a front wide view camera.',
  },
  {
    code: 'ACC',
    title: 'Adaptive Cruise Control (Low-Speed Follow)',
    text: 'Adaptive Cruise Control is a support function to keep a distance with a preceding car. When driving on a highway, the system supports acceleration and braking operation to reduce load on the driver.',
  },
  {
    code: 'LCDN',
    title: 'Lead Car Departure Notification System',
    text: 'At stops such as at a traffic light, it is a function to notify the driver about the departure of a preceding car.',
  },
  {
    code: 'LKAS',
    title: 'Lane Keeping Assist System',
    text: "LKAS is a function that reduces the driver's load by supporting steering operation to keep driving along the center of a lane while driving.",
  },
  {
    code: 'RDM',
    title: 'Road Departure Mitigation System',
    text: 'Road Departure Mitigation, or RDM System supports steering operation when the vehicle is likely to stray from the Road.',
  },
  {
    code: 'AHB',
    title: 'Auto High Beam',
    text: 'When the headlight control is in the AUTO position, this system automatically turns on the high beam when there are no other vehicles detected. When another vehicle is detected, the high beam is automatically switched to low.',
  },
]
