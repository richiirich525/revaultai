/*
  setEdit — RevaultAI
  Turning a library room into your own set: move, turn, add and remove pieces,
  resize the floor. Pure functions over room data — a set is a small object,
  not a file, so saving one costs nothing.
*/
import { ALL_PIECES as PIECES, getSet } from "./setCatalog.js";

// The kit, grouped so the piece browser is navigable rather than 69 names.
const GROUPS = [
  ["Structure", /^(wall|floor|doorway|stairs)/i],
  ["Kitchen", /^(kitchen|hood|toaster)/i],
  ["Bathroom", /^(bathroom|bathtub|shower|toilet|washer|dryer)/i],
  ["Bedroom", /^(bed|cabinetBed)/i],
  ["Seating", /^(lounge|sofa|chair|stool|bench)/i],
  ["Tables", /^(table|sideTable|desk)/i],
  ["Storage", /^(bookcase|cabinet|cardboard|coatRack|trashcan)/i],
  ["Screens & sound", /^(television|computer|laptop|speaker|radio)/i],
  ["Dressing", /^(rug|plant|potted|lamp|pillow|books)/i],
  ["Buildings", /^(building|low-detail|detail-awning|detail-overhang|crypt)/i],
  ["Street", /^(road|path-|driveway|lightpost|fence-|iron-fence)/i],
  ["Nature", /^(tree|pine|grass|flower|rock|log|stump|ground_|plant_)/i],
  ["Graveyard", /^(grave|cross|pillar|lantern|stone-wall|debris|bench)/i],
];

export function pieceGroups() {
  const names = Object.keys(PIECES).sort();
  const used = new Set();
  const out = GROUPS.map(([label, test]) => {
    const items = names.filter((n) => !used.has(n) && test.test(n));
    items.forEach((n) => used.add(n));
    return { label, items };
  }).filter((g) => g.items.length);
  const rest = names.filter((n) => !used.has(n));
  if (rest.length) out.push({ label: "Other", items: rest });
  return out;
}

export const prettyName = (file) =>
  file.replace(/([a-z])([A-Z0-9])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase()).toLowerCase();

let counter = 0;
const nextId = (piece) => `${piece}-${Date.now().toString(36)}-${counter++}`;

// A working copy you can change without touching the library.
export function startEditing(room) {
  const base = typeof room === "string" ? getSet(room) : room;
  if (!base) return null;
  return {
    custom: true,
    baseId: base.baseId ?? base.id ?? null,
    name: base.custom ? base.name : `My ${base.name.toLowerCase()}`,
    note: base.note ?? "",
    floor: { ...base.floor },
    walls: (base.walls ?? []).map((w) => ({ ...w })),
    props: (base.props ?? []).map((p) => ({ ...p, id: p.id ?? nextId(p.piece) })),
  };
}

export function addPiece(room, piece, at = { x: 0, z: 0 }) {
  if (!PIECES[piece]) return room;
  const structural = /^(wall|floor|doorway|stairs)/i.test(piece);
  const item = { id: nextId(piece), piece, label: "the " + prettyName(piece), x: at.x, z: at.z, rot: 0 };
  return structural
    ? { ...room, walls: [...(room.walls ?? []), item] }
    : { ...room, props: [...(room.props ?? []), item] };
}

const edit = (room, id, change) => ({
  ...room,
  walls: (room.walls ?? []).map((w) => (w.id === id ? { ...w, ...change(w) } : w)),
  props: (room.props ?? []).map((p) => (p.id === id ? { ...p, ...change(p) } : p)),
});

export const movePiece = (room, id, x, z) =>
  edit(room, id, () => ({ x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100 }));

export const turnPiece = (room, id, by = 90) =>
  edit(room, id, (p) => ({ rot: (((p.rot ?? 0) + by) % 360 + 360) % 360 }));

export const raisePiece = (room, id, by) =>
  edit(room, id, (p) => ({ y: Math.max(0, Math.round(((p.y ?? 0) + by) * 100) / 100) || undefined }));

export const removePiece = (room, id) => ({
  ...room,
  walls: (room.walls ?? []).filter((w) => w.id !== id),
  props: (room.props ?? []).filter((p) => p.id !== id),
});

export const resizeFloor = (room, w, d) => ({
  ...room,
  floor: { w: Math.max(2, Math.min(14, Math.round(w * 10) / 10)), d: Math.max(2, Math.min(14, Math.round(d * 10) / 10)) },
});

// What a saved set carries — small enough that a row is a few kilobytes.
export function packSet(room) {
  return {
    name: String(room.name || "My set").slice(0, 80),
    note: String(room.note || "").slice(0, 200),
    baseId: room.baseId ?? null,
    floor: room.floor,
    walls: room.walls ?? [],
    props: room.props ?? [],
  };
}

export function unpackSet(row) {
  return { custom: true, id: "my:" + row.id, savedId: row.id, ...row.data };
}

// The room a rehearsal is actually using: a custom one if it has one.
export function activeRoom(r) {
  return r?.setCustom ?? getSet(r?.setId) ?? null;
}