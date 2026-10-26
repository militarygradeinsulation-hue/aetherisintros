import { ClipRecorder, recordingSupported } from './meeting-recorder'
/**
 * Voice layer: read anything aloud, and talk to Ask Intros.
 * Managed voice uses the owner's private ElevenLabs voice; device speech is
 * available only when explicitly selected in Preferences.
 */
import { useEffect, useRef, useState } from 'react'
import { speakWithIntrosVoice } from '@/lib/voice.functions'
import { splitReadingPassages } from './reading-utils'

export const voiceSpeeds = ['slowest', 'slow', 'normal', 'fast', 'faster', 'fastest'] as const
export type VoiceSpeed = typeof voiceSpeeds[number]

export const voiceSpeedLabels: Record<VoiceSpeed, string> = {
  slowest: 'Slowest', slow: 'Slow', normal: 'Normal', fast: 'Fast', faster: 'Faster', fastest: 'Fastest',
}

const rateOf: Record<VoiceSpeed, number> = {
  slowest: 0.65, slow: 0.85, normal: 1, fast: 1.2, faster: 1.45, fastest: 1.75,
}

export interface VoiceSettings {
  /** Read-aloud controls are available and spoken output is allowed. */
  readAloud: boolean
  /** Speak every Ask Intros reply out loud. */
  speakReplies: boolean
  /** Hands-free back and forth with Ask Intros. */
  conversation: boolean
  /** Click any piece of the page to hear just that piece. */
  tapToRead: boolean
  voiceName: string
  speed: VoiceSpeed
}

const KEY = 'aetheris.voice.settings'

const defaults: VoiceSettings = {
  readAloud: true, speakReplies: true, conversation: false, tapToRead: false, voiceName: 'intros-managed', speed: 'normal',
}

let settings: VoiceSettings = defaults
let loaded = false
const settingListeners = new Set<() => void>()

function load(): VoiceSettings {
  if (loaded || typeof window === 'undefined') return settings
  loaded = true
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<VoiceSettings>
      settings = {
        ...defaults,
        ...parsed,
        conversation: false,
        voiceName: parsed.voiceName || 'intros-managed',
        speed: voiceSpeeds.includes(parsed.speed as VoiceSpeed) ? parsed.speed as VoiceSpeed : 'normal',
      }
    }
  } catch { /* keep defaults */ }
  return settings
}

export function readVoiceSettings(): VoiceSettings {
  return load()
}

export function setVoiceSettings(patch: Partial<VoiceSettings>) {
  const before = load()
  settings = { ...before, ...patch }
  try { window.localStorage.setItem(KEY, JSON.stringify(settings)) } catch { /* private mode */ }
  settingListeners.forEach(listener => listener())
  /* Speed and voice changes take effect on the words being read right now. */
  const changed = (patch.speed !== undefined && patch.speed !== before.speed)
    || (patch.voiceName !== undefined && patch.voiceName !== before.voiceName)
  if (changed) restartCurrent()
}

/** Live voice settings, shared by every control in the product. */
export function useVoiceSettings(): [VoiceSettings, (patch: Partial<VoiceSettings>) => void] {
  const [value, setValue] = useState<VoiceSettings>(defaults)
  useEffect(() => {
    setValue(readVoiceSettings())
    const listener = () => setValue({ ...readVoiceSettings() })
    settingListeners.add(listener)
    return () => { settingListeners.delete(listener) }
  }, [])
  return [value, setVoiceSettings]
}

/* --------------------------------------------------------------- speaking */

export type ReaderState = 'idle' | 'speaking' | 'paused'

export interface ReaderSnapshot {
  state: ReaderState
  /** What is being read now, for the follow-along line. */
  current: string
  index: number
  total: number
  label: string
  /** Set when this device cannot speak, so the member is told instead of ignored. */
  problem: string
}

let segments: string[] = []
let index = 0
let state: ReaderState = 'idle'
let label = ''
let problem = ''
let token = 0
let activeAudio: HTMLAudioElement | null = null
let activeAudioUrl = ''
/** A single Web Audio context resumed during the member's actual tap.
 * iOS can play synthesized audio after an async ElevenLabs response because
 * this context was unlocked while the click was still active. */
let managedAudioContext: AudioContext | null = null
let managedAudioSource: AudioBufferSourceNode | null = null
/** Keep synthesized audio only in this device's memory until played or replaced.
 * A mobile autoplay block must not force another paid TTS request. */
let pendingManagedAudio: { blob: Blob; run: number } | null = null

