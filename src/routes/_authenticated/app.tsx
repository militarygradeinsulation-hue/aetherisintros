import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import App from "@/aetheris/App";
import "@/aetheris/styles.css";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Intelligence System — Aetheris Intros" },
      {
        name: "description",
        content:
          "The Aetheris Intros relationship intelligence system: active memory, trusted paths, introductions, needs and meaningful signals.",
      },
      { property: "og:title", content: "Intelligence System — Aetheris Intros" },
      {
        property: "og:description",
        content:
          "Know who matters, why the relationship makes sense, why now, and the smartest next action.",
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
