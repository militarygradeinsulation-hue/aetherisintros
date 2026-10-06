// @ts-nocheck
import { TileSummary, Person } from './types';

// Cache store for batched loader (60s TTL)
interface CacheEntry {
  timestamp: number;
  data: Record<string, TileSummary>;
}

let summariesCache: Record<string, CacheEntry> = {};

export function invalidateTileCache() {
  summariesCache = {};
}

// 1. Relationship Network
export function tile_relationship_network_summary(isEmpty = false, topPerson?: Person): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'relationship-network',
      title: 'RELATIONSHIP\nNETWORK',
      caption: ['People + relationship', 'intelligence.'],
      empty: true,
      next_action: 'Import your executive contacts',
      data: null,
    };
  }
  return {
    tileId: 'relationship-network',
    title: 'RELATIONSHIP\nNETWORK',
    caption: ['People + relationship', 'intelligence.'],
    empty: false,
    data: {
      person: {
        name: topPerson ? topPerson.name : 'Alex Carter',
        title: topPerson ? `${topPerson.title} · ${topPerson.company}` : 'CEO - Horizon Partners',
        avatar: topPerson ? topPerson.avatar : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
        engagement: topPerson ? (topPerson.engagement || 'active') : 'active',
      },
      connectionScore: topPerson ? topPerson.connectionScore : 92,
      avatars: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
      ],
      overflowCount: '+12',
    },
  };
}

// 2. Intros CRM
export function tile_intros_crm_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'intros-crm',
      title: 'INTROS CRM',
      caption: ['One relationship', 'record.'],
      empty: true,
      next_action: 'Create your first entity record',
      data: null,
    };
  }
  return {
    tileId: 'intros-crm',
    title: 'INTROS CRM',
    caption: ['One relationship', 'record.'],
    empty: false,
    data: {
      cards: [
        {
          name: 'Sarah Mitchell',
          title: 'CEO - Summit Capital',
          avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
        },
        {
          name: 'James Park',
          title: 'Founder - Vector Labs',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
        },
        {
          name: 'Elena Ruiz',
          title: 'Partner - Ridgeway',
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
        },
      ],
    },
  };
}

// 3. Opportunities
export function tile_opportunities_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'opportunities',
      title: 'OPPORTUNITIES',
      caption: ['Turn relationships', 'into business.'],
      empty: true,
      next_action: 'Add your first opportunity',
      data: null,
    };
  }
  return {
    tileId: 'opportunities',
    title: 'OPPORTUNITIES',
    caption: ['Turn relationships', 'into business.'],
    empty: false,
    data: {
      total: '$2.4M',
      stages: [
        { name: 'Discovery', count: 3, val: '$550K' },
        { name: 'Qualified', count: 5, val: '$1.2M' },
        { name: 'Proposal', count: 2, val: '$420K' },
        { name: 'Closed', count: 4, val: '$980K' },
      ],
    },
  };
}

// 4. Aetheris Grid
export function tile_aetheris_grid_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'aetheris-grid',
      title: 'AETHERIS GRID',
      caption: ['Data that talks to', 'everything.'],
      empty: true,
      next_action: 'Open relationship workbook',
      data: null,
    };
  }
  return {
    tileId: 'aetheris-grid',
    title: 'AETHERIS GRID',
    caption: ['Data that talks to', 'everything.'],
    empty: false,
    data: {
      formula: 'fx =IF(C5="Closed",C2,0)',
      rows: [
        { row: 1, colA: 'Company', colC: '' },
        { row: 2, colA: 'Opportunity', colC: '$250,000' },
        { row: 3, colA: 'Stage', colC: 'Proposal' },
        { row: 4, colA: 'Close Date', colC: '10/15/2024' },
        { row: 5, colA: 'Probability', colC: '80%' },
      ],
    },
  };
}

