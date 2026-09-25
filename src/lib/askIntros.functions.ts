import { createServerFn } from '@tanstack/react-start'
import { stepCountIs, streamText, tool } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { readPage, searchWeb } from './webSearch.server'
import { requireAuthContract } from './auth-gate'

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
    voice?: { speaking: boolean; conversation: boolean; speakReplies: boolean }
    pages: { id: string; label: string; blurb: string }[]
    people: string[]
  }
}

export interface AskIntrosResult {
  reply: string
  actions: AskIntrosAction[]
  /** Three short follow-ups the member can tap next, written from this conversation. */
  suggestions: string[]
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
read-page           read the page the member is on out loud
stop-reading        stop reading out loud
voice-off           turn spoken replies off
voice-on            turn spoken replies on
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
reading aloud right now: ${context.voice?.speaking ? 'yes' : 'no'}
conversation mode: ${context.voice?.conversation ? 'on' : 'off'}
spoken replies: ${context.voice?.speakReplies ? 'on' : 'off'}


Destinations (id — label — what it does):
${context.pages.map(p => `${p.id} — ${p.label} — ${p.blurb}`).join('\n')}

Members you can open or message: ${context.people.join(', ') || 'none yet'}

Available actions:${ACTIONS}

You also have live web access through two tools: web_search (search the live web) and read_page (read one page's text). Use them whenever the answer depends on anything current, external or outside this product: markets, companies, people in the news, funding, regulation, competitors, pricing, travel, events, definitions, best practice, how-to research, or any question you cannot answer from the member's own data. Search first, read a page when you need detail, then answer with what you found and name the source in plain words.

Rules:
- Never say you cannot help, cannot browse, cannot access the web, or that something is outside your scope. If it is external, search it. If it is in the product, do it. If it genuinely cannot be done, say what you can do instead and do that.
- Do not put raw links in your reply. Say who reported it, and keep the member inside Intros.
- Only use action kinds and page ids listed above. Never invent one.
- Treat requests to make words, text, type, labels, menus or the font bigger/smaller as text-size actions. Move one level from the current size unless the member names a size. The levels in order are small, default, large, larger. Never use cursor-size for a font request.
- The member may be speaking to you. Requests to read this page, read it to me, or read it out loud are read-page actions. Stop reading, quiet or be quiet are stop-reading. Asking you to stop talking or stay silent is voice-off; asking you to speak or talk again is voice-on. When you read a page aloud, keep the reply to one short line.
- When conversation mode is on, write replies to be heard: plain sentences, no lists, no punctuation the ear cannot hear.
- Introductions are always double opt-in; never promise to contact someone on a member's behalf without their opt-in.
- Never fabricate people, deals, messages or relationships. Say what is unknown.
- If the member asks a how-does-this-work question, answer it and, where useful, also navigate them there.
- Keep the reply under 120 words. For researched answers, lead with the finding.

Always end by offering three follow-ups the member is likely to want next, written in their voice, three to seven words each, specific to what was just discussed. Never repeat a follow-up you already offered in this conversation.

Reply with ONE JSON object and nothing else:
{"reply":"text for the member","actions":[{"kind":"navigate","page":"memory","value":null}],"suggestions":["Show me who matters this week","Explain double opt-in","Post that as a need"]}
Use an empty actions array when no action is needed.`
}

export const askIntros = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: AskIntrosInput) => data)
  .handler(async ({ data }): Promise<AskIntrosResult> => {
    const apiKey = process.env['LOVABLE_API_KEY']
    if (!apiKey) {
      return { reply: 'Ask Intros is not configured yet on this account.', actions: [], suggestions: [], error: 'missing-key' }
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
        stopWhen: stepCountIs(8),
        tools: {
          web_search: tool({
            description: 'Search the live web. Returns titles, URLs and snippets.',
            inputSchema: z.object({ query: z.string().describe('The search query') }),
            execute: async ({ query }) => {
              try {
                const results = await searchWeb(query)
                return results.length ? { results } : { results: [], note: 'No results came back for that query.' }
              } catch {
                return { results: [], note: 'The web search could not be completed.' }
              }
            },
          }),
          read_page: tool({
            description: 'Read the readable text of one web page, by URL, for detail a snippet does not give.',
            inputSchema: z.object({ url: z.string().describe('The full https URL to read') }),
            execute: async ({ url }) => {
              try {
                const text = await readPage(url)
                return text ? { text } : { text: '', note: 'That page returned no readable text.' }
              } catch {
                return { text: '', note: 'That page could not be read.' }
              }
            },
          }),
        },
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
      return { reply: 'Ask Intros could not answer just now. Try again in a moment.', actions: [], suggestions: [], error: message }
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
        suggestions?: unknown
      }
      const suggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions
            .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            .map(item => item.trim().slice(0, 60))
            .slice(0, 4)
        : []
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
        return { reply: parsed.reply.trim(), actions, suggestions }
      }
    } catch {
      /* fall through to plain text */
    }
  }
  return { reply: cleaned || 'I did not catch that. Ask me again?', actions: [], suggestions: [] }
}
