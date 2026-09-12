import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  VaultPage — RevaultAI
  Reusable character and location entries. Saved once, then locked into every
  shot of a Scene Breakdown verbatim. Requires sign-in; RLS scopes every row
  to its owner and the client writes directly.
*/

const BLANK = { kind: "character", name: "", description: "", wardrobe: "", distinguishing: "", notes: "", images: [] };
const MAX_IMAGES = 3;

const KINDS = [
  ["character", "Character"],
  ["location", "Location"],
  ["prop", "Prop"],
  ["look", "Look"],
];

const PLACEHOLDERS = {
  character: {
    name: "Maya",
    description: "Woman in her early 30s, angular face, deep brown skin, short natural black curls, dark brown eyes, athletic build.",
  },
  location: {
    name: "Underground parking garage",
    description: "Narrow underground parking garage, pale concrete columns, low fluorescent ceiling lights, yellow bay numbers, damp floor reflecting the overhead fixtures.",
  },
  prop: {
    name: "Maya's camera",
    description: "Battered black Canon AE-1 with a cracked viewfinder, brown leather strap worn shiny at the edges, a strip of gaffer tape over the film counter.",
  },
  look: {
    name: "1970s paranoid thriller",
    description: "40mm anamorphic with oval bokeh and mild barrel distortion. Soft motivated practicals, hard sunset backlight, warm amber highlights against cyan shadows. Kodak-like grain, restrained halation, slow controlled camera movement, no handheld.",
  },
};

