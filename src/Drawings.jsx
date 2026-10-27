import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";
import { MEDIUMS } from "./lib/stylePresets.js";

/*
  Drawings — RevaultAI

  The sets Animate Yourself made of one character, shown on that character's
  Vault card.

  This exists because the drawings had nowhere to live. A set was written to
  animated_sets, the images went to R2, and no screen anywhere read either
  one back: eight pictures were visible for the minute after they were drawn
  and unreachable from then on.

  The list is read straight from the table, because row-level security
  already scopes animated_sets to its owner and a server hop would add
  latency and no safety. The IMAGES are not, because the stored links are
  carrier form against a private bucket and have to be presigned by somebody
  holding credentials. So: list for free, sign on demand, and only for the
  set somebody actually opened — signing eight links for every character on
  the page would be work nobody asked for.
*/

const mediumLabel = (id) => MEDIUMS.find((m) => m.id === id)?.label ?? id ?? "Drawings";

function when(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function Drawings({ packId, name }) {
  const [sets, setSets] = useState(null);
  const [open, setOpen] = useState(null);
  const [stills, setStills] = useState({});
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!packId) return;
    let live = true;
    (async () => {
      const { data } = await supabase
        .from("animated_sets")
        .select("id, medium, stills, created_at")
        .eq("pack_id", packId)
        .order("created_at", { ascending: false })
        .limit(12);
      if (live) setSets(data ?? []);
    })();
    return () => { live = false; };
  }, [packId]);

  async function show(setId) {
    if (open === setId) { setOpen(null); return; }
    setOpen(setId);
    setError(null);
    if (stills[setId]) return;
    setBusy(setId);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch("/api/get-video-url", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: "Bearer " + sess?.session?.access_token,
        },
        body: JSON.stringify({ type: "animated", id: setId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error || "Could not open those drawings.");
      else setStills((s) => ({ ...s, [setId]: body.stills ?? [] }));
    } catch (err) {
      setError(err.message || "Could not open those drawings.");
    }
    setBusy(null);
  }

  if (!sets?.length) return null;

  return (
    <div className="vt-field">
      <div className="vt-field-label">
        Drawings of {name} &middot; {sets.length} {sets.length === 1 ? "set" : "sets"}
      </div>

      {sets.map((set) => {
        const showing = open === set.id;
        const shown = stills[set.id];
        const count = Array.isArray(set.stills) ? set.stills.length : 0;
        return (
          <div key={set.id} style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={() => show(set.id)}
              style={{
                background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer",
                color: showing ? "var(--accent)" : "var(--text)", textAlign: "left",
              }}
            >
              <span className="vt-body">
                {mediumLabel(set.medium)} &middot; {count} {count === 1 ? "drawing" : "drawings"}
                {when(set.created_at) ? ` · ${when(set.created_at)}` : ""}
                {" "}{showing ? "⌃" : "⌄"}
              </span>
            </button>

            {showing && (
              <div style={{ marginTop: 8 }}>
                {busy === set.id && <div className="vt-body" style={{ opacity: 0.75 }}>Opening&hellip;</div>}
                {shown?.length > 0 && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {shown.map((s, i) => (
                      <figure key={s.poseId ?? i} style={{ margin: 0, width: 110 }}>
                        <img
                          src={s.url}
                          alt={`${name}, ${String(s.note || "").toLowerCase()}`}
                          loading="lazy"
                          style={{
                            width: 110, height: 110, objectFit: "cover", borderRadius: 4,
                            border: "1px solid var(--border)", display: "block",
                          }}
                        />
                        <figcaption
                          className="vt-body"
                          style={{ fontSize: 9, opacity: 0.7, marginTop: 4, lineHeight: 1.4 }}
                        >
                          {s.note}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                )}
                {shown && shown.length === 0 && (
                  <div className="vt-body" style={{ opacity: 0.75 }}>
                    Those drawings are no longer in storage.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {error && (
        <div className="vt-body" style={{ color: "#E5B769", marginTop: 8 }}>{error}</div>
      )}
    </div>
  );
}
