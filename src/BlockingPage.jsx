import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  BlockingPage — RevaultAI
  Free tool. Blocking and performance direction for a scene: where people
  stand and move relative to camera, what their bodies do, and how each line
  lands. Dialogue is never rewritten — only directed.
*/

const MODELS = [
  ["veo", "Veo"], ["sora", "Sora"], ["kling", "Kling"], ["runway", "Runway"],
  ["wan", "Wan"], ["hailuo", "Hailuo"], ["seedance", "Seedance"],
];

const REGISTERS = [
  ["none", "No register"],
  ["restrained-fear", "Restrained fear"],
  ["concealed-anger", "Concealed anger"],
  ["exhausted-resignation", "Exhausted resignation"],
  ["nervous-humour", "Nervous humour"],
  ["quiet-suspicion", "Quiet suspicion"],
  ["forced-calm", "Forced calm"],
  ["tenderness", "Tenderness"],
];

const EXAMPLES = [
  "Maya enters the office. Jonah is seated at the desk with his back to the door. She circles behind him before he turns.",
  "Two strangers wait at a bus stop in the rain. One of them recognises the other and decides not to say so.",
  "A father hands his daughter a set of car keys he's been holding for six years.",
];

const styles = `
  .bl-wrap { max-width: 880px; margin: 0 auto; padding: 0 48px; }
  .bl-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 32px; }
  .bl-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 8px; }
  .bl-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.85; }
  .bl-textarea { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 14px 16px; font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); line-height: 1.7; resize: vertical; box-sizing: border-box; }
  .bl-chiprow { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
  .bl-chip { border: 1px solid var(--border); background: transparent; color: var(--muted); border-radius: 4px; padding: 8px 16px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.08em; cursor: pointer; transition: all 0.2s; }
  .bl-chip:hover { color: var(--text); border-color: var(--muted); }
  .bl-chip.on { border-color: var(--accent); color: var(--accent); background: var(--bg); }
  .bl-ex { display: block; width: 100%; text-align: left; background: none; border: 1px solid var(--border); border-radius: 4px; padding: 10px 14px; margin-bottom: 8px; font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.6; cursor: pointer; }
  .bl-ex:hover { color: var(--text); border-color: var(--muted); }
  .bl-beat { display: flex; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--border); }
  .bl-beat-n { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; color: var(--accent); line-height: 1.2; flex-shrink: 0; width: 26px; }
  .bl-beat-i { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); line-height: 1.8; }
  .bl-beat-w { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); line-height: 1.7; margin-top: 5px; opacity: 0.85; }
  .bl-char { border: 1px solid var(--border); border-radius: 8px; padding: 24px 26px; margin-bottom: 16px; background: var(--surface); }
  .bl-char-name { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 14px; }
  .bl-sub { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); margin-bottom: 5px; margin-top: 14px; }
  .bl-line { border-left: 2px solid var(--accent); padding-left: 14px; margin-top: 12px; }
  .bl-line-text { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); line-height: 1.8; margin-bottom: 5px; }
  .bl-line-del { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); line-height: 1.75; }
  .bl-cam { border: 1px solid var(--accent); border-radius: 8px; padding: 20px 24px; margin-bottom: 24px; background: var(--surface); }
  .bl-prompt { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.9; background: var(--bg); border: 1px solid var(--border); border-radius: 5px; padding: 16px 18px; margin-bottom: 14px; }
  .bl-vault-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; border-radius: 4px; cursor: pointer; }
  .bl-vault-item:hover { background: var(--bg); }
  .bl-box { width: 14px; height: 14px; border: 1px solid var(--border); border-radius: 3px; flex-shrink: 0; margin-top: 3px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--accent); line-height: 1; }
  .bl-box.on { border-color: var(--accent); background: var(--accent-dim); }
  @media (max-width: 760px) { .bl-wrap { padding: 0 24px; } .bl-card { padding: 22px; } }
`;

