import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import App from "@/aetheris/App";
import "@/aetheris/styles.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aetheris Intros — Relationship Intelligence" },
      {
        name: "description",
        content:
          "Aetheris Intros is the professional social network for real business relationships—without spam, mass outreach, or selling your attention.",
      },
      { property: "og:title", content: "Aetheris Intros — Relationship Intelligence" },
      {
        property: "og:description",
        content:
          "Real business networking built on trusted context, mutual value and timing—not spam, paid reach, or mass outreach.",
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
      <App startPage="home" />
    </ClientOnly>
  );
}
