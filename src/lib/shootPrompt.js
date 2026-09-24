/*
  shootPrompt — RevaultAI
  Turns a blocked rehearsal into a prompt for the generator: the framing and
  lens the geometry engine chose, how the camera moves, who crosses where and
  when, and the beats the director marked. No API call — it reads what the
  studio already knows.

  The camera view itself is never sent to a model: it shows stand-ins, and a
  model given that picture would copy the stand-ins. The description transfers;
  the picture stays for the director.
*/
import { stateAt } from "./rehearsal.js";
import { readStage, describeStage, eyelinesFor } from "./stageGeometry.js";
import { blankSpec, mergeSpec } from "./filmSpec.js";
import { getSet } from "./setCatalog.js";
import { setSentence } from "./setGeometry.js";

const UNITS_PER_METRE = 5;

// The studio calls it 2.39:1; the generator calls the same frame 21:9.
const ASPECT_OUT = { "2.39:1": "21:9" };
const mapAspect = (a) => ASPECT_OUT[a] ?? a ?? "16:9";
const m = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) / UNITS_PER_METRE;
const bearingTo = (from, to) => (Math.atan2(to.x - from.x, -(to.y - from.y)) * 180) / Math.PI;
const delta = (a, b) => ((((b - a) % 360) + 540) % 360) - 180;

// Which side of frame something sits, from this camera.
function side(camera, p) {
  const off = delta(camera.rotation ?? 0, bearingTo(camera, p));
  return Math.abs(off) < 5 ? "centre frame" : off < 0 ? "frame left" : "frame right";
}

function cameraMove(c0, c1, subj0, subj1) {
  const travel = m(c0, c1);
  const turn = Math.abs(delta(c0.rotation ?? 0, c1.rotation ?? 0));
  const d0 = subj0 ? m(c0, subj0) : null;
  const d1 = subj1 ? m(c1, subj1) : null;
  const closing = d0 != null && d1 != null ? d0 - d1 : 0;

  if (travel < 0.25 && turn < 6) return "The camera is locked off.";
  if (travel < 0.25) return `The camera pans ${delta(c0.rotation ?? 0, c1.rotation ?? 0) > 0 ? "right" : "left"} across ${Math.round(turn)} degrees.`;
  if (Math.abs(closing) > 0.6 * travel) {
    return closing > 0
      ? `The camera pushes in about ${closing.toFixed(1)} metres, tightening as it goes.`
      : `The camera pulls back about ${Math.abs(closing).toFixed(1)} metres, opening the frame out.`;
  }
  if (turn > 15) return `The camera arcs around the subject, travelling about ${travel.toFixed(1)} metres.`;
  return `The camera tracks about ${travel.toFixed(1)} metres, holding the subject as it moves.`;
}

function movementOf(a0, a1, c0, c1, name) {
  const travelled = m(a0, a1);
  const turned = Math.abs(delta(a0.facing ?? 0, a1.facing ?? 0));
  const bits = [];
  if (travelled > 0.6) {
    const from = side(c0, a0), to = side(c1, a1);
    bits.push(from === to
      ? `${name} moves about ${travelled.toFixed(1)} metres, staying ${from}`
      : `${name} crosses from ${from} to ${to}`);
  } else if (turned > 35) {
    bits.push(`${name} turns on the spot`);
  }
  if (a0.pose !== a1.pose) {
    const verb = { stand: "stands", sit: "sits", crouch: "crouches down" }[a1.pose] ?? "shifts";
    bits.push(bits.length ? `and ${verb}` : `${name} ${verb}`);
  }
  return bits.join(", ");
}

