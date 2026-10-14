import { youtubeThumb } from "./lib/videoLinks.js";
import { useRef } from "react";
import Badge from "./Badge.jsx";

/*
  CreationCard — RevaultAI
  One film in a grid: poster, hover preview, title and status.
*/

export default function CreationCard({ creation, onClick }) {
  const isPending = creation.premium_status === "Pending";
  const videoRef = useRef(null); const hasPreview = !!creation.preview_video;
  function handleMouseEnter() {
  if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play().catch(() => {}); }
  const gif = document.querySelector(`[data-id="${creation.id}"] .preview-gif`);
  if (gif) gif.style.opacity = "1";
}
function handleMouseLeave() {
  if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
  const gif = document.querySelector(`[data-id="${creation.id}"] .preview-gif`);
  if (gif) gif.style.opacity = "0";
}
  return (
    <div className="creation-card" data-id={creation.id} onClick={() => onClick(creation.id)} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="creation-thumb">
        <img
          src={creation.youtube_id ? youtubeThumb(creation.youtube_id) : (creation.thumbnail_image || creation.hero_image)}
          alt={creation.title}
          onError={(e) => {
            if (creation.youtube_id && !e.target.dataset.fellBack) {
              e.target.dataset.fellBack = "1";
              e.target.src = youtubeThumb(creation.youtube_id, "hqdefault");
            }
          }}
        />
        {hasPreview && (
  creation.preview_video.includes("image.mux.com") || creation.preview_video.includes("stream.mux.com")
    ? <img src={creation.preview_video} alt="preview" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0, transition: "opacity 0.4s ease", pointerEvents: "none" }} className="preview-gif" />
    : null
)}
        {(hasPreview || !!creation.video_url || !!creation.youtube_id || !!creation.vimeo_id) && <div className="video-indicator">&#9654; Film</div>}
        <div className="creation-badge">{isPending ? <Badge type="review" /> : creation.is_premium ? <Badge type="Premium" /> : <Badge type="Open" />}</div>
        <div className="creation-info"><div className="creation-info-title">{creation.title}</div><div className="creation-info-creator">by {creation.creator.display_name}</div></div>
      </div>
    </div>
  );
}
