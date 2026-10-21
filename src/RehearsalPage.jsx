import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase.js";
import RehearsalStudio from "./RehearsalStudio.jsx";
import ScenePreview from "./ScenePreview.jsx";
import RehearsalSections from "./RehearsalSections.jsx";
import { createShare, loadShare, shareUrl } from "./lib/shareRehearsal.js";

/*
  RehearsalPage — RevaultAI
  Rehearse the scene before generating it. Anyone can use the studio;
  saving needs an account, and saved rehearsals file under the active project.
*/

const bar = {
  maxWidth: 980, margin: "0 auto 18px", padding: "0 48px",
};
const mono = { fontFamily: "'DM Mono', monospace" };

const heroCss = `
  .rh-hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); gap: 40px; align-items: center; }
  .rh-hero-pts { font-family: 'DM Mono', monospace; font-size: 11.5px; color: var(--muted); line-height: 2; margin-top: 18px; }
  .rh-hero-pts b { color: var(--text); font-weight: 500; }
  .rh-cta { display: inline-flex; align-items: center; gap: 10px; margin-top: 22px; padding: 13px 22px;
    background: var(--accent); color: #fff; border: 1px solid var(--accent); border-radius: 4px;
    font-family: 'DM Mono', monospace; font-size: 12.5px; letter-spacing: 0.06em; cursor: pointer; font-weight: 500; }
  .rh-cta:hover { background: #8d52ee; }
  .rh-cta:focus-visible { outline: 2px solid var(--accent-text); outline-offset: 3px; }
  .rh-cta-note { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); margin-left: 14px; }
  @media (max-width: 900px) { .rh-hero { grid-template-columns: 1fr; gap: 26px; } }
`;

// Where the blocking goes next. These were in the page source and nowhere a
// visitor could see them.
const NEXT_STEPS = [
  {
    page: "scene-breakdown",
    name: "Scene Breakdown",
    body: "Turn a written scene into numbered shots, with the characters and locations described the same way every time.",
  },
  {
    page: "coverage",
    name: "Coverage Planner",
    body: "The setups an editor needs to cut the scene — master, singles, over-the-shoulders, reactions — and what is missing.",
  },
  {
    page: "blocking",
    name: "Performance & Blocking",
    body: "Acting direction you can play, and delivery notes on every line, once the positions are settled.",
  },
];

const FAQ = [
  {
    q: "What costs money here?",
    a: "Nothing on this page. Blocking, cameras, sets, lighting, the timeline, the starter scenes and the full-screen stage are free and need no account. Credits are only spent when you press Shoot this angle and generate actual video — and the price is shown before you confirm it.",
  },
  {
    q: "Do I need an account?",
    a: "Only to keep a rehearsal properly. Without one you can block as much as you like, and your scene is saved in your browser as you work, so a refresh or a closed tab does not lose it. An account adds permanence: the rehearsal is filed against your project, survives clearing your browser data, and opens on any machine you sign in from. Making a share link also needs one — opening somebody else's never does.",
  },
  {
    q: "What do credits buy?",
    a: "Generated video. Each model has its own price per second, shown next to it on the Generate page. A location plate — the photograph of your set that gets attached to the shot — is 2 credits.",
  },
  {
    q: "Can I get the blocking out of here?",
    a: "Four ways. Export storyboard gives you a single sheet with one frame per camera, captioned with the shot size, lens and who is in it — free, no account, downloaded straight to your machine. Share a link gives you a URL that opens the whole scene for anyone, with no account needed at their end, and they can change their copy freely without touching yours. Shoot this angle carries the blocking into the generator as a written shot. Cover the scene saves every angle as a shot list against a project. There is no animatic video export yet.",
  },
  {
    q: "Is this the finished picture?",
    a: "No. The stand-ins and the gray set are there to settle framing, eyelines and timing. None of that render is ever sent to a model — it would copy the stand-ins. What gets sent is the written shot, and a photographed plate of the set if you have one.",
  },
];


