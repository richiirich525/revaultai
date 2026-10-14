import { useState } from "react";

/*
  BuyCreditsSection — RevaultAI
  Extracted from App.jsx.
*/

export default function BuyCreditsSection({ user, profile, notify }) {
  const [buying, setBuying] = useState(null); // "starter" | "creator" | null

  async function handleBuyCredits(pack) {
    if (!user) { notify("Sign in to purchase credits."); return; }
    setBuying(pack);
    try {
      const res = await fetch("/api/buy-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack, userId: user.id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.url) {
        notify("Checkout failed: " + (j.error || "Please try again."));
        setBuying(null);
        return;
      }
      window.location.href = j.url;
    } catch (err) {
      notify("Checkout failed: " + err.message + ". Please try again.");
      setBuying(null);
    }
  }

  return (
    <div className="credits-section">
      <h3>Credits</h3>
      <p>Balance: <strong>{profile?.credits ?? 0}</strong> credits</p>
      <div className="credits-packs">
        <button onClick={() => handleBuyCredits("starter")} disabled={buying !== null}>
          {buying === "starter" ? "Redirecting…" : "Starter — 50 credits ($5)"}
        </button>
        <button onClick={() => handleBuyCredits("creator")} disabled={buying !== null}>
          {buying === "creator" ? "Redirecting…" : "Creator — 200 credits ($15)"}
        </button>
        <button onClick={() => handleBuyCredits("studio")} disabled={buying !== null}>
          {buying === "studio" ? "Redirecting…" : "Studio — 500 credits ($32)"}
        </button>
      </div>
    </div>
  );
}
