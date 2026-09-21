/*
  stage3d — RevaultAI
  Converts the overhead plan into 3D space. The plan is a 100x100 stage at
  5 units per metre, y increasing downward, rotation in degrees with 0 pointing
  up the plan and increasing clockwise. In 3D, Y is up and the plan's y becomes
  depth (Z). Pure functions, so the maths can be tested without a browser.
*/

export const UNITS_PER_METRE = 5;
export const EYE_HEIGHT = 1.6;       // camera height, metres
export const HEAD_HEIGHT = 1.62;     // standing mannequin head, metres
export const LEG_HEIGHT = 0.85;

// Stage point to world metres, with the stage centre at the origin.
export function toWorld(x, y) {
  return { x: (x - 50) / UNITS_PER_METRE, z: (y - 50) / UNITS_PER_METRE };
}

// A bearing on the plan as a direction on the floor.
export function dirFromBearing(deg) {
  const r = (deg * Math.PI) / 180;
  return { x: Math.sin(r), z: -Math.cos(r) };
}

// Rotation about Y that turns a mannequin (front facing -Z) to that bearing.
export function yawFromBearing(deg) {
  return -(deg * Math.PI) / 180;
}

// "85mm" -> 85. Anything unparseable falls back to a normal lens.
export function lensMm(lens) {
  const m = /(\d+)\s*mm/i.exec(String(lens ?? ""));
  return m ? Number(m[1]) : 35;
}

// Full-frame focal length to the vertical field of view three.js expects.
export function verticalFov(mm, aspect) {
  const h = 2 * Math.atan(36 / (2 * mm));
  return (2 * Math.atan(Math.tan(h / 2) / aspect) * 180) / Math.PI;
}

// How far each pose shortens the legs; the upper body drops by the same amount.
export const POSE_LEG_SCALE = { stand: 1, sit: 0.45, crouch: 0.35 };

export function poseDrop(pose) {
  const s = POSE_LEG_SCALE[pose] ?? 1;
  return LEG_HEIGHT * (1 - s);
}

export const ASPECTS = {
  "16:9": { value: 16 / 9, css: "16 / 9" },
  "2.39:1": { value: 2.39, css: "2.39 / 1" },
  "9:16": { value: 9 / 16, css: "9 / 16" },
  "1:1": { value: 1, css: "1 / 1" },
};