import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase.js";
import { initAnalytics, identifyUser, resetUser, track } from "./lib/analytics.js";
import {
  fetchCreations,
  fetchCreationsByUser,
  insertCreation,
  fetchPurchasedIds,
  createCheckoutSession,
  updateCreationStatus,
  updateCreationSpotlight,
} from "./lib/db.js";
import {
  fetchProfile,
  fetchProfileByUsername,
  fetchCreators,
  upsertProfile,
  defaultProfile,
  fetchCreatorStats,
  fetchFollowerCount,
  fetchIsFollowing,
  followCreator,
  unfollowCreator,
  checkUsernameAvailable,
  uploadAvatar,
} from "./lib/profiles.js";

const CATEGORIES = ["Abstract","Action","Animation","Comedy","Creative Experiments","Crime","Documentary","Films","Drama","Horror","Images","Music","News","Noir","Prompts","Romance","Sci-Fi/Fantasy","Short Films","Sports","Thriller","Western","Workflows"];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Mono:wght@300;400&family=Syne:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --bg: #0E0F14; --bg2: #13141A; --bg3: #1A1B23; --border: rgba(255,255,255,0.06); --border-hover: rgba(123,63,228,0.35); --text: #E8E6F0; --muted: #6B6878; --accent: #7B3FE4; --accent-dim: rgba(123,63,228,0.15); --accent-glow: rgba(123,63,228,0.4); --premium: #C49A3C; --premium-dim: rgba(196,154,60,0.12); }
  html { scroll-behavior: smooth; }
  body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: var(--bg); } ::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 2px; }
  .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; height: 62px; background: rgba(10,11,16,0.92); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); }
  .nav-logo { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 0.18em; color: var(--text); cursor: pointer; text-transform: uppercase; }
  .nav-logo span { color: var(--accent); }
  .nav-center { display: flex; gap: 40px; align-items: center; position: absolute; left: 50%; transform: translateX(-50%); }
  .nav-link { font-size: 11px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); cursor: pointer; transition: color 0.2s; padding-bottom: 2px; border-bottom: 1px solid transparent; }
  .nav-link:hover { color: var(--text); } .nav-link.active { color: var(--accent); border-bottom-color: var(--accent); }
  .nav-right { display: flex; align-items: center; gap: 16px; }
  .nav-signin { background: transparent; color: var(--text); padding: 7px 18px; border-radius: 3px; font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); font-family: 'Syne', sans-serif; transition: all 0.2s; }
  .nav-signin:hover { border-color: var(--text); }
  .nav-user { display: flex; align-items: center; gap: 10px; }
  .nav-user-email { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.08em; color: var(--muted); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nav-user-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--accent-dim); border: 1px solid var(--accent); display: flex; align-items: center; justify-content: center; font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700; color: var(--accent); text-transform: uppercase; flex-shrink: 0; cursor: pointer; overflow: hidden; }
  .nav-user-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .nav-signout { background: transparent; color: var(--muted); padding: 6px 14px; border-radius: 3px; font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; border: 1px solid var(--border); font-family: 'Syne', sans-serif; transition: all 0.2s; }
  .nav-signout:hover { border-color: rgba(248,113,113,0.4); color: #F87171; }
  .auth-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(8,9,13,0.88); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; padding: 24px; animation: fadeIn 0.18s ease; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .auth-modal { background: var(--bg2); border: 1px solid var(--border); border-radius: 4px; width: 100%; max-width: 420px; overflow: hidden; box-shadow: 0 32px 80px rgba(0,0,0,0.7); animation: slideUp 0.22s ease; }
  @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .auth-header { padding: 32px 36px 0; } .auth-logo { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.18em; color: var(--text); text-transform: uppercase; margin-bottom: 24px; } .auth-logo span { color: var(--accent); }
  @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
  .auth-tabs { display: flex; border-bottom: 1px solid var(--border); }
  .auth-tab { flex: 1; padding: 10px 0; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; text-align: center; cursor: pointer; color: var(--muted); border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.2s; background: none; border-left: none; border-right: none; border-top: none; }
  .auth-tab.active { color: var(--accent); border-bottom-color: var(--accent); } .auth-tab:hover:not(.active) { color: var(--text); }
  .auth-body { padding: 28px 36px 32px; } .auth-field { margin-bottom: 20px; }
  .auth-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.18em; color: var(--accent); text-transform: uppercase; display: block; margin-bottom: 8px; }
  .auth-input { width: 100%; background: var(--bg3); border: 1px solid var(--border); color: var(--text); padding: 11px 14px; border-radius: 3px; font-family: 'Syne', sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s; }
  .auth-input:focus { border-color: var(--accent); } .auth-input::placeholder { color: var(--muted); }
  .auth-submit { width: 100%; background: var(--accent); color: white; padding: 12px; border-radius: 3px; font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; border: none; transition: all 0.2s; margin-top: 8px; }
  .auth-submit:hover { opacity: 0.88; box-shadow: 0 6px 24px var(--accent-glow); } .auth-submit:disabled { opacity: 0.45; cursor: not-allowed; }
  .auth-error { font-family: 'DM Mono', monospace; font-size: 11px; color: #F87171; margin-top: 14px; line-height: 1.5; padding: 10px 14px; background: rgba(248,113,113,0.06); border: 1px solid rgba(248,113,113,0.2); border-radius: 3px; }
  .auth-success { font-family: 'DM Mono', monospace; font-size: 11px; color: #4ADE80; margin-top: 14px; line-height: 1.5; padding: 10px 14px; background: rgba(74,222,128,0.06); border: 1px solid rgba(74,222,128,0.2); border-radius: 3px; }
  .auth-close { position: absolute; top: 16px; right: 18px; background: none; border: none; color: var(--muted); font-size: 18px; cursor: pointer; line-height: 1; padding: 4px 8px; border-radius: 2px; transition: color 0.2s; } .auth-close:hover { color: var(--text); }
  .auth-modal-wrap { position: relative; }
  .auth-link { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.08em; color: var(--accent); cursor: pointer; transition: opacity 0.2s; margin-top: 12px; display: inline-block; } .auth-link:hover { opacity: 0.75; }
  .page { min-height: 100vh; padding-top: 62px; }
  .hero { min-height: 60vh; display: grid; grid-template-columns: 1fr 1fr; position: relative; overflow: hidden; }
  .hero-left { display: flex; flex-direction: column; justify-content: center; padding: 48px 56px; position: relative; z-index: 2; }
  .hero-right { position: relative; overflow: hidden; }
  .hero-right img { width: 100%; height: 100%; object-fit: cover; filter: brightness(0.75) saturate(0.85); display: block; animation: heroKenBurns 18s ease-in-out infinite alternate; }
  @keyframes heroKenBurns { 0% { transform: scale(1.0); } 50% { transform: scale(1.06) translate(-1%, 0.8%); } 100% { transform: scale(1.08) translate(-0.6%, 1%); } }
  .hero-right::after { content: ''; position: absolute; inset: 0; background: linear-gradient(to right, var(--bg) 0%, transparent 30%); pointer-events: none; z-index: 1; }
  .hero-eyebrow { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.22em; color: var(--muted); text-transform: uppercase; margin-bottom: 28px; }
  .hero-tagline { font-family: 'Syne', sans-serif; font-size: clamp(32px, 4vw, 56px); font-weight: 700; line-height: 1.1; color: var(--text); margin-bottom: 12px; }
  .hero-tagline-accent { font-family: 'Syne', sans-serif; font-size: clamp(32px, 4vw, 56px); font-weight: 700; line-height: 1.1; color: var(--accent); margin-bottom: 32px; display: block; }
  .hero-sub { font-size: 14px; color: var(--muted); max-width: 380px; line-height: 1.7; margin-bottom: 36px; }
  .hero-link { display: inline-flex; align-items: center; gap: 8px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); cursor: pointer; transition: gap 0.2s; border: none; background: none; padding: 0; }
  .hero-link:hover { gap: 12px; } .hero-link-arrow { font-size: 14px; }
  .btn-primary { background: var(--accent); color: white; padding: 14px 32px; border-radius: 4px; font-size: 12px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; border: none; transition: all 0.2s; font-family: 'Syne', sans-serif; }
  .btn-primary:hover { opacity: 0.88; box-shadow: 0 8px 32px var(--accent-glow); }
  .section-sublabel { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .section { padding: 56px 48px; } .section + .section { background: var(--bg2); }
  .section-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 32px; }
  .section-label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 8px; }
  .section-link { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); cursor: pointer; transition: color 0.2s; } .section-link:hover { color: var(--accent); }
  .spotlight-section-wrap { padding: 72px 48px; } .spotlight-section-header { text-align: center; margin-bottom: 40px; }
  .spotlight-section-viewall { display: block; text-align: center; margin-top: 28px; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); cursor: pointer; transition: color 0.2s; } .spotlight-section-viewall:hover { color: var(--accent); }
  .spotlight-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; max-width: 1180px; margin: 0 auto; }
  .spotlight-card { position: relative; aspect-ratio: 3/4; overflow: hidden; cursor: pointer; }
  .spotlight-card img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94); filter: brightness(0.88) saturate(0.9); }
  .spotlight-card:hover img { transform: scale(1.06); filter: brightness(0.96) saturate(1); }
  .spotlight-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(8,9,13,0.97) 0%, rgba(8,9,13,0.1) 75%, transparent 100%); }
  .spotlight-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 28px 24px; }
  .spotlight-cat { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 6px; }
  .spotlight-title { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 400; color: var(--text); margin-bottom: 6px; line-height: 1.1; }
  .spotlight-creator { font-size: 11px; color: var(--muted); }
  .badge-premium { display: inline-flex; align-items: center; gap: 4px; background: var(--premium-dim); border: 1px solid rgba(196,154,60,0.3); color: var(--premium); padding: 2px 8px; border-radius: 2px; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; }
  .badge-open { display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.04); border: 1px solid var(--border); color: var(--muted); padding: 2px 8px; border-radius: 2px; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; }
  .badge-review { background: rgba(255,165,0,0.08); border: 1px solid rgba(255,165,0,0.25); color: rgba(255,165,0,0.7); }
  .badge-founding { display: inline-flex; align-items: center; background: var(--accent-dim); border: 1px solid rgba(123,63,228,0.3); color: var(--accent); padding: 2px 8px; border-radius: 2px; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; }
  .badge-following { display: inline-flex; align-items: center; background: rgba(74,222,128,0.08); border: 1px solid rgba(74,222,128,0.25); color: #4ADE80; padding: 2px 8px; border-radius: 2px; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; }
  .creation-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; }
  .creation-card { background: var(--bg2); cursor: pointer; border: 1px solid transparent; transition: border-color 0.3s, box-shadow 0.3s; position: relative; overflow: hidden; }
  .creation-card:hover { border-color: var(--border-hover); box-shadow: 0 4px 32px rgba(0,0,0,0.5); }
  .creation-thumb { position: relative; aspect-ratio: 4/3; overflow: hidden; }
  .creation-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94), filter 0.7s ease; filter: brightness(0.82) saturate(0.85); display: block; }
  .creation-card:hover .creation-thumb img { transform: scale(1.05); filter: brightness(0.95) saturate(1.05); }
  .creation-thumb video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.4s ease; pointer-events: none; }
  .creation-card:hover .creation-thumb video { opacity: 1; }
  .creation-thumb::after { content: ''; position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 40%, rgba(8,9,13,0.88) 100%); pointer-events: none; z-index: 1; }
  .creation-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 16px 14px; z-index: 2; }
  .creation-info-title { font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text); margin-bottom: 2px; }
  .creation-info-creator { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.08em; color: var(--muted); text-transform: uppercase; }
  .creation-badge { position: absolute; top: 10px; right: 10px; z-index: 3; }
  .video-indicator { position: absolute; top: 10px; left: 10px; z-index: 3; display: flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.12); border-radius: 2px; padding: 2px 7px; font-family: 'DM Mono', monospace; font-size: 8px; letter-spacing: 0.1em; color: rgba(255,255,255,0.6); text-transform: uppercase; }
  .manifesto { padding: 72px 48px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); text-align: center; position: relative; overflow: hidden; background: var(--bg2); }
  .manifesto::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 50% 80% at 50% 50%, rgba(123,63,228,0.06), transparent); pointer-events: none; }
  .manifesto-quote { font-family: 'Cormorant Garamond', serif; font-size: clamp(24px, 3.2vw, 42px); font-weight: 300; line-height: 1.45; color: var(--text); max-width: 640px; margin: 0 auto 24px; font-style: italic; }
  .manifesto-sub { font-size: 13px; color: var(--muted); letter-spacing: 0.08em; max-width: 380px; margin: 0 auto; line-height: 1.7; }
  .manifesto-rule { width: 36px; height: 1px; background: var(--accent); margin: 0 auto 36px; }
  .filter-bar { display: flex; gap: 2px; margin-bottom: 48px; flex-wrap: wrap; }
  .filter-btn { padding: 10px 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--muted); transition: all 0.2s; border-radius: 2px; font-family: 'Syne', sans-serif; }
  .filter-btn.active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); } .filter-btn:hover:not(.active) { border-color: rgba(255,255,255,0.15); color: var(--text); }
  .load-more { text-align: center; padding: 48px 0; }
  .btn-load { background: transparent; border: 1px solid var(--border); color: var(--muted); padding: 12px 36px; border-radius: 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; font-family: 'Syne', sans-serif; } .btn-load:hover { border-color: var(--accent); color: var(--accent); }
  .btn-ghost { background: transparent; color: var(--text); padding: 13px 32px; border-radius: 4px; font-size: 12px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; border: 1px solid var(--border-hover); transition: all 0.2s; font-family: 'Syne', sans-serif; } .btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
  .creator-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 2px; }
  .creator-card { background: var(--bg2); padding: 28px; cursor: pointer; border: 1px solid transparent; transition: border-color 0.25s; } .creator-card:hover { border-color: var(--border-hover); }
  .creator-avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; margin-bottom: 16px; border: 2px solid var(--border); background: var(--bg3); display: block; }
  .creator-name { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 500; color: var(--text); margin-bottom: 4px; }
  .creator-handle { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); margin-bottom: 12px; }
  .creator-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
  .creator-bio { font-size: 12px; color: var(--muted); line-height: 1.6; }
  .profile-header { padding: 60px 48px 48px; border-bottom: 1px solid var(--border); display: flex; align-items: flex-start; gap: 32px; }
  .profile-avatar { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border); flex-shrink: 0; background: var(--bg3); display: block; }
  .profile-name { font-family: 'Cormorant Garamond', serif; font-size: 48px; font-weight: 300; color: var(--text); line-height: 1; margin-bottom: 4px; }
  .profile-handle { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); margin-bottom: 12px; }
  .profile-bio { font-size: 14px; color: var(--muted); max-width: 480px; line-height: 1.7; }
  .profile-actions { margin-top: 20px; display: flex; gap: 12px; align-items: center; }
  .btn-follow { padding: 9px 24px; border-radius: 3px; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; font-family: 'Syne', sans-serif; transition: all 0.2s; }
  .btn-follow.unfollowed { background: var(--accent); color: white; border: none; } .btn-follow.unfollowed:hover { opacity: 0.88; box-shadow: 0 0 20px var(--accent-glow); }
  .btn-follow.followed { background: transparent; color: #4ADE80; border: 1px solid rgba(74,222,128,0.35); } .btn-follow.followed:hover { background: rgba(74,222,128,0.06); }
  .detail-page { background: var(--bg); }
  .detail-cinema { width: 100%; background: #000; position: relative; }
  .detail-cinema-inner { width: 100%; max-width: 1440px; margin: 0 auto; position: relative; }
  .detail-cinema video { width: 100%; aspect-ratio: 16/9; display: block; background: #000; }
  .detail-cinema img.detail-still { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; filter: brightness(0.88) saturate(0.88); }
  .detail-cinema-inner::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 120px; background: linear-gradient(transparent, #000); pointer-events: none; }
  .detail-back { display: inline-flex; align-items: center; gap: 8px; position: absolute; top: 20px; left: 24px; z-index: 10; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(232,230,240,0.55); cursor: pointer; transition: color 0.2s; background: rgba(0,0,0,0.38); border: 1px solid rgba(255,255,255,0.08); border-radius: 2px; padding: 6px 14px; backdrop-filter: blur(6px); } .detail-back:hover { color: var(--text); border-color: rgba(255,255,255,0.2); }
  .detail-editorial-strip { background: var(--bg); border-bottom: 1px solid var(--border); }
  .detail-editorial-inner { max-width: 1180px; margin: 0 auto; padding: 36px 48px 32px; display: flex; align-items: flex-start; justify-content: space-between; gap: 48px; }
  .detail-editorial-left { flex: 1; min-width: 0; } .detail-editorial-right { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; flex-shrink: 0; padding-top: 6px; }
  .detail-eyebrow { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.22em; color: var(--accent); text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
  .detail-eyebrow-line { width: 28px; height: 1px; background: var(--accent); opacity: 0.4; flex-shrink: 0; }
  .detail-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(32px, 4vw, 58px); font-weight: 300; color: var(--text); line-height: 1.0; letter-spacing: -0.01em; margin-bottom: 16px; }
  .detail-creator-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .detail-creator-link { font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.06em; color: var(--accent); cursor: pointer; transition: opacity 0.2s; } .detail-creator-link:hover { opacity: 0.75; }
  .detail-creator-sep { color: var(--border); font-size: 10px; }
  .detail-category-tag { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.12em; color: var(--muted); text-transform: uppercase; }
  .detail-badges-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
  .detail-tools-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 14px; }
  .detail-tool-tag { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.12em; color: var(--muted); background: transparent; border: 1px solid var(--border); padding: 3px 9px; border-radius: 2px; text-transform: uppercase; }
  .detail-tool-tag-video { color: var(--accent); border-color: rgba(123,63,228,0.3); }
  .detail-body { max-width: 1180px; margin: 0 auto; padding: 48px 48px 80px; }
  .detail-rule { width: 100%; height: 1px; background: var(--border); margin-bottom: 40px; }
  .detail-section-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.22em; color: var(--accent); text-transform: uppercase; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
  .detail-section-label-line { flex: 1; height: 1px; background: rgba(123,63,228,0.18); }
  .prompt-box { background: var(--bg2); border: 1px solid var(--border); border-radius: 3px; padding: 32px 36px; max-width: 780px; }
  .prompt-text { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); line-height: 1.95; }
  .prompt-fade { position: relative; overflow: hidden; max-height: 96px; }
  .prompt-fade::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 56px; background: linear-gradient(transparent, var(--bg2)); }
  .unlock-area { margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--border); display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
  .unlock-label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.1em; color: var(--muted); }
  .btn-unlock-restrained { background: transparent; border: 1px solid rgba(123,63,228,0.4); color: var(--accent); padding: 10px 24px; border-radius: 3px; font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; } .btn-unlock-restrained:hover { background: var(--accent-dim); border-color: var(--accent); }
  @media (max-width: 860px) { .detail-editorial-inner { flex-direction: column; gap: 20px; padding: 28px 24px 24px; } .detail-editorial-right { align-items: flex-start; } .detail-body { padding: 32px 24px 56px; } .detail-title { font-size: 32px; } .prompt-box { padding: 20px 22px; } }
  .admin-table { width: 100%; border-collapse: collapse; }
  .admin-table th { text-align: left; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.15em; color: var(--muted); text-transform: uppercase; padding: 12px 16px; border-bottom: 1px solid var(--border); }
  .admin-table td { padding: 16px; border-bottom: 1px solid var(--border); font-size: 13px; color: var(--text); vertical-align: middle; }
  .admin-table tr:hover td { background: var(--bg2); }
  .btn-approve { background: rgba(74,222,128,0.12); border: 1px solid rgba(74,222,128,0.3); color: #4ADE80; padding: 6px 14px; border-radius: 2px; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; margin-right: 8px; font-family: 'Syne', sans-serif; } .btn-approve:hover { background: rgba(74,222,128,0.2); }
  .btn-reject { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.25); color: #F87171; padding: 6px 14px; border-radius: 2px; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; font-family: 'Syne', sans-serif; } .btn-reject:hover { background: rgba(248,113,113,0.18); }
  .form-group { margin-bottom: 28px; }
  .form-label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.15em; color: var(--accent); text-transform: uppercase; display: block; margin-bottom: 10px; }
  .form-input, .form-select, .form-textarea { width: 100%; background: var(--bg2); border: 1px solid var(--border); color: var(--text); padding: 12px 16px; border-radius: 4px; font-family: 'Syne', sans-serif; font-size: 14px; transition: border-color 0.2s; outline: none; }
  .form-input:focus, .form-select:focus, .form-textarea:focus { border-color: var(--accent); }
  .form-textarea { min-height: 140px; resize: vertical; line-height: 1.6; } .form-select option { background: var(--bg2); }
  .form-hint { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); margin-top: 6px; letter-spacing: 0.06em; line-height: 1.5; }
  .toggle-row { display: flex; align-items: center; gap: 16px; }
  .toggle { width: 44px; height: 24px; background: var(--bg3); border-radius: 12px; position: relative; cursor: pointer; transition: background 0.2s; border: 1px solid var(--border); flex-shrink: 0; } .toggle.on { background: var(--accent); border-color: var(--accent); }
  .toggle-knob { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; background: white; border-radius: 50%; transition: transform 0.2s; } .toggle.on .toggle-knob { transform: translateX(20px); }
  .toggle-label { font-size: 13px; color: var(--text); } .toggle-sub { font-size: 11px; color: var(--muted); margin-top: 4px; }
  .upload-drop { border: 1px dashed var(--border); border-radius: 4px; padding: 32px 24px; text-align: center; cursor: pointer; transition: border-color 0.2s, background 0.2s; position: relative; }
  .upload-drop:hover, .upload-drop.dragover { border-color: var(--accent); background: var(--accent-dim); }
  .upload-drop input[type="file"] { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
  .upload-drop-icon { font-size: 28px; margin-bottom: 10px; opacity: 0.5; }
  .upload-drop-label { font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.1em; color: var(--muted); text-transform: uppercase; }
  .upload-drop-hint { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.08em; color: var(--muted); margin-top: 6px; opacity: 0.6; }
  .upload-file-info { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--bg3); border: 1px solid var(--border); border-radius: 3px; margin-top: 12px; }
  .upload-file-name { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--text); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .upload-file-size { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); flex-shrink: 0; }
  .upload-file-clear { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 16px; padding: 0 4px; line-height: 1; transition: color 0.2s; flex-shrink: 0; } .upload-file-clear:hover { color: #F87171; }
  .upload-progress-wrap { margin-top: 12px; }
  .upload-progress-bar-bg { height: 3px; background: var(--bg3); border-radius: 2px; overflow: hidden; }
  .upload-progress-bar { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.25s ease; }
  .upload-progress-label { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); margin-top: 8px; display: flex; justify-content: space-between; }
  .upload-success { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: rgba(74,222,128,0.06); border: 1px solid rgba(74,222,128,0.2); border-radius: 3px; margin-top: 12px; font-family: 'DM Mono', monospace; font-size: 10px; color: #4ADE80; letter-spacing: 0.08em; }
  .upload-error { padding: 10px 14px; background: rgba(248,113,113,0.06); border: 1px solid rgba(248,113,113,0.2); border-radius: 3px; margin-top: 12px; font-family: 'DM Mono', monospace; font-size: 10px; color: #F87171; letter-spacing: 0.06em; line-height: 1.6; }
  .page-hdr { padding: 60px 48px 48px; border-bottom: 1px solid var(--border); }
  .page-hdr-eyebrow { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 10px; }
  .page-hdr-title { font-family: 'Cormorant Garamond', serif; font-size: 56px; font-weight: 300; color: var(--text); }
  .page-hdr-sub { font-size: 14px; color: var(--muted); margin-top: 10px; max-width: 480px; line-height: 1.7; }
  .back-btn { display: inline-flex; align-items: center; gap: 8px; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); cursor: pointer; transition: color 0.2s; padding: 24px 48px; } .back-btn:hover { color: var(--accent); }
  .notif { position: fixed; bottom: 32px; right: 32px; background: var(--bg3); border: 1px solid var(--accent); border-radius: 6px; padding: 14px 20px; font-size: 13px; color: var(--text); z-index: 999; animation: slideIn 0.3s ease; max-width: 340px; line-height: 1.5; }
  @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .empty-state { padding: 80px 48px; text-align: center; } .empty-text { font-size: 14px; color: var(--muted); }
  .spotlight-toggle { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-family: 'DM Mono', monospace; letter-spacing: 0.1em; cursor: pointer; color: var(--muted); text-transform: uppercase; } .spotlight-toggle.active { color: var(--accent); }
  .spotlight-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
  .footer { padding: 48px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
  .footer-logo { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 400; color: var(--muted); }
  .footer-copy { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); letter-spacing: 0.1em; }
  .settings-layout { display: grid; grid-template-columns: 220px 1fr; gap: 0; min-height: calc(100vh - 62px); }
  .settings-sidebar { border-right: 1px solid var(--border); padding: 48px 0; background: var(--bg2); }
  .settings-sidebar-title { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.22em; color: var(--muted); text-transform: uppercase; padding: 0 28px 16px; }
  .settings-nav-item { display: block; width: 100%; text-align: left; padding: 11px 28px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); cursor: pointer; background: none; border: none; transition: color 0.2s, background 0.2s; border-left: 2px solid transparent; }
  .settings-nav-item:hover { color: var(--text); background: rgba(255,255,255,0.02); } .settings-nav-item.active { color: var(--accent); border-left-color: var(--accent); background: var(--accent-dim); }
  .settings-main { padding: 48px 56px; max-width: 680px; }
  .settings-section-title { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 300; color: var(--text); margin-bottom: 6px; }
  .settings-section-sub { font-size: 13px; color: var(--muted); margin-bottom: 40px; line-height: 1.6; }
  .settings-divider { height: 1px; background: var(--border); margin: 36px 0; }
  .settings-avatar-row { display: flex; align-items: center; gap: 24px; margin-bottom: 32px; padding: 24px; background: var(--bg2); border: 1px solid var(--border); border-radius: 4px; }
  .settings-avatar-preview { width: 72px; height: 72px; border-radius: 50%; border: 2px solid var(--border); flex-shrink: 0; background: var(--bg3); display: flex; align-items: center; justify-content: center; font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 700; color: var(--accent); overflow: hidden; }
  .settings-avatar-preview img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .settings-avatar-info { flex: 1; }
  .settings-avatar-label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.14em; color: var(--muted); text-transform: uppercase; margin-bottom: 4px; }
  .settings-avatar-hint { font-size: 12px; color: var(--muted); line-height: 1.5; }
  .settings-save-row { display: flex; align-items: center; gap: 16px; margin-top: 8px; }
  .settings-save-error { font-family: 'DM Mono', monospace; font-size: 11px; color: #F87171; padding: 10px 14px; background: rgba(248,113,113,0.06); border: 1px solid rgba(248,113,113,0.2); border-radius: 3px; line-height: 1.5; }
  .avatar-fallback { border-radius: 50%; background: var(--accent-dim); border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; font-family: 'Syne', sans-serif; font-weight: 700; color: var(--accent); flex-shrink: 0; }
  @media (max-width: 760px) {
    .nav { padding: 0 20px; height: auto; min-height: 62px; flex-wrap: wrap; }
    .nav-center { position: static; transform: none; width: 100%; order: 3; gap: 20px; justify-content: center; padding: 12px 0; border-top: 1px solid var(--border); margin-top: 12px; }
    .nav-link { font-size: 10px; } .nav-user-email { display: none; } .nav-logo { font-size: 12px; }
    .nav-signin { padding: 6px 14px; font-size: 10px; } .nav-signout { padding: 5px 12px; font-size: 9px; }
    .hero { grid-template-columns: 1fr; min-height: auto; } .hero-left { padding: 32px 24px; } .hero-right { min-height: 300px; }
    .hero-tagline, .hero-tagline-accent { font-size: 28px; } .hero-eyebrow { font-size: 9px; margin-bottom: 20px; } .hero-sub { font-size: 13px; margin-bottom: 28px; }
    .section { padding: 40px 24px; } .section-header { flex-direction: column; align-items: flex-start; gap: 12px; }
    .spotlight-section-wrap { padding: 48px 24px; }
    .creation-grid { grid-template-columns: 1fr; gap: 16px; } .spotlight-grid { grid-template-columns: 1fr; gap: 16px; } .creator-grid { grid-template-columns: 1fr; gap: 16px; }
    .creation-thumb { aspect-ratio: 16/9; } .spotlight-card { aspect-ratio: 16/9; }
    .auth-modal { max-width: 100%; margin: 0 16px; } .auth-header { padding: 24px 24px 0; } .auth-body { padding: 20px 24px 24px; } .auth-tabs { flex-wrap: wrap; } .auth-tab { font-size: 9px; padding: 8px 0; }
    .page-hdr { padding: 40px 24px 32px; } .page-hdr-title { font-size: 36px; }
    .back-btn { padding: 16px 24px; }
    .profile-header { flex-direction: column; padding: 40px 24px 32px; gap: 20px; } .profile-name { font-size: 32px; } .profile-avatar { width: 80px; height: 80px; }
    .detail-back { font-size: 9px; padding: 5px 12px; } .detail-editorial-inner { flex-direction: column; gap: 20px; padding: 28px 24px 24px; } .detail-editorial-right { align-items: flex-start; } .detail-body { padding: 32px 24px 56px; } .detail-title { font-size: 28px; } .prompt-box { padding: 20px 18px; }
    .manifesto { padding: 48px 24px; } .manifesto-quote { font-size: 20px; }
    .filter-bar { gap: 8px; } .filter-btn { padding: 8px 16px; font-size: 10px; }
    .footer { flex-direction: column; gap: 16px; padding: 32px 24px; text-align: center; }
    .form-group { margin-bottom: 20px; } .form-input, .form-select, .form-textarea { font-size: 16px; padding: 12px 14px; }
    .admin-table { font-size: 11px; } .admin-table th, .admin-table td { padding: 10px 8px; } .btn-approve, .btn-reject { font-size: 9px; padding: 5px 10px; margin-right: 6px; }
    .empty-state { padding: 60px 24px; }
    .settings-layout { grid-template-columns: 1fr; } .settings-sidebar { border-right: none; border-bottom: 1px solid var(--border); padding: 24px 0 8px; } .settings-sidebar-title { padding: 0 20px 12px; } .settings-nav-item { padding: 10px 20px; } .settings-main { padding: 32px 24px; max-width: 100%; } .settings-section-title { font-size: 28px; } .settings-avatar-row { flex-direction: column; align-items: flex-start; gap: 16px; padding: 18px; } .settings-save-row { flex-direction: column; align-items: flex-start; }
  }
`;

function avatarInitial(name, email) {
  if (name && name.trim()) return name.trim()[0].toUpperCase();
  if (email) return email[0].toUpperCase();
  return "?";
}

function CreatorAvatar({ src, name, email, size = 64, className = "" }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size, borderRadius: "50%", flexShrink: 0, objectFit: "cover" };
  if (src && !failed) return <img src={src} alt={name ?? "avatar"} className={className} style={style} onError={() => setFailed(true)} />;
  return <div className={className || "avatar-fallback"} style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent-dim)", border: "2px solid var(--border)", fontFamily: "'Syne', sans-serif", fontSize: size * 0.36, fontWeight: 700, color: "var(--accent)" }}>{avatarInitial(name, email)}</div>;
}

function Badge({ type }) {
  if (type === "Premium")  return <span className="badge-premium">&#9670; Premium</span>;
  if (type === "Open")     return <span className="badge-open">Open</span>;
  if (type === "Founding") return <span className="badge-founding">Founding</span>;
  if (type === "review")   return <span className="badge-open badge-review">Under Review</span>;
  if (type === "following")return <span className="badge-following">Following</span>;
  return null;
}

function Notification({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3400); return () => clearTimeout(t); }, [onClose]);
  return <div className="notif">&#10022; {msg}</div>;
}

function AuthModal({ onClose, notify }) {
  const [tab, setTab] = useState("signin");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState(null); const [success, setSuccess] = useState(null);
  function reset() { setError(null); setSuccess(null); }
  async function handleSignIn(e) { e.preventDefault(); reset(); setLoading(true); const { error: err } = await supabase.auth.signInWithPassword({ email, password }); setLoading(false); if (err) { setError(err.message); return; } notify("Welcome back to RevaultAI."); onClose(); }
  async function handleSignUp(e) { e.preventDefault(); reset(); setLoading(true); const { error: err } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/email-confirmed` } }); setLoading(false); if (err) { setError(err.message); return; } setSuccess("Account created. Check your email to confirm."); }
  async function handleForgotPassword(e) { e.preventDefault(); if (!email.trim()) { setError("Please enter your email address."); return; } reset(); setLoading(true); const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/set-password` }); setLoading(false); if (err) { setError(err.message); return; } setSuccess("Password reset email sent."); }
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

function isAdmin(user) { return !!user?.email && ["richardgarland999@gmail.com"].includes(user.email.toLowerCase()); }

function Nav({ page, setPage, user, profile, onSignInClick, onSignOut }) {
  const avatarSrc = profile?.avatar_url ?? null;
  return (
    <nav className="nav">
      <div className="nav-logo" onClick={() => setPage("home")}>
        <img src="/revaultai-logo-transparent.png" alt="RevaultAI" style={{ height: "64px", width: "auto", display: "block" }} />
      </div>
      <div className="nav-center">
        <div className={"nav-link" + (page === "home" ? " active" : "")} onClick={() => setPage("home")}>Home</div>
        <div className={"nav-link" + (page === "explore" ? " active" : "")} onClick={() => setPage("explore")}>Explore</div>
        <div className={"nav-link" + (page === "creators" ? " active" : "")} onClick={() => setPage("creators")}>Creators</div>
        <div className={"nav-link" + (page === "submit" ? " active" : "")} onClick={() => setPage("submit")}>Submit</div>
        <div className={"nav-link" + (page === "become-creator" ? " active" : "")} onClick={() => setPage("become-creator")}>Join</div>
        {user && isAdmin(user) && <div className={"nav-link" + (page === "admin" ? " active" : "")} onClick={() => setPage("admin")}>Admin</div>}
        {user && <div className={"nav-link" + (page === "settings" ? " active" : "")} onClick={() => setPage("settings")}>Profile</div>}
      </div>
      <div className="nav-right">
        {user ? (
          <div className="nav-user">
            <div className="nav-user-avatar" onClick={() => setPage("settings")} title="Profile Settings">
              {avatarSrc ? <img src={avatarSrc} alt={profile?.display_name ?? "avatar"} onError={(e) => { e.target.style.display = "none"; }} /> : avatarInitial(profile?.display_name, user.email)}
            </div>
            <span className="nav-user-email">{user.email}</span>
            <button className="nav-signout" onClick={onSignOut}>Sign Out</button>
          </div>
        ) : (
          <button className="nav-signin" onClick={onSignInClick}>Sign In</button>
        )}
      </div>
    </nav>
  );
}

const TIP_HOSTS = [
  "ko-fi.com", "buymeacoffee.com", "patreon.com",
  "paypal.com", "paypal.me", "venmo.com", "cash.app",
  "liberapay.com", "gofundme.com", "buy.stripe.com",
];

function normalizeTipUrl(raw) {
  const v = (raw ?? "").trim();
  if (!v) return { ok: true, url: "" }; // blank clears the field
  if (v.length > 500) return { ok: false, error: "Support link is too long (max 500 characters)." };
  let parsed;
  try { parsed = new URL(v); }
  catch { return { ok: false, error: "Enter a full URL, e.g. https://ko-fi.com/yourname." }; }
  if (parsed.protocol !== "https:") return { ok: false, error: "Support link must start with https://." };
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const allowed = TIP_HOSTS.some((h) => host === h || host.endsWith("." + h));
  if (!allowed) return { ok: false, error: "Use a known support platform (Ko-fi, Buy Me a Coffee, PayPal, Patreon, Venmo, Cash App, Liberapay, GoFundMe, or Stripe)." };
  return { ok: true, url: parsed.href };
}

function normalizeContactUrl(raw) {
  const v = (raw ?? "").trim();
  if (!v) return { ok: true, url: "" }; // blank clears the field
  if (v.length > 500) return { ok: false, error: "Link is too long (max 500 characters)." };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { ok: true, url: "mailto:" + v };
  let parsed;
  try { parsed = new URL(v); }
  catch { return { ok: false, error: "Enter a full URL (https://...) or an email address." }; }
  if (parsed.protocol === "mailto:") return { ok: true, url: parsed.href };
  if (parsed.protocol !== "https:") return { ok: false, error: "Link must start with https:// (or be an email address)." };
  return { ok: true, url: parsed.href };
}
function toolLinksToText(arr) {
  return (Array.isArray(arr) ? arr : []).map((t) => `${t.name} | ${t.url}`).join("\n");
}

function parseToolLinks(raw) {
  const lines = (raw ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length > 12) return { ok: false, error: "You can list up to 12 tools." };
  const list = [];
  for (let i = 0; i < lines.length; i++) {
    const sep = lines[i].indexOf("|");
    if (sep === -1) return { ok: false, error: `Line ${i + 1}: use the format  Tool name | https://link` };
    const name = lines[i].slice(0, sep).trim();
    const link = lines[i].slice(sep + 1).trim();
    if (!name) return { ok: false, error: `Line ${i + 1}: missing the tool name.` };
    if (name.length > 60) return { ok: false, error: `Line ${i + 1}: tool name is too long.` };
    if (link.length > 500) return { ok: false, error: `Line ${i + 1}: link is too long.` };
    let parsed;
    try { parsed = new URL(link); }
    catch { return { ok: false, error: `Line ${i + 1}: that isn't a valid URL.` }; }
    if (parsed.protocol !== "https:") return { ok: false, error: `Line ${i + 1}: link must start with https://` };
    list.push({ name, url: parsed.href });
  }
  return { ok: true, list };
}

