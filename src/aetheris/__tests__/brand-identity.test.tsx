import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AskIntrosMark } from '../AskIntrosMark'
import { AskIntrosLockup } from '../AskIntrosLockup'

describe('Ask Intros connection identity', () => {
  it('uses a bridge between three people rather than stock sparkle', () => {
    const html = renderToStaticMarkup(<AskIntrosMark title="Ask Intros" size={32} />)
    expect(html).toContain('data-ask-intros-mark')
    expect(html).toContain('M9.5 35 24 10.5 38.5 35')
    expect(html).toContain('<title>Ask Intros</title>')
    expect(html).not.toContain('Sparkles')
  })
  it('uses the official logo image in the wordmark', () => {
    const html = renderToStaticMarkup(<AskIntrosLockup variant="compact" />)
    expect(html).toContain('/ask-intros-logo-wide.jpg')
    expect(html).toContain('Why me, why them, why now')
  })
})