export function buildShootPrompt(r, cameraId) {
  const rehearsal = cameraId && cameraId !== r.activeCamera ? { ...r, activeCamera: cameraId } : r;
  const duration = rehearsal.duration || 8;
  const s0 = stateAt(rehearsal, 0);
  const sMid = stateAt(rehearsal, duration / 2);
  const s1 = stateAt(rehearsal, duration);

  const read0 = readStage(s0.camera, s0.actors);
  const read1 = readStage(s1.camera, s1.actors);
  const subj0 = s0.actors.find((a) => a.name === read0.subject) ?? null;
  const subj1 = s1.actors.find((a) => a.name === read0.subject) ?? null;

  const lines = [];

  // The room first: where this happens, and where everyone stands in it.
  const set = getSet(rehearsal.setId);
  if (set) lines.push(setSentence(set, s0.actors));
  else if (rehearsal.setName) lines.push(`Shot inside ${rehearsal.setName}.`);

  // Framing, as the geometry engine reads it.
  lines.push(describeStage(read0));
  if (read1.shotSize && read1.shotSize !== read0.shotSize) {
    lines.push(`By the end it has become a ${read1.shotSize.toLowerCase()}.`);
  }

  lines.push(cameraMove(s0.camera, s1.camera, subj0, subj1));

  // Who moves, and where they end up.
  const moves = s0.actors
    .map((a, i) => movementOf(a, s1.actors[i] ?? a, s0.camera, s1.camera, a.name))
    .filter(Boolean);
  if (moves.length) lines.push(moves.join(". ") + ".");

  // Eyelines at the middle of the shot, where the scene is usually playing.
  const eyes = eyelinesFor(sMid.camera, sMid.actors);
  if (eyes.length) lines.push(eyes.map((e) => e.text).join(" "));

  // The beats the director marked, in order.
  const beats = [...(rehearsal.beats ?? [])].sort((a, b) => a.t - b.t);
  if (beats.length) {
    lines.push(beats.map((b) => `At ${b.t.toFixed(1)} seconds, ${b.label.trim().replace(/\.$/, "")}.`).join(" "));
  }

  return {
    // A camera pointing at nobody has nothing to shoot.
    ok: !!read0.subject,
    prompt: lines.join(" ").replace(/\s+/g, " ").trim(),
    seconds: duration,
    aspect: mapAspect(rehearsal.aspect),
    camera: (rehearsal.cameras ?? []).find((c) => c.id === rehearsal.activeCamera)?.name ?? "Camera",
    subject: read0.subject ?? null,
    names: s0.actors.map((a) => a.name).filter(Boolean),
  };
}


// What the stage actually looks like at one instant, in plain words — the
// kind of sentence continuity checking can compare a later take against.
function stateSentence(camera, actors) {
  const parts = (actors ?? []).map((a) => {
    const pose = a.pose === "sit" ? "seated" : a.pose === "crouch" ? "crouched" : "standing";
    return `${a.name} ${side(camera, a)}, ${pose}`;
  });
  return parts.join("; ") + ".";
}

// The same angle as a Shot Spec: structure rather than one model's prompt, so
// it can be compiled for any model, compared against the take afterwards, and
// inherited by the shot that follows.
export function buildShootSpec(r, cameraId) {
  const rehearsal = cameraId && cameraId !== r.activeCamera ? { ...r, activeCamera: cameraId } : r;
  const built = buildShootPrompt(rehearsal, cameraId);
  const duration = rehearsal.duration || 8;
  const s0 = stateAt(rehearsal, 0);
  const sMid = stateAt(rehearsal, duration / 2);
  const s1 = stateAt(rehearsal, duration);
  const read0 = readStage(s0.camera, s0.actors);
  const read1 = readStage(s1.camera, s1.actors);
  const set = getSet(rehearsal.setId);

  const moves = s0.actors
    .map((a, i) => movementOf(a, s1.actors[i] ?? a, s0.camera, s1.camera, a.name))
    .filter(Boolean)
    .join(". ");

  const beats = [...(rehearsal.beats ?? [])].sort((a, b) => a.t - b.t);

  return mergeSpec(blankSpec(), {
    identity: {
      title: `${rehearsal.title || "Rehearsal"} — ${built.camera}`,
      purpose: beats.length ? beats.map((b) => b.label.trim()).join("; ") : "",
    },
    subjects: {
      characters: s0.actors.map((a) => a.name).filter(Boolean),
      locations: set ? [set.name] : [],
    },
    action: {
      primary: moves || describeStage(read0),
      startState: stateSentence(s0.camera, s0.actors),
      endState: stateSentence(s1.camera, s1.actors),
    },
    camera: {
      shotSize: read1.shotSize && read1.shotSize !== read0.shotSize ? `${read0.shotSize} to ${read1.shotSize}` : read0.shotSize || "",
      lens: read0.lens || "",
      movement: cameraMove(s0.camera, s1.camera,
        s0.actors.find((a) => a.name === read0.subject) ?? null,
        s1.actors.find((a) => a.name === read0.subject) ?? null),
      // Kept so the blocking can be reopened on the plan later.
      layout: {
        camera: { x: s0.camera.x, y: s0.camera.y, rotation: s0.camera.rotation },
        actors: s0.actors.map((a) => ({ name: a.name, x: a.x, y: a.y, facing: a.facing, pose: a.pose })),
      },
    },
    composition: {
      screenDirection: read0.subject ? `${read0.subject} ${side(s0.camera, s0.actors.find((a) => a.name === read0.subject) ?? s0.camera)}` : "",
      positions: s0.actors.map((a) => ({ name: a.name, side: side(s0.camera, a) })),
      eyelines: eyelinesFor(sMid.camera, sMid.actors).map((e) => e.text),
    },
    timing: { durationSeconds: duration, aspectRatio: mapAspect(rehearsal.aspect) },
    performance: { notes: beats.map((b) => `${b.t.toFixed(1)}s: ${b.label.trim()}`).join(". ") },
    model: { compiledPrompt: built.prompt },
  });
}