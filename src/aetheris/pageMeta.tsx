import {
  Archive, BadgeCheck, BookOpen, Briefcase, Building2, CalendarDays, CheckCircle2, CircleDot, Coins, Compass,
  DoorOpen, FileSearch, FileText, Flag, FolderLock, Gauge, GitMerge, GraduationCap, Handshake, HelpCircle,
  History, Home as HomeIcon, Inbox, Landmark, Layers, Lock, Map as MapIcon, MessageSquareText, Network,
  Newspaper, PlaneTakeoff, Puzzle, Radar, ScrollText, Settings2, ShieldAlert, ShieldCheck, Sparkle, Target,
  TrendingUp, UserRound, Users, UsersRound,
} from 'lucide-react'
import type { Page } from './nav'

export type PageGroup =
  | 'PRIMARY'
  | 'NETWORK'
  | 'RELATIONSHIP INTELLIGENCE'
  | 'OPPORTUNITY & EXECUTION'
  | 'TRUST, PERMISSION & CONTROL'

export interface Briefing {
  does: string
  look: string
  changes: string
  next: string
  why?: string
  hints?: string[]
}

export interface PageMeta {
  id: Page
  label: string
  icon: typeof HomeIcon
  group: PageGroup
  blurb: string
  keywords: string[]
  briefing: Briefing
}

const m = (
  id: Page, label: string, icon: typeof HomeIcon, group: PageGroup, blurb: string,
  briefing: Briefing, keywords: string[] = [],
): PageMeta => ({ id, label, icon, group, blurb, keywords, briefing })

