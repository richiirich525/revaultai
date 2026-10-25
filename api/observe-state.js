import { createClient } from "@supabase/supabase-js";
import { spineFrom, planFor } from "../src/lib/sequenceSpine.js";

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SYSTEM_PROMPT = `You are comparing what a shot was supposed to contain against what the footage actually shows. You are reading frames sampled from the end of an AI-generated clip.

A difference is not automatically an error. Models produce things filmmakers end up preferring. Your job is to report accurately, not to judge.

The plan has two parts and they do not carry the same weight. Lines above the heading are what this shot intended. Lines under CARRIED FROM EARLIER SHOTS are facts already established in footage that exists, so a difference there is continuity breaking rather than a model making a choice. Set "consequential" true for any difference against a carried fact.

Return ONLY a JSON object:
{
  "observed_end": "30-60 words describing the state at the END of the clip, in the same concrete terms as the plan: where each character is in frame, what they hold and in which hand, wardrobe, doors, lights, weather, condition of the space",
  "differences": [
    {
      "aspect": "short label, e.g. 'Sarah's position' or 'wine glass' or 'kitchen door'",
      "planned": "what the plan said",
      "observed": "what the frames show",
      "confidence": "high" | "medium" | "low",
      "consequential": true
    }
  ]
}

Rules:
- Only report differences you can actually see in the frames. If the plan mentions something not visible, leave it out rather than guessing.
- "consequential" is true when the difference would affect the NEXT shot — a moved prop, an open door, a character on the other side of frame. False for things that don't carry, like a momentary expression.
- Set confidence low when lighting, motion blur or compression could explain what you're seeing.
- Return an empty differences array when the footage matches the plan. Do not invent discrepancies.
- Be concrete. "Sarah is center frame rather than camera-left" is useful; "blocking differs" is not.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });

    const { generationId, frames } = req.body || {};
    if (!generationId || !Array.isArray(frames) || frames.length < 1) {
      return res.status(400).json({ error: "Need the generation and at least one closing frame." });
    }

    const { data: gen } = await supabase
      .from("generations")
      .select("id, user_id, shot_id, project_id, film_spec_id, prompt")
      .eq("id", generationId)
      .maybeSingle();
    if (!gen || gen.user_id !== user.id) return res.status(403).json({ error: "Not your generation" });

    /* Rows written before the plan widened were compared against one field,
       so a cached answer can be thinner than what this would produce now.
       The cache stays — observations are expensive and rarely change — but a
       caller can ask for it to be done again. */
    if (!req.body?.refresh) {
      const existing = await supabase.from("observed_states").select("*").eq("generation_id", generationId).maybeSingle();
      if (existing.data) return res.status(200).json({ state: existing.data, cached: true });
    }

    /*
      The plan.

      This used to read one field, `action.endState`, and refuse the whole
      check when it was empty — which threw away the cast, the wardrobe
      locks, the lighting and the screen direction sitting in the same spec,
      and meant a fully planned shot could be unverifiable because one field
      was blank.

      It now builds the plan from the sequence spine, and where this shot sits
      in a project it also reads the shots around it, so a fact established in
      an earlier shot can be labelled a commitment rather than an intention.
      Those are different claims and the model is told so.
    */
    let spec = null;
    if (gen.film_spec_id) {
      const { data: row } = await supabase.from("film_specs").select("spec").eq("id", gen.film_spec_id).maybeSingle();
      spec = row?.spec ?? null;
    }

    let shotsForSpine = [{ id: gen.shot_id, generationId: gen.id, spec }];
    let index = 0;

    /*
      The surrounding sequence is the project's OTHER PLANS, in the order they
      were written — not its shots. A shot is a record of a generation and
      carries no plan of its own; reading siblings through
      shots.selected_generation_id found almost nothing, because resolving a
      shot to a keeper is an occasional act. Measured: two of thirty-five.

      Reading the specs instead is also cheaper, one query rather than three,
      and it means a fact established in a plan counts as established whether
      or not that particular shot has been filmed yet.
    */
    if (gen.project_id && gen.film_spec_id) {
      const { data: siblings } = await supabase
        .from("film_specs")
        .select("id, title, spec, created_at")
        .eq("project_id", gen.project_id).eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(60);
      const built = (siblings ?? []).map((row) => ({
        id: row.id,
        name: row.title || "Untitled shot",
        /* Only this take is known to be filmed here; the rest are plans, and
           planFor cares about their facts rather than their footage. */
        generationId: row.id === gen.film_spec_id ? gen.id : null,
        spec: row.spec ?? null,
      }));
      const at = built.findIndex((x) => x.id === gen.film_spec_id);
      if (at >= 0) { shotsForSpine = built; index = at; }
    }

    const spine = spineFrom({ shots: shotsForSpine });
    const plan = planFor(spine, index);
    if (!plan.ok) {
      return res.status(400).json({
        error: "This take has nothing planned to compare against \u2014 no ending state, no cast, no locks. Shots from a scene breakdown carry one.",
      });
    }
    const planned = plan.text;

    const content = [];
    frames.slice(0, 3).forEach((f, i) => {
      content.push({ type: "text", text: `Closing frame ${i + 1} — sampled at ${Number(f.t).toFixed(1)}s` });
      content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: f.data } });
    });
    content.push({ type: "text", text: `WHAT THIS SHOT WAS SUPPOSED TO CONTAIN:\n${planned}\n\nThe frames above are from the end of the clip.` });

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2000, system: SYSTEM_PROMPT, messages: [{ role: "user", content }] }),
    });

    if (!apiRes.ok) {
      console.error("Anthropic API error:", apiRes.status, await apiRes.text());
      return res.status(502).json({ error: "State comparison is unavailable right now." });
    }

    const data = await apiRes.json();
    const raw = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();

    let out;
    try { out = JSON.parse(raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()); }
    catch { return res.status(502).json({ error: "State comparison returned an unexpected result." }); }

    const row = {
      user_id: user.id,
      generation_id: gen.id,
      shot_id: gen.shot_id ?? null,
      film_spec_id: gen.film_spec_id ?? null,
      project_id: gen.project_id ?? null,
      planned_end: planned,
      observed_end: String(out?.observed_end || "").slice(0, 800),
      differences: (Array.isArray(out?.differences) ? out.differences : []).slice(0, 8).map((d) => ({
        aspect: String(d?.aspect || "").slice(0, 100),
        planned: String(d?.planned || "").slice(0, 300),
        observed: String(d?.observed || "").slice(0, 300),
        confidence: ["high", "medium", "low"].includes(d?.confidence) ? d.confidence : "medium",
        consequential: d?.consequential !== false,
      })).filter((d) => d.aspect),
      resolution: "pending",
    };

    const { data: saved, error } = await supabase.from("observed_states").insert(row).select().single();
    if (error) throw error;

    /* `checked` and `committed` ride along in the response rather than the
       row: which parts of the spec this comparison actually had to work with.
       "No differences" means much less when the plan was one line, and the
       caller should be able to say so. */
    return res.status(200).json({ state: saved, checked: plan.fields, committed: plan.committed });
  } catch (error) {
    console.error("observe-state failed:", error);
    return res.status(500).json({ error: "Something went wrong reading the take's ending state." });
  }
}