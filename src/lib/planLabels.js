/*
  planLabels — RevaultAI

  Where to put the names on the plan.

  Every label used to sit a fixed distance above its own body. That is correct
  for two people standing apart and wrong the moment a scene gets crowded: six
  performers around a table put six names on top of each other, and a camera
  pushed close to somebody puts CAM through their turn ring.

  So placement is worked out rather than assumed. Each label is tried in a
  ring of candidate positions, nearest first, and the first one that hits
  nothing already placed is taken. Nothing is hidden and nothing is shrunk —
  a name that cannot be read is the same as a name that is not there.

  All distances are in stage units (the plan is 100x100, 5 units to the
  meter). The caller converts its pixel sizes into units before calling, which
  is why the label box arrives as a size rather than a font.
*/

/* Does box a overlap box b, with a little breathing room? */
function boxesHit(a, b, pad = 0.6) {
  return !(
    a.x + a.w / 2 + pad < b.x - b.w / 2 ||
    a.x - a.w / 2 - pad > b.x + b.w / 2 ||
    a.y + a.h / 2 + pad < b.y - b.h / 2 ||
    a.y - a.h / 2 - pad > b.y + b.h / 2
  );
}

/* Does a box overlap a circle? Nearest-point test, not center distance. */
function boxHitsCircle(box, c, pad = 0.4) {
  const nx = Math.max(box.x - box.w / 2, Math.min(c.x, box.x + box.w / 2));
  const ny = Math.max(box.y - box.h / 2, Math.min(c.y, box.y + box.h / 2));
  const dx = c.x - nx;
  const dy = c.y - ny;
  return dx * dx + dy * dy < (c.r + pad) * (c.r + pad);
}

/*
  The order candidates are tried in. Above first because that is where a name
  reads most naturally, then below, then the sides, then the diagonals, then
  the same again further out. Each entry is a multiplier on the label's own
  size, so a long name is pushed further than a short one.
*/
const DIRS = [
  [0, -1], [0, 1], [1, 0], [-1, 0],
  [1, -1], [-1, -1], [1, 1], [-1, 1],
];
const RINGS = [1, 1.7, 2.5, 3.4];

/**
 * @param items      [{ id, x, y, w, h, fixed? }] — anchor point and box size, in stage units.
 *                   A fixed item stays exactly where it is and only takes up
 *                   room: a set label belongs in the middle of its furniture,
 *                   so the performers' names move around it rather than it
 *                   drifting off the table it names.
 * @param circles    [{ x, y, r }]        — bodies, turn rings, camera discs to avoid
 * @param view       { x, y, size }       — the drawn window, so nothing is placed off the edge
 * @param gap        distance from the anchor to the near edge of the label
 * @returns          [{ id, x, y, moved, collides }] in the order given
 */
export function placeLabels(items, circles = [], view = null, gap = 2.6) {
  const placed = [];
  const out = [];

  const clamp = (box) => {
    if (!view) return box;
    const minX = view.x + box.w / 2 + 0.5;
    const maxX = view.x + view.size - box.w / 2 - 0.5;
    const minY = view.y + box.h / 2 + 0.5;
    const maxY = view.y + view.size - box.h / 2 - 0.5;
    return {
      ...box,
      x: Math.max(minX, Math.min(maxX, box.x)),
      y: Math.max(minY, Math.min(maxY, box.y)),
    };
  };

  /*
    Crowded anchors first. A label with little room around it has the fewest
    workable positions, so it should choose before the ones with plenty — the
    reverse order leaves the hardest label with nothing left.
  */
  /*
    Fixed labels claim their space before anything else is considered, so a
    movable label never has to be un-placed after the fact.
  */
  for (const it of items) {
    if (!it.fixed) continue;
    const box = { w: it.w, h: it.h, x: it.x, y: it.y };
    placed.push(box);
  }

  const crowding = (it) =>
    items.reduce((n, other) => (other === it ? n : n + (Math.hypot(other.x - it.x, other.y - it.y) < 14 ? 1 : 0)), 0);
  const order = items
    .filter((it) => !it.fixed)
    .map((it, i) => ({ it, i, crowd: crowding(it) }))
    .sort((a, b) => b.crowd - a.crowd || a.i - b.i);

  const results = new Map();

  for (const { it } of order) {
    let best = null;
    let bestScore = Infinity;

    for (const r of RINGS) {
      for (const [dx, dy] of DIRS) {
        const box = clamp({
          w: it.w,
          h: it.h,
          x: it.x + dx * (it.w / 2 + gap) * r,
          y: it.y + dy * (it.h / 2 + gap) * r,
        });

        let score = 0;
        for (const p of placed) if (boxesHit(box, p)) score += 10;
        for (const c of circles) if (boxHitsCircle(box, c)) score += 10;
        // Prefer near and prefer above, so a clean placement still looks
        // deliberate rather than flung to one side.
        score += r * 0.6 + (dy < 0 ? 0 : dy > 0 ? 0.3 : 0.15) + (dx !== 0 ? 0.2 : 0);

        if (score < bestScore) { bestScore = score; best = box; }
        if (score < 1) break;
      }
      if (bestScore < 1) break;
    }

    placed.push(best);
    results.set(it.id, {
      id: it.id,
      x: best.x,
      y: best.y,
      // Did it end up anywhere other than straight above?
      moved: Math.abs(best.x - it.x) > 0.01 || best.y > it.y,
      // True only if even the best position still overlaps something, which
      // is a scene too crowded to label cleanly rather than a bug.
      collides: bestScore >= 10,
    });
  }

  for (const it of items) {
    out.push(it.fixed
      ? { id: it.id, x: it.x, y: it.y, moved: false, collides: false }
      : results.get(it.id));
  }
  return out;
}

/*
  A rough width for a label, in stage units. Monospace, so character count is
  a good enough measure and far cheaper than measuring text for every frame.
*/
export function labelBox(text, unitsPerPx, fontPx) {
  const chars = String(text ?? "").length || 1;
  return {
    w: chars * fontPx * 0.62 * unitsPerPx,
    h: fontPx * 1.25 * unitsPerPx,
  };
}
