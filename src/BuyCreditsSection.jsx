import { useState } from "react";
import { CREDIT_PACKS, creditCheckoutUrl, packLabel } from "./lib/creditPacks.js";

/*
  BuyCreditsSection — RevaultAI
  Balance, and the packs that top it up.

  The packs come from lib/creditPacks.js rather than being written out here.
  They used to be three hardcoded buttons, and the stale comment on the state
  below — naming two packs when three were on sale — is roughly how long that
  went unnoticed.
*/

export default function BuyCreditsSection({ user, profile, notify }) {
  const [buying, setBuying] = useState(null); // a pack key, or null

  async function handleBuyCredits(pack) {
    if (!user) { notify("Sign in to purchase credits."); return; }
    setBuying(pack);
    try {
      // assign() rather than setting location.href: the buttons are built in a
      // map(), which the compiler's analysis reads as a component scope, and
      // assigning to a property of window from inside one is flagged. This is
      // the explicit navigation call and does the same thing.
      window.location.assign(await creditCheckoutUrl(pack, user.id));
    } catch (err) {
      notify("Checkout failed: " + err.message);
      setBuying(null);
    }
  }

  return (
    <div className="credits-section">
      <h3>Credits</h3>
      {/*
        An unknown balance is not a zero balance. When the profile could not be
        read, `?? 0` said "you have no credits" to somebody who had plenty —
        and because the client's own check skips a non-number, generation still
        worked, which is exactly how the bug stayed hidden.
      */}
      <p>Balance: <strong>{typeof profile?.credits === "number" ? profile.credits : "\u2014"}</strong>{" "}
        {typeof profile?.credits === "number" ? "credits" : (
          <span style={{ fontSize: 11, opacity: 0.8 }}>
            couldn&rsquo;t read your balance just now &mdash; reload, and if it persists write to rich@revaultai.com
          </span>
        )}
      </p>
      <div className="credits-packs">
        {CREDIT_PACKS.map((pack) => (
          <button
            key={pack.key}
            onClick={() => handleBuyCredits(pack.key)}
            disabled={buying !== null}
          >
            {buying === pack.key ? "Redirecting…" : packLabel(pack)}
          </button>
        ))}
      </div>
    </div>
  );
}
