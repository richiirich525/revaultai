import { useState, useEffect } from "react";
import { track } from "./lib/analytics.js";
import { CATEGORIES } from "./lib/categories.js";
import { fetchCreations, insertCreation } from "./lib/db.js";
import { normalizeContactUrl } from "./lib/links.js";
import { getSessionToken } from "./lib/session.js";
import { supabase } from "./lib/supabase.js";
import { fetchVimeoThumb, parseVimeoUrl, parseYouTubeId } from "./lib/videoLinks.js";

/*
  SubmitPage — RevaultAI
  Extracted from App.jsx.
*/

export default function SubmitPage({ setCreations, notify, setPage, user, profile, prefill, activeProject }) {
  const [form, setForm] = useState({ title: "", tools: "", category: "Abstract", prompt: "", isPremium: false, licenseUrl: "", youtubeUrl: "" });
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(activeProject?.id ?? "");
  useEffect(() => {
    if (!user?.id) { setProjects([]); return; }
    supabase.from("projects").select("id, name").order("created_at", { ascending: false })
      .then(({ data }) => setProjects(data ?? []));
  }, [user?.id]);
  const [videoFile, setVideoFile] = useState(null); const [uploadState, setUploadState] = useState("idle"); const [uploadPct, setUploadPct] = useState(0); const [uploadResult, setUploadResult] = useState(null); const [uploadError, setUploadError] = useState(null); const [dragover, setDragover] = useState(false); const [submitting, setSubmitting] = useState(false);
  function updateField(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }
  function formatBytes(b) { if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB"; return (b / (1024 * 1024)).toFixed(1) + " MB"; }

  /*
    What to credit a submission to. This used to read "Kling 3.0 if the model
    was Kling, otherwise Wan 2.6", so every Veo, Seedance and MiniMax take
    reached the archive labeled as Wan. The names match the tiers offered on
    the Generate page; an unknown key credits the platform rather than guessing
    at a model, because a wrong credit is worse than a vague one.
  */
  function generatedWith(model) {
    const key = String(model ?? "");
    const name =
      key.startsWith("kling") ? "Kling 3.0" :
      key.startsWith("veo") ? "Veo 3.1" :
      key.startsWith("seedance-2.5") ? "Seedance 2.5" :
      key.startsWith("seedance") ? "Seedance 2.0" :
      key.startsWith("minimax") ? "MiniMax H3 Max" :
      key.startsWith("wan") ? "Wan 2.6" :
      null;
    return name ? `${name} (RevaultAI Generate)` : "RevaultAI Generate";
  }

  // If arriving from the Generate page, attach the generated video automatically
  useEffect(() => {
    if (!prefill?.videoUrl) return;
    setForm((prev) => ({ ...prev, prompt: prefill.prompt ?? prev.prompt, tools: prev.tools || generatedWith(prefill.model) }));
    (async () => {
      setUploadState("processing");
      try {
        const token = await getSessionToken();
        const res = await fetch("/api/process-video", {
          method: "POST",
          headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify({ videoPublicUrl: prefill.videoUrl, creationId: "pending" }),
        });
        const result = await res.json();
        setUploadResult(result);
        setUploadState("done");
      } catch (err) {
        setUploadError(err.message);
        setUploadState("error");
      }
    })();
  }, []);
  function pickFile(file) { if (!file) return; const allowed = ["video/mp4", "video/quicktime", "video/webm"]; if (!allowed.includes(file.type)) { setUploadError("Only MP4, MOV, or WebM files are accepted."); return; } if (file.size > 500 * 1024 * 1024) { setUploadError("File exceeds 500 MB limit."); return; } setVideoFile(file); setUploadState("idle"); setUploadResult(null); setUploadError(null); setUploadPct(0); }
  function clearFile() { setVideoFile(null); setUploadState("idle"); setUploadResult(null); setUploadError(null); setUploadPct(0); }
  async function uploadToR2() {
  if (!videoFile) return;
  setUploadState("uploading"); setUploadError(null); setUploadPct(0);
track("upload_started");

  let token;
try {
  token = await getSessionToken();
} catch (err) {
  setUploadError("Session expired. Please sign in again and retry.");
  setUploadState("error");
  return;
}
const authHeader = { "Authorization": "Bearer " + token, "Content-Type": "application/json" };

  // Step 1: get presigned URL from server
  let uploadUrl, videoPublicUrl;
  try {
    const res = await fetch("/api/get-upload-url", {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({ fileType: videoFile.type }),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error || "Could not get upload URL."); }
    const json = await res.json();
    uploadUrl = json.uploadUrl;
    videoPublicUrl = json.videoPublicUrl;
  } catch (err) { setUploadError(err.message); setUploadState("error"); return; }

  // Step 2: upload directly to R2 via presigned URL (no Vercel size limit)
  try {
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", videoFile.type);
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100));
      });
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error("R2 upload failed with status " + xhr.status));
      });
      xhr.addEventListener("error", () => reject(new Error("Network error during upload.")));
      xhr.send(videoFile);
    });
  } catch (err) { setUploadError(err.message); setUploadState("error"); return; }

  setUploadPct(100);
  setUploadState("processing");

  // Step 3: send to Mux for processing
  try {
    const res = await fetch("/api/process-video", {
  method: "POST",
  headers: authHeader,
  body: JSON.stringify({ videoPublicUrl, creationId: "pending" }),
});
    const result = await res.json();
    
setUploadResult(result); setUploadState("done");
track("upload_completed");
  } catch (err) { setUploadError(err.message); setUploadState("error"); }
}
  async function handleSubmit() {
    if (!form.title.trim() || !form.prompt.trim()) { notify("Please fill in Title and Prompt."); return; }
    if ((videoFile || prefill?.videoUrl) && uploadState !== "done") { notify("Please wait for your video to finish uploading."); return; }
    const license = normalizeContactUrl(form.licenseUrl);
    if (!license.ok) { notify(license.error); return; }
const linkRaw = form.youtubeUrl.trim();
    const ytId = linkRaw ? parseYouTubeId(linkRaw) : null;
    const vimeo = !ytId && linkRaw ? parseVimeoUrl(linkRaw) : null;
    if (linkRaw && !ytId && !vimeo) { notify("That doesn't look like a YouTube or Vimeo link."); return; }
    if (!ytId && !vimeo && !videoFile && !prefill?.videoUrl) { notify("Upload a film or link one from YouTube or Vimeo."); return; }
    setSubmitting(true);
    const autoApprove = profile?.auto_approve === true;
    const toolList = form.tools.split(",").map((t) => t.trim()).filter(Boolean);
    const fallbackThumb = "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&q=90";

    // If user spent time filling the form, Mux may already be done — check before inserting
    let resolvedUpload = uploadResult;
    if (uploadResult?.mux_asset_id) {
      try {
        const token = await getSessionToken();
        const statusRes = await fetch("/api/mux-status", {
          method: "POST",
          headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify({ mux_asset_id: uploadResult.mux_asset_id }),
        });
        if (statusRes.ok) {
          const status = await statusRes.json();
          if (status.ready) {
            resolvedUpload = { ...uploadResult, thumbnail_image: status.thumbnail_image, preview_video: status.preview_video, mux_playback_id: status.mux_playback_id };
          }
        }
      } catch { /* non-critical, proceed with placeholder */ }
    }

    const newCreation = { id: "u" + Date.now(), title: form.title.trim(), creator: { username: profile?.username ?? user?.email?.split("@")[0] ?? "you", display_name: profile?.display_name ?? user?.email?.split("@")[0] ?? "You", avatar_url: profile?.avatar_url ?? "" }, hero_image: resolvedUpload?.thumbnail_image || fallbackThumb, thumbnail_image: resolvedUpload?.thumbnail_image || fallbackThumb, video_url: resolvedUpload?.video_url || "", preview_video: resolvedUpload?.preview_video || "", tools_used: toolList.length > 0 ? toolList : ["Unknown"], category: form.category, is_premium: form.isPremium, premium_status: form.isPremium ? (autoApprove ? "Approved" : "Pending") : null, prompt_preview: form.isPremium ? form.prompt.trim().slice(0, 120) + "..." : null, prompt_full: form.prompt.trim(), spotlight: false, mux_asset_id: resolvedUpload?.mux_asset_id || null, mux_playback_id: resolvedUpload?.mux_playback_id || null, license_url: license.url, user_id: user?.id ?? null, project_id: projectId || null };
    if (ytId) {
      newCreation.youtube_id = ytId;
      newCreation.hero_image = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
      newCreation.thumbnail_image = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
      newCreation.video_url = "";
      newCreation.preview_video = "";
      newCreation.is_premium = false;
      newCreation.premium_status = "Pending";
    }
    if (vimeo) {
      const thumb = await fetchVimeoThumb(vimeo.id, vimeo.hash);
      newCreation.vimeo_id = vimeo.id;
      newCreation.vimeo_hash = vimeo.hash;
      newCreation.hero_image = thumb || newCreation.hero_image;
      newCreation.thumbnail_image = thumb || newCreation.thumbnail_image;
      newCreation.video_url = "";
      newCreation.preview_video = "";
      newCreation.is_premium = false;
      newCreation.premium_status = "Pending";
    }

    
setCreations((prev) => [newCreation, ...prev]);
const { data: saved, error } = await insertCreation(newCreation, user, profile);
    if (error) { console.error("[RevaultAI] Supabase insert failed:", error.message); notify("Saved locally -- could not reach the database."); }
    else if (saved) { setCreations((prev) => prev.map((c) => (c.id === newCreation.id ? saved : c))); }
    setSubmitting(false); setPage("explore");
    track("creation_submitted", { title: newCreation.title, category: newCreation.category, is_premium: newCreation.is_premium });
    if (!error) notify(form.isPremium && !autoApprove ? "Submitted for review." : "Creation is now live on RevaultAI.");

    // Notify admin of every new submission (premium = awaiting review, open = already live)
    if (!error) {
      try {
        const token = await getSessionToken();
        await fetch("/api/notify-submission", {
          method: "POST",
          headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify({ title: newCreation.title, creatorName: newCreation.creator.display_name, category: newCreation.category, isPremium: form.isPremium && !autoApprove }),
        });
      } catch (err) {
        console.warn("[RevaultAI] Submission notification failed:", err.message);
      }
    }

    // Re-fetch after Mux finishes processing to replace placeholder thumbnail
    if (uploadResult?.mux_asset_id) {
      const refresh = async () => {
        const { data } = await fetchCreations();
        if (data) { setCreations(data); }
      };
      const t1 = setTimeout(refresh, 45000);
      const t2 = setTimeout(refresh, 90000);
      // Best-effort cleanup if component unmounts; timeouts are fire-and-forget otherwise
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }
  return (
    <div className="page">
      <div className="page-hdr"><div className="page-hdr-eyebrow">Publish</div><div className="page-hdr-title">Submit Creation</div><div className="page-hdr-sub">Share your AI-native work with the community.</div></div>
      <section className="section">
        <div style={{ maxWidth: 640 }}>
          <div className="form-group"><label className="form-label">Title *</label><input className="form-input" placeholder="Name your creation" value={form.title} onChange={(e) => updateField("title", e.target.value)} /></div>
          <div className="form-group">
            <label className="form-label">Film / Video</label>
            {prefill?.videoUrl ? (
              <div className="upload-file-info">
                <span className="upload-file-name">Your generated video</span>
                {uploadState === "processing" && <span className="upload-file-size">Preparing...</span>}
                {uploadState === "done" && <span className="upload-file-size">&#10003; Attached</span>}
                {uploadState === "error" && <span className="upload-file-size">{uploadError}</span>}
              </div>
            ) : !videoFile ? (
              <div className={"upload-drop" + (dragover ? " dragover" : "")} onDragOver={(e) => { e.preventDefault(); setDragover(true); }} onDragLeave={() => setDragover(false)} onDrop={(e) => { e.preventDefault(); setDragover(false); pickFile(e.dataTransfer.files[0]); }}>
                <input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(e) => pickFile(e.target.files[0])} />
                <div className="upload-drop-icon">&#9654;</div><div className="upload-drop-label">Drop your film here or click to browse</div><div className="upload-drop-hint">MP4, MOV, WebM &middot; max 500 MB</div>
              </div>
            ) : (
              <><div className="upload-file-info"><span className="upload-file-name">{videoFile.name}</span><span className="upload-file-size">{formatBytes(videoFile.size)}</span>{uploadState !== "uploading" && <button className="upload-file-clear" onClick={clearFile}>&#10005;</button>}</div>
              {uploadState === "idle" && <button className="btn-primary" style={{ marginTop: 12, padding: "10px 24px", fontSize: 11 }} onClick={uploadToR2}>Upload to Vault</button>}
              {uploadState === "uploading" && <div className="upload-progress-wrap"><div className="upload-progress-bar-bg"><div className="upload-progress-bar" style={{ width: uploadPct + "%" }} /></div><div className="upload-progress-label"><span>Uploading...</span><span>{uploadPct}%</span></div></div>}
{uploadState === "processing" && <div className="upload-progress-wrap"><div className="upload-progress-bar-bg"><div className="upload-progress-bar" style={{ width: "100%", opacity: 0.6, animation: "pulse 1.5s ease-in-out infinite" }} /></div><div className="upload-progress-label"><span>Submitting to vault...</span><span>Almost done</span></div></div>}
{uploadState === "done" && <div className="upload-success">&#10003;&nbsp; Upload complete</div>}
              {uploadState === "error" && <><div className="upload-error">{uploadError}</div><button className="btn-primary" style={{ marginTop: 10, padding: "9px 20px", fontSize: 11 }} onClick={uploadToR2}>Retry Upload</button></>}</>
            )}
          </div>
          <div className="form-group">
          <label className="form-label">Or link a YouTube or Vimeo film</label>
          <input className="form-input" type="text" inputMode="url" placeholder="https://youtube.com/watch?v=...  or  https://vimeo.com/123456789" value={form.youtubeUrl} onChange={(e) => updateField("youtubeUrl", e.target.value)} maxLength={200} disabled={!!videoFile || !!prefill?.videoUrl} />
            <div className="form-hint">Already have the film on your own channel? Link it instead of uploading. Linked films are reviewed before they appear, stream from YouTube, and can't be offered for sale.</div>
          </div>
          <div className="form-group"><label className="form-label">Tools Used</label><input className="form-input" placeholder="Sora, Runway, MidJourney" value={form.tools} onChange={(e) => updateField("tools", e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Category</label><select className="form-select" value={form.category} onChange={(e) => updateField("category", e.target.value)}>{CATEGORIES.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
          <div className="form-group">
            <label className="form-label">Production Note *</label>
            <textarea className="form-textarea" placeholder="How was this made? Prompts, tools, models, camera and lighting choices, editing, sound — whatever you'd want another filmmaker to know." value={form.prompt} onChange={(e) => updateField("prompt", e.target.value)} />
            <div className="form-hint">This is published with your film. It doesn't have to be a single prompt — for a multi-shot film, a description of your process, workflow or key decisions works just as well. Write as much or as little as the work deserves.</div>
          </div>
          <div className="form-group"><div className="toggle-row"><div className={"toggle" + (form.isPremium ? " on" : "")} onClick={() => updateField("isPremium", !form.isPremium)}><div className="toggle-knob" /></div><div><div className="toggle-label">Offer as a Premium Film</div><div className="toggle-sub">{form.isPremium ? "Viewers can buy a full-quality download. The film still streams free and your production note stays public. Requires review." : "Free to watch and download-free. Your production note is public either way."}</div></div>         </div></div>
          <div className="form-group">
            <label className="form-label">License This Link</label>
            <input className="form-input" type="text" inputMode="url" placeholder="https://yoursite.com/licensing  or  you@email.com" value={form.licenseUrl} onChange={(e) => updateField("licenseUrl", e.target.value)} maxLength={500} />
            <div className="form-hint">Optional. Where people can ask to license this piece: a licensing page or your email. Shown as a button on this creation's page. Web links must start with https://.</div>
          </div>
          {projects.length > 0 && (
            <div className="form-group">
              <label className="form-label">Project (optional)</label>
              <select className="form-input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">No project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", lineHeight: 1.7, marginTop: 6 }}>
                Filing the film under a project scopes its production receipt to that work, rather than everything you've generated.
              </div>
            </div>
          )}
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting || uploadState === "uploading" || uploadState === "processing"} style={{ opacity: (submitting || uploadState === "uploading") ? 0.6 : 1 }}>{submitting ? "Submitting..." : "Submit Creation"}</button>
        </div>
      </section>
    </div>
  );
}
