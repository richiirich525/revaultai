import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// What a set costs, server-side. Marble charges us about $1.26 for a full
// world and $0.18 for a draft; these are the prices we charge for it.
const TIERS = {
  full:  { model: "marble-1.1",       credits: 35, label: "Full" },
  draft: { model: "marble-1.0-draft", credits: 10, label: "Draft" },
};

const MARBLE = "https://api.worldlabs.ai/marble/v1";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });
    if (!process.env.WORLDLABS_API_KEY) return res.status(503).json({ error: "Set generation isn't switched on yet." });

    const { name, prompt, tier, projectId } = req.body || {};
    const chosen = TIERS[tier] ?? TIERS.full;
    const text = String(prompt || "").trim();
    if (text.length < 10 || text.length > 1000) {
      return res.status(400).json({ error: "Describe the set in a sentence or two (10–1000 characters)." });
    }

    // Charge first, refund if anything below fails — the same pattern as generating.
    const { data: paid, error: spendError } = await supabase.rpc("spend_credits", {
      p_user_id: user.id,
      p_amount: chosen.credits,
      p_reason: "set generation",
    });
    if (spendError) throw spendError;
    if (!paid) return res.status(402).json({ error: "Not enough credits" });

    const refund = async () => {
      await supabase.rpc("add_credits", {
        p_user_id: user.id, p_amount: chosen.credits, p_reason: "refund", p_session_id: null,
      });
    };

    const title = String(name || text).trim().slice(0, 64);
    let row;
    try {
      const insert = await supabase
        .from("sets")
        .insert({
          user_id: user.id,
          project_id: typeof projectId === "string" ? projectId : null,
          name: title,
          prompt: text,
          tier,
          model: chosen.model,
          status: "queued",
          credits_spent: chosen.credits,
        })
        .select()
        .single();
      if (insert.error) throw insert.error;
      row = insert.data;
    } catch (e) {
      await refund();
      throw e;
    }

    try {
      const r = await fetch(`${MARBLE}/worlds:generate`, {
        method: "POST",
        headers: { "WLT-Api-Key": process.env.WORLDLABS_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: title,
          model: chosen.model,
          world_prompt: { type: "text", text_prompt: text },
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.operation_id) {
        console.error("marble generate failed:", r.status, JSON.stringify(j).slice(0, 400));
        throw new Error(j?.detail?.message || j?.message || "World Labs refused the job");
      }
      await supabase
        .from("sets")
        .update({ operation_id: j.operation_id, status: "processing", updated_at: new Date().toISOString() })
        .eq("id", row.id);
      return res.status(200).json({ setId: row.id, credits: chosen.credits });
    } catch (e) {
      await refund();
      await supabase
        .from("sets")
        .update({ status: "failed", error: String(e.message).slice(0, 300), updated_at: new Date().toISOString() })
        .eq("id", row.id);
      return res.status(502).json({ error: "Couldn't start the set — your credits have been returned." });
    }
  } catch (err) {
    console.error("generate-set failed:", err);
    return res.status(500).json({ error: "Something went wrong starting that set." });
  }
}