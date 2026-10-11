/*
  cutClips — RevaultAI (Finish)
  Fetches the source clips a cut refers to, once each, and reads each file's
  own header. Shared by FinishExport (which zips them with an EDL) and
  FinishRender (which stitches them into one video), so both see the same
  clips, the same frame rates and the same failures.
*/

import { readMp4Info } from "./mp4info.js";

export async function fetchCutShots({ cut, urls, onStatus, signal }) {
  const shots = (cut?.shots ?? [])
    .map((s) => ({ ...s, from: Number(s.from), to: Number(s.to) }))
    .filter((s) => s.to > s.from);

  const ids = [...new Set(shots.map((s) => s.generationId))];
  const byId = {};
  const failed = [];

  let n = 0;
  for (const id of ids) {
    n++;
    onStatus?.(`Fetching clip ${n} of ${ids.length}…`);
    try {
      if (!urls[id]) throw new Error("no link");
      const r = await fetch(urls[id], { signal });
      if (!r.ok) throw new Error("fetch failed");
      const buf = await r.arrayBuffer();
      const info = readMp4Info(buf);
      if (!info) throw new Error("unreadable");
      byId[id] = { data: new Uint8Array(buf), info };
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      failed.push(id);
    }
  }

  return { shots, ids, byId, failed };
}

// The timeline takes the rate most of the clips share, and the pixel size
// most of them share — tie broken by the larger frame, so a single odd clip
// never drags the whole cut down to a draft-tier resolution.
export function targetFormat(infos) {
  const rate = {};
  for (const i of infos) rate[i.nominal] = (rate[i.nominal] || 0) + 1;
  const fps = Number(Object.entries(rate).sort((a, b) => b[1] - a[1])[0]?.[0] || 24);

  const size = {};
  for (const i of infos) {
    if (!i.width || !i.height) continue;
    const key = `${i.width}x${i.height}`;
    size[key] = (size[key] || 0) + 1;
  }
  const ranked = Object.entries(size).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    const area = (k) => k.split("x").reduce((x, y) => Number(x) * Number(y));
    return area(b[0]) - area(a[0]);
  });

  let [width, height] = (ranked[0]?.[0] ?? "1280x720").split("x").map(Number);
  // yuv420p needs even dimensions.
  width -= width % 2;
  height -= height % 2;

  return { fps, width, height };
}
