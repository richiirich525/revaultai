import { planShapes } from "./lib/setGeometry.js";
import { resolveMove, PERSON_RADIUS, CAMERA_RADIUS } from "./lib/stageCollision.js";
import { useEffect, useRef, useState } from "react";
import { STAGE, readStage, describeStage, axisFor, bearing, eyelinesFor, eyelineProblems } from "./lib/stageGeometry.js";

/*
  StageBlueprint — RevaultAI
  An overhead staging diagram you can drag. The geometry drives the
  filmmaking language, not the other way round: move the camera closer and the
  shot size changes; cross the 180-degree line and the diagram says so.

  Everything on it is grabbable directly: the body of a performer moves them,
  the ring on their eyeline turns them, and the same goes for a camera. Hit
  areas are measured in screen pixels rather than stage units, so the plan is
  as easy to hit squeezed into the stage panel as it is full width.
*/

const styles = `
  .bp { border: 1px solid var(--border); border-radius: 8px; background: var(--bg); padding: 14px; user-select: none; -webkit-user-select: none; }
  .bp svg { width: 100%; height: auto; display: block; touch-action: none; user-select: none; -webkit-user-select: none; }
  .bp-read { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); line-height: 1.8; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); }
  .bp-warn { font-family: 'DM Mono', monospace; font-size: 11px; color: #F0C97A; line-height: 1.7; margin-top: 8px; }
  .bp-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
  .bp-btn { background: none; border: 1px solid var(--border); color: var(--text); border-radius: 3px; padding: 6px 12px; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; }
  .bp-btn:hover { color: var(--text); border-color: var(--muted); }
  .bp-hint { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.7; margin-top: 10px; }
`;

const COLORS = ["#7B3FE4", "#E5B769", "#4ADE80", "#5BA8C2", "#F87171", "#C49A3C"];

