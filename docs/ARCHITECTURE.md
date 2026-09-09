# Aetheris Intros Architecture

## Product category

Aetheris Intros is a **Relationship Intelligence Operating System**.

The core question is not “Who can we message?” It is:

> Which relationship has enough strategic relevance, mutual value, trust, and timing to justify a conversation?

## Core loop

`DIAGNOSE → MAP → SCORE → CONNECT → COMPOUND`

## Relationship graph

Recommended production entities:

- User
- Person
- Company
- RelationshipEdge
- Objective
- Conversation
- RelationshipMemory
- Commitment
- Opportunity
- IntroductionPath
- Outcome

Every AI-derived value should retain:

- value
- confidence
- source type: explicit / derived / inferred / unknown
- evidence ids
- privacy scope

## Score weighting

- Strategic Fit: 25%
- Mutual Value: 20%
- Timing: 15%
- Trust: 10%
- Relationship Strength: 10%
- Decision Influence: 10%
- Opportunity Value: 5%
- Low Friction: 5%

Friction is inverted before weighting.

## Autonomy

- Level 0 — Observe
- Level 1 — Recommend
- Level 2 — Draft
- Level 3 — Approve before external action
- Level 4 — Execute only approved classes of actions

## Privacy scopes

- Private
- Team
- Organization
- Shareable
- Public

Private conversation content may inform internal relevance calculations but should never automatically become shareable content.

## Suggested production stack

Frontend: React + TypeScript + Vite
Backend: Postgres + row-level security
Graph: materialized relationship-edge tables first; move to dedicated graph storage only if scale requires it
Auth: provider-backed OAuth
Jobs: event queue for ingestion, enrichment, graph updates and follow-up triggers
AI: provider abstraction with structured JSON outputs and evidence validation

## Connector boundaries

External sources should be ingested through least-privilege OAuth and explicit scopes. Suggested order:

1. Gmail / Outlook
2. Google Calendar / Microsoft Calendar
3. HubSpot / CRM
4. Contacts
5. Meeting transcript source
6. LinkedIn public/profile context where platform terms allow

## Production safety requirements

- Never fabricate relationship edges.
- Never represent inferred trust as factual trust.
- Never send messages without the user’s configured autonomy permission.
- Never expose private source content across relationship boundaries.
- Log every external action with source, timestamp, actor and authorization level.
