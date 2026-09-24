# Use Joseph’s voice for Intros speech

## Build
- Create a private ElevenLabs voice from the uploaded recording and keep its identifier only in server configuration.
- Add a protected speech endpoint that turns each requested passage or Ask Intros reply into audio with that voice.
- Route page reading, individual speaker buttons, and spoken Ask Intros replies through the new voice.
- Preserve the existing browser voice as a fallback when ElevenLabs is unavailable, and show the provider’s safe error instead of failing silently.

## Experience
- Keep the current reading bar, pause, resume, skip, stop, and speed controls.
- Keep microphone dictation and conversation mode unchanged; only spoken output changes.
- Label the managed voice clearly in Preferences while retaining device voice choices as fallback options.

## Validation
- Test voice creation and one short synthesis request.
- Check Ask Intros and page-reading controls on desktop and mobile.
- Confirm the app remains build-clean and is not published.

## Technical notes
- ElevenLabs stays server-side through the linked project connection.
- Generated audio is requested only when the member presses a reading control or enables spoken replies; provider usage may consume ElevenLabs credits.
- The uploaded recording is used for voice creation, not shipped as a public app asset.
