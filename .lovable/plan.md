# Voice: read aloud everywhere + talk to Ask Intros

Two capabilities, one shared voice layer, in the existing Editorial Noir / Intelligence OS style.

## 1. Read aloud, anywhere

- A speaker control sits in the top bar of every signed-in page. Press it and Intros reads the page you are on, in order: the headline, the one-line explanation, then each section with its label and content.
- If you have highlighted text first, it reads just that.
- While it reads, a slim reading bar appears at the bottom: pause/resume, skip to next section, stop, and speed. The section being read is gently outlined so you can follow along.
- A "Read on tap" mode (toggle in the reading bar and in settings): while on, clicking any paragraph, card or list reads that piece only. Normal clicking resumes when it is off.
- Small speaker buttons appear on page headers and on the Ask Intros replies, so a single item can be read without reading the whole page.
- Reading uses the browser's built-in speech, so it works immediately, costs nothing per use, and keeps working offline.

## 2. Voice control and conversation mode for Ask Intros

- A microphone button in the Ask Intros dock. Hold or click to speak; your words appear in the box as you talk and send when you stop.
- A Conversation mode switch. With it on, Intros listens, answers out loud, and starts listening again — hands-free back and forth. It shows clear states: Listening, Thinking, Speaking. It stops listening while it speaks so it never hears itself.
- Anything you can type you can say, including the commands it already performs: open a page, change text size, post a need, open a conversation, find who matters.
- Two new spoken controls it obeys: "read this page to me" / "stop reading", and "quiet" to switch speaking off.
- Saying "stop", "cancel" or "quiet" ends speaking and listening immediately.

## 3. Settings

Settings → Display gains a Voice group: read aloud on/off, speak Ask Intros replies on/off, conversation mode on/off, voice choice from the voices this device offers, and speed (Slow / Normal / Fast / Fastest). All remembered in this browser, like text and pointer size.

## 4. Accessibility and fit

- Every control is keyboard reachable and labelled; the reading bar is announced to screen readers.
- Cobalt for the active voice controls, amber only for the live listening indicator.
- If a device has no speech support, the controls explain that in one line instead of failing silently.
- Phone layouts keep the reading bar above the bottom navigation.

## Technical notes

- New `src/aetheris/voice.ts`: persisted settings (`aetheris.voice.*`), a `speak`/`cancel` queue over `window.speechSynthesis`, a `useSpeech()` hook exposing state (idle/speaking/paused, current segment), and `useDictation()` over `SpeechRecognition` / `webkitSpeechRecognition` with continuous mode, interim results, and restart-on-end for conversation mode.
- New `src/aetheris/VoiceBar.tsx` (reading bar + read-on-tap wiring) and a `ReadButton` primitive in `ui.tsx`.
- Page text is extracted at read time from the live `main.content` DOM into ordered segments (headings, paragraphs, list items, card text), skipping `aria-hidden`, canvases and controls — no per-page authoring needed, so all 47 routes are covered.
- `App.tsx`: mount `VoiceBar`, add the top-bar speaker, and extend `runAssistantAction` with `read-page`, `stop-reading` and `voice-off` kinds.
- `askIntros.functions.ts`: add those three action kinds to the action list and a short rule block; input context gains `voice` state so the bot knows whether it is speaking.
- `AskIntrosDock.tsx`: mic button, conversation-mode switch, state line, auto-speak of replies, per-reply speaker.
- `PreferencesPage.tsx` Display tab: the Voice group.
- Styles in `src/aetheris/styles.css`; roadmap entry added.
