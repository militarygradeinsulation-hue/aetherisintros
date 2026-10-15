export type RelationshipTier = 'Core' | 'Extended' | 'Prospect';
export type CompanySizeCategory = '1-10' | '11-50' | '51-250' | '250+';

export interface NetworkMember {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  companySize?: CompanySizeCategory;
  industry?: string;
  roleType: 'founder' | 'investor' | 'operator' | 'advisor' | 'expert';
  tier?: RelationshipTier;
  location: string;
  avatarUrl: string;
  verified: boolean;
  matchScore: number;
  matchTier: 'EXCELLENT FIT' | 'STRONG FIT' | 'GREAT FIT' | 'GOOD FIT' | 'POTENTIAL';
  bioStatement: string;
  fullBio: string;
  quote: string;
  yearsInRole: string;
  portfolioCount?: string;
  founderCount?: string;
  yearsInTech?: string;
  perspectiveLabel?: string;
  almaMater: string;
  website: string;
  linkedin: string;
  focusAreas: string[];
  currentObjectives: string[];
  compatibility: {
    strategicFit: number;
    sharedInterests: number;
    networkValue: number;
  };
  mutualConnectionsCount: number;
  mutualConnections: Array<{
    id: string;
    name: string;
    title: string;
    company: string;
    degree: '1st' | '2nd';
  }>;
  openToIntros: boolean;
  introStatusText: string;
  recentPosts: Array<{
    id: string;
    title: string;
    snippet: string;
    timeAgo: string;
    likes: number;
    comments: number;
    shares: number;
  }>;
  recommendations: Array<{
    id: string;
    author: string;
    role: string;
    text: string;
    date: string;
  }>;
  aiRecommendation?: {
    counterpartId: string;
    counterpartName: string;
    counterpartTitle: string;
    counterpartCompany: string;
    matchPercent: number;
    tags: string[];
    reasoning: string;
  };
  networkInfluence: {
    strongerReplies: string;
    introSuccessRate: string;
    fasterConversations: string;
    peopleInNetwork: number;
    companiesCount: number;
    keyThemes: number;
    sharedInvestors: number;
  };
}

export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorTitle: string;
  authorCompany: string;
  timeAgo: string;
  badge?: 'Hiring' | 'Event Takeaway' | 'Fund Announcement' | 'Insight';
  content: string;
  linkPreview?: {
    title: string;
    domain: string;
    subtitle?: string;
  };
  likes: number;
  shares: number;
  comments: number;
  isLiked?: boolean;
  isSaved?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isOwn: boolean;
  reactions?: string[];
}

export interface ConversationThread {
  id: string;
  memberId: string;
  memberName: string;
  memberTitle: string;
  memberCompany: string;
  verified: boolean;
  tags: string[];
  lastMessageSnippet: string;
  lastMessageTime: string;
  unreadCount: number;
  isStarred?: boolean;
  folder: 'inbox' | 'introductions' | 'starred' | 'sent' | 'archived';
  messages: ChatMessage[];
  sharedContext: {
    summary: string;
    sharedInterests: string[];
    sharedGoals: string[];
    relevantTopics: string[];
  };
  suggestedNextStep: {
    action: string;
    reasoning: string;
  };
  aiIntroductionBrief: string;
}

export interface IntroRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterTitle: string;
  requesterCompany: string;
  targetId: string;
  targetName: string;
  targetTitle: string;
  targetCompany: string;
  date: string;
  note: string;
  status: 'pending' | 'accepted' | 'dismissed';
}

