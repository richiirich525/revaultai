import { useState, useEffect } from "react";

// ─── SEED DATA ────────────────────────────────────────────────────────────────

const SEED_CREATIONS = [
  {
    id: "c1",
    title: "Meridian Collapse",
    creator: { username: "solara", display_name: "Solara Chen" },
    hero_image: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=700&q=80",
    tools_used: ["Sora", "Runway"],
    category: "Sci-Fi",
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
    hero_image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=700&q=80",
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
    hero_image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=700&q=80",
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
    hero_image: "https://images.unsplash.com/photo-1545156521-77bd85671d30?w=700&q=80",
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
    hero_image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=700&q=80",
    tools_used: ["MidJourney", "Kling"],
    category: "Dark Fantasy",
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
    hero_image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=700&q=80",
    tools_used: ["Sora"],
    category: "Sci-Fi",
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
    hero_image: "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=700&q=80",
    tools_used: ["Runway", "Stable Diffusion"],
    category: "Thriller",
    is_premium: true,
    premium_status: "Pending",
    prompt_preview: "Under review.",
    prompt_full: "[PENDING REVIEW]",
    spotlight: false,
  },
  {
    id: "c8",
    title: "Fold and Dissolve",
    creator: { username: "lumen_x", display_name: "Lumen X" },
    hero_image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=700&q=80",
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
    profile_image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&q=80",
    tools_used: ["Sora", "Runway", "MidJourney", "After Effects"],
    badges: ["Founding", "Premium"],
  },
  {
    username: "nvoid",
    display_name: "Nullvoid",
    bio: "Systems thinker. I build worlds that collapse beautifully.",
    profile_image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&q=80",
    tools_used: ["Kling", "Runway", "Stable Diffusion"],
    badges: ["Premium"],
  },
  {
    username: "mira_kd",
    display_name: "Mira Kade",
    bio: "Noir, memory, and machine vision. Every frame is a question.",
    profile_image: "https://images.unsplash.com/photo-1494790108755-2616b612b977?w=300&q=80",
    tools_used: ["Sora", "Stable Diffusion"],
    badges: ["Founding"],
  },
  {
    username: "lumen_x",
    display_name: "Lumen X",
    bio: "Light is the medium. AI is the brush.",
    profile_image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&q=80",
    tools_used: ["MidJourney", "Kling"],
    badges: [],
  },
];

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

  .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 20px 48px; background: rgba(14,15,20,0.85); backdrop-filter: blur(24px); border-bottom: 1px solid var(--border); }
  .nav-logo { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 600; letter-spacing: 0.08em; color: var(--text); cursor: pointer; }
  .nav-logo span { color: var(--accent); }
  .nav-links { display: flex; gap: 36px; align-items: center; }
  .nav-link { font-size: 12px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); cursor: pointer; transition: color 0.2s; }
  .nav-link:hover, .nav-link.active { color: var(--text); }
  .nav-cta { background: var(--accent); color: white; padding: 8px 20px; border-radius: 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; transition: opacity 0.2s, box-shadow 0.2s; border: none; font-family: 'Syne', sans-serif; }
  .nav-cta:hover { opacity: 0.88; box-shadow: 0 0 24px var(--accent-glow); }

  .page { min-height: 100vh; padding-top: 80px; }
  .container { max-width: 1280px; margin: 0 auto; padding: 0 48px; }

  .hero { min-height: 88vh; display: flex; flex-direction: column; justify-content: center; padding: 80px 48px 64px; position: relative; overflow: hidden; }
  .hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 60% 60% at 70% 40%, rgba(123,63,228,0.10) 0%, transparent 70%); pointer-events: none; }
  .hero-eyebrow { font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 28px; }
  .hero-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(72px, 10vw, 140px); font-weight: 300; line-height: 0.92; letter-spacing: -0.02em; color: var(--text); margin-bottom: 36px; }
  .hero-title em { font-style: italic; color: rgba(232,230,240,0.5); }
  .hero-sub { font-size: 16px; font-weight: 400; color: var(--muted); max-width: 440px; line-height: 1.7; margin-bottom: 52px; }
  .hero-actions { display: flex; gap: 16px; align-items: center; }
  .btn-primary { background: var(--accent); color: white; padding: 14px 32px; border-radius: 4px; font-size: 12px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; border: none; transition: all 0.2s; font-family: 'Syne', sans-serif; }
  .btn-primary:hover { opacity: 0.88; box-shadow: 0 8px 32px var(--accent-glow); }
  .btn-ghost { background: transparent; color: var(--text); padding: 13px 32px; border-radius: 4px; font-size: 12px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; border: 1px solid var(--border-hover); transition: all 0.2s; font-family: 'Syne', sans-serif; }
  .btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
  .hero-grid { position: absolute; right: 0; top: 0; bottom: 0; width: 50%; opacity: 0.06; background-image: linear-gradient(rgba(123,63,228,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(123,63,228,0.5) 1px, transparent 1px); background-size: 40px 40px; pointer-events: none; }

  .section { padding: 80px 48px; }
  .section-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 48px; }
  .section-label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 8px; }
  .section-title { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 400; color: var(--text); }
  .section-link { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); cursor: pointer; transition: color 0.2s; }
  .section-link:hover { color: var(--accent); }

  .spotlight-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; }
  .spotlight-card { position: relative; aspect-ratio: 3/4; overflow: hidden; cursor: pointer; }
  .spotlight-card img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94); }
  .spotlight-card:hover img { transform: scale(1.04); }
  .spotlight-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(14,15,20,0.92) 0%, rgba(14,15,20,0.2) 50%, transparent 100%); }
  .spotlight-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 28px 24px; }
  .spotlight-cat { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 6px; }
  .spotlight-title { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 400; color: var(--text); margin-bottom: 6px; line-height: 1.1; }
  .spotlight-creator { font-size: 11px; color: var(--muted); }

  .badge-premium { display: inline-flex; align-items: center; gap: 4px; background: var(--premium-dim); border: 1px solid rgba(196,154,60,0.3); color: var(--premium); padding: 2px 8px; border-radius: 2px; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; }
  .badge-open { display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.04); border: 1px solid var(--border); color: var(--muted); padding: 2px 8px; border-radius: 2px; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; }
  .badge-review { background: rgba(255,165,0,0.08); border: 1px solid rgba(255,165,0,0.25); color: rgba(255,165,0,0.7); }
  .badge-founding { display: inline-flex; align-items: center; background: var(--accent-dim); border: 1px solid rgba(123,63,228,0.3); color: var(--accent); padding: 2px 8px; border-radius: 2px; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; }

  .creation-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2px; }
  .creation-card { background: var(--bg2); cursor: pointer; border: 1px solid transparent; transition: border-color 0.25s; position: relative; overflow: hidden; }
  .creation-card:hover { border-color: var(--border-hover); }
  .creation-card:hover .creation-thumb img { transform: scale(1.04); }
  .creation-thumb { position: relative; aspect-ratio: 16/9; overflow: hidden; }
  .creation-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94); }
  .creation-badge { position: absolute; top: 12px; right: 12px; }
  .creation-body { padding: 20px; }
  .creation-tools { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
  .tool-tag { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.1em; color: var(--muted); background: var(--bg3); padding: 3px 8px; border-radius: 2px; }
  .creation-title { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 400; color: var(--text); margin-bottom: 4px; }
  .creation-creator { font-size: 11px; color: var(--muted); }

  .manifesto { padding: 120px 48px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); text-align: center; position: relative; overflow: hidden; }
  .manifesto::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 50% 80% at 50% 50%, rgba(123,63,228,0.06), transparent); pointer-events: none; }
  .manifesto-quote { font-family: 'Cormorant Garamond', serif; font-size: clamp(28px, 4vw, 52px); font-weight: 300; line-height: 1.4; color: var(--text); max-width: 860px; margin: 0 auto 36px; font-style: italic; }
  .manifesto-sub { font-size: 13px; color: var(--muted); letter-spacing: 0.08em; max-width: 480px; margin: 0 auto; line-height: 1.7; }
  .manifesto-rule { width: 48px; height: 1px; background: var(--accent); margin: 0 auto 48px; }

  .filter-bar { display: flex; gap: 2px; margin-bottom: 48px; flex-wrap: wrap; }
  .filter-btn { padding: 10px 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--muted); transition: all 0.2s; border-radius: 2px; font-family: 'Syne', sans-serif; }
  .filter-btn.active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }
  .filter-btn:hover:not(.active) { border-color: rgba(255,255,255,0.15); color: var(--text); }

  .creator-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 2px; }
  .creator-card { background: var(--bg2); padding: 28px; cursor: pointer; border: 1px solid transparent; transition: border-color 0.25s; }
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

  .detail-hero { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
  .detail-body { padding: 48px; }
  .detail-title { font-family: 'Cormorant Garamond', serif; font-size: 52px; font-weight: 300; color: var(--text); margin-bottom: 8px; }
  .detail-meta { display: flex; align-items: center; gap: 20px; margin-bottom: 40px; flex-wrap: wrap; }
  .detail-divider { color: var(--border); }
  .prompt-box { background: var(--bg2); border: 1px solid var(--border); border-radius: 4px; padding: 28px; }
  .prompt-label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 16px; }
  .prompt-text { font-family: 'DM Mono', monospace; font-size: 13px; color: var(--text); line-height: 1.8; }
  .prompt-fade { position: relative; overflow: hidden; max-height: 120px; }
  .prompt-fade::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 80px; background: linear-gradient(transparent, var(--bg2)); }
  .unlock-area { margin-top: 24px; text-align: center; }
  .unlock-label { font-size: 12px; color: var(--muted); margin-bottom: 12px; }

  .admin-table { width: 100%; border-collapse: collapse; }
  .admin-table th { text-align: left; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.15em; color: var(--muted); text-transform: uppercase; padding: 12px 16px; border-bottom: 1px solid var(--border); }
  .admin-table td { padding: 16px; border-bottom: 1px solid var(--border); font-size: 13px; color: var(--text); vertical-align: middle; }
  .admin-table tr:hover td { background: var(--bg2); }
  .btn-approve { background: rgba(74,222,128,0.12); border: 1px solid rgba(74,222,128,0.3); color: #4ADE80; padding: 6px 14px; border-radius: 2px; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; margin-right: 8px; font-family: 'Syne', sans-serif; }
  .btn-approve:hover { background: rgba(74,222,128,0.2); }
  .btn-reject { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.25); color: #F87171; padding: 6px 14px; border-radius: 2px; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; font-family: 'Syne', sans-serif; }
  .btn-reject:hover { background: rgba(248,113,113,0.18); }

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

  .load-more { text-align: center; padding: 48px 0; }
  .btn-load { background: transparent; border: 1px solid var(--border); color: var(--muted); padding: 12px 36px; border-radius: 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; font-family: 'Syne', sans-serif; }
  .btn-load:hover { border-color: var(--accent); color: var(--accent); }

  .page-hdr { padding: 60px 48px 48px; border-bottom: 1px solid var(--border); }
  .page-hdr-eyebrow { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 10px; }
  .page-hdr-title { font-family: 'Cormorant Garamond', serif; font-size: 56px; font-weight: 300; color: var(--text); }
  .page-hdr-sub { font-size: 14px; color: var(--muted); margin-top: 10px; max-width: 480px; line-height: 1.7; }

  .back-btn { display: inline-flex; align-items: center; gap: 8px; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); cursor: pointer; transition: color 0.2s; margin: 24px 48px; }
  .back-btn:hover { color: var(--accent); }

  .notif { position: fixed; bottom: 32px; right: 32px; background: var(--bg3); border: 1px solid var(--accent); border-radius: 6px; padding: 14px 20px; font-size: 13px; color: var(--text); z-index: 999; animation: slideIn 0.3s ease; max-width: 340px; line-height: 1.5; }
  @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

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
  if (type === "Premium")  return <span className="badge-premium">&#9670; Premium</span>;
  if (type === "Open")     return <span className="badge-open">Open</span>;
  if (type === "Founding") return <span className="badge-founding">Founding</span>;
  if (type === "review")   return <span className="badge-open badge-review">Under Review</span>;
  return null;
}

