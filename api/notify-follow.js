import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

// Escape user-controlled text before putting it in the email HTML
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth check — caller must be a signed-in user (the follower)
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { creatorUserId } = req.body;
  if (!creatorUserId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Never notify on a self-follow
  if (user.id === creatorUserId) {
    return res.status(200).json({ success: true, skipped: "self" });
  }

  // Service-role client for admin lookups
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Creator's email (who we notify)
  const { data: creatorData, error: creatorError } = await supabaseAdmin.auth.admin.getUserById(creatorUserId);
  if (creatorError || !creatorData?.user?.email) {
    return res.status(404).json({ error: "Could not find creator email" });
  }
  const creatorEmail = creatorData.user.email;
  const creatorName  = creatorData.user.user_metadata?.full_name ?? creatorEmail.split("@")[0];

  // Follower's public name — derived from their own token, not trusted from the client
  let followerName = user.email?.split("@")[0] ?? "Someone";
  const { data: followerProfile } = await supabaseAdmin
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .maybeSingle();
  if (followerProfile) {
    followerName = followerProfile.display_name || followerProfile.username || followerName;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error: emailError } = await resend.emails.send({
    from: "RevaultAI <noreply@revaultai.com>",
    to: creatorEmail,
    subject: "You have a new follower on RevaultAI",
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; background: #0E0F14; color: #E8E6F0; padding: 40px 32px; border-radius: 8px;">
        <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 32px;">
          REVAULT<span style="color: #7B3FE4;">AI</span>
        </div>
        <h1 style="font-size: 28px; font-weight: 300; margin-bottom: 16px; color: #E8E6F0;">
          You have a new follower.
        </h1>
        <p style="font-size: 14px; color: #6B6878; line-height: 1.7; margin-bottom: 24px;">
          Hi ${esc(creatorName)}, <strong style="color: #E8E6F0;">${esc(followerName)}</strong> just started following you on RevaultAI. Your work is reaching more people.
        </p>
        <a href="https://revaultai.com" style="display: inline-block; background: #7B3FE4; color: white; padding: 12px 28px; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;">
          View on RevaultAI
        </a>
        <p style="font-size: 11px; color: #6B6878; margin-top: 40px; line-height: 1.6;">
          You're receiving this because someone followed you on RevaultAI.
        </p>
      </div>
    `,
  });

  if (emailError) {
    console.error("[notify-follow] Resend error:", emailError);
    return res.status(500).json({ error: "Failed to send email: " + emailError.message });
  }

  return res.status(200).json({ success: true });
}