import { useEffect, useState } from "react";

/*
  AutopsyPage — RevaultAI
  Free tool. Paste a prompt that disappointed you and get a diagnosis: what in
  the wording caused it, ranked by confidence, plus a revised prompt built to
  generate more reliably. Reads the prompt, not the clip — and says so.
*/

const MODELS = [
  ["", "Didn't say / other"],
  ["wan-2.6", "Wan 2.6"],
  ["kling-3.0", "Kling 3.0"],
  ["seedance-2.0-480", "Seedance 2.0 Draft"],
  ["veo-3.1", "Veo 3.1"],
  ["seedance-2.0", "Seedance 2.0 Flagship"],
  ["seedance-2.5-480", "Seedance 2.5 Draft"],
  ["seedance-2.5", "Seedance 2.5 Flagship"],
];

const SYMPTOMS = [
  "Hands and fingers came out wrong",
  "The character changed partway through",
  "The camera did something I didn't ask for",
  "It ignored part of the prompt",
  "It fell apart in the last few seconds",
  "Two characters merged or passed through each other",
  "Text or signage was garbled",
  "The motion was mushy or too slow",
];

const CONF = {
  high:   { label: "High confidence",   color: "#F87171" },
  medium: { label: "Medium confidence", color: "#E5B769" },
  low:    { label: "Low confidence",    color: "#8B8794" },
};

const styles = `
  .ap-wrap { max-width: 840px; margin: 0 auto; padding: 0 48px; }
  .ap-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 32px; }
  .ap-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 8px; }
  .ap-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.85; }
  .ap-textarea { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 14px 16px; font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); line-height: 1.7; resize: vertical; box-sizing: border-box; }
  .ap-chiprow { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 22px; }
  .ap-chip { border: 1px solid var(--border); background: transparent; color: var(--muted); border-radius: 4px; padding: 8px 15px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.06em; cursor: pointer; transition: all 0.2s; }
  .ap-chip:hover { color: var(--text); border-color: var(--muted); }
  .ap-chip.on { border-color: var(--accent); color: var(--accent); background: var(--bg); }
  .ap-verdict { border-left: 3px solid var(--accent); padding-left: 18px; font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 300; color: var(--text); line-height: 1.45; margin-bottom: 34px; }
  .ap-cause { border: 1px solid var(--border); border-radius: 8px; padding: 22px 24px; margin-bottom: 14px; background: var(--surface); }
  .ap-cause-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
  .ap-cause-name { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; color: var(--text); }
  .ap-conf { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; }
  .ap-fix { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--text); line-height: 1.8; margin-top: 12px; padding-top: 11px; border-top: 1px solid var(--border); }
  .ap-note { border: 1px solid var(--accent); border-radius: 8px; padding: 20px 24px; margin-bottom: 16px; background: var(--surface); }
  .ap-prompt { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.9; background: var(--bg); border: 1px solid var(--accent); border-radius: 5px; padding: 18px 20px; margin-bottom: 14px; }
  @media (max-width: 760px) { .ap-wrap { padding: 0 24px; } .ap-card { padding: 22px; } }
`;

