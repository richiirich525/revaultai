import { useState } from "react";
import { getSessionToken } from "./lib/session.js";

/*
  PromptBuilderPage — RevaultAI
  Extracted from App.jsx.
*/

export default function PromptBuilderPage({ setPage, user, onSignInClick, activeProject, setGenPrefill }) {
  const [idea, setIdea] = useState("");
  const [model, setModel] = useState("veo");
  const [style, setStyle] = useState("none");
  const [strength, setStrength] = useState("balanced");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [refImage, setRefImage] = useState(null);   // { data, media_type }
  const [refPreview, setRefPreview] = useState("");
  const [refName, setRefName] = useState("");

  // Downscale in the browser so we never hit the request-size limit.
  async function handleRefPick(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      setError("Reference frame must be JPG, PNG, WebP, or GIF.");
      return;
    }
    setError(null);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(new Error("Could not read that file."));
        r.readAsDataURL(file);
      });
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("Could not open that image."));
        i.src = dataUrl;
      });
      const MAX = 1024;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const out = canvas.toDataURL("image/jpeg", 0.85);
      setRefPreview(out);
      setRefImage({ data: out.split(",")[1], media_type: "image/jpeg" });
      setRefName(file.name);
    } catch (err) {
      setError(err.message || "Could not use that image.");
    }
  }

  function clearRef() {
    setRefImage(null);
    setRefPreview("");
    setRefName("");
  }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const models = [
    ["veo", "Veo"],
    ["kling", "Kling"],
    ["runway", "Runway"],
    ["wan", "Wan"],
    ["hailuo", "Hailuo"],
    ["seedance", "Seedance"],
  ];

  const styleOptions = [
    ["none", "No style preset"],
    ["anamorphic-70s", "70s Anamorphic"],
    ["neo-noir", "Neo-Noir Cyberpunk"],
    ["imax-70", "IMAX 70mm"],
    ["doc-16mm", "Documentary 16mm"],
    ["technicolor", "Technicolor Golden Age"],
    ["realtime-engine", "Real-Time Engine (UE5)"],
  ];

  const strengthOptions = [
    ["subtle", "Subtle"],
    ["balanced", "Balanced"],
    ["heavy", "Heavy"],
  ];

  const ratioOptions = [
    ["16:9", "16:9 Landscape"],
    ["9:16", "9:16 Vertical"],
    ["1:1", "1:1 Square"],
  ];

  const fields = [
    ["subject", "Subject"],
    ["action", "Action"],
    ["setting", "Setting"],
    ["camera", "Camera"],
    ["lighting", "Lighting"],
    ["palette", "Palette"],
    ["style", "Style"],
    ["audio", "Audio"],
    ["avoid", "Avoid"],
  ];

  async function handleBuild() {
    if (idea.trim().length < 3 && !refImage) {
      setError("Describe your idea in a few more words, or attach a reference frame.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const headers = { "Content-Type": "application/json" };
      if (user) {
        try {
          const token = await getSessionToken();
          if (token) headers["Authorization"] = "Bearer " + token;
        } catch { /* anonymous build is fine */ }
      }
      const res = await fetch("/api/build-prompt", {
        method: "POST",
        headers,
        body: JSON.stringify({ idea, model, style, strength, aspectRatio, image: refImage || undefined, projectId: activeProject?.id ?? null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError("Couldn't reach the prompt builder. Check your connection and try again.");
    }
    setLoading(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.built.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError("Couldn't copy automatically — select the text and copy it manually.");
    }
  }

  const labelStyle = { fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 8 };
  const bodyStyle = { fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.8 };

  return (
    <div className="page">

      {/* HERO */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "100px 48px 48px", textAlign: "center" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.25em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 24 }}>Free Tool</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 64, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.1 }}>Video Prompt Builder</h1>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 300, color: "var(--muted)", marginBottom: 24, fontStyle: "italic" }}>Turn a rough idea into a shot worth filming.</div>
        <div style={{ ...bodyStyle, fontSize: 12, maxWidth: 540, margin: "0 auto" }}>Describe what you want to see. Get back a structured prompt written in real cinematography language — camera, lighting, palette, and style — ready for Veo, Sora, Kling, Runway, Wan, Hailuo, or Seedance. No account needed.</div>
      </div>

      {/* BUILDER */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 48px 64px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "32px" }}>

          <div style={labelStyle}>Your idea</div>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="A lighthouse keeper walks out at dawn as the storm finally breaks"
            style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, padding: "14px 16px", fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--text)", lineHeight: 1.7, resize: "vertical", boxSizing: "border-box", marginBottom: 6 }}
          />
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--muted)", textAlign: "right", marginBottom: 24 }}>{idea.length} / 500</div>

          <div style={labelStyle}>Reference frame (optional)</div>
          <div style={{ border: "1px solid var(--border)", borderRadius: 4, padding: 14, marginBottom: 28, background: "var(--bg)" }}>
            {refPreview ? (
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                <img src={refPreview} alt="Reference frame" style={{ width: 140, borderRadius: 4, display: "block" }} />
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ ...bodyStyle, color: "var(--text)", marginBottom: 8 }}>{refName}</div>
                  <div style={{ ...bodyStyle, fontSize: 10, marginBottom: 10 }}>
                    The builder will read this frame and write the prompt from what it sees — then direct what happens next.
                  </div>
                  <button className="btn-ghost" style={{ padding: "6px 14px", fontSize: 10 }} onClick={clearRef}>Remove</button>
                </div>
              </div>
            ) : (
              <>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => handleRefPick(e.target.files?.[0])}
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--text)" }}
                />
                <div style={{ ...bodyStyle, fontSize: 10, marginTop: 10 }}>
                  Attach a still and the builder writes the shot from it — subject, wardrobe, setting and light read from the image, then motion and camera directed from your note. Leave the note blank and it will choose a natural movement.
                </div>
              </>
            )}
          </div>

          <div style={labelStyle}>Target model</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
            {models.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setModel(value)}
                style={{
                  border: model === value ? "1px solid var(--accent)" : "1px solid var(--border)",
                  background: model === value ? "var(--bg)" : "transparent",
                  color: model === value ? "var(--accent)" : "var(--muted)",
                  borderRadius: 4,
                  padding: "8px 16px",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                }}
              >{label}</button>
            ))}
          </div>

          <div style={labelStyle}>Cinematic style</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
            {styleOptions.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setStyle(value)}
                style={{
                  border: style === value ? "1px solid var(--accent)" : "1px solid var(--border)",
                  background: style === value ? "var(--bg)" : "transparent",
                  color: style === value ? "var(--accent)" : "var(--muted)",
                  borderRadius: 4,
                  padding: "8px 16px",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                }}
              >{label}</button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 28 }}>
            {style !== "none" && (
              <div>
                <div style={labelStyle}>Style strength</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {strengthOptions.map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setStrength(value)}
                      style={{
                        border: strength === value ? "1px solid var(--accent)" : "1px solid var(--border)",
                        background: strength === value ? "var(--bg)" : "transparent",
                        color: strength === value ? "var(--accent)" : "var(--muted)",
                        borderRadius: 4,
                        padding: "8px 16px",
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 11,
                        letterSpacing: "0.08em",
                        cursor: "pointer",
                      }}
                    >{label}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div style={labelStyle}>Aspect ratio</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ratioOptions.map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setAspectRatio(value)}
                    style={{
                      border: aspectRatio === value ? "1px solid var(--accent)" : "1px solid var(--border)",
                      background: aspectRatio === value ? "var(--bg)" : "transparent",
                      color: aspectRatio === value ? "var(--accent)" : "var(--muted)",
                      borderRadius: 4,
                      padding: "8px 16px",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      cursor: "pointer",
                    }}
                  >{label}</button>
                ))}
              </div>
            </div>
          </div>

          <button className="btn-primary" onClick={handleBuild} disabled={loading} style={{ width: "100%", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Building…" : "Build prompt"}
          </button>

          {error && (
            <div style={{ marginTop: 20, border: "1px solid #F87171", borderRadius: 4, padding: "12px 16px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#F87171", lineHeight: 1.7 }}>{error}</div>
          )}
        </div>
      </div>

      {/* RESULT */}
      {result && (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 48px 80px" }}>

          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 12 }}>Built for {result.model}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: "var(--text)", lineHeight: 1.2 }}>{result.built.title}</div>
          </div>

          {/* The prompt itself */}
          <div style={{ border: "1px solid var(--accent)", borderRadius: 8, padding: "32px", background: "var(--surface)", marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 16 }}>
              <div style={{ ...labelStyle, marginBottom: 0 }}>The prompt</div>
              <button className="btn-ghost" onClick={handleCopy} style={{ padding: "6px 14px", fontSize: 10 }}>{copied ? "Copied" : "Copy"}</button>
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--text)", lineHeight: 1.9 }}>{result.built.prompt}</div>
          </div>

          {/* What the style preset added — shown, not hidden */}
          {result.applied && (
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "24px 28px", marginBottom: 32, background: "var(--surface)" }}>
              <div style={labelStyle}>Style applied — {result.applied.style} ({result.applied.strength})</div>
              <div style={bodyStyle}>{result.applied.directives}</div>
              <div style={{ ...bodyStyle, fontSize: 10, marginTop: 12, opacity: 0.75 }}>
                This is the craft language layered into your prompt. Copy it, change it, or write your own — nothing here is hidden.
              </div>
            </div>
          )}

          {/* The breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 56 }}>
            {fields.filter(([key]) => result.built[key]).map(([key, label]) => (
              <div key={key} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "24px" }}>
                <div style={labelStyle}>{label}</div>
                <div style={bodyStyle}>{result.built[key]}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: 56 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.2 }}>Now make the film.</div>
            <div style={{ ...bodyStyle, maxWidth: 480, margin: "0 auto 32px" }}>RevaultAI is a curated gallery for AI filmmakers — generate your film, publish it, and keep 80% of every sale.</div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                className="btn-primary"
                onClick={() => {
                  if (!user) { onSignInClick?.(); return; }
                  const MAP = { veo: "veo-3.1", kling: "kling-3.0", wan: "wan-2.6", seedance: "seedance-2.5" };
                  setGenPrefill?.({
                    prompt: result.built.prompt,
                    generateModelKey: MAP[model],
                    aspectRatio,
                  });
                  setPage("generate");
                }}
              >
                {user ? "Generate on RevaultAI" : "Create your account"}
              </button>
              <button className="btn-ghost" onClick={() => setPage("explore")}>Explore the archive</button>
            </div>
          </div>
        </div>
      )}

      {/* HOW IT WORKS — only before a first build */}
      {!result && (
        <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "72px 48px" }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: "var(--text)", marginBottom: 40, textAlign: "center" }}>Why structured prompts work better</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 }}>
              {[
                ["Models read craft", "Video models respond to shot sizes, lens choices and lighting setups far more reliably than to adjectives like \"cinematic\"."],
                ["One shot, one idea", "Most failed generations ask for too much at once. A single subject doing a single action holds together."],
                ["Say what to avoid", "Naming the artifacts you don't want — warped hands, flicker, text — measurably reduces how often they appear."],
              ].map(([title, desc], i) => (
                <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "28px 24px", background: "var(--bg)" }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{title}</div>
                  <div style={bodyStyle}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
