import React from "react";
import { createRoot } from "react-dom/client";
import { HRWorkspace } from "../../src/features/hr/HRWorkspace";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HRWorkspace />
  </React.StrictMode>,
);
