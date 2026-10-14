/*
  avatar — RevaultAI
  The fallback initial shown when a creator has no avatar image.
*/

export function avatarInitial(name, email) {
  if (name && name.trim()) return name.trim()[0].toUpperCase();
  if (email) return email[0].toUpperCase();
  return "?";
}
