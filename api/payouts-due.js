import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { blockedReason, creatorCents, holdClearsAt } from "../src/lib/payouts.js";

/*
  payouts-due — RevaultAI
  What is owed to which creator, and why anything owed cannot be sent yet.

  READ ONLY. It reads sales, reads Stripe where a fee was never recorded, and
  writes nothing to either. No transfer is created here and no row is marked
  paid. That is deliberate: the arithmetic should be checkable against real
  sales before a single cent moves, and this route is how you check it.

  THE TRAP IN THIS DATA: purchases.user_id is the BUYER. The creator who is
  owed money is creations.user_id. They are both called user_id and they are
  never the same person. Everything below reads the creator from the film.
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

    const { data: purchases, error: pErr } = await supabase
      .from("purchases")
      .select("creation_id, stripe_session_id, amount_total, amount_net, stripe_fee, currency, created_at")
      .order("created_at", { ascending: true });

    if (pErr) {
      console.error("payouts-due purchases read failed:", pErr);
      return res.status(500).json({ error: "Could not read sales." });
    }
    if (!purchases?.length) {
      return res.status(200).json({ sales: 0, creators: [], unpayable: [], totals: { ready_cents: 0, held_cents: 0, blocked_cents: 0 } });
    }

    // The films, for the creator behind each sale.
    const creationIds = [...new Set(purchases.map((p) => p.creation_id).filter(Boolean))];
    const { data: creations } = await supabase
      .from("creations")
      .select("id, title, user_id, price_cents")
      .in("id", creationIds);
    const filmById = new Map((creations ?? []).map((c) => [c.id, c]));

    // The creators, for their payout state.
    const creatorIds = [...new Set((creations ?? []).map((c) => c.user_id).filter(Boolean))];
    const { data: profiles } = creatorIds.length
      ? await supabase
          .from("profiles")
          .select("id, username, display_name, stripe_account_id, stripe_payouts_enabled")
          .in("id", creatorIds)
      : { data: [] };
    const creatorById = new Map((profiles ?? []).map((p) => [p.id, p]));

    // Sales already paid out, so nothing is counted twice. The table may not
    // exist yet; that is not an error worth failing the whole report over.
    let paidSessions = new Set();
    let payoutState = new Map();
    const { data: paid, error: payErr } = await supabase
      .from("payouts")
      .select("stripe_session_id, status, error, stripe_transfer_id");
    if (payErr) {
      console.warn("payouts-due: payouts table unreadable:", payErr.message);
    } else {
      // Only a PAID payout takes a sale off the list. A row left 'pending' by
      // a crashed run, or 'failed' while the platform balance settles, has to
      // come back as payable — the send route reuses those rows rather than
      // creating a second one, and Stripe's idempotency key is the backstop.
      paidSessions = new Set((paid ?? []).filter((r) => r.status === "paid").map((r) => r.stripe_session_id));
      payoutState = new Map((paid ?? []).map((r) => [r.stripe_session_id, r]));
    }

    // Where a fee was never recorded, read it from Stripe rather than falling
    // back to gross. Falling back would silently overpay and contradict the
    // Terms, which promise a share of net.
    const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
    const missing = purchases.filter((p) => p.amount_net == null && p.stripe_session_id);
    const recovered = new Map();
    if (stripe) {
      for (const p of missing.slice(0, 50)) {
        try {
          const session = await stripe.checkout.sessions.retrieve(p.stripe_session_id, {
            expand: ["payment_intent.latest_charge.balance_transaction"],
          });
          const bt = session?.payment_intent?.latest_charge?.balance_transaction;
          if (bt && typeof bt === "object") recovered.set(p.stripe_session_id, { net: bt.net, fee: bt.fee });
        } catch (err) {
          console.warn("payouts-due: could not recover net for", p.stripe_session_id, err.message);
        }
      }
    }

    const now = new Date();
    const byCreator = new Map();
    const unpayable = [];
    let readyTotal = 0, heldTotal = 0, blockedTotal = 0;

    for (const p of purchases) {
      const film = filmById.get(p.creation_id) ?? null;
      const creator = film?.user_id ? creatorById.get(film.user_id) ?? null : null;
      const rec = recovered.get(p.stripe_session_id);
      const net = p.amount_net ?? rec?.net ?? null;

      const sale = {
        session: p.stripe_session_id,
        film: film?.title ?? "(deleted film)",
        creation_id: p.creation_id,
        creator_id: film?.user_id ?? null,
        creator: creator?.display_name || creator?.username || null,
        stripe_account_id: creator?.stripe_account_id ?? null,
        payouts_enabled: !!creator?.stripe_payouts_enabled,
        amount_total: p.amount_total ?? null,
        stripe_fee: p.stripe_fee ?? rec?.fee ?? null,
        amount_net: net,
        net_from_stripe: p.amount_net == null && rec != null,
        currency: p.currency ?? "usd",
        created_at: p.created_at ?? null,
        hold_clears: holdClearsAt(p.created_at)?.toISOString() ?? null,
        already_paid: paidSessions.has(p.stripe_session_id),
        owed_cents: net == null ? null : creatorCents(net),
        // A previous attempt, when there was one, so a retry explains itself.
        last_attempt: payoutState.get(p.stripe_session_id)?.status ?? null,
        last_error: payoutState.get(p.stripe_session_id)?.error ?? null,
      };

      const why = blockedReason(sale, now);
      sale.blocked = why;

      if (sale.already_paid) continue;

      if (why) {
        unpayable.push(sale);
        if (sale.owed_cents) {
          if (why.startsWith("held")) heldTotal += sale.owed_cents;
          else blockedTotal += sale.owed_cents;
        }
        continue;
      }

      readyTotal += sale.owed_cents;
      if (!byCreator.has(sale.creator_id)) {
        byCreator.set(sale.creator_id, {
          creator_id: sale.creator_id,
          creator: sale.creator,
          stripe_account_id: sale.stripe_account_id,
          owed_cents: 0,
          sales: [],
        });
      }
      const row = byCreator.get(sale.creator_id);
      row.owed_cents += sale.owed_cents;
      row.sales.push(sale);
    }

    const creatorsOwed = [...byCreator.values()].sort((a, b) => b.owed_cents - a.owed_cents);

    return res.status(200).json({
      sales: purchases.length,
      stripe_checked: !!stripe,
      recovered_nets: recovered.size,
      creators: creatorsOwed,
      unpayable,
      totals: { ready_cents: readyTotal, held_cents: heldTotal, blocked_cents: blockedTotal },
      summary: creatorsOwed.length
        ? `${creatorsOwed.length} creator${creatorsOwed.length === 1 ? "" : "s"} ready to be paid.`
        : "Nothing is ready to pay right now.",
      note: "Read only. No transfer was created and nothing was marked paid.",
    });
  } catch (err) {
    console.error("payouts-due failed:", err);
    return res.status(500).json({ error: "Could not work out what is owed." });
  }
}
