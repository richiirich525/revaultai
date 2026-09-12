import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Guardrails (public endpoint, no sign-in) ---
const RATE_LIMIT = 15;
const RATE_WINDOW_MIN = 60;
const MAX_SCENE_LENGTH = 900;
const MAX_HAVE = 14;
const IP_SALT = "revaultai-coverage-v1";

const TARGET_MODELS = {
  veo: { label: "Veo", notes: "Native audio and lip-synced dialogue. Durations 4-8s. Strong on faces and close work." },
  sora: { label: "Sora", notes: "Native audio. Favours strong narrative framing and physical continuity." },
  kling: { label: "Kling", notes: "Motion specialist. Durations 5-10s. No audio." },
  runway: { label: "Runway", notes: "Stylised and editorial looks." },
  wan: { label: "Wan", notes: "One clear subject, one clear action. Durations 5-15s. No audio." },
  hailuo: { label: "Hailuo", notes: "Expressive character motion. Keep the setting simple." },
  seedance: { label: "Seedance", notes: "Long unbroken takes up to 30s, physics, native audio." },
};

const SYSTEM_PROMPT = `You are a first AD planning coverage for a scene. You think like an editor: not "what shots would look good" but "what does the cutting room need to assemble this scene and fix it when something goes wrong."

Return ONLY a JSON object. No markdown fences, no preamble. Use exactly this schema:

{
  "scene_read": "one sentence on what the scene is dramatically and what coverage it therefore demands",
  "coverage": [
    {
      "slug": "short name for the setup, e.g. Master wide / A single, medium / B close-up / OTS over A / Insert - hands on glass / Reaction - B",
      "purpose": "one sentence on what this setup does in the edit - what it lets the editor do that nothing else does",
      "shot_size": "e.g. Wide / Medium / Medium close-up / Close-up / Insert",
      "camera": "angle, lens and any movement, in one clause",
      "duration_seconds": 6,
      "priority": "essential" | "recommended" | "optional",
      "have": false,
      "prompt": "one flowing paragraph of 60-110 words, ready to paste into the target model"
    }
  ],
  "gaps": [
    {
      "missing": "short name of what is absent, e.g. Neutral reaction shot",
      "why": "one or two sentences on what the editor will not be able to do without it - be specific about the editorial problem, not generic"
    }
  ],
  "editorial_note": "two or three sentences on how this coverage would actually cut together, and where the weak point is"
}

Rules:
- Plan the coverage the scene genuinely needs. A two-hander of dialogue needs different coverage from a chase or a single character alone in a room. Do not apply a template.
- Typical dialogue coverage runs master, singles, over-the-shoulders, reactions and an insert — but only include setups this scene actually calls for.
- Mark "priority" honestly. "essential" means the scene cannot be cut without it. Most scenes have 3-5 essential setups, not ten.
- If the creator lists shots they already have, set "have": true on the matching setups and keep them in the list so the plan is complete.
- The "gaps" array is the most valuable part. Name what is missing and, crucially, what editorial problem that creates — "no neutral reaction to cut to if a take drifts", "no insert to hide the moment the glass changes hands", "no clean exit to cut out of the scene on".
- If the coverage is genuinely complete, return an empty gaps array and say so in the editorial note. Do not invent gaps.
- Respect the target model's duration limits.
- Be concrete and visual. Never use empty adjectives like beautiful, stunning, amazing, cinematic.
- Never invent brand names, real people, or copyrighted characters.
- Each "prompt" must read as prose, not a list of tags.`;

function hashIp(ip) {
  return crypto.createHash("sha256").update(IP_SALT + ip).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { scene, model, have, locked } = req.body || {};

    if (typeof scene !== "string" || scene.trim().length < 10) {
      return res.status(400).json({ error: "Describe the scene in a few more words." });
    }
    if (scene.length > MAX_SCENE_LENGTH) {
      return res.status(400).json({ error: `Keep the scene under ${MAX_SCENE_LENGTH} characters.` });
    }
    const target = TARGET_MODELS[model];
    if (!target) return res.status(400).json({ error: "Pick a target model." });

    const haveShots = Array.isArray(have)
      ? have.map((s) => String(s).trim()).filter(Boolean).slice(0, MAX_HAVE).map((s) => s.slice(0, 300))
      : [];

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
${lookEntries.length ? `
PROJECT LOOK — apply to every setup:
${lookEntries.map((e) => `${e.name}: ${e.description}`).join("\n")}
` : ""}${lockedEntries.length ? `
LOCKED ENTRIES from the creator's vault — FIXED wording:
${lockedEntries.map((e) => `- [${e.kind}] ${e.name}: ${e.description}`).join("\n")}
Reproduce each locked description EXACTLY as written, word for word, inside the "prompt" of every setup in which it appears.
` : ""}${haveShots.length ? `
SHOTS THE CREATOR ALREADY HAS:
${haveShots.map((s, i) => `${i + 1}. ${s}`).join("\n")}
Match these against the coverage plan. Set "have": true on setups they already cover, and focus your gaps on what is genuinely still missing.
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
        max_tokens: 6000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!apiRes.ok) {
      const detail = await apiRes.text();
      console.error("Anthropic API error:", apiRes.status, detail);
      return res.status(502).json({ error: "The coverage planner is unavailable right now. Try again shortly." });
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
      console.error("Could not parse coverage output:", raw.slice(0, 400));
      return res.status(502).json({ error: "The coverage planner returned an unexpected result. Try again." });
    }

    if (!out || !Array.isArray(out.coverage) || out.coverage.length === 0) {
      return res.status(502).json({ error: "The coverage planner returned no setups. Try again." });
    }

    const ORDER = { essential: 0, recommended: 1, optional: 2 };
    out.coverage = out.coverage
      .map((c) => ({
        ...c,
        priority: ["essential", "recommended", "optional"].includes(c.priority) ? c.priority : "recommended",
        have: !!c.have,
      }))
      .sort((a, b) => ORDER[a.priority] - ORDER[b.priority])
      .slice(0, 14);
    out.gaps = Array.isArray(out.gaps) ? out.gaps.slice(0, 6) : [];

    await supabase.from("prompt_builds").insert({ ip_hash: ipHash, target_model: "coverage" });

    return res.status(200).json({
      model: target.label,
      modelKey: model,
      scene_read: String(out.scene_read || "").slice(0, 400),
      editorial_note: String(out.editorial_note || "").slice(0, 600),
      coverage: out.coverage,
      gaps: out.gaps,
      counts: {
        essential: out.coverage.filter((c) => c.priority === "essential").length,
        have: out.coverage.filter((c) => c.have).length,
        total: out.coverage.length,
      },
    });
  } catch (error) {
    console.error("coverage failed:", error);
    return res.status(500).json({ error: "Something went wrong planning coverage." });
  }
}