import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  SceneBreakdownPage — RevaultAI
  Free tool. Paste a scene or logline, get a numbered shot list where every
  shot carries the same locked character and location descriptions — that
  repetition is the continuity mechanism. No sign-in, no credits.
  Signed-in creators get breakdowns saved so they can return mid-project.
*/

const MODELS = [
  ["veo", "Veo"], ["sora", "Sora"], ["kling", "Kling"], ["runway", "Runway"],
  ["wan", "Wan"], ["hailuo", "Hailuo"], ["seedance", "Seedance"],
];
// Per-second credit costs, mirroring the generator's model list. Only models
// actually available on /generate appear here — if the breakdown targets Sora,
// Runway or Hailuo the estimate is hidden rather than guessed at.
const COST_MODELS = [
  { family: "wan", key: "wan-2.6", label: "Wan 2.6", perSec: 1, maxSeconds: 15 },
  { family: "kling", key: "kling-3.0", label: "Kling 3.0", perSec: 2, maxSeconds: 10 },
  { family: "seedance", key: "seedance-2.0-480", label: "Seedance 2.0 Draft", perSec: 3, maxSeconds: 15 },
  { family: "veo", key: "veo-3.1", label: "Veo 3.1", perSec: 4, maxSeconds: 8 },
  { family: "seedance", key: "seedance-2.0", label: "Seedance 2.0 Flagship", perSec: 6, maxSeconds: 15 },
  { family: "seedance", key: "seedance-2.5-480", label: "Seedance 2.5 Draft", perSec: 6, maxSeconds: 30 },
  { family: "seedance", key: "seedance-2.5", label: "Seedance 2.5 Flagship", perSec: 12, maxSeconds: 30 },
];

// The model a given breakdown target maps to by default on /generate.
const PRIMARY_BY_FAMILY = { wan: "wan-2.6", kling: "kling-3.0", veo: "veo-3.1", seedance: "seedance-2.5" };
const STYLES = [
  ["none", "No preset"], ["anamorphic-70s", "70s Anamorphic"], ["neo-noir", "Neo-Noir"],
  ["imax-70", "IMAX 70mm"], ["doc-16mm", "Doc 16mm"], ["technicolor", "Technicolor"],
  ["realtime-engine", "Real-Time Engine"],
];
const STRENGTHS = [["subtle", "Subtle"], ["balanced", "Balanced"], ["heavy", "Heavy"]];
const RATIOS = [["16:9", "16:9 Landscape"], ["9:16", "9:16 Vertical"], ["1:1", "1:1 Square"]];