/** Single source of truth for every destination: label, group, description, briefing copy. */
export const pageMeta: PageMeta[] = [
  /* -------------------------------------------------------------- primary */
  m('home', 'Home', HomeIcon, 'PRIMARY', 'The relationships, needs and opportunities worth your attention today.', {
    does: 'Shows the relationships, needs and opportunities most worth your attention today.',
    look: 'Timing changes, warm paths and conversations that need action.',
    changes: 'Your feed, Daily Briefing, active needs and relationship signals update as the network moves.',
    next: 'Handle the highest-consequence item before browsing.',
    hints: ['Social shows the network moving. Daily Briefing composes what needs you.'],
  }, ['feed', 'today', 'briefing']),
  m('discover', 'Discover', Compass, 'PRIMARY', 'Find people worth knowing, with the context that explains why.', {
    does: 'Finds people worth knowing and explains why the relationship makes sense for both sides.',
    look: 'Fit reasoning, mutual context and people whose current focus overlaps yours.',
    changes: 'Filters, circles and stated intent reshape who surfaces here.',
    next: 'Open one person and read the reasoning before acting.',
    why: 'Discovery is scored on mutual relevance, not reach — a low score means the timing is wrong, not the person.',
  }, ['people', 'search', 'network']),
  m('intros', 'Intros', Handshake, 'PRIMARY', 'Curated matches and double opt-in introductions.', {
    does: 'Ranks introductions by compatibility and moves them through double opt-in.',
    look: 'Match reasoning, shared context and who still has to agree.',
    changes: 'Every accepted or declined intro teaches future ranking.',
    next: 'Send the one intro you would personally stand behind.',
    why: 'Nobody is introduced without both sides agreeing, so a pending intro is a request, not a connection.',
  }, ['introductions', 'matches']),
  m('messages', 'Messages', MessageSquareText, 'PRIMARY', 'Private conversations with relationship context beside them.', {
    does: 'Holds your private conversations with the relationship context beside them.',
    look: 'Threads waiting on you and context you should reuse before replying.',
    changes: 'Captured context and outcomes from conversations feed Memory.',
    next: 'Reply to the thread where you owe the answer.',
  }, ['chat', 'inbox', 'threads']),
  m('needs', 'Needs', Target, 'PRIMARY', 'What members are trying to move right now, and who can help.', {
    does: 'Runs the asks marketplace: what members need now and who can help.',
    look: 'Fresh asks, responses you can give and warm paths worth requesting.',
    changes: 'Posting, responding and closing needs updates matching and Memory.',
    next: 'Give before asking — answer one need you can genuinely help with.',
  }, ['asks', 'marketplace', 'requests']),
  m('memory', 'Memory', Network, 'PRIMARY', 'The context people usually lose between conversations.', {
    does: 'Keeps the context people usually lose between conversations.',
    look: 'New needs, cooling relationships, commitments and changes in direction.',
    changes: 'Approved notes, conversations and outcomes alter future recommendations.',
    next: 'Correct or add context while it is still fresh.',
    why: 'Memory only learns from what you approve, so nothing is inferred behind your back.',
  }, ['context', 'notes', 'learning']),
  m('opportunities', 'Opportunities', Briefcase, 'PRIMARY', 'Live opportunities and the rooms where they get worked.', {
    does: 'Tracks live opportunities and the rooms, deals and outcomes attached to them.',
    look: 'Stage, momentum and the people already inside each opportunity.',
    changes: 'Room activity, deal rooms and recorded outcomes move opportunities forward.',
    next: 'Advance the opportunity closest to a decision.',
  }, ['pipeline', 'deals', 'rooms']),

  /* -------------------------------------------------------------- network */
  m('boards', 'Advisory Boards', Users, 'NETWORK', 'Standing groups of advisors assembled around a question.', {
    does: 'Assembles standing advisory groups around a specific question.',
    look: 'Who sits on each board and what they were asked to weigh in on.',
    changes: 'Adding advisors and recording their input builds a reusable council.',
    next: 'Bring one real question to a board instead of asking everyone.',
  }, ['advisors', 'council']),
  m('ask', 'Ask Network', HelpCircle, 'NETWORK', 'Ask a scoped question to a chosen audience.', {
    does: 'Lets you ask a scoped question to a chosen audience without mass outreach.',
    look: 'Audience routing, who was reached and the replies logged so far.',
    changes: 'Answers and outcomes are attached to the question and to Memory.',
    next: 'Narrow the audience before you widen it.',
  }, ['question', 'audience']),
  m('circles', 'Circles', Users, 'NETWORK', 'Trusted groups that shape what you see and who reaches you.', {
    does: 'Organises trusted groups that shape what you see and who can reach you.',
    look: 'Membership, purpose and how active each circle is.',
    changes: 'Joining or creating circles changes feed relevance and routing.',
    next: 'Join the one circle closest to what you are moving.',
  }, ['groups', 'communities']),
  m('companies', 'Companies', Building2, 'NETWORK', 'Organisations, their people and company-level fit.', {
    does: 'Profiles organisations, their people and the Golden Fit between two companies.',
    look: 'Strengths, risks, unknowns and honest collaboration hypotheses.',
    changes: 'New evidence and relationships update the fit report.',
    next: 'Read the risks section before the strengths.',
    why: 'A Golden Fit Report states unknowns openly — a high score with thin evidence is still thin.',
  }, ['organisations', 'fit', 'golden report']),
  m('events', 'Events', CalendarDays, 'NETWORK', 'Gatherings worth attending and who will be there.', {
    does: 'Shows gatherings worth attending and which relationships are there.',
    look: 'Who is attending, why it is relevant and what to prepare.',
    changes: 'RSVPs and saves inform presence and recommendations.',
    next: 'Save one event and note who you want to meet.',
  }, ['calendar', 'conferences']),
  m('expertise', 'Expertise', GraduationCap, 'NETWORK', 'Provable expertise and trusted referrals.', {
    does: 'Maps provable expertise and the referrals that vouch for it.',
    look: 'Evidence behind a claim, not the claim itself.',
    changes: 'Delivered work and referrals strengthen expertise records.',
    next: 'Ask for the evidence before you ask for time.',
  }, ['skills', 'referrals']),
  m('intelrooms', 'Industry Rooms', Landmark, 'NETWORK', 'Sector rooms and councils for real operator conversation.', {
    does: 'Hosts sector rooms and councils for candid operator conversation.',
    look: 'Which rooms are active and what is actually being discussed.',
    changes: 'Participation shapes what intelligence reaches you.',
    next: 'Contribute once before you ask a room for anything.',
  }, ['sector', 'councils']),
  m('knowledge', 'Knowledge', BookOpen, 'NETWORK', 'Knowledge exchanged between members.', {
    does: 'Collects knowledge members exchange with each other.',
    look: 'Practical answers and who has real depth in a topic.',
    changes: 'Publishing and using knowledge builds contextual reputation.',
    next: 'Publish one thing you already know well.',
  }, ['exchange', 'library']),
  m('knowledgeassets', 'Knowledge Assets', BookOpen, 'NETWORK', 'Durable documents, playbooks and material you own.', {
    does: 'Stores durable documents, playbooks and material you own.',
    look: 'What is reusable and what is already shared.',
    changes: 'Adding assets makes your expertise easier to prove.',
    next: 'Attach one asset to a claim on your profile.',
  }, ['documents', 'playbooks', 'assets']),
  m('organization', 'Organization', ShieldCheck, 'NETWORK', 'Your organisation’s relationships in one place.', {
    does: 'Shows the relationship position of an organisation, not just a person.',
    look: 'Where the company is strong, thin or exposed.',
    changes: 'Team relationships and outcomes update the organisation passport.',
    next: 'Find the relationship only one colleague holds.',
  }, ['company', 'team', 'passport']),
  m('passport', 'Passport', FileText, 'NETWORK', 'Your professional passport: identity, proof and standing.', {
    does: 'Presents your professional passport: identity, proof of work and standing.',
    look: 'What is verified versus self-stated.',
    changes: 'Credentials, delivered work and reputation change your credibility score.',
    next: 'Add evidence to your weakest claim.',
    why: 'Self-stated and verified are shown separately on purpose — credibility here has to be earned.',
  }, ['identity', 'credibility', 'proof']),
  m('profile', 'Profile', UserRound, 'NETWORK', 'Your public professional identity in the network.', {
    does: 'Holds your public professional identity, focus, offers and asks.',
    look: 'Whether Looking For and Can Help With still match your real work.',
    changes: 'Profile edits change how and when you are matched.',
    next: 'Update what you are looking for right now.',
  }, ['account', 'me', 'identity']),
  m('talent', 'Talent', UsersRound, 'NETWORK', 'People and teams worth building with.', {
    does: 'Helps you find people and build teams around specific work.',
    look: 'Availability, proven work and complementary skills.',
    changes: 'Shortlists and outcomes refine future candidates.',
    next: 'Shortlist three people, not thirty.',
  }, ['hiring', 'teams', 'candidates']),

  /* --------------------------------------------- relationship intelligence */
  m('inbox', 'Attention', Inbox, 'RELATIONSHIP INTELLIGENCE', 'The relationship inbox: what genuinely needs you.', {
    does: 'Prioritises the relationship items that genuinely need you.',
    look: 'Consequence and timing, not unread counts.',
    changes: 'Acting, deferring or dismissing items retrains prioritisation.',
    next: 'Clear the highest-consequence item first.',
  }, ['relationship inbox', 'priority']),
  m('attribution', 'Attribution', GitMerge, 'RELATIONSHIP INTELLIGENCE', 'Where an outcome actually came from.', {
    does: 'Traces where an outcome came from across people, rooms and conversations.',
    look: 'Direct contribution versus influenced or contextual contribution.',
    changes: 'Recording outcomes adds new attribution paths.',
    next: 'Thank the influenced contributor nobody credited.',
    why: 'Direct edges are recorded facts. Influenced and contextual edges are modelled contribution — read them as plausible, not proven.',
  }, ['credit', 'origin', 'outcomes']),
  m('collisions', 'Collisions', GitMerge, 'RELATIONSHIP INTELLIGENCE', 'Two intents that unexpectedly fit each other.', {
    does: 'Detects when two intents in your network unexpectedly fit each other.',
    look: 'Why the collision matters now and who should hear first.',
    changes: 'New needs and intents create and retire collisions.',
    next: 'Act on a collision while the timing holds.',
  }, ['overlap', 'timing']),
  m('evidence', 'Evidence', FileSearch, 'RELATIONSHIP INTELLIGENCE', 'The record behind every claim and recommendation.', {
    does: 'Shows the record behind every claim and recommendation.',
    look: 'What was observed, when, and how strong the source is.',
    changes: 'Approved notes, messages and outcomes add entries.',
    next: 'Check the evidence before trusting a score.',
  }, ['ledger', 'proof', 'audit']),
  m('gaps', 'Gap Map', MapIcon, 'RELATIONSHIP INTELLIGENCE', 'Where your network is missing something.', {
    does: 'Maps where your network is thin relative to what you are trying to move.',
    look: 'Missing roles, sectors and geographies.',
    changes: 'New relationships and stated goals close or open gaps.',
    next: 'Close the gap blocking your current objective.',
  }, ['coverage', 'holes']),
  m('insights', 'Insights', TrendingUp, 'RELATIONSHIP INTELLIGENCE', 'High-value relationship changes, not vanity metrics.', {
    does: 'Surfaces high-value relationship changes rather than vanity analytics.',
    look: 'Role changes, cooling relationships and new opportunity signals.',
    changes: 'Network movement and your actions change what ranks here.',
    next: 'Follow up on the change with the shortest window.',
  }, ['analytics', 'signals', 'changes']),
  m('loops', 'Open Loops', CircleDot, 'RELATIONSHIP INTELLIGENCE', 'Unfinished commitments on both sides.', {
    does: 'Tracks unfinished commitments — yours and theirs.',
    look: 'What you promised and what is still owed to you.',
    changes: 'Closing loops improves reciprocity and trust standing.',
    next: 'Close the oldest loop you own.',
  }, ['commitments', 'follow up']),
  m('serendipity', 'Unexpectedly Relevant', Sparkle, 'RELATIONSHIP INTELLIGENCE', 'Defensible serendipity: relevant, not random.', {
    does: 'Offers defensible serendipity — people relevant for a reason you can read.',
    look: 'The stated reason for each surprise match.',
    changes: 'Your feedback tunes how adventurous this gets.',
    next: 'Rate one match so the reasoning improves.',
    why: 'Every surprise carries an explanation — if the reason is weak, say so and it stops recurring.',
  }, ['serendipity', 'surprise', 'discovery']),
  m('simulation', 'Simulation', Radar, 'RELATIONSHIP INTELLIGENCE', 'Model a network move before you make it.', {
    does: 'Models what a relationship move would likely do before you make it.',
    look: 'Assumptions behind each projection.',
    changes: 'Real outcomes correct the model.',
    next: 'Test the move you were about to make anyway.',
    why: 'Simulations are projections from current data, not predictions of what will happen.',
  }, ['model', 'what if']),
  m('strategy', 'Strategy', Flag, 'RELATIONSHIP INTELLIGENCE', 'Your personal network strategy.', {
    does: 'Turns your goals into a deliberate relationship strategy.',
    look: 'Priorities, coverage and where effort should go.',
    changes: 'Goals, outcomes and gaps reshape the plan.',
    next: 'Commit to one strategic relationship this month.',
  }, ['plan', 'goals']),
  m('timemachine', 'Time Machine', History, 'RELATIONSHIP INTELLIGENCE', 'Your network as it stood 30, 90, 180 or 365 days ago.', {
    does: 'Shows how your network looked and moved over 30, 90, 180 and 365 days.',
    look: 'What is recorded history versus what is reconstructed.',
    changes: 'New snapshots accumulate as you use the product.',
    next: 'Compare a good quarter with a quiet one.',
    why: 'Recorded snapshots are facts captured at the time. Modelled reconstruction fills gaps before snapshots existed and can be wrong.',
  }, ['history', 'snapshots', 'past']),

  /* ---------------------------------------------- opportunity & execution */
  m('capital', 'Capital & Boards', Coins, 'OPPORTUNITY & EXECUTION', 'Capital, acquisition and board conversations.', {
    does: 'Handles capital, acquisition and board-level conversations.',
    look: 'Mandate fit, stage and who is actually decision-ready.',
    changes: 'Recorded conversations and outcomes update readiness.',
    next: 'Qualify the mandate before the meeting.',
  }, ['investors', 'acquisition', 'funding']),
  m('dealrooms', 'Deal Rooms', FolderLock, 'OPPORTUNITY & EXECUTION', 'Permissioned rooms where real business gets done.', {
    does: 'Runs permissioned rooms where real transactions get worked.',
    look: 'Who has access, what is shared and what is outstanding.',
    changes: 'Documents, participants and decisions move the deal.',
    next: 'Resolve the item blocking the room.',
  }, ['transactions', 'diligence']),
  m('rooms', 'Opportunity Rooms', DoorOpen, 'OPPORTUNITY & EXECUTION', 'Small working rooms around a single opportunity.', {
    does: 'Creates small working rooms around one opportunity.',
    look: 'Stage, participants and the next concrete action.',
    changes: 'Room activity feeds opportunities and outcomes.',
    next: 'Give the room its next owner and date.',
  }, ['workspaces', 'collaboration']),
  m('outcomes', 'Outcomes', CheckCircle2, 'OPPORTUNITY & EXECUTION', 'What actually happened, recorded honestly.', {
    does: 'Records what actually resulted from relationships and introductions.',
    look: 'Outcomes with evidence versus outcomes still claimed.',
    changes: 'Recorded outcomes drive attribution and matching quality.',
    next: 'Record the outcome you have been meaning to log.',
  }, ['results', 'wins']),
  m('systems', 'Systems', Layers, 'OPPORTUNITY & EXECUTION', 'The repeatable systems you are trying to move.', {
    does: 'Describes the repeatable systems and offers you are trying to place.',
    look: 'Where each system fits and who needs it now.',
    changes: 'Placements and outcomes refine system targeting.',
    next: 'Place one system with one specific person.',
  }, ['offers', 'placement']),

  /* --------------------------------------------- trust, permission, control */
  m('autopilot', 'Autopilot', Gauge, 'TRUST, PERMISSION & CONTROL', 'Approval-gated automation. Nothing sends itself.', {
    does: 'Prepares work for you and waits for approval before anything happens.',
    look: 'What is queued and what it would do.',
    changes: 'Your approvals and rejections set how much it may prepare.',
    next: 'Review the queue rather than raising the level.',
    why: 'Autonomy is approval-gated: consequential actions always need a human yes.',
  }, ['automation', 'agent']),
  m('consent', 'Consent Ledger', Lock, 'TRUST, PERMISSION & CONTROL', 'Who may see what, and when you revoked it.', {
    does: 'Records exactly who may see what about you, and when consent changed.',
    look: 'Active grants and anything you should revoke.',
    changes: 'Granting or revoking takes effect immediately.',
    next: 'Revoke a grant you no longer need.',
    why: 'Context is permissioned, not public — revoking here genuinely removes access.',
  }, ['privacy', 'permissions', 'grants']),
  m('constitution', 'Constitution', ScrollText, 'TRUST, PERMISSION & CONTROL', 'The anti-spam rules every message is checked against.', {
    does: 'States the rules outbound messages are checked against before they send.',
    look: 'Whether a message is clear, needs permission, needs a rewrite, or is blocked.',
    changes: 'Reviewed and rewritten messages train your outbound standard.',
    next: 'Read the rules once so reviews stop surprising you.',
    why: 'This is how the network stays free of pitching: reach is earned per message, never bought.',
  }, ['anti-spam', 'rules', 'standard']),
  m('integrations', 'Intros Everywhere', Puzzle, 'TRUST, PERMISSION & CONTROL', 'Bring Intros context into the tools you already use.', {
    does: 'Brings relationship context into the places you already work.',
    look: 'Which contexts are connected and what they may read.',
    changes: 'Enabling a context adapter changes where context appears.',
    next: 'Connect only the context you actually work in.',
  }, ['adapters', 'context', 'apps']),
  m('permission', 'Permission', ShieldAlert, 'TRUST, PERMISSION & CONTROL', 'Permission to pitch, and your do-not-disturb rules.', {
    does: 'Controls who may pitch you and how protected your attention is.',
    look: 'Pending requests and your current do-not-disturb settings.',
    changes: 'Yes, not now, refer elsewhere and never each teach routing.',
    next: 'Answer pending requests honestly — “never” is a valid answer.',
    why: 'Attention is protected by default: nobody may pitch you without your explicit yes.',
  }, ['pitch', 'do not disturb', 'boundaries']),
  m('identity', 'Portable Identity', BadgeCheck, 'TRUST, PERMISSION & CONTROL', 'Identity and reputation you can take with you.', {
    does: 'Makes your verified identity and reputation portable.',
    look: 'What is exportable and what stays private.',
    changes: 'New credentials and verifications extend it.',
    next: 'Export a copy and check what others would see.',
  }, ['export', 'verification']),
  m('preferences', 'Preferences', Settings2, 'TRUST, PERMISSION & CONTROL', 'How the product behaves for you.', {
    does: 'Sets how the product behaves: privacy, memory, notifications and recommendations.',
    look: 'Anything set more openly than you intended.',
    changes: 'Changes apply immediately across the product.',
    next: 'Review memory and privacy first.',
  }, ['settings', 'customization']),
  m('presence', 'Presence', PlaneTakeoff, 'TRUST, PERMISSION & CONTROL', 'Availability, travel and event mode.', {
    does: 'Publishes availability, travel and how reachable you are.',
    look: 'Whether your stated availability is still true.',
    changes: 'Travel and event mode change who may reach you.',
    next: 'Set availability for the next two weeks.',
  }, ['availability', 'travel']),
  m('eventmode', 'Event Mode', CalendarDays, 'TRUST, PERMISSION & CONTROL', 'Focused mode for the days you are at an event.', {
    does: 'Focuses the product around an event you are attending.',
    look: 'Who is there, why they matter and your plan.',
    changes: 'Turning it on reshapes recommendations for those days.',
    next: 'Build a short plan instead of a long list.',
  }, ['conference', 'onsite']),
  m('vault', 'Search & Vault', Archive, 'TRUST, PERMISSION & CONTROL', 'Deep search, imports and your exportable vault.', {
    does: 'Searches everything you own and manages imports and exports.',
    look: 'Import proposals awaiting your per-record review.',
    changes: 'Only approved records are committed; downloads are real files.',
    next: 'Review pending import proposals before committing.',
    why: 'Imports never commit silently — you approve or reject each record with its provenance.',
  }, ['export', 'import', 'download']),
  m('briefing', 'Daily Briefing', Newspaper, 'RELATIONSHIP INTELLIGENCE', 'Today composed rather than counted.', {
    does: 'Composes what needs you today into a readable briefing.',
    look: 'Consequence, timing and the one thing to do first.',
    changes: 'It recomposes as relationships, needs and loops move.',
    next: 'Act on the lead item before reading further.',
    why: 'Daily Briefing is today’s composed edition. Briefing Mode is the explanatory layer that teaches what pages mean.',
  }, ['daily', 'today', 'digest']),
]

