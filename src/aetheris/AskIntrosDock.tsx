import { transcribeButlerAudio } from '@/lib/butlerTranscribe.functions'
import { blobToBase64 } from './meeting-recorder'
import { ButlerWorkspaceControls, useButlerWelcome } from '@/intros-ui/onboarding/ButlerWorkspaceControls'
import { ButlerOrb } from '@/components/ui/butler-orb'
import { AskIntrosMark } from '@/aetheris/AskIntrosMark'
import { useEffect, useRef, useState } from 'react'
import { Paperclip, History, Plus, ArrowUp, Mic, MicOff, Radio, Volume2, VolumeX, X } from 'lucide-react'
import { ThinkingOrb } from '@/components/ui/thinking-orbs'

import { downloadButlerFile } from './butler/download'
import { useButlerConversations, type ButlerDisplayTurn } from './butler/conversations'
import { readButlerFile, BUTLER_ACCEPT, type ButlerAttachment } from './butler/files'
import { executeButlerDraft } from '@/lib/butler.functions'
import { createButlerImage, findButlerReferenceImages, type ButlerReferenceImage } from '@/lib/butlerImages.functions'
import { imageCreationBrief, imageReferenceQuery, spokenReviewCommand, spokenConfirmationFor, voiceApprovalMatches, explicitlyRequestsToolAction, explicitlyRequestsDirectorySearch, type VoiceApproval } from './butler/intent'
import './butler/butler.css'
import { askIntros, type AskIntrosAction } from '@/lib/askIntros.functions'
import { pageMeta } from './pageMeta'
import { readTextScale } from './textScale'
import { readCursorScale } from './cursorScale'
import { useGraphInputs } from './graph-store'
import { answerGraphQuestion } from './opportunity-graph'
import { ceoViewLabel } from './ceo-engine'
import { recognizeCommand, recognizeCapabilityIntent, recognizeDestination } from './capabilities/match'
import { describe as describeCapability } from './capabilities/registry'
import { getActiveSubject, openCapability } from './capabilities/store'
import { openCeo } from './ceo-store'
import { VOICE_PAGES, confirmation, parseVoiceCommand } from './voice-commands'
import { saveQuickNote } from './quick-note-ui'
import { noteFailedResult, noteSavedResult } from './quick-note'
import { placeMenu } from './quick-menu'
import {
  isStopPhrase, readAloud, readerSnapshot, stopReading, useDictation, useReader, useVoiceSettings, voiceOutputSupported,
  unlockAudio, playPendingButlerAudio, speechSupported,
} from './voice'
function AetherisGlyph({ size = 18 }: { size?: number }) {
  return <AskIntrosMark size={size} />
}

export type { AskIntrosAction }

/** What can open the assistant: a question, a spot on screen (right-click), and/or voice mode. */
export interface OpenAssistantDetail { question?: string; x?: number; y?: number; voice?: boolean }

const POS_KEY = 'aetheris-dock-pos'
const FAB_KEY = 'aetheris-dock-fab-pos'
type Point = { left: number; top: number }
const readPoint = (key: string): Point | null => {
  try { const v = JSON.parse(localStorage.getItem(key) ?? 'null'); return v && typeof v.left === 'number' && typeof v.top === 'number' && Number.isFinite(v.left) && Number.isFinite(v.top) ? v : null } catch { return null }
}
const writePoint = (key: string, p: Point | null) => { try { if (p) localStorage.setItem(key, JSON.stringify(p)); else localStorage.removeItem(key) } catch { /* unavailable */ } }
const clampPoint = (p: Point, w: number, h: number): Point => {
  const navigation = document.querySelector('.ledger-native-bottom')?.getBoundingClientRect()
  const height = window.visualViewport?.height ?? window.innerHeight
  const floor = navigation && navigation.height > 0 ? Math.min(height, navigation.top) : height
  return {
    left: Math.min(Math.max(8, p.left), Math.max(8, window.innerWidth - w - 8)),
    top: Math.min(Math.max(8, p.top), Math.max(8, floor - h - 8)),
  }
}

/** Pointer-drag for a fixed element; reports whether the pointer actually moved (so clicks still work). */
function useDrag(onMove: (p: Point) => void, onEnd: (p: Point) => void) {
  return (event: React.PointerEvent<HTMLElement>, el: HTMLElement | null) => {
    if (!el || event.button !== 0) return
    const r = el.getBoundingClientRect()
    const dx = event.clientX - r.left, dy = event.clientY - r.top
    const sx = event.clientX, sy = event.clientY
    let moved = false
    let last: Point = { left: r.left, top: r.top }
    const move = (e: PointerEvent) => {
      if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < 5) return
      moved = true
      last = clampPoint({ left: e.clientX - dx, top: e.clientY - dy }, r.width, r.height)
      onMove(last)
    }
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up)
      if (moved) { onEnd(last); el.dataset['dragged'] = '1'; setTimeout(() => { delete el.dataset['dragged'] }, 0) }
    }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }
}

type Turn = ButlerDisplayTurn
type ButlerVisual =
  | { kind: 'generated'; owner: string; turnId: string; prompt: string; image: string }
  | { kind: 'reference'; owner: string; turnId: string; query: string; results: ButlerReferenceImage[] }

