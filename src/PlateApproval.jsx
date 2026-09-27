import { useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  PlateApproval — RevaultAI
  The photoreal version of a set, shown before any video credits are spent.
  A stylised render sent to a video model makes a stylised film, so this is
  what actually goes with the shot — and it's cached per set, camera and
  lighting, so the same angle never costs twice.
*/

const mono = { fontFamily: "'DM Mono', monospace" };
const btn = {
  background: "none", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 3,
  padding: "7px 12px", ...mono, fontSize: 10, letterSpacing: "0.08em", cursor: "pointer",
};
const on = { ...btn, borderColor: "var(--accent)", color: "var(--accent)" };

export default function PlateApproval({ pending, activeProject, notify, onUse, onCancel }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState(null);
  const [cached, setCached] = useState(false);
  const [mode, setMode] = useState("rebuild");
  if (!pending) return null;

  async function make(force) {
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch("/api/photoreal-plate", {
        method: "POST",
        headers: { Authorization: "Bearer " + sess?.session?.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({
          plate: pending.plate,
          cacheKey: force ? `${pending.cacheKey}:${mode}:${Date.now()}` : `${pending.cacheKey}:${mode}`,
          mode,
          projectId: activeProject?.id ?? null,
          note: pending.note ?? "",
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) notify?.(j.error || "Couldn't make that photoreal.");
      else { setUrl(j.url); setCached(!!j.cached); }
    } catch { notify?.("Couldn't reach the plate service."); }
    setBusy(false);
  }

  return (
    <div style={{ border: "1px solid var(--accent)", borderRadius: 8, padding: "14px 16px", marginTop: 12, background: "var(--surface)" }}>
      <div style={{ ...mono, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>
        The location the model will see
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <img src={pending.plate} alt="" style={{ width: 210, borderRadius: 4, border: "1px solid var(--border)", display: "block" }} />
          <div style={{ ...mono, fontSize: 9, color: "var(--muted)", marginTop: 5 }}>Your blocking</div>
        </div>
        <div>
          {url
            ? <img src={url} alt="" style={{ width: 210, borderRadius: 4, border: "1px solid var(--accent)", display: "block" }} />
            : <div style={{ width: 210, aspectRatio: "16 / 9", borderRadius: 4, border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", ...mono, fontSize: 10, color: "var(--muted)", textAlign: "center", padding: 8, boxSizing: "border-box" }}>
                {busy ? "Rebuilding the surfaces…" : "Same layout, real materials"}
              </div>}
          <div style={{ ...mono, fontSize: 9, color: "var(--muted)", marginTop: 5 }}>
            {url ? (cached ? "Made earlier — no charge" : "Photoreal") : "Not made yet"}
          </div>
        </div>
      </div>

      <div style={{ ...mono, fontSize: 10, color: "var(--muted)", lineHeight: 1.7, margin: "10px 0" }}>
        Video models copy what they're shown, so sending the render makes a shot that looks like the render. This keeps every wall, window and object exactly where you put it and rebuilds the surfaces as a photograph. Two credits, once per angle — the same camera and light never costs twice.
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
        <span style={{ ...mono, fontSize: 10, color: "var(--muted)" }}>How closely to follow the render</span>
        <button style={mode === "rebuild" ? on : btn} onClick={() => { setMode("rebuild"); setUrl(null); }}
          title="Same layout and camera, redrawn as real architecture">Real building</button>
        <button style={mode === "faithful" ? on : btn} onClick={() => { setMode("faithful"); setUrl(null); }}
          title="Every shape kept exactly — safest for continuity, but can look like a model">Faithful</button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!url && <button style={on} onClick={() => make(false)} disabled={busy}>{busy ? "Working…" : "Make it photoreal (2 credits)"}</button>}
        {url && <button style={on} onClick={() => onUse(url)}>Use this location →</button>}
        {url && <button style={btn} onClick={() => make(true)} disabled={busy}>Try again (2 credits)</button>}
        <button style={btn} onClick={() => onUse(null)}>Go without a location</button>
        <button style={btn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}