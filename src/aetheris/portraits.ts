/** Only Joseph's supplied portrait is retained; fictional showcase people use initials. */
import josephPortraitAsset from '@/assets/portraits/member-joseph.jpg.asset.json'

export const memberPortraits: Record<string, string> = { me: josephPortraitAsset.url }

export function portraitFor(id: string): string | undefined {
  return memberPortraits[id]
}
