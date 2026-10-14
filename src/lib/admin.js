/*
  admin — RevaultAI
  Who the interface offers admin screens to. Every admin API route checks
  this again server-side; this only decides what gets rendered.
*/

export function isAdmin(user) { return !!user?.email && ["richardgarland999@gmail.com"].includes(user.email.toLowerCase()); }
