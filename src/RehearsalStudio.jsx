import { useEffect, useRef, useState, lazy, Suspense } from "react";
import StageBlueprint from "./StageBlueprint.jsx";
import { readStage } from "./lib/stageGeometry.js";
import { stateAt, setKey, removeKey, keyTimes, newRehearsal, addCamera, addActor, removeActor, MAX_ACTORS } from "./lib/rehearsal.js";
import { motionState, defaultBody, BODIES } from "./lib/performers.js";
import { ACTION_CATEGORIES, searchActions, actionLabel, actionPose } from "./lib/actions.js";
import { CAMERA_MOVES, MOVE_CATEGORIES, moveKeys } from "./lib/cameraMoves.js";
import { walkThroughs, resolveMove, CAMERA_RADIUS, PERSON_RADIUS } from "./lib/stageCollision.js";
import { buildShootPrompt, buildShootSpec, buildCoverage } from "./lib/shootPrompt.js";
import { SETS, EXTERIORS, getSet, pieceSize } from "./lib/setCatalog.js";
import { GEN_MODELS } from "./lib/genModels.js";
import { STARTERS, getStarter } from "./lib/starters.js";
import { saveDraft, loadDraft } from "./lib/rehearsalDraft.js";
import { buildSheet, download, sheetName } from "./lib/storyboard.js";
import { LIGHT_PRESETS, defaultLight } from "./lib/lighting.js";
import { toStage } from "./lib/setGeometry.js";

// Which side of frame something sits on, for the plate's instruction.
function sideOfFrame(camera, p) {
  const bearing = (Math.atan2(p.x - camera.x, -(p.y - camera.y)) * 180) / Math.PI;
  const off = ((((bearing - (camera.rotation ?? 0)) % 360) + 540) % 360) - 180;
  return Math.abs(off) < 8 ? "center of frame" : off < 0 ? "left of frame" : "right of frame";
}
import SetEditor from "./SetEditor.jsx";
import { startEditing, packSet, unpackSet, activeRoom, describePiece } from "./lib/setEdit.js";
// Generated sets (Marble): a photoreal set built from a photo of a real room,
// a description, or both. Picked and generated in GeneratedSets below the
// library row; drawn by CameraView as Gaussian splats.
import GeneratedSets from "./GeneratedSets.jsx";
import { supabase } from "./lib/supabase.js";
import PlateApproval from "./PlateApproval.jsx";

// three.js is heavy, so the camera view loads only with the studio —
// it stays out of the bundle every other page downloads.
const CameraView = lazy(() => import("./CameraView.jsx"));

/*
  RehearsalStudio — RevaultAI (tier 1: the plan over time)
  Block a scene before spending a credit. Drag anyone at any moment and a
  keyframe is written there; everything between keyframes is interpolated.
  Switch cameras and the performance stays identical — only the angle moves.
*/

const DURATIONS = [4, 6, 8, 10, 15, 30];

// The hover note on each is the glossary: these are the words a filmmaker
// uses and a first-time visitor does not.
const LENSES = [
  [null, "Auto — the lens is chosen from how far away the camera is standing"],
  [18, "18mm — very wide. Takes in most of a room and stretches whatever is near the front"],
  [24, "24mm — wide. Room and people together, with the space still readable"],
  [28, "28mm — mildly wide. A common documentary lens"],
  [35, "35mm — close to the way the eye reads a room. The usual starting point"],
  [50, "50mm — natural. Faces look like themselves"],
  [75, "75mm — long. Flattens the face a little and softens what is behind it"],
  [100, "100mm — very long. Isolates a face against a background reduced to color"],
];

const HEIGHTS = [
  ["Floor", 0.4, "Camera on the floor, looking up — makes a person loom"],
  ["Low", 0.9, "Hip height. Slightly below the eye, which lends authority"],
  ["Eye", 1.55, "Standing eye height. Neutral, and what most scenes use"],
  ["High", 2.2, "Above the head, looking down — makes a person smaller"],
  ["Above", 3.6, "Well overhead, looking down on the whole floor"],
];

const ASPECT_CHOICES = [
  ["16:9", "Widescreen. What most video is"],
  ["2.39:1", "Anamorphic scope — the wide, letterboxed feature-film shape"],
  ["9:16", "Upright, for phones"],
  ["1:1", "Square"],
];

const styles = `
  .rs { max-width: 1240px; margin: 0 auto; padding: 0 48px; }
  .rs-label { font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: 0.18em; color: var(--accent-text); text-transform: uppercase; margin-bottom: 8px; }
  .rs-body { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); line-height: 1.8; }
  .rs-panel { border: 1px solid var(--border); border-radius: 8px; padding: 18px 20px; background: var(--surface); margin-bottom: 16px; }
  .rs-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .rs-btn { background: none; border: 1px solid var(--border); color: var(--muted); border-radius: 3px; padding: 7px 13px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.08em; cursor: pointer; }
  .rs-btn:hover { color: var(--text); border-color: var(--muted); }
  /* Selected has to read at a glance across forty chips, so it is filled
     rather than tinted. */
  .rs-btn.on { color: #fff; border-color: var(--accent); background: rgba(123,63,228,0.38); font-weight: 500; }
  .rs-btn:focus-visible, .rs-act-item:focus-visible { outline: 2px solid var(--accent-text); outline-offset: 2px; }
  /* The one action that leaves this page and spends money. */
  .rs-primary { color: #fff !important; background: var(--accent) !important; border-color: var(--accent) !important; font-weight: 500; }
  .rs-primary:hover { background: #8d52ee !important; color: #fff !important; }
  /* The timeline follows you down the page instead of scrolling away. */
  .rs-below { position: relative; }
  .rs-dock { position: sticky; bottom: 10px; z-index: 20; background: var(--surface); box-shadow: 0 -8px 26px rgba(0,0,0,0.5); }
  .rs-track { position: relative; height: 26px; margin: 10px 0 4px; }
  .rs-track input { position: absolute; inset: 0; width: 100%; accent-color: var(--accent); margin: 0; }
  .rs-tick { position: absolute; top: 0; width: 2px; height: 8px; background: var(--accent); transform: translateX(-1px); pointer-events: none; opacity: 0.8; }
  .rs-beat { position: absolute; top: 20px; transform: translateX(-50%); font-family: 'DM Mono', monospace; font-size: 10px; color: #E5B769; white-space: nowrap; pointer-events: none; letter-spacing: 0.06em; }
  .rs-time { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; color: var(--text); min-width: 70px; }
  .rs-cams { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 8px; }
  .rs-cam { border: 1px solid var(--border); border-radius: 5px; padding: 10px 12px; cursor: pointer; background: var(--bg); }
  .rs-cam.on { border-color: var(--accent); }
  .rs-act { border: 1px solid var(--border); border-radius: 6px; padding: 12px 14px; margin: 8px 0 4px; background: var(--bg); }
  .rs-act-cats { display: flex; gap: 6px; flex-wrap: wrap; margin: 10px 0; }
  .rs-act-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; max-height: 240px; overflow-y: auto; }
  .rs-act-item { text-align: left; background: none; border: 1px solid var(--border); border-radius: 4px; padding: 8px 10px; cursor: pointer; font-family: 'DM Mono', monospace; }
  .rs-act-item:hover { border-color: var(--muted); }
  .rs-act-item.on { border-color: var(--accent); }
  .rs-act-item b { display: block; font-size: 11px; font-weight: 500; color: var(--text); letter-spacing: 0.04em; }
  .rs-act-item span { display: block; font-size: 10px; color: var(--muted); margin-top: 3px; }
  .rs-act-none { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); padding: 14px 2px; }
  .rs-through { font-family: 'DM Mono', monospace; font-size: 11px; color: #E5B769; line-height: 1.8; margin: 2px 0 10px; }
  .rs-stage { position: fixed; inset: 0; z-index: 150; background: #0b0c10; display: flex; flex-direction: column; }
  .rs-stage-view { flex: 1; min-height: 0; position: relative; }
  .rs-stage-plan { position: absolute; left: 18px; bottom: 18px; width: 300px; max-width: 42vw; z-index: 2;
    background: rgba(14,15,20,0.92); border: 1px solid var(--border); border-radius: 8px; padding: 8px;
    backdrop-filter: blur(6px); max-height: 56vh; overflow-y: auto; }
  .rs-stage-bar { border-top: 1px solid var(--border); background: var(--surface); padding: 10px 18px;
    display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .rs-stage-top { position: absolute; top: 14px; right: 18px; z-index: 6; display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
  /* The panel button is dark gray on a 6%-white border — fine on a surface,
     invisible over the picture. Floating controls get their own contrast. */
  .rs-stage-top .rs-btn {
    background: rgba(10,11,16,0.86); color: rgba(255,255,255,0.86);
    border-color: rgba(255,255,255,0.28); backdrop-filter: blur(6px);
    box-shadow: 0 2px 10px rgba(0,0,0,0.45);
  }
  .rs-stage-top .rs-btn:hover { color: #fff; border-color: rgba(255,255,255,0.6); background: rgba(10,11,16,0.95); }
  .rs-stage-top .rs-btn.on { color: #fff; border-color: var(--accent); background: rgba(123,63,228,0.35); }
  .rs-stage-ctrl { position: absolute; top: 58px; right: 18px; z-index: 5; width: 340px; max-width: 46vw;
    background: rgba(12,13,18,0.95); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px;
    backdrop-filter: blur(8px); max-height: calc(100vh - 190px); overflow-y: auto; padding: 12px 14px;
    box-shadow: 0 8px 28px rgba(0,0,0,0.5); }
  .rs-stage-ctrl .rs-btn { color: rgba(255,255,255,0.88); border-color: rgba(255,255,255,0.26); }
  .rs-stage-ctrl .rs-btn:hover { color: #fff; border-color: rgba(255,255,255,0.65); }
  .rs-stage-ctrl .rs-btn.on { color: #fff; border-color: var(--accent); background: rgba(123,63,228,0.42); }
  .rs-stage-ctrl .rs-body { color: rgba(255,255,255,0.78); }
  .rs-stage-ctrl .rs-label { color: #C3AEF5; }
  .rs-stage-ctrl .rs-input { color: #fff; border-color: rgba(255,255,255,0.26); background: rgba(255,255,255,0.06); }
  .rs-stage-ctrl .rs-act { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.18); }
  .rs-stage-ctrl .rs-act-item { border-color: rgba(255,255,255,0.2); }
  .rs-stage-ctrl .rs-act-item b { color: #fff; }
  .rs-stage-ctrl .rs-act-item span { color: rgba(255,255,255,0.72); }
  .rs-stage-sec { margin-top: 14px; }
  @media (max-width: 860px) { .rs-stage-ctrl { width: auto; left: 10px; right: 10px; max-width: none; max-height: 44vh; top: 92px; } }
  .rs-stage-exit { color: #fff !important; border-color: var(--accent) !important; background: rgba(123,63,228,0.55) !important; font-weight: 500; }
  .rs-stage-exit:hover { background: var(--accent) !important; }
  .rs-walk-hint { position: absolute; top: 14px; left: 18px; z-index: 3; max-width: 340px;
    font-family: 'DM Mono', monospace; font-size: 11px; line-height: 1.8; color: rgba(255,255,255,0.85);
    background: rgba(14,15,20,0.78); border: 1px solid var(--border); border-radius: 6px; padding: 8px 11px; pointer-events: none; }
  .rs-stage-track { flex: 1; min-width: 160px; accent-color: var(--accent); }
  @media (max-width: 760px) { .rs-stage-plan { width: auto; left: 10px; right: 10px; max-width: none; max-height: 38vh; } }
  .rs-cam-n { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; color: var(--text); }
  .rs-cam-s { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); margin-top: 3px; }
  .rs-input { background: var(--bg); border: 1px solid var(--border); border-radius: 3px; padding: 6px 9px; font-family: 'DM Mono', monospace; font-size: 11px; color: var(--text); }
  .rs-views { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
  @media (max-width: 900px) { .rs-views { grid-template-columns: 1fr; } }
  @media (max-width: 760px) { .rs { padding: 0 20px; } }
`;

