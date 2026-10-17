# Ask Intros — your personal ElevenLabs voice

Read Aloud and spoken assistant replies use a private ElevenLabs voice
on the actual Ask Intros project. Mic dictation is unaffected.

## Configure in Lovable server secrets for aetherisintros

- ELEVENLABS_API_KEY — secret provider key with access to your clone
- ELEVENLABS_VOICE_ID — ID of YOUR OWN cloned voice from ElevenLabs

Never commit the key, cloned voice ID, or recordings into GitHub.
Do not use a relative's cloned voice or a sample/demo ID.

## Test

1. Sign in on the original Ask Intros project.
2. Settings → Display → Reading voice: My ElevenLabs voice — Ask Intros.
3. Verify that a voice is found and that the displayed name is yours.
4. Press Hear a sample and actually listen to verify its identity.
5. Test a page speaker and Ask Intros reply speaker on mobile and desktop.

Voice metadata is checked server-side without exposing the voice ID.
Voice synthesis requires authentication to prevent public credit abuse.
If the managed voice is not available, display the error; do not
silently substitute a different voice. A device voice must be selected
deliberately in Preferences.

Do not claim the voice is connected until the private secrets are set
and the real ElevenLabs sample has played successfully.