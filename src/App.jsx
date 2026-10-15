import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase.js";
import { initAnalytics, identifyUser, resetUser } from "./lib/analytics.js";
import { applySEO } from "./lib/seo.js";
import { BlogPage, BlogPostPage } from "./BlogPage.jsx";
import AiVideoGeneratorPage from "./AiVideoGeneratorPage.jsx";
import DiscoveredPage from "./DiscoveredPage.jsx";
import { PromptIndexPage, PromptModelPage, PromptGenrePage } from "./PromptPages.jsx";
import SearchPage from "./SearchPage.jsx";
import SceneBreakdownPage from "./SceneBreakdownPage.jsx";
import WhichModelPage from "./WhichModelPage.jsx";
import VaultPage from "./VaultPage.jsx";
import ContinuityCheckPage from "./ContinuityCheckPage.jsx";
import ShotDirectorPage from "./ShotDirectorPage.jsx";
import CoveragePage from "./CoveragePage.jsx";
import FramePlannerPage from "./FramePlannerPage.jsx";
import BlockingPage from "./BlockingPage.jsx";
import AutopsyPage from "./AutopsyPage.jsx";
import TakesPage from "./TakesPage.jsx";
import RehearsalPage from "./RehearsalPage.jsx";
import { CSS } from "./appCss.js";
import { isAdmin } from "./lib/admin.js";
import AdminPage from "./AdminPage.jsx";
import AuthModal from "./AuthModal.jsx";
import BecomeCreatorPage from "./BecomeCreatorPage.jsx";
import DetailPage from "./DetailPage.jsx";
import ExplorePage from "./ExplorePage.jsx";
import GeneratePage from "./GeneratePage.jsx";
import HomePage from "./HomePage.jsx";
import Nav from "./Nav.jsx";
import ProfilePage from "./ProfilePage.jsx";
import PromptBuilderPage from "./PromptBuilderPage.jsx";
import SettingsPage from "./SettingsPage.jsx";
import SubmitPage from "./SubmitPage.jsx";
import CreatorsPage from "./CreatorsPage.jsx";
import FollowFeedPage from "./FollowFeedPage.jsx";
import AboutPage from "./AboutPage.jsx";
import ContactPage from "./ContactPage.jsx";
import EmailConfirmedPage from "./EmailConfirmedPage.jsx";
import FAQPage from "./FAQPage.jsx";
import GuidelinesPage from "./GuidelinesPage.jsx";
import LegalPage from "./LegalPage.jsx";
import Notification from "./Notification.jsx";
import PremiumFilmsPage from "./PremiumFilmsPage.jsx";
import PurchaseSuccessPage from "./PurchaseSuccessPage.jsx";
import SetPasswordPage from "./SetPasswordPage.jsx";
import LotPage from "./LotPage.jsx";
import PricingPage from "./PricingPage.jsx";
import FinishPage from "./FinishPage.jsx";
import SpecsPage from "./SpecsPage.jsx";
import ProjectsPage from "./ProjectsPage.jsx";
import ToolsPage from "./ToolsPage.jsx";
import { fetchCreations, fetchPurchasedIds } from "./lib/db.js";
import { fetchProfile, upsertProfile, defaultProfile } from "./lib/profiles.js";

import FoundingCreatorsPage from "./FoundingCreatorsPage.jsx";




