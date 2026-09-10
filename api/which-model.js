import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Guardrails (public endpoint, no sign-in) ---
const RATE_LIMIT = 20;
const RATE_WINDOW_MIN = 60;
const MAX_SHOT_LENGTH = 800;
const IP_SALT = "revaultai-model-router-v1";

// Only models a creator can actually generate on here. Costs and duration
// limits mirror the generator exactly — if those change, change them here too.
const CATALOG = [
  {
    key: "wan-2.6",
    label: "Wan 2.6",
    perSec: 1,
    durations: [5, 10, 15],
    audio: false,
    strengths: "Fastest and cheapest. Best with one clear subject doing one clear action. Good for previz, blocking, and iterating on an idea before committing budget.",
    weaknesses: "Struggles with crowded scenes, multiple simultaneous events, and complex choreography. No audio.",
  },
  {
    key: "kling-3.0",
    label: "Kling 3.0",
    perSec: 2,
    durations: [5, 10],
    audio: false,
    strengths: "The motion specialist. Fast action, fights, chases, physical performance and dense crowds hold together where other models smear.",
    weaknesses: "No audio. Caps at 10 seconds. Keep camera moves simple or they compete with the subject motion.",
  },
  {
    key: "seedance-2.0-480",
    label: "Seedance 2.0 — Draft (480p)",
    perSec: 3,
    durations: [5, 10, 15],
    audio: true,
    strengths: "Cheap way to test a Seedance shot before paying for the flagship tier. Director-level camera control and physics at draft resolution.",
    weaknesses: "480p output — fine for testing a shot, not for final delivery. Upscale afterwards or re-run at flagship.",
  },
  {
    key: "veo-3.1",
    label: "Veo 3.1",
    perSec: 4,
    durations: [4, 6, 8],
    audio: true,
    strengths: "Best all-round image quality, with native audio and lip-synced dialogue generated alongside the picture. The right choice for close-ups, spoken lines, and hero shots that need to look expensive.",
    weaknesses: "Caps at 8 seconds. Not the best pick for fast action or large crowds.",
  },
  {
    key: "seedance-2.0",
    label: "Seedance 2.0 — Flagship (720p)",
    perSec: 6,
    durations: [5, 10, 15],
    audio: true,
    strengths: "720p with real-world physics, native synchronized audio and strong camera control in a single pass.",
    weaknesses: "More expensive than Wan or Kling for shots that don't need physics or audio.",
  },
  {
    key: "seedance-2.5-480",
    label: "Seedance 2.5 — Draft (480p)",
    perSec: 6,
    durations: [5, 10, 15, 30],
    audio: true,
    strengths: "The only affordable route to a long unbroken take — up to 30 seconds in one continuous shot at draft resolution.",
    weaknesses: "480p. Best used to prove a long take works before spending flagship credits on it.",
  },
  {
    key: "seedance-2.5",
    label: "Seedance 2.5 — Flagship (720p)",
    perSec: 12,
    durations: [5, 10, 15, 30],
    audio: true,
    strengths: "Longest single takes available — up to 30 seconds of continuous, spatially stable footage with physics and native audio. The pick for a developing shot that cannot cut.",
    weaknesses: "By far the most expensive per second. Wasteful for short or simple shots.",
  },
];

const SYSTEM_PROMPT = `You are a technically literate AI video producer advising a filmmaker on which model to generate a specific shot with. You know these models genuinely well and you are honest about their limits.

You may ONLY recommend from the catalog given to you. Never suggest a model that isn't in it, and never invent capabilities.

Return ONLY a JSON object. No markdown fences, no preamble. Use exactly this schema:

{
  "read": "one sentence describing what you understand the shot to be and what it demands technically",
  "recommendations": [
    {
      "key": "model key exactly as given in the catalog",
      "rank": 1,
      "duration_seconds": 5,
      "why": "2-3 sentences on why this model suits THIS shot specifically, referencing what the shot actually requires",
      "tradeoff": "one honest sentence on what the creator gives up by choosing it"
    }
  ],
  "caution": "empty string, or one sentence if the shot is genuinely hard for every model available - e.g. too long, too many characters, needs dialogue longer than any audio model allows"
}

Rules:
- Give 2 or 3 recommendations, ranked. Rank 1 is your genuine best pick, not the most expensive.
- duration_seconds MUST be one of the durations that model actually supports. Pick the shortest one that serves the shot — do not pad.
- If the shot needs spoken dialogue or synchronized sound, only rank an audio-capable model first.
- If the shot needs a continuous take longer than a model supports, do not recommend that model for it.
- Cost matters. If a cheap model genuinely does the job, rank it first and say so. Do not upsell.
- Be concrete about cinematography. Reference the actual demands: motion, faces, crowds, duration, audio, camera movement.
- The "caution" field is for real problems only. Leave it as an empty string when the shot is straightforward.`;

