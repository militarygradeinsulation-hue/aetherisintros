import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import App from "@/aetheris/App";
import "@/aetheris/styles.css";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Command Center — Aetheris Nexus" },
      {
        name: "description",
        content:
          "The Aetheris Nexus command center: relationship radar, connection scoring, warm paths, forensics, meeting intelligence and relationship ROI.",
      },
      { property: "og:title", content: "Command Center — Aetheris Nexus" },
      {
        property: "og:description",
        content:
          "Diagnose the outcome, map the graph, score the relationship, choose the smallest intelligent next action.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppRoute,
});

function AppRoute() {
  return (
    <ClientOnly fallback={null}>
      <App />
    </ClientOnly>
  );
}
