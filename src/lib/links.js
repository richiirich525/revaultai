import { FaGlobe, FaXTwitter, FaYoutube, FaInstagram, FaTiktok, FaLinkedinIn, FaDiscord, FaGithub } from "react-icons/fa6";

/*
  links — RevaultAI
  Reading and normalizing the links a creator gives us: tip jars, contact and
  licensing URLs, tool credits, and social profiles.
*/

export const TIP_HOSTS = [
  "ko-fi.com", "buymeacoffee.com", "patreon.com",
  "paypal.com", "paypal.me", "venmo.com", "cash.app",
  "liberapay.com", "gofundme.com", "buy.stripe.com",
];

export function normalizeTipUrl(raw) {
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

export function normalizeContactUrl(raw) {
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
export function toolLinksToText(arr) {
  return (Array.isArray(arr) ? arr : []).map((t) => `${t.name} | ${t.url}`).join("\n");
}

export function parseToolLinks(raw) {
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

export const SOCIAL_PLATFORMS = [
  { key: "website",   label: "Website",     placeholder: "https://yoursite.com" },
  { key: "x",         label: "X / Twitter", placeholder: "https://x.com/yourhandle" },
  { key: "youtube",   label: "YouTube",     placeholder: "https://youtube.com/@yourchannel" },
  { key: "instagram", label: "Instagram",   placeholder: "https://instagram.com/yourhandle" },
  { key: "tiktok",    label: "TikTok",      placeholder: "https://tiktok.com/@yourhandle" },
  { key: "linkedin",  label: "LinkedIn",    placeholder: "https://linkedin.com/in/you" },
  { key: "discord",   label: "Discord",     placeholder: "https://discord.gg/yourinvite" },
  { key: "github",    label: "GitHub",      placeholder: "https://github.com/you" },
];

export const SOCIAL_ICONS = {
  website: FaGlobe,
  x: FaXTwitter,
  youtube: FaYoutube,
  instagram: FaInstagram,
  tiktok: FaTiktok,
  linkedin: FaLinkedinIn,
  discord: FaDiscord,
  github: FaGithub,
};

export function socialFormFromProfile(profile) {
  const links = (profile && profile.social_links) || {};
  const out = {};
  for (const p of SOCIAL_PLATFORMS) out["social_" + p.key] = links[p.key] ?? "";
  return out;
}

export function normalizeSocialLinks(formObj) {
  const out = {};
  for (const p of SOCIAL_PLATFORMS) {
    const raw = (formObj["social_" + p.key] ?? "").trim();
    if (!raw) continue;
    if (raw.length > 500) return { ok: false, error: p.label + " link is too long (max 500 characters)." };
    if (!/^https:\/\//i.test(raw)) return { ok: false, error: p.label + " link must start with https://" };
    out[p.key] = raw;
  }
  return { ok: true, links: out };
}
