import { useState, useEffect } from "react";
import CreationCard from "./CreationCard.jsx";
import CreatorAvatar from "./CreatorAvatar.jsx";
import { track } from "./lib/analytics.js";
import { fetchCreationsByUser } from "./lib/db.js";
import { SOCIAL_ICONS, SOCIAL_PLATFORMS, normalizeContactUrl, normalizeTipUrl } from "./lib/links.js";
import { fetchCreatorStats, fetchFollowerCount, fetchIsFollowing, fetchProfileByUsername, followCreator, unfollowCreator } from "./lib/profiles.js";
import { getSessionToken } from "./lib/session.js";

/*
  ProfilePage — RevaultAI
  Extracted from App.jsx.
*/

export default function ProfilePage({ username, creations: allCreations, setPage, setDetailId, user }) {
  const [profileData, setProfileData] = useState(null);
  const [profileCreations, setProfileCreations] = useState([]);
  const [stats, setStats] = useState(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    async function load() {
      const { data: prof } = await fetchProfileByUsername(username);
      if (prof) {
        setProfileData(prof);
        const { data: creatns } = await fetchCreationsByUser(prof.id);
        setProfileCreations(creatns ?? []);
        const { data: s } = await fetchCreatorStats(prof.id);
        setStats(s);
        const { count } = await fetchFollowerCount(prof.id);
        setFollowerCount(count);
        if (user?.id) {
          const { isFollowing: following } = await fetchIsFollowing(user.id, prof.id);
          setIsFollowing(following);
        }
      } else {
  setProfileData(null);
}
      setLoading(false);
    }
    load();
  }, [username, user?.id]);

  async function handleFollow() {
  if (!user) return;
  setFollowLoading(true);
  if (isFollowing) {
    const { error } = await unfollowCreator(user.id, profileData.id);
    track("creator_unfollowed", { creator_id: profileData.id, creator_username: profileData.username });
    if (error) { setFollowLoading(false); return; }
    setIsFollowing(false);
    setFollowerCount((n) => Math.max(0, n - 1));
  } else {
    const { error } = await followCreator(user.id, profileData.id);
    track("creator_followed", { creator_id: profileData.id, creator_username: profileData.username });
    if (error) { setFollowLoading(false); return; }
    setIsFollowing(true);
    setFollowerCount((n) => n + 1);
    // Best-effort: email the creator that they have a new follower (non-blocking)
    try {
      const token = await getSessionToken();
      await fetch("/api/notify-follow", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ creatorUserId: profileData.id }),
      });
    } catch (err) {
      console.warn("[RevaultAI] Follow notification failed:", err.message);
    }
  }
  setFollowLoading(false);
}

  if (loading) return <div className="page"><div className="empty-state"><div className="empty-text">Loading profile...</div></div></div>;
  if (!profileData) return <div className="page"><div className="empty-state"><div className="empty-text">Creator not found.</div></div></div>;

  const isOwnProfile = !!user && user.id === profileData.id;
  const filtered = profileCreations.filter((c) => {
    if ((c.premium_status === "Pending" || c.premium_status === "Rejected") && !isOwnProfile) return false;
    if (filter === "Premium") return c.is_premium;
    if (filter === "Open") return !c.is_premium;
    return true;
  });

  const pinnedIds = Array.isArray(profileData.pinned_creation_ids) ? profileData.pinned_creation_ids : [];
  const visibleById = {};
  for (const c of profileCreations) {
    if (c.premium_status !== "Pending") visibleById[c.id] = c;
  }
  const pinnedCreations = pinnedIds.map((pid) => visibleById[pid]).filter(Boolean);
  const pinnedSet = new Set(pinnedCreations.map((c) => c.id));
  const gridCreations = filtered.filter((c) => !pinnedSet.has(c.id));

  const tipCheck = profileData.tip_url ? normalizeTipUrl(profileData.tip_url) : null;
  const tipUrl = tipCheck && tipCheck.ok ? tipCheck.url : "";
  const hireCheck = profileData.hire_url ? normalizeContactUrl(profileData.hire_url) : null;
  const hireUrl = hireCheck && hireCheck.ok ? hireCheck.url : "";
  const tools = Array.isArray(profileData.tool_links)
    ? profileData.tool_links.filter((t) => t && typeof t.url === "string" && /^https:\/\//i.test(t.url) && t.name)
    : [];

  const socialLinksObj = (profileData.social_links && typeof profileData.social_links === "object") ? profileData.social_links : {};
  const socials = SOCIAL_PLATFORMS
    .map((p) => ({ key: p.key, label: p.label, url: socialLinksObj[p.key], Icon: SOCIAL_ICONS[p.key] }))
    .filter((p) => typeof p.url === "string" && /^https:\/\//i.test(p.url) && p.Icon);

  function goDetail(id) { setDetailId(id); setPage("detail"); }

  return (
    <div className="page">
      <div className="back-btn" onClick={() => setPage("creators")}>&larr; Creators</div>
      <div className="profile-header">
        <CreatorAvatar src={profileData.avatar_url} name={profileData.display_name} size={96} className="profile-avatar" />
        <div style={{ flex: 1 }}>
          <div className="profile-name" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {profileData.display_name || profileData.username}
            {profileData.founding_creator && (
              <span style={{ display: "inline-flex", alignItems: "center", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: 999, padding: "4px 11px", whiteSpace: "nowrap", lineHeight: 1 }}>Founding Creator</span>
            )}
          </div>
          <div className="profile-handle">@{profileData.username}</div>
          {profileData.bio && <div className="profile-bio">{profileData.bio}</div>}
          {socials.length > 0 && (
            <div className="profile-socials" style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14 }}>
              {socials.map(({ key, label, url, Icon }) => (
                <a key={key} href={url} target="_blank" rel="noopener noreferrer nofollow" title={label} aria-label={label} onClick={() => track("social_link_clicked", { creator_id: profileData.id, platform: key })} style={{ color: "var(--muted)", display: "inline-flex", alignItems: "center", fontSize: 20, textDecoration: "none" }} onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted)"; }}>
                  <Icon />
                </a>
              ))}
            </div>
          )}
          {stats && (
            <div style={{ display: "flex", gap: 24, marginTop: 16, flexWrap: "wrap" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{stats.total}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", color: "var(--muted)", textTransform: "uppercase", marginTop: 2 }}>Creations</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--premium)" }}>{stats.premium}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", color: "var(--muted)", textTransform: "uppercase", marginTop: 2 }}>Premium</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{stats.open}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", color: "var(--muted)", textTransform: "uppercase", marginTop: 2 }}>Open</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>{followerCount}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", color: "var(--muted)", textTransform: "uppercase", marginTop: 2 }}>Followers</div>
              </div>
            </div>
          )}
          <div className="profile-actions">
            {user && user.id === profileData.id && (
              <button className="btn-ghost" onClick={() => setPage("settings")}>Edit Profile</button>
            )}
            {user && user.id !== profileData.id && (
              <button
                className={"btn-follow " + (isFollowing ? "followed" : "unfollowed")}
                onClick={handleFollow}
                disabled={followLoading}
                style={{ opacity: followLoading ? 0.6 : 1 }}
              >
                {followLoading ? "..." : isFollowing ? "\u2713 Following" : "+ Follow"}
              </button>
            )}
            {tipUrl && (
              <a
                className="btn-ghost"
                href={tipUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                onClick={() => track("tip_link_clicked", { creator_id: profileData.id, creator_username: profileData.username })}
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                &#9829; Support
              </a>
            )}
            {hireUrl && (
              <a
                className="btn-ghost"
                href={hireUrl}
                target={hireUrl.startsWith("mailto:") ? undefined : "_blank"}
                rel="noopener noreferrer nofollow"
                onClick={() => track("hire_link_clicked", { creator_id: profileData.id, creator_username: profileData.username })}
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                &#9993; Hire Me
              </a>
            )}
          </div>
          {hireUrl && (
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--muted)", letterSpacing: "0.06em", marginTop: 10, lineHeight: 1.5, maxWidth: 360 }}>
              Arrangements are made directly between you and the creator.
            </div>
          )}
          {tools.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 }}>Tools I Use</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {tools.map((t, i) => (
                  <a key={i} href={t.url} target="_blank" rel="noopener noreferrer nofollow" onClick={() => track("affiliate_link_clicked", { creator_username: profileData.username, tool: t.name })} className="detail-tool-tag detail-tool-tag-video" style={{ textDecoration: "none" }}>{t.name} &#8599;</a>
                ))}
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--muted)", letterSpacing: "0.06em", marginTop: 10, lineHeight: 1.5, maxWidth: 360 }}>Some links are affiliate links; the creator may earn a commission.</div>
            </div>
          )}
        </div>
      </div>
      {pinnedCreations.length > 0 && (
        <section className="section" style={{ paddingBottom: 0 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 16 }}>Featured Work</div>
          <div className="creation-grid">{pinnedCreations.map((c) => <CreationCard key={c.id} creation={c} onClick={goDetail} />)}</div>
        </section>
      )}
      <section className="section">
                {isOwnProfile && profileCreations.some((c) => c.premium_status === "Pending") && (
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.7, marginBottom: 20, padding: "12px 16px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 4 }}>
            Films marked Under Review are only visible to you until they're approved — usually within a day.
          </div>
        )}
        <div className="filter-bar">
          {["All", "Premium", "Open"].map((f) => (
            <button key={f} className={"filter-btn" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
        {gridCreations.length > 0 ? (
          <div className="creation-grid">{gridCreations.map((c) => <CreationCard key={c.id} creation={c} onClick={goDetail} />)}</div>
        ) : pinnedCreations.length === 0 ? (
          <div className="empty-state"><div className="empty-text">No creations yet.</div></div>
        ) : null}
      </section>
    </div>
  );
}