// 5. Signals
export function tile_signals_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'signals',
      title: 'SIGNALS',
      caption: ['Business signals,', 'not social noise.'],
      empty: true,
      next_action: 'Broadcast your first intent signal',
      data: null,
    };
  }
  return {
    tileId: 'signals',
    title: 'SIGNALS',
    caption: ['Business signals,', 'not social noise.'],
    empty: false,
    data: {
      items: [
        { label: 'Looking For', color: '#C78522', icon: 'search' },
        { label: 'Offering', color: '#F5B027', icon: 'tag' },
        { label: 'Capital', color: '#C78522', icon: 'dollar' },
        { label: 'Talent', color: '#F5B027', icon: 'users' },
        { label: 'Partnership', color: '#C78522', icon: 'link' },
        { label: 'Acquisition', color: '#FFC85C', icon: 'building' },
        { label: 'Insight', color: '#C78522', icon: 'bulb' },
        { label: 'Opportunity', color: '#F5B027', icon: 'target' },
      ],
    },
  };
}

// 6. Calendar
export function tile_calendar_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'calendar',
      title: 'CALENDAR',
      caption: ['Time connected', 'to relationships.'],
      empty: true,
      next_action: 'Connect calendar feed',
      data: null,
    };
  }
  return {
    tileId: 'calendar',
    title: 'CALENDAR',
    caption: ['Time connected', 'to relationships.'],
    empty: false,
    data: {
      events: [
        { time: '9:00 AM', title: 'Leadership Call', sub: 'Horizon Partners' },
        { time: '11:00 AM', title: 'Intro: Sarah Mitchell', sub: 'Video Meeting' },
        { time: '2:00 PM', title: 'Follow Up', sub: 'Send Proposal' },
        { time: '4:00 PM', title: 'Team Sync', sub: 'Intros Platform' },
      ],
    },
  };
}

// 7. Meetings
export function tile_meetings_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'meetings',
      title: 'MEETINGS',
      caption: ['Prepare. Meet.', 'Remember.'],
      empty: true,
      next_action: 'Schedule briefing session',
      data: null,
    };
  }
  return {
    tileId: 'meetings',
    title: 'MEETINGS',
    caption: ['Prepare. Meet.', 'Remember.'],
    empty: false,
    data: {
      meeting: {
        title: 'Intro Meeting',
        company: 'Horizon Partners',
        leadAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
        attendees: [
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&auto=format&fit=crop&q=80',
        ],
      },
      checklist: ['Notes', 'Decisions', 'Action Items', 'Follow-ups'],
    },
  };
}

// 8. Tasks & Work
export function tile_tasks_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'tasks-work',
      title: 'TASKS & WORK',
      caption: ['Work tied', 'to outcomes.'],
      empty: true,
      next_action: 'Log your first executive commitment',
      data: null,
    };
  }
  return {
    tileId: 'tasks-work',
    title: 'TASKS & WORK',
    caption: ['Work tied', 'to outcomes.'],
    empty: false,
    data: {
      tasks: [
        { id: 'tw-1', text: 'Follow up with Sarah', due: 'Today', done: true },
        { id: 'tw-2', text: 'Prepare proposal', due: 'Tomorrow', done: true },
        { id: 'tw-3', text: 'Research company', due: 'Nov 12', done: true },
        { id: 'tw-4', text: 'Schedule intro', due: 'Nov 14', done: true },
      ],
    },
  };
}

// 9. Inbox
export function tile_inbox_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'inbox',
      title: 'INBOX',
      caption: ['Conversations', 'with context.'],
      empty: true,
      next_action: 'Connect Gmail or Outlook account',
      data: null,
    };
  }
  return {
    tileId: 'inbox',
    title: 'INBOX',
    caption: ['Conversations', 'with context.'],
    empty: false,
    data: {
      threads: [
        {
          name: 'Sarah Mitchell',
          sub: 'Re: Partnership',
          time: '10:24 AM',
          avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&auto=format&fit=crop&q=80',
        },
        {
          name: 'James Park',
          sub: 'Intro Request',
          time: 'Yesterday',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80',
        },
        {
          name: 'Investor Group',
          sub: 'Opportunity',
          time: 'Nov 10',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80',
        },
      ],
    },
  };
}

