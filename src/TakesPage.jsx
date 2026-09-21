import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";
import StateReview from "./StateReview.jsx";

/*
  TakesPage — RevaultAI
  Generations grouped into shots. Pick the take that works, reject the ones
  that don't, leave yourself a note, and compare two side by side. Shots are
  created automatically when you generate; regenerating the same prompt joins
  the same shot.
*/

const styles = `
  .tk-wrap { max-width: 1000px; margin: 0 auto; padding: 0 48px; }
  .tk-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 8px; }
  .tk-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.85; }
  .tk-shot { border: 1px solid var(--border); border-radius: 8px; padding: 26px 28px; margin-bottom: 20px; background: var(--surface); }
  .tk-shot-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 8px; }
  .tk-shot-name { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700; color: var(--text); background: none; border: none; padding: 0; cursor: text; }
  .tk-shot-name:focus { outline: 1px solid var(--accent); border-radius: 3px; padding: 2px 4px; }
  .tk-count { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.1em; color: var(--muted); }
  .tk-prompt { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); line-height: 1.8; margin-bottom: 18px; opacity: 0.85; }
  .tk-takes { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
  .tk-take { border: 1px solid var(--border); border-radius: 6px; padding: 12px; background: var(--bg); transition: border-color 0.2s, opacity 0.2s; }
  .tk-take.sel { border-color: var(--accent); }
  .tk-take.rej { opacity: 0.42; }
  .tk-take video { width: 100%; border-radius: 4px; display: block; background: #000; margin-bottom: 10px; }
  .tk-take-n { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .tk-badge { font-family: 'DM Mono', monospace; font-size: 8px; letter-spacing: 0.14em; text-transform: uppercase; border-radius: 3px; padding: 2px 6px; }
  .tk-note { width: 100%; background: var(--bg2); border: 1px solid var(--border); border-radius: 3px; padding: 7px 9px; font-family: 'DM Mono', monospace; font-size: 10px; color: var(--text); line-height: 1.6; resize: vertical; box-sizing: border-box; margin-top: 8px; }
  .tk-btn { background: none; border: 1px solid var(--border); color: var(--muted); border-radius: 3px; padding: 5px 10px; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
  .tk-btn:hover { color: var(--text); border-color: var(--muted); }
  .tk-btn.on { border-color: var(--accent); color: var(--accent); }
  .tk-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
  .tk-compare { position: fixed; inset: 0; background: rgba(8,9,13,0.94); z-index: 900; display: flex; flex-direction: column; padding: 32px; overflow: auto; }
  .tk-compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; max-width: 1200px; margin: 0 auto; width: 100%; }
  .tk-compare video { width: 100%; border-radius: 6px; background: #000; display: block; }
  @media (max-width: 760px) { .tk-wrap { padding: 0 24px; } .tk-compare-grid { grid-template-columns: 1fr; } }
`;

const REASONS = [
  ["identity", "Identity drift", "Wrong face, or the character changed partway"],
  ["anatomy", "Hands / anatomy", "Fingers, limbs, bodies that don't hold up"],
  ["motion", "Motion", "Mushy, too slow, physics wrong"],
  ["camera", "Camera", "Didn't follow the move, or moved unasked"],
  ["adherence", "Prompt adherence", "Ignored part of what was asked for"],
  ["continuity", "Continuity", "Wardrobe, props or lighting broke"],
  ["performance", "Performance", "Expression or delivery wrong"],
  ["artifact", "Artifact", "Warping, flicker, garbled text"],
];

