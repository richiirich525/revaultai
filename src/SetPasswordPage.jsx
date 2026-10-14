import { useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  SetPasswordPage — RevaultAI
  Setting a new password from a recovery link.
*/

export default function SetPasswordPage({ notify, setPage }) {
  const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  async function handleSubmit(e) { e.preventDefault(); setError(null); if (password !== confirmPassword) { setError("Passwords do not match."); return; } if (password.length < 6) { setError("Minimum 6 characters."); return; } setLoading(true); const { error: err } = await supabase.auth.updateUser({ password }); setLoading(false); if (err) { setError(err.message); return; } notify("Password updated."); setPage("home"); }
  return (
    <div className="page"><div className="page-hdr"><div className="page-hdr-title">Set New Password</div></div><section className="section"><div style={{ maxWidth: 480 }}><form onSubmit={handleSubmit}><div className="form-group"><label className="form-label">New Password</label><input className="form-input" type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoFocus /></div><div className="form-group"><label className="form-label">Confirm Password</label><input className="form-input" type="password" placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} /></div>{error && <div className="auth-error">{error}</div>}<button className="btn-primary" type="submit" disabled={loading}>{loading ? "Updating..." : "Update Password"}</button></form></div></section></div>
  );
}
