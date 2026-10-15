import { useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  SaveCoverageSlots — RevaultAI
  Keeps a set of setups as coverage slots in the active project, so the
  coverage board can show which exist and which are still missing.

  The caller supplies the CONTENT of the rows and this supplies their
  IDENTITY — user, project, a fresh plan id and the label they share. Saving
  twice makes a second plan rather than editing the first: append-only, so a
  plan already being shot is never rewritten underneath someone. If that turns
  out to clutter the board, updating in place is the next thing to build.

  Rows are built on click rather than on render, because building them means
  writing a generation prompt per setup and nothing should pay that cost to
  display a button.

  Each caller maps its own shape into rows. That is deliberate: this file knows
  nothing about staging boards or coverage planners, and exports one component
  and nothing else.
*/

const mono = { fontFamily: "'DM Mono', monospace" };

export default function SaveCoverageSlots({
  buildRows, count = 0, label, blurb, savedBlurb,
  user, activeProject, notify, setPage, onSignInClick,
}) {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(null);

  if (!count) return null;

  async function save() {
    setBusy(true);
    try {
      const planId = crypto.randomUUID();
      const planLabel = String(label || "Coverage plan").slice(0, 300);
      const rows = buildRows().map((r, i) => ({
        ...r,
        user_id: user.id,
        project_id: activeProject.id,
        plan_id: planId,
        plan_label: planLabel,
        sort: r.sort ?? i,
      }));
      const { error } = await supabase.from("coverage_slots").insert(rows);
      if (error) {
        notify?.("Couldn't save: " + error.message);
        return;
      }
      setSaved({ n: rows.length, planLabel });
      notify?.(`${rows.length} setups saved to ${activeProject.name}.`);
    } catch (err) {
      notify?.("Couldn't save: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  const box = { border: "1px solid var(--accent)", borderRadius: 8, padding: "16px 18px", marginTop: 18, background: "var(--surface)", flexBasis: "100%", width: "100%", boxSizing: "border-box" };
  const text = { ...mono, fontSize: 11, color: "var(--muted)", lineHeight: 1.8, marginBottom: 12 };

  if (!user) {
    return (
      <div style={box}>
        <div style={text}>
          {blurb || "Sign in to keep these as coverage slots — they turn green as you shoot and choose keepers."}
        </div>
        <button className="btn-ghost" type="button" onClick={onSignInClick}>Sign in</button>
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div style={box}>
        <div style={text}>Choose a project to keep this in — each setup becomes a slot that turns green once it has a keeper.</div>
        <button className="btn-ghost" type="button" onClick={() => setPage("projects")}>Choose a project</button>
      </div>
    );
  }

  return (
    <div style={box}>
      {saved ? (
        <>
          <div style={text}>
            <span style={{ color: "#4ADE80" }}>&#10003;</span> Saved {saved.n} setups to {activeProject.name} as
            &ldquo;{saved.planLabel}&rdquo;. {savedBlurb || "Each one turns green when it has a keeper."}
          </div>
          <button className="btn-primary" type="button" onClick={() => setPage("projects")}>See the coverage board &rarr;</button>
          <button className="btn-ghost" type="button" onClick={() => setSaved(null)} style={{ marginLeft: 10 }}>Save again as a new plan</button>
        </>
      ) : (
        <>
          <div style={text}>
            {blurb || `Keep this plan: each setup becomes a slot in ${activeProject.name} — red until it's tried, green once it has a keeper, with a button to fill it.`}
          </div>
          <button className="btn-primary" type="button" onClick={save} disabled={busy}>
            {busy ? "Saving…" : `Save ${count} ${count === 1 ? "setup" : "setups"} to ${activeProject.name}`}
          </button>
        </>
      )}
    </div>
  );
}
