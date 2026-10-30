import { useEffect, useState } from "react";
import { DEPARTMENTS } from "./lib/lotDepartments.js";
import { supabase } from "./lib/supabase.js";
import CoveragePlan from "./CoveragePlan.jsx";
import StagingBoard from "./StagingBoard.jsx";
import ScriptSupervisor from "./ScriptSupervisor.jsx";
import { geometricCount } from "./lib/stageGeometry.js";

/*
  LotPage — RevaultAI
  The Lot Supervisor. A film studio was never one building: it was a lot, with
  a stage, a camera department and a script supervisor's notebook. Those parts
  already exist here as separate tools. This page is the lot they belong to —
  the departments in one place, and, for a signed-in creator with a project,
  the live read across their own scene.
*/


const styles = `
  .lot-wrap { max-width: 900px; margin: 0 auto; padding: 0 48px; }
  .lot-eyebrow { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; }
  .lot-h1 { font-family: 'Syne', sans-serif; font-size: 42px; font-weight: 700; color: var(--text); line-height: 1.08; margin: 14px 0 0; letter-spacing: -0.01em; }
  .lot-sub { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 300; font-style: italic; color: var(--muted); margin-top: 16px; }
  .lot-lede { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); line-height: 2; margin-top: 22px; max-width: 64ch; }
  .lot-rule { height: 1px; background: var(--border); margin: 44px 0; }
  .lot-sec { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 18px; }
  .lot-depts { display: grid; grid-template-columns: repeat(auto-fit, minmax(255px, 1fr)); gap: 14px; }
  .lot-dept { border: 1px solid var(--border); border-radius: 8px; background: var(--surface); padding: 22px 24px; text-align: left; cursor: pointer; transition: border-color 0.2s; min-width: 0; }
  .lot-dept:hover { border-color: var(--accent); }
  .lot-dept:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .lot-dept-multi { cursor: default; }
  .lot-dept-multi:hover { border-color: var(--border); }
  .lot-doors { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 13px; }
  .lot-door { background: none; border: 1px solid var(--border); color: var(--text); border-radius: 3px;
    padding: 5px 10px; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.04em;
    cursor: pointer; transition: border-color 0.2s, color 0.2s; }
  .lot-door:hover { border-color: var(--accent); color: var(--accent); }
  .lot-door:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .lot-dept-lead { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); margin-bottom: 9px; }
  .lot-dept-name { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
  .lot-dept-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.85; }
  .lot-note { border-left: 2px solid var(--accent); padding-left: 16px; font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.9; max-width: 68ch; }
  .lot-note b { color: var(--text); font-weight: 400; }
  .lot-btn { background: none; border: 1px solid var(--accent); color: var(--accent); border-radius: 3px; padding: 9px 17px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.08em; cursor: pointer; margin-top: 16px; }
  .lot-btn:hover { background: var(--bg); }
  .lot-stack { display: flex; flex-direction: column; gap: 22px; }
  @media (max-width: 720px) {
    .lot-wrap { padding: 0 20px; }
    .lot-h1 { font-size: 31px; }
    .lot-sub { font-size: 19px; }
  }
`;

