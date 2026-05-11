/**
 * src/lib/db.js
 *
 * Thin data-access helpers for the `creations` table.
 * All Supabase calls are in one place so App.jsx stays readable.
 */

import { supabase } from "./supabase.js";

// ─── Shape converters ─────────────────────────────────────────────────────────

/**
 * Map a Supabase row → the creation shape the rest of the app expects.
 * Keeps field names identical to SEED_CREATIONS so nothing else needs changing.
 */
export function rowToCreation(row) {
  return {
    id:              row.id,
    title:           row.title,
    category:        row.category,
    tools_used:      row.tools_used ?? [],
    hero_image:      row.hero_image,
    thumbnail_image: row.thumbnail_image,
    video_url:       row.video_url,
    preview_video:   row.preview_video,
    is_premium:      row.is_premium,
    premium_status:  row.premium_status,
    price_cents:     row.price_cents ?? 499,
    spotlight:       row.spotlight,
    prompt_preview:  row.prompt_preview,
    prompt_full:     row.prompt_full,
    creator: {
      username:     row.creator_username,
      display_name: row.creator_name,
    },
    // Extras useful for profile/admin pages
    user_id:    row.user_id,
    created_at: row.created_at,
    _fromDb:    true,  // flag so we can distinguish DB rows from seed data
  };
}

/**
 * Map the creation object + current auth user → a Supabase insert payload.
 */
export function creationToRow(creation, user) {
  return {
    user_id:          user?.id    ?? null,
    creator_username: user?.email?.split("@")[0] ?? "anonymous",
    creator_name:     user?.user_metadata?.full_name
                        ?? user?.email?.split("@")[0]
                        ?? "Anonymous",
    title:            creation.title,
    category:         creation.category,
    tools_used:       creation.tools_used,
    hero_image:       creation.hero_image,
    thumbnail_image:  creation.thumbnail_image,
    video_url:        creation.video_url,
    preview_video:    creation.preview_video,
    is_premium:       creation.is_premium,
    premium_status:   creation.premium_status,
    price_cents:      creation.price_cents ?? 499,
    prompt_preview:   creation.prompt_preview ?? null,
    prompt_full:      creation.prompt_full,
    spotlight:        false,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch all publicly visible creations, newest first.
 * Returns { data: Creation[], error }.
 */
export async function fetchCreations() {
  const { data, error } = await supabase
    .from("creations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { data: null, error };
  return { data: data.map(rowToCreation), error: null };
}

/**
 * Insert a new creation row.
 * Returns { data: Creation, error }.
 */
export async function insertCreation(creation, user) {
  const row = creationToRow(creation, user);

  const { data, error } = await supabase
    .from("creations")
    .insert(row)
    .select()
    .single();

  if (error) return { data: null, error };
  return { data: rowToCreation(data), error: null };
}
/**
 * Update premium_status on a creation (admin only -- no user_id check).
 * RLS should be configured to allow admin role, or disable RLS for service role key.
 * Returns { error }.
 */
export async function updateCreationStatus(id, status) {
  const { error } = await supabase
    .from("creations")
    .update({ premium_status: status })
    .eq("id", id);
  return { error: error ?? null };
}

/**
 * Update spotlight flag on a creation (admin only).
 * Returns { error }.
 */
export async function updateCreationSpotlight(id, spotlight) {
  const { error } = await supabase
    .from("creations")
    .update({ spotlight })
    .eq("id", id);
  return { error: error ?? null };
}
/**
 * Update an existing creation. Only fields the user can edit are sent.
 * RLS on the server ensures only the owner can update.
 * Returns { data: Creation, error }.
 */
export async function updateCreation(id, fields, user) {
  if (!user?.id) return { data: null, error: new Error("Not authenticated") };

  const allowed = {
    title:           fields.title,
    category:        fields.category,
    tools_used:      fields.tools_used,
    prompt_full:     fields.prompt_full,
    prompt_preview:  fields.prompt_preview ?? null,
    is_premium:      fields.is_premium,
    premium_status:  fields.is_premium ? (fields.premium_status ?? "Pending") : null,
    hero_image:      fields.hero_image,
    thumbnail_image: fields.thumbnail_image,
  };

  const { data, error } = await supabase
    .from("creations")
    .update(allowed)
    .eq("id", id)
    .eq("user_id", user.id)   // RLS double-check client side
    .select()
    .single();

  if (error) return { data: null, error };
  return { data: rowToCreation(data), error: null };
}

/**
 * Delete a creation by id. RLS ensures only the owner can delete.
 * Returns { error }.
 */
export async function deleteCreation(id, user) {
  if (!user?.id) return { error: new Error("Not authenticated") };

  const { error } = await supabase
    .from("creations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);  // RLS double-check client side

  return { error: error ?? null };
}

/**
 * Fetch all creation ids the current user has purchased.
 * Returns { data: Set<string>, error }.
 */
export async function fetchPurchasedIds(userId) {
  if (!userId) return { data: new Set(), error: null };

  const { data, error } = await supabase
    .from("purchases")
    .select("creation_id")
    .eq("user_id", userId);

  if (error) return { data: new Set(), error };
  return { data: new Set(data.map((r) => r.creation_id)), error: null };
}

/**
 * Initiate a Stripe Checkout session for a creation.
 * Calls your server endpoint POST /api/checkout.
 * Returns { url } on success, { error } on failure.
 */
export async function createCheckoutSession(creationId, userId) {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, user_id: userId }),
  });
  const json = await res.json();
  if (!res.ok) return { url: null, error: new Error(json.error || "Checkout failed") };
  return { url: json.url, error: null };
  
}
export async function verifyCheckoutSession(sessionId) {
  const res = await fetch("/api/verify-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });

  const json = await res.json();

  if (!res.ok) {
    return { data: null, error: new Error(json.error || "Session verification failed") };
  }

  return { data: json, error: null };
}