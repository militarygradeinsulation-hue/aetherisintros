import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// Keep contact downloads blocked even if a caller skips the UI button.
export async function contactExportIsDenied(): Promise<true> {
  try {
    await db.rpc("deny_contact_data_export");
  } catch {
    // Fail closed if the policy endpoint is unavailable.
  }
  return true;
}
