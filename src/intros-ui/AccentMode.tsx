import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AccentMode = "gold" | "blue" | "mixed";

const KEY = "intros-accent";
const MODES: AccentMode[] = ["gold", "blue", "mixed"];
const LABELS: Record<AccentMode, string> = {
  gold: "Gold",
  blue: "Blue",
  mixed: "Mixed",
};

function readStored(): AccentMode {
  try {
    const v = window.localStorage.getItem(KEY);
    return MODES.includes(v as AccentMode) ? (v as AccentMode) : "gold";
  } catch {
    return "gold";
  }
}

type Value = { mode: AccentMode; setMode: (m: AccentMode) => void };

const AccentCtx = createContext<Value>({ mode: "gold", setMode: () => {} });

/** Remembers the member's accent choice and exposes it as `data-accent` on <html>. */
export function AccentProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AccentMode>(() =>
    typeof window === "undefined" ? "gold" : readStored(),
  );

  useEffect(() => {
    document.documentElement.dataset["accent"] = mode;
    try {
      window.localStorage.setItem(KEY, mode);
    } catch {
      /* private mode — choice simply won't persist */
    }
  }, [mode]);

  const value = useMemo<Value>(() => ({ mode, setMode }), [mode]);
  return <AccentCtx.Provider value={value}>{children}</AccentCtx.Provider>;
}

export const useAccent = () => useContext(AccentCtx);

/** Three small swatches: gold, blue, or the mixed pairing. */
export function AccentSwitch() {
  const { mode, setMode } = useAccent();
  return (
    <div className="ix-accent" role="group" aria-label="Accent colour">
      {MODES.map((m) => (
        <button
          key={m}
          type="button"
          className={m === mode ? "on" : ""}
          aria-pressed={m === mode}
          title={`${LABELS[m]} accent`}
          onClick={() => setMode(m)}
        >
          <i aria-hidden="true" />
          <span>{LABELS[m]}</span>
        </button>
      ))}
    </div>
  );
}
