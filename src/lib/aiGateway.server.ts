/**
 * Server-only AI calls through the Lovable AI gateway (and RouteLLM),
 * implemented with plain fetch so they run on the edge runtime.
 * The `ai` / `@ai-sdk/openai` packages break the published worker, so
 * nothing here may import them.
 */

export interface ChatMessage { role: 'user' | 'assistant'; content: string }

export interface ToolDef {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute: (args: Record<string, unknown>) => Promise<unknown>
}

interface GatewayOptions {
  system: string
  messages: ChatMessage[]
  tools?: ToolDef[]
  maxSteps?: number
}

/** Reads an SSE stream and returns the final `response.completed` payload. */
async function readResponsesStream(res: Response): Promise<Record<string, unknown> | null> {
  const reader = res.body?.getReader()
  if (!reader) return null
  const decoder = new TextDecoder()
  let buffer = ''
  let completed: Record<string, unknown> | null = null
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''
    for (const event of events) {
      const dataLine = event.split('\n').find(l => l.startsWith('data:'))
      if (!dataLine) continue
      const payload = dataLine.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const parsed = JSON.parse(payload) as Record<string, unknown>
        if (parsed['type'] === 'response.completed') {
          completed = (parsed['response'] as Record<string, unknown>) ?? null
        } else if (parsed['type'] === 'response.failed') {
          return null
        }
      } catch { /* skip malformed chunk */ }
    }
  }
  return completed
}

interface ResponsesOutputItem {
  type?: string
  name?: string
  call_id?: string
  arguments?: string
  content?: { type?: string; text?: string }[]
}

function extractText(output: ResponsesOutputItem[]): string {
  const parts: string[] = []
  for (const item of output) {
    if (item.type === 'message' && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c.type === 'output_text' && typeof c.text === 'string') parts.push(c.text)
      }
    }
  }
  return parts.join('').trim()
}

/** Streams one Lovable AI gateway Responses call, running tool steps until a final answer. */
export async function gatewayChat({ system, messages, tools = [], maxSteps = 8 }: GatewayOptions): Promise<string> {
  const apiKey = process.env['LOVABLE_API_KEY']
  if (!apiKey) throw new Error('missing-key')

  const input: unknown[] = messages.map(m => ({ role: m.role, content: m.content }))
  const wireTools = tools.map(t => ({
    type: 'function',
    name: t.name,
    description: t.description,
    parameters: t.parameters,
    strict: false,
  }))

  for (let step = 0; step < maxSteps; step++) {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        'Lovable-API-Key': apiKey,
        'X-Lovable-AIG-SDK': 'fetch',
      },
      body: JSON.stringify({
        model: 'openai/gpt-6-astra',
        instructions: system,
        input,
        store: false,
        stream: true,
        reasoning: { effort: 'low', summary: 'auto' },
        include: ['reasoning.encrypted_content'],
        ...(wireTools.length ? { tools: wireTools } : {}),
      }),
    })
    if (!res.ok) throw new Error(`gateway ${res.status}`)
    const response = await readResponsesStream(res)
    if (!response) throw new Error('gateway stream failed')
    const output = (response['output'] as ResponsesOutputItem[] | undefined) ?? []
    const calls = output.filter(i => i.type === 'function_call' && i.name)
    if (!calls.length) return extractText(output)

    for (const call of calls) {
      input.push(call)
      const tool = tools.find(t => t.name === call.name)
      let result: unknown
      try {
        const args = call.arguments ? (JSON.parse(call.arguments) as Record<string, unknown>) : {}
        result = tool ? await tool.execute(args) : { note: 'Unknown tool.' }
      } catch {
        result = { note: 'That tool could not be completed.' }
      }
      input.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(result) })
    }
  }
  return ''
}

/** Calls a RouteLLM (OpenAI-compatible chat completions) account, with tool steps. */
export async function routeLlmChat({ system, messages, tools = [], maxSteps = 8 }: GatewayOptions): Promise<string> {
  const apiKey = process.env['ROUTELLM_API_KEY']
  if (!apiKey) throw new Error('missing-key')

  const wireMessages: unknown[] = [{ role: 'system', content: system }, ...messages]
  const wireTools = tools.map(t => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }))

  for (let step = 0; step < maxSteps; step++) {
    const res = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'route-llm',
        messages: wireMessages,
        ...(wireTools.length ? { tools: wireTools } : {}),
      }),
    })
    if (!res.ok) throw new Error(`routellm ${res.status}`)
    const data = (await res.json()) as {
      choices?: { message?: { content?: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[]
    }
    const message = data.choices?.[0]?.message
    if (!message) return ''
    const calls = message.tool_calls ?? []
    if (!calls.length) return (message.content ?? '').trim()

    wireMessages.push({ role: 'assistant', content: message.content ?? null, tool_calls: calls })
    for (const call of calls) {
      const tool = tools.find(t => t.name === call.function.name)
      let result: unknown
      try {
        const args = call.function.arguments ? (JSON.parse(call.function.arguments) as Record<string, unknown>) : {}
        result = tool ? await tool.execute(args) : { note: 'Unknown tool.' }
      } catch {
        result = { note: 'That tool could not be completed.' }
      }
      wireMessages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) })
    }
  }
  return ''
}
