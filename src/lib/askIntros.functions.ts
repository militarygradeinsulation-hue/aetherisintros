import { createServerFn } from '@tanstack/react-start'
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

export interface AskIntrosMessage { role: 'user' | 'assistant'; content: string }

export interface AskIntrosAction {
  kind: string
  page: string | null
  value: string | null
}

export interface AskIntrosInput {
  messages: AskIntrosMessage[]
  context: {
    page: string
    textSize: string
    cursorSize: string
    briefing: boolean
    contextPanel: boolean
    memberName: string
    pages: { id: string; label: string; blurb: string }[]
    people: string[]
  }
}

export interface AskIntrosResult {
  reply: string
  actions: AskIntrosAction[]
  error?: string
}

const ACTIONS = `
navigate            page = a destination id from the list
text-size           value = small | default | large | larger
cursor-size         value = small | default | large | largest
open-tools          open the All Tools drawer
open-search         value = optional search text
post-need           open the composer to post a professional need
post-intent         open the live-intent composer
capture-conversation  open conversation capture
toggle-briefing     turn Briefing mode on or off
toggle-context      show or hide the context rail
open-profile        open the member's own profile
open-preferences    open settings and preferences
open-member         value = the exact full name of a member in the list
message-member      value = the exact full name of a member in the list
`

function buildPrompt(context: AskIntrosInput['context']) {
  return `You are Ask Intros, the in-product butler for Ask Intros — the relationship network for CEOs. You help one signed-in member: ${context.memberName}.

Voice: direct, intelligent, observant, human. Never use "unlock", "supercharge", "revolutionize", "synergy" or "AI-powered". Short paragraphs. No markdown headings, no bullet characters.

You can teach the member anything about the product AND operate it for them. When the request implies an action, perform it by returning actions instead of describing where to click.

Member state right now:
current page: ${context.page}
interface text size: ${context.textSize}
pointer size: ${context.cursorSize}
briefing mode: ${context.briefing ? 'on' : 'off'}
context rail: ${context.contextPanel ? 'shown' : 'hidden'}

Destinations (id — label — what it does):
${context.pages.map(p => `${p.id} — ${p.label} — ${p.blurb}`).join('\n')}

Members you can open or message: ${context.people.join(', ') || 'none yet'}

Available actions:${ACTIONS}

Rules:
- Only use action kinds and page ids listed above. Never invent one.
- Treat requests to make words, text, type, labels, menus or the font bigger/smaller as text-size actions. Move one level from the current size unless the member names a size. The levels in order are small, default, large, larger. Never use cursor-size for a font request.
- Introductions are always double opt-in; never promise to contact someone on a member's behalf without their opt-in.
- Never fabricate people, deals, messages or relationships. Say what is unknown.
- If the member asks a how-does-this-work question, answer it and, where useful, also navigate them there.
- Keep the reply under 90 words.

Reply with ONE JSON object and nothing else:
{"reply":"text for the member","actions":[{"kind":"navigate","page":"memory","value":null}]}
Use an empty actions array when no action is needed.`
}

export const askIntros = createServerFn({ method: 'POST' })
  .inputValidator((data: AskIntrosInput) => data)
  .handler(async ({ data }): Promise<AskIntrosResult> => {
    const apiKey = process.env['LOVABLE_API_KEY']
    if (!apiKey) {
      return { reply: 'Ask Intros is not configured yet on this account.', actions: [], error: 'missing-key' }
    }

    const lovable = createOpenAI({
      baseURL: 'https://ai.gateway.lovable.dev/v1',
      apiKey,
      headers: { 'Lovable-API-Key': apiKey, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' },
    })

    try {
      const result = streamText({
        model: lovable.responses('openai/gpt-6-astra'),
        system: buildPrompt(data.context),
        messages: data.messages.slice(-12),
        providerOptions: {
          openai: {
            store: false,
            forceReasoning: true,
            reasoningEffort: 'low',
            reasoningSummary: 'auto',
            include: ['reasoning.encrypted_content'],
          },
        },
      })
      const text = (await result.text).trim()
      return parseAnswer(text)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ask Intros could not answer just now.'
      return { reply: 'Ask Intros could not answer just now. Try again in a moment.', actions: [], error: message }
    }
  })

function parseAnswer(text: string): AskIntrosResult {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
        reply?: unknown
        actions?: unknown
      }
      const actions = Array.isArray(parsed.actions)
        ? parsed.actions.flatMap(entry => {
            const item = entry as Record<string, unknown>
            if (typeof item?.['kind'] !== 'string') return []
            return [{
              kind: item['kind'],
              page: typeof item['page'] === 'string' ? item['page'] : null,
              value: typeof item['value'] === 'string' ? item['value'] : null,
            }]
          })
        : []
      if (typeof parsed.reply === 'string' && parsed.reply.trim()) {
        return { reply: parsed.reply.trim(), actions }
      }
    } catch {
      /* fall through to plain text */
    }
  }
  return { reply: cleaned || 'I did not catch that. Ask me again?', actions: [] }
}