export default function BlockingPage({ setPage, user, onSignInClick, setGenPrefill }) {
  const [scene, setScene] = useState("");
  const [dialogue, setDialogue] = useState("");
  const [register, setRegister] = useState("none");
  const [model, setModel] = useState("veo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [vault, setVault] = useState([]);
  const [lockedIds, setLockedIds] = useState([]);

  useEffect(() => {
    (async () => {
      if (!user?.id) { setVault([]); return; }
      const { data } = await supabase
        .from("vault_entries")
        .select("id, kind, name, description, wardrobe, distinguishing")
        .order("kind", { ascending: true })
        .order("name", { ascending: true });
      setVault(data ?? []);
    })();
  }, [user?.id]);

  async function handleDirect() {
    if (scene.trim().length < 10) { setError("Describe the scene in a few more words."); return; }
    setLoading(true); setError(null); setResult(null); setCopied(false);
    try {
      const res = await fetch("/api/blocking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene, dialogue, register, model,
          locked: vault.filter((v) => lockedIds.includes(v.id)),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Something went wrong. Try again.");
      else setResult(data);
    } catch {
      setError("Couldn't reach the blocking director. Check your connection and try again.");
    }
    setLoading(false);
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(result.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Couldn't copy automatically — select the text and copy it manually.");
    }
  }

  function generateShot() {
    if (!user) { onSignInClick?.(); return; }
    setGenPrefill({ prompt: result.prompt, modelKey: result.modelKey, aspectRatio: "16:9" });
    setPage("generate");
  }

  return (
    <div className="page">
      <style>{styles}</style>

      <div className="bl-wrap" style={{ padding: "100px 48px 40px", textAlign: "center" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.25em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 24 }}>Free Tool</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 54, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.1 }}>Performance &amp; Blocking</h1>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: "var(--muted)", marginBottom: 24, fontStyle: "italic" }}>Where they stand, and how they play it.</div>
        <div className="bl-body" style={{ fontSize: 12, maxWidth: 560, margin: "0 auto" }}>
          The least-addressed part of AI filmmaking is where people physically are and what their bodies are doing. Describe a scene and get staging beats relative to camera, playable acting direction for each character, delivery notes on every line you wrote, and a read on what the blocking means for your 180-degree axis.
        </div>
      </div>

      <div className="bl-wrap" style={{ paddingBottom: 56 }}>
        <div className="bl-card">
          <div className="bl-label">The scene</div>
          <textarea
            className="bl-textarea"
            rows={4}
            maxLength={800}
            value={scene}
            onChange={(e) => setScene(e.target.value)}
            placeholder="Maya enters the office. Jonah is seated at the desk with his back to the door. She circles behind him before he turns."
            style={{ marginBottom: 6 }}
          />
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--muted)", textAlign: "right", marginBottom: 20 }}>{scene.length} / 800</div>

          {!result && (
            <>
              <div className="bl-label">Or try one of these</div>
              <div style={{ marginBottom: 22 }}>
                {EXAMPLES.map((e, i) => (
                  <button key={i} className="bl-ex" onClick={() => setScene(e)}>{e}</button>
                ))}
              </div>
            </>
          )}

          <div className="bl-label">Dialogue (optional)</div>
          <textarea
            className="bl-textarea"
            rows={4}
            maxLength={900}
            value={dialogue}
            onChange={(e) => setDialogue(e.target.value)}
            placeholder={"MAYA: I told you not to come here.\nJONAH: You did."}
            style={{ marginBottom: 8 }}
          />
          <div className="bl-body" style={{ fontSize: 10, marginBottom: 22, opacity: 0.8 }}>
            Your lines come back exactly as you wrote them, with delivery notes attached. Nothing gets rewritten.
          </div>

          <div className="bl-label">Performance register</div>
          <div className="bl-chiprow">
            {REGISTERS.map(([v, l]) => (
              <button key={v} className={"bl-chip" + (register === v ? " on" : "")} onClick={() => setRegister(v)}>{l}</button>
            ))}
          </div>

          {user && vault.length > 0 && (
            <>
              <div className="bl-label">Lock from your vault (optional)</div>
              <div style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 14, marginBottom: 22, background: "var(--bg)" }}>
                {vault.map((v) => {
                  const on = lockedIds.includes(v.id);
                  return (
                    <div key={v.id} className="bl-vault-item" onClick={() => setLockedIds((ids) => on ? ids.filter((x) => x !== v.id) : [...ids, v.id])}>
                      <div className={"bl-box" + (on ? " on" : "")}>{on ? "\u2713" : ""}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--text)" }}>{v.name}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", marginLeft: 8 }}>{v.kind}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="bl-label">Target model</div>
          <div className="bl-chiprow">
            {MODELS.map(([v, l]) => (
              <button key={v} className={"bl-chip" + (model === v ? " on" : "")} onClick={() => setModel(v)}>{l}</button>
            ))}
          </div>

          <button className="btn-primary" onClick={handleDirect} disabled={loading} style={{ width: "100%", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Working the scene…" : "Direct the scene"}
          </button>

          {error && (
            <div style={{ marginTop: 20, border: "1px solid #F87171", borderRadius: 4, padding: "12px 16px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#F87171", lineHeight: 1.7 }}>{error}</div>
          )}
        </div>
      </div>

      {result && (
        <div className="bl-wrap" style={{ paddingBottom: 80 }}>
          {result.read && (
            <div className="bl-body" style={{ textAlign: "center", maxWidth: 540, margin: "0 auto 36px", fontSize: 12, color: "var(--text)" }}>{result.read}</div>
          )}

          {result.blocking.length > 0 && (
            <>
              <div className="bl-label" style={{ marginBottom: 8 }}>Blocking</div>
              <div style={{ marginBottom: 36 }}>
                {result.blocking.map((b, i) => (
                  <div className="bl-beat" key={i}>
                    <div className="bl-beat-n">{b.beat ?? i + 1}</div>
                    <div>
                      <div className="bl-beat-i">{b.instruction}</div>
                      {b.why && <div className="bl-beat-w">{b.why}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {result.performance.length > 0 && (
            <>
              <div className="bl-label" style={{ marginBottom: 12 }}>Performance</div>
              {result.performance.map((p, i) => (
                <div className="bl-char" key={i}>
                  <div className="bl-char-name">{p.character}</div>
                  {p.physical && (
                    <>
                      <div className="bl-sub" style={{ marginTop: 0 }}>Body</div>
                      <div className="bl-body">{p.physical}</div>
                    </>
                  )}
                  {p.eyes && (
                    <>
                      <div className="bl-sub">Eyes</div>
                      <div className="bl-body">{p.eyes}</div>
                    </>
                  )}
                  {Array.isArray(p.lines) && p.lines.length > 0 && (
                    <>
                      <div className="bl-sub">Lines</div>
                      {p.lines.map((l, n) => (
                        <div className="bl-line" key={n}>
                          <div className="bl-line-text">{l.line}</div>
                          <div className="bl-line-del">{l.delivery}</div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ))}
            </>
          )}

          {result.camera_relationship && (
            <div className="bl-cam" style={{ marginTop: 20 }}>
              <div className="bl-label">Camera and the axis</div>
              <div className="bl-body">{result.camera_relationship}</div>
            </div>
          )}

          {result.prompt && (
            <>
              <div className="bl-label">The shot prompt</div>
              <div className="bl-prompt">{result.prompt}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn-ghost" style={{ fontSize: 11 }} onClick={copyPrompt}>{copied ? "\u2713 Copied" : "Copy prompt"}</button>
                <button className="btn-ghost" style={{ fontSize: 11 }} onClick={generateShot}>
                  {user ? "Generate this shot \u2192" : "Sign in to generate"}
                </button>
              </div>
            </>
          )}

          <div style={{ textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: 48, marginTop: 44 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.2 }}>Now cover it.</div>
            <div className="bl-body" style={{ maxWidth: 460, margin: "0 auto 28px" }}>
              You know where everyone stands. Coverage Planner works out which setups an editor needs to cut the scene together.
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => setPage("coverage")}>Plan the coverage</button>
              <button className="btn-ghost" onClick={() => setPage("shot-director")}>Direct one shot three ways</button>
            </div>
          </div>
        </div>
      )}

      {!result && (
        <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "64px 24px" }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 300, color: "var(--text)", marginBottom: 34, textAlign: "center" }}>Direction, not description</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 22 }}>
              {[
                ["Playable beats", "\"Feels nervous\" isn't direction — a model can't render it and an actor couldn't play it. \"Holds the glass with both hands and doesn't drink\" is something you can see."],
                ["Relative to camera", "Blocking is only useful if it's stated in terms of frame: who enters camera-left, who holds centre, who turns and when. That's also what keeps your 180-degree axis intact."],
                ["Your words stay yours", "Dialogue comes back exactly as you wrote it, with delivery notes attached. This directs how a line lands — it doesn't rewrite the line."],
              ].map(([t, d], i) => (
                <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "26px 24px", background: "var(--bg)" }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{t}</div>
                  <div className="bl-body">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}