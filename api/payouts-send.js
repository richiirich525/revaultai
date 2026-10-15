import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { blockedReason, creatorCents } from "../src/lib/payouts.js";

/*
  payouts-send — RevaultAI
  Sends a creator their share of named sales. This is the route that moves
  money, and it is written to be boring about it.

  THE RULES IT KEEPS:

  1. The caller names SALES, never amounts. Every figure is re-derived here
     from the purchase and the film. A client that could name its own amount
     could name any amount.

  2. Every sale is re-checked against blockedReason before anything is sent,
     even though the admin page already checked. The page's view can be
     minutes old; a refund in between must not be paid out.

  3. A payouts row is claimed BEFORE the transfer, and the unique index on
     stripe_session_id is what makes a double-send impossible. Stripe's own
     idempotency key, derived from the session id, is the second net: called
     twice with the same key it returns the first transfer rather than making
     a second one.

  4. A failed send leaves the row as 'failed' with the reason, and is retried
     by UPDATING that row rather than inserting a new one. Deleting it would
     let a transfer that actually succeeded be sent again.

  THE TRAP: purchases.user_id is the BUYER. The creator paid here is
  creations.user_id, read from the film.
*/

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_EMAILS = ["richardgarland999@gmail.com"];

// Stripe pays transfers out of the platform's AVAILABLE balance, and card
// funds take days to settle, so this is an ordinary outcome rather than a bug.
const NO_FUNDS = "balance_insufficient";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });
    if (!ADMIN_EMAILS.includes((user.email ?? "").toLowerCase())) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "STRIPE_SECRET_KEY is not set in this environment." });
    }

    const sessions = Array.isArray(req.body?.sessions) ? req.body.sessions.filter((s) => typeof s === "string") : [];
    if (!sessions.length) return res.status(400).json({ error: "Name the sales to pay." });
    if (sessions.length > 50) return res.status(400).json({ error: "Fifty sales at a time, at most." });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const { data: purchases, error: pErr } = await supabase
      .from("purchases")
      .select("creation_id, stripe_session_id, amount_net, currency, created_at")
      .in("stripe_session_id", sessions);
    if (pErr) {
      console.error("payouts-send purchases read failed:", pErr);
      return res.status(500).json({ error: "Could not read those sales." });
    }

    const creationIds = [...new Set((purchases ?? []).map((p) => p.creation_id).filter(Boolean))];
    const { data: creations } = creationIds.length
      ? await supabase.from("creations").select("id, title, user_id").in("id", creationIds)
      : { data: [] };
    const filmById = new Map((creations ?? []).map((c) => [c.id, c]));

    const creatorIds = [...new Set((creations ?? []).map((c) => c.user_id).filter(Boolean))];
    const { data: profiles } = creatorIds.length
      ? await supabase.from("profiles")
          .select("id, username, display_name, stripe_account_id, stripe_payouts_enabled")
          .in("id", creatorIds)
      : { data: [] };
    const creatorById = new Map((profiles ?? []).map((p) => [p.id, p]));

    const { data: existing } = await supabase
      .from("payouts").select("stripe_session_id, status").in("stripe_session_id", sessions);
    const statusBySession = new Map((existing ?? []).map((r) => [r.stripe_session_id, r.status]));

    const sent = [];
    const skipped = [];
    const now = new Date();

    for (const p of purchases ?? []) {
      const film = filmById.get(p.creation_id) ?? null;
      const creator = film?.user_id ? creatorById.get(film.user_id) ?? null : null;
      const prior = statusBySession.get(p.stripe_session_id);

      const label = film?.title ?? "(deleted film)";

      if (prior === "paid") {
        skipped.push({ session: p.stripe_session_id, film: label, reason: "already paid" });
        continue;
      }

      const sale = {
        creator_id: film?.user_id ?? null,
        stripe_account_id: creator?.stripe_account_id ?? null,
        payouts_enabled: !!creator?.stripe_payouts_enabled,
        amount_net: p.amount_net,
        created_at: p.created_at,
        already_paid: false,
      };
      const why = blockedReason(sale, now);
      if (why) {
        skipped.push({ session: p.stripe_session_id, film: label, reason: why });
        continue;
      }

      const amount = creatorCents(p.amount_net);
      const currency = (p.currency || "usd").toLowerCase();

      // Claim it first. The unique index means a concurrent run cannot claim
      // the same sale, and a row left 'pending' by a crash is reused here
      // rather than duplicated.
      const claim = {
        stripe_session_id: p.stripe_session_id,
        creator_id: sale.creator_id,
        creation_id: p.creation_id,
        amount_cents: amount,
        currency,
        status: "pending",
        stripe_account_id: sale.stripe_account_id,
        error: null,
      };
      const { error: claimErr } = await supabase
        .from("payouts").upsert(claim, { onConflict: "stripe_session_id" });
      if (claimErr) {
        skipped.push({ session: p.stripe_session_id, film: label, reason: "could not claim: " + claimErr.message });
        continue;
      }

      try {
        const transfer = await stripe.transfers.create({
          amount,
          currency,
          destination: sale.stripe_account_id,
          transfer_group: p.stripe_session_id,
          description: `RevaultAI — ${label}`,
          metadata: {
            revaultai_session: p.stripe_session_id,
            revaultai_creation: p.creation_id ?? "",
            revaultai_creator: sale.creator_id ?? "",
          },
        }, {
          // Same sale, same key: Stripe returns the first transfer instead of
          // making a second one.
          idempotencyKey: "revaultai-payout-" + p.stripe_session_id,
        });

        await supabase.from("payouts").update({
          status: "paid",
          stripe_transfer_id: transfer.id,
          paid_at: new Date().toISOString(),
          error: null,
        }).eq("stripe_session_id", p.stripe_session_id);

        sent.push({ session: p.stripe_session_id, film: label, creator: creator?.display_name || creator?.username || null, amount_cents: amount, transfer: transfer.id });
      } catch (err) {
        const noFunds = err?.code === NO_FUNDS || /insufficient/i.test(err?.message || "");
        const reason = noFunds
          ? "waiting on your Stripe balance to settle — press again later"
          : (err?.message || "Stripe refused the transfer");
        await supabase.from("payouts").update({ status: "failed", error: reason })
          .eq("stripe_session_id", p.stripe_session_id);
        skipped.push({ session: p.stripe_session_id, film: label, reason, retryable: true });
        console.error("payouts-send transfer failed for", p.stripe_session_id, err?.message);
      }
    }

    const total = sent.reduce((s, x) => s + x.amount_cents, 0);
    return res.status(200).json({
      sent,
      skipped,
      total_cents: total,
      summary: sent.length
        ? `Sent ${sent.length} payout${sent.length === 1 ? "" : "s"}.`
        : "Nothing was sent.",
    });
  } catch (err) {
    console.error("payouts-send failed:", err);
    return res.status(500).json({ error: "The payout run could not finish." });
  }
}
