import { useState, useEffect, useRef } from "react";
import BuyCreditsSection from "./BuyCreditsSection.jsx";
import { avatarInitial } from "./lib/avatar.js";
import { SOCIAL_PLATFORMS, normalizeContactUrl, normalizeSocialLinks, normalizeTipUrl, parseToolLinks, socialFormFromProfile, toolLinksToText } from "./lib/links.js";
import { checkUsernameAvailable, uploadAvatar, upsertProfile } from "./lib/profiles.js";
import { getSessionToken } from "./lib/session.js";
import { supabase } from "./lib/supabase.js";

/*
  SettingsPage — RevaultAI
  Extracted from App.jsx.
*/

export default function SettingsPage({ user, profile, setProfile, notify, setPage, setCreatorUser }) {
 const [form, setForm] = useState({
    display_name: profile?.display_name ?? "",
    username:     profile?.username     ?? "",
    bio:          profile?.bio          ?? "",
    avatar_url:   profile?.avatar_url   ?? "",
    tip_url:      profile?.tip_url      ?? "",
    hire_url:     profile?.hire_url     ?? "",
    tool_links_text: toolLinksToText(profile?.tool_links),
    ...socialFormFromProfile(profile),
  });
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [usernameStatus, setUsernameStatus]   = useState(null); // "available" | "taken" | null
  const fileInputRef = useRef(null);
  const [showDelete, setShowDelete]       = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting]           = useState(false);
  const [deleteError, setDeleteError]     = useState(null);

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? "",
        username:     profile.username     ?? "",
        bio:          profile.bio          ?? "",
        avatar_url:   profile.avatar_url   ?? "",
        tip_url:      profile.tip_url      ?? "",
        hire_url:     profile.hire_url     ?? "",
        tool_links_text: toolLinksToText(profile.tool_links),
        ...socialFormFromProfile(profile),
      });
    }
  }, [profile?.id]);

  function updateField(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) { setFormError("Only JPG, PNG, WebP, or GIF images are accepted."); return; }
    if (file.size > 5 * 1024 * 1024) { setFormError("Image must be under 5MB."); return; }
    setAvatarUploading(true); setFormError(null);
    const { url, error } = await uploadAvatar(user.id, file);
    setAvatarUploading(false);
    if (error) { setFormError("Avatar upload failed: " + error.message); return; }
    updateField("avatar_url", url);
    notify("Avatar uploaded. Save your profile to apply.");
  }

  async function handleUsernameBlur() {
    const u = form.username.trim();
    if (!u || u === profile?.username) { setUsernameStatus(null); return; }
    if (!/^[a-z0-9_]{2,32}$/.test(u)) { setUsernameStatus(null); return; }
    const { available } = await checkUsernameAvailable(u, user.id);
    setUsernameStatus(available ? "available" : "taken");
  }

  async function handleSave() {
    if (!form.display_name.trim()) { setFormError("Display name is required."); return; }
    if (!form.username.trim())     { setFormError("Username is required."); return; }
    if (!/^[a-z0-9_]{2,32}$/.test(form.username.trim())) {
      setFormError("Username: 2-32 chars, lowercase, numbers, underscores only.");
      return;
    }
    if (usernameStatus === "taken") { setFormError("That username is already taken."); return; }
    const tip = normalizeTipUrl(form.tip_url);
    if (!tip.ok) { setFormError(tip.error); return; }
    const hire = normalizeContactUrl(form.hire_url);
    if (!hire.ok) { setFormError(hire.error); return; }
    const toolsParsed = parseToolLinks(form.tool_links_text);
    if (!toolsParsed.ok) { setFormError(toolsParsed.error); return; }
    const social = normalizeSocialLinks(form);
    if (!social.ok) { setFormError(social.error); return; }
    setFormError(null); setSaving(true);
    const updated = {
      display_name: form.display_name.trim(),
      username:     form.username.trim(),
      bio:          form.bio.trim(),
      avatar_url:   form.avatar_url.trim(),
      tip_url:      tip.url,
      hire_url:     hire.url,
      tool_links:   toolsParsed.list,
      social_links: social.links,
    };
    const { data, error } = await upsertProfile(user, updated);
    setSaving(false);
    if (error) { setFormError("Save failed: " + error.message); return; }
    setProfile(data ?? ((prev) => ({ ...prev, ...updated })));
    notify("Profile saved.");
  }

  async function handleDeleteAccount() {
    if (deleteConfirm.trim().toUpperCase() !== "DELETE") { setDeleteError("Type DELETE to confirm."); return; }
    setDeleting(true); setDeleteError(null);
    try {
      const token = await getSessionToken();
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setDeleteError(j.error || "Could not delete your account. Please try again.");
        setDeleting(false);
        return;
      }
      // Account is gone — clear the local session and send them home.
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err) {
      setDeleteError(err.message || "Something went wrong. Please try again.");
      setDeleting(false);
    }
  }

  const avatarPreview = form.avatar_url.trim();
  const initials = avatarInitial(form.display_name, user?.email);

  return (
    <div className="page">
      <div className="settings-layout">
        <aside className="settings-sidebar">
          <div className="settings-sidebar-title">Settings</div>
          <button className="settings-nav-item active">Creator Profile</button>
        </aside>
        <div className="settings-main">
          <BuyCreditsSection user={user} profile={profile} notify={notify} />
          <div className="settings-section-title">Creator Profile</div>
          <div className="settings-section-sub">Your public identity on RevaultAI.</div>
          {profile?.username && (
            <button className="btn-ghost" style={{ marginBottom: 28, padding: "9px 20px", fontSize: 11 }} onClick={() => { setCreatorUser(profile.username); setPage("profile"); }}>
              View my public profile →
            </button>
          )}

          {/* Avatar */}
          <div className="settings-avatar-row">
            <div className="settings-avatar-preview" onClick={() => fileInputRef.current?.click()} style={{ cursor: "pointer" }} title="Click to upload avatar">
              {avatarUploading
                ? <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>...</div>
                : avatarPreview
                  ? <img src={avatarPreview} alt="avatar preview" onError={(e) => { e.target.style.display = "none"; }} />
                  : initials
              }
            </div>
            <div className="settings-avatar-info">
              <div className="settings-avatar-label">Avatar</div>
              <div className="settings-avatar-hint">Click your avatar to upload a new image. JPG, PNG, WebP or GIF under 5MB.</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: "none" }}
                onChange={handleAvatarChange}
              />
              <button
                className="btn-ghost"
                style={{ marginTop: 10, padding: "7px 16px", fontSize: 10 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
              >
                {avatarUploading ? "Uploading..." : "Choose Image"}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Display Name *</label>
            <input className="form-input" type="text" placeholder="Your public name" value={form.display_name} onChange={(e) => updateField("display_name", e.target.value)} maxLength={64} />
            <div className="form-hint">Shown on your creator profile and next to your creations.</div>
          </div>

          <div className="form-group">
            <label className="form-label">Username *</label>
            <input
              className="form-input"
              type="text"
              placeholder="your_username"
              value={form.username}
              onChange={(e) => { updateField("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setUsernameStatus(null); }}
              onBlur={handleUsernameBlur}
              maxLength={32}
              style={{ borderColor: usernameStatus === "taken" ? "#F87171" : usernameStatus === "available" ? "#4ADE80" : undefined }}
            />
            <div className="form-hint" style={{ color: usernameStatus === "taken" ? "#F87171" : usernameStatus === "available" ? "#4ADE80" : undefined }}>
              {usernameStatus === "taken" ? "Username is already taken." : usernameStatus === "available" ? "Username is available." : "2-32 characters. Lowercase letters, numbers, and underscores only."}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea className="form-textarea" placeholder="Tell the RevaultAI community about your creative practice..." value={form.bio} onChange={(e) => updateField("bio", e.target.value)} maxLength={400} style={{ minHeight: 100 }} />
            <div className="form-hint">{form.bio.length}/400 characters.</div>
          </div>

          <div className="form-group">
            <label className="form-label">Support / Tip Link</label>
            <input
              className="form-input"
              type="url"
              inputMode="url"
              placeholder="https://ko-fi.com/yourname"
              value={form.tip_url}
              onChange={(e) => updateField("tip_url", e.target.value)}
              maxLength={500}
            />
            <div className="form-hint">
              Optional. Your own external support page — shown as a button on your public profile. Ko-fi, Buy Me a Coffee, PayPal, Patreon, Venmo, Cash App, Liberapay, GoFundMe, or Stripe. Must start with https://. Leave blank to remove.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Hire Me Link</label>
            <input
              className="form-input"
              type="text"
              inputMode="url"
              placeholder="https://calendly.com/you  or  you@email.com"
              value={form.hire_url}
              onChange={(e) => updateField("hire_url", e.target.value)}
              maxLength={500}
            />
            <div className="form-hint">
              Optional. Where people can reach you for paid work: your booking page, portfolio contact, or an email address. Web links must start with https://. Leave blank to remove.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Affiliate Tool Links</label>
            <textarea
              className="form-textarea"
              placeholder={"Runway | https://runway.com/?ref=you\nMidJourney | https://midjourney.com/?ref=you"}
              value={form.tool_links_text}
              onChange={(e) => updateField("tool_links_text", e.target.value)}
              style={{ minHeight: 110, fontFamily: "'DM Mono', monospace", fontSize: 12 }}
            />
            <div className="form-hint">
              Optional. One per line as: Tool name, a pipe (|), then your https:// affiliate link. Shown on your profile and on your creations. Up to 12 tools. These are disclosed as affiliate links.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Social Links</label>
            <div className="form-hint" style={{ marginBottom: 12 }}>
              Optional. Paste the full https:// link for each. They show as icons on your public profile; leave any blank to hide it.
            </div>
            {SOCIAL_PLATFORMS.map((p) => (
              <input
                key={p.key}
                className="form-input"
                type="url"
                inputMode="url"
                placeholder={p.label + ": " + p.placeholder}
                value={form["social_" + p.key]}
                onChange={(e) => updateField("social_" + p.key, e.target.value)}
                maxLength={500}
                aria-label={p.label}
                style={{ marginBottom: 8 }}
              />
            ))}
          </div>

          <div className="settings-divider" />
          {formError && <div className="settings-save-error" style={{ marginBottom: 16 }}>{formError}</div>}
          <div className="settings-save-row">
            <button className="btn-primary" onClick={handleSave} disabled={saving || avatarUploading || usernameStatus === "taken"} style={{ opacity: (saving || avatarUploading) ? 0.6 : 1 }}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>{user?.email}</span>
          </div>

          <div className="settings-divider" />
          <div className="settings-section-title" style={{ color: "#F87171" }}>Delete Account</div>
          <div className="settings-section-sub">
            Permanently deletes your profile, your creations and their files, your follows, and your purchase history. This can't be undone.
          </div>
          {!showDelete ? (
            <button
              className="btn-ghost"
              style={{ marginTop: 14, borderColor: "#F87171", color: "#F87171" }}
              onClick={() => { setShowDelete(true); setDeleteError(null); setDeleteConfirm(""); }}
            >
              Delete my account
            </button>
          ) : (
            <div style={{ marginTop: 14, maxWidth: 420 }}>
              <div className="form-hint" style={{ marginBottom: 10 }}>
                Type <strong>DELETE</strong> to confirm. This permanently removes your account and everything on it.
              </div>
              <input
                className="form-input"
                type="text"
                placeholder="DELETE"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                style={{ marginBottom: 12 }}
              />
              {deleteError && <div className="settings-save-error" style={{ marginBottom: 12 }}>{deleteError}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn-primary"
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirm.trim().toUpperCase() !== "DELETE"}
                  style={{ background: "#F87171", backgroundImage: "none", borderColor: "#F87171", color: "#fff", opacity: deleting ? 0.6 : 1 }}
                >
                  {deleting ? "Deleting..." : "Permanently delete"}
                </button>
                <button className="btn-ghost" onClick={() => { setShowDelete(false); setDeleteConfirm(""); setDeleteError(null); }} disabled={deleting}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
