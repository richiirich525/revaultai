import { useMemo, useState } from "react";
import { STAGE, planGeometry } from "./lib/stageGeometry.js";

/*
  CoveragePlan — RevaultAI
  Every setup in a plan, drawn on one overhead plan: the line of action, which
  side of it each camera sits on, and which setups cross.

  The geometry comes from planGeometry — the same function that writes the
  staging findings — so the drawing and the words can never disagree.
*/

const HOLD = "#4ADE80";
const CROSS = "#F87171";
const PAD = 9;

const styles = `
  .lp-wrap { border: 1px solid var(--border); border-radius: 8px; background: var(--surface); padding: 22px 24px; }
  .lp-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 14px; }
  .lp-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
  .lp-tab { border: 1px solid var(--border); background: transparent; color: var(--muted); border-radius: 4px; padding: 6px 13px; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.06em; cursor: pointer; transition: all 0.2s; }
  .lp-tab:hover { color: var(--text); border-color: var(--muted); }
  .lp-tab.on { border-color: var(--accent); color: var(--accent); background: var(--bg); }
  .lp-tab:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .lp-stage { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 10px; }
  .lp-stage svg { display: block; width: 100%; height: auto; max-width: 100%; }
  .lp-read { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.85; margin-top: 14px; }
  .lp-read b { color: var(--text); font-weight: 400; }
  .lp-read .bad { color: ${CROSS}; }
  .lp-legend { display: flex; flex-wrap: wrap; gap: 9px 18px; margin-top: 12px; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
  .lp-legend span { display: inline-flex; align-items: center; gap: 6px; }
  .lp-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
`;

// The axis is a line through two actors. Extend it well past the stage so it
// reads as a line of action rather than a segment between two dots.
function axisEnds(axis) {
  const dx = axis.b.x - axis.a.x;
  const dy = axis.b.y - axis.a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const far = STAGE * 2;
  return {
    x1: axis.a.x - ux * far, y1: axis.a.y - uy * far,
    x2: axis.a.x + ux * far, y2: axis.a.y + uy * far,
    ux, uy,
  };
}

// A filled half-plane for one side of the axis, clipped to the stage.
// Perpendicular (-uy, ux) points to the side sideOfAxis calls +1.
function halfPlane(ends, side) {
  const far = STAGE * 2;
  const nx = -ends.uy * side * far;
  const ny = ends.ux * side * far;
  return [
    [ends.x1, ends.y1],
    [ends.x2, ends.y2],
    [ends.x2 + nx, ends.y2 + ny],
    [ends.x1 + nx, ends.y1 + ny],
  ].map((p) => p.join(",")).join(" ");
}

