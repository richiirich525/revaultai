import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { CREDIT_PACKS as SERVER_PACKS } from "./buy-credits.js";
import { CREDIT_PACKS as SHOWN_PACKS } from "../src/lib/creditPacks.js";

/*
  verify-packs — RevaultAI
  Asks whether the credit packs we ADVERTISE match the ones we SELL.

  Three tables have to agree and nothing was previously checking them:

    1. src/lib/creditPacks.js — what the browser shows a visitor.
    2. CREDIT_PACKS in api/buy-credits.js — the pack names and credit grants
       the server honors, and the Stripe price id it charges against.
    3. Stripe itself — the amount actually taken from the card.

  The dangerous drift is the third. Editing a price in the Stripe dashboard
  changes what a customer pays and leaves every number on the site wrong, with
  nothing in the codebase to notice. This route catches that, and it is read
  only: it retrieves prices, it never creates a session or charges anyone.

  Admin only. Safe to re-run whenever a pack or a price changes.
*/

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_EMAILS = ["richardgarland999@gmail.com"];

export default async function handler(req, res) {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });
    if (!ADMIN_EMAILS.includes((user.email ?? "").toLowerCase())) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const problems = [];
    const rows = [];

    // --- shown against sold ---------------------------------------------
    for (const shown of SHOWN_PACKS) {
      const sold = SERVER_PACKS[shown.key];
      if (!sold) {
        problems.push(`"${shown.key}" is advertised but the server will refuse it.`);
        rows.push({ key: shown.key, verdict: "not for sale" });
        continue;
      }
      if (sold.credits !== shown.credits) {
        problems.push(
          `"${shown.key}" is advertised as ${shown.credits} credits but grants ${sold.credits}.`
        );
      }
      rows.push({
        key: shown.key,
        shown_credits: shown.credits,
        granted_credits: sold.credits,
        shown_cents: shown.priceCents,
        price_id: sold.priceId,
      });
    }

    for (const key of Object.keys(SERVER_PACKS)) {
      if (!SHOWN_PACKS.some((p) => p.key === key)) {
        // Exactly the failure this route exists for: a pack on sale that no
        // visitor can see. It is how the Studio pack stayed hidden.
        problems.push(`"${key}" is on sale but is advertised nowhere.`);
        rows.push({ key, verdict: "sold but hidden" });
      }
    }

    // --- shown against Stripe -------------------------------------------
    let stripeChecked = false;
    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      stripeChecked = true;
      for (const row of rows) {
        if (!row.price_id) continue;
        try {
          const price = await stripe.prices.retrieve(row.price_id);
          row.stripe_cents = price.unit_amount;
          row.stripe_currency = price.currency;
          row.stripe_active = price.active;
          if (price.unit_amount !== row.shown_cents) {
            problems.push(
              `"${row.key}" is advertised at ${row.shown_cents} cents but Stripe charges ${price.unit_amount}.`
            );
          }
          if (price.currency !== "usd") {
            problems.push(`"${row.key}" is priced in ${price.currency}, not usd.`);
          }
          if (price.active === false) {
            problems.push(`"${row.key}" points at an inactive Stripe price; checkout will fail.`);
          }
        } catch (err) {
          row.stripe_error = err.message;
          problems.push(`"${row.key}" price id does not resolve at Stripe: ${err.message}`);
        }
      }
    }

    return res.status(200).json({
      checked: rows.length,
      stripe_checked: stripeChecked,
      problems: problems.length,
      summary: problems.length
        ? problems.join(" ")
        : stripeChecked
          ? "Every advertised pack matches the server and Stripe."
          : "Advertised packs match the server. STRIPE_SECRET_KEY is not set here, so prices were not checked.",
      rows,
    });
  } catch (err) {
    console.error("verify-packs failed:", err);
    return res.status(500).json({ error: "Could not run the check." });
  }
}
