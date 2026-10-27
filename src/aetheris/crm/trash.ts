/** Trash keeps deleted people for this many days before removing them for good. */
export const TRASH_DAYS = 30
const DAY = 86_400_000

export function daysLeftInTrash(deletedAt: string, now = Date.now()): number {
  return Math.max(0, TRASH_DAYS - Math.floor((now - new Date(deletedAt).getTime()) / DAY))
}
export function isTrashExpired(deletedAt: string, now = Date.now()): boolean {
  return now - new Date(deletedAt).getTime() >= TRASH_DAYS * DAY
}
