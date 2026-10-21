/*
  appCss — RevaultAI
  The application stylesheet, injected once by the root component.
*/

export const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Mono:wght@300;400&family=Syne:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --bg: #0E0F14; --bg2: #13141A; --bg3: #1A1B23; --surface: #12131A; --border: rgba(255,255,255,0.06); --border-hover: rgba(123,63,228,0.35); --text: #E8E6F0; --muted: #6B6878; --accent: #7B3FE4; --accent-dim: rgba(123,63,228,0.15); --accent-glow: rgba(123,63,228,0.4); --premium: #C49A3C; --premium-dim: rgba(196,154,60,0.12); }
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
  .hero-right img { width: 100%; height: 100%; object-fit: cover; object-position: 60% center; filter: brightness(0.75) saturate(0.85); display: block; animation: heroKenBurns 18s ease-in-out infinite alternate; }
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
  .gen-form { max-width: 680px; margin: 0 auto 40px; }
  .gen-prompt { width: 100%; padding: 16px; background: var(--bg2); border: 1px solid var(--border); border-radius: 4px; color: var(--text); font-size: 14px; line-height: 1.6; resize: vertical; }
  .gen-prompt:focus { outline: none; border-color: var(--accent); }
  .chain { border: 1px solid var(--accent); border-radius: 6px; padding: 16px 18px; margin-top: 12px; background: var(--bg3); }
  .chain-video { width: 100%; max-width: 420px; border-radius: 4px; border: 1px solid var(--border); display: block; margin-bottom: 12px; background: #000; }
  .chain-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
  .chain-slider { flex: 1; min-width: 180px; accent-color: var(--accent); }
  .chain-t { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); letter-spacing: 0.08em; min-width: 74px; }
  .pf { border: 1px solid var(--border); border-radius: 6px; padding: 16px 18px; margin-bottom: 14px; background: var(--bg3); }
  .pf-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
  .pf-title { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); }
  .pf-verdict { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.1em; }
  .pf-row { display: flex; gap: 10px; align-items: flex-start; padding: 5px 0; font-family: 'DM Mono', monospace; font-size: 11px; line-height: 1.7; }
  .pf-mark { flex-shrink: 0; width: 14px; text-align: center; }
  .pf-k { color: var(--text); }
  .pf-d { color: var(--muted); }
  .gen-form-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 12px; flex-wrap: wrap; }
  /* --muted is 3.2-3.5:1 on these backgrounds, under the 4.5 AA needs. This
     is the same grey lightened until it passes. Uppercase came off because
     model names are not acronyms. */
  .gen-cost { font-family: 'DM Mono', monospace; font-size: 11.5px; letter-spacing: 0.04em; color: #9B98A8; display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
  .gen-total { color: var(--text); font-weight: 500; }
  .gen-bal { opacity: 0.9; }
  .gen-model-select { font-family: 'DM Mono', monospace; font-size: 11.5px; letter-spacing: 0.02em; color: var(--text); background: var(--bg3); border: 1px solid var(--border); border-radius: 4px; padding: 9px 11px; cursor: pointer; max-width: 100%; }
  .gen-model-select:focus-visible { outline: 2px solid #B9A2F0; outline-offset: 2px; }
  .gen-button { padding: 12px 28px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text); background: var(--bg3); border: 1px solid var(--border); border-radius: 4px; cursor: pointer; transition: color 0.2s, border-color 0.2s; }
  .gen-button:hover { color: var(--accent); border-color: var(--accent); }
  .gen-button:disabled { opacity: 0.5; cursor: default; }
  .gen-list { max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
  .gen-item { padding: 20px; background: var(--bg2); border: 1px solid var(--border); border-radius: 4px; }
  .gen-item-prompt { font-size: 13px; color: var(--text); line-height: 1.6; margin-bottom: 12px; }
  .gen-item-video { width: 100%; border-radius: 4px; display: block; }
  .gen-item-status { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.12em; color: var(--muted); text-transform: uppercase; }
  .gen-failed { color: #c0392b; }
  .credits-section { margin-bottom: 36px; padding: 24px; background: var(--bg2); border: 1px solid var(--border); border-radius: 4px; }
  .credits-section h3 { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.14em; color: var(--muted); text-transform: uppercase; margin: 0 0 8px; font-weight: 400; }
  .credits-section p { font-size: 13px; color: var(--text); margin: 0 0 14px; }
  .credits-packs { display: flex; gap: 10px; flex-wrap: wrap; }
  .credits-packs button { padding: 10px 18px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text); background: var(--bg3); border: 1px solid var(--border); border-radius: 4px; cursor: pointer; transition: color 0.2s, border-color 0.2s; }
  .credits-packs button:hover { color: var(--accent); border-color: var(--accent); }
  .credits-packs button:disabled { opacity: 0.5; cursor: default; }
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
    .nav { position: static; padding: 0 20px; height: auto; min-height: 62px; flex-wrap: wrap; }
    .page { padding-top: 0; }
    .nav { overflow: visible; position: relative; z-index: 1000; }
    .nav-center { --menu-top: 0; }
    .nav-menu-wrap { position: static !important; }
    .nav-menu {
      position: fixed !important;
      top: 150px !important;
      left: 12px !important;
      right: 12px !important;
      width: auto !important;
      min-width: 0 !important;
      max-height: 58vh !important;
      overflow-y: auto !important;
      z-index: 9999 !important;
      background: #0F1016 !important;
      box-shadow: 0 16px 48px rgba(0,0,0,0.8) !important;
    }
    .nav-center { position: static; transform: none; width: 100%; order: 3; flex-wrap: wrap; gap: 10px 16px; justify-content: center; padding: 12px 0; border-top: 1px solid var(--border); margin-top: 12px; }
    .nav-link { font-size: 10px; } .nav-user-email { display: none; } .nav-logo { font-size: 12px; }
    .nav-signin { padding: 6px 14px; font-size: 10px; } .nav-signout { padding: 5px 12px; font-size: 9px; }
    .hero { grid-template-columns: 1fr; min-height: auto; } .hero-left { padding: 32px 24px; }
    .hero-right { min-height: 0; aspect-ratio: 16 / 9; }
    .hero-right img { width: 100%; height: 100%; object-fit: cover; object-position: 65% center; }
    .hero-tagline, .hero-tagline-accent { font-size: 28px; } .hero-eyebrow { font-size: 9px; margin-bottom: 20px; } .hero-sub { font-size: 13px; margin-bottom: 28px; }
    .section { padding: 40px 24px; } .section-header { flex-direction: column; align-items: flex-start; gap: 12px; }
    .spotlight-section-wrap { padding: 48px 24px; }
    .creation-grid { grid-template-columns: 1fr; gap: 16px; } .spotlight-grid { grid-template-columns: 1fr; gap: 16px; } .creator-grid { grid-template-columns: 1fr; gap: 16px; }
    .creation-thumb { aspect-ratio: 16/9; } .spotlight-card { aspect-ratio: 16/9; }
    .auth-modal { max-width: 100%; margin: 0 16px; } .auth-header { padding: 24px 24px 0; } .auth-body { padding: 20px 24px 24px; } .auth-tabs { flex-wrap: wrap; } .auth-tab { font-size: 9px; padding: 8px 0; }
    .page-hdr { padding: 40px 24px 32px; } .page-hdr-title { font-size: 36px; }
    .back-btn { padding: 16px 24px; }
    .profile-header { flex-direction: column; padding: 40px 24px 32px; gap: 20px; } .profile-name { font-size: 32px; }.founding-badge {
  display: inline-flex;
  align-items: center;
  font-family: 'DM Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 999px;
  padding: 4px 11px;
  white-space: nowrap;
  line-height: 1;
}  .profile-avatar { width: 80px; height: 80px; }
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
