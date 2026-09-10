import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Guardrails (public endpoint, no sign-in) ---
const RATE_LIMIT = 15;
const RATE_WINDOW_MIN = 60;
const MAX_SHOTS = 20;
const MAX_SHOT_CHARS = 2000;
const MAX_TOTAL_CHARS = 24000;
const IP_SALT = "revaultai-continuity-check-v1";

const SYSTEM_PROMPT = `You are a script supervisor reviewing a shot list for continuity errors before it goes to camera. You are reading the WRITTEN PROMPTS, not footage, so every finding is about what the text says — not about what a model might generate.

Your job is to flag inconsistencies precisely. You do not rewrite prompts. You point; the director decides.

Return ONLY a JSON object. No markdown fences, no preamble. Use exactly this schema:

{
  "summary": "one or two sentences on the overall state of continuity across this shot list",
  "findings": [
    {
      "severity": "error" | "warning" | "ok",
      "category": "character" | "wardrobe" | "prop" | "location" | "lighting" | "style" | "other",
      "subject": "who or what this concerns, e.g. Maya, the field jacket, the parking garage",
      "shots": [1, 4],
      "issue": "one or two sentences naming the exact inconsistency, quoting the differing wording from each shot",
      "matters": "one short sentence on why it would read as an error on screen"
    }
  ]
}

Severity:
- "error" — a direct contradiction. The same thing is described two incompatible ways, or a locked description was not followed.
- "warning" — a possible problem: something present in one shot and unmentioned in another, an unmotivated change, or wording that drifts without contradicting outright.
- "ok" — a thread that IS consistent and worth confirming. Include 1-3 of these so the report is not only complaints. For "ok" findings, "matters" may be an empty string.

Rules:
- Quote the actual differing wording. "Shot 1 says 'short natural black curls', shot 4 says 'shoulder-length dark hair'" is useful. "The hair is inconsistent" is not.
- Do NOT flag intentional narrative change. A character who gets rained on in shot 2 SHOULD be wet in shot 3. A jacket removed on screen should stay off. Only flag changes with no cause in the shots themselves.
- Do NOT flag legitimate coverage variation: different shot sizes, angles, camera moves and framing of the same subject are normal filmmaking, not continuity errors.
- Lighting may change if the shots move location or time. Flag it only when the same moment in the same place is lit differently.
- If locked descriptions are provided, check every shot against them and flag any shot whose wording departs from the locked text. That is an "error".
- Order findings: errors first, then warnings, then ok.
- Be concise. A finding is two or three sentences, not a paragraph.
- If the list is genuinely clean, say so in the summary and return only "ok" findings.`;

function hashIp(ip) {
  return crypto.createHash("sha256").update(IP_SALT + ip).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { shots, locked } = req.body || {};

    if (!Array.isArray(shots)) {
      return res.status(400).json({ error: "Paste your shots to check." });
    }

    const cleaned = shots
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter((s) => s.length > 0)
      .slice(0, MAX_SHOTS)
      .map((s) => s.slice(0, MAX_SHOT_CHARS));

    if (cleaned.length < 2) {
      return res.status(400).json({ error: "Add at least two shots — continuity needs something to compare." });
    }
    if (cleaned.join("").length > MAX_TOTAL_CHARS) {
      return res.status(400).json({ error: "That's a lot of text. Try checking fewer shots at a time." });
    }

    // Optional locked vault entries to check the shots against.
    const lockedEntries = Array.isArray(locked)
      ? locked
          .filter((e) => e && typeof e.name === "string" && typeof e.description === "string")
          .slice(0, 8)
          .map((e) => ({
            kind: e.kind === "location" ? "location" : "character",
            name: e.name.slice(0, 80),
            description: [e.description, e.wardrobe, e.distinguishing]
              .filter((p) => typeof p === "string" && p.trim())
              .join(" ")
              .slice(0, 1200),
          }))
      : [];

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

    const shotText = cleaned.map((s, i) => `SHOT ${i + 1}:\n${s}`).join("\n\n");
    const lockedText = lockedEntries.length
      ? `LOCKED DESCRIPTIONS the shots are supposed to follow verbatim:\n${lockedEntries
          .map((e) => `- [${e.kind}] ${e.name}: ${e.description}`)
          .join("\n")}\n\n`
      : "";

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
        messages: [{ role: "user", content: `${lockedText}${shotText}` }],
      }),
    });

    if (!apiRes.ok) {
      const detail = await apiRes.text();
      console.error("Anthropic API error:", apiRes.status, detail);
      return res.status(502).json({ error: "The continuity checker is unavailable right now. Try again shortly." });
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
      console.error("Could not parse checker output:", raw.slice(0, 400));
      return res.status(502).json({ error: "The checker returned an unexpected result. Try again." });
    }

    const ORDER = { error: 0, warning: 1, ok: 2 };
    const findings = (Array.isArray(out?.findings) ? out.findings : [])
      .map((f) => ({
        severity: ["error", "warning", "ok"].includes(f?.severity) ? f.severity : "warning",
        category: String(f?.category || "other").slice(0, 40),
        subject: String(f?.subject || "").slice(0, 120),
        shots: Array.isArray(f?.shots) ? f.shots.map((n) => Number(n)).filter((n) => n >= 1 && n <= cleaned.length) : [],
        issue: String(f?.issue || "").slice(0, 600),
        matters: String(f?.matters || "").slice(0, 300),
      }))
      .filter((f) => f.issue)
      .sort((a, b) => ORDER[a.severity] - ORDER[b.severity])
      .slice(0, 25);

    await supabase.from("prompt_builds").insert({ ip_hash: ipHash, target_model: "continuity" });

    return res.status(200).json({
      summary: String(out?.summary || "").slice(0, 500),
      shotCount: cleaned.length,
      lockedCount: lockedEntries.length,
      counts: {
        error: findings.filter((f) => f.severity === "error").length,
        warning: findings.filter((f) => f.severity === "warning").length,
        ok: findings.filter((f) => f.severity === "ok").length,
      },
      findings,
    });
  } catch (error) {
    console.error("continuity-check failed:", error);
    return res.status(500).json({ error: "Something went wrong checking continuity." });
  }
}