/*
  stageGeometry — RevaultAI
  Pure functions turning an overhead layout into filmmaking language.

  Coordinate space: a 100x100 stage. Treat it as roughly 20 metres across,
  so 5 units ≈ 1 metre. Y increases downward (screen convention). Rotation is
  in degrees, 0 = pointing up the screen (north), increasing clockwise.
*/

export const STAGE = 100;

export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Angle FROM a TO b, in degrees, 0 = north, clockwise.
export function bearing(a, b) {
  const deg = (Math.atan2(b.x - a.x, -(b.y - a.y)) * 180) / Math.PI;
  return (deg + 360) % 360;
}

// Smallest signed difference between two bearings, -180..180.
export function angleDelta(from, to) {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

// Distance to shot size. Thresholds are the useful part — they encode what a
// lens actually does at a given subject distance.
export function shotSizeFor(d) {
  if (d < 7) return "Extreme close-up";
  if (d < 12) return "Close-up";
  if (d < 18) return "Medium close-up";
  if (d < 28) return "Medium shot";
  if (d < 42) return "Medium wide";
  if (d < 62) return "Wide shot";
  return "Extreme wide";
}

// A rough focal length to match, on full frame. Longer lens for closer framing
// is the convention — you step back and go long rather than shove a wide lens
// in someone's face.
export function lensFor(d) {
  if (d < 12) return "85mm";
  if (d < 18) return "50mm";
  if (d < 28) return "40mm";
  if (d < 42) return "35mm";
  if (d < 62) return "28mm";
  return "24mm";
}

// Where an actor sits in frame, given where the camera is and which way it
// points. Returns the horizontal offset in degrees: negative = camera-left.
export function screenOffset(camera, actor) {
  return angleDelta(camera.rotation, bearing(camera, actor));
}

export function screenSide(camera, actor) {
  const off = screenOffset(camera, actor);
  if (Math.abs(off) < 4) return "centre";
  return off < 0 ? "camera-left" : "camera-right";
}

// Is the actor inside the frame at all? Horizontal FOV widens as the lens
// shortens, which is why this depends on subject distance.
export function inFrame(camera, actor) {
  const d = dist(camera, actor);
  const halfFov = d < 12 ? 12 : d < 18 ? 19 : d < 28 ? 24 : d < 42 ? 27 : d < 62 ? 33 : 37;
  return Math.abs(screenOffset(camera, actor)) <= halfFov;
}

// Which way an actor is turned relative to the camera: head-on, three-quarter,
// profile, or away. This is what decides whether you see a face.
export function facingFor(camera, actor) {
  const toCamera = bearing(actor, camera);
  const off = Math.abs(angleDelta(actor.facing ?? 0, toCamera));
  if (off < 25) return "facing camera";
  if (off < 65) return "three-quarter to camera";
  if (off < 115) return "in profile";
  if (off < 155) return "three-quarter away";
  return "back to camera";
}

/*
  The 180-degree line. With two or more actors, the axis runs through the first
  two. Every camera position on one side of that line keeps their screen
  positions consistent; crossing it swaps them, which is the cut that makes an
  audience lose their bearings.
*/
export function axisFor(actors) {
  if (!actors || actors.length < 2) return null;
  return { a: actors[0], b: actors[1] };
}

// Which side of the axis a point falls on. Sign is arbitrary but consistent.
export function sideOfAxis(axis, p) {
  if (!axis) return 0;
  const cross = (axis.b.x - axis.a.x) * (p.y - axis.a.y) - (axis.b.y - axis.a.y) * (p.x - axis.a.x);
  if (Math.abs(cross) < 1e-6) return 0;
  return cross > 0 ? 1 : -1;
}

// Is one actor between the camera and another? That's an over-the-shoulder.
export function overTheShoulder(camera, actors) {
  if (!actors || actors.length < 2) return null;
  for (const near of actors) {
    for (const far of actors) {
      if (near === far) continue;
      const dNear = dist(camera, near);
      const dFar = dist(camera, far);
      if (dNear >= dFar) continue;
      const spread = Math.abs(angleDelta(bearing(camera, near), bearing(camera, far)));
      if (spread < 18 && dNear > 4) return { foreground: near, subject: far };
    }
  }
  return null;
}

/*
  The whole read of a layout: what this camera position actually gives you.
*/
export function readStage(camera, actors) {
  const visible = (actors ?? []).filter((a) => inFrame(camera, a));
  const subject = visible.length
    ? visible.reduce((best, a) => (dist(camera, a) < dist(camera, best) ? a : best))
    : null;

  const d = subject ? dist(camera, subject) : null;
  const ots = overTheShoulder(camera, visible);
  const axis = axisFor(actors);

  const positions = visible.map((a) => ({
    name: a.name,
    side: screenSide(camera, a),
    facing: facingFor(camera, a),
    distance: Math.round(dist(camera, a)),
  }));

  const offstage = (actors ?? []).filter((a) => !inFrame(camera, a)).map((a) => a.name);

  return {
    shotSize: d == null ? null : ots ? "Over-the-shoulder" : shotSizeFor(d),
    lens: d == null ? null : lensFor(d),
    subject: subject?.name ?? null,
    overTheShoulder: ots ? { foreground: ots.foreground.name, subject: ots.subject.name } : null,
    positions,
    offstage,
    axis: axis ? { between: [axis.a.name, axis.b.name], cameraSide: sideOfAxis(axis, camera) } : null,
  };
}

// Turn the read into a sentence a director would recognise — and a block that
// can go straight into a generation prompt.
export function describeStage(read) {
  if (!read.subject) return "The camera isn't pointing at anyone. Turn it toward an actor, or move someone into frame.";

  const bits = [];
  if (read.overTheShoulder) {
    bits.push(`Over-the-shoulder on ${read.overTheShoulder.subject}, past ${read.overTheShoulder.foreground} in the foreground`);
  } else {
    bits.push(`${read.shotSize} on ${read.subject}`);
  }
  if (read.lens) bits.push(`${read.lens} lens`);

  for (const p of read.positions) {
    bits.push(`${p.name} ${p.side === "centre" ? "centred in frame" : p.side}, ${p.facing}`);
  }
  if (read.offstage.length) {
    bits.push(`${read.offstage.join(" and ")} ${read.offstage.length === 1 ? "is" : "are"} out of frame`);
  }
  return bits.join(". ") + ".";
}
/*
  Eyelines. A gaze reads correctly on screen when the direction a character
  looks matches where the other person actually is relative to camera. Get it
  wrong and two people in conversation appear to be looking past each other —
  the error an audience feels without being able to name.
*/
export function eyelinesFor(camera, actors) {
  const visible = (actors ?? []).filter((a) => inFrame(camera, a));
  const out = [];

  for (const a of visible) {
    // Who are they turned toward? Nearest actor within a generous cone.
    let target = null;
    let best = 999;
    for (const b of actors) {
      if (b === a) continue;
      const off = Math.abs(angleDelta(a.facing ?? 0, bearing(a, b)));
      if (off < 55 && off < best) { best = off; target = b; }
    }
    if (!target) continue;

    // Where does the target sit relative to the looker, from camera's view?
    const aOff = screenOffset(camera, a);
    const tOff = screenOffset(camera, target);
    const across = tOff - aOff;
    const targetVisible = inFrame(camera, target);

    let direction;
    if (Math.abs(across) < 4) direction = "straight down the lens axis";
    else if (across < 0) direction = "toward frame left";
    else direction = "toward frame right";

    // How far off the lens axis the look sits — near the lens reads as intimate,
    // far off reads as detached.
    const fromLens = Math.abs(angleDelta(bearing(a, camera), bearing(a, target)));
    const quality =
      fromLens < 15 ? "a near-lens eyeline, intimate" :
      fromLens < 45 ? "a tight eyeline just off the lens" :
      fromLens < 90 ? "a wide eyeline across the frame" :
      "looking well off axis, away from camera";

    out.push({
      who: a.name,
      at: target.name,
      direction,
      quality,
      targetOffScreen: !targetVisible,
      text: `${a.name} looks ${direction} at ${target.name}${targetVisible ? "" : ", who is off frame"} — ${quality}.`,
    });
  }
  return out;
}

// Two people who should be looking at each other but aren't — the error that
// makes a conversation feel wrong without an audience knowing why.
export function eyelineProblems(camera, actors) {
  const lines = eyelinesFor(camera, actors);
  const problems = [];
  for (const l of lines) {
    const mutual = lines.find((o) => o.who === l.at && o.at === l.who);
    if (!mutual) continue;
    if (l.direction === mutual.direction && l.direction !== "straight down the lens axis") {
      problems.push(`${l.who} and ${l.at} are both looking ${l.direction}. In a two-shot they should look toward each other — one frame left, one frame right.`);
    }
  }
  return [...new Set(problems)];
}