// 10. Knowledge
export function tile_knowledge_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'knowledge',
      title: 'KNOWLEDGE',
      caption: ['Everything the', 'system knows.'],
      empty: true,
      next_action: 'Deposit first brief or playbook',
      data: null,
    };
  }
  return {
    tileId: 'knowledge',
    title: 'KNOWLEDGE',
    caption: ['Everything the', 'system knows.'],
    empty: false,
    data: {
      folders: [
        'Company Briefs',
        'Meeting Notes',
        'Research & Insights',
        'Documents',
        'Playbooks',
        'Saved Content',
      ],
    },
  };
}

// 11. Relationship Radar
export function tile_relationship_radar_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'relationship-radar',
      title: 'RELATIONSHIP\nRADAR',
      caption: ['Know who', 'matters now.'],
      empty: true,
      next_action: 'Calibrate radar criteria',
      data: null,
    };
  }
  return {
    tileId: 'relationship-radar',
    title: 'RELATIONSHIP\nRADAR',
    caption: ['Know who', 'matters now.'],
    empty: false,
    data: {
      hot: 12,
      emerging: 28,
      strategic: 41,
      dormant: 19,
      atRisk: 7,
    },
  };
}

// 12. Connection Paths
export function tile_connection_paths_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'connection-paths',
      title: 'CONNECTION PATHS',
      caption: ['Find the strongest', 'warm path.'],
      empty: true,
      next_action: 'Search target executive or company',
      data: null,
    };
  }
  return {
    tileId: 'connection-paths',
    title: 'CONNECTION PATHS',
    caption: ['Find the strongest', 'warm path.'],
    empty: false,
    data: {
      you: 'You',
      connector: {
        role: 'Trusted Connector',
        name: 'Maria Lopez',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&auto=format&fit=crop&q=80',
      },
      target: {
        role: 'Target CEO',
        name: 'David Kim',
        company: 'Solaris Group',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80',
      },
    },
  };
}

// 13. Intros IQ
export function tile_intros_iq_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'intros-iq',
      title: 'INTROS IQ',
      caption: ['Your network', 'on demand.'],
      empty: true,
      next_action: 'Ask your graph a question',
      data: null,
    };
  }
  return {
    tileId: 'intros-iq',
    title: 'INTROS IQ',
    caption: ['Your network', 'on demand.'],
    empty: false,
    data: {
      placeholder: 'Ask anything...',
      prompts: [
        'Who should I talk to?',
        "What's the best path?",
        'Summarize this company',
        'Find missed opportunities',
        'Draft a follow up',
      ],
    },
  };
}

// 14. Network Forensics
export function tile_network_forensics_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'network-forensics',
      title: 'NETWORK\nFORENSICS',
      caption: ['Find what you', 'are already missing.'],
      empty: true,
      next_action: 'Run forensic network scan',
      data: null,
    };
  }
  return {
    tileId: 'network-forensics',
    title: 'NETWORK\nFORENSICS',
    caption: ['Find what you', 'are already missing.'],
    empty: false,
    data: {
      dormant: 23,
      missed: 12,
      unfinished: 7,
      atRisk: 4,
      potential: '$2.3M',
    },
  };
}

// 15. Digital You
export function tile_digital_you_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'digital-you',
      title: 'DIGITAL YOU',
      caption: ['Your judgment,', 'operating digitally.'],
      empty: true,
      next_action: 'Calibrate executive voice & style',
      data: null,
    };
  }
  return {
    tileId: 'digital-you',
    title: 'DIGITAL YOU',
    caption: ['Your judgment,', 'operating digitally.'],
    empty: false,
    data: {
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
      actions: [
        'Draft in my style',
        'Represent my interests',
        'Prepare for my meeting',
        'Find opportunities',
        'Take action',
      ],
    },
  };
}

// 16. Automations
export function tile_automations_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'automations',
      title: 'AUTOMATIONS',
      caption: ['The system', 'moves work forward.'],
      empty: true,
      next_action: 'Build your first 4-step rule',
      data: null,
    };
  }
  return {
    tileId: 'automations',
    title: 'AUTOMATIONS',
    caption: ['The system', 'moves work forward.'],
    empty: false,
    data: {
      steps: ['Trigger', 'Relationship', 'Action', 'Follow-up'],
    },
  };
}

