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

// Cinematic style presets. Each supplies concrete craft language the LLM must
// work into the shot. These are shown to the user, not hidden — the point is to
// teach the vocabulary, not to conceal it.
const STYLES = {
  none: { label: "No style preset", directives: "" },
  "anamorphic-70s": {
    label: "70s Anamorphic",
    directives:
      "Shot on 2x anamorphic glass with oval bokeh and horizontal blue flares, mild barrel distortion, 2.39:1 framing. Kodak 5247 stock character: warm halation on highlights, gentle grain, slightly lifted blacks, muted earth-toned grade.",
  },
  "neo-noir": {
    label: "Neo-Noir Cyberpunk",
    directives:
      "Hard low-key chiaroscuro with a single hard key and deep unlit shadow. Practical neon sources in magenta and cyan reflected in wet surfaces. Volumetric haze, high contrast, crushed blacks, teal-and-magenta grade, rain or steam in the air.",
  },
  "imax-70": {
    label: "IMAX 70mm",
    directives:
      "Large-format clarity: extreme depth of field, edge-to-edge sharpness, minimal grain, immense scale in the frame. Wide static or slow deliberate camera. Natural high-dynamic-range light, restrained grade, 1.43:1 sense of height.",
  },
  "doc-16mm": {
    label: "Documentary 16mm",
    directives:
      "Handheld 16mm with visible grain, slightly soft resolution, available light only, occasional focus hunting and imperfect framing. Naturalistic colour, no grade beyond a mild lift, observational distance.",
  },
  "technicolor": {
    label: "Technicolor Golden Age",
    directives:
      "Saturated three-strip Technicolor palette: vivid primaries, glowing skin tones, painted-backdrop depth. Soft studio key with strong fill, low contrast, no true black, classical composition and staging.",
  },
  "realtime-engine": {
    label: "Real-Time Engine (UE5)",
    directives:
      "Real-time rendered look: physically based materials, ray-traced reflections and global illumination, volumetric fog, crisp specular detail, slight over-perfection in surfaces. Game-cinematic camera with smooth interpolated motion.",
  },
};

const STRENGTHS = {
  subtle: "Apply the style preset lightly — let it colour the lighting and grade without dominating the description.",
  balanced: "Apply the style preset clearly and evenly across camera, lighting, palette and style.",
  heavy: "Commit fully to the style preset. It should be the defining characteristic of the shot, shaping every technical choice.",
};

const RATIOS = {
  "16:9": "Compose for 16:9 landscape: use horizontal space, wider shot sizes, lateral camera movement.",
  "9:16": "Compose for 9:16 vertical: favour tighter framing, vertical layering front-to-back, subject centred with headroom, and vertical camera movement over lateral pans.",
  "1:1": "Compose for a 1:1 square frame: centred subject, symmetrical staging, minimal lateral movement.",
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
    const { idea, model, style, strength, aspectRatio } = req.body || {};

    // Optional: if the caller is signed in, we save the build to their history.
    // Anonymous builds still work — this just stays null.
    let userId = null;
    const authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      userId = user?.id ?? null;
    }

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
    const chosenStyle = STYLES[style] || STYLES.none;
    const chosenStrength = STRENGTHS[strength] || STRENGTHS.balanced;
    const chosenRatio = RATIOS[aspectRatio] || null;

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
${chosenStyle.directives ? `
Cinematic style preset — ${chosenStyle.label}:
${chosenStyle.directives}
${chosenStrength}
` : ""}${chosenRatio ? `
Framing: ${chosenRatio}
` : ""}
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

    // --- Save to the creator's history if they're signed in ---
    if (userId) {
      const { error: histError } = await supabase.from("prompt_history").insert({
        user_id: userId,
        idea: idea.trim().slice(0, 500),
        target_model: model,
        style: style || "none",
        strength: strength || "balanced",
        aspect_ratio: aspectRatio || null,
        title: typeof built.title === "string" ? built.title.slice(0, 200) : null,
        prompt: built.prompt.slice(0, 4000),
      });
      if (histError) console.error("prompt_history insert failed:", histError);
    }

    return res.status(200).json({
      model: target.label,
      built,
      // Returned so the UI can show the craft language that shaped the result.
      applied: chosenStyle.directives
        ? { style: chosenStyle.label, directives: chosenStyle.directives, strength: strength || "balanced" }
        : null,
    });
  } catch (error) {
    console.error("build-prompt failed:", error);
    return res.status(500).json({ error: "Something went wrong building your prompt." });
  }
}