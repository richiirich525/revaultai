/*
  setGeometry — RevaultAI
  Pure helpers for drawing a set on the overhead plan and describing where
  someone stands inside it. No three.js here — the camera view builds the
  meshes; this answers what the plan and the prompt need.

  The stage is 100 x 100 units at 5 units per metre, centred on (50, 50), so a
  room metre and a world metre are the same thing.
*/
import { pieceSize } from "./setCatalog.js";

const UNITS_PER_METRE = 5;

export const toStage = (x, z) => ({ x: 50 + x * UNITS_PER_METRE, y: 50 + z * UNITS_PER_METRE });
export const toRoom = (stageX, stageY) => ({ x: (stageX - 50) / UNITS_PER_METRE, z: (stageY - 50) / UNITS_PER_METRE });

// Footprints for the overhead plan, in stage units.
export function planShapes(set) {
  if (!set) return { floor: null, walls: [], props: [] };
  const rect = (x, z, w, d, extra = {}) => {
    const c = toStage(x - w / 2, z - d / 2);
    return { x: c.x, y: c.y, w: w * UNITS_PER_METRE, h: d * UNITS_PER_METRE, ...extra };
  };
  return {
    floor: rect(0, 0, set.floor.w, set.floor.d),
    walls: (set.walls ?? []).map((w, i) => {
      const s = pieceSize(w);
      return rect(w.x, w.z, s.w, s.d, { id: "w" + i, opening: w.piece !== "wall" });
    }),
    props: (set.props ?? []).map((p) => {
      const s = pieceSize(p);
      return rect(p.x, p.z, s.w, s.d, { id: p.id, label: p.label, tall: s.h > 1.4 });
    }),
  };
}

export function insideSet(set, stageX, stageY) {
  if (!set) return true;
  const { x, z } = toRoom(stageX, stageY);
  return Math.abs(x) <= set.floor.w / 2 && Math.abs(z) <= set.floor.d / 2;
}

// Where is someone standing, in words a prompt can use. "Between" means the
// two things really are on opposite sides of them, not merely both nearby.
export function describePlace(set, stageX, stageY) {
  if (!set) return "";
  const { x, z } = toRoom(stageX, stageY);
  const near = (set.props ?? [])
    .filter((p) => p.y == null)   // things sitting on a counter aren't landmarks
    .map((p) => ({ label: p.label, dx: p.x - x, dz: p.z - z, d: Math.hypot(p.x - x, p.z - z) }))
    .sort((a, b) => a.d - b.d);
  if (!near.length) return "";
  const first = near[0];

  if (first.d < 0.7) return `right at ${first.label}`;
  const opposite = near.slice(1).find((o) =>
    o.label !== first.label && o.d < 2.6 && (first.dx * o.dx + first.dz * o.dz) < 0
  );
  if (first.d < 2.0 && opposite) return `between ${first.label} and ${opposite.label}`;
  if (first.d < 2.0) return `beside ${first.label}`;
  return "in the middle of the room";
}

// A line for the prompt: the room, and where everyone is in it.
export function setSentence(set, actors) {
  if (!set) return "";
  const places = (actors ?? [])
    .map((a) => {
      const where = describePlace(set, a.x, a.y);
      return where ? `${a.name} ${where}` : null;
    })
    .filter(Boolean);
  const article = /^[aeiou]/i.test(set.name) ? "An" : "A";
  const room = `${article} ${set.name.toLowerCase()}: ${set.note.toLowerCase()}.`;
  return places.length ? `${room} ${places.join(", ")}.` : room;
}