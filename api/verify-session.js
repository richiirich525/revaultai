// api/verify-session.js — Vercel serverless function
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

  const { session_id } = req.body;

  if (!session_id) {
    return res.status(400).json({ error: "Missing session_id" });
  }

  const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  const supabase = createClient(
    requireEnv("VITE_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );

  const session = await stripe.checkout.sessions.retrieve(session_id);

  if (session.payment_status !== "paid") {
    return res.status(400).json({ error: "Session not paid" });
  }

  const { creation_id, user_id } = session.metadata || {};

  if (!creation_id || !user_id) {
    return res.status(400).json({ error: "Missing checkout metadata" });
  }

  const { error } = await supabase.from("purchases").upsert(
    { user_id, creation_id, stripe_session_id: session.id },
    { onConflict: "user_id,creation_id" }
  );

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true, creation_id, user_id });
}