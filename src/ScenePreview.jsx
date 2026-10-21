import { useEffect, useMemo, useRef, useState } from "react";
import { stateAt } from "./lib/rehearsal.js";
import { readStage } from "./lib/stageGeometry.js";
import { planShapes } from "./lib/setGeometry.js";
import { activeRoom } from "./lib/setEdit.js";
import { STARTERS } from "./lib/starters.js";
import { fitFor, trailFor } from "./lib/scenePreview.js";

/*
  ScenePreview — RevaultAI

  The hero used to be an empty band. This plays the starter scenes in it,
  one after another, so the first thing anyone sees is a scene being blocked
  over time rather than a headline about it.

  Deliberately SVG and nothing else. The 3D view is lazy-loaded for a reason
  — three.js plus the body meshes is most of a megabyte — and putting that
  above the fold would cost the page the load time it needs to rank. The plan
  is the honest picture of what this tool is anyway: positions over a
  timeline, with the path each performer walks drawn out.

  It stops itself when scrolled out of view or the tab is hidden, and renders
  a single still frame for anyone who has asked for reduced motion.
*/

const FPS = 24;            // a decorative loop does not need 60
const HOLD = 0.9;          // seconds held on the last frame before the next scene

export default function ScenePreview({ height = 320 }) {
  const scenes = useMemo(
    () => STARTERS.map((st) => {
      const r = st.make();
      return {
        name: st.name,
        r,
        room: activeRoom(r),
        fit: fitFor(r),
        trails: r.actors.map((_, i) => trailFor(r, i)),
      };
    }),
    [],
  );

  // Asked for less motion: one still frame, mid-scene, and no clock at all.
  const [still] = useState(
    () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
  );
  const [idx, setIdx] = useState(0);
  const [t, setT] = useState(() => (still ? scenes[0].r.duration * 0.6 : 0));
  const [live, setLive] = useState(!still);
  const box = useRef(null);

  // Only run while it is actually on screen and the tab is in front.
  useEffect(() => {
    if (still) return;
    const el = box.current;
    const vis = () => setLive(!document.hidden);
    document.addEventListener("visibilitychange", vis);
    let io = null;
    if (el && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver((es) => setLive(es[0].isIntersecting && !document.hidden), { threshold: 0.1 });
      io.observe(el);
    }
    return () => { document.removeEventListener("visibilitychange", vis); io?.disconnect(); };
  }, [still]);

  useEffect(() => {
    if (!live || still) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const step = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      if (acc >= 1 / FPS) {
        acc = 0;
        setT((prev) => {
          const dur = scenes[idx].r.duration;
          const next = prev + 1 / FPS;
          if (next >= dur + HOLD) {
            setIdx((i) => (i + 1) % scenes.length);
            return 0;
          }
          return next;
        });
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [live, idx, scenes, still]);

  const scene = scenes[idx];
  const clamped = Math.min(t, scene.r.duration);
  const now = stateAt(scene.r, clamped);
  const read = readStage(now.camera, now.actors);
  const v = scene.fit;
  const plan = scene.room ? planShapes(scene.room) : null;

  // The camera's coverage, so it reads as a camera and not a dot.
  const wedge = (() => {
    const half = 24, reach = v.size * 0.75;
    const rad = (d) => ((d - 90) * Math.PI) / 180;
    const a1 = rad(now.camera.rotation - half), a2 = rad(now.camera.rotation + half);
    return `M ${now.camera.x} ${now.camera.y} L ${now.camera.x + Math.cos(a1) * reach} ${now.camera.y + Math.sin(a1) * reach} A ${reach} ${reach} 0 0 1 ${now.camera.x + Math.cos(a2) * reach} ${now.camera.y + Math.sin(a2) * reach} Z`;
  })();

  const unit = v.size / 420;
  const px = (n) => n * unit;

  return (
    <div ref={box} style={{ position: "relative" }}>
      <svg
        viewBox={`${v.x} ${v.y} ${v.size} ${v.size}`}
        style={{ width: "100%", height, display: "block", background: "#0E0F14", borderRadius: 8, border: "1px solid var(--border)" }}
        role="img"
        aria-label={`A rehearsal of ${scene.name}, blocked over a timeline`}
      >
        <defs>
          <pattern id="spgrid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect x={v.x} y={v.y} width={v.size} height={v.size} fill="url(#spgrid)" />

        {plan && (
          <g>
            <rect x={plan.floor.x} y={plan.floor.y} width={plan.floor.w} height={plan.floor.h} fill="#1b1c24" opacity="0.9" />
            {plan.props.map((p) => (
              <rect key={p.id} x={p.x} y={p.y} width={p.w} height={p.h} rx="0.6" fill={p.tall ? "#44455260" : "#3c3d48"} />
            ))}
            {plan.walls.map((w) => (
              <rect key={w.id} x={w.x} y={w.y} width={w.w} height={w.h} fill={w.opening ? "#9fc4d8" : "#5a5b68"} opacity={w.opening ? 0.55 : 0.9} />
            ))}
          </g>
        )}

        <path d={wedge} fill="#7B3FE4" opacity="0.1" />

        {/* Where each performer walks, for the whole scene */}
        {scene.r.actors.map((actor, i) => (
          <polyline
            key={actor.id} points={scene.trails[i]} fill="none" stroke={actor.color}
            strokeWidth={px(1.6)} opacity="0.3" strokeDasharray={`${px(3)} ${px(3)}`}
          />
        ))}

        {now.actors.map((a) => {
          const rad = (((a.facing ?? 0) - 90) * Math.PI) / 180;
          return (
            <g key={a.id}>
              <line x1={a.x} y1={a.y} x2={a.x + Math.cos(rad) * px(26)} y2={a.y + Math.sin(rad) * px(26)} stroke={a.color} strokeWidth={px(2)} opacity="0.8" />
              <circle cx={a.x} cy={a.y} r={px(9)} fill={a.color} />
              <text x={a.x} y={a.y - px(15)} fill="#E8E6F0" fontSize={px(13)} fontFamily="monospace" textAnchor="middle">{a.name}</text>
            </g>
          );
        })}

        {(() => {
          const rad = ((now.camera.rotation - 90) * Math.PI) / 180;
          return (
            <g>
              <line x1={now.camera.x} y1={now.camera.y} x2={now.camera.x + Math.cos(rad) * px(28)} y2={now.camera.y + Math.sin(rad) * px(28)} stroke="#7B3FE4" strokeWidth={px(2)} />
              <rect x={now.camera.x - px(10)} y={now.camera.y - px(8)} width={px(20)} height={px(16)} rx={px(3)} fill="#7B3FE4" />
            </g>
          );
        })()}
      </svg>

      {/* The auto-written read, which is the thing worth showing off */}
      <div
        style={{
          position: "absolute", left: 12, right: 12, bottom: 12,
          fontFamily: "'DM Mono', monospace", fontSize: 11, lineHeight: 1.6,
          color: "rgba(255,255,255,0.9)", background: "rgba(10,11,16,0.82)",
          border: "1px solid var(--border)", borderRadius: 6, padding: "7px 10px",
          backdropFilter: "blur(6px)", pointerEvents: "none",
        }}
      >
        <span style={{ color: "var(--accent-text)" }}>{scene.name}</span>
        {" · "}{clamped.toFixed(1)}s
        {read.shotSize ? ` · ${read.shotSize}${read.subject ? " on " + read.subject : ""}` : ""}
        <div style={{ height: 2, background: "rgba(255,255,255,0.14)", marginTop: 6, borderRadius: 2 }}>
          <div style={{ height: 2, width: `${(clamped / scene.r.duration) * 100}%`, background: "var(--accent)", borderRadius: 2 }} />
        </div>
      </div>
    </div>
  );
}
