/**
 * Showcase switch.
 *
 * The live network must contain only real, member-created records. The
 * illustrative catalogue exists solely for the labelled `/demo` showcase, so
 * every local data layer and every hand-written example list asks this module
 * whether it is allowed to produce example content.
 */
let showcase = false

export function setShowcaseMode(on: boolean) {
  showcase = on
}

export function isShowcase() {
  return showcase
}

/** Example rows: returned in the showcase, empty in the live network. */
export function showcaseOnly<T>(rows: T[]): T[] {
  return showcase ? rows : []
}
