import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  ProjectsPage — RevaultAI
  A project is context, not a container. Every tool keeps working with no
  project selected; when one is active, the things you make get stamped with
  it so they can be found together later. Deleting a project never deletes
  work — the stamp is simply cleared.
*/

const styles = `
  .pj-wrap { max-width: 900px; margin: 0 auto; padding: 0 48px; }
  .pj-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 8px; }
  .pj-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.85; }
  .pj-input { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 12px 14px; font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); line-height: 1.7; box-sizing: border-box; margin-bottom: 14px; }
  .pj-card { border: 1px solid var(--border); border-radius: 8px; padding: 24px 26px; margin-bottom: 14px; background: var(--surface); transition: border-color 0.2s; }
  .pj-card.on { border-color: var(--accent); }
  .pj-name { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; color: var(--text); }
  .pj-head { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; flex-wrap: wrap; margin-bottom: 8px; }
  .pj-active { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); border: 1px solid rgba(123,63,228,0.4); border-radius: 3px; padding: 3px 9px; }
  .pj-counts { display: flex; gap: 20px; flex-wrap: wrap; margin: 16px 0; }
  .pj-count-n { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; color: var(--text); line-height: 1; }
  .pj-count-l { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); margin-top: 5px; }
  .pj-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
  .pj-btn { background: none; border: 1px solid var(--border); color: var(--muted); border-radius: 3px; padding: 7px 14px; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
  .pj-btn:hover { color: var(--text); border-color: var(--muted); }
  .pj-btn.on { border-color: var(--accent); color: var(--accent); }
  .pj-list { border-top: 1px solid var(--border); margin-top: 16px; padding-top: 14px; }
  .pj-item { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.7; padding: 5px 0; }
  .pj-item b { color: var(--text); font-weight: 400; }
  @media (max-width: 760px) { .pj-wrap { padding: 0 24px; } }
`;

