import ScenePreview from "./ScenePreview.jsx";
import { REHEARSAL_SECTIONS } from "./lib/rehearsalSections.js";

/*
  RehearsalSections — RevaultAI

  The sections below the tool. Copy comes from lib/rehearsalSections.js, which
  the prerender also reads, so the headings a crawler sees and the headings a
  visitor sees are the same strings.

  The diagrams are hand-drawn SVG rather than screenshots: they stay sharp,
  they weigh nothing, they cannot go stale against a UI change, and each one
  is drawn to the real geometry it describes — the 180-degree diagram really
  does put one camera on the wrong side of the axis.
*/

const C = {
  accent: "#7B3FE4",
  accentText: "#B9A2F0",
  amber: "#E5B769",
  text: "#E8E6F0",
  muted: "#8C889B",
  floor: "#1b1c24",
  line: "rgba(255,255,255,0.14)",
};

const frame = {
  width: "100%", height: "auto", display: "block",
  background: "#0E0F14", borderRadius: 8, border: "1px solid var(--border)",
};

function Mono({ x, y, children, size = 7, fill = C.muted, anchor = "start" }) {
  return (
    <text x={x} y={y} fill={fill} fontSize={size} fontFamily="monospace" textAnchor={anchor}>
      {children}
    </text>
  );
}

/* Keyframes on two tracks, and the fact that the gaps are filled in. */
function TimelineArt() {
  const marks = { ruth: [0, 4, 10], daniel: [0, 4, 5.5, 10] };
  const X = (t) => 30 + (t / 10) * 150;
  return (
    <svg viewBox="0 0 200 112" style={frame} role="img" aria-label="Two performer tracks with keyframes across a ten second timeline">
      <Mono x={6} y={34}>Ruth</Mono>
      <Mono x={6} y={66}>Daniel</Mono>
      {[30, 66].map((y, i) => {
        const key = i === 0 ? "ruth" : "daniel";
        const color = i === 0 ? C.accent : C.amber;
        return (
          <g key={key}>
            <line x1={30} y1={y} x2={180} y2={y} stroke={C.line} strokeWidth="1" />
            {/* the filled-in motion between marks */}
            <line x1={X(marks[key][0])} y1={y} x2={X(10)} y2={y} stroke={color} strokeWidth="2" opacity="0.35" />
            {marks[key].map((t) => (
              <g key={t}>
                <rect x={X(t) - 1.4} y={y - 6} width="2.8" height="12" rx="1" fill={color} />
              </g>
            ))}
          </g>
        );
      })}
      <line x1={X(5.5)} y1={18} x2={X(5.5)} y2={80} stroke={C.text} strokeWidth="0.7" strokeDasharray="2 2" opacity="0.7" />
      <Mono x={X(5.5)} y={14} anchor="middle" fill={C.text}>5.5s</Mono>
      <Mono x={30} y={94}>0s</Mono>
      <Mono x={180} y={94} anchor="end">10s</Mono>
      <Mono x={105} y={106} anchor="middle" fill={C.accentText}>a mark, then the walk between them</Mono>
    </svg>
  );
}

/* A dolly written as two marks, re-aiming at the subject as it travels. */
function MovesArt() {
  return (
    <svg viewBox="0 0 200 112" style={frame} role="img" aria-label="A camera dollying in toward a performer between a start and an end mark">
      <circle cx={104} cy={34} r="5" fill={C.amber} />
      <Mono x={114} y={36} fill={C.text}>subject</Mono>
      <path d="M 40 92 C 62 84 80 70 96 52" fill="none" stroke={C.accent} strokeWidth="1.2" strokeDasharray="3 3" opacity="0.8" />
      <g opacity="0.45">
        <rect x={33} y={86} width="14" height="11" rx="2" fill={C.accent} />
        <line x1={40} y1={86} x2={52} y2={70} stroke={C.accent} strokeWidth="1" />
      </g>
      <rect x={90} y={46} width="14" height="11" rx="2" fill={C.accent} />
      <line x1={97} y1={46} x2={103} y2={40} stroke={C.accent} strokeWidth="1" />
      <Mono x={16} y={104}>start mark 0.0s</Mono>
      <Mono x={184} y={104} anchor="end" fill={C.accentText}>end mark 10.0s</Mono>
    </svg>
  );
}

/* Three setups on one side of the axis, all on the same performance. */
function AnglesArt() {
  const a = { x: 78, y: 34 }, b = { x: 122, y: 34 };
  const cams = [
    { x: 100, y: 92, label: "Wide" },
    { x: 56, y: 80, label: "Single" },
    { x: 146, y: 80, label: "Over-the-shoulder" },
  ];
  return (
    <svg viewBox="0 0 200 112" style={frame} role="img" aria-label="Three cameras on one side of the axis between two performers">
      <line x1={20} y1={34} x2={180} y2={34} stroke={C.amber} strokeWidth="0.7" strokeDasharray="3 2" opacity="0.55" />
      <circle cx={a.x} cy={a.y} r="4.5" fill={C.accent} />
      <circle cx={b.x} cy={b.y} r="4.5" fill={C.amber} />
      {cams.map((c, i) => {
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const dx = mid.x - c.x, dy = mid.y - c.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        const nx = -uy, ny = ux;
        const reach = len * 0.92, spread = 13;
        return (
          <g key={i}>
            <path
              d={`M ${c.x} ${c.y} L ${c.x + ux * reach + nx * spread} ${c.y + uy * reach + ny * spread} L ${c.x + ux * reach - nx * spread} ${c.y + uy * reach - ny * spread} Z`}
              fill={C.accent} opacity="0.12"
            />
            <rect x={c.x - 6} y={c.y - 4.5} width="12" height="9" rx="1.6" fill={C.accent} />
          </g>
        );
      })}
      <Mono x={100} y={106} anchor="middle" fill={C.accentText}>one performance · three setups · same side of the line</Mono>
    </svg>
  );
}