export default function App() {
  useEffect(() => { initAnalytics(); }, []);
  const [creations, setCreations]   = useState([]);
const [dbLoaded, setDbLoaded]     = useState(false);
const [page, setPageState]        = useState("home");
  const [detailId, setDetailIdState] = useState(null);
  const [genSubmission, setGenSubmission] = useState(null);

  // A generation prefill is single-use: once the user leaves the Submit page,
  // clear it so future visits to Submit start clean
  useEffect(() => {
    if (page !== "submit" && genSubmission) setGenSubmission(null);
  }, [page]);

  /*
    The TAAFT badge is prerendered into the homepage's static HTML, after
    #root, so their crawler can read it without running any JavaScript and so
    hydration does not wipe it. Living outside the React tree means React also
    never unmounts it — left alone it would follow the visitor to every page
    they click through to, which is the one thing TAAFT asked us to avoid. So
    the app that owns the routing is the thing that hides it.
  */
  useEffect(() => {
    const badge = document.getElementById("taaft-badge");
    if (badge) badge.style.display = page === "home" ? "" : "none";
  }, [page]);
  const [creatorUser, setCreatorUserState] = useState(null);

  // ---- URL routing ----
  const detailIdRef = useRef(null);
  const creatorUserRef = useRef(null);
  const KNOWN_PAGES = ["home","explore","creators","feed","generate","settings","admin","submit","set-password","email-confirmed","terms","faq","contact","guidelines","premium-films","about","become-creator","privacy","refunds","dmca","ai-disclaimer","purchase-success","founding-creators","blog","ai-video-generator","prompt-builder","prompts","search","scene-breakdown","which-model","vault","continuity-check","shot-director","coverage","frame-planner","blocking","autopsy","takes","projects","tools","specs","rehearsal","finish","lot","pricing"];

  function setDetailId(id) { detailIdRef.current = id; setDetailIdState(id); }
  const blogSlugRef = useRef(null);
  const [blogSlug, setBlogSlugState] = useState(null);
  function openPost(slug) { blogSlugRef.current = slug; setBlogSlugState(slug); setPage("blog-post"); }
  const promptSlugRef = useRef(null);
  const [promptSlug, setPromptSlugState] = useState(null);
  function openPromptModel(slug) { promptSlugRef.current = slug; setPromptSlugState(slug); setPage("prompt-model"); }
  const promptGenreRef = useRef(null);
  const [promptGenre, setPromptGenreState] = useState(null);
  function openPromptGenre(slug) { promptGenreRef.current = slug; setPromptGenreState(slug); setPage("prompt-genre"); }
  const [genPrefill, setGenPrefill] = useState(null);
  const [ccPrefill, setCcPrefill] = useState(null);
  const [apPrefill, setApPrefill] = useState(null);

  // The active project is context only — nothing requires one, and it persists
  // across sessions so you come back to where you were.
  const [activeProject, setActiveProjectState] = useState(null);
  function setActiveProject(p) {
    setActiveProjectState(p);
    try {
      if (p) localStorage.setItem("revaultai.project", JSON.stringify({ id: p.id, name: p.name }));
      else localStorage.removeItem("revaultai.project");
    } catch { /* private browsing — the selection just won't persist */ }
  }
  
  function setCreatorUser(u) { creatorUserRef.current = u; setCreatorUserState(u); }

  function pathForPage(p) {
    if (p === "home") return "/";
    if (p === "detail") return detailIdRef.current ? "/film/" + detailIdRef.current : "/explore";
    if (p === "profile") return creatorUserRef.current ? "/creator/" + creatorUserRef.current : "/creators";
    if (p === "blog-post") return blogSlugRef.current ? "/blog/" + blogSlugRef.current : "/blog";
    if (p === "prompt-model") return promptSlugRef.current ? "/prompts/" + promptSlugRef.current : "/prompts";
    if (p === "prompt-genre") return promptGenreRef.current ? "/prompts/genre/" + promptGenreRef.current : "/prompts";
    return "/" + p;
  }

  function setPage(p) {
    setPageState(p);
    const path = pathForPage(p);
    if (window.location.pathname !== path) window.history.pushState({ page: p }, "", path);
  }
  const [notifMsg, setNotifMsg]     = useState(null);
  const [user, setUser]             = useState(null);
  const [profile, setProfile]       = useState(null);

  // Restore the saved project once we know who's signed in.
  useEffect(() => {
    if (!user?.id) { setActiveProjectState(null); return; }
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem("revaultai.project") || "null"); } catch { saved = null; }
    if (!saved?.id) return;
    (async () => {
      const { data } = await supabase.from("projects").select("*").eq("id", saved.id).maybeSingle();
      setActiveProjectState(data ?? null);
      if (!data) { try { localStorage.removeItem("revaultai.project"); } catch { /* ignore */ } }
    })();
  }, [user?.id]);
  const [authOpen, setAuthOpen]     = useState(false);
  const [purchasedIds, setPurchasedIds] = useState(new Set());