export default function ProjectsPage({ user, onSignInClick, setPage, notify, activeProject, setActiveProject }) {
  const [projects, setProjects] = useState([]);
  const [counts, setCounts] = useState({});
  const [contents, setContents] = useState({});   // projectId -> { vault, breakdowns, shots }
  const [open, setOpen] = useState(null);
  const [name, setName] = useState("");
  const [logline, setLogline] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    if (!user?.id) { setProjects([]); setLoading(false); return; }
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    const list = data ?? [];
    setProjects(list);
    setLoading(false);

    // Counts per project, one query per table rather than per project.
    const [v, b, s, g] = await Promise.all([
      supabase.from("vault_entries").select("project_id").not("project_id", "is", null),
      supabase.from("scene_breakdowns").select("project_id").not("project_id", "is", null),
      supabase.from("shots").select("project_id").not("project_id", "is", null),
      supabase.from("generations").select("project_id").not("project_id", "is", null),
    ]);
    const tally = {};
    const add = (rows, key) => {
      for (const r of rows ?? []) {
        if (!r.project_id) continue;
        tally[r.project_id] = tally[r.project_id] || { vault: 0, breakdowns: 0, shots: 0, generations: 0 };
        tally[r.project_id][key]++;
      }
    };
    add(v.data, "vault"); add(b.data, "breakdowns"); add(s.data, "shots"); add(g.data, "generations");
    setCounts(tally);
  }
  useEffect(() => { load(); }, [user?.id]);

  async function loadContents(id) {
    if (contents[id]) return;
    const [v, b, s] = await Promise.all([
      supabase.from("vault_entries").select("id, kind, name").eq("project_id", id).order("kind"),
      supabase.from("scene_breakdowns").select("id, title, shot_count, created_at").eq("project_id", id).order("created_at", { ascending: false }).limit(10),
      supabase.from("shots").select("id, name, selected_generation_id").eq("project_id", id).order("created_at", { ascending: false }).limit(10),
    ]);
    setContents((c) => ({ ...c, [id]: { vault: v.data ?? [], breakdowns: b.data ?? [], shots: s.data ?? [] } }));
  }

  async function create() {
    if (!name.trim()) { setError("Give the project a name."); return; }
    setSaving(true); setError(null);
    const { data, error: e } = await supabase
      .from("projects")
      .insert({ user_id: user.id, name: name.trim().slice(0, 120), logline: logline.trim().slice(0, 300) || null })
      .select()
      .single();
    setSaving(false);
    if (e) { setError("Could not create: " + e.message); return; }
    setName(""); setLogline("");
    setActiveProject(data);
    notify?.(`"${data.name}" is now your active project.`);
    load();
  }

  async function rename(p, next) {
    const clean = next.trim().slice(0, 120);
    if (!clean || clean === p.name) return;
    await supabase.from("projects").update({ name: clean, updated_at: new Date().toISOString() }).eq("id", p.id);
    setProjects((list) => list.map((x) => (x.id === p.id ? { ...x, name: clean } : x)));
    if (activeProject?.id === p.id) setActiveProject({ ...p, name: clean });
  }

  async function remove(p) {
    if (!window.confirm(`Delete the project "${p.name}"? Nothing you've made is deleted — the work just stops being grouped under it.`)) return;
    await supabase.from("projects").delete().eq("id", p.id);
    if (activeProject?.id === p.id) setActiveProject(null);
    notify?.("Project deleted. Your work is untouched.");
    load();
  }

  if (!user) {
    return (
      <div className="page">
        <div className="page-hdr">
          <div className="page-hdr-eyebrow">Production</div>
          <div className="page-hdr-title">Projects</div>
          <div className="page-hdr-sub">Keep a film's characters, scenes, shots and takes together.</div>
        </div>
        <section className="section">
          <div className="empty-state">
            <div className="empty-text">Sign in to start a project.</div>
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
        <div className="page-hdr-eyebrow">Production</div>
        <div className="page-hdr-title">Projects</div>
        <div className="page-hdr-sub">Keep a film's characters, scenes, shots and takes together.</div>
      </div>

      <section className="section">
        <div className="pj-wrap">
          <div className="pj-body" style={{ maxWidth: 620, marginBottom: 32 }}>
            A project is context, not a container. Set one active and the things you make get filed under it — vault entries, scene breakdowns, shots and takes. Every tool still works with no project selected, and deleting a project never deletes work.
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 26, background: "var(--surface)", marginBottom: 36 }}>
            <div className="pj-label">New project</div>
            <input
              className="pj-input"
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              placeholder="The Last Signal"
            />
            <input
              className="pj-input"
              value={logline}
              maxLength={300}
              onChange={(e) => setLogline(e.target.value)}
              placeholder="Logline (optional) — a detective discovers his memories were fabricated."
            />
            {error && (
              <div style={{ border: "1px solid #F87171", borderRadius: 4, padding: "10px 14px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#F87171", marginBottom: 14 }}>{error}</div>
            )}
            <button className="btn-primary" onClick={create} disabled={saving}>
              {saving ? "Creating…" : "Create project"}
            </button>
          </div>

          {loading ? (
            <div className="empty-state"><div className="empty-text">Loading your projects…</div></div>
          ) : projects.length === 0 ? (
            <div className="empty-state"><div className="empty-text">No projects yet. Create one above, or keep working without one — nothing requires it.</div></div>
          ) : (
            projects.map((p) => {
              const c = counts[p.id] || { vault: 0, breakdowns: 0, shots: 0, generations: 0 };
              const isActive = activeProject?.id === p.id;
              const isOpen = open === p.id;
              const inner = contents[p.id];
              return (
                <div className={"pj-card" + (isActive ? " on" : "")} key={p.id}>
                  <div className="pj-head">
                    <input
                      className="pj-name"
                      style={{ background: "none", border: "none", padding: 0, cursor: "text" }}
                      defaultValue={p.name}
                      onBlur={(e) => rename(p, e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                      title="Click to rename"
                    />
                    {isActive && <span className="pj-active">Active</span>}
                  </div>
                  {p.logline && <div className="pj-body">{p.logline}</div>}

                  <div className="pj-counts">
                    {[["Vault", c.vault], ["Breakdowns", c.breakdowns], ["Shots", c.shots], ["Takes", c.generations]].map(([l, n]) => (
                      <div key={l}>
                        <div className="pj-count-n">{n}</div>
                        <div className="pj-count-l">{l}</div>
                      </div>
                    ))}
                  </div>

                  <div className="pj-actions">
                    <button className={"pj-btn" + (isActive ? " on" : "")} onClick={() => { setActiveProject(isActive ? null : p); notify?.(isActive ? "No active project." : `"${p.name}" is now active.`); }}>
                      {isActive ? "\u2713 Active" : "Set active"}
                    </button>
                    <button className="pj-btn" onClick={() => { setOpen(isOpen ? null : p.id); if (!isOpen) loadContents(p.id); }}>
                      {isOpen ? "Hide contents" : "View contents"}
                    </button>
                    <button className="pj-btn" onClick={() => setPage("takes")}>Takes</button>
                    <button className="pj-btn" onClick={() => setPage("vault")}>Vault</button>
                    <button className="pj-btn" style={{ color: "#C25B5B" }} onClick={() => remove(p)}>Delete</button>
                  </div>

                  {isOpen && (
                    <div className="pj-list">
                      {!inner ? (
                        <div className="pj-item">Loading…</div>
                      ) : (
                        <>
                          <div className="pj-label" style={{ marginTop: 4 }}>Vault</div>
                          {inner.vault.length === 0
                            ? <div className="pj-item">Nothing yet.</div>
                            : inner.vault.map((v) => <div className="pj-item" key={v.id}><b>{v.name}</b> · {v.kind}</div>)}

                          <div className="pj-label" style={{ marginTop: 16 }}>Scene breakdowns</div>
                          {inner.breakdowns.length === 0
                            ? <div className="pj-item">Nothing yet.</div>
                            : inner.breakdowns.map((b) => <div className="pj-item" key={b.id}><b>{b.title || "Untitled"}</b> · {b.shot_count} shots</div>)}

                          <div className="pj-label" style={{ marginTop: 16 }}>Shots</div>
                          {inner.shots.length === 0
                            ? <div className="pj-item">Nothing yet.</div>
                            : inner.shots.map((s) => <div className="pj-item" key={s.id}><b>{s.name || "Untitled"}</b>{s.selected_generation_id ? " · take selected" : ""}</div>)}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}