const styles = `
  .sb-wrap { max-width: 860px; margin: 0 auto; padding: 0 48px; }
  .sb-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 32px; }
  .sb-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 8px; }
  .sb-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.8; }
  .sb-textarea { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 14px 16px; font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); line-height: 1.7; resize: vertical; box-sizing: border-box; }
  .sb-chiprow { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
  .sb-chip { border: 1px solid var(--border); background: transparent; color: var(--muted); border-radius: 4px; padding: 8px 16px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.08em; cursor: pointer; transition: all 0.2s; }
  .sb-chip:hover { color: var(--text); border-color: var(--muted); }
  .sb-chip.on { border-color: var(--accent); color: var(--accent); background: var(--bg); }
  .sb-locked { border: 1px solid var(--border); border-radius: 8px; padding: 20px 22px; margin-bottom: 14px; background: var(--surface); }
  .sb-locked-name { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
  .sb-shot { border: 1px solid var(--border); border-radius: 8px; padding: 24px 26px; margin-bottom: 16px; background: var(--surface); }
  .sb-shot-head { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
  .sb-shot-num { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; }
  .sb-shot-slug { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; color: var(--text); }
  .sb-meta { display: flex; flex-wrap: wrap; gap: 16px; font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); letter-spacing: 0.06em; margin-bottom: 14px; }
  .sb-meta b { color: var(--accent); font-weight: 400; }
  .sb-prompt { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.9; background: var(--bg); border: 1px solid var(--border); border-radius: 5px; padding: 16px 18px; margin-bottom: 14px; }
  .sb-actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .sb-hist { padding: 10px 12px; border-radius: 4px; cursor: pointer; font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.6; }
  .sb-hist:hover { background: var(--bg); }
  .sb-vault { border: 1px solid var(--border); border-radius: 6px; padding: 18px 20px; margin-bottom: 24px; background: var(--bg); }
  .sb-vault-item { display: flex; align-items: flex-start; gap: 10px; padding: 9px 10px; border-radius: 4px; cursor: pointer; transition: background 0.15s; }
  .sb-vault-item:hover { background: var(--surface); }
  .sb-vault-box { width: 14px; height: 14px; border: 1px solid var(--border); border-radius: 3px; flex-shrink: 0; margin-top: 3px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--accent); line-height: 1; }
  .sb-vault-box.on { border-color: var(--accent); background: var(--accent-dim); }
  .sb-vault-name { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--text); letter-spacing: 0.06em; }
  .sb-vault-kind { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); margin-left: 8px; }
  .sb-vault-desc { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); line-height: 1.65; margin-top: 3px; }
  .sb-cost { border: 1px solid var(--accent); border-radius: 8px; padding: 24px 26px; margin-bottom: 28px; background: var(--surface); }
  .sb-cost-total { font-family: 'Syne', sans-serif; font-size: 30px; font-weight: 700; color: var(--text); line-height: 1; }
  .sb-cost-sub { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.1em; color: var(--muted); margin-top: 8px; }
  .sb-cost-row { display: flex; flex-wrap: wrap; gap: 10px 20px; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--border); }
  .sb-cost-alt { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); letter-spacing: 0.06em; }
  .sb-cost-alt b { color: var(--text); font-weight: 400; }
  .sb-cost-note { font-family: 'DM Mono', monospace; font-size: 9px; color: var(--muted); line-height: 1.7; margin-top: 12px; opacity: 0.8; }
  @media (max-width: 760px) { .sb-wrap { padding: 0 24px; } .sb-card { padding: 22px; } }
`;

