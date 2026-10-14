import { useState, useEffect, useCallback } from "react";
import { getSessionToken } from "./lib/session.js";

/*
  PayoutSection — RevaultAI

  Where a creator connects the account we pay them into. The work happens on
  Stripe's pages; this is the door to them and an honest readout of where
  things stand on the way back.

  The distinction the UI exists to make: finishing Stripe's form is not the
  same as being payable. Stripe may still be verifying an ID or waiting on a
  document, so the "ready" state reads payouts_enabled and nothing softer. A
  creator who is told they are set up and then is not paid has been lied to by
  an interface, and that is worse than one extra state to render.
*/

// Not exhaustive — Stripe supports more than this, and it is the authority on
// which. The server passes any two-letter code straight through and surfaces
// Stripe's own refusal, so this list only has to cover the common cases.
const COUNTRIES = [
  ["US", "United States"], ["CA", "Canada"],      ["GB", "United Kingdom"],
  ["AU", "Australia"],     ["NZ", "New Zealand"], ["IE", "Ireland"],
  ["DE", "Germany"],       ["FR", "France"],      ["ES", "Spain"],
  ["IT", "Italy"],         ["NL", "Netherlands"], ["BE", "Belgium"],
  ["AT", "Austria"],       ["PT", "Portugal"],    ["SE", "Sweden"],
  ["NO", "Norway"],        ["DK", "Denmark"],     ["FI", "Finland"],
  ["CH", "Switzerland"],   ["PL", "Poland"],      ["CZ", "Czechia"],
  ["JP", "Japan"],         ["SG", "Singapore"],   ["HK", "Hong Kong"],
  ["MX", "Mexico"],        ["BR", "Brazil"],      ["IN", "India"],
];

// Stripe's requirement keys are machine-readable, not human-readable. These
// are the ones a creator actually hits; anything else falls through to a
// tidied version of the key itself rather than being hidden.
const REQUIREMENT_LABELS = {
  "individual.verification.document": "a photo of your ID",
  "individual.id_number": "your tax ID number",
  "individual.ssn_last_4": "the last four digits of your SSN",
  "individual.address.line1": "your address",
  "individual.dob.day": "your date of birth",
  "external_account": "your bank account details",
  "business_profile.url": "a website or profile link",
  "tos_acceptance.date": "accepting Stripe's terms",
};

function readableRequirement(key) {
  if (REQUIREMENT_LABELS[key]) return REQUIREMENT_LABELS[key];
  return key.split(".").pop().replace(/_/g, " ");
}

/*
  Kept free of React on purpose. With the request separated from the state
  write, the mount effect can hand the result to a callback rather than
  setting state in its own body, and the same function serves the button.
*/
async function fetchConnectStatus() {
  const token = await getSessionToken();
  const res = await fetch("/api/connect-status", {
    headers: { Authorization: "Bearer " + token },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Could not check your payout status.");
  return body;
}

export default function PayoutSection({ notify }) {
  const [status, setStatus]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError]       = useState(null);
  const [country, setCountry]   = useState("US");

  // First read, on mount. The alive flag matters because a creator can leave
  // Settings while Stripe is still answering.
  useEffect(() => {
    let alive = true;
    fetchConnectStatus()
      .then((body) => { if (alive) { setStatus(body); setError(body.error ?? null); } })
      .catch((err) => { if (alive) setError(err.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // Re-read on demand, behind the "Check again" button.
  const refresh = useCallback(() => {
    setLoading(true);
    fetchConnectStatus()
      .then((body) => { setStatus(body); setError(body.error ?? null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Coming back from Stripe. "done" means they reached the end of the form,
  // which is not the same as being approved — the status read decides that.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("connect");
    if (!flag) return;
    window.history.replaceState({}, "", window.location.pathname);
    // Deferred on purpose: notify() sets state on the parent, and doing that
    // synchronously inside an effect cascades an extra render pass.
    const t = setTimeout(() => {
      if (flag === "done") notify?.("Thanks — checking with Stripe on where that stands.");
      if (flag === "refresh") notify?.("That setup link expired. Start it again below.");
    }, 0);
    return () => clearTimeout(t);
  }, [notify]);

  async function startOnboarding() {
    setStarting(true);
    setError(null);
    try {
      const token = await getSessionToken();
      const res = await fetch("/api/connect-onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ country }),
      });
      const body = await res.json();
      if (!res.ok || !body.url) throw new Error(body.error || "Could not start payout setup.");
      window.location.href = body.url;
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  }

  const connected = status?.connected;
  const ready     = status?.payouts_enabled;
  const submitted = status?.details_submitted;
  const dues      = status?.requirements ?? [];

  return (
    <>
      <div className="settings-divider" />
      <div className="settings-section-title">Getting Paid</div>
      <div className="settings-section-sub">
        Where your 80&#37; of net revenue lands. Stripe collects your bank and tax
        details on its own pages &mdash; they never pass through RevaultAI.
      </div>

      {loading ? (
        <div className="form-hint" style={{ marginTop: 14 }}>Checking with Stripe...</div>
      ) : (
        <div style={{ marginTop: 14, maxWidth: 480 }}>

          {ready && (
            <>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.08em", color: "#4ADE80", textTransform: "uppercase" }}>
                Payouts active
              </div>
              <div className="form-hint" style={{ marginTop: 8 }}>
                Stripe has verified you and will send your share of completed sales to
                the account you gave them{status?.country ? " in " + status.country : ""}.
                To change your bank details, start the setup again and Stripe will take
                you to the right place.
              </div>
            </>
          )}

          {connected && submitted && !ready && (
            <>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.08em", color: "#FBBF24", textTransform: "uppercase" }}>
                Stripe is still verifying
              </div>
              <div className="form-hint" style={{ marginTop: 8 }}>
                You finished the form, but Stripe has not cleared the account for
                payouts yet. Verification usually takes a day or two.
                {dues.length > 0 && " It is waiting on " + dues.map(readableRequirement).join(", ") + "."}
              </div>
            </>
          )}

          {connected && !submitted && (
            <>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.08em", color: "#FBBF24", textTransform: "uppercase" }}>
                Setup unfinished
              </div>
              <div className="form-hint" style={{ marginTop: 8 }}>
                Your payout account exists but Stripe's form was not completed. Pick
                it up where you left off &mdash; nothing you entered was lost.
              </div>
            </>
          )}

          {!connected && (
            <>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.1em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 6, marginTop: 4 }}>
                Your country
              </div>
              <select
                className="form-input"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={{ marginBottom: 8 }}
              >
                {COUNTRIES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
              <div className="form-hint" style={{ marginBottom: 12 }}>
                The country your bank account is in, not where RevaultAI is.
                <strong> Stripe cannot change this later</strong>, so get it right the
                first time. If yours is not listed, email rich@revaultai.com and I will
                set it up by hand.
              </div>
            </>
          )}

          {error && <div className="settings-save-error" style={{ marginBottom: 12 }}>{error}</div>}

          <button
            className={ready ? "btn-ghost" : "btn-primary"}
            onClick={startOnboarding}
            disabled={starting}
            style={{ marginTop: 2, opacity: starting ? 0.6 : 1 }}
          >
            {starting
              ? "Opening Stripe..."
              : !connected
                ? "Set up payouts"
                : ready
                  ? "Update payout details"
                  : "Finish setup on Stripe"}
          </button>

          {connected && !ready && (
            <button className="btn-ghost" onClick={refresh} style={{ marginTop: 2, marginLeft: 10 }}>
              Check again
            </button>
          )}
        </div>
      )}
    </>
  );
}
