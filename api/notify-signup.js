import { Resend } from "resend";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Guard: Supabase webhook must send the matching secret, so randoms can't spam this URL
  const secret = req.headers["x-signup-secret"];
  if (!secret || secret !== process.env.SIGNUP_NOTIFY_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Supabase DB webhook payload: { type, table, record, old_record, ... }
    const record = req.body?.record ?? {};
    const email = record.email ?? "(no email)";
    const createdAt = record.created_at
      ? new Date(record.created_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
      : new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error: emailError } = await resend.emails.send({
      from: "RevaultAI <noreply@revaultai.com>",
      to: "richardgarland999@gmail.com",
      subject: `New RevaultAI signup: ${email}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; background: #0E0F14; color: #E8E6F0; padding: 40px 32px; border-radius: 8px;">
          <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 32px;">
            REVAULT<span style="color: #7B3FE4;">AI</span>
          </div>
          <h1 style="font-size: 24px; font-weight: 300; margin-bottom: 16px; color: #E8E6F0;">
            New user signed up.
          </h1>
          <p style="font-size: 14px; color: #6B6878; line-height: 1.7; margin-bottom: 8px;">
            <strong style="color: #E8E6F0;">${email}</strong>
          </p>
          <p style="font-size: 14px; color: #6B6878; line-height: 1.7; margin-bottom: 24px;">
            Joined ${createdAt} PT.
          </p>
          <a href="https://revaultai.com" style="display: inline-block; background: #7B3FE4; color: white; padding: 12px 28px; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;">
            Open RevaultAI
          </a>
        </div>
      `,
    });

    if (emailError) {
      console.error("[notify-signup] Resend error:", emailError);
      return res.status(500).json({ error: "Failed to send email" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[notify-signup] error:", err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}