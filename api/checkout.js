// api/checkout.js — Vercel serverless function
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function requireEnv(n) {
  const v = process.env[n];
  if (!v) throw new Error("Missing env: " + n);
  return v;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { creation_id, user_id } = req.body;

  if (!creation_id || !user_id) {
    return res.status(400).json({ error: "Missing creation_id or user_id" });
  }

  const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  const supabase = createClient(
    requireEnv("VITE_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );

  const { data: creation, error } = await supabase
    .from("creations")
    .select("id, title, price_cents")
    .eq("id", creation_id)
    .single();

  if (error || !creation) {
    return res.status(404).json({ error: "Creation not found" });
  }

  const origin = req.headers.origin || "https://revaultai.com";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        unit_amount: creation.price_cents || 499,
        product_data: { name: creation.title },
      },
      quantity: 1,
    }],
    metadata: { creation_id, user_id },
    success_url: origin + "/purchase-success?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: origin + "/?cancelled=true",
  });

  return res.status(200).json({ url: session.url });
}