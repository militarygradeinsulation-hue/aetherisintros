import { PilotInterestForm } from "./PilotInterestForm";
import { saveMarketplacePilotInterest } from "./persistence";
import type { PilotProfilePrefill } from "./pilot-interest";

/**
 * Integration example for the private, account-scoped marketplace research pilot.
 * The approved-member RPC stores only the reviewed response; it never creates a
 * public listing, authorizes outreach, or contacts another member.
 */
export function PilotInterestExample({ profile }: { profile?: PilotProfilePrefill }) {
  return <PilotInterestForm onSubmit={saveMarketplacePilotInterest} {...(profile ? { profile } : {})} />;
}
