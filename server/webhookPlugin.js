// server/webhookPlugin.js
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { buffer } from "node:stream/consumers";

function requireEnv(n) {
  const v = process.env[n];
  if (!v) throw new Error("Missing env: " + n);
  return v;
}

async function handleWebhook(req, res) {
  if (req.method !== "POST") { res.writeHead(405); res.end(); return; }

  const stripe  = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  const secret  = requireEnv("STRIPE_WEBHOOK_SECRET");
  const raw     = await buffer(req);
  const sig     = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Webhook signature invalid: " + err.message }));
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

console.log("WEBHOOK SESSION:", session.id);
console.log("WEBHOOK METADATA:", session.metadata);

    const { creation_id, user_id } = session.metadata;
console.log("WEBHOOK METADATA:", session.metadata);
    const supabase = createClient(
      requireEnv("VITE_SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    await supabase.from("purchases").upsert({
      user_id,
      creation_id,
      stripe_session_id: session.id,
        amount_total: session.amount_total,
        currency: session.currency,
    }, { onConflict: "user_id,creation_id" });
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ received: true }));
}

export default function webhookPlugin() {
  return {
    name: "revaultai-webhook",
    configureServer(server) {
      server.middlewares.use("/api/webhook", (req, res) => {
        handleWebhook(req, res).catch((err) => {
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    },
  };
}