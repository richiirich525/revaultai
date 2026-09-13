import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Guardrails (public endpoint, no sign-in) ---
const RATE_LIMIT = 15;
const RATE_WINDOW_MIN = 60;
const MAX_PROMPT_LENGTH = 2000;
const MAX_SYMPTOM_LENGTH = 500;
const IP_SALT = "revaultai-autopsy-v1";

// Same catalog the generator uses, so a model suggestion is always real.
const CATALOG = [
  { key: "wan-2.6", label: "Wan 2.6", perSec: 1, durations: [5, 10, 15], audio: false, note: "Cheapest. One clear subject, one clear action. Struggles with crowds and simultaneous events." },
  { key: "kling-3.0", label: "Kling 3.0", perSec: 2, durations: [5, 10], audio: false, note: "Motion specialist — action, crowds, physical performance. Caps at 10s. No audio." },
  { key: "seedance-2.0-480", label: "Seedance 2.0 Draft", perSec: 3, durations: [5, 10, 15], audio: true, note: "Cheap way to test a Seedance shot. 480p output." },
  { key: "veo-3.1", label: "Veo 3.1", perSec: 4, durations: [4, 6, 8], audio: true, note: "Best image quality, native audio, lip sync. Caps at 8s. Not ideal for fast action or crowds." },
  { key: "seedance-2.0", label: "Seedance 2.0 Flagship", perSec: 6, durations: [5, 10, 15], audio: true, note: "720p with physics, audio and camera control." },
  { key: "seedance-2.5-480", label: "Seedance 2.5 Draft", perSec: 6, durations: [5, 10, 15, 30], audio: true, note: "Affordable route to a 30s unbroken take. 480p." },
  { key: "seedance-2.5", label: "Seedance 2.5 Flagship", perSec: 12, durations: [5, 10, 15, 30], audio: true, note: "Longest single takes, physics, native audio. Most expensive per second." },
];

const SYSTEM_PROMPT = `You are diagnosing why an AI video generation disappointed its creator. You are reading the PROMPT they used and their description of what went wrong — you cannot see the clip. Be honest about that: reason from the text and from known model failure modes, and never claim to have observed something in the footage.

Return ONLY a JSON object. No markdown fences, no preamble. Use exactly this schema:

{
  "verdict": "one sentence naming the single most likely reason this shot didn't work",
  "causes": [
    {
      "cause": "short name for the problem, e.g. Too many simultaneous actions / Hands on a small object / Camera and subject competing",
      "confidence": "high" | "medium" | "low",
      "evidence": "quote the exact phrase from their prompt that creates this problem, and explain in one or two sentences why it does",
      "fix": "one concrete sentence on what to change"
    }
  ],
  "model_note": "empty string, or one or two sentences if a different model from the catalog would suit this shot better — name it and say why. Only when it genuinely would.",
  "structural_advice": "two or three sentences on the bigger strategic move if there is one: splitting the shot, shortening the take, generating a start frame first, simplifying the action. Empty string if the prompt just needs tightening.",
  "revised_prompt": "their prompt rewritten to address the causes above — same shot, same intent, same characters and setting, but built to generate more reliably. 60-110 words of flowing prose."
}

Rules:
- Quote their actual wording in "evidence". Generic diagnosis is useless — "the prompt is too complex" is not a finding, "'while simultaneously reaching for the keys and turning to face him' asks for three actions in one beat" is.
- 2-4 causes, ordered by confidence. Do not pad to four.
- Known failure modes worth checking: multiple simultaneous actions in one beat; hands interacting with small objects; more than one character, especially touching or crossing; camera movement competing with subject movement; takes longer than the model comfortably holds; reflective, transparent or liquid surfaces; legible text or signage; crowds; dialogue and lip sync; wardrobe or props that must stay consistent; contradictory instructions; vague adjectives doing the work that specifics should.
- The revised prompt must be the SAME shot. Do not quietly change what they were trying to make. Do not remove a character or change the location to make it easier — say that in structural_advice instead if it's the right call.
- If their symptom description contradicts what the prompt asks for, say so — sometimes the model did what was written and the writing was the problem.
- Be concrete and visual. Never use empty adjectives like beautiful, stunning, amazing, cinematic.`;

function hashIp(ip) {
  return crypto.createHash("sha256").update(IP_SALT + ip).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { prompt, symptom, modelKey, duration } = req.body || {};

    if (typeof prompt !== "string" || prompt.trim().length < 20) {
      return res.status(400).json({ error: "Paste the prompt you used — a few more words, at least." });
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return res.status(400).json({ error: `Keep the prompt under ${MAX_PROMPT_LENGTH} characters.` });
    }
    const sym = typeof symptom === "string" ? symptom.trim().slice(0, MAX_SYMPTOM_LENGTH) : "";
    const used = CATALOG.find((m) => m.key === modelKey) || null;
    const secs = Number(duration) || null;

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

    const catalogText = CATALOG.map(
      (m) => `- ${m.label} (${m.key}) | ${m.perSec} credits/s | durations ${m.durations.join(", ")}s | audio: ${m.audio ? "yes" : "no"} | ${m.note}`
    ).join("\n");

    const userMessage = `Models available on this platform:
${catalogText}

${used ? `The creator generated this on: ${used.label}${secs ? ` at ${secs} seconds` : ""}.` : "The creator did not say which model they used."}

${sym ? `What they say went wrong:\n${sym}\n` : "They did not describe the failure — diagnose the prompt on its own terms and name the most likely failure modes it invites.\n"}
The prompt they used:
${prompt.trim()}`;

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
      return res.status(502).json({ error: "The autopsy tool is unavailable right now. Try again shortly." });
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
      console.error("Could not parse autopsy output:", raw.slice(0, 400));
      return res.status(502).json({ error: "The autopsy returned an unexpected result. Try again." });
    }

    if (!out || !Array.isArray(out.causes)) {
      return res.status(502).json({ error: "The autopsy returned an incomplete result. Try again." });
    }

    const ORDER = { high: 0, medium: 1, low: 2 };
    out.causes = out.causes
      .map((c) => ({
        cause: String(c?.cause || "").slice(0, 120),
        confidence: ["high", "medium", "low"].includes(c?.confidence) ? c.confidence : "medium",
        evidence: String(c?.evidence || "").slice(0, 600),
        fix: String(c?.fix || "").slice(0, 300),
      }))
      .filter((c) => c.cause)
      .sort((a, b) => ORDER[a.confidence] - ORDER[b.confidence])
      .slice(0, 4);

    await supabase.from("prompt_builds").insert({ ip_hash: ipHash, target_model: "autopsy" });

    return res.status(200).json({
      verdict: String(out.verdict || "").slice(0, 400),
      causes: out.causes,
      model_note: String(out.model_note || "").slice(0, 400),
      structural_advice: String(out.structural_advice || "").slice(0, 600),
      revised_prompt: String(out.revised_prompt || "").slice(0, 2000),
      usedModel: used ? used.label : null,
    });
  } catch (error) {
    console.error("autopsy failed:", error);
    return res.status(500).json({ error: "Something went wrong running the autopsy." });
  }
}