import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  CoveragePage — RevaultAI
  Free tool. Describe a scene and get the coverage an editor would need to cut
  it — master, singles, over-the-shoulders, reactions, inserts — with an honest
  read on what's missing and what that costs you in the cutting room.
*/

const MODELS = [
  ["veo", "Veo"], ["sora", "Sora"], ["kling", "Kling"], ["runway", "Runway"],
  ["wan", "Wan"], ["hailuo", "Hailuo"], ["seedance", "Seedance"],
];

const EXAMPLES = [
  "Two people argue across a restaurant table. One of them knows the other is lying.",
  "A woman searches an empty apartment for something she doesn't want to find.",
  "A getaway driver waits outside a bank, watching the door in the mirror.",
  "Three friends toast at a wedding; one of them is about to leave for good.",
];

const PRIO = {
  essential:   { label: "Essential",   color: "#F87171" },
  recommended: { label: "Recommended", color: "#E5B769" },
  optional:    { label: "Optional",    color: "#8B8794" },
};

const styles = `
  .cv-wrap { max-width: 860px; margin: 0 auto; padding: 0 48px; }
  .cv-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 32px; }
  .cv-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 8px; }
  .cv-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.85; }
  .cv-textarea { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 14px 16px; font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); line-height: 1.7; resize: vertical; box-sizing: border-box; }
  .cv-chiprow { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
  .cv-chip { border: 1px solid var(--border); background: transparent; color: var(--muted); border-radius: 4px; padding: 8px 16px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.08em; cursor: pointer; transition: all 0.2s; }
  .cv-chip:hover { color: var(--text); border-color: var(--muted); }
  .cv-chip.on { border-color: var(--accent); color: var(--accent); background: var(--bg); }
  .cv-ex { display: block; width: 100%; text-align: left; background: none; border: 1px solid var(--border); border-radius: 4px; padding: 10px 14px; margin-bottom: 8px; font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.6; cursor: pointer; transition: all 0.2s; }
  .cv-ex:hover { color: var(--text); border-color: var(--muted); }
  .cv-setup { border: 1px solid var(--border); border-radius: 8px; padding: 22px 24px; margin-bottom: 14px; background: var(--surface); }
  .cv-setup.done { opacity: 0.62; }
  .cv-setup-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
  .cv-setup-name { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; color: var(--text); }
  .cv-prio { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; }
  .cv-purpose { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--text); line-height: 1.8; margin-bottom: 12px; }
  .cv-meta { display: flex; flex-wrap: wrap; gap: 8px 18px; font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); letter-spacing: 0.06em; margin-bottom: 14px; }
  .cv-meta b { color: var(--accent); font-weight: 400; }
  .cv-prompt { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.9; background: var(--bg); border: 1px solid var(--border); border-radius: 5px; padding: 15px 17px; margin-bottom: 12px; }
  .cv-gap { border: 1px solid rgba(248,113,113,0.35); background: rgba(248,113,113,0.06); border-radius: 6px; padding: 16px 18px; margin-bottom: 12px; }
  .cv-gap-name { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; color: #F8A0A0; margin-bottom: 6px; }
  .cv-note { border-left: 2px solid var(--accent); padding-left: 16px; font-family: 'DM Mono', monospace; font-size: 11px; color: var(--text); line-height: 1.9; margin-bottom: 32px; }
  .cv-tally { display: flex; gap: 22px; flex-wrap: wrap; justify-content: center; margin-bottom: 26px; }
  .cv-tally-n { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 700; line-height: 1; color: var(--text); }
  .cv-tally-l { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); margin-top: 6px; }
  .cv-vault-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; border-radius: 4px; cursor: pointer; }
  .cv-vault-item:hover { background: var(--bg); }
  .cv-box { width: 14px; height: 14px; border: 1px solid var(--border); border-radius: 3px; flex-shrink: 0; margin-top: 3px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--accent); line-height: 1; }
  .cv-box.on { border-color: var(--accent); background: var(--accent-dim); }
  @media (max-width: 760px) { .cv-wrap { padding: 0 24px; } .cv-card { padding: 22px; } }
`;

