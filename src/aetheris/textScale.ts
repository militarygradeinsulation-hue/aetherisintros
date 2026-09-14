/** Member-chosen interface text size, remembered in this browser. */
export const textScales = ['small', 'default', 'large', 'larger'] as const
export type TextScale = typeof textScales[number]

export const textScaleLabels: Record<TextScale, string> = {
  small: 'Small',
  default: 'Default',
  large: 'Large',
  larger: 'Largest',
}

const KEY = 'aetheris.text.scale'

export function readTextScale(): TextScale {
  if (typeof window === 'undefined') return 'default'
  const stored = window.localStorage.getItem(KEY)
  return textScales.includes(stored as TextScale) ? (stored as TextScale) : 'default'
}

export function applyTextScale(scale: TextScale) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const option of textScales) root.classList.remove(`text-scale-${option}`)
  root.classList.add(`text-scale-${scale}`)
}

export function setTextScale(scale: TextScale) {
  if (typeof window !== 'undefined') window.localStorage.setItem(KEY, scale)
  applyTextScale(scale)
}
