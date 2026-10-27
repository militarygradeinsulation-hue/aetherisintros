import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const file = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('Semantic network search integration', () => {
  it('uses the current authenticated directory RPC instead of unrestricted profiles', () => {
    const server = file('../../lib/semanticSearch.functions.ts')
    expect(server).toContain('.middleware([requireAuthContract])')
    expect(server).toContain(".rpc('search_members'")
    expect(server).toContain('p_limit: 100')
    expect(server).toContain('p_verified_only: false')
    expect(server).not.toContain("from('profiles')")
    expect(server).not.toContain("createClient('service_role'")
  })
  it('never sends raw messages or relationship graphs to model input', () => {
    const server = file('../../lib/semanticSearch.functions.ts')
    expect(server).toContain('gatewayChat({')
    expect(server).toContain('JSON.stringify({ query: data.query, candidates: aliases })')
    expect(server).toContain('const realIds = new Map(aliases.map(')
    expect(server).toContain('groundSemanticMatches({ matches: resolved }, candidates)')
    expect(server).not.toContain('context.messages')
    expect(server).not.toContain('getPrivateRelationships')
  })
  it('shows evidence-based AI matches in both presentation modes', () => {
    const directory = file('../../intros-ui/views/LedgerDirectory.tsx')
    expect(directory).toContain('<SemanticNetworkSearch')
    expect(directory).toContain('<PeopleDirectoryView members={displayMembers}')
    expect(directory).toContain('AI Match Insight')
    expect(directory).toContain('onRequestIntro(person)')
    expect(directory).toContain('onMessage(person)')
  })
  it('opens a draft message, never sends on click', () => {
    const app = file('../../intros-ui/IntrosApp.tsx')
    const messages = file('../../intros-ui/views/LiveMessagesView.tsx')
    expect(app).toContain('initialRecipientId={messageRecipientId}')
    expect(messages).toContain('net.openThreadWith(initialRecipientId)')
    expect(messages).not.toContain('net.sendMessage(initialRecipientId')
  })
})
