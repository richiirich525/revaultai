import { useEffect, useRef, useState, lazy, Suspense } from "react";
import StageBlueprint from "./StageBlueprint.jsx";
import { readStage, describeStage } from "./lib/stageGeometry.js";
import { stateAt, setKey, removeKey, keyTimes, newRehearsal, addCamera } from "./lib/rehearsal.js";
import { motionState, defaultBody, BODIES } from "./lib/performers.js";
import { buildShootPrompt, buildShootSpec } from "./lib/shootPrompt.js";
import { SETS, EXTERIORS, getSet } from "./lib/setCatalog.js";
import SetEditor from "./SetEditor.jsx";
import { startEditing, packSet, unpackSet, activeRoom } from "./lib/setEdit.js";
// Generated sets (Marble) are switched off: worlds built from a text prompt
// didn't look good enough to shoot. The code and endpoints remain, ready if
// photo input — where the set is a real room — is ever worth trying.
// import GeneratedSets from "./GeneratedSets.jsx";
import { supabase } from "./lib/supabase.js";

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

const styles = `
  .rs { max-width: 980px; margin: 0 auto; padding: 0 48px; }
  .rs-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 8px; }
  .rs-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.8; }
  .rs-panel { border: 1px solid var(--border); border-radius: 8px; padding: 18px 20px; background: var(--surface); margin-bottom: 16px; }
  .rs-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .rs-btn { background: none; border: 1px solid var(--border); color: var(--muted); border-radius: 3px; padding: 6px 12px; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.08em; cursor: pointer; }
  .rs-btn:hover { color: var(--text); border-color: var(--muted); }
  .rs-btn.on { color: var(--accent); border-color: var(--accent); background: var(--bg); }
  .rs-track { position: relative; height: 26px; margin: 10px 0 4px; }
  .rs-track input { position: absolute; inset: 0; width: 100%; accent-color: var(--accent); margin: 0; }
  .rs-tick { position: absolute; top: 0; width: 2px; height: 8px; background: var(--accent); transform: translateX(-1px); pointer-events: none; opacity: 0.8; }
  .rs-beat { position: absolute; top: 20px; transform: translateX(-50%); font-family: 'DM Mono', monospace; font-size: 8px; color: #E5B769; white-space: nowrap; pointer-events: none; letter-spacing: 0.06em; }
  .rs-time { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; color: var(--text); min-width: 70px; }
  .rs-cams { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 8px; }
  .rs-cam { border: 1px solid var(--border); border-radius: 5px; padding: 10px 12px; cursor: pointer; background: var(--bg); }
  .rs-cam.on { border-color: var(--accent); }
  .rs-cam-n { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; color: var(--text); }
  .rs-cam-s { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); margin-top: 3px; }
  .rs-input { background: var(--bg); border: 1px solid var(--border); border-radius: 3px; padding: 6px 9px; font-family: 'DM Mono', monospace; font-size: 11px; color: var(--text); }
  .rs-views { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
  @media (max-width: 900px) { .rs-views { grid-template-columns: 1fr; } }
  @media (max-width: 760px) { .rs { padding: 0 20px; } }
`;

