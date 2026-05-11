import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase.js";
import { fetchCreations, insertCreation, fetchPurchasedIds, createCheckoutSession } from "./lib/db.js";
import { fetchProfile, upsertProfile, defaultProfile } from "./lib/profiles.js";

// ─── SEED DATA ────────────────────────────────────────────────────────────────

const SEED_CREATIONS = [
  {
    id: "c1",
    title: "Meridian Collapse",
    creator: { username: "solara", display_name: "Solara Chen" },
    hero_image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&q=90",
    thumbnail_image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&q=90",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    preview_video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    tools_used: ["Sora", "Runway"],
    category: "Sci-Fi/Fantasy",
    is_premium: true,
    premium_status: "Approved",
    prompt_preview: "A desolate orbital station drifts through amber nebula clouds, structural ribs fractured, emergency lights pulsing at irregular intervals...",
    prompt_full: "A desolate orbital station drifts through amber nebula clouds, structural ribs fractured, emergency lights pulsing at irregular intervals. Interior: exposed conduit bundles spark against cracked viewports. Sound design: distant groaning metal, pressurized hiss. Cinematic grain, anamorphic lens flare. Shot on Sora v2 with 16:9 cinematic mode.",
    spotlight: true,
  },
  {
    id: "c2",
    title: "The Quiet Epoch",
    creator: { username: "nvoid", display_name: "Nullvoid" },
    hero_image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=90",
    thumbnail_image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=90",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    preview_video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    tools_used: ["Kling", "MidJourney"],
    category: "Abstract",
    is_premium: false,
    premium_status: null,
    prompt_preview: null,
    prompt_full: "Time-lapse of a brutalist concrete tower slowly consumed by crystalline growth. Each crystal facet reflects a different era of human civilization. Overhead God-view shot, golden hour light, timelapse over 1000 years compressed to 60 seconds.",
    spotlight: true,
  },
  {
    id: "c3",
    title: "After the Signal",
    creator: { username: "mira_kd", display_name: "Mira Kade" },
    hero_image: "https://images.unsplash.com/photo-1545987796-200677ee1011?w=1200&q=90",
    thumbnail_image: "https://images.unsplash.com/photo-1545987796-200677ee1011?w=1200&q=90",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    preview_video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    tools_used: ["Sora", "Stable Diffusion"],
    category: "Noir",
    is_premium: true,
    premium_status: "Approved",
    prompt_preview: "Rain-soaked alleyway in a city that receives no satellite signal. Figures move behind frosted glass...",
    prompt_full: "Rain-soaked alleyway in a city that receives no satellite signal. Figures move behind frosted glass. Neon kanji reflections ripple in puddles. A lone antenna rotates on a rooftop, searching. Film noir aesthetic with cyberpunk overtones. 35mm simulation, high contrast, low saturation except for neon hues.",
    spotlight: true,
  },
  {
    id: "c4",
    title: "Velvet Recursion",
    creator: { username: "solara", display_name: "Solara Chen" },
    hero_image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=90",
    thumbnail_image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=90",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    preview_video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    tools_used: ["Runway", "After Effects"],
    category: "Abstract",
    is_premium: true,
    premium_status: "Approved",
    prompt_preview: "Infinite corridor of velvet panels folding into themselves...",
    prompt_full: "Infinite corridor of velvet panels folding into themselves, each fold revealing a smaller version of the same space. Warm crimson and deep navy. Dreamlike temporal distortion. Camera slowly tracks forward, never arriving.",
    spotlight: false,
  },
  {
    id: "c5",
    title: "Bone Garden",
    creator: { username: "lumen_x", display_name: "Lumen X" },
    hero_image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=90",
    thumbnail_image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=90",
    video_url: "",
    preview_video: "",
    tools_used: ["MidJourney", "Kling"],
    category: "Sci-Fi/Fantasy",
    is_premium: false,
    premium_status: null,
    prompt_preview: null,
    prompt_full: "A medieval garden where all flora is composed of bleached bone structures. Wind causes them to chime softly. Overcast sky, desaturated palette with one bloom of deep violet at center frame. Birds perch on femur-shaped topiary.",
    spotlight: false,
  },
  {
    id: "c6",
    title: "Low Earth Memory",
    creator: { username: "mira_kd", display_name: "Mira Kade" },
    hero_image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=90",
    thumbnail_image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=90",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    preview_video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    tools_used: ["Sora"],
    category: "Sci-Fi/Fantasy",
    is_premium: false,
    premium_status: null,
    prompt_preview: null,
    prompt_full: "Astronaut floating weightless in ISS module, but all surfaces are covered in handwritten letters. Letters slowly detach and orbit the astronaut. Earth visible through porthole. Quiet, no music. Natural ambient sound only.",
    spotlight: false,
  },
  {
    id: "c7",
    title: "Threshold Protocol",
    creator: { username: "nvoid", display_name: "Nullvoid" },
    hero_image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&q=90",
    thumbnail_image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&q=90",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    preview_video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    tools_used: ["Runway", "Stable Diffusion"],
    category: "Thriller",
    is_premium: true,
    premium_status: "Approved",
    prompt_preview: "A figure stands at the threshold of a server room, data streams flickering across glass walls, the boundary between human and machine dissolving...",
    prompt_full: "A figure stands at the threshold of a server room, data streams flickering across glass walls, the boundary between human and machine dissolving. Overhead fluorescent flicker synced to heartbeat. Camera holds on the threshold -- neither entering nor retreating. Palette: clinical white, deep shadow, electric teal. Sound design: low-frequency hum, distorted breath, silence. Shot in extreme slow motion, 240fps, anamorphic compression.",
    spotlight: false,
  },
  {
    id: "c8",
    title: "Fold and Dissolve",
    creator: { username: "lumen_x", display_name: "Lumen X" },
    hero_image: "https://images.unsplash.com/photo-1509909756405-be0199881695?w=1200&q=90",
    thumbnail_image: "https://images.unsplash.com/photo-1509909756405-be0199881695?w=1200&q=90",
    video_url: "",
    preview_video: "",
    tools_used: ["MidJourney"],
    category: "Abstract",
    is_premium: false,
    premium_status: null,
    prompt_preview: null,
    prompt_full: "Origami cranes made of newspaper with legible headlines unfold mid-flight into human figures, then re-fold into new shapes. Filmed in a white void. Sharp shadows. No music -- only the crisp sound of paper.",
    spotlight: false,
  },
];

const CREATORS = [
  {
    username: "solara",
    display_name: "Solara Chen",
    bio: "Crafting narrative AI films at the edge of perception. Former cinematographer turned AI director.",
    profile_image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=90",
    tools_used: ["Sora", "Runway", "MidJourney", "After Effects"],
    badges: ["Founding", "Premium"],
  },
  {
    username: "nvoid",
    display_name: "Nullvoid",
    bio: "Systems thinker. I build worlds that collapse beautifully.",
    profile_image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=90",
    tools_used: ["Kling", "Runway", "Stable Diffusion"],
    badges: ["Premium"],
  },
  {
    username: "mira_kd",
    display_name: "Mira Kade",
    bio: "Noir, memory, and machine vision. Every frame is a question.",
    profile_image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=90",
    tools_used: ["Sora", "Stable Diffusion"],
    badges: ["Founding"],
  },
  {
    username: "lumen_x",
    display_name: "Lumen X",
    bio: "Light is the medium. AI is the brush.",
    profile_image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=90",
    tools_used: ["MidJourney", "Kling"],
    badges: [],
  },
];

const CATEGORIES = ["Abstract", "Action", "Animation", "Crime", "Documentary", "Drama", "Horror", "News", "Noir", "Romance", "Sci-Fi/Fantasy", "Sports", "Thriller", "Western"];