function Notification({ msg, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3400);
    return () => clearTimeout(t);
  }, [onClose]);
  return <div className="notif">&#10022; {msg}</div>;
}

function Nav({ page, setPage }) {
  return (
    <nav className="nav">
      <div className="nav-logo" onClick={() => setPage("home")}>
        Revault<span>AI</span>
      </div>
      <div className="nav-links">
        <div
          className={"nav-link" + (page === "explore" ? " active" : "")}
          onClick={() => setPage("explore")}
        >
          Explore
        </div>
        <div
          className={"nav-link" + (page === "creators" ? " active" : "")}
          onClick={() => setPage("creators")}
        >
          Creators
        </div>
        <button className="nav-cta" onClick={() => setPage("submit")}>
          Submit Work
        </button>
      </div>
    </nav>
  );
}

function SpotlightSection({ creations, onView }) {
  const items = creations.filter(
    (c) => c.spotlight && c.premium_status !== "Pending"
  );
  if (items.length === 0) return null;
  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Spotlight</div>
          <div className="section-title">Curated this week</div>
        </div>
      </div>
      <div className="spotlight-grid">
        {items.map((item) => (
          <div
            key={item.id}
            className="spotlight-card"
            onClick={() => onView(item.id)}
          >
            <img src={item.hero_image} alt={item.title} />
            <div className="spotlight-overlay" />
            <div className="spotlight-info">
              <div className="spotlight-cat">{item.category}</div>
              <div className="spotlight-title">{item.title}</div>
              <div className="spotlight-creator">
                by {item.creator.display_name}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CreationCard({ creation, onClick }) {
  const isPending = creation.premium_status === "Pending";
  return (
    <div className="creation-card" onClick={() => onClick(creation.id)}>
      <div className="creation-thumb">
        <img src={creation.hero_image} alt={creation.title} />
        <div className="creation-badge">
          {isPending
            ? <Badge type="review" />
            : creation.is_premium
              ? <Badge type="Premium" />
              : <Badge type="Open" />}
        </div>
      </div>
      <div className="creation-body">
        <div className="creation-tools">
          {creation.tools_used.slice(0, 3).map((t) => (
            <span key={t} className="tool-tag">{t}</span>
          ))}
        </div>
        <div className="creation-title">{creation.title}</div>
        <div className="creation-creator">by {creation.creator.display_name}</div>
      </div>
    </div>
  );
}

// ─── PAGES ────────────────────────────────────────────────────────────────────

function HomePage({ creations, setPage, setDetailId }) {
  const premiumCreations = creations.filter(
    (c) => c.is_premium && c.premium_status === "Approved"
  );
  const openCreations = creations.filter((c) => !c.is_premium);

  function goDetail(id) {
    setDetailId(id);
    setPage("detail");
  }

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-grid" />
        <div className="container">
          <div className="hero-eyebrow">AI-Native Creative Platform</div>
          <h1 className="hero-title">Revault<em>AI</em></h1>
          <p className="hero-sub">
            Home to creators shaping the AI-native era. Publish, share, and
            monetize your AI-generated work without the noise.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => setPage("explore")}>
              Explore
            </button>
            <button className="btn-ghost" onClick={() => setPage("submit")}>
              Create
            </button>
          </div>
        </div>
      </section>

      <SpotlightSection creations={creations} onView={goDetail} />

      <section className="section">
        <div className="section-header">
          <div>
            <div className="section-label">Premium</div>
            <div className="section-title">Exclusive prompts</div>
          </div>
          <span className="section-link" onClick={() => setPage("explore")}>
            View all
          </span>
        </div>
        <div className="creation-grid">
          {premiumCreations.slice(0, 3).map((c) => (
            <CreationCard key={c.id} creation={c} onClick={goDetail} />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <div className="section-label">Open Access</div>
            <div className="section-title">Free creations</div>
          </div>
          <span className="section-link" onClick={() => setPage("explore")}>
            View all
          </span>
        </div>
        <div className="creation-grid">
          {openCreations.slice(0, 3).map((c) => (
            <CreationCard key={c.id} creation={c} onClick={goDetail} />
          ))}
        </div>
      </section>

      <section className="manifesto">
        <div className="manifesto-rule" />
        <p className="manifesto-quote">
          "The AI era requires new creative infrastructure. Not more feeds,
          but deeper vaults. Not more noise, but singular signal."
        </p>
        <p className="manifesto-sub">
          RevaultAI is built for creators who believe AI is a medium, not just
          a tool. No vanity metrics. No algorithmic manipulation. Just work.
        </p>
      </section>

      <footer className="footer">
        <div className="footer-logo">RevaultAI</div>
        <div className="footer-copy">
          &copy; 2025 &mdash; The AI-native creative vault
        </div>
      </footer>
    </div>
  );
}

function ExplorePage({ creations, setPage, setDetailId }) {
  const [filter, setFilter] = useState("All");
  const [visible, setVisible] = useState(6);

  const filtered = creations.filter((c) => {
    if (c.premium_status === "Pending") return false;
    if (filter === "Premium") return c.is_premium;
    if (filter === "Open") return !c.is_premium;
    return true;
  });

  function goDetail(id) {
    setDetailId(id);
    setPage("detail");
  }

  return (
    <div className="page">
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">Browse</div>
        <div className="page-hdr-title">Explore</div>
        <div className="page-hdr-sub">
          All creations published by the RevaultAI community.
        </div>
      </div>

      <SpotlightSection creations={creations} onView={goDetail} />

      <section className="section">
        <div className="filter-bar">
          {["All", "Premium", "Open"].map((f) => (
            <button
              key={f}
              className={"filter-btn" + (filter === f ? " active" : "")}
              onClick={() => { setFilter(f); setVisible(6); }}
            >
              {f}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-text">No creations in this category yet.</div>
          </div>
        ) : (
          <div className="creation-grid">
            {filtered.slice(0, visible).map((c) => (
              <CreationCard key={c.id} creation={c} onClick={goDetail} />
            ))}
          </div>
        )}
        {visible < filtered.length && (
          <div className="load-more">
            <button
              className="btn-load"
              onClick={() => setVisible((v) => v + 6)}
            >
              Load more
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function CreatorsPage({ setPage, setCreatorUser }) {
  return (
    <div className="page">
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">Community</div>
        <div className="page-hdr-title">Creators</div>
        <div className="page-hdr-sub">
          Meet the people shaping AI-native creative work.
        </div>
      </div>
      <section className="section">
        <div className="creator-grid">
          {CREATORS.map((c) => (
            <div
              key={c.username}
              className="creator-card"
              onClick={() => {
                setCreatorUser(c.username);
                setPage("profile");
              }}
            >
              <img
                className="creator-avatar"
                src={c.profile_image}
                alt={c.display_name}
              />
              <div className="creator-name">{c.display_name}</div>
              <div className="creator-handle">@{c.username}</div>
              <div className="creator-badges">
                {c.badges.map((b) => <Badge key={b} type={b} />)}
              </div>
              <div className="creator-tools">{c.tools_used.join(" · ")}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProfilePage({ username, creations, setPage, setDetailId }) {
  const creator = CREATORS.find((c) => c.username === username);
  const [filter, setFilter] = useState("All");

  if (!creator) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-text">Creator not found.</div>
        </div>
      </div>
    );
  }

  // Show all creations including Pending on the creator's own profile
  const ownCreations = creations.filter((c) => c.creator.username === username);
  const filtered = ownCreations.filter((c) => {
    if (filter === "Premium") return c.is_premium;
    if (filter === "Open") return !c.is_premium;
    return true;
  });

  function goDetail(id) {
    setDetailId(id);
    setPage("detail");
  }

  return (
    <div className="page">
      <div className="back-btn" onClick={() => setPage("creators")}>
        &larr; Creators
      </div>
      <div className="profile-header">
        <img
          className="profile-avatar"
          src={creator.profile_image}
          alt={creator.display_name}
        />
        <div>
          <div className="profile-name">{creator.display_name}</div>
          <div className="profile-handle">@{creator.username}</div>
          <div className="creator-badges" style={{ marginBottom: 12 }}>
            {creator.badges.map((b) => <Badge key={b} type={b} />)}
          </div>
          <div className="profile-bio">{creator.bio}</div>
          <div className="creator-tools" style={{ marginTop: 12 }}>
            {creator.tools_used.join(" · ")}
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
          <div className="empty-state">
            <div className="empty-text">No creations in this category yet.</div>
          </div>
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

function DetailPage({ id, creations, setPage, setCreatorUser, notify }) {
  const creation = creations.find((c) => c.id === id);
  const [unlocked, setUnlocked] = useState(false);

  if (!creation) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-text">Creation not found.</div>
        </div>
      </div>
    );
  }

  const isPending = creation.premium_status === "Pending";

  function handleUnlock() {
    notify("Redirecting to Stripe Checkout... (demo mode -- access granted)");
    setTimeout(() => setUnlocked(true), 1400);
  }

  return (
    <div className="page">
      <div className="back-btn" onClick={() => setPage("explore")}>
        &larr; Explore
      </div>
      <img
        className="detail-hero"
        src={creation.hero_image}
        alt={creation.title}
      />
      <div className="detail-body">
        <h1 className="detail-title">{creation.title}</h1>
        <div className="detail-meta">
          <span
            style={{ fontSize: 14, color: "var(--accent)", cursor: "pointer" }}
            onClick={() => {
              setCreatorUser(creation.creator.username);
              setPage("profile");
            }}
          >
            {creation.creator.display_name}
          </span>
          <span className="detail-divider">|</span>
          {creation.is_premium ? <Badge type="Premium" /> : <Badge type="Open" />}
          {isPending && <Badge type="review" />}
          <span className="detail-divider">|</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {creation.tools_used.map((t) => (
              <span key={t} className="tool-tag">{t}</span>
            ))}
          </div>
        </div>

        <div className="prompt-box">
          <div className="prompt-label">Prompt</div>
          {isPending ? (
            <p className="prompt-text" style={{ color: "var(--muted)" }}>
              This creation is under review. The prompt will be available once
              approved by the RevaultAI team.
            </p>
          ) : !creation.is_premium || unlocked ? (
            <p className="prompt-text">{creation.prompt_full}</p>
          ) : (
            <>
              <div className="prompt-fade">
                <p className="prompt-text">{creation.prompt_preview}</p>
              </div>
              <div className="unlock-area">
                <p className="unlock-label">
                  Unlock the full prompt to replicate or remix this creation.
                </p>
                <button className="btn-primary" onClick={handleUnlock}>
                  Unlock Prompt &mdash; $4.99
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
    setCreations((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, premium_status: "Approved" } : c
      )
    );
    notify("Creation approved and published on RevaultAI.");
  }

  function reject(id) {
    setCreations((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, premium_status: "Rejected" } : c
      )
    );
    notify("Creation rejected.");
  }

  function toggleSpotlight(id) {
    const item = creations.find((c) => c.id === id);
    if (!item) return;
    if (!item.spotlight && spotlightCount >= 3) {
      notify("RevaultAI Spotlight is limited to 3 creations. Remove one first.");
      return;
    }
    setCreations((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, spotlight: !c.spotlight } : c
      )
    );
  }

  const eligible = creations.filter(
    (c) => c.premium_status !== "Pending" && c.premium_status !== "Rejected"
  );

  return (
    <div className="page">
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">Internal</div>
        <div className="page-hdr-title">Admin</div>
        <div className="page-hdr-sub">
          Review submissions, manage spotlight, and control RevaultAI platform
          quality.
        </div>
      </div>

      <section className="section">
        <div style={{ marginBottom: 64 }}>
          <div className="section-label">Pending Review</div>
          <div
            className="section-title"
            style={{ marginBottom: 24 }}
          >
            Premium Submissions
          </div>
          {pending.length === 0 ? (
            <div
              style={{
                color: "var(--muted)",
                fontSize: 13,
                padding: "24px 0",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              No pending submissions.
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Creator</th>
                  <th>Category</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((c) => (
                  <tr key={c.id}>
                    <td
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: 18,
                      }}
                    >
                      {c.title}
                    </td>
                    <td style={{ color: "var(--muted)" }}>
                      {c.creator.display_name}
                    </td>
                    <td
                      style={{
                        color: "var(--muted)",
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 11,
                      }}
                    >
                      {c.category}
                    </td>
                    <td>
                      <button
                        className="btn-approve"
                        onClick={() => approve(c.id)}
                      >
                        Approve
                      </button>
                      <button
                        className="btn-reject"
                        onClick={() => reject(c.id)}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <div className="section-label">Spotlight Control</div>
          <div
            className="section-title"
            style={{ marginBottom: 8 }}
          >
            Manage Spotlight
          </div>
          <p
            style={{
              color: "var(--muted)",
              fontSize: 11,
              marginBottom: 24,
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.1em",
            }}
          >
            {spotlightCount}/3 active
          </p>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Creator</th>
                <th>Type</th>
                <th>Spotlight</th>
              </tr>
            </thead>
            <tbody>
              {eligible.map((c) => (
                <tr key={c.id}>
                  <td
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: 18,
                    }}
                  >
                    {c.title}
                  </td>
                  <td style={{ color: "var(--muted)" }}>
                    {c.creator.display_name}
                  </td>
                  <td>
                    {c.is_premium ? (
                      <Badge type="Premium" />
                    ) : (
                      <Badge type="Open" />
                    )}
                  </td>
                  <td>
                    <div
                      className={
                        "spotlight-toggle" + (c.spotlight ? " active" : "")
                      }
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

function SubmitPage({ setCreations, notify, setPage }) {
  const [form, setForm] = useState({
    title: "",
    videoUrl: "",
    tools: "",
    category: "Sci-Fi",
    prompt: "",
    isPremium: false,
  });
  const [submitting, setSubmitting] = useState(false);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    if (!form.title.trim() || !form.prompt.trim()) {
      notify("Please fill in the Title and Prompt fields.");
      return;
    }
    setSubmitting(true);

    const toolList = form.tools
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const newCreation = {
      id: "u" + Date.now(),
      title: form.title.trim(),
      creator: { username: "you", display_name: "You" },
      hero_image:
        "https://images.unsplash.com/photo-1465101162946-4377e57745c3?w=700&q=80",
      tools_used: toolList.length > 0 ? toolList : ["Unknown"],
      category: form.category,
      is_premium: form.isPremium,
      premium_status: form.isPremium ? "Pending" : null,
      prompt_preview: form.isPremium
        ? form.prompt.trim().slice(0, 120) + "..."
        : null,
      prompt_full: form.prompt.trim(),
      spotlight: false,
    };

    setCreations((prev) => [newCreation, ...prev]);

    setTimeout(() => {
      setSubmitting(false);
      setPage("explore");
      notify(
        form.isPremium
          ? "Submitted! Your creation will be reviewed by the RevaultAI team before going public."
          : "Creation submitted and now live on RevaultAI."
      );
    }, 600);
  }

  return (
    <div className="page">
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">Publish</div>
        <div className="page-hdr-title">Submit Creation</div>
        <div className="page-hdr-sub">
          Share your AI-native work with the RevaultAI community.
        </div>
      </div>
      <section className="section">
        <div style={{ maxWidth: 640 }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              className="form-input"
              placeholder="Name your creation"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Video URL</label>
            <input
              className="form-input"
              placeholder="https://..."
              value={form.videoUrl}
              onChange={(e) => updateField("videoUrl", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tools Used</label>
            <input
              className="form-input"
              placeholder="Sora, Runway, MidJourney"
              value={form.tools}
              onChange={(e) => updateField("tools", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
            >
              {["Sci-Fi", "Abstract", "Noir", "Dark Fantasy", "Thriller", "Documentary"].map(
                (o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                )
              )}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Prompt *</label>
            <textarea
              className="form-textarea"
              placeholder="Describe your full prompt in detail..."
              value={form.prompt}
              onChange={(e) => updateField("prompt", e.target.value)}
            />
          </div>
          <div className="form-group">
            <div className="toggle-row">
              <div
                className={"toggle" + (form.isPremium ? " on" : "")}
                onClick={() => updateField("isPremium", !form.isPremium)}
              >
                <div className="toggle-knob" />
              </div>
              <div>
                <div className="toggle-label">Premium Prompt</div>
                <div className="toggle-sub">
                  {form.isPremium
                    ? "Prompt will be paywalled and requires admin approval."
                    : "Prompt will be freely visible to all."}
                </div>
              </div>
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
            style={{ opacity: submitting ? 0.6 : 1 }}
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
  const [creations, setCreations] = useState(
    SEED_CREATIONS.map((c) => ({ ...c }))
  );
  const [page, setPage] = useState("home");
  const [detailId, setDetailId] = useState(null);
  const [creatorUser, setCreatorUser] = useState(null);
  const [notifMsg, setNotifMsg] = useState(null);

  function notify(msg) {
    setNotifMsg(msg);
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  function renderPage() {
    switch (page) {
      case "home":
        return (
          <HomePage
            creations={creations}
            setPage={setPage}
            setDetailId={setDetailId}
          />
        );
      case "explore":
        return (
          <ExplorePage
            creations={creations}
            setPage={setPage}
            setDetailId={setDetailId}
          />
        );
      case "creators":
        return (
          <CreatorsPage
            setPage={setPage}
            setCreatorUser={setCreatorUser}
          />
        );
      case "profile":
        return (
          <ProfilePage
            username={creatorUser}
            creations={creations}
            setPage={setPage}
            setDetailId={setDetailId}
          />
        );
      case "detail":
        return (
          <DetailPage
            id={detailId}
            creations={creations}
            setPage={setPage}
            setCreatorUser={setCreatorUser}
            notify={notify}
          />
        );
      case "admin":
        return (
          <AdminPage
            creations={creations}
            setCreations={setCreations}
            notify={notify}
          />
        );
      case "submit":
        return (
          <SubmitPage
            setCreations={setCreations}
            notify={notify}
            setPage={setPage}
          />
        );
      default:
        return null;
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <Nav page={page} setPage={setPage} />
      {renderPage()}
      {notifMsg && (
        <Notification
          key={notifMsg}
          msg={notifMsg}
          onClose={() => setNotifMsg(null)}
        />
      )}
    </>
  );
}