export default function LotPage({ user, activeProject, setPage, notify, onSignInClick }) {
  // Keyed by project so a switch never shows the previous project's setups
  // while the new ones are still in flight.
  const [loaded, setLoaded] = useState({ projectId: null, loaded: false, rows: [] });

  useEffect(() => {
    if (!user?.id) return;
    const pid = activeProject?.id ?? null;
    let alive = true;
    (async () => {
      // With no active project this reads every setup the creator owns. RLS
      // keeps that to them; requiring a project here showed an empty lot to
      // anyone who had never set one, which is nearly everyone.
      let q = supabase
        .from("coverage_slots")
        .select("id, plan_id, plan_label, slug, shot_size, sort, camera_x, camera_y, camera_rotation, lens_mm, camera_height, favors, actors, intent, intent_favors, deliberate_cross, no_master_by_design");
      if (pid) q = q.eq("project_id", pid);
      const { data } = await q;
      if (alive) setLoaded({ projectId: pid, loaded: true, rows: data ?? [] });
    })();
    return () => { alive = false; };
  }, [user?.id, activeProject?.id]);

  // Keyed on the project the rows were fetched for — null included — so a
  // switch never shows the previous scope's setups while the new ones load.
  const slots = loaded.loaded && loaded.projectId === (activeProject?.id ?? null) ? loaded.rows : [];
  const blocked = geometricCount(slots);

  return (
    <div className="lot-wrap">
      <style>{styles}</style>

      <div style={{ paddingTop: 56 }}>
        <div className="lot-eyebrow">The lot</div>
        <h1 className="lot-h1">The Lot Supervisor</h1>
        <div className="lot-sub">Everything a film needs that the camera can&rsquo;t provide.</div>
        <p className="lot-lede">
          For a hundred years a studio was a place you could walk through. A stage where scenes
          were blocked before anyone rolled. A first AD who knew which setups the cutting room
          would need. A script supervisor with a notebook, reading every shot against every other
          shot. Generation solved the camera. These are the departments around it.
        </p>
      </div>

      <div className="lot-rule" />

      <div className="lot-sec">Block it and see</div>
      <StagingBoard
        user={user}
        activeProject={activeProject}
        notify={notify}
        setPage={setPage}
        onSignInClick={onSignInClick}
      />

      <div className="lot-rule" />

      {user && activeProject && blocked >= 1 ? (
        <>
          <div className="lot-sec">{activeProject.name} &mdash; the read on your scene</div>
          <div className="lot-stack">
            <CoveragePlan slots={slots} />
            <ScriptSupervisor project={activeProject} user={user} setPage={setPage} notify={notify} />
          </div>
          <div className="lot-rule" />
        </>
      ) : (
        <>
          <div className="lot-sec">The read on your own scene</div>
          <p className="lot-note">
            {!user ? (
              <>
                Sign in and the lot reads your own work: every setup in a scene on one overhead
                plan, with the line of action drawn and any camera that crosses it marked.
              </>
            ) : !activeProject ? (
              <>
                Choose a project and the lot reads it: every setup on one overhead plan, the line
                of action drawn, and any camera that crosses it marked.
              </>
            ) : (
              <>
                <b>{activeProject.name}</b> has no blocked setups yet. Block a scene in the
                Rehearsal Studio and press Cover &mdash; those setups save where every camera
                stood, which is what lets the lot read screen direction across them.
              </>
            )}
          </p>
          {!user ? (
            <button className="lot-btn" type="button" onClick={onSignInClick}>Sign in</button>
          ) : !activeProject ? (
            <button className="lot-btn" type="button" onClick={() => setPage("projects")}>Choose a project</button>
          ) : (
            <button className="lot-btn" type="button" onClick={() => setPage("rehearsal")}>Open the Rehearsal Studio</button>
          )}
          <div className="lot-rule" />
        </>
      )}

      <div className="lot-sec">The departments</div>
      <div className="lot-depts">
        {DEPARTMENTS.map((d) => {
          const single = d.tools.length === 1;
          const inner = (
            <>
              <div className="lot-dept-lead">{d.lead}</div>
              <div className="lot-dept-name">{d.name}</div>
              <div className="lot-dept-body">{d.body}</div>
            </>
          );
          // One door: the whole card is the link, as it has always been.
          return single ? (
            <button key={d.name} type="button" className="lot-dept" onClick={() => setPage(d.tools[0][1])}>
              {inner}
            </button>
          ) : (
            <div key={d.name} className="lot-dept lot-dept-multi">
              {inner}
              <div className="lot-doors">
                {d.tools.map(([label, page]) => (
                  <button key={page} type="button" className="lot-door" onClick={() => setPage(page)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="lot-rule" />

      <div className="lot-sec">Front of house</div>
      <p className="lot-note" style={{ marginBottom: 34 }}>
        <b>The theater is not a department.</b> Everything above is crew — the rooms you work in
        before anyone watches anything. What the work is <i>for</i> sits outside the gates: a
        curated gallery rather than a feed, where a film is presented and can be sold.
        {" "}
        <button type="button" className="lot-door" onClick={() => setPage("explore")}>Explore</button>
        {" "}
        <button type="button" className="lot-door" onClick={() => setPage("premium-films")}>Premium films</button>
      </p>

      <div className="lot-rule" />

      <p className="lot-note" style={{ marginBottom: 72 }}>
        <b>Why screen direction needs more than one setup.</b> A single camera is always correct
        on its own. The error only exists between two: cut from one side of the line of action to
        the other and your performers swap places on screen, which an audience feels without
        being able to name. That is why the plan above reads a whole scene at once rather than a
        shot at a time.
      </p>
    </div>
  );
}