export default function TakesPage({ user, onSignInClick, setPage, notify, activeProject }) {
  const [shots, setShots] = useState([]);
  const [gens, setGens] = useState([]);
  const [urls, setUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [compare, setCompare] = useState([]);   // up to two generation ids

  async function signUrl(g) {
    if (urls[g.id] || g.status !== "complete" || !g.video_url) return;
    try {
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch("/api/get-video-url", {
        method: "POST",
        headers: { Authorization: "Bearer " + sess?.session?.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "generation", id: g.id }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.url) setUrls((u) => ({ ...u, [g.id]: j.url }));
    } catch { /* best effort */ }
  }

  async function load() {
    if (!user?.id) { setShots([]); setGens([]); setLoading(false); return; }
    const [{ data: s }, { data: g }] = await Promise.all([
      supabase.from("shots").select("*").order("created_at", { ascending: false }),
      supabase.from("generations").select("*").not("shot_id", "is", null).order("created_at", { ascending: true }),
    ]);
    setShots(s ?? []);
    setGens(g ?? []);
    setLoading(false);
    for (const one of g ?? []) signUrl(one);
  }
  useEffect(() => { load(); }, [user?.id]);

  async function renameShot(shot, name) {
    const clean = name.trim().slice(0, 120);
    if (clean === (shot.name ?? "")) return;
    await supabase.from("shots").update({ name: clean || null, updated_at: new Date().toISOString() }).eq("id", shot.id);
    setShots((list) => list.map((x) => (x.id === shot.id ? { ...x, name: clean || null } : x)));
  }

  async function selectTake(shot, genId) {
    const next = shot.selected_generation_id === genId ? null : genId;
    await supabase.from("shots").update({ selected_generation_id: next, updated_at: new Date().toISOString() }).eq("id", shot.id);
    setShots((list) => list.map((x) => (x.id === shot.id ? { ...x, selected_generation_id: next } : x)));
  }

  async function setStatus(gen, status) {
    const next = gen.take_status === status ? null : status;
    await supabase.from("generations").update({ take_status: next }).eq("id", gen.id);
    setGens((list) => list.map((x) => (x.id === gen.id ? { ...x, take_status: next } : x)));
  }

  async function setReason(gen, reason) {
    const next = gen.reject_reason === reason ? null : reason;
    await supabase.from("generations").update({ reject_reason: next, take_status: "rejected" }).eq("id", gen.id);
    setGens((list) => list.map((x) => (x.id === gen.id ? { ...x, reject_reason: next, take_status: "rejected" } : x)));
  }

  async function saveNote(gen, note) {
    const clean = note.trim().slice(0, 400);
    if (clean === (gen.take_note ?? "")) return;
    await supabase.from("generations").update({ take_note: clean || null }).eq("id", gen.id);
    setGens((list) => list.map((x) => (x.id === gen.id ? { ...x, take_note: clean || null } : x)));
  }

  function toggleCompare(id) {
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 2 ? [c[1], id] : [...c, id]));
  }

  // Filing a shot files its takes too — they belong together.
  async function addShotToProject(shot) {
    if (!activeProject) { notify?.("Set a project active first, on the Projects page."); return; }
    const next = shot.project_id === activeProject.id ? null : activeProject.id;
    await supabase.from("shots").update({ project_id: next }).eq("id", shot.id);
    await supabase.from("generations").update({ project_id: next }).eq("shot_id", shot.id);
    notify?.(next ? `Added to "${activeProject.name}".` : "Removed from the project.");
    load();
  }

  async function removeShot(shot) {
    if (!window.confirm(`Remove the shot "${shot.name || "Untitled"}"? The generations stay in your history — only the grouping goes.`)) return;
    await supabase.from("generations").update({ shot_id: null }).eq("shot_id", shot.id);
    await supabase.from("shots").delete().eq("id", shot.id);
    notify?.("Shot removed.");
    load();
  }

  // What a usable shot actually costs, from your own approvals.
  const stats = (() => {
    const done = gens.filter((g) => g.status === "complete" || g.status === "failed");
    if (done.length === 0) return null;
    const keepers = shots.filter((s) => s.selected_generation_id).length;
    const credits = done.reduce((sum, g) => sum + (Number(g.credits_spent) || 0), 0);
    const byReason = {};
    for (const g of done) if (g.reject_reason) byReason[g.reject_reason] = (byReason[g.reject_reason] || 0) + 1;
    const topReason = Object.entries(byReason).sort((a, b) => b[1] - a[1])[0] ?? null;

    const byModel = {};
    for (const g of done) {
      const m = g.model || "unknown";
      byModel[m] = byModel[m] || { attempts: 0, keepers: 0, credits: 0 };
      byModel[m].attempts++;
      byModel[m].credits += Number(g.credits_spent) || 0;
      if (shots.some((s) => s.selected_generation_id === g.id)) byModel[m].keepers++;
    }

    return {
      attempts: done.length,
      keepers,
      credits,
      perKeeper: keepers > 0 ? Math.round(done.length / keepers * 10) / 10 : null,
      creditsPerKeeper: keepers > 0 ? Math.round(credits / keepers) : null,
      topReason: topReason ? { key: topReason[0], count: topReason[1] } : null,
      byModel: Object.entries(byModel).filter(([, v]) => v.attempts >= 3).sort((a, b) => b[1].attempts - a[1].attempts),
    };
  })();

  if (!user) {
    return (
      <div className="page">
        <div className="page-hdr">
          <div className="page-hdr-eyebrow">Production</div>
          <div className="page-hdr-title">Takes</div>
          <div className="page-hdr-sub">Every generation of a shot, side by side.</div>
        </div>
        <section className="section">
          <div className="empty-state">
            <div className="empty-text">Sign in to see your takes.</div>
            <button className="btn-primary" style={{ marginTop: 20 }} onClick={onSignInClick}>Sign in</button>
          </div>
        </section>
      </div>
    );
  }

  const compareGens = compare.map((id) => gens.find((g) => g.id === id)).filter(Boolean);

  return (
    <div className="page">
      <style>{styles}</style>
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">Production</div>
        <div className="page-hdr-title">Takes</div>
        <div className="page-hdr-sub">Every generation of a shot, grouped. Pick the one that works.</div>
      </div>

      <section className="section">
        <div className="tk-wrap">
          <div className="tk-body" style={{ maxWidth: 620, marginBottom: 32 }}>
            Generating the same prompt again makes another take of the same shot. Choose the one you'll actually use, reject the ones you won't, and leave yourself a note about why — so when you come back to the project next week, the decision is already made.
          </div>

          {stats && stats.keepers > 0 && (
            <div style={{ border: "1px solid var(--accent)", borderRadius: 8, padding: "22px 26px", marginBottom: 28, background: "var(--surface)" }}>
              <div className="tk-label" style={{ marginBottom: 14 }}>What a keeper costs you</div>
              <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{stats.perKeeper}</div>
                  <div className="tk-count" style={{ marginTop: 6 }}>Attempts per keeper</div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 700, color: "var(--accent)", lineHeight: 1 }}>{stats.creditsPerKeeper}</div>
                  <div className="tk-count" style={{ marginTop: 6 }}>Credits per keeper</div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{stats.keepers}</div>
                  <div className="tk-count" style={{ marginTop: 6 }}>Shots locked</div>
                </div>
              </div>

              {stats.byModel.length > 0 && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  <div className="tk-count" style={{ marginBottom: 8 }}>By model, three attempts or more</div>
                  {stats.byModel.map(([m, v]) => (
                    <div key={m} className="tk-body" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.9 }}>
                      <span style={{ color: "var(--text)" }}>{m}</span> — {v.keepers} keeper{v.keepers === 1 ? "" : "s"} from {v.attempts} attempt{v.attempts === 1 ? "" : "s"}
                      {v.keepers > 0 ? `, ${Math.round(v.credits / v.keepers)} credits each` : `, ${v.credits} credits spent with none kept`}
                    </div>
                  ))}
                </div>
              )}

              {stats.topReason && (
                <div className="tk-body" style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", marginTop: 12, opacity: 0.85 }}>
                  Most common reason for rejecting a take: {(REASONS.find(([k]) => k === stats.topReason.key) ?? [, stats.topReason.key])[1]} ({stats.topReason.count}).
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="empty-state"><div className="empty-text">Loading your takes…</div></div>
          ) : shots.length === 0 ? (
            <div className="empty-state">
              <div className="empty-text">No shots yet. Generate something and it'll appear here.</div>
              <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => setPage("generate")}>Open the generator</button>
            </div>
          ) : (
            shots.map((shot) => {
              const takes = gens.filter((g) => g.shot_id === shot.id);
              if (takes.length === 0) return null;
              return (
                <div className="tk-shot" key={shot.id}>
                  <div className="tk-shot-head">
                    <input
                      className="tk-shot-name"
                      defaultValue={shot.name || "Untitled shot"}
                      onBlur={(e) => renameShot(shot, e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                      title="Click to rename"
                    />
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <span className="tk-count">
                        {takes.length} take{takes.length === 1 ? "" : "s"}
                        {shot.selected_generation_id ? " · one selected" : ""}
                      </span>
                      {activeProject && (
                        <button
                          className={"tk-btn" + (shot.project_id === activeProject.id ? " on" : "")}
                          onClick={() => addShotToProject(shot)}
                        >
                          {shot.project_id === activeProject.id ? "\u2713 In project" : "Add to project"}
                        </button>
                      )}
                      <button className="tk-btn" onClick={() => removeShot(shot)}>Remove</button>
                    </div>
                  </div>
                  <div className="tk-prompt">{shot.prompt}</div>

                  <div className="tk-takes">
                    {takes.map((g, i) => {
                      const isSel = shot.selected_generation_id === g.id;
                      const isRej = g.take_status === "rejected";
                      const isFav = g.take_status === "favourite";
                      return (
                        <div className={"tk-take" + (isSel ? " sel" : "") + (isRej ? " rej" : "")} key={g.id}>
                          <div className="tk-take-n">
                            <span>Take {i + 1}</span>
                            {isSel && <span className="tk-badge" style={{ color: "var(--accent)", border: "1px solid rgba(123,63,228,0.4)" }}>Selected</span>}
                            {isFav && !isSel && <span className="tk-badge" style={{ color: "#E5B769", border: "1px solid rgba(229,183,105,0.4)" }}>Starred</span>}
                            {isRej && <span className="tk-badge" style={{ color: "#C25B5B", border: "1px solid rgba(194,91,91,0.4)" }}>Rejected</span>}
                          </div>
                          {g.status === "complete" && urls[g.id] ? (
                            <video src={urls[g.id]} controls playsInline preload="metadata" />
                          ) : g.status === "failed" ? (
                            <div className="tk-body" style={{ padding: "20px 0", fontSize: 10 }}>Failed — credits refunded.</div>
                          ) : (
                            <div className="tk-body" style={{ padding: "20px 0", fontSize: 10 }}>{g.status === "complete" ? "Preparing playback…" : "Generating…"}</div>
                          )}
                          <div className="tk-actions">
                            <button className={"tk-btn" + (isSel ? " on" : "")} onClick={() => selectTake(shot, g.id)}>{isSel ? "\u2713 Selected" : "Select"}</button>
                            <button className={"tk-btn" + (isFav ? " on" : "")} onClick={() => setStatus(g, "favourite")}>Star</button>
                            <button className="tk-btn" onClick={() => setStatus(g, "rejected")}>{isRej ? "Unreject" : "Reject"}</button>
                            <button className={"tk-btn" + (compare.includes(g.id) ? " on" : "")} onClick={() => toggleCompare(g.id)}>Compare</button>
                          </div>
                          {isRej && (
                            <div style={{ marginTop: 10, paddingTop: 9, borderTop: "1px solid var(--border)" }}>
                              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 7 }}>
                                Why?
                              </div>
                              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                {REASONS.map(([v, l, hint]) => (
                                  <button
                                    key={v}
                                    className={"tk-btn" + (g.reject_reason === v ? " on" : "")}
                                    style={{ fontSize: 8, padding: "4px 8px" }}
                                    title={hint}
                                    onClick={() => setReason(g, v)}
                                  >{l}</button>
                                ))}
                              </div>
                            </div>
                          )}
                          {isSel && g.status === "complete" && (
                            <div style={{ marginTop: 10 }}>
                              <StateReview generation={g} videoUrl={urls[g.id]} notify={notify} />
                            </div>
                          )}
                          <textarea
                            className="tk-note"
                            rows={2}
                            defaultValue={g.take_note || ""}
                            placeholder="Note to yourself…"
                            onBlur={(e) => saveNote(g, e.target.value)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {compareGens.length === 2 && (
        <div className="tk-compare" onClick={(e) => { if (e.target === e.currentTarget) setCompare([]); }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1200, margin: "0 auto 20px", width: "100%" }}>
            <span className="tk-label" style={{ marginBottom: 0 }}>Comparing two takes</span>
            <button className="tk-btn" onClick={() => setCompare([])}>Close</button>
          </div>
          <div className="tk-compare-grid">
            {compareGens.map((g) => (
              <div key={g.id}>
                {urls[g.id] ? <video src={urls[g.id]} controls playsInline /> : <div className="tk-body">Preparing playback…</div>}
                {g.take_note && <div className="tk-body" style={{ marginTop: 10 }}>{g.take_note}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}