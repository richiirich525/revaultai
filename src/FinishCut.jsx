/*
  FinishCut — RevaultAI (Finish pass 2)
  Renders an assembled cut: the ordered pieces, each playable at its own
  in/out points, and the shots the scene still needs. Uses the fn- styles
  that FinishPage already injects.
*/

export default function FinishCut({ cut, gens, urls, notify }) {
  const byId = Object.fromEntries(gens.map((g) => [g.id, g]));
  const shots = cut?.shots ?? [];
  const total = shots.reduce((s, x) => s + (x.to - x.from), 0);
  const span = Math.max(total, cut?.target || 0, 1);

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      notify?.("Prompt copied.");
    } catch {
      notify?.("Couldn't copy. Select the prompt text instead.");
    }
  }

  let offset = 0;

  return (
    <div className="fn-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
        <div className="fn-label" style={{ marginBottom: 0 }}>The cut, {shots.length} piece{shots.length === 1 ? "" : "s"}</div>
        <div className="fn-meta">{total.toFixed(1)}s of a {cut?.target}s target</div>
      </div>

      <div className="fn-bar" style={{ height: 10 }}>
        {shots.map((c, i) => {
          const left = offset;
          offset += c.to - c.from;
          return (
            <div
              key={i}
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
          <div className="fn-clip" key={i}>
            <div className="fn-meta" style={{ marginTop: 4, color: "var(--text)" }}>{i + 1}</div>
            {url ? <video src={`${url}#t=${c.from},${c.to}`} muted playsInline preload="metadata" controls /> : <div style={{ width: 150, aspectRatio: "16 / 9", background: "#000", borderRadius: 3 }} />}
            <div style={{ minWidth: 0 }}>
              <div className="fn-meta">
                <span className="fn-tag" style={{ color: "var(--accent)", border: "1px solid var(--border)" }}>{c.role}</span>
                {c.from}s to {c.to}s ({(c.to - c.from).toFixed(1)}s) from {g ? g.model : "a clip no longer in this project"}
              </div>
              {g?.finish_analysis?.summary && <div className="fn-body" style={{ color: "var(--text)", fontSize: 11, marginBottom: 2 }}>{g.finish_analysis.summary}</div>}
              <div className="fn-body" style={{ fontSize: 10 }}>{c.why}</div>
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