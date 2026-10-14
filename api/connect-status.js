import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

/*
  connect-status — RevaultAI

  Asks Stripe where a creator's payout account actually stands and writes the
  answer back onto their profile.

  Two flags matter and they are not the same thing:

    details_submitted — the creator finished the onboarding form.
    payouts_enabled   — Stripe has verified them and will actually send money.

  A creator can finish the form and still not be payable, because Stripe may
  be verifying an ID or waiting on a document. Treating "submitted" as "ready"
  is how a platform promises a payout it cannot make, so the UI reads
  payouts_enabled and nothing else.

  The flags are cached on the profile so other pages can read them without a
  Stripe round trip, but Stripe is always the source of truth and this route
  is what reconciles the two.
*/

function requireEnv(n) {
  const v = process.env[n];
  if (!v) throw new Error("Missing env: " + n);
  return v;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = createClient(
      requireEnv("VITE_SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, stripe_account_id, stripe_country, stripe_payouts_enabled, stripe_details_submitted")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("connect-status profile read failed:", profileError);
      return res.status(500).json({ error: "Could not read your profile." });
    }

    if (!profile?.stripe_account_id) {
      return res.status(200).json({
        connected: false,
        details_submitted: false,
        payouts_enabled: false,
        requirements: [],
      });
    }

    const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));

    let account;
    try {
      account = await stripe.accounts.retrieve(profile.stripe_account_id);
    } catch (stripeErr) {
      // A deleted or rejected account should not read as "nearly ready". Say
      // what we know and let the creator see the cached state instead.
      console.error("accounts.retrieve failed for", profile.stripe_account_id, stripeErr);
      return res.status(200).json({
        connected: true,
        unreachable: true,
        details_submitted: !!profile.stripe_details_submitted,
        payouts_enabled: !!profile.stripe_payouts_enabled,
        requirements: [],
        error: "We could not reach Stripe for your payout account just now.",
      });
    }

    const payoutsEnabled   = !!account.payouts_enabled;
    const detailsSubmitted = !!account.details_submitted;

    // Only write when something moved — an unchanged profile does not need a
    // write on every settings page load.
    if (
      payoutsEnabled !== !!profile.stripe_payouts_enabled ||
      detailsSubmitted !== !!profile.stripe_details_submitted
    ) {
      const { error: syncError } = await supabase
        .from("profiles")
        .update({
          stripe_payouts_enabled: payoutsEnabled,
          stripe_details_submitted: detailsSubmitted,
        })
        .eq("id", user.id);
      if (syncError) console.error("connect-status sync failed:", syncError);
    }

    return res.status(200).json({
      connected: true,
      country: account.country ?? profile.stripe_country ?? null,
      details_submitted: detailsSubmitted,
      payouts_enabled: payoutsEnabled,
      charges_enabled: !!account.charges_enabled,
      // What Stripe is still waiting on, if anything. Shown to the creator so
      // "not ready yet" has a reason attached to it.
      requirements: account.requirements?.currently_due ?? [],
      disabled_reason: account.requirements?.disabled_reason ?? null,
    });
  } catch (err) {
    console.error("connect-status failed:", err);
    return res.status(500).json({ error: "Something went wrong." });
  }
}
