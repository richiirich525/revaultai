import { createClient } from "@supabase/supabase-js";

/*
  grant-credits — RevaultAI
  Puts credits on somebody's account, from the Admin page.

  Why this exists: the only way to grant credits was a SQL statement, and the
  only way to check whether it had worked was another one. A reviewer was
  granted 600 credits three times in a row because nothing on screen ever
  confirmed the first two. So this route does the one thing that prevents
  that — it returns the balance AFTER the grant, and the page shows it.

  It calls add_credits rather than writing the column, so a grant is recorded
  with a reason the same way a purchase is. An UPDATE would replace the
  balance instead of adding to it and would leave no trace of why.
*/

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_EMAILS = ["richardgarland999@gmail.com"];

// Large enough for a reviewer, small enough that a slipped digit is survivable.
const MAX_GRANT = 5000;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });
    if (!ADMIN_EMAILS.includes((user.email ?? "").toLowerCase())) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { userId, amount, reason } = req.body || {};
    if (typeof userId !== "string" || !userId.trim()) {
      return res.status(400).json({ error: "Which account?" });
    }
    const n = Number(amount);
    if (!Number.isInteger(n) || n === 0) {
      return res.status(400).json({ error: "Amount has to be a whole number of credits." });
    }
    if (Math.abs(n) > MAX_GRANT) {
      return res.status(400).json({ error: `That is more than ${MAX_GRANT} credits — do it in the database if you really mean it.` });
    }

    const { data: before, error: readErr } = await supabase
      .from("profiles").select("id, username, display_name, credits").eq("id", userId).maybeSingle();
    if (readErr) {
      console.error("grant-credits read failed:", readErr);
      return res.status(500).json({ error: "Could not read that account." });
    }
    if (!before) return res.status(404).json({ error: "No account with that id." });

    const why = String(reason || "manual_grant").slice(0, 60);

    // Negative amounts take credits back, which is the other half of being
    // able to see what you did.
    const rpc = n > 0 ? "add_credits" : "revoke_credits";
    const args = n > 0
      ? { p_user_id: userId, p_amount: n, p_reason: why, p_session_id: null }
      : { p_user_id: userId, p_amount: Math.abs(n), p_reference: why };

    const { error: rpcErr } = await supabase.rpc(rpc, args);
    if (rpcErr) {
      console.error("grant-credits rpc failed:", rpcErr);
      return res.status(500).json({ error: rpcErr.message });
    }

    // The point of the whole route: say what the balance is now.
    const { data: after } = await supabase
      .from("profiles").select("credits").eq("id", userId).maybeSingle();

    const who = before.display_name || before.username || "that account";
    return res.status(200).json({
      user: who,
      before: before.credits ?? 0,
      after: after?.credits ?? null,
      granted: n,
      summary: `${who}: ${before.credits ?? 0} → ${after?.credits ?? "?"} credits.`,
    });
  } catch (err) {
    console.error("grant-credits failed:", err);
    return res.status(500).json({ error: "Could not grant those credits." });
  }
}
