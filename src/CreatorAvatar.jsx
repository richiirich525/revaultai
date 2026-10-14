import { useState } from "react";
import { avatarInitial } from "./lib/avatar.js";

/*
  CreatorAvatar — RevaultAI
  A creator's avatar, falling back to their initial when there's no image.
*/

export default function CreatorAvatar({ src, name, email, size = 64, className = "" }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size, borderRadius: "50%", flexShrink: 0, objectFit: "cover" };
  if (src && !failed) return <img src={src} alt={name ?? "avatar"} className={className} style={style} onError={() => setFailed(true)} />;
  return <div className={className || "avatar-fallback"} style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent-dim)", border: "2px solid var(--border)", fontFamily: "'Syne', sans-serif", fontSize: size * 0.36, fontWeight: 700, color: "var(--accent)" }}>{avatarInitial(name, email)}</div>;
}