function SettingsPage({ user, profile, setProfile, notify }) {
 const [form, setForm] = useState({
    display_name: profile?.display_name ?? "",
    username:     profile?.username     ?? "",
    bio:          profile?.bio          ?? "",
    avatar_url:   profile?.avatar_url   ?? "",
    tip_url:      profile?.tip_url      ?? "",
    hire_url:     profile?.hire_url     ?? "",
    tool_links_text: toolLinksToText(profile?.tool_links),
  });
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [usernameStatus, setUsernameStatus]   = useState(null); // "available" | "taken" | null
  const fileInputRef = useRef(null);

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
    setFormError(null); setSaving(true);
    const updated = {
      display_name: form.display_name.trim(),
      username:     form.username.trim(),
      bio:          form.bio.trim(),
      avatar_url:   form.avatar_url.trim(),
      tip_url:      tip.url,
      hire_url:     hire.url,
      tool_links:   toolsParsed.list,
    };
    const { data, error } = await upsertProfile(user, updated);
    setSaving(false);
    if (error) { setFormError("Save failed: " + error.message); return; }
    setProfile(data ?? ((prev) => ({ ...prev, ...updated })));
    notify("Profile saved.");
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
          <div className="settings-section-title">Creator Profile</div>
          <div className="settings-section-sub">Your public identity on RevaultAI.</div>

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

          <div className="settings-divider" />
          {formError && <div className="settings-save-error" style={{ marginBottom: 16 }}>{formError}</div>}
          <div className="settings-save-row">
            <button className="btn-primary" onClick={handleSave} disabled={saving || avatarUploading || usernameStatus === "taken"} style={{ opacity: (saving || avatarUploading) ? 0.6 : 1 }}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>{user?.email}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreationCard({ creation, onClick }) {
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
        <img src={creation.thumbnail_image || creation.hero_image} alt={creation.title} />
        {hasPreview && (
  creation.preview_video.includes("image.mux.com")
    ? <img src={creation.preview_video} alt="preview" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0, transition: "opacity 0.4s ease", pointerEvents: "none" }} className="preview-gif" />
    : <video ref={videoRef} src={creation.preview_video} muted loop playsInline preload="metadata" />
)}
        {(hasPreview || !!creation.video_url) && <div className="video-indicator">&#9654; Film</div>}
        <div className="creation-badge">{isPending ? <Badge type="review" /> : creation.is_premium ? <Badge type="Premium" /> : <Badge type="Open" />}</div>
        <div className="creation-info"><div className="creation-info-title">{creation.title}</div><div className="creation-info-creator">by {creation.creator.display_name}</div></div>
      </div>
    </div>
  );
}