function hashIp(ip) {
  return crypto.createHash("sha256").update(IP_SALT + ip).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { shot } = req.body || {};

    if (typeof shot !== "string" || shot.trim().length < 10) {
      return res.status(400).json({ error: "Describe your shot in a few more words." });
    }
    if (shot.length > MAX_SHOT_LENGTH) {
      return res.status(400).json({ error: `Keep your shot description under ${MAX_SHOT_LENGTH} characters.` });
    }

    // --- Rate limit by IP ---
    const forwarded = req.headers["x-forwarded-for"] || "";
    const ip = String(forwarded).split(",")[0].trim() || "unknown";
    const ipHash = hashIp(ip);
    const since = new Date(Date.now() - RATE_WINDOW_MIN * 60 * 1000).toISOString();

    const { count, error: countError } = await supabase
      .from("prompt_builds")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);

    if (countError) {
      console.error("Rate limit check failed:", countError);
    } else if ((count || 0) >= RATE_LIMIT) {
      return res.status(429).json({ error: "You've hit the hourly limit. Try again in an hour." });
    }

    const catalogText = CATALOG.map(
      (m) =>
        `- key: ${m.key} | ${m.label} | ${m.perSec} credits/second | durations: ${m.durations.join(", ")}s | audio: ${m.audio ? "yes" : "no"}\n  strengths: ${m.strengths}\n  limits: ${m.weaknesses}`
    ).join("\n");

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Available models:\n${catalogText}\n\nThe shot the filmmaker wants:\n${shot.trim()}`,
          },
        ],
      }),
    });

    if (!apiRes.ok) {
      const detail = await apiRes.text();
      console.error("Anthropic API error:", apiRes.status, detail);
      return res.status(502).json({ error: "The model router is unavailable right now. Try again shortly." });
    }

    const data = await apiRes.json();
    const raw = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    let out;
    try {
      out = JSON.parse(raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim());
    } catch {
      console.error("Could not parse router output:", raw.slice(0, 400));
      return res.status(502).json({ error: "The router returned an unexpected result. Try again." });
    }

    if (!out || !Array.isArray(out.recommendations) || out.recommendations.length === 0) {
      return res.status(502).json({ error: "The router returned no recommendation. Try again." });
    }

    // Attach real catalog data and compute cost server-side, so the model can
    // never invent a price or a duration the generator doesn't support.
    out.recommendations = out.recommendations
      .map((r) => {
        const m = CATALOG.find((c) => c.key === r.key);
        if (!m) return null;
        const seconds = m.durations.includes(Number(r.duration_seconds))
          ? Number(r.duration_seconds)
          : m.durations[0];
        return {
          key: m.key,
          label: m.label,
          rank: Number(r.rank) || 99,
          duration_seconds: seconds,
          credits: m.perSec * seconds,
          perSec: m.perSec,
          audio: m.audio,
          why: String(r.why || "").slice(0, 600),
          tradeoff: String(r.tradeoff || "").slice(0, 300),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 3);

    if (out.recommendations.length === 0) {
      return res.status(502).json({ error: "The router returned no usable recommendation. Try again." });
    }

    await supabase.from("prompt_builds").insert({ ip_hash: ipHash, target_model: "router" });

    return res.status(200).json({
      read: String(out.read || "").slice(0, 400),
      caution: String(out.caution || "").slice(0, 400),
      recommendations: out.recommendations,
    });
  } catch (error) {
    console.error("which-model failed:", error);
    return res.status(500).json({ error: "Something went wrong picking a model." });
  }
}