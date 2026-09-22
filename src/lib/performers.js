/*
  performers — RevaultAI (Rehearsal Studio, tier 3)
  Decides what each animated performer is doing at a moment in the rehearsal:
  which animation plays, how far through it they are, and which way they're
  moving. Pure functions of rehearsal time, so scrubbing backwards shows
  exactly the same step every time.
*/
import { stateAt } from "./rehearsal.js";

const UNITS_PER_METRE = 5;

export const BODIES = ["female", "male", "mannequin"];
export function defaultBody(i) { return i % 2 === 0 ? "female" : "male"; }

export const CLIPS = {
  idle: "Idle_Loop",
  sit: "Sitting_Idle_Loop",
  crouch: "Crouch_Idle_Loop",
  walk: "Walk_Loop",
  jog: "Jog_Fwd_Loop",
  crouchWalk: "Crouch_Fwd_Loop",
};

// How fast each travelling clip moves, in metres per second. The animation is
// advanced by distance covered rather than time passed, so a performer's feet
// keep pace with the ground instead of skating. Tune these if feet slide.
export const CLIP_SPEED = { Walk_Loop: 1.4, Jog_Fwd_Loop: 3.2, Crouch_Fwd_Loop: 0.9 };

export const MOVING = 0.15;   // m/s — below this, they're standing still
export const JOG = 2.3;       // m/s — above this, they break into a jog

export function chooseClip(pose, speed) {
  if (speed >= MOVING) {
    if (pose === "crouch") return CLIPS.crouchWalk;
    return speed >= JOG ? CLIPS.jog : CLIPS.walk;
  }
  if (pose === "sit") return CLIPS.sit;
  if (pose === "crouch") return CLIPS.crouch;
  return CLIPS.idle;
}

export function clipTimeFor(name, duration, t, travel) {
  if (!duration) return 0;
  const natural = CLIP_SPEED[name];
  const time = natural ? travel / natural : t;
  return ((time % duration) + duration) % duration;
}

export function lastKeyAtOrBefore(keys, t) {
  let best = null;
  for (const k of keys ?? []) if (k.t <= t + 1e-6 && (!best || k.t > best.t)) best = k;
  return best;
}

// The stage at time t, plus what each performer is physically doing:
// speed, direction of travel, distance since their last mark, and body.
export function motionState(r, t) {
  const now = stateAt(r, t);
  const dt = Math.min(0.05, t);
  const before = dt > 0 ? stateAt(r, t - dt) : now;
  return {
    ...now,
    actors: now.actors.map((a, i) => {
      const b = before.actors[i] ?? a;
      const dx = a.x - b.x, dy = a.y - b.y;
      const speed = dt > 0 ? Math.hypot(dx, dy) / UNITS_PER_METRE / dt : 0;
      const heading = speed > 0.01 ? ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360 : null;
      const k = lastKeyAtOrBefore(r.actors[i]?.keys, t);
      const travel = k ? Math.hypot(a.x - k.x, a.y - k.y) / UNITS_PER_METRE : 0;
      return { ...a, speed, heading, travel, body: r.actors[i]?.body ?? defaultBody(i) };
    }),
  };
}