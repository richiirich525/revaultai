import { MAX_ACTORS } from "./rehearsal.js";
import { getAction } from "./actions.js";
import { BODIES } from "./performers.js";
import { LIGHT_PRESETS, defaultLight } from "./lighting.js";
import { getSet } from "./setCatalog.js";

/*
  shareSanitize — RevaultAI

  A link that opens a blocked scene for anyone, with or without an account.

  The whole of this file exists for one reason: a shared scene is a stranger's
  JSON, and it goes straight into the studio, which then hands it to three.js.
  So nothing from a share is trusted. sanitize() is a whitelist, not a filter
  — it builds a new rehearsal out of only the fields it recognises, coercing
  every number and capping every array. Anything unrecognised is dropped
  rather than passed along.

  It runs twice on purpose: before writing, so a share is small and sane, and
  again after reading, because the row might have been written by a version of
  this code that no longer exists, or by somebody going round it.

  Kept free of the Supabase client on purpose, so the rules can be tested
  in plain node against hostile input rather than only in a browser.
*/

const MAX_CAMERAS = 4;
const MAX_KEYS = 240;
const MAX_BEATS = 64;
const MAX_EXTRAS = 64;
const MAX_PIECES = 260;
const MAX_BYTES = 380_000;
const POSES = new Set(["stand", "sit", "crouch"]);
const ASPECTS = new Set(["16:9", "2.39:1", "9:16", "1:1", "4:3", "3:4", "21:9"]);
const PRESETS = new Set(LIGHT_PRESETS.map((p) => p.id));
const BODY_SET = new Set(BODIES);

const num = (v, lo, hi, dflt) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(hi, Math.max(lo, n));
};
const text = (v, max, dflt = "") => (typeof v === "string" ? v.slice(0, max) : dflt);
const list = (v, cap) => (Array.isArray(v) ? v.slice(0, cap) : []);

function actorKey(k, duration) {
  return {
    t: num(k?.t, 0, duration, 0),
    x: num(k?.x, 0, 100, 50),
    y: num(k?.y, 0, 100, 50),
    facing: num(k?.facing, -720, 720, 0),
    pose: POSES.has(k?.pose) ? k.pose : "stand",
    // An unrecognised action would not crash the studio, but it would be a
    // direction nobody can see. Only ones in the library survive.
    action: k?.action && getAction(k.action) ? k.action : null,
  };
}

function cameraKey(k, duration) {
  const out = {
    t: num(k?.t, 0, duration, 0),
    x: num(k?.x, 0, 100, 50),
    y: num(k?.y, 0, 100, 50),
    rotation: num(k?.rotation, -720, 720, 0),
  };
  if (k?.height != null) out.height = num(k.height, 0.1, 8, 1.55);
  if (k?.lens != null) out.lens = num(k.lens, 8, 300, 35);
  return out;
}

// Keys must be in order, start at zero and not pile up on one instant, or
// stateAt interpolates between marks that make no sense.
function keysOf(raw, duration, mapper) {
  const keys = list(raw, MAX_KEYS)
    .map((k) => mapper(k, duration))
    .sort((a, b) => a.t - b.t)
    .filter((k, i, all) => i === 0 || k.t - all[i - 1].t > 0.01);
  if (!keys.length) return null;
  keys[0] = { ...keys[0], t: 0 };
  return keys;
}

function piece(p, withId) {
  const out = {
    piece: text(p?.piece, 64),
    x: num(p?.x, -40, 40, 0),
    z: num(p?.z, -40, 40, 0),
    rot: num(p?.rot, -360, 360, 0),
  };
  if (!out.piece) return null;
  if (withId) {
    out.id = text(p?.id, 64) || out.piece + ":" + Math.random().toString(36).slice(2, 8);
    const label = text(p?.label, 80);
    if (label) out.label = label;
    const asked = text(p?.asked, 200);
    if (asked) out.asked = asked;
  }
  return out;
}

