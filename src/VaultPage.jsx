import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  VaultPage — RevaultAI
  Reusable character and location entries. Saved once, then locked into every
  shot of a Scene Breakdown verbatim. Requires sign-in; RLS scopes every row
  to its owner and the client writes directly.
*/

const BLANK = { kind: "character", name: "", description: "", wardrobe: "", distinguishing: "", notes: "" };

const styles = `
  .vt-wrap { max-width: 860px; margin: 0 auto; padding: 0 48px; }
  .vt-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 8px; }
  .vt-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.85; }
  .vt-input, .vt-textarea { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 12px 14px; font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); line-height: 1.7; box-sizing: border-box; margin-bottom: 16px; }
  .vt-textarea { resize: vertical; }
  .vt-card { border: 1px solid var(--border); border-radius: 8px; padding: 24px 26px; margin-bottom: 14px; background: var(--surface); }
  .vt-card-name { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700; color: var(--text); }
  .vt-kind { display: inline-block; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); border: 1px solid rgba(123,63,228,0.35); border-radius: 3px; padding: 3px 9px; margin-bottom: 10px; }
  .vt-field { margin-top: 12px; }
  .vt-field-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }
  .vt-chip { border: 1px solid var(--border); background: transparent; color: var(--muted); border-radius: 4px; padding: 8px 16px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.08em; cursor: pointer; transition: all 0.2s; }
  .vt-chip.on { border-color: var(--accent); color: var(--accent); background: var(--bg); }
  .vt-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
  @media (max-width: 760px) { .vt-wrap { padding: 0 24px; } }
`;

