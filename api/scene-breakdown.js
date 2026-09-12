import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Guardrails (public endpoint, no sign-in required) ---
const RATE_LIMIT = 8;         // breakdowns allowed per IP...
const RATE_WINDOW_MIN = 60;   // ...within this many minutes
const MAX_SCENE_LENGTH = 1500;
const MAX_SHOTS = 12;
const IP_SALT = "revaultai-scene-breakdown-v1";

const TARGET_MODELS = {
  veo: { label: "Veo", notes: "Handles native audio. Responds well to detailed cinematography and explicit dialogue or sound design cues. Shots run 4-8 seconds." },
  sora: { label: "Sora", notes: "Handles native audio. Favours strong narrative framing and clear physical continuity across the shot." },
  kling: { label: "Kling", notes: "Strong on human motion and physical realism. Keep camera moves simple and describe motion precisely. Shots run 5-10 seconds." },
  runway: { label: "Runway", notes: "Strong stylised and editorial looks. Responds well to explicit film-stock and grading references." },
  wan: { label: "Wan", notes: "Best with one clear subject and one clear action. Avoid crowded scenes or multiple simultaneous events. Shots run 5-15 seconds." },
  hailuo: { label: "Hailuo", notes: "Strong on expressive character motion. Keep the setting simple so the subject stays coherent." },
  seedance: { label: "Seedance", notes: "Strong on movement, choreography and long unbroken takes. Can hold a single continuous shot up to 30 seconds." },
};

// Same six presets as the prompt builder — kept in sync deliberately.
const STYLES = {
  none: { label: "No style preset", directives: "" },
  "anamorphic-70s": {
    label: "70s Anamorphic",
    directives: "Shot on 2x anamorphic glass with oval bokeh and horizontal blue flares, mild barrel distortion. Kodak 5247 stock character: warm halation on highlights, gentle grain, slightly lifted blacks, muted earth-toned grade.",
  },
  "neo-noir": {
    label: "Neo-Noir Cyberpunk",
    directives: "Hard low-key chiaroscuro with a single hard key and deep unlit shadow. Practical neon sources in magenta and cyan reflected in wet surfaces. Volumetric haze, high contrast, crushed blacks, teal-and-magenta grade.",
  },
  "imax-70": {
    label: "IMAX 70mm",
    directives: "Large-format clarity: extreme depth of field, edge-to-edge sharpness, minimal grain, immense scale in the frame. Wide static or slow deliberate camera. Natural high-dynamic-range light, restrained grade.",
  },
  "doc-16mm": {
    label: "Documentary 16mm",
    directives: "Handheld 16mm with visible grain, slightly soft resolution, available light only, occasional focus hunting and imperfect framing. Naturalistic colour, observational distance.",
  },
  technicolor: {
    label: "Technicolor Golden Age",
    directives: "Saturated three-strip Technicolor palette: vivid primaries, glowing skin tones, painted-backdrop depth. Soft studio key with strong fill, low contrast, classical composition and staging.",
  },
  "realtime-engine": {
    label: "Real-Time Engine (UE5)",
    directives: "Real-time rendered look: physically based materials, ray-traced reflections and global illumination, volumetric fog, crisp specular detail. Game-cinematic camera with smooth interpolated motion.",
  },
};

const STRENGTHS = {
  subtle: "Apply the style preset lightly — let it colour the lighting and grade without dominating.",
  balanced: "Apply the style preset clearly and evenly across camera, lighting, palette and style.",
  heavy: "Commit fully to the style preset. It should be the defining characteristic of every shot.",
};

const RATIOS = {
  "16:9": "Compose for 16:9 landscape: horizontal staging, wider shot sizes, lateral camera movement.",
  "9:16": "Compose for 9:16 vertical: tighter framing, vertical layering front-to-back, subject centred, vertical camera movement over lateral pans.",
  "1:1": "Compose for a 1:1 square frame: centred subject, symmetrical staging, minimal lateral movement.",
};

