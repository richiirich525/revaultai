import { useEffect, useState } from "react";
import { fetchFollowingFeed } from "./lib/db.js";
import { fetchCreators } from "./lib/profiles.js";
import CreationCard from "./CreationCard.jsx";
import CreatorAvatar from "./CreatorAvatar.jsx";

/*
  FollowFeedPage — RevaultAI
  Films from the creators you follow.
*/

export default function FollowFeedPage({ user, setPage, setDetailId, setCreatorUser }) {
  const [feed, setFeed] = useState([]);
  const [suggested, setSuggested] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let canceled = false;
    setLoading(true);
    (async () => {
      const { data } = await fetchFollowingFeed(user.id);
      if (canceled) return;
      const items = data ?? [];
      setFeed(items);
      if (items.length === 0) {
        const { data: creators } = await fetchCreators();
        if (!canceled) setSuggested((creators ?? []).slice(0, 6));
      }
      setLoading(false);
    })();
    return () => { canceled = true; };
  }, [user?.id]);

  function goDetail(id) { setDetailId(id); setPage("detail"); }

  return (
    <div className="page">
      <div className="page-hdr"><div className="page-hdr-eyebrow">Your Feed</div><div className="page-hdr-title">Following</div><div className="page-hdr-sub">The latest work from creators you follow.</div></div>
      <section className="section">
        {!user ? (
          <div className="empty-state"><div className="empty-text">Sign in to see your feed.</div></div>
        ) : loading ? (
          <div className="empty-state"><div className="empty-text">Loading your feed...</div></div>
        ) : feed.length > 0 ? (
          <div className="creation-grid">{feed.map((c) => <CreationCard key={c.id} creation={c} onClick={goDetail} />)}</div>
        ) : (
          <div>
            <div className="empty-state"><div className="empty-text">Follow creators to build your personalized feed.</div></div>
            {suggested.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 16, textAlign: "center" }}>Suggested Creators</div>
                <div className="creator-grid">
                  {suggested.map((c) => (
                    <div key={c.id} className="creator-card" onClick={() => { setCreatorUser(c.username); setPage("profile"); }}>
                      <CreatorAvatar src={c.avatar_url} name={c.display_name} size={64} className="creator-avatar" />
                      <div className="creator-name">{c.display_name || c.username}</div>
                      <div className="creator-handle">@{c.username}</div>
                      {c.bio ? <div className="creator-bio">{c.bio}</div> : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