function setCustom(raw) {
  if (!raw || typeof raw !== "object") return null;
  const floor = raw.floor && typeof raw.floor === "object"
    ? {
        w: num(raw.floor.w, 1, 60, 6),
        d: num(raw.floor.d, 1, 60, 4),
        x: num(raw.floor.x, -40, 40, 0),
        z: num(raw.floor.z, -40, 40, 0),
      }
    : null;
  return {
    custom: true,
    // A saved set belongs to whoever saved it, so a share never carries the
    // row id — the scene travels, the other person's library does not.
    baseId: text(raw.baseId, 64) || null,
    name: text(raw.name, 80) || "Shared set",
    note: text(raw.note, 200) || undefined,
    floor,
    walls: list(raw.walls, MAX_PIECES).map((w) => piece(w, false)).filter(Boolean),
    props: list(raw.props, MAX_PIECES).map((p) => piece(p, true)).filter(Boolean),
  };
}

export function sanitize(raw) {
  if (!raw || typeof raw !== "object") return null;
  const duration = num(raw.duration, 1, 60, 8);

  const actors = list(raw.actors, MAX_ACTORS)
    .map((a, i) => {
      const keys = keysOf(a?.keys, duration, actorKey);
      if (!keys) return null;
      const body = BODY_SET.has(a?.body) ? a.body : undefined;
      return {
        id: text(a?.id, 40) || "a" + i,
        name: text(a?.name, 24) || String.fromCharCode(65 + i),
        color: /^#[0-9a-fA-F]{6}$/.test(a?.color ?? "") ? a.color : "#7B3FE4",
        ...(body ? { body } : {}),
        keys,
      };
    })
    .filter(Boolean);
  if (!actors.length) return null;

  const cameras = list(raw.cameras, MAX_CAMERAS)
    .map((c, i) => {
      const keys = keysOf(c?.keys, duration, cameraKey);
      if (!keys) return null;
      const out = {
        id: text(c?.id, 40) || "c" + i,
        name: text(c?.name, 24) || "Camera " + (i + 1),
        keys,
      };
      if (c?.height != null) out.height = num(c.height, 0.1, 8, 1.55);
      if (c?.lens != null) out.lens = num(c.lens, 8, 300, 35);
      return out;
    })
    .filter(Boolean);
  if (!cameras.length) return null;

  // A generated set lives behind its owner's account and cannot travel, so a
  // "gen:" reference is dropped rather than sent somewhere it will 403.
  const rawSetId = text(raw.setId, 80);
  const setId = rawSetId.startsWith("gen:") ? null : (getSet(rawSetId) ? rawSetId : null);
  const custom = setCustom(raw.setCustom);

  const light = raw.light && typeof raw.light === "object"
    ? {
        preset: PRESETS.has(raw.light.preset) ? raw.light.preset : defaultLight().preset,
        bearing: num(raw.light.bearing, 0, 359, defaultLight().bearing),
        warmth: num(raw.light.warmth, -1, 1, 0),
      }
    : defaultLight();

  const activeCamera = cameras.some((c) => c.id === raw.activeCamera)
    ? raw.activeCamera
    : cameras[0].id;

  return {
    title: text(raw.title, 80) || "Shared rehearsal",
    duration,
    actors,
    cameras,
    activeCamera,
    beats: list(raw.beats, MAX_BEATS)
      .map((b) => ({ t: num(b?.t, 0, duration, 0), label: text(b?.label, 40) }))
      .filter((b) => b.label)
      .sort((a, b) => a.t - b.t),
    aspect: ASPECTS.has(raw.aspect) ? raw.aspect : "16:9",
    setId: custom ? null : setId,
    setName: custom ? (custom.name ?? null) : (setId ? null : null),
    setCustom: custom,
    light,
    extras: list(raw.extras, MAX_EXTRAS).map((e, i) => ({
      id: text(e?.id, 40) || "e" + i,
      x: num(e?.x, 0, 100, 50),
      y: num(e?.y, 0, 100, 50),
      facing: num(e?.facing, -720, 720, 0),
    })),
    hiddenPieces: list(raw.hiddenPieces, MAX_PIECES).map((p) => text(p, 64)).filter(Boolean),
  };
}

// The database enforces this too, with a check constraint, because the client
// is the part an attacker controls. This is the friendly half.
export function tooBig(rehearsal) {
  try {
    return JSON.stringify(rehearsal).length > MAX_BYTES;
  } catch {
    return true;
  }
}
