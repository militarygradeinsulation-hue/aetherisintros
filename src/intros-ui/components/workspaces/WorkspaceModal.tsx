import React, { useState } from 'react';
import {
  X,
  Plus,
  CheckCircle2,
  Circle,
  Search,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Calendar,
  Clock,
  Briefcase,
  Users,
  Building,
  Mail,
  FileText,
  Sparkles,
  Play,
  RotateCcw,
  ExternalLink,
  Sliders,
  DollarSign,
  AlertTriangle,
  Folder,
} from 'lucide-react';
import {
  INITIAL_PEOPLE,
  INITIAL_COMPANIES,
  INITIAL_OPPORTUNITIES,
  INITIAL_TASKS,
  INITIAL_CALENDAR,
  INITIAL_MEETING,
  INITIAL_THREADS,
  INITIAL_SIGNALS,
  INITIAL_KNOWLEDGE_DOCS,
  INITIAL_INTROS,
  INITIAL_APPROVALS,
  INITIAL_MEMORIES,
  INITIAL_AUTOMATIONS,
  INITIAL_GRID_SHEET,
  INITIAL_CONNECTION_PATHS,
} from '../../dataStore';
import { SignalType, ActivityTask, Opportunity } from '../../types';

interface WorkspaceModalProps {
  activeTileId: string | null;
  onClose: () => void;
  onOpenApprovalQueue: () => void;
  pendingApprovalsCount: number;
}

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({
  activeTileId,
  onClose,
  onOpenApprovalQueue,
  pendingApprovalsCount,
}) => {
  // State for interactive workspaces
  const [tasks, setTasks] = useState<ActivityTask[]>(INITIAL_TASKS);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Opportunities state
  const [opportunities, setOpportunities] = useState<Opportunity[]>(INITIAL_OPPORTUNITIES);
  const [newOppTitle, setNewOppTitle] = useState('');
  const [newOppValue, setNewOppValue] = useState('');
  const [newOppStage, setNewOppStage] = useState<'Discovery' | 'Qualified' | 'Proposal' | 'Closed'>('Discovery');

  // Intros CRM state
  const [crmTab, setCrmTab] = useState<'people' | 'companies' | 'deals'>('people');
  const [crmSearch, setCrmSearch] = useState('');

  // Signals state
  const [activeSignalFilter, setActiveSignalFilter] = useState<SignalType | 'All'>('All');
  const [newSignalText, setNewSignalText] = useState('');
  const [newSignalType, setNewSignalType] = useState<SignalType>('Looking For');

  // Intros IQ state
  const [iqQuery, setIqQuery] = useState('');
  const [iqAnswers, setIqAnswers] = useState<Array<{ q: string; a: string; links: string[] }>>([
    {
      q: 'Who in my network knows LP allocators in London?',
      a: 'David Sterling (Benchmark Growth) holds direct relationships with 6 UK institutional allocators, including Phoenix Global and British Sovereign Trust. Warm intro path ready with 98% affinity.',
      links: ['David Sterling', 'Benchmark Growth', 'UK Sovereign Trust'],
    },
  ]);

  // Knowledge state
  const [selectedFolder, setSelectedFolder] = useState<string>('Company Briefs');

  // Introductions state
  const [introsList, setIntrosList] = useState(INITIAL_INTROS);

  // Digital You state
  const [draftGenerated, setDraftGenerated] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Growth Studio state
  const [growthTab, setGrowthTab] = useState<'Content' | 'Follow-ups' | 'Scripts' | 'Campaigns' | 'Signals' | 'Templates'>('Content');

  if (!activeTileId) return null;

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: ActivityTask = {
      id: `t-${Date.now()}`,
      title: newTaskTitle.trim(),
      dueDate: 'Today · End of day',
      completed: false,
      priority: 'high',
    };
    setTasks([newTask, ...tasks]);
    setNewTaskTitle('');
  };

  const handleAddOpportunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOppTitle.trim()) return;
    const val = parseInt(newOppValue.replace(/[^0-9]/g, '')) || 500000;
    const newOpp: Opportunity = {
      id: `opp-${Date.now()}`,
      title: newOppTitle.trim(),
      companyName: 'New Syndicate Deal',
      stage: newOppStage,
      value: val,
      currency: 'USD',
      closeProbability: newOppStage === 'Closed' ? 100 : 50,
      targetQuarter: 'Q4 2026',
      leadPerson: 'Elena Rostova',
    };
    setOpportunities([newOpp, ...opportunities]);
    setNewOppTitle('');
    setNewOppValue('');
  };

  const handleIqSubmit = (queryToRun?: string) => {
    const q = queryToRun || iqQuery;
    if (!q.trim()) return;

    let ans = '';
    let lk: string[] = [];

    if (q.toLowerCase().includes('satya') || q.toLowerCase().includes('microsoft')) {
      ans = 'Shortest path to Satya Nadella: You → David Sterling (Founding Partner, Benchmark) → Satya Nadella. David co-invested with Microsoft Ventures and has high mutual affinity.';
      lk = ['David Sterling', 'Satya Nadella', 'Benchmark Growth'];
    } else if (q.toLowerCase().includes('risk') || q.toLowerCase().includes('dormant')) {
      ans = 'Arthur Pendelton (SVP Strategy, Horizon Health) has not had a recorded touchpoint in 48 days. His hospital telemetry RFP is set for next quarter. Immediate follow-up draft is staged in Digital You.';
      lk = ['Arthur Pendelton', 'Horizon Health', 'Digital You Draft'];
    } else if (q.toLowerCase().includes('series b') || q.toLowerCase().includes('syndicate')) {
      ans = 'Elena Rostova (Apex Capital) and Marcus Vance (Vance Aerospace) are currently in active alignment on the $28M Series B syndicate cap. Meeting is set for today at 09:30.';
      lk = ['Elena Rostova', 'Marcus Vance', 'Vance Aerospace'];
    } else {
      ans = `Analyzing graph across 148 verified executive relationships... Found 3 relevant nodes and 1 active deal context matching "${q}". Suggested action: route context via Digital You with bilateral consent.`;
      lk = ['Elena Rostova', 'David Sterling', 'Aetheris Graph'];
    }

    setIqAnswers([{ q, a: ans, links: lk }, ...iqAnswers]);
    setIqQuery('');
  };

  const handleSendToApprovalQueue = (summary: string, fullDraft: string) => {
    setActionSuccessMessage('Action enqueued! All outbound messages pass through the Approval Queue.');
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="sys-tile w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-[rgba(255,255,255,0.12)] bg-[#0E1116] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between bg-[#07090C]/60">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-[#3D6BF2] uppercase font-bold">
              CAPABILITY WORKSPACE
            </span>
            <h1 className="font-serif-editorial text-xl sm:text-2xl text-[#F2EEE6] font-semibold">
              {activeTileId.replace(/-/g, ' ').toUpperCase()}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenApprovalQueue}
              className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#151922] border border-[#3D6BF2]/40 text-[#F2EEE6] hover:bg-[#3D6BF2]/20 flex items-center gap-1.5 transition-colors"
            >
              <ShieldCheck size={13} className="text-[#3D6BF2]" />
              <span>Approvals</span>
              {pendingApprovalsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#E5484D] text-white text-[9px] font-bold">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-[#F2EEE6] flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-[#3D6BF2]"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {actionSuccessMessage && (
          <div className="px-5 py-2.5 bg-[#3FB37F]/15 border-b border-[#3FB37F]/30 text-[#3FB37F] text-xs flex items-center gap-2">
            <CheckCircle2 size={14} />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* 1. RELATIONSHIP NETWORK */}
          {activeTileId === 'relationship-network' && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-[#151922] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80"
                    alt="Alex Carter"
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#3D6BF2]"
                  />
                  <div>
                    <h2 className="text-lg font-bold text-[#F2EEE6]">Alex Carter</h2>
                    <p className="text-sm text-[#F2EEE6]/60">
                      CEO · Horizon Partners
                    </p>
                    <div className="text-xs text-[#3FB37F] font-mono mt-1">
                      Active Leadership Alignment · 12 Mutual Bridges
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-mono font-bold text-[#3D6BF2]">
                    92
                  </div>
                  <div className="text-[10px] uppercase tracking-wider font-mono text-[#F2EEE6]/60">
                    Connection Score (0–100)
                  </div>
                </div>
              </div>

              {/* Connection Score Formula Card */}
              <div className="p-4 rounded-lg bg-black/40 border border-white/5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono uppercase text-[#F2EEE6]/70 tracking-wider">
                    Connection Score Formula Breakdown
                  </span>
                  <span className="text-[11px] font-mono text-[#3D6BF2]">
                    Recency (30%) + Frequency (25%) + Reciprocity (25%) + Mutuals (20%)
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded bg-[#151922] border border-white/5">
                    <div className="text-[#F2EEE6]/60 text-[10px]">RECENCY</div>
                    <div className="text-base font-bold text-[#F2EEE6]">94 / 100</div>
                  </div>
                  <div className="p-2.5 rounded bg-[#151922] border border-white/5">
                    <div className="text-[#F2EEE6]/60 text-[10px]">FREQUENCY</div>
                    <div className="text-base font-bold text-[#F2EEE6]">90 / 100</div>
                  </div>
                  <div className="p-2.5 rounded bg-[#151922] border border-white/5">
                    <div className="text-[#F2EEE6]/60 text-[10px]">RECIPROCITY</div>
                    <div className="text-base font-bold text-[#F2EEE6]">92 / 100</div>
                  </div>
                  <div className="p-2.5 rounded bg-[#151922] border border-white/5">
                    <div className="text-[#F2EEE6]/60 text-[10px]">MUTUALS</div>
                    <div className="text-base font-bold text-[#F2EEE6]">92 / 100</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. INTROS CRM */}
          {activeTileId === 'intros-crm' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center p-1 bg-black/40 rounded-lg border border-white/5 text-xs font-mono">
                  {(['people', 'companies', 'deals'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setCrmTab(tab)}
                      className={`px-3 py-1.5 rounded uppercase font-semibold transition-colors ${
                        crmTab === tab ? 'bg-[#3D6BF2] text-white' : 'text-[#F2EEE6]/60 hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-2.5 text-[#F2EEE6]/40" />
                  <input
                    type="text"
                    placeholder="Search records, domain, tags..."
                    value={crmSearch}
                    onChange={(e) => setCrmSearch(e.target.value)}
                    className="w-full bg-[#151922] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#F2EEE6] placeholder-[#F2EEE6]/40 focus:outline-none focus:border-[#3D6BF2]"
                  />
                </div>
              </div>

              {/* CRM View */}
              {crmTab === 'people' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {INITIAL_PEOPLE.filter((p) =>
                    p.name.toLowerCase().includes(crmSearch.toLowerCase()) ||
                    p.company.toLowerCase().includes(crmSearch.toLowerCase())
                  ).map((p) => (
                    <div key={p.id} className="sys-card-ivory p-3.5 rounded-lg shadow-sm flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-full object-cover" />
                        <div>
                          <div className="font-bold text-sm text-[#14161A]">{p.name}</div>
                          <div className="text-xs text-[#14161A]/75">{p.title}</div>
                          <div className="text-[11px] text-[#14161A]/60 mt-0.5">{p.company}</div>
                          <div className="text-[10px] text-[#3D6BF2] font-mono mt-1">{p.email}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-black/10 px-2 py-0.5 rounded text-[#14161A]">
                        Score {p.connectionScore}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {crmTab === 'companies' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {INITIAL_COMPANIES.map((c) => (
                    <div key={c.id} className="sys-card-ivory p-3.5 rounded-lg shadow-sm">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-sm text-[#14161A]">{c.name}</span>
                        <span className="text-xs font-mono font-semibold text-[#3D6BF2]">{c.valuation}</span>
                      </div>
                      <div className="text-xs text-[#14161A]/70 mt-1">{c.sector} · {c.stage}</div>
                      <p className="text-[11px] text-[#14161A]/80 mt-2 italic">{c.notes}</p>
                    </div>
                  ))}
                </div>
              )}

              {crmTab === 'deals' && (
                <div className="space-y-2">
                  {opportunities.map((opp) => (
                    <div key={opp.id} className="sys-card-ivory p-3.5 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-[#14161A]">{opp.title}</div>
                        <div className="text-xs text-[#14161A]/70">{opp.companyName} · Lead: {opp.leadPerson}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono font-bold text-[#14161A]">
                          ${(opp.value / 1000).toFixed(0)}K USD
                        </div>
                        <span className="text-[10px] font-mono uppercase bg-[#3D6BF2]/10 text-[#3D6BF2] px-2 py-0.5 rounded font-bold">
                          {opp.stage}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. OPPORTUNITIES */}
          {activeTileId === 'opportunities' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-[#151922] border border-white/5">
                <div>
                  <span className="text-xs font-mono uppercase text-[#F2EEE6]/60">Total Active Pipeline</span>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-[#F2EEE6] mt-0.5">
                    ${(opportunities.reduce((acc, o) => acc + o.value, 0) / 1000000).toFixed(2)}M USD
                  </div>
                </div>
                {/* Add Deal Form */}
                <form onSubmit={handleAddOpportunity} className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="New Deal Title..."
                    value={newOppTitle}
                    onChange={(e) => setNewOppTitle(e.target.value)}
                    className="bg-black/50 border border-white/10 rounded px-2.5 py-1.5 text-xs text-[#F2EEE6] focus:outline-none focus:border-[#3D6BF2]"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. 500000)..."
                    value={newOppValue}
                    onChange={(e) => setNewOppValue(e.target.value)}
                    className="w-28 bg-black/50 border border-white/10 rounded px-2.5 py-1.5 text-xs text-[#F2EEE6] focus:outline-none focus:border-[#3D6BF2]"
                  />
                  <select
                    value={newOppStage}
                    onChange={(e: any) => setNewOppStage(e.target.value)}
                    className="bg-black/50 border border-white/10 rounded px-2 py-1.5 text-xs text-[#F2EEE6]"
                  >
                    <option value="Discovery">Discovery</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Closed">Closed</option>
                  </select>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded bg-[#3D6BF2] text-white font-mono text-xs font-bold hover:bg-[#3D6BF2]/90 transition-colors"
                  >
                    + Add Deal
                  </button>
                </form>
              </div>

              {/* 4 Pipeline Stage Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {(['Discovery', 'Qualified', 'Proposal', 'Closed'] as const).map((stage) => {
                  const stageOpps = opportunities.filter((o) => o.stage === stage);
                  const stageTotal = stageOpps.reduce((acc, o) => acc + o.value, 0);
                  return (
                    <div key={stage} className="bg-[#151922] p-3 rounded-lg border border-white/5 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs font-mono font-bold uppercase text-[#F2EEE6]">{stage}</span>
                        <span className="text-xs font-mono text-[#F2EEE6]/60">
                          ${(stageTotal / 1000).toFixed(0)}K
                        </span>
                      </div>
                      <div className="space-y-2 min-h-[140px]">
                        {stageOpps.map((opp) => (
                          <div key={opp.id} className="sys-card-ivory p-2.5 rounded text-xs shadow-sm">
                            <div className="font-bold text-[#14161A] truncate">{opp.title}</div>
                            <div className="text-[11px] text-[#14161A]/70 truncate">{opp.companyName}</div>
                            <div className="flex items-center justify-between mt-2 pt-1 border-t border-black/5">
                              <span className="font-mono font-bold text-[#3D6BF2]">
                                ${(opp.value / 1000).toFixed(0)}K
                              </span>
                              <span className="text-[10px] text-[#14161A]/60 font-mono">
                                {opp.closeProbability}% Prob
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. AETHERIS GRID */}
          {activeTileId === 'aetheris-grid' && (
            <div className="space-y-4">
              <div className="bg-black/50 border border-white/10 rounded-lg p-2.5 flex items-center gap-3 font-mono text-xs">
                <span className="text-[#3D6BF2] font-bold">fx</span>
                <input
                  type="text"
                  readOnly
                  value="=SUM(Q3_SYNDICATE_COMMITS) * INTRO_AFFINITY_WEIGHT"
                  className="bg-transparent text-[#F2EEE6] flex-1 focus:outline-none"
                />
                <span className="text-[#3FB37F] font-bold">$4,800,000 USD</span>
              </div>

              {/* Full Interactive Table */}
              <div className="sys-card-ivory rounded-lg overflow-hidden shadow-lg font-mono text-xs">
                <div className="grid grid-cols-6 bg-black/10 px-4 py-2 font-bold uppercase text-[10px] tracking-wider text-[#14161A]/80 border-b border-black/10">
                  <span>Founder</span>
                  <span>Firm</span>
                  <span>Stage</span>
                  <span>Valuation</span>
                  <span>Status</span>
                  <span className="text-right">Conviction</span>
                </div>
                <div className="divide-y divide-black/5 text-[#14161A]">
                  {INITIAL_GRID_SHEET.map((row) => (
                    <div key={row.id} className="grid grid-cols-6 px-4 py-2.5 items-center hover:bg-black/5">
                      <span className="font-semibold truncate">{row.founder}</span>
                      <span className="truncate">{row.firm}</span>
                      <span className="opacity-80">{row.stage}</span>
                      <span className="font-bold">{row.valuation}</span>
                      <span className="text-[#3D6BF2] font-semibold">{row.introStatus}</span>
                      <span className="text-right font-bold text-[#14161A]">{row.conviction}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. SIGNALS */}
          {activeTileId === 'signals' && (
            <div className="space-y-5">
              {/* Standardized 8 intent chips */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setActiveSignalFilter('All')}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                    activeSignalFilter === 'All' ? 'bg-[#3D6BF2] text-white font-bold' : 'bg-[#151922] text-[#F2EEE6]/70'
                  }`}
                >
                  All (8)
                </button>
                {(
                  [
                    'Looking For',
                    'Offering',
                    'Capital',
                    'Talent',
                    'Partnership',
                    'Acquisition',
                    'Insight',
                    'Opportunity',
                  ] as SignalType[]
                ).map((sig) => (
                  <button
                    key={sig}
                    onClick={() => setActiveSignalFilter(sig)}
                    className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                      activeSignalFilter === sig ? 'bg-[#3D6BF2] text-white font-bold' : 'bg-[#151922] text-[#F2EEE6]/70'
                    }`}
                  >
                    {sig}
                  </button>
                ))}
              </div>

              {/* Signals feed */}
              <div className="space-y-3">
                {INITIAL_SIGNALS.filter(
                  (s) => activeSignalFilter === 'All' || s.type === activeSignalFilter
                ).map((sig) => (
                  <div key={sig.id} className="p-4 rounded-lg bg-[#151922] border border-white/5 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded bg-[#3D6BF2]/10 border border-[#3D6BF2]/30 text-[#3D6BF2] text-[10px] font-mono font-bold uppercase">
                          {sig.type}
                        </span>
                        <span className="text-xs font-semibold text-[#F2EEE6]">
                          {sig.actor} · {sig.role}, {sig.company}
                        </span>
                        <span className="text-[10px] font-mono text-[#F2EEE6]/40">{sig.timestamp}</span>
                      </div>
                      <p className="text-sm text-[#F2EEE6]/90 font-serif-editorial italic">
                        "{sig.headline}"
                      </p>
                    </div>
                    <button
                      onClick={() => handleSendToApprovalQueue(`Intro inquiry on signal: ${sig.headline}`, `Context draft to ${sig.actor}`)}
                      className="px-3 py-1.5 rounded bg-white/5 hover:bg-[#3D6BF2]/20 border border-white/10 text-xs font-mono text-[#F2EEE6] shrink-0"
                    >
                      Connect
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. CALENDAR */}
          {activeTileId === 'calendar' && (
            <div className="space-y-4">
              <div className="text-xs font-mono uppercase tracking-wider text-[#3D6BF2] font-bold">
                Today's Executive Engagements ({INITIAL_CALENDAR.length})
              </div>
              <div className="space-y-3">
                {INITIAL_CALENDAR.map((ev) => (
                  <div key={ev.id} className="p-4 rounded-lg bg-[#151922] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono text-[#F2EEE6]/60">
                        <Clock size={12} className="text-[#3D6BF2]" />
                        <span>{ev.time} ({ev.duration})</span>
                        <span>·</span>
                        <span>{ev.location}</span>
                      </div>
                      <h3 className="text-base font-bold text-[#F2EEE6] mt-1">{ev.title}</h3>
                      <p className="text-xs text-[#F2EEE6]/70 mt-1 italic">{ev.notes}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSendToApprovalQueue(`Pre-meeting brief for ${ev.linkedPerson}`, `Brief dossier for ${ev.title}`)}
                        className="px-3 py-1.5 rounded bg-[#3D6BF2] text-white text-xs font-mono font-bold hover:bg-[#3D6BF2]/90"
                      >
                        Prepare Dossier
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. MEETINGS */}
          {activeTileId === 'meetings' && (
            <div className="space-y-6">
              <div className="p-5 rounded-lg bg-[#151922] border border-[#3D6BF2]/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#3D6BF2] font-bold">
                      ACTIVE MEETING DOSSIER
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-[#F2EEE6] mt-0.5">
                      {INITIAL_MEETING.title}
                    </h2>
                    <span className="text-xs font-mono text-[#3FB37F]">{INITIAL_MEETING.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSendToApprovalQueue(`Meeting preparation dossier sent to delegates`, `Brief for ${INITIAL_MEETING.title}`)}
                      className="px-3.5 py-1.5 rounded bg-[#3D6BF2] text-white text-xs font-mono font-bold hover:bg-[#3D6BF2]/90"
                    >
                      Prepare me
                    </button>
                    <button
                      onClick={() => handleSendToApprovalQueue(`Meeting close memo & follow-up distribution`, `Decisions logged: Syndicate capped at $28M`)}
                      className="px-3.5 py-1.5 rounded bg-white/10 hover:bg-white/15 text-xs font-mono text-[#F2EEE6]"
                    >
                      Close the meeting
                    </button>
                  </div>
                </div>

                {/* Attendees */}
                <div>
                  <span className="text-xs font-mono uppercase text-[#F2EEE6]/60">Attendees</span>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {INITIAL_MEETING.attendees.map((att, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded bg-black/40 border border-white/5">
                        <img src={att.avatar} alt={att.name} className="w-6 h-6 rounded-full object-cover" />
                        <span className="text-xs text-[#F2EEE6] font-semibold">{att.name}</span>
                        <span className="text-[10px] font-mono text-[#3D6BF2] font-bold">({att.score})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decisions & Action items */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/5 text-xs font-mono">
                  <div>
                    <span className="text-[#F2EEE6]/60 uppercase block mb-1.5">Recorded Decisions</span>
                    <ul className="space-y-1 text-[#F2EEE6]">
                      {INITIAL_MEETING.decisions.map((d, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-[#3FB37F] font-bold">✓</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="text-[#F2EEE6]/60 uppercase block mb-1.5">Action Items</span>
                    <ul className="space-y-1 text-[#F2EEE6]">
                      {INITIAL_MEETING.actionItems.map((a, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-[#3D6BF2] font-bold">→</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 8. TASKS & WORK */}
          {activeTileId === 'tasks-work' && (
            <div className="space-y-5">
              <form onSubmit={handleAddTask} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Log high-stakes executive commitment..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 bg-[#151922] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F2EEE6] placeholder-[#F2EEE6]/40 focus:outline-none focus:border-[#3D6BF2]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#3D6BF2] text-white text-xs font-mono font-bold hover:bg-[#3D6BF2]/90 flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Add Task</span>
                </button>
              </form>

              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className="p-3 rounded-lg bg-[#151922] border border-white/5 flex items-start gap-3 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    {task.completed ? (
                      <CheckCircle2 size={16} className="text-[#3FB37F] shrink-0 mt-0.5" />
                    ) : (
                      <Circle size={16} className="text-[#F2EEE6]/40 hover:text-[#3D6BF2] shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className={`text-sm ${task.completed ? 'line-through text-[#F2EEE6]/40' : 'text-[#F2EEE6]'}`}>
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-[#F2EEE6]/50 mt-1">
                        <span>Due: {task.dueDate}</span>
                        {task.linkedPerson && (
                          <>
                            <span>·</span>
                            <span className="text-[#3D6BF2]">Linked: {task.linkedPerson}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. INBOX */}
          {activeTileId === 'inbox' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#151922] border border-white/5 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#3FB37F]" />
                  <span>Executive Thread Model: Active</span>
                </div>
                <span className="text-[#F2EEE6]/60">Gmail & Outlook Connector Synced</span>
              </div>

              <div className="space-y-3">
                {INITIAL_THREADS.map((th) => (
                  <div key={th.id} className="sys-card-ivory p-4 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={th.avatar} alt={th.sender} className="w-7 h-7 rounded-full object-cover" />
                        <div>
                          <span className="font-bold text-sm text-[#14161A]">{th.sender}</span>
                          <span className="text-xs text-[#14161A]/60 ml-2">({th.company})</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-[#14161A]/60">{th.timestamp}</span>
                    </div>
                    <div className="font-semibold text-xs text-[#14161A] mt-2">{th.subject}</div>
                    <p className="text-xs text-[#14161A]/80 mt-1">{th.preview}</p>
                    <div className="mt-3 pt-2 border-t border-black/10 flex justify-end">
                      <button
                        onClick={() => handleSendToApprovalQueue(`Reply to ${th.sender} on ${th.subject}`, `Draft reply staged for ${th.sender}`)}
                        className="px-3 py-1 rounded bg-[#3D6BF2] text-white text-xs font-mono font-bold hover:bg-[#3D6BF2]/90"
                      >
                        Draft Reply (Digital You)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 10. KNOWLEDGE */}
          {activeTileId === 'knowledge' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {[
                  'Company Briefs',
                  'Meeting Notes',
                  'Research & Insights',
                  'Documents',
                  'Playbooks',
                  'Saved Content',
                ].map((f) => (
                  <button
                    key={f}
                    onClick={() => setSelectedFolder(f)}
                    className={`p-2 rounded text-center text-xs font-mono transition-colors ${
                      selectedFolder === f
                        ? 'bg-[#3D6BF2] text-white font-bold'
                        : 'bg-[#151922] text-[#F2EEE6]/70 hover:bg-white/5'
                    }`}
                  >
                    <Folder size={14} className="mx-auto mb-1" />
                    <span className="truncate block">{f}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {INITIAL_KNOWLEDGE_DOCS.filter(
                  (d) => d.folder === selectedFolder || selectedFolder === 'Company Briefs'
                ).map((doc) => (
                  <div key={doc.id} className="p-4 rounded-lg bg-[#151922] border border-white/5">
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-sm font-bold text-[#F2EEE6]">{doc.title}</h3>
                      <span className="text-[10px] font-mono text-[#F2EEE6]/50">{doc.dateAdded} · {doc.size}</span>
                    </div>
                    <p className="text-xs text-[#F2EEE6]/70 mt-1.5">{doc.excerpt}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 11. RELATIONSHIP RADAR */}
          {activeTileId === 'relationship-radar' && (
            <div className="space-y-5">
              <div className="p-4 rounded-lg bg-[#151922] border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono uppercase text-[#F2EEE6]/60">Standardized 5-Bucket Weather Model</span>
                  <div className="text-sm text-[#F2EEE6] font-semibold mt-0.5">
                    Predictive cadence & touchpoint drift alerts
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded bg-[#3FB37F]/10 text-[#3FB37F] font-mono text-xs font-bold">
                  66 Monitored Principals
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {[
                  { key: 'hot', name: 'Hot Now', count: 8, color: '#3FB37F', desc: '< 7d touchpoint' },
                  { key: 'emerging', name: 'Emerging', count: 14, color: '#F2A93B', desc: 'Accelerating affinity' },
                  { key: 'strategic', name: 'Strategic', count: 29, color: '#3D6BF2', desc: 'Core institutional bridge' },
                  { key: 'dormant', name: 'Dormant', count: 12, color: '#64748B', desc: '> 30d gap' },
                  { key: 'at_risk', name: 'At Risk', count: 3, color: '#E5484D', desc: 'Critical pending deal' },
                ].map((b) => (
                  <div key={b.key} className="bg-[#151922] p-3 rounded-lg border border-white/5 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold" style={{ color: b.color }}>
                        {b.name}
                      </span>
                      <span className="text-base font-mono font-bold text-[#F2EEE6]">{b.count}</span>
                    </div>
                    <div className="text-[10px] text-[#F2EEE6]/50">{b.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 12. CONNECTION PATHS */}
          {activeTileId === 'connection-paths' && (
            <div className="space-y-5">
              <div className="p-5 rounded-lg bg-[#151922] border border-[#3D6BF2]/30 space-y-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#3D6BF2] font-bold">
                  DISCOVERED SHORTEST WARM PATH
                </span>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-black/40 rounded-lg">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-[#3D6BF2] text-white flex items-center justify-center font-bold text-sm mx-auto">
                      YOU
                    </div>
                    <div className="text-xs font-semibold text-[#F2EEE6] mt-1">Chief Executive</div>
                  </div>
                  <ArrowRight size={20} className="text-[#3D6BF2] rotate-90 sm:rotate-0" />
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-[#151922] border-2 border-[#3D6BF2] text-[#F2EEE6] flex items-center justify-center font-bold text-xs mx-auto">
                      DS
                    </div>
                    <div className="text-xs font-semibold text-[#F2EEE6] mt-1">David Sterling</div>
                    <div className="text-[10px] text-[#3D6BF2]">Benchmark Growth GP</div>
                  </div>
                  <ArrowRight size={20} className="text-[#3D6BF2] rotate-90 sm:rotate-0" />
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-[#F4F1EA] text-[#14161A] flex items-center justify-center font-bold text-sm mx-auto">
                      SN
                    </div>
                    <div className="text-xs font-semibold text-[#F2EEE6] mt-1">Satya Nadella</div>
                    <div className="text-[10px] text-[#F2EEE6]/60">Microsoft CEO</div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="text-xs font-mono text-[#3FB37F] font-bold">
                    Path Strength: 98% (2 Degrees)
                  </div>
                  <button
                    onClick={() => handleSendToApprovalQueue('Request warm intro to Satya Nadella via David Sterling', 'Bilateral memo to David Sterling')}
                    className="px-4 py-2 rounded bg-[#3D6BF2] text-white text-xs font-mono font-bold hover:bg-[#3D6BF2]/90"
                  >
                    Request Warm Intro
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 13. INTROS IQ */}
          {activeTileId === 'intros-iq' && (
            <div className="space-y-5">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask Intros IQ across your relationship graph..."
                  value={iqQuery}
                  onChange={(e) => setIqQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleIqSubmit()}
                  className="flex-1 bg-[#151922] border border-white/10 rounded-lg px-4 py-2.5 text-xs text-[#F2EEE6] focus:outline-none focus:border-[#3D6BF2]"
                />
                <button
                  onClick={() => handleIqSubmit()}
                  className="px-4 py-2.5 rounded-lg bg-[#3D6BF2] text-white text-xs font-mono font-bold hover:bg-[#3D6BF2]/90 flex items-center gap-1.5"
                >
                  <Search size={14} />
                  <span>Query</span>
                </button>
              </div>

              {/* 5 Starter prompts */}
              <div>
                <span className="text-[10px] font-mono uppercase text-[#F2EEE6]/60 block mb-2">
                  Standardized Starter Queries
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Who can introduce me to Satya Nadella?',
                    'Which portfolio companies need Series B syndicate leads?',
                    'Highlight relationships at risk (>30 days dormant)',
                    'List co-investors with open capital signals',
                    'Summarize yesterday’s dinner notes with Elena',
                  ].map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleIqSubmit(p)}
                      className="px-3 py-1.5 rounded-lg bg-[#151922] hover:bg-white/10 border border-white/5 text-xs text-[#F2EEE6]/80 text-left transition-colors"
                    >
                      “{p}”
                    </button>
                  ))}
                </div>
              </div>

              {/* Answers */}
              <div className="space-y-3 pt-3">
                {iqAnswers.map((item, i) => (
                  <div key={i} className="p-4 rounded-lg bg-[#151922] border border-white/5 space-y-2">
                    <div className="text-xs font-mono text-[#3D6BF2] font-semibold">Q: {item.q}</div>
                    <div className="text-xs text-[#F2EEE6] leading-relaxed font-serif-editorial text-sm">
                      {item.a}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#F2EEE6]/50 pt-1">
                      <span>Graph Citations:</span>
                      {item.links.map((lk, j) => (
                        <span key={j} className="text-[#3D6BF2] underline cursor-pointer">
                          {lk}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 14. NETWORK FORENSICS */}
          {activeTileId === 'network-forensics' && (
            <div className="space-y-5">
              <div className="p-4 rounded-lg bg-[#E5484D]/10 border border-[#E5484D]/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono uppercase text-[#E5484D] font-bold">
                    Forensic Leak Audit Complete
                  </span>
                  <div className="text-sm text-[#F2EEE6] mt-0.5">
                    $1,400,000 USD at-risk capital identified with verified row evidence.
                  </div>
                </div>
                <span className="text-xs font-mono px-3 py-1 rounded bg-[#E5484D] text-white font-bold">
                  Rule AGENTS.md Compliant
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-[#151922] border border-white/5">
                  <div className="text-[#F2EEE6]/60">DORMANT CONTACTS</div>
                  <div className="text-xl font-bold text-[#F2A93B] mt-1">24 Executives</div>
                </div>
                <div className="p-3 rounded-lg bg-[#151922] border border-white/5">
                  <div className="text-[#F2EEE6]/60">MISSED FOLLOW-UPS</div>
                  <div className="text-xl font-bold text-[#E5484D] mt-1">5 Critical</div>
                </div>
                <div className="p-3 rounded-lg bg-[#151922] border border-white/5">
                  <div className="text-[#F2EEE6]/60">UNFINISHED INTROS</div>
                  <div className="text-xl font-bold text-[#3D6BF2] mt-1">3 Stalled</div>
                </div>
                <div className="p-3 rounded-lg bg-[#151922] border border-white/5">
                  <div className="text-[#F2EEE6]/60">AT-RISK OPPORTUNITIES</div>
                  <div className="text-xl font-bold text-[#E5484D] mt-1">2 Deals</div>
                </div>
              </div>
            </div>
          )}

          {/* 15. DIGITAL YOU */}
          {activeTileId === 'digital-you' && (
            <div className="space-y-5">
              <div className="p-4 rounded-lg bg-[#151922] border border-white/5 flex items-center gap-4">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80"
                  alt="CEO Twin"
                  className="w-14 h-14 rounded-full border-2 border-[#3D6BF2] object-cover"
                />
                <div>
                  <h3 className="text-base font-bold text-[#F2EEE6]">Executive Digital Twin</h3>
                  <p className="text-xs text-[#F2EEE6]/60">
                    Strict Gate: Outbound actions never send without explicit approval queue sign-off.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  'Draft in my style',
                  'Represent my interests',
                  'Prepare for my meeting',
                  'Find opportunities',
                  'Take action (Queue)',
                ].map((act, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendToApprovalQueue(`Digital You action: ${act}`, `Synthesized executive representation for ${act}`)}
                    className="p-3.5 rounded-lg bg-[#151922] hover:bg-white/5 border border-white/5 text-left flex items-center justify-between group"
                  >
                    <span className="text-xs font-semibold text-[#F2EEE6] group-hover:text-[#3D6BF2]">
                      {act}
                    </span>
                    <span className="text-[10px] font-mono text-[#3D6BF2] uppercase font-bold">
                      Route →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 16. AUTOMATIONS */}
          {activeTileId === 'automations' && (
            <div className="space-y-5">
              <div className="p-4 rounded-lg bg-[#151922] border border-white/5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#3D6BF2] font-bold block mb-1">
                  4-STEP VISUAL RULE BUILDER
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-mono mt-3">
                  <div className="p-2.5 rounded bg-black/40 border border-white/5">
                    <span className="text-[#3D6BF2] font-bold block">1. Trigger</span>
                    <span className="text-[#F2EEE6] mt-0.5 block">New Meeting</span>
                  </div>
                  <div className="p-2.5 rounded bg-black/40 border border-white/5">
                    <span className="text-[#3D6BF2] font-bold block">2. Filter</span>
                    <span className="text-[#F2EEE6] mt-0.5 block">Tier 1 CEO</span>
                  </div>
                  <div className="p-2.5 rounded bg-black/40 border border-white/5">
                    <span className="text-[#3D6BF2] font-bold block">3. Action</span>
                    <span className="text-[#F2EEE6] mt-0.5 block">Generate Brief</span>
                  </div>
                  <div className="p-2.5 rounded bg-black/40 border border-white/5">
                    <span className="text-[#3D6BF2] font-bold block">4. Follow-up</span>
                    <span className="text-[#F2EEE6] mt-0.5 block">Schedule Check</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs font-mono uppercase text-[#F2EEE6]/60 block mb-2">
                  Active Rules ({INITIAL_AUTOMATIONS.length})
                </span>
                <div className="space-y-2">
                  {INITIAL_AUTOMATIONS.map((r) => (
                    <div key={r.id} className="p-3 rounded-lg bg-[#151922] border border-white/5 flex items-center justify-between text-xs font-mono">
                      <div>
                        <div className="font-bold text-[#F2EEE6]">{r.trigger}</div>
                        <div className="text-[11px] text-[#F2EEE6]/60 mt-0.5">
                          {r.relationshipCondition} → {r.action}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#3FB37F] px-2 py-0.5 rounded bg-[#3FB37F]/10">
                        {r.executionsCount} fired
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 17. ANALYTICS */}
          {activeTileId === 'analytics' && (
            <div className="space-y-6">
              <div className="p-5 rounded-lg bg-[#151922] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono uppercase text-[#F2EEE6]/60">Relationship ROI</span>
                  <div className="text-3xl font-mono font-bold text-[#3FB37F]">+342%</div>
                  <p className="text-xs text-[#F2EEE6]/60 mt-1">
                    Attribution Model: 4 closed enterprise contracts directly originating from warm double opt-in intros.
                  </p>
                </div>
                <div className="text-right font-mono text-xs text-[#F2EEE6]/70">
                  <div>Attributed Closed Value: <span className="font-bold text-[#F2EEE6]">$2.55M</span></div>
                  <div>Introductions Multiplier: <span className="font-bold text-[#3D6BF2]">4.8x</span></div>
                </div>
              </div>

              {/* Monthly Bar Chart */}
              <div className="p-4 rounded-lg bg-black/40 border border-white/5">
                <span className="text-xs font-mono uppercase text-[#F2EEE6]/60 block mb-3">
                  Monthly Network Revenue Velocity
                </span>
                <div className="h-36 flex items-end gap-3 px-2">
                  {[35, 48, 62, 58, 85, 100].map((val, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <span className="text-[10px] font-mono text-[#F2EEE6]/60">{val}%</span>
                      <div
                        className={`w-full rounded-t transition-all ${
                          i === 5 ? 'bg-[#3D6BF2]' : 'bg-[#3D6BF2]/50'
                        }`}
                        style={{ height: `${val}%` }}
                      />
                      <span className="text-[10px] font-mono text-[#F2EEE6]/50">
                        {['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 18. COMPANY INTELLIGENCE */}
          {activeTileId === 'company-intelligence' && (
            <div className="space-y-5">
              <div className="p-4 rounded-lg bg-[#151922] border border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#F2EEE6]">Stripe Global Network</h3>
                  <span className="text-xs text-[#3D6BF2] font-mono">Valuation: $70B · Pre-IPO</span>
                </div>
                <button
                  onClick={() => handleSendToApprovalQueue('Request strategic briefing on Stripe', 'Brief generation enqueued')}
                  className="px-3.5 py-1.5 rounded bg-[#3D6BF2] text-white text-xs font-mono font-bold"
                >
                  Generate Dossier
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                {[
                  { title: 'Overview', text: 'Financial infrastructure suite used by 80% of top decile startups.' },
                  { title: 'Executives', text: 'Patrick & John Collison, CFO, Head of Strategic M&A.' },
                  { title: 'Relationships', text: 'Direct warm path available through David Sterling (GP).' },
                  { title: 'Signals', text: '9 active signals scouting identity and relationship intelligence.' },
                  { title: 'Opportunities', text: '$750K open executive intelligence platform license.' },
                  { title: 'News & Insights', text: 'Preparing liquidity framework for late 2026/early 2027.' },
                ].map((sec, i) => (
                  <div key={i} className="p-3 rounded bg-[#151922] border border-white/5 space-y-1">
                    <span className="text-[#3D6BF2] font-bold block">{sec.title}</span>
                    <p className="text-[11px] text-[#F2EEE6]/70 leading-relaxed font-sans">{sec.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 19. INTRODUCTIONS */}
          {activeTileId === 'introductions' && (
            <div className="space-y-5">
              <div className="p-4 rounded-lg bg-[#151922] border border-white/5">
                <span className="text-xs font-mono uppercase text-[#3D6BF2] font-bold block mb-1">
                  4-STEP BILATERAL INTRO STATE MACHINE
                </span>
                <p className="text-xs text-[#F2EEE6]/70">
                  Every intro requires verified double opt-in before contact details or meeting slots are exchanged.
                </p>
              </div>

              <div className="space-y-3">
                {introsList.map((intr) => (
                  <div key={intr.id} className="p-4 rounded-lg bg-[#151922] border border-white/5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <img src={intr.partyA.avatar} alt={intr.partyA.name} className="w-8 h-8 rounded-full object-cover" />
                        <span className="text-xs font-bold text-[#F2EEE6]">{intr.partyA.name}</span>
                        <span className="text-xs text-[#3D6BF2] font-mono">↔</span>
                        <img src={intr.partyB.avatar} alt={intr.partyB.name} className="w-8 h-8 rounded-full object-cover" />
                        <span className="text-xs font-bold text-[#F2EEE6]">{intr.partyB.name}</span>
                      </div>
                      <span className="text-xs font-mono text-[#3FB37F] font-bold">{intr.statusLabel}</span>
                    </div>
                    <p className="text-xs text-[#F2EEE6]/80 italic">"{intr.context}"</p>

                    {/* 4 Steps progress */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-[11px] font-mono">
                      {[
                        '1. Context Shared',
                        '2. Both Interested',
                        '3. Meeting Scheduled',
                        '4. Handoff Complete',
                      ].map((stepName, sIdx) => {
                        const isDone = intr.stage > sIdx + 1;
                        const isCurrent = intr.stage === sIdx + 1;
                        return (
                          <div
                            key={sIdx}
                            className={`p-1.5 rounded text-center ${
                              isDone
                                ? 'bg-[#3FB37F]/15 text-[#3FB37F] font-bold'
                                : isCurrent
                                ? 'bg-[#3D6BF2]/20 text-[#3D6BF2] font-bold border border-[#3D6BF2]'
                                : 'bg-black/20 text-[#F2EEE6]/40'
                            }`}
                          >
                            {stepName}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 20. RELATIONSHIP MEMORY */}
          {activeTileId === 'relationship-memory' && (
            <div className="space-y-4">
              <div className="text-xs font-mono uppercase tracking-wider text-[#3D6BF2] font-bold">
                Chronological Memory Ledger · Elena Rostova
              </div>
              <div className="space-y-3 pl-4 border-l-2 border-[#3D6BF2]/30">
                {INITIAL_MEMORIES.map((m) => (
                  <div key={m.id} className="relative pl-3">
                    <span className="absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#3D6BF2]" />
                    <span className="text-xs font-mono text-[#3D6BF2]">{m.date} · {m.personName}</span>
                    <h4 className="text-sm font-bold text-[#F2EEE6] mt-0.5">{m.title}</h4>
                    <p className="text-xs text-[#F2EEE6]/70 mt-1">{m.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 21. TEAM GRAPH */}
          {activeTileId === 'team-graph' && (
            <div className="space-y-5">
              <div className="p-4 rounded-lg bg-[#151922] border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono uppercase text-[#F2EEE6]/60">Multi-seat Firm Topology</span>
                  <div className="text-sm text-[#F2EEE6] font-bold mt-0.5">
                    4 Partner Seats · 18 Cross-Firm Relationship Edges
                  </div>
                </div>
                <button
                  onClick={() => handleSendToApprovalQueue('Invite Partner Seat to Team Graph', 'Invite token staged')}
                  className="px-3.5 py-1.5 rounded bg-[#3D6BF2] text-white text-xs font-mono font-bold"
                >
                  + Add Seat
                </button>
              </div>

              <div className="p-4 rounded-lg bg-black/40 border border-white/5 space-y-3">
                <span className="text-xs font-mono uppercase text-[#3D6BF2] font-bold">
                  Zero-Conflict Partner Overlap Matrix
                </span>
                <div className="space-y-2 text-xs font-mono text-[#F2EEE6]">
                  <div className="flex justify-between p-2 rounded bg-[#151922]">
                    <span>Partner A (You) → Elena Rostova (Apex)</span>
                    <span className="text-[#3FB37F] font-bold">Primary Lead</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-[#151922]">
                    <span>Partner B → Marcus Vance (Vance Aero)</span>
                    <span className="text-[#3D6BF2] font-bold">Active Co-Lead</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-[#151922]">
                    <span>Partner C → Nordic Sovereign Tech</span>
                    <span className="text-[#F2A93B] font-bold">Secondary Sync</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 22. DIAGNOSTICS */}
          {activeTileId === 'diagnostics' && (
            <div className="space-y-5">
              <div className="p-5 rounded-lg bg-[#151922] border border-[#3FB37F]/30 space-y-3">
                <div className="flex items-center gap-2 text-[#3FB37F] font-bold text-sm">
                  <ShieldCheck size={18} />
                  <span>Forensic Scan Complete · Executive Golden Report Ready</span>
                </div>
                <p className="text-xs text-[#F2EEE6]/80 leading-relaxed font-serif-editorial text-sm">
                  Systemic audit across 148 people and 42 companies indicates a 94th percentile network cohesion.
                  Immediate priority: reconnect with Arthur Pendelton before Horizon Health’s Q4 procurement lock.
                </p>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleSendToApprovalQueue('Download Golden Report PDF', 'Golden report exported')}
                    className="px-4 py-2 rounded bg-[#3FB37F] text-black text-xs font-mono font-bold hover:bg-[#3FB37F]/90"
                  >
                    View Full Golden Report
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 23. GROWTH STUDIO */}
          {activeTileId === 'growth-studio' && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2 border-b border-white/5 pb-2">
                {(['Content', 'Follow-ups', 'Scripts', 'Campaigns', 'Signals', 'Templates'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setGrowthTab(tab)}
                    className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                      growthTab === tab ? 'bg-[#3D6BF2] text-white font-bold' : 'text-[#F2EEE6]/60 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="sys-card-ivory p-5 rounded-lg space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#14161A]/60">
                    Draft Prepared from Relationship Records
                  </span>
                  <span className="text-[10px] font-mono uppercase bg-[#3D6BF2]/10 text-[#3D6BF2] px-2 py-0.5 rounded font-bold">
                    Pending Approval
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#14161A]">Quarterly LP Letter v3</h3>
                <p className="text-xs text-[#14161A]/85 leading-relaxed">
                  Synthesized directly from Fund V mandate notes and the 18 allocator insights captured at Benchmark’s dinner. Focuses on private sovereign capital allocation to resilient deep tech assets.
                </p>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleSendToApprovalQueue('Quarterly LP Letter v3 enqueued for review', 'LP letter ready in queue')}
                    className="px-4 py-2 rounded bg-[#3D6BF2] text-white text-xs font-mono font-bold hover:bg-[#3D6BF2]/90"
                  >
                    Send to Approval Queue
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 24. EXECUTIVE BRIEF */}
          {activeTileId === 'executive-brief' && (
            <div className="space-y-5">
              <div className="p-4 rounded-lg bg-[#151922] border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#3D6BF2] font-bold">
                    TODAY'S 07:30 SYNTHESIS
                  </span>
                  <h3 className="text-lg font-bold text-[#F2EEE6] mt-0.5">Morning Executive Audio & Memo</h3>
                </div>
                <button
                  onClick={() => handleSendToApprovalQueue('Audio synthesis preview requested', 'Audio synthesis generated')}
                  className="px-3.5 py-1.5 rounded bg-[#3D6BF2] text-white text-xs font-mono font-bold flex items-center gap-1.5"
                >
                  <Play size={13} />
                  <span>Listen (2m 14s)</span>
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-lg bg-black/40 border border-white/5 flex items-start gap-2.5">
                  <span className="text-[#E5484D] font-bold text-sm shrink-0">!</span>
                  <div>
                    <span className="font-bold text-[#F2EEE6]">3 Relationships Needing Attention:</span>
                    <span className="text-[#F2EEE6]/70 ml-1">
                      Arthur Pendelton (Horizon Health, 48d gap), Nordic legal review, Vance engineering appendix.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-white/5 flex items-start gap-2.5">
                  <span className="text-[#3FB37F] font-bold text-sm shrink-0">↑</span>
                  <div>
                    <span className="font-bold text-[#F2EEE6]">2 Opportunities Changed:</span>
                    <span className="text-[#F2EEE6]/70 ml-1">
                      Apex Capital syndicate qualified at $1.4M; Vance Aerospace proposal advanced to $1.8M.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-white/5 flex items-start gap-2.5">
                  <span className="text-[#3D6BF2] font-bold text-sm shrink-0">↔</span>
                  <div>
                    <span className="font-bold text-[#F2EEE6]">1 Intro Ready:</span>
                    <span className="text-[#F2EEE6]/70 ml-1">
                      Satya Nadella introduction via David Sterling cleared bilateral intent check.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
