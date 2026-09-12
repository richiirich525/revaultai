import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Guardrails (public endpoint, no sign-in) ---
const RATE_LIMIT = 15;
const RATE_WINDOW_MIN = 60;
const MAX_SHOT_LENGTH = 700;
const IP_SALT = "revaultai-frame-planner-v1";

const TARGET_MODELS = {
  veo: { label: "Veo", notes: "Native audio. Durations 4-8s. Strong on faces and close work." },
  sora: { label: "Sora", notes: "Native audio, strong narrative framing." },
  kling: { label: "Kling", notes: "Motion specialist. Durations 5-10s. Infers aspect ratio from a start image." },
  runway: { label: "Runway", notes: "Stylised and editorial looks, strong reference workflows." },
  wan: { label: "Wan", notes: "One clear subject, one clear action. Durations 5-15s." },
  hailuo: { label: "Hailuo", notes: "Expressive character motion." },
  seedance: { label: "Seedance", notes: "Long unbroken takes up to 30s, physics, camera control." },
};

const RATIOS = {
  "16:9": "16:9 landscape",
  "9:16": "9:16 vertical",
  "1:1": "1:1 square",
};

const SYSTEM_PROMPT = `You are a director planning the two frames that bracket a shot: where it starts and where it lands. A shot is a change over time, and deciding both ends of that change is how you keep control of it instead of hoping the model picks something reasonable.

Return ONLY a JSON object. No markdown fences, no preamble. Use exactly this schema:

{
  "read": "one sentence on what actually changes across this shot - the thing that is different at the end",
  "opening": {
    "description": "40-80 words describing the first frame as a still image: subject position in frame, posture, gaze direction, framing, lens feel, light direction and quality, background, what is in focus",
    "image_prompt": "a still-image prompt of 50-90 words for generating this exact frame - photographic and specific, describing a single moment, no motion verbs"
  },
  "ending": {
    "description": "40-80 words describing the last frame as a still image, in the same terms - what has changed and what has deliberately stayed the same",
    "image_prompt": "a still-image prompt of 50-90 words for generating this exact frame - photographic and specific, no motion verbs"
  },
  "motion": {
    "subject": "what the subject does between the two frames, in order",
    "camera": "what the camera does between the two frames",
    "environment": "what moves in the environment across the shot - empty string if nothing does",
    "duration_seconds": 6
  },
  "video_prompt": "one flowing paragraph of 60-110 words directing the motion from the opening frame to the ending frame, ready to paste into the target model alongside the start frame",
  "continuity_note": "two sentences on what must stay identical between the two frames for the shot to read as continuous - wardrobe, light direction, background elements, screen position"
}

Rules:
- The two frames must describe the SAME shot at two moments. Same location, same wardrobe, same light source, same lens. Only what the shot changes should change.
- Be explicit about screen position in both frames - camera-left, camera-right, centre, foreground, background. That is what makes the motion legible.
- The image prompts describe still photographs. No motion verbs, no "as she turns", no "while the camera moves". A frozen moment.
- The video prompt assumes the opening frame already exists and directs what happens next. Do not re-describe everything visible in the opening frame.
- Respect the target model's duration limits.
- Be concrete and visual. Never use empty adjectives like beautiful, stunning, amazing, cinematic.
- Never invent brand names, real people, or copyrighted characters.`;

function hashIp(ip) {
  return crypto.createHash("sha256").update(IP_SALT + ip).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { shot, model, aspectRatio, locked } = req.body || {};

    if (typeof shot !== "string" || shot.trim().length < 10) {
      return res.status(400).json({ error: "Describe the shot in a few more words." });
    }
    if (shot.length > MAX_SHOT_LENGTH) {
      return res.status(400).json({ error: `Keep the shot under ${MAX_SHOT_LENGTH} characters.` });
    }
    const target = TARGET_MODELS[model];
    if (!target) return res.status(400).json({ error: "Pick a target model." });

    const KINDS = ["character", "location", "prop", "look"];
    const allSelected = Array.isArray(locked)
      ? locked
          .filter((e) => e && typeof e.name === "string" && typeof e.description === "string")
          .slice(0, 10)
          .map((e) => ({
            kind: KINDS.includes(e.kind) ? e.kind : "character",
            name: e.name.slice(0, 80),
            description: [e.description, e.wardrobe, e.distinguishing]
              .filter((p) => typeof p === "string" && p.trim())
              .join(" ")
              .slice(0, 1200),
          }))
      : [];
    const lookEntries = allSelected.filter((e) => e.kind === "look");
    const lockedEntries = allSelected.filter((e) => e.kind !== "look");

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

    if (countError) console.error("Rate limit check failed:", countError);
    else if ((count || 0) >= RATE_LIMIT) {
      return res.status(429).json({ error: "You've hit the hourly limit. Try again in an hour." });
    }

    const userMessage = `Target model: ${target.label}
Model notes: ${target.notes}
Framing: ${RATIOS[aspectRatio] || RATIOS["16:9"]}
${lookEntries.length ? `
PROJECT LOOK — applies to both frames and the shot:
${lookEntries.map((e) => `${e.name}: ${e.description}`).join("\n")}
` : ""}${lockedEntries.length ? `
LOCKED ENTRIES from the creator's vault — FIXED wording:
${lockedEntries.map((e) => `- [${e.kind}] ${e.name}: ${e.description}`).join("\n")}
Reproduce each locked description EXACTLY as written, word for word, in both frame descriptions, both image prompts and the video prompt wherever that subject appears.
` : ""}
The shot:
${shot.trim()}`;

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!apiRes.ok) {
      const detail = await apiRes.text();
      console.error("Anthropic API error:", apiRes.status, detail);
      return res.status(502).json({ error: "The frame planner is unavailable right now. Try again shortly." });
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
      console.error("Could not parse frame planner output:", raw.slice(0, 400));
      return res.status(502).json({ error: "The frame planner returned an unexpected result. Try again." });
    }

    if (!out?.opening?.image_prompt || !out?.ending?.image_prompt) {
      return res.status(502).json({ error: "The frame planner returned incomplete frames. Try again." });
    }

    await supabase.from("prompt_builds").insert({ ip_hash: ipHash, target_model: "frames" });

    return res.status(200).json({
      model: target.label,
      modelKey: model,
      aspectRatio: aspectRatio || "16:9",
      read: String(out.read || "").slice(0, 400),
      opening: out.opening,
      ending: out.ending,
      motion: out.motion || {},
      video_prompt: String(out.video_prompt || "").slice(0, 2000),
      continuity_note: String(out.continuity_note || "").slice(0, 500),
    });
  } catch (error) {
    console.error("frame-planner failed:", error);
    return res.status(500).json({ error: "Something went wrong planning the frames." });
  }
}