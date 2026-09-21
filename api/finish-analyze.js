import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const MAX_FRAMES = 12;
const MAX_FRAME_BYTES = 900_000;
const DAILY_LIMIT = 60; // new clip analyses per creator per day, while Finish is free

const SYSTEM_PROMPT = `You are an experienced film editor looking through dailies. You're seeing stills sampled roughly once a second from one AI-generated clip. Your job is to find what in this clip could be USED in an edit — not to judge whether the whole clip is good.

A clip that failed overall often contains a usable second or two: a clean reaction before the face drifts, a hand that's fine until it isn't, an establishing view before the camera wanders. Find those.

Return ONLY a JSON object:
{
  "summary": "one sentence on what this clip shows",
  "shot": { "size": "e.g. wide, medium, close-up", "subject": "who or what", "action": "what happens", "camera": "static, push in, pan left..." },
  "usable": [ { "from": 0.5, "to": 2.8, "quality": "strong" | "usable" | "weak", "why": "one short sentence" } ],
  "defects": [ { "from": 3.0, "to": 4.2, "issue": "what goes wrong, concretely", "severity": "error" | "warning" } ],
  "best": { "from": 1.0, "to": 2.5, "why": "one short sentence" },
  "uses": ["the editorial jobs this footage could do — e.g. establishing, reaction, insert, cutaway, transition, main action"]
}

Rules:
- Times are in seconds and must lie within the clip's duration. Frames are labelled with their times; the truth between two frames is uncertain, so keep ranges honest to the sampling.
- A usable range must be at least 0.7 seconds — shorter than that won't cut together.
- Judge what an audience would notice: faces changing, hands deforming, objects appearing or vanishing, the camera doing something unmotivated, text garbling. Don't flag compression or normal motion blur.
- "best" is the single strongest stretch. If nothing is usable, return "usable": [] and "best": null.
- Be concrete. "Her left hand gains a sixth finger from 3s" is useful; "some artifacts" is not.`;

const num = (v) => (typeof v === "number" && isFinite(v) ? v : Number(v));
const clampRange = (r, dur) => {
  const from = Math.max(0, Math.min(dur, num(r?.from)));
  const to = Math.max(0, Math.min(dur, num(r?.to)));
  return isFinite(from) && isFinite(to) && to > from ? { from: Math.round(from * 10) / 10, to: Math.round(to * 10) / 10 } : null;
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });

    const { generationId, frames, duration } = req.body || {};
    if (!generationId) return res.status(400).json({ error: "Missing clip" });

    const { data: gen } = await supabase
      .from("generations")
      .select("id, user_id, prompt, model, finish_analysis")
      .eq("id", generationId)
      .maybeSingle();
    if (!gen || gen.user_id !== user.id) return res.status(403).json({ error: "Not your clip" });

    // Already read — never pay twice for the same footage.
    if (gen.finish_analysis) return res.status(200).json({ analysis: gen.finish_analysis, cached: true });

    const dur = num(duration);
    if (!isFinite(dur) || dur <= 0 || dur > 120) return res.status(400).json({ error: "Couldn't read the clip's length." });
    if (!Array.isArray(frames) || frames.length < 2) return res.status(400).json({ error: "Need at least two frames." });

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await supabase
      .from("generations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("finish_analysis->>ranAt", since);
    if ((count ?? 0) >= DAILY_LIMIT) {
      return res.status(429).json({ error: `You've analysed ${DAILY_LIMIT} clips in the last day — the limit while Finish is free. Clips already analysed can still be cut together.` });
    }

    const clean = frames.slice(0, MAX_FRAMES).filter((f) => typeof f?.data === "string" && f.data.length < MAX_FRAME_BYTES);
    if (clean.length < 2) return res.status(400).json({ error: "Frames were too large to analyse." });

    const content = [];
    clean.forEach((f) => {
      content.push({ type: "text", text: `Frame at ${num(f.t).toFixed(1)}s` });
      content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: f.data } });
    });
    content.push({
      type: "text",
      text: `Clip duration: ${dur.toFixed(1)}s. Model: ${gen.model ?? "unknown"}.\nThe prompt that generated it (for context on what was intended):\n${gen.prompt || "(none recorded)"}`,
    });

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2500, system: SYSTEM_PROMPT, messages: [{ role: "user", content }] }),
    });
    if (!apiRes.ok) {
      console.error("Anthropic API error:", apiRes.status, await apiRes.text());
      return res.status(502).json({ error: "The analysis is unavailable right now. Try again shortly." });
    }

    const data = await apiRes.json();
    const raw = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    let out;
    try { out = JSON.parse(raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()); }
    catch { return res.status(502).json({ error: "The analysis came back malformed. Try again." }); }

    const str = (v, n) => String(v ?? "").slice(0, n);
    const analysis = {
      duration: Math.round(dur * 10) / 10,
      summary: str(out?.summary, 300),
      shot: {
        size: str(out?.shot?.size, 60), subject: str(out?.shot?.subject, 120),
        action: str(out?.shot?.action, 200), camera: str(out?.shot?.camera, 80),
      },
      usable: (Array.isArray(out?.usable) ? out.usable : [])
        .map((u) => { const r = clampRange(u, dur); return r && r.to - r.from >= 0.7 ? { ...r, quality: ["strong", "usable", "weak"].includes(u?.quality) ? u.quality : "usable", why: str(u?.why, 200) } : null; })
        .filter(Boolean).slice(0, 8),
      defects: (Array.isArray(out?.defects) ? out.defects : [])
        .map((d) => { const r = clampRange(d, dur); return r ? { ...r, issue: str(d?.issue, 200), severity: d?.severity === "error" ? "error" : "warning" } : null; })
        .filter(Boolean).slice(0, 8),
      best: out?.best ? (() => { const r = clampRange(out.best, dur); return r ? { ...r, why: str(out.best.why, 200) } : null; })() : null,
      uses: (Array.isArray(out?.uses) ? out.uses : []).map((u) => str(u, 40)).filter(Boolean).slice(0, 6),
      frames: clean.length,
      ranAt: new Date().toISOString(),
    };

    await supabase.from("generations").update({ finish_analysis: analysis }).eq("id", gen.id);
    return res.status(200).json({ analysis });
  } catch (error) {
    console.error("finish-analyze failed:", error);
    return res.status(500).json({ error: "Something went wrong analysing the clip." });
  }
}