function SpotlightSection({ creations, onView }) {
  const items = creations.filter((c) => c.spotlight && c.premium_status !== "Pending" && c._fromDb);
  if (items.length === 0) return null;
  return (
    <div className="spotlight-section-wrap">
      <div className="spotlight-section-header"><div className="section-label">Spotlight</div><div className="section-sublabel">Handpicked creations from exceptional artists.</div></div>
      <div className="spotlight-grid">
        {items.map((item) => (
          <div key={item.id} className="spotlight-card" onClick={() => onView(item.id)}>
            <img src={item.hero_image} alt={item.title} />
            <div className="spotlight-overlay" />
            <div className="spotlight-info"><div className="spotlight-cat">{item.category}</div><div className="spotlight-title">{item.title}</div><div className="spotlight-creator">by {item.creator.display_name}</div></div>
          </div>
        ))}
      </div>
      <span className="spotlight-section-viewall" onClick={() => onView(items[0]?.id)}>View All &rarr;</span>
    </div>
  );
}

function HomePage({ creations, setPage, setDetailId }) {
  const premiumCreations = creations.filter((c) => c.is_premium && c.premium_status === "Approved");
  const openCreations    = creations.filter((c) => !c.is_premium);
  function goDetail(id) { setDetailId(id); setPage("detail"); }
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-left">
          <div className="hero-eyebrow">AI-Native Creative Platform</div>
          <div className="hero-tagline">The AI era doesn't<br />need more content.</div>
          <span className="hero-tagline-accent">It needs curation.</span>
          <p className="hero-sub" style={{ color: "var(--text)", fontSize: 16, fontWeight: 500, lineHeight: 1.6, maxWidth: 440, marginBottom: 16 }}>Home to the world's best AI films, short films, images, prompts, workflows, and creative experiments.</p>
          <p className="hero-sub">RevaultAI is a curated archive of exceptional AI-native creativity. Discover cinematic films, short films, visual art, prompt collections, workflows, and creative experiments from creators pushing the medium forward.</p>
          <button className="hero-link" onClick={() => setPage("explore")}>Explore the Archive <span className="hero-link-arrow">&rarr;</span></button>
        </div>
        <div className="hero-right"><img src="https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1400&q=90" alt="Cinematic AI visual" /></div>
      </section>
      <SpotlightSection creations={creations} onView={goDetail} />
      <section className="section">
        <div className="section-header"><div><div className="section-label">Curated</div><div className="section-sublabel">Premium creations from top-tier artists.</div></div><span className="section-link" onClick={() => setPage("explore")}>View All &rarr;</span></div>
        <div className="creation-grid">{premiumCreations.slice(0, 4).map((c) => <CreationCard key={c.id} creation={c} onClick={goDetail} />)}</div>
      </section>
      <section className="section">
        <div className="section-header"><div><div className="section-label">Open Archive</div><div className="section-sublabel">Free access to outstanding AI creations.</div></div><span className="section-link" onClick={() => setPage("explore")}>View All &rarr;</span></div>
        <div className="creation-grid">{openCreations.slice(0, 4).map((c) => <CreationCard key={c.id} creation={c} onClick={goDetail} />)}</div>
      </section>
      <section className="section" style={{ textAlign: "center", borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.22em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 18 }}>For Creators</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 300, color: "var(--text)", marginBottom: 18, lineHeight: 1.15 }}>Build your creative legacy.</div>
          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.8, maxWidth: 520, margin: "0 auto 36px" }}>Share your work, grow your audience, monetize premium prompts, and become part of a curated archive of AI-native creativity.</p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn-primary" onClick={() => setPage("become-creator")}>Become a Creator</button>
            <button className="btn-ghost" onClick={() => setPage("creators")}>Explore Creators</button>
          </div>
        </div>
      </section>
      <section className="manifesto"><div className="manifesto-rule" /><p className="manifesto-quote">"The AI era doesn't need more content. It needs curation."</p><p className="manifesto-sub">RevaultAI is built for creators who believe AI is a medium, not just a tool.</p></section>
      <footer className="footer">
  <div className="footer-logo">RevaultAI</div>
  <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("faq")}>FAQ</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("contact")}>Contact</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("guidelines")}>Guidelines</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("premium-prompts")}>Premium Prompts</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("about")}>About</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("become-creator")}>Become a Creator</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("terms")}>Terms</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("privacy")}>Privacy</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("refunds")}>Refunds</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("dmca")}>DMCA</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("ai-disclaimer")}>AI Disclaimer</span>
  </div>
  <div className="footer-copy">&copy; 2025 RevaultAI</div>