const HELP = {
  character: "This exact text goes into every shot they appear in. Concrete and visual beats long — four to seven strong anchors carry further than a paragraph of adjectives.",
  location: "This exact text goes into every shot set here. Name the materials, the light sources and the dressing rather than the mood.",
  prop: "This exact text goes into every shot the prop appears in. Specific beats generic — a battered black Canon AE-1 holds where 'a camera' drifts.",
  look: "A Look applies to the whole scene, not one subject. Every shot in a breakdown inherits it — lens, lighting, palette, texture and camera behaviour.",
};

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
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState({});   // entryId -> [signed urls]
  const [localPreviews, setLocalPreviews] = useState([]);  // object URLs for the form, index-matched to form.images

  async function pickImage(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setError("Images must be JPG, PNG or WebP."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Image must be under 8 MB."); return; }
    if ((form.images?.length ?? 0) >= MAX_IMAGES) { setError(`Up to ${MAX_IMAGES} images per entry.`); return; }
    setUploading(true); setError(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      const r = await fetch("/api/get-upload-url", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ fileType: file.type }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.uploadUrl) throw new Error(j.error || "Could not prepare the upload.");
      await new Promise((resolve, reject) => {
        const x = new XMLHttpRequest();
        x.open("PUT", j.uploadUrl);
        x.setRequestHeader("Content-Type", file.type);
        x.addEventListener("load", () => (x.status >= 200 && x.status < 300) ? resolve() : reject(new Error("Upload failed (" + x.status + ")")));
        x.addEventListener("error", () => reject(new Error("Network error during upload")));
        x.send(file);
      });
      setForm((f) => ({ ...f, images: [...(f.images ?? []), j.videoPublicUrl] }));
      setLocalPreviews((p) => [...p, URL.createObjectURL(file)]);
    } catch (err) {
      setError(err.message || "Upload failed.");
    }
    setUploading(false);
  }

  function removeImage(i) {
    setForm((f) => ({ ...f, images: (f.images ?? []).filter((_, n) => n !== i) }));
    setLocalPreviews((p) => {
      if (p[i]?.startsWith("blob:")) URL.revokeObjectURL(p[i]);
      return p.filter((_, n) => n !== i);
    });
  }

  function clearLocalPreviews() {
    setLocalPreviews((p) => {
      p.forEach((u) => { if (u?.startsWith("blob:")) URL.revokeObjectURL(u); });
      return [];
    });
  }

  async function loadPreviews(entry) {
    if (!entry.images?.length || previews[entry.id]) return;
    try {
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch("/api/get-video-url", {
        method: "POST",
        headers: { Authorization: "Bearer " + sess?.session?.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "vault", id: entry.id }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && Array.isArray(j.urls)) setPreviews((p) => ({ ...p, [entry.id]: j.urls }));
    } catch { /* preview is best-effort */ }
  }

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
    for (const e of data ?? []) loadPreviews(e);
  }
  useEffect(() => { load(); }, [user?.id]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function reset() { setForm(BLANK); setEditingId(null); setError(null); clearLocalPreviews(); }

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
      images: (form.images ?? []).slice(0, MAX_IMAGES),
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
      images: Array.isArray(entry.images) ? entry.images : [],
    });
    clearLocalPreviews();
    setLocalPreviews(previews[entry.id] ?? []);
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
  const countOf = (k) => entries.filter((e) => e.kind === k).length;

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
        <div className="page-hdr-sub">Your production bible — characters, locations, props and looks, locked into every shot.</div>
      </div>

      <section className="section">
        <div className="vt-wrap">
          <div className="vt-body" style={{ maxWidth: 620, marginBottom: 32 }}>
            Continuity breaks when you describe the same thing slightly differently each time. Write it once here — a character, a location, a prop — and Scene Breakdown reproduces it word-for-word in every shot it appears in. A Look works differently: it's the project's visual language, and every shot in a breakdown inherits it.
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 28, background: "var(--surface)", marginBottom: 40 }}>
            <div className="vt-label">{editingId ? "Edit entry" : "New entry"}</div>

            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {KINDS.map(([v, l]) => (
                <button key={v} className={"vt-chip" + (form.kind === v ? " on" : "")} onClick={() => set("kind", v)}>{l}</button>
              ))}
            </div>

            <div className="vt-label">Name</div>
            <input
              className="vt-input"
              value={form.name}
              maxLength={80}
              onChange={(e) => set("name", e.target.value)}
              placeholder={PLACEHOLDERS[form.kind]?.name ?? ""}
            />

            <div className="vt-label">{form.kind === "look" ? "Style directives" : "Locked description"}</div>
            <textarea
              className="vt-textarea"
              rows={4}
              maxLength={1200}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={PLACEHOLDERS[form.kind]?.description ?? ""}
            />
            <div className="vt-body" style={{ fontSize: 10, marginTop: -8, marginBottom: 16, opacity: 0.8 }}>
              {HELP[form.kind]}
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

            <div className="vt-label">Reference images (up to {MAX_IMAGES})</div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 4, padding: 14, marginBottom: 16, background: "var(--bg)" }}>
              {(form.images ?? []).length > 0 && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                  {form.images.map((_, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      {localPreviews[i] ? (
                        <img
                          src={localPreviews[i]}
                          alt={"Reference " + (i + 1)}
                          style={{ width: 92, height: 92, objectFit: "cover", borderRadius: 4, border: "1px solid var(--border)", display: "block" }}
                        />
                      ) : (
                        <div style={{ width: 92, height: 92, borderRadius: 4, border: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--muted)", letterSpacing: "0.1em" }}>
                          IMAGE {i + 1}
                        </div>
                      )}
                      <button
                        onClick={() => removeImage(i)}
                        style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--bg)", color: "#C25B5B", cursor: "pointer", fontSize: 12, lineHeight: 1, padding: 0 }}
                        title="Remove"
                      >&times;</button>
                    </div>
                  ))}
                </div>
              )}
              {(form.images ?? []).length < MAX_IMAGES && (
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = ""; }}
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--text)" }}
                />
              )}
              <div className="vt-body" style={{ fontSize: 10, marginTop: 10, opacity: 0.8 }}>
                {uploading ? "Uploading…" : "For your own reference — a portrait, a three-quarter view and a full body carry the most information. These aren't sent to the models; attach one manually when you generate."}
              </div>
            </div>

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
            {KINDS.map(([v, l]) => (
              <button key={v} className={"vt-chip" + (filter === v ? " on" : "")} onClick={() => setFilter(v)}>
                {l}s ({countOf(v)})
              </button>
            ))}
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
                {previews[e.id]?.length > 0 && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                    {previews[e.id].map((u, i) => (
                      <img key={i} src={u} alt={e.name + " reference " + (i + 1)} style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 4, border: "1px solid var(--border)", display: "block" }} />
                    ))}
                  </div>
                )}
                <div className="vt-body" style={{ marginTop: 12 }}>{e.description}</div>
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