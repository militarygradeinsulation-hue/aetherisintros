import { createServerFn } from '@tanstack/react-start'
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

export interface ArticleRead {
  title: string
  link: string
  source: string
  published: string | null
  image: string | null
  /** Paragraphs of the original article, when the publisher allows reading. */
  paragraphs: string[]
  /** True when the full text could not be fetched and only the feed summary is available. */
  partial: boolean
  summary: string
  keyPoints: string[]
  whyItMatters: string
  error?: string
}

export interface PerspectiveResult {
  answer: string
  error?: string
}

const MAX_TEXT = 14000

function gateway() {
  const apiKey = process.env['LOVABLE_API_KEY']
  if (!apiKey) return null
  return createOpenAI({
    baseURL: 'https://ai.gateway.lovable.dev/v1',
    apiKey,
    headers: { 'Lovable-API-Key': apiKey, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' },
  })
}

const decode = (value: string): string =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;|&#8217;/gi, '\u2019')
    .replace(/&#8220;|&ldquo;/gi, '\u201C')
    .replace(/&#8221;|&rdquo;/gi, '\u201D')
    .replace(/&#8212;|&mdash;/gi, '\u2014')
    .replace(/&[a-z#0-9]+;/gi, ' ')

function extractParagraphs(html: string): string[] {
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<figure[\s\S]*?<\/figure>/gi, ' ')
  const out: string[] = []
  const seen = new Set<string>()
  const re = /<(p|h2|h3)\b[^>]*>([\s\S]*?)<\/\1>/gi
  let match: RegExpExecArray | null
  let total = 0
  const junk = /^(share this|subscribe|advertisement|cookie|sign up|related|posts from this|follow topics|more in this stream|read more|comments|newsletter|by signing up)/i
  while ((match = re.exec(body))) {
    const text = decode((match[2] ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
    if (text.length < 45) continue
    if (junk.test(text)) continue
    if (/(email digest|homepage feed|terms of use|privacy notice)/i.test(text)) continue
    const key = text.toLowerCase().slice(0, 80)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
    total += text.length
    if (total > MAX_TEXT) break
  }
  return out

}

async function fetchArticle(link: string): Promise<string[]> {
  const res = await fetch(link, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; AskIntrosReader/1.0)',
      accept: 'text/html,application/xhtml+xml',
    },
  })
  if (!res.ok) throw new Error(`article ${res.status}`)
  return extractParagraphs(await res.text())
}

/** Opens an article inside Ask Intros: original text where available, plus a grounded summary. */
export const readNewsArticle = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    title: string
    link: string
    source: string
    published: string | null
    image: string | null
    feedSummary: string
  }) => data)
  .handler(async ({ data }): Promise<ArticleRead> => {
    let paragraphs: string[] = []
    try {
      paragraphs = await fetchArticle(data.link)
    } catch {
      paragraphs = []
    }
    const partial = paragraphs.length < 2
    const basis = (partial ? data.feedSummary : paragraphs.join('\n\n')).slice(0, MAX_TEXT)

    const base: ArticleRead = {
      title: data.title,
      link: data.link,
      source: data.source,
      published: data.published,
      image: data.image,
      paragraphs,
      partial,
      summary: '',
      keyPoints: [],
      whyItMatters: '',
    }

    const lovable = gateway()
    if (!lovable || !basis.trim()) {
      return { ...base, error: !lovable ? 'missing-key' : 'no-text' }
    }

    try {
      const result = streamText({
        model: lovable.responses('openai/gpt-6-astra'),
        system: `You summarize news for Ask Intros, a relationship network for CEOs. Use only the supplied text. Never add facts, numbers, names or outcomes that are not in it. If the text is thin, say what is unclear. Voice: direct, intelligent, observant. No markdown, no bullet characters, no words like "unlock", "supercharge", "revolutionize", "AI-powered".

Reply with ONE JSON object and nothing else:
{"summary":"two to four sentences","keyPoints":["short point","short point","short point"],"whyItMatters":"one or two sentences on what this means for an operator or CEO"}`,
        messages: [{
          role: 'user',
          content: `Headline: ${data.title}\nSource: ${data.source}\n\n${basis}`,
        }],
        providerOptions: { openai: { store: false, reasoningEffort: 'low' } },
      })
      const text = (await result.text).trim()
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start >= 0 && end > start) {
        const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>
        return {
          ...base,
          summary: typeof parsed['summary'] === 'string' ? parsed['summary'] : '',
          keyPoints: Array.isArray(parsed['keyPoints'])
            ? parsed['keyPoints'].filter((p): p is string => typeof p === 'string').slice(0, 6)
            : [],
          whyItMatters: typeof parsed['whyItMatters'] === 'string' ? parsed['whyItMatters'] : '',
        }
      }
      return { ...base, summary: text.slice(0, 900) }
    } catch (error) {
      return { ...base, error: error instanceof Error ? error.message : 'summary-failed' }
    }
  })

/** Answers one perspective question about an article, grounded in its text. */
export const askNewsPerspective = createServerFn({ method: 'POST' })
  .inputValidator((data: { title: string; source: string; text: string; question: string }) => data)
  .handler(async ({ data }): Promise<PerspectiveResult> => {
    const lovable = gateway()
    if (!lovable) return { answer: 'Ask Intros is not configured on this account yet.', error: 'missing-key' }

    try {
      const result = streamText({
        model: lovable.responses('openai/gpt-6-astra'),
        system: `You are Ask Intros reading one news article with a CEO. Ground every claim in the supplied text. Separate what the article says from your reasoning, and say plainly when the article does not answer the question. Never invent facts, figures, companies or quotes.

Voice: direct, intelligent, observant, human. Plain sentences, no markdown, no bullet characters. Under 160 words.`,
        messages: [{
          role: 'user',
          content: `Article: ${data.title} (${data.source})\n\n${data.text.slice(0, MAX_TEXT)}\n\nQuestion: ${data.question}`,
        }],
        providerOptions: { openai: { store: false, reasoningEffort: 'low' } },
      })
      return { answer: (await result.text).trim() }
    } catch (error) {
      return {
        answer: 'That view could not be generated just now. Try again in a moment.',
        error: error instanceof Error ? error.message : 'perspective-failed',
      }
    }
  })
