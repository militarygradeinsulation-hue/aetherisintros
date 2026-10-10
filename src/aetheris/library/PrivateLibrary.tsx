import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, FileUp, LockKeyhole, Search, ShieldAlert, UserRound, Users, X } from "lucide-react";
import { Btn, Eyebrow } from "../ui";
import {
  IMPORT_FIELDS,
  autoMap,
  mapSheetRows,
  markDuplicateCandidates,
  parseCsv,
  parseXlsx,
  sha256Hex,
  type ImportField,
  type ImportMap,
  type ImportSheet,
} from "./import";
import {
  acceptLibrarySuggestion,
  accessibleWorkspaces,
  currentUserId,
  ensureDefaultWorkspace,
  finishImport,
  grantWorkspaceAccess,
  importLibraryRows,
  librarySuggestions,
  rejectLibrarySuggestion,
  revokeWorkspaceAccess,
  searchLibrary,
  startImportBatch,
  submitLibrarySuggestion,
  workspacePermission,
  workspaceShares,
  type LibraryRecord,
  type LibrarySuggestion,
  type LibraryWorkspace,
} from "./repo";

type DuplicateChoice = "keep" | "skip" | null;
type FieldSuggestion = "business" | "title" | "location" | "website" | "industry";

const SUGGESTION_FIELDS: Array<{ key: FieldSuggestion; label: string }> = [
  { key: "business", label: "Business" },
  { key: "title", label: "Title" },
  { key: "location", label: "Location" },
  { key: "website", label: "Website" },
  { key: "industry", label: "Industry" },
];

