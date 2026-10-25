import { z } from 'zod'
import { requireAuthContract } from './auth-gate'
import { readPage } from './webSearch.server'
import { createServerFn } from '@tanstack/react-start'
import { gatewayChat } from './aiGateway.server'

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

async function fetchArticle(link: string): Promise<string[]> {
  return (await readPage(link, MAX_TEXT)).split(/\n\s*\n/).filter(text => text.trim().length >= 45).slice(0, 60)
}

/** Opens an article inside Ask Intros: original text where available, plus a grounded summary. */
export const readNewsArticle = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: unknown) => z.object({
    title: z.string().max(300), link: z.string().max(2000), source: z.string().max(100),
    published: z.string().max(100).nullable(), image: z.string().max(2000).nullable(), feedSummary: z.string().max(MAX_TEXT),
  }).parse(data))
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

    if (!process.env['LOVABLE_API_KEY'] || !basis.trim()) {
      return { ...base, error: !process.env['LOVABLE_API_KEY'] ? 'missing-key' : 'no-text' }
    }

    try {
      const text = (await gatewayChat({
        system: `You summarize news for Ask Intros, a relationship network for CEOs. Use only the supplied text. Never add facts, numbers, names or outcomes that are not in it. If the text is thin, say what is unclear. Voice: direct, intelligent, observant. No markdown, no bullet characters, no words like "unlock", "supercharge", "revolutionize", "AI-powered".

Reply with ONE JSON object and nothing else:
{"summary":"two to four sentences","keyPoints":["short point","short point","short point"],"whyItMatters":"one or two sentences on what this means for an operator or CEO"}`,
        messages: [{
          role: 'user',
          content: `Headline: ${data.title}\nSource: ${data.source}\n\n${basis}`,
        }],
      })).trim()
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
  .middleware([requireAuthContract])
  .inputValidator((data: unknown) => z.object({ title: z.string().max(300), source: z.string().max(100), text: z.string().max(MAX_TEXT), question: z.string().trim().min(1).max(2000) }).parse(data))
  .handler(async ({ data }): Promise<PerspectiveResult> => {
    if (!process.env['LOVABLE_API_KEY']) return { answer: 'Ask Intros is not configured on this account yet.', error: 'missing-key' }

    try {
      const answer = await gatewayChat({
        system: `You are Ask Intros reading one news article with a CEO. Ground every claim in the supplied text. Separate what the article says from your reasoning, and say plainly when the article does not answer the question. Never invent facts, figures, companies or quotes.

Voice: direct, intelligent, observant, human. Plain sentences, no markdown, no bullet characters. Under 160 words.`,
        messages: [{
          role: 'user',
          content: `Article: ${data.title} (${data.source})\n\n${data.text.slice(0, MAX_TEXT)}\n\nQuestion: ${data.question}`,
        }],
      })
      return { answer: answer.trim() }
    } catch (error) {
      return {
        answer: 'That view could not be generated just now. Try again in a moment.',
        error: error instanceof Error ? error.message : 'perspective-failed',
      }
    }
  })
