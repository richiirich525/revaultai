import { useState } from "react";

/*
  WhichModelPage — RevaultAI
  Free tool. Describe a shot, get a ranked model recommendation with a real
  duration and credit cost, and a handoff to /generate with the model pre-set.
  No sign-in, no credits. Costs are computed server-side from the same catalog
  the generator uses, so the model can never invent a price.
*/

const EXAMPLES = [
  "Two characters arguing across a restaurant table, medium close-up, spoken dialogue, about 8 seconds",
  "A courier sprinting through a crowded night market, handheld, fast, lots of people in frame",
  "A 30-second unbroken take rising through a flooded cathedral, no cuts",
  "A lighthouse keeper watching a storm clear at dawn, slow push-in, no dialogue",
];

const styles = `
  .wm-wrap { max-width: 800px; margin: 0 auto; padding: 0 48px; }
  .wm-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 32px; }
  .wm-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 8px; }
  .wm-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.85; }
  .wm-textarea { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 14px 16px; font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); line-height: 1.7; resize: vertical; box-sizing: border-box; }
  .wm-ex { display: block; width: 100%; text-align: left; background: none; border: 1px solid var(--border); border-radius: 4px; padding: 10px 14px; margin-bottom: 8px; font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.6; cursor: pointer; transition: all 0.2s; }
  .wm-ex:hover { color: var(--text); border-color: var(--muted); }
  .wm-rec { border: 1px solid var(--border); border-radius: 8px; padding: 26px 28px; margin-bottom: 16px; background: var(--surface); }
  .wm-rec.top { border-color: var(--accent); }
  .wm-rec-head { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap; margin-bottom: 6px; }
  .wm-rec-name { font-family: 'Syne', sans-serif; font-size: 19px; font-weight: 700; color: var(--text); }
  .wm-rec-cost { font-family: 'Syne', sans-serif; font-size: 19px; font-weight: 700; color: var(--accent); }
  .wm-rec-meta { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 14px; }
  .wm-pick { display: inline-block; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); border: 1px solid rgba(123,63,228,0.35); border-radius: 3px; padding: 3px 9px; margin-bottom: 10px; }
  .wm-trade { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); line-height: 1.8; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border); opacity: 0.85; }
  .wm-diff { border: 1px solid var(--border); border-radius: 8px; padding: 22px 24px; margin-bottom: 24px; background: var(--surface); }
  .wm-diff-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
  .wm-diff-score { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 700; line-height: 1; }
  .wm-diff-label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }
  .wm-bar { height: 4px; border-radius: 2px; background: var(--bg3); overflow: hidden; margin-bottom: 16px; }
  .wm-bar div { height: 100%; border-radius: 2px; }
  .wm-flag { font-family: 'DM Mono', monospace; font-size: 11px; line-height: 1.8; color: var(--muted); display: flex; gap: 9px; margin-bottom: 5px; }
  .wm-strategy { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--text); line-height: 1.8; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); }
  .wm-caution { border: 1px solid rgba(248,113,113,0.35); background: rgba(248,113,113,0.06); border-radius: 6px; padding: 14px 18px; margin-bottom: 24px; font-family: 'DM Mono', monospace; font-size: 11px; color: #F8A0A0; line-height: 1.8; }
  @media (max-width: 760px) { .wm-wrap { padding: 0 24px; } .wm-card { padding: 22px; } }
`;

