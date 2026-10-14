import { youtubeThumb } from "./lib/videoLinks.js";
import { useEffect, useState } from "react";
import { fetchCreators } from "./lib/profiles.js";
import Badge from "./Badge.jsx";
import CreatorAvatar from "./CreatorAvatar.jsx";

/*
  CreatorsPage — RevaultAI
  Every creator with published work.
*/

export default function CreatorsPage({ setPage, setCreatorUser, creations }) {
  const [creators, setCreators] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      const { data, error } = await fetchCreators();
      if (error) console.warn("[RevaultAI] Could not load creators:", error.message);
      setCreators(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const byCreator = {};
  for (const c of creations ?? []) {
    if (c.premium_status === "Pending" || c.premium_status === "Rejected") continue;
    if (!c.user_id) continue;
    (byCreator[c.user_id] = byCreator[c.user_id] || []).push(c);
  }

  function thumbFor(c) {
    if (c.youtube_id) return youtubeThumb(c.youtube_id, "hqdefault");
    return c.thumbnail_image || c.hero_image;
  }

  return (
    <div className="page">
      <div className="page-hdr"><div className="page-hdr-eyebrow">Community</div><div className="page-hdr-title">Creators</div><div className="page-hdr-sub">Meet the people shaping AI-native creative work.</div></div>
      <section className="section">
        {loading ? <div className="empty-state"><div className="empty-text">Loading creators...</div></div> : creators.length === 0 ? <div className="empty-state"><div className="empty-text">No creators yet.</div></div> : (
          <div className="creator-grid">
            {creators.map((c) => {
              const works = (byCreator[c.id] ?? []).slice(0, 3);
              const total = (byCreator[c.id] ?? []).length;
              return (
                <div key={c.id} className="creator-card" onClick={() => { setCreatorUser(c.username); setPage("profile"); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                    <CreatorAvatar src={c.avatar_url} name={c.display_name} size={52} />
                    <div style={{ minWidth: 0 }}>
                      <div className="creator-name" style={{ fontSize: 20, marginBottom: 2 }}>{c.display_name || c.username}</div>
                      <div className="creator-handle" style={{ marginBottom: 0 }}>@{c.username}</div>
                    </div>
                  </div>
                  {c.founding_creator && <div className="creator-badges"><Badge type="Founding" /></div>}
                  {c.bio ? <div className="creator-bio" style={{ marginBottom: 14 }}>{c.bio}</div> : null}
                  {works.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3, marginBottom: 12 }}>
                      {works.map((w) => (
                        <div key={w.id} style={{ aspectRatio: "16/10", overflow: "hidden", borderRadius: 2, background: "var(--bg3)" }}>
                          <img src={thumbFor(w)} alt={w.title} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.85)" }} />
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>
                    {total > 0 ? `${total} creation${total !== 1 ? "s" : ""}` : "No published work yet"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
