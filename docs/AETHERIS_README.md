# Aetheris Intros

Aetheris Intros is a relationship-intelligence operating system for high-value professional introductions.

It is intentionally **not** a CRM, contact database, cold-outreach engine, or profile directory. The product is built around five stages:

1. **Diagnose** — understand the desired business outcome.
2. **Map** — build a living relationship graph.
3. **Score** — rank relationships using strategic fit, mutual value, timing, trust, relationship strength, influence, opportunity, and friction.
4. **Connect** — recommend the smallest intelligent next action and draft a contextual warm approach.
5. **Compound** — turn conversations and outcomes into reusable relationship intelligence.

## Included in this build

- Executive command center
- Relationship radar
- Explainable connection scoring
- Relationship intelligence drawer
- Warm-path visualization
- Intro drafting with Digital You behavior rules
- Relationship forensics
- Meeting intelligence briefs
- Digital You connector profile
- Relationship ROI dashboard
- Privacy and autonomy controls
- Responsive desktop/mobile experience
- Local persistence for user style and autonomy controls
- Demo integrations UI with production-safe labeling

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Production integration boundary

The demo is intentionally credential-free. Gmail, Google Calendar, HubSpot, LinkedIn, CRM, and external AI providers should be connected through server-side OAuth and scoped APIs. The current interface demonstrates the experience and data contracts without pretending those external systems are already authenticated.

## Brand

- Background: `#111317`
- Primary orange: `#F4A125`
- Gold: `#C78522`
- Secondary orange: `#DD9324`
- Display: Space Grotesk / Bebas Neue
- Body: Inter

See `docs/ARCHITECTURE.md` and `docs/AI_RULES.md` for implementation rules.
