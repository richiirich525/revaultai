import { useEffect, useMemo, useRef, useState } from "react";
import { buildTimeline, locate, fmt } from "./lib/cutTimeline.js";

/*
  CutPreview — RevaultAI (Finish, pass 3)
  Plays the assembled cut straight through in the browser. Two players take
  turns: while one plays a shot, the other loads the next and waits at its
  in-point, so cuts land cleanly. Nothing is rendered or exported.
*/

const styles = `
  .cp { border: 1px solid var(--accent); border-radius: 8px; padding: 16px; background: var(--surface); margin-bottom: 18px; }
  .cp-screen { position: relative; width: 100%; aspect-ratio: 16 / 9; background: #000; border-radius: 4px; overflow: hidden; }
  .cp-screen video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; transition: opacity 0.05s linear; }
  .cp-cap { position: absolute; left: 12px; bottom: 10px; right: 12px; font-family: 'DM Mono', monospace; font-size: 10px; color: rgba(255,255,255,0.85); text-shadow: 0 1px 3px rgba(0,0,0,0.9); pointer-events: none; letter-spacing: 0.04em; }
  .cp-wait { position: absolute; top: 10px; right: 12px; font-family: 'DM Mono', monospace; font-size: 9px; color: rgba(255,255,255,0.6); letter-spacing: 0.08em; }
  .cp-strip { position: relative; display: flex; height: 22px; margin: 12px 0 10px; border-radius: 3px; overflow: hidden; cursor: pointer; background: var(--bg3); }
  .cp-piece { height: 100%; border-right: 1px solid var(--bg); box-sizing: border-box; }
  .cp-head { position: absolute; top: -2px; bottom: -2px; width: 2px; background: #fff; pointer-events: none; box-shadow: 0 0 4px rgba(0,0,0,0.8); }
  .cp-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .cp-btn { background: none; border: 1px solid var(--border); color: var(--muted); border-radius: 3px; padding: 6px 12px; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.08em; cursor: pointer; }
  .cp-btn:hover { color: var(--text); border-color: var(--muted); }
  .cp-btn.on { color: var(--accent); border-color: var(--accent); }
  .cp-time { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--text); margin-left: auto; }
`;