export const NETWORK_MEMBERS: NetworkMember[] = [
  {
    id: 'marcus-lee',
    name: 'Marcus Lee',
    firstName: 'Marcus',
    lastName: 'Lee',
    title: 'General Partner',
    company: 'Horizon Capital',
    companySize: '11-50',
    industry: 'AI & Machine Learning',
    roleType: 'investor',
    tier: 'Core',
    location: 'New York, NY',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    verified: true,
    matchScore: 92,
    matchTier: 'STRONG FIT',
    bioStatement: 'Investing in category-defining AI and infrastructure companies to build a more connected, human future.',
    fullBio: 'Marcus Lee is a General Partner at Horizon Capital, where he leads investments in AI, infrastructure, and enterprise software. With a background in product and operations, Marcus partners with exceptional founders to scale transformative companies from seed to global impact.',
    quote: 'The most transformative opportunities emerge at the intersection of technological breakthroughs and human need.',
    yearsInRole: '10+',
    portfolioCount: '50+',
    founderCount: '3x',
    almaMater: 'Stanford University',
    website: 'marcuslee.co',
    linkedin: '/in/marcus-lee',
    focusAreas: ['AI Infrastructure', 'Enterprise Software', 'Climate Tech', 'Developer Tools', 'Future of Work', 'Global Markets'],
    currentObjectives: [
      'Meet exceptional founders (Series A–B)',
      'Explore co-investment opportunities',
      'Connect with infrastructure operators',
      'Expand into Asia market opportunities'
    ],
    compatibility: {
      strategicFit: 92,
      sharedInterests: 88,
      networkValue: 76
    },
    mutualConnectionsCount: 8,
    mutualConnections: [
      { id: 'sarah-chen', name: 'Sarah Chen', title: 'Founder & CEO', company: 'Vercelity', degree: '1st' },
      { id: 'james-okafor', name: 'James Okafor', title: 'Founder & CEO', company: 'Forge AI', degree: '2nd' },
      { id: 'priya-desai', name: 'Priya Desai', title: 'Principal', company: 'Aurora Ventures', degree: '2nd' }
    ],
    openToIntros: true,
    introStatusText: 'Open to Strategic Introductions in AI, infrastructure, and climate tech.',
    recentPosts: [
      {
        id: 'post-ml-1',
        title: 'Infrastructure Is the New Moat',
        snippet: "We're entering a decade where the next generation of infrastructure will define economic opportunity. AI is just the beginning.",
        timeAgo: '2w ago',
        likes: 246,
        comments: 32,
        shares: 12
      },
      {
        id: 'post-ml-2',
        title: 'Why Responsible AI Wins',
        snippet: 'The companies that build responsibly — with transparency, governance, and human benefit at the core — will be the ones that endure.',
        timeAgo: '1mo ago',
        likes: 198,
        comments: 24,
        shares: 8
      }
    ],
    recommendations: [
      {
        id: 'rec-1',
        author: 'Elena Rossi',
        role: 'Operating Partner, Voltera Partners',
        text: 'Marcus combines deep technical understanding with exceptional judgment. He’s a thoughtful partner, a trusted advisor, and a force for good in the ecosystem.',
        date: 'Jan 12, 2026'
      }
    ],
    aiRecommendation: {
      counterpartId: 'sarah-chen',
      counterpartName: 'Sarah Chen',
      counterpartTitle: 'Founder & CEO',
      counterpartCompany: 'Vercelity',
      matchPercent: 97,
      tags: ['AI Infrastructure', 'Enterprise', 'Shared Connections'],
      reasoning: 'You both invest in the next generation of infrastructure and share a focus on responsible, human-centered AI.'
    },
    networkInfluence: {
      strongerReplies: '3.2x',
      introSuccessRate: '87%',
      fasterConversations: '28%',
      peopleInNetwork: 1246,
      companiesCount: 312,
      keyThemes: 8,
      sharedInvestors: 12
    }
  },
  {
    id: 'sarah-chen',
    name: 'Sarah Chen',
    firstName: 'Sarah',
    lastName: 'Chen',
    title: 'Founder & CEO',
    company: 'Vercelity',
    companySize: '51-250',
    industry: 'AI & Machine Learning',
    roleType: 'founder',
    tier: 'Core',
    location: 'San Francisco, CA',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    verified: true,
    matchScore: 98,
    matchTier: 'EXCELLENT FIT',
    bioStatement: 'Building the next generation of infrastructure for a more creative world.',
    fullBio: 'Sarah Chen is the Founder and CEO of Vercelity, a next-generation AI infrastructure company helping creative teams build, scale, and ship with frontier models. Previously, she led product at OpenAI and spent a decade building developer tools at Stripe. Sarah is an active investor and advisor to early-stage companies at the intersection of AI, creativity, and human potential.',
    quote: 'I believe AI should expand human possibility, not replace human perspective.',
    yearsInRole: '10+',
    yearsInTech: '10+',
    founderCount: '3x',
    perspectiveLabel: 'Global Perspective',
    almaMater: 'Stanford University',
    website: 'vercelity.com',
    linkedin: '/in/sarah-chen',
    focusAreas: ['AI Infrastructure', 'Developer Tools', 'Creative Workflows', 'Open Source', 'Talent & Teams'],
    currentObjectives: [
      'Scale go-to-market and enterprise adoption',
      'Meet exceptional founders in AI x creativity',
      'Explore strategic partnerships (cloud, data, tools)',
      'Contribute to responsible AI adoption'
    ],
    compatibility: {
      strategicFit: 92,
      sharedInterests: 88,
      networkValue: 76
    },
    mutualConnectionsCount: 12,
    mutualConnections: [
      { id: 'marcus-lee', name: 'Marcus Lee', title: 'General Partner', company: 'Horizon Ventures', degree: '1st' },
      { id: 'priya-desai', name: 'Priya Desai', title: 'Head of AI', company: 'Coinbase', degree: '2nd' },
      { id: 'daniel-kim', name: 'Daniel Kim', title: 'Founder', company: 'LoopAI', degree: '2nd' }
    ],
    openToIntros: true,
    introStatusText: 'Open to high-value collaborations with enterprise operators and infrastructure builders.',
    recentPosts: [
      {
        id: 'post-sc-1',
        title: 'Building for the Next Creative Era',
        snippet: 'How frontier AI interfaces will reshape creative software architectures by 2027.',
        timeAgo: '1w ago',
        likes: 312,
        comments: 48,
        shares: 29
      }
    ],
    recommendations: [
      {
        id: 'rec-sc-1',
        author: 'Marcus Lee',
        role: 'General Partner, Horizon Capital',
        text: 'Sarah is an extraordinary operator who marries engineering precision with a rare design sensibility.',
        date: 'Feb 18, 2026'
      }
    ],
    aiRecommendation: {
      counterpartId: 'alex-rivera',
      counterpartName: 'Alex Rivera',
      counterpartTitle: 'CTO',
      counterpartCompany: 'Nebula Cloud',
      matchPercent: 92,
      tags: ['Cloud Infrastructure', 'AI at Scale', 'Enterprise Partnerships'],
      reasoning: 'Both of you are focused on scaling AI infrastructure and have complementary networks in enterprise and developer ecosystems.'
    },
    networkInfluence: {
      strongerReplies: '3.4x',
      introSuccessRate: '91%',
      fasterConversations: '32%',
      peopleInNetwork: 1420,
      companiesCount: 384,
      keyThemes: 9,
      sharedInvestors: 16
    }
  },
  {
    id: 'elena-rossi',
    name: 'Elena Rossi',
    firstName: 'Elena',
    lastName: 'Rossi',
    title: 'Operating Partner',
    company: 'Vector Partners',
    companySize: '11-50',
    industry: 'Enterprise SaaS',
    roleType: 'operator',
    tier: 'Core',
    location: 'London, UK',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
    verified: true,
    matchScore: 89,
    matchTier: 'STRONG FIT',
    bioStatement: 'Helps technical founders scale from zero to global operations and go-to-market excellence.',
    fullBio: 'Elena Rossi is an Operating Partner at Vector Partners (formerly Velora Ventures). She has guided over 30 enterprise AI and SaaS startups through rapid European and North American expansions.',
    quote: 'Sustainable growth is an operational discipline, not a marketing accident.',
    yearsInRole: '12+',
    portfolioCount: '34+',
    founderCount: '2x',
    almaMater: 'Stanford GSB',
    website: 'vectorpartners.vc',
    linkedin: '/in/elena-rossi',
    focusAreas: ['Operations', 'Go-to-Market', 'AI', 'Venture Capital', 'Board Advisor'],
    currentObjectives: [
      'Expand transatlantic operational bridges',
      'Support Series B enterprise infrastructure scale-ups',
      'Co-invest in resilient UK/European deep tech'
    ],
    compatibility: {
      strategicFit: 95,
      sharedInterests: 89,
      networkValue: 84
    },
    mutualConnectionsCount: 6,
    mutualConnections: [
      { id: 'marcus-lee', name: 'Marcus Lee', title: 'General Partner', company: 'Horizon Capital', degree: '1st' },
      { id: 'sarah-chen', name: 'Sarah Chen', title: 'Founder & CEO', company: 'Vercelity', degree: '1st' }
    ],
    openToIntros: true,
    introStatusText: 'Open to board advisory and go-to-market scaling introductions.',
    recentPosts: [
      {
        id: 'post-er-1',
        title: 'Scaling Transatlantic Go-To-Market',
        snippet: 'The playbooks that work when bringing European enterprise tech to the US market.',
        timeAgo: '3w ago',
        likes: 184,
        comments: 19,
        shares: 11
      }
    ],
    recommendations: [
      {
        id: 'rec-er-1',
        author: 'Daniel Kim',
        role: 'CTO, Nexus Systems',
        text: 'Elena transformed our post-Series A enterprise customer deployment velocity within 90 days.',
        date: 'Dec 04, 2025'
      }
    ],
    networkInfluence: {
      strongerReplies: '2.9x',
      introSuccessRate: '86%',
      fasterConversations: '26%',
      peopleInNetwork: 980,
      companiesCount: 240,
      keyThemes: 6,
      sharedInvestors: 9
    }
  },
  {
    id: 'daniel-kim',
    name: 'Daniel Kim',
    firstName: 'Daniel',
    lastName: 'Kim',
    title: 'CTO',
    company: 'Nexus Systems',
    companySize: '51-250',
    industry: 'Infrastructure & Cloud',
    roleType: 'operator',
    tier: 'Extended',
    location: 'Seattle, WA',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    verified: true,
    matchScore: 87,
    matchTier: 'GREAT FIT',
    bioStatement: 'Scaling distributed infrastructure and developer platforms for high-throughput AI workloads.',
    fullBio: 'Daniel Kim is CTO at Nexus Systems, architecting edge AI pipelines and high-throughput data backbones. Prior to Nexus, he led cloud engineering at AWS and was an early engineer at Datadog.',
    quote: 'The true benchmark of infrastructure is whether engineers forget it is even there.',
    yearsInRole: '8+',
    portfolioCount: '15+',
    founderCount: '1x',
    almaMater: 'UC Berkeley',
    website: 'nexus-systems.io',
    linkedin: '/in/daniel-kim',
    focusAreas: ['Infrastructure', 'Cloud', 'Engineering', 'Developer Tools', 'Distributed Systems'],
    currentObjectives: [
      'Evaluate hardware acceleration platforms',
      'Hire top-tier systems software architects',
      'Partner with enterprise foundational model providers'
    ],
    compatibility: {
      strategicFit: 88,
      sharedInterests: 85,
      networkValue: 80
    },
    mutualConnectionsCount: 5,
    mutualConnections: [
      { id: 'sarah-chen', name: 'Sarah Chen', title: 'Founder & CEO', company: 'Vercelity', degree: '1st' },
      { id: 'marcus-lee', name: 'Marcus Lee', title: 'General Partner', company: 'Horizon Capital', degree: '2nd' }
    ],
    openToIntros: true,
    introStatusText: 'Open to discussions on cluster orchestration and latency optimization.',
    recentPosts: [
      {
        id: 'post-dk-1',
        title: 'Optimizing Inference Backplanes',
        snippet: 'Key findings from profiling GPU utilization across heterogeneous cloud clusters.',
        timeAgo: '4d ago',
        likes: 142,
        comments: 28,
        shares: 14
      }
    ],
    recommendations: [
      {
        id: 'rec-dk-1',
        author: 'Sarah Chen',
        role: 'CEO, Vercelity',
        text: 'Daniel is one of the most rigorous systems minds in the industry today.',
        date: 'Jan 29, 2026'
      }
    ],
    networkInfluence: {
      strongerReplies: '2.8x',
      introSuccessRate: '84%',
      fasterConversations: '22%',
      peopleInNetwork: 810,
      companiesCount: 195,
      keyThemes: 5,
      sharedInvestors: 7
    }
  },
  {
    id: 'lisa-tran',
    name: 'Lisa Tran',
    firstName: 'Lisa',
    lastName: 'Tran',
    title: 'VP Product',
    company: 'Atlas Cloud',
    companySize: '250+',
    industry: 'Infrastructure & Cloud',
    roleType: 'operator',
    tier: 'Extended',
    location: 'Singapore',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    verified: true,
    matchScore: 85,
    matchTier: 'GREAT FIT',
    bioStatement: 'Product leader with deep experience in developer tools, API surfaces, and global scale.',
    fullBio: 'Lisa Tran heads product for Atlas Cloud in Singapore, overseeing global cloud developer surfaces across APAC and EMEA. Former Product Director at Grab and Atlassian.',
    quote: 'Great product strategy is the courage to say no to 99 good ideas to execute one transformational one.',
    yearsInRole: '9+',
    portfolioCount: '12+',
    founderCount: '1x',
    almaMater: 'NUS Singapore',
    website: 'atlascloud.asia',
    linkedin: '/in/lisa-tran',
    focusAreas: ['Product', 'AI', 'Infrastructure', 'APAC Expansion', 'APIs'],
    currentObjectives: [
      'Scale developer platform across Southeast Asia',
      'Integrate generative model runtime into cloud console',
      'Recruit product leads for regional hubs'
    ],
    compatibility: {
      strategicFit: 85,
      sharedInterests: 82,
      networkValue: 79
    },
    mutualConnectionsCount: 7,
    mutualConnections: [
      { id: 'marcus-lee', name: 'Marcus Lee', title: 'General Partner', company: 'Horizon Capital', degree: '2nd' }
    ],
    openToIntros: true,
    introStatusText: 'Open to cross-border ecosystem partnerships and API developer tools.',
    recentPosts: [
      {
        id: 'post-lt-1',
        title: 'Building for the APAC Developer Ecosystem',
        snippet: 'How developer adoption patterns in Singapore and Tokyo differ from Silicon Valley.',
        timeAgo: '1w ago',
        likes: 98,
        comments: 14,
        shares: 6
      }
    ],
    recommendations: [],
    networkInfluence: {
      strongerReplies: '2.5x',
      introSuccessRate: '81%',
      fasterConversations: '20%',
      peopleInNetwork: 730,
      companiesCount: 160,
      keyThemes: 5,
      sharedInvestors: 6
    }
  },
  {
    id: 'alex-monroe',
    name: 'Alex Monroe',
    firstName: 'Alex',
    lastName: 'Monroe',
    title: 'Strategic Advisor',
    company: 'Independent',
    companySize: '1-10',
    industry: 'Global Strategy',
    roleType: 'advisor',
    tier: 'Extended',
    location: 'Dubai, UAE',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
    verified: true,
    matchScore: 78,
    matchTier: 'GOOD FIT',
    bioStatement: 'Advising global companies on sovereign AI strategy, cross-border partnerships, and GCC expansion.',
    fullBio: 'Alex Monroe is a veteran cross-border tech advisor who has structured sovereign joint ventures across the UAE, Saudi Arabia, and Europe. Former partner at McKinsey Tech & Media.',
    quote: 'Geopolitics and technology have permanently converged.',
    yearsInRole: '14+',
    portfolioCount: '40+',
    founderCount: '2x',
    almaMater: 'Oxford University',
    website: 'alexmonroe.co',
    linkedin: '/in/alex-monroe',
    focusAreas: ['Advisory', 'Strategy', 'Global', 'Sovereign AI', 'GCC Markets'],
    currentObjectives: [
      'Advise Series C tech firms entering Abu Dhabi & Riyadh',
      'Structure institutional capital syndicates',
      'Bridge Silicon Valley technology to Middle Eastern hubs'
    ],
    compatibility: {
      strategicFit: 80,
      sharedInterests: 76,
      networkValue: 78
    },
    mutualConnectionsCount: 11,
    mutualConnections: [
      { id: 'marcus-lee', name: 'Marcus Lee', title: 'General Partner', company: 'Horizon Capital', degree: '1st' }
    ],
    openToIntros: true,
    introStatusText: 'Open to discussions on institutional expansion into the GCC.',
    recentPosts: [
      {
        id: 'post-am-1',
        title: 'The Sovereign AI Architecture',
        snippet: 'Why nation states are requiring local data residency and dedicated hardware stacks.',
        timeAgo: '2w ago',
        likes: 165,
        comments: 31,
        shares: 19
      }
    ],
    recommendations: [],
    networkInfluence: {
      strongerReplies: '2.7x',
      introSuccessRate: '83%',
      fasterConversations: '25%',
      peopleInNetwork: 1100,
      companiesCount: 290,
      keyThemes: 7,
      sharedInvestors: 11
    }
  },
  {
    id: 'maya-patel',
    name: 'Maya Patel',
    firstName: 'Maya',
    lastName: 'Patel',
    title: 'Investor',
    company: 'Tide Capital',
    companySize: '11-50',
    industry: 'Fintech',
    roleType: 'investor',
    tier: 'Prospect',
    location: 'Boston, MA',
    avatarUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&auto=format&fit=crop&q=80',
    verified: false,
    matchScore: 76,
    matchTier: 'GOOD FIT',
    bioStatement: 'Backing exceptional founders at seed and Series A in enterprise SaaS, fintech, and workflow automation.',
    fullBio: 'Maya Patel focuses on intelligent workflow applications and fintech infrastructure at Tide Capital. Prior to venture, she built product analytics at HubSpot.',
    quote: 'True moats come from proprietary data loops that compound with every workflow execution.',
    yearsInRole: '6+',
    portfolioCount: '22+',
    founderCount: '1x',
    almaMater: 'MIT Sloan',
    website: 'tidecapital.com',
    linkedin: '/in/maya-patel',
    focusAreas: ['Early Stage', 'SaaS', 'Fintech', 'Workflow AI', 'Automation'],
    currentObjectives: [
      'Deploy $15M in early-stage fintech workflows',
      'Meet seed founders building with vertical AI agents',
      'Connect with Boston enterprise executives'
    ],
    compatibility: {
      strategicFit: 78,
      sharedInterests: 75,
      networkValue: 74
    },
    mutualConnectionsCount: 4,
    mutualConnections: [
      { id: 'sarah-chen', name: 'Sarah Chen', title: 'Founder & CEO', company: 'Vercelity', degree: '2nd' }
    ],
    openToIntros: true,
    introStatusText: 'Open to reviewing seed and pre-Series A pitch dossiers.',
    recentPosts: [],
    recommendations: [],
    networkInfluence: {
      strongerReplies: '2.2x',
      introSuccessRate: '79%',
      fasterConversations: '18%',
      peopleInNetwork: 620,
      companiesCount: 140,
      keyThemes: 4,
      sharedInvestors: 5
    }
  },
  {
    id: 'carlos-mendes',
    name: 'Carlos Mendes',
    firstName: 'Carlos',
    lastName: 'Mendes',
    title: 'Founder & CEO',
    company: 'Lumen AI',
    companySize: '1-10',
    industry: 'Climate Tech',
    roleType: 'founder',
    tier: 'Prospect',
    location: 'Berlin, Germany',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
    verified: false,
    matchScore: 72,
    matchTier: 'POTENTIAL',
    bioStatement: 'Applying predictive AI and sensors to climate resilience and industrial energy transition.',
    fullBio: 'Carlos Mendes is building Lumen AI in Berlin, optimizing grid distribution and factory energy efficiency via real-time telemetry.',
    quote: 'Industrial decarbonization is the defining software and hardware engineering puzzle of our lives.',
    yearsInRole: '5+',
    portfolioCount: '0',
    founderCount: '2x',
    almaMater: 'TU Berlin',
    website: 'lumen-energy.ai',
    linkedin: '/in/carlos-mendes',
    focusAreas: ['Climate Tech', 'AI', 'B2B', 'Industrial IoT', 'Clean Energy'],
    currentObjectives: [
      'Close Series A financing with climate-tech focused funds',
      'Scale industrial pilot deployments across DACH region',
      'Partner with renewable utility operators'
    ],
    compatibility: {
      strategicFit: 74,
      sharedInterests: 71,
      networkValue: 70
    },
    mutualConnectionsCount: 2,
    mutualConnections: [
      { id: 'elena-rossi', name: 'Elena Rossi', title: 'Operating Partner', company: 'Vector Partners', degree: '2nd' }
    ],
    openToIntros: true,
    introStatusText: 'Seeking introductions to industrial venture funds and German manufacturing executives.',
    recentPosts: [],
    recommendations: [],
    networkInfluence: {
      strongerReplies: '2.1x',
      introSuccessRate: '75%',
      fasterConversations: '16%',
      peopleInNetwork: 510,
      companiesCount: 110,
      keyThemes: 3,
      sharedInvestors: 4
    }
  },
  {
    id: 'nina-park',
    name: 'Nina Park',
    firstName: 'Nina',
    lastName: 'Park',
    title: 'Partner',
    company: 'Summit Growth',
    companySize: '11-50',
    industry: 'Enterprise SaaS',
    roleType: 'investor',
    tier: 'Prospect',
    location: 'Seoul, South Korea',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    verified: false,
    matchScore: 71,
    matchTier: 'POTENTIAL',
    bioStatement: 'Growth investor focused on AI, marketplaces, and the future of work across East Asia.',
    fullBio: 'Nina Park leads growth-stage technology allocations for Summit Growth in Seoul, with an active focus on cross-border software platforms.',
    quote: 'The next wave of generational tech platforms will originate in Asia and scale globally from day one.',
    yearsInRole: '8+',
    portfolioCount: '28+',
    founderCount: '1x',
    almaMater: 'Seoul National University',
    website: 'summitgrowth.kr',
    linkedin: '/in/nina-park',
    focusAreas: ['Growth', 'Marketplaces', 'Work', 'Cross-Border', 'Media'],
    currentObjectives: [
      'Identify Series C software opportunities',
      'Bridge East Asian enterprise distribution to US founders',
      'Expand cross-border corporate syndicate'
    ],
    compatibility: {
      strategicFit: 72,
      sharedInterests: 70,
      networkValue: 70
    },
    mutualConnectionsCount: 3,
    mutualConnections: [
      { id: 'lisa-tran', name: 'Lisa Tran', title: 'VP Product', company: 'Atlas Cloud', degree: '2nd' }
    ],
    openToIntros: true,
    introStatusText: 'Open to discussions on growth equity and East Asian distribution.',
    recentPosts: [],
    recommendations: [],
    networkInfluence: {
      strongerReplies: '2.0x',
      introSuccessRate: '74%',
      fasterConversations: '15%',
      peopleInNetwork: 540,
      companiesCount: 125,
      keyThemes: 4,
      sharedInvestors: 5
    }
  },
  {
    id: 'priya-desai',
    name: 'Priya Desai',
    firstName: 'Priya',
    lastName: 'Desai',
    title: 'Operator & Advisor',
    company: 'Aurora Ventures',
    companySize: '11-50',
    industry: 'Fintech',
    roleType: 'advisor',
    tier: 'Core',
    location: 'San Francisco, CA',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    verified: true,
    matchScore: 94,
    matchTier: 'EXCELLENT FIT',
    bioStatement: 'Advising deep tech founders on enterprise GTM and strategic fundraising allocations.',
    fullBio: 'Priya Desai is a principal advisor at Aurora Ventures and former Head of AI Partnerships at Coinbase. Deep experience in enterprise protocols, security, and developer ecosystems.',
    quote: 'Strategic relationships should be treated like code: structured, intentional, and tested under load.',
    yearsInRole: '11+',
    portfolioCount: '30+',
    founderCount: '2x',
    almaMater: 'Harvard Business School',
    website: 'auroravc.com',
    linkedin: '/in/priya-desai',
    focusAreas: ['AI & Enterprise', 'Fintech', 'GTM Strategy', 'Syndicates'],
    currentObjectives: [
      'Facilitate warm introductions between tier-1 VCs and technical founders',
      'Advise fintech infrastructure startups on regulatory navigation'
    ],
    compatibility: {
      strategicFit: 94,
      sharedInterests: 91,
      networkValue: 88
    },
    mutualConnectionsCount: 14,
    mutualConnections: [
      { id: 'marcus-lee', name: 'Marcus Lee', title: 'General Partner', company: 'Horizon Capital', degree: '1st' },
      { id: 'sarah-chen', name: 'Sarah Chen', title: 'Founder & CEO', company: 'Vercelity', degree: '1st' }
    ],
    openToIntros: true,
    introStatusText: 'Open to curating strategic relationships for venture-backed founders.',
    recentPosts: [],
    recommendations: [],
    networkInfluence: {
      strongerReplies: '3.3x',
      introSuccessRate: '90%',
      fasterConversations: '30%',
      peopleInNetwork: 1350,
      companiesCount: 340,
      keyThemes: 8,
      sharedInvestors: 14
    }
  },
  {
    id: 'james-okafor',
    name: 'James Okafor',
    firstName: 'James',
    lastName: 'Okafor',
    title: 'Founder & CEO',
    company: 'Forge AI',
    companySize: '1-10',
    industry: 'Deep Tech & Robotics',
    roleType: 'founder',
    tier: 'Extended',
    location: 'Austin, TX',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
    verified: true,
    matchScore: 91,
    matchTier: 'STRONG FIT',
    bioStatement: 'Building foundation models for robotics, physical intelligence, and factory automation.',
    fullBio: 'James Okafor is the founder of Forge AI, developing multi-modal sensor fusion models for robotics. PhD in Mechanical Engineering from MIT.',
    quote: 'Intelligence must touch the physical world to truly transform society.',
    yearsInRole: '7+',
    portfolioCount: '0',
    founderCount: '2x',
    almaMater: 'MIT',
    website: 'forgeai.tech',
    linkedin: '/in/james-okafor',
    focusAreas: ['Deep Tech', 'Robotics', 'Physical AI', 'Automation'],
    currentObjectives: [
      'Expand manufacturing test deployments',
      'Hire perception research scientists',
      'Connect with aerospace and robotics LPs'
    ],
    compatibility: {
      strategicFit: 91,
      sharedInterests: 87,
      networkValue: 83
    },
    mutualConnectionsCount: 9,
    mutualConnections: [
      { id: 'marcus-lee', name: 'Marcus Lee', title: 'General Partner', company: 'Horizon Capital', degree: '1st' },
      { id: 'sarah-chen', name: 'Sarah Chen', title: 'Founder & CEO', company: 'Vercelity', degree: '1st' }
    ],
    openToIntros: true,
    introStatusText: 'Open to introductions to Tier 1 hardware manufacturers and robotics labs.',
    recentPosts: [],
    recommendations: [],
    networkInfluence: {
      strongerReplies: '3.1x',
      introSuccessRate: '88%',
      fasterConversations: '27%',
      peopleInNetwork: 920,
      companiesCount: 210,
      keyThemes: 6,
      sharedInvestors: 10
    }
  }
];

