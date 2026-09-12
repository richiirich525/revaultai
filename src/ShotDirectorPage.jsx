import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  ShotDirectorPage — RevaultAI
  Free tool. Describe one dramatic moment and get three genuinely different
  directorial approaches to shooting it — each with size, lens, move, lighting,
  blocking, duration and a full prompt. Scene Breakdown decides what shots
  exist; this decides how one shot should feel.
*/

const MODELS = [
  ["veo", "Veo"], ["sora", "Sora"], ["kling", "Kling"], ["runway", "Runway"],
  ["wan", "Wan"], ["hailuo", "Hailuo"], ["seedance", "Seedance"],
];
const STYLES = [
  ["none", "No preset"], ["anamorphic-70s", "70s Anamorphic"], ["neo-noir", "Neo-Noir"],
  ["imax-70", "IMAX 70mm"], ["doc-16mm", "Doc 16mm"], ["technicolor", "Technicolor"],
  ["realtime-engine", "Real-Time Engine"],
];
const RATIOS = [["16:9", "16:9 Landscape"], ["9:16", "9:16 Vertical"], ["1:1", "1:1 Square"]];

const EXAMPLES = [
  "Maya walks into the abandoned train station and realises someone is watching her.",
  "A father sees his daughter's name on a list he was never supposed to read.",
  "Two rivals recognise each other across a crowded market and neither moves.",
  "An astronaut hears a knock on the outside of the hull.",
];

const styles = `
  .sd-wrap { max-width: 860px; margin: 0 auto; padding: 0 48px; }
  .sd-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 32px; }
  .sd-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 8px; }
  .sd-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.85; }
  .sd-textarea { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 14px 16px; font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); line-height: 1.7; resize: vertical; box-sizing: border-box; }
  .sd-chiprow { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
  .sd-chip { border: 1px solid var(--border); background: transparent; color: var(--muted); border-radius: 4px; padding: 8px 16px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.08em; cursor: pointer; transition: all 0.2s; }
  .sd-chip:hover { color: var(--text); border-color: var(--muted); }
  .sd-chip.on { border-color: var(--accent); color: var(--accent); background: var(--bg); }
  .sd-ex { display: block; width: 100%; text-align: left; background: none; border: 1px solid var(--border); border-radius: 4px; padding: 10px 14px; margin-bottom: 8px; font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.6; cursor: pointer; transition: all 0.2s; }
  .sd-ex:hover { color: var(--text); border-color: var(--muted); }
  .sd-app { border: 1px solid var(--border); border-radius: 8px; padding: 28px 30px; margin-bottom: 18px; background: var(--surface); }
  .sd-app-letter { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 6px; }
  .sd-app-name { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 300; color: var(--text); line-height: 1.1; margin-bottom: 10px; }
  .sd-premise { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); line-height: 1.85; margin-bottom: 18px; }
  .sd-specs { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px 20px; padding: 16px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); margin-bottom: 16px; }
  .sd-spec-k { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); margin-bottom: 4px; }
  .sd-spec-v { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.65; }
  .sd-why { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.85; border-left: 2px solid var(--accent); padding-left: 14px; margin-bottom: 16px; }
  .sd-prompt { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.9; background: var(--bg); border: 1px solid var(--border); border-radius: 5px; padding: 16px 18px; margin-bottom: 14px; }
  .sd-actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .sd-vault-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; border-radius: 4px; cursor: pointer; }
  .sd-vault-item:hover { background: var(--bg); }
  .sd-box { width: 14px; height: 14px; border: 1px solid var(--border); border-radius: 3px; flex-shrink: 0; margin-top: 3px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--accent); line-height: 1; }
  .sd-box.on { border-color: var(--accent); background: var(--accent-dim); }
  @media (max-width: 760px) { .sd-wrap { padding: 0 24px; } .sd-card { padding: 22px; } .sd-app { padding: 22px; } }
`;

