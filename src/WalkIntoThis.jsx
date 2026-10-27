import { useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  WalkIntoThis — RevaultAI

  Locks a finished take into a place somebody can walk into, from the take
  itself.

  The whole of Story Worlds existed before this did — the capsule, the lock
  route, the room, the chat — and not one of them was reachable from the
  interface. A measurement said 41% of takes carried enough structure, that
  number was read as "not yet", and nothing shipped. But the question was
  never whether every take could become a world; it was whether a take that
  can should say so. Twenty-nine already could, and nobody could open one.

  So this appears on a take and either opens the world or names what the take
  is missing. lock-world already refuses with the specific gap — "characters
  are named but not described" — which turns a verdict into an instruction,
  and that is only useful if somebody sees it.
*/

export default function WalkIntoThis({ generation, setPage, setWorldId, notify }) {
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(null);
  const [error, setError] = useState(null);

  /* Only a finished take has footage to stand a world on. */
  if (generation?.status !== "complete") return null;

  async function lock() {
    setBusy(true);
    setError(null);
    setMissing(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch("/api/lock-world", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: "Bearer " + sess?.session?.access_token,
        },
        body: JSON.stringify({ generationId: generation.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 422) {
        /* Not a failure. The take is thin, and the route said exactly how. */
        setMissing(body.missing ?? []);
      } else if (!res.ok) {
        setError(body.error || "That world could not be opened.");
      } else {
        setWorldId?.(body.id);
        setPage?.("world");
        if (body.relocked) notify?.("That world was already open. It has been brought up to date.");
      }
    } catch (err) {
      setError(err.message || "That world could not be opened.");
    }
    setBusy(false);
  }

  return (
    <div style={{ marginTop: 10 }}>
      <button
        type="button"
        onClick={lock}
        disabled={busy}
        style={{
          background: "none", border: "1px solid var(--border)", borderRadius: 8,
          padding: "7px 12px", cursor: busy ? "default" : "pointer", color: "var(--text)",
          fontFamily: "'DM Mono', monospace", fontSize: 11, opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? "Opening…" : "Walk into this →"}
      </button>

      {missing && (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.8, marginTop: 8, maxWidth: "60ch" }}>
          {missing.length === 0
            ? "There is not enough in this take to walk into yet."
            : (
              <>
                <div>Not enough to walk into yet:</div>
                {missing.map((m, i) => <div key={i}>&nbsp;&nbsp;&bull; {m}</div>)}
                <div style={{ opacity: 0.8, marginTop: 6 }}>
                  A character in the Vault or a continuity lock on the shot usually closes this.
                </div>
              </>
            )}
        </div>
      )}

      {error && (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#E5B769", marginTop: 8 }}>{error}</div>
      )}
    </div>
  );
}
