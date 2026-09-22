// Thinking Orbs — animated thought/agent orb loading indicators.
// Six hand-tuned canvas states: working · searching · solving · listening · composing · shaping.
// Theme-aware (auto resolves from data-theme/dark class/prefers-color-scheme); SSR-safe.
// Source & playground: https://orbs.jakubantalik.com
import { ThinkingOrb } from "thinking-orbs"

export { ThinkingOrb } from "thinking-orbs"
export type {
  ThinkingOrbProps,
  OrbState,
  OrbSize,
  OrbTheme,
} from "thinking-orbs"

export default ThinkingOrb