export const INITIAL_FEED_POSTS: FeedPost[] = [
  {
    id: 'feed-1',
    authorId: 'marcus-lee',
    authorName: 'Marcus Lee',
    authorTitle: 'General Partner at Horizon Ventures',
    authorCompany: 'Horizon Capital',
    timeAgo: '2h',
    badge: 'Fund Announcement',
    content: "Excited to announce our $50M Fund III, focused on AI infrastructure and applied enterprise tools. Grateful to our founders, LPs, and community for their continued belief in what we're building together.",
    linkPreview: {
      title: 'Horizon Ventures Announces $50M Fund III to Back the Next Wave of AI Infrastructure',
      domain: 'horizonventures.com',
      subtitle: 'Investing in category-defining AI and infrastructure companies'
    },
    likes: 128,
    shares: 24,
    comments: 18,
    isLiked: false,
    isSaved: false
  },
  {
    id: 'feed-2',
    authorId: 'sarah-chen',
    authorName: 'Sarah Chen',
    authorTitle: 'Founder & CEO at Vercelity',
    authorCompany: 'Vercelity',
    timeAgo: '4h',
    badge: 'Hiring',
    content: "We're hiring a Head of Product (AI Infrastructure). If you're passionate about building at the intersection of AI and real-world impact, we'd love to connect.",
    linkPreview: {
      title: 'Join Our Team: Head of Product (AI Infrastructure)',
      domain: 'vercelity.com/careers',
      subtitle: 'Lead core developer experience and cloud orchestration at Vercelity'
    },
    likes: 56,
    shares: 18,
    comments: 12,
    isLiked: true,
    isSaved: true
  },
  {
    id: 'feed-3',
    authorId: 'daniel-kim',
    authorName: 'Daniel Kim',
    authorTitle: 'CTO at Nexus Systems',
    authorCompany: 'Nexus Systems',
    timeAgo: '6h',
    badge: 'Event Takeaway',
    content: 'Great panel today at the Aetheris AI & Society Summit. Powerful discussion on responsible innovation and the role of business leaders in shaping a more inclusive future.',
    likes: 84,
    shares: 15,
    comments: 9,
    isLiked: false,
    isSaved: false
  }
];

