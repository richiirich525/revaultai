/*
  payouts — RevaultAI
  The arithmetic of paying a creator, in one place.

  Two numbers decide every payout and both are promises made in the Terms, so
  they live here rather than being written into whichever route needs them:

    CREATOR_SHARE  80% of NET, where net means the sale amount after the
                   payment-processing fee Stripe actually charged. Not gross.
                   Stripe's fee is only knowable once the charge settles, which
                   is why the split happens after the sale rather than inside it.

    HOLD_DAYS      How long a sale sits before its payout is offered. A refund
                   or chargeback after the money has gone out is money the
                   platform absorbs, so the hold is the window where most
                   disputes surface and nothing has left yet.

  A WARNING THAT COSTS REAL MONEY IF IGNORED: on a purchases row, user_id is
  the BUYER. The creator who gets paid is creations.user_id. Paying
  purchases.user_id sends the creator's share to the person who bought the
  film. Everything here takes an explicit creatorId for that reason.
*/

export const CREATOR_SHARE = 0.80;
export const HOLD_DAYS = 7;

// The creator's cut of one sale, in cents. Rounds to the nearest cent; the
// platform keeps the remainder, so rounding can never overpay.
export function creatorCents(amountNetCents) {
  const net = Number(amountNetCents);
  if (!Number.isFinite(net) || net <= 0) return 0;
  return Math.round(net * CREATOR_SHARE);
}

// When a sale's hold expires. Null in, null out — a sale with no recorded
// date is treated as unknown rather than as payable.
export function holdClearsAt(createdAt) {
  if (!createdAt) return null;
  const t = new Date(createdAt);
  if (Number.isNaN(t.getTime())) return null;
  return new Date(t.getTime() + HOLD_DAYS * 24 * 60 * 60 * 1000);
}

export function holdHasCleared(createdAt, now = new Date()) {
  const clears = holdClearsAt(createdAt);
  return clears ? now >= clears : false;
}

// Whole days left on the hold, rounded up, for saying "clears in 3 days".
export function daysHeld(createdAt, now = new Date()) {
  const clears = holdClearsAt(createdAt);
  if (!clears) return null;
  const ms = clears - now;
  return ms <= 0 ? 0 : Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function money(cents, currency = "usd") {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const v = (Math.abs(n) / 100).toFixed(2);
  return currency.toLowerCase() === "usd" ? `${sign}$${v}` : `${sign}${v} ${currency.toUpperCase()}`;
}

/*
  Why a sale cannot be paid yet, or null when it can. Ordered so the most
  actionable reason wins: a creator who has not onboarded needs telling before
  anybody worries about a hold that will clear on its own.
*/
export function blockedReason(sale, now = new Date()) {
  if (sale.already_paid) return "already paid";
  if (!sale.creator_id) return "no creator on the film";
  if (!sale.stripe_account_id) return "creator has not set up payouts";
  if (!sale.payouts_enabled) return "Stripe has not cleared the creator yet";
  if (sale.amount_net == null) return "net unknown — Stripe fee not recorded";
  if (creatorCents(sale.amount_net) <= 0) return "nothing owed on this sale";
  if (!holdHasCleared(sale.created_at, now)) {
    const d = daysHeld(sale.created_at, now);
    return d === null ? "sale date unknown" : `held ${d} more day${d === 1 ? "" : "s"}`;
  }
  return null;
}
