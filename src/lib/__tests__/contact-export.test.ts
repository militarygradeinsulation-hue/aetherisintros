import { describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({
  rpc: vi.fn().mockResolvedValue({
    data: null,
    error: { message: "Contact data export is disabled by policy" },
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc },
}));

import { downloadContactCsv } from "@/aetheris/ledger/format";
import { contactExportIsDenied } from "../contact-export";
import { downloadNetworkReport } from "@/intros-ui/utils/reportExport";

describe("contact export denial", () => {
  it("fails closed through the backend policy RPC", async () => {
    await expect(contactExportIsDenied()).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith("deny_contact_data_export");
  });

  it("blocks direct CRM and executive-report download helpers", async () => {
    await expect(
      downloadContactCsv("contacts.csv", [{ email: "private@example.test" }]),
    ).resolves.toBeUndefined();
    await expect(downloadNetworkReport([], [])).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledTimes(2);
  });
});