/** Safari on iPhone can route audio into the quiet receiver after microphone
 * capture. Request playback routing when Butler reads, and mic routing only
 * while listening. This API is optional; other browsers keep their defaults. */
function setMobileAudioSession(mode: 'playback' | 'play-and-record') {
  if (typeof navigator === 'undefined') return
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
    if (session && session.type !== mode) session.type = mode
  } catch { /* AudioSession is not supported or not writable on this device. */ }
}

export function unlockAudio() {
  if (typeof window === 'undefined' || readVoiceSettings().voiceName !== 'intros-managed') return
  try {
    const AudioCtor = window.AudioContext
      ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return
    if (!managedAudioContext || managedAudioContext.state === 'closed') managedAudioContext = new AudioCtor()
    // Do not await here: resume must be *called* in the user-gesture stack.
    if (managedAudioContext.state !== 'running') void managedAudioContext.resume().catch(() => {})
  } catch { /* Browser <audio> fallback will show an error if gesture is blocked. */ }
}
const readerListeners = new Set<() => void>()

function announce() { readerListeners.forEach(listener => listener()) }

export function speechSupported() {
  return typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof SpeechSynthesisUtterance !== 'undefined'
}


/** ElevenLabs is the managed default; another voice requires explicit selection. */
export function voiceOutputSupported() {
  return readVoiceSettings().voiceName === 'intros-managed' || speechSupported()
}

export function listVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return []
  return window.speechSynthesis.getVoices()
}

function chosenVoice(): SpeechSynthesisVoice | null {
  const name = readVoiceSettings().voiceName
  if (!name || name === 'intros-managed') return null
  return listVoices().find(voice => voice.name === name) ?? null
}

/** Voices that actually sound like a person, best first — device engines vary wildly. */
export function naturalVoices(): { name: string; lang: string; label: string }[] {
  const wanted = /^(en)/i
  const premium = /(natural|neural|enhanced|premium|siri|google|eloquence)/i
  const known = /(samantha|serena|daniel|karen|moira|alex|ava|allison|tessa|fiona|nicky|aaron|joelle|matilda|jamie|zoe)/i
  const scored = listVoices()
    .filter(item => wanted.test(item.lang || 'en'))
    .map(item => ({
      name: item.name,
      lang: item.lang,
      label: item.name.replace(/\s*\((?:enhanced|premium)\)/i, '').trim(),
      score: (premium.test(item.name) ? 4 : 0) + (known.test(item.name) ? 2 : 0) + (item.localService ? 1 : 0),
    }))
  scored.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
  const seen = new Set<string>()
  return scored
    .filter(item => (seen.has(item.label) ? false : (seen.add(item.label), true)))
    .map(({ name, lang, label }) => ({ name, lang, label }))
}

/** Best natural voice on this device, used when the member has not picked one. */
function bestVoice(): SpeechSynthesisVoice | null {
  const top = naturalVoices()[0]
  if (!top) return null
  return listVoices().find(item => item.name === top.name) ?? null
}

/** Re-speak the passage in progress so a new speed or voice is heard at once. */
function restartCurrent() {
  if (state === 'idle' || !segments.length) return
  token += 1
  stopActiveAudio()
  if (speechSupported()) window.speechSynthesis.cancel()
  void speakCurrent(token)
}

function stopActiveAudio() {
  if (managedAudioSource) {
    managedAudioSource.onended = null
    try { managedAudioSource.stop() } catch { /* already ended */ }
    managedAudioSource.disconnect()
    managedAudioSource = null
  }
  if (activeAudio) {
    activeAudio.onended = null
    activeAudio.onerror = null
    activeAudio.pause()
    activeAudio.removeAttribute('src')
    activeAudio = null
  }
  if (activeAudioUrl) URL.revokeObjectURL(activeAudioUrl)
  activeAudioUrl = ''
}

function base64Audio(value: string, contentType: string): Blob {
  const decoded = window.atob(value)
  const bytes = new Uint8Array(decoded.length)
  for (let position = 0; position < decoded.length; position += 1) bytes[position] = decoded.charCodeAt(position)
  return new Blob([bytes], { type: contentType })
}

function finishSegment(run: number) {
  if (run !== token) return
  pendingManagedAudio = null
  if (index + 1 < segments.length) { index += 1; announce(); void speakCurrent(run) }
  else stopReading()
}

