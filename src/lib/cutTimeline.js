/*
  cutTimeline — RevaultAI (Finish, pass 3)
  Lays an assembled cut end to end: where each shot starts in the scene,
  and which shot and moment any point in the scene falls on.
*/

// Only shots whose clip is ready to play, laid end to end.
export function buildTimeline(shots = [], urls = {}) {
  let at = 0;
  const pieces = [];
  for (const s of shots) {
    const from = Number(s.from), to = Number(s.to);
    if (!urls[s.generationId] || !(to > from)) continue;
    pieces.push({ ...s, from, to, start: at, length: to - from });
    at += to - from;
  }
  return { pieces, total: at, waiting: shots.length - pieces.length };
}

// A moment in the scene -> which shot, and where inside that shot's clip.
export function locate(tl, seconds) {
  if (!tl.pieces.length) return { index: 0, time: 0 };
  const s = Math.max(0, Math.min(tl.total, seconds));
  for (let i = 0; i < tl.pieces.length; i++) {
    const p = tl.pieces[i];
    if (s < p.start + p.length || i === tl.pieces.length - 1) {
      return { index: i, time: p.from + Math.min(p.length, s - p.start) };
    }
  }
  return { index: 0, time: tl.pieces[0].from };
}

export function fmt(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}