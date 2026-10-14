import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

/*
  connect-onboard — RevaultAI

  Puts a creator on a Stripe Express account so they can be paid without us
  ever holding their bank details. Two things happen here, in order:

    1. An Express account is created for them, once. Stripe owns the identity
       and tax collection from that point on.
    2. A single-use onboarding link is minted and handed back. The creator
       finishes on Stripe's own pages, not ours.

  This has to be a server route and it has to be authenticated. An open
  version of this endpoint would let anyone mint an onboarding link against
  somebody else's connected account, which is a route into their payout
  details. The caller's identity comes from the bearer token and from nowhere
  else — never from the request body.

  Re-entrant by design. A creator who abandons onboarding halfway and comes
  back gets a fresh link against the SAME account, because account creation
  is the step you cannot take twice. The country is fixed at creation and
  Stripe will not change it afterwards, so it is confirmed in the UI first.
*/

function requireEnv(n) {
  const v = process.env[n];
  if (!v) throw new Error("Missing env: " + n);
  return v;
}

const PROFILE_FIELDS = "id, username, display_name, stripe_account_id, stripe_country";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

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
      .select(PROFILE_FIELDS)
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("connect-onboard profile read failed:", profileError);
      return res.status(500).json({ error: "Could not read your profile." });
    }
    if (!profile) return res.status(404).json({ error: "Set up your creator profile first." });

    const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
    const origin = req.headers.origin || "https://www.revaultai.com";

    let accountId = profile.stripe_account_id;

    if (!accountId) {
      // Country is a one-way door: Stripe will not move an account between
      // countries later. We do not keep our own list of supported countries,
      // because a stale list would reject a creator Stripe would accept —
      // Stripe is the authority, and its error is surfaced as written.
      const raw = typeof req.body?.country === "string" ? req.body.country.trim().toUpperCase() : "US";
      if (!/^[A-Z]{2}$/.test(raw)) {
        return res.status(400).json({ error: "Country should be a two-letter code, like US or GB." });
      }

      let account;
      try {
        account = await stripe.accounts.create({
          type: "express",
          country: raw,
          email: user.email ?? undefined,
          // Destination charges: RevaultAI stays the merchant of record and
          // the connected account only needs to receive transfers.
          capabilities: { transfers: { requested: true } },
          business_profile: {
            product_description: "Sells AI-generated short films on RevaultAI.",
            url: profile.username ? origin + "/@" + profile.username : origin,
          },
          metadata: { revaultai_user_id: user.id },
        });
      } catch (stripeErr) {
        console.error("accounts.create failed:", stripeErr);
        return res.status(400).json({ error: stripeErr.message || "Stripe would not create the account." });
      }

      accountId = account.id;

      const { error: saveError } = await supabase
        .from("profiles")
        .update({ stripe_account_id: accountId, stripe_country: raw })
        .eq("id", user.id);

      // The account now exists at Stripe. If we cannot record its id we must
      // stop rather than continue, or the next call creates a second account
      // for the same creator and the first becomes an orphan nobody can see.
      if (saveError) {
        console.error("Could not record stripe_account_id", accountId, "for", user.id, saveError);
        return res.status(500).json({
          error: "Your payout account was created but we could not save it. Email rich@revaultai.com before trying again.",
        });
      }
    }

    let link;
    try {
      link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: origin + "/settings?connect=refresh",
        return_url: origin + "/settings?connect=done",
        type: "account_onboarding",
      });
    } catch (linkErr) {
      console.error("accountLinks.create failed:", linkErr);
      return res.status(400).json({ error: linkErr.message || "Could not start onboarding." });
    }

    return res.status(200).json({ url: link.url, account_id: accountId });
  } catch (err) {
    console.error("connect-onboard failed:", err);
    return res.status(500).json({ error: "Something went wrong." });
  }
}
