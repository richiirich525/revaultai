/*
  check-starters — the starter scenes are hand-authored coordinates, which is
  exactly the kind of thing that looks right in a diff and is wrong on screen.
  This runs them through the same functions the studio does.
*/
import { STARTERS } from "../src/lib/starters.js";
import { stateAt, keyTimes } from "../src/lib/rehearsal.js";
import { readStage } from "../src/lib/stageGeometry.js";
import { walkThroughs } from "../src/lib/stageCollision.js";
import { activeRoom } from "../src/lib/setEdit.js";
import { getAction } from "../src/lib/actions.js";
import { getSet } from "../src/lib/setCatalog.js";
import { fitFor, trailFor } from "../src/lib/scenePreview.js";

const problems = [];
const MOVED = 1.5; // stage units; below this nothing visibly happens

for (const starter of STARTERS) {
  const r = starter.make();
  const tag = starter.id;
  const room = activeRoom(r);

  if (r.setId && !getSet(r.setId)) problems.push(`${tag}: no set called "${r.setId}"`);

  // Keyframes in order, inside the shot, and every action real.
  for (const a of r.actors) {
    const ts = a.keys.map((k) => k.t);
    if (ts.some((t, i) => i && t <= ts[i - 1])) problems.push(`${tag}/${a.name}: keyframes out of order (${ts})`);
    if (ts[0] !== 0) problems.push(`${tag}/${a.name}: first keyframe is at ${ts[0]}s, not 0`);
    if (Math.max(...ts) > r.duration) problems.push(`${tag}/${a.name}: a keyframe past the ${r.duration}s end`);
    for (const k of a.keys) {
      if (k.action && !getAction(k.action)) problems.push(`${tag}/${a.name}: no action called "${k.action}"`);
    }
  }
  for (const c of r.cameras) {
    const ts = c.keys.map((k) => k.t);
    if (ts.some((t, i) => i && t <= ts[i - 1])) problems.push(`${tag}/${c.name}: camera keyframes out of order`);
  }

  // Something has to actually move, or the scene is a photograph.
  let travel = 0;
  const first = stateAt(r, 0);
  const last = stateAt(r, r.duration);
  for (let i = 0; i < r.actors.length; i++) {
    travel = Math.max(travel, Math.hypot(last.actors[i].x - first.actors[i].x, last.actors[i].y - first.actors[i].y));
  }
  const camTravel = Math.hypot(last.camera.x - first.camera.x, last.camera.y - first.camera.y);
  if (travel < MOVED && camTravel < MOVED) {
    problems.push(`${tag}: nothing moves more than ${MOVED}u — performers ${travel.toFixed(1)}, camera ${camTravel.toFixed(1)}`);
  }

  // The camera has to be looking at somebody, all the way through.
  const samples = [0, 0.25, 0.5, 0.75, 1].map((f) => +(f * r.duration).toFixed(2));
  const blind = [];
  for (const t of samples) {
    const s = stateAt(r, t);
    if (!readStage(s.camera, s.actors).subject) blind.push(t + "s");
  }
  if (blind.length) problems.push(`${tag}: camera is framing nobody at ${blind.join(", ")}`);

  // And nobody walks through the furniture.
  const through = walkThroughs(r, room);
  for (const w of through) {
    problems.push(`${tag}: ${w.name} walks through ${w.label} between ${w.from.toFixed(1)}s and ${w.to.toFixed(1)}s`);
  }

  // The hero plays these, so its view box and trails have to be sane too.
  const fit = fitFor(r);
  if (![fit.x, fit.y, fit.size].every(Number.isFinite)) problems.push(`${tag}: hero view box is not a number`);
  if (fit.size > 160 || fit.size < 20) problems.push(`${tag}: hero view box is ${fit.size.toFixed(0)}u — unusable`);
  for (let i = 0; i < r.actors.length; i++) {
    const pts = trailFor(r, i).split(" ").map((p) => p.split(",").map(Number));
    if (pts.some((p) => p.some((n) => !Number.isFinite(n)))) problems.push(`${tag}: trail ${i} has a bad point`);
    const inside = pts.every(([x, y]) =>
      x >= fit.x - 1 && x <= fit.x + fit.size + 1 && y >= fit.y - 1 && y <= fit.y + fit.size + 1);
    if (!inside) problems.push(`${tag}: ${r.actors[i].name} walks outside the hero view box`);
  }

  const mid = stateAt(r, r.duration / 2);
  const read = readStage(mid.camera, mid.actors);
  console.log(
    `  ${starter.name.padEnd(17)} ${r.duration}s  ${String(keyTimes(r).length).padStart(2)} marks  ` +
    `moves ${travel.toFixed(0)}u / cam ${camTravel.toFixed(0)}u  ` +
    `mid-shot: ${(read.shotSize ?? "—").padEnd(18)} hero box ${fit.size.toFixed(0)}u`
  );
}

if (problems.length) {
  console.error("\ncheck-starters FAILED:\n");
  for (const p of problems) console.error("  - " + p);
  console.error("");
  process.exit(1);
}
console.log(`\ncheck-starters: ${STARTERS.length} scenes, all valid.`);