</footer>
    </div>
  );
}

function ExplorePage({ creations, setPage, setDetailId, dbLoaded }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("newest");
  const [visible, setVisible] = useState(12);

  const filtered = creations
    .filter((c) => c.premium_status !== "Pending" && c.premium_status !== "Rejected")
    .filter((c) => {
      if (filter === "Premium") return c.is_premium;
      if (filter === "Open") return !c.is_premium;
      return true;
    })
    .filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.title?.toLowerCase().includes(q) ||
        c.creator?.display_name?.toLowerCase().includes(q) ||
        c.creator?.username?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.tools_used?.some((t) => t.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sort === "newest") return new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0);
      if (sort === "premium") return (b.is_premium ? 1 : 0) - (a.is_premium ? 1 : 0);
      if (sort === "spotlight") return (b.spotlight ? 1 : 0) - (a.spotlight ? 1 : 0);
      return 0;
    });

  function goDetail(id) { setDetailId(id); setPage("detail"); }

  return (
    <div className="page">
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">Browse</div>
        <div className="page-hdr-title">Explore</div>
        <div className="page-hdr-sub">All creations published by the RevaultAI community.</div>
      </div>
      <SpotlightSection creations={creations} onView={goDetail} />
      <section className="section">

        {/* Search bar */}
        <div style={{ marginBottom: 24 }}>
          <input
            className="form-input"
            type="text"
            placeholder="Search by title, creator, category, or tool..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setVisible(12); if (e.target.value.length === 3) track("search_used", { query: e.target.value }); }}
            style={{ maxWidth: 520 }}
          />
        </div>

        {/* Filters + Sort */}
        <div style={{ display: "flex", gap: 12, marginBottom: 40, flexWrap: "wrap", alignItems: "center" }}>
          <div className="filter-bar" style={{ marginBottom: 0, flex: 1, minWidth: 240 }}>
            {["All", "Premium", "Open"].map((f) => (
              <button key={f} className={"filter-btn" + (filter === f ? " active" : "")}
                onClick={() => { setFilter(f); setVisible(12); }}>{f}</button>
            ))}
          </div>
          <select
            className="form-select"
            value={sort}
            onChange={(e) => { setSort(e.target.value); setVisible(12); }}
            style={{ width: "auto", padding: "10px 16px", fontSize: 11, letterSpacing: "0.1em" }}
          >
            <option value="newest">Newest</option>
            <option value="premium">Premium First</option>
            <option value="spotlight">Spotlight First</option>
          </select>
        </div>

        {/* Results */}
        {!dbLoaded ? (
  <div className="empty-state" style={{ padding: "60px 0" }}>
    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em" }}>Loading creations...</div>
  </div>
) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: "60px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.3 }}>&#9673;</div>
            <div className="empty-text" style={{ fontSize: 15, marginBottom: 8 }}>
              {search ? `No results for "${search}"` : "No creations in this category yet."}
            </div>
            {search && (
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
                Try searching by creator name, tool, or category.
              </div>
            )}
            {search && (
              <button className="btn-ghost" style={{ marginTop: 20, padding: "10px 24px", fontSize: 11 }}
                onClick={() => setSearch("")}>Clear search</button>
            )}
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", marginBottom: 20 }}>
              {filtered.length} creation{filtered.length !== 1 ? "s" : ""}
              {search ? ` matching "${search}"` : ""}
            </div>
            <div className="creation-grid">
              {filtered.slice(0, visible).map((c) => <CreationCard key={c.id} creation={c} onClick={goDetail} />)}
            </div>
            {visible < filtered.length && (
              <div className="load-more">
                <button className="btn-load" onClick={() => setVisible((v) => v + 12)}>
                  Load more ({filtered.length - visible} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function CreatorsPage({ setPage, setCreatorUser }) {
  const [creators, setCreators] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      const { data, error } = await fetchCreators();
      if (error) console.warn("[RevaultAI] Could not load creators:", error.message);
      setCreators(data ?? []);
      setLoading(false);
    }
    load();
  }, []);
  return (
    <div className="page">
      <div className="page-hdr"><div className="page-hdr-eyebrow">Community</div><div className="page-hdr-title">Creators</div><div className="page-hdr-sub">Meet the people shaping AI-native creative work.</div></div>
      <section className="section">
        {loading ? <div className="empty-state"><div className="empty-text">Loading creators...</div></div> : creators.length === 0 ? <div className="empty-state"><div className="empty-text">No creators yet.</div></div> : (
          <div className="creator-grid">
            {creators.map((c) => (
              <div key={c.id} className="creator-card" onClick={() => { setCreatorUser(c.username); setPage("profile"); }}>
                <CreatorAvatar src={c.avatar_url} name={c.display_name} size={64} className="creator-avatar" />
                <div className="creator-name">{c.display_name || c.username}</div>
                <div className="creator-handle">@{c.username}</div>
                <div className="creator-badges"></div>
                {c.bio ? <div className="creator-bio">{c.bio}</div> : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProfilePage({ username, creations: allCreations, setPage, setDetailId, user }) {
  const [profileData, setProfileData] = useState(null);
  const [profileCreations, setProfileCreations] = useState([]);
  const [stats, setStats] = useState(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    async function load() {
      const { data: prof } = await fetchProfileByUsername(username);
      if (prof) {
        setProfileData(prof);
        const { data: creatns } = await fetchCreationsByUser(prof.id);
        setProfileCreations(creatns ?? []);
        const { data: s } = await fetchCreatorStats(prof.id);
        setStats(s);
        const { count } = await fetchFollowerCount(prof.id);
        setFollowerCount(count);
        if (user?.id) {
          const { isFollowing: following } = await fetchIsFollowing(user.id, prof.id);
          setIsFollowing(following);
        }
      } else {
  setProfileData(null);
}
      setLoading(false);
    }
    load();
  }, [username, user?.id]);

  async function handleFollow() {
  if (!user) return;
  setFollowLoading(true);
  if (isFollowing) {
    const { error } = await unfollowCreator(user.id, profileData.id);
    track("creator_unfollowed", { creator_id: profileData.id, creator_username: profileData.username });
    if (error) { setFollowLoading(false); return; }
    setIsFollowing(false);
    setFollowerCount((n) => Math.max(0, n - 1));
  } else {
    const { error } = await followCreator(user.id, profileData.id);
    track("creator_followed", { creator_id: profileData.id, creator_username: profileData.username });
    if (error) { setFollowLoading(false); return; }
    setIsFollowing(true);
    setFollowerCount((n) => n + 1);
    // Best-effort: email the creator that they have a new follower (non-blocking)
    try {
      const token = await getSessionToken();
      await fetch("/api/notify-follow", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ creatorUserId: profileData.id }),
      });
    } catch (err) {
      console.warn("[RevaultAI] Follow notification failed:", err.message);
    }
  }
  setFollowLoading(false);
}

  if (loading) return <div className="page"><div className="empty-state"><div className="empty-text">Loading profile...</div></div></div>;
  if (!profileData) return <div className="page"><div className="empty-state"><div className="empty-text">Creator not found.</div></div></div>;

  const filtered = profileCreations.filter((c) => {
    if (c.premium_status === "Pending") return false;
    if (filter === "Premium") return c.is_premium;
    if (filter === "Open") return !c.is_premium;
    return true;
  });

  const tipCheck = profileData.tip_url ? normalizeTipUrl(profileData.tip_url) : null;
  const tipUrl = tipCheck && tipCheck.ok ? tipCheck.url : "";
  const hireCheck = profileData.hire_url ? normalizeContactUrl(profileData.hire_url) : null;
  const hireUrl = hireCheck && hireCheck.ok ? hireCheck.url : "";
  const tools = Array.isArray(profileData.tool_links)
    ? profileData.tool_links.filter((t) => t && typeof t.url === "string" && /^https:\/\//i.test(t.url) && t.name)
    : [];

  function goDetail(id) { setDetailId(id); setPage("detail"); }

  return (
    <div className="page">
      <div className="back-btn" onClick={() => setPage("creators")}>&larr; Creators</div>
      <div className="profile-header">
        <CreatorAvatar src={profileData.avatar_url} name={profileData.display_name} size={96} className="profile-avatar" />
        <div style={{ flex: 1 }}>
          <div className="profile-name">{profileData.display_name || profileData.username}</div>
          <div className="profile-handle">@{profileData.username}</div>
          {profileData.bio && <div className="profile-bio">{profileData.bio}</div>}
          {stats && (
            <div style={{ display: "flex", gap: 24, marginTop: 16, flexWrap: "wrap" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{stats.total}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", color: "var(--muted)", textTransform: "uppercase", marginTop: 2 }}>Creations</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--premium)" }}>{stats.premium}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", color: "var(--muted)", textTransform: "uppercase", marginTop: 2 }}>Premium</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{stats.open}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", color: "var(--muted)", textTransform: "uppercase", marginTop: 2 }}>Open</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>{followerCount}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", color: "var(--muted)", textTransform: "uppercase", marginTop: 2 }}>Followers</div>
              </div>
            </div>
          )}
          <div className="profile-actions">
            {user && user.id !== profileData.id && (
              <button
                className={"btn-follow " + (isFollowing ? "followed" : "unfollowed")}
                onClick={handleFollow}
                disabled={followLoading}
                style={{ opacity: followLoading ? 0.6 : 1 }}
              >
                {followLoading ? "..." : isFollowing ? "\u2713 Following" : "+ Follow"}
              </button>
            )}
            {tipUrl && (
              <a
                className="btn-ghost"
                href={tipUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                onClick={() => track("tip_link_clicked", { creator_id: profileData.id, creator_username: profileData.username })}
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                &#9829; Support
              </a>
            )}
            {hireUrl && (
              <a
                className="btn-ghost"
                href={hireUrl}
                target={hireUrl.startsWith("mailto:") ? undefined : "_blank"}
                rel="noopener noreferrer nofollow"
                onClick={() => track("hire_link_clicked", { creator_id: profileData.id, creator_username: profileData.username })}
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                &#9993; Hire Me
              </a>
            )}
          </div>
          {hireUrl && (
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--muted)", letterSpacing: "0.06em", marginTop: 10, lineHeight: 1.5, maxWidth: 360 }}>
              Arrangements are made directly between you and the creator.
            </div>
          )}
          {tools.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 }}>Tools I Use</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {tools.map((t, i) => (
                  <a key={i} href={t.url} target="_blank" rel="noopener noreferrer nofollow" onClick={() => track("affiliate_link_clicked", { creator_username: profileData.username, tool: t.name })} className="detail-tool-tag detail-tool-tag-video" style={{ textDecoration: "none" }}>{t.name} &#8599;</a>
                ))}
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--muted)", letterSpacing: "0.06em", marginTop: 10, lineHeight: 1.5, maxWidth: 360 }}>Some links are affiliate links; the creator may earn a commission.</div>
            </div>
          )}
        </div>
      </div>
      <section className="section">
        <div className="filter-bar">
          {["All", "Premium", "Open"].map((f) => (
            <button key={f} className={"filter-btn" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
        {filtered.length === 0
          ? <div className="empty-state"><div className="empty-text">No creations yet.</div></div>
          : <div className="creation-grid">{filtered.map((c) => <CreationCard key={c.id} creation={c} onClick={goDetail} />)}</div>
        }
      </section>
    </div>
  );
}

function DetailPage({ id, creations, user, purchasedIds, purchasesLoaded, setPage, setCreatorUser, notify }) {
  const creation = creations.find((c) => c.id === id); const [checkingOut, setCheckingOut] = useState(false);
  const [toolMap, setToolMap] = useState({});
  useEffect(() => {
    const creatorId = creation?.user_id;
    if (!creatorId) { setToolMap({}); return; }
    let cancelled = false;
    (async () => {
      const { data } = await fetchProfile(creatorId);
      if (cancelled) return;
      const map = {};
      const links = Array.isArray(data?.tool_links) ? data.tool_links : [];
      for (const t of links) {
        if (t && typeof t.url === "string" && /^https:\/\//i.test(t.url) && t.name) {
          map[t.name.trim().toLowerCase()] = t.url;
        }
      }
      setToolMap(map);
    })();
    return () => { cancelled = true; };
  }, [creation?.user_id]);
  if (!creation) return <div className="page"><div className="empty-state"><div className="empty-text">Creation not found.</div></div></div>;
  const licenseCheck = creation.license_url ? normalizeContactUrl(creation.license_url) : null;
  const licenseUrl = licenseCheck && licenseCheck.ok ? licenseCheck.url : "";
  const isPending = creation.premium_status === "Pending"; const hasVideo = !!creation.video_url; const posterImg = creation.thumbnail_image || creation.hero_image; const purchased = purchasedIds.has(creation.id); const unlocked = !creation.is_premium || purchased;
const purchaseLoading = creation.is_premium && !purchasesLoaded; const priceLabel = creation.price_cents ? "$" + (creation.price_cents / 100).toFixed(2) : "$4.99";
  async function handleBuy() {
  if (!user) { notify("Sign in to purchase."); return; }
  setCheckingOut(true);
  track("purchase_started", { creation_id: creation.id, title: creation.title, price_cents: creation.price_cents });
  try {
    const { url, error } = await createCheckoutSession(creation.id, user.id);
    if (error) {
      notify("Checkout failed: " + error.message + ". Please try again.");
      setCheckingOut(false);
      return;
    }
    window.location.href = url;
  } catch (err) {
    notify("Checkout failed: " + err.message + ". Please try again.");
    setCheckingOut(false);
  }
}
  return (
    <div className="page detail-page">
      <div className="detail-cinema"><div className="detail-cinema-inner"><div className="detail-back" onClick={() => setPage("explore")}>&larr; Archive</div>{hasVideo && unlocked ? <video src={creation.video_url} poster={posterImg} controls playsInline /> : <img className="detail-still" src={posterImg} alt={creation.title} />}</div></div>
      <div className="detail-editorial-strip"><div className="detail-editorial-inner">
        <div className="detail-editorial-left"><div className="detail-eyebrow"><div className="detail-eyebrow-line" />{creation.category}</div><h1 className="detail-title">{creation.title}</h1><div className="detail-creator-row"><span className="detail-creator-link" onClick={() => { setCreatorUser(creation.creator.username); setPage("profile"); }}>{creation.creator.display_name}</span><span className="detail-creator-sep">&#183;</span><span className="detail-category-tag">{creation.category}</span></div><div className="detail-tools-row">{creation.tools_used.map((t) => { const href = toolMap[String(t).trim().toLowerCase()]; return href ? <a key={t} href={href} target="_blank" rel="noopener noreferrer nofollow" onClick={() => track("affiliate_link_clicked", { creation_id: creation.id, tool: t })} className="detail-tool-tag detail-tool-tag-video" style={{ textDecoration: "none" }}>{t} &#8599;</a> : <span key={t} className="detail-tool-tag">{t}</span>; })}{hasVideo && unlocked && <span className="detail-tool-tag detail-tool-tag-video">&#9654; Film</span>}</div>{creation.tools_used.some((t) => toolMap[String(t).trim().toLowerCase()]) && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--muted)", letterSpacing: "0.06em", marginTop: 10, lineHeight: 1.5 }}>Some tool links are affiliate links; the creator may earn a commission.</div>}</div>
        <div className="detail-editorial-right"><div className="detail-badges-row">{creation.is_premium ? <Badge type="Premium" /> : <Badge type="Open" />}{isPending && <Badge type="review" />}</div>{licenseUrl && (<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, marginTop: 4 }}><a className="btn-ghost" href={licenseUrl} target={licenseUrl.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer nofollow" onClick={() => track("license_link_clicked", { creation_id: creation.id, title: creation.title })} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>&#9878; License This</a><span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--muted)", letterSpacing: "0.06em", maxWidth: 200, textAlign: "right", lineHeight: 1.5 }}>Arrangements are made directly between you and the creator.</span></div>)}</div>
      </div></div>
      <div className="detail-body"><div className="detail-rule" /><div className="detail-section-label">Production Note<div className="detail-section-label-line" /></div>
        <div className="prompt-box">
          {isPending ? <p className="prompt-text" style={{ color: "var(--muted)", fontStyle: "italic" }}>Under review.</p>
          : unlocked ? <><p className="prompt-text">{creation.prompt_full}</p>{hasVideo && creation.is_premium && <div className="unlock-area"><a href={creation.video_url} download className="btn-unlock-restrained" style={{ textDecoration: "none", display: "inline-block" }}>&#11015; Download Film</a></div>}</>
          : purchaseLoading
  ? <div className="unlock-area"><span className="unlock-label" style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em" }}>Checking purchase status...</span></div>
  : <><div className="prompt-fade"><p className="prompt-text">{creation.prompt_preview}</p></div><div className="unlock-area"><span className="unlock-label">Full prompt {hasVideo ? "and film download" : ""} available after purchase.</span><button className="btn-unlock-restrained" onClick={handleBuy} disabled={checkingOut} style={{ opacity: checkingOut ? 0.6 : 1 }}>
  {checkingOut ? "Opening checkout..." : "Unlock for " + priceLabel}
</button></div></>}
        </div>
      </div>
    </div>
  );
}

function AdminPage({ creations, setCreations, notify }) {
  const pending = creations.filter((c) => c._fromDb && c.premium_status === "Pending"); const spotlightCount = creations.filter((c) => c._fromDb && c.spotlight).length;
  async function approve(id) {
  const item = creations.find((c) => c.id === id);
  if (!item?._fromDb) { notify("Cannot modify seed creations."); return; }
  const { error } = await updateCreationStatus(id, "Approved");
  if (error) { notify("Error: " + error.message); return; }
  const { data } = await fetchCreations();
  if (data) setCreations(data);
  track("creation_approved", { creation_id: id, title: item.title });
  notify("Approved.");
  // Send email notification
  try {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token ?? "";
    await fetch("/api/notify-approval", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({
        creationId: id,
        creationTitle: item.title,
        creatorUserId: item.user_id,
      }),
    });
  } catch (err) {
    console.warn("[RevaultAI] Email notification failed:", err.message);
  }
}
async function reject(id) {
  const item = creations.find((c) => c.id === id);
  if (!item?._fromDb) { notify("Cannot modify seed creations."); return; }
  const { error } = await updateCreationStatus(id, "Rejected");
  if (error) { notify("Error: " + error.message); return; }
  const { data } = await fetchCreations();
  if (data) setCreations(data);
  track("creation_rejected", { creation_id: id, title: item.title });
  notify("Rejected.");
}
async function toggleSpotlight(id) {
  const item = creations.find((c) => c.id === id);
  const wasSpotlit = item?.spotlight;
  if (!item) return;
  if (!item?._fromDb) { notify("Cannot modify seed creations."); return; }
  if (!item.spotlight && spotlightCount >= 3) { notify("Spotlight limited to 3."); return; }
  const { error } = await updateCreationSpotlight(id, !item.spotlight);
  if (error) { notify("Error: " + error.message); return; }
  const { data } = await fetchCreations();
  if (data) setCreations(data);
  track(wasSpotlit ? "spotlight_removed" : "spotlight_added", { creation_id: id });
}
async function reject(id) {
  const { error } = await updateCreationStatus(id, "Rejected");
  if (error) { notify("Error: " + error.message); return; }
  setCreations((prev) => prev.map((c) => c.id === id ? { ...c, premium_status: "Rejected" } : c));
  notify("Rejected.");
}
async function toggleSpotlight(id) {
  const item = creations.find((c) => c.id === id);
if (!item) return;
if (!item?._fromDb) { notify("Cannot modify seed creations."); return; }
  if (!item.spotlight && spotlightCount >= 3) { notify("Spotlight limited to 3."); return; }
  const { error } = await updateCreationSpotlight(id, !item.spotlight);
  if (error) { notify("Error: " + error.message); return; }
  setCreations((prev) => prev.map((c) => c.id === id ? { ...c, spotlight: !c.spotlight } : c));
}
  const eligible = creations.filter((c) => c._fromDb && c.premium_status !== "Pending" && c.premium_status !== "Rejected");
  return (
    <div className="page">
      <div className="page-hdr"><div className="page-hdr-eyebrow">Internal</div><div className="page-hdr-title">Admin</div></div>
      <section className="section">
        <div style={{ marginBottom: 64 }}>
          <div className="section-label">Pending Review</div>
          {pending.length === 0 ? <div style={{ color: "var(--muted)", fontSize: 13, padding: "24px 0", fontFamily: "'DM Mono', monospace" }}>No pending submissions.</div> : (
            <table className="admin-table"><thead><tr><th>Title</th><th>Creator</th><th>Category</th><th>Actions</th></tr></thead><tbody>{pending.map((c) => (<tr key={c.id}><td style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18 }}>{c.title}</td><td style={{ color: "var(--muted)" }}>{c.creator.display_name}</td><td style={{ color: "var(--muted)", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{c.category}</td><td><button className="btn-approve" onClick={() => approve(c.id)}>Approve</button><button className="btn-reject" onClick={() => reject(c.id)}>Reject</button></td></tr>))}</tbody></table>
          )}
        </div>
        <div>
          <div className="section-label">Spotlight Control</div>
          <p style={{ color: "var(--muted)", fontSize: 11, marginBottom: 24, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>{spotlightCount}/3 active</p>
          <table className="admin-table"><thead><tr><th>Title</th><th>Creator</th><th>Type</th><th>Spotlight</th></tr></thead><tbody>{eligible.map((c) => (<tr key={c.id}><td style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18 }}>{c.title}</td><td style={{ color: "var(--muted)" }}>{c.creator.display_name}</td><td>{c.is_premium ? <Badge type="Premium" /> : <Badge type="Open" />}</td><td><div className={"spotlight-toggle" + (c.spotlight ? " active" : "")} onClick={() => toggleSpotlight(c.id)}><div className="spotlight-dot" />{c.spotlight ? "In Spotlight" : "Add to Spotlight"}</div></td></tr>))}</tbody></table>
        </div>
      </section>
    </div>
  );
}

function SubmitPage({ setCreations, notify, setPage, user, profile }) {
  const [form, setForm] = useState({ title: "", tools: "", category: "Abstract", prompt: "", isPremium: false, licenseUrl: "" });
  const [videoFile, setVideoFile] = useState(null); const [uploadState, setUploadState] = useState("idle"); const [uploadPct, setUploadPct] = useState(0); const [uploadResult, setUploadResult] = useState(null); const [uploadError, setUploadError] = useState(null); const [dragover, setDragover] = useState(false); const [submitting, setSubmitting] = useState(false);
  function updateField(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }
  function formatBytes(b) { if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB"; return (b / (1024 * 1024)).toFixed(1) + " MB"; }
  function pickFile(file) { if (!file) return; const allowed = ["video/mp4", "video/quicktime", "video/webm"]; if (!allowed.includes(file.type)) { setUploadError("Only MP4, MOV, or WebM files are accepted."); return; } if (file.size > 500 * 1024 * 1024) { setUploadError("File exceeds 500 MB limit."); return; } setVideoFile(file); setUploadState("idle"); setUploadResult(null); setUploadError(null); setUploadPct(0); }
  function clearFile() { setVideoFile(null); setUploadState("idle"); setUploadResult(null); setUploadError(null); setUploadPct(0); }
  async function uploadToR2() {
  if (!videoFile) return;
  setUploadState("uploading"); setUploadError(null); setUploadPct(0);
track("upload_started");

  let token;
try {
  token = await getSessionToken();
} catch (err) {
  setUploadError("Session expired. Please sign in again and retry.");
  setUploadState("error");
  return;
}
const authHeader = { "Authorization": "Bearer " + token, "Content-Type": "application/json" };

  // Step 1: get presigned URL from server
  let uploadUrl, videoPublicUrl;
  try {
    const res = await fetch("/api/get-upload-url", {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({ fileType: videoFile.type }),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error || "Could not get upload URL."); }
    const json = await res.json();
    uploadUrl = json.uploadUrl;
    videoPublicUrl = json.videoPublicUrl;
  } catch (err) { setUploadError(err.message); setUploadState("error"); return; }

  // Step 2: upload directly to R2 via presigned URL (no Vercel size limit)
  try {
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", videoFile.type);
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100));
      });
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error("R2 upload failed with status " + xhr.status));
      });
      xhr.addEventListener("error", () => reject(new Error("Network error during upload.")));
      xhr.send(videoFile);
    });
  } catch (err) { setUploadError(err.message); setUploadState("error"); return; }

  setUploadPct(100);
  setUploadState("processing");

  // Step 3: send to Mux for processing
  try {
    const res = await fetch("/api/process-video", {
  method: "POST",
  headers: authHeader,
  body: JSON.stringify({ videoPublicUrl, creationId: "pending" }),
});
    const result = await res.json();
    
setUploadResult(result); setUploadState("done");
track("upload_completed");
  } catch (err) { setUploadError(err.message); setUploadState("error"); }
}
  async function handleSubmit() {
    if (!form.title.trim() || !form.prompt.trim()) { notify("Please fill in Title and Prompt."); return; }
    if (videoFile && uploadState !== "done") { notify("Please wait for your video to finish uploading."); return; }
    const license = normalizeContactUrl(form.licenseUrl);
    if (!license.ok) { notify(license.error); return; }
    setSubmitting(true);
    const toolList = form.tools.split(",").map((t) => t.trim()).filter(Boolean);
    const fallbackThumb = "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&q=90";

    // If user spent time filling the form, Mux may already be done — check before inserting
    let resolvedUpload = uploadResult;
    if (uploadResult?.mux_asset_id) {
      try {
        const token = await getSessionToken();
        const statusRes = await fetch("/api/mux-status", {
          method: "POST",
          headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify({ mux_asset_id: uploadResult.mux_asset_id }),
        });
        if (statusRes.ok) {
          const status = await statusRes.json();
          if (status.ready) {
            resolvedUpload = { ...uploadResult, thumbnail_image: status.thumbnail_image, preview_video: status.preview_video };
          }
        }
      } catch { /* non-critical, proceed with placeholder */ }
    }

    const newCreation = { id: "u" + Date.now(), title: form.title.trim(), creator: { username: profile?.username ?? user?.email?.split("@")[0] ?? "you", display_name: profile?.display_name ?? user?.email?.split("@")[0] ?? "You", avatar_url: profile?.avatar_url ?? "" }, hero_image: resolvedUpload?.thumbnail_image || fallbackThumb, thumbnail_image: resolvedUpload?.thumbnail_image || fallbackThumb, video_url: resolvedUpload?.video_url || "", preview_video: resolvedUpload?.preview_video || "", tools_used: toolList.length > 0 ? toolList : ["Unknown"], category: form.category, is_premium: form.isPremium, premium_status: form.isPremium ? "Pending" : null, prompt_preview: form.isPremium ? form.prompt.trim().slice(0, 120) + "..." : null, prompt_full: form.prompt.trim(), spotlight: false, mux_asset_id: resolvedUpload?.mux_asset_id || null, license_url: license.url, user_id: user?.id ?? null };
    
setCreations((prev) => [newCreation, ...prev]);
const { data: saved, error } = await insertCreation(newCreation, user, profile);
    if (error) { console.error("[RevaultAI] Supabase insert failed:", error.message); notify("Saved locally -- could not reach the database."); }
    else if (saved) { setCreations((prev) => prev.map((c) => (c.id === newCreation.id ? saved : c))); }
    setSubmitting(false); setPage("explore");
    track("creation_submitted", { title: newCreation.title, category: newCreation.category, is_premium: newCreation.is_premium });
    if (!error) notify(form.isPremium ? "Submitted for review." : "Creation is now live on RevaultAI.");

    // Notify admin of every new submission (premium = awaiting review, open = already live)
    if (!error) {
      try {
        const token = await getSessionToken();
        await fetch("/api/notify-submission", {
          method: "POST",
          headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify({ title: newCreation.title, creatorName: newCreation.creator.display_name, category: newCreation.category, isPremium: form.isPremium }),
        });
      } catch (err) {
        console.warn("[RevaultAI] Submission notification failed:", err.message);
      }
    }

    // Re-fetch after Mux finishes processing to replace placeholder thumbnail
    if (uploadResult?.mux_asset_id) {
      const refresh = async () => {
        const { data } = await fetchCreations();
        if (data) { setCreations(data); }
      };
      const t1 = setTimeout(refresh, 45000);
      const t2 = setTimeout(refresh, 90000);
      // Best-effort cleanup if component unmounts; timeouts are fire-and-forget otherwise
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }
  return (
    <div className="page">
      <div className="page-hdr"><div className="page-hdr-eyebrow">Publish</div><div className="page-hdr-title">Submit Creation</div><div className="page-hdr-sub">Share your AI-native work with the community.</div></div>
      <section className="section">
        <div style={{ maxWidth: 640 }}>
          <div className="form-group"><label className="form-label">Title *</label><input className="form-input" placeholder="Name your creation" value={form.title} onChange={(e) => updateField("title", e.target.value)} /></div>
          <div className="form-group">
            <label className="form-label">Film / Video</label>
            {!videoFile ? (
              <div className={"upload-drop" + (dragover ? " dragover" : "")} onDragOver={(e) => { e.preventDefault(); setDragover(true); }} onDragLeave={() => setDragover(false)} onDrop={(e) => { e.preventDefault(); setDragover(false); pickFile(e.dataTransfer.files[0]); }}>
                <input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(e) => pickFile(e.target.files[0])} />
                <div className="upload-drop-icon">&#9654;</div><div className="upload-drop-label">Drop your film here or click to browse</div><div className="upload-drop-hint">MP4, MOV, WebM &middot; max 500 MB</div>
              </div>
            ) : (
              <><div className="upload-file-info"><span className="upload-file-name">{videoFile.name}</span><span className="upload-file-size">{formatBytes(videoFile.size)}</span>{uploadState !== "uploading" && <button className="upload-file-clear" onClick={clearFile}>&#10005;</button>}</div>
              {uploadState === "idle" && <button className="btn-primary" style={{ marginTop: 12, padding: "10px 24px", fontSize: 11 }} onClick={uploadToR2}>Upload to Vault</button>}
              {uploadState === "uploading" && <div className="upload-progress-wrap"><div className="upload-progress-bar-bg"><div className="upload-progress-bar" style={{ width: uploadPct + "%" }} /></div><div className="upload-progress-label"><span>Uploading...</span><span>{uploadPct}%</span></div></div>}
{uploadState === "processing" && <div className="upload-progress-wrap"><div className="upload-progress-bar-bg"><div className="upload-progress-bar" style={{ width: "100%", opacity: 0.6, animation: "pulse 1.5s ease-in-out infinite" }} /></div><div className="upload-progress-label"><span>Submitting to vault...</span><span>Almost done</span></div></div>}
{uploadState === "done" && <div className="upload-success">&#10003;&nbsp; Upload complete</div>}
              {uploadState === "error" && <><div className="upload-error">{uploadError}</div><button className="btn-primary" style={{ marginTop: 10, padding: "9px 20px", fontSize: 11 }} onClick={uploadToR2}>Retry Upload</button></>}</>
            )}
          </div>
          <div className="form-group"><label className="form-label">Tools Used</label><input className="form-input" placeholder="Sora, Runway, MidJourney" value={form.tools} onChange={(e) => updateField("tools", e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Category</label><select className="form-select" value={form.category} onChange={(e) => updateField("category", e.target.value)}>{CATEGORIES.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Prompt *</label><textarea className="form-textarea" placeholder="Describe your full prompt in detail..." value={form.prompt} onChange={(e) => updateField("prompt", e.target.value)} /></div>
          <div className="form-group"><div className="toggle-row"><div className={"toggle" + (form.isPremium ? " on" : "")} onClick={() => updateField("isPremium", !form.isPremium)}><div className="toggle-knob" /></div><div><div className="toggle-label">Premium Prompt</div><div className="toggle-sub">{form.isPremium ? "Prompt paywalled, requires admin approval." : "Prompt freely visible to all."}</div></div></div></div>
          <div className="form-group">
            <label className="form-label">License This Link</label>
            <input className="form-input" type="text" inputMode="url" placeholder="https://yoursite.com/licensing  or  you@email.com" value={form.licenseUrl} onChange={(e) => updateField("licenseUrl", e.target.value)} maxLength={500} />
            <div className="form-hint">Optional. Where people can ask to license this piece: a licensing page or your email. Shown as a button on this creation's page. Web links must start with https://.</div>
          </div>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting || uploadState === "uploading" || uploadState === "processing"} style={{ opacity: (submitting || uploadState === "uploading") ? 0.6 : 1 }}>{submitting ? "Submitting..." : "Submit Creation"}</button>
        </div>
      </section>
    </div>
  );
}

function SetPasswordPage({ notify, setPage }) {
  const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  async function handleSubmit(e) { e.preventDefault(); setError(null); if (password !== confirmPassword) { setError("Passwords do not match."); return; } if (password.length < 6) { setError("Minimum 6 characters."); return; } setLoading(true); const { error: err } = await supabase.auth.updateUser({ password }); setLoading(false); if (err) { setError(err.message); return; } notify("Password updated."); setPage("home"); }
  return (
    <div className="page"><div className="page-hdr"><div className="page-hdr-title">Set New Password</div></div><section className="section"><div style={{ maxWidth: 480 }}><form onSubmit={handleSubmit}><div className="form-group"><label className="form-label">New Password</label><input className="form-input" type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoFocus /></div><div className="form-group"><label className="form-label">Confirm Password</label><input className="form-input" type="password" placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} /></div>{error && <div className="auth-error">{error}</div>}<button className="btn-primary" type="submit" disabled={loading}>{loading ? "Updating..." : "Update Password"}</button></form></div></section></div>
  );
}

function EmailConfirmedPage({ setPage }) {
  return <div className="page"><div className="empty-state" style={{ paddingTop: 120 }}><div className="empty-text" style={{ color: "var(--text)", fontSize: 18, marginBottom: 12 }}>Email confirmed.</div><div className="empty-text" style={{ marginBottom: 32 }}>Your account is now active.</div><button className="btn-primary" onClick={() => setPage("home")}>Back to Home</button></div></div>;
}
function PurchaseSuccessPage({ setPage, setDetailId, creations }) {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");
  const [title, setTitle] = useState(null);
  const [creationId, setCreationId] = useState(null);

  useEffect(() => {
    async function load() {
      if (!sessionId) return;
      try {
        const res = await fetch("/api/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const json = await res.json();
        if (json.creation_id) {
          setCreationId(json.creation_id);
          const creation = creations.find((c) => c.id === json.creation_id);
          if (creation) setTitle(creation.title);
        }
      } catch {}
    }
    load();
  }, [sessionId]);

  return (
    <div className="page">
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "120px 48px 80px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 24 }}>&#10003;</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 300, color: "var(--text)", marginBottom: 12 }}>
          Purchase confirmed.
        </div>
        {title && (
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "var(--accent)", marginBottom: 8, letterSpacing: "0.08em" }}>
            {title}
          </div>
        )}
        <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 40, lineHeight: 1.7 }}>
          The full prompt{title ? ` for "${title}"` : ""} is now unlocked. You can access it any time from the archive.
        </div>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {creationId && (
            <button className="btn-primary" onClick={() => { setDetailId(creationId); setPage("detail"); }}>
              View Unlocked Creation
            </button>
          )}
          <button className="btn-ghost" onClick={() => setPage("explore")}>
            Back to Archive
          </button>
        </div>
      </div>
    </div>
  );
}
function LegalPage({ setPage, page }) {
  const content = {
    terms: {
      title: "Terms of Service",
      updated: "May 2025",
      body: `
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using RevaultAI, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.</p>
        <h2>2. Platform Use</h2>
        <p>RevaultAI is a platform for sharing AI-generated creative content. You must be at least 18 years old to create an account or make purchases. You are responsible for all activity under your account.</p>
        <h2>3. Content Submissions</h2>
        <p>By submitting content to RevaultAI, you represent that you have the right to share it and grant RevaultAI a non-exclusive license to display it on the platform. You retain ownership of your original prompts and creative work.</p>
        <h2>4. Premium Purchases</h2>
        <p>Premium prompt purchases are processed via Stripe. All sales are subject to our Refund Policy. RevaultAI reserves the right to revoke access to content that violates these terms.</p>
        <h2>5. Prohibited Content</h2>
        <p>You may not submit content that is illegal, harmful, deceptive, or violates the rights of others. RevaultAI reserves the right to remove any content and terminate any account at its discretion.</p>
        <h2>6. Disclaimers</h2>
        <p>RevaultAI is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the platform.</p>
        <h2>7. Changes to Terms</h2>
        <p>We may update these terms at any time. Continued use of RevaultAI after changes constitutes acceptance of the new terms.</p>
        <h2>8. Contact</h2>
        <p>For questions about these terms, contact us at richardgarland999@gmail.com.</p>
      `
    },
    privacy: {
      title: "Privacy Policy",
      updated: "May 2025",
      body: `
        <h2>1. Information We Collect</h2>
        <p>We collect your email address when you create an account. We also collect content you submit, profile information you provide, and usage data through standard server logs.</p>
        <h2>2. How We Use Your Information</h2>
        <p>We use your information to operate RevaultAI, process payments, send approval notifications, and improve the platform. We do not sell your personal data to third parties.</p>
        <h2>3. Third-Party Services</h2>
        <p>RevaultAI uses the following third-party services: Supabase (database and auth), Cloudflare R2 (video storage), Mux (video processing), Stripe (payments), and Resend (email). Each has their own privacy policy.</p>
        <h2>4. Cookies</h2>
        <p>We use cookies and local storage to maintain your session. No advertising or tracking cookies are used.</p>
        <h2>5. Data Retention</h2>
        <p>Your account data is retained until you request deletion. You may contact us at any time to request deletion of your account and associated data.</p>
        <h2>6. Security</h2>
        <p>We use industry-standard security practices including encrypted connections and hashed credentials. No system is perfectly secure and we cannot guarantee absolute security.</p>
        <h2>7. Contact</h2>
        <p>For privacy questions or data deletion requests, contact us at richardgarland999@gmail.com.</p>
      `
    },
    refunds: {
      title: "Refund Policy",
      updated: "May 2025",
      body: `
        <h2>Digital Content Policy</h2>
        <p>All purchases on RevaultAI are for digital content (AI-generated prompts and creative works). Due to the nature of digital goods, all sales are final once the content has been accessed.</p>
        <h2>Eligible Refunds</h2>
        <p>We will issue a full refund if: the content was not delivered due to a technical error on our end, or the content significantly differs from what was described.</p>
        <h2>How to Request a Refund</h2>
        <p>Contact us at richardgarland999@gmail.com within 7 days of purchase with your order details. We review all requests within 3 business days.</p>
        <h2>Chargebacks</h2>
        <p>Filing a chargeback without contacting us first may result in account suspension. We encourage you to reach out directly — we want to make things right.</p>
      `
    },
    dmca: {
      title: "DMCA Policy",
      updated: "May 2025",
      body: `
        <h2>Copyright Policy</h2>
        <p>RevaultAI respects intellectual property rights and expects users to do the same. We respond to valid DMCA takedown notices in accordance with the Digital Millennium Copyright Act.</p>
        <h2>Reporting Infringement</h2>
        <p>If you believe content on RevaultAI infringes your copyright, send a written notice to richardgarland999@gmail.com including:</p>
        <ul>
          <li>Your contact information</li>
          <li>A description of the copyrighted work</li>
          <li>The URL of the allegedly infringing content</li>
          <li>A statement that you believe in good faith the use is unauthorized</li>
          <li>Your electronic or physical signature</li>
        </ul>
        <h2>Counter-Notices</h2>
        <p>If you believe your content was removed in error, you may file a counter-notice with the same contact information above.</p>
        <h2>Repeat Infringers</h2>
        <p>RevaultAI will terminate accounts of users who repeatedly infringe copyrights.</p>
      `
    },
    "ai-disclaimer": {
      title: "AI Content Disclaimer",
      updated: "May 2025",
      body: `
        <h2>Nature of Content</h2>
        <p>All content on RevaultAI is generated using artificial intelligence tools including but not limited to Sora, Runway, MidJourney, Kling, and Stable Diffusion. This content is synthetic and does not depict real events, real people, or factual information unless explicitly stated.</p>
        <h2>No Endorsement</h2>
        <p>The presence of AI-generated content on RevaultAI does not constitute endorsement of any particular AI tool, company, or viewpoint.</p>
        <h2>Prompt Ownership</h2>
        <p>Creators retain ownership of their original prompts. The AI-generated outputs may be subject to the terms of the respective AI platforms used to create them.</p>
        <h2>Accuracy and Reliability</h2>
        <p>AI-generated content may contain inaccuracies, artifacts, or unintended outputs. RevaultAI does not guarantee the accuracy or appropriateness of any AI-generated content.</p>
        <h2>Responsible Use</h2>
        <p>Users are expected to use AI tools responsibly and in accordance with each platform's terms of service. Content that depicts real individuals without consent, or that is harmful or deceptive, is prohibited on RevaultAI.</p>
      `
    },
  };

  const c = content[page];
  if (!c) return null;

  return (
    <div className="page">
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 48px" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 12, cursor: "pointer" }} onClick={() => setPage("home")}>
          &larr; RevaultAI
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 300, color: "var(--text)", marginBottom: 8 }}>{c.title}</h1>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", marginBottom: 48 }}>Last updated: {c.updated}</div>
        <div
          style={{ color: "var(--muted)", lineHeight: 1.8, fontSize: 14 }}
          dangerouslySetInnerHTML={{ __html: c.body.replace(/<h2>/g, '<h2 style="font-family: \'Syne\', sans-serif; font-size: 14px; font-weight: 600; color: var(--text); text-transform: uppercase; letter-spacing: 0.1em; margin: 32px 0 12px;">').replace(/<ul>/g, '<ul style="padding-left: 24px; margin: 12px 0;">').replace(/<li>/g, '<li style="margin-bottom: 8px;">').replace(/<p>/g, '<p style="margin-bottom: 16px;">') }}
        />
      </div>
    </div>
  );
}
async function getSessionToken() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  return token;
}
function FAQPage({ setPage }) {
  const faqs = [
    {
      q: "What is RevaultAI?",
      a: "RevaultAI is a curated archive of AI-generated films, short films, images, animations, and creative works. We exist to surface the best AI-native content from the world's most skilled AI artists — and make it discoverable, purchasable, and inspiring."
    },
    {
      q: "What makes RevaultAI different?",
      a: "Most platforms are feeds. RevaultAI is a vault. Every creation is reviewed before it goes live. We don't optimize for volume — we optimize for quality. The result is a platform where every piece of content is worth your time."
    },
    {
      q: "What are Premium Prompts?",
      a: "Premium Prompts are the full, detailed creative briefs behind a creator's AI-generated work. They include model settings, camera directions, lighting notes, sound design guidance, and the exact language used to produce the result. They are the creative DNA of the work."
    },
    {
      q: "How do purchases work?",
      a: "Click 'Unlock' on any premium creation. You'll be taken to a secure Stripe checkout. After payment, the full prompt is permanently unlocked for your account. You can access it any time from the creation page."
    },
    {
      q: "Can I download the videos?",
      a: "Film downloads are a premium benefit. Purchasing a premium creation unlocks both the full prompt and a download of the finished film. Open creations are free to watch on the platform."
    },
    {
      q: "Who owns uploaded content?",
      a: "Creators retain full ownership of their work. By submitting to RevaultAI, creators grant us a non-exclusive license to display their content on the platform. Purchasing a prompt does not transfer ownership — it grants you a personal license to use the creative brief for your own work."
    },
    {
      q: "What AI tools are supported?",
      a: "RevaultAI supports content created with any AI tool — Sora, Runway, MidJourney, Kling, Stable Diffusion, Pika, Luma, and beyond. We are tool-agnostic. What matters is the quality of the output and the craft behind the prompt."
    },
    {
      q: "How do I become a featured creator?",
      a: "Submit your best work through the Submit page. Every submission is reviewed by the RevaultAI team. Creators who consistently produce high-quality work are eligible for Spotlight placement and featured positions on the homepage."
    },
    {
      q: "How does Spotlight work?",
      a: "Spotlight is our curated selection of up to three exceptional creations displayed prominently on the homepage and Explore page. Spotlight is hand-picked by the RevaultAI team and rotates regularly. It is the highest visibility placement on the platform."
    },
    {
      q: "Will there be more ways for creators to earn?",
      a: "Yes. Today, creators earn by selling premium prompts. We're actively exploring additional ways for creators to be rewarded for exceptional work, and we'll share details here as they become available. RevaultAI is built creator-first — earning included."
    },
    {
      q: "How do refunds work?",
      a: "All purchases are for digital content and are final once the prompt has been accessed. If you experienced a technical issue that prevented delivery, contact us at richardgarland999@gmail.com within 7 days of purchase and we will make it right."
    },
  ];

  const [open, setOpen] = useState(null);

  return (
    <div className="page">
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 48px" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 12, cursor: "pointer" }} onClick={() => setPage("home")}>
          &larr; RevaultAI
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 300, color: "var(--text)", marginBottom: 8 }}>
          Frequently Asked Questions
        </h1>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 56 }}>
          Everything you need to know about RevaultAI.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{ borderTop: "1px solid var(--border)", padding: "24px 0" }}>
              <div
                onClick={() => setOpen(open === i ? null : i)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer", gap: 24 }}
              >
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 600, color: "var(--text)", lineHeight: 1.4 }}>
                  {faq.q}
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, color: "var(--accent)", flexShrink: 0, marginTop: 2 }}>
                  {open === i ? "−" : "+"}
                </div>
              </div>
              {open === i && (
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 1.8, marginTop: 16, letterSpacing: "0.02em" }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--border)" }} />
        </div>
      </div>
    </div>
  );
}
function ContactPage({ setPage }) {
  const contacts = [
    { category: "General Support", description: "Questions about your account, purchases, or how the platform works.", email: "richardgarland999@gmail.com", response: "We respond within 48 hours." },
    { category: "Creator Inquiries", description: "Questions about submitting work, prompt pricing, or becoming a featured creator.", email: "richardgarland999@gmail.com", response: "We respond within 48 hours." },
    { category: "Copyright and DMCA", description: "To report infringing content or file a DMCA takedown notice.", email: "richardgarland999@gmail.com", response: "We respond within 24 hours." },
    { category: "Business and Partnerships", description: "Licensing inquiries, brand partnerships, or press requests.", email: "richardgarland999@gmail.com", response: "We respond within 5 business days." },
  ];
  return (
    <div className="page">
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 48px" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 12, cursor: "pointer" }} onClick={() => setPage("home")}>← RevaultAI</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 300, color: "var(--text)", marginBottom: 8 }}>Contact</h1>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 56 }}>We are a small team. We read every message.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {contacts.map((c, i) => (
            <div key={i} style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>{c.category}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 1.7, marginBottom: 12 }}>{c.description}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>{c.response}</div>
                </div>
                <a href={"mailto:" + c.email} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--accent)", letterSpacing: "0.1em", textDecoration: "none", border: "1px solid var(--accent)", padding: "10px 20px", borderRadius: 4, whiteSpace: "nowrap", alignSelf: "flex-start" }}>{c.email}</a>
              </div>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--border)" }} />
        </div>
        <div style={{ marginTop: 64, padding: "32px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>Before You Write</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.8 }}>Many questions are answered in our <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => setPage("faq")}>FAQ</span>. For purchase issues please include your order email and the creation title. For DMCA notices please review our <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => setPage("dmca")}>DMCA Policy</span> before writing.</div>
        </div>
      </div>
    </div>
  );
}
function GuidelinesPage({ setPage }) {
  return (
    <div className="page">
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 48px" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 12, cursor: "pointer" }} onClick={() => setPage("home")}>← RevaultAI</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 300, color: "var(--text)", marginBottom: 8 }}>Submission Guidelines</h1>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 56 }}>What we accept. What we reject. How to get featured.</div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Accepted Content</div>
          {["AI films and short films", "AI animations", "AI music visuals", "Experimental AI cinema", "AI-generated narrative works"].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)" }}>{item}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Quality Requirements</div>
          {[
            ["Clear title", "Your title should describe the work — not just 'Untitled' or 'Test'."],
            ["Complete prompt", "Free prompts minimum 50 words. Premium prompts minimum 150 words with model settings, camera direction, and lighting notes."],
            ["Original work", "You must own or have rights to the content you submit. AI-generated content must be your original creative work."],
            ["High-quality video", "Minimum 1080p. No watermarks, no platform logos, no TikTok borders. No slideshows of static images — content must have motion."],
            ["Cinematic first frame", "Mux generates your thumbnail from frame 0. Make it count. No black frames or title cards at the start."],
          ].map(([title, desc], i) => (
            <div key={i} style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>{title}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Not Allowed</div>
          {["Spam or duplicate submissions", "Stolen or plagiarized content", "Hate speech or discriminatory content", "Illegal content of any kind", "Low-effort uploads with vague or missing prompts", "Content depicting real people without consent", "Political content or misinformation"].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#F87171", flexShrink: 0 }} />
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)" }}>{item}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Submission Types</div>
          {[
            ["Open Submissions", "Free to unlock. Your prompt is publicly visible. Great for building your audience and showcasing your range."],
            ["Premium Submissions", "Priced at $4.99. Your full prompt is locked behind a purchase. Buyers receive permanent access. You earn visibility and credibility on a premium platform."],
            ["Spotlight Eligibility", "Spotlight is hand-picked by the RevaultAI team. To be considered, your work must be approved, have a complete profile with bio and avatar, and represent exceptional quality. Spotlight rotates weekly."],
          ].map(([title, desc], i) => (
            <div key={i} style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 600, color: "var(--accent)", marginBottom: 8 }}>{title}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 32 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.8 }}>
            All submissions are reviewed within 48 hours. Questions? <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => setPage("contact")}>Contact us.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
function PremiumPromptsPage({ setPage }) {
  return (
    <div className="page">
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 48px" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 12, cursor: "pointer" }} onClick={() => setPage("home")}>← RevaultAI</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 300, color: "var(--text)", marginBottom: 8 }}>Premium Prompts</h1>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 56 }}>The creative DNA behind the work.</div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>What Is a Premium Prompt?</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 1.9 }}>A Premium Prompt is the full creative brief behind an AI-generated work. Not a vague description — a detailed, replicable document that includes the exact language, model settings, camera direction, lighting intent, sound design notes, and creative decisions that produced the result you see on screen. It is the craft behind the output.</div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Why Creators Charge for Them</div>
          {[
            ["Time and iteration", "A great prompt is rarely the first attempt. It represents hours of refinement, testing, and creative decision-making."],
            ["Transferable skill", "The best prompts teach you how to think — not just what to type. They are educational artifacts."],
            ["Creative ownership", "Creators invest their creative vision into their prompts. Pricing reflects that value."],
          ].map(([title, desc], i) => (
            <div key={i} style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>{title}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>What Buyers Receive</div>
          {["The complete, unabridged prompt used to generate the work", "A download of the finished film", "Model and tool specifications", "Camera movement and framing direction", "Lighting and atmosphere notes", "Sound design guidance where applicable", "Permanent access — unlocked forever on your account"].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 6 }} />
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>{item}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Ownership and Usage</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 1.9, marginBottom: 16 }}>Purchasing a Premium Prompt grants you a personal license to use the creative brief for your own work. Creators retain full ownership of their original prompts. Reselling or redistributing purchased prompts is not permitted.</div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Refund Policy</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 1.9 }}>All purchases are final once the prompt has been accessed. If you experienced a technical issue that prevented delivery, contact us within 7 days and we will make it right. See our full <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => setPage("refunds")}>Refund Policy.</span></div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 40 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: "var(--text)", marginBottom: 20, lineHeight: 1.4 }}>Ready to unlock something exceptional?</div>
          <button className="btn-primary" onClick={() => setPage("explore")}>Browse Premium Creations</button>
        </div>
      </div>
    </div>
  );
}
function AboutPage({ setPage }) {
  return (
    <div className="page">
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 48px" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 12, cursor: "pointer" }} onClick={() => setPage("home")}>← RevaultAI</div>

        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 56, fontWeight: 300, color: "var(--text)", marginBottom: 8, lineHeight: 1.1 }}>The AI era does not need more content.</h1>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 56, fontWeight: 300, color: "var(--accent)", marginBottom: 56, lineHeight: 1.1 }}>It needs curation.</h2>

        <div style={{ borderTop: "1px solid var(--border)", padding: "40px 0" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 2, marginBottom: 24 }}>Every week, millions of AI-generated images, videos, and films are produced and discarded into the feed. Most are forgotten within hours. The tools have never been more powerful. The signal has never been harder to find.</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 2 }}>RevaultAI exists because we believe the best AI-native creative work deserves a permanent home. Not a feed. Not an algorithm. A vault.</div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "40px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Signal Over Noise</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 2, marginBottom: 24 }}>Every creation on RevaultAI is reviewed before it goes live. We do not optimize for volume. We optimize for quality. The result is a platform where every piece of content is worth your time — and where creators who take their craft seriously get the visibility they deserve.</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 2 }}>This is not a social media platform. There are no likes, no follower counts on the feed, no algorithmic recommendations. There is only the work.</div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "40px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Human Creativity. AI Tools.</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 2 }}>We are not interested in the debate about whether AI is art. We are interested in what skilled, intentional human beings create when given access to extraordinary tools. The prompts behind the work on this platform represent real creative thinking — the vision, the iteration, the craft. The AI is the medium. The creator is the artist.</div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "40px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Creator First</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 2, marginBottom: 24 }}>RevaultAI is built for creators who take their work seriously. Every feature on this platform — premium prompts, spotlight placement, curated profiles — is designed to give serious AI artists the recognition and infrastructure they deserve.</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 2 }}>We review every submission personally. We respond to every message. We are building this with the creators who trust us with their work.</div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "40px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>The Long View</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 2, marginBottom: 24 }}>We are at the beginning of something. The tools will keep improving. The volume of AI-generated content will keep growing. The need for trusted curation will only increase.</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 2 }}>RevaultAI is building the archive that will matter when everyone looks back at this moment and asks: where was the best work? It will be here.</div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 48 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: "var(--text)", marginBottom: 32, lineHeight: 1.4 }}>The vault is open.</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <button className="btn-primary" onClick={() => setPage("explore")}>Explore the Archive</button>
            <button className="btn-ghost" onClick={() => setPage("guidelines")}>Submit Your Work</button>
          </div>
        </div>
      </div>
    </div>
  );
}
function BecomeCreatorPage({ setPage, user }) {
  const whyCards = [
    { title: "Show the Process, Not Just the Result", desc: "Share the prompts, workflows, tools, and techniques behind your creations. RevaultAI is built for creators who want their work understood, not just viewed." },
    { title: "Build a Creator Profile", desc: "Create a permanent portfolio of your AI-native work. Gain followers, showcase your best creations, and build your reputation inside a curated creative community." },
    { title: "Monetize Premium Prompts", desc: "Offer premium prompts, workflows, and creative breakdowns for purchase. Keep your best techniques protected while earning from your expertise." },
    { title: "Get Curated, Not Buried", desc: "Unlike massive content platforms, RevaultAI is built around quality and discovery. Exceptional work can be featured in spotlights, collections, and creator showcases." },
  ];
  const content = ["AI Films", "AI Short Films", "AI Animations", "Experimental Cinema", "Music Visuals", "Narrative Projects", "Hybrid Human and AI Productions"];
  const steps = [
    ["01", "Create your account", "Sign up and verify your email to get started."],
    ["02", "Complete your creator profile", "Add your display name, username, bio, and avatar. Profiles with complete information receive priority in curation."],
    ["03", "Upload your first creation", "Submit your video directly from the Submit page. Uploads go straight to our secure vault."],
    ["04", "Choose Open or Premium", "Open creations are free for everyone. Premium creations lock the full prompt behind a purchase."],
    ["05", "Submit for review", "Every creation is reviewed by the RevaultAI team within 48 hours before going live."],
    ["06", "Grow your audience", "Approved creations are discoverable in Explore. Build your following and earn Spotlight placement."],
  ];
  const encouraged = ["Original work", "Complete and detailed prompts", "Strong visual presentation", "Cinematic storytelling", "Experimental creativity"];
  const notAllowed = ["Spam or duplicate submissions", "Stolen or plagiarized content", "Copyright violations", "Hate content or discrimination", "Illegal content of any kind"];

  return (
    <div className="page">

      {/* HERO */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "100px 48px 80px", textAlign: "center" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.25em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 24 }}>Early Creator Program</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 64, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.1 }}>Become a Creator</h1>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 300, color: "var(--muted)", marginBottom: 24, fontStyle: "italic" }}>Help define the future of AI-native filmmaking.</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 1.9, maxWidth: 560, margin: "0 auto 40px" }}>RevaultAI is building a curated home for exceptional AI films, animations, short films, and premium prompts. We are currently inviting a small group of creators to help shape the platform before public launch.</div>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn-primary" onClick={() => user ? setPage("submit") : setPage("home")}>{user ? "Start Creating" : "Create Your Account"}</button>
          <button className="btn-ghost" onClick={() => setPage("guidelines")}>View Submission Guidelines</button>
        </div>
      </div>

      {/* FOUNDING CREATOR BADGE */}
      <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "32px 48px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ display: "inline-block", border: "1px solid var(--accent)", borderRadius: 4, padding: "4px 16px", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 12 }}>Founding Creator</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.8 }}>Creators who join before public launch may receive special recognition as founding creators of RevaultAI — visible on their profile and in the platform archive.</div>
        </div>
      </div>

      {/* WHY CREATORS JOIN */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "80px 48px" }}>
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 48px" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.25em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 16 }}>Why Creators Join</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: "var(--text)", marginBottom: 20, lineHeight: 1.1 }}>Your work deserves more than another feed.</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 1.9 }}>Most platforms focus on views. RevaultAI focuses on creators. Whether you're making AI films, short films, images, music, animations, prompt collections, workflows, or creative experiments, this is a place to showcase the craft behind the creation.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
          {whyCards.map((c, i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "32px 24px" }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 12 }}>0{i + 1}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{c.title}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ACCEPTED CONTENT */}
      <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "80px 48px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: "var(--text)", marginBottom: 48, textAlign: "center" }}>Accepted Content</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
            {content.map((item, i) => (
              <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 4, padding: "12px 24px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--text)", letterSpacing: "0.08em" }}>{item}</div>
            ))}
          </div>
        </div>
      </div>

      {/* PREMIUM PROMPTS */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "80px 48px" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: "var(--text)", marginBottom: 16, textAlign: "center" }}>Monetize Your Creative Process</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", textAlign: "center", marginBottom: 48, lineHeight: 1.8 }}>Creators may publish their work as Open or Premium. You maintain full ownership of your creative work.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "40px 32px" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 16 }}>Open</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>Free to All</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.8 }}>Your full prompt is visible to everyone. Great for building your audience and showcasing your creative range to the community.</div>
          </div>
          <div style={{ border: "1px solid var(--accent)", borderRadius: 8, padding: "40px 32px", background: "var(--surface)" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 16 }}>Premium</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>Prompt for Purchase</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.8 }}>A teaser prompt is visible to everyone. After purchase at $4.99, buyers unlock the full creative brief and a download of the finished film. You earn visibility and credibility on a premium platform.</div>
          </div>
        </div>
      </div>

      {/* MORE MONETIZATION (COMING SOON) */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "80px 48px", textAlign: "center" }}>
        <div style={{ display: "inline-block", border: "1px solid var(--accent)", borderRadius: 4, padding: "4px 16px", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 16 }}>On the Roadmap</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.1 }}>More ways to earn, ahead.</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 1.9 }}>Premium prompts are just the start. We're building additional ways for creators to be rewarded for exceptional work, and we'll share more as those options take shape. RevaultAI is designed around creators first — earning included.</div>
      </div>

      {/* SPOTLIGHT */}
      <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "80px 48px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: "var(--text)", marginBottom: 16 }}>Earn a Place in Spotlight</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.9, marginBottom: 40 }}>The Spotlight section highlights the best work on RevaultAI. Only a limited number of creations are spotlighted at any time. Selection is based on originality, storytelling, visual quality, prompt craftsmanship, and community engagement.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            {["Originality", "Storytelling", "Visual Quality", "Prompt Craftsmanship", "Community Engagement"].map((item, i) => (
              <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 4, padding: "8px 16px", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>{item}</div>
            ))}
          </div>
        </div>
      </div>

      {/* GETTING STARTED */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "80px 48px" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: "var(--text)", marginBottom: 56, textAlign: "center" }}>Getting Started</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {steps.map(([num, title, desc], i) => (
            <div key={i} style={{ display: "flex", gap: 32, paddingBottom: 40, borderLeft: i < steps.length - 1 ? "1px solid var(--border)" : "none", marginLeft: 20, paddingLeft: 40, position: "relative" }}>
              <div style={{ position: "absolute", left: -16, top: 0, width: 32, height: 32, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--accent)", letterSpacing: "0.1em", flexShrink: 0 }}>{num}</div>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{title}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QUALITY STANDARDS */}
      <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "80px 48px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: "var(--text)", marginBottom: 48, textAlign: "center" }}>Quality Standards</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 48 }}>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>We Encourage</div>
              {encouraged.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#4ADE80" }}>✓</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)" }}>{item}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Not Allowed</div>
              {notAllowed.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#F87171" }}>✕</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)" }}>{item}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FINAL CTA */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "100px 48px", textAlign: "center" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.2 }}>Ready to Join RevaultAI?</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.9, marginBottom: 40 }}>Become one of the founding creators helping shape the future of AI-native creativity.</div>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn-primary" onClick={() => user ? setPage("submit") : setPage("home")}>{user ? "Submit Your First Creation" : "Create Your Account"}</button>
          <button className="btn-ghost" onClick={() => setPage("explore")}>Explore the Archive</button>
        </div>
      </div>

    </div>
  );
}
export default function App() {
  useEffect(() => { initAnalytics(); }, []);
  const [creations, setCreations]   = useState([]);
const [dbLoaded, setDbLoaded]     = useState(false);
const [page, setPage]             = useState("home");
  const [detailId, setDetailId]     = useState(null);
  const [creatorUser, setCreatorUser] = useState(null);
  const [notifMsg, setNotifMsg]     = useState(null);
  const [user, setUser]             = useState(null);
  const [profile, setProfile]       = useState(null);
  const [authOpen, setAuthOpen]     = useState(false);
  const [purchasedIds, setPurchasedIds] = useState(new Set());
const [purchasesLoaded, setPurchasesLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { const u = data.session?.user ?? null; setUser(u); if (u) loadOrCreateProfile(u); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = setUser(session?.user ?? null);
if (session?.user) { identifyUser(session.user.id, session.user.email); } else { resetUser(); }
      if (event === "PASSWORD_RECOVERY") setPage("set-password");
      if (u) { loadOrCreateProfile(u); } else { setProfile(null); setPurchasedIds(new Set()); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { const hash = window.location.hash; if (hash && hash.includes("type=signup")) { setPage("email-confirmed"); window.history.replaceState({}, "", window.location.pathname); } }, []);

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
    const cancelled  = params.get("cancelled");

    // Handle cancel return
    if (cancelled === "true") {
      window.history.replaceState({}, "", window.location.pathname);
      setNotifMsg("Checkout cancelled — no charge was made.");
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

  function renderPage() {
    switch (page) {
      case "home":    return <HomePage creations={creations} setPage={setPage} setDetailId={setDetailId} />;
      case "explore": return <ExplorePage creations={creations} setPage={setPage} setDetailId={setDetailId} dbLoaded={dbLoaded} />;
      case "creators":return <CreatorsPage setPage={setPage} setCreatorUser={setCreatorUser} />;
      case "profile": return <ProfilePage username={creatorUser} creations={creations} setPage={setPage} setDetailId={setDetailId} user={user} />;
      case "detail":  return <DetailPage id={detailId} creations={creations} user={user} purchasedIds={purchasedIds} purchasesLoaded={purchasesLoaded} setPage={setPage} setCreatorUser={setCreatorUser} notify={notify} />;
      case "settings": if (!user) return <div className="page"><div className="empty-state"><div className="empty-text">Sign in to access profile settings.</div></div></div>; return <SettingsPage user={user} profile={profile} setProfile={setProfile} notify={notify} />;
      case "admin": if (!isAdmin(user)) return <div className="page"><div className="empty-state"><div className="empty-text">Not authorized.</div></div></div>; return <AdminPage creations={creations} setCreations={setCreations} notify={notify} />;
      case "submit":  return <SubmitPage setCreations={setCreations} notify={notify} setPage={setPage} user={user} profile={profile} />;
      case "set-password": return <SetPasswordPage notify={notify} setPage={setPage} />;
      case "email-confirmed": return <EmailConfirmedPage setPage={setPage} />;
      case "terms":     return <LegalPage setPage={setPage} page="terms" />;
      case "faq":       return <FAQPage setPage={setPage} />;
      case "contact":   return <ContactPage setPage={setPage} />;
      case "guidelines": return <GuidelinesPage setPage={setPage} />;
      case "premium-prompts": return <PremiumPromptsPage setPage={setPage} />;
      case "about": return <AboutPage setPage={setPage} />;
      case "become-creator": return <BecomeCreatorPage setPage={setPage} user={user} />;
case "privacy":   return <LegalPage setPage={setPage} page="privacy" />;
case "refunds":   return <LegalPage setPage={setPage} page="refunds" />;
case "dmca":      return <LegalPage setPage={setPage} page="dmca" />;
case "ai-disclaimer": return <LegalPage setPage={setPage} page="ai-disclaimer" />;
      case "purchase-success": return <PurchaseSuccessPage setPage={setPage} setDetailId={setDetailId} creations={creations} />;
      default: return null;
    }
  }

  return (<><style>{CSS}</style><Nav page={page} setPage={setPage} user={user} profile={profile} onSignInClick={() => setAuthOpen(true)} onSignOut={handleSignOut} />{renderPage()}{authOpen && <AuthModal onClose={() => setAuthOpen(false)} notify={notify} />}{notifMsg && <Notification key={notifMsg} msg={notifMsg} onClose={() => setNotifMsg(null)} />}</>);
}
