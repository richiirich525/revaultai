import { useState } from "react";
import { fetchCutShots } from "./lib/cutClips.js";
import { buildEdl, buildCutSheet, buildReadme } from "./lib/edl.js";
import { zipParts } from "./lib/zipStore.js";

/*
  FinishExport — RevaultAI (Finish, pass 4)
  One download with everything needed to open the cut in an editor: the
  source clips under clean names, an EDL for Resolve and Premiere, a cut sheet
  for everyone else, and instructions. Built in the browser; nothing rendered.
*/

const slug = (s, n = 40) => String(s || "").toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "").slice(0, n) || "clip";

export default function FinishExport({ cut, urls, gens, title, scene }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);

  async function exportEdit() {
    setBusy(true);
    setResult(null);

    const { shots, byId, failed } = await fetchCutShots({ cut, urls, onStatus: setStatus });
    if (!shots.length) {
      setBusy(false);
      setStatus("");
      return;
    }

    // Name the clips in fetch order, which is the order the EDL refers to them.
    const clips = {};
    const files = [];
    for (const id of Object.keys(byId)) {
      const model = gens?.find((g) => g.id === id)?.model;
      const name = `clip-${String(Object.keys(clips).length + 1).padStart(2, "0")}_${slug(model)}.mp4`;
      clips[id] = { name, ...byId[id].info };
      files.push({ name, data: byId[id].data });
    }

    const got = Object.values(clips);
    if (!got.length) {
      setBusy(false);
      setStatus("");
      const why = failed[0]?.why;
      setResult({
        error: why
          ? `Couldn't fetch the clips — ${why}.`
          : "Couldn't fetch any of the clips. Reload the page and try again, as the playback links may have expired.",
      });
      return;
    }

    // The timeline takes the rate most of the clips share.
    const counts = {};
    for (const c of got) counts[c.nominal] = (counts[c.nominal] || 0) + 1;
    const fps = Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
    const odd = got.filter((c) => c.nominal !== fps);
    const mixedRates = odd.length
      ? `${odd.map((c) => `${c.name} is ${c.fps} fps`).join("; ")}, while the timeline is ${fps} fps. Those shots' in and out points may land a few frames off — check them after importing, or conform the clips to ${fps} fps first.`
      : "";

    setStatus("Writing the edit…");
    const base = slug(title || "scene", 32);
    const edlName = `${base}.edl`;
    const edl = buildEdl({ title: title || "RevaultAI scene", shots, clips, fps });
    const sheet = buildCutSheet({ title: title || "RevaultAI scene", scene, shots, clips, fps, cut, mixedRates });
    const readme = buildReadme({ edlName, fps });

    const parts = zipParts([
      { name: edlName, data: edl },
      { name: "cut-sheet.txt", data: sheet },
      { name: "README.txt", data: readme },
      ...files,
    ]);
    const blob = new Blob(parts, { type: "application/zip" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${base}-edit.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 60000);

    const used = shots.filter((s) => clips[s.generationId]).length;
    setResult({
      shots: used,
      clips: got.length,
      fps,
      mb: (blob.size / 1048576).toFixed(1),
      mixedRates,
      skipped: failed.length ? shots.length - used : 0,
      why: failed[0]?.why || "",
    });
    setBusy(false);
    setStatus("");
  }

  if (!cut?.shots?.length) return null;

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "18px 20px", background: "var(--surface)", marginBottom: 18 }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 10 }}>
        Take it into your editor
      </div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.8, marginBottom: 14 }}>
        One download: the clips this cut uses, an EDL that opens already cut in DaVinci Resolve or Premiere Pro, and a cut sheet listing every shot for CapCut and other editors.
      </div>
      <button className="btn-primary" onClick={exportEdit} disabled={busy}>
        {busy ? status || "Working…" : "Download the edit"}
      </button>

      {result?.error && (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#F87171", marginTop: 12 }}>{result.error}</div>
      )}
      {result && !result.error && (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.8, marginTop: 12 }}>
          <span style={{ color: "#4ADE80" }}>✓</span> {result.shots} shot{result.shots === 1 ? "" : "s"} from {result.clips} clip{result.clips === 1 ? "" : "s"}, at {result.fps} fps — {result.mb} MB. Unzip it into one folder, then follow README.txt.
          {result.skipped > 0 && <div style={{ color: "#E5B769" }}>{result.skipped} shot{result.skipped === 1 ? "" : "s"} left out{result.why ? ` — ${result.why}` : " because a clip couldn't be fetched"}.</div>}
          {result.mixedRates && <div style={{ color: "#E5B769" }}>Frame rates differ: {result.mixedRates}</div>}
        </div>
      )}
    </div>
  );
}