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

// Half the horizontal field of view, in degrees, at a given subject distance.
// Wider as the lens shortens, which is why it follows distance rather than a
// stated focal length. Exported so anything that DRAWS the cone uses the same
// numbers the in-frame test judges by — two tables would drift, and a cone
// that disagreed with its own verdict would be worse than no cone.
export function halfFovFor(d) {
  if (d < 12) return 12;
  if (d < 18) return 19;
  if (d < 28) return 24;
  if (d < 42) return 27;
  if (d < 62) return 33;
  return 37;
}

// Is the actor inside the frame at all?
export function inFrame(camera, actor) {
  return Math.abs(screenOffset(camera, actor)) <= halfFovFor(dist(camera, actor));
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
  The generation block — the part that pays for declaring intent.

  AI video inherits nothing between shots. There was no camera last time and
  no previous take, so the model picks screen direction fresh for every clip
  unless the prompt states it. Position and eyeline therefore have to be
  written out every single shot, which is the one thing a live-action crew
  never has to think about and a generated film cannot survive without.

  The division of labor: GEOMETRY supplies the directions, because the
  blocking is what actually encodes them. The DECLARATION supplies the shot
  type, because that is a statement of what you want rather than something a
  distance can imply. When the two disagree, the audit already says so — so
  this follows the declaration, and the finding is what tells you to fix
  either the blocking or the label.
*/

// Said the way a model reads it, which is the way the frame is described
// rather than where the crew would be standing.
const FRAME_SIDE = {
  "camera-left": "frame-left",
  "camera-right": "frame-right",
  center: "centered in frame",
};

// eyelinesFor words these for a human reading findings. A prompt has to match
// the hyphenation used for frame position, or one sentence says both.
const hyphenate = (dir) => dir.replace("toward frame left", "toward frame-left")
                              .replace("toward frame right", "toward frame-right");

export function promptFor(camera, actors, declared = {}) {
  const cast = actors ?? [];
  const read = readStage(camera, cast);
  const eyes = eyelinesFor(camera, cast);
  const intent = INTENTS[declared.intent] ? declared.intent : null;
  const visible = cast.filter((a) => inFrame(camera, a));

  const named = intent && INTENTS[intent].needsSubject
    ? (declared.favors || read.subject)
    : null;
  const subjectActor = cast.find((a) => a.name === (named ?? read.subject)) ?? null;
  const spatial = intent === "insert" || intent === "neutral";

  // A shot of nobody cannot be prompted — except an insert or a neutral,
  // which are about the space rather than a face.
  if (!spatial && (!subjectActor || !visible.length)) {
    return "The camera isn't pointing at anyone. Turn it toward a performer before writing a prompt.";
  }

  /*
    The declared subject is not in frame. Following the declaration here would
    emit "single on Vance" alongside "Vance is out of frame" — a prompt that
    argues with itself and generates whatever the model feels like. There is
    already a break-level finding for this, so say the same thing rather than
    handing over something unusable.
  */
  if (!spatial && named && subjectActor && !inFrame(camera, subjectActor)) {
    return `Marked ${intent === "ots" ? "an over-the-shoulder" : "a single"} on ${named}, but the camera is not pointed at ${named}. Fix the blocking or the label before prompting this shot.`;
  }

  // Measured from the declared subject when there is one, so a declared
  // single is sized on the person it is on rather than whoever drifted nearer.
  const d = subjectActor ? dist(camera, subjectActor) : null;
  const size = d == null ? null : shotSizeFor(d);
  const lens = d == null ? null : lensFor(d);

  const bits = [];
  // Named as standing in the foreground, and so not reported as off frame.
  let foreground = null;

  if (intent === "insert") {
    bits.push("Insert");
  } else if (intent === "neutral") {
    bits.push(read.axis
      ? `Neutral shot looking straight down the axis between ${read.axis.between.join(" and ")}`
      : "Neutral shot looking straight down the axis");
  } else if (intent === "master") {
    bits.push(size ? `Master shot, ${size.toLowerCase()}` : "Master shot");
  } else if (intent === "two_shot") {
    const who = visible.map((a) => a.name);
    bits.push(who.length >= 2
      ? `Two-shot of ${who.join(" and ")}, ${(size ?? "Medium shot").toLowerCase()}`
      : `Two-shot, ${(size ?? "Medium shot").toLowerCase()}`);
  } else if (intent === "ots") {
    const fg = read.overTheShoulder?.foreground
      ?? overTheShoulder(camera, cast)?.foreground?.name
      ?? visible.find((a) => a.name !== named)?.name
      ?? null;
    if (fg) foreground = fg;
    bits.push(`Over-the-shoulder on ${named}${fg ? `, past ${fg} in the foreground` : ""}`);
  } else if (intent === "single") {
    bits.push(`${size ?? "Medium shot"} single on ${named}`);
  } else if (read.overTheShoulder) {
    bits.push(`Over-the-shoulder on ${read.overTheShoulder.subject}, past ${read.overTheShoulder.foreground} in the foreground`);
  } else {
    bits.push(`${read.shotSize} on ${read.subject}`);
  }

  if (lens) bits.push(`${lens} lens`);
  if (declared.height) bits.push(`Camera at ${declared.height}`);

  // Position and eyeline for everyone in frame. This is the half the model
  // cannot infer and will otherwise invent, differently, on every take.
  // Skipped for an insert, which is a detail shot — naming who stands where
  // would describe the shot it is not.
  if (intent !== "insert") {
    for (const p of read.positions) {
      const where = FRAME_SIDE[p.side] ?? p.side;
      const look = eyes.find((e) => e.who === p.name);
      bits.push(look ? `${p.name} ${where}, looking ${hyphenate(look.direction)}` : `${p.name} ${where}, ${p.facing}`);
    }

    const off = read.offstage.filter((n) => n !== foreground);
    if (off.length) {
      bits.push(`${off.join(" and ")} ${off.length === 1 ? "is" : "are"} out of frame`);
    }
  }

  let text = bits.join(". ") + ".";
  const note = typeof declared.note === "string" ? declared.note.trim() : "";
  if (note) text += " " + (/[.!?]$/.test(note) ? note : note + ".");
  return text;
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

/*
  Declared intent.

  Everything above reads geometry: where a camera stands, how far from whom,
  which side of the line. Geometry is honest, but it is not purpose. A wide
  shot on a long lens and an extreme wide sit at the same distance. A
  deliberate two-shot and a sloppy single look identical from overhead. Only
  the person blocking the scene knows which was meant.

  So purpose is declared rather than inferred, and the audit's job changes:
  instead of judging geometry against a rulebook, it checks geometry against
  what the director said they were doing. A setup that declares nothing falls
  back to the old label-sniffing, because plans blocked before this existed
  still have to read.
*/
export const INTENTS = {
  master:   { label: "Master",            needsSubject: false, carriesDirection: true  },
  two_shot: { label: "Two-shot",          needsSubject: false, carriesDirection: true  },
  single:   { label: "Single",            needsSubject: true,  carriesDirection: true  },
  ots:      { label: "Over-the-shoulder", needsSubject: true,  carriesDirection: true  },
  neutral:  { label: "Neutral",           needsSubject: false, carriesDirection: false },
  insert:   { label: "Insert",            needsSubject: false, carriesDirection: false },
};

export function intentOf(slot) {
  const v = typeof slot?.intent === "string" ? slot.intent.trim() : "";
  return INTENTS[v] ? v : null;
}

/*
  Who the setup is on. A declared subject beats the one geometry guessed —
  and a setup that declares an intent taking NO subject is on nobody, even
  though geometry can always name whoever stands nearest. That matters: left
  to the fallback, a master "favors" its closest performer and gets compared
  against a single as if the two were a reverse pair, which they are not.
*/
export function favorsOf(slot) {
  const i = intentOf(slot);
  if (i != null) return INTENTS[i].needsSubject ? (slot.intent_favors || slot.favors || null) : null;
  return slot?.favors || null;
}

/*
  Does this setup take part in the screen-direction judgment at all?

  A neutral shot looks down the axis and so belongs to neither side by
  definition. An insert of a hand on a doorknob carries no screen direction
  there is anything to break. Counting either as a crossing is how the tool
  ends up flagging a shot the director chose on purpose.
*/
function carriesDirection(s) {
  const i = intentOf(s.row);
  return i == null ? true : INTENTS[i].carriesDirection;
}

const isDeliberate = (s) => s.row.deliberate_cross === true;

// Perpendicular distance from a point to the line of action.
export function distToAxis(axis, p) {
  if (!axis) return null;
  const dx = axis.b.x - axis.a.x;
  const dy = axis.b.y - axis.a.y;
  const len = Math.hypot(dx, dy) || 1;
  return Math.abs(dx * (p.y - axis.a.y) - dy * (p.x - axis.a.x)) / len;
}

// Inside this band, a camera reads as sitting on the line rather than beside it.
const ON_AXIS = 6;

/*
  Does this setup establish the geography? A declared master is one; a setup
  that declares something else is NOT one even if its label says "wide",
  because the declaration is the whole point. Undeclared setups fall back to
  reading their own labels.
*/
const isMaster = (s) => {
  const i = intentOf(s.row);
  if (i != null) return i === "master";
  return /wide|master|establish/i.test(`${s.row.shot_size || ""} ${s.row.slug || ""}`);
};

/*
  Everything the written findings and the drawn plan have to agree on: which
  setups carry coordinates, where the axis runs, which side each camera sits
  on, which side is the reference, and therefore which setups cross.

  Exported so the overhead plan and the audit read the same geometry. Two
  copies of this logic would drift, and a plan that disagreed with its own
  findings would be worse than no plan.
*/
export function planGeometry(slots = []) {
  const setups = (slots ?? [])
    .filter(isGeometric)
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((s, i) => ({ row: s, name: slotLabel(s, i), camera: cameraOf(s), actors: actorsOf(s) }));

  const planName = slots?.[0]?.plan_label || "this plan";

  // The axis comes from the setup that recorded the most actors — later setups
  // may have framed only one of them.
  const withActors = setups.filter((s) => s.actors.length >= 2);
  const reference = [...withActors].sort((a, b) => b.actors.length - a.actors.length)[0] ?? null;
  const axis = reference ? axisFor(reference.actors) : null;

  for (const s of setups) s.side = axis ? sideOfAxis(axis, s.camera) : 0;

  let anchor = null;
  let crossing = [];
  let even = false;

  // Only the setups that carry screen direction can cross it.
  const directional = setups.filter(carriesDirection);

  if (axis) {
    const left = directional.filter((s) => s.side === 1);
    const right = directional.filter((s) => s.side === -1);
    if (left.length && right.length) {
      // Which side is the reference? A master establishes the geography of the
      // scene, so everything else conforms to it. Failing that, the side with
      // more setups. Failing that, the side that was blocked first.
      const score = (group) => [
        group.some(isMaster) ? 1 : 0,
        group.length,
        -Math.min(...group.map((s) => s.row.sort ?? 0)),
      ];
      const [sa, sb] = [score(left), score(right)];
      const leftAnchors = sa[0] !== sb[0] ? sa[0] > sb[0]
        : sa[1] !== sb[1] ? sa[1] > sb[1]
        : sa[2] >= sb[2];
      const majority = leftAnchors ? left : right;
      crossing = leftAnchors ? right : left;
      even = majority.length === crossing.length;
      anchor = majority.find(isMaster) ?? majority[0];
    }
  }

  return {
    setups,
    directional,
    planName,
    reference,
    axis,
    anchor,
    crossing,
    crossingIds: new Set(crossing.map((s) => s.row.id)),
    // A cross the director marked as intended. Still a cross — the board
    // still draws it — but not the same finding.
    deliberateIds: new Set(crossing.filter(isDeliberate).map((s) => s.row.id)),
    even,
  };
}

// One plan — one scene's worth of setups.
function auditPlan(slots) {
  const out = [];
  const { setups, directional, planName, reference, axis, anchor, crossing, even } = planGeometry(slots);

  if (setups.length < 2) return out;

  // --- Screen direction across setups ------------------------------------
  if (axis && crossing.length) {
    {
      const holding = directional.length - crossing.length;

      /*
        Is there anything in the plan the audience can re-map the room on? A
        neutral shot down the axis does it, and so does a cutaway. Without
        one, a cross still lands as a mistake on screen no matter what was
        intended — so a deliberate cross with no reset is worth saying out
        loud rather than waving through.
      */
      const reset = setups.find((x) => {
        const i = intentOf(x.row);
        return i === "neutral" || i === "insert";
      });

      for (const s of crossing) {
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

        const where =
          `The axis runs between ${axis.a.name} and ${axis.b.name}. ` +
          (even
            ? `This setup and "${anchor.name}" sit on opposite sides of it. `
            : `${holding} of the ${directional.length} setups that carry screen direction sit on one side of it; this one sits on the other. `);

        // Declared deliberate: no longer an error, a choice — and the only
        // question left is whether the choice is earned.
        if (isDeliberate(s)) {
          out.push(reset ? {
            kind: "note",
            area: "screen direction",
            title: `"${s.name}" crosses the line on purpose`,
            detail: where + (flips.length ? flips.join(". ") + ". " : "") +
              `Marked deliberate, and "${reset.name}" gives the audience somewhere to re-map the room, so the cross is earned.`,
            fix: "",
          } : {
            kind: "warning",
            area: "screen direction",
            title: `"${s.name}" crosses on purpose with nothing to reset on`,
            detail: where + (flips.length ? flips.join(". ") + ". " : "") +
              "Marked deliberate, but nothing in this plan lets the audience re-map the room. A cross with no neutral shot and no cutaway beside it reads as an error rather than an effect, however it was meant.",
            fix: "Add a neutral shot straight down the axis, or a cutaway to go out on, next to this setup.",
            action: "rehearsal",
          });
          continue;
        }

        out.push({
          kind: "break",
          area: "screen direction",
          title: `"${s.name}" crosses the line`,
          detail: where +
            (flips.length ? flips.join(". ") + "." : "Cutting between them reverses screen direction."),
          fix: `Move the camera to the same side as "${anchor.name}", reframe it as a neutral shot straight down the axis, or mark the cross deliberate if you meant it.`,
          action: "rehearsal",
        });
      }
    }
  }

  /*
    Does each setup do what it says it does?

    These findings only exist because purpose is declared. Without a stated
    intent there is nothing to disagree with — the geometry is simply whatever
    it is, and the tool can only describe it back. With one, the useful
    question becomes available: you said this was a two-shot, is it?
  */
  for (const s of setups) {
    const declared = intentOf(s.row);
    if (declared == null) continue;

    const inShot = s.actors.filter((a) => inFrame(s.camera, a));
    const outShot = s.actors.filter((a) => !inFrame(s.camera, a));
    const named = favorsOf(s.row);
    const subject = named ? s.actors.find((a) => a.name === named) : null;

    // A master that cannot show the room is not a master, and everything
    // else in the plan is conforming to it.
    if (declared === "master" && s.actors.length) {
      const near = Math.min(...s.actors.map((a) => dist(s.camera, a)));
      const size = shotSizeFor(near);
      if (!/wide/i.test(size)) {
        out.push({
          kind: "warning",
          area: "intent",
          title: `"${s.name}" is marked the master but frames as ${size.toLowerCase()}`,
          detail: `A master establishes where everyone is standing, and from this distance it cannot — ${outShot.length ? outShot.map((a) => a.name).join(" and ") + " " + (outShot.length === 1 ? "is" : "are") + " outside the frame" : "the room around the performers is not in it"}. The rest of the coverage is conforming to a shot that does not establish anything.`,
          fix: "Pull the camera back until the whole playing area is in frame, or mark a different setup as the master.",
          action: "rehearsal",
        });
      }
    }

    if (declared === "two_shot" && s.actors.length >= 2 && inShot.length < 2) {
      out.push({
        kind: "warning",
        area: "intent",
        title: `"${s.name}" is marked a two-shot but ${inShot.length === 1 ? "only " + inShot[0].name + " is in frame" : "nobody is in frame"}`,
        detail: `${outShot.map((a) => a.name).join(" and ")} ${outShot.length === 1 ? "falls" : "fall"} outside the frame at this distance and angle. What comes back will be a single however the prompt is worded, because the prompt cannot put someone in a frame the camera is not pointed at.`,
        fix: "Widen out, or swing the camera until both performers sit inside the frame.",
        action: "rehearsal",
      });
    }

    if ((declared === "single" || declared === "ots") && subject && !inFrame(s.camera, subject)) {
      out.push({
        kind: "break",
        area: "intent",
        title: `"${s.name}" is marked ${declared === "ots" ? "an over-the-shoulder" : "a single"} on ${named}, who is not in frame`,
        detail: `The camera is pointed somewhere else. ${inShot.length ? "What is actually in frame is " + inShot.map((a) => a.name).join(" and ") + "." : "Nothing is in frame at all."}`,
        fix: `Aim the camera at ${named}, or change what this setup is for.`,
        action: "rehearsal",
      });
    }

    if (declared === "single" && subject && inFrame(s.camera, subject) && inShot.length > 1) {
      const others = inShot.filter((a) => a.name !== named);
      out.push({
        kind: "warning",
        area: "intent",
        title: `"${s.name}" is marked a single but ${others.map((a) => a.name).join(" and ")} ${others.length === 1 ? "is" : "are"} in it too`,
        detail: "A single is one person in frame. With somebody else in it this is a two-shot or an over-the-shoulder, and it will cut like one — which matters most against its reverse, where a single and a two-shot do not pair.",
        fix: `Tighten or reangle until only ${named} is in frame, or mark this setup as what it actually is.`,
        action: "rehearsal",
      });
    }

    if (declared === "ots" && !overTheShoulder(s.camera, s.actors)) {
      out.push({
        kind: "warning",
        area: "intent",
        title: `"${s.name}" is marked over-the-shoulder with nobody in the foreground`,
        detail: "An over-the-shoulder needs one performer between the camera and the subject. From here the line to the subject is clear, so there is no shoulder in the frame and it will generate as a plain single.",
        fix: "Move the camera behind the other performer, close to the line between the two of them.",
        action: "rehearsal",
      });
    }

    // A neutral shot is the thing that lets you cross legitimately. If it is
    // not actually on the line it cannot do that job.
    if (declared === "neutral" && axis) {
      const off = distToAxis(axis, s.camera);
      if (off != null && off > ON_AXIS) {
        out.push({
          kind: "warning",
          area: "intent",
          title: `"${s.name}" is marked neutral but does not sit on the line`,
          detail: `A neutral shot looks straight down the axis, which is why it belongs to neither side and why you can cut out of it onto either one. This camera stands well off the line, so it reads as a side like any other — and cannot be the shot a cross is earned on.`,
          fix: `Move it onto the line between ${axis.a.name} and ${axis.b.name}.`,
          action: "rehearsal",
        });
      }
    }
  }

  // --- Reverse pairs that won't cut --------------------------------------
  const favoring = setups.filter((s) => favorsOf(s.row));
  const seen = new Set();
  for (const a of favoring) {
    for (const b of favoring) {
      if (a.row.id === b.row.id || favorsOf(a.row) === favorsOf(b.row)) continue;
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
          detail: `${ha} against ${hb}. Across a reverse pair that reads as a power shift between ${favorsOf(a.row)} and ${favorsOf(b.row)}, whether or not you meant one.`,
          fix: "Match the heights unless the shift is deliberate.",
          action: "rehearsal",
        });
      }
    }
  }

  // --- Nothing grounding the space ---------------------------------------
  // An insert is tight because that is what an insert is — it should not
  // count against the scene for lacking width. And a scene with no master by
  // design is a legitimate choice, so the director says so once and is not
  // told about it again.
  const byDesign = (slots ?? []).some((r) => r.no_master_by_design === true);
  const continuity = setups.filter((s) => intentOf(s.row) !== "insert");
  const hasWide = continuity.some((s) =>
    intentOf(s.row) === "master" || /wide/i.test(String(s.row.shot_size || "")));

  if (!hasWide && !byDesign && continuity.length >= 2) {
    out.push({
      kind: "warning",
      area: "coverage",
      title: `No wide shot in "${planName}"`,
      detail: `${continuity.length === 2 ? "Both setups are" : `All ${continuity.length} setups are`} medium or tighter. Nothing establishes where anyone is standing, so every cut asks the audience to work it out from faces alone.`,
      fix: "Add a master from the side of the axis the rest of the coverage sits on, or mark the scene as having no master by design.",
      action: "rehearsal",
    });
  }

  // --- One-sided coverage -------------------------------------------------
  const favored = [...new Set(setups.map((s) => favorsOf(s.row)).filter(Boolean))];
  const coversEveryone = setups.some((s) => {
    const i = intentOf(s.row);
    return i === "master" || i === "two_shot";
  });
  if (favored.length === 1 && !coversEveryone && reference && reference.actors.length > 1) {
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
  if (axis && crossing.length === 0 && directional.length >= 2) {
    out.push({
      kind: "ok",
      area: "screen direction",
      title: `All ${directional.length} setups hold the same side of the line`,
      detail: `The axis between ${axis.a.name} and ${axis.b.name} is intact across every setup in "${planName}" that carries screen direction. These will cut together.`,
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

  const order = { break: 0, warning: 1, note: 2, ok: 3 };
  const all = [];
  for (const group of byPlan.values()) all.push(...auditPlan(group));
  return all.sort((a, b) => (order[a.kind] ?? 1) - (order[b.kind] ?? 1)).slice(0, 10);
}

// How many setups in a set carry the coordinates this audit needs.
export function geometricCount(slots = []) {
  return (slots ?? []).filter(isGeometric).length;
}