const short = (s, n = 20) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export default function CoveragePlan({ slots = [] }) {
  const plans = useMemo(() => {
    const by = new Map();
    for (const s of slots ?? []) {
      if (s?.camera_x == null || s?.camera_y == null) continue;
      const k = s.plan_id ?? "__none__";
      if (!by.has(k)) by.set(k, []);
      by.get(k).push(s);
    }
    return [...by.values()]
      .map((rows) => ({ rows, geo: planGeometry(rows) }))
      .filter((p) => p.geo.setups.length > 0)
      .sort((a, b) => b.geo.setups.length - a.geo.setups.length);
  }, [slots]);

  const [active, setActive] = useState(0);
  if (!plans.length) return null;

  const plan = plans[Math.min(active, plans.length - 1)];
  const { setups, axis, anchor, crossingIds, planName, reference } = plan.geo;
  const ends = axis ? axisEnds(axis) : null;
  const actors = reference?.actors ?? [];
  const aim = axis
    ? { x: (axis.a.x + axis.b.x) / 2, y: (axis.a.y + axis.b.y) / 2 }
    : { x: STAGE / 2, y: STAGE / 2 };
  const crossed = setups.filter((s) => crossingIds.has(s.row.id));
  // With no crossing there is no anchor, but the side every camera shares is
  // still worth shading — it is the half of the room the scene is shot from.
  const anchorSide = anchor ? anchor.side : (setups.find((s) => s.side !== 0)?.side ?? 0);

  return (
    <div className="lp-wrap">
      <style>{styles}</style>
      <div className="lp-label">Coverage plan</div>

      {plans.length > 1 && (
        <div className="lp-tabs">
          {plans.map((p, i) => (
            <button
              key={i}
              type="button"
              className={"lp-tab" + (i === Math.min(active, plans.length - 1) ? " on" : "")}
              onClick={() => setActive(i)}
            >
              {short(p.geo.planName, 28)} · {p.geo.setups.length}
            </button>
          ))}
        </div>
      )}

      <div className="lp-stage">
        <svg
          viewBox={`${-PAD} ${-PAD} ${STAGE + PAD * 2} ${STAGE + PAD * 2}`}
          role="img"
          aria-label={`Overhead plan of ${setups.length} camera setups${crossed.length ? `, ${crossed.length} crossing the line of action` : ""}`}
        >
          <defs>
            <clipPath id="lp-stage-clip">
              <rect x="0" y="0" width={STAGE} height={STAGE} />
            </clipPath>
          </defs>

          <rect x="0" y="0" width={STAGE} height={STAGE} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

          {ends && (
            <g clipPath="url(#lp-stage-clip)">
              {anchorSide !== 0 && (
                <polygon points={halfPlane(ends, anchorSide)} fill="rgba(123,63,228,0.08)" />
              )}
              {crossed.length > 0 && anchorSide !== 0 && (
                <polygon points={halfPlane(ends, -anchorSide)} fill="rgba(248,113,113,0.08)" />
              )}
              <line
                x1={ends.x1} y1={ends.y1} x2={ends.x2} y2={ends.y2}
                stroke="var(--accent)" strokeWidth="0.7" strokeDasharray="3 2"
              />
            </g>
          )}

          {/* Sightlines, drawn under everything else */}
          {setups.map((s) => (
            <line
              key={"l" + s.row.id}
              x1={s.camera.x} y1={s.camera.y} x2={aim.x} y2={aim.y}
              stroke={crossingIds.has(s.row.id) ? "rgba(248,113,113,0.4)" : "rgba(255,255,255,0.13)"}
              strokeWidth="0.4"
            />
          ))}

          {/* Actors */}
          {actors.map((a, i) => (
            <g key={"a" + i}>
              <circle cx={a.x} cy={a.y} r="2.7" fill="var(--text)" />
              <text
                x={clamp(a.x, 10, STAGE - 10)} y={a.y < 50 ? a.y + 6.6 : a.y - 4.4}
                fill="var(--text)" fontSize="4" fontFamily="monospace" textAnchor="middle"
              >
                {short(a.name, 12)}
              </text>
            </g>
          ))}

          {/* Cameras */}
          {setups.map((s) => {
            const bad = crossingIds.has(s.row.id);
            const isAnchor = anchor && s.row.id === anchor.row.id;
            const below = s.camera.y > 62;
            return (
              <g key={"c" + s.row.id}>
                {isAnchor && (
                  <circle cx={s.camera.x} cy={s.camera.y} r="4.2" fill="none" stroke={HOLD} strokeWidth="0.5" opacity="0.5" />
                )}
                <circle cx={s.camera.x} cy={s.camera.y} r="2.3" fill={bad ? CROSS : HOLD} />
                <text
                  x={clamp(s.camera.x, 14, STAGE - 14)}
                  y={below ? s.camera.y - 4.6 : s.camera.y + 7}
                  fill={bad ? CROSS : "var(--muted)"}
                  fontSize="3.7" fontFamily="monospace" textAnchor="middle"
                >
                  {short(s.name, 22)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="lp-read">
        <b>{setups.length}</b> {setups.length === 1 ? "setup" : "setups"} in <b>{short(planName, 40)}</b>
        {axis ? <> · line of action between <b>{axis.a.name}</b> and <b>{axis.b.name}</b></> : " · no two actors recorded, so screen direction can't be read"}
        {crossed.length > 0 && (
          <>
            {" · "}
            <span className="bad">
              {crossed.length === 1 ? `${short(crossed[0].name, 28)} crosses it` : `${crossed.length} setups cross it`}
            </span>
          </>
        )}
        {axis && crossed.length === 0 && setups.length > 1 && " · all on one side"}
        {anchor && <> · measured against <b>{short(anchor.name, 28)}</b></>}
      </div>

      <div className="lp-legend">
        <span><i className="lp-dot" style={{ background: HOLD }} />holds the line</span>
        {crossed.length > 0 && <span><i className="lp-dot" style={{ background: CROSS }} />crosses</span>}
        <span><i className="lp-dot" style={{ background: "var(--text)" }} />performer</span>
        {anchor && <span><i className="lp-dot" style={{ background: "transparent", border: `1px solid ${HOLD}` }} />reference</span>}
      </div>
    </div>
  );
}