export default function VaultPage({ user, onSignInClick, setPage, notify }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState(null);

  async function load() {
    if (!user?.id) { setEntries([]); setLoading(false); return; }
    const { data, error: e } = await supabase
      .from("vault_entries")
      .select("*")
      .order("kind", { ascending: true })
      .order("name", { ascending: true });
    if (e) console.warn("[RevaultAI] Could not load vault:", e.message);
    setEntries(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [user?.id]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function reset() { setForm(BLANK); setEditingId(null); setError(null); }

  async function save() {
    if (!form.name.trim()) { setError("Give this entry a name."); return; }
    if (form.description.trim().length < 20) { setError("Write a fuller description — 20 characters minimum, and more is better for continuity."); return; }
    setSaving(true); setError(null);
    const row = {
      user_id: user.id,
      kind: form.kind,
      name: form.name.trim().slice(0, 80),
      description: form.description.trim().slice(0, 1200),
      wardrobe: form.wardrobe?.trim().slice(0, 600) || null,
      distinguishing: form.distinguishing?.trim().slice(0, 400) || null,
      notes: form.notes?.trim().slice(0, 600) || null,
    };
    let e;
    if (editingId) {
      ({ error: e } = await supabase.from("vault_entries").update({ ...row, updated_at: new Date().toISOString() }).eq("id", editingId));
    } else {
      ({ error: e } = await supabase.from("vault_entries").insert(row));
    }
    setSaving(false);
    if (e) { setError("Could not save: " + e.message); return; }
    notify?.(editingId ? "Entry updated." : "Saved to your vault.");
    reset();
    load();
  }

  function edit(entry) {
    setForm({
      kind: entry.kind,
      name: entry.name,
      description: entry.description,
      wardrobe: entry.wardrobe ?? "",
      distinguishing: entry.distinguishing ?? "",
      notes: entry.notes ?? "",
    });
    setEditingId(entry.id);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(entry) {
    if (!window.confirm(`Delete "${entry.name}"? Shot lists you've already generated keep their locked text.`)) return;
    const { error: e } = await supabase.from("vault_entries").delete().eq("id", entry.id);
    if (e) { notify?.("Could not delete: " + e.message); return; }
    notify?.("Deleted.");
    if (editingId === entry.id) reset();
    load();
  }

  const shown = filter === "all" ? entries : entries.filter((e) => e.kind === filter);
  const characters = entries.filter((e) => e.kind === "character").length;
  const locations = entries.filter((e) => e.kind === "location").length;

  if (!user) {
    return (
      <div className="page">
        <div className="page-hdr">
          <div className="page-hdr-eyebrow">Continuity</div>
          <div className="page-hdr-title">The Vault</div>
          <div className="page-hdr-sub">Save a character or location once. Lock it into every shot.</div>
        </div>
        <section className="section">
          <div className="empty-state">
            <div className="empty-text">Sign in to build your vault.</div>
            <button className="btn-primary" style={{ marginTop: 20 }} onClick={onSignInClick}>Sign in</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <style>{styles}</style>
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">Continuity</div>
        <div className="page-hdr-title">The Vault</div>
        <div className="page-hdr-sub">Save a character or location once, then lock it into every shot of a scene.</div>
      </div>

      <section className="section">
        <div className="vt-wrap">
          <div className="vt-body" style={{ maxWidth: 620, marginBottom: 32 }}>
            Continuity breaks when you describe the same character slightly differently each time. Write the description once here, and Scene Breakdown will reproduce it word-for-word in every shot that features them — no paraphrasing, no drift.
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 28, background: "var(--surface)", marginBottom: 40 }}>
            <div className="vt-label">{editingId ? "Edit entry" : "New entry"}</div>

            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {[["character", "Character"], ["location", "Location"]].map(([v, l]) => (
                <button key={v} className={"vt-chip" + (form.kind === v ? " on" : "")} onClick={() => set("kind", v)}>{l}</button>
              ))}
            </div>

            <div className="vt-label">Name</div>
            <input
              className="vt-input"
              value={form.name}
              maxLength={80}
              onChange={(e) => set("name", e.target.value)}
              placeholder={form.kind === "character" ? "Maya" : "Underground parking garage"}
            />

            <div className="vt-label">Locked description</div>
            <textarea
              className="vt-textarea"
              rows={4}
              maxLength={1200}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={form.kind === "character"
                ? "Woman in her early 30s, angular face, deep brown skin, short natural black curls, dark brown eyes, athletic build."
                : "Narrow underground parking garage, pale concrete columns, low fluorescent ceiling lights, yellow bay numbers, damp floor reflecting the overhead fixtures."}
            />
            <div className="vt-body" style={{ fontSize: 10, marginTop: -8, marginBottom: 16, opacity: 0.8 }}>
              This exact text goes into every shot. Concrete and visual beats long — four to seven strong anchors carry further than a paragraph of adjectives.
            </div>

            {form.kind === "character" && (
              <>
                <div className="vt-label">Wardrobe</div>
                <textarea
                  className="vt-textarea"
                  rows={2}
                  maxLength={600}
                  value={form.wardrobe}
                  onChange={(e) => set("wardrobe", e.target.value)}
                  placeholder="Charcoal canvas field jacket with four front pockets, faded burgundy crew-neck shirt, black utility pants, thin silver chain, brown boots."
                />

                <div className="vt-label">Distinguishing features</div>
                <input
                  className="vt-input"
                  maxLength={400}
                  value={form.distinguishing}
                  onChange={(e) => set("distinguishing", e.target.value)}
                  placeholder="Small scar through the left eyebrow"
                />
              </>
            )}

            <div className="vt-label">Notes (not sent to the model)</div>
            <input
              className="vt-input"
              maxLength={600}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Continuity: jacket is wet from scene 3 onward"
            />

            {error && (
              <div style={{ border: "1px solid #F87171", borderRadius: 4, padding: "10px 14px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#F87171", lineHeight: 1.7, marginBottom: 16 }}>{error}</div>
            )}

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={save} disabled={saving}>
                {saving ? "Saving…" : editingId ? "Update entry" : "Save to vault"}
              </button>
              {editingId && <button className="btn-ghost" onClick={reset}>Cancel</button>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            <button className={"vt-chip" + (filter === "all" ? " on" : "")} onClick={() => setFilter("all")}>All ({entries.length})</button>
            <button className={"vt-chip" + (filter === "character" ? " on" : "")} onClick={() => setFilter("character")}>Characters ({characters})</button>
            <button className={"vt-chip" + (filter === "location" ? " on" : "")} onClick={() => setFilter("location")}>Locations ({locations})</button>
          </div>

          {loading ? (
            <div className="empty-state"><div className="empty-text">Loading your vault…</div></div>
          ) : shown.length === 0 ? (
            <div className="empty-state"><div className="empty-text">Nothing here yet. Save your first character above.</div></div>
          ) : (
            shown.map((e) => (
              <div className="vt-card" key={e.id}>
                <div className="vt-kind">{e.kind}</div>
                <div className="vt-card-name">{e.name}</div>
                <div className="vt-body" style={{ marginTop: 8 }}>{e.description}</div>
                {e.wardrobe && (
                  <div className="vt-field">
                    <div className="vt-field-label">Wardrobe</div>
                    <div className="vt-body">{e.wardrobe}</div>
                  </div>
                )}
                {e.distinguishing && (
                  <div className="vt-field">
                    <div className="vt-field-label">Distinguishing</div>
                    <div className="vt-body">{e.distinguishing}</div>
                  </div>
                )}
                {e.notes && (
                  <div className="vt-field">
                    <div className="vt-field-label">Notes</div>
                    <div className="vt-body" style={{ opacity: 0.75 }}>{e.notes}</div>
                  </div>
                )}
                <div className="vt-actions">
                  <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => edit(e)}>Edit</button>
                  <button className="btn-ghost" style={{ fontSize: 11, color: "#C25B5B" }} onClick={() => remove(e)}>Delete</button>
                </div>
              </div>
            ))
          )}

          <div style={{ textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: 44, marginTop: 40 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: "var(--text)", marginBottom: 14 }}>Put them in a scene.</div>
            <div className="vt-body" style={{ maxWidth: 440, margin: "0 auto 26px" }}>
              Break a scene into shots and your saved entries drop in locked — the same wording in every shot.
            </div>
            <button className="btn-primary" onClick={() => setPage("scene-breakdown")}>Break down a scene</button>
          </div>
        </div>
      </section>
    </div>
  );
}