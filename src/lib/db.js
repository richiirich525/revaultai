/**
 * src/lib/db.js
 *
 * Thin data-access helpers for the creations table.
 */

import { supabase } from "./supabase.js";

// ---------------------------------------------------------------------------
// Shape converters
// ---------------------------------------------------------------------------

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
    license_url:     row.license_url ?? "",
    creator: {
      username:     row.creator_username ?? "unknown",
      display_name: row.creator_name     ?? "Unknown",
      avatar_url:   row.avatar_url       ?? "",
    },
    user_id:    row.user_id,
    created_at: row.created_at,
    _fromDb:    true,
  };
}

export function creationToRow(creation, user, profile) {
  const row = {
    user_id:          user?.id ?? null,
    creator_username: profile?.username     ?? user?.email?.split("@")[0] ?? "anonymous",
    creator_name:     profile?.display_name ?? user?.email?.split("@")[0] ?? "Anonymous",
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
    license_url:      creation.license_url ?? null,
    spotlight:        false,
    mux_asset_id:     creation.mux_asset_id ?? null,
  };
  
  return row;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function fetchCreations() {
  const { data, error } = await supabase
    .from("creations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { data: null, error };
  return { data: data.map(rowToCreation), error: null };
}

export async function fetchCreationsByUser(userId) {
  if (!userId) return { data: [], error: null };

  const { data, error } = await supabase
    .from("creations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error };
  return { data: data.map(rowToCreation), error: null };
}

export async function insertCreation(creation, user, profile) {
  const row = creationToRow(creation, user, profile);

  const { error } = await supabase
    .from("creations")
    .insert(row);

  if (error) return { data: null, error };
  return { data: { ...creation, _fromDb: true }, error: null };
}

export async function updateCreationStatus(id, status) {
  const { error } = await supabase
    .from("creations")
    .update({ premium_status: status })
    .eq("id", id);
  return { error: error ?? null };
}

export async function updateCreationSpotlight(id, spotlight) {
  const { error } = await supabase
    .from("creations")
    .update({ spotlight })
    .eq("id", id);
  return { error: error ?? null };
}

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
    license_url:     fields.license_url ?? null,
  };

  const { data, error } = await supabase
    .from("creations")
    .update(allowed)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return { data: null, error };
  return { data: rowToCreation(data), error: null };
}

export async function deleteCreation(id, user) {
  if (!user?.id) return { error: new Error("Not authenticated") };

  const { error } = await supabase
    .from("creations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return { error: error ?? null };
}

export async function fetchPurchasedIds(userId) {
  if (!userId) return { data: new Set(), error: null };

  const { data, error } = await supabase
    .from("purchases")
    .select("creation_id")
    .eq("user_id", userId);

  if (error) return { data: new Set(), error };
  return { data: new Set(data.map((r) => r.creation_id)), error: null };
}

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