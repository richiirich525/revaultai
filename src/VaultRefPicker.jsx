import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  VaultRefPicker — RevaultAI
  Sends Vault reference photos with a generation, so a character looks like
  themselves rather than like a description. Picks entries named in the
  prompt automatically; the creator can change the choice. Says plainly when
  the chosen model can't use photos, instead of silently ignoring them.
*/

const SUPPORT = {
  "seedance-2.0": "yes",
  "seedance-2.0-480": "yes",
  "seedance-2.5": "yes",
  "seedance-2.5-480": "yes",
  "veo-3.1": "veo",
  "kling-3.0": "not-yet",
  "wan-2.6": "no",
};
const MAX_REFS = 3;

export function refSupport(model) { return SUPPORT[model] ?? "no"; }

// What actually gets sent: nothing when a start frame is attached or the
// model can't use photos. The selection itself survives a model switch.
export function refsToSend(model, imageUrl, ids) {
  const s = refSupport(model);
  if (imageUrl || (s !== "yes" && s !== "veo")) return [];
  return (ids ?? []).slice(0, MAX_REFS);
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const named = (text, name) => {
  const n = (name || "").trim().toLowerCase();
  return n.length >= 2 && new RegExp(`(^|[^a-z0-9])${escapeRe(n)}([^a-z0-9]|$)`).test(text);
};

const mono = { fontFamily: "'DM Mono', monospace" };

export default function VaultRefPicker({ model, prompt, imageUrl, duration, setDuration, value, onChange, onOpenVault }) {
  const [entries, setEntries] = useState(null);
  const [thumbs, setThumbs] = useState({});
  const touched = useRef(false);
  const support = refSupport(model);
  const usable = (support === "yes" || support === "veo") && !imageUrl;

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("vault_entries")
        .select("id, name, kind, images")
        .order("name", { ascending: true })
        .limit(40);
      setEntries((data ?? []).filter((e) => e.kind !== "look" && Array.isArray(e.images) && e.images.length > 0));
    })();
  }, []);

  // Small previews, so the creator can see whose face they're locking in.
  useEffect(() => {
    if (!entries?.length) return;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      for (const e of entries.slice(0, 12)) {
        if (thumbs[e.id]) continue;
        try {
          const r = await fetch("/api/get-video-url", {
            method: "POST",
            headers: { Authorization: "Bearer " + sess?.session?.access_token, "Content-Type": "application/json" },
            body: JSON.stringify({ type: "vault", id: e.id }),
          });
          const j = await r.json().catch(() => ({}));
          if (r.ok && Array.isArray(j.urls) && j.urls[0]) setThumbs((t) => ({ ...t, [e.id]: j.urls[0] }));
        } catch { /* previews are best effort */ }
      }
    })();
  }, [entries]); // eslint-disable-line react-hooks/exhaustive-deps

  // Follow the prompt until the creator makes a choice of their own.
  useEffect(() => {
    if (!entries || touched.current) return;
    const text = (prompt || "").toLowerCase();
    const picks = entries.filter((e) => named(text, e.name)).slice(0, MAX_REFS).map((e) => e.id);
    if (picks.join(",") !== (value ?? []).join(",")) onChange(picks);
  }, [prompt, entries]); // eslint-disable-line react-hooks/exhaustive-deps

  // Veo's reference mode makes 8-second clips.
  useEffect(() => {
    if (support === "veo" && usable && (value ?? []).length && duration !== 8) setDuration?.(8);
  }, [support, usable, value, duration]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(id) {
    touched.current = true;
    const cur = value ?? [];
    if (cur.includes(id)) onChange(cur.filter((x) => x !== id));
    else if (cur.length < MAX_REFS) onChange([...cur, id]);
  }

  if (entries === null) return null;

  if (entries.length === 0) {
    return (
      <div style={{ border: "1px dashed var(--border)", borderRadius: 6, padding: "12px 14px", margin: "12px 0", ...mono, fontSize: 10, color: "var(--muted)", lineHeight: 1.7 }}>
        Lock how your characters look: add reference photos to entries in the Vault, and they'll be sent with Seedance and Veo generations.
        {onOpenVault && <span style={{ color: "var(--accent)", cursor: "pointer", marginLeft: 6 }} onClick={onOpenVault}>Open the Vault →</span>}
      </div>
    );
  }

  const chosen = value ?? [];
  const note = imageUrl
    ? "You're starting from a frame, so reference photos are skipped for this generation."
    : support === "no"
      ? "Wan can't use reference photos. Switch to Seedance or Veo to lock appearance."
      : support === "not-yet"
        ? "Kling can't use reference photos yet. Switch to Seedance or Veo to lock appearance."
        : support === "veo"
          ? "Veo uses reference photos at 16:9 or 9:16, in 8-second clips."
          : `Up to ${MAX_REFS}. Chosen from the names in your prompt — tap to change.`;

  return (
    <div style={{ border: "1px solid " + (usable && chosen.length ? "var(--accent)" : "var(--border)"), borderRadius: 6, padding: "12px 14px", margin: "12px 0", background: "var(--surface)" }}>
      <div style={{ ...mono, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 6 }}>
        Lock appearance from your Vault{usable && chosen.length ? ` · ${chosen.length} on` : ""}
      </div>
      <div style={{ ...mono, fontSize: 10, color: usable ? "var(--muted)" : "#E5B769", lineHeight: 1.7, marginBottom: 10 }}>{note}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", opacity: usable ? 1 : 0.45 }}>
        {entries.map((e) => {
          const on = chosen.includes(e.id);
          return (
            <button
              key={e.id}
              onClick={() => toggle(e.id)}
              disabled={!usable}
              title={`${e.name} (${e.kind})`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7, padding: "4px 10px 4px 4px",
                borderRadius: 20, cursor: usable ? "pointer" : "default",
                border: "1px solid " + (on ? "var(--accent)" : "var(--border)"),
                background: on ? "var(--bg)" : "transparent",
                color: on ? "var(--accent)" : "var(--text)", ...mono, fontSize: 10,
              }}
            >
              <span style={{ width: 22, height: 22, borderRadius: "50%", overflow: "hidden", background: "var(--bg3)", flexShrink: 0 }}>
                {thumbs[e.id] && <img src={thumbs[e.id]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </span>
              {e.name}{on ? " ✓" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}