import { createClient } from "@supabase/supabase-js";

/*
  extract-prompt — RevaultAI

  Reads what a take's own prompt says about who is in it and where, so a
  world can be locked from takes that referenced nothing.

  This exists because the measurement said so. Capsule extraction read the
  Vault and the Shot Spec and found a usable cast in none of 71 finished
  takes: 52 referenced nothing at all, 19 named people the spec never
  described. Every take has a prompt. Nothing was reading it.

  The rule that makes this safe to build: IT RECORDS ONLY WHAT THE PROMPT
  SAYS. A model asked to describe a character from "Nell waits at the sink"
  will happily produce "a woman in her thirties with brown hair," and that is
  worse than returning nothing — it is a fabricated identity in a product
  whose entire promise is that the identity is fixed and real. A prompt that
  names somebody and says nothing about them yields a name and an empty
  description, the take still fails the floor, and that is the correct
  outcome rather than a gap to paper over.

  Batch by default, because the job is a backfill over takes that already
  exist. One row per take, so re-running updates rather than duplicates.
*/

const MAX_BATCH = 50;
const ADMIN_EMAILS = ["richardgarland999@gmail.com"];

const SYSTEM_PROMPT = `You are reading the prompt a filmmaker wrote for one shot, and recording only what it actually says about who is in the shot and where it happens.

Return ONLY a JSON object:
{
  "characters": [
    { "name": "string", "description": "string", "wardrobe": "string" }
  ],
  "locations": [ { "name": "string", "description": "string" } ],
  "props": [ { "name": "string", "description": "string" } ],
  "endState": "string"
}

Rules, in order of importance:

1. NEVER INVENT. Record only what the prompt states. If the prompt names a character but says nothing about their appearance, return the name with an empty description. Do not supply an age, a build, a hair color, an ethnicity or clothing that the prompt did not state. An empty string is the correct answer far more often than a plausible guess.

2. A character is a person the shot is about. If the prompt says "a woman" with no name, use a short descriptive name drawn from the prompt's own words ("The woman in the red coat"). Do not name an unnamed person.

3. "description" is physical appearance only, in the prompt's own terms. "wardrobe" is what they are wearing, if stated. Leave either empty rather than reaching.

4. "endState" is the condition the shot ends in, if the prompt implies one: where people are, what is open or closed, lit or dark. One or two sentences in concrete terms. Empty if the prompt does not say.

5. Props are objects that matter to the action, not scenery.

6. At most 6 characters, 2 locations, 6 props.

Return the JSON and nothing else.`;

/* The model's output, reduced to the shape the capsule reads. Everything is
   bounded here rather than trusted, because this is model output arriving at
   a database. */
function clean(raw) {
  const str = (v, n) => String(v ?? "").trim().slice(0, n);
  const people = (list, max, withWardrobe) =>
    (Array.isArray(list) ? list : []).slice(0, max).map((x) => ({
      name: str(x?.name, 80),
      description: str(x?.description, 700),
      ...(withWardrobe ? { wardrobe: str(x?.wardrobe, 300) } : {}),
    })).filter((x) => x.name);

  return {
    characters: people(raw?.characters, 6, true),
    locations: people(raw?.locations, 2, false),
    props: people(raw?.props, 6, false),
    endState: str(raw?.endState, 900),
  };
}

async function readOnePrompt(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `THE PROMPT:\n${prompt}` }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  return clean(JSON.parse(text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });

    const everyone = req.body?.scope === "all";
    if (everyone && !ADMIN_EMAILS.includes((user.email ?? "").toLowerCase())) {
      return res.status(403).json({ error: "Only an admin can extract across every account." });
    }
    const limit = Math.min(Number(req.body?.limit) || 25, MAX_BATCH);

    /* The same rule as the gate: the owner filter is applied to every read or
       none of them, so a take and its extraction can never disagree about
       whose they are. */
    const mine = (q) => (everyone ? q : q.eq("user_id", user.id));

    const [takesRes, doneRes] = await Promise.all([
      mine(supabase.from("generations").select("id, user_id, prompt"))
        .eq("status", "complete").order("created_at", { ascending: false }).limit(MAX_BATCH * 4),
      mine(supabase.from("prompt_extractions").select("generation_id")),
    ]);

    if (takesRes.error || doneRes.error) {
      const e = takesRes.error ?? doneRes.error;
      console.error("extract-prompt could not read:", e);
      return res.status(502).json({ error: "Could not read takes: " + e.message });
    }

    const already = new Set((doneRes.data ?? []).map((r) => r.generation_id));
    const todo = (takesRes.data ?? [])
      .filter((t) => !already.has(t.id) && String(t.prompt ?? "").trim().length > 10)
      .slice(0, limit);

    if (!todo.length) {
      return res.status(200).json({ read: 0, remaining: 0, note: "Every finished take has already been read." });
    }

    /* Small concurrency: fast enough for a backfill, gentle enough not to
       trip a rate limit halfway through and leave the batch half-written. */
    const rows = [];
    const failures = [];
    for (let i = 0; i < todo.length; i += 4) {
      const slice = todo.slice(i, i + 4);
      const results = await Promise.all(slice.map(async (take) => {
        try {
          return { take, extracted: await readOnePrompt(take.prompt) };
        } catch (err) {
          return { take, error: err.message };
        }
      }));
      for (const r of results) {
        if (r.error) { failures.push({ id: r.take.id, error: r.error }); continue; }
        rows.push({
          generation_id: r.take.id,
          user_id: r.take.user_id,
          extracted: r.extracted,
          model: "claude-haiku-4-5-20251001",
        });
      }
    }

    if (rows.length) {
      const { error } = await supabase.from("prompt_extractions").upsert(rows, { onConflict: "generation_id" });
      if (error) {
        console.error("extract-prompt could not store:", error);
        return res.status(502).json({ error: "Read the prompts but could not store them: " + error.message });
      }
    }

    const withCast = rows.filter((r) => r.extracted.characters.some((c) => c.name && c.description)).length;
    const namedOnly = rows.filter((r) =>
      r.extracted.characters.length && !r.extracted.characters.some((c) => c.description)).length;

    return res.status(200).json({
      read: rows.length,
      failed: failures.length,
      remaining: Math.max(0, (takesRes.data ?? []).filter((t) => !already.has(t.id)).length - todo.length),
      /* Reported because it is the number that decides whether this helped:
         a prompt that names somebody without describing them is still a take
         that cannot become a world. */
      withDescribedCast: withCast,
      namedButNotDescribed: namedOnly,
    });
  } catch (error) {
    console.error("extract-prompt failed:", error);
    return res.status(500).json({ error: "Something went wrong reading prompts." });
  }
}