function speakWithDevice(text: string, run: number) {
  if (!speechSupported() || run !== token) {
    stopReading()
    problem = 'This device has no fallback reading voice installed.'
    announce()
    return
  }
  setMobileAudioSession('playback')
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = chosenVoice() ?? bestVoice()
  if (voice) { utterance.voice = voice; utterance.lang = voice.lang }
  utterance.rate = rateOf[readVoiceSettings().speed]
  utterance.pitch = 1
  utterance.volume = 1
  utterance.onend = () => finishSegment(run)
  utterance.onerror = event => {
    if (run !== token) return
    const reason = (event as unknown as { error?: string })?.error ?? ''
    stopReading()
    if (reason && reason !== 'interrupted' && reason !== 'canceled') {
      problem = reason === 'not-allowed'
        ? 'Reading needs a tap first on this device. Press the speaker again.'
        : 'This device has no reading voice installed, so Intros cannot read aloud here.'
      announce()
    }
  }
  state = 'speaking'
  announce()
  /* Run speech synchronously inside the user's tap. Scheduling this even
   * 60ms later loses audio activation on some mobile WebKit browsers. */
  try {
    window.speechSynthesis.resume()
    window.speechSynthesis.speak(utterance)
  } catch {
    if (run !== token) return
    stopReading()
    problem = 'This device could not start its reading voice. Check audio settings and try again.'
    announce()
  }
}

/** Play an already-synthesized clip. When mobile browsers block async playback,
 * leave its bytes ready for a *real user tap* instead of showing "Speaking"
 * indefinitely or silently changing the member's chosen voice. */
async function playManagedAudio(blob: Blob, run: number): Promise<void> {
  if (run !== token) return
  stopActiveAudio()
  setMobileAudioSession('playback')
  const ctx = managedAudioContext
  if (ctx) {
    try {
      if (ctx.state !== 'running') {
        let timeout: ReturnType<typeof setTimeout> | undefined
        try {
          await Promise.race([
            ctx.resume(),
            new Promise<void>((_, reject) => { timeout = setTimeout(() => reject(new Error('Audio unlock required')), 1800) }),
          ])
        } finally { if (timeout) clearTimeout(timeout) }
      }
      if (run !== token) return
      if (ctx.state !== 'running') throw new Error('Audio context is not running')
      const buffer = await ctx.decodeAudioData(await blob.arrayBuffer())
      if (run !== token) return
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.playbackRate.value = rateOf[readVoiceSettings().speed]
      source.connect(ctx.destination)
      managedAudioSource = source
      source.onended = () => {
        if (run !== token) return
        stopActiveAudio()
        finishSegment(run)
      }
      source.start()
      problem = ''
      state = 'speaking'
      announce()
      return
    } catch {
      // Web Audio is interrupted or cannot decode this clip. Try the native
      // media element before asking the member to tap Play reply.
      stopActiveAudio()
    }
  }
  if (run !== token) return
  activeAudioUrl = URL.createObjectURL(blob)
  const audio = new Audio()
  audio.preload = 'auto'
  audio.setAttribute('playsinline', '')
  audio.volume = 1
  audio.src = activeAudioUrl
  audio.playbackRate = rateOf[readVoiceSettings().speed]
  activeAudio = audio
  audio.onended = () => {
    if (run !== token) return
    stopActiveAudio()
    finishSegment(run)
  }
  audio.onerror = () => {
    if (run !== token) return
    failManagedReading('This device could not decode Butler audio. Select a device voice in Settings or try a different browser.')
  }
  try {
    await audio.play()
    if (run !== token) return
    problem = ''
    state = 'speaking'
    announce()
  } catch {
    if (run !== token) return
    // Preserve activeAudio/src so retrying from an actual tap can start
    // immediately without waiting for the network or invoking ElevenLabs.
    state = 'paused'
    problem = 'Your phone blocked automatic sound. Tap Play reply below to hear Butler. Check media volume if it stays quiet.'
    announce()
  }
}

async function speakCurrent(run: number) {
  const text = segments[index]
  if (run !== token) return
  if (text === undefined) { stopReading(); return }
  state = 'speaking'
  announce()

  if (readVoiceSettings().voiceName !== 'intros-managed') {
    pendingManagedAudio = null
    speakWithDevice(text, run)
    return
  }

  try {
    const { supabase } = await import('@/integrations/supabase/client')
    const { data: sessionData } = await supabase.auth.getSession()
    if (run !== token) return
    if (!sessionData.session) throw new Error('Sign in to hear the private Ask Intros ElevenLabs voice.')
    const result = await speakWithIntrosVoice({ data: { text: text.slice(0, 1800) } })
    if (run !== token) return
    const blob = base64Audio(result.audio, result.contentType)
    pendingManagedAudio = { blob, run }
    await playManagedAudio(blob, run)
  } catch (error) {
    if (run !== token) return
    failManagedReading(error instanceof Error
      ? 'ElevenLabs voice unavailable: ' + error.message
      : 'Your ElevenLabs voice is unavailable. Try again shortly.')
  }
}

