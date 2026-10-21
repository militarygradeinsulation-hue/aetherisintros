import { useState } from "react";
import type { SpecterFinding } from "./types";

interface LocalCase { target: string; notes: string; findings: SpecterFinding[]; createdAt: string; }
export function CaseWorkspace({ target, findings }: { target: string; findings: SpecterFinding[] }) {
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState<LocalCase | null>(null);
  const [message, setMessage] = useState("");
  function save() {
    if (!target.trim()) { setMessage("Enter a source URL before creating a case."); return; }
    setSaved({ target, notes: notes.slice(0, 2000), findings: [...findings], createdAt: new Date().toISOString() });
    setMessage("Case prepared in this page only. It is not stored on the server.");
  }
  function exportCase() {
    if (!saved) return;
    const blob = new Blob([JSON.stringify(saved, null, 2)], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "specter-case.json";
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }
  return <section aria-label="Specter case workspace" className="space-y-3 border-t border-border pt-4">
    <h3 className="font-semibold">Case workspace</h3>
    <p className="text-sm text-muted-foreground">Prepare a private case locally. Nothing is automatically sent or stored.</p>
    <label htmlFor="specter-case-notes" className="block text-sm">Investigation notes</label>
    <textarea id="specter-case-notes" value={notes} onChange={event => setNotes(event.target.value)} rows={3} maxLength={2000} className="w-full rounded border border-input bg-background p-2 text-foreground" />
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={save} className="rounded bg-amber-500 px-3 py-2 font-medium text-black">Prepare case</button>
      <button type="button" disabled={!saved} onClick={exportCase} className="rounded border border-border px-3 py-2 disabled:opacity-50">Export JSON</button>
    </div>
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
