import { useEffect, useState } from "react";

/*
  PurchaseSuccessPage — RevaultAI
  Where Stripe returns a buyer after checkout.
*/

export default function PurchaseSuccessPage({ setPage, setDetailId, creations }) {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");
  const [title, setTitle] = useState(null);
  const [creationId, setCreationId] = useState(null);

  useEffect(() => {
    async function load() {
      if (!sessionId) return;
      try {
        const res = await fetch("/api/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const json = await res.json();
        if (json.creation_id) {
          setCreationId(json.creation_id);
          const creation = creations.find((c) => c.id === json.creation_id);
          if (creation) setTitle(creation.title);
        }
      } catch {}
    }
    load();
  }, [sessionId]);

  return (
    <div className="page">
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "120px 48px 80px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 24 }}>&#10003;</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 300, color: "var(--text)", marginBottom: 12 }}>
          Purchase confirmed.
        </div>
        {title && (
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "var(--accent)", marginBottom: 8, letterSpacing: "0.08em" }}>
            {title}
          </div>
        )}
        <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 40, lineHeight: 1.7 }}>
          The full prompt{title ? ` for "${title}"` : ""} is now unlocked. You can access it any time from the archive.
        </div>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {creationId && (
            <button className="btn-primary" onClick={() => { setDetailId(creationId); setPage("detail"); }}>
              View Unlocked Creation
            </button>
          )}
          <button className="btn-ghost" onClick={() => setPage("explore")}>
            Back to Archive
          </button>
        </div>
      </div>
    </div>
  );
}