export const INITIAL_INTRO_REQUESTS: IntroRequest[] = [
  {
    id: 'intro-req-1',
    requesterId: 'elena-rossi',
    requesterName: 'Elena Rossi',
    requesterTitle: 'CTO, Nebula Cloud',
    requesterCompany: 'Nebula Cloud',
    targetId: 'james-okafor',
    targetName: 'James Okafor',
    targetTitle: 'Founder & CEO',
    targetCompany: 'Forge AI',
    date: 'Mar 12, 2026',
    note: 'Would love an introduction to James to discuss sensor telemetry ingestion for robotic test benches.',
    status: 'pending'
  },
  {
    id: 'intro-req-2',
    requesterId: 'daniel-kim',
    requesterName: 'Daniel Kim',
    requesterTitle: 'CTO, Nexus Systems',
    requesterCompany: 'Nexus Systems',
    targetId: 'alex-monroe',
    targetName: 'Alex Monroe',
    targetTitle: 'Strategic Advisor',
    targetCompany: 'Independent',
    date: 'Mar 11, 2026',
    note: 'Looking to get Alex’s perspective on enterprise data residency architectures in the GCC region.',
    status: 'pending'
  },
  {
    id: 'intro-req-3',
    requesterId: 'priya-desai',
    requesterName: 'Priya Desai',
    requesterTitle: 'Principal, Aurora Ventures',
    requesterCompany: 'Aurora Ventures',
    targetId: 'marcus-lee',
    targetName: 'Marcus Lee',
    targetTitle: 'General Partner',
    targetCompany: 'Horizon Capital',
    date: 'Mar 10, 2026',
    note: 'Marcus, sharing a co-investment syndicate opportunity in physical AI compute infrastructure.',
    status: 'pending'
  }
];

