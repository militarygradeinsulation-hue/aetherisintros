# Meeting, Butler and discovery release

## Meetings

Hosts can generate and revoke seven day invitation codes and links. Nonmembers can sign in or create an account on /meet and enter the invited room without entering the membership gated network. A code only grants admission to its meeting, not the rest of the CRM. Four participant capacity applies to both member invitations and code redemption.

Hosts can save title, agenda and schedule changes; archive inactive meetings; move records to trash; and restore them. Trash is recoverable, not permanent erasure. Archiving or trashing revokes the guest invitation. Already admitted guests retain ordinary access until deletion; deleted meetings hide their audio and transcript from participants until restoration. Private notes remain owned by their authors.

The lobby clearly asks permission before saving each person's microphone audio, transcribing it, and letting Butler analyze it. Selecting Join with that option starts capture automatically. Participants can opt out or stop inclusion. Audio is saved as short private speaker clips, including a final flush when leaving normally. Video is not saved. Silence is omitted. Browser shutdown, connection failure, denied permission and provider failures can create gaps; the UI must not promise complete recording.

Butler reviews new transcript once per minute while listening is enabled. It saves private summaries and suggested action items, without silently creating tasks. Server transcription checks live meeting and speaker consent. Browser speech recognition remains a fallback when the speech provider is unavailable. Recorded audio is separate from transcription and continues when browser transcription is selected.

Migration: supabase/migrations/20261025182108_meeting_guest_links_records.sql. Applied directly to production on October 25, 2026. No preexisting records were altered. Tested against a disposable database fixture; hosted policies and bucket metadata inspected separately.

## Butler conversation and voice

The conversation has one scroll area, collapsible history/settings and suggestions, inline attachment control, and an expand button. Successful saves no longer display Retry.

Browser speech recognition recovers from silence, makes bounded reconnect attempts, and uses authenticated server transcription when its speech service fails. This fallback needs the existing LOVABLE_API_KEY runtime service. Audio is transient for Butler dictation. Account changes and closing the panel stop microphone capture. Denied access and provider failures remain visible with Retry.

## Website scans

The reader no longer requests expensive screenshots with every evidence capture. It supports an optional server JINA_API_KEY, honors Retry-After, retries short cooldowns once, deduplicates in-flight same-user scans and caches successful same-user captures for one minute. No direct arbitrary-host fetch or redirect bypass was introduced. A shared anonymous reader can still hit its quota; this is not an unlimited service.

## Prospect discovery

The owner-only Prospect Intelligence workspace now has public web search, Google search handoff, Sales Navigator handoff, and reviewed CRM creation with source excerpts and duplicate checks. The existing CSV preview/import remains available. Search results do not infer names, emails, phones or verification.

Google and Sales Navigator handoffs are not account/API connections. Google's Custom Search JSON API is closed to new customers and retires January 1, 2027. LinkedIn's Sales Navigator APIs require approved SNAP permissions; a subscription alone does not supply them. Sources: https://developers.google.com/custom-search/v1/overview and https://learn.microsoft.com/en-us/linkedin/sales/sync-services/getting-started

Production currently lacks has_private_owner_grant(text). This release does not grant access or apply the unrelated private prospect authorization candidate. Discovery stays behind that existing closed gate until the private owner authorization is configured. No LinkedIn credentials, browser cookies or licensed contact database were connected.

## Verification

Run node scripts/meeting-release/check.mjs for isolated invitation/record/storage-policy tests. Specter tests cover short cooldown retries, long cooldown rejection, safe redirect handling and bounded evidence parsing. Targeted TypeScript checks cover modified files. Full build and real multi-party microphone/network behavior require deployment validation; simulated database tests do not prove hosted WebRTC or speech-provider availability.

Voice hook checks are in scripts/meeting-release/voice-recovery.check.jsx and were run with an isolated Vitest configuration and matching React/react-test-renderer 19.3.1. These optional test tools are not production dependencies.