// 17. Analytics
export function tile_analytics_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'analytics',
      title: 'ANALYTICS',
      caption: ['Measure what', 'relationships create.'],
      empty: true,
      next_action: 'Attribute first deal to an intro',
      data: null,
    };
  }
  return {
    tileId: 'analytics',
    title: 'ANALYTICS',
    caption: ['Measure what', 'relationships create.'],
    empty: false,
    data: {
      roi: '+ 312%',
      bars: [30, 42, 55, 68, 85, 100],
      legend: [
        { label: 'Meetings', color: '#F5B027' },
        { label: 'Opportunities', color: '#F59E0B' },
        { label: 'Revenue Influence', color: '#C78522' },
        { label: 'Introductions', color: '#F5B027' },
      ],
    },
  };
}

// 18. Company Intelligence
export function tile_company_intelligence_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'company-intelligence',
      title: 'COMPANY\nINTELLIGENCE',
      caption: ['Understand the company', 'around the contact.'],
      empty: true,
      next_action: 'Search company registry',
      data: null,
    };
  }
  return {
    tileId: 'company-intelligence',
    title: 'COMPANY\nINTELLIGENCE',
    caption: ['Understand the company', 'around the contact.'],
    empty: false,
    data: {
      company: 'Solaris Group',
      tag: 'Private Equity Backed',
      items: [
        'Overview',
        'Executives',
        'Relationships',
        'Signals',
        'Opportunities',
        'News & Insights',
      ],
    },
  };
}

// 19. Introductions
export function tile_introductions_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'introductions',
      title: 'INTRODUCTIONS',
      caption: ['Introductions', 'with a reason.'],
      empty: true,
      next_action: 'Initiate double opt-in intro',
      data: null,
    };
  }
  return {
    tileId: 'introductions',
    title: 'INTRODUCTIONS',
    caption: ['Introductions', 'with a reason.'],
    empty: false,
    data: {
      partyA: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80',
      partyB: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80',
      title: 'Double Opt-In',
      sub: 'Introduction',
      checklist: [
        'Context Shared',
        'Both Parties Interested',
        'Meeting Scheduled',
        'Handoff Complete',
      ],
    },
  };
}

// 20. Relationship Memory
export function tile_relationship_memory_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'relationship-memory',
      title: 'RELATIONSHIP\nMEMORY',
      caption: ['Never lose', 'the context.'],
      empty: true,
      next_action: 'Record key interaction',
      data: null,
    };
  }
  return {
    tileId: 'relationship-memory',
    title: 'RELATIONSHIP\nMEMORY',
    caption: ['Never lose', 'the context.'],
    empty: false,
    data: {
      events: [
        { title: 'Met at Summit', date: 'Jan 12, 2024' },
        { title: 'Followed up', date: 'Feb 3, 2024' },
        { title: 'Shared deck', date: 'Mar 18, 2024' },
        { title: 'Intro to investor', date: 'Apr 2, 2024' },
      ],
    },
  };
}

// 21. Team Graph
export function tile_team_graph_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'team-graph',
      title: 'TEAM GRAPH',
      caption: ['Know who your', 'company knows.'],
      empty: true,
      next_action: 'Invite partner seats',
      data: null,
    };
  }
  return {
    tileId: 'team-graph',
    title: 'TEAM GRAPH',
    caption: ['Know who your', 'company knows.'],
    empty: false,
    data: {
      yourTeam: 'Your Team',
      target: 'Target Company',
      sub: 'Executives',
      avatars: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80',
      ],
    },
  };
}

// 22. Diagnostics
export function tile_diagnostics_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'diagnostics',
      title: 'DIAGNOSTICS',
      caption: ['Find what', 'is broken.'],
      empty: true,
      next_action: 'Perform initial health diagnostic',
      data: null,
    };
  }
  return {
    tileId: 'diagnostics',
    title: 'DIAGNOSTICS',
    caption: ['Find what', 'is broken.'],
    empty: false,
    data: {
      status: 'Forensic Scan Complete',
      items: [
        { label: '12 Gaps Found', color: '#C78522', icon: 'alert' },
        { label: '5 Risks Identified', color: '#F5B027', icon: 'shield' },
        { label: '8 Opportunities', color: '#C78522', icon: 'target' },
        { label: 'Recommended Actions', color: '#C78522', icon: 'check' },
      ],
    },
  };
}

