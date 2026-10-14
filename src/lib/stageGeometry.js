/*
  stageGeometry — RevaultAI
  Pure functions turning an overhead layout into filmmaking language.

  Coordinate space: a 100x100 stage. Treat it as roughly 20 meters across,
  so 5 units ≈ 1 meter. Y increases downward (screen convention). Rotation is
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
  if (Math.abs(off) < 4) return "center";
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

// Turn the read into a sentence a director would recognize — and a block that
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
    bits.push(`${p.name} ${p.side === "center" ? "centered in frame" : p.side}, ${p.facing}`);
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
/*
  Auditing a SET of setups against each other.

  Everything above reads one camera at a time. A scene is cut from several, and
  the errors that hurt only exist between them: the reverse that crosses the
  line, the pair that won't cut because one is an 85mm and the other a 24mm,
  the scene with no wide to ground it. This reads a whole plan at once.

  Input is coverage_slots rows carrying camera coordinates. Findings use the
  same shape as scriptSupervisor so they render in the same panel.
*/

function num(v) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

function cameraOf(slot) {
  return { x: num(slot.camera_x), y: num(slot.camera_y), rotation: num(slot.camera_rotation) ?? 0 };
}

function actorsOf(slot) {
  const raw = Array.isArray(slot.actors) ? slot.actors : [];
  return raw
    .filter((a) => a && num(a.x) != null && num(a.y) != null)
    .map((a) => ({ name: a.name ?? "someone", x: num(a.x), y: num(a.y), facing: num(a.facing) ?? 0 }));
}

function isGeometric(slot) {
  return num(slot?.camera_x) != null && num(slot?.camera_y) != null;
}

function slotLabel(slot, i) {
  return slot.slug || `Setup ${i + 1}`;
}