const SYSTEM_PROMPT = `You are a director and first AD breaking a scene into a shot list for AI video generation. You think in coverage: how a scene is actually assembled from shots, not one continuous impossible take.

Return ONLY a JSON object. No markdown fences, no preamble, no commentary. Use exactly this schema:

{
  "title": "3-6 word name for the scene",
  "logline": "one sentence describing what happens in the scene",
  "characters": [
    { "name": "Short name used across shots", "description": "40-70 word locked visual description: age, build, face, hair, distinctive features, exact wardrobe. Concrete and repeatable." }
  ],
  "locations": [
    { "name": "Short name used across shots", "description": "30-60 word locked visual description of the space: architecture, materials, light sources, dressing, atmosphere." }
  ],
  "shots": [
    {
      "number": 1,
      "slug": "4-8 word description of the shot",
      "shot_size": "e.g. Extreme wide / Wide / Medium / Medium close-up / Close-up / Extreme close-up / Insert",
      "camera_move": "e.g. Locked / Slow push-in / Tracking beside subject / Crane up / Handheld follow / Pan left to right",
      "lighting": "one clause naming key direction, quality and contrast",
      "duration_seconds": 5,
      "prompt": "one flowing paragraph of 60-110 words, ready to paste into the target model"
    }
  ]
}

CONTINUITY — the most important rule:
Every character and location description you write in the "characters" and "locations" arrays must be repeated VERBATIM inside the "prompt" of every shot in which that character or location appears. Do not paraphrase, shorten, or vary the wording between shots. Identical wording across shots is what keeps the character recognisable from shot to shot. This repetition is intentional and required.

Other rules:
- Break the scene into the number of shots it actually needs. Never more than ${MAX_SHOTS}.
- Use real coverage logic: establish, then move closer; cut to reactions; use inserts to cover difficult continuity.
- Each shot is ONE continuous camera setup. If the camera would need to cut, that is a new shot.
- Be concrete and visual. Never use empty adjectives like beautiful, stunning, amazing, cinematic.
- Use real cinematography vocabulary: shot sizes, focal lengths, camera moves, lighting setups.
- Never invent brand names, real people, or copyrighted characters.
- Each "prompt" must read as prose, not as a list of tags.
- Respect the target model's duration limits when setting duration_seconds.`;

function hashIp(ip) {
  return crypto.createHash("sha256").update(IP_SALT + ip).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { scene, model, style, strength, aspectRatio, locked } = req.body || {};

    // Vault entries the creator selected. Their text is authoritative: the
    // model is told to reproduce it verbatim, and we overwrite whatever it
    // returns with the original wording before sending it back.
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

    // Looks are project-wide style, not per-subject. Everything else is
    // matched by name and reproduced verbatim in the shots it appears in.
    const lookEntries = allSelected.filter((e) => e.kind === "look");
    const lockedEntries = allSelected.filter((e) => e.kind !== "look");

    // --- Validate ---
    if (typeof scene !== "string" || scene.trim().length < 15) {
      return res.status(400).json({ error: "Describe your scene in a few more words." });
    }
    if (scene.length > MAX_SCENE_LENGTH) {
      return res.status(400).json({ error: `Keep your scene under ${MAX_SCENE_LENGTH} characters.` });
    }
    const target = TARGET_MODELS[model];
    if (!target) return res.status(400).json({ error: "Pick a target model." });

    const chosenStyle = STYLES[style] || STYLES.none;
    const chosenStrength = STRENGTHS[strength] || STRENGTHS.balanced;
    const chosenRatio = RATIOS[aspectRatio] || null;

    // --- Optional: identify a signed-in caller so we can save the breakdown ---
    let userId = null;
    const authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      userId = user?.id ?? null;
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
    } else if ((count || 0) >= RATE_LIMIT * 2) {
      return res.status(429).json({ error: "You've hit the hourly limit. Try again in an hour." });
    }

    // --- Call the model ---
    const userMessage = `Target model: ${target.label}
Model notes: ${target.notes}
${chosenStyle.directives ? `
Cinematic style preset — ${chosenStyle.label}:
${chosenStyle.directives}
${chosenStrength}
Apply this style consistently to EVERY shot. Style continuity matters as much as character continuity.
` : ""}${chosenRatio ? `
Framing: ${chosenRatio}
` : ""}
${lookEntries.length ? `
PROJECT LOOK — the visual language for this entire scene:
${lookEntries.map((e) => `${e.name}: ${e.description}`).join("\n")}