function displayError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function Suggestions({
  record,
  canWrite,
  onChanged,
}: {
  record: LibraryRecord;
  canWrite: boolean;
  onChanged: () => void;
}) {
  const [suggestions, setSuggestions] = useState<LibrarySuggestion[]>([]);
  const [candidateName, setCandidateName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [values, setValues] = useState<Record<FieldSuggestion, string>>({
    business: "",
    title: "",
    location: "",
    website: "",
    industry: "",
  });
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const rows = await librarySuggestions(record.id);
      setSuggestions(rows);
      setSelected(Object.fromEntries(rows.map((row) => [row.id, Object.keys(row.fields)])));
    } catch (e) {
      setError(displayError(e, "Suggestions could not be loaded."));
    }
  }, [record.id]);
  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const parsed = new URL(sourceUrl);
      if (
        parsed.protocol !== "https:" ||
        parsed.username ||
        parsed.password ||
        parsed.search ||
        parsed.hash
      )
        throw new Error(
          "Use a public HTTPS source URL without credentials, query strings, or fragments.",
        );
      const fields = Object.fromEntries(
        Object.entries(values)
          .filter(([, value]) => value.trim())
          .map(([key, value]) => [key, value.trim()]),
      );
      if (!candidateName.trim() || !Object.keys(fields).length)
        throw new Error("Add a candidate name and at least one sourced field.");
      const sourcedAt = new Date().toISOString();
      const fieldEvidence = Object.fromEntries(
        Object.keys(fields).map((key) => [
          key,
          { source_url: parsed.href, observed_at: sourcedAt },
        ]),
      );
      await submitLibrarySuggestion({
        recordId: record.id,
        candidateKey: crypto.randomUUID(),
        candidateName: candidateName.trim(),
        sourceUrl: parsed.href,
        sourcedAt,
        fields,
        fieldEvidence,
      });
      setCandidateName("");
      setSourceUrl("");
      setValues({ business: "", title: "", location: "", website: "", industry: "" });
      await load();
    } catch (e) {
      setError(displayError(e, "The candidate could not be saved."));
    } finally {
      setBusy(false);
    }
  };

  const accept = async (suggestion: LibrarySuggestion) => {
    const fields = selected[suggestion.id] ?? [];
    if (!fields.length) return;
    setBusy(true);
    setError("");
    try {
      await acceptLibrarySuggestion(suggestion.id, fields);
      await load();
      onChanged();
    } catch (e) {
      setError(displayError(e, "The selected fields were not accepted."));
    } finally {
      setBusy(false);
    }
  };

  const reject = async (suggestion: LibrarySuggestion) => {
    setBusy(true);
    setError("");
    try {
      await rejectLibrarySuggestion(suggestion.id);
      await load();
    } catch (e) {
      setError(displayError(e, "The candidate could not be rejected."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pl-enrichment">
      <div className="pl-subhead">
        <Eyebrow>PUBLIC-SOURCE SUGGESTIONS</Eyebrow>
        <span className="pl-unavailable">
          Automatic lookup unavailable · no provider configured
        </span>
      </div>
      <p className="pl-note">
        Add a candidate you verified from a public source. This form never sends private contact
        details to a provider. Each proposed field keeps its source URL and timestamp; nothing
        changes until you accept it.
      </p>
      {canWrite && (
        <div className="pl-suggestion-form">
          <label>
            Candidate name
            <input
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              maxLength={300}
            />
          </label>
          <label>
            Public source URL
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://…"
              inputMode="url"
            />
          </label>
          <div className="pl-suggestion-fields">
            {SUGGESTION_FIELDS.map((field) => (
              <label key={field.key}>
                {field.label}
                <input
                  value={values[field.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  maxLength={2000}
                />
              </label>
            ))}
          </div>
          <Btn kind="secondary" disabled={busy} onClick={() => void submit()}>
            Save sourced candidate
          </Btn>
        </div>
      )}
      {suggestions
        .filter((s) => s.status !== "rejected")
        .map((suggestion) => (
          <article className="pl-suggestion" key={suggestion.id}>
            <div className="pl-subhead">
              <strong>{suggestion.candidate_name}</strong>
              <span>{suggestion.status === "accepted" ? "Accepted" : "Needs review"}</span>
            </div>
            <a href={suggestion.source_url} target="_blank" rel="noreferrer">
              {suggestion.source_url}
            </a>
            <small>Source checked {new Date(suggestion.sourced_at).toLocaleString()}</small>
            <div className="pl-suggestion-review">
              {Object.entries(suggestion.fields).map(([key, value]) => {
                const current = record[key as keyof LibraryRecord];
                const isSelected = (selected[suggestion.id] ?? []).includes(key);
                return (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!canWrite || busy || suggestion.status !== "pending"}
                      onChange={(e) =>
                        setSelected((prev) => ({
                          ...prev,
                          [suggestion.id]: e.target.checked
                            ? [...(prev[suggestion.id] ?? []), key]
                            : (prev[suggestion.id] ?? []).filter((field) => field !== key),
                        }))
                      }
                    />
                    <span>
                      <b>{key}</b>: {String(current || "—")} → {value}
                      <small>
                        Evidence: {suggestion.field_evidence[key]?.source_url} ·{" "}
                        {suggestion.field_evidence[key]?.observed_at}
                      </small>
                    </span>
                  </label>
                );
              })}
            </div>
            {canWrite && suggestion.status === "pending" && (
              <div className="pl-actions">
                <Btn
                  kind="primary"
                  disabled={busy || !(selected[suggestion.id] ?? []).length}
                  onClick={() => void accept(suggestion)}
                >
                  Accept selected fields
                </Btn>
                <Btn kind="quiet" disabled={busy} onClick={() => void reject(suggestion)}>
                  Reject
                </Btn>
              </div>
            )}
          </article>
        ))}
      {error && (
        <p className="pl-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

export function PrivateLibrary() {
  const [userId, setUserId] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<LibraryWorkspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [permission, setPermission] = useState<"owner" | "read" | "edit">("read");
  const [shares, setShares] = useState<Array<{ member_id: string; permission: "read" | "edit" }>>(
    [],
  );
  const [records, setRecords] = useState<LibraryRecord[]>([]);
  const [activeRecordId, setActiveRecordId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [shareMemberId, setShareMemberId] = useState("");
  const [sharePermission, setSharePermission] = useState<"read" | "edit">("read");

  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<ImportSheet[]>([]);
  const [mappings, setMappings] = useState<Record<string, ImportMap>>({});
  const [activeSheet, setActiveSheet] = useState("");
  const [duplicateChoice, setDuplicateChoice] = useState<DuplicateChoice>(null);
  const [rowErrors, setRowErrors] = useState<
    Array<{ source_sheet: string; source_row: number; messages: string[] }>
  >([]);

  const activeRecord = records.find((record) => record.id === activeRecordId) ?? null;
  const canWrite = permission === "owner" || permission === "edit";
  const canManageShares = permission === "owner";

  const checkedRows = useMemo(
    () =>
      markDuplicateCandidates(
        sheets.flatMap((sheet) =>
          mapSheetRows(sheet, mappings[sheet.name] ?? autoMap(sheet.headers), file?.name ?? ""),
        ),
      ),
    [sheets, mappings, file],
  );
  const validCount = checkedRows.filter((row) => !row.errors.length).length;
  const duplicateCount = checkedRows.filter(
    (row) => row.record.duplicate_candidate && !row.errors.length,
  ).length;
  const activeChecked = checkedRows.filter((row) => row.record.source_sheet === activeSheet);

  const loadWorkspace = async () => {
    setLoading(true);
    setError("");
    try {
      const [id, user] = await Promise.all([ensureDefaultWorkspace(), currentUserId()]);
      const available = await accessibleWorkspaces();
      setUserId(user);
      setWorkspaces(available);
      setWorkspaceId((current) =>
        available.some((workspace) => workspace.id === current) ? current : id,
      );
    } catch (e) {
      setError(displayError(e, "Sign in to use your private Library."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, []);

  useEffect(() => {
    if (!workspaceId || !userId) return;
    let live = true;
    void Promise.all([workspacePermission(workspaceId, userId), workspaceShares(workspaceId)])
      .then(([nextPermission, nextShares]) => {
        if (!live) return;
        setPermission(nextPermission);
        setShares(nextShares);
      })
      .catch((e) => {
        if (live) setError(displayError(e, "Workspace access could not be checked."));
      });
    return () => {
      live = false;
    };
  }, [workspaceId, userId]);

  useEffect(() => {
    if (!workspaceId) return;
    let live = true;
    const timer = window.setTimeout(() => {
      void searchLibrary(query, workspaceId)
        .then((next) => {
          if (!live) return;
          setRecords(next);
          setActiveRecordId((current) =>
            next.some((record) => record.id === current) ? current : (next[0]?.id ?? ""),
          );
        })
        .catch((e) => {
          if (live) setError(displayError(e, "Search could not be completed."));
        });
    }, 180);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [query, workspaceId, refreshVersion]);

  const refresh = () => setRefreshVersion((value) => value + 1);

  const upload = async (selectedFile: File) => {
    setError("");
    setNotice("");
    setRowErrors([]);
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError("Choose a file smaller than 50 MB.");
      return;
    }
    const extension = selectedFile.name.split(".").at(-1)?.toLowerCase();
    try {
      const parsed =
        extension === "xlsx"
          ? await parseXlsx(await selectedFile.arrayBuffer())
          : ["csv", "tsv", "txt"].includes(extension ?? "")
            ? parseCsv(await selectedFile.text(), selectedFile.name)
            : (() => {
                throw new Error(
                  "Choose a CSV or XLSX file. Save older workbook formats as XLSX or normalized CSV.",
                );
              })();
      const total = parsed.reduce((count, sheet) => count + sheet.rows.length, 0);
      if (total > 20000)
        throw new Error(
          "This upload exceeds the 20,000-row review limit. Split it into smaller workbooks or CSV files.",
        );
      setFile(selectedFile);
      setSheets(parsed);
      setMappings(Object.fromEntries(parsed.map((sheet) => [sheet.name, autoMap(sheet.headers)])));
      setActiveSheet(parsed[0]?.name ?? "");
      setDuplicateChoice(null);
    } catch (e) {
      setError(displayError(e, "The selected file could not be read."));
    }
  };

  const resetImport = () => {
    setFile(null);
    setSheets([]);
    setMappings({});
    setActiveSheet("");
    setDuplicateChoice(null);
    setRowErrors([]);
    setNotice("");
  };

  const importRows = async () => {
    if (!file || !workspaceId || !canWrite || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    const report: Array<{ source_sheet: string; source_row: number; messages: string[] }> = [];
    let added = 0;
    let alreadyPresent = 0;
    try {
      const fileHash = await sha256Hex(await file.arrayBuffer());
      const batch = await startImportBatch({
        workspaceId,
        fileName: file.name,
        format: file.name.toLowerCase().endsWith(".xlsx") ? "xlsx" : "csv",
        fileHash,
        totalRows: checkedRows.length,
      });
      const accepted = checkedRows.filter((row) => {
        if (row.errors.length) {
          report.push({
            source_sheet: row.record.source_sheet,
            source_row: row.record.source_row,
            messages: row.errors,
          });
          return false;
        }
        if (row.record.duplicate_candidate && duplicateChoice === "skip") {
          report.push({
            source_sheet: row.record.source_sheet,
            source_row: row.record.source_row,
            messages: ["Duplicate candidate skipped by your review choice."],
          });
          return false;
        }
        return true;
      });
      for (let i = 0; i < accepted.length; i += 500) {
        const chunk = accepted.slice(i, i + 500).map((row) => ({
          import_key: `${fileHash}:${encodeURIComponent(row.record.source_sheet)}:${row.record.source_row}`,
          record: row.record,
        }));
        const result = await importLibraryRows(batch.id, chunk);
        added += result.inserted;
        alreadyPresent += result.existing;
        report.push(
          ...result.errors.map((row) => ({
            source_sheet: row.source_sheet,
            source_row: row.source_row,
            messages: [row.message],
          })),
        );
      }
      await finishImport(batch.id, report);
      setRowErrors(report);
      setNotice(
        `${added} added · ${alreadyPresent} already imported · ${report.length} row${report.length === 1 ? "" : "s"} not imported. Re-running the same file is idempotent.`,
      );
      refresh();
    } catch (e) {
      setError(
        displayError(e, "Import stopped before completion. You can retry this same file safely."),
      );
    } finally {
      setBusy(false);
    }
  };

  const updateShare = async () => {
    if (!workspaceId || !shareMemberId.trim()) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await grantWorkspaceAccess(workspaceId, shareMemberId.trim(), sharePermission);
      setShares(await workspaceShares(workspaceId));
      setShareMemberId("");
      setNotice(`Workspace access granted as ${sharePermission}.`);
    } catch (e) {
      setError(displayError(e, "Sharing could not be updated."));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (memberId: string) => {
    if (!workspaceId) return;
    setBusy(true);
    setError("");
    try {
      await revokeWorkspaceAccess(workspaceId, memberId);
      setShares(await workspaceShares(workspaceId));
    } catch (e) {
      setError(displayError(e, "Sharing could not be revoked."));
    } finally {
      setBusy(false);
    }
  };

  const fieldMapping = (field: { key: ImportField; label: string }) => {
    const current = mappings[activeSheet] ?? {};
    return (
      <label key={field.key} className="pl-map-field">
        <span>{field.label}</span>
        <select
          value={current[field.key] ?? -1}
          onChange={(event) => {
            const index = Number(event.target.value);
            setMappings((values) => ({
              ...values,
              [activeSheet]: {
                ...(values[activeSheet] ?? {}),
                [field.key]: index < 0 ? undefined : index,
              },
            }));
          }}
        >
          <option value={-1}>— Not mapped —</option>
          {(sheets.find((sheet) => sheet.name === activeSheet)?.headers ?? []).map(
            (header, index) => (
              <option key={`${index}-${header}`} value={index}>
                {header || `Column ${index + 1}`}
              </option>
            ),
          )}
        </select>
      </label>
    );
  };

  if (loading)
    return (
      <section className="pl">
        <p className="pl-note">Opening your private Library…</p>
      </section>
    );

  return (
    <section className="pl">
      <header className="pl-header">
        <div>
          <Eyebrow>PRIVATE LIBRARY · ROLODEX</Eyebrow>
          <h2>
            People and organizations, <em>kept yours.</em>
          </h2>
          <p>
            Imported contacts are private records, separate from platform members. They are never
            enrolled, messaged, introduced, published or added to the public directory.
          </p>
        </div>
        <LockKeyhole size={22} aria-label="Owner-scoped private workspace" />
      </header>
      {error && (
        <p className="pl-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="pl-notice" role="status">
          <Check size={14} />
          {notice}
        </p>
      )}

      <div className="pl-toolbar">
        <label className="pl-workspace">
          <Eyebrow>WORKSPACE</Eyebrow>
          <select
            value={workspaceId}
            onChange={(e) => {
              setWorkspaceId(e.target.value);
              setActiveRecordId("");
            }}
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
                {workspace.owner_id === userId ? " · owner" : " · shared"}
              </option>
            ))}
          </select>
        </label>
        <label className="pl-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, email, business, title or location"
            aria-label="Search private Library"
          />
        </label>
        {canWrite && (
          <label className="pl-upload">
            <FileUp size={15} /> Import CSV / XLSX
            <input
              type="file"
              accept=".csv,.tsv,.txt,.xlsx,text/csv"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) void upload(selected);
                e.currentTarget.value = "";
              }}
            />
          </label>
        )}
      </div>

      {canManageShares && (
        <details className="pl-sharing">
          <summary>
            <Users size={15} /> Permissioned workspace sharing · private by default
          </summary>
          <div className="pl-share-form">
            <label>
              Member account ID
              <input
                value={shareMemberId}
                onChange={(e) => setShareMemberId(e.target.value)}
                placeholder="UUID"
              />
            </label>
            <label>
              Permission
              <select
                value={sharePermission}
                onChange={(e) => setSharePermission(e.target.value as "read" | "edit")}
              >
                <option value="read">Read only</option>
                <option value="edit">Read and edit</option>
              </select>
            </label>
            <Btn
              kind="secondary"
              disabled={busy || !shareMemberId.trim()}
              onClick={() => void updateShare()}
            >
              Grant access
            </Btn>
          </div>
          {shares.map((share) => (
            <div className="pl-share-row" key={share.member_id}>
              <code>{share.member_id}</code>
              <span>{share.permission}</span>
              <button
                type="button"
                aria-label={`Revoke access for ${share.member_id}`}
                disabled={busy}
                onClick={() => void revoke(share.member_id)}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </details>
      )}

      {file && sheets.length > 0 && (
        <section className="pl-import">
          <div className="pl-subhead">
            <Eyebrow>1 · MAP AND REVIEW</Eyebrow>
            <span>
              {file.name} · {sheets.length} sheet{sheets.length === 1 ? "" : "s"} ·{" "}
              {checkedRows.length.toLocaleString()} rows
            </span>
          </div>
          {sheets.length > 1 && (
            <label className="pl-map-sheet">
              Review sheet
              <select value={activeSheet} onChange={(e) => setActiveSheet(e.target.value)}>
                {sheets.map((sheet) => (
                  <option key={sheet.name}>{sheet.name}</option>
                ))}
              </select>
            </label>
          )}
          <div className="pl-map-grid">{IMPORT_FIELDS.map(fieldMapping)}</div>
          <div className="pl-subhead">
            <Eyebrow>2 · VALIDATE</Eyebrow>
            <span>
              {validCount} ready · {checkedRows.length - validCount} with errors · {duplicateCount}{" "}
              duplicate candidates
            </span>
          </div>
          <p className="pl-note">
            No rows are merged or deleted. Shared phone or email and a matching name alone are not
            identity proof. Company-only rows stay organizations; all imported people remain
            unverified.
          </p>
          {duplicateCount > 0 && (
            <fieldset className="pl-duplicate-choice">
              <legend>Review the possible duplicates before importing</legend>
              <label>
                <input
                  type="radio"
                  name="duplicate-choice"
                  checked={duplicateChoice === "keep"}
                  onChange={() => setDuplicateChoice("keep")}
                />{" "}
                Import flagged rows as separate contacts; keep their duplicate-candidate flag
              </label>
              <label>
                <input
                  type="radio"
                  name="duplicate-choice"
                  checked={duplicateChoice === "skip"}
                  onChange={() => setDuplicateChoice("skip")}
                />{" "}
                Skip flagged rows and include each skip in the row report
              </label>
            </fieldset>
          )}
          <div className="pl-table-wrap" tabIndex={0} aria-label="Import row preview">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Type / name</th>
                  <th>Business</th>
                  <th>Email</th>
                  <th>DNC status</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {activeChecked.slice(0, 50).map((entry) => (
                  <tr key={entry.key}>
                    <td>{entry.record.source_row}</td>
                    <td>
                      <b>{entry.record.name || "—"}</b>
                      <small>{entry.record.record_type}</small>
                    </td>
                    <td>{entry.record.business || "—"}</td>
                    <td>{entry.record.email || "—"}</td>
                    <td>{entry.record.dnc_status}</td>
                    <td>
                      {entry.errors.length ? (
                        <span className="pl-bad">{entry.errors.join(" · ")}</span>
                      ) : entry.record.duplicate_candidate ? (
                        <span className="pl-duplicate">Possible duplicate</span>
                      ) : (
                        entry.warnings[0] || "Ready"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activeChecked.length > 50 && (
            <p className="pl-note">
              Showing 50 of {activeChecked.length.toLocaleString()} rows on this sheet. Every row is
              validated.
            </p>
          )}
          <div className="pl-actions">
            <Btn kind="quiet" disabled={busy} onClick={resetImport}>
              Cancel import
            </Btn>
            <Btn
              kind="primary"
              disabled={
                busy || !canWrite || !validCount || (duplicateCount > 0 && duplicateChoice === null)
              }
              onClick={() => void importRows()}
            >
              {busy ? "Importing…" : `Import ${validCount.toLocaleString()} valid rows`}
            </Btn>
          </div>
          {rowErrors.length > 0 && (
            <details className="pl-row-errors" open>
              <summary>
                <ShieldAlert size={14} /> {rowErrors.length} row-level issues
              </summary>
              {rowErrors.slice(0, 100).map((row, index) => (
                <p key={`${row.source_sheet}:${row.source_row}:${index}`}>
                  {row.source_sheet} · row {row.source_row}: {row.messages.join(" · ")}
                </p>
              ))}
              {rowErrors.length > 100 && (
                <small>
                  Showing the first 100 of {rowErrors.length} row errors; the full report is saved
                  privately with this import batch.
                </small>
              )}
            </details>
          )}
        </section>
      )}

      <div className="pl-grid">
        <aside className="pl-list" aria-label="Private Library records">
          <div className="pl-subhead">
            <Eyebrow>PRIVATE RECORDS</Eyebrow>
            <span>
              {records.length}
              {records.length === 100 ? "+" : ""}
            </span>
          </div>
          {!records.length ? (
            <p className="pl-note">
              {query
                ? "No matching private records."
                : "No private contacts yet. Import a CSV or XLSX workbook to begin."}
            </p>
          ) : (
            records.map((record) => (
              <button
                key={record.id}
                className={record.id === activeRecordId ? "active" : ""}
                onClick={() => setActiveRecordId(record.id)}
              >
                {record.record_type === "person" ? <UserRound size={16} /> : <Users size={16} />}
                <span>
                  <b>{record.name}</b>
                  <small>
                    {record.record_type === "person"
                      ? record.business || "Private contact"
                      : "Private organization"}
                  </small>
                </span>
                <em>Private import</em>
              </button>
            ))
          )}
        </aside>
        {activeRecord && (
          <article className="pl-card">
            <div className="pl-card-top">
              <span className="pl-private-label">
                {activeRecord.record_type === "person"
                  ? "PRIVATE IMPORT · NOT A PLATFORM MEMBER"
                  : "PRIVATE ORGANIZATION"}
              </span>
              <span className="pl-verified">Unverified</span>
            </div>
            <h3>{activeRecord.name}</h3>
            <dl>
              {[
                ["Phone", activeRecord.phone],
                ["Email", activeRecord.email],
                ["Business", activeRecord.business],
                ["Title", activeRecord.title],
                ["Location", activeRecord.location],
                ["Website", activeRecord.website],
                ["Industry", activeRecord.industry],
                ["Raw contact-person text", activeRecord.raw_contact_person],
                ["Do-not-contact status", activeRecord.dnc_status],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label as string}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
            <p className="pl-caution">
              <ShieldAlert size={15} /> DNC status is preserved as supplied. Unknown does not mean
              permission; import is not consent for outreach.
            </p>
            <details className="pl-provenance">
              <summary>Import provenance</summary>
              <p>
                {activeRecord.source_file} · {activeRecord.source_sheet || "CSV"} · source row{" "}
                {activeRecord.source_row}
              </p>
              {activeRecord.source_reference && (
                <p>Source reference: {activeRecord.source_reference}</p>
              )}
              <pre>{JSON.stringify(activeRecord.original_columns, null, 2)}</pre>
            </details>
            <Suggestions record={activeRecord} canWrite={canWrite} onChanged={refresh} />
          </article>
        )}
      </div>
    </section>
  );
}
