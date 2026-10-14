import { useState, useEffect, useRef } from "react";
import BuyCreditsSection from "./BuyCreditsSection.jsx";
import PromoteDraft from "./PromoteDraft.jsx";
import ShotPresets from "./ShotPresets.jsx";
import TakeDebugger from "./TakeDebugger.jsx";
import VaultRefPicker from "./VaultRefPicker.jsx";
import { refsToSend } from "./VaultRefPicker.jsx";
import { fetchProfile } from "./lib/profiles.js";
import { getSessionToken } from "./lib/session.js";
import { supabase } from "./lib/supabase.js";
import { URL_FRESH_MS, signGenerationUrls } from "./lib/videoUrls.js";

/*
  GeneratePage — RevaultAI
  Extracted from App.jsx.
*/

export default function GeneratePage({ user, profile, notify, setPage, setGenSubmission, setProfile, genPrefill, setGenPrefill, setApPrefill, activeProject }) {
  const GEN_MODELS = [
    { key: "wan-2.6", label: "Wan 2.6 — Fast", costPerSecond: 1, durations: [5, 10, 15], ratios: ["16:9", "9:16", "1:1"] },
    { key: "kling-3.0", label: "Kling 3.0 — Cinematic", costPerSecond: 2, durations: [5, 10], ratios: ["16:9", "9:16", "1:1"], ratioFromImage: true },
    { key: "seedance-2.0-480", label: "Seedance 2.0 — Draft (480p)", costPerSecond: 3, durations: [5, 10, 15], ratios: ["16:9", "9:16", "1:1", "21:9"] },
    { key: "seedance-2.0", label: "Seedance 2.0 — Flagship (720p)", costPerSecond: 6, durations: [5, 10, 15], ratios: ["16:9", "9:16", "1:1", "21:9"] },
    { key: "seedance-2.5-480", label: "Seedance 2.5 — Draft (480p, up to 30s)", costPerSecond: 6, durations: [5, 10, 15, 30], ratios: ["16:9", "9:16", "1:1", "21:9"] },
    { key: "seedance-2.5", label: "Seedance 2.5 — Flagship (720p, up to 30s)", costPerSecond: 12, durations: [5, 10, 15, 30], ratios: ["16:9", "9:16", "1:1", "21:9"] },
    { key: "veo-3.1", label: "Veo 3.1 — Native Audio", costPerSecond: 4, durations: [4, 6, 8], ratios: ["16:9", "9:16"] },
  ];
 const IMAGE_MODELS = [
    { key: "seedream-5.0", label: "Seedream 5.0 — Fast", credits: 1 },
    { key: "nano-banana-2", label: "Nano Banana 2 — Consistent characters", credits: 2 },
  ];
  const [imgPrompt, setImgPrompt] = useState("");
  const [imgModel, setImgModel] = useState("seedream-5.0");
  const [imgGenBusy, setImgGenBusy] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("wan-2.6");
  const [duration, setDuration] = useState(5);
  const [aspect, setAspect] = useState("16:9");
  const [vaultRefIds, setVaultRefIds] = useState([]);
  // A shot handed over from the Scene Breakdown page.
  useEffect(() => {
    if (!genPrefill) return;
    setPrompt(genPrefill.prompt || "");
    const MAP = { veo: "veo-3.1", kling: "kling-3.0", wan: "wan-2.6", seedance: "seedance-2.5" };
    const mapped = genPrefill.generateModelKey || MAP[genPrefill.modelKey];
    if (mapped) setModel(mapped);
    if (genPrefill.aspectRatio) setAspect(genPrefill.aspectRatio);
    specRef.current = genPrefill.filmSpecId ? { id: genPrefill.filmSpecId, version: genPrefill.filmSpecVersion ?? 1 } : null;
    slotRef.current = genPrefill.coverageSlotId ?? null;
    promoRef.current = genPrefill.promotedFrom ?? null;
    locRef.current = genPrefill.locationUrl ? { url: genPrefill.locationUrl, name: genPrefill.locationName ?? null } : null;
    if (genPrefill.generateModelKey) setModel(genPrefill.generateModelKey);
    if (genPrefill.duration) setDuration(Number(genPrefill.duration));
    setGenPrefill?.(null);
    notify(genPrefill.prompt ? "Shot loaded — check the model and duration, then Generate." : "Model selected — write your prompt and Generate.");
  }, [genPrefill]);

  const specRef = useRef(null);
  const slotRef = useRef(null);
  const promoRef = useRef(null);
  const locRef = useRef(null);
  const [pbOpen, setPbOpen] = useState(false);
  const [pbIdea, setPbIdea] = useState("");
  const [pbModel, setPbModel] = useState("veo");
  const [pbStyle, setPbStyle] = useState("none");
  const [pbStrength, setPbStrength] = useState("balanced");
  const [pbLoading, setPbLoading] = useState(false);
  const [pbResult, setPbResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [vaultNames, setVaultNames] = useState([]);

  useEffect(() => {
    (async () => {
      if (!user?.id) { setVaultNames([]); return; }
      const { data } = await supabase.from("vault_entries").select("name, kind");
      setVaultNames(data ?? []);
    })();
  }, [user?.id]);
  useEffect(() => {
    const m = GEN_MODELS.find((x) => x.key === model);
    if (m && !m.durations.includes(duration)) setDuration(m.durations[0]);
    if (m && m.ratios && !m.ratios.includes(aspect)) setAspect(m.ratios[0]);
  }, [model]);
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageName, setImageName] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  // Credits are spent server-side, so the balance held in state goes stale the
  // moment a generation starts. Refresh it after every spend: leaving it stale
  // shows the wrong number and also trips handleGenerate's own pre-flight
  // check, which refuses to generate against a balance it thinks is short.
  async function refreshCredits() {
    if (!user) return;
    try {
      const { data } = await fetchProfile(user.id);
      if (data) setProfile(data);
    } catch (err) {
      // Cosmetic only — never let a failed refresh break the caller.
      console.warn("[RevaultAI] Could not refresh credit balance:", err.message);
    }
  }
  async function handleGenerateImage() {
    if (!imgPrompt.trim()) { notify("Describe the image you want."); return; }
    setImgGenBusy(true);
    try {
      const token = await getSessionToken();
      const r = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imgPrompt, model: imgModel }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.imageUrl) { notify(j.error || "Image generation failed."); setImgGenBusy(false); return; }
      setImageUrl(j.imageUrl);
      setImageName("Generated: " + imgPrompt.slice(0, 40));
      refreshCredits();
    } catch (err) {
      notify("Image generation failed: " + err.message);
    }
    setImgGenBusy(false);
  }
  async function handleImagePick(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { notify("Image must be JPG, PNG, or WebP."); return; }
    if (file.size > 10 * 1024 * 1024) { notify("Image must be under 10 MB."); return; }
    setImageBusy(true);
    try {
      const token = await getSessionToken();
      const r = await fetch("/api/get-upload-url", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ fileType: file.type }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.uploadUrl) { notify(j.error || "Could not prepare the image upload."); setImageBusy(false); return; }
      await new Promise((resolve, reject) => {
        const x = new XMLHttpRequest();
        x.open("PUT", j.uploadUrl);
        x.setRequestHeader("Content-Type", file.type);
        x.addEventListener("load", () => (x.status >= 200 && x.status < 300) ? resolve() : reject(new Error("Upload failed (" + x.status + ")")));
        x.addEventListener("error", () => reject(new Error("Network error during upload")));
        x.send(file);
      });
      setImageUrl(j.videoPublicUrl);
      setImageName(file.name);
    } catch (err) {
      notify("Image upload failed: " + err.message);
    }
    setImageBusy(false);
  }
  const [gens, setGens] = useState([]);
  const [videoUrls, setVideoUrls] = useState({});
  const [videoUrlFails, setVideoUrlFails] = useState({});   // id -> why playback is unavailable
  const videoUrlsRef = useRef({});
  const videoSignedAtRef = useRef({});   // id -> when its link was signed
  const [chainFor, setChainFor] = useState(null);      // generation id being scrubbed
  const [chainTime, setChainTime] = useState(0);
  const [chainMax, setChainMax] = useState(0);
  const [chainBusy, setChainBusy] = useState(false);
  const chainVideoRef = useRef(null);

  function openChain(g) {
    if (!videoUrls[g.id]) { notify(videoUrlFails[g.id] || "Still preparing playback for that clip — try again in a moment."); return; }
    setChainFor(chainFor === g.id ? null : g.id);
    setChainTime(0);
    setChainMax(0);
  }

  // Grab the frame currently shown in the scrub video, upload it to R2, and
  // set it as the starting frame for the next generation.
  async function useFrame() {
    const v = chainVideoRef.current;
    if (!v) return;
    setChainBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      if (!canvas.width || !canvas.height) throw new Error("Couldn't read that frame — try again once the clip has loaded.");
      canvas.getContext("2d").drawImage(v, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve, reject) => {
        try {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't capture the frame."))), "image/jpeg", 0.92);
        } catch {
          reject(new Error("This clip can't be read into a frame — the storage bucket needs GET allowed in its CORS policy."));
        }
      });

      const token = await getSessionToken();
      const r = await fetch("/api/get-upload-url", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ fileType: "image/jpeg" }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.uploadUrl) throw new Error(j.error || "Could not prepare the upload.");

      await new Promise((resolve, reject) => {
        const x = new XMLHttpRequest();
        x.open("PUT", j.uploadUrl);
        x.setRequestHeader("Content-Type", "image/jpeg");
        x.addEventListener("load", () => (x.status >= 200 && x.status < 300) ? resolve() : reject(new Error("Upload failed (" + x.status + ")")));
        x.addEventListener("error", () => reject(new Error("Network error during upload")));
        x.send(blob);
      });

      setImageUrl(j.videoPublicUrl);
      setImageName("Frame at " + chainTime.toFixed(1) + "s");
      setChainFor(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      notify("Frame set as your starting frame — write the next shot.");
    } catch (err) {
      notify(err.message || "Could not use that frame.");
    }
    setChainBusy(false);
  }
  const COST = (GEN_MODELS.find((m) => m.key === model)?.costPerSecond ?? 1) * duration;

  async function loadGens() {
    if (!user?.id) return;
    const { data } = await supabase
      .from("generations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    const items = data ?? [];
    setGens(items);

    // Sign the playback links we don't have yet, in one request. This used to
    // be a sequential loop that read the session token and called the API once
    // per clip, so twenty clips meant twenty round trips end to end.
    // This page captures frames from the players rendered in the list, so it
    // can't sign on demand the way the Takes page does. Instead each poll
    // refreshes any link old enough to be near expiry.
    const now = Date.now();
    const wanted = items.filter((g) => {
      if (g.status !== "complete" || !g.video_url) return false;
      if (!videoUrlsRef.current[g.id]) return true;
      return now - (videoSignedAtRef.current[g.id] ?? 0) > URL_FRESH_MS;
    });
    if (wanted.length > 0) {
      try {
        const { urls: got, failed } = await signGenerationUrls(wanted.map((g) => g.id));
        const keys = Object.keys(got);
        if (keys.length > 0) {
          videoUrlsRef.current = { ...videoUrlsRef.current, ...got };
          for (const id of keys) videoSignedAtRef.current[id] = Date.now();
          setVideoUrls(videoUrlsRef.current);
        }
        setVideoUrlFails((f) => {
          const next = { ...f, ...failed };
          for (const id of Object.keys(got)) delete next[id];
          return next;
        });
      } catch { /* retry on the next poll */ }
    }
  }

  useEffect(() => {
    loadGens();
    const t = setInterval(loadGens, 8000);
    return () => clearInterval(t);
  }, [user?.id]);

  const [editing, setEditing] = useState(null);
  const EDIT_ACTIONS = {
    "upscale-1080p": { label: "Upscale to 1080p", perSec: 2, adds: 0 },
    "upscale-4k": { label: "Upscale to 4K", perSec: 6, adds: 0 },
    "extend-5": { label: "Extend by 5s", perSec: 3, adds: 5 },
    "extend-10": { label: "Extend by 10s", perSec: 3, adds: 10 },
    "lipsync": { label: "Lip Sync", perSec: 2, adds: 0, skipConfirm: true },
  };
  const [lipsyncFor, setLipsyncFor] = useState(null);
  const [audioBusy, setAudioBusy] = useState(false);
  async function handleAudioPick(gen, file) {
    if (!file) return;
    if (!/^audio\//.test(file.type)) { notify("Please choose an audio file (MP3, WAV, M4A, AAC, OGG)."); return; }
    if (file.size > 20 * 1024 * 1024) { notify("Audio must be under 20 MB."); return; }
    const secs = gen.duration_seconds || 5;
    if (!window.confirm(`Lip Sync — ${2 * secs} credits. Continue?`)) return;
    setAudioBusy(true);
    try {
      const token = await getSessionToken();
      const r = await fetch("/api/get-upload-url", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ fileType: file.type }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.uploadUrl) { notify(j.error || "Could not prepare the audio upload."); setAudioBusy(false); return; }
      await new Promise((resolve, reject) => {
        const x = new XMLHttpRequest();
        x.open("PUT", j.uploadUrl);
        x.setRequestHeader("Content-Type", file.type);
        x.addEventListener("load", () => (x.status >= 200 && x.status < 300) ? resolve() : reject(new Error("Upload failed (" + x.status + ")")));
        x.addEventListener("error", () => reject(new Error("Network error during upload")));
        x.send(file);
      });
      await handleEdit(gen, "lipsync", { audioUrl: j.videoPublicUrl });
      setLipsyncFor(null);
    } catch (err) {
      notify("Audio upload failed: " + err.message);
    }
    setAudioBusy(false);
  }
  async function handleEdit(gen, action, extra = {}) {
    const a = EDIT_ACTIONS[action];
    const secs = gen.duration_seconds || 5;
    const cost = a.perSec * (secs + a.adds);
    if (!a.skipConfirm && !window.confirm(`${a.label} — ${cost} credits. Continue?`)) return;
    setEditing(gen.id);
    try {
      const token = await getSessionToken();
      const res = await fetch("/api/edit-video", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ action, generationId: gen.id, ...extra }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { notify(j.error || "Could not start edit."); setEditing(null); return; }
      notify(a.label + " started — it usually takes a few minutes.");
      setEditing(null);
      loadGens();
      refreshCredits();
    } catch (err) {
      notify("Could not start edit: " + err.message);
      setEditing(null);
    }
  }
  async function handleDownload(gen) {
    try {
      const token = await getSessionToken();
      const r = await fetch("/api/get-video-url", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "generation", id: gen.id }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) { notify(j.error || "Could not prepare the download."); return; }
      window.location.href = j.url;
    } catch (err) {
      notify("Could not prepare the download: " + err.message);
    }
  }
  const PB_MODELS = [["veo","Veo"],["kling","Kling"],["runway","Runway"],["wan","Wan"],["hailuo","Hailuo"],["seedance","Seedance"]];
  const PB_STYLES = [["none","No preset"],["anamorphic-70s","70s Anamorphic"],["neo-noir","Neo-Noir"],["imax-70","IMAX 70mm"],["doc-16mm","Doc 16mm"],["technicolor","Technicolor"],["realtime-engine","Real-Time Engine"]];
  const PB_STRENGTHS = [["subtle","Subtle"],["balanced","Balanced"],["heavy","Heavy"]];

  async function loadHistory() {
    if (!user?.id) return;
    const { data } = await supabase
      .from("prompt_history")
      .select("id, title, prompt, style, created_at")
      .order("created_at", { ascending: false })
      .limit(8);
    setHistory(data ?? []);
  }
  useEffect(() => { loadHistory(); }, [user?.id]);

  async function handleBuildPrompt() {
    if (pbIdea.trim().length < 3) { notify("Describe your idea in a few more words."); return; }
    setPbLoading(true);
    setPbResult(null);
    try {
      const headers = { "Content-Type": "application/json" };
      try {
        const token = await getSessionToken();
        if (token) headers["Authorization"] = "Bearer " + token;
      } catch { /* anonymous is fine */ }
      const res = await fetch("/api/build-prompt", {
        method: "POST",
        headers,
        body: JSON.stringify({ idea: pbIdea, model: pbModel, style: pbStyle, strength: pbStrength, aspectRatio: aspect, projectId: activeProject?.id ?? null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { notify(data.error || "Could not build the prompt."); setPbLoading(false); return; }
      setPbResult(data);
      loadHistory();
    } catch (err) {
      notify("Could not reach the prompt builder.");
    }
    setPbLoading(false);
  }

  function applyPrompt(text) {
    setPrompt(text);
    setPbOpen(false);
    setPbResult(null);
    notify("Prompt loaded — edit it or hit Generate.");
  }

  // Preflight — reads signals we already have. No API call, no delay.
  const preflight = (() => {
    const m = GEN_MODELS.find((x) => x.key === model);
    const words = prompt.trim().split(/\s+/).filter(Boolean).length;
    const balance = profile?.credits ?? 0;
    const lower = prompt.toLowerCase();
    const mentioned = vaultNames.filter((v) => v.name && lower.includes(v.name.toLowerCase()));
    const items = [];

    items.push(
      words === 0
        ? { s: "bad", t: "Prompt", d: "Nothing to generate yet." }
        : words < 15
        ? { s: "warn", t: "Prompt", d: `${words} words — short prompts leave most of the shot to the model. 40–100 is the useful range.` }
        : { s: "ok", t: "Prompt", d: `${words} words.` }
    );

    items.push(
      m && m.durations.includes(duration)
        ? { s: "ok", t: "Model & duration", d: `${m.label} at ${duration}s.` }
        : { s: "bad", t: "Model & duration", d: "That duration isn't supported by this model." }
    );

    const ratios = m?.ratios ?? ["16:9"];
    items.push(
      ratios.includes(aspect)
        ? { s: "ok", t: "Aspect ratio", d: aspect + (aspect === "9:16" ? " — vertical, ready for Reels and TikTok." : "") }
        : { s: "bad", t: "Aspect ratio", d: `${m?.label ?? "This model"} doesn't support ${aspect}. Pick ${ratios.join(" or ")}.` }
    );

    items.push(
      balance >= COST
        ? { s: "ok", t: "Credits", d: `${COST} needed, ${balance} available.` }
        : { s: "bad", t: "Credits", d: `${COST} needed, ${balance} available. Top up on your Profile page.` }
    );

    items.push(
      imageUrl
        ? { s: "ok", t: "Starting frame", d: "Attached — the model inherits your composition instead of inventing one." }
        : { s: "info", t: "Starting frame", d: "None attached. Optional, but a still gives you far more control over how the shot opens." }
    );

    if (vaultNames.length > 0) {
      items.push(
        mentioned.length > 0
          ? { s: "ok", t: "Vault", d: `${mentioned.map((v) => v.name).join(", ")} named in the prompt — check the locked description is in there too.` }
          : { s: "info", t: "Vault", d: "No vault entries named in this prompt. If a saved character or location is in this shot, paste their locked description in." }
      );
    }

    const blocking = items.filter((i) => i.s === "bad").length;
    const warnings = items.filter((i) => i.s === "warn").length;
    return { items, blocking, warnings, ready: blocking === 0 };
  })();

  async function handleGenerate() {
    if (!user) { notify("Sign in to generate."); return; }
    if (!prompt.trim()) { notify("Write a prompt first."); return; }
    // Only stop when the balance is actually known to be short. An unloaded
    // profile is not an empty wallet, and blocking on it costs a written prompt.
    if (profile && typeof profile.credits === "number" && profile.credits < COST) {
      notify("Not enough credits — top up on your Profile page."); return;
    }
    setSubmitting(true);
    try {
      const token = await getSessionToken();
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), model, duration, aspectRatio: aspect, imageUrl: imageUrl || undefined, projectId: activeProject?.id ?? null, filmSpecId: specRef.current?.id ?? null, filmSpecVersion: specRef.current?.version ?? null, vaultRefIds: refsToSend(model, imageUrl, vaultRefIds), coverageSlotId: slotRef.current, promotedFrom: promoRef.current, locationUrl: locRef.current?.url ?? null, locationName: locRef.current?.name ?? null }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify(j.error || "Could not start generation.");
        setSubmitting(false);
        return;
      }
      notify("Generation started — it usually takes a few minutes.");
      setPrompt("");
      setImageUrl(null);
      setImageName("");
      setSubmitting(false);
      loadGens();
      refreshCredits();
    } catch (err) {
      notify("Could not start generation: " + err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">Create</div>
        <div className="page-hdr-title">Generate</div>
        <div className="page-hdr-sub">Turn a prompt into a film clip. {COST} credits per 5-second video.</div>
      </div>
      <section className="section">
        {user && (
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <BuyCreditsSection user={user} profile={profile} notify={notify} />
          </div>
        )}
        {!user ? (
          <div className="empty-state"><div className="empty-text">Sign in to generate videos.</div></div>
        ) : (
          <div className="gen-form">
            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => setPbOpen((o) => !o)}
                style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", padding: 0 }}
              >
                {pbOpen ? "\u2013 Hide prompt builder" : "+ Need a prompt? Build one"}
              </button>
            </div>

            {pbOpen && (
              <div style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 20, marginBottom: 16, background: "var(--bg3)" }}>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={pbIdea}
                  onChange={(e) => setPbIdea(e.target.value)}
                  placeholder="A lighthouse keeper walks out at dawn as the storm finally breaks"
                  style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, padding: "12px 14px", fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--text)", lineHeight: 1.7, resize: "vertical", boxSizing: "border-box", marginBottom: 14 }}
                />
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                  <select className="gen-model-select" value={pbModel} onChange={(e) => setPbModel(e.target.value)}>
                    {PB_MODELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <select className="gen-model-select" value={pbStyle} onChange={(e) => setPbStyle(e.target.value)}>
                    {PB_STYLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  {pbStyle !== "none" && (
                    <select className="gen-model-select" value={pbStrength} onChange={(e) => setPbStrength(e.target.value)}>
                      {PB_STRENGTHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  )}
                  <button className="gen-button" onClick={handleBuildPrompt} disabled={pbLoading}>
                    {pbLoading ? "Building..." : "Build prompt"}
                  </button>
                </div>

                {pbResult && (
                  <div style={{ border: "1px solid var(--accent)", borderRadius: 4, padding: 16, background: "var(--bg)" }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>{pbResult.built.title}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.9, marginBottom: 12 }}>{pbResult.built.prompt}</div>
                    {pbResult.applied && (
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", lineHeight: 1.8, borderTop: "1px solid var(--border)", paddingTop: 10, marginBottom: 12, opacity: 0.8 }}>
                        <strong style={{ color: "var(--accent)" }}>{pbResult.applied.style} ({pbResult.applied.strength}):</strong> {pbResult.applied.directives}
                      </div>
                    )}
                    <button className="gen-button" onClick={() => applyPrompt(pbResult.built.prompt)}>Use this prompt</button>
                  </div>
                )}

                {history.length > 0 && (
                  <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.16em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 }}>Recent prompts</div>
                    {history.map((h) => (
                      <div
                        key={h.id}
                        onClick={() => applyPrompt(h.prompt)}
                        style={{ padding: "8px 10px", borderRadius: 4, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        title="Click to use this prompt"
                      >
                        <span style={{ color: "var(--text)" }}>{h.title || "Untitled"}</span>
                        {h.style && h.style !== "none" ? <span style={{ opacity: 0.7 }}> · {h.style}</span> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <textarea
              className="gen-prompt"
              rows={4}
              maxLength={2000}
              placeholder="Describe your shot — subject, motion, lighting, camera..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div style={{ marginTop: 10, padding: 12, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 4, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.1em", color: "var(--muted)", textTransform: "uppercase" }}>
                {imageBusy ? "Uploading image..." : imageUrl ? "Starting frame: " + imageName : "Starting frame (optional)"}
              </span>
              {imageUrl ? (
                <button className="gen-button" style={{ padding: "6px 14px", fontSize: 10 }} onClick={() => { setImageUrl(null); setImageName(""); }}>Remove</button>
              ) : (
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={imageBusy} onChange={(e) => handleImagePick(e.target.files[0])} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--text)" }} />
              )}
            </div>
            <div className="gen-form-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.15em", color: "var(--accent)", textTransform: "uppercase" }}>Or generate a starting image</div>
              <input
                type="text"
                value={imgPrompt}
                onChange={(e) => setImgPrompt(e.target.value)}
                placeholder="A lighthouse keeper at dawn, storm clearing"
                style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, padding: "10px 12px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--text)", boxSizing: "border-box" }}
              />
              <div className="gen-cost" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <select className="gen-model-select" value={imgModel} onChange={(e) => setImgModel(e.target.value)}>
                  {IMAGE_MODELS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
                <span>Cost: {IMAGE_MODELS.find((m) => m.key === imgModel)?.credits ?? 1} credits</span>
                <button className="gen-button" onClick={handleGenerateImage} disabled={imgGenBusy}>
                  {imgGenBusy ? "Generating..." : "Generate image"}
                </button>
              </div>
            </div>
            <div className="gen-form-row">
              <div className="gen-cost">
                <select className="gen-model-select" value={model} onChange={(e) => setModel(e.target.value)}>
                  {GEN_MODELS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
                <select className="gen-model-select" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                  {(GEN_MODELS.find((m) => m.key === model)?.durations ?? [5]).map((d) => (
                    <option key={d} value={d}>{d} seconds</option>
                  ))}
                </select>
                {(() => {
                  const m = GEN_MODELS.find((x) => x.key === model);
                  const ignored = !!(imageUrl && m?.ratioFromImage);
                  const LABELS = { "16:9": "16:9 — Landscape", "9:16": "9:16 — Vertical", "1:1": "1:1 — Square", "21:9": "21:9 — Ultrawide" };
                  return (
                    <select
                      className="gen-model-select"
                      value={aspect}
                      onChange={(e) => setAspect(e.target.value)}
                      disabled={ignored}
                      title={ignored ? "Kling matches the aspect ratio of your starting image" : "Aspect ratio"}
                      style={{ opacity: ignored ? 0.5 : 1 }}
                    >
                      {(m?.ratios ?? ["16:9"]).map((r) => (
                        <option key={r} value={r}>{LABELS[r] ?? r}</option>
                      ))}
                    </select>
                  );
                })()}
                <span style={{ marginLeft: 12 }}>Cost: {COST} credits · Balance: {typeof profile?.credits === "number" ? profile.credits : "…"}</span>
              </div>
              <button className="gen-button" onClick={handleGenerate} disabled={submitting}>
                {submitting ? "Starting..." : "Generate"}
              </button>
            </div>
            <ShotPresets
              user={user}
              notify={notify}
              current={{ model, duration, aspect, prompt }}
              onApply={(d) => {
                if (d?.model) setModel(d.model);
                if (d?.duration) setDuration(Number(d.duration));
                if (d?.aspect) setAspect(d.aspect);
                if (d?.promptStart && !prompt.trim()) setPrompt(d.promptStart);
              }}
            />
            <div className="gen-form-row" style={{ display: "none" }}>
            </div>
            <VaultRefPicker
              model={model}
              prompt={prompt}
              imageUrl={imageUrl}
              duration={duration}
              setDuration={setDuration}
              value={vaultRefIds}
              onChange={setVaultRefIds}
              onOpenVault={() => setPage("vault")}
            />
            <div className="pf">
              <div className="pf-head">
                <span className="pf-title">Ready to generate?</span>
                <span className="pf-verdict" style={{ color: preflight.ready ? (preflight.warnings ? "#E5B769" : "#4ADE80") : "#F87171" }}>
                  {preflight.ready
                    ? preflight.warnings
                      ? "Ready, with notes"
                      : "\u2713 Ready"
                    : preflight.blocking + " thing" + (preflight.blocking === 1 ? "" : "s") + " to fix"}
                </span>
              </div>
              {preflight.items.map((i, n) => {
                const col = i.s === "ok" ? "#4ADE80" : i.s === "warn" ? "#E5B769" : i.s === "bad" ? "#F87171" : "var(--muted)";
                const mark = i.s === "ok" ? "\u2713" : i.s === "bad" ? "\u2715" : i.s === "warn" ? "!" : "\u00b7";
                return (
                  <div className="pf-row" key={n}>
                    <span className="pf-mark" style={{ color: col }}>{mark}</span>
                    <span><span className="pf-k">{i.t}</span> <span className="pf-d">— {i.d}</span></span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "none" }}>
            </div>
          </div>
        )}
        {gens.length > 0 && (
          <div className="gen-list" id="your-clips">
            {gens.map((g) => (
              <div key={g.id} className="gen-item">
                <div className="gen-item-prompt">{g.prompt}</div>
                {g.status === "complete" && g.video_url ? (
                  <>
                    {videoUrls[g.id]
                      ? <video className="gen-item-video" src={videoUrls[g.id]} controls playsInline />
                      : <div className="gen-item-status" style={videoUrlFails[g.id] ? { color: "#E5B769" } : undefined}>{videoUrlFails[g.id] || "Preparing playback..."}</div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      <button className="gen-button" onClick={() => handleDownload(g)}>
                        ⬇ Download
                      </button>
                      <button className="gen-button" onClick={() => { setGenSubmission({ videoUrl: g.video_url, prompt: g.prompt, model: g.model }); setPage("submit"); }}>
                        Submit to Gallery
                      </button>
                      {!String(g.model || "").startsWith("upscale-") && (
                        <>
                          <button className="gen-button" onClick={() => handleEdit(g, "upscale-1080p")} disabled={editing === g.id}>
                            {editing === g.id ? "Starting..." : "Upscale 1080p"}
                          </button>
                          <button className="gen-button" onClick={() => handleEdit(g, "upscale-4k")} disabled={editing === g.id}>
                            Upscale 4K
                          </button>
                          <button className="gen-button" onClick={() => handleEdit(g, "extend-5")} disabled={editing === g.id}>
                            Extend +5s
                          </button>
                          <button className="gen-button" onClick={() => handleEdit(g, "extend-10")} disabled={editing === g.id}>
                            Extend +10s
                          </button>
                          <button className="gen-button" onClick={() => setLipsyncFor(lipsyncFor === g.id ? null : g.id)} disabled={editing === g.id}>
                            Lip Sync
                          </button>
                          <button className="gen-button" onClick={() => { setApPrefill?.({ prompt: g.prompt, modelKey: g.model }); setPage("autopsy"); }}>
                            Why didn't this work?
                          </button>
                          <TakeDebugger generation={g} notify={notify} setGenPrefill={setGenPrefill} setPage={setPage} />
                          <PromoteDraft generation={g} setGenPrefill={setGenPrefill} setPage={setPage} />
                          <button className="gen-button" onClick={() => openChain(g)}>
                            {chainFor === g.id ? "Close frame picker" : "Use a frame \u2192"}
                          </button>
                        </>
                      )}
                    </div>
                    {chainFor === g.id && videoUrls[g.id] && (
                      <div className="chain">
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.14em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 10 }}>
                          Pick the frame to carry forward
                        </div>
                        <video
                          ref={chainVideoRef}
                          className="chain-video"
                          src={videoUrls[g.id]}
                          crossOrigin="anonymous"
                          preload="auto"
                          muted
                          playsInline
                          onLoadedMetadata={(e) => {
                            const d = e.currentTarget.duration || 0;
                            setChainMax(d);
                            const t = Math.max(0, d - 0.08);
                            setChainTime(t);
                            e.currentTarget.currentTime = t;
                          }}
                        />
                        <div className="chain-row">
                          <input
                            className="chain-slider"
                            type="range"
                            min={0}
                            max={chainMax || 0}
                            step={0.05}
                            value={chainTime}
                            onChange={(e) => {
                              const t = Number(e.target.value);
                              setChainTime(t);
                              if (chainVideoRef.current) chainVideoRef.current.currentTime = t;
                            }}
                          />
                          <span className="chain-t">{chainTime.toFixed(2)}s</span>
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button className="gen-button" onClick={useFrame} disabled={chainBusy}>
                            {chainBusy ? "Capturing…" : "Use this frame"}
                          </button>
                          <button
                            className="gen-button"
                            onClick={() => {
                              const t = Math.max(0, chainMax - 0.08);
                              setChainTime(t);
                              if (chainVideoRef.current) chainVideoRef.current.currentTime = t;
                            }}
                          >
                            Jump to last frame
                          </button>
                        </div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", lineHeight: 1.7, marginTop: 10, opacity: 0.8 }}>
                          The frame becomes your starting frame for the next generation — the next shot inherits this composition, wardrobe and light instead of reconstructing them.
                        </div>
                      </div>
                    )}

                    {lipsyncFor === g.id && (
                      <div style={{ marginTop: 12, padding: 14, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 4 }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 10 }}>
                          {audioBusy ? "UPLOADING AUDIO..." : "CHOOSE AN AUDIO FILE — THE MOUTH WILL BE RE-SYNCED TO IT"}
                        </div>
                        <input type="file" accept="audio/*" disabled={audioBusy} onChange={(e) => handleAudioPick(g, e.target.files[0])} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--text)" }} />
                      </div>
                    )}
                  </>
                ) : g.status === "failed" ? (
                  <div className="gen-item-status gen-failed">Failed — credits refunded{g.error_message ? ": " + g.error_message : ""}</div>
                ) : (
                  <div className="gen-item-status">Generating... this can take a few minutes.</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