export const INITIAL_CONVERSATIONS: ConversationThread[] = [
  {
    id: 'conv-marcus-lee',
    memberId: 'marcus-lee',
    memberName: 'Marcus Lee',
    memberTitle: 'General Partner',
    memberCompany: 'Horizon Ventures',
    verified: true,
    tags: ['Investor', 'AI Infrastructure', 'Enterprise Software', '+1'],
    lastMessageSnippet: 'Excited to explore this further. Let’s connect next week.',
    lastMessageTime: '10:45 AM',
    unreadCount: 0,
    isStarred: true,
    folder: 'inbox',
    messages: [
      {
        id: 'msg-1',
        senderId: 'marcus-lee',
        senderName: 'Marcus Lee',
        text: "Thanks for the introduction, Sarah. I've been following Forge AI's work and am impressed with your focus on real-world infrastructure use cases.",
        timestamp: '10:14 AM',
        isOwn: false
      },
      {
        id: 'msg-2',
        senderId: 'sarah-chen',
        senderName: 'Sarah Chen',
        text: 'Glad to connect, Marcus. We’re focused on making AI infrastructure more accessible to enterprises, and I think there’s strong alignment with the types of companies you back.',
        timestamp: '10:26 AM',
        isOwn: true
      },
      {
        id: 'msg-3',
        senderId: 'marcus-lee',
        senderName: 'Marcus Lee',
        text: 'Agreed. We’re particularly interested in teams building at the intersection of applied AI and operational infrastructure. Would you be open to a short call next week to explore potential synergies?',
        timestamp: '10:38 AM',
        isOwn: false
      },
      {
        id: 'msg-4',
        senderId: 'sarah-chen',
        senderName: 'Sarah Chen',
        text: 'Absolutely. I’ll send a few time options. I can also share a brief deck in advance so you have more context.',
        timestamp: '10:41 AM',
        isOwn: true
      },
      {
        id: 'msg-5',
        senderId: 'marcus-lee',
        senderName: 'Marcus Lee',
        text: 'Perfect. Looking forward to it.',
        timestamp: '10:45 AM',
        isOwn: false,
        reactions: ['👍 1']
      }
    ],
    sharedContext: {
      summary: 'Both of you are focused on AI infrastructure and have complementary networks in enterprise and developer ecosystems. Marcus has invested in companies at the intersection of AI and infrastructure, and it could be a strategic fit for your goals.',
      sharedInterests: ['AI Infrastructure', 'Enterprise Software', 'Developer Tools'],
      sharedGoals: ['Scale go-to-market', 'Strategic partnerships'],
      relevantTopics: ['Enterprise adoption', 'Infrastructure', 'Global expansion']
    },
    suggestedNextStep: {
      action: 'Schedule Meeting',
      reasoning: 'Based on your goals and conversation, a 30-minute exploratory call is a high-value next step. Consider sharing a short deck in advance to align on specific areas of collaboration.'
    },
    aiIntroductionBrief: 'Marcus is a general partner at Horizon Ventures, focusing on AI infrastructure, enterprise software, and developer tools. He’s interested in high-potential teams with real-world applications, global ambitions, and strong go-to-market execution. You may discuss potential investment, strategic partnerships, or market introductions.'
  },
  {
    id: 'conv-elena-rossi',
    memberId: 'elena-rossi',
    memberName: 'Elena Rossi',
    memberTitle: 'Operating Partner',
    memberCompany: 'Vector Partners',
    verified: true,
    tags: ['Operations', 'Go-to-Market', 'AI'],
    lastMessageSnippet: 'Thanks for the introduction. Looking forward to our discussion.',
    lastMessageTime: 'Yesterday',
    unreadCount: 1,
    isStarred: false,
    folder: 'inbox',
    messages: [
      {
        id: 'msg-er-1',
        senderId: 'elena-rossi',
        senderName: 'Elena Rossi',
        text: 'Hello Sarah, lovely to connect through Aetheris. I saw your recent launch notes on enterprise developer orchestration.',
        timestamp: 'Yesterday 3:40 PM',
        isOwn: false
      },
      {
        id: 'msg-er-2',
        senderId: 'sarah-chen',
        senderName: 'Sarah Chen',
        text: 'Thank you Elena! Would love your take on European expansion channels.',
        timestamp: 'Yesterday 4:10 PM',
        isOwn: true
      }
    ],
    sharedContext: {
      summary: 'Elena has operational mastery in European software scaling and strong contacts across UK/Nordic cloud buyers.',
      sharedInterests: ['GTM Scaling', 'Operations', 'Transatlantic Partnerships'],
      sharedGoals: ['Europe expansion', 'Enterprise pilots'],
      relevantTopics: ['Enterprise procurement', 'Data compliance', 'London tech ecosystem']
    },
    suggestedNextStep: {
      action: 'Schedule Meeting',
      reasoning: 'Propose a 20-minute prep sync for your upcoming London meetings.'
    },
    aiIntroductionBrief: 'Elena provides board-level operational oversight for venture portfolio companies expanding across Europe.'
  },
  {
    id: 'conv-james-okafor',
    memberId: 'james-okafor',
    memberName: 'James Okafor',
    memberTitle: 'Founder & CEO',
    memberCompany: 'Forge AI',
    verified: true,
    tags: ['Robotics', 'Deep Tech', 'Founders'],
    lastMessageSnippet: 'Looking forward to connecting on compute clusters...',
    lastMessageTime: 'Mar 12',
    unreadCount: 0,
    isStarred: true,
    folder: 'inbox',
    messages: [
      {
        id: 'msg-jo-1',
        senderId: 'james-okafor',
        senderName: 'James Okafor',
        text: 'Hey Sarah, saw the benchmarks you published on latency. Incredible engineering.',
        timestamp: 'Mar 12 11:20 AM',
        isOwn: false
      }
    ],
    sharedContext: {
      summary: 'Physical AI compute requires custom orchestration pipelines matching Vercelity’s core strengths.',
      sharedInterests: ['Robotics', 'Hardware Acceleration', 'Inference Latency'],
      sharedGoals: ['Benchmarking', 'Co-marketing'],
      relevantTopics: ['Sensor fusion', 'GPU clusters']
    },
    suggestedNextStep: {
      action: 'Schedule Meeting',
      reasoning: 'Explore joint benchmark report or mutual technical review.'
    },
    aiIntroductionBrief: 'James is building physical AI foundation models for industrial robotics.'
  },
  {
    id: 'conv-alex-monroe',
    memberId: 'alex-monroe',
    memberName: 'Alex Monroe',
    memberTitle: 'Strategic Advisor',
    memberCompany: 'Independent',
    verified: true,
    tags: ['Advisory', 'Strategy', 'GCC'],
    lastMessageSnippet: 'Appreciate the context on regional compliance...',
    lastMessageTime: 'Mar 11',
    unreadCount: 0,
    folder: 'inbox',
    messages: [
      {
        id: 'msg-am-1',
        senderId: 'alex-monroe',
        senderName: 'Alex Monroe',
        text: 'Sarah, delighted to connect. The GCC sovereign tech initiatives are ramping up quickly this quarter.',
        timestamp: 'Mar 11 2:15 PM',
        isOwn: false
      }
    ],
    sharedContext: {
      summary: 'Advising sovereign tech entities with multi-million dollar annual software budgets.',
      sharedInterests: ['Sovereign AI', 'Regulatory Frameworks', 'Global Expansion'],
      sharedGoals: ['Middle East deployment', 'Strategic alliances'],
      relevantTopics: ['Data sovereignty', 'UAE cloud infrastructure']
    },
    suggestedNextStep: {
      action: 'Schedule Meeting',
      reasoning: 'Book a 30-min strategy review on Middle East market readiness.'
    },
    aiIntroductionBrief: 'Alex has brokered high-level cross-border joint ventures across Europe and the GCC.'
  },
  {
    id: 'conv-priya-desai',
    memberId: 'priya-desai',
    memberName: 'Priya Desai',
    memberTitle: 'Operator & Advisor',
    memberCompany: 'Aurora Ventures',
    verified: true,
    tags: ['Fintech', 'AI & Enterprise'],
    lastMessageSnippet: 'This could be a great fit for the upcoming syndicate.',
    lastMessageTime: 'Mar 10',
    unreadCount: 0,
    folder: 'introductions',
    messages: [
      {
        id: 'msg-pd-1',
        senderId: 'priya-desai',
        senderName: 'Priya Desai',
        text: 'Sarah, I have a few tier-1 growth investors asking about your Series B timing.',
        timestamp: 'Mar 10 9:15 AM',
        isOwn: false
      }
    ],
    sharedContext: {
      summary: 'Priya maintains tight relationships with institutional partners at top tech funds.',
      sharedInterests: ['Fundraising', 'Growth Strategy', 'Enterprise Governance'],
      sharedGoals: ['Investor syndicate', 'Strategic introductions'],
      relevantTopics: ['Cap table architecture', 'Enterprise ARR velocity']
    },
    suggestedNextStep: {
      action: 'Schedule Meeting',
      reasoning: 'Align on investor target list for next month.'
    },
    aiIntroductionBrief: 'Priya advises growth-stage founders on tier-1 syndicate placement and board composition.'
  }
];

