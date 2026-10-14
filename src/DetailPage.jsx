import { useState, useEffect } from "react";
import Badge from "./Badge.jsx";
import Comments from "./Comments.jsx";
import FilmReceipt from "./FilmReceipt.jsx";
import MuxPlayer from "@mux/mux-player-react";
import { isAdmin } from "./lib/admin.js";
import { track } from "./lib/analytics.js";
import { updateCommentsEnabled } from "./lib/comments.js";
import { createCheckoutSession, fetchCreationById } from "./lib/db.js";
import { normalizeContactUrl } from "./lib/links.js";
import { fetchProfile, upsertProfile } from "./lib/profiles.js";
import { getSessionToken } from "./lib/session.js";
import { youtubeThumb } from "./lib/videoLinks.js";

/*
  DetailPage — RevaultAI
  Extracted from App.jsx.
*/

export default function DetailPage({ id, creations, setCreations, user, profile, setProfile, purchasedIds, purchasesLoaded, setPage, setCreatorUser, dbLoaded, onSignInClick, notify }) {
  // A film opened from a link can't rely on the full catalog having loaded
  // first — if it isn't in the list, fetch it directly.
  const listed = creations.find((c) => c.id === id);
  const [fetchedCreation, setFetchedCreation] = useState(null);
  const [lookupDone, setLookupDone] = useState(!!listed);
  useEffect(() => {
    if (listed || !id) return;
    let canceled = false;
    fetchCreationById(id).then(({ data }) => { if (canceled) return; if (data) setFetchedCreation(data); setLookupDone(true); });
    return () => { canceled = true; };
  }, [id, listed]);
  const creation = listed ?? fetchedCreation;
  const [checkingOut, setCheckingOut] = useState(false);
  const [toolMap, setToolMap] = useState({});
  const [deleting, setDeleting] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState(null);

  // Fetch a signed, entitlement-checked playback URL for the film
  const unlockedForPlayback = creation && (!creation.is_premium || purchasedIds.has(creation.id));
  useEffect(() => {
    setPlaybackUrl(null);
    if (!creation?.id || !creation.video_url || !unlockedForPlayback) return;
    let canceled = false;
    (async () => {
      try {
        const token = await getSessionToken();
        const r = await fetch("/api/get-video-url", {
          method: "POST",
          headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify({ type: "creation", id: creation.id }),
        });
        const j = await r.json().catch(() => ({}));
        if (!canceled && r.ok && j.url) setPlaybackUrl(j.url);
      } catch { /* poster remains as fallback */ }
    })();
    return () => { canceled = true; };
  }, [creation?.id, unlockedForPlayback]);
  
  useEffect(() => {
    const creatorId = creation?.user_id;
    if (!creatorId) { setToolMap({}); return; }
    let canceled = false;
    (async () => {
      const { data } = await fetchProfile(creatorId);
      if (canceled) return;
      const map = {};
      const links = Array.isArray(data?.tool_links) ? data.tool_links : [];
      for (const t of links) {
        if (t && typeof t.url === "string" && /^https:\/\//i.test(t.url) && t.name) {
          map[t.name.trim().toLowerCase()] = t.url;
        }
      }
      setToolMap(map);
    })();
    return () => { canceled = true; };
  }, [creation?.user_id]);
  const [cmBusy, setCmBusy] = useState(false);
  if (!creation) return <div className="page"><div className="empty-state"><div className="empty-text">{dbLoaded && lookupDone ? "Creation not found." : "Loading film..."}</div></div></div>;
  const licenseCheck = creation.license_url ? normalizeContactUrl(creation.license_url) : null;
  const licenseUrl = licenseCheck && licenseCheck.ok ? licenseCheck.url : "";
  const isPending = creation.premium_status === "Pending"; const hasVideo = !!creation.video_url; const posterImg = creation.youtube_id ? youtubeThumb(creation.youtube_id) : (creation.thumbnail_image || creation.hero_image); const purchased = purchasedIds.has(creation.id); const unlocked = !creation.is_premium || purchased;
const purchaseLoading = creation.is_premium && !purchasesLoaded; const priceLabel = creation.price_cents ? "$" + (creation.price_cents / 100).toFixed(2) : "$4.99";
  async function handleBuy() {
  if (!user) { notify("Sign in to purchase."); return; }
  setCheckingOut(true);
  track("purchase_started", { creation_id: creation.id, title: creation.title, price_cents: creation.price_cents });
  try {
    const { url, error } = await createCheckoutSession(creation.id, user.id);
    if (error) {
      notify("Checkout failed: " + error.message + ". Please try again.");
      setCheckingOut(false);
      return;
    }
    window.location.href = url;
  } catch (err) {
    notify("Checkout failed: " + err.message + ". Please try again.");
    setCheckingOut(false);
  }
}
  const canDelete = !!user && (creation.user_id === user.id || isAdmin(user));
  const commentsOn = creation.comments_enabled !== false;
  async function handleToggleComments() {
    setCmBusy(true);
    const { error } = await updateCommentsEnabled(creation.id, !commentsOn);
    setCmBusy(false);
    if (error) { notify("Could not update comments: " + error.message); return; }
    setCreations((prev) => prev.map((c) => c.id === creation.id ? { ...c, comments_enabled: !commentsOn } : c));
    notify(!commentsOn ? "Comments turned on." : "Comments turned off.");
  }
  const canPin = !!user && creation.user_id === user.id;
  const pinnedIds = Array.isArray(profile?.pinned_creation_ids) ? profile.pinned_creation_ids : [];
  const isPinned = pinnedIds.includes(creation.id);
  async function handlePin() {
    if (pinning || !profile) return;
    const already = pinnedIds.includes(creation.id);
    if (!already && pinnedIds.length >= 6) { notify("You can feature up to 6 creations. Unpin one first."); return; }
    const next = already ? pinnedIds.filter((x) => x !== creation.id) : [...pinnedIds, creation.id];
    setPinning(true);
    const { data, error } = await upsertProfile(user, { ...profile, pinned_creation_ids: next });
    setPinning(false);
    if (error) { notify("Could not update Featured Work: " + error.message); return; }
    setProfile(data ?? { ...profile, pinned_creation_ids: next });
    track(already ? "creation_unpinned" : "creation_pinned", { creation_id: creation.id });
    notify(already ? "Removed from Featured Work." : "Pinned to Featured Work.");
  }
  async function handleDelete() {
    if (deleting) return;
    const ok = window.confirm(`Delete "${creation.title}"? This permanently removes the creation and its video files, and can't be undone.`);
    if (!ok) return;
    setDeleting(true);
    try {
      const token = await getSessionToken();
      const res = await fetch("/api/delete-creation", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ creationId: creation.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify(json.error || "Could not delete. Please try again.");
        setDeleting(false);
        return;
      }
      track("creation_deleted", { creation_id: creation.id, title: creation.title });
      setCreations((prev) => prev.filter((c) => c.id !== creation.id));
      notify("Creation deleted.");
      setPage("explore");
    } catch (err) {
      notify("Could not delete: " + err.message);
      setDeleting(false);
    }
  }
  return (
    <div className="page detail-page">
      <div className="detail-cinema"><div className="detail-cinema-inner"><div className="detail-back" onClick={() => setPage("explore")}>&larr; Archive</div>{creation.vimeo_id ? (
  <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "#000" }}>
    <iframe
      src={`https://player.vimeo.com/video/${creation.vimeo_id}${creation.vimeo_hash ? `?h=${creation.vimeo_hash}&` : "?"}title=0&byline=0&portrait=0`}
      title={creation.title}
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
    />
  </div>
) : creation.youtube_id ? (

  <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "#000" }}>
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${creation.youtube_id}?rel=0&modestbranding=1`}
      title={creation.title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
    />
  </div>
) : hasVideo ? (
  creation.mux_playback_id ? (
    <MuxPlayer
      playbackId={creation.mux_playback_id}
      poster={posterImg}
      accentColor="#7c3aed"
      metadata={{ video_id: creation.id, video_title: creation.title }}
      style={{ width: "100%", aspectRatio: "16/9" }}
    />
  ) : creation.is_premium && playbackUrl ? (
    <video src={playbackUrl} poster={posterImg} controls playsInline />
  ) : (
    <img className="detail-still" src={posterImg} alt={creation.title} />
  )
) : <img className="detail-still" src={posterImg} alt={creation.title} />}</div></div>
      <div className="detail-editorial-strip"><div className="detail-editorial-inner">
        <div className="detail-editorial-left"><div className="detail-eyebrow"><div className="detail-eyebrow-line" />{creation.category}</div><h1 className="detail-title">{creation.title}</h1><div className="detail-creator-row"><span className="detail-creator-link" onClick={() => { setCreatorUser(creation.creator.username); setPage("profile"); }}>{creation.creator.display_name}</span><span className="detail-creator-sep">&#183;</span><span className="detail-category-tag">{creation.category}</span></div><div className="detail-tools-row">{creation.tools_used.map((t) => { const href = toolMap[String(t).trim().toLowerCase()]; return href ? <a key={t} href={href} target="_blank" rel="noopener noreferrer nofollow" onClick={() => track("affiliate_link_clicked", { creation_id: creation.id, tool: t })} className="detail-tool-tag detail-tool-tag-video" style={{ textDecoration: "none" }}>{t} &#8599;</a> : <span key={t} className="detail-tool-tag">{t}</span>; })}{hasVideo && <span className="detail-tool-tag detail-tool-tag-video">&#9654; Film</span>}</div>{creation.tools_used.some((t) => toolMap[String(t).trim().toLowerCase()]) && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--muted)", letterSpacing: "0.06em", marginTop: 10, lineHeight: 1.5 }}>Some tool links are affiliate links; the creator may earn a commission.</div>}</div>
        <div className="detail-editorial-right"><div className="detail-badges-row">{creation.is_premium ? <Badge type="Premium" /> : <Badge type="Open" />}{isPending && <Badge type="review" />}</div>{canPin && (<div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}><button type="button" className="btn-ghost" onClick={handleToggleComments} disabled={cmBusy} style={{ fontSize: 11, opacity: cmBusy ? 0.6 : 1 }}>{cmBusy ? "Saving..." : commentsOn ? "Comments: On" : "Comments: Off"}</button></div>)}{canPin && (<div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}><button type="button" className="btn-ghost" onClick={handlePin} disabled={pinning} style={{ fontSize: 11, opacity: pinning ? 0.6 : 1 }}>{pinning ? "Saving..." : isPinned ? "\u2605 Pinned" : "\u2606 Pin to profile"}</button></div>)}{canDelete && (<div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}><button type="button" className="btn-ghost" onClick={handleDelete} disabled={deleting} style={{ fontSize: 11, color: "#C25B5B", opacity: deleting ? 0.6 : 1 }}>{deleting ? "Deleting..." : "Delete creation"}</button></div>)}{licenseUrl && (<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, marginTop: 4 }}><a className="btn-ghost" href={licenseUrl} target={licenseUrl.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer nofollow" onClick={() => track("license_link_clicked", { creation_id: creation.id, title: creation.title })} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>&#9878; License This</a><span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--muted)", letterSpacing: "0.06em", maxWidth: 200, textAlign: "right", lineHeight: 1.5 }}>Arrangements are made directly between you and the creator.</span></div>)}</div>
      </div></div>
      <div className="detail-body"><div className="detail-rule" /><div className="detail-section-label">Production Note<div className="detail-section-label-line" /></div>
        <div className="prompt-box">
          {isPending ? <p className="prompt-text" style={{ color: "var(--muted)", fontStyle: "italic" }}>Under review.</p>
          : <><p className="prompt-text">{creation.prompt_full}</p>
          {creation.is_premium && hasVideo && (
            purchased
              ? <div className="unlock-area"><button className="btn-unlock-restrained" onClick={async () => { try { const token = await getSessionToken(); const r = await fetch("/api/get-video-url", { method: "POST", headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify({ type: "creation", id: creation.id }) }); const j = await r.json().catch(() => ({})); if (!r.ok || !j.url) { notify(j.error || "Could not prepare download."); return; } window.location.href = j.url; } catch (err) { notify("Could not prepare download: " + err.message); } }}>&#11015; Download Film</button></div>
              : purchaseLoading
                ? <div className="unlock-area"><span className="unlock-label" style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em" }}>Checking purchase status...</span></div>
                : <div className="unlock-area"><span className="unlock-label">Own this film &mdash; full-quality download, and you support the creator directly.</span><button className="btn-unlock-restrained" onClick={handleBuy} disabled={checkingOut} style={{ opacity: checkingOut ? 0.6 : 1 }}>
  {checkingOut ? "Opening checkout..." : "Buy Film — " + priceLabel}
</button></div>
          )}</>}
        </div>
        <FilmReceipt creationId={creation.id} projectId={creation.project_id ?? null} isOwner={canPin} notify={notify} />
        <Comments creation={creation} user={user} isOwner={canDelete} setPage={setPage} setCreatorUser={setCreatorUser} notify={notify} onSignInClick={onSignInClick} />
      </div>
    </div>
  );
}
