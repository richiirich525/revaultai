/*
  FinishCut — RevaultAI (Finish pass 2)
  Renders an assembled cut: the ordered pieces, each playable at its own
  in/out points, and the shots the scene still needs. Uses the fn- styles
  that FinishPage already injects.

  The cut is editable in the two ways that repair a wrong decision without
  becoming a video editor: move a shot, or drop it. Before this, disagreeing
  with one choice meant assembling again — which does not correct the cut, it
  asks for a different opinion on the whole scene, and can cost you two things
  you liked to fix one you did not.

  Trimming is deliberately absent. Dragging an in-point is only useful beside
  a scrubbing preview that shows the frame you are landing on; without one you
  are dragging a rectangle and guessing, which is worse than not having it.

  onChange is optional. Without it this renders exactly as it did before, so
  anywhere showing a cut read-only keeps doing that.
*/

// Two entries are the same piece when they are the same stretch of the same
// clip. Index keys would make React reuse the wrong row on a reorder.
const shotKey = (c) => `${c.generationId}:${c.from}:${c.to}`;

export default function FinishCut({ cut, gens, urls, notify, onChange }) {
  const byId = Object.fromEntries(gens.map((g) => [g.id, g]));
  const shots = cut?.shots ?? [];
  const total = shots.reduce((s, x) => s + (x.to - x.from), 0);
  const span = Math.max(total, cut?.target || 0, 1);

  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= shots.length) return;
    const next = shots.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange?.({ ...cut, shots: next });
  }

  function drop(i) {
    const piece = shots[i];
    if (!window.confirm(
      shots.length === 1
        ? "Remove the only piece? The cut will be empty."
        : `Remove piece ${i + 1}, the ${piece.role}? The clip itself is kept — this only takes it out of the cut.`
    )) return;
    onChange?.({ ...cut, shots: shots.filter((_, k) => k !== i) });
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      notify?.("Prompt copied.");
    } catch {
      notify?.("Couldn't copy. Select the prompt text instead.");
    }
  }

  // Where each piece starts on the bar. Computed up front rather than by
  // accumulating a variable while rendering, which is not safe to do twice.
  const startsAt = shots.map((_, i) =>
    shots.slice(0, i).reduce((sum, x) => sum + (x.to - x.from), 0));

  return (
    <div className="fn-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
        <div className="fn-label" style={{ marginBottom: 0 }}>The cut, {shots.length} piece{shots.length === 1 ? "" : "s"}</div>
        <div className="fn-meta">{total.toFixed(1)}s of a {cut?.target}s target</div>
      </div>

      <div className="fn-bar" style={{ height: 10 }}>
        {shots.map((c, i) => {
          const left = startsAt[i];
          return (
            <div
              key={shotKey(c)}
              className="fn-seg"
              style={{ left: `${(left / span) * 100}%`, width: `${((c.to - c.from) / span) * 100}%`, background: i % 2 ? "var(--accent)" : "rgba(123,63,228,0.55)", borderRight: "1px solid var(--bg)", boxSizing: "border-box" }}
              title={`${i + 1}. ${c.role}, ${(c.to - c.from).toFixed(1)}s`}
            />
          );
        })}
      </div>

      {cut?.notes && <div className="fn-body" style={{ marginBottom: 4 }}>{cut.notes}</div>}

      {shots.length === 0 && (
        <div className="fn-body" style={{ padding: "14px 0" }}>Nothing in the chosen clips was strong enough to cut. The missing shots below are what to generate next.</div>
      )}

      {shots.map((c, i) => {
        const g = byId[c.generationId];
        const url = urls[c.generationId];
        return (
          <div className="fn-clip" key={shotKey(c)}>
            <div className="fn-meta" style={{ marginTop: 4, color: "var(--text)" }}>{i + 1}</div>
            {url ? <video src={`${url}#t=${c.from},${c.to}`} muted playsInline preload="metadata" controls /> : <div style={{ width: 150, aspectRatio: "16 / 9", background: "#000", borderRadius: 3 }} />}
            <div style={{ minWidth: 0 }}>
              <div className="fn-meta">
                <span className="fn-tag" style={{ color: "var(--accent)", border: "1px solid var(--border)" }}>{c.role}</span>
                {c.from}s to {c.to}s ({(c.to - c.from).toFixed(1)}s) from {g ? g.model : "a clip no longer in this project"}
              </div>
              {g?.finish_analysis?.summary && <div className="fn-body" style={{ color: "var(--text)", fontSize: 11, marginBottom: 2 }}>{g.finish_analysis.summary}</div>}
              <div className="fn-body" style={{ fontSize: 10 }}>{c.why}</div>

              {onChange && (
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  <button
                    className="fn-btn"
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    style={{ opacity: i === 0 ? 0.35 : 1 }}
                    aria-label={`Move piece ${i + 1} earlier`}
                    title="Move earlier"
                  >&uarr; earlier</button>
                  <button
                    className="fn-btn"
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === shots.length - 1}
                    style={{ opacity: i === shots.length - 1 ? 0.35 : 1 }}
                    aria-label={`Move piece ${i + 1} later`}
                    title="Move later"
                  >&darr; later</button>
                  <button
                    className="fn-btn"
                    type="button"
                    onClick={() => drop(i)}
                    style={{ borderColor: "rgba(248,113,113,0.4)", color: "#F87171" }}
                    aria-label={`Remove piece ${i + 1} from the cut`}
                    title="Take out of the cut"
                  >remove</button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {cut?.missing?.length > 0 && (
        <>
          <div className="fn-label" style={{ marginTop: 26 }}>Still needed, {cut.missing.length} shot{cut.missing.length === 1 ? "" : "s"}</div>
          {cut.missing.map((m, i) => (
            <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
              <div className="fn-body" style={{ color: "var(--text)", fontSize: 11 }}>{m.what}</div>
              {m.why && <div className="fn-body" style={{ fontSize: 10 }}>{m.why}</div>}
              {m.prompt && (
                <>
                  <div className="fn-text" style={{ marginTop: 8, fontSize: 11 }}>{m.prompt}</div>
                  <button className="fn-btn" style={{ marginTop: 8 }} onClick={() => copy(m.prompt)}>Copy prompt</button>
                </>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}