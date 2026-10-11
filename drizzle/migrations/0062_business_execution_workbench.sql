-- Personal project blueprints and proposal comparisons use the existing account-private,
-- versioned workspace store. Do not create a second project or CRM entity here.
ALTER TABLE public.member_workspace_state
  DROP CONSTRAINT IF EXISTS member_workspace_state_store_key_check;

ALTER TABLE public.member_workspace_state
  ADD CONSTRAINT member_workspace_state_store_key_check
  CHECK (store_key IN (
    'aetheris-moat-v1-live',
    'aetheris-relationship-os-v1-live',
    'aetheris-pro-v1-live',
    'aetheris-platform-v1-live',
    'aetheris.ledger.patch',
    'aetheris.business-execution-v1-live'
  ));
