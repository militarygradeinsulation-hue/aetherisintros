import { afterEach, describe, expect, it, vi } from "vitest";
import { checkConnection, connectionChecks, type ReadRpc } from "../lib/connection-preflight";

const probe = connectionChecks.find((p) => p.id === "exchange")!;
const response =
  (data: unknown, code?: string): ReadRpc =>
  async () => ({ data, error: code ? { code } : null });
afterEach(() => vi.useRealTimers());

describe("owner read-only connection preflight", () => {
  it("calls only the audited, read-only RPC allowlist", () => {
    expect(connectionChecks.map((p) => p.rpc)).toEqual([
      "admin_platform_overview",
      "admin_network_health",
      "is_live_member",
      "provider_directory",
      "my_provider_requests",
      "provider_inbox",
      "list_exchange_opportunities",
    ]);
  });
  it("verifies empty but valid reads and rejects malformed exchange records", async () => {
    expect((await checkConnection(probe, response([]))).state).toBe("read_verified");
    expect(
      (await checkConnection(probe, response([{ id: "plausible-but-incomplete" }]))).state,
    ).toBe("invalid_response");
    expect((await checkConnection(probe, response(null))).state).toBe("invalid_response");
  });
  it("separates missing migrations, denied reads and transport failures", async () => {
    for (const code of ["PGRST202", "PGRST205", "42883", "42P01"])
      expect((await checkConnection(probe, response(null, code))).state).toBe("missing_database");
    expect((await checkConnection(probe, response(null, "42501"))).state).toBe("access_denied");
    expect(
      (
        await checkConnection(probe, async () => {
          throw new Error("private provider payload and token");
        })
      ).state,
    ).toBe("unavailable");
  });
  it("does not mistake inactive membership for a healthy member account", async () => {
    const membership = connectionChecks.find((p) => p.id === "membership")!;
    expect((await checkConnection(membership, response(false))).state).toBe("needs_action");
    expect((await checkConnection(membership, response(true))).state).toBe("read_verified");
    expect((await checkConnection(membership, response("false"))).state).toBe("invalid_response");
  });
  it("bounds a hanging read and aborts its transport", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const pending = checkConnection(
      probe,
      (_name, transportSignal) => {
        signal = transportSignal;
        return new Promise(() => {});
      },
      undefined,
      100,
    );
    await vi.advanceTimersByTimeAsync(100);
    expect((await pending).state).toBe("timeout");
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("cancels old-account reads and does not invoke already-cancelled requests", async () => {
    const parent = new AbortController();
    const call = vi.fn(() => new Promise<never>(() => {}));
    const pending = checkConnection(probe, call, parent.signal);
    parent.abort();
    expect((await pending).state).toBe("cancelled");
    call.mockClear();
    expect((await checkConnection(probe, call, parent.signal)).state).toBe("cancelled");
    expect(call).not.toHaveBeenCalled();
  });
  it("retains neither returned member records nor raw errors in the report", async () => {
    const privateData = [
      {
        id: "00000000-0000-4000-8000-00000000000a",
        name: "Private provider",
        category: "Advisory",
        note: "PRIVATE MEMBER NOTE",
        email: "private@example.invalid",
      },
    ];
    const provider = connectionChecks.find((p) => p.id === "providers")!;
    const result = await checkConnection(provider, response(privateData));
    expect(result.state).toBe("read_verified");
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE MEMBER NOTE|private@example/);
    const fault = await checkConnection(provider, async () => {
      throw new Error("SECRET_TOKEN");
    });
    expect(JSON.stringify(fault)).not.toContain("SECRET_TOKEN");
  });
});
