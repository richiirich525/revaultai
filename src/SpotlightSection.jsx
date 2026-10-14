import { youtubeThumb } from "./lib/videoLinks.js";
/*
  SpotlightSection — RevaultAI
  The three films currently in the spotlight.
*/

export default function SpotlightSection({ creations, onView }) {
  const items = creations.filter((c) => c.spotlight && c.premium_status !== "Pending" && c._fromDb);
  if (items.length === 0) return null;
  return (
    <div className="spotlight-section-wrap">
      <div className="spotlight-section-header"><div className="section-label">Spotlight</div><div className="section-sublabel">Handpicked creations from exceptional artists.</div></div>
      <div className="spotlight-grid">
        {items.map((item) => (
          <div key={item.id} className="spotlight-card" onClick={() => onView(item.id)}>
            <img src={item.youtube_id ? youtubeThumb(item.youtube_id) : item.hero_image} alt={item.title} />
            <div className="spotlight-overlay" />
            <div className="spotlight-info"><div className="spotlight-cat">{item.category}</div><div className="spotlight-title">{item.title}</div><div className="spotlight-creator">by {item.creator.display_name}</div></div>
          </div>
        ))}
      </div>
      <span className="spotlight-section-viewall" onClick={() => onView(items[0]?.id)}>View All &rarr;</span>
    </div>
  );
}
