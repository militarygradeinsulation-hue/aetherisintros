import { z } from "zod";
import { exchangeRow } from "../exchange-contract";
import { parseAdminOverview } from "./admin-overview-contract";
import { parseNetworkHealth } from "./network-health-contract";

export type ConnectionState =
  | "read_verified"
  | "needs_action"
  | "missing_database"
  | "access_denied"
  | "invalid_response"
  | "unavailable"
  | "timeout"
  | "cancelled";
export interface ConnectionCheck {
  id: string;
  label: string;
  rpc: string;
  validate: (data: unknown) => void;
  action?: string;
}
export interface ConnectionResult {
  id: string;
  label: string;
  state: ConnectionState;
  detail: string;
  checkedAt: string;
}
export type ReadRpc = (
  name: string,
  signal: AbortSignal,
) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;
const providers = z.array(
  z.object({ id: z.string().uuid(), name: z.string(), category: z.string() }),
);
const requests = z.array(z.object({ id: z.string().uuid(), status: z.string() }));
const inbox = z.array(
  z.object({ request_id: z.string().uuid(), provider_id: z.string().uuid(), status: z.string() }),
);
export const connectionChecks: readonly ConnectionCheck[] = [
  {
    id: "overview",
    label: "Owner analytics",
    rpc: "admin_platform_overview",
    validate: (data) => {
      parseAdminOverview(data);
    },
  },
  {
    id: "network",
    label: "Network health",
    rpc: "admin_network_health",
    validate: (data) => {
      parseNetworkHealth(data);
    },
  },
  {
    id: "membership",
    label: "Current account membership",
    rpc: "is_live_member",
    validate: (data) => {
      if (typeof data !== "boolean") throw new Error("Invalid response");
    },
    action:
      "This administrator account does not currently have live member access. Check confirmed email, approved standing and completed onboarding.",
  },
  {
    id: "providers",
    label: "Provider directory",
    rpc: "provider_directory",
    validate: (data) => {
      providers.parse(data);
    },
  },
  {
    id: "requests",
    label: "My provider requests",
    rpc: "my_provider_requests",
    validate: (data) => {
      requests.parse(data);
    },
  },
  {
    id: "inbox",
    label: "Provider inbox",
    rpc: "provider_inbox",
    validate: (data) => {
      inbox.parse(data);
    },
  },
  {
    id: "exchange",
    label: "Shared Opportunity Exchange",
    rpc: "list_exchange_opportunities",
    validate: (data) => {
      z.array(exchangeRow).parse(data);
    },
  },
];
const detail: Record<ConnectionState, string> = {
  read_verified:
    "Read succeeded for this account. Creating, sending and other members’ permissions still require workflow tests.",
  needs_action: "This account needs an access check.",
  missing_database:
    "A required database function or table is missing, or the API schema cache is stale. Check deployed migrations and schema reload.",
  access_denied:
    "The database denied this account. Check membership and the expected role/grants; do not disable row security.",
  invalid_response:
    "The service responded with an unexpected shape. Check the deployed API version before treating it as connected.",
  unavailable:
    "The read could not be completed. Check the session, network and service availability, then retry.",
  timeout: "The read timed out. Check service availability and retry.",
  cancelled: "The check was cancelled.",
};

/** Read-only, bounded and payload-free. Returned diagnostics never contain RPC records or raw error text. */
export async function checkConnection(
  check: ConnectionCheck,
  call: ReadRpc,
  parent?: AbortSignal,
  timeoutMs = 10000,
): Promise<ConnectionResult> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const result = (state: ConnectionState): ConnectionResult => ({
    id: check.id,
    label: check.label,
    state,
    detail: state === "needs_action" ? (check.action ?? detail[state]) : detail[state],
    checkedAt: new Date().toISOString(),
  });
  let cancel: (() => void) | undefined;
  let expired = false;
  try {
    if (parent?.aborted) return result("cancelled");
    const deadline = new Promise<never>((_resolve, reject) => {
      cancel = () => {
        controller.abort();
        reject(new Error("Cancelled"));
      };
      parent?.addEventListener("abort", cancel, { once: true });
      timer = setTimeout(() => {
        expired = true;
        controller.abort();
        reject(new Error("Timeout"));
      }, timeoutMs);
    });
    const response = await Promise.race([
      Promise.resolve().then(() => call(check.rpc, controller.signal)),
      deadline,
    ]);
    if (parent?.aborted) return result("cancelled");
    if (response.error) {
      const code = response.error.code;
      if (code === "42501") return result("access_denied");
      if (code === "PGRST202" || code === "42883" || code === "42P01")
        return result("missing_database");
      return result("unavailable");
    }
    try {
      check.validate(response.data);
    } catch {
      return result("invalid_response");
    }
    return result(
      check.id === "membership" && response.data === false ? "needs_action" : "read_verified",
    );
  } catch {
    return result(expired ? "timeout" : parent?.aborted ? "cancelled" : "unavailable");
  } finally {
    clearTimeout(timer);
    if (cancel) parent?.removeEventListener("abort", cancel);
  }
}