export default function AutopsyPage({ setPage, user, onSignInClick, setGenPrefill, apPrefill, setApPrefill }) {
  const [prompt, setPrompt] = useState("");
  const [symptom, setSymptom] = useState("");
  const [modelKey, setModelKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // A generation handed over from the generate page.
  useEffect(() => {
    if (!apPrefill) return;
    setPrompt(apPrefill.prompt || "");
    if (apPrefill.modelKey) setModelKey(apPrefill.modelKey);
    setApPrefill?.(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [apPrefill]);

  function toggleSymptom(s) {
    setSymptom((cur) => {
      const parts = cur.split("; ").map((x) => x.trim()).filter(Boolean);
      return parts.includes(s) ? parts.filter((x) => x !== s).join("; ") : [...parts, s].join("; ");
    });
  }

  async function handleRun() {
    if (prompt.trim().length < 20) { setError("Paste the prompt you used — a few more words, at least."); return; }
    setLoading(true); setError(null); setResult(null); setCopied(false);
    try {
      const res = await fetch("/api/autopsy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, symptom, modelKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Something went wrong. Try again.");
      else setResult(data);
    } catch {
      setError("Couldn't reach the autopsy tool. Check your connection and try again.");
    }
    setLoading(false);
  }

  async function copyRevised() {
    try {
      await navigator.clipboard.writeText(result.revised_prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Couldn't copy automatically — select the text and copy it manually.");
    }
  }

  function regenerate() {
    if (!user) { onSignInClick?.(); return; }
    setGenPrefill({ prompt: result.revised_prompt, generateModelKey: modelKey || undefined, aspectRatio: "16:9" });
    setPage("generate");
  }

  const chosen = symptom.split("; ").map((x) => x.trim()).filter(Boolean);

  return (
    <div className="page">
      <style>{styles}</style>

      <div className="ap-wrap" style={{ padding: "100px 48px 40px", textAlign: "center" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.25em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 24 }}>Free Tool</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 56, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.1 }}>Generation Autopsy</h1>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: "var(--muted)", marginBottom: 24, fontStyle: "italic" }}>Find out why the shot didn't work.</div>
        <div className="ap-body" style={{ fontSize: 12, maxWidth: 560, margin: "0 auto" }}>
          Paste the prompt behind a generation that disappointed you. This reads it for the things that reliably break AI video — three actions in one beat, hands on small objects, a camera fighting the subject, a take longer than the model holds — quotes the exact wording causing each one, and rewrites the prompt to fix them.
        </div>
      </div>

      <div className="ap-wrap" style={{ paddingBottom: 56 }}>
        <div className="ap-card">
          <div className="ap-label">The prompt you used</div>
          <textarea
            className="ap-textarea"
            rows={6}
            maxLength={2000}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Paste the full prompt, exactly as you sent it to the model."
            style={{ marginBottom: 6 }}
          />
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--muted)", textAlign: "right", marginBottom: 22 }}>{prompt.length} / 2000</div>

          <div className="ap-label">What went wrong (optional)</div>
          <div className="ap-chiprow">
            {SYMPTOMS.map((s) => (
              <button key={s} className={"ap-chip" + (chosen.includes(s) ? " on" : "")} onClick={() => toggleSymptom(s)}>{s}</button>
            ))}
          </div>
          <textarea
            className="ap-textarea"
            rows={2}
            maxLength={500}
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
            placeholder="Or describe it in your own words."
            style={{ marginBottom: 8 }}
          />
          <div className="ap-body" style={{ fontSize: 10, marginBottom: 22, opacity: 0.8 }}>
            The more specific you are about the failure, the sharper the diagnosis. Leave it blank and the prompt gets read on its own terms.
          </div>

          <div className="ap-label">Model you generated on</div>
          <div className="ap-chiprow">
            {MODELS.map(([v, l]) => (
              <button key={v || "none"} className={"ap-chip" + (modelKey === v ? " on" : "")} onClick={() => setModelKey(v)}>{l}</button>
            ))}
          </div>

          <button className="btn-primary" onClick={handleRun} disabled={loading} style={{ width: "100%", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Reading the prompt…" : "Run the autopsy"}
          </button>

          {error && (
            <div style={{ marginTop: 20, border: "1px solid #F87171", borderRadius: 4, padding: "12px 16px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#F87171", lineHeight: 1.7 }}>{error}</div>
          )}
        </div>
      </div>

      {result && (
        <div className="ap-wrap" style={{ paddingBottom: 80 }}>
          {result.verdict && <div className="ap-verdict">{result.verdict}</div>}

          <div className="ap-label" style={{ marginBottom: 12 }}>What the prompt asked for</div>
          {result.causes.map((c, i) => {
            const cf = CONF[c.confidence] ?? CONF.medium;
            return (
              <div className="ap-cause" key={i}>
                <div className="ap-cause-head">
                  <span className="ap-cause-name">{c.cause}</span>
                  <span className="ap-conf" style={{ color: cf.color }}>{cf.label}</span>
                </div>
                <div className="ap-body">{c.evidence}</div>
                {c.fix && <div className="ap-fix"><strong style={{ color: "var(--accent)" }}>Fix:</strong> {c.fix}</div>}
              </div>
            );
          })}

          {result.model_note && (
            <div className="ap-note" style={{ marginTop: 20 }}>
              <div className="ap-label">On the model</div>
              <div className="ap-body">{result.model_note}</div>
            </div>
          )}

          {result.structural_advice && (
            <div className="ap-note">
              <div className="ap-label">The bigger move</div>
              <div className="ap-body">{result.structural_advice}</div>
            </div>
          )}

          {result.revised_prompt && (
            <>
              <div className="ap-label" style={{ marginTop: 24 }}>Revised prompt — same shot, built to hold</div>
              <div className="ap-prompt">{result.revised_prompt}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn-ghost" style={{ fontSize: 11 }} onClick={copyRevised}>{copied ? "\u2713 Copied" : "Copy revised prompt"}</button>
                <button className="btn-ghost" style={{ fontSize: 11 }} onClick={regenerate}>
                  {user ? "Try it again \u2192" : "Sign in to generate"}
                </button>
              </div>
            </>
          )}

          <div style={{ textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: 48, marginTop: 44 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: "var(--text)", marginBottom: 16 }}>Catch it before it costs credits.</div>
            <div className="ap-body" style={{ maxWidth: 460, margin: "0 auto 28px" }}>
              The model router scores how hard a shot is to generate before you spend anything, and names what's likely to break.
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => setPage("which-model")}>Check a shot first</button>
              <button className="btn-ghost" onClick={() => setPage("prompt-builder")}>Rebuild the prompt</button>
            </div>
          </div>
        </div>
      )}

      {!result && (
        <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "64px 24px" }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 300, color: "var(--text)", marginBottom: 34, textAlign: "center" }}>Most failures are written, not rendered</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 22 }}>
              {[
                ["Three actions, one beat", "\"She turns, reaches for the keys and looks back\" is three things at once. Models resolve that by doing one of them badly and blending the rest. Most 'it ignored my prompt' failures are really this."],
                ["The camera fighting the subject", "A fast subject and a fast camera move compete for the same motion budget. One of them usually loses, and it's rarely the one you cared about."],
                ["It reads the prompt, not the clip", "This diagnoses your wording and the failure you describe — it can't watch the footage. That's still where most problems start, but it's worth knowing what it is and isn't doing."],
              ].map(([t, d], i) => (
                <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "26px 24px", background: "var(--bg)" }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{t}</div>
                  <div className="ap-body">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}