import { createFileRoute } from "@tanstack/react-router";
import Landing from "@/aetheris/Landing";
import "@/aetheris/styles.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aetheris Intros — Relationship Intelligence" },
      {
        name: "description",
        content:
          "Your network already contains opportunities. Aetheris Intros reveals who matters, why now, and the trusted path forward.",
      },
      { property: "og:title", content: "Aetheris Intros — Relationship Intelligence" },
      {
        property: "og:description",
        content:
          "A living map of who matters, why they matter and what should happen next — not a CRM or contact directory.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <Landing />;
}
