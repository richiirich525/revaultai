import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { siteFacts, personalFacts, HELP_SYSTEM } from "../src/lib/helpContext.js";

/*
  ask — RevaultAI

  Answers a visitor's question about the site, from the site's own data.

  WHY THIS IS NOT A BOUGHT WIDGET. Every answerable fact here — what a pack
  costs, what a model charges per second, which tools need an account — is
  read from the files the pages are built from rather than crawled off the
  rendered page. It cannot disagree with the site and it cannot go stale.

  And for somebody signed in it can answer the questions no crawler ever
  could: where their credits went, why a take has not arrived, what the
  generator actually said when one failed. Those are read server-side from
  that person's own rows. Nothing a client asserts about itself is trusted,
  because a visitor who can claim their own balance can claim somebody
  else's.

  METERED, BECAUSE IT SPENDS MONEY. An open endpoint that calls a paid model
  is free money for whoever finds it. Counted per caller per day against
  help_questions, the same shape anonymous packs and anonymous share links
  already use.
*/

export const config = { maxDuration: 30 };

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const ANON_PER_DAY = 10;
const SIGNED_IN_PER_DAY = 60;
const MAX_QUESTION = 500;

/* A salted hash, never an address — the same treatment anonymous shares get.
   Without a salt an IP hash is reversible by anybody with a list of IPs. */
function hashIp(req) {
  const raw = (req.headers["x-forwarded-for"] || "").split(",")[0].trim()
    || req.socket?.remoteAddress || "";
  if (!raw) return null;
  return crypto
    .createHash("sha256")
    .update(raw + (process.env.IP_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""))
    .digest("hex")
    .slice(0, 40);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { question } = req.body || {};
    const asked = typeof question === "string" ? question.trim().slice(0, MAX_QUESTION) : "";
    if (asked.length < 3) return res.status(400).json({ error: "Ask a question." });

    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = token
      ? await supabase.auth.getUser(token)
      : { data: { user: null } };
    const ip = hashIp(req);

    /* ---- the meter ------------------------------------------------------ */
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let counter = supabase
      .from("help_questions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    counter = user ? counter.eq("user_id", user.id) : counter.eq("ip_hash", ip);
    const { count } = await counter;
    const allowance = user ? SIGNED_IN_PER_DAY : ANON_PER_DAY;
    if ((count ?? 0) >= allowance) {
      return res.status(429).json({
        error: user
          ? "That is as many questions as we can answer for one account today."
          : "That is as many questions as we can answer from here today. Sign in for more.",
      });
    }

    /* ---- what this person's own account looks like ---------------------- */
    let personal = "";
    if (user) {
      const [profile, takes, packs, sets] = await Promise.all([
        supabase.from("profiles").select("credits").eq("id", user.id).maybeSingle(),
        supabase.from("generations")
          .select("model, status, credits_spent, error_message, created_at")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("vault_entries")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id).eq("kind", "character"),
        supabase.from("animated_sets")
          .select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      personal = personalFacts({
        credits: profile.data?.credits ?? null,
        takes: takes.data ?? [],
        packs: packs.count ?? 0,
        sets: sets.count ?? 0,
      });
    }

    /* ---- the answer ----------------------------------------------------- */
    const content = [
      { type: "text", text: siteFacts() },
      ...(personal ? [{ type: "text", text: personal }] : []),
      { type: "text", text: `The visitor asks: ${asked}` },
    ];

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: HELP_SYSTEM,
        messages: [{ role: "user", content }],
      }),
    });
    if (!apiRes.ok) {
      console.error("ask: model call failed", apiRes.status, await apiRes.text());
      return res.status(502).json({ error: "We could not answer that just now. Try again in a moment." });
    }

    const data = await apiRes.json();
    const raw = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();

    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim());
    } catch {
      return res.status(502).json({ error: "We could not answer that just now. Try again in a moment." });
    }

    const answer = String(parsed?.answer ?? "").slice(0, 1500);
    if (!answer) {
      return res.status(502).json({ error: "We could not answer that just now. Try again in a moment." });
    }
    /* Only paths, and only ones that look like paths: a page list is rendered
       as links, and a link is the one place a wrong answer becomes a click. */
    const pages = (Array.isArray(parsed?.pages) ? parsed.pages : [])
      .filter((p) => typeof p === "string" && /^\/[a-z0-9-]*$/.test(p))
      .slice(0, 3);
    const grounded = parsed?.grounded !== false;

    /* Recorded after answering, never before: a question that failed to
       produce an answer should not count against anybody's allowance. */
    await supabase.from("help_questions").insert({
      user_id: user?.id ?? null,
      ip_hash: ip,
      question: asked,
      grounded,
      pages,
    });

    return res.status(200).json({ answer, pages, grounded, remaining: Math.max(0, allowance - (count ?? 0) - 1) });
  } catch (error) {
    console.error("ask failed:", error);
    return res.status(500).json({ error: "Something went wrong answering that." });
  }
}
