import { stateAt } from "./rehearsal.js";

/*
  The geometry behind the hero's scene loop, kept out of the component so it
  can be checked without a browser. Both functions sample the whole duration
  rather than the current instant: the view must not jitter as people move,
  and the trail is the entire path, which is the thing worth showing.
*/

// One box for the whole scene, across its whole duration.
export function fitFor(r, { pad = 6, min = 24, samples = 40 } = {}) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const grow = (x, y) => {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  };
  /*
    Fit to the action, not to the set. An exterior floor is 130 units across,
    and including it put two people on a street corner at the size of a full
    stop. The floor is allowed to bleed off the edges, which is what a frame
    does anyway.
  */
  for (let i = 0; i <= samples; i++) {
    const s = stateAt(r, (i / samples) * r.duration);
    for (const a of s.actors) grow(a.x, a.y);
    grow(s.camera.x, s.camera.y);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, size: 100 };
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const size = Math.max(maxX - minX, maxY - minY, min);
  return { x: (minX + maxX) / 2 - size / 2, y: (minY + maxY) / 2 - size / 2, size };
}

// The path one performer walks, as SVG polyline points.
export function trailFor(r, index, { samples = 48 } = {}) {
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const s = stateAt(r, (i / samples) * r.duration);
    const a = s.actors[index];
    if (a) pts.push(`${a.x.toFixed(1)},${a.y.toFixed(1)}`);
  }
  return pts.join(" ");
}