export default function RehearsalStudio({ initial, onChange, setGenPrefill, setPage, notify, onShoot, onCover, user, activeProject, controlsRef }) {
  /*
    What the studio opens on, decided once. A saved rehearsal wins, then
    whatever is in this browser from last time, and failing both a starter
    scene — because two people standing still on an empty floor tells a
    first-time visitor nothing about what this does.
  */
  const [boot] = useState(() => {
    if (initial) return { r: initial, from: "saved" };
    const d = loadDraft();
    if (d) return { r: d.rehearsal, from: "draft" };
    // The same scene the hero is playing, so the page is one thing rather
    // than two, and so both share one set's meshes.
    return { r: getStarter("dinner-argument").make(), from: "starter" };
  });
  const [r, setR] = useState(boot.r);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [beatText, setBeatText] = useState("");
  // Which performer's action picker is open, and how it's filtered.
  const [actFor, setActFor] = useState(null);
  const [actQuery, setActQuery] = useState("");
  const [actCat, setActCat] = useState(null);
  const [moveOpen, setMoveOpen] = useState(false);
  // The whole lot, full bleed — the plan rides on top of it rather than
  // beside it, so the room is the thing you're looking at.
  const [stage, setStage] = useState(false);
  const [planOpen, setPlanOpen] = useState(true);
  // The stage used to be a picture with nothing to change in it. These are
  // the controls that live inside it.
  const [ctrlOpen, setCtrlOpen] = useState(false);
  const [ctrlTab, setCtrlTab] = useState("Cameras");
  // Who is selected, shared by the plan and the 3D view so picking someone
  // in the room highlights them on the plan and opens their row here.
  const [selActor, setSelActor] = useState(null);
  const [boarding, setBoarding] = useState(false);
  // Walking the camera: held keys drive it, a drag turns it, and both write
  // the same keyframe a drag on the plan would. Refs rather than state —
  // these change every frame and nothing renders off them.
  const [walk, setWalk] = useState(false);
  // Looking at the cameras rather than through one of them.
  const [freeView, setFreeView] = useState(false);
  const held = useRef(new Set());
  const look = useRef(null);
  const [genSet, setGenSet] = useState(null);
  const [genFit, setGenFit] = useState(null);
  const [pendingShot, setPendingShot] = useState(null);
  const [shootNext, setShootNext] = useState(null);
  const shootRef = useRef(null);
  const [dressOpen, setDressOpen] = useState(false);
  const plateRef = useRef(null);
  const [mySets, setMySets] = useState([]);
  const [selPiece, setSelPiece] = useState(null);
  const [savingSet, setSavingSet] = useState(false);
  const room = activeRoom(r);
  // The cheapest model in the catalog sets the floor for this shot. The real
  // price depends on the model picked on the generate page, so the button
  // says "from" rather than naming a number it cannot know.
  const FLOOR = Math.min(...GEN_MODELS.map((m) => m.costPerSecond)) * r.duration;

  useEffect(() => {
    if (!user?.id) { setMySets([]); return; }
    supabase.from("user_sets").select("id, data, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(30)
      .then(({ data }) => setMySets(data ?? []));
  }, [user?.id]);

  async function saveMySet() {
    if (!user?.id) { notify?.("Sign in to keep your own sets."); return; }
    setSavingSet(true);
    const packed = packSet(r.setCustom);
    const existing = r.setCustom?.savedId ?? null;
    const saveNew = () => supabase.from("user_sets").insert({ user_id: user.id, project_id: activeProject?.id ?? null, data: packed }).select("id, data").single();
    let res = existing
      ? await supabase.from("user_sets").update({ data: packed, updated_at: new Date().toISOString() }).eq("id", existing).select("id, data").maybeSingle()
      : await saveNew();
    // The saved copy was deleted since this set was opened: keep it as a new one.
    if (existing && !res.error && !res.data) res = await saveNew();
    setSavingSet(false);
    if (res.error) { notify?.("Couldn't save: " + res.error.message); return; }
    setR((p) => ({ ...p, setCustom: { ...p.setCustom, savedId: res.data.id } }));
    setMySets((list) => [res.data, ...list.filter((s) => s.id !== res.data.id)]);
    notify?.(`"${packed.name}" saved — it's in your sets now.`);
  }
  const raf = useRef(null);
  const last = useRef(0);

  // Report every change upward so the page can save it.
  useEffect(() => { onChange?.(r); }, [r]);

  /*
    Keep the work in this browser as it changes, so a refresh or a closed
    tab does not throw it away. Debounced: a drag changes this on every
    frame and localStorage is synchronous. Failure is silent by design —
    see lib/rehearsalDraft.js.
  */
  const draftTimer = useRef(null);
  const sawFirst = useRef(false);
  useEffect(() => {
    /*
      The first pass is whatever the studio opened on, not something the
      visitor made. Skipping it means opening a shared link, or looking
      at a starter scene, never overwrites the draft you already had in
      this browser. The first real edit saves normally — by then you
      have chosen this scene.
    */
    if (!sawFirst.current) { sawFirst.current = true; return; }
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => saveDraft(r), 600);
    return () => { if (draftTimer.current) clearTimeout(draftTimer.current); };
  }, [r]);

  // Playback. Time advances in real seconds, and stops at the end.
  useEffect(() => {
    if (!playing) return;
    last.current = performance.now();
    const step = (now) => {
      const dt = (now - last.current) / 1000;
      last.current = now;
      setT((prev) => {
        const next = prev + dt;
        if (next >= r.duration) { setPlaying(false); return r.duration; }
        return next;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, r.duration]);

  // A generated set is stored on the rehearsal as "gen:<id>"; its asset links
  // are fetched fresh, because Marble hands them out per request.
  const genId = typeof r.setId === "string" && r.setId.startsWith("gen:") ? r.setId.slice(4) : null;
  useEffect(() => {
    if (!genId) { setGenSet(null); return; }
    if (genSet?.id === genId) return;
    let alive = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch("/api/set-status", {
        method: "POST",
        headers: { Authorization: "Bearer " + sess?.session?.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ setId: genId }),
      }).catch(() => null);
      const j = await res?.json().catch(() => ({}));
      if (!alive) return;
      if (j?.status === "ready") setGenSet({ id: genId, name: j.name, assets: j.assets });
      else notify?.(j?.status === "failed" ? "That set failed: " + (j.error || "no reason given")
        : j?.status === "processing" || j?.status === "queued" ? "That set is still building — it'll be ready to pick under Your sets in a few minutes."
        : "Couldn't load that set" + (j?.error ? " — " + j.error : "."));
    })();
    return () => { alive = false; };
  }, [genId]); // eslint-disable-line react-hooks/exhaustive-deps

  const now = stateAt(r, t);
  const nowRead = readStage(now.camera, now.actors);
  const activeCam = r.cameras.find((c) => c.id === r.activeCamera);
  // Two legal marks with something solid between them: nothing stops you
  // setting those, and the walk between them goes straight through it.
  const throughs = walkThroughs(r, room);

  // A drag on the plan becomes keyframes — but only for whoever actually moved.
  function onStageChange(next) {
    setR((prev) => {
      const cur = stateAt(prev, t);
      const moved = (a, b) => Math.abs(a.x - b.x) > 0.3 || Math.abs(a.y - b.y) > 0.3 ||
        Math.abs(((a.facing ?? a.rotation ?? 0) - (b.facing ?? b.rotation ?? 0) + 540) % 360 - 180) > 1;

      const actors = prev.actors.map((a, i) => {
        const n = next.actors[i]; const c = cur.actors[i];
        if (!n || !c || !moved(n, c)) return a;
        return setKey(a, t, { x: n.x, y: n.y, facing: n.facing, pose: c.pose, action: c.action ?? null });
      });

      let cameras = prev.cameras;
      if (moved(next.camera, cur.camera)) {
        cameras = prev.cameras.map((c) =>
          c.id === prev.activeCamera
            ? setKey(c, t, { x: next.camera.x, y: next.camera.y, rotation: next.camera.rotation })
            : c
        );
      }
      return { ...prev, actors, cameras };
    });
  }

  /*
    A drag in the picture lands exactly where a drag on the plan does: a
    keyframe at the playhead, with the same furniture in the way. The 3D view
    reports a point on the floor; everything after that is shared.
  */
  function dragTo(kind, id, p) {
    setR((prev) => {
      const cur = stateAt(prev, t);
      if (kind === "actor") {
        const i = prev.actors.findIndex((a) => a.id === id);
        if (i < 0) return prev;
        const c = cur.actors[i];
        const q = resolveMove(room, c, p, { radius: PERSON_RADIUS });
        if (Math.abs(q.x - c.x) < 0.05 && Math.abs(q.y - c.y) < 0.05) return prev;
        const actors = [...prev.actors];
        actors[i] = setKey(actors[i], t, {
          x: q.x, y: q.y, facing: c.facing, pose: c.pose, action: c.action ?? null,
        });
        return { ...prev, actors };
      }
      const cam = prev.cameras.find((x) => x.id === id);
      if (!cam) return prev;
      const c = stateAt({ ...prev, activeCamera: id }, t).camera;
      // Furniture stops a camera; walls do not. Same rule as the plan.
      const q = resolveMove(room, c, p, { radius: CAMERA_RADIUS, walls: false });
      if (Math.abs(q.x - c.x) < 0.05 && Math.abs(q.y - c.y) < 0.05) return prev;
      return {
        ...prev,
        cameras: prev.cameras.map((x) => (x.id !== id ? x : setKey(x, t, {
          x: q.x, y: q.y, rotation: c.rotation,
          height: c.height ?? cam.height ?? null,
          lens: c.lens ?? cam.lens ?? null,
        }))),
      };
    });
  }

  // Hand this angle to the generator: framing, lens, blocking and beats as a
  // prompt. The camera view stays here — it shows stand-ins, and a model given
  // that picture would copy the stand-ins.
  function shoot(cameraId) {
    const out = buildShootPrompt(r, cameraId);
    if (!out.ok) { notify?.("Point that camera at someone first."); return; }
    // The location picture is taken from the camera view, which shows the
    // selected camera. Shooting a different one selects it first, and the
    // shot goes ahead once the view has caught up.
    if (onShoot && (r.setId || r.setCustom) && cameraId !== r.activeCamera) {
      setShootNext(cameraId);
      setR((p) => ({ ...p, activeCamera: cameraId }));
      return;
    }
    if (onShoot) {
      const spec = buildShootSpec(r, cameraId);
      const setName = r.setName || genSet?.name || getSet(r.setId)?.name || null;
      const usingSet = (r.setId || r.setCustom) && cameraId === r.activeCamera;
      const plate = usingSet ? plateRef.current?.() : null;
      if (!plate) { onShoot({ ...out, spec, setName }); return; }
      // The render itself is never sent: a model shown a low-poly house makes a
      // low-poly film. It becomes a photograph first, and the creator approves it.
      const cam = r.cameras.find((c) => c.id === r.activeCamera);
      const key = [
        r.setCustom?.savedId || r.setId || "set",
        Math.round(now.camera.x), Math.round(now.camera.y), Math.round(now.camera.rotation),
        cam?.height ?? 1.55, cam?.lens ?? "auto",
        r.light?.preset ?? "default", r.light?.bearing ?? 300,
        (r.hiddenPieces ?? []).join("-"),
      ].join("|");
      const replacements = (room?.props ?? [])
        .filter((p) => p.asked)
        .map((p) => {
          const st = toStage(p.x, p.z);
          return { label: p.label || p.piece, asked: p.asked, where: sideOfFrame(now.camera, st) };
        });
      setPendingShot({ out, spec, setName, plate, cacheKey: key + "|" + replacements.map((x) => x.asked).join(","), note: setName || "", replacements });
      return;
    }
    setGenPrefill?.({ prompt: out.prompt, aspectRatio: out.aspect });
    notify?.(`Prompt built from ${out.camera}. Your rehearsal runs ${out.seconds}s — set the length to match.`);
    setPage?.("generate");
  }

  shootRef.current = shoot;
  useEffect(() => {
    if (!shootNext || r.activeCamera !== shootNext) return;
    // A moment for the view to redraw from the new camera — a generated set
    // also re-sorts itself for the new angle.
    const wait = setTimeout(() => { setShootNext(null); shootRef.current?.(shootNext); }, genId ? 500 : 150);
    return () => clearTimeout(wait);
  }, [shootNext, r.activeCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  function setPose(actorIndex, pose) {
    setR((prev) => {
      const s = stateAt(prev, t).actors[actorIndex];
      const actors = [...prev.actors];
      actors[actorIndex] = setKey(actors[actorIndex], t, { x: s.x, y: s.y, facing: s.facing, pose, action: s.action ?? null });
      return { ...prev, actors };
    });
  }

  // A direction, written at the playhead like any other mark. Where the action
  // only makes sense in one posture — driving, kneeling to work — the body
  // follows it rather than leaving the performer standing in a car seat.
  function setAction(actorIndex, actionId) {
    setR((prev) => {
      const s = stateAt(prev, t).actors[actorIndex];
      const actors = [...prev.actors];
      actors[actorIndex] = setKey(actors[actorIndex], t, {
        x: s.x, y: s.y, facing: s.facing,
        pose: actionPose(actionId) ?? s.pose,
        action: actionId,
      });
      return { ...prev, actors };
    });
  }

  // A move is written as two marks on the active camera and nothing more, so
  // it can be nudged, re-timed or half-deleted afterwards like any other.
  // It runs from the playhead to the end — or the whole shot, if you're
  // already standing at the end of it.
  function applyMove(moveId) {
    const cam = r.cameras.find((c) => c.id === r.activeCamera);
    if (!cam) return;
    const from = t >= r.duration - 0.5 ? 0 : t;
    const start = stateAt({ ...r, activeCamera: cam.id }, from).camera;
    const read = readStage(start, stateAt(r, from).actors);
    const subj = stateAt(r, from).actors.find((a) => a.name === read.subject) ?? null;
    const base = { height: start.height ?? cam.height ?? 1.55, lens: start.lens ?? cam.lens ?? 35 };

    const built = moveKeys(moveId, { start, subject: subj, base, from, to: r.duration });
    if (!built) {
      const m = CAMERA_MOVES.find((x) => x.id === moveId);
      notify?.(m?.needsSubject
        ? "Point that camera at someone first — an arc needs somebody to circle."
        : "That move has nowhere to go from here.");
      return;
    }

    setR((prev) => ({
      ...prev,
      cameras: prev.cameras.map((c) => {
        if (c.id !== prev.activeCamera) return c;
        // Clearing what came after keeps a second move from fighting the first.
        const kept = (c.keys ?? []).filter((k) => k.t < from - 0.2);
        const keys = [...kept, built.first, ...(built.last ? [built.last] : [])];
        return { ...c, keys: keys.sort((a, b) => a.t - b.t) };
      }),
    }));
    setMoveOpen(false);
    const label = CAMERA_MOVES.find((x) => x.id === moveId)?.label ?? "Move";
    notify?.(`${label} on ${cam.name}, ${from.toFixed(1)}s to ${r.duration}s. Press play to watch it.`);
  }

  // One place every walk input lands, so a key, a drag and a reset all write
  // the camera the same way.
  function nudgeCamera(fn) {
    setR((prev) => {
      const cam = prev.cameras.find((c) => c.id === prev.activeCamera);
      if (!cam) return prev;
      const at = stateAt(prev, t).camera;
      const next = fn({
        x: at.x, y: at.y, rotation: at.rotation,
        height: at.height ?? cam.height ?? 1.55,
      });
      if (!next) return prev;
      // Furniture stops a camera; walls do not. Same rule as the plan.
      const safe = resolveMove(room, { x: at.x, y: at.y }, { x: next.x, y: next.y },
        { radius: CAMERA_RADIUS, walls: false });
      return {
        ...prev,
        cameras: prev.cameras.map((c) => (c.id !== prev.activeCamera ? c : setKey(c, t, {
          x: safe.x, y: safe.y,
          rotation: (next.rotation + 360) % 360,
          height: next.height,
          lens: at.lens ?? cam.lens ?? null,
        }))),
      };
    });
  }

  function driveCamera({ fwd = 0, side = 0, rise = 0 }) {
    nudgeCamera((cur) => {
      const a = (cur.rotation * Math.PI) / 180;
      // Bearing 0 looks up the plan, so forward is (sin, -cos).
      const f = { x: Math.sin(a), y: -Math.cos(a) };
      const g = { x: Math.cos(a), y: Math.sin(a) };
      return {
        x: cur.x + f.x * fwd + g.x * side,
        y: cur.y + f.y * fwd + g.y * side,
        rotation: cur.rotation,
        height: Math.max(0.2, Math.min(6, cur.height + rise)),
      };
    });
  }

  function turnCamera(dDeg) {
    nudgeCamera((cur) => ({ ...cur, rotation: cur.rotation + dDeg }));
  }

  // Lost in the room: point the camera back at whoever the scene is about.
  function aimAtSubject() {
    const s = stateAt(r, t);
    const read = readStage(s.camera, s.actors);
    const subj = s.actors.find((a) => a.name === read.subject) ?? s.actors[0];
    if (!subj) { notify?.("Nobody on the stage to look at yet."); return; }
    nudgeCamera((cur) => ({
      ...cur,
      rotation: (Math.atan2(subj.x - cur.x, -(subj.y - cur.y)) * 180) / Math.PI,
    }));
  }

  // Back to where this camera started the shot.
  function resetCamera() {
    setR((prev) => {
      const cam = prev.cameras.find((c) => c.id === prev.activeCamera);
      const first = cam?.keys?.[0];
      if (!first) return prev;
      return {
        ...prev,
        cameras: prev.cameras.map((c) => (c.id !== prev.activeCamera ? c : setKey(c, t, {
          x: first.x, y: first.y, rotation: first.rotation,
          height: first.height ?? null, lens: first.lens ?? null,
        }))),
      };
    });
    notify?.("Camera back where the shot starts.");
  }

  // A scene that is already blocked, so the first thing anyone sees is
  // movement rather than an empty floor.
  function loadStarter(id) {
    const st = getStarter(id);
    if (!st) return;
    setR(st.make());
    setT(0);
    setPlaying(false);
    setSelActor(null);
    setActFor(null);
    setMoveOpen(false);
    notify?.(`${st.name} loaded — press play.`);
  }

  /*
    The hero's call to action sits on the page, above this component, so it
    needs a way in. Same shape as plateRef: a ref the parent holds and this
    fills, reassigned every render so the handles are never stale.
  */
  useEffect(() => {
    if (!controlsRef) return;
    controlsRef.current = {
      openStage: () => setStage(true),
      loadStarter,
      playFromStart: () => { setT(0); setPlaying(true); },
    };
    return () => { controlsRef.current = null; };
  });

  /*
    A storyboard of this moment: one frame per camera, captioned with what
    each one is actually seeing, on a single sheet.

    Capturing a camera means being that camera, so this selects each one in
    turn and waits for the picture to catch up before reading the canvas —
    two animation frames and a beat, the same wait the shoot path uses. The
    selection is put back where it was afterwards, including if a frame
    throws halfway through.
  */
  const settle = (ms) => new Promise((done) => {
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, ms)));
  });

  async function exportStoryboard() {
    if (boarding) return;
    if (!plateRef.current) { notify?.("The camera view is still loading — try again in a moment."); return; }
    const cams = r.cameras ?? [];
    if (!cams.length) return;
    const was = r.activeCamera;
    const wait = genId ? 500 : 200;
    setBoarding(true);
    setPlaying(false);
    const frames = [];
    try {
      for (const cam of cams) {
        setR((p) => (p.activeCamera === cam.id ? p : { ...p, activeCamera: cam.id }));
        await settle(wait);
        const url = plateRef.current?.({ withPerformers: true });
        if (!url) continue;
        const shot = stateAt({ ...r, activeCamera: cam.id }, t);
        const read = readStage(shot.camera, shot.actors);
        frames.push({
          url,
          name: cam.name,
          caption: read.subject
            ? `${read.shotSize} · ${read.lens} on ${read.subject} · ${t.toFixed(1)}s`
            : `Framing nobody · ${t.toFixed(1)}s`,
        });
      }
      if (!frames.length) { notify?.("Nothing came back from the camera view."); return; }
      const blob = await buildSheet({
        frames,
        title: r.title || "Rehearsal",
        note: `${frames.length} ${frames.length === 1 ? "angle" : "angles"} at ${t.toFixed(1)}s of ${r.duration}s`
          + (r.setName || getSet(r.setId)?.name ? ` · ${r.setName || getSet(r.setId).name}` : ""),
      });
      download(blob, sheetName(r.title));
      notify?.(`Storyboard saved — ${frames.length} ${frames.length === 1 ? "frame" : "frames"}.`);
    } catch (e) {
      notify?.("Could not build the storyboard: " + (e?.message || "unknown reason"));
    } finally {
      setR((p) => (p.activeCamera === was ? p : { ...p, activeCamera: was }));
      setBoarding(false);
    }
  }

  function clearKeyHere() {
    setR((prev) => ({
      ...prev,
      actors: prev.actors.map((a) => (a.keys.length > 1 ? removeKey(a, t) : a)),
      cameras: prev.cameras.map((c) => (c.id === prev.activeCamera && c.keys.length > 1 ? removeKey(c, t) : c)),
    }));
  }

  function addBeat() {
    const label = beatText.trim();
    if (!label) return;
    setR((prev) => ({ ...prev, beats: [...(prev.beats ?? []), { t, label: label.slice(0, 40) }].sort((a, b) => a.t - b.t) }));
    setBeatText("");
  }

  useEffect(() => {
    if (!stage) return;
    const onKey = (e) => { if (e.key === "Escape") setStage(false); };
    window.addEventListener("keydown", onKey);
    // Nothing behind should scroll while the stage is up.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [stage]);

  /*
    The stage is a view, not a page — but Back is what anyone reaches for to
    leave something full screen, and with no entry of our own that walks off
    the site, which on unsaved blocking means the browser's own "Leave site?"
    prompt. One pushed entry turns Back into the way out.
  */
  useEffect(() => {
    if (!stage) return;
    window.history.pushState({ rsStage: true }, "");
    const pop = () => setStage(false);
    window.addEventListener("popstate", pop);
    return () => {
      window.removeEventListener("popstate", pop);
      // Left by the button or by Escape: take our entry back off the stack.
      // If Back is what closed it, the entry is already gone.
      if (window.history.state?.rsStage) window.history.back();
    };
  }, [stage]);

  /*
    Driving the shot camera, not a separate scouting one. Looking through the
    lens and adjusting is how an angle actually gets found, and the camera you
    are flying had better be the camera that shoots. Every change lands as a
    keyframe at the playhead, exactly as dragging on the plan does.
  */
  useEffect(() => {
    if (!stage || !walk) { held.current.clear(); return; }
    const MOVE = 9;        // stage units a second — a brisk walk
    const RISE = 1.1;      // meters a second
    const KEYS = new Set(["w", "a", "s", "d", "q", "e", "shift", "r"]);
    const keysHeld = held.current;

    const down = (ev) => {
      const k = ev.key.toLowerCase();
      if (!KEYS.has(k)) return;
      ev.preventDefault();
      if (k === "r") { aimAtSubject(); return; }
      keysHeld.add(k);
    };
    const up = (ev) => keysHeld.delete(ev.key.toLowerCase());

    let raf = 0, last = null;
    const step = (now) => {
      const dt = last == null ? 0 : Math.min(0.05, (now - last) / 1000);
      last = now;
      const h = keysHeld;
      const fwd = (h.has("w") ? 1 : 0) - (h.has("s") ? 1 : 0);
      const side = (h.has("d") ? 1 : 0) - (h.has("a") ? 1 : 0);
      const rise = (h.has("e") ? 1 : 0) - (h.has("q") ? 1 : 0);
      if (dt > 0 && (fwd || side || rise)) {
        const fast = h.has("shift") ? 2.1 : 1;
        driveCamera({ fwd: fwd * MOVE * fast * dt, side: side * MOVE * fast * dt, rise: rise * RISE * fast * dt });
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      keysHeld.clear();
    };
  }, [stage, walk, t, r.duration]); // eslint-disable-line react-hooks/exhaustive-deps

  const ticks = keyTimes(r);
  const hereHasKey = ticks.some((k) => Math.abs(k - t) < 0.2);

  // What each camera sees right now — the compare-the-angles readout.
  const camReads = r.cameras.map((c) => {
    const s = stateAt({ ...r, activeCamera: c.id }, t);
    return { id: c.id, name: c.name, read: readStage(s.camera, s.actors) };
  });

  const planProps = {
    camera: now.camera, actors: now.actors, onChange: onStageChange, set: room, extent: genFit,
    extras: r.extras ?? [],
    onExtrasChange: (next) => setR((p) => ({ ...p, extras: next })),
    selectedPiece: selPiece,
    onSelectPiece: setSelPiece,
    selectedActor: selActor,
    onSelectActor: setSelActor,
    onSetChange: r.setCustom ? (id, change) => setR((p) => ({
      ...p,
      setCustom: {
        ...p.setCustom,
        walls: (p.setCustom.walls ?? []).map((w) => (w.id === id ? { ...w, ...change } : w)),
        props: (p.setCustom.props ?? []).map((q) => (q.id === id ? { ...q, ...change } : q)),
      },
    })) : null,
  };
  const rigList = r.cameras.map((c) => {
    const cs = stateAt({ ...r, activeCamera: c.id }, t).camera;
    return {
      id: c.id, name: c.name,
      x: cs.x, y: cs.y, rotation: cs.rotation,
      height: cs.height ?? c.height ?? null,
      lens: cs.lens ?? c.lens ?? null,
      active: c.id === r.activeCamera,
    };
  });

  const viewProps = {
    state: motionState(r, t),
    lens: nowRead.lens,
    subject: nowRead.subject,
    aspect: r.aspect ?? "16:9",
    setId: genId ? null : r.setId ?? null,
    setData: room,
    light: r.light ?? defaultLight(),
    hiddenPieces: r.hiddenPieces ?? [],
    extras: r.extras ?? [],
    height: now.camera.height ?? r.cameras.find((c) => c.id === r.activeCamera)?.height ?? null,
    lensMmOverride: now.camera.lens ?? r.cameras.find((c) => c.id === r.activeCamera)?.lens ?? null,
    genSet: genSet,
    plateRef: plateRef,
    setScale: r.setScale,
    setGround: r.setGround,
    onSetError: (m) => notify?.("Couldn't show that set — " + m),
    onSetFit: (fit) => {
                setGenFit(fit);
                // Start the camera inside the room rather than behind it.
                setR((p) => {
                  const cam = p.cameras.find((c) => c.id === p.activeCamera);
                  const first = cam?.keys?.[0];
                  if (!first) return p;
                  // Stand the camera just inside the back of the room, looking in.
                  const y = 50 + Math.max(1.2, Math.min(fit.maxZ - 0.6, 3.2)) * 5;
                  const x = 50 + Math.max(fit.minX + 0.4, Math.min(fit.maxX - 0.4, 0)) * 5;
                  const inRoom = first.y < 50 + (fit.maxZ + 0.4) * 5 && first.y > 50 + (fit.minZ - 0.4) * 5;
                  if (inRoom) return p;
                  return { ...p, cameras: p.cameras.map((c) => c.id !== p.activeCamera ? c
                    : { ...c, keys: c.keys.map((k, i) => (i === 0 ? { ...k, x, y, rotation: 0 } : k)) }) };
                });
              },
    title: `${activeCam?.name ?? "Camera"}${nowRead.shotSize ? " · " + nowRead.shotSize : ""}`,
    rigs: rigList,
    onPickCamera: (id) => setR((p) => ({ ...p, activeCamera: id })),
    onPickActor: setSelActor,
    onDragTo: dragTo,
    selectedActor: selActor,
  };

  /*
    One definition per control, shared by the studio page and the stage
    panel. Two copies of a lens row are two copies that drift apart.
  */
  function lensButtons() {
    const cam = r.cameras.find((c) => c.id === r.activeCamera);
    return LENSES.map(([mm, note]) => (
      <button key={String(mm)} className={"rs-btn" + ((cam?.lens ?? null) === mm ? " on" : "")}
        title={note}
        onClick={() => setR((p) => ({ ...p, cameras: p.cameras.map((c) => c.id === p.activeCamera ? { ...c, lens: mm } : c) }))}>
        {mm ? mm + "mm" : "Auto"}
      </button>
    ));
  }

  function heightButtons() {
    const cam = r.cameras.find((c) => c.id === r.activeCamera);
    return HEIGHTS.map(([label, h, note]) => (
      <button key={label} className={"rs-btn" + (Math.abs((cam?.height ?? 1.55) - h) < 0.01 ? " on" : "")}
        title={note}
        onClick={() => setR((p) => ({ ...p, cameras: p.cameras.map((c) => c.id === p.activeCamera ? { ...c, height: h } : c) }))}>
        {label}
      </button>
    ));
  }

  function aspectButtons() {
    return ASPECT_CHOICES.map(([a, note]) => (
      <button key={a} className={"rs-btn" + ((r.aspect ?? "16:9") === a ? " on" : "")} title={note}
        onClick={() => setR((p) => ({ ...p, aspect: a }))}>{a}</button>
    ));
  }

  function lightButtons() {
    return (
      <>
        {LIGHT_PRESETS.map((p) => (
          <button key={p.id} title={p.note}
            className={"rs-btn" + ((r.light?.preset ?? defaultLight().preset) === p.id ? " on" : "")}
            onClick={() => setR((prev) => ({ ...prev, light: { ...(prev.light ?? defaultLight()), preset: p.id } }))}>
            {p.label}
          </button>
        ))}
        <span className="rs-body" style={{ fontSize: 11, marginLeft: 6 }}>From</span>
        <input type="range" min={0} max={359} step={5}
          aria-label="Which direction the light comes from"
          value={r.light?.bearing ?? defaultLight().bearing}
          onChange={(e) => setR((prev) => ({ ...prev, light: { ...(prev.light ?? defaultLight()), bearing: Number(e.target.value) } }))}
          style={{ width: 130, accentColor: "var(--accent)" }} />
        <span className="rs-body" style={{ fontSize: 11 }}>{r.light?.bearing ?? defaultLight().bearing}°</span>
      </>
    );
  }

  function setButtons() {
    return (
      <>
        <button className={"rs-btn" + (!r.setId && !r.setCustom ? " on" : "")}
          onClick={() => setR((p) => ({ ...p, setId: null, setName: null, setCustom: null }))}>Empty stage</button>
        {r.setId && !genId && !r.setCustom && (
          <button className="rs-btn" onClick={() => setR((p) => ({ ...p, setCustom: startEditing(getSet(p.setId)) }))}>Dress this set →</button>
        )}
        {mySets.map((s) => (
          <button key={s.id} className={"rs-btn" + (r.setCustom?.savedId === s.id ? " on" : "")}
            onClick={() => { const u = unpackSet(s); setR((p) => ({ ...p, setCustom: u, setId: null, setName: u.name })); }}>
            {s.data?.name || "My set"}
          </button>
        ))}
        {[...SETS, ...EXTERIORS].map((s) => (
          <button key={s.id} className={"rs-btn" + (r.setId === s.id ? " on" : "")} title={s.note}
            onClick={() => setR((p) => ({ ...p, setId: s.id, setName: null, setCustom: null }))}>{s.name}</button>
        ))}
      </>
    );
  }

  // The action picker, used by the performer row on the page and by the
  // same row inside the stage.
  function actionPicker(i, a) {
    return (
            <div className="rs-act">
              <div className="rs-row">
                <input
                  className="rs-input"
                  value={actQuery}
                  autoFocus
                  onChange={(e) => setActQuery(e.target.value)}
                  placeholder={`What is ${a.name} doing at ${t.toFixed(1)}s?`}
                  style={{ flex: 1, minWidth: 200 }}
                />
                <button className="rs-btn" onClick={() => setActFor(null)}>close</button>
              </div>

              <div className="rs-act-cats">
                <button className={"rs-btn" + (actCat === null ? " on" : "")} onClick={() => setActCat(null)}>all</button>
                {ACTION_CATEGORIES.map((c) => (
                  <button key={c} className={"rs-btn" + (actCat === c ? " on" : "")} onClick={() => setActCat(actCat === c ? null : c)}>{c}</button>
                ))}
              </div>

              <div className="rs-act-grid">
                {searchActions(actQuery, actCat).map((act) => (
                  <button
                    key={act.id}
                    className={"rs-act-item" + (a.action === act.id ? " on" : "")}
                    onClick={() => { setAction(i, act.id); setActFor(null); }}
                  >
                    <b>{act.label}</b>
                    <span>{act.cat}{act.pose ? ` · ${act.pose}` : ""}{act.travel ? " · while moving" : ""}</span>
                  </button>
                ))}
              </div>
              {searchActions(actQuery, actCat).length === 0 && (
                <div className="rs-act-none">Nothing matches that. Try a different word, or clear the category.</div>
              )}

              <div className="rs-body" style={{ fontSize: 10, marginTop: 10, opacity: 0.8 }}>
                Set at {t.toFixed(1)}s and held until you change it. A one-off — a punch, sitting down —
                plays once from here. Anything on the spot pauses while they walk and resumes at the mark.
              </div>
            </div>
    );
  }

  if (stage) {
    return (
      <div className="rs-stage">
        <style>{styles}</style>

        <div
          className="rs-stage-view"
          style={walk ? { cursor: "grab" } : undefined}
          onPointerDown={(e) => {
            if (!walk || e.target.closest(".rs-stage-plan, .rs-stage-top, .rs-stage-ctrl")) return;
            look.current = { x: e.clientX };
            e.currentTarget.setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!walk || !look.current) return;
            const dx = e.clientX - look.current.x;
            if (!dx) return;
            look.current = { x: e.clientX };
            turnCamera(dx * 0.22);
          }}
          onPointerUp={() => { look.current = null; }}
          onPointerCancel={() => { look.current = null; }}
        >
          <div className="rs-stage-top">
            <button
              className={"rs-btn" + (freeView ? " on" : "")}
              onClick={() => { setFreeView((v) => !v); setWalk(false); }}
            >
              {freeView ? `Look through ${activeCam?.name ?? "the camera"}` : "See the cameras"}
            </button>
            {!freeView && (
              <button
                className={"rs-btn" + (walk ? " on" : "")}
                onClick={() => { setWalk((v) => !v); setPlaying(false); }}
              >
                {walk ? "Stop walking" : "Walk the camera"}
              </button>
            )}
            {(walk || freeView) && (
              <button className="rs-btn" onClick={aimAtSubject}
                title="Turn the camera to face whoever the scene is about.">
                Face the subject{walk ? "  ·  r" : ""}
              </button>
            )}
            {(walk || freeView) && (
              <button className="rs-btn" onClick={resetCamera}
                title="Put the camera back where this shot starts — its first mark on the timeline.">
                Reset view
              </button>
            )}
            <button className={"rs-btn" + (ctrlOpen ? " on" : "")} onClick={() => setCtrlOpen((v) => !v)}>
              {ctrlOpen ? "Hide controls" : "Controls"}
            </button>
            <button className={"rs-btn" + (planOpen ? " on" : "")} onClick={() => setPlanOpen((v) => !v)}>
              {planOpen ? "Hide plan" : "Show plan"}
            </button>
            <button className="rs-btn rs-stage-exit" onClick={() => setStage(false)}>← Back to the studio  ·  esc</button>
          </div>

          {freeView && (
            <div className="rs-walk-hint">
              Drag to walk around the set · scroll to come closer · click a camera to make it the one you shoot.
              {r.cameras.length === 1
                ? " You have one camera — add another under Controls to compare angles."
                : ` ${r.cameras.length} cameras on this scene.`}
            </div>
          )}

          {walk && !freeView && (
            <div className="rs-walk-hint">
              W A S D to move · Q E down and up · shift to hurry · drag to look · R to face the subject.
              You are flying {activeCam?.name ?? "the camera"} — everything lands as a mark at {t.toFixed(1)}s.
            </div>
          )}

          {ctrlOpen && (
            <div className="rs-stage-ctrl">
              <div className="rs-row">
                {["Cameras", "Performers", "Set", "Light"].map((tab) => (
                  <button key={tab} className={"rs-btn" + (ctrlTab === tab ? " on" : "")}
                    onClick={() => setCtrlTab(tab)}>{tab}</button>
                ))}
              </div>

              {ctrlTab === "Cameras" && (
                <>
                  <div className="rs-label rs-stage-sec">Cameras — same performance, different angle</div>
                  <div className="rs-row">
                    {camReads.map((c) => (
                      <button key={c.id} className={"rs-btn" + (c.id === r.activeCamera ? " on" : "")}
                        title={c.read.shotSize ? `${c.read.shotSize} · ${c.read.lens}${c.read.subject ? " on " + c.read.subject : ""}` : "Not framing anyone"}
                        onClick={() => setR((q) => ({ ...q, activeCamera: c.id }))}>{c.name}</button>
                    ))}
                    {r.cameras.length < 4 && (
                      <button className="rs-btn" onClick={() => setR((q) => addCamera(q, now.camera))}>+ Camera</button>
                    )}
                  </div>
                  <div className="rs-body" style={{ fontSize: 11, marginTop: 8 }}>
                    {nowRead.shotSize
                      ? `${activeCam?.name ?? "Camera"} — ${nowRead.shotSize} · ${nowRead.lens}${nowRead.subject ? " on " + nowRead.subject : ""}`
                      : `${activeCam?.name ?? "Camera"} is not framing anyone yet. Drag it in the room, or turn it by the ring on the plan.`}
                  </div>
                  <div className="rs-row rs-stage-sec">
                    <button className="rs-btn" onClick={aimAtSubject}>Face the subject</button>
                    <button className="rs-btn" disabled={boarding} onClick={exportStoryboard}>
                      {boarding ? "Drawing…" : "Export storyboard"}
                    </button>
                    <button className="rs-btn" onClick={resetCamera}>Reset view</button>
                  </div>
                  <div className="rs-label rs-stage-sec">Lens</div>
                  <div className="rs-row">{lensButtons()}</div>
                  <div className="rs-label rs-stage-sec">Height</div>
                  <div className="rs-row">{heightButtons()}</div>
                  <div className="rs-label rs-stage-sec">Frame</div>
                  <div className="rs-row">{aspectButtons()}</div>
                  <div className="rs-row rs-stage-sec">
                    <button className={"rs-btn" + (moveOpen ? " on" : "")} onClick={() => setMoveOpen((v) => !v)}>
                      {moveOpen ? "Close moves" : "Give this camera a move"}
                    </button>
                  </div>
                  {moveOpen && (
                    <div className="rs-act">
                      <div className="rs-body" style={{ fontSize: 11, marginBottom: 2 }}>
                        Runs on {activeCam?.name ?? "the selected camera"} from {(t >= r.duration - 0.5 ? 0 : t).toFixed(1)}s
                        to {r.duration}s, as two marks you can drag afterwards.
                      </div>
                      {MOVE_CATEGORIES.map((cat) => (
                        <div key={cat} style={{ marginTop: 10 }}>
                          <div className="rs-label" style={{ marginBottom: 6 }}>{cat}</div>
                          <div className="rs-act-grid" style={{ maxHeight: "none", gridTemplateColumns: "1fr 1fr" }}>
                            {CAMERA_MOVES.filter((m) => m.cat === cat).map((m) => (
                              <button key={m.id} className="rs-act-item"
                                disabled={m.needsSubject && !nowRead.subject}
                                style={m.needsSubject && !nowRead.subject ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                                onClick={() => applyMove(m.id)}>
                                <b>{m.label}</b>
                                <span>{m.needsSubject && !nowRead.subject ? "Needs someone in frame" : m.note}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {ctrlTab === "Performers" && (
                <>
                  <div className="rs-row rs-stage-sec" style={{ justifyContent: "space-between" }}>
                    <div className="rs-label" style={{ marginBottom: 0 }}>Performers at {t.toFixed(1)}s</div>
                    {r.actors.length < MAX_ACTORS && (
                      <button className="rs-btn" onClick={() => setR((q) => addActor(q))}>+ Performer</button>
                    )}
                  </div>
                  <div className="rs-body" style={{ fontSize: 11, marginTop: 6 }}>
                    Click anyone in the room to select them, or drag them straight to a new mark.
                  </div>
                  {now.actors.map((a, i) => (
                    <div key={a.id} style={{ marginTop: 10, paddingTop: 10, borderTop: i ? "1px solid rgba(255,255,255,0.12)" : "none" }}>
                      <div className="rs-row">
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: a.color, display: "inline-block",
                          outline: selActor === a.id ? "2px solid #fff" : "none", outlineOffset: 1 }} />
                        <input className="rs-input" value={a.name}
                          onFocus={() => setSelActor(a.id)}
                          onChange={(e) => setR((q) => ({ ...q, actors: q.actors.map((x, j) => (j === i ? { ...x, name: e.target.value.slice(0, 24) } : x)) }))}
                          style={{ width: 92, padding: "4px 7px", fontSize: 11 }} />
                        {["stand", "sit", "crouch"].map((pose) => (
                          <button key={pose} className={"rs-btn" + (a.pose === pose ? " on" : "")} onClick={() => setPose(i, pose)}>{pose}</button>
                        ))}
                        {r.actors.length > 1 && (
                          <button className="rs-btn" title={`Take ${a.name} out of the scene`} style={{ marginLeft: "auto" }}
                            onClick={() => { if (actFor === i) setActFor(null); setR((q) => removeActor(q, a.id)); }}>remove</button>
                        )}
                      </div>
                      <div className="rs-row" style={{ marginTop: 6 }}>
                        <button className={"rs-btn" + (a.action ? " on" : "")}
                          onClick={() => { setActFor(actFor === i ? null : i); setActQuery(""); setActCat(null); }}>
                          {a.action ? actionLabel(a.action) : "+ action"}
                        </button>
                        {a.action && <button className="rs-btn" title="Back to no direction" onClick={() => setAction(i, null)}>clear</button>}
                        {BODIES.map((b) => {
                          const cur = r.actors[i]?.body ?? defaultBody(i);
                          return <button key={b} className={"rs-btn" + (cur === b ? " on" : "")}
                            onClick={() => setR((q) => ({ ...q, actors: q.actors.map((x, j) => (j === i ? { ...x, body: b } : x)) }))}>{b}</button>;
                        })}
                      </div>
                      {actFor === i && actionPicker(i, a)}
                    </div>
                  ))}
                  {throughs.length > 0 && (
                    <div className="rs-through" style={{ marginTop: 12 }}>
                      {throughs.slice(0, 3).map((w, k) => (
                        <div key={k}>{w.name} walks through {w.label} between {w.from.toFixed(1)}s and {w.to.toFixed(1)}s.</div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {ctrlTab === "Set" && (
                <>
                  <div className="rs-label rs-stage-sec">Set</div>
                  <div className="rs-row">{setButtons()}</div>
                  <div className="rs-label rs-stage-sec">Background</div>
                  <div className="rs-row">
                    <button className="rs-btn" onClick={() => setR((q) => {
                      const x = 30 + Math.round(Math.random() * 40), y = 26 + Math.round(Math.random() * 30);
                      return { ...q, extras: [...(q.extras ?? []), { id: crypto.randomUUID(), x, y, facing: Math.round(Math.random() * 360) }] };
                    })}>+ Add a person</button>
                    {(r.extras ?? []).length > 0 && (
                      <>
                        <span className="rs-body" style={{ fontSize: 11 }}>{r.extras.length} in the background</span>
                        <button className="rs-btn" onClick={() => setR((q) => ({ ...q, extras: (q.extras ?? []).slice(0, -1) }))}>Remove one</button>
                      </>
                    )}
                  </div>
                  <div className="rs-body" style={{ fontSize: 11, marginTop: 10 }}>
                    Moving the furniture and saying what things really are is back on the studio page.
                  </div>
                </>
              )}

              {ctrlTab === "Light" && (
                <>
                  <div className="rs-label rs-stage-sec">Light</div>
                  <div className="rs-row">{lightButtons()}</div>
                  <div className="rs-body" style={{ fontSize: 11, marginTop: 10 }}>
                    The preset sets the quality and color of the light; From swings it around the room.
                    Both carry into the shot you generate.
                  </div>
                </>
              )}
            </div>
          )}

          <Suspense fallback={<div className="rs-body" style={{ padding: 20 }}>Loading the camera view…</div>}>
            <CameraView {...viewProps} fill free={freeView} />
          </Suspense>

          {planOpen && (
            <div className="rs-stage-plan">
              <StageBlueprint {...planProps} />
            </div>
          )}
        </div>

        <div className="rs-stage-bar">
          <button className="rs-btn" onClick={() => { setT(0); setPlaying(false); }}>⏮</button>
          <button className={"rs-btn" + (playing ? " on" : "")} onClick={() => { if (t >= r.duration) setT(0); setPlaying((p) => !p); }}>
            {playing ? "Pause" : "Play"}
          </button>
          <span className="rs-time">{t.toFixed(1)}s</span>
          <input type="range" className="rs-stage-track" min={0} max={r.duration} step={0.1}
            value={t} onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }} />
          {camReads.map((c) => (
            <button key={c.id} className={"rs-btn" + (c.id === r.activeCamera ? " on" : "")}
              onClick={() => setR((p) => ({ ...p, activeCamera: c.id }))}>
              {c.name}
            </button>
          ))}
          {nowRead.subject && (setGenPrefill || onShoot) && (
            <button
              className="rs-btn rs-primary"
              title={`Hands this angle to the generator as a written shot. From ${FLOOR} credits for ${r.duration}s depending on the model you pick${(r.setId || r.setCustom) ? ", plus 2 for the location plate" : ""}.`}
              onClick={() => shoot(r.activeCamera)}
            >
              Shoot this angle · from {FLOOR} credits →
            </button>
          )}
        </div>

        {pendingShot && (
          <PlateApproval
            pending={pendingShot}
            activeProject={activeProject}
            notify={notify}
            onCancel={() => setPendingShot(null)}
            onUse={(url) => {
              const q = pendingShot;
              setPendingShot(null);
              onShoot({ ...q.out, spec: q.spec, setName: q.setName, plateUrl: url });
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="rs">
      <style>{styles}</style>

      <div className="rs-panel">
        <div className="rs-row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
          <input
            className="rs-input"
            value={r.title}
            onChange={(e) => setR((p) => ({ ...p, title: e.target.value.slice(0, 80) }))}
            style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, minWidth: 220, flex: 1 }}
          />
          <div className="rs-row">
            <span className="rs-body" style={{ fontSize: 10 }}>Length</span>
            {DURATIONS.map((d) => (
              <button key={d} className={"rs-btn" + (r.duration === d ? " on" : "")} onClick={() => { setR((p) => ({ ...p, duration: d })); if (t > d) setT(d); }}>{d}s</button>
            ))}
            <button className="rs-btn rs-primary" style={{ marginLeft: 6 }}
              title="The same scene, full screen: walk the camera through the room, see your cameras from outside, and change anything from in there."
              onClick={() => setStage(true)}>Step onto the set →</button>
          </div>
        </div>

        <div className="rs-row" style={{ marginTop: 14, alignItems: "center" }}>
          <span className="rs-body" style={{ fontSize: 11 }}>Start from</span>
          {STARTERS.map((st) => (
            <button key={st.id} className="rs-btn" title={st.note} onClick={() => loadStarter(st.id)}>
              {st.name}
            </button>
          ))}
          <button
            className="rs-btn"
            title="Two performers on an empty floor, nothing blocked"
            onClick={() => { setR(newRehearsal()); setT(0); setPlaying(false); setSelActor(null); setActFor(null); }}
          >
            Empty scene
          </button>
        </div>

        <div className="rs-body" style={{ fontSize: 11, marginTop: 10 }}>
          {boot.from === "draft" ? "Picked up where you left off. " : ""}
          Your blocking is saved in this browser as you work
          {user ? "." : " — sign in to keep it for good and open it on any machine."}
        </div>
      </div>

      <div className="rs-views">
        <StageBlueprint {...planProps} />
        <div>
          <Suspense fallback={<div className="rs-body" style={{ padding: 20 }}>Loading the camera view…</div>}>
            <CameraView {...viewProps} />
          </Suspense>
          <div className="rs-row" style={{ marginTop: 10 }}>
            <span className="rs-body" style={{ fontSize: 10 }}>Set</span>
            {setButtons()}
          </div>
          <GeneratedSets
            user={user}
            activeProject={activeProject}
            notify={notify}
            selectedId={genId}
            onPick={(id, name) => setR((p) => ({ ...p, setId: "gen:" + id, setName: name, setCustom: null }))}
          />
          {pendingShot && (
            <PlateApproval
              pending={pendingShot}
              activeProject={activeProject}
              notify={notify}
              onCancel={() => setPendingShot(null)}
              onUse={(url) => {
                const p = pendingShot;
                setPendingShot(null);
                onShoot({ ...p.out, spec: p.spec, setName: p.setName, plateUrl: url });
              }}
            />
          )}
          {r.setCustom && (
            <SetEditor
              room={r.setCustom}
              onChange={(next) => setR((p) => ({ ...p, setCustom: next, setName: next.name }))}
              onSave={saveMySet}
              saved={mySets}
              onLoad={(s) => { const u = unpackSet(s); setR((p) => ({ ...p, setCustom: u, setId: null, setName: u.name })); }}
              onDelete={async (id) => {
                const { error } = await supabase.from("user_sets").delete().eq("id", id);
                if (error) { notify?.("Couldn't delete that set: " + error.message); return; }
                setMySets((list) => list.filter((s) => s.id !== id));
                // If that was the set on the stage, it stays there but is no
                // longer saved — the next save keeps it as a new set.
                setR((p) => (p.setCustom?.savedId === id ? { ...p, setCustom: { ...p.setCustom, savedId: null } } : p));
              }}
              selected={selPiece}
              onSelect={setSelPiece}
              saving={savingSet}
            />
          )}
          {genSet && (
            <div className="rs-row" style={{ marginTop: 10, alignItems: "center" }}>
              <span className="rs-body" style={{ fontSize: 10 }}>Set size</span>
              <input
                type="range" min={-0.08} max={0.08} step={0.002}
                value={Math.log10(r.setScale || 1)}
                onChange={(e) => setR((p) => ({ ...p, setScale: Math.round(Math.pow(10, Number(e.target.value)) * 1000) / 1000 }))}
                style={{ width: 150, accentColor: "var(--accent)" }}
              />
              <span className="rs-body" style={{ fontSize: 10 }}>{(r.setScale || 1).toFixed(2)}×</span>
              <span className="rs-body" style={{ fontSize: 10, marginLeft: 8 }}>Floor</span>
              <input
                type="range" min={-4} max={4} step={0.05}
                value={r.setGround ?? 0}
                onChange={(e) => setR((p) => ({ ...p, setGround: Number(e.target.value) }))}
                style={{ width: 110, accentColor: "var(--accent)" }}
              />
              <span className="rs-body" style={{ fontSize: 10, opacity: 0.8 }}>
                {genFit
                  ? `${genFit.width.toFixed(1)} × ${genFit.depth.toFixed(1)} m — ${genFit.metric ? "sized from the world's own measurements" : "size estimated; this draft carries none"}`
                  : "Fitting the set…"}
              </span>
            </div>
          )}
          {(() => {
            // Pieces a creator is likely to describe in the prompt. If one is in
            // the reference picture, the model uses that one instead.
            // Anything big enough to read on screen can be described. Small
            // dressing is left out, or the list becomes unusable.
            const risky = (room?.props ?? []).filter((p) => {
              const s = pieceSize(p);
              return Math.max(s.w, s.d) >= 0.9 || s.h >= 1.2;
            });
            if (!risky.length) return null;
            const describedCount = risky.filter((p) => p.asked).length;
            return (
              <div className="rs-row" style={{ marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button className="rs-btn" onClick={() => setDressOpen((o) => !o)}>
                  {dressOpen ? "▾" : "▸"} Describe the furniture{describedCount ? ` · ${describedCount} described` : ""}
                </button>
                <span className="rs-body" style={{ fontSize: 10, display: dressOpen ? undefined : "none" }}>Leave empty to use the set's own</span>
                {(dressOpen ? risky : []).map((p) => (
                  <input
                    key={p.id}
                    data-dress
                    value={p.asked ?? ""}
                    placeholder={(p.label || p.piece).replace(/^the /, "")}
                    title="Leave empty to use the set's version. Describe it and the location is built with yours instead, in the same place."
                    onChange={(e) => {
                      const text = e.target.value;
                      setR((prev) => {
                        const base = prev.setCustom ?? startEditing(getSet(prev.setId));
                        return { ...prev, setCustom: describePiece(base, p.id, text) };
                      });
                    }}
                    style={{ width: 150, background: "var(--bg)", border: "1px solid " + (p.asked ? "var(--accent)" : "var(--border)"), borderRadius: 3, padding: "5px 8px", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text)" }}
                  />
                ))}
              </div>
            );
          })()}
          <div className="rs-label" style={{ marginTop: 18 }}>Background</div>
          <div className="rs-row">
            <button className="rs-btn" onClick={() => setR((p) => {
              const x = 30 + Math.round(Math.random() * 40), y = 26 + Math.round(Math.random() * 30);
              return { ...p, extras: [...(p.extras ?? []), { id: crypto.randomUUID(), x, y, facing: Math.round(Math.random() * 360) }] };
            })}>+ Add a person</button>
            {(r.extras ?? []).length > 0 && (
              <>
                <span className="rs-body" style={{ fontSize: 11 }}>{r.extras.length} in the background</span>
                <button className="rs-btn" onClick={() => setR((p) => ({ ...p, extras: (p.extras ?? []).slice(0, -1) }))}>Remove one</button>
              </>
            )}
          </div>

          <div className="rs-label" style={{ marginTop: 18 }}>Lens</div>
          <div className="rs-row">{lensButtons()}</div>

          <div className="rs-label" style={{ marginTop: 18 }}>Camera height</div>
          <div className="rs-row">{heightButtons()}</div>

          <div className="rs-label" style={{ marginTop: 18 }}>Light</div>
          <div className="rs-row" style={{ alignItems: "center" }}>{lightButtons()}</div>

          <div className="rs-label" style={{ marginTop: 18 }}>Frame shape</div>
          <div className="rs-row">{aspectButtons()}</div>
        </div>
      </div>

      {/* The sticky timeline is bounded by this wrapper, so it docks only
          once you have scrolled down to it rather than floating over the
          plan and the camera view at the top of the page. */}
      <div className="rs-below">
      <div className="rs-panel rs-dock" style={{ marginTop: 16 }}>
        <div className="rs-row" style={{ justifyContent: "space-between" }}>
          <div className="rs-row">
            <button className="rs-btn" onClick={() => { setT(0); setPlaying(false); }}>⏮</button>
            <button className={"rs-btn" + (playing ? " on" : "")} onClick={() => { if (t >= r.duration) setT(0); setPlaying((p) => !p); }}>{playing ? "Pause" : "Play"}</button>
            <span className="rs-time">{t.toFixed(1)}s</span>
          </div>
          <div className="rs-row">
            {hereHasKey && <button className="rs-btn" onClick={clearKeyHere}>Remove keyframe here</button>}
          </div>
        </div>

        <div className="rs-track">
          {ticks.map((k) => <div key={k} className="rs-tick" style={{ left: `${(k / r.duration) * 100}%` }} />)}
          {(r.beats ?? []).map((b, i) => <div key={i} className="rs-beat" style={{ left: `${(b.t / r.duration) * 100}%` }}>{b.label}</div>)}
          <input type="range" min={0} max={r.duration} step={0.05} value={t} onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }} />
        </div>

        <div className="rs-row" style={{ marginTop: 18 }}>
          <input
            className="rs-input"
            value={beatText}
            maxLength={40}
            onChange={(e) => setBeatText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addBeat(); }}
            placeholder={`Mark a beat at ${t.toFixed(1)}s — "she notices him"`}
            style={{ flex: 1, minWidth: 200 }}
          />
          <button className="rs-btn" onClick={addBeat}>Mark beat</button>
        </div>
      </div>

      <div className="rs-panel">
        <div className="rs-row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
          <div className="rs-label" style={{ marginBottom: 0 }}>Performers at {t.toFixed(1)}s</div>
          {r.actors.length < MAX_ACTORS && (
            <button className="rs-btn" onClick={() => setR((p) => addActor(p))}>+ Performer</button>
          )}
        </div>
        {throughs.length > 0 && (
          <div className="rs-through">
            {throughs.slice(0, 4).map((w, i) => (
              <div key={i}>
                {w.name} walks through {w.label} between {w.from.toFixed(1)}s and {w.to.toFixed(1)}s —
                add a mark partway to carry them around it.
              </div>
            ))}
            {throughs.length > 4 && <div>…and {throughs.length - 4} more.</div>}
          </div>
        )}
        {now.actors.map((a, i) => (
          <div key={a.id}>
            <div className="rs-row" style={{ padding: "5px 0" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: a.color, display: "inline-block" }} />
              <input
                className="rs-input"
                value={a.name}
                onChange={(e) => setR((p) => ({
                  ...p,
                  actors: p.actors.map((x, j) => (j === i ? { ...x, name: e.target.value.slice(0, 24) } : x)),
                }))}
                style={{ width: 96, padding: "4px 7px", fontSize: 10 }}
              />
              {["stand", "sit", "crouch"].map((p) => (
                <button key={p} className={"rs-btn" + (a.pose === p ? " on" : "")} onClick={() => setPose(i, p)}>{p}</button>
              ))}
              {/* What they're doing, as opposed to where they are. It lands in
                  the prompt, so the direction survives into the generation. */}
              <button
                className={"rs-btn" + (a.action ? " on" : "")}
                onClick={() => { setActFor(actFor === i ? null : i); setActQuery(""); setActCat(null); }}
              >
                {a.action ? actionLabel(a.action) : "+ action"}
              </button>
              {a.action && (
                <button className="rs-btn" title="Back to no direction" onClick={() => setAction(i, null)}>clear</button>
              )}
              <span className="rs-body" style={{ fontSize: 10, marginLeft: 10 }}>as</span>
              {BODIES.map((b) => {
                const cur = r.actors[i]?.body ?? defaultBody(i);
                return <button key={b} className={"rs-btn" + (cur === b ? " on" : "")} onClick={() => setR((p) => ({ ...p, actors: p.actors.map((x, j) => (j === i ? { ...x, body: b } : x)) }))}>{b}</button>;
              })}
              {r.actors.length > 1 && (
                <button className="rs-btn" title={`Take ${a.name} out of the scene`}
                  style={{ marginLeft: "auto" }}
                  onClick={() => { if (actFor === i) setActFor(null); setR((p) => removeActor(p, a.id)); }}>
                  remove
                </button>
              )}
            </div>

            {actFor === i && actionPicker(i, a)}
          </div>
        ))}
      </div>

      <div className="rs-panel">
        <div className="rs-row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <div className="rs-label" style={{ marginBottom: 0 }}>Cameras — same performance, different angle</div>
          <div className="rs-row">
            <button className={"rs-btn" + (moveOpen ? " on" : "")} onClick={() => setMoveOpen((v) => !v)}
              title="A move happens over time — a dolly, a pan, a crane — and is written as two marks on the timeline. Dragging the camera instead puts it somewhere new at this one moment.">
              Give this camera a move
            </button>
            <button
              className="rs-btn"
              disabled={boarding}
              title="One frame per camera at this moment, captioned, on one sheet you can print or email. Free."
              onClick={exportStoryboard}
            >
              {boarding ? "Drawing…" : "Export storyboard"}
            </button>
            {r.cameras.length < 4 && <button className="rs-btn" onClick={() => setR((p) => addCamera(p, now.camera))}>+ Camera</button>}
          </div>
        </div>

        {moveOpen && (
          <div className="rs-act" style={{ marginBottom: 12 }}>
            <div className="rs-body" style={{ fontSize: 10, marginBottom: 2 }}>
              Runs on {activeCam?.name ?? "the selected camera"} from {(t >= r.duration - 0.5 ? 0 : t).toFixed(1)}s to {r.duration}s.
              It writes two marks, so you can drag either one afterwards.
            </div>
            {MOVE_CATEGORIES.map((cat) => (
              <div key={cat} style={{ marginTop: 10 }}>
                <div className="rs-label" style={{ marginBottom: 6 }}>{cat}</div>
                <div className="rs-act-grid" style={{ maxHeight: "none" }}>
                  {CAMERA_MOVES.filter((m) => m.cat === cat).map((m) => (
                    <button
                      key={m.id}
                      className="rs-act-item"
                      disabled={m.needsSubject && !nowRead.subject}
                      style={m.needsSubject && !nowRead.subject ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                      onClick={() => applyMove(m.id)}
                    >
                      <b>{m.label}</b>
                      <span>{m.needsSubject && !nowRead.subject ? "Needs someone in frame" : m.note}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="rs-cams">
          {camReads.map((c) => (
            <div key={c.id} className={"rs-cam" + (c.id === r.activeCamera ? " on" : "")} onClick={() => setR((p) => ({ ...p, activeCamera: c.id }))}>
              <div className="rs-cam-n">{c.name}</div>
              <div className="rs-cam-s">{c.read.shotSize ? `${c.read.shotSize} · ${c.read.lens}` : "Not framing anyone"}</div>
              {c.read.subject && <div className="rs-cam-s">on {c.read.subject}</div>}
              {onCover && camReads.filter((x) => x.read.subject).length > 1 && c.id === camReads.find((x) => x.read.subject)?.id && (
                <span style={{ display: "inline-flex", flexDirection: "column", gap: 3, marginTop: 8 }}>
                  <button className="rs-btn" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                    onClick={(e) => { e.stopPropagation(); onCover(buildCoverage(r)); }}>
                    Cover the scene — all {camReads.filter((x) => x.read.subject).length} angles →
                  </button>
                  {/* Nothing is charged here, but the scene's real cost should be
                      visible before anyone starts filling slots. */}
                  <span className="rs-body" style={{ fontSize: 9, opacity: 0.75 }}>
                    Free to plan.{(r.setId || r.setCustom) ? ` Location plates ${camReads.filter((x) => x.read.subject).length * 2} credits when you shoot them.` : ""} Each shot priced when you generate it.
                  </span>
                </span>
              )}
              {c.read.subject && (setGenPrefill || onShoot) && (
                <button className="rs-btn" style={{ marginTop: 8 }} onClick={(e) => { e.stopPropagation(); shoot(c.id); }}>
                  Shoot this angle · from {FLOOR} credits →
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="rs-body" style={{ fontSize: 10, marginTop: 10, opacity: 0.8 }}>
          Dragging the camera only moves the selected one. The performers' timing is shared by every camera.
        </div>
        <div className="rs-body" style={{ fontSize: 11, marginTop: 8 }}>
          <b style={{ color: "var(--text)", fontWeight: 500 }}>Shoot this angle</b> hands the framing, lens, blocking
          and beats to the generator as a written prompt, with the set attached as a reference. Blocking here is free
          and unlimited — you pick the model and see the price before anything is charged. A location plate, if the
          scene has a set, is 2 credits.
        </div>
      </div>
      </div>
    </div>
  );
}