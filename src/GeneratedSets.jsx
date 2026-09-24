import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  GeneratedSets — RevaultAI
  Sets generated from a description by World Labs' Marble, photoreal and
  reusable across every shot in a film. Generating one costs credits once;
  using it costs nothing afterwards. A world takes about five minutes, so the
  page checks on it rather than holding a request open.
*/

const TIERS = [
  { id: "full", label: "Full", credits: 35, note: "Sharper, holds up close" },
  { id: "draft", label: "Draft", credits: 10, note: "Rough, good for testing an idea" },
];
const mono = { fontFamily: "'DM Mono', monospace" };
const btn = {
  background: "none", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 3,
  padding: "6px 12px", ...mono, fontSize: 10, letterSpacing: "0.08em", cursor: "pointer",
};

export default function GeneratedSets({ user, activeProject, notify, selectedId, onPick }) {
  const [sets, setSets] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [tier, setTier] = useState("full");
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  async function load() {
    if (!user?.id) { setSets([]); return; }
    const { data } = await supabase
      .from("sets")
      .select("id, name, status, caption, tier, error, created_at")
      .order("created_at", { ascending: false })
      .limit(24);
    setSets(data ?? []);
  }
  useEffect(() => { load(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nudge anything still building, every twenty seconds.
  useEffect(() => {
    const waiting = sets.filter((s) => s.status === "queued" || s.status === "processing");
    if (!waiting.length) return;
    timer.current = setTimeout(async () => {
      const { data: sess } = await supabase.auth.getSession();
      for (const s of waiting) {
        try {
          await fetch("/api/set-status", {
            method: "POST",
            headers: { Authorization: "Bearer " + sess?.session?.access_token, "Content-Type": "application/json" },
            body: JSON.stringify({ setId: s.id }),
          });
        } catch { /* try again next time */ }
      }
      load();
    }, 20000);
    return () => clearTimeout(timer.current);
  }, [sets]); // eslint-disable-line react-hooks/exhaustive-deps

  async function generate() {
    const text = prompt.trim();
    if (text.length < 10) { notify?.("Describe the set in a sentence or two."); return; }
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch("/api/generate-set", {
        method: "POST",
        headers: { Authorization: "Bearer " + sess?.session?.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || text.slice(0, 60), prompt: text, tier, projectId: activeProject?.id ?? null }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) notify?.(j.error || "Couldn't start that set.");
      else {
        notify?.("Building your set — about five minutes. You can keep working.");
        setOpen(false); setPrompt(""); setName("");
        load();
      }
    } catch { notify?.("Couldn't reach the set builder."); }
    setBusy(false);
  }

  if (!user) return null;

  const chosen = TIERS.find((t) => t.id === tier) ?? TIERS[0];

  return (
    <div style={{ marginTop: 10 }}>
      <div className="rs-row">
        <span className="rs-body" style={{ fontSize: 10 }}>Your sets</span>
        {sets.length === 0 && <span className="rs-body" style={{ fontSize: 10, opacity: 0.7 }}>None yet</span>}
        {sets.map((s) => {
          const waiting = s.status === "queued" || s.status === "processing";
          return (
            <button
              key={s.id}
              className={"rs-btn" + (selectedId === s.id ? " on" : "")}
              title={s.status === "failed" ? s.error || "That set failed" : s.caption || s.name}
              disabled={s.status !== "ready"}
              onClick={() => onPick?.(s.id)}
              style={s.status !== "ready" ? { opacity: 0.55 } : undefined}
            >
              {s.name}{waiting ? " · building…" : s.status === "failed" ? " · failed" : ""}
            </button>
          );
        })}
        <button className="rs-btn" onClick={() => setOpen((o) => !o)}>{open ? "Cancel" : "+ Generate a set"}</button>
      </div>

      {open && (
        <div style={{ border: "1px solid var(--accent)", borderRadius: 6, padding: "12px 14px", marginTop: 8, background: "var(--bg3)" }}>
          <div style={{ ...mono, fontSize: 10, color: "var(--muted)", lineHeight: 1.7, marginBottom: 8 }}>
            Describe the place as you'd describe a location to a scout: the room, its light, what's in it. You get a photoreal set you can shoot from any angle, in every shot of the film, for as long as you like.
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name it — e.g. Maya's kitchen"
            style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 3, padding: "8px 10px", ...mono, fontSize: 11, color: "var(--text)", boxSizing: "border-box", marginBottom: 8 }}
          />
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="A narrow 1970s kitchen with yellowed cabinets, a window over the sink facing a brick wall, late afternoon light, dishes stacked on the drainer"
            style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 3, padding: "10px 12px", ...mono, fontSize: 11, color: "var(--text)", lineHeight: 1.7, resize: "vertical", boxSizing: "border-box" }}
          />
          <div className="rs-row" style={{ marginTop: 10 }}>
            <span className="rs-body" style={{ fontSize: 10 }}>Quality</span>
            {TIERS.map((t) => (
              <button key={t.id} className={"rs-btn" + (tier === t.id ? " on" : "")} title={t.note} onClick={() => setTier(t.id)}>
                {t.label} · {t.credits} credits
              </button>
            ))}
          </div>
          <div style={{ ...mono, fontSize: 10, color: "var(--muted)", margin: "8px 0" }}>
            {chosen.credits} credits — about {Math.round(chosen.credits / 12)} seconds of Seedance 2.5, for a set you use in every shot.
          </div>
          <button style={{ ...btn, borderColor: "var(--accent)", color: "var(--accent)" }} onClick={generate} disabled={busy}>
            {busy ? "Starting…" : `Generate this set (${chosen.credits} credits)`}
          </button>
        </div>
      )}
    </div>
  );
}