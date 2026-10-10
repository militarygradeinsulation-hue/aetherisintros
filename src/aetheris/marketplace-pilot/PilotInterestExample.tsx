import { PilotInterestForm } from "./PilotInterestForm";
import {
  PilotPersistenceBlockedError,
  type PilotInterestSubmit,
  type PilotProfilePrefill,
} from "./pilot-interest";

/**
 * Integration example. No authorized persistence exists for pilot interest yet (no table/RPC, and the
 * marketplace work in PR #47 is separate), so this fixture always rejects: it never reports a saved
 * submission. Replace `onSubmit` with an authorized, verified endpoint when one exists.
 */
const blockedSubmit: PilotInterestSubmit = async () => {
  throw new PilotPersistenceBlockedError();
};

export function PilotInterestExample({ profile }: { profile?: PilotProfilePrefill }) {
  return <PilotInterestForm onSubmit={blockedSubmit} {...(profile ? { profile } : {})} />;
}