// 23. Growth Studio
export function tile_growth_studio_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'growth-studio',
      title: 'GROWTH STUDIO',
      caption: ['Turn intelligence', 'into action.'],
      empty: true,
      next_action: 'Draft first outreach narrative',
      data: null,
    };
  }
  return {
    tileId: 'growth-studio',
    title: 'GROWTH STUDIO',
    caption: ['Turn intelligence', 'into action.'],
    empty: false,
    data: {
      items: [
        { label: 'Content', color: '#FFC85C' },
        { label: 'Follow-ups', color: '#F5B027' },
        { label: 'Scripts', color: '#EC4899' },
        { label: 'Campaigns', color: '#FFC85C' },
        { label: 'Signals', color: '#F5B027' },
        { label: 'Templates', color: '#C78522' },
      ],
    },
  };
}

// 24. Executive Brief
export function tile_executive_brief_summary(isEmpty = false): TileSummary {
  if (isEmpty) {
    return {
      tileId: 'executive-brief',
      title: 'EXECUTIVE BRIEF',
      caption: ['What matters', 'today.'],
      empty: true,
      next_action: 'Generate your morning briefing',
      data: null,
    };
  }
  return {
    tileId: 'executive-brief',
    title: 'EXECUTIVE BRIEF',
    caption: ['What matters', 'today.'],
    empty: false,
    data: {
      title: "Today's Focus",
      items: [
        { label: '4 relationships need attention', color: '#D7C29A' },
        { label: '2 opportunities changed', color: '#C78522' },
        { label: '1 intro ready to send', color: '#F5B027' },
        { label: '3 new signals match your goals', color: '#F5B027' },
      ],
    },
  };
}

// Batched loader that calls all 24 summary functions and caches for 60 seconds
export function fetchBatchTileSummaries(isEmpty = false, topPerson?: Person): Record<string, TileSummary> {
  const cacheKey = isEmpty
    ? 'empty'
    : `seeded_${topPerson?.id ?? 'default'}_${topPerson?.engagement ?? 'none'}`;
  const now = Date.now();

  if (summariesCache[cacheKey] && now - summariesCache[cacheKey].timestamp < 60000) {
    return summariesCache[cacheKey].data;
  }

  const results: Record<string, TileSummary> = {
    'relationship-network': tile_relationship_network_summary(isEmpty, topPerson),
    'intros-crm': tile_intros_crm_summary(isEmpty),
    'opportunities': tile_opportunities_summary(isEmpty),
    'aetheris-grid': tile_aetheris_grid_summary(isEmpty),
    'signals': tile_signals_summary(isEmpty),
    'calendar': tile_calendar_summary(isEmpty),
    'meetings': tile_meetings_summary(isEmpty),
    'tasks-work': tile_tasks_summary(isEmpty),
    'inbox': tile_inbox_summary(isEmpty),
    'knowledge': tile_knowledge_summary(isEmpty),
    'relationship-radar': tile_relationship_radar_summary(isEmpty),
    'connection-paths': tile_connection_paths_summary(isEmpty),
    'intros-iq': tile_intros_iq_summary(isEmpty),
    'network-forensics': tile_network_forensics_summary(isEmpty),
    'digital-you': tile_digital_you_summary(isEmpty),
    'automations': tile_automations_summary(isEmpty),
    'analytics': tile_analytics_summary(isEmpty),
    'company-intelligence': tile_company_intelligence_summary(isEmpty),
    'introductions': tile_introductions_summary(isEmpty),
    'relationship-memory': tile_relationship_memory_summary(isEmpty),
    'team-graph': tile_team_graph_summary(isEmpty),
    'diagnostics': tile_diagnostics_summary(isEmpty),
    'growth-studio': tile_growth_studio_summary(isEmpty),
    'executive-brief': tile_executive_brief_summary(isEmpty),
  };

  summariesCache[cacheKey] = {
    timestamp: now,
    data: results,
  };

  return results;
}
