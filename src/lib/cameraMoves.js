/*
  cameraMoves — RevaultAI (Rehearsal Studio)
  A move is two marks and the time between them: where the camera starts, where
  it ends, and the fact that it eased from one to the other. The rehearsal
  already interpolates camera tracks, so a preset here writes keyframes rather
  than driving any animation of its own — which means a move can be nudged,
  re-timed or part-deleted afterwards exactly like a mark you set by hand.

  Stage units: 5 to the meter, bearings in degrees, 0 pointing up the plan.
*/

const U = 5;                       // stage units per meter
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const clampXY = (n) => Math.max(2, Math.min(98, n));

// Where the camera is looking, as a unit vector on the plan.
function forward(rotation) { return { x: Math.sin(rad(rotation)), y: -Math.cos(rad(rotation)) }; }
function rightOf(rotation) { return { x: Math.cos(rad(rotation)), y: Math.sin(rad(rotation)) }; }

function bearingTo(from, to) {
  return ((deg(Math.atan2(to.x - from.x, -(to.y - from.y))) % 360) + 360) % 360;
}

// Swing the camera around the subject, still pointing at it.
function orbit(start, subject, degrees) {
  if (!subject) return null;
  const dx = start.x - subject.x, dy = start.y - subject.y;
  const a = rad(degrees);
  const x = subject.x + dx * Math.cos(a) - dy * Math.sin(a);
  const y = subject.y + dx * Math.sin(a) + dy * Math.cos(a);
  const p = { x: clampXY(x), y: clampXY(y) };
  return { ...p, rotation: bearingTo(p, subject) };
}

// Each move returns the values for the closing mark. `start` is the camera as
// it stands, `subject` whoever it is framing (null if nobody), `base` the
// camera's own height and lens, which a move may animate away from.
export const CAMERA_MOVES = [
  {
    id: "locked", label: "Locked off", cat: "Hold",
    note: "The camera does not move at all.",
    end: () => null,
  },
  {
    id: "dolly_in", label: "Dolly in", cat: "Push",
    note: "Travels toward the subject, tightening as it goes.",
    end: (start, subject) => {
      const f = forward(start.rotation);
      // Never run past the subject: stop short of them at worst.
      const room = subject ? Math.hypot(subject.x - start.x, subject.y - start.y) - 1.2 * U : 2 * U;
      const d = Math.max(0, Math.min(2 * U, room));
      return { x: clampXY(start.x + f.x * d), y: clampXY(start.y + f.y * d) };
    },
  },
  {
    id: "dolly_out", label: "Dolly out", cat: "Push",
    note: "Pulls back, opening the frame out around the subject.",
    end: (start) => {
      const f = forward(start.rotation);
      return { x: clampXY(start.x - f.x * 2 * U), y: clampXY(start.y - f.y * 2 * U) };
    },
  },
  {
    id: "truck_left", label: "Truck left", cat: "Travel",
    note: "Slides sideways to camera left, holding its angle.",
    end: (start) => {
      const g = rightOf(start.rotation);
      return { x: clampXY(start.x - g.x * 1.5 * U), y: clampXY(start.y - g.y * 1.5 * U) };
    },
  },
  {
    id: "truck_right", label: "Truck right", cat: "Travel",
    note: "Slides sideways to camera right, holding its angle.",
    end: (start) => {
      const g = rightOf(start.rotation);
      return { x: clampXY(start.x + g.x * 1.5 * U), y: clampXY(start.y + g.y * 1.5 * U) };
    },
  },
  {
    id: "pan_left", label: "Pan left", cat: "Turn",
    note: "Turns left on the spot. Nothing travels.",
    end: (start) => ({ rotation: (start.rotation - 25 + 360) % 360 }),
  },
  {
    id: "pan_right", label: "Pan right", cat: "Turn",
    note: "Turns right on the spot. Nothing travels.",
    end: (start) => ({ rotation: (start.rotation + 25) % 360 }),
  },
  {
    id: "arc_left", label: "Arc left", cat: "Turn",
    note: "Circles the subject anticlockwise, holding them in frame.",
    needsSubject: true,
    end: (start, subject) => orbit(start, subject, -30),
  },
  {
    id: "arc_right", label: "Arc right", cat: "Turn",
    note: "Circles the subject clockwise, holding them in frame.",
    needsSubject: true,
    end: (start, subject) => orbit(start, subject, 30),
  },
  {
    id: "crane_up", label: "Crane up", cat: "Height",
    note: "Rises above the scene while it plays.",
    end: (start, subject, base) => ({ height: Math.min(6, (base.height ?? 1.55) + 1.2) }),
  },
  {
    id: "crane_down", label: "Crane down", cat: "Height",
    note: "Descends toward the floor while it plays.",
    end: (start, subject, base) => ({ height: Math.max(0.2, (base.height ?? 1.55) - 1.2) }),
  },
  {
    id: "zoom_in", label: "Zoom in", cat: "Lens",
    note: "Tightens on the lens without the camera moving — flatter than a dolly.",
    end: (start, subject, base) => ({ lens: Math.min(200, Math.round((base.lens ?? 35) * 1.8)) }),
  },
  {
    id: "zoom_out", label: "Zoom out", cat: "Lens",
    note: "Widens on the lens without the camera moving.",
    end: (start, subject, base) => ({ lens: Math.max(14, Math.round((base.lens ?? 35) / 1.8)) }),
  },
];

export const MOVE_CATEGORIES = ["Hold", "Push", "Travel", "Turn", "Height", "Lens"];

const BY_ID = Object.fromEntries(CAMERA_MOVES.map((m) => [m.id, m]));
export function getMove(id) { return id ? BY_ID[id] ?? null : null; }

// The two marks a move needs, or null when it can't be built — an arc with
// nobody to circle, or a push that has nowhere left to go.
export function moveKeys(moveId, { start, subject, base, from, to }) {
  const move = getMove(moveId);
  if (!move) return null;
  if (move.needsSubject && !subject) return null;

  const first = {
    t: from, x: start.x, y: start.y, rotation: start.rotation,
    height: base.height ?? null, lens: base.lens ?? null,
  };
  if (moveId === "locked") return { first, last: null };

  const e = move.end(start, subject, base);
  if (!e) return null;
  const last = { ...first, ...e, t: to };

  const moved = Math.hypot((last.x ?? first.x) - first.x, (last.y ?? first.y) - first.y) > 0.4;
  const turned = Math.abs((((last.rotation - first.rotation) % 360) + 540) % 360 - 180) > 1;
  const raised = Math.abs((last.height ?? 0) - (first.height ?? 0)) > 0.05;
  const zoomed = Math.abs((last.lens ?? 0) - (first.lens ?? 0)) > 1;
  if (!moved && !turned && !raised && !zoomed) return null;

  return { first, last };
}
