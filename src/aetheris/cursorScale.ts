/** Member-chosen pointer size, remembered in this browser. */
export const cursorScales = ['small', 'default', 'large', 'largest'] as const
export type CursorScale = typeof cursorScales[number]

export const cursorScaleLabels: Record<CursorScale, string> = {
  small: 'Small',
  default: 'Default',
  large: 'Large',
  largest: 'Largest',
}

const KEY = 'aetheris.cursor.scale'

export function readCursorScale(): CursorScale {
  if (typeof window === 'undefined') return 'default'
  const stored = window.localStorage.getItem(KEY)
  return cursorScales.includes(stored as CursorScale) ? (stored as CursorScale) : 'default'
}

export function applyCursorScale(scale: CursorScale) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const option of cursorScales) root.classList.remove(`cursor-scale-${option}`)
  root.classList.add(`cursor-scale-${scale}`)
}

export function setCursorScale(scale: CursorScale) {
  if (typeof window !== 'undefined') window.localStorage.setItem(KEY, scale)
  applyCursorScale(scale)
}
