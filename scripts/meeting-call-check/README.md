# Meeting call check

Browser check for the video call engine (`src/aetheris/meeting-call.ts`). Three Chromium tabs with fake cameras join one meeting over an in-browser stand-in for the Realtime channel (`fake-transport.ts`). The check confirms that:

- all three connect to each other directly, whatever order they join in;
- each tab receives the others' camera and microphone;
- live captions reach everyone except the speaker;
- when someone leaves, the others drop that connection and stay connected to each other;
- a late joiner connects to everyone already in the room.

```
node scripts/meeting-call-check/run.mjs
```

It needs Chromium (`/opt/pw-browsers/chromium`, or set `CHROMIUM`) and Playwright (set `PLAYWRIGHT_MODULE` if it is not the global install). Nothing touches the live database or Supabase.
