import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  ShotPresets — RevaultAI
  A setup that worked, saved and reused: model, length, frame, and the shape of
  the prompt. The Shot Spec already records what a shot *is*; this records how
  it was made, so the next shot starts from a known-good configuration instead
  of from the defaults.
*/

const mono = { fontFamily: "'DM Mono', monospace" };
const btn = {
  background: "none", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 3,
  padding: "6px 10px", ...mono, fontSize: 10, letterSpacing: "0.06em", cursor: "pointer",
};

export default function ShotPresets({ user, current, onApply, notify }) {
  const [presets, setPresets] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!user?.id) { setPresets([]); return; }
    const { data } = await supabase
      .from("shot_presets")
      .select("id, name, data, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setPresets(data ?? []);
  }
  useEffect(() => { load(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    const label = name.trim() || `${current.model} · ${current.duration}s · ${current.aspect}`;
    setBusy(true);
    const { data, error } = await supabase
      .from("shot_presets")
      .insert({
        user_id: user.id,
        name: label.slice(0, 80),
        data: {
          model: current.model,
          duration: current.duration,
          aspect: current.aspect,
          // The opening of the prompt, as a starting point rather than a lock.
          promptStart: String(current.prompt || "").trim().slice(0, 400),
        },
      })
      .select("id, name, data, created_at")
      .single();
    setBusy(false);
    if (error) { notify?.("Couldn't save that setup: " + error.message); return; }
    setPresets((l) => [data, ...l]);
    setName("");
    setOpen(false);
    notify?.(`"${data.name}" saved — apply it from Setups on any shot.`);
  }

  async function remove(id) {
    const { error } = await supabase.from("shot_presets").delete().eq("id", id);
    if (error) { notify?.("Couldn't remove that: " + error.message); return; }
    setPresets((l) => l.filter((p) => p.id !== id));
  }

  if (!user) return null;

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
      <span style={{ ...mono, fontSize: 10, color: "var(--muted)" }}>Setups</span>
      {presets.map((p) => (
        <span key={p.id} style={{ display: "inline-flex" }}>
          <button
            style={btn}
            title={`${p.data?.model} · ${p.data?.duration}s · ${p.data?.aspect}${p.data?.promptStart ? "\n\n" + p.data.promptStart : ""}`}
            onClick={() => { onApply(p.data); notify?.(`${p.name} applied.`); }}
          >
            {p.name}
          </button>
          <button style={{ ...btn, borderLeft: "none", padding: "6px 7px", color: "#C25B5B" }} onClick={() => remove(p.id)} title="Remove">×</button>
        </span>
      ))}
      {presets.length === 0 && <span style={{ ...mono, fontSize: 10, opacity: 0.65, color: "var(--muted)" }}>None saved yet</span>}
      <button style={btn} onClick={() => setOpen((o) => !o)}>{open ? "Cancel" : "+ Save this setup"}</button>
      {open && (
        <>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name it — e.g. Night dialogue, Seedance"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 3, padding: "6px 9px", ...mono, fontSize: 10, color: "var(--text)", minWidth: 200 }}
          />
          <button style={{ ...btn, borderColor: "var(--accent)", color: "var(--accent)" }} onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </>
      )}
    </div>
  );
}