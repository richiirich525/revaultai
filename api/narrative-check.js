import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SYSTEM_PROMPT = `You are a script supervisor reading a film's shot list for STORY continuity — the kind a visual check can't catch. Not whether the jacket matches, but whether the story holds together.

Return ONLY a JSON object:
{
  "read": "one sentence on what this sequence is, dramatically",
  "findings": [
    {
      "severity": "error" | "warning" | "ok",
      "issue": "the contradiction, naming the specific shots involved",
      "why": "one or two sentences on why it breaks — what an audience would notice or be confused by",
      "shots": [3, 7]
    }
  ]
}

What to look for:
- Knowledge contradictions: a character acting on something they haven't learned yet, or failing to act on something they have.
- Chronology: time of day, weather or light progressing in an order that doesn't make sense.
- Possession and position: a character holding or wearing something they gave away or left behind; being somewhere they couldn't have reached.
- Emotional continuity: a performance register resetting with no event between shots to justify it.
- Cause without effect: something established that nothing later acknowledges — an injury nobody favours, a revelation nobody reacts to.
- Effect without cause: something appearing that nothing set up.

Rules:
- Name the shot numbers. "Shots 3 and 7 contradict" is useful; "there's a continuity problem" is not.
- Only flag what the material actually shows. If the shot list is thin, say so in the read rather than inventing problems from absence.
- A deliberate mystery is not an error. Withheld information is storytelling; contradicted information is a mistake. Flag the second, never the first.
- Include 1-2 "ok" findings for story threads that DO hold.
- If the sequence is clean, return only "ok" findings and say so in the read.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });

    const { context } = req.body || {};
    if (!context?.shots || context.shots.length < 2) {
      return res.status(400).json({ error: "Need at least two shots with state to check narrative continuity." });
    }

    const lines = context.shots.map((s) =>
      `SHOT ${s.n}${s.title ? ` — ${s.title}` : ""}${s.beat ? ` (beat ${s.beat})` : ""}
  Purpose: ${s.purpose || "not stated"}
  Action: ${s.action || "not stated"}
  Starts: ${s.startState || "not stated"}
  Ends: ${s.endState || "not stated"}
  Characters: ${(s.characters || []).join(", ") || "none listed"}${s.performance ? `\n  Performance: ${s.performance}` : ""}`
    ).join("\n\n");

    const extra = [
      context.adopted?.length ? `\nENDINGS ADOPTED FROM FOOTAGE (these override the plan):\n${context.adopted.map((a) => "- " + a).join("\n")}` : "",
      context.changes?.length ? `\nDECLARED CHANGES TO ASSETS:\n${context.changes.map((c) => `- Beat ${c.beat}: ${c.asset} — ${c.event}`).join("\n")}` : "",
    ].join("");

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `${lines}${extra}` }],
      }),
    });

    if (!apiRes.ok) {
      console.error("Anthropic API error:", apiRes.status, await apiRes.text());
      return res.status(502).json({ error: "The narrative check is unavailable right now." });
    }

    const data = await apiRes.json();
    const raw = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();

    let out;
    try { out = JSON.parse(raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()); }
    catch { return res.status(502).json({ error: "The narrative check returned an unexpected result." }); }

    const ORDER = { error: 0, warning: 1, ok: 2 };
    return res.status(200).json({
      read: String(out?.read || "").slice(0, 400),
      findings: (Array.isArray(out?.findings) ? out.findings : [])
        .map((f) => ({
          severity: ["error", "warning", "ok"].includes(f?.severity) ? f.severity : "warning",
          issue: String(f?.issue || "").slice(0, 400),
          why: String(f?.why || "").slice(0, 400),
          shots: Array.isArray(f?.shots) ? f.shots.map((n) => Number(n)).filter((n) => n > 0) : [],
        }))
        .filter((f) => f.issue)
        .sort((a, b) => ORDER[a.severity] - ORDER[b.severity])
        .slice(0, 10),
    });
  } catch (error) {
    console.error("narrative-check failed:", error);
    return res.status(500).json({ error: "Something went wrong checking narrative continuity." });
  }
}