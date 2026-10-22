/** Avatar-only policy. Never apply this to attachments, captures or content thumbnails. */
export function memberPhotoSource(source?: string | null): string {
  const value = source?.trim() ?? ''
  // These known illustrative provider faces were formerly used as contact fallbacks.
  return /^https?:\/\/(?:images\.|source\.)?unsplash\.com(?:\/|$)/i.test(value) ? '' : value
}
