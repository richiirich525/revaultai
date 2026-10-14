/*
  videoLinks — RevaultAI
  Reading YouTube and Vimeo links, and the thumbnail URL for a YouTube id.
  Shared by the cards that show a film and by the submission form that
  accepts a link to one.
*/

export function youtubeThumb(id, res = "maxresdefault") {
  return `https://i.ytimg.com/vi/${id}/${res}.jpg`;
}
