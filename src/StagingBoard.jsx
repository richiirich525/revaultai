import { useMemo, useRef, useState } from "react";
import {
  STAGE, planGeometry, auditSetups, halfFovFor, shotSizeFor, lensFor,
  bearing, dist, readStage, describeStage,
} from "./lib/stageGeometry.js";

/*
  StagingBoard — RevaultAI
  Block a scene with several cameras at once and watch the line hold or break.

  Drag a performer, a camera, or a camera's aim; every verdict recomputes. The
  colors come from planGeometry and the findings from auditSetups — the same
  two functions that judge saved coverage — so what the board shows and what
  the Script Supervisor says can never disagree.

  Shot size and lens are derived from how far a camera stands, not typed in.
  That is the honest version: matching your reverses means matching your
  distances, and the board shows you that rather than letting you declare it.
*/

const HOLD = "#4ADE80";
const CROSS = "#F87171";
const PAD = 10;
const ACTOR_COLORS = ["#E8E6F0", "#C9A6FF", "#7FD4C1", "#E5B769"];

const styles = `
  .sb { border: 1px solid var(--border); border-radius: 8px; background: var(--surface); padding: 22px 24px; }
  .sb-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 6px; }
  .sb-lede { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.8; margin-bottom: 16px; max-width: 62ch; }
  .sb-grid { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 20px; align-items: start; }
  @media (max-width: 820px) { .sb-grid { grid-template-columns: minmax(0, 1fr); } }
  .sb-stage { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 8px; }
  .sb-stage svg { display: block; width: 100%; height: auto; max-width: 100%; touch-action: none; }
  .sb-side { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
  .sb-tools { display: flex; flex-wrap: wrap; gap: 6px; }
  .sb-btn { background: none; border: 1px solid var(--border); color: var(--muted); border-radius: 3px; padding: 5px 10px; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.08em; cursor: pointer; }
  .sb-btn:hover { color: var(--accent); border-color: var(--accent); }
  .sb-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .sb-read { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); line-height: 1.75; }
  .sb-read b { color: var(--text); font-weight: 400; }
  .sb-find { padding: 9px 0; border-bottom: 1px solid var(--border); }
  .sb-find:last-child { border-bottom: none; }
  .sb-tag { font-family: 'DM Mono', monospace; font-size: 8px; letter-spacing: 0.16em; text-transform: uppercase; border-radius: 3px; padding: 2px 6px; display: inline-block; margin-bottom: 5px; }
  .sb-ftitle { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--text); line-height: 1.6; }
  .sb-fbody { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); line-height: 1.7; margin-top: 3px; }
  .sb-insp { border: 1px solid var(--border); border-radius: 6px; padding: 12px 14px; }
  .sb-row { display: flex; justify-content: space-between; gap: 10px; font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); padding: 3px 0; }
  .sb-row b { color: var(--text); font-weight: 400; }
  .sb-sel { background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 3px; padding: 3px 6px; font-family: 'DM Mono', monospace; font-size: 10px; }
`;

const KIND = {
  break:   { color: CROSS, label: "Broken" },
  warning: { color: "#E5B769", label: "Worth checking" },
  ok:      { color: HOLD, label: "Holding" },
};

const HEIGHTS = ["floor level", "low", "eye level", "above eye level", "high above"];

let seq = 0;
const nextId = (p) => `${p}-${++seq}`;

