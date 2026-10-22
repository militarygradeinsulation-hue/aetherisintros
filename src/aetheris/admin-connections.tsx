import { useEffect, useRef, useState } from "react";
import { useAccess } from "./access";
import { supabase } from "@/integrations/supabase/client";
import {
  checkConnection,
  connectionChecks,
  type ConnectionResult,
  type ReadRpc,
} from "./lib/connection-preflight";
import "./admin-connections.css";
import { MemberFeatureReadinessPanel } from './MemberFeatureReadinessPanel';

const labels = {
  read_verified: "Read verified",
  needs_action: "Needs attention",
  missing_database: "Database setup needed",
  schema_mismatch: "Schema mismatch",
  access_denied: "Access denied",
  invalid_response: "Unexpected response",
  unavailable: "Unavailable",
  timeout: "Timed out",
  cancelled: "Cancelled",
};
const call: ReadRpc = (name, signal) =>
  (
    supabase as unknown as {
      rpc(name: string): { abortSignal(signal: AbortSignal): ReturnType<ReadRpc> };
    }
  )
    .rpc(name)
    .abortSignal(signal);

/** Uses the signed-in administrator's existing reads. It never probes another member or changes records. */
export function AdminConnectionsPanel() {
  const { access } = useAccess();
  const [rows, setRows] = useState<ConnectionResult[]>([]);
  const [reportAccount, setReportAccount] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = useRef<{ controller: AbortController; account: string } | null>(null);
  const allowed =
    !access.loading &&
    access.signedIn &&
    access.isAdmin &&
    access.emailConfirmed &&
    !!access.userId;
  useEffect(() => {
    run.current?.controller.abort();
    run.current = null;
    setRows([]);
    setReportAccount(null);
    setBusy(false);
    return () => {
      run.current?.controller.abort();
      run.current = null;
    };
  }, [access.userId, allowed]);
  const check = async () => {
    if (!allowed || !access.userId || run.current) return;
    const request = { controller: new AbortController(), account: access.userId };
    run.current = request;
    setBusy(true);
    setRows([]);
    setReportAccount(null);
    const results = await Promise.all(
      connectionChecks.map((probe) => checkConnection(probe, call, request.controller.signal)),
    );
    if (run.current !== request || request.controller.signal.aborted) return;
    setReportAccount(request.account);
    setRows(results);
    setBusy(false);
    run.current = null;
  };
  const visibleRows = reportAccount === access.userId ? rows : [];
  if (!allowed) return null;
  return (
    <><section className="admin-connection-checks" aria-label="Connection preflight" aria-busy={busy}>
      <h2>Check the deployed connections</h2>
      <p>
        Runs read-only requests as your current administrator account. Results verify those reads
        only; they do not certify sends, signup, private access for other members, or external
        providers.
      </p>
      <button type="button" disabled={busy} onClick={() => void check()}>
        {busy ? "Checking connections…" : "Run connection checks"}
      </button>
      {!visibleRows.length && !busy && <p>No checks run in this session.</p>}
      {busy && (
        <p role="status">
          Checking {connectionChecks.length} database connections. Each read has a 10-second
          timeout.
        </p>
      )}
      {!!visibleRows.length && (
        <>
          <p role="status">
            {visibleRows.filter((row) => row.state === "read_verified").length} of{" "}
            {visibleRows.length} reads verified. Checked{" "}
            {new Date(visibleRows[0]!.checkedAt).toLocaleString()}.
          </p>
          <ul>
            {visibleRows.map((row) => (
              <li key={row.id} data-state={row.state}>
                <h3>{row.label}</h3>
                <strong>{labels[row.state]}</strong>
                <p>{row.detail}</p>
              </li>
            ))}
          </ul>
          <p>
            Opportunity Exchange setup requires migration 0090. A missing-function result can also
            mean an API schema cache needs reloading. See the repository release checklist before
            changing the database.
          </p>
        </>
      )}
    </section><MemberFeatureReadinessPanel /></>
  );
}
