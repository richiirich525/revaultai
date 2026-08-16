import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Guardrails (public endpoint, no sign-in) ---
const RATE_LIMIT = 15;        // builds allowed per IP...
const RATE_WINDOW_MIN = 60;   // ...within this many minutes
const MAX_IDEA_LENGTH = 500;
const IP_SALT = "revaultai-prompt-builder-v1";

// Target models offered on the page. `notes` steers the LLM per model.
const TARGET_MODELS = {
  veo: {
    label: "Veo",
    notes: "Handles native audio. Responds well to detailed cinematography and explicit dialogue or sound design cues.",
  },
  sora: {
    label: "Sora",
    notes: "Handles native audio. Favours strong narrative framing and clear physical continuity across the shot.",
  },
  kling: {
    label: "Kling",
    notes: "Strong on human motion and physical realism. Keep camera moves simple and describe motion precisely.",
  },
  runway: {
    label: "Runway",
    notes: "Strong stylised and editorial looks. Responds well to explicit film-stock and grading references.",
  },
  wan: {
    label: "Wan",
    notes: "Best with one clear subject and one clear action. Avoid crowded scenes or multiple simultaneous events.",
  },
  hailuo: {
    label: "Hailuo",
    notes: "Strong on expressive character motion. Keep the setting simple so the subject stays coherent.",
  },
  seedance: {
    label: "Seedance",
    notes: "Strong on movement and choreography. Describe rhythm, pacing and body motion explicitly.",
  },
};

const SYSTEM_PROMPT = `You are a cinematography-literate prompt engineer for AI video models. You turn a rough idea into one precise, shootable prompt.

Return ONLY a JSON object. No markdown fences, no preamble, no commentary. Use exactly this schema:

{
  "title": "3-6 word name for the shot",
  "subject": "who or what is on screen, described visually",
  "action": "what happens across the shot, in order",
  "setting": "location, time of day, weather, era",
  "camera": "shot size, angle, lens, and camera movement",
  "lighting": "key light, quality, direction, contrast",
  "palette": "dominant colours and grading",
  "style": "film stock, aesthetic register, visual reference language",
  "audio": "ambience, score, or dialogue cue - empty string if the model has no audio",
  "avoid": "artifacts and failure modes to suppress",
  "prompt": "one flowing paragraph of 60-110 words combining the above in natural cinematic language, ready to paste straight into the target model"
}

Rules:
- Be concrete and visual. Never use empty adjectives like beautiful, stunning, amazing, cinematic.
- Use real cinematography vocabulary: shot sizes, focal lengths, camera moves, lighting setups.
- Write one continuous shot unless the idea clearly requires a cut.
- Never invent brand names, real people, or copyrighted characters.
- The "prompt" field must read as prose, not as a list of tags.`;

function hashIp(ip) {
  return crypto.createHash("sha256").update(IP_SALT + ip).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { idea, model } = req.body || {};

    // --- Validate input ---
    if (typeof idea !== "string" || idea.trim().length < 3) {
      return res.status(400).json({ error: "Describe your idea in a few more words." });
    }
    if (idea.length > MAX_IDEA_LENGTH) {
      return res.status(400).json({ error: `Keep your idea under ${MAX_IDEA_LENGTH} characters.` });
    }
    const target = TARGET_MODELS[model];
    if (!target) {
      return res.status(400).json({ error: "Pick a target model." });
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
      return res.status(429).json({
        error: "You've hit the hourly limit for prompt builds. Try again in an hour.",
      });
    }

    // --- Call the model ---
    const userMessage = `Target model: ${target.label}
Model notes: ${target.notes}

Rough idea:
${idea.trim()}`;

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!apiRes.ok) {
      const detail = await apiRes.text();
      console.error("Anthropic API error:", apiRes.status, detail);
      return res.status(502).json({ error: "The prompt builder is unavailable right now. Try again shortly." });
    }

    const data = await apiRes.json();
    const raw = (data.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    // --- Parse the JSON the model returned ---
    let built;
    try {
      const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      built = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Could not parse model output:", raw);
      return res.status(502).json({ error: "The prompt builder returned an unexpected result. Try again." });
    }

    if (!built || typeof built.prompt !== "string") {
      return res.status(502).json({ error: "The prompt builder returned an incomplete result. Try again." });
    }

    // --- Log the build (fire and forget) ---
    await supabase.from("prompt_builds").insert({ ip_hash: ipHash, target_model: model });

    return res.status(200).json({ model: target.label, built });
  } catch (error) {
    console.error("build-prompt failed:", error);
    return res.status(500).json({ error: "Something went wrong building your prompt." });
  }
}