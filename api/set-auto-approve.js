import { createClient } from "@supabase/supabase-js";

/*
  set-auto-approve — RevaultAI
  Trusts a creator: with auto_approve on, their premium submissions go live
  immediately instead of waiting in the review queue.

  This has to be a server route. Row-level security only lets a signed-in
  person write their own profile row, so the browser cannot flip this for
  somebody else — and it should not be able to.
*/

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_EMAILS = ["richardgarland999@gmail.com"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });
    if (!ADMIN_EMAILS.includes((user.email ?? "").toLowerCase())) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { userId, autoApprove } = req.body || {};
    if (typeof userId !== "string" || !userId.trim()) {
      return res.status(400).json({ error: "Which creator?" });
    }
    if (typeof autoApprove !== "boolean") {
      return res.status(400).json({ error: "autoApprove has to be true or false." });
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ auto_approve: autoApprove })
      .eq("id", userId)
      .select("id, username, display_name, auto_approve")
      .maybeSingle();

    if (error) {
      console.error("set-auto-approve update failed:", error);
      return res.status(500).json({ error: "Could not save that." });
    }
    if (!data) return res.status(404).json({ error: "No creator with that id." });

    return res.status(200).json({ profile: data });
  } catch (err) {
    console.error("set-auto-approve failed:", err);
    return res.status(500).json({ error: "Something went wrong." });
  }
}
