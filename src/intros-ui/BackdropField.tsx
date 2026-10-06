import Aurora from "./Aurora";

/**
 * The ambient background for every screen: three slow aurora lights drifting
 * behind the content, recoloured by the accent mode. Sits behind everything
 * and never takes pointer input. Motion pauses off screen and holds still
 * with `prefers-reduced-motion`.
 */
export default function BackdropField() {
  return (
    <div className="ix-backdrop" aria-hidden="true">
      <Aurora
        className="absolute inset-0 h-full w-full"
        colors={["var(--acc)", "var(--acc-bright)", "var(--acc-glow)"]}
        duration={22}
        intensity={0.34}
      />
      <div className="ix-backdrop-foot" />
    </div>
  );
}
