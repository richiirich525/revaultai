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

// US dollars per second of generated video.
export const FAL_COST_PER_SECOND = {
  "wan-2.6": 0.100,
  "kling-3.0": 0.140,
  "kling-4.0": 0.157,        // all four endpoints, one flat rate
  "veo-3.1": null,           // not measured — the read was rate-limited
  "minimax-h3-480": null,
  "minimax-h3": null,
  "minimax-h3-1080": null,
};

/*
  Which fal endpoints each model is served from, so a live price can be
  matched to a recorded one by its exact id. Written out rather than derived:
  "wan-2.6" and "wan/v2.6/text-to-video" have no mechanical relationship, and
  the first attempt at guessing one silently matched nothing at all, which is
  worse than not checking — a drift report that can never fire reads like a
  clean bill of health.
*/
export const FAL_ENDPOINTS = {
  "wan-2.6": ["wan/v2.6/text-to-video", "wan/v2.6/image-to-video"],
  "kling-3.0": [
    "fal-ai/kling-video/v3/standard/text-to-video",
    "fal-ai/kling-video/v3/standard/image-to-video",
  ],
  "minimax-h3-480": ["minimax/h3-max/text-to-video", "minimax/h3-max/image-to-video"],
  "kling-4.0": [
    "kling/v4/text-to-video",
    "kling/v4/image-to-video",
    "kling/v4/reference-to-video",
    "kling/v4/video-to-video/edit",
  ],
};

// id -> model key, for comparing a live read against the recorded figure.
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
