import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import App from "@/aetheris/App";
import "@/aetheris/styles.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aetheris Intros — Relationship Intelligence OS" },
      {
        name: "description",
        content:
          "Aetheris Intros is a relationship-intelligence operating system for high-value professional introductions: diagnose outcomes, map your graph, score connections, and act with precision.",
      },
      { property: "og:title", content: "Aetheris Intros — Relationship Intelligence OS" },
      {
        property: "og:description",
        content:
          "Diagnose, map, score, connect, and compound your most valuable professional relationships.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientOnly fallback={null}>
      <App />
    </ClientOnly>
  );
}