// One plan — one scene's worth of setups.
function auditPlan(slots) {
  const out = [];
  const setups = slots
    .filter(isGeometric)
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((s, i) => ({ row: s, name: slotLabel(s, i), camera: cameraOf(s), actors: actorsOf(s) }));

  if (setups.length < 2) return out;

  const planName = slots[0]?.plan_label || "this plan";

  // The axis comes from the setup that recorded the most actors — later setups
  // may have framed only one of them.
  const withActors = setups.filter((s) => s.actors.length >= 2);
  const reference = withActors.sort((a, b) => b.actors.length - a.actors.length)[0];
  const axis = reference ? axisFor(reference.actors) : null;

  // --- Screen direction across setups ------------------------------------
  if (axis) {
    const sided = setups.map((s) => ({ ...s, side: sideOfAxis(axis, s.camera) }));
    const left = sided.filter((s) => s.side === 1);
    const right = sided.filter((s) => s.side === -1);

    if (left.length && right.length) {
      // Which side is the reference? A master establishes the geography of the
      // scene, so everything else conforms to it. Failing that, the side with
      // more setups. Failing that, the side that was blocked first.
      const score = (group) => [
        group.some((s) => /wide|master|establish/i.test(`${s.row.shot_size || ""} ${s.row.slug || ""}`)) ? 1 : 0,
        group.length,
        -Math.min(...group.map((s) => s.row.sort ?? 0)),
      ];
      const [sa, sb] = [score(left), score(right)];
      const leftAnchors = sa[0] !== sb[0] ? sa[0] > sb[0]
        : sa[1] !== sb[1] ? sa[1] > sb[1]
        : sa[2] >= sb[2];
      const majority = leftAnchors ? left : right;
      const minority = leftAnchors ? right : left;
      const even = majority.length === minority.length;
      const anchor = majority.find((s) => /wide|master|establish/i.test(`${s.row.shot_size || ""} ${s.row.slug || ""}`)) ?? majority[0];

      for (const s of minority) {
        // Name the actor whose screen side actually flips — that is the thing
        // an audience sees, rather than the abstraction.
        const flips = [];
        for (const a of reference.actors) {
          const here = screenSide(s.camera, a);
          const there = screenSide(anchor.camera, a);
          if (here !== there && here !== "center" && there !== "center") {
            flips.push(`${a.name} sits ${there} in "${anchor.name}" but ${here} here`);
          }
        }
        out.push({
          kind: "break",
          area: "screen direction",
          title: `"${s.name}" crosses the line`,
          detail:
            `The axis runs between ${axis.a.name} and ${axis.b.name}. ` +
            (even
              ? `This setup and "${anchor.name}" sit on opposite sides of it. `
              : `${majority.length} of the ${setups.length} setups sit on one side of it; this one sits on the other. `) +
            (flips.length ? flips.join(". ") + "." : "Cutting between them reverses screen direction."),
          fix: `Move the camera to the same side as "${anchor.name}", reframe it as a neutral shot straight down the axis, or earn the cross with a move the audience can follow.`,
          action: "rehearsal",
        });
      }
    }
  }

  // --- Reverse pairs that won't cut --------------------------------------
  const favoring = setups.filter((s) => s.row.favors);
  const seen = new Set();
  for (const a of favoring) {
    for (const b of favoring) {
      if (a.row.id === b.row.id || a.row.favors === b.row.favors) continue;
      const key = [a.row.id, b.row.id].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);

      const la = num(a.row.lens_mm);
      const lb = num(b.row.lens_mm);
      if (la && lb && Math.max(la, lb) / Math.min(la, lb) >= 1.5) {
        out.push({
          kind: "warning",
          area: "reverse pair",
          title: `"${a.name}" and "${b.name}" won't cut as a pair`,
          detail: `One is ${la}mm, the other ${lb}mm. These are the two halves of the same conversation, but the perspective on the two faces won't match — the reverse reads as a different scene rather than the other side of this one.`,
          fix: "Pick one focal length and shoot both reverses on it.",
          action: "rehearsal",
        });
      }

      const ha = a.row.camera_height;
      const hb = b.row.camera_height;
      if (ha && hb && String(ha) !== String(hb)) {
        out.push({
          kind: "warning",
          area: "reverse pair",
          title: `Camera height changes between "${a.name}" and "${b.name}"`,
          detail: `${ha} against ${hb}. Across a reverse pair that reads as a power shift between ${a.row.favors} and ${b.row.favors}, whether or not you meant one.`,
          fix: "Match the heights unless the shift is deliberate.",
          action: "rehearsal",
        });
      }
    }
  }

  // --- Nothing grounding the space ---------------------------------------
  const hasWide = setups.some((s) => /wide/i.test(String(s.row.shot_size || "")));
  if (!hasWide) {
    out.push({
      kind: "warning",
      area: "coverage",
      title: `No wide shot in "${planName}"`,
      detail: `${setups.length === 2 ? "Both setups are" : `All ${setups.length} setups are`} medium or tighter. Nothing establishes where anyone is standing, so every cut asks the audience to work it out from faces alone.`,
      fix: "Add a master from the side of the axis the rest of the coverage sits on.",
      action: "rehearsal",
    });
  }

  // --- One-sided coverage -------------------------------------------------
  const favored = [...new Set(setups.map((s) => s.row.favors).filter(Boolean))];
  if (favored.length === 1 && reference && reference.actors.length > 1) {
    const other = reference.actors.find((a) => a.name !== favored[0]);
    out.push({
      kind: "warning",
      area: "coverage",
      title: `Nothing covers ${other ? other.name : "the other character"}`,
      detail: `Every setup that favors anyone favors ${favored[0]}. ${other ? other.name : "The other character"} appears only in whatever happens to be behind them. In the edit this locks the scene into one point of view.`,
      fix: `Add a single or an over-the-shoulder on ${other ? other.name : "the other character"}, on the same side of the axis.`,
      action: "rehearsal",
    });
  }

  // --- What's holding -----------------------------------------------------
  if (axis && !out.some((f) => f.kind === "break")) {
    out.push({
      kind: "ok",
      area: "screen direction",
      title: `${setups.length} setups hold the same side of the line`,
      detail: `The axis between ${axis.a.name} and ${axis.b.name} is intact across every setup in "${planName}". These will cut together.`,
      fix: "",
    });
  }

  return out;
}

/*
  Audit every saved plan. Plans are separate scenes, so setups are only ever
  compared against others in the same plan.
*/
export function auditSetups(slots = []) {
  const byPlan = new Map();
  for (const s of slots ?? []) {
    const k = s.plan_id ?? "__none__";
    if (!byPlan.has(k)) byPlan.set(k, []);
    byPlan.get(k).push(s);
  }

  const order = { break: 0, warning: 1, ok: 2 };
  const all = [];
  for (const group of byPlan.values()) all.push(...auditPlan(group));
  return all.sort((a, b) => (order[a.kind] ?? 1) - (order[b.kind] ?? 1)).slice(0, 10);
}

// How many setups in a set carry the coordinates this audit needs.
export function geometricCount(slots = []) {
  return (slots ?? []).filter(isGeometric).length;
}