export default function StagingBoard() {
  const [actors, setActors] = useState([
    { id: "a1", name: "Mara", x: 40, y: 50, facing: 90 },
    { id: "a2", name: "Vance", x: 60, y: 50, facing: 270 },
  ]);
  const [cams, setCams] = useState([
    { id: "c1", name: "A-cam", x: 50, y: 84, aimX: 50, aimY: 50, height: "eye level" },
    { id: "c2", name: "B-cam", x: 72, y: 70, aimX: 50, aimY: 50, height: "eye level" },
  ]);
  const [picked, setPicked] = useState("c1");
  const svgRef = useRef(null);
  const drag = useRef(null);

  // The board speaks the same shape as a saved coverage slot, so the live
  // reading runs through the very functions that judge saved plans.
  const slots = useMemo(() => cams.map((c, i) => {
    const subject = actors.reduce(
      (best, a) => (!best || dist(c, a) < dist(c, best) ? a : best), null);
    const d = subject ? dist(c, subject) : 40;
    return {
      id: c.id,
      plan_id: "board",
      plan_label: "this scene",
      slug: c.name,
      sort: i,
      shot_size: shotSizeFor(d),
      lens_mm: parseFloat(lensFor(d)),
      camera_height: c.height,
      favors: subject?.name ?? null,
      camera_x: c.x,
      camera_y: c.y,
      camera_rotation: bearing(c, { x: c.aimX, y: c.aimY }),
      actors: actors.map((a) => ({ name: a.name, x: a.x, y: a.y, facing: a.facing })),
    };
  }), [cams, actors]);

  const geo = useMemo(() => planGeometry(slots), [slots]);
  const findings = useMemo(() => auditSetups(slots), [slots]);
  const { axis, anchor, crossingIds } = geo;

  const sel = cams.find((c) => c.id === picked) ?? null;
  const selSlot = slots.find((s) => s.id === picked) ?? null;
  const selRead = sel
    ? readStage({ x: sel.x, y: sel.y, rotation: bearing(sel, { x: sel.aimX, y: sel.aimY }) }, actors)
    : null;

  // --- dragging ----------------------------------------------------------
  function toStage(evt) {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const span = STAGE + PAD * 2;
    return {
      x: Math.max(2, Math.min(STAGE - 2, ((evt.clientX - r.left) / r.width) * span - PAD)),
      y: Math.max(2, Math.min(STAGE - 2, ((evt.clientY - r.top) / r.height) * span - PAD)),
    };
  }
  function down(kind, id, evt) {
    evt.preventDefault();
    evt.currentTarget.setPointerCapture?.(evt.pointerId);
    drag.current = { kind, id };
    if (kind !== "actor") setPicked(id);
  }
  function move(evt) {
    const d = drag.current;
    if (!d) return;
    const p = toStage(evt);
    if (!p) return;
    if (d.kind === "actor") {
      setActors((prev) => prev.map((a) => (a.id === d.id ? { ...a, ...p } : a)));
    } else if (d.kind === "cam") {
      setCams((prev) => prev.map((c) => (c.id === d.id ? { ...c, ...p } : c)));
    } else {
      setCams((prev) => prev.map((c) => (c.id === d.id ? { ...c, aimX: p.x, aimY: p.y } : c)));
    }
  }
  const up = () => { drag.current = null; };

  // --- the axis line, extended past the stage -----------------------------
  const axisEnds = (() => {
    if (!axis) return null;
    const dx = axis.b.x - axis.a.x, dy = axis.b.y - axis.a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len, far = STAGE * 2;
    return { x1: axis.a.x - ux * far, y1: axis.a.y - uy * far,
             x2: axis.a.x + ux * far, y2: axis.a.y + uy * far, ux, uy };
  })();

  const halfPlane = (side) => {
    const e = axisEnds, far = STAGE * 2;
    const nx = -e.uy * side * far, ny = e.ux * side * far;
    return [[e.x1, e.y1], [e.x2, e.y2], [e.x2 + nx, e.y2 + ny], [e.x1 + nx, e.y1 + ny]]
      .map((q) => q.join(",")).join(" ");
  };

  const anchorSide = anchor ? anchor.side : (geo.setups.find((s) => s.side !== 0)?.side ?? 0);

  // A camera's cone, from the same half-FOV the in-frame test uses.
  function cone(c) {
    const rot = bearing(c, { x: c.aimX, y: c.aimY });
    const subject = actors.reduce((b, a) => (!b || dist(c, a) < dist(c, b) ? a : b), null);
    const reach = subject ? Math.max(dist(c, subject) * 1.45, 18) : 42;
    const half = halfFovFor(subject ? dist(c, subject) : 40);
    const pt = (deg) => {
      const r = ((deg - 90) * Math.PI) / 180;
      return [c.x + Math.cos(r) * reach, c.y + Math.sin(r) * reach];
    };
    const [lx, ly] = pt(rot - half);
    const [rx, ry] = pt(rot + half);
    return { d: `M ${c.x} ${c.y} L ${lx} ${ly} L ${rx} ${ry} Z`, half, rot };
  }

  const addCam = () => setCams((p) => [...p, {
    id: nextId("c"), name: `Cam ${String.fromCharCode(65 + p.length)}`,
    x: 30 + p.length * 8, y: 78, aimX: 50, aimY: 50, height: "eye level",
  }]);
  const addActor = () => setActors((p) => [...p, {
    id: nextId("a"), name: `Performer ${p.length + 1}`,
    x: 50, y: 34 + p.length * 6, facing: 180,
  }]);

  return (
    <div className="sb">
      <style>{styles}</style>
      <div className="sb-label">Staging board</div>
      <div className="sb-lede">
        Drag a performer, a camera, or the small dot a camera is aimed at. Shot size and lens
        follow the distance, so matching your reverses means standing them the same distance away.
      </div>

      <div className="sb-grid">
        <div className="sb-stage">
          <svg
            ref={svgRef}
            viewBox={`${-PAD} ${-PAD} ${STAGE + PAD * 2} ${STAGE + PAD * 2}`}
            onPointerMove={move}
            onPointerUp={up}
            onPointerLeave={up}
            role="img"
            aria-label="Overhead staging board"
          >
            <defs>
              <clipPath id="sb-clip"><rect x="0" y="0" width={STAGE} height={STAGE} /></clipPath>
            </defs>
            <rect x="0" y="0" width={STAGE} height={STAGE} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

            {axisEnds && (
              <g clipPath="url(#sb-clip)">
                {anchorSide !== 0 && <polygon points={halfPlane(anchorSide)} fill="rgba(123,63,228,0.08)" />}
                {crossingIds.size > 0 && anchorSide !== 0 && (
                  <polygon points={halfPlane(-anchorSide)} fill="rgba(248,113,113,0.08)" />
                )}
                <line x1={axisEnds.x1} y1={axisEnds.y1} x2={axisEnds.x2} y2={axisEnds.y2}
                      stroke="var(--accent)" strokeWidth="0.7" strokeDasharray="3 2" />
              </g>
            )}

            {/* Lens cones, under everything */}
            <g clipPath="url(#sb-clip)">
              {cams.map((c) => {
                const bad = crossingIds.has(c.id);
                return <path key={"f" + c.id} d={cone(c).d}
                             fill={bad ? "rgba(248,113,113,0.10)" : "rgba(255,255,255,0.055)"}
                             stroke="none" />;
              })}
            </g>

            {/* Performers */}
            {actors.map((a, i) => (
              <g key={a.id} onPointerDown={(e) => down("actor", a.id, e)} style={{ cursor: "grab" }}>
                <circle cx={a.x} cy={a.y} r="3.1" fill={ACTOR_COLORS[i % ACTOR_COLORS.length]} />
                <circle cx={a.x} cy={a.y} r="6" fill="transparent" />
                <text x={a.x} y={a.y < 50 ? a.y + 7.4 : a.y - 5} fill="var(--text)"
                      fontSize="4" fontFamily="monospace" textAnchor="middle">{a.name}</text>
              </g>
            ))}

            {/* Cameras */}
            {cams.map((c) => {
              const bad = crossingIds.has(c.id);
              const isAnchor = anchor && anchor.row.id === c.id;
              const col = bad ? CROSS : HOLD;
              return (
                <g key={c.id}>
                  <line x1={c.x} y1={c.y} x2={c.aimX} y2={c.aimY}
                        stroke={bad ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.18)"}
                        strokeWidth="0.4" strokeDasharray="2 2" />
                  <g onPointerDown={(e) => down("aim", c.id, e)} style={{ cursor: "grab" }}>
                    <circle cx={c.aimX} cy={c.aimY} r="1.6" fill={col} opacity="0.8" />
                    <circle cx={c.aimX} cy={c.aimY} r="5" fill="transparent" />
                  </g>
                  <g onPointerDown={(e) => down("cam", c.id, e)} style={{ cursor: "grab" }}>
                    {isAnchor && <circle cx={c.x} cy={c.y} r="4.6" fill="none" stroke={HOLD} strokeWidth="0.5" opacity="0.55" />}
                    {picked === c.id && <circle cx={c.x} cy={c.y} r="6.4" fill="none" stroke="var(--accent)" strokeWidth="0.5" />}
                    <circle cx={c.x} cy={c.y} r="2.6" fill={col} />
                    <circle cx={c.x} cy={c.y} r="7" fill="transparent" />
                    <text x={c.x} y={c.y > 62 ? c.y - 5.2 : c.y + 7.8} fill={bad ? CROSS : "var(--muted)"}
                          fontSize="3.7" fontFamily="monospace" textAnchor="middle">{c.name}</text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="sb-side">
          <div className="sb-tools">
            <button className="sb-btn" type="button" onClick={addCam}>+ camera</button>
            <button className="sb-btn" type="button" onClick={addActor}>+ performer</button>
            {cams.length > 1 && (
              <button className="sb-btn" type="button"
                      onClick={() => { setCams((p) => p.filter((c) => c.id !== picked)); setPicked(cams[0].id); }}>
                remove camera
              </button>
            )}
          </div>

          {sel && selSlot && (
            <div className="sb-insp">
              <div className="sb-row"><span>{sel.name}</span><b>{selSlot.shot_size}</b></div>
              <div className="sb-row"><span>lens</span><b>{selSlot.lens_mm}mm</b></div>
              <div className="sb-row"><span>on</span><b>{selSlot.favors ?? "no one"}</b></div>
              <div className="sb-row">
                <span>height</span>
                <select className="sb-sel" value={sel.height}
                        onChange={(e) => setCams((p) => p.map((c) => (c.id === sel.id ? { ...c, height: e.target.value } : c)))}>
                  {HEIGHTS.map((hh) => <option key={hh} value={hh}>{hh}</option>)}
                </select>
              </div>
              {selRead && <div className="sb-read" style={{ marginTop: 8 }}>{describeStage(selRead)}</div>}
            </div>
          )}

          <div>
            {findings.length === 0 ? (
              <div className="sb-read">Add a second camera to read screen direction across them.</div>
            ) : findings.map((f, i) => {
              const k = KIND[f.kind] ?? KIND.warning;
              return (
                <div className="sb-find" key={i}>
                  <div className="sb-tag" style={{ color: k.color, border: `1px solid ${k.color}55` }}>{k.label} · {f.area}</div>
                  <div className="sb-ftitle">{f.title}</div>
                  <div className="sb-fbody">{f.detail}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
