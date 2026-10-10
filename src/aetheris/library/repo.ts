import { supabase } from "@/integrations/supabase/client";
import type { LibraryImportRecord } from "./import";

export interface LibraryWorkspace {
  id: string;
  owner_id: string;
  name: string;
  is_default: boolean;
}

export interface LibraryRecord extends LibraryImportRecord {
  id: string;
  owner_id: string;
  workspace_id: string;
  batch_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LibrarySuggestion {
  id: string;
  record_id: string;
  candidate_key: string;
  candidate_name: string;
  confidence: number;
  source_url: string;
  source_channel: "manual" | "assistant_connector";
  sourced_at: string;
  fields: Record<string, string>;
  field_evidence: Record<string, { source_url: string; observed_at: string }>;
  status: "pending" | "accepted" | "rejected";
  accepted_fields: string[];
}

// The generated Supabase types do not yet include the additive private_library_* tables.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function checked<T>(data: T | null, error: { message?: string } | null, fallback: string): T {
  if (error || data == null) throw new Error(fallback);
  return data;
}

export async function ensureDefaultWorkspace(): Promise<string> {
  const { data, error } = await db.rpc("ensure_private_library_workspace");
  return checked(data as string | null, error, "Sign in to open your private Library.");
}

export async function accessibleWorkspaces(): Promise<LibraryWorkspace[]> {
  const { data, error } = await db
    .from("private_library_workspaces")
    .select("id,owner_id,name,is_default")
    .order("is_default", { ascending: false })
    .order("name");
  return checked(
    (data ?? []) as LibraryWorkspace[],
    error,
    "Your Library workspaces could not be loaded.",
  );
}

export async function currentUserId(): Promise<string | null> {
  const { data, error } = await db.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

export async function workspacePermission(
  workspaceId: string,
  userId: string,
): Promise<"owner" | "read" | "edit"> {
  const { data: workspace, error: workspaceError } = await db
    .from("private_library_workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .maybeSingle();
  if (workspaceError || !workspace) throw new Error("This Library workspace is not available.");
  if (workspace.owner_id === userId) return "owner";
  const { data, error } = await db
    .from("private_library_workspace_members")
    .select("permission")
    .eq("workspace_id", workspaceId)
    .eq("member_id", userId)
    .maybeSingle();
  if (error || !data?.permission) throw new Error("This Library workspace is not available.");
  return data.permission as "read" | "edit";
}

export async function searchLibrary(query: string, workspaceId: string): Promise<LibraryRecord[]> {
  const { data, error } = await db.rpc("search_private_library_records", {
    p_query: query,
    p_limit: 100,
    p_workspace_id: workspaceId,
  });
  return checked((data ?? []) as LibraryRecord[], error, "Private Library search is unavailable.");
}

export async function startImportBatch(input: {
  workspaceId: string;
  fileName: string;
  format: "csv" | "xlsx";
  fileHash: string;
  totalRows: number;
}): Promise<{ id: string; existing: boolean }> {
  const { data, error } = await db.rpc("create_private_library_import_batch", {
    p_workspace_id: input.workspaceId,
    p_source_file: input.fileName,
    p_source_format: input.format,
    p_file_hash: input.fileHash,
    p_total_rows: input.totalRows,
  });
  return checked(
    data as { id: string; existing: boolean } | null,
    error,
    "The import batch could not be started.",
  );
}

export async function importLibraryRows(
  batchId: string,
  rows: Array<{ import_key: string; record: LibraryImportRecord }>,
) {
  const { data, error } = await db.rpc("import_private_library_records", {
    p_batch_id: batchId,
    p_rows: rows,
  });
  return checked(
    data as {
      inserted: number;
      existing: number;
      errors: Array<{ source_sheet: string; source_row: number; message: string }>;
    } | null,
    error,
    "This import chunk could not be saved.",
  );
}

export async function finishImport(
  batchId: string,
  rowErrors: Array<{ source_sheet: string; source_row: number; messages: string[] }>,
) {
  const { error } = await db.rpc("finish_private_library_import", {
    p_batch_id: batchId,
    p_row_errors: rowErrors,
  });
  if (error) throw new Error("The private import report could not be finalized.");
}

export async function workspaceShares(
  workspaceId: string,
): Promise<Array<{ member_id: string; permission: "read" | "edit" }>> {
  const { data, error } = await db
    .from("private_library_workspace_members")
    .select("member_id,permission")
    .eq("workspace_id", workspaceId)
    .order("created_at");
  return checked(
    (data ?? []) as Array<{ member_id: string; permission: "read" | "edit" }>,
    error,
    "Sharing settings could not be loaded.",
  );
}

export async function grantWorkspaceAccess(
  workspaceId: string,
  memberId: string,
  permission: "read" | "edit",
) {
  const { error } = await db.rpc("grant_private_library_access", {
    p_workspace_id: workspaceId,
    p_member_id: memberId,
    p_permission: permission,
  });
  if (error) throw new Error("Access could not be granted. Check the member ID and permission.");
}

export async function revokeWorkspaceAccess(workspaceId: string, memberId: string) {
  const { error } = await db.rpc("revoke_private_library_access", {
    p_workspace_id: workspaceId,
    p_member_id: memberId,
  });
  if (error) throw new Error("Access could not be revoked.");
}

export async function librarySuggestions(recordId: string): Promise<LibrarySuggestion[]> {
  const { data, error } = await db
    .from("private_library_enrichment_suggestions")
    .select(
      "id,record_id,candidate_key,candidate_name,confidence,source_url,source_channel,sourced_at,fields,field_evidence,status,accepted_fields",
    )
    .eq("record_id", recordId)
    .order("created_at", { ascending: false });
  return checked(
    (data ?? []) as LibrarySuggestion[],
    error,
    "Evidence-backed suggestions could not be loaded.",
  );
}

export async function submitLibrarySuggestion(input: {
  recordId: string;
  candidateKey: string;
  candidateName: string;
  sourceUrl: string;
  sourcedAt: string;
  fields: Record<string, string>;
  fieldEvidence: Record<string, { source_url: string; observed_at: string }>;
}) {
  const { error } = await db.rpc("submit_private_library_suggestion", {
    p_record_id: input.recordId,
    p_candidate_key: input.candidateKey,
    p_candidate_name: input.candidateName,
    p_confidence: 0,
    p_source_url: input.sourceUrl,
    p_source_channel: "manual",
    p_sourced_at: input.sourcedAt,
    p_fields: input.fields,
    p_field_evidence: input.fieldEvidence,
  });
  if (error)
    throw new Error(
      "The candidate needs a public HTTPS source and evidence for each proposed field.",
    );
}

export async function acceptLibrarySuggestion(id: string, fields: string[]) {
  const { error } = await db.rpc("accept_private_library_suggestion", {
    p_suggestion_id: id,
    p_fields: fields,
  });
  if (error) throw new Error("The selected evidence-backed fields could not be accepted.");
}

export async function rejectLibrarySuggestion(id: string) {
  const { error } = await db.rpc("reject_private_library_suggestion", { p_suggestion_id: id });
  if (error) throw new Error("This candidate could not be rejected.");
}
