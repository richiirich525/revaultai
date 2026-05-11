// server/checkoutPlugin.js
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function requireEnv(n) {
  const v = process.env[n];
  if (!v) throw new Error("Missing env: " + n);
  return v;
}

async function handleCheckout(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405); res.end(); return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const { creation_id, user_id } = JSON.parse(Buffer.concat(chunks).toString());
console.log("CHECKOUT BODY:", { creation_id, user_id });  
  const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  const supabase = createClient(
    requireEnv("VITE_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );

  // Fetch creation for price and title
  const { data: creation, error } = await supabase
    .from("creations")
    .select("id, title, price_cents")
    .eq("id", creation_id)
    .single();

  if (error || !creation) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Creation not found" })); return;
  }

  const origin = req.headers.origin || "http://localhost:5173";

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
    cancel_url:  origin + "/explore",
  });
console.log("CHECKOUT SESSION METADATA:", session.metadata);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ url: session.url }));
}

export default function checkoutPlugin() {
  return {
    name: "revaultai-checkout",
    configureServer(server) {
      server.middlewares.use("/api/checkout", (req, res) => {
        handleCheckout(req, res).catch((err) => {
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    },
  };
}