const startingOpeners = [
  'Where are we losing money?',
  'What should I fix first?',
  'What changed?',
  'What am I missing?',
  'Who can I help?',
  'Where is my time going?',
  'Challenge this decision',
  'What am I forgetting?',
  'Who can change this?',
  'Show pending approvals',
  'Which customers need attention?',
  'Show my capital map',
  'Run a scenario',
  'What can I delegate?',
  'Read this page to me',
  'Make the text bigger',
  'Explain Active Memory',
  'Take me to my introductions',
  'Post a need for me',
]

export interface AskIntrosDockProps {
  page: string
  peopleNames: string[]
  memberName: string
  briefing: boolean
  contextPanel: boolean
  /** Runs one assistant action and returns a short human description of what happened. */
  run: (action: AskIntrosAction) => string | null
}

/** Hovering butler: teaches the system, operates it, and talks with the member. */
const dockOwners: symbol[] = []
const dockListeners = new Set<() => void>()
/** Only the first mounted dock renders, so the butler never appears twice. */
function useIsPrimaryDock() {
  const [id] = useState(() => Symbol('dock'))
  const [, bump] = useState(0)
  useEffect(() => {
    dockOwners.push(id)
    const l = () => bump(n => n + 1)
    dockListeners.add(l)
    dockListeners.forEach(f => f())
    return () => { dockOwners.splice(dockOwners.indexOf(id), 1); dockListeners.delete(l); dockListeners.forEach(f => f()) }
  }, [id])
  return dockOwners[0] === id
}

export function AskIntrosDock(props: AskIntrosDockProps) {
  return useIsPrimaryDock() ? <AskIntrosDockInner {...props} /> : null
}

