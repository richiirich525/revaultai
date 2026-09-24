/*
  setCatalog — RevaultAI
  The set library: rooms as data, not as model files. Walls and furniture are
  built from primitives in the camera view, the way a previz set is blocked
  out on a real production — grey-box furniture the performers can be placed
  against, at true scale. Adding a room is one object in this list.

  Everything is in metres, with the room centred on (0, 0). Positive z is
  toward the open fourth wall, where the camera usually sits. Real sets leave
  that wall out so the camera can get back; these do the same.
*/

const GREY = "#6f6f78";
const DARK = "#4a4a52";
const WARM = "#8a7a6a";
const GLASS = "#9fc4d8";

export const SETS = [
  {
    id: "kitchen",
    name: "Kitchen",
    note: "Counter run, island, table by the window",
    floor: { w: 5.4, d: 4.2 },
    walls: [
      { x1: -2.7, z1: -2.1, x2: 2.7, z2: -2.1, h: 2.6 },
      { x1: -2.7, z1: -2.1, x2: -2.7, z2: 2.1, h: 2.6 },
      { x1: 2.7, z1: -2.1, x2: 2.7, z2: 2.1, h: 2.6 },
    ],
    props: [
      { id: "counter", label: "the counter", x: -0.6, z: -1.75, w: 3.6, d: 0.65, h: 0.92, color: GREY },
      { id: "fridge", label: "the fridge", x: 2.2, z: -1.7, w: 0.75, d: 0.7, h: 1.85, color: DARK },
      { id: "island", label: "the island", x: 0, z: -0.15, w: 2.2, d: 0.9, h: 0.95, color: GREY },
      { id: "stool-a", label: "a stool", x: -0.55, z: 0.6, r: 0.18, h: 0.75, shape: "cyl", color: DARK },
      { id: "stool-b", label: "a stool", x: 0.55, z: 0.6, r: 0.18, h: 0.75, shape: "cyl", color: DARK },
      { id: "table", label: "the table", x: -1.55, z: 1.4, w: 1.3, d: 0.85, h: 0.75, color: WARM },
      { id: "window", label: "the window", x: -1.2, z: -2.08, w: 1.5, d: 0.08, h: 1.2, y: 1.0, color: GLASS, kind: "window" },
      { id: "door", label: "the door", x: 2.66, z: 1.1, w: 0.1, d: 0.95, h: 2.05, color: WARM, kind: "door" },
    ],
  },
  {
    id: "living-room",
    name: "Living room",
    note: "Sofa, coffee table, a window on the long wall",
    floor: { w: 6.0, d: 4.6 },
    walls: [
      { x1: -3.0, z1: -2.3, x2: 3.0, z2: -2.3, h: 2.7 },
      { x1: -3.0, z1: -2.3, x2: -3.0, z2: 2.3, h: 2.7 },
      { x1: 3.0, z1: -2.3, x2: 3.0, z2: 2.3, h: 2.7 },
    ],
    props: [
      { id: "sofa", label: "the sofa", x: -0.3, z: 1.1, w: 2.3, d: 0.95, h: 0.8, color: WARM },
      { id: "coffee-table", label: "the coffee table", x: -0.3, z: -0.1, w: 1.2, d: 0.6, h: 0.42, color: DARK },
      { id: "armchair", label: "the armchair", x: 1.9, z: 0.5, w: 0.9, d: 0.9, h: 0.85, color: WARM },
      { id: "tv-unit", label: "the television", x: -0.3, z: -2.0, w: 1.8, d: 0.45, h: 0.55, color: DARK },
      { id: "shelf", label: "the bookshelf", x: -2.75, z: -0.6, w: 0.4, d: 1.6, h: 1.9, color: WARM },
      { id: "lamp", label: "the standing lamp", x: 2.4, z: 1.6, r: 0.16, h: 1.6, shape: "cyl", color: GREY },
      { id: "window", label: "the window", x: 1.4, z: -2.28, w: 1.8, d: 0.08, h: 1.4, y: 1.1, color: GLASS, kind: "window" },
      { id: "door", label: "the door", x: -2.96, z: 1.5, w: 0.1, d: 0.95, h: 2.05, color: WARM, kind: "door" },
    ],
  },
  {
    id: "office",
    name: "Office",
    note: "Desk facing the door, window behind",
    floor: { w: 5.0, d: 4.0 },
    walls: [
      { x1: -2.5, z1: -2.0, x2: 2.5, z2: -2.0, h: 2.6 },
      { x1: -2.5, z1: -2.0, x2: -2.5, z2: 2.0, h: 2.6 },
      { x1: 2.5, z1: -2.0, x2: 2.5, z2: 2.0, h: 2.6 },
    ],
    props: [
      { id: "desk", label: "the desk", x: 0, z: -0.7, w: 1.9, d: 0.85, h: 0.75, color: WARM },
      { id: "desk-chair", label: "the desk chair", x: 0, z: -1.45, r: 0.28, h: 0.95, shape: "cyl", color: DARK },
      { id: "guest-chair", label: "the visitor's chair", x: 0.5, z: 0.5, r: 0.26, h: 0.85, shape: "cyl", color: DARK },
      { id: "cabinet", label: "the filing cabinet", x: -2.25, z: -1.2, w: 0.5, d: 0.9, h: 1.3, color: GREY },
      { id: "shelf", label: "the bookshelf", x: 2.25, z: -0.5, w: 0.45, d: 1.8, h: 2.0, color: WARM },
      { id: "sofa", label: "the low sofa", x: -1.3, z: 1.4, w: 1.7, d: 0.8, h: 0.75, color: WARM },
      { id: "window", label: "the window", x: 0.2, z: -1.98, w: 2.0, d: 0.08, h: 1.3, y: 1.15, color: GLASS, kind: "window" },
      { id: "door", label: "the door", x: 2.46, z: 1.3, w: 0.1, d: 0.95, h: 2.05, color: WARM, kind: "door" },
    ],
  },
];

export function getSet(id) {
  return SETS.find((s) => s.id === id) ?? null;
}