/* Flying the shot camera, dropping a mark wherever you stop. */
function WalkArt() {
  const caps = [["W", 86, 20], ["A", 72, 36], ["S", 86, 36], ["D", 100, 36]];
  return (
    <svg viewBox="0 0 200 112" style={frame} role="img" aria-label="A camera path through a room with marks dropped along it, driven by W A S D">
      <rect x={18} y={54} width="164" height="42" fill={C.floor} stroke={C.line} />
      <path d="M 30 88 L 62 76 L 104 82 L 150 64" fill="none" stroke={C.accent} strokeWidth="1.2" strokeDasharray="3 3" />
      {[[30, 88], [62, 76], [104, 82], [150, 64]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.6" fill={C.accent} opacity={i === 3 ? 1 : 0.5} />
      ))}
      <rect x={144} y={59} width="13" height="10" rx="2" fill={C.accent} />
      {caps.map(([k, x, y]) => (
        <g key={k}>
          <rect x={x} y={y} width="12" height="12" rx="2" fill="none" stroke={C.muted} strokeWidth="0.8" />
          <text x={x + 6} y={y + 8.6} fill={C.text} fontSize="7" fontFamily="monospace" textAnchor="middle">{k}</text>
        </g>
      ))}
      <Mono x={100} y={108} anchor="middle" fill={C.accentText}>every stop writes a mark on the timeline</Mono>
    </svg>
  );
}

/* The axis, a legal camera, and one that has crossed it. */
function ContinuityArt() {
  const a = { x: 74, y: 52 }, b = { x: 126, y: 52 };
  return (
    <svg viewBox="0 0 200 112" style={frame} role="img" aria-label="The 180 degree line between two performers, with one camera legal and one crossed">
      <line x1={14} y1={52} x2={186} y2={52} stroke={C.amber} strokeWidth="0.8" strokeDasharray="3 2" opacity="0.7" />
      <Mono x={14} y={48} fill={C.amber} size={6}>180° LINE</Mono>
      <rect x={14} y={14} width="172" height="38" fill={C.amber} opacity="0.05" />
      <circle cx={a.x} cy={a.y} r="4.5" fill={C.accent} />
      <circle cx={b.x} cy={b.y} r="4.5" fill={C.accentText} />
      <g>
        <rect x={94} y={84} width="13" height="10" rx="2" fill={C.accent} />
        <line x1={100} y1={84} x2={100} y2={62} stroke={C.accent} strokeWidth="1" />
        <Mono x={100} y={104} anchor="middle" fill={C.accentText}>stays on one side</Mono>
      </g>
      <g>
        <rect x={94} y={20} width="13" height="10" rx="2" fill={C.amber} opacity="0.85" />
        <line x1={100} y1={30} x2={100} y2={44} stroke={C.amber} strokeWidth="1" />
        <Mono x={153} y={26} fill={C.amber} size={6}>⚠ crossed</Mono>
      </g>
    </svg>
  );
}

function Visual({ kind }) {
  if (kind === "scene") return <ScenePreview sceneId="walk-and-talk" height={210} threeD={false} />;
  if (kind === "timeline") return <TimelineArt />;
  if (kind === "moves") return <MovesArt />;
  if (kind === "angles") return <AnglesArt />;
  if (kind === "walk") return <WalkArt />;
  return <ContinuityArt />;
}

const css = `
  .rh-secs { max-width: 1040px; margin: 0 auto; padding: 0 48px; }
  .rh-sec { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 36px;
    align-items: center; padding: 34px 0; border-top: 1px solid var(--border); }
  .rh-sec:nth-child(even) .rh-sec-art { order: -1; }
  .rh-sec-eyebrow { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.2em;
    color: var(--accent-text); text-transform: uppercase; margin-bottom: 10px; }
  .rh-sec h2 { font-family: 'Syne', sans-serif; font-size: 21px; font-weight: 700;
    color: var(--text); margin: 0 0 10px; line-height: 1.3; letter-spacing: -0.01em; }
  .rh-sec p { font-family: 'DM Mono', monospace; font-size: 12.5px; color: var(--muted);
    line-height: 1.85; margin: 0; }
  @media (max-width: 860px) {
    .rh-secs { padding: 0 20px; }
    .rh-sec { grid-template-columns: 1fr; gap: 20px; padding: 26px 0; }
    .rh-sec:nth-child(even) .rh-sec-art { order: 0; }
  }
`;

export default function RehearsalSections() {
  return (
    <div className="rh-secs">
      <style>{css}</style>
      {REHEARSAL_SECTIONS.map((s) => (
        <section className="rh-sec" key={s.id}>
          <div>
            <div className="rh-sec-eyebrow">{s.eyebrow}</div>
            <h2>{s.h2}</h2>
            <p>{s.copy}</p>
          </div>
          <div className="rh-sec-art"><Visual kind={s.visual} /></div>
        </section>
      ))}
    </div>
  );
}
