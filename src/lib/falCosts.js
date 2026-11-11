/*
  falCosts — RevaultAI
  What fal charges for a second of each video model, measured rather than
  remembered, and the floor every credit rate has to clear.

  This file exists because a rate was once set from a marketing page. fal's
  own pricing API said something different, and Wan 2.6 — the default model —
  was being sold for less than it cost on every pack but Starter. Nothing in
  the build knew, because nothing in the build compared the two numbers.

  Every figure below came from
    GET https://api.fal.ai/v1/models/pricing?endpoint_id=<id>
  through api/verify-models.js, which is the only thing here that can read
  live prices — it holds the FAL_KEY. Run **Model ids** on the admin page to
  re-measure. The route compares what it reads against this file and says so
  when they differ, so a price rise on fal's side surfaces as a report
  instead of as a slow leak.

  measured: 2026-11-11

  A cost of null means NOT MEASURED. check-margin treats it as unknown and
  says so rather than assuming it is fine, because an unverified rate is
  exactly how this problem started.

  Token-priced models are not per-second and are recorded separately below.
*/

/*
  Measured prices, per ENDPOINT rather than per model, because that is the
  grain fal prices at and the grain a comparison has to be made at. Two facts
  make this necessary:

    - MiniMax serves all three tiers from one endpoint, with the resolution
      passed as input. Recording one figure per model would mean recording
      the same number three times.
    - The same model costs different amounts down different paths:
      minimax/h3-max/reference-to-video is $0.05/sec while its text path is
      $0.035. A creator picks the path, so the model's real floor is its
      dearest one.

  measured: 2026-11-11, by api/verify-models.js against
  GET https://api.fal.ai/v1/models/pricing?endpoint_id=<id>
*/
export const FAL_PRICE_PER_SECOND = {
  "wan/v2.6/text-to-video": 0.10,
  "wan/v2.6/image-to-video": 0.10,
  "fal-ai/kling-video/v3/standard/text-to-video": 0.14,
  "fal-ai/kling-video/v3/standard/image-to-video": 0.14,
  "fal-ai/kling-video/o3/standard/reference-to-video": 0.14,
  "minimax/h3-max/text-to-video": 0.035,
  "minimax/h3-max/image-to-video": 0.035,
  "minimax/h3-max/reference-to-video": 0.05,
  "fal-ai/veo3.1/fast": 0.15,
  "fal-ai/veo3.1/fast/image-to-video": 0.15,
  "kling/v4/text-to-video": 0.157,
  "kling/v4/image-to-video": 0.157,
  "kling/v4/reference-to-video": 0.157,
  "kling/v4/video-to-video/edit": 0.157,
  // fal-ai/veo3.1/fast/text-to-video is quoted at 0.00017 USD per COMPUTE
  // second, which is a different unit from every other figure here and
  // cannot be turned into a cost per second of output without knowing how
  // long the compute runs. Left out rather than converted by guesswork; the
  // bare fal-ai/veo3.1/fast path above is the figure the rate is set from.
  // fal-ai/veo3.1/fast/reference-to-video has not been read yet.
};

/*
  Which endpoints each model can be run through. Written out because
  "wan-2.6" and "wan/v2.6/text-to-video" have no mechanical relationship —
  the first attempt at deriving one matched nothing at all, and a comparison
  that cannot fire reads exactly like one that found nothing wrong.
*/
export const FAL_ENDPOINTS = {
  "wan-2.6": ["wan/v2.6/text-to-video", "wan/v2.6/image-to-video"],
  "kling-3.0": [
    "fal-ai/kling-video/v3/standard/text-to-video",
    "fal-ai/kling-video/v3/standard/image-to-video",
    "fal-ai/kling-video/o3/standard/reference-to-video",
  ],
  "minimax-h3-480": [
    "minimax/h3-max/text-to-video",
    "minimax/h3-max/image-to-video",
    "minimax/h3-max/reference-to-video",
  ],
  "minimax-h3": [
    "minimax/h3-max/text-to-video",
    "minimax/h3-max/image-to-video",
    "minimax/h3-max/reference-to-video",
  ],
  "minimax-h3-1080": [
    "minimax/h3-max/text-to-video",
    "minimax/h3-max/image-to-video",
    "minimax/h3-max/reference-to-video",
  ],
  "veo-3.1": ["fal-ai/veo3.1/fast", "fal-ai/veo3.1/fast/image-to-video"],
  "kling-4.0": [
    "kling/v4/text-to-video",
    "kling/v4/image-to-video",
    "kling/v4/reference-to-video",
    "kling/v4/video-to-video/edit",
  ],
};

/*
  A model costs what its DEAREST path costs. Taking the cheapest, or the
  first, would certify a rate against a route the creator may never use:
  MiniMax at 1 credit/sec clears 1.83x down its text path and 1.28x down its
  reference path, and only the second one is the number worth trusting.

  null means no endpoint of that model has been measured — not that it is
  free, and not that it is fine.
*/
export const FAL_COST_PER_SECOND = Object.fromEntries(
  Object.entries(FAL_ENDPOINTS).map(([key, ids]) => {
    const known = ids.map((id) => FAL_PRICE_PER_SECOND[id]).filter((n) => typeof n === "number");
    return [key, known.length ? Math.max(...known) : null];
  }),
);

// id -> model key, for comparing a live read against the recorded figure.
// A shared endpoint maps to the first model listed against it; they all
// record the same price, so the comparison is the same either way.
export const MODEL_FOR_ENDPOINT = Object.fromEntries(
  Object.entries(FAL_ENDPOINTS).flatMap(([key, ids]) => ids.map((id) => [id, key])),
);

/*
  Seedance bills per thousand tokens, where tokens are
  (height x width x seconds x fps) / 1024. A 720p 16:9 five-second take is
  about 108,000 tokens, so 2.5 costs roughly $2.31 and 2.0-fast roughly
  $1.21. Both clear their rates comfortably, which is why they are recorded
  as a note rather than converted to a per-second figure that would be wrong
  at every resolution but one.
*/
export const FAL_COST_PER_1K_TOKENS = {
  "seedance-2.0": 0.0112,
  "seedance-2.0-480": 0.0112,
  "seedance-2.5": 0.0214,
  "seedance-2.5-480": 0.0214,
};

/*
  The floor is the pack with the deepest discount, because a creator who
  bought credits there spends them on whatever model they like. Checking
  against the Starter rate would have passed Wan 2.6 at 1 credit/sec, which
  is precisely the mistake.
*/
export const marginAt = (creditsPerSecond, centsPerCredit, falCostPerSecond) =>
  (creditsPerSecond * centsPerCredit) / falCostPerSecond;
