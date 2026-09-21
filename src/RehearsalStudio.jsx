import { useEffect, useRef, useState } from "react";
import StageBlueprint from "./StageBlueprint.jsx";
import { readStage, describeStage } from "./lib/stageGeometry.js";
import { stateAt, setKey, removeKey, keyTimes, newRehearsal, addCamera } from "./lib/rehearsal.js";

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
  @media (max-width: 760px) { .rs { padding: 0 20px; } }
`;

export default function RehearsalStudio({ initial }) {
  const [r, setR] = useState(() => initial ?? newRehearsal());
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [beatText, setBeatText] = useState("");
  const raf = useRef(null);
  const last = useRef(0);

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

  const now = stateAt(r, t);

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

      <StageBlueprint camera={now.camera} actors={now.actors} onChange={onStageChange} />

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