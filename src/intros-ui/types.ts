export interface Person {
  id: string;
  name: string;
  title: string;
  company: string;
  avatar: string;
  connectionScore: number; // 0 to 100
  scoreBreakdown: {
    recency: number; // 0-100
    frequency: number; // 0-100
    reciprocity: number; // 0-100
    mutuals: number; // 0-100
  };
  mutualsCount: number;
  mutualAvatars: string[];
  radarBucket: 'hot' | 'emerging' | 'strategic' | 'dormant' | 'at_risk';
  engagement?: 'active' | 'dormant' | 'followup';
  tier?: 'inner_circle' | 'strategic' | 'network';
  tags?: string[];
  email: string;
  phone?: string;
  notes?: string;
  lastTouchpoint: string;
  touchpointType: 'Meeting' | 'Dinner' | 'Call' | 'Email' | 'Intro';
}

export interface Company {
  id: string;
  name: string;
  domain: string;
  valuation: string;
  stage: string;
  sector: string;
  executivesCount: number;
  openOpportunitiesValue: number;
  signalsCount: number;
  warmPathAvailable: boolean;
  notes: string;
}

export interface Opportunity {
  id: string;
  title: string;
  companyName: string;
  stage: 'Discovery' | 'Qualified' | 'Proposal' | 'Closed';
  value: number; // USD
  currency: string;
  attributedIntroId?: string;
  closeProbability: number;
  targetQuarter: string;
  leadPerson: string;
}

export interface ActivityTask {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  linkedPerson?: string;
  linkedCompany?: string;
}

export interface CalendarEvent {
  id: string;
  time: string;
  duration: string;
  title: string;
  linkedPerson: string;
  company: string;
  location: string;
  notes: string;
  attendees: Array<{ name: string; title: string; avatar?: string }>;
  isPriority?: boolean;
  priorityCategory?: 'Board Mandate' | 'Syndicate Terms' | 'LP Allocation' | 'Strategic Partnership' | 'General';
  meetingDate?: string;
}

export interface MeetingDossier {
  id: string;
  title: string;
  time: string;
  attendees: Array<{ name: string; title: string; avatar: string; score: number }>;
  notesCount: number;
  decisions: string[];
  actionItems: string[];
  followups: string[];
  status: 'upcoming' | 'in_progress' | 'closed';
}

export interface MessageThread {
  id: string;
  sender: string;
  company: string;
  avatar: string;
  subject: string;
  preview: string;
  timestamp: string;
  type: 'email' | 'message';
  unread: boolean;
  strategicWeight: 'high' | 'medium' | 'low';
}

export type SignalType =
  | 'Looking For'
  | 'Offering'
  | 'Capital'
  | 'Talent'
  | 'Partnership'
  | 'Acquisition'
  | 'Insight'
  | 'Opportunity';

export interface SignalItem {
  id: string;
  type: SignalType;
  actor: string;
  role: string;
  company: string;
  headline: string;
  timestamp: string;
  matchScore: number;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  folder: 'Company Briefs' | 'Meeting Notes' | 'Research & Insights' | 'Documents' | 'Playbooks' | 'Saved Content';
  dateAdded: string;
  excerpt: string;
  size: string;
}

export interface ConnectionPathItem {
  targetId: string;
  targetName: string;
  targetTitle: string;
  targetCompany: string;
  connectorName: string;
  connectorTitle: string;
  pathStrength: number; // 0-100%
  degrees: number;
}

export interface ApprovalAction {
  id: string;
  originTile: string;
  actionType: 'Send Email' | 'Forward Intro' | 'Publish Script' | 'Execute Autopilot';
  recipient: string;
  summary: string;
  fullDraft: string;
  status: 'pending' | 'approved' | 'rejected';
  createdTime: string;
}

export interface IntroRecord {
  id: string;
  partyA: { name: string; title: string; company: string; avatar: string };
  partyB: { name: string; title: string; company: string; avatar: string };
  stage: 1 | 2 | 3 | 4; // 1: Context Shared, 2: Both Parties Interested, 3: Meeting Scheduled, 4: Handoff Complete
  statusLabel: string;
  context: string;
  updatedAt: string;
}

export interface MemoryEvent {
  id: string;
  personName: string;
  date: string;
  title: string;
  description: string;
  type: 'meeting' | 'deal' | 'intro' | 'milestone';
  sentiment: 'positive' | 'neutral';
}

export interface EngagementData {
  date: string;
  value: number;
}

export interface RuleAutomation {
  id: string;
  trigger: string;
  relationshipCondition: string;
  action: string;
  followUp: string;
  active: boolean;
  executionsCount: number;
}

export interface ExecutiveNewsItem {
  id: string;
  title: string;
  source: string;
  date: string;
  category: 'M&A' | 'Funding' | 'Regulatory' | 'Leadership' | 'Strategic Partnership' | 'Market Insight';
  summary: string;
  url?: string;
  sentiment: 'bullish' | 'neutral' | 'watch';
}

export interface ExecutiveIntelligenceDossier {
  personId: string;
  personName: string;
  title: string;
  company: string;
  avatar: string;
  bio: string;
  currentFocus: string;
  keyPriorities: string[];
  sharedConnections: number;
  activeDealsCount: number;
  pipelineExposure: number;
  recentNews: ExecutiveNewsItem[];
  recommendedAction: string;
  lastTouchpoint: string;
  engagement: 'active' | 'dormant' | 'followup';
  connectionScore: number;
}

export interface ActionableTaskItem {
  id: string;
  sourceTile: string;
  sourceTileTitle: string;
  title: string;
  description?: string;
  type: 'commitment' | 'approval' | 'meeting_prep' | 'intro_optin' | 'followup_drift';
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  completed: boolean;
  linkedPerson?: string;
  linkedCompany?: string;
  actionLabel?: string;
}

export interface GraphNode {
  id: string;
  name: string;
  title: string;
  company: string;
  avatar?: string;
  cluster: 'capital' | 'aerospace' | 'sovereign' | 'ai_deeptech' | 'enterprise';
  clusterLabel: string;
  connectionScore: number;
  engagement: 'active' | 'dormant' | 'followup';
  val: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  strength: number;
  relationshipType: 'syndicate' | 'trusted_peer' | 'portfolio' | 'mandate' | 'advisory';
}

export interface StructuredMeetingNote {
  id: string;
  personId: string;
  title: string;
  category: 'meeting_minutes' | 'tactical_note' | 'deal_memo' | 'action_items';
  content: string;
  createdAt: string;
  tags?: string[];
  actionItems?: string[];
}

export interface TileSummary<T = any> {
  tileId: string;
  title: string;
  caption: [string, string];
  empty: boolean;
  next_action?: string;
  data: T;
}
