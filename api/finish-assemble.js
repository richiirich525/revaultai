import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const MAX_CLIPS = 12;
const DAILY_LIMIT = 30; // assemblies per creator per day, while Finish is free
const LENGTHS = [15, 30, 60];
const ROLES = ["establishing", "main action", "reaction", "insert", "cutaway", "transition"];

const SYSTEM_PROMPT = `You are an experienced film editor assembling a rough cut from dailies. You can't see the footage; you have an editor's log of each clip: what it shows, which stretches are usable, where it breaks, and its single best moment. Build the strongest short scene the material allows, and say plainly what the scene still needs.

Return ONLY a JSON object:
{
  "cut": [ { "clip": "C3", "from": 1.0, "to": 2.5, "role": "establishing" | "main action" | "reaction" | "insert" | "cutaway" | "transition", "why": "one short sentence on why this piece, here" } ],
  "missing": [ { "what": "the shot, in a few words", "why": "what the scene loses without it", "prompt": "a complete, ready-to-generate video prompt" } ],
  "notes": "one or two sentences, honest about the cut's weakest point"
}

Rules:
- Cut only from inside a clip's usable ranges. Never include any part of a defect marked error. A brief warning is acceptable only if the piece is essential; say so in "why".
- Every piece is at least 0.7 seconds. The same clip may appear more than once, but never with overlapping ranges.
- Aim for the target length. Coming in short is better than padding with weak material; don't exceed the target by more than 20%.
- Order for the story: orient the audience, then the action, with reactions and inserts where they sharpen it. Respect screen direction and the 180-degree line when the shot descriptions allow you to judge it.
- When two clips are equally good, prefer the one marked keeper. Rejected clips are fine to use for their usable stretches — that's the point of this tool.
- "missing": the shots the scene needs that no clip provides. If a shot list is given, check it first; otherwise judge from the scene description (a missing establishing shot, reverse, reaction or insert). Keep characters, locations and look consistent with the existing prompts. Return [] if nothing essential is missing. At most 6.`;

const num = (v) => (typeof v === "number" && isFinite(v) ? v : Number(v));
const str = (v, n) => String(v ?? "").slice(0, n);
const r1 = (n) => Math.round(n * 10) / 10;

