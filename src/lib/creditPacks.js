/*
  creditPacks — RevaultAI
  The credit packs on sale, what each costs, and the arithmetic for showing
  which one is the better deal.

  CREDIT_PACKS in api/buy-credits.js is the authority. Checkout is built from a
  Stripe price id that lives only on the server, and the browser sends nothing
  but a pack name — so this table can never overcharge anybody. What it can do
  is misstate the price, and it already did: the public generator page
  advertised two packs long after a third went on sale, hiding the one with the
  best value per credit from everyone who was not already signed in.

  Hence one table, read everywhere a pack is shown, with api/verify-packs.js to
  compare it against the server's table and against Stripe itself.

  Not to be confused with lib/genModels.js, which prices GENERATION in credits
  per second. This file prices the credits themselves.
*/

export const CREDIT_PACKS = [
  { key: "starter", label: "Starter", credits: 50,  priceCents: 500  },
  { key: "creator", label: "Creator", credits: 200, priceCents: 1500 },
  { key: "studio",  label: "Studio",  credits: 500, priceCents: 3200 },
];

export const packOf = (key) => CREDIT_PACKS.find((p) => p.key === key) ?? null;

// Whole dollars when the amount is whole — every pack is today, but a $7.50
// pack must not render as "$7.5".
export function priceLabel(pack) {
  const dollars = pack.priceCents / 100;
  return "$" + (Number.isInteger(dollars) ? dollars : dollars.toFixed(2));
}

// What a single credit costs, in cents. The basis for comparing packs.
export const centsPerCredit = (pack) => pack.priceCents / pack.credits;

// "6.4¢ per credit"
export const perCreditLabel = (pack) => centsPerCredit(pack).toFixed(1) + "¢ per credit";

// How much cheaper a pack is per credit than the smallest one, as a whole
// percentage. Zero for the starter pack itself, so callers can skip it.
export function savingVsStarter(pack) {
  const base = centsPerCredit(CREDIT_PACKS[0]);
  if (!base) return 0;
  return Math.round((1 - centsPerCredit(pack) / base) * 100);
}

// The best value on offer, by cost per credit, so one pack can be marked
// rather than the marking being hardcoded and going stale.
export const bestValuePack = () =>
  CREDIT_PACKS.reduce(
    (best, p) => (centsPerCredit(p) < centsPerCredit(best) ? p : best),
    CREDIT_PACKS[0]
  );

// "Starter — 50 credits ($5)"
export const packLabel = (pack) =>
  pack.label + " — " + pack.credits + " credits (" + priceLabel(pack) + ")";

/*
  Starting checkout.

  Here rather than in a component because two surfaces sell packs now — the
  Settings and Generate sections, and the public pricing page — and a second
  copy of this fetch is a second place for the pack name to be spelled wrong.

  Returns the Stripe URL to send the browser to, or throws with a message
  worth showing someone. The caller does the navigating, because what to do
  on failure differs between a settings panel and a landing page.
*/
export async function creditCheckoutUrl(packKey, userId) {
  if (!packOf(packKey)) throw new Error("That is not a pack we sell.");
  if (!userId) throw new Error("Sign in to buy credits.");

  const res = await fetch("/api/buy-credits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pack: packKey, userId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.url) {
    throw new Error(body.error || "Checkout did not start. Please try again.");
  }
  return body.url;
}