/** Resume blocked mobile playback using the stored audio without a new API
 * request. Only called from a visible member-controlled button. */
export function playPendingButlerAudio() {
  if (state !== 'paused') return
  unlockAudio() // Calling resume in the click stack is critical on iOS Safari.
  if (activeAudio) {
    const audio = activeAudio
    state = 'speaking'
    problem = ''
    announce()
    void audio.play().catch(() => {
      if (audio !== activeAudio) return
      state = 'paused'
      problem = 'Butler sound is still blocked. Turn up media volume, check Bluetooth output, or choose a device voice in Settings.'
      announce()
    })
    return
  }
  if (pendingManagedAudio && pendingManagedAudio.run === token) {
    const { blob, run } = pendingManagedAudio
    state = 'speaking'
    problem = ''
    announce()
    void playManagedAudio(blob, run)
  }
}

function failManagedReading(message: string) {
  stopReading()
  problem = message
  announce()
}

/** Read an ordered list of passages aloud, replacing anything being read now. */
export function readAloud(passages: string[], readingLabel = 'Reading') {
  const nativePlayback = readVoiceSettings().voiceName !== 'intros-managed'
  // Short fragments protect native engines; managed speech can synthesize
  // longer fragments without many extra paid provider requests.
  const clean = splitReadingPassages(passages, nativePlayback ? 240 : 1400)
  stopReading()
  if (!clean.length) {
    problem = 'No readable text was found here. Highlight a passage and select Read aloud.'
    announce()
    return
  }
  if (!speechSupported() && readVoiceSettings().voiceName !== 'intros-managed') {
    problem = 'This browser cannot read aloud. Try Chrome, Edge or Safari.'
    announce()
    return
  }
  problem = ''
  segments = clean
  index = 0
  label = readingLabel
  token += 1
  setMobileAudioSession('playback')
  // Unlock the managed ElevenLabs playback context during this user gesture,
  // including on iPhone Safari. Never silently replace their selected voice.
  if (!nativePlayback) unlockAudio()
  void speakCurrent(token)
}

