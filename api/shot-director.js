import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Guardrails (public endpoint, no sign-in) ---
const RATE_LIMIT = 15;
const RATE_WINDOW_MIN = 60;
const MAX_MOMENT_LENGTH = 600;
const IP_SALT = "revaultai-shot-director-v1";

const TARGET_MODELS = {
  veo: { label: "Veo", notes: "Native audio and lip-synced dialogue. Durations 4-8s. Strong on faces and close work." },
  sora: { label: "Sora", notes: "Native audio. Favours strong narrative framing and physical continuity." },
  kling: { label: "Kling", notes: "Motion specialist — action, crowds, physical performance. Durations 5-10s. No audio." },
  runway: { label: "Runway", notes: "Stylised and editorial looks. Responds well to film-stock and grading references." },
  wan: { label: "Wan", notes: "One clear subject, one clear action. Durations 5-15s. Cheap enough to iterate. No audio." },
  hailuo: { label: "Hailuo", notes: "Expressive character motion. Keep the setting simple." },
  seedance: { label: "Seedance", notes: "Long unbroken takes up to 30s, physics, native audio, director-level camera control." },
};

const STYLES = {
  none: { label: "No style preset", directives: "" },
  "anamorphic-70s": { label: "70s Anamorphic", directives: "2x anamorphic glass, oval bokeh, horizontal blue flares, mild barrel distortion. Warm halation, gentle grain, lifted blacks, muted earth-toned grade." },
  "neo-noir": { label: "Neo-Noir Cyberpunk", directives: "Hard low-key chiaroscuro, single hard key, deep unlit shadow. Neon practicals in magenta and cyan on wet surfaces. Volumetric haze, crushed blacks." },
  "imax-70": { label: "IMAX 70mm", directives: "Large-format clarity, extreme depth of field, edge-to-edge sharpness, minimal grain. Wide static or slow deliberate camera, natural high-dynamic-range light." },
  "doc-16mm": { label: "Documentary 16mm", directives: "Handheld 16mm, visible grain, softer resolution, available light only, imperfect framing, naturalistic colour, observational distance." },
  technicolor: { label: "Technicolor Golden Age", directives: "Saturated three-strip palette, vivid primaries, glowing skin tones. Soft studio key with strong fill, low contrast, classical staging." },
  "realtime-engine": { label: "Real-Time Engine (UE5)", directives: "Physically based materials, ray-traced reflections, global illumination, volumetric fog, crisp specular detail, smooth interpolated camera." },
};

const RATIOS = {
  "16:9": "Compose for 16:9 landscape: horizontal staging, wider shot sizes, lateral camera movement.",
  "9:16": "Compose for 9:16 vertical: tighter framing, vertical layering front-to-back, subject centred, vertical camera movement over lateral pans.",
  "1:1": "Compose for a 1:1 square frame: centred subject, symmetrical staging, minimal lateral movement.",
};

const SYSTEM_PROMPT = `You are a director deciding how to shoot one specific moment. You are not writing a shot list — you are offering the same moment three genuinely different ways, the way a director and DP would argue it out before committing.

Return ONLY a JSON object. No markdown fences, no preamble. Use exactly this schema:

{
  "moment": "one sentence restating the dramatic beat you're covering — what actually happens and what it should make the audience feel",
  "approaches": [
    {
      "name": "one or two words naming the intent, e.g. Suspense, Paranoia, Reveal, Intimacy, Detachment, Menace",
      "premise": "one sentence on what this approach makes the audience feel and why",
      "shot_size": "e.g. Wide / Medium / Medium close-up / Close-up / Extreme close-up",
      "lens": "e.g. 24mm / 35mm / 50mm / 85mm / 100mm macro, with anamorphic or spherical where it matters",
      "camera_move": "e.g. Locked / Slow dolly backward / Handheld follow / Crane down / Slow push-in",
      "lighting": "one clause: key direction, quality, contrast, and any practical source",
      "blocking": "where the subject is in frame and how they move through the shot",
      "duration_seconds": 6,
      "why_it_works": "two sentences on the craft reasoning — what this choice does that the others don't",
      "prompt": "one flowing paragraph of 60-110 words, ready to paste into the target model"
    }
  ]
}

Rules:
- Exactly three approaches. They must be genuinely different in intent, not three variations on the same idea with different lenses.
- At least one should be restrained — a locked camera or a simple move. Do not make all three showy.
- Every approach covers the SAME dramatic moment. You are not writing three different scenes.
- duration_seconds must respect the target model's limits.
- Be concrete and visual. Never use empty adjectives like beautiful, stunning, amazing, cinematic.
- Use real cinematography vocabulary: shot sizes, focal lengths, camera moves, lighting setups.
- Never invent brand names, real people, or copyrighted characters.
- Each "prompt" must read as prose, not a list of tags.`;

function hashIp(ip) {
  return crypto.createHash("sha256").update(IP_SALT + ip).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { moment, model, style, aspectRatio, locked } = req.body || {};

    if (typeof moment !== "string" || moment.trim().length < 10) {
      return res.status(400).json({ error: "Describe the moment in a few more words." });
    }
    if (moment.length > MAX_MOMENT_LENGTH) {
      return res.status(400).json({ error: `Keep the moment under ${MAX_MOMENT_LENGTH} characters.` });
    }
    const target = TARGET_MODELS[model];
    if (!target) return res.status(400).json({ error: "Pick a target model." });

    const chosenStyle = STYLES[style] || STYLES.none;
    const chosenRatio = RATIOS[aspectRatio] || null;

    // Vault entries, same shape as Scene Breakdown.
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
${chosenStyle.directives ? `
Cinematic style preset — ${chosenStyle.label}:
${chosenStyle.directives}
Apply this style to all three approaches.
` : ""}${lookEntries.length ? `
PROJECT LOOK — the visual language for this production:
${lookEntries.map((e) => `${e.name}: ${e.description}`).join("\n")}
Apply this to all three approaches.
` : ""}${lockedEntries.length ? `
LOCKED ENTRIES from the creator's vault — FIXED wording:
${lockedEntries.map((e) => `- [${e.kind}] ${e.name}: ${e.description}`).join("\n")}
Reproduce each locked description EXACTLY as written, word for word, inside the "prompt" of every approach where it appears. Do not rephrase or shorten them.
` : ""}${chosenRatio ? `
Framing: ${chosenRatio}
` : ""}
The moment to direct:
${moment.trim()}`;

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!apiRes.ok) {
      const detail = await apiRes.text();
      console.error("Anthropic API error:", apiRes.status, detail);
      return res.status(502).json({ error: "Shot Director is unavailable right now. Try again shortly." });
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
      console.error("Could not parse director output:", raw.slice(0, 400));
      return res.status(502).json({ error: "Shot Director returned an unexpected result. Try again." });
    }

    if (!out || !Array.isArray(out.approaches) || out.approaches.length === 0) {
      return res.status(502).json({ error: "Shot Director returned no approaches. Try again." });
    }
    out.approaches = out.approaches.slice(0, 3);

    await supabase.from("prompt_builds").insert({ ip_hash: ipHash, target_model: "director" });

    return res.status(200).json({
      model: target.label,
      modelKey: model,
      aspectRatio: aspectRatio || "16:9",
      moment: String(out.moment || "").slice(0, 400),
      approaches: out.approaches,
      applied: chosenStyle.directives ? { style: chosenStyle.label, directives: chosenStyle.directives } : null,
    });
  } catch (error) {
    console.error("shot-director failed:", error);
    return res.status(500).json({ error: "Something went wrong directing the shot." });
  }
}