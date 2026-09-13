import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Guardrails (public endpoint, no sign-in) ---
const RATE_LIMIT = 15;
const RATE_WINDOW_MIN = 60;
const MAX_SCENE_LENGTH = 800;
const MAX_DIALOGUE_LENGTH = 900;
const IP_SALT = "revaultai-blocking-v1";

const TARGET_MODELS = {
  veo: { label: "Veo", notes: "Native audio and lip-synced dialogue. Durations 4-8s. The right choice when lines are spoken on camera." },
  sora: { label: "Sora", notes: "Native audio. Favours strong narrative framing and physical continuity." },
  kling: { label: "Kling", notes: "Motion specialist — physical performance and body mechanics. Durations 5-10s. No audio." },
  runway: { label: "Runway", notes: "Stylised and editorial looks." },
  wan: { label: "Wan", notes: "One clear subject, one clear action. Durations 5-15s. No audio." },
  hailuo: { label: "Hailuo", notes: "Strong on expressive character motion and face acting." },
  seedance: { label: "Seedance", notes: "Long unbroken takes up to 30s, physics, native audio, director-level camera control." },
};

const REGISTERS = {
  none: "",
  "restrained-fear": "Restrained fear — the character is frightened and working hard not to show it. Stillness, controlled breath, tension that escapes at the edges rather than the centre.",
  "concealed-anger": "Concealed anger — fury held under a civil surface. Precision rather than volume. The body betrays it before the face does.",
  "exhausted-resignation": "Exhausted resignation — past the point of fighting. Slow, heavy, economical movement. No urgency left.",
  "nervous-humour": "Nervous humour — deflecting through jokes nobody finds funny. Too much movement, misplaced smiles, eyes that don't match the mouth.",
  "quiet-suspicion": "Quiet suspicion — watching, measuring, not yet committing. Delayed reactions, sustained looks, stillness that reads as listening.",
  "forced-calm": "Forced calm — deliberately performing composure. Overly steady hands, controlled pace, effort visible in the control itself.",
  tenderness: "Tenderness — care expressed physically rather than said. Proximity, slowed movement, attention on the other person rather than the self.",
};

const SYSTEM_PROMPT = `You are a director working with actors on one scene. You give two kinds of direction: blocking (where people are and how they move through the space, relative to camera) and performance (what the body and face do, and how lines land). You do not rewrite dialogue. The writer's words are the writer's.

Return ONLY a JSON object. No markdown fences, no preamble. Use exactly this schema:

{
  "read": "one sentence on what the scene is really about physically — what the bodies in it are doing to each other",
  "blocking": [
    {
      "beat": 1,
      "instruction": "one specific staging instruction, stated relative to camera — e.g. 'Jonah begins seated centre-right, angled away from the door' or 'Maya enters frame left and stops two paces short of the desk'",
      "why": "one short clause on what this staging does dramatically"
    }
  ],
  "performance": [
    {
      "character": "name as given, or a short descriptor if unnamed",
      "physical": "two or three sentences of playable direction: posture, hands, breath, weight, what the body does before and after the key moment",
      "eyes": "one or two sentences on gaze — where they look, when they look away, what they avoid looking at",
      "lines": [
        {
          "line": "the dialogue EXACTLY as the creator wrote it, unchanged",
          "delivery": "one or two sentences on how it lands — pace, volume, where the stress falls, what happens in the body immediately before or after"
        }
      ]
    }
  ],
  "camera_relationship": "two or three sentences on how this blocking sits with the camera: where the axis is established, who holds camera-left and camera-right, and what the staging means for coverage and the 180-degree line",
  "prompt": "one flowing paragraph of 70-120 words folding the blocking and performance into a generation-ready shot description"
}

Rules:
- NEVER rewrite, paraphrase, shorten or improve the creator's dialogue. Reproduce each line exactly as given, including punctuation. Your job is delivery, not writing.
- If no dialogue is given, return an empty "lines" array for each character and direct the physical performance only.
- Blocking must be specific and stageable: name positions relative to camera (frame left, centre, camera-right, foreground, background) and give distances or counts where it helps.
- 4-8 blocking beats. Each one is a change — an entrance, a move, a stop, a turn, a piece of business. Do not pad.
- Performance direction must be playable. "Feels sad" is not direction. "Holds the glass with both hands and doesn't drink" is.
- Respect the 180-degree rule in the camera_relationship: establish who is on which side and keep the staging consistent with it.
- Be concrete and visual. Never use empty adjectives like beautiful, stunning, amazing, cinematic.
- Never invent brand names, real people, or copyrighted characters.`;

function hashIp(ip) {
  return crypto.createHash("sha256").update(IP_SALT + ip).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { scene, dialogue, register, model, locked } = req.body || {};

    if (typeof scene !== "string" || scene.trim().length < 10) {
      return res.status(400).json({ error: "Describe the scene in a few more words." });
    }
    if (scene.length > MAX_SCENE_LENGTH) {
      return res.status(400).json({ error: `Keep the scene under ${MAX_SCENE_LENGTH} characters.` });
    }
    const lines = typeof dialogue === "string" ? dialogue.trim().slice(0, MAX_DIALOGUE_LENGTH) : "";
    const target = TARGET_MODELS[model];
    if (!target) return res.status(400).json({ error: "Pick a target model." });
    const registerText = REGISTERS[register] ?? "";

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
${registerText ? `
Performance register the creator asked for:
${registerText}
Direct every character consistently with this register unless the scene clearly gives one of them a different emotional position.
` : ""}${lookEntries.length ? `
PROJECT LOOK:
${lookEntries.map((e) => `${e.name}: ${e.description}`).join("\n")}
` : ""}${lockedEntries.length ? `
LOCKED ENTRIES from the creator's vault — FIXED wording:
${lockedEntries.map((e) => `- [${e.kind}] ${e.name}: ${e.description}`).join("\n")}
Reproduce each locked description EXACTLY as written, word for word, inside the "prompt".
` : ""}${lines ? `
DIALOGUE — reproduce each line EXACTLY as written. Do not rewrite, shorten or improve any of it:
${lines}
` : ""}
The scene:
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
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!apiRes.ok) {
      const detail = await apiRes.text();
      console.error("Anthropic API error:", apiRes.status, detail);
      return res.status(502).json({ error: "The blocking director is unavailable right now. Try again shortly." });
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
      console.error("Could not parse blocking output:", raw.slice(0, 400));
      return res.status(502).json({ error: "The blocking director returned an unexpected result. Try again." });
    }

    if (!out || (!Array.isArray(out.blocking) && !Array.isArray(out.performance))) {
      return res.status(502).json({ error: "The blocking director returned an incomplete result. Try again." });
    }

    await supabase.from("prompt_builds").insert({ ip_hash: ipHash, target_model: "blocking" });

    return res.status(200).json({
      model: target.label,
      modelKey: model,
      read: String(out.read || "").slice(0, 400),
      blocking: (Array.isArray(out.blocking) ? out.blocking : []).slice(0, 10),
      performance: (Array.isArray(out.performance) ? out.performance : []).slice(0, 5),
      camera_relationship: String(out.camera_relationship || "").slice(0, 600),
      prompt: String(out.prompt || "").slice(0, 2000),
    });
  } catch (error) {
    console.error("blocking failed:", error);
    return res.status(500).json({ error: "Something went wrong directing the scene." });
  }
}