function describe(label, g, keeper) {
  const a = g.finish_analysis;
  const range = (x) => `${x.from}–${x.to}s`;
  const lines = [
    `${label} — ${g.model ?? "unknown model"}, ${a.duration}s${keeper ? ", KEEPER" : ""}${g.take_status === "rejected" ? `, rejected${g.reject_reason ? " (" + g.reject_reason + ")" : ""}` : ""}`,
    `Intended: ${str(g.prompt, 300) || "(no prompt recorded)"}`,
    `Shows: ${a.summary}`,
    `Shot: ${[a.shot?.size, a.shot?.subject, a.shot?.action, a.shot?.camera].filter(Boolean).join("; ")}`,
    `Usable: ${a.usable?.length ? a.usable.map((u) => `${range(u)} ${u.quality} (${u.why})`).join("; ") : "none"}`,
    `Defects: ${a.defects?.length ? a.defects.map((d) => `${range(d)} ${d.severity}: ${d.issue}`).join("; ") : "none"}`,
    `Best: ${a.best ? `${range(a.best)} (${a.best.why})` : "none"}`,
    `Could serve as: ${a.uses?.join(", ") || "unclear"}`,
  ];
  return lines.join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });

    const { projectId, scene, length, clipIds } = req.body || {};
    if (!projectId || !Array.isArray(clipIds) || clipIds.length === 0) return res.status(400).json({ error: "Choose some analysed clips first." });
    const target = LENGTHS.includes(Number(length)) ? Number(length) : 30;
    const ids = [...new Set(clipIds.map(String))].slice(0, MAX_CLIPS);

    // Only the creator's own clips, in this project, that pass 1 has read.
    const { data: gens } = await supabase
      .from("generations")
      .select("id, prompt, model, take_status, reject_reason, finish_analysis, created_at")
      .in("id", ids)
      .eq("user_id", user.id)
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    const clips = (gens ?? []).filter((g) => g.finish_analysis?.duration);
    if (clips.length === 0) return res.status(400).json({ error: "Analyse at least one chosen clip first." });

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await supabase
      .from("finish_cuts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_LIMIT) {
      return res.status(429).json({ error: `You've assembled ${DAILY_LIMIT} cuts in the last day — the limit while Finish is free. Your latest cut is still here.` });
    }

    const [{ data: shots }, { data: bd }] = await Promise.all([
      supabase.from("shots").select("name, prompt, selected_generation_id").eq("project_id", projectId).eq("user_id", user.id),
      supabase.from("scene_breakdowns").select("breakdown").eq("project_id", projectId).eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
    ]);
    const keepers = new Set((shots ?? []).map((s) => s.selected_generation_id).filter(Boolean));

    const labelled = clips.map((g, i) => ({ label: "C" + (i + 1), g }));
    const byLabel = Object.fromEntries(labelled.map((l) => [l.label, l.g]));

    let text = `Scene: ${str(scene, 1200).trim() || "(not described — infer it from the clips)"}\nTarget length: ${target}s\n\nCLIPS\n\n`;
    text += labelled.map((l) => describe(l.label, l.g, keepers.has(l.g.id))).join("\n\n");
    if (shots?.length) {
      text += `\n\nPLANNED SHOTS IN THIS PROJECT\n` + shots.map((s) => `- ${str(s.name, 80) || "Untitled"}: ${str(s.prompt, 240)}`).join("\n");
    }
    if (bd?.[0]?.breakdown) {
      text += `\n\nSCENE BREAKDOWN (shot list)\n` + JSON.stringify(bd[0].breakdown).slice(0, 6000);
    }

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 3000, system: SYSTEM_PROMPT, messages: [{ role: "user", content: text }] }),
    });
    if (!apiRes.ok) {
      console.error("Anthropic API error:", apiRes.status, await apiRes.text());
      return res.status(502).json({ error: "Assembly is unavailable right now. Try again shortly." });
    }

    const data = await apiRes.json();
    const raw = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    let out;
    try { out = JSON.parse(raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()); }
    catch { return res.status(502).json({ error: "The cut came back malformed. Try again." }); }

    const pieces = (Array.isArray(out?.cut) ? out.cut : [])
      .map((c) => {
        const g = byLabel[String(c?.clip ?? "").trim().toUpperCase()];
        if (!g) return null;
        const dur = g.finish_analysis.duration;
        const from = Math.max(0, Math.min(dur, num(c.from)));
        const to = Math.max(0, Math.min(dur, num(c.to)));
        if (!isFinite(from) || !isFinite(to) || to - from < 0.7) return null;
        return {
          generationId: g.id,
          from: r1(from),
          to: r1(to),
          role: ROLES.includes(c.role) ? c.role : "main action",
          why: str(c.why, 200),
        };
      })
      .filter(Boolean)
      .slice(0, 40);

    const missing = (Array.isArray(out?.missing) ? out.missing : [])
      .map((m) => ({ what: str(m?.what, 120), why: str(m?.why, 240), prompt: str(m?.prompt, 1500) }))
      .filter((m) => m.what)
      .slice(0, 6);

    const cut = {
      shots: pieces,
      missing,
      notes: str(out?.notes, 400),
      total: r1(pieces.reduce((s, p) => s + (p.to - p.from), 0)),
      target,
      clipCount: clips.length,
      ranAt: new Date().toISOString(),
    };

    const { error: insErr } = await supabase.from("finish_cuts").insert({
      user_id: user.id,
      project_id: projectId,
      scene: str(scene, 1200),
      target_length: target,
      cut,
    });
    if (insErr) console.error("finish_cuts insert failed:", insErr);

    return res.status(200).json({ cut });
  } catch (error) {
    console.error("finish-assemble failed:", error);
    return res.status(500).json({ error: "Something went wrong assembling the cut." });
  }
}