export const UPCOMING_EVENTS = [
  {
    id: 'evt-1',
    dateMonth: 'APR',
    dateDay: '16',
    title: 'AI Infrastructure Summit',
    location: 'San Francisco, CA',
    attendees: '820 attending',
    isRegistered: true
  },
  {
    id: 'evt-2',
    dateMonth: 'APR',
    dateDay: '23',
    title: 'Venture Capital Outlook 2026',
    location: 'New York, NY',
    attendees: '612 attending',
    isRegistered: false
  },
  {
    id: 'evt-3',
    dateMonth: 'MAY',
    dateDay: '07',
    title: 'Climate Tech Investment Forum',
    location: 'London, UK',
    attendees: '438 attending',
    isRegistered: false
  }
];

export const SUGGESTED_CIRCLES = [
  { id: 'c-1', name: 'AI Operators', count: '2,481 members', isJoined: true },
  { id: 'c-2', name: 'Venture Investors', count: '1,932 members', isJoined: false },
  { id: 'c-3', name: 'C-Suite Network', count: '1,204 members', isJoined: false },
  { id: 'c-4', name: 'Global Expansion', count: '1,087 members', isJoined: false }
];

export const TRENDING_SECTORS = [
  { id: 's-1', rank: 1, name: 'AI / Machine Learning', momentum: 'up' },
  { id: 's-2', rank: 2, name: 'Climate & Sustainability', momentum: 'up' },
  { id: 's-3', rank: 3, name: 'Enterprise Software', momentum: 'up' },
  { id: 's-4', rank: 4, name: 'Healthtech & Biotech', momentum: 'up' },
  { id: 's-5', rank: 5, name: 'Fintech & Financial Services', momentum: 'up' }
];

export const INSIGHTS_FUNNEL_DATA = [
  { stage: 'Relevant Matches', count: 423, percent: 100 },
  { stage: 'Introductions Made', count: 218, percent: 51 },
  { stage: 'Accepted', count: 189, percent: 45 },
  { stage: 'Conversations', count: 122, percent: 29 },
  { stage: 'Opportunities', count: 48, percent: 11 }
];

export const ENGAGEMENT_TRENDS_DATA = [
  { month: 'Jan', messages: 68, meetings: 24, opportunities: 8 },
  { month: 'Feb', messages: 82, meetings: 32, opportunities: 12 },
  { month: 'Mar', messages: 95, meetings: 45, opportunities: 18 },
  { month: 'Apr', messages: 112, meetings: 52, opportunities: 22 },
  { month: 'May', messages: 128, meetings: 64, opportunities: 28 },
  { month: 'Jun', messages: 145, meetings: 75, opportunities: 34 },
  { month: 'Jul', messages: 160, meetings: 82, opportunities: 38 },
  { month: 'Aug', messages: 175, meetings: 91, opportunities: 42 },
  { month: 'Sep', messages: 194, meetings: 105, opportunities: 48 }
];
