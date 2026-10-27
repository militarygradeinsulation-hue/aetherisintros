// Shared Ask Intros brand styles for email templates.
// Email Body background must stay #ffffff (client compatibility); the ivory
// card inside carries the brand surface.

export const brand = {
  main: {
    backgroundColor: '#ffffff',
    fontFamily: "'Space Grotesk', 'Inter', Arial, sans-serif",
  },
  container: {
    backgroundColor: '#F7F5F0',
    border: '1px solid rgba(16,18,22,0.12)',
    borderRadius: '12px',
    padding: '36px 32px',
    margin: '24px auto',
    maxWidth: '520px',
  },
  masthead: {
    fontFamily: "'Space Grotesk', 'Inter', Arial, sans-serif",
    fontSize: '13px',
    fontWeight: 700 as const,
    letterSpacing: '0.28em',
    textTransform: 'uppercase' as const,
    color: '#101216',
    margin: '0 0 4px',
    textAlign: 'center' as const,
  },
  mastheadRule: {
    width: '48px',
    height: '3px',
    backgroundColor: '#0F5CCB',
    margin: '0 auto 28px',
    borderRadius: '2px',
  },
  h1: {
    fontFamily: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    fontSize: '30px',
    fontWeight: 600 as const,
    color: '#101216',
    margin: '0 0 18px',
    lineHeight: '1.2',
  },
  text: {
    fontSize: '14px',
    color: '#3A3F45',
    lineHeight: '1.6',
    margin: '0 0 22px',
  },
  link: { color: '#0F5CCB', textDecoration: 'underline' },
  button: {
    backgroundColor: '#0F5CCB',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 600 as const,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    border: '1px solid #0F5CCB',
    borderRadius: '8px',
    padding: '13px 24px',
    textDecoration: 'none',
  },
  code: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '26px',
    fontWeight: 700 as const,
    letterSpacing: '0.18em',
    color: '#101216',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(16,18,22,0.12)',
    borderRadius: '8px',
    padding: '14px 20px',
    textAlign: 'center' as const,
    margin: '0 0 26px',
  },
  footer: {
    fontSize: '12px',
    color: '#9EA4AC',
    lineHeight: '1.5',
    margin: '28px 0 0',
  },
}

// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
export const brandDarkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #0F5CCB !important; color: #ffffff !important; }
  }
  [data-ogsc] .dm-btn { background-color: #0F5CCB !important; color: #ffffff !important; }
  [data-ogsb] .dm-btn { background-color: #0F5CCB !important; color: #ffffff !important; }
`