export function stopReading() {
  const hadPlayback = state !== 'idle'
  token += 1
  segments = []
  pendingManagedAudio = null
  index = 0
  state = 'idle'
  label = ''
  stopActiveAudio()
  // A no-op cancel on the first tap can prevent immediately queued speech
  // from starting on Safari. Only cancel if audio was actually in progress.
  if (speechSupported()
      && (hadPlayback || window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
    window.speechSynthesis.cancel()
  }
  announce()
}

export function pauseReading() {
  if (state !== 'speaking') return
  if (managedAudioSource && managedAudioContext) void managedAudioContext.suspend()
  else if (activeAudio) activeAudio.pause()
  else if (speechSupported()) window.speechSynthesis.pause()
  state = 'paused'
  announce()
}

export function resumeReading() {
  if (state !== 'paused') return
  if (pendingManagedAudio && !managedAudioSource) { playPendingButlerAudio(); return }
  unlockAudio()
  if (managedAudioSource && managedAudioContext) void managedAudioContext.resume()
  else if (activeAudio) void activeAudio.play()
  else if (speechSupported()) window.speechSynthesis.resume()
  state = 'speaking'
  announce()
}

export function skipSegment(step: 1 | -1) {
  if (!segments.length) return
  const next = index + step
  if (next < 0 || next >= segments.length) { stopReading(); return }
  index = next
  token += 1
  stopActiveAudio()
  if (speechSupported()) window.speechSynthesis.cancel()
  void speakCurrent(token)
}

export function readerSnapshot(): ReaderSnapshot {
  return { state, current: segments[index] ?? '', index, total: segments.length, label, problem }
}

/** Live reader state for the reading bar and speaker buttons. */
export function useReader(): ReaderSnapshot {
  const [snapshot, setSnapshot] = useState<ReaderSnapshot>({ state: 'idle', current: '', index: 0, total: 0, label: '', problem: '' })
  useEffect(() => {
    const listener = () => setSnapshot(readerSnapshot())
    readerListeners.add(listener)
    listener()
    return () => { readerListeners.delete(listener) }
  }, [])
  return snapshot
}

/* -------------------------------------------------------- page extraction */

const SKIP = new Set(['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'CANVAS', 'SVG', 'SCRIPT', 'STYLE', 'KBD'])

function visible(node: HTMLElement) {
  if (node.getAttribute('aria-hidden') === 'true') return false
  const style = window.getComputedStyle(node)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  return node.offsetParent !== null || node.getClientRects().length > 0
}

function passageFrom(node: HTMLElement): string {
  const clone = node.cloneNode(true) as HTMLElement
  clone.querySelectorAll('[aria-hidden="true"], canvas, svg, kbd, script, style').forEach(child => child.remove())
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/** Ordered readable passages inside a region — headings, copy, list items, card text. */
export function passagesIn(root: HTMLElement | null): string[] {
  if (!root || typeof window === 'undefined') return []
  const out: string[] = []
  const seen = new Set<string>()
  const nodes = root.querySelectorAll<HTMLElement>('h1, h2, h3, h4, p, li, blockquote, dd, dt, figcaption, td, th')
  nodes.forEach(node => {
    if (SKIP.has(node.tagName)) return
    if (node.closest('[data-voice-skip="true"]')) return
    if (!visible(node)) return
    const text = passageFrom(node)
    if (text.length < 2 || seen.has(text)) return
    seen.add(text)
    out.push(text)
  })
  return out
}

/** Everything on the page the member is looking at. */
export function currentPagePassages(): string[] {
  if (typeof document === 'undefined') return []
  // "main.content" belonged to the old shell. The current app uses
  // .arch-product-main, while public/editorial routes often use .ael.
  const sheet = Array.from(document.querySelectorAll<HTMLElement>('.sv-sheet, [role="dialog"]'))
    .find(visible)
  if (sheet) {
    const content = passagesIn(sheet)
    if (content.length) return content
  }
  const candidates = document.querySelectorAll<HTMLElement>(
    'main.content, .arch-product-main, .ix-root main, .ael main, #main-content, [role="main"], main, .ael, .ix-root',
  )
  for (const region of candidates) {
    if (!visible(region)) continue
    const content = passagesIn(region)
    if (content.length) return content
  }
  return []
}

/** Text the member has highlighted, if any. */
export function selectedText(): string {
  if (typeof window === 'undefined') return ''
  return (window.getSelection()?.toString() ?? '').replace(/\s+/g, ' ').trim()
}

/** Read the selection when there is one, otherwise the whole page. */
export function readPageOrSelection(): 'selection' | 'page' | 'empty' {
  const selection = selectedText()
  if (selection.length > 1) { readAloud([selection], 'Reading your selection'); return 'selection' }
  const passages = currentPagePassages()
  if (!passages.length) return 'empty'
  readAloud(passages, 'Reading this page')
  return 'page'
}

/* ------------------------------------------------------------- dictation */

type RecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error?: string }) => void) | null
}

function recognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const scope = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null
}

export function dictationSupported() { return recognitionCtor() !== null }

export interface DictationApi {
  supported: boolean
  listening: boolean
  interim: string
  error: string
  start: () => void
  stop: () => void
  toggle: () => void
}

/**
 * Microphone input. `onFinal` fires with a finished phrase.
 * With `keepOpen`, listening restarts itself until stopped — conversation mode.
 */