// ─── STYLES ───────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Mono:wght@300;400&family=Syne:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0E0F14;
    --bg2: #13141A;
    --bg3: #1A1B23;
    --border: rgba(255,255,255,0.06);
    --border-hover: rgba(123,63,228,0.35);
    --text: #E8E6F0;
    --muted: #6B6878;
    --accent: #7B3FE4;
    --accent-dim: rgba(123,63,228,0.15);
    --accent-glow: rgba(123,63,228,0.4);
    --premium: #C49A3C;
    --premium-dim: rgba(196,154,60,0.12);
  }

  html { scroll-behavior: smooth; }
  body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; -webkit-font-smoothing: antialiased; overflow-x: hidden; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 2px; }

  /* ── NAV ── */
  .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; height: 62px; background: rgba(10,11,16,0.92); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); }
  .nav-logo { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 0.18em; color: var(--text); cursor: pointer; text-transform: uppercase; display: flex; align-items: center; gap: 0; }
  .nav-logo span { color: var(--accent); }
  .nav-center { display: flex; gap: 40px; align-items: center; position: absolute; left: 50%; transform: translateX(-50%); }
  .nav-link { font-size: 11px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); cursor: pointer; transition: color 0.2s; padding-bottom: 2px; border-bottom: 1px solid transparent; }
  .nav-link:hover { color: var(--text); }
  .nav-link.active { color: var(--accent); border-bottom-color: var(--accent); }
  .nav-right { display: flex; align-items: center; gap: 16px; }
  .nav-signin { background: transparent; color: var(--text); padding: 7px 18px; border-radius: 3px; font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); font-family: 'Syne', sans-serif; transition: all 0.2s; }
  .nav-signin:hover { border-color: var(--text); }
  .nav-user { display: flex; align-items: center; gap: 10px; }
  .nav-user-email { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.08em; color: var(--muted); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nav-user-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--accent-dim); border: 1px solid var(--accent); display: flex; align-items: center; justify-content: center; font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700; color: var(--accent); text-transform: uppercase; flex-shrink: 0; }
  .nav-signout { background: transparent; color: var(--muted); padding: 6px 14px; border-radius: 3px; font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; border: 1px solid var(--border); font-family: 'Syne', sans-serif; transition: all 0.2s; }
  .nav-signout:hover { border-color: rgba(248,113,113,0.4); color: #F87171; }

  /* ── AUTH MODAL ── */
  .auth-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(8,9,13,0.88); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; padding: 24px; animation: fadeIn 0.18s ease; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .auth-modal { background: var(--bg2); border: 1px solid var(--border); border-radius: 4px; width: 100%; max-width: 420px; overflow: hidden; box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(123,63,228,0.08); animation: slideUp 0.22s ease; }
  @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .auth-header { padding: 32px 36px 0; }
  .auth-logo { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.18em; color: var(--text); text-transform: uppercase; margin-bottom: 24px; }
  .auth-logo span { color: var(--accent); }
  .auth-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); }
  .auth-tab { flex: 1; padding: 10px 0; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; text-align: center; cursor: pointer; color: var(--muted); border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.2s; background: none; border-left: none; border-right: none; border-top: none; }
  .auth-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
  .auth-tab:hover:not(.active) { color: var(--text); }
  .auth-body { padding: 28px 36px 32px; }
  .auth-field { margin-bottom: 20px; }
  .auth-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.18em; color: var(--accent); text-transform: uppercase; display: block; margin-bottom: 8px; }
  .auth-input { width: 100%; background: var(--bg3); border: 1px solid var(--border); color: var(--text); padding: 11px 14px; border-radius: 3px; font-family: 'Syne', sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s; }
  .auth-input:focus { border-color: var(--accent); }
  .auth-input::placeholder { color: var(--muted); }
  .auth-submit { width: 100%; background: var(--accent); color: white; padding: 12px; border-radius: 3px; font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; border: none; transition: all 0.2s; margin-top: 8px; }
  .auth-submit:hover { opacity: 0.88; box-shadow: 0 6px 24px var(--accent-glow); }
  .auth-submit:disabled { opacity: 0.45; cursor: not-allowed; }
  .auth-error { font-family: 'DM Mono', monospace; font-size: 11px; color: #F87171; margin-top: 14px; line-height: 1.5; padding: 10px 14px; background: rgba(248,113,113,0.06); border: 1px solid rgba(248,113,113,0.2); border-radius: 3px; }
  .auth-success { font-family: 'DM Mono', monospace; font-size: 11px; color: #4ADE80; margin-top: 14px; line-height: 1.5; padding: 10px 14px; background: rgba(74,222,128,0.06); border: 1px solid rgba(74,222,128,0.2); border-radius: 3px; }
  .auth-close { position: absolute; top: 16px; right: 18px; background: none; border: none; color: var(--muted); font-size: 18px; cursor: pointer; line-height: 1; padding: 4px 8px; border-radius: 2px; transition: color 0.2s; }
  .auth-close:hover { color: var(--text); }
  .auth-modal-wrap { position: relative; }

  /* ── PAGE / LAYOUT ── */
  .page { min-height: 100vh; padding-top: 62px; }
  .container { max-width: 1280px; margin: 0 auto; padding: 0 48px; }

  /* ── HERO ── */
  .hero { min-height: 60vh; display: grid; grid-template-columns: 1fr 1fr; position: relative; overflow: hidden; }
  .hero-left { display: flex; flex-direction: column; justify-content: center; padding: 48px 56px; position: relative; z-index: 2; }
  .hero-right { position: relative; overflow: hidden; }
  .hero-right img { width: 100%; height: 100%; object-fit: cover; filter: brightness(0.75) saturate(0.85); display: block; animation: heroKenBurns 18s ease-in-out infinite alternate; transform-origin: center center; will-change: transform; }
  @keyframes heroKenBurns {
    0%   { transform: scale(1.0) translate(0%, 0%); }
    33%  { transform: scale(1.06) translate(-1.2%, 0.8%); }
    66%  { transform: scale(1.04) translate(1.0%, -0.6%); }
    100% { transform: scale(1.08) translate(-0.6%, 1.0%); }
  }
  .hero-right::after { content: ''; position: absolute; inset: 0; background: linear-gradient(to right, var(--bg) 0%, transparent 30%); pointer-events: none; z-index: 1; }
  .hero-right::before { content: ''; position: absolute; inset: 0; z-index: 2; pointer-events: none; opacity: 0.032; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); background-size: 160px 160px; mix-blend-mode: overlay; }
  .hero-eyebrow { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.22em; color: var(--muted); text-transform: uppercase; margin-bottom: 28px; }
  .hero-tagline { font-family: 'Syne', sans-serif; font-size: clamp(32px, 4vw, 56px); font-weight: 700; line-height: 1.1; letter-spacing: -0.01em; color: var(--text); margin-bottom: 12px; }
  .hero-tagline-accent { font-family: 'Syne', sans-serif; font-size: clamp(32px, 4vw, 56px); font-weight: 700; line-height: 1.1; letter-spacing: -0.01em; color: var(--accent); margin-bottom: 32px; display: block; }
  .hero-sub { font-size: 14px; font-weight: 400; color: var(--muted); max-width: 380px; line-height: 1.7; margin-bottom: 36px; }
  .hero-link { display: inline-flex; align-items: center; gap: 8px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); cursor: pointer; transition: gap 0.2s; border: none; background: none; padding: 0; }
  .hero-link:hover { gap: 12px; }
  .hero-link-arrow { font-size: 14px; }

  /* ── BUTTONS ── */
  .btn-primary { background: var(--accent); color: white; padding: 14px 32px; border-radius: 4px; font-size: 12px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; border: none; transition: all 0.2s; font-family: 'Syne', sans-serif; }
  .btn-primary:hover { opacity: 0.88; box-shadow: 0 8px 32px var(--accent-glow); }
  .btn-ghost { background: transparent; color: var(--text); padding: 13px 32px; border-radius: 4px; font-size: 12px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; border: 1px solid var(--border-hover); transition: all 0.2s; font-family: 'Syne', sans-serif; }
  .btn-ghost:hover { border-color: var(--accent); color: var(--accent); }

  /* ── SECTIONS ── */
  .section-sublabel { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .section { padding: 56px 48px; }
  .section + .section { background: var(--bg2); }
  .section-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 32px; }
  .section-label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 8px; }
  .section-title { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 400; color: var(--text); }
  .section-link { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); cursor: pointer; transition: color 0.2s; }
  .section-link:hover { color: var(--accent); }

  /* ── SPOTLIGHT ── */
  .spotlight-section-wrap { padding: 72px 48px; }
  .spotlight-section-header { text-align: center; margin-bottom: 40px; }
  .spotlight-section-header .section-label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 6px; }
  .spotlight-section-header .section-sublabel { font-size: 12px; color: var(--muted); }
  .spotlight-section-viewall { display: block; text-align: center; margin-top: 28px; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); cursor: pointer; transition: color 0.2s; }
  .spotlight-section-viewall:hover { color: var(--accent); }
  .spotlight-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; max-width: 1180px; margin: 0 auto; }
  .spotlight-card { position: relative; aspect-ratio: 3/4; overflow: hidden; cursor: pointer; }
  .spotlight-card img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94); filter: brightness(0.88) saturate(0.9); }
  .spotlight-card:hover img { transform: scale(1.06); filter: brightness(0.96) saturate(1); }
  .spotlight-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(8,9,13,0.97) 0%, rgba(8,9,13,0.45) 45%, rgba(8,9,13,0.1) 75%, transparent 100%); }
  .spotlight-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 28px 24px; }
  .spotlight-cat { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 6px; }
  .spotlight-title { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 400; color: var(--text); margin-bottom: 6px; line-height: 1.1; }
  .spotlight-creator { font-size: 11px; color: var(--muted); }

  /* ── BADGES ── */
  .badge-premium { display: inline-flex; align-items: center; gap: 4px; background: var(--premium-dim); border: 1px solid rgba(196,154,60,0.3); color: var(--premium); padding: 2px 8px; border-radius: 2px; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; }
  .badge-open { display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.04); border: 1px solid var(--border); color: var(--muted); padding: 2px 8px; border-radius: 2px; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; }
  .badge-review { background: rgba(255,165,0,0.08); border: 1px solid rgba(255,165,0,0.25); color: rgba(255,165,0,0.7); }
  .badge-founding { display: inline-flex; align-items: center; background: var(--accent-dim); border: 1px solid rgba(123,63,228,0.3); color: var(--accent); padding: 2px 8px; border-radius: 2px; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; }
  .badge-following { display: inline-flex; align-items: center; background: rgba(74,222,128,0.08); border: 1px solid rgba(74,222,128,0.25); color: #4ADE80; padding: 2px 8px; border-radius: 2px; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; }

  /* ── CREATION CARDS ── */
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

  /* ── MANIFESTO ── */
  .manifesto { padding: 72px 48px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); text-align: center; position: relative; overflow: hidden; background: var(--bg2); }
  .manifesto::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 50% 80% at 50% 50%, rgba(123,63,228,0.06), transparent); pointer-events: none; }
  .manifesto-quote { font-family: 'Cormorant Garamond', serif; font-size: clamp(24px, 3.2vw, 42px); font-weight: 300; line-height: 1.45; color: var(--text); max-width: 640px; margin: 0 auto 24px; font-style: italic; }
  .manifesto-sub { font-size: 13px; color: var(--muted); letter-spacing: 0.08em; max-width: 380px; margin: 0 auto; line-height: 1.7; }
  .manifesto-rule { width: 36px; height: 1px; background: var(--accent); margin: 0 auto 36px; }

  /* ── FILTER / LOAD ── */
  .filter-bar { display: flex; gap: 2px; margin-bottom: 48px; flex-wrap: wrap; }
  .filter-btn { padding: 10px 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--muted); transition: all 0.2s; border-radius: 2px; font-family: 'Syne', sans-serif; }
  .filter-btn.active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }
  .filter-btn:hover:not(.active) { border-color: rgba(255,255,255,0.15); color: var(--text); }
  .load-more { text-align: center; padding: 48px 0; }
  .btn-load { background: transparent; border: 1px solid var(--border); color: var(--muted); padding: 12px 36px; border-radius: 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; font-family: 'Syne', sans-serif; }
  .btn-load:hover { border-color: var(--accent); color: var(--accent); }

  /* ── CREATORS / PROFILE ── */
  .creator-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 2px; }
  .creator-card { background: var(--bg2); padding: 28px; cursor: pointer; border: 1px solid transparent; transition: border-color 0.25s; position: relative; }
  .creator-card:hover { border-color: var(--border-hover); }
  .creator-avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; margin-bottom: 16px; border: 2px solid var(--border); }
  .creator-name { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 500; color: var(--text); margin-bottom: 4px; }
  .creator-handle { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); margin-bottom: 12px; }
  .creator-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
  .creator-tools { font-size: 11px; color: var(--muted); line-height: 1.6; }
  .profile-header { padding: 60px 48px 48px; border-bottom: 1px solid var(--border); display: flex; align-items: flex-start; gap: 32px; }
  .profile-avatar { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border); flex-shrink: 0; }
  .profile-name { font-family: 'Cormorant Garamond', serif; font-size: 48px; font-weight: 300; color: var(--text); line-height: 1; margin-bottom: 4px; }
  .profile-handle { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); margin-bottom: 12px; }
  .profile-bio { font-size: 14px; color: var(--muted); max-width: 480px; line-height: 1.7; }
  .profile-actions { margin-top: 20px; display: flex; gap: 12px; align-items: center; }
  .btn-follow { padding: 9px 24px; border-radius: 3px; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; font-family: 'Syne', sans-serif; transition: all 0.2s; }
  .btn-follow.unfollowed { background: var(--accent); color: white; border: none; }
  .btn-follow.unfollowed:hover { opacity: 0.88; box-shadow: 0 0 20px var(--accent-glow); }
  .btn-follow.followed { background: transparent; color: #4ADE80; border: 1px solid rgba(74,222,128,0.35); }
  .btn-follow.followed:hover { background: rgba(74,222,128,0.06); }

  /* ── DETAIL / CINEMATIC FILM PAGE ── */
  .detail-page { background: var(--bg); }

  /* -- cinema stage: full-bleed black above the fold -- */
  .detail-cinema { width: 100%; background: #000; position: relative; }
  .detail-cinema-inner { width: 100%; max-width: 1440px; margin: 0 auto; position: relative; }
  .detail-cinema video { width: 100%; aspect-ratio: 16/9; display: block; background: #000; }
  .detail-cinema img.detail-still { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; filter: brightness(0.88) saturate(0.88); transition: filter 0.5s ease; }
  .detail-cinema:hover img.detail-still { filter: brightness(0.96) saturate(0.96); }
  /* subtle bottom fade from media into bg */
  .detail-cinema-inner::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 120px; background: linear-gradient(transparent, #000); pointer-events: none; }

  /* -- nav chrome inside cinema -- */
  .detail-back { display: inline-flex; align-items: center; gap: 8px; position: absolute; top: 20px; left: 24px; z-index: 10; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(232,230,240,0.55); cursor: pointer; transition: color 0.2s; background: rgba(0,0,0,0.38); border: 1px solid rgba(255,255,255,0.08); border-radius: 2px; padding: 6px 14px; backdrop-filter: blur(6px); }
  .detail-back:hover { color: var(--text); border-color: rgba(255,255,255,0.2); }

  /* -- editorial strip below cinema -- */
  .detail-editorial-strip { background: var(--bg); border-bottom: 1px solid var(--border); }
  .detail-editorial-inner { max-width: 1180px; margin: 0 auto; padding: 36px 48px 32px; display: flex; align-items: flex-start; justify-content: space-between; gap: 48px; }
  .detail-editorial-left { flex: 1; min-width: 0; }
  .detail-editorial-right { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; flex-shrink: 0; padding-top: 6px; }

  .detail-eyebrow { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.22em; color: var(--accent); text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
  .detail-eyebrow-line { width: 28px; height: 1px; background: var(--accent); opacity: 0.4; flex-shrink: 0; }
  .detail-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(32px, 4vw, 58px); font-weight: 300; color: var(--text); line-height: 1.0; letter-spacing: -0.01em; margin-bottom: 16px; }
  .detail-creator-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .detail-creator-link { font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.06em; color: var(--accent); cursor: pointer; transition: opacity 0.2s; }
  .detail-creator-link:hover { opacity: 0.75; }
  .detail-creator-sep { color: var(--border); font-size: 10px; }
  .detail-category-tag { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.12em; color: var(--muted); text-transform: uppercase; }
  .detail-badges-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
  .detail-tools-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 14px; }
  .detail-tool-tag { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.12em; color: var(--muted); background: transparent; border: 1px solid var(--border); padding: 3px 9px; border-radius: 2px; text-transform: uppercase; }
  .detail-tool-tag-video { color: var(--accent); border-color: rgba(123,63,228,0.3); }

  /* -- production note section (secondary, below the fold) -- */
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
  .btn-unlock-restrained { background: transparent; border: 1px solid rgba(123,63,228,0.4); color: var(--accent); padding: 10px 24px; border-radius: 3px; font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
  .btn-unlock-restrained:hover { background: var(--accent-dim); border-color: var(--accent); }

  @media (max-width: 860px) {
    .detail-editorial-inner { flex-direction: column; gap: 20px; padding: 28px 24px 24px; }
    .detail-editorial-right { align-items: flex-start; }
    .detail-body { padding: 32px 24px 56px; }
    .detail-title { font-size: 32px; }
    .prompt-box { padding: 20px 22px; }
  }

  /* ── ADMIN ── */
  .admin-table { width: 100%; border-collapse: collapse; }
  .admin-table th { text-align: left; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.15em; color: var(--muted); text-transform: uppercase; padding: 12px 16px; border-bottom: 1px solid var(--border); }
  .admin-table td { padding: 16px; border-bottom: 1px solid var(--border); font-size: 13px; color: var(--text); vertical-align: middle; }
  .admin-table tr:hover td { background: var(--bg2); }
  .btn-approve { background: rgba(74,222,128,0.12); border: 1px solid rgba(74,222,128,0.3); color: #4ADE80; padding: 6px 14px; border-radius: 2px; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; margin-right: 8px; font-family: 'Syne', sans-serif; }
  .btn-approve:hover { background: rgba(74,222,128,0.2); }
  .btn-reject { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.25); color: #F87171; padding: 6px 14px; border-radius: 2px; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; font-family: 'Syne', sans-serif; }
  .btn-reject:hover { background: rgba(248,113,113,0.18); }

  /* ── FORMS ── */
  .form-group { margin-bottom: 28px; }
  .form-label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.15em; color: var(--accent); text-transform: uppercase; display: block; margin-bottom: 10px; }
  .form-input, .form-select, .form-textarea { width: 100%; background: var(--bg2); border: 1px solid var(--border); color: var(--text); padding: 12px 16px; border-radius: 4px; font-family: 'Syne', sans-serif; font-size: 14px; transition: border-color 0.2s; outline: none; }
  .form-input:focus, .form-select:focus, .form-textarea:focus { border-color: var(--accent); }
  .form-textarea { min-height: 140px; resize: vertical; line-height: 1.6; }
  .form-select option { background: var(--bg2); }
  .toggle-row { display: flex; align-items: center; gap: 16px; }
  .toggle { width: 44px; height: 24px; background: var(--bg3); border-radius: 12px; position: relative; cursor: pointer; transition: background 0.2s; border: 1px solid var(--border); flex-shrink: 0; }
  .toggle.on { background: var(--accent); border-color: var(--accent); }
  .toggle-knob { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; background: white; border-radius: 50%; transition: transform 0.2s; }
  .toggle.on .toggle-knob { transform: translateX(20px); }
  .toggle-label { font-size: 13px; color: var(--text); }
  .toggle-sub { font-size: 11px; color: var(--muted); margin-top: 4px; }

  /* ── VIDEO UPLOAD ── */
  .upload-drop { border: 1px dashed var(--border); border-radius: 4px; padding: 32px 24px; text-align: center; cursor: pointer; transition: border-color 0.2s, background 0.2s; position: relative; }
  .upload-drop:hover, .upload-drop.dragover { border-color: var(--accent); background: var(--accent-dim); }
  .upload-drop input[type="file"] { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
  .upload-drop-icon { font-size: 28px; margin-bottom: 10px; opacity: 0.5; }
  .upload-drop-label { font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.1em; color: var(--muted); text-transform: uppercase; }
  .upload-drop-hint { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.08em; color: var(--muted); margin-top: 6px; opacity: 0.6; }
  .upload-file-info { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--bg3); border: 1px solid var(--border); border-radius: 3px; margin-top: 12px; }
  .upload-file-name { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--text); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .upload-file-size { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); flex-shrink: 0; }
  .upload-file-clear { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 16px; padding: 0 4px; line-height: 1; transition: color 0.2s; flex-shrink: 0; }
  .upload-file-clear:hover { color: #F87171; }
  .upload-progress-wrap { margin-top: 12px; }
  .upload-progress-bar-bg { height: 3px; background: var(--bg3); border-radius: 2px; overflow: hidden; }
  .upload-progress-bar { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.25s ease; }
  .upload-progress-label { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); margin-top: 8px; display: flex; justify-content: space-between; }
  .upload-success { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: rgba(74,222,128,0.06); border: 1px solid rgba(74,222,128,0.2); border-radius: 3px; margin-top: 12px; font-family: 'DM Mono', monospace; font-size: 10px; color: #4ADE80; letter-spacing: 0.08em; }
  .upload-error { padding: 10px 14px; background: rgba(248,113,113,0.06); border: 1px solid rgba(248,113,113,0.2); border-radius: 3px; margin-top: 12px; font-family: 'DM Mono', monospace; font-size: 10px; color: #F87171; letter-spacing: 0.06em; line-height: 1.6; }

  /* ── PAGE HEADER / NAV CHROME ── */
  .page-hdr { padding: 60px 48px 48px; border-bottom: 1px solid var(--border); }
  .page-hdr-eyebrow { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 10px; }
  .page-hdr-title { font-family: 'Cormorant Garamond', serif; font-size: 56px; font-weight: 300; color: var(--text); }
  .page-hdr-sub { font-size: 14px; color: var(--muted); margin-top: 10px; max-width: 480px; line-height: 1.7; }
  .back-btn { display: inline-flex; align-items: center; gap: 8px; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); cursor: pointer; transition: color 0.2s; padding: 24px 48px; }
  .back-btn:hover { color: var(--accent); }

  /* ── NOTIFICATION ── */
  .notif { position: fixed; bottom: 32px; right: 32px; background: var(--bg3); border: 1px solid var(--accent); border-radius: 6px; padding: 14px 20px; font-size: 13px; color: var(--text); z-index: 999; animation: slideIn 0.3s ease; max-width: 340px; line-height: 1.5; }
  @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  /* ── MISC ── */
  .empty-state { padding: 80px 48px; text-align: center; }
  .empty-text { font-size: 14px; color: var(--muted); }
  .spotlight-toggle { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-family: 'DM Mono', monospace; letter-spacing: 0.1em; cursor: pointer; color: var(--muted); text-transform: uppercase; }
  .spotlight-toggle.active { color: var(--accent); }
  .spotlight-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
  .footer { padding: 48px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
  .footer-logo { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 400; color: var(--muted); }
  .footer-copy { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); letter-spacing: 0.1em; }
`;

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function Badge({ type }) {
  if (type === "Premium")   return <span className="badge-premium">&#9670; Premium</span>;
  if (type === "Open")      return <span className="badge-open">Open</span>;
  if (type === "Founding")  return <span className="badge-founding">Founding</span>;
  if (type === "review")    return <span className="badge-open badge-review">Under Review</span>;
  if (type === "following") return <span className="badge-following">Following</span>;
  return null;
}

function Notification({ msg, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3400);
    return () => clearTimeout(t);
  }, [onClose]);
  return <div className="notif">&#10022; {msg}</div>;
}

// ─── AUTH MODAL ───────────────────────────────────────────────────────────────

function AuthModal({ onClose, notify }) {
  const [tab, setTab]         = useState("signin");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(null);

  function reset() { setError(null); setSuccess(null); }

  async function handleSignIn(e) {
    e.preventDefault();
    reset(); setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    notify("Welcome back to RevaultAI.");
    onClose();
  }

  async function handleSignUp(e) {
    e.preventDefault();
    reset(); setLoading(true);
    const { error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccess("Account created. Check your email to confirm your address.");
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="auth-overlay" onClick={handleOverlayClick}>
      <div className="auth-modal-wrap">
        <div className="auth-modal">
          <button className="auth-close" onClick={onClose}>&#10005;</button>
          <div className="auth-header">
            <div className="auth-logo">REVAULT<span>AI</span></div>
            <div className="auth-tabs">
              <button
                className={"auth-tab" + (tab === "signin" ? " active" : "")}
                onClick={() => { setTab("signin"); reset(); }}
              >Sign In</button>
              <button
                className={"auth-tab" + (tab === "signup" ? " active" : "")}
                onClick={() => { setTab("signup"); reset(); }}
              >Create Account</button>
            </div>
          </div>
          <div className="auth-body">
            {tab === "signin" ? (
              <form onSubmit={handleSignIn}>
                <div className="auth-field">
                  <label className="auth-label">Email</label>
                  <input
                    className="auth-input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Password</label>
                  <input
                    className="auth-input"
                    type="password"
                    placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error   && <div className="auth-error">{error}</div>}
                {success && <div className="auth-success">{success}</div>}
                <button className="auth-submit" type="submit" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignUp}>
                <div className="auth-field">
                  <label className="auth-label">Email</label>
                  <input
                    className="auth-input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Password</label>
                  <input
                    className="auth-input"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                {error   && <div className="auth-error">{error}</div>}
                {success && <div className="auth-success">{success}</div>}
                <button className="auth-submit" type="submit" disabled={loading || !!success}>
                  {loading ? "Creating account..." : "Create Account"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────

function Nav({ page, setPage, user, onSignInClick, onSignOut }) {
  const initial = user?.email ? user.email[0].toUpperCase() : null;
  return (
    <nav className="nav">
      <div className="nav-logo" onClick={() => setPage("home")}>
        REVAULT<span>AI</span>
      </div>
      <div className="nav-center">
        <div className={"nav-link" + (page === "home"     ? " active" : "")} onClick={() => setPage("home")}>Home</div>
        <div className={"nav-link" + (page === "explore"  ? " active" : "")} onClick={() => setPage("explore")}>Explore</div>
        <div className={"nav-link" + (page === "creators" ? " active" : "")} onClick={() => setPage("creators")}>Creators</div>
        <div className={"nav-link" + (page === "submit"   ? " active" : "")} onClick={() => setPage("submit")}>Submit</div>
      </div>
      <div className="nav-right">
        {user ? (
          <div className="nav-user">
            <div className="nav-user-avatar">{initial}</div>
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

// Video-aware creation card with hover preview
function CreationCard({ creation, onClick }) {
  const isPending = creation.premium_status === "Pending";
  const videoRef = useRef(null);
  const hasPreview = !!creation.preview_video;

  function handleMouseEnter() {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }

  function handleMouseLeave() {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }

  return (
    <div
      className="creation-card"
      onClick={() => onClick(creation.id)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="creation-thumb">
        <img src={creation.thumbnail_image || creation.hero_image} alt={creation.title} />
        {hasPreview && (
          <video
            ref={videoRef}
            src={creation.preview_video}
            muted
            loop
            playsInline
            preload="metadata"
          />
        )}
        {(hasPreview || !!creation.video_url) && (
          <div className="video-indicator">&#9654; Film</div>
        )}
        <div className="creation-badge">
          {isPending
            ? <Badge type="review" />
            : creation.is_premium
              ? <Badge type="Premium" />
              : <Badge type="Open" />}
        </div>
        <div className="creation-info">
          <div className="creation-info-title">{creation.title}</div>
          <div className="creation-info-creator">by {creation.creator.display_name}</div>
        </div>
      </div>
    </div>
  );
}

function SpotlightSection({ creations, onView }) {
  const items = creations.filter((c) => c.spotlight && c.premium_status !== "Pending");
  if (items.length === 0) return null;
  return (
    <div className="spotlight-section-wrap">
      <div className="spotlight-section-header">
        <div className="section-label">Spotlight</div>
        <div className="section-sublabel">Handpicked creations from exceptional artists.</div>
      </div>
      <div className="spotlight-grid">
        {items.map((item) => (
          <div key={item.id} className="spotlight-card" onClick={() => onView(item.id)}>
            <img src={item.hero_image} alt={item.title} />
            <div className="spotlight-overlay" />
            <div className="spotlight-info">
              <div className="spotlight-cat">{item.category}</div>
              <div className="spotlight-title">{item.title}</div>
              <div className="spotlight-creator">by {item.creator.display_name}</div>
            </div>
          </div>
        ))}
      </div>
      <span className="spotlight-section-viewall" onClick={() => onView && onView(items[0]?.id)}>
        View All &#8594;
      </span>
    </div>
  );
}

// ─── PAGES ────────────────────────────────────────────────────────────────────

function HomePage({ creations, setPage, setDetailId }) {
  const premiumCreations = creations.filter((c) => c.is_premium && c.premium_status === "Approved");
  const openCreations = creations.filter((c) => !c.is_premium);

  function goDetail(id) { setDetailId(id); setPage("detail"); }

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-left">
          <div className="hero-eyebrow">AI-Native Creative Platform</div>
          <div className="hero-tagline">The AI era doesn't<br />need more content.</div>
          <span className="hero-tagline-accent">It needs curation.</span>
          <p className="hero-sub">RevaultAI is a curated archive of the world's best AI-generated creations.</p>
          <button className="hero-link" onClick={() => setPage("explore")}>
            Explore the Archive <span className="hero-link-arrow">&#8594;</span>
          </button>
        </div>
        <div className="hero-right">
          <img src="https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1400&q=90" alt="Cinematic AI visual" />
        </div>
      </section>

      <SpotlightSection creations={creations} onView={goDetail} />

      <section className="section">
        <div className="section-header">
          <div>
            <div className="section-label">Curated</div>
            <div className="section-sublabel">Premium creations from top-tier artists.</div>
          </div>
          <span className="section-link" onClick={() => setPage("explore")}>View All &#8594;</span>
        </div>
        <div className="creation-grid">
          {premiumCreations.slice(0, 4).map((c) => (
            <CreationCard key={c.id} creation={c} onClick={goDetail} />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <div className="section-label">Open Archive</div>
            <div className="section-sublabel">Free access to outstanding AI creations.</div>
          </div>
          <span className="section-link" onClick={() => setPage("explore")}>View All &#8594;</span>
        </div>
        <div className="creation-grid">
          {openCreations.slice(0, 4).map((c) => (
            <CreationCard key={c.id} creation={c} onClick={goDetail} />
          ))}
        </div>
      </section>

      <section className="manifesto">
        <div className="manifesto-rule" />
        <p className="manifesto-quote">
          "The AI era doesn't need more content. It needs curation.
          RevaultAI is built for signal over noise &mdash; where AI-native work is treated as craft, not feed."
        </p>
        <p className="manifesto-sub">
          RevaultAI is built for creators who believe AI is a medium, not just a tool.
          No vanity metrics. No algorithmic manipulation. Just work.
        </p>
      </section>

      <footer className="footer">
        <div className="footer-logo">RevaultAI</div>
        <div className="footer-copy">&copy; 2025 &mdash; The AI-native creative vault</div>
      </footer>
    </div>
  );
}

function ExplorePage({ creations, setPage, setDetailId }) {
  const [filter, setFilter] = useState("All");
  const [visible, setVisible] = useState(8);

  const filtered = creations.filter((c) => {
    if (c.premium_status === "Pending") return false;
    if (filter === "Premium") return c.is_premium;
    if (filter === "Open") return !c.is_premium;
    return true;
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
        <div className="filter-bar">
          {["All", "Premium", "Open"].map((f) => (
            <button
              key={f}
              className={"filter-btn" + (filter === f ? " active" : "")}
              onClick={() => { setFilter(f); setVisible(8); }}
            >
              {f}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-text">No creations in this category yet.</div></div>
        ) : (
          <div className="creation-grid">
            {filtered.slice(0, visible).map((c) => (
              <CreationCard key={c.id} creation={c} onClick={goDetail} />
            ))}
          </div>
        )}
        {visible < filtered.length && (
          <div className="load-more">
            <button className="btn-load" onClick={() => setVisible((v) => v + 8)}>Load more</button>
          </div>
        )}
      </section>
    </div>
  );
}

function CreatorsPage({ setPage, setCreatorUser, followedCreators }) {
  return (
    <div className="page">
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">Community</div>
        <div className="page-hdr-title">Creators</div>
        <div className="page-hdr-sub">Meet the people shaping AI-native creative work.</div>
      </div>
      <section className="section">
        <div className="creator-grid">
          {CREATORS.map((c) => (
            <div
              key={c.username}
              className="creator-card"
              onClick={() => { setCreatorUser(c.username); setPage("profile"); }}
            >
              <img className="creator-avatar" src={c.profile_image} alt={c.display_name} />
              <div className="creator-name">{c.display_name}</div>
              <div className="creator-handle">@{c.username}</div>
              <div className="creator-badges">
                {c.badges.map((b) => <Badge key={b} type={b} />)}
                {followedCreators.has(c.username) && <Badge type="following" />}
              </div>
              <div className="creator-tools">{c.tools_used.join(" \u00b7 ")}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProfilePage({ username, creations, setPage, setDetailId, followedCreators, toggleFollow }) {
  const creator = CREATORS.find((c) => c.username === username);
  const [filter, setFilter] = useState("All");

  if (!creator) {
    return (
      <div className="page">
        <div className="empty-state"><div className="empty-text">Creator not found.</div></div>
      </div>
    );
  }

  const isFollowing = followedCreators.has(username);
  const ownCreations = creations.filter((c) => c.creator.username === username);
  const filtered = ownCreations.filter((c) => {
    if (filter === "Premium") return c.is_premium;
    if (filter === "Open") return !c.is_premium;
    return true;
  });

  function goDetail(id) { setDetailId(id); setPage("detail"); }

  return (
    <div className="page">
      <div className="back-btn" onClick={() => setPage("creators")}>&larr; Creators</div>
      <div className="profile-header">
        <img className="profile-avatar" src={creator.profile_image} alt={creator.display_name} />
        <div>
          <div className="profile-name">{creator.display_name}</div>
          <div className="profile-handle">@{creator.username}</div>
          <div className="creator-badges" style={{ marginBottom: 12 }}>
            {creator.badges.map((b) => <Badge key={b} type={b} />)}
          </div>
          <div className="profile-bio">{creator.bio}</div>
          <div className="creator-tools" style={{ marginTop: 12 }}>
            {creator.tools_used.join(" \u00b7 ")}
          </div>
          <div className="profile-actions">
            <button
              className={"btn-follow " + (isFollowing ? "followed" : "unfollowed")}
              onClick={() => toggleFollow(creator)}
            >
              {isFollowing ? "&#10003; Following" : "+ Follow"}
            </button>
          </div>
        </div>
      </div>
      <section className="section">
        <div className="filter-bar">
          {["All", "Premium", "Open"].map((f) => (
            <button
              key={f}
              className={"filter-btn" + (filter === f ? " active" : "")}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-text">No creations in this category yet.</div></div>
        ) : (
          <div className="creation-grid">
            {filtered.map((c) => (
              <CreationCard key={c.id} creation={c} onClick={goDetail} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DetailPage({ id, creations, user, purchasedIds, setPage, setCreatorUser, notify }) {
  const creation = creations.find((c) => c.id === id);
  const [checkingOut, setCheckingOut] = useState(false);

  if (!creation) {
    return (
      <div className="page">
        <div className="empty-state"><div className="empty-text">Creation not found.</div></div>
      </div>
    );
  }

  const isPending  = creation.premium_status === "Pending";
  const hasVideo   = !!creation.video_url;
  const posterImg  = creation.thumbnail_image || creation.hero_image;
  const purchased  = purchasedIds.has(creation.id);
  const unlocked   = !creation.is_premium || purchased;
  const priceLabel = creation.price_cents
    ? "$" + (creation.price_cents / 100).toFixed(2)
    : "$4.99";

  async function handleBuy() {
    if (!user) { notify("Sign in to purchase."); return; }
    setCheckingOut(true);
    const { url, error } = await createCheckoutSession(creation.id, user.id);
    setCheckingOut(false);
    if (error) { notify("Checkout error: " + error.message); return; }
    window.location.href = url;
  }

  return (
    <div className="page detail-page">

      {/* ==== CINEMA STAGE ==== */}
      <div className="detail-cinema">
        <div className="detail-cinema-inner">
          <div className="detail-back" onClick={() => setPage("explore")}>
            &larr; Archive
          </div>
          {hasVideo && unlocked ? (
            <video src={creation.video_url} poster={posterImg} controls playsInline />
          ) : (
            <img className="detail-still" src={posterImg} alt={creation.title} />
          )}
        </div>
      </div>

      {/* ==== EDITORIAL STRIP ==== */}
      <div className="detail-editorial-strip">
        <div className="detail-editorial-inner">
          <div className="detail-editorial-left">
            <div className="detail-eyebrow">
              <div className="detail-eyebrow-line" />
              {creation.category}
            </div>
            <h1 className="detail-title">{creation.title}</h1>
            <div className="detail-creator-row">
              <span
                className="detail-creator-link"
                onClick={() => { setCreatorUser(creation.creator.username); setPage("profile"); }}
              >
                {creation.creator.display_name}
              </span>
              <span className="detail-creator-sep">&#183;</span>
              <span className="detail-category-tag">{creation.category}</span>
            </div>
            <div className="detail-tools-row">
              {creation.tools_used.map((t) => (
                <span key={t} className="detail-tool-tag">{t}</span>
              ))}
              {hasVideo && unlocked && (
                <span className="detail-tool-tag detail-tool-tag-video">&#9654; Film</span>
              )}
            </div>
          </div>
          <div className="detail-editorial-right">
            <div className="detail-badges-row">
              {creation.is_premium ? <Badge type="Premium" /> : <Badge type="Open" />}
              {isPending && <Badge type="review" />}
            </div>
          </div>
        </div>
      </div>

      {/* ==== PRODUCTION NOTE ==== */}
      <div className="detail-body">
        <div className="detail-rule" />
        <div className="detail-section-label">
          Production Note
          <div className="detail-section-label-line" />
        </div>
        <div className="prompt-box">
          {isPending ? (
            <p className="prompt-text" style={{ color: "var(--muted)", fontStyle: "italic" }}>
              This creation is under review. The prompt will be available once approved.
            </p>
          ) : unlocked ? (
            <>
              <p className="prompt-text">{creation.prompt_full}</p>
              {hasVideo && (
                <div className="unlock-area" style={{ borderTop: "1px solid var(--border)", marginTop: 24, paddingTop: 20 }}>
                  <a
                    href={creation.video_url}
                    download
                    className="btn-unlock-restrained"
                    style={{ textDecoration: "none", display: "inline-block" }}
                  >
                    &#11015; Download Film
                  </a>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="prompt-fade">
                <p className="prompt-text">{creation.prompt_preview}</p>
              </div>
              <div className="unlock-area">
                <span className="unlock-label">
                  Full prompt {hasVideo ? "and film download" : ""} available after purchase.
                </span>
                <button
                  className="btn-unlock-restrained"
                  onClick={handleBuy}
                  disabled={checkingOut}
                  style={{ opacity: checkingOut ? 0.6 : 1 }}
                >
                  {checkingOut ? "Redirecting..." : "Unlock for " + priceLabel}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}

function AdminPage({ creations, setCreations, notify }) {
  const pending = creations.filter((c) => c.premium_status === "Pending");
  const spotlightCount = creations.filter((c) => c.spotlight).length;

  function approve(id) {
    setCreations((prev) => prev.map((c) => c.id === id ? { ...c, premium_status: "Approved" } : c));
    notify("Creation approved and published on RevaultAI.");
  }
  function reject(id) {
    setCreations((prev) => prev.map((c) => c.id === id ? { ...c, premium_status: "Rejected" } : c));
    notify("Creation rejected.");
  }
  function toggleSpotlight(id) {
    const item = creations.find((c) => c.id === id);
    if (!item) return;
    if (!item.spotlight && spotlightCount >= 3) {
      notify("RevaultAI Spotlight is limited to 3 creations. Remove one first.");
      return;
    }
    setCreations((prev) => prev.map((c) => c.id === id ? { ...c, spotlight: !c.spotlight } : c));
  }

  const eligible = creations.filter((c) => c.premium_status !== "Pending" && c.premium_status !== "Rejected");

  return (
    <div className="page">
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">Internal</div>
        <div className="page-hdr-title">Admin</div>
        <div className="page-hdr-sub">Review submissions, manage spotlight, and control RevaultAI platform quality.</div>
      </div>
      <section className="section">
        <div style={{ marginBottom: 64 }}>
          <div className="section-label">Pending Review</div>
          <div className="section-title" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 400, color: "var(--text)", marginBottom: 24 }}>Premium Submissions</div>
          {pending.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 13, padding: "24px 0", fontFamily: "'DM Mono', monospace" }}>No pending submissions.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr><th>Title</th><th>Creator</th><th>Category</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {pending.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18 }}>{c.title}</td>
                    <td style={{ color: "var(--muted)" }}>{c.creator.display_name}</td>
                    <td style={{ color: "var(--muted)", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{c.category}</td>
                    <td>
                      <button className="btn-approve" onClick={() => approve(c.id)}>Approve</button>
                      <button className="btn-reject" onClick={() => reject(c.id)}>Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div>
          <div className="section-label">Spotlight Control</div>
          <div className="section-title" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 400, color: "var(--text)", marginBottom: 8 }}>Manage Spotlight</div>
          <p style={{ color: "var(--muted)", fontSize: 11, marginBottom: 24, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>{spotlightCount}/3 active</p>
          <table className="admin-table">
            <thead>
              <tr><th>Title</th><th>Creator</th><th>Type</th><th>Spotlight</th></tr>
            </thead>
            <tbody>
              {eligible.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18 }}>{c.title}</td>
                  <td style={{ color: "var(--muted)" }}>{c.creator.display_name}</td>
                  <td>{c.is_premium ? <Badge type="Premium" /> : <Badge type="Open" />}</td>
                  <td>
                    <div
                      className={"spotlight-toggle" + (c.spotlight ? " active" : "")}
                      onClick={() => toggleSpotlight(c.id)}
                    >
                      <div className="spotlight-dot" />
                      {c.spotlight ? "In Spotlight" : "Add to Spotlight"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SubmitPage({ setCreations, notify, setPage, user, profile }) {
  const [form, setForm] = useState({
    title:     "",
    tools:     "",
    category:  "Abstract",
    prompt:    "",
    isPremium: false,
  });

  // ── upload state ────────────────────────────────────────────────────────────
  const [videoFile,    setVideoFile]    = useState(null);   // File object
  const [uploadState,  setUploadState]  = useState("idle"); // idle | uploading | done | error
  const [uploadPct,    setUploadPct]    = useState(0);
  const [uploadResult, setUploadResult] = useState(null);   // { video_url, preview_video, thumbnail_image }
  const [uploadError,  setUploadError]  = useState(null);
  const [dragover,     setDragover]     = useState(false);
  const [submitting,   setSubmitting]   = useState(false);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function formatBytes(bytes) {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function pickFile(file) {
    if (!file) return;
    const allowed = ["video/mp4", "video/quicktime", "video/webm"];
    if (!allowed.includes(file.type)) {
      setUploadError("Only MP4, MOV, or WebM files are accepted.");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setUploadError("File exceeds the 500 MB limit.");
      return;
    }
    setVideoFile(file);
    setUploadState("idle");
    setUploadResult(null);
    setUploadError(null);
    setUploadPct(0);
  }

  function clearFile() {
    setVideoFile(null);
    setUploadState("idle");
    setUploadResult(null);
    setUploadError(null);
    setUploadPct(0);
  }

  async function uploadToR2() {
    if (!videoFile) return;
    setUploadState("uploading");
    setUploadError(null);
    setUploadPct(0);

    const formData = new FormData();
    formData.append("video", videoFile);

    try {
      // XHR lets us track real progress; fetch does not expose upload progress
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setUploadPct(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error("Invalid response from upload server."));
            }
          } else {
            let msg = "Upload failed.";
            try { msg = JSON.parse(xhr.responseText).error || msg; } catch {}
            reject(new Error(msg));
          }
        });

        xhr.addEventListener("error",  () => reject(new Error("Network error during upload.")));
        xhr.addEventListener("abort",  () => reject(new Error("Upload was cancelled.")));
        xhr.send(formData);
      });

      setUploadPct(100);
      setUploadResult(result);
      setUploadState("done");
    } catch (err) {
      setUploadError(err.message);
      setUploadState("error");
    }
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.prompt.trim()) {
      notify("Please fill in the Title and Prompt fields.");
      return;
    }
    if (videoFile && uploadState !== "done") {
      notify("Please wait for your video to finish uploading.");
      return;
    }

    setSubmitting(true);
    const toolList = form.tools.split(",").map((t) => t.trim()).filter(Boolean);

    const fallbackThumb = "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&q=90";

    const newCreation = {
      id:              "u" + Date.now(),   // temp id, replaced by DB uuid on insert
      title:           form.title.trim(),
      creator: {
        username:     profile?.username     ?? user?.email?.split("@")[0] ?? "you",
        display_name: profile?.display_name ?? user?.email?.split("@")[0] ?? "You",
      },
      hero_image:      uploadResult?.thumbnail_image || fallbackThumb,
      thumbnail_image: uploadResult?.thumbnail_image || fallbackThumb,
      video_url:       uploadResult?.video_url       || "",
      preview_video:   uploadResult?.preview_video   || "",
      tools_used:      toolList.length > 0 ? toolList : ["Unknown"],
      category:        form.category,
      is_premium:      form.isPremium,
      premium_status:  form.isPremium ? "Pending" : null,
      prompt_preview:  form.isPremium ? form.prompt.trim().slice(0, 120) + "..." : null,
      prompt_full:     form.prompt.trim(),
      spotlight:       false,
    };

    // ── Optimistic update ────────────────────────────────────────────────────
    setCreations((prev) => [newCreation, ...prev]);

    // ── Persist to Supabase ──────────────────────────────────────────────────
    const { data: saved, error } = await insertCreation(newCreation, user);

    if (error) {
      console.error("[RevaultAI] Supabase insert failed:", error.message);
      // Replace temp optimistic item with a note about the failure;
      // the creation still exists in local state so the user isn't stuck.
      notify("Saved locally -- could not reach the database. Check your connection.");
    } else if (saved) {
      // Swap temp id for the real DB uuid so links work correctly
      setCreations((prev) =>
        prev.map((c) => (c.id === newCreation.id ? saved : c))
      );
    }

    setSubmitting(false);
    setPage("explore");
    if (!error) {
      notify(
        form.isPremium
          ? "Submitted! Your creation will be reviewed before going public."
          : "Creation submitted and now live on RevaultAI."
      );
    }
  }

  return (
    <div className="page">
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">Publish</div>
        <div className="page-hdr-title">Submit Creation</div>
        <div className="page-hdr-sub">Share your AI-native work with the RevaultAI community.</div>
      </div>
      <section className="section">
        <div style={{ maxWidth: 640 }}>

          {/* Title */}
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" placeholder="Name your creation" value={form.title} onChange={(e) => updateField("title", e.target.value)} />
          </div>

          {/* Video upload */}
          <div className="form-group">
            <label className="form-label">Film / Video</label>

            {!videoFile ? (
              <div
                className={"upload-drop" + (dragover ? " dragover" : "")}
                onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
                onDragLeave={() => setDragover(false)}
                onDrop={(e) => { e.preventDefault(); setDragover(false); pickFile(e.dataTransfer.files[0]); }}
              >
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={(e) => pickFile(e.target.files[0])}
                />
                <div className="upload-drop-icon">&#9654;</div>
                <div className="upload-drop-label">Drop your film here or click to browse</div>
                <div className="upload-drop-hint">MP4, MOV, WebM &middot; max 500 MB</div>
              </div>
            ) : (
              <>
                <div className="upload-file-info">
                  <span className="upload-file-name">{videoFile.name}</span>
                  <span className="upload-file-size">{formatBytes(videoFile.size)}</span>
                  {uploadState !== "uploading" && (
                    <button className="upload-file-clear" onClick={clearFile}>&#10005;</button>
                  )}
                </div>

                {uploadState === "idle" && (
                  <button
                    className="btn-primary"
                    style={{ marginTop: 12, padding: "10px 24px", fontSize: 11 }}
                    onClick={uploadToR2}
                  >
                    Upload to Vault
                  </button>
                )}

                {uploadState === "uploading" && (
                  <div className="upload-progress-wrap">
                    <div className="upload-progress-bar-bg">
                      <div className="upload-progress-bar" style={{ width: uploadPct + "%" }} />
                    </div>
                    <div className="upload-progress-label">
                      <span>Uploading...</span>
                      <span>{uploadPct}%</span>
                    </div>
                  </div>
                )}

                {uploadState === "done" && (
                  <div className="upload-success">
                    &#10003;&nbsp; Upload complete
                  </div>
                )}

                {uploadState === "error" && (
                  <>
                    <div className="upload-error">{uploadError}</div>
                    <button
                      className="btn-primary"
                      style={{ marginTop: 10, padding: "9px 20px", fontSize: 11 }}
                      onClick={uploadToR2}
                    >
                      Retry Upload
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Tools */}
          <div className="form-group">
            <label className="form-label">Tools Used</label>
            <input className="form-input" placeholder="Sora, Runway, MidJourney" value={form.tools} onChange={(e) => updateField("tools", e.target.value)} />
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={(e) => updateField("category", e.target.value)}>
              {CATEGORIES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* Prompt */}
          <div className="form-group">
            <label className="form-label">Prompt *</label>
            <textarea className="form-textarea" placeholder="Describe your full prompt in detail..." value={form.prompt} onChange={(e) => updateField("prompt", e.target.value)} />
          </div>

          {/* Premium toggle */}
          <div className="form-group">
            <div className="toggle-row">
              <div className={"toggle" + (form.isPremium ? " on" : "")} onClick={() => updateField("isPremium", !form.isPremium)}>
                <div className="toggle-knob" />
              </div>
              <div>
                <div className="toggle-label">Premium Prompt</div>
                <div className="toggle-sub">
                  {form.isPremium ? "Prompt will be paywalled and requires admin approval." : "Prompt will be freely visible to all."}
                </div>
              </div>
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={submitting || uploadState === "uploading"}
            style={{ opacity: (submitting || uploadState === "uploading") ? 0.6 : 1 }}
          >
            {submitting ? "Submitting..." : "Submit Creation"}
          </button>

        </div>
      </section>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [creations, setCreations]               = useState(SEED_CREATIONS.map((c) => ({ ...c })));
  const [dbLoaded,  setDbLoaded]                = useState(false);
  const [page, setPage]                         = useState("home");
  const [detailId, setDetailId]                 = useState(null);
  const [creatorUser, setCreatorUser]           = useState(null);
  const [notifMsg, setNotifMsg]                 = useState(null);
  const [followedCreators, setFollowedCreators] = useState(new Set());
  const [user, setUser]                         = useState(null);
  const [profile, setProfile]                   = useState(null);
  const [authOpen, setAuthOpen]                 = useState(false);
  const [purchasedIds, setPurchasedIds]         = useState(new Set());

  // ── Supabase auth listener + profile load/create ───────────────────────────
  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) loadOrCreateProfile(u);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadOrCreateProfile(u);
      } else {
        setProfile(null);
        setPurchasedIds(new Set());
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadOrCreateProfile(u) {
    const { data, error } = await fetchProfile(u.id);

    if (error) {
      console.warn("[RevaultAI] Could not fetch profile:", error.message);
      return;
    }

    if (data) {
      setProfile(data);
    } else {
      // No row yet -- insert a default profile derived from the email
      const def = defaultProfile(u);
      const { data: created, error: upsertErr } = await upsertProfile(u, def);
      if (upsertErr) {
        console.warn("[RevaultAI] Could not create default profile:", upsertErr.message);
        // Use the in-memory default so the rest of the app still works
        setProfile({ id: u.id, ...def });
      } else {
        setProfile(created);
      }
    }
  }

  // ── Load creations from Supabase, keep seed data as fallback ───────────────
  useEffect(() => {
    async function load() {
      const { data, error } = await fetchCreations();
      if (error) {
        console.warn("[RevaultAI] Could not load creations from Supabase:", error.message);
        setDbLoaded(false);
        return;
      }
      if (data && data.length > 0) {
        setCreations([...data, ...SEED_CREATIONS.map((c) => ({ ...c }))]);
      }
      setDbLoaded(true);
    }
    load();
  }, []);

  // ── Reload purchased ids whenever user changes ──────────────────────────────
  useEffect(() => {
    async function loadPurchases() {
      if (!user?.id) {
        setPurchasedIds(new Set());
        return;
      }
      const { data } = await fetchPurchasedIds(user.id);
      if (data) setPurchasedIds(data);
    }
    loadPurchases();
  }, [user]);

  // ── Handle Stripe success redirect ─────────────────────────────────────────
  useEffect(() => {
    async function handlePurchaseReturn() {
      const params    = new URLSearchParams(window.location.search);
      const sessionId = params.get("session_id");
      if (!sessionId) return;

      // Clean the URL immediately so a refresh does not re-trigger
      window.history.replaceState({}, "", window.location.pathname);

      setPage("purchase-success");

      const res  = await fetch("/api/verify-session", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ session_id: sessionId }),
      });
      const json = await res.json();

      if (!res.ok) {
        // notify is not stable here yet; use setNotifMsg directly
        setNotifMsg("Purchase verification failed: " + (json.error || "Unknown error"));
        return;
      }

      // Re-fetch purchased ids for whoever is signed in at this point.
      // user may still be null if auth hasn't resolved; the purchases
      // useEffect above will catch it once user state settles.
      const userId = json.user_id;
      if (userId) {
        const { data: ids } = await fetchPurchasedIds(userId);
        if (ids) setPurchasedIds(ids);
      }
    }
    handlePurchaseReturn();
  }, []); // runs once on mount, before any navigation

  function notify(msg) { setNotifMsg(msg); }

  async function handleSignOut() {
    await supabase.auth.signOut();
    notify("Signed out of RevaultAI.");
  }

  function toggleFollow(creator) {
    setFollowedCreators((prev) => {
      const next = new Set(prev);
      if (next.has(creator.username)) {
        next.delete(creator.username);
        notify("Unfollowed " + creator.display_name);
      } else {
        next.add(creator.username);
        notify("Following " + creator.display_name);
      }
      return next;
    });
  }

  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  function renderPage() {
    switch (page) {
      case "home":
        return <HomePage creations={creations} setPage={setPage} setDetailId={setDetailId} />;
      case "explore":
        return <ExplorePage creations={creations} setPage={setPage} setDetailId={setDetailId} />;
      case "creators":
        return <CreatorsPage setPage={setPage} setCreatorUser={setCreatorUser} followedCreators={followedCreators} />;
      case "profile":
        return (
          <ProfilePage
            username={creatorUser}
            creations={creations}
            setPage={setPage}
            setDetailId={setDetailId}
            followedCreators={followedCreators}
            toggleFollow={toggleFollow}
            dbProfile={null}
          />
        );
      case "myprofile":
        return (
          <ProfilePage
            username={profile?.username ?? ""}
            creations={creations}
            setPage={setPage}
            setDetailId={setDetailId}
            followedCreators={followedCreators}
            toggleFollow={toggleFollow}
            dbProfile={profile}
          />
        );
      case "detail":
        return (
          <DetailPage
            id={detailId}
            creations={creations}
            user={user}
            purchasedIds={purchasedIds}
            setPage={setPage}
            setCreatorUser={setCreatorUser}
            notify={notify}
          />
        );
      case "admin":
        if (!isAdmin(user)) {
          return (
            <div className="page">
              <div className="empty-state">
                <div className="empty-text">Not authorized.</div>
              </div>
            </div>
          );
        }
        return <AdminPage creations={creations} setCreations={setCreations} notify={notify} />;
      case "submit":
        return <SubmitPage setCreations={setCreations} notify={notify} setPage={setPage} user={user} profile={profile} />;
      case "mycreations":
        return (
          <MyCreationsPage
            creations={creations}
            user={user}
            setPage={setPage}
            setDetailId={setDetailId}
            setCreations={setCreations}
            notify={notify}
            onSignInClick={() => setAuthOpen(true)}
          />
        );
      case "purchase-success":
        return (
          <div className="page">
            <div className="empty-state" style={{ paddingTop: 120 }}>
              <div className="empty-text" style={{ color: "var(--text)", fontSize: 18, marginBottom: 12 }}>
                Purchase confirmed.
              </div>
              <div className="empty-text" style={{ marginBottom: 32 }}>Your creation is now unlocked.</div>
              <button className="btn-primary" onClick={() => setPage("explore")}>Back to Archive</button>
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <Nav
        page={page}
        setPage={setPage}
        user={user}
        onSignInClick={() => setAuthOpen(true)}
        onSignOut={handleSignOut}
      />
      {renderPage()}
      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          notify={notify}
        />
      )}
      {notifMsg && (
        <Notification key={notifMsg} msg={notifMsg} onClose={() => setNotifMsg(null)} />
      )}
    </>
  );
}