Apply this look to EVERY shot without exception. It governs lens, lighting, palette, texture and camera behaviour throughout. Weave it into each shot's prompt naturally rather than appending it as a list.
` : ""}${lockedEntries.length ? `
LOCKED ENTRIES — these come from the creator's vault and are FIXED:
${lockedEntries.map((e) => `- [${e.kind}] ${e.name}: ${e.description}`).join("\n")}

Reproduce each locked description EXACTLY as written above, word for word, inside the "prompt" of every shot in which that character or location appears. Do not rephrase, shorten, expand or restyle them. Put these entries in your "characters" and "locations" arrays using exactly this wording. You may write additional characters or locations that the scene needs and that are not listed here.
` : ""}
Scene to break down:
${scene.trim()}`;

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!apiRes.ok) {
      const detail = await apiRes.text();
      console.error("Anthropic API error:", apiRes.status, detail);
      return res.status(502).json({ error: "The scene breakdown is unavailable right now. Try again shortly." });
    }

    const data = await apiRes.json();
    const raw = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    let built;
    try {
      const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      built = JSON.parse(cleaned);
    } catch {
      console.error("Could not parse model output:", raw.slice(0, 500));
      return res.status(502).json({ error: "The breakdown returned an unexpected result. Try again." });
    }

    if (!built || !Array.isArray(built.shots) || built.shots.length === 0) {
      return res.status(502).json({ error: "The breakdown returned no shots. Try again." });
    }
    built.shots = built.shots.slice(0, MAX_SHOTS);
    built.characters = Array.isArray(built.characters) ? built.characters : [];
    built.locations = Array.isArray(built.locations) ? built.locations : [];

    // True lock: the creator's own wording wins over anything the model wrote.
    built.props = Array.isArray(built.props) ? built.props : [];
    for (const entry of lockedEntries) {
      const bucket =
        entry.kind === "location" ? built.locations :
        entry.kind === "prop" ? built.props :
        built.characters;
      const existing = bucket.find(
        (x) => typeof x?.name === "string" && x.name.trim().toLowerCase() === entry.name.trim().toLowerCase()
      );
      if (existing) existing.description = entry.description;
      else bucket.push({ name: entry.name, description: entry.description });
    }

    // --- Log for rate limiting ---
    await supabase.from("prompt_builds").insert({ ip_hash: ipHash, target_model: model });

    // --- Save for signed-in creators ---
    let savedId = null;
    if (userId) {
      const { data: row, error: saveError } = await supabase
        .from("scene_breakdowns")
        .insert({
          user_id: userId,
          scene: scene.trim().slice(0, MAX_SCENE_LENGTH),
          target_model: model,
          style: style || "none",
          strength: strength || "balanced",
          aspect_ratio: aspectRatio || null,
          title: typeof built.title === "string" ? built.title.slice(0, 200) : null,
          shot_count: built.shots.length,
          breakdown: built,
        })
        .select("id")
        .single();
      if (saveError) console.error("scene_breakdowns insert failed:", saveError);
      else savedId = row?.id ?? null;
    }

    return res.status(200).json({
      model: target.label,
      modelKey: model,
      aspectRatio: aspectRatio || "16:9",
      built,
      savedId,
      applied: chosenStyle.directives
        ? { style: chosenStyle.label, directives: chosenStyle.directives, strength: strength || "balanced" }
        : null,
    });
  } catch (error) {
    console.error("scene-breakdown failed:", error);
    return res.status(500).json({ error: "Something went wrong building your breakdown." });
  }
}