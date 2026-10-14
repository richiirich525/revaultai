import { useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  AuthModal — RevaultAI
  Extracted from App.jsx.
*/

export default function AuthModal({ onClose, notify }) {
  const [tab, setTab] = useState("signin");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState(null); const [success, setSuccess] = useState(null);
  const siteUrl = window.location.hostname === "localhost" ? window.location.origin : "https://revaultai.com";
  function reset() { setError(null); setSuccess(null); }
  async function handleSignIn(e) { e.preventDefault(); reset(); setLoading(true); const { error: err } = await supabase.auth.signInWithPassword({ email, password }); setLoading(false); if (err) { setError(err.message); return; } notify("Welcome back to RevaultAI."); onClose(); }
  async function handleSignUp(e) { e.preventDefault(); reset(); setLoading(true); const { error: err } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${siteUrl}/email-confirmed` } }); setLoading(false); if (err) { setError(err.message); return; } setSuccess("Account created. Check your email to confirm."); }
  async function handleForgotPassword(e) { e.preventDefault(); if (!email.trim()) { setError("Please enter your email address."); return; } reset(); setLoading(true); const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl}/set-password` }); setLoading(false); if (err) { setError(err.message); return; } setSuccess("Password reset email sent."); }
  function handleOverlayClick(e) { if (e.target === e.currentTarget) onClose(); }
  return (
    <div className="auth-overlay" onClick={handleOverlayClick}>
      <div className="auth-modal-wrap">
        <div className="auth-modal">
          <button className="auth-close" onClick={onClose}>&#10005;</button>
          <div className="auth-header">
            <div className="auth-logo">REVAULT<span>AI</span></div>
            <div className="auth-tabs">
              <button className={"auth-tab" + (tab === "signin" ? " active" : "")} onClick={() => { setTab("signin"); reset(); }}>Sign In</button>
              <button className={"auth-tab" + (tab === "signup" ? " active" : "")} onClick={() => { setTab("signup"); reset(); }}>Create Account</button>
              <button className={"auth-tab" + (tab === "forgot" ? " active" : "")} onClick={() => { setTab("forgot"); reset(); }}>Reset Password</button>
            </div>
          </div>
          <div className="auth-body">
            {tab === "signin" && (<form onSubmit={handleSignIn}><div className="auth-field"><label className="auth-label">Email</label><input className="auth-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></div><div className="auth-field"><label className="auth-label">Password</label><input className="auth-input" type="password" placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>{error && <div className="auth-error">{error}</div>}{success && <div className="auth-success">{success}</div>}<button className="auth-submit" type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</button><div className="auth-link" onClick={() => { setTab("forgot"); reset(); }}>Forgot password?</div></form>)}
            {tab === "signup" && (<form onSubmit={handleSignUp}><div className="auth-field"><label className="auth-label">Email</label><input className="auth-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></div><div className="auth-field"><label className="auth-label">Password</label><input className="auth-input" type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>{error && <div className="auth-error">{error}</div>}{success && <div className="auth-success">{success}</div>}<button className="auth-submit" type="submit" disabled={loading || !!success}>{loading ? "Creating..." : "Create Account"}</button></form>)}
            {tab === "forgot" && (<form onSubmit={handleForgotPassword}><div className="auth-field"><label className="auth-label">Email</label><input className="auth-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></div>{error && <div className="auth-error">{error}</div>}{success && <div className="auth-success">{success}</div>}<button className="auth-submit" type="submit" disabled={loading || !!success}>{loading ? "Sending..." : "Send Reset Link"}</button><div className="auth-link" onClick={() => { setTab("signin"); reset(); }}>Back to sign in</div></form>)}
          </div>
        </div>
      </div>
    </div>
  );
}