export default function RehearsalStudio({ initial, onChange, setGenPrefill, setPage, notify, onShoot, user, activeProject }) {
  const [r, setR] = useState(() => initial ?? newRehearsal());
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [beatText, setBeatText] = useState("");
  const [genSet, setGenSet] = useState(null);
  const [genFit, setGenFit] = useState(null);
  const plateRef = useRef(null);
  const [mySets, setMySets] = useState([]);
  const [selPiece, setSelPiece] = useState(null);
  const [savingSet, setSavingSet] = useState(false);
  const room = activeRoom(r);

  useEffect(() => {
    if (!user?.id) { setMySets([]); return; }
    supabase.from("user_sets").select("id, data, updated_at").order("updated_at", { ascending: false }).limit(30)
      .then(({ data }) => setMySets(data ?? []));
  }, [user?.id]);

  async function saveMySet() {
    if (!user?.id) { notify?.("Sign in to keep your own sets."); return; }
    setSavingSet(true);
    const packed = packSet(r.setCustom);
    const existing = r.setCustom?.savedId ?? null;
    const res = existing
      ? await supabase.from("user_sets").update({ data: packed, updated_at: new Date().toISOString() }).eq("id", existing).select("id, data").single()
      : await supabase.from("user_sets").insert({ user_id: user.id, project_id: activeProject?.id ?? null, data: packed }).select("id, data").single();
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
      if (alive && j?.status === "ready") setGenSet({ id: genId, name: j.name, assets: j.assets });
    })();
    return () => { alive = false; };
  }, [genId]); // eslint-disable-line react-hooks/exhaustive-deps

  const now = stateAt(r, t);
  const nowRead = readStage(now.camera, now.actors);
  const activeCam = r.cameras.find((c) => c.id === r.activeCamera);

  // A drag on the plan becomes keyframes — but only for whoever actually moved.
  function onStageChange(next) {
    setR((prev) => {
      const cur = stateAt(prev, t);
      const moved = (a, b) => Math.abs(a.x - b.x) > 0.3 || Math.abs(a.y - b.y) > 0.3 ||
        Math.abs(((a.facing ?? a.rotation ?? 0) - (b.facing ?? b.rotation ?? 0) + 540) % 360 - 180) > 1;

      const actors = prev.actors.map((a, i) => {
        const n = next.actors[i]; const c = cur.actors[i];
        if (!n || !c || !moved(n, c)) return a;
        return setKey(a, t, { x: n.x, y: n.y, facing: n.facing, pose: c.pose });
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

  // Hand this angle to the generator: framing, lens, blocking and beats as a
  // prompt. The camera view stays here — it shows stand-ins, and a model given
  // that picture would copy the stand-ins.
  function shoot(cameraId) {
    const out = buildShootPrompt(r, cameraId);
    if (!out.ok) { notify?.("Point that camera at someone first."); return; }
    if (onShoot) {
      // With a set loaded, the model is shown the room itself, not just told about it.
      const plate = (r.setId && cameraId === r.activeCamera) ? plateRef.current?.() : null;
      onShoot({ ...out, spec: buildShootSpec(r, cameraId), plate, setName: r.setName || getSet(r.setId)?.name || null });
      return;
    }
    setGenPrefill?.({ prompt: out.prompt, aspectRatio: out.aspect });
    notify?.(`Prompt built from ${out.camera}. Your rehearsal runs ${out.seconds}s — set the length to match.`);
    setPage?.("generate");
  }

  function setPose(actorIndex, pose) {
    setR((prev) => {
      const s = stateAt(prev, t).actors[actorIndex];
      const actors = [...prev.actors];
      actors[actorIndex] = setKey(actors[actorIndex], t, { x: s.x, y: s.y, facing: s.facing, pose });
      return { ...prev, actors };
    });
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

  const ticks = keyTimes(r);
  const hereHasKey = ticks.some((k) => Math.abs(k - t) < 0.2);

  // What each camera sees right now — the compare-the-angles readout.
  const camReads = r.cameras.map((c) => {
    const s = stateAt({ ...r, activeCamera: c.id }, t);
    return { id: c.id, name: c.name, read: readStage(s.camera, s.actors) };
  });

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
          </div>
        </div>
      </div>

      <div className="rs-views">
        <StageBlueprint camera={now.camera} actors={now.actors} onChange={onStageChange} set={room} extent={genFit}
          selectedPiece={selPiece}
          onSelectPiece={setSelPiece}
          onSetChange={r.setCustom ? (id, change) => setR((p) => ({
            ...p,
            setCustom: {
              ...p.setCustom,
              walls: (p.setCustom.walls ?? []).map((w) => (w.id === id ? { ...w, ...change } : w)),
              props: (p.setCustom.props ?? []).map((q) => (q.id === id ? { ...q, ...change } : q)),
            },
          })) : null} />
        <div>
          <Suspense fallback={<div className="rs-body" style={{ padding: 20 }}>Loading the camera view…</div>}>
            <CameraView
              state={motionState(r, t)}
              lens={nowRead.lens}
              subject={nowRead.subject}
              aspect={r.aspect ?? "16:9"}
              setId={genId ? null : r.setId ?? null}
              setData={room}
              genSet={genSet}
              plateRef={plateRef}
              setScale={r.setScale}
              setGround={r.setGround}
              onSetError={(m) => notify?.("Couldn't show that set — " + m)}
              onSetFit={(fit) => {
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
              }}
              title={`${activeCam?.name ?? "Camera"}${nowRead.shotSize ? " · " + nowRead.shotSize : ""}`}
            />
          </Suspense>
          <div className="rs-row" style={{ marginTop: 10 }}>
            <span className="rs-body" style={{ fontSize: 10 }}>Set</span>
            <button className={"rs-btn" + (!r.setId && !r.setCustom ? " on" : "")} onClick={() => setR((p) => ({ ...p, setId: null, setName: null, setCustom: null }))}>Empty stage</button>
            {r.setId && !r.setCustom && (
              <button className="rs-btn" onClick={() => setR((p) => ({ ...p, setCustom: startEditing(getSet(p.setId)) }))}>Dress this set →</button>
            )}
            {mySets.map((s) => (
              <button key={s.id} className={"rs-btn" + (r.setCustom?.savedId === s.id ? " on" : "")}
                onClick={() => { const u = unpackSet(s); setR((p) => ({ ...p, setCustom: u, setId: null, setName: u.name })); }}>
                {s.data?.name || "My set"}
              </button>
            ))}
            {[...SETS, ...EXTERIORS].map((s) => (
              <button key={s.id} className={"rs-btn" + (r.setId === s.id ? " on" : "")} title={s.note} onClick={() => setR((p) => ({ ...p, setId: s.id, setName: null, setCustom: null }))}>{s.name}</button>
            ))}
          </div>
          {r.setCustom && (
            <SetEditor
              room={r.setCustom}
              onChange={(next) => setR((p) => ({ ...p, setCustom: next, setName: next.name }))}
              onSave={saveMySet}
              saved={mySets}
              onLoad={(s) => { const u = unpackSet(s); setR((p) => ({ ...p, setCustom: u, setId: null, setName: u.name })); }}
              onDelete={async (id) => {
                await supabase.from("user_sets").delete().eq("id", id);
                setMySets((list) => list.filter((s) => s.id !== id));
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
          <div className="rs-row" style={{ marginTop: 10 }}>
            <span className="rs-body" style={{ fontSize: 10 }}>Frame</span>
            {["16:9", "2.39:1", "9:16", "1:1"].map((a) => (
              <button key={a} className={"rs-btn" + ((r.aspect ?? "16:9") === a ? " on" : "")} onClick={() => setR((p) => ({ ...p, aspect: a }))}>{a}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="rs-panel" style={{ marginTop: 16 }}>
        <div className="rs-row" style={{ justifyContent: "space-between" }}>
          <div className="rs-row">
            <button className="rs-btn" onClick={() => { setT(0); setPlaying(false); }}>⏮</button>
            <button className="rs-btn on" onClick={() => { if (t >= r.duration) setT(0); setPlaying((p) => !p); }}>{playing ? "Pause" : "Play"}</button>
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
        <div className="rs-label">Performers at {t.toFixed(1)}s</div>
        {now.actors.map((a, i) => (
          <div key={a.id} className="rs-row" style={{ padding: "5px 0" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: a.color, display: "inline-block" }} />
            <span className="rs-body" style={{ color: "var(--text)", minWidth: 90 }}>{a.name}</span>
            {["stand", "sit", "crouch"].map((p) => (
              <button key={p} className={"rs-btn" + (a.pose === p ? " on" : "")} onClick={() => setPose(i, p)}>{p}</button>
            ))}
            <span className="rs-body" style={{ fontSize: 10, marginLeft: 10 }}>as</span>
            {BODIES.map((b) => {
              const cur = r.actors[i]?.body ?? defaultBody(i);
              return <button key={b} className={"rs-btn" + (cur === b ? " on" : "")} onClick={() => setR((p) => ({ ...p, actors: p.actors.map((x, j) => (j === i ? { ...x, body: b } : x)) }))}>{b}</button>;
            })}
          </div>
        ))}
      </div>

      <div className="rs-panel">
        <div className="rs-row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <div className="rs-label" style={{ marginBottom: 0 }}>Cameras — same performance, different angle</div>
          {r.cameras.length < 4 && <button className="rs-btn" onClick={() => setR((p) => addCamera(p, now.camera))}>+ Camera</button>}
        </div>
        <div className="rs-cams">
          {camReads.map((c) => (
            <div key={c.id} className={"rs-cam" + (c.id === r.activeCamera ? " on" : "")} onClick={() => setR((p) => ({ ...p, activeCamera: c.id }))}>
              <div className="rs-cam-n">{c.name}</div>
              <div className="rs-cam-s">{c.read.shotSize ? `${c.read.shotSize} · ${c.read.lens}` : "Not framing anyone"}</div>
              {c.read.subject && <div className="rs-cam-s">on {c.read.subject}</div>}
              {c.read.subject && (setGenPrefill || onShoot) && (
                <button className="rs-btn" style={{ marginTop: 8 }} onClick={(e) => { e.stopPropagation(); shoot(c.id); }}>
                  Shoot this angle →
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="rs-body" style={{ fontSize: 10, marginTop: 10, opacity: 0.8 }}>
          Dragging the camera only moves the selected one. The performers' timing is shared by every camera.
        </div>
      </div>
    </div>
  );
}