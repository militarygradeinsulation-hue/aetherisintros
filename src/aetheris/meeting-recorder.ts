/**
 * Records the member's own microphone in short, self-contained clips while their notes are on,
 * so each clip can be transcribed on the server (src/lib/meetingTranscribe.functions.ts).
 * Clips with no speech are dropped before they leave the browser: nothing is sent while you
 * are silent or muted. Works in every current browser (Chrome, Edge, Safari, Firefox).
 */

export interface Clip { blob: Blob; mimeType: string; voicedMs: number }

/** Minimum speech in a clip before it is worth transcribing. */
export const MIN_VOICED_MS = 700
/** Clip length: short enough for near-live captions, long enough to keep sentences whole. */
export const CLIP_MS = 12_000

/** The first recording format this browser supports that the transcriber accepts. */
export function pickMimeType(isTypeSupported: (type: string) => boolean): string | null {
  for (const type of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']) {
    try { if (isTypeSupported(type)) return type } catch { /* keep looking */ }
  }
  return null
}

export function recordingSupported(): boolean {
  return typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && pickMimeType(t => MediaRecorder.isTypeSupported(t)) !== null
}

/** Phrases speech models are known to invent from silence or noise. */
const PHANTOM = /^(thank you( for watching)?|thanks for watching|you|bye|okay|\.+|subtitles by .*|transcribed by .*)[.!]?$/i

/** Tidy a transcription: trim, collapse spaces, and drop phantom phrases. */
export function cleanTranscript(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return !t || PHANTOM.test(t) ? '' : t
}

/** Root-mean-square level of a time-domain audio frame (0..1). */
export function rms(frame: Float32Array): number {
  let sum = 0
  for (let i = 0; i < frame.length; i++) sum += frame[i]! * frame[i]!
  return Math.sqrt(sum / Math.max(1, frame.length))
}

export class ClipRecorder {
  private recorder: MediaRecorder | null = null
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private meter: number | null = null
  private timer: number | null = null
  private voicedMs = 0
  private running = false
  private readonly stream: MediaStream
  private readonly mimeType: string

  constructor(source: MediaStream, private readonly onClip: (clip: Clip) => void, private readonly clipMs = CLIP_MS) {
    // Record only the audio, on its own stream, so camera changes never interrupt it.
    this.stream = new MediaStream(source.getAudioTracks())
    this.mimeType = pickMimeType(t => MediaRecorder.isTypeSupported(t)) ?? ''
  }

  start() {
    if (this.running || !this.mimeType || !this.stream.getAudioTracks().length) return
    this.running = true
    try {
      this.ctx = new AudioContext()
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 1024
      this.ctx.createMediaStreamSource(this.stream).connect(this.analyser)
      const frame = new Float32Array(this.analyser.fftSize)
      // Browsers may start audio processing paused until the page is interacted with.
      void this.ctx.resume().catch(() => undefined)
      // Count time with speech-level sound; a muted track reads as silence.
      this.meter = window.setInterval(() => {
        if (!this.analyser || !this.ctx) return
        if (this.ctx.state !== 'running') { this.voicedMs += 100; return } // cannot measure: never drop speech
        this.analyser.getFloatTimeDomainData(frame)
        if (rms(frame) > 0.015) this.voicedMs += 100
      }, 100)
    } catch {
      // No level meter: send every clip and let the transcriber judge.
      this.voicedMs = Number.POSITIVE_INFINITY
    }
    this.next()
  }

  /** Each clip is its own recorder session, so every clip is a complete, playable file. */
  private next() {
    if (!this.running) return
    const chunks: Blob[] = []
    const recorder = new MediaRecorder(this.stream, { mimeType: this.mimeType, audioBitsPerSecond: 32_000 })
    this.recorder = recorder
    const meterless = this.voicedMs === Number.POSITIVE_INFINITY
    if (!meterless) this.voicedMs = 0
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
    recorder.onstop = () => {
      const voiced = this.voicedMs
      if (chunks.length && voiced >= MIN_VOICED_MS) {
        this.onClip({ blob: new Blob(chunks, { type: this.mimeType }), mimeType: this.mimeType, voicedMs: voiced === Number.POSITIVE_INFINITY ? this.clipMs : voiced })
      }
      this.next()
    }
    recorder.start()
    this.timer = window.setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop() }, this.clipMs)
  }

  /** Stops recording; the clip in progress is still delivered. */
  stop() {
    if (!this.running) return
    this.running = false
    if (this.timer !== null) clearTimeout(this.timer)
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop()
    if (this.meter !== null) clearInterval(this.meter)
    void this.ctx?.close().catch(() => undefined)
    this.ctx = null; this.analyser = null; this.recorder = null
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}
