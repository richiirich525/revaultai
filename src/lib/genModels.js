/*
  genModels — RevaultAI
  The video models a creator can generate with, and what a second of each one
  costs in credits.

  This mirrors MODELS in api/generate-video.js, which is the authority: the
  server charges from its own table. These two must stay in step, or the price
  shown before a job is not the price taken for it. Changing a cost here
  without changing it there is a bug.

  Not to be confused with GEN_MODELS in lib/generatorCatalog.js, which is the
  prose catalog for the marketing page and carries no prices.
*/

// Named for what each one does, not for where it sits in a ranking. Thirty
// seconds in a single take is the thing Seedance 2.5 has that nothing else
// here does, so that is what it is called; "flagship" was a claim about rank
// that stopped being true the moment a cheaper model did more.
export const GEN_MODELS = [
  { key: "wan-2.6", label: "Wan 2.6 — Fast", costPerSecond: 1, durations: [5, 10, 15], ratios: ["16:9", "9:16", "1:1"] },
  { key: "kling-3.0", label: "Kling 3.0 — Cinematic", costPerSecond: 2, durations: [5, 10], ratios: ["16:9", "9:16", "1:1"], ratioFromImage: true },
  { key: "seedance-2.0-480", label: "Seedance 2.0 — Draft (480p)", costPerSecond: 3, durations: [5, 10, 15], ratios: ["16:9", "9:16", "1:1", "21:9"] },
  { key: "seedance-2.0", label: "Seedance 2.0 — 720p", costPerSecond: 6, durations: [5, 10, 15], ratios: ["16:9", "9:16", "1:1", "21:9"] },
  { key: "seedance-2.5-480", label: "Seedance 2.5 — Long take, draft (480p, up to 30s)", costPerSecond: 6, durations: [5, 10, 15, 30], ratios: ["16:9", "9:16", "1:1", "21:9"] },
  { key: "seedance-2.5", label: "Seedance 2.5 — Long take (720p, up to 30s)", costPerSecond: 12, durations: [5, 10, 15, 30], ratios: ["16:9", "9:16", "1:1", "21:9"] },
  { key: "veo-3.1", label: "Veo 3.1 — Native Audio", costPerSecond: 4, durations: [4, 6, 8], ratios: ["16:9", "9:16"] },
  // MiniMax H3 Max. Twelve references, and the only model here that will open
  // on an exact first frame without dropping them — so a chained shot keeps
  // its faces. Four extra aspect ratios, 4:3 and 3:4 among them.
  // endFrame: this model will land the shot on an exact closing frame, which
  // is what the Frame Planner has been producing all along with nowhere to
  // send it. Set only where the endpoint schema actually lists end_image_url —
  // on minimax/h3-max/image-to-video it reads "may be provided alone for
  // end-only keyframe generation". The other families are unflagged because
  // their schemas have not been checked, not because they lack it.
  { key: "minimax-h3-480", label: "MiniMax H3 Max — Draft (480p)", costPerSecond: 1, durations: [5, 10, 15], ratios: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"], ratioFromImage: true, endFrame: true },
  { key: "minimax-h3", label: "MiniMax H3 Max — Standard (768p)", costPerSecond: 2, durations: [5, 10, 15], ratios: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"], ratioFromImage: true, endFrame: true },
  { key: "minimax-h3-1080", label: "MiniMax H3 Max — 1080p", costPerSecond: 3, durations: [5, 10, 15], ratios: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"], ratioFromImage: true, endFrame: true },
];

export const DEFAULT_MODEL = "wan-2.6";

export const modelOf = (key) =>
  GEN_MODELS.find((m) => m.key === key) ?? GEN_MODELS.find((m) => m.key === DEFAULT_MODEL);

// A model only accepts certain lengths. Snap to the nearest one it allows,
// because the server looks the duration up in a table and a value that isn't
// there is rejected rather than rounded.
export function snapDuration(key, seconds) {
  const m = modelOf(key);
  const want = Number(seconds) || m.durations[0];
  return m.durations.reduce((best, d) =>
    Math.abs(d - want) < Math.abs(best - want) ? d : best, m.durations[0]);
}

export function costOf(key, seconds) {
  const m = modelOf(key);
  return m.costPerSecond * snapDuration(key, seconds);
}
