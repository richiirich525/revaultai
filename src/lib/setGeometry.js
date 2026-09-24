/*
  setGeometry — RevaultAI
  Pure helpers for placing a set on the overhead plan and describing where
  someone is standing inside it. No three.js here — the camera view builds the
  meshes; this answers the questions the plan and the prompt need.

  The stage is 100 x 100 units at 5 units per metre, centred on (50, 50), so a
  room metre and a world metre are the same thing.
*/

const UNITS_PER_METRE = 5;

export const toStage = (x, z) => ({ x: 50 + x * UNITS_PER_METRE, y: 50 + z * UNITS_PER_METRE });
export const toRoom = (stageX, stageY) => ({ x: (stageX - 50) / UNITS_PER_METRE, z: (stageY - 50) / UNITS_PER_METRE });

// Footprints for the overhead plan, in stage units.
export function planShapes(set) {
  if (!set) return { floor: null, walls: [], props: [] };
  const f = toStage(-set.floor.w / 2, -set.floor.d / 2);
  return {
    floor: { x: f.x, y: f.y, w: set.floor.w * UNITS_PER_METRE, h: set.floor.d * UNITS_PER_METRE },
    walls: set.walls.map((w) => {
      const a = toStage(w.x1, w.z1), b = toStage(w.x2, w.z2);
      return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
    }),
    props: set.props.map((p) => {
      const w = p.shape === "cyl" ? p.r * 2 : p.w;
      const d = p.shape === "cyl" ? p.r * 2 : p.d;
      const c = toStage(p.x - w / 2, p.z - d / 2);
      return { id: p.id, label: p.label, kind: p.kind ?? "prop", round: p.shape === "cyl", x: c.x, y: c.y, w: w * UNITS_PER_METRE, h: d * UNITS_PER_METRE };
    }),
  };
}

// Is this point inside the room's floor?
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
  const near = set.props
    .map((p) => ({ label: p.label, dx: p.x - x, dz: p.z - z, d: Math.hypot(p.x - x, p.z - z) }))
    .sort((a, b) => a.d - b.d);
  if (!near.length) return "";
  const first = near[0];

  if (first.d < 0.6) return `right at ${first.label}`;

  const opposite = near.slice(1).find((o) =>
    o.label !== first.label && o.d < 2.4 && (first.dx * o.dx + first.dz * o.dz) < 0
  );
  if (first.d < 1.8 && opposite) return `between ${first.label} and ${opposite.label}`;
  if (first.d < 1.8) return `beside ${first.label}`;
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