const [purchasesLoaded, setPurchasesLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { const u = data.session?.user ?? null; setUser(u); if (u) loadOrCreateProfile(u); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
if (session?.user) { identifyUser(session.user.id, session.user.email); } else { resetUser(); }
      if (event === "PASSWORD_RECOVERY") setPage("set-password");
      if (u) { loadOrCreateProfile(u); } else { setProfile(null); setPurchasedIds(new Set()); }
    });
    // Credits change behind the page's back: a purchase completes through
    // Stripe, a generation spends, a tab sits idle while the token refreshes.
    function refresh() {
      if (document.visibilityState !== "visible") return;
      supabase.auth.getSession().then(({ data }) => {
        const u = data.session?.user ?? null;
        if (u) loadOrCreateProfile(u);
      });
    }
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  useEffect(() => { const hash = window.location.hash; if (hash && hash.includes("type=signup")) { setPage("email-confirmed"); window.history.replaceState({}, "", window.location.pathname); } }, []);
  useEffect(() => {
    function applyPath() {
      const path = window.location.pathname;
      if (path === "/") { setPageState("home"); return; }
      if (path.startsWith("/film/")) { const id = decodeURIComponent(path.slice(6)); detailIdRef.current = id; setDetailIdState(id); setPageState("detail"); return; }
      if (path.startsWith("/creator/")) { const u = decodeURIComponent(path.slice(9)); creatorUserRef.current = u; setCreatorUserState(u); setPageState("profile"); return; }
      if (path === "/blog" || path === "/blog/") { setPageState("blog"); return; }
      if (path === "/ai-video-generator" || path === "/ai-video-generator/") { setPageState("ai-video-generator"); return; }
      if (path === "/discovered" || path === "/discovered/") { setPageState("discovered"); return; }
      if (path.startsWith("/blog/")) { const s = decodeURIComponent(path.slice(6)); blogSlugRef.current = s; setBlogSlugState(s); setPageState("blog-post"); return; }
      if (path === "/prompts" || path === "/prompts/") { setPageState("prompts"); return; }
      if (path.startsWith("/prompts/genre/")) { const s = decodeURIComponent(path.slice(15)); promptGenreRef.current = s; setPromptGenreState(s); setPageState("prompt-genre"); return; }
      if (path.startsWith("/prompts/")) { const s = decodeURIComponent(path.slice(9)); promptSlugRef.current = s; setPromptSlugState(s); setPageState("prompt-model"); return; }
      const slug = path.slice(1).replace(/\/$/, "");
      if (KNOWN_PAGES.includes(slug)) setPageState(slug); 
    }
    applyPath();
    window.addEventListener("popstate", applyPath);
    return () => window.removeEventListener("popstate", applyPath);
  }, []);

  async function loadOrCreateProfile(u) {
    const { data, error } = await fetchProfile(u.id);
    if (error) { console.warn("[RevaultAI] Profile fetch error:", error.message); return; }
    if (data) { setProfile(data); }
    else { const def = defaultProfile(u); const { data: created, error: upsertErr } = await upsertProfile(u, def); if (upsertErr) { console.warn("[RevaultAI] Could not create profile:", upsertErr.message); setProfile({ id: u.id, ...def }); } else { setProfile(created); } }
  }

  useEffect(() => {
   async function load() { const { data, error } = await fetchCreations(); if (error) { console.warn("[RevaultAI] Could not load creations:", error.message); setDbLoaded(true); return; } if (data) { setCreations(data); } setDbLoaded(true); }
    load();
  }, []);

  useEffect(() => {
  async function loadPurchases() {
    if (!user?.id) { setPurchasedIds(new Set()); setPurchasesLoaded(true); return; }
    const { data } = await fetchPurchasedIds(user.id);
    if (data) setPurchasedIds(data);
    setPurchasesLoaded(true);
  }
  loadPurchases();
}, [user]);

  useEffect(() => {
  async function handlePurchaseReturn() {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const canceled  = params.get("canceled");

    // Handle cancel return
    if (canceled === "true") {
      window.history.replaceState({}, "", window.location.pathname);
      setNotifMsg("Checkout canceled — no charge was made.");
      return;
    }

    if (!sessionId) return;
    window.history.replaceState({}, "", window.location.pathname);
    setPage("purchase-success");

    try {
      const res = await fetch("/api/verify-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotifMsg("Purchase verification failed: " + (json.error || "Unknown error"));
        setPage("explore");
        return;
      }
      if (json.user_id) {
        const { data: ids } = await fetchPurchasedIds(json.user_id);
        if (ids) setPurchasedIds(ids);
      }
    } catch (err) {
      setNotifMsg("Purchase verification failed. Please contact support.");
      setPage("explore");
    }
  }
  handlePurchaseReturn();
}, []);

  function notify(msg) { setNotifMsg(msg); }
  async function handleSignOut() { await supabase.auth.signOut(); notify("Signed out of RevaultAI."); }
  
  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  useEffect(() => { applySEO({ page, detailId, creatorUser, creations }); }, [page, detailId, creatorUser, creations, blogSlug]);

  function renderPage() {
    switch (page) {
      case "home":    return <HomePage creations={creations} setPage={setPage} setDetailId={setDetailId} user={user} onSignInClick={() => setAuthOpen(true)} />;
      case "explore": return <ExplorePage creations={creations} setPage={setPage} setDetailId={setDetailId} dbLoaded={dbLoaded} />;
      case "creators":return <CreatorsPage setPage={setPage} setCreatorUser={setCreatorUser} creations={creations} />;
      case "feed":    return <FollowFeedPage user={user} setPage={setPage} setDetailId={setDetailId} setCreatorUser={setCreatorUser} />;
      case "generate": return <GeneratePage activeProject={activeProject} setApPrefill={setApPrefill} user={user} profile={profile} notify={notify} setPage={setPage} setGenSubmission={setGenSubmission} setProfile={setProfile} genPrefill={genPrefill} setGenPrefill={setGenPrefill} />;
      case "profile": return <ProfilePage username={creatorUser} creations={creations} setPage={setPage} setDetailId={setDetailId} user={user} />;
      case "detail":  return <DetailPage id={detailId} dbLoaded={dbLoaded} creations={creations} setCreations={setCreations} user={user} profile={profile} setProfile={setProfile} purchasedIds={purchasedIds} purchasesLoaded={purchasesLoaded} setPage={setPage} setCreatorUser={setCreatorUser}onSignInClick={() => setAuthOpen(true)} notify={notify} />;
      case "settings": if (!user) return <div className="page"><div className="empty-state"><div className="empty-text">Sign in to access profile settings.</div></div></div>; return <SettingsPage user={user} profile={profile} setProfile={setProfile} notify={notify} setPage={setPage} setCreatorUser={setCreatorUser} />;
      case "admin": if (!isAdmin(user)) return <div className="page"><div className="empty-state"><div className="empty-text">Not authorized.</div></div></div>; return <AdminPage creations={creations} setCreations={setCreations} notify={notify} />;
            case "submit": return <SubmitPage activeProject={activeProject} setCreations={setCreations} notify={notify} setPage={setPage} user={user} profile={profile} prefill={genSubmission} />;
      case "set-password": return <SetPasswordPage notify={notify} setPage={setPage} />;
      case "email-confirmed": return <EmailConfirmedPage setPage={setPage} />;
      case "terms":     return <LegalPage setPage={setPage} page="terms" />;
      case "faq":       return <FAQPage setPage={setPage} />;
      case "contact":   return <ContactPage setPage={setPage} />;
      case "guidelines": return <GuidelinesPage setPage={setPage} />;
      case "premium-films": return <PremiumFilmsPage setPage={setPage} />;
      case "about": return <AboutPage setPage={setPage} />;
      case "become-creator": return <BecomeCreatorPage setPage={setPage} user={user} onSignInClick={() => setAuthOpen(true)} />;
      case "prompt-builder": return <PromptBuilderPage setGenPrefill={setGenPrefill} activeProject={activeProject} setPage={setPage} user={user} onSignInClick={() => setAuthOpen(true)} />;
      case "privacy":   return <LegalPage setPage={setPage} page="privacy" />;
      case "refunds":   return <LegalPage setPage={setPage} page="refunds" />;
      case "dmca":      return <LegalPage setPage={setPage} page="dmca" />;
      case "ai-disclaimer": return <LegalPage setPage={setPage} page="ai-disclaimer" />;
      case "purchase-success": return <PurchaseSuccessPage setPage={setPage} setDetailId={setDetailId} creations={creations} />;
      case "founding-creators": return <FoundingCreatorsPage />;
      case "discovered": return <DiscoveredPage setPage={setPage} />;
      case "ai-video-generator": return <AiVideoGeneratorPage setPage={setPage} user={user} onSignInClick={() => setAuthOpen(true)} />;
      case "blog": return <BlogPage setPage={setPage} openPost={openPost} />;
      case "blog-post": return <BlogPostPage slug={blogSlug} setPage={setPage} openPost={openPost} />;
      case "tools": return <ToolsPage setPage={setPage} user={user} onSignInClick={() => setAuthOpen(true)} />;
      case "projects": return <ProjectsPage setGenPrefill={setGenPrefill} setApPrefill={setApPrefill} user={user} onSignInClick={() => setAuthOpen(true)} setPage={setPage} notify={notify} activeProject={activeProject} setActiveProject={setActiveProject} />;
      case "finish": return <FinishPage user={user} activeProject={activeProject} setPage={setPage} notify={notify} onSignInClick={() => setAuthOpen(true)} />;
      case "lot": return <LotPage user={user} activeProject={activeProject} setPage={setPage} notify={notify} onSignInClick={() => setAuthOpen(true)} />;
      case "pricing": return <PricingPage user={user} setPage={setPage} notify={notify} onSignInClick={() => setAuthOpen(true)} />;
      case "rehearsal": return <RehearsalPage setGenPrefill={setGenPrefill} setPage={setPage} user={user} activeProject={activeProject} notify={notify} onSignInClick={() => setAuthOpen(true)} />;
      case "specs": return <SpecsPage user={user} onSignInClick={() => setAuthOpen(true)} setPage={setPage} notify={notify} setGenPrefill={setGenPrefill} activeProject={activeProject} />;
      case "takes": return <TakesPage setGenPrefill={setGenPrefill} activeProject={activeProject} user={user} onSignInClick={() => setAuthOpen(true)} setPage={setPage} notify={notify} />;
      case "autopsy": return <AutopsyPage setPage={setPage} user={user} onSignInClick={() => setAuthOpen(true)} setGenPrefill={setGenPrefill} apPrefill={apPrefill} setApPrefill={setApPrefill} />;
      case "blocking": return <BlockingPage setPage={setPage} user={user} onSignInClick={() => setAuthOpen(true)} setGenPrefill={setGenPrefill} />;
      case "frame-planner": return <FramePlannerPage setPage={setPage} user={user} onSignInClick={() => setAuthOpen(true)} setGenPrefill={setGenPrefill} notify={notify} />;
      case "coverage": return <CoveragePage activeProject={activeProject} notify={notify} setPage={setPage} user={user} onSignInClick={() => setAuthOpen(true)} setGenPrefill={setGenPrefill} setCcPrefill={setCcPrefill} />;
      case "shot-director": return <ShotDirectorPage setPage={setPage} user={user} onSignInClick={() => setAuthOpen(true)} setGenPrefill={setGenPrefill} />;
      case "continuity-check": return <ContinuityCheckPage setPage={setPage} user={user} ccPrefill={ccPrefill} setCcPrefill={setCcPrefill} />;
      case "vault": return <VaultPage activeProject={activeProject} user={user} onSignInClick={() => setAuthOpen(true)} setPage={setPage} notify={notify} />;
      case "which-model": return <WhichModelPage setPage={setPage} user={user} onSignInClick={() => setAuthOpen(true)} setGenPrefill={setGenPrefill} />;
      case "scene-breakdown": return <SceneBreakdownPage activeProject={activeProject} setCcPrefill={setCcPrefill} setPage={setPage} user={user} onSignInClick={() => setAuthOpen(true)} setGenPrefill={setGenPrefill} notify={notify} openPost={openPost} />;
      case "search": return <SearchPage creations={creations} setPage={setPage} setDetailId={setDetailId} setCreatorUser={setCreatorUser} openPost={openPost} openPromptModel={openPromptModel} />;
      case "prompts": return <PromptIndexPage setPage={setPage} openPromptModel={openPromptModel} openPromptGenre={openPromptGenre} />;
      case "prompt-model": return <PromptModelPage slug={promptSlug} setPage={setPage} openPromptModel={openPromptModel} openPromptGenre={openPromptGenre} />;
      case "prompt-genre": return <PromptGenrePage slug={promptGenre} setPage={setPage} openPromptModel={openPromptModel} openPromptGenre={openPromptGenre} />;
      default: return null;
    }
  }

  return (<><style>{CSS}</style><Nav setCreatorUser={setCreatorUser} activeProject={activeProject} page={page} setPage={setPage} user={user} profile={profile} onSignInClick={() => setAuthOpen(true)} onSignOut={handleSignOut} />{renderPage()}{authOpen && <AuthModal onClose={() => setAuthOpen(false)} notify={notify} />}{notifMsg && <Notification key={notifMsg} msg={notifMsg} onClose={() => setNotifMsg(null)} />}</>);
}