export default function WhichModelPage({ setPage, user, onSignInClick, setGenPrefill }) {
  const [shot, setShot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function handleAsk() {
    if (shot.trim().length < 10) { setError("Describe your shot in a few more words."); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/which-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shot }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Something went wrong. Try again.");
      else setResult(data);
    } catch {
      setError("Couldn't reach the model router. Check your connection and try again.");
    }
    setLoading(false);
  }

  function generateWith(rec) {
    if (!user) { onSignInClick?.(); return; }
    setGenPrefill({ prompt: "", generateModelKey: rec.key, aspectRatio: "16:9" });
    setPage("generate");
  }

  return (
    <div className="page">
      <style>{styles}</style>

      <div className="wm-wrap" style={{ padding: "100px 48px 40px", textAlign: "center" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.25em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 24 }}>Free Tool</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 58, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.1 }}>Which model should you use?</h1>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: "var(--muted)", marginBottom: 24, fontStyle: "italic" }}>Describe the shot. Get a straight answer.</div>
        <div className="wm-body" style={{ fontSize: 12, maxWidth: 540, margin: "0 auto" }}>
          No model wins at everything. Motion, audio, duration and cost pull in different directions. Describe what you're actually trying to shoot and this tells you which model fits, how long to make it, and what it will cost — including when the cheap one is the right answer.
        </div>
      </div>

      <div className="wm-wrap" style={{ paddingBottom: 56 }}>
        <div className="wm-card">
          <div className="wm-label">Your shot</div>
          <textarea
            className="wm-textarea"
            rows={4}
            maxLength={800}
            value={shot}
            onChange={(e) => setShot(e.target.value)}
            placeholder="Two characters arguing across a restaurant table, medium close-up, spoken dialogue, about 8 seconds"
            style={{ marginBottom: 6 }}
          />
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--muted)", textAlign: "right", marginBottom: 20 }}>{shot.length} / 800</div>

          {!result && (
            <>
              <div className="wm-label">Or try one of these</div>
              <div style={{ marginBottom: 22 }}>
                {EXAMPLES.map((e, i) => (
                  <button key={i} className="wm-ex" onClick={() => setShot(e)}>{e}</button>
                ))}
              </div>
            </>
          )}

          <button className="btn-primary" onClick={handleAsk} disabled={loading} style={{ width: "100%", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Working it out…" : "Recommend a model"}
          </button>

          {error && (
            <div style={{ marginTop: 20, border: "1px solid #F87171", borderRadius: 4, padding: "12px 16px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#F87171", lineHeight: 1.7 }}>{error}</div>
          )}
        </div>
      </div>

      {result && (
        <div className="wm-wrap" style={{ paddingBottom: 80 }}>
          {result.read && (
            <div className="wm-body" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 32px", fontSize: 12, color: "var(--text)" }}>
              {result.read}
            </div>
          )}

          {result.difficulty && (() => {
            const s = result.difficulty.score;
            const col = s <= 3 ? "#4ADE80" : s <= 6 ? "#E5B769" : "#F87171";
            return (
              <div className="wm-diff">
                <div className="wm-diff-head">
                  <span className="wm-diff-score" style={{ color: col }}>{s}/10</span>
                  <span className="wm-diff-label">{result.difficulty.label || "Difficulty"}</span>
                </div>
                <div className="wm-bar"><div style={{ width: (s * 10) + "%", background: col }} /></div>
                {result.difficulty.factors.map((f, i) => (
                  <div className="wm-flag" key={"f" + i}><span style={{ color: col }}>&#9888;</span><span>{f}</span></div>
                ))}
                {result.difficulty.safe.map((f, i) => (
                  <div className="wm-flag" key={"s" + i}><span style={{ color: "#4ADE80" }}>&#10003;</span><span>{f}</span></div>
                ))}
                {result.difficulty.strategy && (
                  <div className="wm-strategy"><strong style={{ color: "var(--accent)" }}>Suggested approach:</strong> {result.difficulty.strategy}</div>
                )}
              </div>
            );
          })()}

          {result.caution && <div className="wm-caution">{result.caution}</div>}

          {result.recommendations.map((r, i) => (
            <div className={"wm-rec" + (i === 0 ? " top" : "")} key={r.key}>
              {i === 0 && <div className="wm-pick">Best fit</div>}
              <div className="wm-rec-head">
                <div className="wm-rec-name">{r.label}</div>
                <div className="wm-rec-cost">{r.credits} credits</div>
              </div>
              <div className="wm-rec-meta">
                {r.duration_seconds}s at {r.perSec} credit{r.perSec === 1 ? "" : "s"}/second · {r.audio ? "native audio" : "no audio"}
              </div>
              <div className="wm-body">{r.why}</div>
              {r.tradeoff && <div className="wm-trade">Trade-off: {r.tradeoff}</div>}
              <div style={{ marginTop: 16 }}>
                <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => generateWith(r)}>
                  {user ? "Generate with " + r.label + " \u2192" : "Sign in to generate"}
                </button>
              </div>
            </div>
          ))}

          <div style={{ textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: 48, marginTop: 40 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.2 }}>Now write the shot.</div>
            <div className="wm-body" style={{ maxWidth: 460, margin: "0 auto 28px" }}>
              Turn your idea into a structured prompt with camera, lighting and style — or break a whole scene into a shot list.
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => setPage("prompt-builder")}>Open the Prompt Builder</button>
              <button className="btn-ghost" onClick={() => setPage("scene-breakdown")}>Break down a scene</button>
            </div>
          </div>
        </div>
      )}

      {!result && (
        <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "64px 24px" }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 300, color: "var(--text)", marginBottom: 34, textAlign: "center" }}>What actually decides it</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 22 }}>
              {[
                ["Does anyone speak?", "If the shot needs dialogue or synchronized sound, that rules out the models without native audio before anything else is considered."],
                ["How long is the take?", "Every model has a ceiling. A shot that can't cut has far fewer options than one that can, and that constraint usually decides the model on its own."],
                ["What's moving?", "Fast action, crowds and physical performance hold together on some models and smear on others. A locked close-up has almost no such constraint."],
                ["What can you spend?", "Per-second costs differ by an order of magnitude. Iterating cheap and finishing expensive is usually smarter than paying flagship rates for every take."],
              ].map(([t, d], i) => (
                <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "26px 24px", background: "var(--bg)" }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{t}</div>
                  <div className="wm-body">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}