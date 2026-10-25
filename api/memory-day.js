import { createClient } from "@supabase/supabase-js";
import { persistSelfie } from "./build-pack.js";

/*
  memory-day — RevaultAI

  Photos for one day, stored and read for SETTING.

  This route is deliberately narrow. A day's note, its look and which
  character plays you are all written by the client straight into
  memory_days, because row-level security already scopes that table to its
  owner and a server hop would add nothing but latency. What the client
  cannot do is store an image or run a vision pass, so that is all this does.

  WHAT THE VISION PASS IS TOLD. Where, when, what the weather did, what was
  going on. Not who. It is told in as many words not to describe anybody
  identifiably, because the entire consent position of this feature is that
  faces come from packs their owners built and granted, never from a camera
  roll. A description of a person extracted from somebody's holiday photo
  would be a likeness laundered through prose, and it would be the one hole
  that makes the rest of the argument worthless.

  The reads are stored with the photos so filming is a database read. A day
  can be edited and refilmed without paying for the same four photos twice.
*/

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const MAX_PHOTOS = 6;

const SYSTEM_PROMPT = `You describe the SETTING of a photograph for a film crew who have to rebuild it.

Report only:
- setting: where this is, concretely. Interior or exterior, the kind of place, surfaces, light sources, notable objects.
- timeOfDay: what the light says. Morning, midday, late afternoon, dusk, night, or unclear.
- weather: only if visible outdoors. Otherwise an empty string.
- activity: what is physically happening or has just happened, described by actions and objects.

Hard rules:
- DO NOT describe any person's face, body, age, sex, race, hair, clothing or any other feature that could identify them. Not even in passing. Not even to say how many people there are.
- If the photograph is mostly a person, describe the place around them and leave it at that.
- No proper nouns: no business names, no street names, no landmarks, no brands. Describe what a thing is, not what it is called.
- No judgments and no mood words. "A kitchen counter covered in flour" not "a joyful morning of baking".
- If you cannot tell, use an empty string. Never guess.

Reply with only this JSON and nothing else:
{"setting":"","timeOfDay":"","weather":"","activity":""}`;

export async function readScene(imageBase64, mediaType) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: "Describe the setting." },
        ],
      }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  const read = JSON.parse(text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim());
  /* Keep only the four fields. A model that decided to add a "people" key
     does not get to have it stored. */
  return {
    setting: typeof read.setting === "string" ? read.setting.slice(0, 400) : "",
    timeOfDay: typeof read.timeOfDay === "string" ? read.timeOfDay.slice(0, 60) : "",
    weather: typeof read.weather === "string" ? read.weather.slice(0, 120) : "",
    activity: typeof read.activity === "string" ? read.activity.slice(0, 400) : "",
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { day, photos } = req.body || {};

    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
    if (!user) return res.status(401).json({ error: "Sign in to keep a day." });

    if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return res.status(400).json({ error: "Which day is this?" });
    }
    if (!Array.isArray(photos) || !photos.length) {
      return res.status(400).json({ error: "Send at least one photo." });
    }

    /* The row has to exist before photos can be appended to it, and it may
       already: a day is edited over the course of an evening. */
    const { data: existing, error: readError } = await supabase
      .from("memory_days")
      .select("id, photos, status")
      .eq("user_id", user.id).eq("day", day).maybeSingle();
    if (readError) {
      console.error("memory-day could not read the day:", readError);
      return res.status(502).json({ error: "Could not read that day: " + readError.message });
    }
    if (existing?.status === "filmed") {
      return res.status(409).json({ error: "That day is already filmed. Start another one." });
    }

    const already = Array.isArray(existing?.photos) ? existing.photos : [];
    const room = MAX_PHOTOS - already.length;
    if (room <= 0) {
      return res.status(409).json({ error: `A day holds ${MAX_PHOTOS} photos. Remove one first.` });
    }

    const added = [];
    for (const p of photos.slice(0, room)) {
      const type = ["image/jpeg", "image/png", "image/webp"].includes(p?.mediaType) ? p.mediaType : null;
      if (!type) return res.status(400).json({ error: "Use JPEG, PNG or WebP photos." });
      if (typeof p.image !== "string" || p.image.length < 100) {
        return res.status(400).json({ error: "One of those photos did not come through." });
      }
      if (p.image.length > 8_000_000) {
        return res.status(413).json({ error: "One of those photos is too large." });
      }

      let read;
      try {
        read = await readScene(p.image, type);
      } catch (err) {
        console.error("memory-day could not read a photo:", err.message);
        return res.status(502).json({
          error: added.length
            ? "We saved the first photos but could not read the next one. Try again."
            : "We could not read that photo. Try again in a moment.",
          photos: [...already, ...added],
        });
      }

      /* Stored only after the read, for the same reason build-pack stores
         after its gates: a photo that could not be processed should not be
         sitting in a bucket. */
      let url;
      try {
        url = await persistSelfie(p.image, type);
      } catch (err) {
        console.error("memory-day could not store a photo:", err.message);
        return res.status(502).json({ error: "We read that photo but could not save it.", photos: [...already, ...added] });
      }

      added.push({ url, read });
    }

    const { data: saved, error: writeError } = await supabase
      .from("memory_days")
      .upsert(
        { user_id: user.id, day, photos: [...already, ...added], updated_at: new Date().toISOString() },
        { onConflict: "user_id,day" },
      )
      .select("id, day, photos, note, style_id, pack_id, cast_packs, status")
      .single();
    if (writeError) {
      console.error("memory-day could not save the day:", writeError);
      return res.status(502).json({ error: "Could not save that day: " + writeError.message });
    }

    return res.status(200).json({
      day: saved,
      added: added.length,
      room: MAX_PHOTOS - saved.photos.length,
    });
  } catch (error) {
    console.error("memory-day failed:", error);
    return res.status(500).json({ error: "Something went wrong saving that day." });
  }
}
