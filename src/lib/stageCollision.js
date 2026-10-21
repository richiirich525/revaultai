/*
  stageCollision — RevaultAI (Rehearsal Studio)
  Nobody walks through the kitchen island. Everything here works on the
  overhead plan in stage units, against the same footprints the plan draws,
  so what you see is what stops you.

  The camera is deliberately treated differently from a performer. A set wall
  is not an obstacle to a camera: taking a wall out to shoot into the room is
  how sets have always been built, and a studio that refused it would be
  wrong about filmmaking rather than careful about geometry. A camera still
  can't sit inside the sofa.
*/
import { planShapes } from "./setGeometry.js";

const UNITS_PER_METRE = 5;

// Roughly how much room a body needs, as a radius in stage units.
export const PERSON_RADIUS = 0.3 * UNITS_PER_METRE;
export const CAMERA_RADIUS = 0.22 * UNITS_PER_METRE;

// What a mover has to get around. Openings are doorways and windows, which is
// where a person is supposed to go; anything resting on a counter is above
// head height on the floor plan and blocks nothing.
export function blockers(set, { walls = true } = {}) {
  if (!set) return [];
  const plan = planShapes(set);
  const out = [];
  if (walls) {
    for (const w of plan.walls ?? []) {
      if (w.opening) continue;
      out.push({ ...w, label: "a wall", kind: "wall" });
    }
  }
  for (const p of plan.props ?? []) {
    if (p.raised || isGround(p)) continue;
    out.push({ ...p, label: p.label || "the furniture", kind: "prop" });
  }
  return out;
}

/*
  Ground, not obstacle. A road, a pavement, a low platform and a rug are all
  pieces of set with a footprint on the plan, and all of them are things you
  walk on. Height alone doesn't separate them from furniture — a shopfront's
  road slab stands 0.64m — but a thing you walk on is always far wider than
  it is tall, and a thing you walk around is not.
*/
export function isGround(p) {
  if (p.h == null) return false;
  if (p.h <= 0.15) return true;                    // mats, markings, rugs
  return p.h < 0.7 && p.h < 0.25 * (p.mw ?? p.h);  // slabs, kerbs, platforms
}

const hits = (p, r, pad) =>
  p.x > r.x - pad && p.x < r.x + r.w + pad && p.y > r.y - pad && p.y < r.y + r.h + pad;

export function blockerAt(list, p, pad) {
  for (const r of list) if (hits(p, r, pad)) return r;
  return null;
}

// Keep a mover inside the room once they are in it — but never drag someone
// in from outside, where the camera and anyone yet to enter legitimately are.
function clampToFloor(set, p, pad, wasInside) {
  const f = planShapes(set).floor;
  if (!f || !wasInside) return p;
  return {
    ...p,
    x: Math.max(f.x + pad, Math.min(f.x + f.w - pad, p.x)),
    y: Math.max(f.y + pad, Math.min(f.y + f.h - pad, p.y)),
  };
}

/*
  Where a mover actually ends up. A blocked move is retried one axis at a
  time, which is what makes someone slide along a wall rather than stick to
  it — dragging diagonally into a wall should still carry you down it.
*/
export function resolveMove(set, from, to, { radius = PERSON_RADIUS, walls = true } = {}) {
  if (!set) return to;
  const list = blockers(set, { walls });
  const wasInside = walls ? insideFloor(set, from, radius) : false;
  const target = clampToFloor(set, to, radius, wasInside);
  if (!list.length) return target;

  if (!blockerAt(list, target, radius)) return target;

  const slideX = clampToFloor(set, { ...to, x: target.x, y: from.y }, radius, wasInside);
  if (!blockerAt(list, slideX, radius)) return slideX;

  const slideY = clampToFloor(set, { ...to, x: from.x, y: target.y }, radius, wasInside);
  if (!blockerAt(list, slideY, radius)) return slideY;

  // Boxed in — including the case where they started inside something.
  return blockerAt(list, from, radius) ? target : from;
}

export function insideFloor(set, p, pad = 0) {
  const f = set ? planShapes(set).floor : null;
  if (!f) return false;
  return p.x >= f.x + pad && p.x <= f.x + f.w - pad && p.y >= f.y + pad && p.y <= f.y + f.h - pad;
}

// Does the straight line between two marks pass through something? Slab test
// against the inflated footprint.
function segmentHits(a, b, r, pad) {
  const minX = r.x - pad, maxX = r.x + r.w + pad;
  const minY = r.y - pad, maxY = r.y + r.h + pad;
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dy = b.y - a.y;
  for (const [p, q] of [[-dx, a.x - minX], [dx, maxX - a.x], [-dy, a.y - minY], [dy, maxY - a.y]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return t0 <= t1;
}

export function pathBlocker(set, a, b, { radius = PERSON_RADIUS, walls = true } = {}) {
  for (const r of blockers(set, { walls })) if (segmentHits(a, b, r, radius)) return r;
  return null;
}

/*
  Marks can each be legal and the walk between them still go through the
  table. Collision on the drag can't catch that — it's only true once both
  marks exist — so the studio reports it rather than quietly rerouting a
  performance the director set.
*/
export function walkThroughs(rehearsal, set, { radius = PERSON_RADIUS } = {}) {
  if (!set) return [];
  const out = [];
  for (const a of rehearsal?.actors ?? []) {
    const keys = [...(a.keys ?? [])].sort((x, y) => x.t - y.t);
    for (let i = 0; i < keys.length - 1; i++) {
      const from = keys[i];
      const to = keys[i + 1];
      // Someone who has not moved is not walking through anything. A person
      // seated at a table overlaps the chair, which is what sitting is, and
      // warning about it was a false alarm on every scene with a chair in it.
      if (Math.hypot(to.x - from.x, to.y - from.y) < 0.4) continue;
      const hit = pathBlocker(set, from, to, { radius });
      if (hit) out.push({ name: a.name, label: hit.label, from: from.t, to: to.t });
    }
  }
  return out;
}
