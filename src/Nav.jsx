import { useState, useEffect } from "react";
import CreateMenuItems from "./CreateMenuItems.jsx";
import { isAdmin } from "./lib/admin.js";
import { avatarInitial } from "./lib/avatar.js";

/*
  Nav — RevaultAI
  Extracted from App.jsx.
*/

export default function Nav({ page, setPage, user, profile, onSignInClick, onSignOut, activeProject, setCreatorUser }) {
  const avatarSrc = profile?.avatar_url ?? null;
  const [createOpen, setCreateOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);

  // Close either menu on any outside click or Escape.
  useEffect(() => {
    if (!createOpen && !acctOpen) return;
    function close() { setCreateOpen(false); setAcctOpen(false); }
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [createOpen, acctOpen]);

  const CREATE_PAGES = ["generate", "prompt-builder", "scene-breakdown", "prompts", "submit"];
  const createActive = CREATE_PAGES.includes(page);

  const menuStyle = {
    position: "fixed", top: 78, right: 16, left: "auto", minWidth: 210,
    maxWidth: "calc(100vw - 32px)",
    // Opaque fallback first — an undefined CSS variable renders transparent.
    background: "#12131A", backgroundColor: "var(--surface, #12131A)",
    border: "1px solid var(--border)", borderRadius: 6,
    padding: 6, zIndex: 200, boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
    maxHeight: "min(70vh, 520px)", overflowY: "auto", overscrollBehavior: "contain",
    WebkitOverflowScrolling: "touch",
  };
  const itemStyle = (on) => ({
    display: "block", width: "100%", textAlign: "left", background: "none", border: "none",
    padding: "10px 14px", borderRadius: 4, cursor: "pointer",
    fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.1em",
    textTransform: "uppercase", color: on ? "var(--accent)" : "var(--muted)",
  });

  function go(p) { setPage(p); setCreateOpen(false); setAcctOpen(false); }

  return (
    <nav className="nav">
      <div className="nav-logo" onClick={() => setPage("home")}>
        <img src="/revaultai-logo-transparent.png" alt="RevaultAI" style={{ height: "64px", width: "auto", display: "block" }} />
      </div>
      <div className="nav-center">
        <div className={"nav-link" + (page === "home" ? " active" : "")} onClick={() => setPage("home")}>Home</div>
        <div className={"nav-link" + (page === "explore" ? " active" : "")} onClick={() => setPage("explore")}>Explore</div>
        <div className={"nav-link" + (page === "creators" ? " active" : "")} onClick={() => setPage("creators")}>Creators</div>
        <div className={"nav-link" + (page === "discovered" ? " active" : "")} onClick={() => setPage("discovered")}>Discovered</div>
        {user && <div className={"nav-link" + (page === "feed" ? " active" : "")} onClick={() => setPage("feed")}>Following</div>}
        <div className={"nav-link" + (page === "submit" ? " active" : "")} onClick={() => setPage("submit")}>Submit</div>

        <div className="nav-menu-wrap" style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
          <div
            className={"nav-link" + (createActive ? " active" : "")}
            onClick={() => { setCreateOpen((o) => !o); setAcctOpen(false); }}
            aria-haspopup="true"
            aria-expanded={createOpen}
          >
            Create {createOpen ? "\u25B4" : "\u25BE"}
          </div>
          {createOpen && (
            <div className="nav-menu" style={menuStyle} role="menu">
              {user && <button style={itemStyle(page === "generate")} onClick={() => go("generate")}>Generate</button>}
              <button style={itemStyle(page === "tools")} onClick={() => go("tools")}>All Tools</button>
              <div style={{ height: 1, background: "var(--border)", margin: "6px 10px" }} />
              <CreateMenuItems page={page} go={go} itemStyle={itemStyle} user={user} hide={["Generate"]} />
          </div>
          )}
        </div>

        {!user && <div className={"nav-link" + (page === "become-creator" ? " active" : "")} onClick={() => setPage("become-creator")}>Join</div>}
      </div>
      <div className="nav-right">
        {user && activeProject && (
          <button
            type="button"
            onClick={() => setPage("projects")}
            title="Active project — click to change"
            style={{ background: "none", border: "1px solid rgba(123,63,228,0.4)", borderRadius: 3, color: "var(--accent)", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", padding: "4px 10px", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {activeProject.name}
          </button>
        )}
        <button
          type="button"
          aria-label="Search"
          title="Search"
          onClick={() => setPage("search")}
          style={{ background: "none", border: "none", color: page === "search" ? "var(--accent)" : "var(--muted)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 4, display: "inline-flex", alignItems: "center" }}
        >
          &#9906;
        </button>
        {user ? (
          <div className="nav-user" style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <div
              className="nav-user-avatar"
              onClick={() => { setAcctOpen((o) => !o); setCreateOpen(false); }}
              title="Account"
              style={{ cursor: "pointer" }}
            >
              {avatarSrc ? <img src={avatarSrc} alt={profile?.display_name ?? "avatar"} onError={(e) => { e.target.style.display = "none"; }} /> : avatarInitial(profile?.display_name, user.email)}
            </div>
            {acctOpen && (
              <div className="nav-menu" style={{ ...menuStyle, left: "auto", right: 0, minWidth: 230 }} role="menu">
                <div style={{ padding: "8px 14px 10px", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", borderBottom: "1px solid var(--border)", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user.email}
                </div>
                <button style={itemStyle(page === "submit")} onClick={() => go("submit")}>Submit a Film</button>
                {profile?.username && (
                  <button style={itemStyle(page === "profile")} onClick={() => { setCreatorUser?.(profile.username); go("profile"); }}>My Profile</button>
                )}
                <button style={itemStyle(page === "settings")} onClick={() => go("settings")}>Settings</button>
                {isAdmin(user) && <button style={itemStyle(page === "admin")} onClick={() => go("admin")}>Admin</button>}
                <button style={itemStyle(false)} onClick={() => { setAcctOpen(false); onSignOut(); }}>Sign Out</button>
              </div>
            )}
          </div>
        ) : (
          <button className="nav-signin" onClick={onSignInClick}>Sign In</button>
        )}
      </div>
    </nav>
  );
}
