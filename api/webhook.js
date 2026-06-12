// api/webhook.js — Vercel serverless function
// IMPORTANT: body parser must be disabled so Stripe can verify the raw body.
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function requireEnv(n) {
  const v = process.env[n];
  if (!v) throw new Error("Missing env: " + n);
  return v;
}

// Disable Vercel's automatic body parsing for this route
export const config = {
  api: {
    bodyParser: false,
  },
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end",  () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  const secret = requireEnv("STRIPE_WEBHOOK_SECRET");
  const sig    = req.headers["stripe-signature"];
  const raw    = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return res.status(400).json({ error: "Webhook signature invalid: " + err.message });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const meta = session.metadata || {};
    const { creation_id, user_id } = meta;

    if (meta.type === "credit_purchase" && user_id) {
      const supabase = createClient(
        requireEnv("VITE_SUPABASE_URL"),
        requireEnv("SUPABASE_SERVICE_ROLE_KEY")
      );

      const creditsToAdd = parseInt(meta.credits, 10) || 0;
      if (creditsToAdd > 0) {
        await supabase.rpc("add_credits", {
          p_user_id: user_id,
          p_amount: creditsToAdd,
          p_reason: "purchase",
          p_session_id: session.id,
        });
      }
    } else if (creation_id && user_id) {
      const supabase = createClient(
        requireEnv("VITE_SUPABASE_URL"),
        requireEnv("SUPABASE_SERVICE_ROLE_KEY")
      );

      await supabase.from("purchases").upsert(
        { user_id, creation_id, stripe_session_id: session.id, amount_total: session.amount_total, currency: session.currency },
        { onConflict: "user_id,creation_id" }
      );
    }
  }

  return res.status(200).json({ received: true });
}