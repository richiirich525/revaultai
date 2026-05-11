import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error("Missing env: " + name);
  return value;
}

async function handleVerifySession(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);

  const { session_id } = JSON.parse(Buffer.concat(chunks).toString());

  if (!session_id) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing session_id" }));
    return;
  }

  const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));

  const supabase = createClient(
    requireEnv("VITE_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );

  const session = await stripe.checkout.sessions.retrieve(session_id);

  if (session.payment_status !== "paid") {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Session not paid" }));
    return;
  }

  const { creation_id, user_id } = session.metadata || {};

  if (!creation_id || !user_id) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing checkout metadata" }));
    return;
  }

  const { error } = await supabase.from("purchases").upsert(
    {
      user_id,
      creation_id,
      stripe_session_id: session.id,
    },
    { onConflict: "user_id,creation_id" }
  );

  if (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error.message }));
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, creation_id }));
}

export default function verifySessionPlugin() {
  return {
    name: "revaultai-verify-session",
    configureServer(server) {
      server.middlewares.use("/api/verify-session", (req, res) => {
        handleVerifySession(req, res).catch((err) => {
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    },
  };
}