export function useDictation({ onFinal, keepOpen = false, transcribe }: { onFinal: (text: string) => void; keepOpen?: boolean; transcribe?: (blob: Blob, mimeType: string) => Promise<string> }): DictationApi {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const recognition = useRef<RecognitionLike | null>(null)
  const wanted = useRef(false)
  const fallback = useRef<ClipRecorder|null>(null), microphone=useRef<MediaStream|null>(null), epoch=useRef(0), retryTimer=useRef<ReturnType<typeof setTimeout>|null>(null), retries=useRef(0)
  const transcriber=useRef(transcribe);transcriber.current=transcribe
  const handler = useRef(onFinal)
  const keep = useRef(keepOpen)
  handler.current = onFinal
  keep.current = keepOpen

  const stop = () => {
    wanted.current = false
    epoch.current++
    if(retryTimer.current)clearTimeout(retryTimer.current)
    void fallback.current?.stop();fallback.current=null
    microphone.current?.getTracks().forEach(t=>t.stop());microphone.current=null
    setMobileAudioSession('playback')
    setListening(false)
    setInterim('')
    try { recognition.current?.stop() } catch { /* already stopped */ }
  }

  const startFallback = async () => {
    const run=++epoch.current
    try {
      if(!transcriber.current||!recordingSupported())throw new Error('Voice recognition is unavailable. Please type your message.')
      setMobileAudioSession('play-and-record')
      setInterim('Connecting microphone…')
      const stream=await navigator.mediaDevices.getUserMedia({audio:true})
      if(run!==epoch.current||!wanted.current){stream.getTracks().forEach(t=>t.stop());return}
      microphone.current=stream
      let queue=Promise.resolve(), queued=0
      const recorder=new ClipRecorder(stream,clip=>{
        if(queued>=3){stop();setError('Voice transcription fell behind. Please retry with shorter phrases.');return}
        queued++
        queue=queue.then(async()=>{
          if(run!==epoch.current||!wanted.current)return
          setInterim('Transcribing…')
          const text=await transcriber.current!(clip.blob,clip.mimeType.split(';')[0]!)
          if(run!==epoch.current||!wanted.current)return
          setInterim('')
          if(text){handler.current(text);if(!keep.current)stop()}
        }).catch(e=>{if(run===epoch.current){stop();setError(e instanceof Error?e.message:'Voice transcription failed. Please retry.')}}).finally(()=>{queued--})
      },5000)
      fallback.current=recorder;recorder.start();setInterim('');setError('');setListening(true)
    }catch(e){if(run===epoch.current){stop();setError(e instanceof Error?e.message:'Microphone could not start. Check browser permissions.')}}
  }

  const start = () => {
    if(wanted.current&&listening)return
    const Ctor = recognitionCtor()
    if (!Ctor) {wanted.current=true;void startFallback();return}
    wanted.current = true
    retries.current=0
    setError('')
    if (recognition.current) { try { recognition.current.abort() } catch { /* ignore */ } }
    const rec = new Ctor()
    setMobileAudioSession('play-and-record')
    recognition.current = rec
    rec.continuous = true
    rec.interimResults = true
    rec.lang = typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US'
    rec.onresult = event => {
      if (recognition.current !== rec) return
      let live = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const text = result?.[0]?.transcript ?? ''
        if (result?.isFinal) {
          const phrase = text.trim()
          if (phrase) handler.current(phrase)
        } else live += text
      }
      setInterim(live.trim())
    }
    rec.onerror = event => {
      if (recognition.current !== rec || event.error === 'aborted') return
      if(event.error==='no-speech'){setInterim('');return}
      if((event.error==='network'||event.error==='service-not-allowed') && transcriber.current){
        rec.onend=null;rec.onresult=null;rec.onerror=null;try{rec.abort()}catch{}
        recognition.current=null;void startFallback();return
      }
      if(event.error==='network' && retries.current<2){retries.current++;setInterim('Reconnecting voice…');return}
      wanted.current=false;setListening(false)
      setError(event.error==='not-allowed'?'Microphone permission was denied. Allow microphone access for this site and retry.'
        :event.error==='service-not-allowed'?'Your browser blocked its speech service. Check browser voice permissions or use another browser.'
        :event.error==='audio-capture'?'No usable microphone was found. Check your input device.'
        :'The browser speech service could not connect. Retry voice or type your message.')
    }

    rec.onend = () => {
      if (recognition.current !== rec) return
      setInterim('')
      if (wanted.current && keep.current) { retryTimer.current=setTimeout(()=>{if(!wanted.current||recognition.current!==rec)return;try{rec.start()}catch{wanted.current=false;setListening(false);setError('Voice could not restart. Please retry.')}},retries.current?Math.min(2000,500*retries.current):250);return }
      wanted.current = false
      setListening(false)
    }
    try { rec.start(); setListening(true) } catch { wanted.current=false;setListening(false);setError('Voice could not start. Check microphone permissions and retry.') }
  }

  useEffect(() => () => { wanted.current=false;epoch.current++;if(retryTimer.current)clearTimeout(retryTimer.current);void fallback.current?.stop();microphone.current?.getTracks().forEach(t=>t.stop());try { recognition.current?.abort() } catch {} }, [])

  return {
    supported: dictationSupported() || (!!transcribe && recordingSupported()),
    listening,
    interim,
    error,
    start,
    stop,
    toggle: () => { if (listening) stop(); else start() },
  }
}

/** Words that always stop voice, whatever else was said. */
export function isStopPhrase(text: string) {
  return /^(stop|cancel|quiet|be quiet|stop reading|shut up|never mind)\b/i.test(text.trim())
}
