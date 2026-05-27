import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth check — only admin can call this
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user || user.email !== "richardgarland999@gmail.com") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { creationId, creationTitle, creatorUserId } = req.body;
  if (!creationId || !creationTitle || !creatorUserId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Fetch creator email from Supabase auth
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: creatorData, error: creatorError } = await supabaseAdmin.auth.admin.getUserById(creatorUserId);
  if (creatorError || !creatorData?.user?.email) {
    return res.status(404).json({ error: "Could not find creator email" });
  }

  const creatorEmail = creatorData.user.email;
  const creatorName  = creatorData.user.user_metadata?.full_name ?? creatorEmail.split("@")[0];

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error: emailError } = await resend.emails.send({
    from: "RevaultAI <onboarding@resend.dev>",
    to: "richardgarland999@gmail.com",
    subject: `Your creation "${creationTitle}" has been approved`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; background: #0E0F14; color: #E8E6F0; padding: 40px 32px; border-radius: 8px;">
        <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 32px;">
          REVAULT<span style="color: #7B3FE4;">AI</span>
        </div>
        <h1 style="font-size: 28px; font-weight: 300; margin-bottom: 16px; color: #E8E6F0;">
          Your creation is live.
        </h1>
        <p style="font-size: 14px; color: #6B6878; line-height: 1.7; margin-bottom: 24px;">
          Hi ${creatorName}, your submission <strong style="color: #E8E6F0;">"${creationTitle}"</strong> has been reviewed and approved by the RevaultAI team. It is now live on the platform.
        </p>
        <a href="https://revaultai.vercel.app" style="display: inline-block; background: #7B3FE4; color: white; padding: 12px 28px; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;">
          View on RevaultAI
        </a>
        <p style="font-size: 11px; color: #6B6878; margin-top: 40px; line-height: 1.6;">
          You're receiving this because you submitted a creation to RevaultAI.
        </p>
      </div>
    `,
  });

  if (emailError) {
    console.error("[notify-approval] Resend error:", emailError);
    return res.status(500).json({ error: "Failed to send email: " + emailError.message });
  }

  return res.status(200).json({ success: true });
}