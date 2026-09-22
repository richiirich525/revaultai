import { useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  SaveCoverageSlots — RevaultAI
  Keeps a coverage plan as slots in the active project, so the Projects page
  can show which setups exist and which are still missing.
*/

const mono = { fontFamily: "'DM Mono', monospace" };

export default function SaveCoverageSlots({ result, user, activeProject, notify, setPage, onSignInClick }) {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const setups = result?.coverage ?? [];
  if (!setups.length) return null;

  async function save() {
    setBusy(true);
    const planId = crypto.randomUUID();
    const rows = setups.map((c, i) => ({
      user_id: user.id,
      project_id: activeProject.id,
      plan_id: planId,
      plan_label: String(result.scene_read || "Coverage plan").slice(0, 300),
      slug: String(c.slug || `Setup ${i + 1}`).slice(0, 120),
      purpose: String(c.purpose || "").slice(0, 400),
      shot_size: String(c.shot_size || "").slice(0, 60),
      camera: String(c.camera || "").slice(0, 200),
      duration_seconds: Number(c.duration_seconds) || null,
      priority: ["essential", "recommended", "optional"].includes(c.priority) ? c.priority : "recommended",
      prompt: String(c.prompt || "").slice(0, 2000),
      model_key: result.modelKey ?? null,
      sort: i,
    }));
    const { error } = await supabase.from("coverage_slots").insert(rows);
    setBusy(false);
    if (error) { notify?.("Couldn't save: " + error.message); return; }
    setSaved(true);
    notify?.(`${rows.length} slots saved to ${activeProject.name}.`);
  }

  const box = { border: "1px solid var(--accent)", borderRadius: 8, padding: "16px 18px", marginTop: 18, background: "var(--surface)", flexBasis: "100%", width: "100%", boxSizing: "border-box" };
  const text = { ...mono, fontSize: 11, color: "var(--muted)", lineHeight: 1.8, marginBottom: 12 };

  if (!user) {
    return (
      <div style={box}>
        <div style={text}>Sign in to keep these as coverage slots — they turn green as you shoot and choose keepers.</div>
        <button className="btn-ghost" onClick={onSignInClick}>Sign in</button>
      </div>
    );
  }
  if (!activeProject) {
    return (
      <div style={box}>
        <div style={text}>Choose a project to track this coverage in — each setup becomes a slot that turns green once it has a keeper.</div>
        <button className="btn-ghost" onClick={() => setPage("projects")}>Choose a project</button>
      </div>
    );
  }
  return (
    <div style={box}>
      {saved ? (
        <>
          <div style={text}><span style={{ color: "#4ADE80" }}>✓</span> Saved as {setups.length} slots in {activeProject.name}. Each one turns green when it has a keeper.</div>
          <button className="btn-primary" onClick={() => setPage("projects")}>See the coverage board →</button>
        </>
      ) : (
        <>
          <div style={text}>Keep this plan: each setup becomes a slot in {activeProject.name} — red until it's tried, green once it has a keeper, with a button to fill it.</div>
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : `Track these in ${activeProject.name}`}</button>
        </>
      )}
    </div>
  );
}