export const metaById: Record<string, PageMeta> = Object.fromEntries(pageMeta.map(p => [p.id, p]))

export function pageLabel(id: Page) { return metaById[id]?.label ?? id }

/** The short, always-visible rail. */
export const primaryPages: Page[] = ['home', 'discover', 'intros', 'messages', 'needs', 'memory', 'opportunities']

export const groupOrder: PageGroup[] = [
  'NETWORK', 'RELATIONSHIP INTELLIGENCE', 'OPPORTUNITY & EXECUTION', 'TRUST, PERMISSION & CONTROL',
]

const byLabel = (a: PageMeta, b: PageMeta) => a.label.localeCompare(b.label)

/** Every non-primary destination, strictly alphabetical. */
export const secondaryPages: PageMeta[] = pageMeta
  .filter(p => !primaryPages.includes(p.id))
  .sort(byLabel)

export function groupedSecondary(group: PageGroup): PageMeta[] {
  return secondaryPages.filter(p => p.group === group).sort(byLabel)
}

/** Local "related tools" rows so members are not forced to learn the whole map. */
export const relatedPages: Partial<Record<Page, { label: string; pages: Page[] }>> = {
  opportunities: { label: 'Opportunity tools', pages: ['rooms', 'dealrooms', 'outcomes', 'capital', 'systems'] },
  memory: { label: 'Memory tools', pages: ['evidence', 'loops', 'timemachine', 'attribution'] },
  discover: { label: 'Explore more', pages: ['circles', 'companies', 'expertise', 'talent', 'serendipity', 'gaps'] },
  profile: { label: 'Identity tools', pages: ['passport', 'identity', 'permission', 'consent', 'preferences', 'presence'] },
  passport: { label: 'Identity tools', pages: ['profile', 'identity', 'permission', 'consent', 'preferences', 'presence'] },
  insights: { label: 'Intelligence tools', pages: ['collisions', 'simulation', 'strategy', 'inbox'] },
}