export default function SceneBreakdownPage({ setPage, user, onSignInClick, setGenPrefill, notify, openPost, setCcPrefill }) {
  const [scene, setScene] = useState("");
  const [model, setModel] = useState("veo");
  const [style, setStyle] = useState("none");
  const [strength, setStrength] = useState("balanced");
  const [aspect, setAspect] = useState("16:9");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(null);
  const [history, setHistory] = useState([]);
  const [vault, setVault] = useState([]);
  const [lockedIds, setLockedIds] = useState([]);

  async function loadVault() {
    if (!user?.id) { setVault([]); return; }
    const { data } = await supabase
      .from("vault_entries")
      .select("id, kind, name, description, wardrobe, distinguishing")
      .order("kind", { ascending: true })
      .order("name", { ascending: true });
    setVault(data ?? []);
  }
  useEffect(() => { loadVault(); }, [user?.id]);

  function toggleLocked(id) {
    setLockedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function loadHistory() {
    if (!user?.id) { setHistory([]); return; }
    const { data } = await supabase
      .from("scene_breakdowns")
      .select("id, title, shot_count, target_model, created_at, breakdown, aspect_ratio")
      .order("created_at", { ascending: false })
      .limit(8);
    setHistory(data ?? []);
  }
  useEffect(() => { loadHistory(); }, [user?.id]);

  async function handleBuild() {
    if (scene.trim().length < 15) { setError("Describe your scene in a few more words."); return; }
    setLoading(true); setError(null); setResult(null); setCopied(null);
    try {
      const headers = { "Content-Type": "application/json" };
      if (user) {
        try {
          const { data } = await supabase.auth.getSession();
          const t = data?.session?.access_token;
          if (t) headers["Authorization"] = "Bearer " + t;
        } catch { /* anonymous is fine */ }
      }
      const res = await fetch("/api/scene-breakdown", {
        method: "POST",
        headers,
        body: JSON.stringify({
          scene,
          model,
          style,
          strength,
          aspectRatio: aspect,
          locked: vault.filter((v) => lockedIds.includes(v.id)),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Something went wrong. Try again.");
      else { setResult(data); loadHistory(); }
    } catch {
      setError("Couldn't reach the scene breakdown. Check your connection and try again.");
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

  function openSaved(row) {
    setResult({
      model: row.target_model,
      modelKey: row.target_model,
      aspectRatio: row.aspect_ratio || "16:9",
      built: row.breakdown,
      applied: null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const b = result?.built;

  // Estimate what this shot list costs to generate. Hidden entirely when the
  // target model isn't one we can generate on.
  const totalSeconds = (b?.shots ?? []).reduce((sum, s) => sum + (Number(s.duration_seconds) || 0), 0);
  const targetFamily = result?.modelKey;
  const primaryKey = PRIMARY_BY_FAMILY[targetFamily];
  const primary = COST_MODELS.find((m) => m.key === primaryKey);
  const longestShot = (b?.shots ?? []).reduce((max, s) => Math.max(max, Number(s.duration_seconds) || 0), 0);

  const alternates = primary
    ? COST_MODELS
        .filter((m) => m.key !== primary.key)
        .map((m) => ({ ...m, cost: m.perSec * totalSeconds, overLimit: longestShot > m.maxSeconds }))
        .sort((x, y) => x.cost - y.cost)
    : [];

  return (
    <div className="page">
      <style>{styles}</style>

      <div className="sb-wrap" style={{ padding: "100px 48px 40px", textAlign: "center" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.25em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 24 }}>Free Tool</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 60, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.1 }}>Scene Breakdown</h1>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 23, fontWeight: 300, color: "var(--muted)", marginBottom: 24, fontStyle: "italic" }}>One scene in, a full shot list out.</div>
        <div className="sb-body" style={{ fontSize: 12, maxWidth: 560, margin: "0 auto" }}>
          Paste a scene or a logline. Get back a numbered shot list — each shot with its size, camera move, lighting, duration and a complete prompt. Characters and locations are locked and repeated word-for-word across every shot, which is what keeps them recognisable from cut to cut. No account needed.
        </div>
      </div>

      <div className="sb-wrap" style={{ paddingBottom: 56 }}>
        <div className="sb-card">
          <div className="sb-label">Your scene</div>
          <textarea
            className="sb-textarea"
            rows={6}
            maxLength={1500}
            value={scene}
            onChange={(e) => setScene(e.target.value)}
            placeholder="A courier arrives at a rain-soaked loading dock at 3am to hand over a package. She realises the man waiting for her is not the man she was told to meet."
            style={{ marginBottom: 6 }}
          />
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--muted)", textAlign: "right", marginBottom: 24 }}>{scene.length} / 1500</div>

          {user && (
            <>
              <div className="sb-label">Lock from your vault (optional)</div>
              <div className="sb-vault">
                {vault.length === 0 ? (
                  <div className="sb-body" style={{ fontSize: 10 }}>
                    Nothing saved yet.{" "}
                    <span onClick={() => setPage("vault")} style={{ color: "var(--accent)", cursor: "pointer" }}>Build your vault</span>{" "}
                    and your characters and locations drop in here, locked word-for-word across every shot.
                  </div>
                ) : (
                  <>
                    {vault.map((v) => {
                      const on = lockedIds.includes(v.id);
                      return (
                        <div key={v.id} className="sb-vault-item" onClick={() => toggleLocked(v.id)}>
                          <div className={"sb-vault-box" + (on ? " on" : "")}>{on ? "\u2713" : ""}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div>
                              <span className="sb-vault-name">{v.name}</span>
                              <span className="sb-vault-kind">{v.kind}</span>
                            </div>
                            <div className="sb-vault-desc">
                              {v.description.length > 120 ? v.description.slice(0, 120) + "…" : v.description}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="sb-body" style={{ fontSize: 10, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", opacity: 0.8 }}>
                      {lockedIds.length > 0
                        ? `${lockedIds.length} locked — this exact wording appears in every shot they're in.`
                        : "Select anyone appearing in this scene. Their saved description is used verbatim, never rephrased."}{" "}
                      <span onClick={() => setPage("vault")} style={{ color: "var(--accent)", cursor: "pointer" }}>Manage vault</span>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          <div className="sb-label">Target model</div>
          <div className="sb-chiprow">
            {MODELS.map(([v, l]) => (
              <button key={v} className={"sb-chip" + (model === v ? " on" : "")} onClick={() => setModel(v)}>{l}</button>
            ))}
          </div>

          <div className="sb-label">Cinematic style</div>
          <div className="sb-chiprow">
            {STYLES.map(([v, l]) => (
              <button key={v} className={"sb-chip" + (style === v ? " on" : "")} onClick={() => setStyle(v)}>{l}</button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 8 }}>
            {style !== "none" && (
              <div>
                <div className="sb-label">Style strength</div>
                <div className="sb-chiprow">
                  {STRENGTHS.map(([v, l]) => (
                    <button key={v} className={"sb-chip" + (strength === v ? " on" : "")} onClick={() => setStrength(v)}>{l}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="sb-label">Aspect ratio</div>
              <div className="sb-chiprow">
                {RATIOS.map(([v, l]) => (
                  <button key={v} className={"sb-chip" + (aspect === v ? " on" : "")} onClick={() => setAspect(v)}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          <button className="btn-primary" onClick={handleBuild} disabled={loading} style={{ width: "100%", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Breaking down the scene…" : "Break down the scene"}
          </button>

          {error && (
            <div style={{ marginTop: 20, border: "1px solid #F87171", borderRadius: 4, padding: "12px 16px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#F87171", lineHeight: 1.7 }}>{error}</div>
          )}

          {history.length > 0 && !result && (
            <div style={{ marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 18 }}>
              <div className="sb-label">Your saved breakdowns</div>
              {history.map((h) => (
                <div key={h.id} className="sb-hist" onClick={() => openSaved(h)} title="Open this breakdown">
                  <span style={{ color: "var(--text)" }}>{h.title || "Untitled scene"}</span>
                  <span style={{ opacity: 0.7 }}> · {h.shot_count} shots · {h.target_model}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {b && (
        <div className="sb-wrap" style={{ paddingBottom: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 12 }}>
              {b.shots.length} shots · built for {result.model} · {result.aspectRatio}
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: "var(--text)", lineHeight: 1.2 }}>{b.title}</div>
            {b.logline && <div className="sb-body" style={{ maxWidth: 520, margin: "12px auto 0" }}>{b.logline}</div>}
          </div>

          {primary && totalSeconds > 0 && (
            <div className="sb-cost">
              <div className="sb-label">Estimated generation cost</div>
              <div className="sb-cost-total">{primary.perSec * totalSeconds} credits</div>
              <div className="sb-cost-sub">
                {b.shots.length} shots · {totalSeconds}s total · {primary.label} at {primary.perSec} credit{primary.perSec === 1 ? "" : "s"}/second
              </div>
              {alternates.length > 0 && (
                <div className="sb-cost-row">
                  {alternates.map((m) => (
                    <span className="sb-cost-alt" key={m.key}>
                      {m.label} <b>{m.cost}</b>{m.overLimit ? "*" : ""}
                    </span>
                  ))}
                </div>
              )}
              <div className="sb-cost-note">
                Estimates only — you're charged per second of output when you generate, and failed generations are refunded.
                {alternates.some((m) => m.overLimit) && " * Some shots are longer than this model's maximum, so they'd need splitting or shortening."}
              </div>
            </div>
          )}

          {result.applied && (
            <div className="sb-locked" style={{ marginBottom: 28 }}>
              <div className="sb-label">Style applied — {result.applied.style} ({result.applied.strength})</div>
              <div className="sb-body">{result.applied.directives}</div>
            </div>
          )}

          {(b.characters?.length > 0 || b.locations?.length > 0) && (
            <div style={{ marginBottom: 36 }}>
              <div className="sb-label" style={{ marginBottom: 12 }}>Locked descriptions — repeated word-for-word in every shot</div>
              {(b.characters ?? []).map((c, i) => (
                <div className="sb-locked" key={"c" + i}>
                  <div className="sb-locked-name">{c.name}</div>
                  <div className="sb-body">{c.description}</div>
                  <button className="btn-ghost" style={{ marginTop: 12, padding: "6px 14px", fontSize: 10 }} onClick={() => copyPrompt("c" + i, c.description)}>
                    {copied === "c" + i ? "Copied" : "Copy"}
                  </button>
                </div>
              ))}
              {(b.locations ?? []).map((l, i) => (
                <div className="sb-locked" key={"l" + i}>
                  <div className="sb-locked-name">{l.name}</div>
                  <div className="sb-body">{l.description}</div>
                  <button className="btn-ghost" style={{ marginTop: 12, padding: "6px 14px", fontSize: 10 }} onClick={() => copyPrompt("l" + i, l.description)}>
                    {copied === "l" + i ? "Copied" : "Copy"}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="sb-label" style={{ marginBottom: 14 }}>The shot list</div>
          {b.shots.map((s, i) => (
            <div className="sb-shot" key={i}>
              <div className="sb-shot-head">
                <div>
                  <div className="sb-shot-num">Shot {s.number ?? i + 1}</div>
                  <div className="sb-shot-slug">{s.slug}</div>
                </div>
              </div>
              <div className="sb-meta">
                {s.shot_size && <span><b>Size</b> {s.shot_size}</span>}
                {s.camera_move && <span><b>Camera</b> {s.camera_move}</span>}
                {s.lighting && <span><b>Light</b> {s.lighting}</span>}
                {s.duration_seconds && <span><b>Duration</b> {s.duration_seconds}s</span>}
              </div>
              <div className="sb-prompt">{s.prompt}</div>
              <div className="sb-actions">
                <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => copyPrompt("s" + i, s.prompt)}>
                  {copied === "s" + i ? "\u2713 Copied" : "Copy prompt"}
                </button>
                <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => generateShot(s.prompt)}>
                  {user ? "Generate this shot \u2192" : "Sign in to generate"}
                </button>
              </div>
            </div>
          ))}

          <div style={{ textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: 48, marginTop: 40 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.2 }}>Now shoot it.</div>
            <div className="sb-body" style={{ maxWidth: 460, margin: "0 auto 28px" }}>
              Generate each shot on RevaultAI, or take the prompts anywhere. Publish the finished film in the gallery and keep 80% of every sale.
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => (user ? setPage("generate") : onSignInClick?.())}>{user ? "Open the generator" : "Create your account"}</button>
              <button className="btn-ghost" onClick={() => { setCcPrefill?.({ shots: b.shots.map((s) => s.prompt), lockedIds }); setPage("continuity-check"); }}>Check continuity</button>
              <button className="btn-ghost" onClick={() => setPage("prompt-builder")}>Try the Prompt Builder</button>
            </div>
          </div>
        </div>
      )}

      {!b && (
        <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "64px 24px" }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 300, color: "var(--text)", marginBottom: 36, textAlign: "center" }}>Why a shot list beats one long prompt</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 22 }}>
              {[
                ["Coverage, not miracles", "Films are assembled from shots. Asking one generation to carry a whole scene is how continuity falls apart — cutting between setups is how it holds together."],
                ["Locked descriptions", "The same character wording appears in every shot, verbatim. Repetition is the continuity mechanism: change the words and you change the person."],
                ["Cut before it breaks", "Each shot has a suggested duration sized to your target model. Generate the length you need, then cut — don't ask for more than the model can hold."],
              ].map(([t, d], i) => (
                <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "26px 24px", background: "var(--bg)" }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{t}</div>
                  <div className="sb-body">{d}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 28, fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.8 }}>
              Working across a multi-shot sequence?{" "}
              <span
                onClick={() => openPost?.("ai-video-character-consistency")}
                style={{ color: "var(--accent)", cursor: "pointer", borderBottom: "1px solid rgba(123,63,228,0.35)" }}
              >
                Learn how to keep characters consistent across AI video shots
              </span>.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}