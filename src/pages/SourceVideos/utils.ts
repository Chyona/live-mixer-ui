export function isPlayableStreamUrl(url: string) {
  return /\.(mp4|m3u8|webm|ogg|mov|m4v|flv|avi|mkv)(\?|$)/i.test(url) || /^https?:\/\//i.test(url.trim());
}
