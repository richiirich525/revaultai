/*
  EmailConfirmedPage — RevaultAI
  The landing page after a confirmation link.
*/

export default function EmailConfirmedPage({ setPage }) {
  return <div className="page"><div className="empty-state" style={{ paddingTop: 120 }}><div className="empty-text" style={{ color: "var(--text)", fontSize: 18, marginBottom: 12 }}>Email confirmed.</div><div className="empty-text" style={{ marginBottom: 32 }}>Your account is now active.</div><button className="btn-primary" onClick={() => setPage("home")}>Back to Home</button></div></div>;
}
