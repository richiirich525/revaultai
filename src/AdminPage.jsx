import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";
import { fetchCreations, updateCreationStatus, updateCreationSpotlight } from "./lib/db.js";
import { track } from "./lib/analytics.js";
import { getSessionToken } from "./lib/session.js";
import { money } from "./lib/payouts.js";
import Badge from "./Badge.jsx";

/*
  AdminPage — RevaultAI
  The review queue, trusted-creator switches, spotlight control, and the
  consistency checks. Extracted from App.jsx, which had grown past four
  thousand lines.
*/

/*
  The admin-only diagnostics. Both existed as API routes with no way to reach
  them, which meant neither had ever been run: the only route to them was
  pasting a session token into curl, and a check that costs that much friction
  is a check nobody performs. A button is the difference between a safeguard
  and a good intention.
*/
const CHECKS = [
  ["verify-packs", "Credit packs",
   "Do the packs we advertise match what the server grants and what Stripe charges?"],
  ["verify-models", "Model ids",
   "Does every fal model id this codebase references still resolve?"],
];

export default function AdminPage({ creations, setCreations, notify }) {
  const [checking, setChecking] = useState(null);
  const [checkResult, setCheckResult] = useState({});
  const [due, setDue] = useState(null);
  const [dueBusy, setDueBusy] = useState(false);
  const [sending, setSending] = useState(null);
  const [gate, setGate] = useState(null);
  const [gateBusy, setGateBusy] = useState(null);
  const [spine, setSpine] = useState(null);
  const [spineBusy, setSpineBusy] = useState(null);
  const [extract, setExtract] = useState(null);
  const [extractBusy, setExtractBusy] = useState(false);

  /*
    What is owed, and why anything owed is not yet payable. This only ever
    reads: the route creates no transfer and marks nothing paid, so the
    arithmetic can be checked against real sales before money moves.
  */
  async function loadDue() {
    setDueBusy(true);
    try {
      const token = await getSessionToken();
      const res = await fetch("/api/payouts-due", { headers: { Authorization: "Bearer " + token } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not work out what is owed.");
      setDue(body);
    } catch (err) {
      setDue({ error: err.message });
    }
    setDueBusy(false);
  }

  /*
    Sending names the SALES, never an amount — the server re-derives every
    figure and re-checks every sale before it transfers, so nothing here can
    decide what somebody gets paid.
  */
  async function sendPayout(creatorRow) {
    const total = money(creatorRow.owed_cents);
    const who = creatorRow.creator ?? "this creator";
    if (!window.confirm(
      `Send ${total} to ${who}?\n\n` +
      `${creatorRow.sales.length} sale${creatorRow.sales.length === 1 ? "" : "s"}: ` +
      creatorRow.sales.map((x) => x.film).join(", ") + "\n\n" +
      "This moves real money out of your Stripe balance and cannot be undone from here."
    )) return;

    setSending(creatorRow.creator_id);
    try {
      const token = await getSessionToken();
      const res = await fetch("/api/payouts-send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ sessions: creatorRow.sales.map((x) => x.session) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "The payout run failed.");
      const parts = [body.summary];
      if (body.sent?.length) parts.push(money(body.total_cents) + " sent.");
      for (const s of body.skipped ?? []) parts.push(`${s.film}: ${s.reason}`);
      notify?.(parts.join(" "));
    } catch (err) {
      notify?.("Payout failed: " + err.message);
    }
    setSending(null);
    loadDue();
  }

  /*
    How many finished takes would become a world somebody could walk into.

    This is here for the same reason the checks below are: the measurement
    exists as a route, and a route reachable only by pasting a session token
    into curl is a measurement nobody takes. It decides whether the next phase
    of Story Worlds is worth building, so it needs to be one click.

    Reads only. Nothing is locked and nothing is charged.
  */
  async function measureGate(scope) {
    setGateBusy(scope);
    try {
      const token = await getSessionToken();
      const res = await fetch("/api/world-gate", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ limit: 200, scope }),
      });
      const body = await res.json().catch(() => ({}));
      setGate(res.ok ? body : { error: body.error || "The measurement could not run." });
    } catch (err) {
      setGate({ error: err.message });
    }
    setGateBusy(null);
  }

  /*
    The same instrument as the world gate, pointed at planning rather than at
    finished takes: how many real sequences carry enough structure for a
    continuity check to have anything to say.

    It decides whether drift detection and selective regeneration are worth
    building, which is exactly the question Story Worlds answered the
    expensive way. Reads only. Nothing is written and nothing is charged.
  */
  async function measureSpine(scope) {
    setSpineBusy(scope);
    try {
      const token = await getSessionToken();
      const res = await fetch("/api/spine-gate", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ limit: 500, scope }),
      });
      const body = await res.json().catch(() => ({}));
      setSpine(res.ok ? body : { error: body.error || "The measurement could not run." });
    } catch (err) {
      setSpine({ error: err.message });
    }
    setSpineBusy(null);
  }

  /*
    Reads the prompts of takes that have not been read yet, in batches.

    This is a backfill, so it is deliberately one batch per press rather than
    a loop: each press reports what it read and how many remain, which means
    a rate limit or a bad batch stops at 25 takes instead of silently halfway
    through 71.
  */
  async function readPrompts() {
    setExtractBusy(true);
    try {
      const token = await getSessionToken();
      const res = await fetch("/api/extract-prompt", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ limit: 25, scope: "all" }),
      });
      const body = await res.json().catch(() => ({}));
      setExtract(res.ok ? body : { error: body.error || "Extraction could not run." });
    } catch (err) {
      setExtract({ error: err.message });
    }
    setExtractBusy(false);
  }

  async function runCheck(route) {
    setChecking(route);
    try {
      const token = await getSessionToken();
      const res = await fetch("/api/" + route, {
        headers: { Authorization: "Bearer " + token },
      });
      const body = await res.json().catch(() => ({}));
      setCheckResult((prev) => ({
        ...prev,
        [route]: res.ok
          ? { ok: (body.problems ?? body.missing ?? 0) === 0, text: body.summary || "No summary returned." }
          : { ok: false, text: body.error || "The check could not run." },
      }));
    } catch (err) {
      setCheckResult((prev) => ({ ...prev, [route]: { ok: false, text: err.message } }));
    }
    setChecking(null);
  }
  const pending = creations.filter((c) => c._fromDb && c.premium_status === "Pending"); const spotlightCount = creations.filter((c) => c._fromDb && c.spotlight).length;
  async function approve(id) {
  const item = creations.find((c) => c.id === id);
  if (!item?._fromDb) { notify("Cannot modify seed creations."); return; }
  const { error } = await updateCreationStatus(id, "Approved");
  if (error) { notify("Error: " + error.message); return; }
  const { data } = await fetchCreations();
  if (data) setCreations(data);
  track("creation_approved", { creation_id: id, title: item.title });
  notify("Approved.");
  // Send email notification
  try {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token ?? "";
    await fetch("/api/notify-approval", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({
        creationId: id,
        creationTitle: item.title,
        creatorUserId: item.user_id,
      }),
    });
  } catch (err) {
    console.warn("[RevaultAI] Email notification failed:", err.message);
  }
}
  async function reject(id) {
    const item = creations.find((c) => c.id === id);
    if (!item) return;
    if (!item._fromDb) { notify("Cannot modify seed creations."); return; }
    const { error } = await updateCreationStatus(id, "Rejected");
    if (error) { notify("Error: " + error.message); return; }
    setCreations((prev) => prev.map((c) => c.id === id ? { ...c, premium_status: "Rejected" } : c));
    track("creation_rejected", { creation_id: id, title: item.title });
    notify("Rejected.");
  }

  async function toggleSpotlight(id) {
    const item = creations.find((c) => c.id === id);
    if (!item) return;
    if (!item._fromDb) { notify("Cannot modify seed creations."); return; }
    if (!item.spotlight && spotlightCount >= 3) { notify("Spotlight limited to 3."); return; }
    const wasSpotlit = item.spotlight;
    const { error } = await updateCreationSpotlight(id, !item.spotlight);
    if (error) { notify("Error: " + error.message); return; }
    setCreations((prev) => prev.map((c) => c.id === id ? { ...c, spotlight: !c.spotlight } : c));
    track(wasSpotlit ? "spotlight_removed" : "spotlight_added", { creation_id: id });
  }
  const eligible = creations.filter((c) => c._fromDb && c.premium_status !== "Pending" && c.premium_status !== "Rejected");
  // --- Trusted creators --------------------------------------------------
  // auto_approve lets a creator's premium submissions go live instead of
  // queueing for review. Written through a server route on purpose: RLS only
  // lets somebody write their own profile row, which is how it should stay.
  const [creators, setCreators] = useState([]);
  const [trustBusy, setTrustBusy] = useState(null);
  const [granting, setGranting] = useState(null);

  /*
    Grant credits, and say what the balance became.

    The reason this reports the new number rather than a bare "done": a
    reviewer was granted 600 credits three times because nothing ever
    confirmed the first two had landed. A confirmation that does not include
    the resulting balance is the same as no confirmation.
  */
  async function grantCredits(creator) {
    const typed = window.prompt(
      `Credits for ${creator.display_name || creator.username}?\n\n` +
      `They currently have ${creator.credits ?? 0}. A negative number takes credits back.`,
      "600"
    );
    if (typed === null) return;
    const amount = parseInt(typed, 10);
    if (!Number.isInteger(amount) || amount === 0) {
      notify("That wasn't a number of credits.");
      return;
    }
    const reason = window.prompt("What for? (recorded with the grant)", "manual_grant");
    if (reason === null) return;

    setGranting(creator.id);
    try {
      const token = await getSessionToken();
      const res = await fetch("/api/grant-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ userId: creator.id, amount, reason }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "The grant failed.");
      notify(body.summary);
      setCreators((list) => list.map((c) => (c.id === creator.id ? { ...c, credits: body.after } : c)));
    } catch (err) {
      notify("Couldn't grant credits: " + err.message);
    }
    setGranting(null);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, auto_approve, founding_creator, credits")
        .not("username", "is", null)
        .order("username", { ascending: true });
      if (alive) setCreators(data ?? []);
    })();
    return () => { alive = false; };
  }, []);

  async function toggleAutoApprove(c) {
    setTrustBusy(c.id);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token ?? "";
      const r = await fetch("/api/set-auto-approve", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ userId: c.id, autoApprove: !c.auto_approve }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { notify(j.error || "Could not change that."); setTrustBusy(null); return; }
      setCreators((prev) => prev.map((x) => (x.id === c.id ? { ...x, auto_approve: j.profile.auto_approve } : x)));
      notify(j.profile.auto_approve
        ? `@${c.username} is trusted — premium films go live immediately.`
        : `@${c.username} goes back through review.`);
    } catch {
      notify("Could not reach the server.");
    }
    setTrustBusy(null);
  }

  return (
    <div className="page">
      <div className="page-hdr"><div className="page-hdr-eyebrow">Internal</div><div className="page-hdr-title">Admin</div></div>
      <section className="section">
        <div style={{ marginBottom: 64 }}>
          <div className="section-label">Pending Review</div>
          {pending.length === 0 ? <div style={{ color: "var(--muted)", fontSize: 13, padding: "24px 0", fontFamily: "'DM Mono', monospace" }}>No pending submissions.</div> : (
            <table className="admin-table"><thead><tr><th>Title</th><th>Creator</th><th>Category</th><th>Actions</th></tr></thead><tbody>{pending.map((c) => (<tr key={c.id}><td style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18 }}>{c.title}</td><td style={{ color: "var(--muted)" }}>{c.creator.display_name}</td><td style={{ color: "var(--muted)", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{c.category}</td><td><button className="btn-approve" onClick={() => approve(c.id)}>Approve</button><button className="btn-reject" onClick={() => reject(c.id)}>Reject</button></td></tr>))}</tbody></table>
          )}
        </div>
        <div style={{ marginBottom: 64 }}>
          <div className="section-label">Trusted Creators</div>
          <p style={{ color: "var(--muted)", fontSize: 11, marginBottom: 24, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>{creators.filter((c) => c.auto_approve).length}/{creators.length} skip the review queue</p>
          {creators.length === 0 ? <div style={{ color: "var(--muted)", fontSize: 13, padding: "24px 0", fontFamily: "'DM Mono', monospace" }}>No creators yet.</div> : (
            <table className="admin-table">
              <thead><tr><th>Creator</th><th>Handle</th><th>Credits</th><th>Premium submissions</th></tr></thead>
              <tbody>{creators.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18 }}>
                    {c.display_name || c.username}
                    {c.founding_creator && (
                      <span style={{ color: "var(--muted)", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.12em", marginLeft: 8, textTransform: "uppercase" }}>founding</span>
                    )}
                  </td>
                  <td style={{ color: "var(--muted)", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>@{c.username}</td>
                  <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, whiteSpace: "nowrap" }}>
                    <span style={{ color: "var(--text)" }}>{typeof c.credits === "number" ? c.credits : "—"}</span>
                    <button
                      className="btn-ghost"
                      type="button"
                      onClick={() => grantCredits(c)}
                      disabled={granting !== null}
                      style={{ marginLeft: 10, padding: "3px 9px", fontSize: 9, opacity: granting !== null ? 0.6 : 1 }}
                    >
                      {granting === c.id ? "..." : "grant"}
                    </button>
                  </td>
                  <td><div className={"spotlight-toggle" + (c.auto_approve ? " active" : "")} style={{ opacity: trustBusy === c.id ? 0.5 : 1 }} onClick={() => { if (!trustBusy) toggleAutoApprove(c); }}><div className="spotlight-dot" />{c.auto_approve ? "Go live immediately" : "Wait for review"}</div></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
        <div style={{ marginBottom: 64 }}>
          <div className="section-label">Payouts</div>
          <p style={{ color: "var(--muted)", fontSize: 11, marginBottom: 20, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>
            Creators keep 80&#37; of net, held 7 days against chargebacks. Sending moves real money and asks first.
          </p>

          <button className="btn-ghost" type="button" onClick={loadDue} disabled={dueBusy} style={{ opacity: dueBusy ? 0.6 : 1 }}>
            {dueBusy ? "Working it out..." : due ? "Recalculate" : "What is owed?"}
          </button>

          {due?.error && (
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#E5B769", marginTop: 14 }}>{due.error}</div>
          )}

          {due && !due.error && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 28px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", marginBottom: 18 }}>
                <span>Ready <b style={{ color: "#4ADE80", fontWeight: 400 }}>{money(due.totals.ready_cents)}</b></span>
                <span>In the 7-day hold <b style={{ color: "var(--text)", fontWeight: 400 }}>{money(due.totals.held_cents)}</b></span>
                <span>Blocked <b style={{ color: "#E5B769", fontWeight: 400 }}>{money(due.totals.blocked_cents)}</b></span>
                <span>{due.sales} sale{due.sales === 1 ? "" : "s"} examined</span>
                {due.recovered_nets > 0 && <span>{due.recovered_nets} net{due.recovered_nets === 1 ? "" : "s"} read from Stripe</span>}
              </div>

              {due.creators.length === 0 ? (
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", padding: "10px 0" }}>
                  {due.summary}
                </div>
              ) : (
                <table className="admin-table">
                  <thead><tr><th>Creator</th><th>Sales</th><th>Owed</th><th>Send</th></tr></thead>
                  <tbody>
                    {due.creators.map((c) => (
                      <tr key={c.creator_id}>
                        <td style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18 }}>{c.creator ?? "(unknown)"}</td>
                        <td style={{ color: "var(--muted)", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
                          {c.sales.map((x) => x.film).join(", ")}
                        </td>
                        <td style={{ color: "#4ADE80", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{money(c.owed_cents)}</td>
                        <td>
                          <button
                            className="btn-primary"
                            type="button"
                            onClick={() => sendPayout(c)}
                            disabled={sending !== null}
                            style={{ opacity: sending !== null ? 0.6 : 1, whiteSpace: "nowrap" }}
                          >
                            {sending === c.creator_id ? "Sending..." : `Send ${money(c.owed_cents)}`}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {due.unpayable.length > 0 && (
                <div style={{ marginTop: 26 }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.16em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 }}>
                    Not payable yet
                  </div>
                  {due.unpayable.map((x) => (
                    <div key={x.session} style={{ borderTop: "1px solid var(--border)", padding: "10px 0", display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
                      <span style={{ color: "var(--text)" }}>
                        {x.film}
                        {x.creator && <span style={{ color: "var(--muted)" }}> &middot; {x.creator}</span>}
                      </span>
                      <span style={{ color: "var(--muted)" }}>
                        {x.owed_cents != null && <span style={{ marginRight: 12 }}>{money(x.owed_cents)}</span>}
                        <span style={{ color: "#E5B769" }}>{x.blocked}</span>
                        {x.last_attempt === "failed" && x.last_error && (
                          <span style={{ color: "var(--muted)", marginLeft: 10, opacity: 0.8 }}>
                            (last try: {x.last_error})
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", lineHeight: 1.7, marginTop: 18, opacity: 0.8 }}>
                {due.note}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 64 }}>
          <div className="section-label">Story Worlds — the first gate</div>
          <p style={{ color: "var(--muted)", fontSize: 11, marginBottom: 24, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>
            Read-only. Runs capsule extraction across finished takes without locking anything.
          </p>
          <div style={{ borderTop: "1px solid var(--border)", padding: "20px 0", display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
                How many finished takes carry enough already to become a world somebody could walk into —
                somebody to meet, somewhere to be, and some condition the place is in. The plan proceeds at
                seven in ten.
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", lineHeight: 1.7, marginTop: 10, opacity: 0.8 }}>
                This admin account owns no takes of its own, so measure every account to see a real
                number. Across accounts the reasons are counted but no prompts are shown.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="btn-ghost"
                type="button"
                onClick={() => measureGate("mine")}
                disabled={!!gateBusy}
                style={{ opacity: gateBusy ? 0.6 : 1, whiteSpace: "nowrap" }}
              >
                {gateBusy === "mine" ? "Measuring..." : "This account"}
              </button>
              <button
                className="btn-ghost"
                type="button"
                onClick={() => measureGate("all")}
                disabled={!!gateBusy}
                style={{ opacity: gateBusy ? 0.6 : 1, whiteSpace: "nowrap" }}
              >
                {gateBusy === "all" ? "Measuring..." : "Every account"}
              </button>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", padding: "20px 0", display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
                Read the prompts. Most takes reference no Vault entry and carry no spec, but every one has a
                prompt that names who is in it and where. Reads 25 unread takes a press, records only what the
                prompt actually says, and never invents an appearance.
              </div>
              {extract && (
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, lineHeight: 1.8, marginTop: 10, color: extract.error ? "#E5B769" : "var(--muted)" }}>
                  {extract.error ? extract.error : extract.read === 0 ? extract.note : (
                    <>
                      <div style={{ color: "#4ADE80" }}>Read {extract.read} prompts. {extract.remaining} left.</div>
                      <div>&nbsp;&nbsp;{extract.withDescribedCast} gave a described cast</div>
                      <div>&nbsp;&nbsp;{extract.namedButNotDescribed} named somebody without describing them</div>
                      {extract.failed > 0 && <div>&nbsp;&nbsp;{extract.failed} failed</div>}
                    </>
                  )}
                </div>
              )}
            </div>
            <button
              className="btn-ghost"
              type="button"
              onClick={readPrompts}
              disabled={extractBusy}
              style={{ opacity: extractBusy ? 0.6 : 1, whiteSpace: "nowrap" }}
            >
              {extractBusy ? "Reading..." : "Read prompts"}
            </button>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", padding: "20px 0", display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
                The sequence spine. How many real projects carry enough structure for a continuity check to
                have anything to say \u2014 two shots or more, specs it can read, and some fact appearing in
                more than one of them. A coat nobody wears twice cannot be inconsistent.
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", lineHeight: 1.7, marginTop: 10, opacity: 0.8 }}>
                A shot reaches its spec only through the take chosen for it, so watch the unattached count:
                if planning exists and nothing points at it, the fix is a column rather than more authoring.
              </div>
              {spine && (
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, lineHeight: 1.8, marginTop: 12, color: spine.error ? "#E5B769" : "var(--muted)" }}>
                  {spine.error ? spine.error : spine.projects === 0 ? spine.note : (
                    <>
                      <div style={{ color: spine.percent >= 70 ? "#4ADE80" : "#E5B769" }}>
                        {spine.usable} of {spine.projects} sequences could be checked &mdash; {spine.percent}%.
                        {" "}Across {spine.shots} shots.
                      </div>
                      <div style={{ marginTop: 6 }}>
                        &nbsp;&nbsp;{spine.specs.reachableFromAShot} specs reachable from a shot,{" "}
                        {spine.specs.unattached} sitting unattached
                      </div>
                      {spine.reasons.map((r) => (
                        <div key={r.id}>&nbsp;&nbsp;{r.count} &times; {r.why}</div>
                      ))}
                      {spine.examples.filter((e) => e.usable && e.topCarriers.length).slice(0, 2).map((e, i) => (
                        <div key={i} style={{ marginTop: 6, opacity: 0.85 }}>
                          &nbsp;&nbsp;{e.shots} shots, {e.carriers} carriers: {e.topCarriers.join("; ")}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn-ghost" type="button" onClick={() => measureSpine("mine")}
                disabled={!!spineBusy} style={{ opacity: spineBusy ? 0.6 : 1, whiteSpace: "nowrap" }}>
                {spineBusy === "mine" ? "Measuring..." : "Spine: this account"}
              </button>
              <button className="btn-ghost" type="button" onClick={() => measureSpine("all")}
                disabled={!!spineBusy} style={{ opacity: spineBusy ? 0.6 : 1, whiteSpace: "nowrap" }}>
                {spineBusy === "all" ? "Measuring..." : "Every account"}
              </button>
            </div>
          </div>

          {gate && (
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, lineHeight: 1.85, paddingBottom: 24, color: "var(--muted)" }}>
              {gate.error ? (
                <div style={{ color: "#E5B769" }}>{gate.error}</div>
              ) : gate.takes === 0 ? (
                <div>{gate.note}</div>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: gate.passesGate ? "#4ADE80" : "#E5B769", marginBottom: 12 }}>
                    {gate.usable} of {gate.takes} finished takes would build a world — {Math.round(gate.rate * 100)}%.
                    {" "}{gate.passesGate ? "That clears the gate." : "That is below the seven in ten the plan asks for."}
                    {gate.scope === "all" && gate.accounts > 1 ? ` Across ${gate.accounts} accounts.` : ""}
                  </div>
                  {typeof gate.promptsRead === "number" && (
                    <div style={{ marginBottom: 12 }}>
                      {gate.promptsRead} of {gate.takes} prompts have been read.
                      {gate.promptsRead < gate.takes ? " Read the rest before judging this number." : ""}
                    </div>
                  )}

                  {gate.whyNot?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ color: "var(--text)" }}>Why the rest fall short</div>
                      {gate.whyNot.map((r) => (
                        <div key={r.reason}>&nbsp;&nbsp;{r.count} × {r.reason}</div>
                      ))}
                    </div>
                  )}

                  {gate.thinEvenWhenUsable?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ color: "var(--text)" }}>Thin even in the ones that work</div>
                      {gate.thinEvenWhenUsable.map((r) => (
                        <div key={r.reason}>&nbsp;&nbsp;{r.count} × {r.reason}</div>
                      ))}
                    </div>
                  )}

                  {gate.examples?.length > 0 && (
                    <div>
                      <div style={{ color: "var(--text)" }}>Examples that fell short</div>
                      {gate.examples.map((e) => (
                        <div key={e.id} style={{ opacity: 0.85 }}>
                          &nbsp;&nbsp;&ldquo;{e.prompt}&rdquo; — {e.missing.join("; ")}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 64 }}>
          <div className="section-label">Checks</div>
          <p style={{ color: "var(--muted)", fontSize: 11, marginBottom: 24, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>
            Read-only. Nothing is charged and nothing is changed.
          </p>
          {CHECKS.map(([route, name, blurb]) => {
            const r = checkResult[route];
            return (
              <div key={route} style={{ borderTop: "1px solid var(--border)", padding: "20px 0", display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>{name}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>{blurb}</div>
                  {r && (
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, lineHeight: 1.75, marginTop: 10, color: r.ok ? "#4ADE80" : "#E5B769" }}>
                      {r.text}
                    </div>
                  )}
                </div>
                <button
                  className="btn-ghost"
                  type="button"
                  onClick={() => runCheck(route)}
                  disabled={checking !== null}
                  style={{ opacity: checking !== null ? 0.6 : 1, whiteSpace: "nowrap" }}
                >
                  {checking === route ? "Checking..." : "Run"}
                </button>
              </div>
            );
          })}
        </div>
        <div>
          <div className="section-label">Spotlight Control</div>
          <p style={{ color: "var(--muted)", fontSize: 11, marginBottom: 24, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>{spotlightCount}/3 active</p>
          <table className="admin-table"><thead><tr><th>Title</th><th>Creator</th><th>Type</th><th>Spotlight</th></tr></thead><tbody>{eligible.map((c) => (<tr key={c.id}><td style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18 }}>{c.title}</td><td style={{ color: "var(--muted)" }}>{c.creator.display_name}</td><td>{c.is_premium ? <Badge type="Premium" /> : <Badge type="Open" />}</td><td><div className={"spotlight-toggle" + (c.spotlight ? " active" : "")} onClick={() => toggleSpotlight(c.id)}><div className="spotlight-dot" />{c.spotlight ? "In Spotlight" : "Add to Spotlight"}</div></td></tr>))}</tbody></table>
        </div>
      </section>
    </div>
  );
}
