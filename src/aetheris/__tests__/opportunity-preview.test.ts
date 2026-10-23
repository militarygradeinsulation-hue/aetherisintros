import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  buildOpportunityPreview, cleanOpportunityField, opportunityGoal, opportunityGoals,
} from '../opportunity-preview'

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8')
const page = read('../../routes/try.tsx')
const landing = read('../Landing.tsx')
const css = read('../opportunity-preview.css')

describe('30-second public Opportunity Preview', () => {
  it('provides four real-world, independent scenarios without server calls or fabricated people', () => {
    expect(opportunityGoals.map(g => g.id)).toEqual(['customers', 'partners', 'operations', 'talent'])
    for (const goal of opportunityGoals) {
      const response = buildOpportunityPreview(goal.id, goal)
      expect(response.ask).toContain(goal.outcome)
      expect(response.ask).toContain(goal.people)
      expect(response.ask).toContain(goal.offer)
      expect(response.steps).toHaveLength(3)
      expect(response.notice).toContain('No member search was run')
      expect(response.notice).toContain('nothing was sent or saved')
      expect(response.ask).not.toMatch(/matched you with|guaranteed match|your matches:/i)
    }
  })

  it('uses deterministic, bounded user input without markup or control characters', () => {
    const answer = buildOpportunityPreview('partners', {
      outcome: '  meet\n new <script> partners.   ',
      people: ' executives who build things ',
      offer: '  my expertise!   ',
    })
    expect(answer.ask).toContain('meet new script partners')
    expect(answer.ask).toContain('executives who build things')
    expect(answer.ask).toContain('my expertise')
    expect(answer.ask).not.toContain('<script>')
    expect(cleanOpportunityField(17)).toBe('')
    expect(cleanOpportunityField('x'.repeat(1000))).toHaveLength(180)
    expect(opportunityGoal('unsupported').id).toBe('customers')
  })

  it('keeps blanks on the chosen illustrative template rather than returning a broken request', () => {
    const goal = opportunityGoals[0]
    const answer = buildOpportunityPreview('customers', { outcome: '', people: '  ', offer: '' })
    expect(answer.ask).toContain(goal.outcome)
    expect(answer.ask).toContain(goal.people)
    expect(answer.ask).toContain(goal.offer)
  })

  it('is public, local only, has typed goals, explicit caveat, and a genuine signup/demo path', () => {
    expect(page).toContain("createFileRoute('/try')")
    expect(page).toContain('staticData: { sitemap: true }')
    expect(page).toContain('aria-pressed={goalId === item.id}')
    expect(page).toContain('navigator.clipboard.writeText(preview.ask)')
    expect(page).toContain('preview.notice')
    expect(page).toContain('We don\'t upload, search, or save them.')
    expect(page).toContain('search={{ mode: \'signup\' }}')
    expect(page).toContain('to="/demo"')
    expect(page).not.toMatch(/supabase|\.rpc\(|fetch\(|localStorage|sendMessage\(/)
  })

  it('makes the preview visible from the public hero but retains the deeper demo link', () => {
    expect(landing).toContain('to="/try" className="ael-text-link">Explore Ask Intros')
    expect(landing).toContain('to="/demo" className="ael-underlink')
  })

  it('allows the deliberate prepaint light/dark HTML attributes without masking inner hydration bugs', () => {
    const root = read('../../routes/__root.tsx')
    expect(root).toContain('<html lang="en" suppressHydrationWarning>')
    expect(root).toContain('<script src="/appearance-init.js" />')
    expect(root).toContain('<Scripts />')
  })

  it('supports light and dark themes, keyboard focus, mobile layout, reduced motion', () => {
    expect(css).toContain(':root[data-theme="dark"] .ai-try')
    expect(css).toContain(':focus-visible')
    expect(css).toContain('@media (max-width: 440px)')
    expect(css).toContain('prefers-reduced-motion')
  })
})