export default function CutPreview({ shots, urls }) {
  // Rebuild only when the cut changes or another clip becomes playable.
  const key = (shots ?? []).map((s) => `${s.generationId}:${s.from}:${s.to}:${urls?.[s.generationId] ? 1 : 0}`).join("|");
  const tl = useMemo(() => buildTimeline(shots, urls), [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const aRef = useRef(null);
  const bRef = useRef(null);
  const S = useRef({ index: 0, active: 0, playing: false, next: null, advancing: false });
  const primed = useRef(false);
  const raf = useRef(0);
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [clock, setClock] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [muted, setMuted] = useState(false);

  const els = () => [aRef.current, bRef.current];

  // Load a shot into a player and park it at the right moment.
  function cue(el, piece, at) {
    return new Promise((resolve) => {
      if (!el || !piece) return resolve();
      const url = urls[piece.generationId];
      const target = at ?? piece.from;
      const timer = setTimeout(resolve, 8000);
      const done = () => { clearTimeout(timer); resolve(); };
      const seek = () => {
        if (Math.abs(el.currentTime - target) < 0.02 && el.readyState >= 2) return done();
        el.addEventListener("seeked", done, { once: true });
        el.currentTime = target;
      };
      if (el.dataset.src !== url) {
        el.dataset.src = url;
        el.addEventListener("loadedmetadata", seek, { once: true });
        el.src = url;
        el.load();
      } else if (el.readyState >= 1) seek();
      else el.addEventListener("loadedmetadata", seek, { once: true });
    });
  }

  function preload(i) {
    const s = S.current;
    const piece = tl.pieces[i];
    s.next = piece ? { index: i, ready: cue(els()[1 - s.active], piece) } : null;
  }

  async function jump(seconds) {
    const s = S.current;
    if (!tl.pieces.length) return;
    const { index: i, time } = locate(tl, seconds);
    for (const v of els()) v?.pause();
    s.index = i; setIndex(i); setClock(Math.max(0, Math.min(tl.total, seconds)));
    setWaiting(true);
    await cue(els()[s.active], tl.pieces[i], time);
    setWaiting(false);
    preload(i + 1);
    if (s.playing) els()[s.active]?.play().catch(() => {});
  }

  async function advance() {
    const s = S.current;
    const i = s.index + 1;
    const cur = els()[s.active];
    if (i >= tl.pieces.length) {
      cur?.pause();
      s.playing = false; setPlaying(false); setClock(tl.total);
      return;
    }
    s.advancing = true;
    cur?.pause(); // hold the last frame rather than run past the out-point
    if (!s.next || s.next.index !== i) preload(i);
    setWaiting(true);
    await s.next.ready;
    setWaiting(false);
    const nextEl = els()[1 - s.active];
    s.active = 1 - s.active; setActive(s.active);
    s.index = i; setIndex(i);
    if (s.playing) await nextEl.play().catch(() => {});
    s.advancing = false;
    preload(i + 1);
  }

  // Check the playhead every frame, so each shot ends on its out-point.
  useEffect(() => {
    const tick = () => {
      const s = S.current;
      const el = els()[s.active];
      const p = tl.pieces[s.index];
      if (el && p && s.playing && !s.advancing) {
        setClock(p.start + Math.max(0, Math.min(p.length, el.currentTime - p.from)));
        if (el.currentTime >= p.to - 0.03 || el.ended) advance();
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [tl]); // eslint-disable-line react-hooks/exhaustive-deps

  // A new cut, or newly playable clips: start again from the top.
  useEffect(() => {
    const s = S.current;
    for (const v of els()) v?.pause();
    Object.assign(s, { index: 0, active: 0, playing: false, next: null, advancing: false });
    setIndex(0); setActive(0); setPlaying(false); setClock(0);
    if (tl.pieces.length) cue(aRef.current, tl.pieces[0]).then(() => preload(1));
  }, [tl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { for (const v of els()) v?.pause(); }, []);

  useEffect(() => { for (const v of els()) if (v) v.muted = muted; }, [muted]);

  function togglePlay() {
    const s = S.current;
    if (!tl.pieces.length) return;
    // iPhones only let a video play from code after it has played once from a
    // tap, so the waiting player gets a silent nudge on the first press.
    if (!primed.current) {
      primed.current = true;
      const other = els()[1 - s.active];
      if (other?.src) {
        other.muted = true;
        other.play().then(() => {
          other.pause();
          const n = s.next ? tl.pieces[s.next.index] : null;
          if (n) other.currentTime = n.from;
        }).catch(() => {}).finally(() => { other.muted = muted; });
      }
    }
    if (s.playing) {
      s.playing = false; setPlaying(false);
      els()[s.active]?.pause();
      return;
    }
    s.playing = true; setPlaying(true);
    if (clock >= tl.total - 0.05) { jump(0); return; }
    els()[s.active]?.play().catch(() => {});
  }

  function stepShot(dir) {
    const i = Math.max(0, Math.min(tl.pieces.length - 1, index + dir));
    jump(tl.pieces[i].start);
  }

  function onStrip(e) {
    const r = e.currentTarget.getBoundingClientRect();
    jump(((e.clientX - r.left) / r.width) * tl.total);
  }

  if (!tl.pieces.length) {
    return (
      <div className="cp">
        <style>{styles}</style>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)" }}>
          {tl.waiting ? "Loading the clips for this cut…" : "Nothing to preview yet."}
        </div>
      </div>
    );
  }

  const p = tl.pieces[index];

  return (
    <div className="cp">
      <style>{styles}</style>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 10 }}>
        Watch the cut
      </div>

      <div className="cp-screen">
        <video ref={aRef} playsInline preload="auto" style={{ opacity: active === 0 ? 1 : 0 }} />
        <video ref={bRef} playsInline preload="auto" style={{ opacity: active === 1 ? 1 : 0 }} />
        {waiting && <div className="cp-wait">Loading next shot…</div>}
        {p && (
          <div className="cp-cap">
            Shot {index + 1} of {tl.pieces.length}{p.role ? ` · ${p.role}` : ""}{p.why ? ` — ${p.why}` : ""}
          </div>
        )}
      </div>

      <div className="cp-strip" onClick={onStrip}>
        {tl.pieces.map((q, i) => (
          <div
            key={i}
            className="cp-piece"
            style={{ width: `${(q.length / tl.total) * 100}%`, background: i === index ? "var(--accent)" : i % 2 ? "rgba(123,63,228,0.35)" : "rgba(123,63,228,0.2)" }}
            title={`Shot ${i + 1}${q.role ? " · " + q.role : ""} (${q.length.toFixed(1)}s)`}
          />
        ))}
        <div className="cp-head" style={{ left: `${(clock / tl.total) * 100}%` }} />
      </div>

      <div className="cp-row">
        <button className="cp-btn" onClick={() => jump(0)} title="Back to the start">⏮</button>
        <button className="cp-btn" onClick={() => stepShot(-1)} title="Previous shot">‹ Shot</button>
        <button className="cp-btn on" onClick={togglePlay}>{playing ? "Pause" : clock >= tl.total - 0.05 ? "Play again" : "Play"}</button>
        <button className="cp-btn" onClick={() => stepShot(1)} title="Next shot">Shot ›</button>
        <button className={"cp-btn" + (muted ? " on" : "")} onClick={() => setMuted((m) => !m)}>{muted ? "Sound off" : "Sound on"}</button>
        <span className="cp-time">{fmt(clock)} / {fmt(tl.total)}</span>
      </div>

      {tl.waiting > 0 && (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", marginTop: 8 }}>
          {tl.waiting} shot{tl.waiting === 1 ? "" : "s"} still loading — the preview will include {tl.waiting === 1 ? "it" : "them"} once ready.
        </div>
      )}
    </div>
  );
}