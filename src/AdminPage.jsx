import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";
import { fetchCreations, updateCreationStatus, updateCreationSpotlight } from "./lib/db.js";
import { track } from "./lib/analytics.js";
import Badge from "./Badge.jsx";

/*
  AdminPage — RevaultAI
  The review queue, trusted-creator switches and spotlight control. Extracted
  from App.jsx, which had grown past four thousand lines.
*/

export default function AdminPage({ creations, setCreations, notify }) {
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

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, auto_approve, founding_creator")
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
            <table className="admin-table"><thead><tr><th>Creator</th><th>Handle</th><th>Founding</th><th>Premium submissions</th></tr></thead><tbody>{creators.map((c) => (<tr key={c.id}><td style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18 }}>{c.display_name || c.username}</td><td style={{ color: "var(--muted)", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>@{c.username}</td><td style={{ color: "var(--muted)", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{c.founding_creator ? "Yes" : "—"}</td><td><div className={"spotlight-toggle" + (c.auto_approve ? " active" : "")} style={{ opacity: trustBusy === c.id ? 0.5 : 1 }} onClick={() => { if (!trustBusy) toggleAutoApprove(c); }}><div className="spotlight-dot" />{c.auto_approve ? "Go live immediately" : "Wait for review"}</div></td></tr>))}</tbody></table>
          )}
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
