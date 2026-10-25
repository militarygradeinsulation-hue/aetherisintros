import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  NetworkValuePage,
  type NetworkMode,
} from "../../src/features/network-value/NetworkValuePage";
function Preview() {
  const [mode, setMode] = useState<NetworkMode>("capacity");
  return (
    <>
      <nav aria-label="Test pages">
        {(["capacity", "benchmarks", "settlements"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}>
            {m}
          </button>
        ))}
      </nav>
      <NetworkValuePage mode={mode} />
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Preview />
  </React.StrictMode>,
);
