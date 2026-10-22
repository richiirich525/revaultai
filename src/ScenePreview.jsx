import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { newRehearsal, stateAt } from "./lib/rehearsal.js";
import { motionState } from "./lib/performers.js";
import { readStage } from "./lib/stageGeometry.js";
import { planShapes } from "./lib/setGeometry.js";
import { activeRoom } from "./lib/setEdit.js";
import { STARTERS, getStarter } from "./lib/starters.js";
import { fitFor, trailFor } from "./lib/scenePreview.js";

/*
  ScenePreview — RevaultAI

  The hero plays a starter scene so the first thing anyone sees is a scene
  being rehearsed rather than a headline about rehearsing.

  It is built in two layers, which is the whole trick:

    1. The plan, in plain SVG, about 13kB and part of the main bundle. It
       paints immediately and is what a crawler and a slow connection get.
    2. The 3D view, lazy-loaded. three.js and the camera view are 681kB of
       JavaScript and the performer meshes another 2.7MB, so none of it is
       allowed near the first paint. It arrives a moment later and takes over.

  The plan is therefore the Suspense fallback rather than a spinner: the hero
  is never empty and never janks. Reduced motion stops at layer one, which
  respects the preference and saves the download at the same time.
*/

const Stage3D = lazy(() => import("./CameraView.jsx"));

const FPS = 24;     // a decorative loop does not need 60
const HOLD = 1.2;   // seconds held on the last frame before looping

export default function ScenePreview({
  sceneId = "dinner-argument",
  rehearsal = null,
  sceneKey = null,
  height = 320,
  threeD = true,
}) {
  const scene = useMemo(() => {
    /*
      A rehearsal handed in wins: that is the scene someone is actually
      working on, mid-edit and all. Without one this falls back to a named
      starter, which is what the marketing sections further down the page use,
      and "empty" matches the studio's Empty scene button — a real choice
      someone can make, so the hero follows it rather than carrying on with a
      scene they have just replaced.
    */
    const st = (rehearsal || sceneId === "empty") ? null : (getStarter(sceneId) ?? STARTERS[0]);
    const r = rehearsal ?? (st ? st.make() : newRehearsal());
    return {
      name: st ? st.name : rehearsal ? (rehearsal.title?.trim() || "your scene") : "an empty stage",
      r,
      room: activeRoom(r),
      fit: fitFor(r),
      trails: r.actors.map((_, i) => trailFor(r, i)),
    };
  }, [sceneId, rehearsal]);

  // Rewinding is for a scene someone swapped to, never for an edit to the one
  // already playing — otherwise the loop restarts under every drag.
  const identity = sceneKey ?? sceneId;

  // Asked for less motion: one still frame, no clock, and no 3D download.
  const [still] = useState(
    () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
  );
  const [t, setT] = useState(() => (still ? scene.r.duration * 0.55 : 0));
  const [live, setLive] = useState(!still);
  // Latches once the hero has been on screen, so scrolling away does not tear
  // the 3D view down and fetch it all again on the way back.
  const [seen, setSeen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (still) return;
    const el = box.current;
    const onVis = () => setLive(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    let io = null;
    if (el && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (es) => {
          const on = es[0].isIntersecting;
          if (on) setSeen(true);
          setLive(on && !document.hidden);
        },
        { threshold: 0.1 },
      );
      io.observe(el);
    } else {
      setSeen(true);
    }
    return () => { document.removeEventListener("visibilitychange", onVis); io?.disconnect(); };
  }, [still]);

  /*
    Switching scenes rewinds. Without this the new scene picks up at whatever
    second the last one had reached, so a four-second loop can open two thirds
    of the way through and read as broken.
  */
  const mounted = useRef(false);
  const durRef = useRef(scene.r.duration);
  useEffect(() => { durRef.current = scene.r.duration; }, [scene.r.duration]);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    setT(still ? durRef.current * 0.55 : 0);
  }, [identity, still]);

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
        setT((prev) => (prev + 1 / FPS >= scene.r.duration + HOLD ? 0 : prev + 1 / FPS));
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // Keyed on the duration, not the scene: an edit must not tear the clock
    // down and restart it sixty times a second.
  }, [live, still, scene.r.duration]);

  const clamped = Math.min(t, scene.r.duration);
  const now = stateAt(scene.r, clamped);
  const read = readStage(now.camera, now.actors);
  const want3D = threeD && !still && seen;

  const v = scene.fit;
  const plan = scene.room ? planShapes(scene.room) : null;
  const unit = v.size / 420;
  const px = (n) => n * unit;

  const wedge = (() => {
    const half = 24, reach = v.size * 0.75;
    const rad = (d) => ((d - 90) * Math.PI) / 180;
    const a1 = rad(now.camera.rotation - half), a2 = rad(now.camera.rotation + half);
    return `M ${now.camera.x} ${now.camera.y} L ${now.camera.x + Math.cos(a1) * reach} ${now.camera.y + Math.sin(a1) * reach} A ${reach} ${reach} 0 0 1 ${now.camera.x + Math.cos(a2) * reach} ${now.camera.y + Math.sin(a2) * reach} Z`;
  })();

  // Layer one. Also the Suspense fallback, so the hero is never blank.
  const planView = (
    <svg
      viewBox={`${v.x} ${v.y} ${v.size} ${v.size}`}
      style={{ width: "100%", height, display: "block", background: "#0E0F14" }}
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
  );

  return (
    <div
      ref={box}
      style={{
        position: "relative", borderRadius: 8, overflow: "hidden",
        border: "1px solid var(--border)", background: "#0E0F14",
      }}
    >
      <div style={{ height, width: "100%" }}>
        {want3D ? (
          <Suspense fallback={planView}>
            <Stage3D
              fill
              state={motionState(scene.r, clamped)}
              lens={read.lens}
              subject={read.subject}
              aspect={scene.r.aspect ?? "16:9"}
              setId={scene.r.setId}
              setData={scene.room}
              light={scene.r.light}
              hiddenPieces={[]}
              extras={[]}
              height={now.camera.height ?? null}
              lensMmOverride={now.camera.lens ?? null}
              title={`${scene.name}${read.shotSize ? " · " + read.shotSize : ""}`}
            />
          </Suspense>
        ) : planView}
      </div>

      {/* The read the studio writes for you, which is the thing worth showing */}
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
