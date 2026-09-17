import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SYSTEM_PROMPT = `You compile a structured shot specification into a prompt for one specific video model. The creative intent is fixed — your job is to express it in the language that model responds to best.

Return ONLY a JSON object:
{
  "prompt": "one flowing paragraph of 60-120 words, ready to paste into the target model",
  "notes": ["short notes on anything you phrased differently for this model, or had to leave out"]
}

Rules:
- Reproduce every continuity lock EXACTLY as written, word for word. They are the creator's own wording and must not be paraphrased.
- Never drop creative intent silently. If something cannot be expressed for this model, say so in notes rather than omitting it quietly.
- Match the model's phrasing guidance given to you.
- Be concrete and visual. Never use empty adjectives like beautiful, stunning, amazing, cinematic.
- The prompt must read as prose, not a list of tags.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });

    const { specId, targetKey, profile } = req.body || {};
    if (!specId || !targetKey) return res.status(400).json({ error: "Missing spec or target model" });

    const { data: row } = await supabase.from("film_specs").select("*").eq("id", specId).maybeSingle();
    if (!row || row.user_id !== user.id) return res.status(403).json({ error: "Not your spec" });

    const spec = row.spec || {};
    const locks = (spec.continuityLocks ?? []).join("\n");

    const userMessage = `TARGET MODEL: ${profile?.label ?? targetKey}
Phrasing guidance: ${profile?.phrasing ?? ""}
Max duration: ${profile?.maxSeconds ?? "unknown"}s. Audio: ${profile?.audio ? "yes" : "no"}.

THE SHOT SPECIFICATION:
${JSON.stringify({ ...spec, continuityLocks: undefined, model: undefined }, null, 1)}

${locks ? `CONTINUITY LOCKS — reproduce each EXACTLY, word for word:\n${locks}` : ""}`;

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1500, system: SYSTEM_PROMPT, messages: [{ role: "user", content: userMessage }] }),
    });

    if (!apiRes.ok) {
      console.error("Anthropic API error:", apiRes.status, await apiRes.text());
      return res.status(502).json({ error: "The compiler is unavailable right now. Try again shortly." });
    }

    const data = await apiRes.json();
    const raw = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();

    let out;
    try { out = JSON.parse(raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()); }
    catch { return res.status(502).json({ error: "The compiler returned an unexpected result. Try again." }); }

    return res.status(200).json({
      prompt: String(out.prompt || "").slice(0, 2000),
      notes: (Array.isArray(out.notes) ? out.notes : []).map((n) => String(n).slice(0, 300)).slice(0, 6),
    });
  } catch (error) {
    console.error("compile-spec failed:", error);
    return res.status(500).json({ error: "Something went wrong compiling the spec." });
  }
}