export default function CoveragePage({ setPage, user, onSignInClick, setGenPrefill, setCcPrefill }) {
  const [scene, setScene] = useState("");
  const [model, setModel] = useState("veo");
  const [haveText, setHaveText] = useState("");
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

  async function handlePlan() {
    if (scene.trim().length < 10) { setError("Describe the scene in a few more words."); return; }
    setLoading(true); setError(null); setResult(null); setCopied(null);
    try {
      const res = await fetch("/api/coverage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene,
          model,
          have: haveText.split("\n").map((s) => s.trim()).filter(Boolean),
          locked: vault.filter((v) => lockedIds.includes(v.id)),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Something went wrong. Try again.");
      else setResult(data);
    } catch {
      setError("Couldn't reach the coverage planner. Check your connection and try again.");
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
    setGenPrefill({ prompt: promptText, modelKey: result?.modelKey, aspectRatio: "16:9" });
    setPage("generate");
  }

  return (
    <div className="page">
      <style>{styles}</style>

      <div className="cv-wrap" style={{ padding: "100px 48px 40px", textAlign: "center" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.25em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 24 }}>Free Tool</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 58, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.1 }}>Coverage Planner</h1>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: "var(--muted)", marginBottom: 24, fontStyle: "italic" }}>What the cutting room actually needs.</div>
        <div className="cv-body" style={{ fontSize: 12, maxWidth: 560, margin: "0 auto" }}>
          A scene isn't a list of nice shots — it's the setups an editor needs to assemble it, and the ones that save the scene when a take doesn't work. Describe a scene and get the coverage it calls for, ranked by how essential each setup is, plus an honest read on what's missing and what that costs you in the edit.
        </div>
      </div>

      <div className="cv-wrap" style={{ paddingBottom: 56 }}>
        <div className="cv-card">
          <div className="cv-label">The scene</div>
          <textarea
            className="cv-textarea"
            rows={4}
            maxLength={900}
            value={scene}
            onChange={(e) => setScene(e.target.value)}
            placeholder="Two people argue across a restaurant table. One of them knows the other is lying."
            style={{ marginBottom: 6 }}
          />
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--muted)", textAlign: "right", marginBottom: 20 }}>{scene.length} / 900</div>

          {!result && (
            <>
              <div className="cv-label">Or try one of these</div>
              <div style={{ marginBottom: 22 }}>
                {EXAMPLES.map((e, i) => (
                  <button key={i} className="cv-ex" onClick={() => setScene(e)}>{e}</button>
                ))}
              </div>
            </>
          )}

          <div className="cv-label">Shots you already have (optional)</div>
          <textarea
            className="cv-textarea"
            rows={3}
            value={haveText}
            onChange={(e) => setHaveText(e.target.value)}
            placeholder={"One per line, e.g.\nMaster wide of the table\nClose-up on Maya"}
            style={{ marginBottom: 8 }}
          />
          <div className="cv-body" style={{ fontSize: 10, marginBottom: 22, opacity: 0.8 }}>
            List anything you've already generated and the plan will mark it off, then focus the gaps on what's genuinely still missing.
          </div>

          {user && vault.length > 0 && (
            <>
              <div className="cv-label">Lock from your vault (optional)</div>
              <div style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 14, marginBottom: 22, background: "var(--bg)" }}>
                {vault.map((v) => {
                  const on = lockedIds.includes(v.id);
                  return (
                    <div key={v.id} className="cv-vault-item" onClick={() => setLockedIds((ids) => on ? ids.filter((x) => x !== v.id) : [...ids, v.id])}>
                      <div className={"cv-box" + (on ? " on" : "")}>{on ? "\u2713" : ""}</div>
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

          <div className="cv-label">Target model</div>
          <div className="cv-chiprow">
            {MODELS.map(([v, l]) => (
              <button key={v} className={"cv-chip" + (model === v ? " on" : "")} onClick={() => setModel(v)}>{l}</button>
            ))}
          </div>

          <button className="btn-primary" onClick={handlePlan} disabled={loading} style={{ width: "100%", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Planning the coverage…" : "Plan coverage"}
          </button>

          {error && (
            <div style={{ marginTop: 20, border: "1px solid #F87171", borderRadius: 4, padding: "12px 16px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#F87171", lineHeight: 1.7 }}>{error}</div>
          )}
        </div>
      </div>

      {result && (
        <div className="cv-wrap" style={{ paddingBottom: 80 }}>
          <div className="cv-tally">
            <div style={{ textAlign: "center" }}>
              <div className="cv-tally-n">{result.counts.total}</div>
              <div className="cv-tally-l">Setups</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="cv-tally-n" style={{ color: "#F87171" }}>{result.counts.essential}</div>
              <div className="cv-tally-l">Essential</div>
            </div>
            {result.counts.have > 0 && (
              <div style={{ textAlign: "center" }}>
                <div className="cv-tally-n" style={{ color: "#4ADE80" }}>{result.counts.have}</div>
                <div className="cv-tally-l">Already have</div>
              </div>
            )}
            <div style={{ textAlign: "center" }}>
              <div className="cv-tally-n" style={{ color: result.gaps.length ? "#E5B769" : "#4ADE80" }}>{result.gaps.length}</div>
              <div className="cv-tally-l">Gaps</div>
            </div>
          </div>

          {result.scene_read && (
            <div className="cv-body" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 32px", fontSize: 12, color: "var(--text)" }}>
              {result.scene_read}
            </div>
          )}

          {result.gaps.length > 0 && (
            <>
              <div className="cv-label" style={{ marginBottom: 12 }}>What's missing</div>
              {result.gaps.map((g, i) => (
                <div className="cv-gap" key={i}>
                  <div className="cv-gap-name">{g.missing}</div>
                  <div className="cv-body">{g.why}</div>
                </div>
              ))}
              <div style={{ height: 20 }} />
            </>
          )}

          <div className="cv-label" style={{ marginBottom: 12 }}>The coverage</div>
          {result.coverage.map((c, i) => {
            const p = PRIO[c.priority] ?? PRIO.recommended;
            return (
              <div className={"cv-setup" + (c.have ? " done" : "")} key={i}>
                <div className="cv-setup-head">
                  <span className="cv-setup-name">{c.slug}</span>
                  <span className="cv-prio" style={{ color: p.color }}>{p.label}</span>
                  {c.have && <span className="cv-prio" style={{ color: "#4ADE80" }}>&#10003; Have it</span>}
                </div>
                <div className="cv-purpose">{c.purpose}</div>
                <div className="cv-meta">
                  {c.shot_size && <span><b>Size</b> {c.shot_size}</span>}
                  {c.camera && <span><b>Camera</b> {c.camera}</span>}
                  {c.duration_seconds && <span><b>Duration</b> {c.duration_seconds}s</span>}
                </div>
                {c.prompt && <div className="cv-prompt">{c.prompt}</div>}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => copyPrompt(i, c.prompt)}>
                    {copied === i ? "\u2713 Copied" : "Copy prompt"}
                  </button>
                  <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => generateShot(c.prompt)}>
                    {user ? "Generate this setup \u2192" : "Sign in to generate"}
                  </button>
                </div>
              </div>
            );
          })}

          {result.editorial_note && (
            <>
              <div className="cv-label" style={{ marginTop: 32, marginBottom: 12 }}>How it cuts together</div>
              <div className="cv-note">{result.editorial_note}</div>
            </>
          )}

          <div style={{ textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: 48, marginTop: 20 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.2 }}>Check it before you shoot it.</div>
            <div className="cv-body" style={{ maxWidth: 460, margin: "0 auto 28px" }}>
              Run this coverage through the continuity checker and it reads the setups the way a script supervisor would — screen direction, wardrobe, light.
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => { setCcPrefill?.({ shots: result.coverage.map((c) => c.prompt).filter(Boolean), lockedIds }); setPage("continuity-check"); }}>Check continuity</button>
              <button className="btn-ghost" onClick={() => setPage("shot-director")}>Direct one of these shots</button>
            </div>
          </div>
        </div>
      )}

      {!result && (
        <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "64px 24px" }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 300, color: "var(--text)", marginBottom: 34, textAlign: "center" }}>Why coverage, not shots</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 22 }}>
              {[
                ["Editors cut with options", "A scene is assembled from more material than ends up on screen. The extra angle you didn't think you needed is what saves the scene when a take falls apart halfway through."],
                ["Inserts hide problems", "A hand on a glass, a clock, a reaction — these are how a century of filmmakers have covered a continuity error or a performance that didn't land. They're the cheapest insurance you can generate."],
                ["The gaps matter most", "Knowing you have no neutral reaction to cut to is more useful than another pretty wide. This names the editorial problem, not just the missing shot."],
              ].map(([t, d], i) => (
                <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "26px 24px", background: "var(--bg)" }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{t}</div>
                  <div className="cv-body">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}