import { createFileRoute } from "@tanstack/react-router";
import { SpecterDetectPanel } from "@/features/specter-detect/SpecterDetectPanel";
export const Route = createFileRoute("/specter-detect")({
  staticData: { sitemap: false },
  component: () => <main className="min-h-screen bg-background px-4 py-12"><SpecterDetectPanel /></main>
});
