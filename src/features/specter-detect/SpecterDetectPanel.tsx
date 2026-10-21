import { useState } from "react";
import { CaseWorkspace } from "./CaseWorkspace";
import { detectPublicPage } from "./diagnostics";
import { validatePublicSnapshot, redactSensitiveText } from "./snapshot-validation";
import type { SpecterFinding } from "./types";

/** Manual, local-only evidence capture. No URL fetching or background collection. */
export function SpecterDetectPanel() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [headings, setHeadings] = useState("");
  const [links, setLinks] = useState("");
  const [findings, setFindings] = useState<SpecterFinding[]>([]);
  const [error, setError] = useState("");
  function analyze() {
    setError("");
    setFindings([]);
    try {
      const parsed = new URL(url);
      if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("Enter an HTTP(S) URL.");
      if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) throw new Error("Use a public business URL.");
      if (!title.trim() && !headings.trim() && !links.trim()) throw new Error("Provide actual page evidence first.");
      const result = detectPublicPage(validatePublicSnapshot({
        url: parsed.href,
        title: redactSensitiveText(title.trim().slice(0, 300)),
        headings: headings.split("\n").map(s => redactSensitiveText(s.trim())).filter(Boolean).slice(0, 100),
        links: links.split("\n").map(s => redactSensitiveText(s.trim())).filter(Boolean).slice(0, 100).map(text => ({ text, href: "" })),
        capturedAt: new Date().toISOString()
      }));
      setFindings(result.findings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to analyze evidence.");
    }
  }
  return <section aria-label="Specter Detect" className="mx-auto max-w-3xl rounded-xl border border-border bg-background p-5 space-y-4 text-foreground">
    <div><p className="text-xs uppercase tracking-widest text-amber-600 dark:text-amber-400">Aetheris Specter / Local Preview</p><h2 className="text-xl font-semibold">Detect what others overlook.</h2><p className="text-sm text-muted-foreground">Paste permitted public page observations. This preview runs locally; it does not fetch sites or save data.</p></div>
    <label className="block text-sm" htmlFor="specter-target">Source URL</label>
    <input id="specter-target" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://company.example" className="w-full rounded border border-input bg-background p-2 text-foreground" />
    <label className="block text-sm" htmlFor="specter-title">Page title</label>
    <input id="specter-title" value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded border border-input bg-background p-2 text-foreground" />
    <label className="block text-sm" htmlFor="specter-headings">Observed headings (one per line)</label>
    <textarea id="specter-headings" value={headings} onChange={e => setHeadings(e.target.value)} rows={3} className="w-full rounded border border-input bg-background p-2 text-foreground" />
    <label className="block text-sm" htmlFor="specter-links">Observed link labels (one per line)</label>
    <textarea id="specter-links" value={links} onChange={e => setLinks(e.target.value)} rows={3} className="w-full rounded border border-input bg-background p-2 text-foreground" />
    <button type="button" onClick={analyze} className="rounded bg-amber-500 px-4 py-2 font-semibold text-black">Analyze supplied evidence</button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div aria-live="polite">{findings.length === 0 && !error ? <p className="text-sm text-muted-foreground">No findings to display.</p> : null}
      <ul className="space-y-3">{findings.map(finding => <li key={finding.id} className="rounded border border-border p-3"><strong>{finding.title}</strong><p className="text-sm">{finding.recommendation}</p><small>Rule-based observation · confidence {Math.round(finding.confidence * 100)}% · verify against the complete site</small></li>)}</ul>
    </div>
    <CaseWorkspace target={url} findings={findings} />
  </section>;
}
