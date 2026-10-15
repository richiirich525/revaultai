import { useMemo, useRef, useState } from "react";
import SaveCoverageSlots from "./SaveCoverageSlots.jsx";
import {
  STAGE, INTENTS, planGeometry, auditSetups, halfFovFor, shotSizeFor, lensFor,
  bearing, dist, promptFor, promptIsUsable,
} from "./lib/stageGeometry.js";

/*
  StagingBoard — RevaultAI
  Block a scene with several cameras at once and watch the line hold or break.

  Drag a performer, a camera, or a camera's aim; every verdict recomputes. The
  colors come from planGeometry and the findings from auditSetups — the same
  two functions that judge saved coverage — so what the board shows and what
  the Script Supervisor says can never disagree.

  Shot size and lens are still derived from how far a camera stands — that
  part is honest and stays. What the geometry cannot know is PURPOSE. A wide
  on a long lens and an extreme wide are the same distance out; a deliberate
  two-shot and a sloppy single look identical from above.

  So each setup also says what it is for, and the findings compare the two.
  That turns "this is a close-up" — which only tells you what you already did
  — into "you marked this a two-shot and only one of them is in frame", and it
  stops the board calling a crossing you chose on purpose a mistake.
*/

const HOLD = "#4ADE80";
const CROSS = "#F87171";
// A crossing the director marked deliberate. Still a crossing, not an error.
const MEANT = "#E5B769";
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
  .sb-cap { font-family: 'DM Mono', monospace; font-size: 8px; letter-spacing: 0.18em; color: var(--accent); text-transform: uppercase; margin-bottom: 7px; }
  .sb-chk { display: flex; align-items: flex-start; gap: 7px; font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); line-height: 1.6; padding: 5px 0; cursor: pointer; }
  .sb-chk input { accent-color: var(--accent); cursor: pointer; margin-top: 2px; flex: none; }
  .sb-note { width: 100%; box-sizing: border-box; margin-top: 7px; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 3px; padding: 6px 7px; font-family: 'DM Mono', monospace; font-size: 10px; line-height: 1.65; resize: vertical; min-height: 46px; }
  .sb-note:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .sb-hint { font-family: 'DM Mono', monospace; font-size: 9px; color: var(--muted); line-height: 1.65; margin-top: 6px; opacity: 0.8; }
  .sb-prompt { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--text); line-height: 1.8; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 9px 10px; white-space: pre-wrap; }
