import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const REASON_LABELS = {
  identity: "identity drift", anatomy: "hands or anatomy", motion: "motion",
  camera: "camera", adherence: "prompt adherence", continuity: "continuity",
  performance: "performance", artifact: "artifacts",
};

/*
  A receipt records what happened on RevaultAI. It does not and cannot vouch
  for work done elsewhere — that boundary is stated in the receipt itself
  rather than implied away.
*/
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });

    const { creationId, projectId } = req.body || {};
    if (!creationId) return res.status(400).json({ error: "Missing film" });

    const { data: creation } = await supabase
      .from("creations")
      .select("id, user_id, title, created_at, prompt, model")
      .eq("id", creationId)
      .maybeSingle();
    if (!creation || creation.user_id !== user.id) return res.status(403).json({ error: "Not your film" });

    // Everything generated under this project, or everything of theirs if the
    // film isn't filed under one.
    let gq = supabase.from("generations").select("model, status, credits_spent, duration_seconds, reject_reason, created_at, film_spec_id").eq("user_id", user.id);
    if (projectId) gq = gq.eq("project_id", projectId);
    const { data: gens } = await gq;

    let sq = supabase.from("shots").select("id, selected_generation_id").eq("user_id", user.id);
    if (projectId) sq = sq.eq("project_id", projectId);
    const { data: shots } = await sq;

    const done = (gens ?? []).filter((g) => g.status === "complete" || g.status === "failed");
    const keepers = (shots ?? []).filter((s) => s.selected_generation_id).length;

    const models = {};
    for (const g of done) {
      const m = g.model || "unknown";
      models[m] = models[m] || { attempts: 0, credits: 0, seconds: 0 };
      models[m].attempts++;
      models[m].credits += Number(g.credits_spent) || 0;
      models[m].seconds += Number(g.duration_seconds) || 0;
    }

    const reasons = {};
    for (const g of done) if (g.reject_reason) reasons[g.reject_reason] = (reasons[g.reject_reason] || 0) + 1;

    let specCount = 0;
    if (projectId) {
      const { count } = await supabase
        .from("film_specs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("project_id", projectId);
      specCount = count || 0;
    }

    const facts = {
      title: creation.title,
      publishedAt: creation.created_at,
      models: Object.entries(models)
        .sort((a, b) => b[1].attempts - a[1].attempts)
        .map(([key, v]) => ({ key, attempts: v.attempts, credits: v.credits, seconds: v.seconds })),
      generations: done.length,
      shotsLocked: keepers,
      attemptsPerKeeper: keepers > 0 ? Math.round((done.length / keepers) * 10) / 10 : null,
      totalCredits: done.reduce((s, g) => s + (Number(g.credits_spent) || 0), 0),
      totalSeconds: done.reduce((s, g) => s + (Number(g.duration_seconds) || 0), 0),
      rejectionReasons: Object.entries(reasons)
        .sort((a, b) => b[1] - a[1])
        .map(([k, n]) => ({ reason: REASON_LABELS[k] ?? k, count: n })),
      shotSpecs: specCount,
      scope: projectId
        ? "Figures cover work generated on RevaultAI under this project."
        : "Figures cover work generated on RevaultAI by this creator. The film may also include material made elsewhere.",
    };

    const existing = await supabase.from("film_receipts").select("id, visibility, commentary, rights").eq("creation_id", creationId).maybeSingle();

    const defaults = {
      models: true, tools: true, rights: true, commentary: true,
      generations: false, credits: false, rejections: false, attemptsPerKeeper: false,
    };

    const row = {
      user_id: user.id,
      creation_id: creationId,
      project_id: projectId ?? null,
      facts,
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      visibility: existing.data?.visibility ?? defaults,
      commentary: existing.data?.commentary ?? null,
      rights: existing.data?.rights ?? {},
    };

    const { data: saved, error } = existing.data
      ? await supabase.from("film_receipts").update(row).eq("id", existing.data.id).select().single()
      : await supabase.from("film_receipts").insert(row).select().single();

    if (error) throw error;
    return res.status(200).json({ receipt: saved });
  } catch (error) {
    console.error("build-receipt failed:", error);
    return res.status(500).json({ error: "Could not build the receipt." });
  }
}