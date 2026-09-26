/*
  setVehicles — RevaultAI
  Kenney's CC0 Car Kit. The models are modelled a little small, so they're
  scaled to believable sizes, and most sit below their own origin — a sedan by
  0.3m, the delivery van by a full metre — so each carries the lift it needs to
  stand on the road rather than sink into it.
*/

export const VEHICLE_PIECES = {
  "ambulance": [2.25, 4.88, 2.85],
  "box": [1.06, 1.06, 1.06],
  "cone": [0.72, 0.72, 0.9],
  "debris-tire": [0.52, 0.9, 0.9],
  "delivery": [2.25, 4.88, 3.75],
  "firetruck": [2.25, 4.88, 2.7],
  "garbage-truck": [2.4, 5.18, 2.67],
  "hatchback-sports": [1.95, 4.28, 1.88],
  "police": [2.25, 4.35, 2.1],
  "race": [1.8, 3.84, 1.4],
  "sedan": [2.25, 3.82, 2.17],
  "sedan-sports": [1.95, 3.82, 1.88],
  "suv": [2.25, 3.82, 2.1],
  "suv-luxury": [2.25, 4.28, 2.21],
  "taxi": [2.25, 4.12, 2.47],
  "truck": [2.25, 4.43, 2.17],
  "truck-flat": [2.25, 4.12, 2.17],
  "van": [2.25, 4.12, 2.17],
};

export const VEHICLE_META = {
  "ambulance": { dir: "cars", scale: 1.5, lift: 0.3 },
  "box": { dir: "cars", scale: 1.5, lift: -0.0 },
  "cone": { dir: "cars", scale: 1.5, lift: -0.0 },
  "debris-tire": { dir: "cars", scale: 1.5, lift: 0.3 },
  "delivery": { dir: "cars", scale: 1.5, lift: 1.0 },
  "firetruck": { dir: "cars", scale: 1.5, lift: 0.3 },
  "garbage-truck": { dir: "cars", scale: 1.5, lift: 0.3 },
  "hatchback-sports": { dir: "cars", scale: 1.5, lift: 0.3 },
  "police": { dir: "cars", scale: 1.5, lift: 0.3 },
  "race": { dir: "cars", scale: 1.5, lift: 0.3 },
  "sedan": { dir: "cars", scale: 1.5, lift: 0.3 },
  "sedan-sports": { dir: "cars", scale: 1.5, lift: 0.3 },
  "suv": { dir: "cars", scale: 1.5, lift: 0.3 },
  "suv-luxury": { dir: "cars", scale: 1.5, lift: 0.3 },
  "taxi": { dir: "cars", scale: 1.5, lift: 0.3 },
  "truck": { dir: "cars", scale: 1.5, lift: 0.3 },
  "truck-flat": { dir: "cars", scale: 1.5, lift: 0.3 },
  "van": { dir: "cars", scale: 1.5, lift: 0.3 },
};