function AskIntrosDockInner({ page, peopleNames, memberName, briefing, contextPanel, run }: AskIntrosDockProps) {
  const [open, setOpen] = useState(false)
  const newMemberWelcome = useButlerWelcome(() => setOpen(true))
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [focusRequest, setFocusRequest] = useState(0)
  const [busy, setBusy] = useState(false)
  const memory = useButlerConversations()
  const { turns, setTurns } = memory
  const [attachments, setAttachments] = useState<ButlerAttachment[]>([])
  const [fileBusy, setFileBusy] = useState(false)
  const [fileError, setFileError] = useState('')
  // Image previews are session-only: binary data never enters the saved conversation or another account.
  const [visuals, setVisuals] = useState<ButlerVisual[]>([])
  const [pendingApproval, setPendingApproval] = useState<VoiceApproval | null>(null)
  const approvalRef = useRef<VoiceApproval | null>(null)
  const resetApproval = () => { approvalRef.current = null; setPendingApproval(null) }
  const [showHistory, setShowHistory] = useState(false)
  const [draft, setDraft] = useState<{ id: string; kind: 'publish-post' | 'create-task' | 'save-writing-style' | 'draft-email'; text: string } | null>(null)
  const [fileExport, setFileExport] = useState<string | null>(null)
  const [draftBusy, setDraftBusy] = useState(false)
  const [draftError, setDraftError] = useState('')
  const ownerRef = useRef(memory.owner)
  ownerRef.current = memory.owner
  const draftRef = useRef(draft)
  draftRef.current = draft
  useEffect(() => {
    const approval = approvalRef.current
    if (approval && (!draft || draft.id !== approval.id || draft.kind !== approval.kind || draft.text !== approval.text)) resetApproval()
  }, [draft])
  const hadResolvedAccount = useRef(false)
  useEffect(() => {
    setAttachments([]); setDraft(null); setFileExport(null); setFileError(''); setDraftError(''); setVisuals([]); resetApproval()
    // Keep a prompt selected while the initial session loads, but never carry
    // a draft across a subsequent sign-in, sign-out, or account change.
    if (hadResolvedAccount.current) setInput('')
    hadResolvedAccount.current = memory.authReady
  }, [memory.owner, memory.authReady])
  useEffect(() => {
    if (open) {
      inputRef.current?.focus({ preventScroll: true })
      const end = inputRef.current?.value.length ?? 0
      inputRef.current?.setSelectionRange(end, end)
    }
  }, [open, focusRequest])
  const addFiles = async (files: FileList | null) => {
    if (!files || fileBusy) return
    const owner = memory.owner
    setFileBusy(true); setFileError('')
    try {
      if (attachments.length + files.length > 3) throw new Error('Attach up to three files per request.')
      const prepared: ButlerAttachment[] = []
      for (const file of Array.from(files)) prepared.push(await readButlerFile(file))
      if (ownerRef.current === owner) setAttachments(current => [...current, ...prepared])
    } catch (error) { setFileError(error instanceof Error ? error.message : 'File could not be read.') }
    finally { setFileBusy(false) }
  }
  const commitDraft = async (reviewed = draft, approvedByVoice = false) => {
    if (!reviewed || reviewed.kind === 'draft-email' || draftBusy) return
    const owner = memory.owner
    resetApproval()
    setDraftBusy(true); setDraftError('')
    try {
      const result = await executeButlerDraft({ data: { ...reviewed, kind: reviewed.kind, owner: owner! } })
      if (ownerRef.current !== owner) return
      setTurns(previous => [...previous, { role: 'assistant', content: (approvedByVoice ? 'Voice confirmation received. ' : '') + result.receipt }])
      if (approvedByVoice && voiceOutputSupported()) readAloud([result.receipt], 'Ask Intros')
      setDraft(null)
      window.dispatchEvent(new Event('aetheris:business-content-published'))
    } catch (error) { if (ownerRef.current === owner) setDraftError(error instanceof Error ? error.message : 'Action failed. Your draft is still here.') }
    finally { setDraftBusy(false) }
  }
  useEffect(() => {
    if (!pendingApproval) return
    const timer = window.setTimeout(resetApproval, Math.max(0, pendingApproval.expiresAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [pendingApproval])

  const useGeneratedReference = async (image: string) => {
    if (fileBusy || attachments.length >= 3) { setFileError('Attach up to three reference files.'); return }
    const owner = memory.owner
    setFileBusy(true); setFileError('')
    try {
      const bytes = await (await fetch(image)).blob()
      const prepared = await readButlerFile(new File([bytes], 'butler-generated-reference.png', { type: 'image/png' }))
      if (ownerRef.current === owner) setAttachments(current => [...current, prepared].slice(0, 3))
    } catch (error) {
      if (ownerRef.current === owner) setFileError(error instanceof Error ? error.message : 'Could not attach generated image.')
    } finally { setFileBusy(false) }
  }

  const [openers, setOpeners] = useState<string[]>(startingOpeners)
  const [voice, setVoice] = useVoiceSettings()
  const reader = useReader()
  const listRef = useRef<HTMLDivElement>(null)
  const sending = useRef(false)
  const graphInputs = useGraphInputs()

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, [turns, visuals, open])
  // Where the panel and the floating button sit; members can drag both anywhere.
  const [pos, setPos] = useState<Point | null>(() => readPoint(POS_KEY))
  const [fabPos, setFabPos] = useState<Point | null>(() => readPoint(FAB_KEY))
  const dockRef = useRef<HTMLElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)
  const dragDock = useDrag(setPos, p => writePoint(POS_KEY, p))
  const dragFab = useDrag(setFabPos, p => writePoint(FAB_KEY, p))
  useEffect(() => {
    const keepVisible = () => {
      setFabPos(point => point ? clampPoint(point, fabRef.current?.offsetWidth ?? 140, fabRef.current?.offsetHeight ?? 48) : null)
      setPos(point => point ? clampPoint(point, dockRef.current?.offsetWidth ?? 390, dockRef.current?.offsetHeight ?? 420) : null)
    }
    window.addEventListener('resize', keepVisible)
    window.visualViewport?.addEventListener('resize', keepVisible)
    return () => {
      window.removeEventListener('resize', keepVisible)
      window.visualViewport?.removeEventListener('resize', keepVisible)
    }
  }, [])
  const pendingVoice = useRef(false)
  const [voiceAsk, setVoiceAsk] = useState(0)
  const live = useRef({ open, turns })
  live.current = { open, turns }


  useEffect(() => {
    const show = (event: Event) => {
      setOpen(true)
      const detail = (event as CustomEvent<string | OpenAssistantDetail | undefined>).detail
      const req: OpenAssistantDetail = typeof detail === 'string' ? { question: detail } : detail ?? {}
      if (req.question) setInput(req.question)
      setFocusRequest(n => n + 1)
      if (typeof req.x === 'number' && typeof req.y === 'number') {
        // Open right where the member asked for it, kept on screen.
        const at = placeMenu(req.x, req.y, Math.min(expanded?680:440, window.innerWidth - 32), Math.min(window.innerHeight * 0.72, 600), window.innerWidth, window.innerHeight)
        setPos(at)
      }
      if (req.voice) { pendingVoice.current = true; setVoiceAsk(n => n + 1) }
    }
    window.addEventListener('aetheris:open-assistant', show)
    return () => window.removeEventListener('aetheris:open-assistant', show)
  }, [])

  const send = async (text: string) => {
    unlockAudio()
    const question = text.trim()
    if (!question || sending.current || fileBusy || !memory.ready) return
    const requestOwner = memory.owner
    const suppliedFiles = attachments
    const hasFiles = suppliedFiles.length > 0
    sending.current = true
    setInput('')
    const fileContext = suppliedFiles.map(file => `\n[Attachment: ${file.name}]\n${file.text ? file.text.slice(0, 3500) + (file.text.length > 3500 ? '\n[History excerpt; reattach to analyze the full extract again.]' : '') : '[Image supplied for this request; reattach to inspect it again.]'}`).join('')
    const history = [...turns, { role: 'user' as const, content: question + fileContext }]
    setTurns(history)
    const say = (text: string) => { if ((voice.speakReplies || voice.conversation) && voiceOutputSupported()) readAloud([text], 'Ask Intros') }
    const reviewCommand = hasFiles ? null : spokenReviewCommand(question)
    if (reviewCommand) {
      if (reviewCommand === 'cancel') {
        resetApproval()
        const notice = 'Voice approval cancelled. The reviewed draft is still here.'
        setTurns(current => [...current, { role: 'assistant', content: notice }]); say(notice)
      } else if (reviewCommand === 'request') {
        const currentDraft = draftRef.current
        if (!requestOwner || !currentDraft || currentDraft.kind === 'draft-email') {
          const notice = 'Nothing is ready to approve. Ask me to prepare a network post, CRM task or writing preference first.'
          setTurns(current => [...current, { role: 'assistant', content: notice }]); say(notice)
        } else {
          const pending: VoiceApproval = {
            owner: requestOwner, id: currentDraft.id, kind: currentDraft.kind,
            text: currentDraft.text, expiresAt: Date.now() + 60000,
          }
          approvalRef.current = pending; setPendingApproval(pending)
          const phrase = spokenConfirmationFor(currentDraft.kind)
          const notice = 'Review the draft shown below. Say "' + phrase + '" within 60 seconds to approve that exact draft, or say "cancel approval".'
          setTurns(current => [...current, { role: 'assistant', content: notice }]); say(notice)
        }
      } else {
        const pending = approvalRef.current
        const reviewed = draftRef.current
        if (voiceApprovalMatches(pending, reviewed, requestOwner, question, Date.now()) && reviewed) {
          resetApproval()
          await commitDraft(reviewed, true)
        } else {
          resetApproval()
          const notice = 'I did not approve anything. The confirmation did not match an active, unchanged draft. Review the draft and ask to approve it again.'
          setTurns(current => [...current, { role: 'assistant', content: notice }]); say(notice)
        }
      }
      sending.current = false
      return
    }
    // Any unrelated utterance cancels a pending confirmation. Ordinary commands
    // can never inherit authorization from an earlier draft.
    if (approvalRef.current) resetApproval()

    const createImagePrompt = imageCreationBrief(question)
    const referenceQuery = imageReferenceQuery(question)
    if (createImagePrompt || referenceQuery) {
      if (hasFiles && createImagePrompt) {
        const notice = 'I can inspect your attached reference, but image edits based on an upload are not connected yet. Remove the attachment and send a text-only image brief to generate a new image.'
        setTurns(current => [...current, { role: 'assistant', content: notice }]); say(notice)
        sending.current = false
        return
      }
      if (!requestOwner) {
        const notice = 'Sign in to generate images or search reference images in Butler.'
        setTurns(current => [...current, { role: 'assistant', content: notice }]); say(notice)
        sending.current = false
        return
      }
      setBusy(true)
      try {
        const turnId = crypto.randomUUID()
        if (createImagePrompt) {
          const response = await createButlerImage({ data: { owner: requestOwner, prompt: createImagePrompt.slice(0, 1400) } })
          if (ownerRef.current !== requestOwner) return
          setVisuals(current => [...current, { kind: 'generated', owner: requestOwner, turnId, prompt: response.prompt, image: response.image }])
          const notice = 'I created an image preview for you. It is not published or saved to your account. You can download it or attach it as a reference.'
          setTurns(current => [...current, { id: turnId, role: 'assistant', content: notice }]); say(notice)
        } else if (referenceQuery) {
          const { results } = await findButlerReferenceImages({ data: { query: referenceQuery } })
          if (ownerRef.current !== requestOwner) return
          if (results.length) setVisuals(current => [...current, { kind: 'reference', owner: requestOwner, turnId, query: referenceQuery, results }])
          const notice = results.length
            ? 'Here are source-linked image references from Wikimedia Commons. Check the rights and original context before reuse.'
            : 'No usable public reference image previews were returned. Try a more specific subject.'
          setTurns(current => [...current, { id: turnId, role: 'assistant', content: notice }]); say(notice)
        }
        setAttachments([])
      } catch (error) {
        if (ownerRef.current === requestOwner) {
          const notice = error instanceof Error ? error.message : 'The image tool is unavailable right now.'
          setTurns(current => [...current, { role: 'assistant', content: notice }]); say(notice)
        }
      } finally {
        setBusy(false); sending.current = false
      }
      return
    }
    // Commands that run instantly: go somewhere, find someone, message, intro, note, post an ask.
    const command = hasFiles ? null : parseVoiceCommand(question, peopleNames)
    if (command) {
      let result: string | null
      if (command.kind === 'take-note') {
        try { result = noteSavedResult(await saveQuickNote(command.value ?? '')) }
        catch (e) { result = noteFailedResult(e) }
      } else result = run(command)
      const reply = confirmation(command, result)
      const answer: Turn = { role: 'assistant', content: reply, ...(result ? { did: [result] } : {}) }
      // If the command moved to another part of the app this dock unmounts before it re-renders;
      // keep the reply for the dock that takes over.
      live.current = { open: true, turns: [...history, answer] }
      setTurns(current => [...current, answer])
      say(reply)
      sending.current = false
      return
    }
    // Conversational questions (who/what/why/where) must never launch a
    // workspace just because one of the topic keywords appears in them.
    const openToolRequested = !hasFiles && explicitlyRequestsToolAction(question)
    const destination = openToolRequested ? recognizeDestination(question) : null
    if (destination) {
      window.dispatchEvent(new CustomEvent('aetheris:navigate', { detail: destination }))
      const msg = destination === 'pocket' ? 'Opening your Pocket. Pick a starting shape and I will review it for you.' : 'Opening your company diagnostic. Press Explain this report and I will walk you through the top priorities.'
      setTurns(current => [...current, { role: 'assistant', content: msg, did: [destination === 'pocket' ? 'Pocket' : 'Diagnostic'] }])
      if ((voice.speakReplies || voice.conversation) && voiceOutputSupported()) readAloud([msg], 'Ask Intros')
      sending.current = false
      return
    }
    const intent = openToolRequested ? recognizeCapabilityIntent(question) : null
    if (intent) {
      openCapability({ capabilityId: intent.capabilityId, ...(intent.focus ? { focus: intent.focus } : {}) })
      const subject = getActiveSubject()
      const label = describeCapability(intent.capabilityId)?.label ?? 'Diagnose'
      setTurns(current => [...current, { role: 'assistant', content: subject ? `Opening ${label} for ${subject.label}. I will show the evidence I use before anything runs.` : `Opening ${label}. Choose the company — I only read records you have entered, and public research runs only if you allow it.`, did: [label] }])
      sending.current = false
      return
    }
    const ceoCommand = openToolRequested ? recognizeCommand(question) : null
    if (ceoCommand?.view) {
      openCeo(ceoCommand)
      setTurns(current => [...current, { role: 'assistant', content: `Opening ${ceoViewLabel[ceoCommand.view!]}${ceoCommand.arg && ceoCommand.view === 'who' ? ` for “${ceoCommand.arg}”` : ''}. Everything in it comes from your recorded data — no AI needed.`, did: [ceoViewLabel[ceoCommand.view!]] }])
      sending.current = false
      return
    }
    const speak = (text: string) => {
      if ((voice.speakReplies || voice.conversation) && voiceOutputSupported()) readAloud([text], 'Ask Intros')
    }
    const local = hasFiles ? null : answerGraphQuestion(question, graphInputs)
    if (local) {
      setTurns(current => [...current, { role: 'assistant', content: local }])
      speak(local)
      sending.current = false
      return
    }
    const { supabase } = await import('@/integrations/supabase/client')
    const { data: sessionData } = await supabase.auth.getSession()
    if (ownerRef.current !== requestOwner) { sending.current = false; return }
    if (!sessionData.session) {
      speak('Sign in to have a full conversation with Ask Intros. Until then I can open pages, read this page aloud and answer from recorded data.')
      setTurns(current => [...current, { role: 'assistant', content: 'Sign in to have a full conversation with Ask Intros. Until then I can still open pages, change text size, read this page aloud and answer from recorded data — try “What changed?” or “Show my capital map”.' }])
      sending.current = false
      return
    }
    setBusy(true)
    try {
      const answer = await askIntros({
        data: {
          messages: history.filter(t => t.content).slice(-24).map(t => ({ role: t.role, content: t.content.slice(0, 16000) })),
          attachments: suppliedFiles,
          context: {
            page,
            textSize: readTextScale(),
            cursorSize: readCursorScale(),
            briefing,
            contextPanel,
            memberName,
            voice: { speaking: readerSnapshot().state !== 'idle', conversation: voice.conversation, speakReplies: voice.speakReplies },
            pages: [
              ...pageMeta.map(m => ({ id: m.id, label: m.label, blurb: m.blurb })),
              ...VOICE_PAGES.filter(v => !pageMeta.some(m => m.id === v.page)).map(v => ({ id: v.page, label: v.label, blurb: `Open ${v.label}` })),
            ],
            people: peopleNames.slice(0, 60),
          },
        },
      })
      if (ownerRef.current !== requestOwner) return
      if (!answer.error) setAttachments([])
      const did: string[] = []
      const prepared: string[] = []
      for (const action of answer.actions) {
        // A model can propose navigation, but the member must specifically
        // request it. Question words are not permission to open search.
        if (action.kind === 'open-search' && !explicitlyRequestsDirectorySearch(question)) continue
        if (['navigate', 'open-member', 'message-member', 'request-intro', 'open-deals', 'start-deal', 'open-tools', 'open-search', 'open-preferences', 'open-profile'].includes(action.kind) &&
            !explicitlyRequestsToolAction(question)) continue
        if (action.kind === 'create-file' && action.value) { setFileExport(action.value); prepared.push('File export:\n' + action.value); continue }
        if (['draft-post', 'draft-email', 'create-task', 'save-writing-style'].includes(action.kind) && action.value) {
          resetApproval(); setDraft({ id: crypto.randomUUID(), kind: (action.kind === 'draft-post' ? 'publish-post' : action.kind) as NonNullable<typeof draft>['kind'], text: action.value.slice(0, 4000) });
          setDraftError(''); did.push('Draft ready for review.'); prepared.push('Prepared draft:\n' + action.value); continue
        }
        if (action.kind === 'take-note') {
          try { did.push(noteSavedResult(await saveQuickNote(action.value ?? ''))) }
          catch (error) { did.push(noteFailedResult(error)) }
          continue
        }
        const note = run(action)
        if (note) did.push(note)
      }
      setTurns(current => [...current, { role: 'assistant', content: answer.reply + (prepared.length ? '\n\n' + prepared.join('\n\n') : ''), did, sources: answer.sources ?? [] }])
      const next = answer.suggestions.filter(item => item.toLowerCase() !== question.toLowerCase())
      if (next.length) setOpeners(next.slice(0, 4))
      const reads = answer.actions.some(action => action.kind === 'read-page')
      if (!reads && (voice.speakReplies || voice.conversation) && voiceOutputSupported()) {
        readAloud([answer.reply], 'Ask Intros')
      }
    } catch (error) {
      const { isAuthRequiredError } = await import('@/lib/auth-contract')
      if (isAuthRequiredError(error)) {
        setTurns(current => [...current, { role: 'assistant', content: 'Your session has ended. Sign in again to continue the conversation — I can still open pages and answer from recorded data meanwhile.' }])
        return
      }
      speak('The language service is unavailable right now, so I am answering from your recorded data only.')
      setTurns(current => [...current, { role: 'assistant', content: 'The language service is unavailable right now, so I am answering from your recorded data only. Try: “Who is most relevant to my active mission?”, “Who needs something I can provide?”, “Which relationship is going quiet?” or “Who can introduce me to <name>?”' }])
    } finally {
      setBusy(false)
      sending.current = false
    }
  }

  const heard = (phrase: string) => {
    if (isStopPhrase(phrase)) {
      stopReading()
      if (voice.conversation) setVoice({ conversation: false })
      dictation.stop()
      return
    }
    void send(phrase)
  }

  const dictation = useDictation({ onFinal: heard, keepOpen: voice.conversation, transcribe: async(blob,mimeType)=>(await transcribeButlerAudio({data:{audio:await blobToBase64(blob),mimeType:mimeType as 'audio/webm'|'audio/mp4'|'audio/ogg'}})).text })

  /* Conversation mode: listen, answer aloud, then listen again — never while speaking. */
  useEffect(() => {
    if (!open || !voice.conversation || !dictation.supported || dictation.error) { return }
    const idle = !busy && reader.state === 'idle'
    if (idle && !dictation.listening) dictation.start()
    if (!idle && dictation.listening) dictation.stop()
  }, [open, voice.conversation, busy, reader.state, dictation.listening, dictation.supported, dictation.error])

  useEffect(() => { if (!open) dictation.stop() }, [open])

  useEffect(()=>{dictation.stop()},[memory.owner]) // Account changes end microphone capture.

  // Voice mode from the right-click menu: start a spoken conversation straight away.
  useEffect(() => {
    if (!open || !pendingVoice.current) return
    pendingVoice.current = false
    unlockAudio()
    if (dictation.supported) {
      setVoice({ conversation: true, speakReplies: true })
      setTurns(current => [...current, { role: 'assistant', content: 'Listening. Say what you want: “go to events”, “find Acme”, “message Ana”, “take a note…”, or ask me anything. Say “stop” to end.' }])
    } else {
      setTurns(current => [...current, { role: 'assistant', content: 'Voice needs Chrome, Edge or Safari. You can type here instead.' }])
    }
  }, [open, voiceAsk]) // eslint-disable-line react-hooks/exhaustive-deps

  const [expanded,setExpanded]=useState(false)
  const status = busy ? 'Thinking' : reader.state === 'paused' ? 'Ready to play' : reader.state === 'speaking' ? 'Speaking' : dictation.listening ? 'Listening' : ''
  const latestButlerReply = turns.slice().reverse().find(turn => turn.role === 'assistant' && turn.content.trim())?.content ?? 'I’m your personal butler. You can ask me anything.'
  const replayButler = () => {
    // Starting in this tap is crucial on mobile Safari, and the selected
    // ElevenLabs voice must not silently be replaced with another voice.
    stopReading()
    unlockAudio()
    setVoice({ speakReplies: true, readAloud: true })
    readAloud([latestButlerReply.slice(0, 900)], 'Butler reply')
  }
  const usePhoneVoice = () => {
    stopReading()
    setVoice({ voiceName: 'device-default', speakReplies: true, readAloud: true })
    readAloud([latestButlerReply.slice(0, 900)], 'Butler reply')
  }

  return <>
    <button ref={fabRef} className={`ask-dock-fab ${open ? 'active' : ''}`} aria-label="Ask Intros" aria-expanded={open} title="Ask Intros · drag to move"
      style={fabPos ? { ...clampPoint(fabPos, fabRef.current?.offsetWidth ?? 140, fabRef.current?.offsetHeight ?? 48), right: 'auto', bottom: 'auto' } : undefined}
      onPointerDown={e => { if (!window.matchMedia('(max-width: 767px)').matches) dragFab(e, fabRef.current) }}
      onClick={() => { if (fabRef.current?.dataset['dragged']) return; setOpen(value => !value) }}>
      {open ? <X size={18} /> : <><span className="ask-dock-blob" aria-hidden="true"><ButlerOrb /></span><AetherisGlyph size={18} /></>}
      {!open && <span className="assistant-launcher-label">Ask Intros</span>}
    </button>

    {open && <aside ref={dockRef} className={'ask-dock butler-conversation'+(expanded?' butler-expanded':'')} role="dialog" aria-label="Ask Intros" data-voice-skip="true"
      style={pos ? { ...clampPoint(pos, Math.min(expanded?680:440, window.innerWidth - 32), dockRef.current?.offsetHeight ?? 420), right: 'auto', bottom: 'auto' } : undefined}>
      <header className="ask-dock-drag" title="Drag to move" onPointerDown={e => { if ((e.target as HTMLElement).closest('button')) return; dragDock(e, dockRef.current) }}>
        <span className="ask-dock-mark"><AetherisGlyph size={14} /></span>
        <div><b>Ask Intros</b><small>Your butler for the whole system</small></div>
        {voiceOutputSupported() && <button className={`icon-btn ${voice.speakReplies ? 'active' : ''}`}
          aria-label={voice.speakReplies ? 'Stop speaking replies' : 'Speak replies out loud'}
          title={voice.speakReplies ? 'Speaking replies out loud' : 'Replies are silent'}
          onClick={() => { if (voice.speakReplies) stopReading(); else unlockAudio(); setVoice({ speakReplies: !voice.speakReplies }) }}>
          {voice.speakReplies ? <Volume2 size={15} /> : <VolumeX size={15} />}</button>}
        {pos && <button className="icon-btn" aria-label="Move Ask Intros back to the corner" title="Back to the corner" onClick={() => { setPos(null); writePoint(POS_KEY, null) }}>↘</button>}
        <button className="icon-btn" aria-label={expanded?'Compact conversation':'Expand conversation'} onClick={()=>setExpanded(v=>!v)}>{expanded?'↙':'↗'}</button>
        <button className="icon-btn" aria-label="Close Ask Intros" onClick={() => setOpen(false)}><X size={16} /></button>
      </header>
      <details className="butler-options"><summary>Conversation options <span>History · settings</span></summary><div className="butler-options-body">
      <div className="butler-history-controls">
        <button type="button" disabled={busy || !memory.ready} onClick={() => { setShowHistory(value => !value); void memory.listHistory() }}><History size={13}/> History</button>
        <button type="button" disabled={busy || !memory.ready} onClick={() => { resetApproval(); setDraft(null); setFileExport(null); setAttachments([]); setVisuals([]); void memory.switchConversation() }}><Plus size={13}/> New conversation</button>
      </div>

      <div className="butler-image-quick" aria-label="Image tools">
        <button type="button" onClick={() => { setInput('Create an image of '); inputRef.current?.focus() }}>Create image</button>
        <button type="button" onClick={() => { setInput('Show images of '); inputRef.current?.focus() }}>Find reference images</button>
      </div>
      {showHistory && <div className="butler-history-list">{memory.history.map(item => <button type="button" key={item.id} disabled={busy} onClick={() => { setDraft(null); setFileExport(null); setAttachments([]); setVisuals([]); resetApproval(); void memory.switchConversation(item.id); setShowHistory(false) }}>{item.title}</button>)}{memory.historyBefore && <button type="button" onClick={() => void memory.listHistory(true)}>More conversations</button>}{!memory.history.length && <span>No saved conversations found.</span>}</div>}
      <ButlerWorkspaceControls welcome={newMemberWelcome} onStart={() => { setOpen(false); window.dispatchEvent(new Event('ask-intros:onboarding')) }} />

      </div></details>
      {/failed|unavailable|before switching/i.test(memory.notice)&&<p className="butler-save-notice" role="alert">{memory.notice} <button type="button" onClick={memory.retrySave}>Retry</button></p>}

      {dictation.supported && <div className="ask-dock-voice">
        <button type="button" className={voice.conversation ? 'active' : ''} aria-pressed={voice.conversation}
          onClick={() => { unlockAudio(); const next = !voice.conversation; setVoice({ conversation: next, ...(next ? { speakReplies: true, readAloud: true } : {}) }); if (next) dictation.start(); else { dictation.stop(); stopReading() } }}>
          <Radio size={13} /> {voice.conversation ? 'End conversation' : 'Talk with Butler'}
        </button>
        {status && <span className={`ask-dock-status ${status.toLowerCase()}`}><i />{status}…</span>}
        {dictation.interim && <em>{dictation.interim}</em>}
      </div>}

      {voiceOutputSupported() && <div className="butler-audio-actions" role="group" aria-label="Butler sound controls">
        {reader.state === 'paused' && <button type="button" className="butler-play-reply" onClick={playPendingButlerAudio}><Volume2 size={14} /> Play reply</button>}
        <button type="button" onClick={replayButler}><Volume2 size={14} /> Hear last reply</button>
        {reader.problem && voice.voiceName === 'intros-managed' && speechSupported() &&
          <button type="button" onClick={usePhoneVoice}>Use phone voice instead</button>}
      </div>}

      {pendingApproval && <p role="status" className="butler-approval-notice">
        Draft awaiting voice confirmation. Say <b>{spokenConfirmationFor(pendingApproval.kind)}</b>, or say <b>cancel approval</b>. This expires after 60 seconds and any edit cancels it.
      </p>}

      {dictation.error && <p className="ask-dock-voice-notice" role="alert">{dictation.error} <button type="button" onClick={dictation.start}>Retry voice</button></p>}
      {reader.problem && <p className="ask-dock-voice-notice" role="alert">{reader.problem}</p>}

      <div className="ask-dock-log" ref={listRef}>
        {memory.older && <button type="button" onClick={() => void memory.loadOlder()}>Load older messages</button>}
        {turns.map((turn, index) => <div key={index} className={`ask-dock-turn ${turn.role}`}>
          <p style={{ whiteSpace: 'pre-wrap' }}>{turn.content}</p>
          {visuals.filter(visual => visual.turnId === turn.id && visual.owner === memory.owner).map(visual =>
            visual.kind === 'generated'
              ? <figure className="butler-image-preview" key={visual.turnId}>
                  <img src={visual.image} alt={'Generated image: ' + visual.prompt.slice(0, 150)} loading="lazy" />
                  <figcaption>AI generated image. Preview only, not posted or stored.</figcaption>
                  <div className="butler-image-actions">
                    <a href={visual.image} download="ask-intros-butler-image.png">Save image</a>
                    <button type="button" disabled={fileBusy || busy || attachments.length >= 3} onClick={() => void useGeneratedReference(visual.image)}>Use as reference</button>
                  </div>
                </figure>
              : <section className="butler-reference-grid" key={visual.turnId} aria-label={'Image references for ' + visual.query}>
                  {visual.results.map(item => <figure key={item.source}>
                    <img src={item.thumbnail} alt={item.title} loading="lazy" referrerPolicy="no-referrer" />
                    <figcaption>{item.title} · {item.license}</figcaption>
                    <a href={item.source} target="_blank" rel="noopener noreferrer">View original source and rights</a>
                  </figure>)}
                </section>
          )}
          {turn.sources?.length ? <div className="butler-sources">{turn.sources.map(source => <a href={source.url} key={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>)}</div> : null}
          {turn.role === 'assistant' && voiceOutputSupported() && <button type="button" className="ask-dock-say"
            aria-label="Read this reply aloud" onClick={() => readAloud([turn.content], 'Ask Intros')}><Volume2 size={12} /></button>}
          {turn.did && turn.did.length > 0 && <ul className="ask-dock-did">{turn.did.map(note => <li key={note}>{note}</li>)}</ul>}
        </div>)}
        {busy && <div className="ask-dock-turn assistant"><span className="ask-dock-thinking-pill"><ThinkingOrb state="solving" size={20} theme="dark" /><span>Thinking…</span></span></div>}

      <details className="butler-suggestions"><summary>Suggested questions</summary><div className="ask-dock-openers">{openers.length > 0 && <span className="ask-dock-openers-label">Next</span>}{openers.map(item =>
        <button key={item} disabled={busy || fileBusy || !memory.ready} onClick={() => void send(item)}>{item}</button>)}</div></details>

      {fileExport && <div className="butler-draft"><span>File ready</span><button type="button" onClick={() => { void downloadButlerFile(fileExport).catch(error => setDraftError(error instanceof Error ? error.message : 'Download failed.')) }}>Download file</button><button type="button" onClick={() => setFileExport(null)}>Dismiss</button>{draftError && <p role="alert">{draftError}</p>}</div>}
      {draft && <section className="butler-draft" aria-label="Review Butler draft">
        <b>{draft.kind === 'publish-post' ? 'Review network post' : draft.kind === 'draft-email' ? 'Email draft' : draft.kind === 'create-task' ? 'Review CRM task' : 'Review writing preference'}</b>
        <textarea aria-label="Edit draft" value={draft.text} disabled={draftBusy} onChange={event => setDraft({ ...draft, text: event.target.value })} maxLength={4000}/>
        {draftError && <p role="alert">{draftError}</p>}
        {draft.kind === 'draft-email' ? <button type="button" onClick={() => { void navigator.clipboard.writeText(draft.text).then(() => setDraftError('Draft copied.')).catch(() => setDraftError('Select the draft text to copy it.')) }}>Copy email draft</button> : <button type="button" disabled={draftBusy || draft.text.trim().length < 4 || !memory.owner} onClick={() => void commitDraft()}>{draftBusy ? 'Saving…' : draft.kind === 'publish-post' ? 'Publish to my network' : 'Save'}</button>}
        <button type="button" disabled={draftBusy} onClick={() => { resetApproval(); setDraft(null) }}>Dismiss</button>
      </section>}
      </div>
      {(attachments.length>0||fileError||fileBusy)&&<div className="butler-files">

        {attachments.map((file, index) => <span key={index} className="butler-file-chip">{file.image && <img src={file.image} alt="" loading="lazy" />}<span>{file.name}</span><button type="button" disabled={busy} aria-label={`Remove ${file.name}`} onClick={() => setAttachments(files => files.filter((_, i) => i !== index))}>×</button></span>)}
        {fileError && <p role="alert">{fileError}</p>}
      </div>}
      <form className="ask-dock-input" onSubmit={event => { event.preventDefault(); void send(input) }}>
        <label className="butler-attach" title="Attach images or files"><Paperclip size={16}/><input aria-label="Attach images or files" type="file" multiple accept={BUTLER_ACCEPT} disabled={busy||fileBusy} onChange={event=>{void addFiles(event.target.files);event.target.value=''}}/></label>
        <input ref={inputRef} aria-label="Message Butler" value={input} onChange={event => setInput(event.target.value)} placeholder="Ask, say it, or tell me what to do…" />
        {dictation.supported && <button type="button" className={dictation.listening ? 'listening' : ''}
          aria-label={dictation.listening ? 'Stop listening' : 'Speak to Ask Intros'} title={dictation.listening ? 'Stop listening' : 'Voice dictation'} onClick={dictation.toggle}>
          {dictation.listening ? <MicOff size={15} /> : <Mic size={15} />}</button>}
        <button type="submit" aria-label="Send" title="Send message" disabled={busy || fileBusy || !memory.ready || !input.trim()}><ArrowUp size={15} /></button>
      </form>
    </aside>}
  </>
}
