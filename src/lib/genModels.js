/*
  genModels — RevaultAI
  The video models a creator can generate with, and what a second of each one
  costs in credits.

  This mirrors MODELS in api/generate-video.js, which is the authority: the
  server charges from its own table. These two must stay in step, or the price
  shown before a job is not the price taken for it. Changing a cost here
  without changing it there is a bug.

  Not to be confused with GEN_MODELS in lib/generatorCatalog.js, which is the
  prose описание catalog for the marketing page and carries no prices.
*/

export const GEN_MODELS = [
  { key: "wan-2.6", label: "Wan 2.6 — Fast", costPerSecond: 1, durations: [5, 10, 15], ratios: ["16:9", "9:16", "1:1"] },
  { key: "kling-3.0", label: "Kling 3.0 — Cinematic", costPerSecond: 2, durations: [5, 10], ratios: ["16:9", "9:16", "1:1"], ratioFromImage: true },
  { key: "seedance-2.0-480", label: "Seedance 2.0 — Draft (480p)", costPerSecond: 3, durations: [5, 10, 15], ratios: ["16:9", "9:16", "1:1", "21:9"] },
  { key: "seedance-2.0", label: "Seedance 2.0 — Flagship (720p)", costPerSecond: 6, durations: [5, 10, 15], ratios: ["16:9", "9:16", "1:1", "21:9"] },
  { key: "seedance-2.5-480", label: "Seedance 2.5 — Draft (480p, up to 30s)", costPerSecond: 6, durations: [5, 10, 15, 30], ratios: ["16:9", "9:16", "1:1", "21:9"] },
  { key: "seedance-2.5", label: "Seedance 2.5 — Flagship (720p, up to 30s)", costPerSecond: 12, durations: [5, 10, 15, 30], ratios: ["16:9", "9:16", "1:1", "21:9"] },
  { key: "veo-3.1", label: "Veo 3.1 — Native Audio", costPerSecond: 4, durations: [4, 6, 8], ratios: ["16:9", "9:16"] },
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
