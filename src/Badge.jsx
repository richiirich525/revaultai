/*
  Badge — RevaultAI
  The small status pills used on creations and profiles.
*/

export default function Badge({ type }) {
  if (type === "Premium")  return <span className="badge-premium">&#9670; Premium</span>;
  if (type === "Open")     return <span className="badge-open">Open</span>;
  if (type === "Founding") return <span className="badge-founding">Founding</span>;
  if (type === "review")   return <span className="badge-open badge-review">Under Review</span>;
  if (type === "following")return <span className="badge-following">Following</span>;
  return null;
}
