/** No identity-based substitutes: actual portraits arrive on the member's avatarUrl. */
export const memberPortraits: Record<string, string> = {}

export function portraitFor(id: string): string | undefined {
  return memberPortraits[id]
}
