import { useState } from "react";
import { detectPublicPage, type PublicPageSnapshot } from "./diagnostics";
import type { SpecterFinding } from "./types";
export function SpecterDetectPanel() {
  const [url, setUrl] = useState("");
  const [snapshot, setSnapshot] = useState<PublicPageSnapshot | null>(null);
  const [findings, setFindings] = useState<SpecterFinding[]>([]);
  const [error, setError] = useState("");
  function analyze() {
    setError("");
    try {
      const parsed = new URL(url);
      if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("Enter an HTTP(S) URL.");
      // A URL alone is not evidence. Real scans must supply authorized page snapshots.
      if (!snapshot || snapshot.url !== parsed.href) {
        setFindings([]);
        setError("No authorized page snapshot is available. Connect the browser capture flow before analyzing.");
        return;
      }
      setFindings(detectPublicPage(snapshot).findings);
    } catch {
      setError("Enter a valid URL and provide an authorized page snapshot.");
    }
  }
  return <section aria-label="Specter Detect" className="rounded-xl border p-5 space-y-4">
    <div><p className="text-xs uppercase tracking-widest text-amber-500">Aetheris Specter</p><h2 className="text-xl font-semibold">Detect what others overlook.</h2></div>
    <label className="block text-sm" htmlFor="specter-target">Investigation target</label>
    <input id="specter-target" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://company.example" className="w-full rounded border bg-transparent p-2" />
    <button type="button" onClick={analyze} className="rounded bg-amber-500 px-4 py-2 font-semibold text-black">Analyze authorized evidence</button>
    {error && <p role="status" className="text-sm">{error}</p>}
    <ul className="space-y-3">{findings.map(finding => <li key={finding.id} className="rounded border p-3"><strong>{finding.title}</strong><p className="text-sm">{finding.recommendation}</p><small>Evidence-backed observation · confidence {Math.round(finding.confidence * 100)}%</small></li>)}</ul>
  </section>;
}
