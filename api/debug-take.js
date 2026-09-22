import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const MAX_FRAMES = 8;
const MAX_FRAME_BYTES = 900_000;   // per frame, base64

const SYSTEM_PROMPT = `You are reviewing frames sampled from an AI-generated video shot against the intent it was generated from. You are looking for the difference between what was asked for and what actually appeared.

You are seeing SAMPLED STILLS, not the video. You can see composition, wardrobe, props, character appearance, lighting and framing. You cannot see motion smoothness, audio, or precisely when something changed between two samples. Never claim precision you don't have.

Return ONLY a JSON object:
{
  "verdict": "one sentence on whether this take delivers the intent",
  "findings": [
    {
      "severity": "error" | "warning" | "ok",
      "category": "character" | "wardrobe" | "prop" | "camera" | "action" | "lighting" | "environment" | "composition",
      "requested": "what the intent asked for, quoted or closely paraphrased from the spec",
      "observed": "what you can actually see in the frames, and in which ones",
      "window": "the sampled range where it's visible, e.g. 'between 2.4s and 3.0s'",
      "confidence": "high" | "medium" | "low",
      "cause": "one sentence on the likely reason, or empty string",
      "repair": "one concrete sentence on what to change in the prompt, or empty string"
    }
  ],
  "repairPrompt": "the original prompt minimally revised to address the errors above - same shot, same intent, only the wording needed to fix what went wrong. Empty string if nothing needs fixing."
}

Rules:
- Compare against the stated intent. A shot that differs from the intent is a finding even if it looks good; say so in the verdict if it's a good difference.
- Quote what you can see. "The jacket is charcoal in frame 1 and black in frame 6" is useful; "wardrobe inconsistency" is not.
- Use "window" language that reflects sampling - "between 2.4s and 3.0s", never a single precise instant.
- Set confidence honestly. Low when a difference could be lighting, compression or motion blur rather than a real change.
- Include 1-3 "ok" findings confirming what DID land. A report that only complains is less useful.
- Do not flag normal motion blur, compression artifacts, or a subject legitimately moving through frame.
- The repair prompt must be the same shot. Do not simplify the creative intent to make it easier.

REFERENCE PHOTOS: If reference photos from the filmmaker's Vault are provided, they are canon for how those characters, props and places must look. Compare the frames against them — face, hair, build, skin tone, wardrobe, a prop's shape, colour and markings, a location's defining features. Report each mismatch as a finding that names the reference and quotes what differs ("Maya's hair is shoulder-length in the reference; cropped short from 2.4s"). Where a reference is matched well, say so in an "ok" finding. Judge identity and design, not lighting or angle — a different angle on the same face is a match.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });

    const { generationId, frames, refs, force } = req.body || {};
    if (!generationId) return res.status(400).json({ error: "Missing generation" });
    if (!Array.isArray(frames) || frames.length < 2) {
      return res.status(400).json({ error: "Need at least two frames to compare." });
    }

    const { data: gen } = await supabase
      .from("generations")
      .select("id, user_id, prompt, model, duration_seconds, film_spec_id, debug_report")
      .eq("id", generationId)
      .maybeSingle();
    if (!gen || gen.user_id !== user.id) return res.status(403).json({ error: "Not your generation" });

    // Cached - frame analysis is expensive, so never repeat it silently.
    if (gen.debug_report && !force) return res.status(200).json({ ...gen.debug_report, cached: true });

    // The intent: a structured spec if there is one, the prompt if not.
    let intent = `PROMPT USED:\n${gen.prompt || "(none recorded)"}`;
    if (gen.film_spec_id) {
      const { data: spec } = await supabase.from("film_specs").select("spec, version, title").eq("id", gen.film_spec_id).maybeSingle();
      if (spec?.spec) {
        intent = `SHOT SPEC (version ${spec.version}) - this is the intent the take was generated from:
${JSON.stringify(spec.spec, null, 1)}

PROMPT COMPILED FROM IT:
${gen.prompt || "(none recorded)"}`;
      }
    }

    const clean = frames.slice(0, MAX_FRAMES).filter((f) => typeof f?.data === "string" && f.data.length < MAX_FRAME_BYTES);
    if (clean.length < 2) return res.status(400).json({ error: "Frames were too large to analyse. Try a shorter clip." });

    // The filmmaker's Vault photos — canon for how people and things must look.
    const cleanRefs = (Array.isArray(refs) ? refs : [])
      .filter((r) => typeof r?.data === "string" && r.data.length < 500_000 && r?.name)
      .slice(0, 3)
      .map((r) => ({
        name: String(r.name).slice(0, 80),
        kind: String(r.kind || "").slice(0, 20),
        description: String(r.description || "").slice(0, 600),
        data: r.data,
      }));

    const content = [];
    cleanRefs.forEach((r) => {
      content.push({ type: "text", text: `REFERENCE PHOTO — ${r.name}${r.kind ? ` (${r.kind})` : ""}${r.description ? `. Locked description: ${r.description}` : ""}` });
      content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: r.data } });
    });
    clean.forEach((f, i) => {
      content.push({ type: "text", text: `Frame ${i + 1} - sampled at ${Number(f.t).toFixed(1)}s` });
      content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: f.data } });
    });
    content.push({
      type: "text",
      text: `${intent}\n\nDuration: ${gen.duration_seconds ?? "unknown"}s. Model: ${gen.model ?? "unknown"}.\nThe ${clean.length} frames above are evenly sampled across the clip.${cleanRefs.length ? ` The first ${cleanRefs.length} image${cleanRefs.length === 1 ? " is a reference photo" : "s are reference photos"}, not frames from the clip.` : ""}`,
    });

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
      }),
    });

    if (!apiRes.ok) {
      console.error("Anthropic API error:", apiRes.status, await apiRes.text());
      return res.status(502).json({ error: "The debugger is unavailable right now. Try again shortly." });
    }

    const data = await apiRes.json();
    const raw = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();

    let out;
    try { out = JSON.parse(raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()); }
    catch { return res.status(502).json({ error: "The debugger returned an unexpected result. Try again." }); }

    const ORDER = { error: 0, warning: 1, ok: 2 };
    const report = {
      verdict: String(out?.verdict || "").slice(0, 400),
      frameCount: clean.length,
      hadSpec: !!gen.film_spec_id,
      refs: cleanRefs.map((r) => r.name),
      findings: (Array.isArray(out?.findings) ? out.findings : [])
        .map((f) => ({
          severity: ["error", "warning", "ok"].includes(f?.severity) ? f.severity : "warning",
          category: String(f?.category || "other").slice(0, 30),
          requested: String(f?.requested || "").slice(0, 400),
          observed: String(f?.observed || "").slice(0, 400),
          window: String(f?.window || "").slice(0, 60),
          confidence: ["high", "medium", "low"].includes(f?.confidence) ? f.confidence : "medium",
          cause: String(f?.cause || "").slice(0, 300),
          repair: String(f?.repair || "").slice(0, 300),
        }))
        .filter((f) => f.observed)
        .sort((a, b) => ORDER[a.severity] - ORDER[b.severity])
        .slice(0, 12),
      repairPrompt: String(out?.repairPrompt || "").slice(0, 2000),
      ranAt: new Date().toISOString(),
    };

    await supabase.from("generations").update({ debug_report: report }).eq("id", gen.id);

    return res.status(200).json(report);
  } catch (error) {
    console.error("debug-take failed:", error);
    return res.status(500).json({ error: "Something went wrong analysing the take." });
  }
}