import { supabase } from "./supabase.js";

/*
  session — RevaultAI
  The access token every authenticated API call needs. Throws rather than
  returning an empty string, so an expired session surfaces as a message the
  person can act on instead of a silent 401.
*/

export async function getSessionToken() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  return token;
}