export default function RehearsalPage({ user, activeProject, notify, onSignInClick, setGenPrefill, setPage }) {
  const [list, setList] = useState([]);
  const [current, setCurrent] = useState({ id: null, data: null, key: "new" });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const latest = useRef(null);
  // Filled by the studio, so the hero's button can step onto the set.
  const studio = useRef(null);
  const [sharing, setSharing] = useState(false);
  const [link, setLink] = useState(null);
  const [copied, setCopied] = useState(false);
  // Arriving on a share: hold the studio back rather than booting it on a
  // starter scene and swapping underneath the visitor a moment later.
  const [opening, setOpening] = useState(() => {
    try { return !!new URLSearchParams(window.location.search).get("scene"); }
    catch { return false; }
  });
  const baseline = useRef(null);

  async function loadList() {
    if (!user?.id) { setList([]); return; }
    let q = supabase
      .from("rehearsals")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(30);
    if (activeProject?.id) q = q.eq("project_id", activeProject.id);
    const { data } = await q;
    setList(data ?? []);
  }
  useEffect(() => { loadList(); }, [user?.id, activeProject?.id]);

  /*
    A shared scene, opened by its link. Nobody needs an account for this —
    that is the whole point of the feature — and what arrives is treated as
    a stranger's JSON: loadShare sanitizes it before it reaches the studio.
  */
  useEffect(() => {
    let id = null;
    try { id = new URLSearchParams(window.location.search).get("scene"); } catch { id = null; }
    if (!id) return;
    let alive = true;
    (async () => {
      try {
        const shared = await loadShare(id);
        if (!alive) return;
        if (shared) {
          setCurrent({ id: null, data: shared, key: "share-" + id });
          /*
            Take the id back out of the address bar. Left in, returning to
            this page re-opens the original and throws away whatever the
            visitor has done to their copy since.
          */
          try {
            const u = new URL(window.location.href);
            u.searchParams.delete("scene");
            window.history.replaceState(window.history.state, "", u.pathname + u.search);
          } catch { /* an address bar we cannot rewrite is not worth failing over */ }
          notify?.("Opened a shared scene — it is yours to change. Sign in to keep your version.");
        } else {
          notify?.("That link did not match a scene. It may have been deleted.");
        }
      } catch (e) {
        if (alive) notify?.("Could not open that shared scene: " + (e?.message || "unknown reason"));
      } finally {
        if (alive) setOpening(false);
      }
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /*
    Making a share needs an account, opening one never does.

    Not to gate the feature — it is because an unauthenticated write
    endpoint that accepts a blob of JSON is free storage for whoever finds
    it. The row is owned, so it can be rate-limited, counted and deleted.
    Reading stays open, which is the half that matters to the person you
    send the link to.
  */
  async function share() {
    if (!user?.id) { notify?.("Sign in to get a link — opening one needs no account."); onSignInClick?.(); return; }
    const data = latest.current;
    if (!data) { notify?.("Nothing to share yet."); return; }
    setSharing(true);
    setCopied(false);
    try {
      const url = shareUrl(await createShare(data, user.id));
      setLink(url);
      try { await navigator.clipboard.writeText(url); setCopied(true); } catch { /* shown below to copy by hand */ }
    } catch (e) {
      notify?.("Could not make a link: " + (e?.message || "unknown reason"));
    } finally {
      setSharing(false);
    }
  }

  // Don't lose unsaved blocking to a stray tab close.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // The studio reports every change. The first report after opening is the
  // starting point, not an edit.
  function onStudioChange(r) {
    latest.current = r;
    const s = JSON.stringify(r);
    if (baseline.current === null) { baseline.current = s; return; }
    setDirty(s !== baseline.current);
  }

  // The angle becomes a Shot Spec, not just a prompt: it carries the blocking,
  // start and end states, eyelines and beats into the Debugger, Live Set
  // Memory and the cross-model compiler.
  // One press turns the blocking into a shot list: a slot per angle, so the
  // board on /projects tracks the scene until every setup has a keeper.
  async function onCover(shots) {
    if (!user?.id) { notify?.("Sign in to save coverage."); return; }
    if (!activeProject?.id) { notify?.("Choose a project first — coverage is saved against one."); return; }
    if (!shots.length) { notify?.("No camera is framing anyone yet."); return; }

    const planId = crypto.randomUUID();
    const label = `${current?.data?.title || "Rehearsal"} — ${shots.length} angles`;
    const rows = shots.map((s, i) => ({
      user_id: user.id,
      project_id: activeProject.id,
      plan_id: planId,
      plan_label: label.slice(0, 300),
      slug: s.slug,
      purpose: String(s.purpose || `Blocked in the Rehearsal Studio${s.subject ? ", on " + s.subject : ""}`).slice(0, 400),
      shot_size: String(s.shotSize || "").slice(0, 60),
      camera: String(s.cameraNote || "").slice(0, 200),
      duration_seconds: Number(s.seconds) || null,
      priority: i === 0 ? "essential" : "recommended",
      prompt: String(s.prompt || "").slice(0, 2000),
      model_key: null,
      sort: i,
      // Geometry, so the staging audit can compare these setups against each
      // other later — screen direction only means something across a set.
      camera_x: s.spec?.camera?.layout?.camera?.x ?? null,
      camera_y: s.spec?.camera?.layout?.camera?.y ?? null,
      camera_rotation: s.spec?.camera?.layout?.camera?.rotation ?? null,
      lens_mm: parseFloat(String(s.spec?.camera?.lens || "").replace(/[^0-9.]/g, "")) || null,
      camera_height: s.spec?.camera?.height ?? null,
      favors: s.subject ?? null,
      actors: s.spec?.camera?.layout?.actors ?? null,
    }));

    const { error } = await supabase.from("coverage_slots").insert(rows);
    if (error) { notify?.("Couldn't save coverage: " + error.message); return; }

    // Keep the specs too, so each angle carries its blocking into the take.
    await supabase.from("film_specs").insert(shots.map((s) => ({
      user_id: user.id,
      project_id: activeProject.id,
      title: s.spec.identity?.title || s.slug,
      version: 1,
      origin: "rehearsal",
      spec: s.spec,
    })));

    // Covering a scene saves setups, not location plates: a plate is made one
    // shot at a time through PlateApproval on the shoot path, where the creator
    // sees it and pays for it. Promising plates here would be promising nothing.
    notify?.(`${rows.length} setups saved to ${activeProject.name}. Fill them from the board on Projects.`);
    setPage?.("projects");
  }

  async function onShoot(out) {
    let specId = null;
    let version = 1;
    if (user?.id && out.spec) {
      const { data, error } = await supabase
        .from("film_specs")
        .insert({
          user_id: user.id,
          project_id: activeProject?.id ?? null,
          title: out.spec.identity?.title || "Rehearsal shot",
          version: 1,
          origin: "rehearsal",
          spec: out.spec,
        })
        .select("id, version")
        .single();
      if (!error && data) { specId = data.id; version = data.version ?? 1; }
    }
    setGenPrefill?.({
      prompt: out.prompt,
      aspectRatio: out.aspect,
      locationUrl: out.plateUrl ?? null,
      locationName: out.setName ?? null,
      ...(specId ? { filmSpecId: specId, filmSpecVersion: version } : {}),
    });
    notify?.(specId
      ? `${out.camera} saved as a shot spec${out.plateUrl ? ", with the location attached" : ""}. Your rehearsal runs ${out.seconds}s — set the length to match.`
      : `Prompt built from ${out.camera}. Your rehearsal runs ${out.seconds}s — set the length to match.`);
    setPage?.("generate");
  }

  function leaveOk() {
    return !dirty || window.confirm("You have unsaved changes to this rehearsal. Leave them?");
  }

  async function open(id) {
    if (id === current.id || !leaveOk()) return;
    const { data, error } = await supabase.from("rehearsals").select("*").eq("id", id).maybeSingle();
    if (error || !data) { notify?.("Could not open that rehearsal."); return; }
    baseline.current = null;
    latest.current = data.data;
    setCurrent({ id: data.id, data: data.data, key: data.id });
    setDirty(false);
  }

  function startNew() {
    if (!leaveOk()) return;
    baseline.current = null;
    latest.current = null;
    setCurrent({ id: null, data: null, key: "new-" + Date.now() });
    setDirty(false);
  }

  async function save() {
    if (!user) { onSignInClick?.(); return; }
    const data = latest.current;
    if (!data) return;
    setSaving(true);
    const row = {
      title: String(data.title || "Untitled rehearsal").slice(0, 120),
      data,
      updated_at: new Date().toISOString(),
    };
    const res = current.id
      ? await supabase.from("rehearsals").update(row).eq("id", current.id).select().single()
      : await supabase.from("rehearsals").insert({ ...row, user_id: user.id, project_id: activeProject?.id ?? null }).select().single();
    setSaving(false);
    if (res.error) { notify?.("Could not save: " + res.error.message); return; }
    baseline.current = JSON.stringify(data);
    setCurrent((c) => ({ ...c, id: res.data.id }));
    setDirty(false);
    notify?.("Rehearsal saved.");
    loadList();
  }

  async function remove(id, title) {
    if (!window.confirm(`Delete "${title || "Untitled rehearsal"}"? This can't be undone.`)) return;
    const { error } = await supabase.from("rehearsals").delete().eq("id", id);
    if (error) { notify?.("Could not delete: " + error.message); return; }
    if (id === current.id) {
      baseline.current = null;
      latest.current = null;
      setCurrent({ id: null, data: null, key: "new-" + Date.now() });
      setDirty(false);
    }
    loadList();
  }

  const btn = {
    background: "none", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 3,
    padding: "6px 12px", ...mono, fontSize: 10, letterSpacing: "0.08em", cursor: "pointer",
  };

  return (
    <div className="page">
      <style>{heroCss}</style>
      <div className="page-hdr rh-hero">
        <div>
          <div className="page-hdr-eyebrow">Previz · Scene blocking</div>
          <div className="page-hdr-title">Rehearsal Studio</div>
          <div className="page-hdr-sub">Block the scene over time before you spend a credit on it.</div>
          <div style={{ ...mono, fontSize: 12, color: "#4ADE80", letterSpacing: "0.08em", marginTop: 8 }}>
            Free — no account needed
          </div>
          <div className="rh-hero-pts">
            <b>Blocking over a timeline</b>, not one frozen setup<br />
            <b>Walk the camera</b> through the set with W A S D<br />
            <b>Straight to a generated shot</b> when the angle is right
          </div>
          <div>
            <button className="rh-cta" onClick={() => studio.current?.openStage()}>
              Step onto the set →
            </button>
            <span className="rh-cta-note">or start blocking below</span>
          </div>
        </div>
        <ScenePreview height={320} />
      </div>
      <section className="section">
        <div style={{ ...bar, ...mono, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.85 }}>
          Scrub to a moment and drag anyone — a keyframe is written there, and the movement between keyframes is filled in. Mark beats as you go. Add cameras to compare angles on an identical performance. Shot size, lens, eyelines and the 180° line all update live.
        </div>

        <div style={{ ...bar, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button style={btn} onClick={save} disabled={saving} title="Keeps this rehearsal under your account so you can come back to it. Everything else on this page works without one.">
            {saving ? "Saving…" : !user ? "Sign in to save" : dirty || !current.id ? "Save rehearsal" : "\u2713 Saved"}
          </button>
          <button style={btn} onClick={startNew}>New rehearsal</button>
          <button
            style={btn}
            onClick={share}
            disabled={sharing}
            title="A link that opens this scene for anyone, with or without an account."
          >
            {sharing ? "Making a link…" : "Share a link"}
          </button>
          {dirty && <span style={{ ...mono, fontSize: 11, color: "#E5B769" }}>Unsaved changes</span>}
          {activeProject && user && (
            <span style={{ ...mono, fontSize: 11, color: "var(--muted)" }}>Saving to {activeProject.name}</span>
          )}
        </div>

        {link && (
          <div style={{ ...bar, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ ...mono, fontSize: 11, color: "#4ADE80" }}>
              {copied ? "Link copied." : "Link ready — copy it below."}
            </span>
            <input
              readOnly
              value={link}
              onFocus={(e) => e.target.select()}
              style={{ ...mono, flex: 1, minWidth: 260, fontSize: 11, color: "var(--text)",
                background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 3, padding: "7px 9px" }}
            />
            <span style={{ ...mono, fontSize: 11, color: "var(--muted)" }}>Opens without an account.</span>
          </div>
        )}

        {list.length > 0 && (
          <div style={{ ...bar }}>
            <div style={{ ...mono, fontSize: 9, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 8 }}>
              Your rehearsals{activeProject ? " in this project" : ""}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {list.map((r) => (
                <span key={r.id} style={{ display: "inline-flex", border: "1px solid " + (r.id === current.id ? "var(--accent)" : "var(--border)"), borderRadius: 3, overflow: "hidden" }}>
                  <button
                    style={{ ...btn, border: "none", borderRadius: 0, color: r.id === current.id ? "var(--accent)" : "var(--text)" }}
                    onClick={() => open(r.id)}
                  >{r.title || "Untitled rehearsal"}</button>
                  <button
                    style={{ ...btn, border: "none", borderLeft: "1px solid var(--border)", borderRadius: 0, color: "#C25B5B", padding: "6px 9px" }}
                    onClick={() => remove(r.id, r.title)}
                    title="Delete"
                  >&times;</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {opening ? (
          <div style={{ ...bar, ...mono, fontSize: 12, color: "var(--muted)" }}>Opening a shared scene…</div>
        ) : (
        <RehearsalStudio key={current.key} initial={current.data} onChange={onStudioChange} setGenPrefill={setGenPrefill} setPage={setPage} notify={notify} onShoot={onShoot} onCover={onCover} user={user} activeProject={activeProject} controlsRef={studio} />
        )}

        <div style={{ ...bar, marginTop: 44, textAlign: "center" }}>
          <button className="rh-cta" onClick={() => studio.current?.openStage()}>
            Step onto the set →
          </button>
          <div style={{ ...mono, fontSize: 11, color: "var(--muted)", marginTop: 10 }}>
            Full screen, in 3D. Free, and nothing is charged until you generate.
          </div>
        </div>

        <div style={{ marginTop: 40 }}>
          <RehearsalSections />
        </div>

        <div style={{ ...bar, marginTop: 44 }}>
          <div style={{ ...mono, fontSize: 10, letterSpacing: "0.2em", color: "var(--accent-text)", textTransform: "uppercase", marginBottom: 12 }}>
            Use it with
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {NEXT_STEPS.map((n) => (
              <button
                key={n.page}
                onClick={() => setPage?.(n.page)}
                style={{
                  textAlign: "left", background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 6, padding: "14px 16px", cursor: "pointer", color: "var(--text)",
                }}
              >
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700 }}>{n.name} →</div>
                <div style={{ ...mono, fontSize: 11.5, color: "var(--muted)", lineHeight: 1.7, marginTop: 6 }}>{n.body}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ ...bar, marginTop: 40, marginBottom: 56 }}>
          <div style={{ ...mono, fontSize: 10, letterSpacing: "0.2em", color: "var(--accent-text)", textTransform: "uppercase", marginBottom: 12 }}>
            Questions
          </div>
          {FAQ.map((f) => (
            <details key={f.q} style={{ borderTop: "1px solid var(--border)", padding: "12px 0" }}>
              <summary style={{ ...mono, fontSize: 12.5, color: "var(--text)", cursor: "pointer" }}>{f.q}</summary>
              <div style={{ ...mono, fontSize: 12, color: "var(--muted)", lineHeight: 1.85, marginTop: 10 }}>{f.a}</div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}