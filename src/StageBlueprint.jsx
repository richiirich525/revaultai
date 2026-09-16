import { useEffect, useRef, useState } from "react";
import { STAGE, readStage, describeStage, axisFor, sideOfAxis, bearing } from "./lib/stageGeometry.js";

/*
  StageBlueprint — RevaultAI
  An overhead staging diagram you can drag. The geometry drives the
  filmmaking language, not the other way round: move the camera closer and the
  shot size changes; cross the 180-degree line and the diagram says so.
*/

const styles = `
  .bp { border: 1px solid var(--border); border-radius: 8px; background: var(--bg); padding: 14px; }
  .bp svg { width: 100%; height: auto; display: block; touch-action: none; user-select: none; }
  .bp-read { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--text); line-height: 1.85; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); }
  .bp-warn { font-family: 'DM Mono', monospace; font-size: 10px; color: #E5B769; line-height: 1.75; margin-top: 8px; }
  .bp-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
  .bp-btn { background: none; border: 1px solid var(--border); color: var(--muted); border-radius: 3px; padding: 6px 12px; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; }
  .bp-btn:hover { color: var(--text); border-color: var(--muted); }
  .bp-hint { font-family: 'DM Mono', monospace; font-size: 9px; color: var(--muted); line-height: 1.7; margin-top: 10px; opacity: 0.75; }
`;

const COLORS = ["#7B3FE4", "#E5B769", "#4ADE80", "#5BA8C2"];

