import { useRef, useState } from "react";
import { fetchCutShots, targetFormat } from "./lib/cutClips.js";

/*
  FinishRender — RevaultAI (Finish, pass 5)
  Renders the assembled cut into one MP4 in the browser. The clips are
  trimmed to the cut's in and out points and joined; nothing is uploaded,
  nothing is generated, and no credits are spent. The heavy WebAssembly
  build is imported only when someone asks for a render.
*/

const slug = (s, n = 32) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, n) || "cut";

export default function FinishRender({ cut, urls, title }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [pct, setPct] = useState(null);
  const [result, setResult] = useState(null);
  const abortRef = useRef(null);

  async function render() {
    setBusy(true);
    setResult(null);
    setPct(null);
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const { shots, byId, failed } = await fetchCutShots({
        cut, urls, signal: ac.signal, onStatus: (m) => setStatus(m),
      });

      const got = Object.values(byId);
      if (!got.length) {
        const why = failed[0]?.why;
        setResult({
          error: why
            ? `Couldn't fetch the clips — ${why}.`
            : "Couldn't fetch any of the clips. Reload the page and try again, as the playback links may have expired.",
        });
        return;
      }

      const format = targetFormat(got.map((c) => c.info));
      const { renderCut } = await import("./lib/renderCut.js");

      const out = await renderCut({
        shots, byId, format, signal: ac.signal,
        onStatus: (m, f) => { setStatus(m); setPct(f); },
      });

      const base = slug(title || "cut");
      const blob = new Blob([out.data], { type: "video/mp4" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `${base}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 60000);

      const used = shots.filter((s) => byId[s.generationId]).length;
      setResult({
        pieces: out.pieces,
        seconds: out.seconds,
        mb: (blob.size / 1048576).toFixed(1),
        format,
        skipped: failed.length ? shots.length - used : 0,
        why: failed[0]?.why || "",
      });
    } catch (err) {
      if (err?.name === "AbortError") setResult({ error: "Render canceled." });
      else setResult({ error: err?.message || "The render failed." });
    } finally {
      abortRef.current = null;
      setBusy(false);
      setStatus("");
      setPct(null);
    }
  }

  if (!cut?.shots?.length) return null;

  const total = cut.shots.reduce((s, x) => s + (Number(x.to) - Number(x.from)), 0);

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "18px 20px", background: "var(--surface)", marginBottom: 18 }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 10 }}>
        Render one video
      </div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.8, marginBottom: 14 }}>
        Joins this cut into a single MP4 you can upload anywhere — no editor needed. It renders on your own machine, so nothing is uploaded and no credits are spent. Roughly {Math.round(total)} seconds of footage; expect a few minutes, and keep this tab open while it works.
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn-primary" onClick={render} disabled={busy}>
          {busy ? status || "Working…" : "Render the cut"}
        </button>
        {busy && (
          <button className="btn-ghost" onClick={() => abortRef.current?.abort()}>Cancel</button>
        )}
      </div>

      {busy && pct !== null && (
        <div style={{ marginTop: 14, height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${Math.round(pct * 100)}%`, height: "100%", background: "var(--accent)", transition: "width 0.3s" }} />
        </div>
      )}

      {result?.error && (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#F87171", marginTop: 12 }}>{result.error}</div>
      )}
      {result && !result.error && (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.8, marginTop: 12 }}>
          <span style={{ color: "#4ADE80" }}>✓</span> {result.pieces} piece{result.pieces === 1 ? "" : "s"} joined into {result.seconds}s at {result.format.width}&times;{result.format.height}, {result.format.fps} fps — {result.mb} MB.
          {result.skipped > 0 && <div style={{ color: "#E5B769" }}>{result.skipped} shot{result.skipped === 1 ? "" : "s"} left out{result.why ? ` — ${result.why}` : " because a clip couldn't be fetched"}.</div>}
        </div>
      )}
    </div>
  );
}
