# Ask Intros: API provider activation runbook (26 October 2026)

Project: original Ask Intros, not the remix. Deployment through GitHub main, never
the Lovable editor/chat to spend credits. This file contains **no credentials**.

## Key incident and immediate action

A user shared what appear to be live OpenAI, ElevenLabs, RocketReach and other
provider keys in conversation text. Assume those secrets may have been exposed.
Revoke/rotate the originals at each provider before adding anything to production.
Don't copy chat content or old keys into a repository, ticket, log, build output,
localStorage, browser-visible `VITE_` variable, screenshots or project knowledge.
For the other unlabeled historical tokens and OAuth IDs, first identify their
issuer and revoke or replace any credential that still works.

No connected Lovable action currently supports writing or inspecting the project's
secret values. **The authorized project owner must enter replacement keys in the
encrypted UI themselves**. Once entered, values cannot be viewed again.

1. Open the **original** Ask Intros project.
2. Select **More → Settings → Secrets**.
3. Add the following **server-side** secret names as needed, with newly issued values:

| Secret name | Service | Used in current code |
| --- | --- | --- |
| `OPENAI_API_KEY` | OpenAI project, restricted key | Server LinkedIn indexed-excerpt extraction; Photo to Estimate; Business Tools image generation |
| `FIRECRAWL_API_KEY` | Firecrawl search API | Server-only indexed public LinkedIn lookup (fallback search is present without a key) |
| `ELEVENLABS_API_KEY` | ElevenLabs, restricted TTS/voice-read permission | Butler/read-aloud voice metadata and synthesis |
| `ELEVENLABS_VOICE_ID` | ElevenLabs My Voices → voice → More actions → Copy voice ID | Exact authorized cloned voice to speak through, not an API key |

Never guess which historical ID is an ElevenLabs voice. It must resolve to the
intended voice in the account owning the new ElevenLabs key. `ELEVENLABS_VOICE_ID`
is required in addition to `ELEVENLABS_API_KEY`.

Optional controls: `LINKEDIN_AUTOFILL_MODEL`, `PHOTO_ESTIMATE_MODEL`,
`BUSINESS_IMAGE_MODEL` are **model names**, not credentials.
The OpenAI project must allow the requested models. Do not place any provider
credential under `VITE_` or `NEXT_PUBLIC_`. No secret is required in GitHub.

## Verify with an authenticated member

1. **LinkedIn**: My Profile → Scan LinkedIn profile → Scan public link.
   Confirm that a member's **own exact public link** returns source citations and
   proposed fields, or an honest not-found message. The member must select Apply.
   Firecrawl supplies public search index snippets, **not** a full LinkedIn account
   history or private account retrieval. Without Firecrawl, the public-search
   fallback remains best effort. No autosave or CRM contact scraping is permitted.
2. **ElevenLabs**: Settings → Display → Reading voice. Select your ElevenLabs
   voice. Confirm voice metadata resolves (not `not_configured`), check the
   **name** belongs to you, then play a sample on desktop and mobile. Wrong
   voice, 401, 403, or 404 must prevent false success.
3. **OpenAI Photo to Estimate**: Signed-in Work → Photo to Estimate. Provide a
   permitted, nonconfidential test photo. Confirm it generates an **unsent,
   unpriced** draft that a human must inspect.
4. **Business Tools image generation**: Use a disposable test prompt.
   Confirm success and validate the configured image model is actually available
   to the new project, including permission and usage limits.

No test should use genuine member files, customer contact information, or
unapproved voice recordings. Check providers' dashboards for request and
spending receipts; do not claim success based only on existence of a key.

## Safety controls and limitations

- Server handlers reject common placeholder values instead of treating them
  as active credentials. Keys are read at runtime and never sent to clients.
- Voice synthesis now has per-worker, per-member and total character/request
  brakes plus an 8 MiB response limit. **These are not distributed quotas**;
  set independent spending caps and per-key restrictions in each provider
  dashboard before activating billable services broadly.
- The LinkedIn importer currently uses a per-worker sliding rate limiter.
  Before public scale, replace this with a durable account-scoped quota.
- Restrict OpenAI project keys to necessary model/API operations; use separate
  production and testing keys when available.
- Restrict ElevenLabs key capabilities and credits, and use only voices
  explicitly authorized by their rights holder.
- A RocketReach credential does **not** substitute for a Firecrawl API key.
  RocketReach and historical HubSpot OAuth callback details belong to separate,
  reviewed integrations. Do not connect them to the member profile importer by
  default or upload private contact data.
- Lovable-managed `LOVABLE_API_KEY` is unrelated and cannot be replaced with
  OpenAI's API key. This implementation does not require Lovable AI editor credits.

## Follow-up gates

Secret write: **user action still required**. Live provider account validity,
TTS playback, Firecrawl index coverage, OpenAI model entitlement, and actual
authenticated member tests: **not verified** until a rotated secret is installed.

Code is maintained and tested through GitHub pull requests. Keep production
deployment separate from secret rotation and real provider acceptance.

Sources:
- https://docs.lovable.dev/features/secrets
- https://docs.lovable.dev/integrations/any-api
- https://elevenlabs.io/docs/help-center/technical/how-do-i-find-the-voice-id-of-my-voices-via-the-website-and-api