export default function ShotDirectorPage({ setPage, user, onSignInClick, setGenPrefill }) {
  const [moment, setMoment] = useState("");
  const [model, setModel] = useState("veo");
  const [style, setStyle] = useState("none");
  const [aspect, setAspect] = useState("16:9");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(null);
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
    if (moment.trim().length < 10) { setError("Describe the moment in a few more words."); return; }
    setLoading(true); setError(null); setResult(null); setCopied(null);
    try {
      const res = await fetch("/api/shot-director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moment, model, style, aspectRatio: aspect,
          locked: vault.filter((v) => lockedIds.includes(v.id)),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Something went wrong. Try again.");
      else setResult(data);
    } catch {
      setError("Couldn't reach Shot Director. Check your connection and try again.");
    }
    setLoading(false);
  }

  async function copyPrompt(key, text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setError("Couldn't copy automatically — select the text and copy it manually.");
    }
  }

  function generateShot(promptText) {
    if (!user) { onSignInClick?.(); return; }
    setGenPrefill({ prompt: promptText, modelKey: result?.modelKey, aspectRatio: result?.aspectRatio || aspect });
    setPage("generate");
  }

  const LETTERS = ["A", "B", "C"];

  return (
    <div className="page">
      <style>{styles}</style>

      <div className="sd-wrap" style={{ padding: "100px 48px 40px", textAlign: "center" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.25em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 24 }}>Free Tool</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 58, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.1 }}>Shot Director</h1>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: "var(--muted)", marginBottom: 24, fontStyle: "italic" }}>One moment, three ways to shoot it.</div>
        <div className="sd-body" style={{ fontSize: 12, maxWidth: 560, margin: "0 auto" }}>
          Describe a single dramatic beat and get three genuinely different directorial approaches — each with a shot size, lens, camera move, lighting, blocking, duration and a full prompt, plus the craft reasoning for why it works. Not three variations on one idea. Three different films.
        </div>
      </div>

      <div className="sd-wrap" style={{ paddingBottom: 56 }}>
        <div className="sd-card">
          <div className="sd-label">The moment</div>
          <textarea
            className="sd-textarea"
            rows={4}
            maxLength={600}
            value={moment}
            onChange={(e) => setMoment(e.target.value)}
            placeholder="Maya walks into the abandoned train station and realises someone is watching her."
            style={{ marginBottom: 6 }}
          />
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--muted)", textAlign: "right", marginBottom: 20 }}>{moment.length} / 600</div>

          {!result && (
            <>
              <div className="sd-label">Or try one of these</div>
              <div style={{ marginBottom: 22 }}>
                {EXAMPLES.map((e, i) => (
                  <button key={i} className="sd-ex" onClick={() => setMoment(e)}>{e}</button>
                ))}
              </div>
            </>
          )}

          {user && vault.length > 0 && (
            <>
              <div className="sd-label">Lock from your vault (optional)</div>
              <div style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 14, marginBottom: 22, background: "var(--bg)" }}>
                {vault.map((v) => {
                  const on = lockedIds.includes(v.id);
                  return (
                    <div key={v.id} className="sd-vault-item" onClick={() => setLockedIds((ids) => on ? ids.filter((x) => x !== v.id) : [...ids, v.id])}>
                      <div className={"sd-box" + (on ? " on" : "")}>{on ? "\u2713" : ""}</div>
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

          <div className="sd-label">Target model</div>
          <div className="sd-chiprow">
            {MODELS.map(([v, l]) => (
              <button key={v} className={"sd-chip" + (model === v ? " on" : "")} onClick={() => setModel(v)}>{l}</button>
            ))}
          </div>

          <div className="sd-label">Cinematic style</div>
          <div className="sd-chiprow">
            {STYLES.map(([v, l]) => (
              <button key={v} className={"sd-chip" + (style === v ? " on" : "")} onClick={() => setStyle(v)}>{l}</button>
            ))}
          </div>

          <div className="sd-label">Aspect ratio</div>
          <div className="sd-chiprow">
            {RATIOS.map(([v, l]) => (
              <button key={v} className={"sd-chip" + (aspect === v ? " on" : "")} onClick={() => setAspect(v)}>{l}</button>
            ))}
          </div>

          <button className="btn-primary" onClick={handleDirect} disabled={loading} style={{ width: "100%", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Working out the coverage…" : "Direct this shot"}
          </button>

          {error && (
            <div style={{ marginTop: 20, border: "1px solid #F87171", borderRadius: 4, padding: "12px 16px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#F87171", lineHeight: 1.7 }}>{error}</div>
          )}
        </div>
      </div>

      {result && (
        <div className="sd-wrap" style={{ paddingBottom: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 12 }}>
              Three approaches · built for {result.model} · {result.aspectRatio}
            </div>
            <div className="sd-body" style={{ maxWidth: 540, margin: "0 auto", fontSize: 12, color: "var(--text)" }}>{result.moment}</div>
          </div>

          {result.approaches.map((a, i) => (
            <div className="sd-app" key={i}>
              <div className="sd-app-letter">Approach {LETTERS[i] ?? i + 1}</div>
              <div className="sd-app-name">{a.name}</div>
              <div className="sd-premise">{a.premise}</div>

              <div className="sd-specs">
                {[["Shot size", a.shot_size], ["Lens", a.lens], ["Camera", a.camera_move], ["Lighting", a.lighting], ["Blocking", a.blocking], ["Duration", a.duration_seconds ? a.duration_seconds + "s" : null]]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <div className="sd-spec-k">{k}</div>
                      <div className="sd-spec-v">{v}</div>
                    </div>
                  ))}
              </div>

              {a.why_it_works && <div className="sd-why">{a.why_it_works}</div>}
              <div className="sd-prompt">{a.prompt}</div>
              <div className="sd-actions">
                <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => copyPrompt(i, a.prompt)}>
                  {copied === i ? "\u2713 Copied" : "Copy prompt"}
                </button>
                <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => generateShot(a.prompt)}>
                  {user ? "Generate this approach \u2192" : "Sign in to generate"}
                </button>
              </div>
            </div>
          ))}

          <div style={{ textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: 48, marginTop: 40 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.2 }}>Now build the scene around it.</div>
            <div className="sd-body" style={{ maxWidth: 460, margin: "0 auto 28px" }}>
              Shot Director decides how one moment should feel. Scene Breakdown decides which shots the scene needs — with your characters and locations locked across every one.
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => setPage("scene-breakdown")}>Break down a scene</button>
              <button className="btn-ghost" onClick={() => setPage("which-model")}>Which model should I use?</button>
            </div>
          </div>
        </div>
      )}

      {!result && (
        <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "64px 24px" }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 300, color: "var(--text)", marginBottom: 34, textAlign: "center" }}>The same moment, shot three ways</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 22 }}>
              {[
                ["Coverage is a choice", "A push-in says pay attention. A pull-out says there's more here than you realised. A locked camera says you don't get to look away. Same beat, three different films."],
                ["Restraint counts as an option", "One of the three approaches will always be simple — a locked frame or a single slow move. The showiest coverage is rarely the strongest, and it's usually the hardest to generate."],
                ["The reasoning comes with it", "Each approach explains what it does that the others don't. The point isn't to pick one blindly — it's to understand why a director would."],
              ].map(([t, d], i) => (
                <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "26px 24px", background: "var(--bg)" }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{t}</div>
                  <div className="sd-body">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}