/*
  rehearsal — RevaultAI
  A rehearsal is actors and cameras moving through time. Each one is a track of
  keyframes; everything between keyframes is interpolated. Sample the rehearsal
  at any instant and you get an ordinary stage layout — which the geometry
  engine already knows how to read for shot size, eyelines and the 180° line.

  The same data drives all three tiers: the overhead plan, the camera view,
  and eventually animated characters. Only the renderer changes.
*/

export const DEFAULT_DURATION = 8;

const round = (n, step = 0.05) => Math.round(n / step) * step;

export function lerp(a, b, u) { return a + (b - a) * u; }

// Angles take the short way round — 350° to 10° turns 20°, not 340°.
export function lerpAngle(a, b, u) {
  const d = ((((b - a) % 360) + 540) % 360) - 180;
  return (a + d * u + 360) % 360;
}

// Smoothstep: people ease into and out of a move rather than lurching.
const ease = (u) => u * u * (3 - 2 * u);

function sampleTrack(keys, t, linear = [], angular = []) {
  if (!keys?.length) return null;
  const k = [...keys].sort((a, b) => a.t - b.t);
  if (t <= k[0].t) return { ...k[0] };
  if (t >= k[k.length - 1].t) return { ...k[k.length - 1] };
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i], b = k[i + 1];
    if (t < a.t || t > b.t) continue;
    const u = b.t === a.t ? 0 : ease((t - a.t) / (b.t - a.t));
    const out = { t };
    for (const f of linear) out[f] = lerp(a[f] ?? 0, b[f] ?? 0, u);
    for (const f of angular) out[f] = lerpAngle(a[f] ?? 0, b[f] ?? 0, u);
    out.pose = u < 0.5 ? a.pose : b.pose;
    return out;
  }
  return { ...k[k.length - 1] };
}

// The whole stage at one instant, in the shape stageGeometry expects.
export function stateAt(r, t) {
  const actors = (r.actors ?? []).map((a) => {
    const s = sampleTrack(a.keys, t, ["x", "y"], ["facing"]);
    return {
      id: a.id, name: a.name, color: a.color,
      x: s?.x ?? 50, y: s?.y ?? 50, facing: s?.facing ?? 0, pose: s?.pose ?? "stand",
    };
  });
  const cam = (r.cameras ?? []).find((c) => c.id === r.activeCamera) ?? r.cameras?.[0];
  const cs = sampleTrack(cam?.keys, t, ["x", "y"], ["rotation"]);
  return {
    t,
    actors,
    camera: { x: cs?.x ?? 50, y: cs?.y ?? 80, rotation: cs?.rotation ?? 0 },
  };
}

// Write a keyframe at time t. If one already sits within `snap` seconds,
// update it rather than stacking a second key on top.
export function setKey(track, t, values, snap = 0.2) {
  const keys = [...(track.keys ?? [])];
  const i = keys.findIndex((k) => Math.abs(k.t - t) < snap);
  if (i >= 0) keys[i] = { ...keys[i], ...values };
  else keys.push({ ...values, t: round(t) });
  keys.sort((a, b) => a.t - b.t);
  return { ...track, keys };
}

export function removeKey(track, t, snap = 0.2) {
  return { ...track, keys: (track.keys ?? []).filter((k) => Math.abs(k.t - t) >= snap) };
}

// Every instant anything is keyed — for the timeline's tick marks.
export function keyTimes(r) {
  const s = new Set();
  for (const a of r.actors ?? []) for (const k of a.keys ?? []) s.add(round(k.t));
  for (const c of r.cameras ?? []) if (c.id === r.activeCamera) for (const k of c.keys ?? []) s.add(round(k.t));
  return [...s].sort((a, b) => a - b);
}

const COLORS = ["#7B3FE4", "#E5B769", "#4ADE80", "#5BA8C2", "#F87171"];

// Start a rehearsal — from a Blocking layout if there is one, blank otherwise.
export function newRehearsal({ layout, title } = {}) {
  const actors = (layout?.actors?.length ? layout.actors : [
    { name: "A", x: 38, y: 42, facing: 90 },
    { name: "B", x: 62, y: 42, facing: 270 },
  ]).map((a, i) => ({
    id: "a" + i,
    name: a.name,
    color: COLORS[i % COLORS.length],
    keys: [{ t: 0, x: a.x, y: a.y, facing: a.facing ?? 0, pose: "stand" }],
  }));
  const c = layout?.camera ?? { x: 50, y: 80, rotation: 0 };
  return {
    title: title || "Untitled rehearsal",
    duration: DEFAULT_DURATION,
    actors,
    cameras: [{ id: "c0", name: "A-cam", keys: [{ t: 0, x: c.x, y: c.y, rotation: c.rotation ?? 0 }] }],
    activeCamera: "c0",
    beats: [],
  };
}

// A second camera on the same action — the "compare three angles" move.
// It copies nothing from the actors: their performance stays identical.
export function addCamera(r, from) {
  const n = (r.cameras ?? []).length;
  const src = from ?? stateAt(r, 0).camera;
  const cam = {
    id: "c" + Date.now().toString(36),
    name: String.fromCharCode(65 + n) + "-cam",
    keys: [{ t: 0, x: Math.min(95, src.x + 18), y: src.y, rotation: src.rotation }],
  };
  return { ...r, cameras: [...r.cameras, cam], activeCamera: cam.id };
}