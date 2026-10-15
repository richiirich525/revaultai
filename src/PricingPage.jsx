import { useState } from "react";
import { CREDIT_PACKS, bestValuePack, creditCheckoutUrl, perCreditLabel, priceLabel, savingVsStarter } from "./lib/creditPacks.js";
import { GEN_MODELS, costOf, snapDuration } from "./lib/genModels.js";

/*
  PricingPage — RevaultAI

  Public and indexable, which is the entire reason it exists. The packs were
  only ever shown inside the Generate page and Settings — both behind a sign-in
  wall, and /generate is in NOINDEX — so nobody could find out what this costs
  without opening an account first. For a paid tool that is the worst possible
  order of operations, and it is also the pricing URL a directory listing asks
  for and we did not have.

  Every figure here is read from lib/creditPacks.js and lib/genModels.js, both
  of which have verify routes checking them against the server. Nothing on this
  page is a number somebody typed twice.
*/

const MONO = "'DM Mono', monospace";
const SERIF = "'Cormorant Garamond', serif";
const SYNE = "'Syne', sans-serif";

const label = { fontFamily: MONO, fontSize: 10, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase" };
const body = { fontFamily: MONO, fontSize: 12, color: "var(--muted)", lineHeight: 1.85 };
const h2 = { fontFamily: SERIF, fontSize: 30, fontWeight: 300, color: "var(--text)", margin: "0 0 14px" };

export default function PricingPage({ user, setPage, notify, onSignInClick }) {
  const [buying, setBuying] = useState(null);
  const best = bestValuePack();

  async function buy(packKey) {
    if (!user) { onSignInClick?.(); return; }
    setBuying(packKey);
    try {
      window.location.assign(await creditCheckoutUrl(packKey, user.id));
    } catch (err) {
      notify?.("Checkout failed: " + err.message);
      setBuying(null);
    }
  }

  // A worked example on the cheapest model, priced at the best pack, so the
  // headline number is one somebody can actually get.
  const cheapest = GEN_MODELS.reduce((a, m) => (m.costPerSecond < a.costPerSecond ? m : a), GEN_MODELS[0]);
  const exampleSeconds = snapDuration(cheapest.key, 5);
  const exampleCredits = costOf(cheapest.key, exampleSeconds);
  const exampleCents = exampleCredits * (best.priceCents / best.credits);

  return (
    <div className="page">
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "80px 48px 96px" }}>

        <div style={{ ...label, marginBottom: 12, cursor: "pointer" }} onClick={() => setPage("home")}>
          &larr; RevaultAI
        </div>
        <h1 style={{ fontFamily: SERIF, fontSize: 48, fontWeight: 300, color: "var(--text)", marginBottom: 10 }}>
          Pricing
        </h1>
        <div style={{ ...body, maxWidth: 560, marginBottom: 56 }}>
          Credits, bought once and spent per second of output. There is no subscription,
          nothing recurring, and no charge for the planning tools.
        </div>

        {/* ---------------- the packs ---------------- */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
          {CREDIT_PACKS.map((pack) => {
            const isBest = pack.key === best.key;
            const saving = savingVsStarter(pack);
            return (
              <div
                key={pack.key}
                style={{
                  border: "1px solid " + (isBest ? "var(--accent)" : "var(--border)"),
                  background: "var(--bg2)", borderRadius: 8, padding: "26px 22px 22px",
                  display: "flex", flexDirection: "column", gap: 10,
                }}
              >
                <div style={{ ...label, color: isBest ? "var(--accent)" : "var(--muted)", fontSize: 9 }}>
                  {pack.label}{isBest ? " · best value" : ""}
                </div>
                <div style={{ fontFamily: SYNE, fontWeight: 700, fontSize: 30, color: "var(--text)", lineHeight: 1 }}>
                  {pack.credits}
                  <span style={{ fontSize: 12, fontWeight: 400, color: "var(--muted)", marginLeft: 6 }}>credits</span>
                </div>
                <div style={{ fontFamily: SYNE, fontSize: 18, color: "var(--text)" }}>{priceLabel(pack)}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--muted)", lineHeight: 1.7 }}>
                  {perCreditLabel(pack)}
                  {saving > 0 && <><br />{saving}&#37; cheaper per credit than Starter</>}
                </div>
                <button
                  className={isBest ? "btn-primary" : "btn-ghost"}
                  type="button"
                  onClick={() => buy(pack.key)}
                  disabled={buying !== null}
                  style={{ marginTop: "auto", opacity: buying !== null ? 0.6 : 1 }}
                >
                  {buying === pack.key ? "Redirecting..." : user ? "Buy " + pack.label : "Sign in to buy"}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ ...body, fontSize: 11, marginTop: 16 }}>
          One-time purchase, charged through Stripe. Credits are deducted per second of
          output, and <strong style={{ color: "var(--text)", fontWeight: 400 }}>if a generation
          fails the credits come straight back</strong>.
        </div>

        {/* ---------------- what a clip costs ---------------- */}
        <div style={{ borderTop: "1px solid var(--border)", marginTop: 64, paddingTop: 48 }}>
          <div style={{ ...label, marginBottom: 14 }}>What it costs to generate</div>
          <h2 style={h2}>Priced by the model you pick</h2>
          <div style={{ ...body, maxWidth: 560, marginBottom: 28 }}>
            Faster models cost less per second, flagship models cost more. A{" "}
            {exampleSeconds}-second clip on {cheapest.label.split(" — ")[0]} is{" "}
            {exampleCredits} credits &mdash; about {Math.round(exampleCents)}&#162; on the{" "}
            {best.label} pack.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {GEN_MODELS.map((m) => {
              const secs = snapDuration(m.key, 5);
              return (
                <div
                  key={m.key}
                  style={{
                    borderTop: "1px solid var(--border)", padding: "14px 0",
                    display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontFamily: MONO, fontSize: 12, color: "var(--text)" }}>{m.label}</div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {m.costPerSecond} {m.costPerSecond === 1 ? "credit" : "credits"}/sec
                    <span style={{ opacity: 0.6 }}> &middot; {costOf(m.key, secs)} for {secs}s</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------------- free ---------------- */}
        <div style={{ borderTop: "1px solid var(--border)", marginTop: 64, paddingTop: 48 }}>
          <div style={{ ...label, marginBottom: 14 }}>Free</div>
          <h2 style={h2}>The planning costs nothing</h2>
          <div style={{ ...body, maxWidth: 560 }}>
            Credits buy generation. Everything that happens before it does not: scene
            breakdowns, shot direction, coverage planning, continuity checks, and the{" "}
            <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => setPage("lot")}>
              Lot Supervisor
            </span>{" "}
            staging board, which needs no account at all. Watching films in the gallery is
            free and always will be.
          </div>
          <div style={{ marginTop: 22, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn-ghost" type="button" onClick={() => setPage("tools")}>See the tools</button>
            <button className="btn-ghost" type="button" onClick={() => setPage("lot")}>Open the Lot</button>
          </div>
        </div>

        {/* ---------------- selling ---------------- */}
        <div style={{ borderTop: "1px solid var(--border)", marginTop: 64, paddingTop: 48 }}>
          <div style={{ ...label, marginBottom: 14 }}>If you sell</div>
          <h2 style={h2}>Creators keep 80&#37; of net revenue</h2>
          <div style={{ ...body, maxWidth: 560 }}>
            Every film streams free. Selling a full-quality download is optional, you set the
            price, and you keep 80&#37; of what is left after Stripe's processing fee. Tips and
            commissions arranged through the links on your profile go directly to you and we
            take nothing from those. The full terms are in the{" "}
            <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => setPage("terms")}>
              Terms of Service
            </span>{" "}
            and the{" "}
            <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => setPage("refunds")}>
              Refund Policy
            </span>.
          </div>
        </div>

      </div>
    </div>
  );
}
