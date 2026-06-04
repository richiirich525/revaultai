import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Require a signed-in user (any authenticated creator can submit)
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

  const { title, creatorName, category, isPremium } = req.body;
  if (!title) return res.status(400).json({ error: "Missing title" });

  const resend = new Resend(process.env.RESEND_API_KEY);

  const subject = isPremium
    ? `Premium submission awaiting review: "${title}"`
    : `New open creation: "${title}"`;
  const heading = isPremium
    ? "New premium submission — awaiting your review."
    : "New open creation is live.";
  const note = isPremium
    ? `Submitted by ${creatorName || "a creator"}. This premium creation is in your Admin "Pending" queue and will not appear publicly until you approve it.`
    : `Submitted by ${creatorName || "a creator"}. Open creations go live immediately and do not require approval — this is just a heads-up so you can keep an eye on what is published.`;
  const cta = isPremium ? "Review in Admin" : "Open RevaultAI";

  const { error: emailError } = await resend.emails.send({
    from: "RevaultAI <noreply@revaultai.com>",
    to: "richardgarland999@gmail.com",
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; background: #0E0F14; color: #E8E6F0; padding: 40px 32px; border-radius: 8px;">
        <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 32px;">
          REVAULT<span style="color: #7B3FE4;">AI</span>
        </div>
        <h1 style="font-size: 24px; font-weight: 300; margin-bottom: 16px; color: #E8E6F0;">
          ${heading}
        </h1>
        <p style="font-size: 14px; color: #6B6878; line-height: 1.7; margin-bottom: 8px;">
          <strong style="color: #E8E6F0;">"${title}"</strong>${category ? ` &middot; ${category}` : ""}
        </p>
        <p style="font-size: 14px; color: #6B6878; line-height: 1.7; margin-bottom: 24px;">
          ${note}
        </p>
        <a href="https://revaultai.com" style="display: inline-block; background: #7B3FE4; color: white; padding: 12px 28px; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;">
          ${cta}
        </a>
      </div>
    `,
  });

  if (emailError) {
    console.error("[notify-submission] Resend error:", emailError);
    return res.status(500).json({ error: "Failed to send email: " + emailError.message });
  }

  return res.status(200).json({ success: true });
}