`;

const KIND = {
  break:   { color: CROSS, label: "Broken" },
  warning: { color: MEANT, label: "Worth checking" },
  note:    { color: MEANT, label: "On purpose" },
  ok:      { color: HOLD, label: "Holding" },
};

const HEIGHTS = ["floor level", "low", "eye level", "above eye level", "high above"];

let seq = 0;
const nextId = (p) => `${p}-${++seq}`;

/*
  A label that tells two saves of the same scene apart, since saving twice
  makes two plans rather than editing the first.
*/
function planLabel() {
  const now = new Date();
  return "Staging board \u2014 " + now.toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default function StagingBoard({ user, activeProject, notify, setPage, onSignInClick }) {
  const [actors, setActors] = useState([
    { id: "a1", name: "Mara", x: 40, y: 50, facing: 90 },
    { id: "a2", name: "Vance", x: 60, y: 50, facing: 270 },
  ]);
  const [cams, setCams] = useState([
    { id: "c1", name: "A-cam", x: 50, y: 84, aimX: 50, aimY: 50, height: "eye level",
      intent: "master", intentFavors: "", deliberate: false },
    // Positioned so the declaration is true on arrival: from here Vance is in
    // frame and Mara is not. A board that opens by warning about its own
    // starting state teaches you to ignore it.
    { id: "c2", name: "B-cam", x: 70, y: 66, aimX: 60, aimY: 50, height: "eye level",
      intent: "single", intentFavors: "Vance", deliberate: false },
  ]);
  // Scene-level intent. The flag changes what the audit says; the note does
  // not, and is not pretended to — it is there for the prompt and for you.
  const [scene, setScene] = useState({ noMaster: false, note: "" });
  const [picked, setPicked] = useState("c1");
  const [copied, setCopied] = useState(null);
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
      // Derived: who happens to be nearest. Declared: who it is actually on.
      favors: subject?.name ?? null,
      intent: c.intent || null,
      intent_favors: c.intent && INTENTS[c.intent]?.needsSubject ? (c.intentFavors || null) : null,
      deliberate_cross: !!c.deliberate,
      no_master_by_design: scene.noMaster,
      camera_x: c.x,
      camera_y: c.y,
      camera_rotation: bearing(c, { x: c.aimX, y: c.aimY }),
      actors: actors.map((a) => ({ name: a.name, x: a.x, y: a.y, facing: a.facing })),
    };
  }), [cams, actors, scene.noMaster]);

  const geo = useMemo(() => planGeometry(slots), [slots]);
  const findings = useMemo(() => auditSetups(slots), [slots]);
  const { axis, anchor, crossingIds, deliberateIds } = geo;

  const sel = cams.find((c) => c.id === picked) ?? null;
  const selSlot = slots.find((s) => s.id === picked) ?? null;
  const selCamera = sel
    ? { x: sel.x, y: sel.y, rotation: bearing(sel, { x: sel.aimX, y: sel.aimY }) }
    : null;
  const selPrompt = selCamera
    ? promptFor(selCamera, actors, {
        intent: sel.intent,
        favors: sel.intentFavors,
        height: sel.height,
        note: scene.note,
      })
    : null;

  async function copyPrompt() {
    if (!selPrompt) return;
    try {
      await navigator.clipboard.writeText(selPrompt);
      setCopied("copied");
    } catch {
      // Clipboard access is refused outside a secure context, and silently
      // doing nothing would read as a broken button.
      setCopied("select it and copy by hand");
    }
    setTimeout(() => setCopied(null), 1800);
  }

  /*
    The board, as coverage slots.

    Same shape the Rehearsal Studio writes, so a scene blocked here and a scene
    blocked there are indistinguishable to the audit that reads them back — and
    the prompt goes in too, which is what makes a saved board useful rather
    than merely safe: every setup lands on the coverage board as a generation
    job with frame position and eyeline already stated.
  */
  function buildRows() {
    return cams.map((c, i) => {
      const slot = slots[i];
      const camera = { x: c.x, y: c.y, rotation: bearing(c, { x: c.aimX, y: c.aimY }) };
      const declared = slot.intent ? INTENTS[slot.intent] : null;
      return {
        slug: String(c.name || `Setup ${i + 1}`).slice(0, 120),
        purpose: String(
          (declared ? declared.label + (slot.intent_favors ? " on " + slot.intent_favors : "") : slot.shot_size)
          + ", blocked on the staging board"
          + (scene.note ? ". " + scene.note : "")
        ).slice(0, 400),
        shot_size: String(slot.shot_size || "").slice(0, 60),
        camera: String(slot.lens_mm + "mm, " + c.height).slice(0, 200),
        duration_seconds: null,
        // A master is what the rest of the coverage conforms to, so it is the
        // one you cannot skip. An insert is the one you can.
        priority: slot.intent === "master" ? "essential"
          : slot.intent === "insert" ? "optional"
          : "recommended",
        // A refusal reads well on screen and generates nothing useful, so a
        // setup whose blocking cannot support its declaration is saved with
        // no prompt rather than with a sentence pretending to be one.
        prompt: (() => {
          const p = promptFor(camera, actors, {
            intent: c.intent,
            favors: c.intentFavors,
            height: c.height,
            note: scene.note,
          });
          return promptIsUsable(p) ? String(p).slice(0, 2000) : "";
        })(),
        model_key: null,
        sort: i,
        camera_x: c.x,
        camera_y: c.y,
        camera_rotation: camera.rotation,
        lens_mm: slot.lens_mm,
        camera_height: c.height,
        favors: slot.intent_favors ?? slot.favors,
        actors: actors.map((a) => ({ name: a.name, x: a.x, y: a.y, facing: a.facing })),
        intent: slot.intent,
        intent_favors: slot.intent_favors,
        deliberate_cross: slot.deliberate_cross,
        no_master_by_design: scene.noMaster,
      };
    });
  }

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
    intent: "", intentFavors: "", deliberate: false,
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
        follow the distance. Then say what each setup is <em>for</em>, and the board checks the one
        against the other instead of guessing which you meant.
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
                  <polygon points={halfPlane(-anchorSide)}
                           fill={crossingIds.size > deliberateIds.size
                             ? "rgba(248,113,113,0.08)"
                             : "rgba(229,183,105,0.08)"} />
                )}
                <line x1={axisEnds.x1} y1={axisEnds.y1} x2={axisEnds.x2} y2={axisEnds.y2}
                      stroke="var(--accent)" strokeWidth="0.7" strokeDasharray="3 2" />
              </g>
            )}

            {/* Lens cones, under everything */}
            <g clipPath="url(#sb-clip)">
              {cams.map((c) => {
                const meant = deliberateIds.has(c.id);
                const bad = crossingIds.has(c.id) && !meant;
                return <path key={"f" + c.id} d={cone(c).d}
                             fill={bad ? "rgba(248,113,113,0.10)"
                                 : meant ? "rgba(229,183,105,0.10)"
                                 : "rgba(255,255,255,0.055)"}
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
              const meant = deliberateIds.has(c.id);
              const bad = crossingIds.has(c.id) && !meant;
              const isAnchor = anchor && anchor.row.id === c.id;
              const col = bad ? CROSS : meant ? MEANT : HOLD;
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
                    <text x={c.x} y={c.y > 62 ? c.y - 5.2 : c.y + 7.8} fill={bad ? CROSS : meant ? MEANT : "var(--muted)"}
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
              <div className="sb-cap">What the geometry gives you</div>
              <div className="sb-row"><span>{sel.name}</span><b>{selSlot.shot_size}</b></div>
              <div className="sb-row"><span>lens</span><b>{selSlot.lens_mm}mm</b></div>
              <div className="sb-row"><span>nearest</span><b>{selSlot.favors ?? "no one"}</b></div>
              <div className="sb-row">
                <span>height</span>
                <select className="sb-sel" value={sel.height}
                        onChange={(e) => setCams((p) => p.map((c) => (c.id === sel.id ? { ...c, height: e.target.value } : c)))}>
                  {HEIGHTS.map((hh) => <option key={hh} value={hh}>{hh}</option>)}
                </select>
              </div>

              <div className="sb-cap" style={{ marginTop: 14 }}>What you meant by it</div>
              <div className="sb-row">
                <span>this shot is</span>
                <select className="sb-sel" value={sel.intent || ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCams((p) => p.map((c) => {
                            if (c.id !== sel.id) return c;
                            // Pre-fill the subject with whoever is nearest, so a
                            // declaration that needs one is never left half-made.
                            const needs = v && INTENTS[v]?.needsSubject;
                            return { ...c, intent: v,
                                     intentFavors: needs ? (c.intentFavors || selSlot.favors || "") : "" };
                          }));
                        }}>
                  <option value="">not saying — read the geometry</option>
                  {Object.entries(INTENTS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              {sel.intent && INTENTS[sel.intent]?.needsSubject && (
                <div className="sb-row">
                  <span>on</span>
                  <select className="sb-sel" value={sel.intentFavors || ""}
                          onChange={(e) => setCams((p) => p.map((c) => (c.id === sel.id ? { ...c, intentFavors: e.target.value } : c)))}>
                    <option value="">pick someone</option>
                    {actors.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
              )}

              {crossingIds.has(sel.id) && (
                <label className="sb-chk">
                  <input type="checkbox" checked={!!sel.deliberate}
                         onChange={(e) => setCams((p) => p.map((c) => (c.id === sel.id ? { ...c, deliberate: e.target.checked } : c)))} />
                  I crossed the line on purpose
                </label>
              )}

              {selPrompt && (
                <>
                  <div className="sb-cap" style={{ marginTop: 14 }}>The prompt this gives you</div>
                  <div className="sb-prompt">{selPrompt}</div>
                  <button className="sb-btn" type="button" onClick={copyPrompt} style={{ marginTop: 8 }}>
                    {copied ?? "copy prompt"}
                  </button>
                  <div className="sb-hint">
                    Frame position and eyeline are spelled out because a model inherits
                    neither &mdash; left unsaid, it picks them again on every take.
                  </div>
                </>
              )}
            </div>
          )}

          <div className="sb-insp">
            <div className="sb-cap">The scene</div>
            <label className="sb-chk">
              <input type="checkbox" checked={scene.noMaster}
                     onChange={(e) => setScene((v) => ({ ...v, noMaster: e.target.checked }))} />
              No master by design
            </label>
            <textarea
              className="sb-note"
              value={scene.note}
              placeholder="What are you going for in this scene?"
              onChange={(e) => setScene((v) => ({ ...v, note: e.target.value }))}
            />
            <div className="sb-hint">
              The note is yours and goes into the prompts. Nothing is checked against it &mdash;
              only the box above changes what the board says.
            </div>
          </div>

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

          <SaveCoverageSlots
            buildRows={buildRows}
            count={cams.length}
            label={planLabel()}
            blurb={user && activeProject
              ? `Keep this scene in ${activeProject.name}. Every camera becomes a coverage slot carrying its blocking, what you declared it was for, and the prompt above \u2014 ready to generate without restating the staging.`
              : "Nothing here is saved. Sign in and this scene becomes coverage slots in a project, each one carrying its blocking and its prompt."}
            savedBlurb="Each setup carries its prompt, so it can be filled straight from the board."
            user={user}
            activeProject={activeProject}
            notify={notify}
            setPage={setPage}
            onSignInClick={onSignInClick}
          />
        </div>
      </div>
    </div>
  );
}
