import { createClient } from "@supabase/supabase-js";

/*
  verify-models — RevaultAI
  Asks fal whether every model id this codebase references actually exists.

  It sends each endpoint an empty input. Every one of these models requires a
  prompt, so validation fails before any work is queued: nothing generates and
  nothing is charged. What we read is the status code.

    404  the endpoint id is wrong
    422  the endpoint exists and rejected our empty input (what we want)
    401  FAL_KEY is missing or wrong
    200  unexpected — treat as suspicious and check by hand

  Admin only, and safe to re-run whenever a model is added or a provider
  renames something underneath us.
*/

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_EMAILS = ["richardgarland999@gmail.com"];

// Every id referenced in api/generate-video.js and api/generate-image.js,
// with where it is used so a failure points at the right line.
const ENDPOINTS = [
  ["wan/v2.6/text-to-video",                          "wan-2.6 falId"],
  ["wan/v2.6/image-to-video",                         "wan-2.6 imageFalId"],
  ["fal-ai/kling-video/v3/standard/text-to-video",    "kling-3.0 falId"],
  ["fal-ai/kling-video/v3/standard/image-to-video",   "kling-3.0 imageFalId"],
  ["fal-ai/kling-video/o3/standard/reference-to-video", "kling-3.0 reference"],
  ["bytedance/seedance-2.0/fast/text-to-video",       "seedance-2.0 falId"],
  ["bytedance/seedance-2.0/fast/image-to-video",      "seedance-2.0 imageFalId"],
  ["bytedance/seedance-2.0/fast/reference-to-video",  "seedance-2.0 reference"],
  ["bytedance/seedance-2.5/text-to-video",            "seedance-2.5 falId"],
  ["bytedance/seedance-2.5/image-to-video",           "seedance-2.5 imageFalId"],
  ["bytedance/seedance-2.5/reference-to-video",       "seedance-2.5 reference"],
  ["fal-ai/veo3.1/fast",                              "veo-3.1 (bare path)"],
  ["fal-ai/veo3.1/fast/text-to-video",                "veo-3.1 falId"],
  ["fal-ai/veo3.1/fast/image-to-video",               "veo-3.1 imageFalId"],
  ["fal-ai/veo3.1/fast/reference-to-video",           "veo-3.1 reference"],
  ["fal-ai/bytedance/seedream/v5/text-to-image",      "seedream-5.0 image"],
  ["fal-ai/nano-banana-2",                            "nano-banana-2 image"],
];

const VERDICT = {
  404: ["missing", "This id does not exist on fal."],
  422: ["ok", "Endpoint exists; it rejected the empty input, as expected."],
  401: ["auth", "FAL_KEY is missing or rejected."],
  403: ["auth", "FAL_KEY is not allowed to use this endpoint."],
  200: ["suspicious", "Accepted an empty input — check this one by hand."],
};

async function probe(id) {
  try {
    const r = await fetch("https://queue.fal.run/" + id, {
      method: "POST",
      headers: {
        "Authorization": "Key " + process.env.FAL_KEY,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    const [verdict, note] = VERDICT[r.status] ?? ["unknown", "Unexpected status."];
    return { status: r.status, verdict, note };
  } catch (err) {
    return { status: null, verdict: "unreachable", note: err.message };
  }
}

export default async function handler(req, res) {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });
    if (!ADMIN_EMAILS.includes((user.email ?? "").toLowerCase())) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (!process.env.FAL_KEY) {
      return res.status(500).json({ error: "FAL_KEY is not set in this environment." });
    }

    const results = [];
    for (const [id, where] of ENDPOINTS) {
      results.push({ id, where, ...(await probe(id)) });
    }

    const missing = results.filter((r) => r.verdict === "missing");
    return res.status(200).json({
      checked: results.length,
      missing: missing.length,
      summary: missing.length
        ? "Wrong ids: " + missing.map((r) => r.where).join(", ")
        : "Every model id resolves.",
      results,
    });
  } catch (err) {
    console.error("verify-models failed:", err);
    return res.status(500).json({ error: "Could not run the check." });
  }
}