export default function StageBlueprint({ camera, actors, onChange, baselineSide, set, extent, onSetChange, selectedPiece, onSelectPiece, extras, onExtrasChange, selectedActor, onSelectActor }) {
  const svgRef = useRef(null);
  const [drag, setDrag] = useState(null);   // { kind: "camera"|"actorMove"|"rotate"|..., id }
  const [hover, setHover] = useState(null); // same shape, for the highlight
  const [fit, setFit] = useState(true);
  // How wide the diagram is actually drawn, so a hit area can be a real
  // finger-sized target rather than a number of stage units that means one
  // thing full width and another in a 300px panel.
  const [widthPx, setWidthPx] = useState(460);

  useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w > 0) setWidthPx(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /*
    A 6 x 4 meter kitchen is 30 x 20 units adrift in a 100 x 100 stage, which
    reads as a doll's house in the corner of an empty field. Fitting the view
    to whatever is actually in the scene — the room, everyone in it, and the
    camera, which may legitimately be outside the room — makes the plan worth
    looking at. The box stays square so nothing is stretched.
  */
  const view = (() => {
    const whole = { x: 0, y: 0, size: STAGE };
    if (!fit) return whole;
    const pts = [...(actors ?? []), ...(extras ?? []), camera].filter(Boolean);
    const plan = set ? planShapes(set) : null;
    if (!plan?.floor && pts.length === 0) return whole;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const grow = (x, y) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); };
    if (plan?.floor) { grow(plan.floor.x, plan.floor.y); grow(plan.floor.x + plan.floor.w, plan.floor.y + plan.floor.h); }
    if (extent) { grow(50 + extent.minX * 5, 50 + extent.minZ * 5); grow(50 + extent.maxX * 5, 50 + extent.maxZ * 5); }
    for (const p of pts) grow(p.x, p.y);
    if (!Number.isFinite(minX)) return whole;
    const pad = 7;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const size = Math.min(STAGE, Math.max(maxX - minX, maxY - minY, 26));
    // Center the square on what we found, then keep it over the stage.
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    return {
      x: Math.max(0, Math.min(STAGE - size, cx - size / 2)),
      y: Math.max(0, Math.min(STAGE - size, cy - size / 2)),
      size,
    };
  })();

  // Stage units per rendered pixel. A 44px touch target is this times 22.
  const unit = view.size / Math.max(1, widthPx);
  // Hit radius: at least `px` pixels across, never big enough to swallow the
  // neighbouring handle, which is why each caller passes its own ceiling.
  const hitR = (px, cap) => Math.min(cap, Math.max(px * unit, 2));
  // Keep a label inside the drawn window so it never clips at an edge.
  const clampX = (x) => Math.max(view.x + 5, Math.min(view.x + view.size - 5, x));
  const clampY = (y) => Math.max(view.y + 3.5, Math.min(view.y + view.size - 1.5, y));

  const read = readStage(camera, actors);
  const eyelines = eyelinesFor(camera, actors);
  const eyeProblems = eyelineProblems(camera, actors);
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
      x: Math.max(3, Math.min(STAGE - 3, view.x + px * view.size)),
      y: Math.max(3, Math.min(STAGE - 3, view.y + py * view.size)),
    };
  }

  function onPointerDown(kind, id, evt) {
    evt.preventDefault();
    evt.stopPropagation();
    evt.currentTarget.setPointerCapture?.(evt.pointerId);
    setDrag({ kind, id });
    if ((kind === "actorMove" || kind === "actorFace") && onSelectActor) onSelectActor(id);
  }

  // Grab on hover, grabbing while held — the standard pair, so a target that
  // can be picked up says so before it is.
  function grabStyle(kind, id) {
    const held = drag && drag.kind === kind && drag.id === id;
    return { cursor: held ? "grabbing" : "grab", touchAction: "none" };
  }
  const isHover = (kind, id) => !drag && hover?.kind === kind && hover.id === id;
  const hoverProps = (kind, id) => ({
    onPointerEnter: () => setHover({ kind, id }),
    onPointerLeave: () => setHover((h) => (h?.kind === kind && h.id === id ? null : h)),
  });

  function onPointerMove(evt) {
    if (!drag) return;
    const p = toStage(evt);
    if (!p) return;
    if (drag.kind === "camera") {
      // Walls are not an obstacle to a camera — taking one out to shoot into
      // the room is how sets are built. Furniture still is.
      const q = resolveMove(set, camera, p, { radius: CAMERA_RADIUS, walls: false });
      onChange({ camera: { ...camera, ...q }, actors });
    } else if (drag.kind === "rotate") {
      onChange({ camera: { ...camera, rotation: Math.round(bearing(camera, p)) }, actors });
    } else if (drag.kind === "actorMove") {
      const cur = actors.find((a) => a.id === drag.id);
      const q = cur ? resolveMove(set, cur, p, { radius: PERSON_RADIUS }) : p;
      onChange({ camera, actors: actors.map((a) => (a.id === drag.id ? { ...a, ...q } : a)) });
    } else if (drag.kind === "extra" && onExtrasChange) {
      const cur = (extras ?? []).find((e) => e.id === drag.id);
      const q = cur ? resolveMove(set, cur, p, { radius: PERSON_RADIUS }) : p;
      onExtrasChange((extras ?? []).map((e) => (e.id === drag.id ? { ...e, ...q } : e)));
    } else if (drag.kind === "pieceMove" && onSetChange) {
      onSetChange(drag.id, { x: Math.round(((p.x - 50) / 5) * 100) / 100, z: Math.round(((p.y - 50) / 5) * 100) / 100 });
    } else if (drag.kind === "pieceTurn" && onSetChange) {
      const piece = [...(set?.props ?? []), ...(set?.walls ?? [])].find((q) => q.id === drag.id);
      if (piece) {
        const c = { x: 50 + piece.x * 5, y: 50 + piece.z * 5 };
        onSetChange(drag.id, { rot: Math.round(bearing(c, p) / 5) * 5 });
      }
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
        viewBox={`${view.x} ${view.y} ${view.size} ${view.size}`}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        style={drag ? { cursor: "grabbing" } : undefined}
      >
        <defs>
          <pattern id="bpgrid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="var(--border)" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect x={-STAGE} y={-STAGE} width={STAGE * 3} height={STAGE * 3} fill="url(#bpgrid)" />

        {/* A generated set's reconstructed area — beyond this the edges fray */}
        {extent && (
          <rect x={50 + extent.minX * 5} y={50 + extent.minZ * 5}
            width={(extent.maxX - extent.minX) * 5} height={(extent.maxZ - extent.minZ) * 5}
            fill="#1b1c24" stroke="#5a5b68" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.9" />
        )}

        {/* The set, seen from above: floor, walls and furniture to block against */}
        {set && (() => {
          const plan = planShapes(set);
          return (
            <g>
              <rect x={plan.floor.x} y={plan.floor.y} width={plan.floor.w} height={plan.floor.h} fill="#1b1c24" opacity="0.85" />
              {plan.props.map((p) => {
                const live = !!onSetChange;
                const chosen = selectedPiece === p.id;
                const hot = isHover("pieceMove", p.id);
                return (
                  <g key={p.id}>
                    <rect
                      x={p.x} y={p.y} width={p.w} height={p.h} rx="0.6"
                      fill={p.tall ? "#44455260" : "#3c3d48"}
                      stroke={chosen ? "var(--accent)" : hot ? "rgba(255,255,255,0.5)" : "#55566410"}
                      strokeWidth={chosen ? 0.6 : hot ? 0.5 : 0.2}
                      style={live ? grabStyle("pieceMove", p.id) : { cursor: "default" }}
                      {...(live ? hoverProps("pieceMove", p.id) : {})}
                      onPointerDown={live ? (e) => { onSelectPiece?.(p.id); onPointerDown("pieceMove", p.id, e); } : undefined}
                    />
                    {chosen && live && (
                      <circle
                        cx={p.x + p.w + 1.6} cy={p.y - 1.2} r={hitR(14, 2.4)}
                        fill="var(--accent)" opacity={isHover("pieceTurn", p.id) ? 1 : 0.85}
                        style={grabStyle("pieceTurn", p.id)}
                        {...hoverProps("pieceTurn", p.id)}
                        onPointerDown={(e) => onPointerDown("pieceTurn", p.id, e)}
                      />
                    )}
                  </g>
                );
              })}
              {plan.walls.map((w) => (
                <rect key={w.id} x={w.x} y={w.y} width={w.w} height={w.h} fill={w.opening ? "#9fc4d8" : "#5a5b68"} opacity={w.opening ? 0.55 : 0.9} />
              ))}
              {plan.props.filter((p) => p.w > 5 && p.label).map((p) => (
                <text key={"t" + p.id} x={p.x + p.w / 2} y={p.y + p.h / 2 + 1} fill="rgba(255,255,255,0.55)" fontSize="2.2" fontFamily="monospace" textAnchor="middle" pointerEvents="none">
                  {p.label.replace(/^the /, "")}
                </text>
              ))}
            </g>
          );
        })()}

        {/* The 180-degree line, and a wash over the far side */}
        {al && (
          <>
            <line x1={al.x1} y1={al.y1} x2={al.x2} y2={al.y2} stroke="#E5B769" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />
            <text x={clampX(view.x + 5)} y={view.y + 4} fill="#E5B769" fontSize="3" fontFamily="monospace" opacity="0.85" pointerEvents="none">180° LINE</text>
          </>
        )}

        {/* Field of view */}
        <path d={fovPath()} fill="var(--accent)" opacity="0.12" pointerEvents="none" />

        {/* Background performers — people, but not the scene */}
        {(extras ?? []).map((e) => {
          const hot = isHover("extra", e.id);
          return (
            <g key={e.id}>
              <line
                x1={e.x} y1={e.y}
                x2={e.x + Math.sin((e.facing * Math.PI) / 180) * 2.6}
                y2={e.y - Math.cos((e.facing * Math.PI) / 180) * 2.6}
                stroke="rgba(255,255,255,0.28)" strokeWidth="0.3" pointerEvents="none"
              />
              <circle
                cx={e.x} cy={e.y} r="1.6"
                fill={hot ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.13)"}
                stroke={hot ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)"} strokeWidth="0.3"
                pointerEvents="none"
              />
              {onExtrasChange && (
                <circle
                  cx={e.x} cy={e.y} r={hitR(16, 3.0)} fill="transparent"
                  style={grabStyle("extra", e.id)}
                  {...hoverProps("extra", e.id)}
                  onPointerDown={(ev) => onPointerDown("extra", e.id, ev)}
                />
              )}
            </g>
          );
        })}

        {/* Actors. Body moves them, the ring on the eyeline turns them. */}
        {actors.map((a, i) => {
          const c = COLORS[i % COLORS.length];
          const rad = ((a.facing ?? 0) - 90) * Math.PI / 180;
          const hx = a.x + Math.cos(rad) * 9;
          const hy = a.y + Math.sin(rad) * 9;
          const hotBody = isHover("actorMove", a.id);
          const hotTurn = isHover("actorFace", a.id);
          const chosen = selectedActor === a.id;
          return (
            <g key={a.id}>
              <line
                x1={a.x} y1={a.y} x2={hx} y2={hy}
                stroke={c} strokeWidth={hotTurn ? 1.1 : 0.8} opacity={hotTurn ? 1 : 0.8}
                pointerEvents="none"
              />
              {/* The halo is the hover feedback: it is the hit area, drawn. */}
              {(hotBody || chosen) && (
                <circle cx={a.x} cy={a.y} r={Math.max(5.4, hitR(22, 4.2))} fill={c} opacity={hotBody ? 0.22 : 0.13} pointerEvents="none" />
              )}
              {hotTurn && <circle cx={hx} cy={hy} r="4.4" fill={c} opacity="0.18" pointerEvents="none" />}
              <circle
                cx={hx} cy={hy} r="2.4"
                fill="var(--bg)" stroke={c} strokeWidth={hotTurn ? 1 : 0.6}
                pointerEvents="none"
              />
              <circle
                cx={a.x} cy={a.y} r="3.4" fill={c}
                stroke={chosen ? "#fff" : "none"} strokeWidth={chosen ? 0.7 : 0}
                pointerEvents="none"
              />
              <text x={clampX(a.x)} y={clampY(a.y - 5.5)} fill="var(--text)" fontSize="3.4" fontFamily="monospace" textAnchor="middle" pointerEvents="none">{a.name}</text>
              {/* Hit areas go last so they sit above the drawing. The turn ring
                  is added after the body so it wins wherever they overlap. */}
              <circle
                cx={a.x} cy={a.y} r={hitR(22, 4.2)} fill="transparent"
                style={grabStyle("actorMove", a.id)}
                {...hoverProps("actorMove", a.id)}
                onPointerDown={(e) => onPointerDown("actorMove", a.id, e)}
              >
                <title>Drag {a.name} anywhere. A drag at a scrubbed time writes a keyframe there.</title>
              </circle>
              <circle
                cx={hx} cy={hy} r={hitR(16, 3.6)} fill="transparent"
                style={grabStyle("actorFace", a.id)}
                {...hoverProps("actorFace", a.id)}
                onPointerDown={(e) => onPointerDown("actorFace", a.id, e)}
              >
                <title>Drag to turn {a.name}.</title>
              </circle>
            </g>
          );
        })}

        {/* Camera */}
        {(() => {
          const rad = (camera.rotation - 90) * Math.PI / 180;
          const hx = camera.x + Math.cos(rad) * 11;
          const hy = camera.y + Math.sin(rad) * 11;
          const hotBody = isHover("camera", null);
          const hotTurn = isHover("rotate", null);
          // Below the body normally; above it when the camera is parked at the
          // bottom edge, where "CAM" used to be cut in half by the frame.
          const below = camera.y + 8.5 <= view.y + view.size - 2;
          const ly = below ? camera.y + 8.5 : camera.y - 5.5;
          return (
            <g>
              <line x1={camera.x} y1={camera.y} x2={hx} y2={hy} stroke="var(--accent)" strokeWidth={hotTurn ? 1.1 : 0.8} pointerEvents="none" />
              {hotTurn && <circle cx={hx} cy={hy} r="4.6" fill="var(--accent)" opacity="0.2" pointerEvents="none" />}
              <circle cx={hx} cy={hy} r="2.6" fill="var(--bg)" stroke="var(--accent)" strokeWidth={hotTurn ? 1 : 0.7} pointerEvents="none" />
              {hotBody && <rect x={camera.x - 5.4} y={camera.y - 4.8} width="10.8" height="9.6" rx="1.6" fill="var(--accent)" opacity="0.22" pointerEvents="none" />}
              <rect
                x={camera.x - 3.6} y={camera.y - 3} width="7.2" height="6" rx="1"
                fill="var(--accent)" stroke={hotBody ? "#fff" : "none"} strokeWidth={hotBody ? 0.5 : 0}
                pointerEvents="none"
              />
              <text x={clampX(camera.x)} y={clampY(ly)} fill="var(--accent)" fontSize="3.2" fontFamily="monospace" textAnchor="middle" pointerEvents="none">CAM</text>
              <circle
                cx={camera.x} cy={camera.y} r={hitR(22, 4.6)} fill="transparent"
                style={grabStyle("camera", null)}
                {...hoverProps("camera", null)}
                onPointerDown={(e) => onPointerDown("camera", null, e)}
              >
                <title>Drag the camera anywhere. It passes through walls but not furniture.</title>
              </circle>
              <circle
                cx={hx} cy={hy} r={hitR(16, 3.8)} fill="transparent"
                style={grabStyle("rotate", null)}
                {...hoverProps("rotate", null)}
                onPointerDown={(e) => onPointerDown("rotate", null, e)}
              >
                <title>Drag to aim the camera.</title>
              </circle>
            </g>
          );
        })()}
      </svg>

      {(set || extent) && (
        <div className="bp-row">
          <button className="bp-btn" onClick={() => setFit((v) => !v)} style={fit ? { color: "var(--accent)", borderColor: "var(--accent)" } : undefined}>
            {fit ? "Fit to set" : "Whole stage"}
          </button>
        </div>
      )}

      <div className="bp-read">{describeStage(read)}</div>

      {eyelines.length > 0 && (
        <div className="bp-read" style={{ borderTop: "none", paddingTop: 0, marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
          {eyelines.map((e, i) => <div key={i}>{e.text}</div>)}
        </div>
      )}

      {eyeProblems.map((p, i) => (
        <div className="bp-warn" key={"ep" + i}>⚠ {p}</div>
      ))}

      {crossed && (
        <div className="bp-warn">
          ⚠ The camera has crossed the 180° line. {read.positions.map((p) => p.name + " is now " + p.side).join(", ")} — the reverse of where they were. Motivate the crossing on screen or move back to the original side.
        </div>
      )}

      <div className="bp-hint">
        Drag anyone by the body to move them, by the ring on their eyeline to turn them. Same for the camera. Works with a mouse, a trackpad or a finger.
      </div>
    </div>
  );
}