export default function StageBlueprint({ camera, actors, onChange, baselineSide }) {
  const svgRef = useRef(null);
  const [drag, setDrag] = useState(null);   // { kind: "camera"|"actor"|"rotate", id }

  const read = readStage(camera, actors);
  const axis = axisFor(actors);
  const crossed =
    axis && baselineSide != null && read.axis && read.axis.cameraSide !== 0 && read.axis.cameraSide !== baselineSide;

  function toStage(evt) {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const px = (evt.clientX - r.left) / r.width;
    const py = (evt.clientY - r.top) / r.height;
    return {
      x: Math.max(3, Math.min(STAGE - 3, px * STAGE)),
      y: Math.max(3, Math.min(STAGE - 3, py * STAGE)),
    };
  }

  function onPointerDown(kind, id, evt) {
    evt.preventDefault();
    evt.currentTarget.setPointerCapture?.(evt.pointerId);
    setDrag({ kind, id });
  }

  function onPointerMove(evt) {
    if (!drag) return;
    const p = toStage(evt);
    if (!p) return;
    if (drag.kind === "camera") {
      onChange({ camera: { ...camera, ...p }, actors });
    } else if (drag.kind === "rotate") {
      onChange({ camera: { ...camera, rotation: Math.round(bearing(camera, p)) }, actors });
    } else if (drag.kind === "actorMove") {
      onChange({ camera, actors: actors.map((a) => (a.id === drag.id ? { ...a, ...p } : a)) });
    } else if (drag.kind === "actorFace") {
      onChange({
        camera,
        actors: actors.map((a) => (a.id === drag.id ? { ...a, facing: Math.round(bearing(a, p)) } : a)),
      });
    }
  }

  function endDrag() { setDrag(null); }

  useEffect(() => {
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, []);

  // The camera's field of view as a wedge, so you can see what's covered.
  function fovPath() {
    const half = 26;
    const reach = 70;
    const rad = (deg) => ((deg - 90) * Math.PI) / 180;
    const a1 = rad(camera.rotation - half);
    const a2 = rad(camera.rotation + half);
    return `M ${camera.x} ${camera.y} L ${camera.x + Math.cos(a1) * reach} ${camera.y + Math.sin(a1) * reach} A ${reach} ${reach} 0 0 1 ${camera.x + Math.cos(a2) * reach} ${camera.y + Math.sin(a2) * reach} Z`;
  }

  // Extend the axis to the edges of the stage so the line is readable.
  function axisLine() {
    if (!axis) return null;
    const dx = axis.b.x - axis.a.x;
    const dy = axis.b.y - axis.a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = (dx / len) * STAGE * 1.5;
    const uy = (dy / len) * STAGE * 1.5;
    return { x1: axis.a.x - ux, y1: axis.a.y - uy, x2: axis.a.x + ux, y2: axis.a.y + uy };
  }
  const al = axisLine();

  return (
    <div className="bp">
      <style>{styles}</style>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${STAGE} ${STAGE}`}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
      >
        <defs>
          <pattern id="bpgrid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="var(--border)" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width={STAGE} height={STAGE} fill="url(#bpgrid)" />

        {/* The 180-degree line, and a wash over the far side */}
        {al && (
          <>
            <line x1={al.x1} y1={al.y1} x2={al.x2} y2={al.y2} stroke="#E5B769" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />
            <text x={2} y={4} fill="#E5B769" fontSize="3" fontFamily="monospace" opacity="0.7">180° LINE</text>
          </>
        )}

        {/* Field of view */}
        <path d={fovPath()} fill="var(--accent)" opacity="0.12" />

        {/* Actors */}
        {actors.map((a, i) => {
          const c = COLORS[i % COLORS.length];
          const rad = ((a.facing ?? 0) - 90) * Math.PI / 180;
          return (
            <g key={a.id}>
              <line
                x1={a.x} y1={a.y}
                x2={a.x + Math.cos(rad) * 9} y2={a.y + Math.sin(rad) * 9}
                stroke={c} strokeWidth="0.8" opacity="0.8"
              />
              <circle
                cx={a.x + Math.cos(rad) * 9} cy={a.y + Math.sin(rad) * 9} r="2.2"
                fill="var(--bg)" stroke={c} strokeWidth="0.6"
                style={{ cursor: "grab" }}
                onPointerDown={(e) => onPointerDown("actorFace", a.id, e)}
              />
              <circle
                cx={a.x} cy={a.y} r="3.4" fill={c}
                style={{ cursor: "grab" }}
                onPointerDown={(e) => onPointerDown("actorMove", a.id, e)}
              />
              <text x={a.x} y={a.y - 5.5} fill="var(--text)" fontSize="3.4" fontFamily="monospace" textAnchor="middle">{a.name}</text>
            </g>
          );
        })}

        {/* Camera */}
        {(() => {
          const rad = (camera.rotation - 90) * Math.PI / 180;
          const hx = camera.x + Math.cos(rad) * 11;
          const hy = camera.y + Math.sin(rad) * 11;
          return (
            <g>
              <line x1={camera.x} y1={camera.y} x2={hx} y2={hy} stroke="var(--accent)" strokeWidth="0.8" />
              <circle
                cx={hx} cy={hy} r="2.4" fill="var(--bg)" stroke="var(--accent)" strokeWidth="0.7"
                style={{ cursor: "grab" }}
                onPointerDown={(e) => onPointerDown("rotate", null, e)}
              />
              <rect
                x={camera.x - 3.6} y={camera.y - 3} width="7.2" height="6" rx="1"
                fill="var(--accent)"
                style={{ cursor: "grab" }}
                onPointerDown={(e) => onPointerDown("camera", null, e)}
              />
              <text x={camera.x} y={camera.y + 8.5} fill="var(--accent)" fontSize="3.2" fontFamily="monospace" textAnchor="middle">CAM</text>
            </g>
          );
        })()}
      </svg>

      <div className="bp-read">{describeStage(read)}</div>

      {crossed && (
        <div className="bp-warn">
          ⚠ The camera has crossed the 180° line. {read.positions.map((p) => p.name + " is now " + p.side).join(", ")} — the reverse of where they were. Motivate the crossing on screen or move back to the original side.
        </div>
      )}

      <div className="bp-hint">
        Drag the camera body to move it, the small circle to aim it. Same for each actor — the dot moves them, the outline circle turns them.
      </div>
    </div>
  );
}