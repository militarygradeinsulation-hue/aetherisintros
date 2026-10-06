// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  ArrowRight,
  ArrowUpDown,
  Calendar,
  Download,
  User,
  CheckCircle2,
  Sparkles,
  Zap,
  Keyboard,
  Clock,
  AlertTriangle,
  Share2,
  CheckSquare,
  LayoutGrid,
  FileText,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { Person } from '../types';
import { SortMode } from '../utils/reportExport';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTile: (tileId: string) => void;
  people?: Person[];
  sortMode?: SortMode;
  onSortChange?: (mode: SortMode) => void;
  onScanCalendar?: () => void;
  onDownloadReport?: () => void;
  onSwitchView?: (view: 'grid' | 'inbox' | 'graph' | 'heatmap') => void;
  onSelectPerson?: (person: Person) => void;
  onOpenCheatSheet?: () => void;
  onOpenPredictiveInsights?: () => void;
  onOpenFullTextSearch?: () => void;
}

interface PredictedActionItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Predicted Action' | 'Recent Activity Match' | 'Syndicate Bridge' | 'Drift Alert' | 'System View';
  badge: string;
  confidence: number;
  score: number;
  type: 'action' | 'person' | 'view' | 'tool';
  person?: Person;
  run: () => void;
}

const MODULES = [
  { id: 'view-inbox', title: 'View: Actionable Inbox', desc: 'Central queue of all pending executive tasks, commitments & approvals', view: 'inbox' },
  { id: 'view-graph', title: 'View: Network Relationship Graph', desc: 'Interactive D3 force-directed visual clustering across venture syndicates', view: 'graph' },
  { id: 'view-heatmap', title: 'View: Cluster Engagement Density Heatmap', desc: 'Color-coded matrix of professional clusters by interaction cadence and syndicate exposure', view: 'heatmap' },
  { id: 'view-grid', title: 'View: Intelligence Grid', desc: 'The 24-tile comprehensive executive relationship architecture', view: 'grid' },
  { id: 'relationship-network', title: 'Relationship Network', desc: 'Top relationship Elena Rostova, connection score formula' },
  { id: 'intros-crm', title: 'Intros CRM', desc: 'People, Companies, Deals directory on ivory cards' },
  { id: 'opportunities', title: 'Opportunities', desc: '$4.8M pipeline, stage transitions Discovery to Closed' },
  { id: 'aetheris-grid', title: 'Aetheris Grid', desc: 'Mini-sheet formula bar and workbook calculation' },
  { id: 'signals', title: 'Signals', desc: '8 standardized intent types: Capital, Talent, Looking For...' },
  { id: 'calendar', title: 'Calendar', desc: 'Today 4 executive events, time and linked records' },
  { id: 'meetings', title: 'Meetings', desc: 'Series B Strategy next meeting card, notes & decisions' },
  { id: 'tasks-work', title: 'Tasks & Work', desc: '4 open commitments with due date, checkbox completion' },
  { id: 'inbox', title: 'Inbox', desc: 'Executive correspondence filtered for leverage' },
  { id: 'knowledge', title: 'Knowledge', desc: '6 standardized folders: Briefs, Notes, Research, Playbooks' },
  { id: 'relationship-radar', title: 'Relationship Radar', desc: '5 buckets: Hot Now, Emerging, Strategic, Dormant, At Risk' },
  { id: 'connection-paths', title: 'Connection Paths', desc: 'Shortest warm bridge to Satya Nadella via David Sterling' },
  { id: 'intros-iq', title: 'Intros IQ', desc: 'Ask graph questions, 5 starter queries' },
  { id: 'network-forensics', title: 'Network Forensics', desc: 'Expose hidden leaks: $1.4M at-risk pipeline' },
  { id: 'digital-you', title: 'Digital You', desc: 'Executive twin with 5 approval-gated actions' },
  { id: 'automations', title: 'Automations', desc: '4-step visual rule builder on Autopilot' },
  { id: 'analytics', title: 'Analytics', desc: '+342% Relationship ROI and deal attribution' },
  { id: 'company-intelligence', title: 'Company Intelligence', desc: 'Stripe dossier, overview, execs, relationships' },
  { id: 'introductions', title: 'Introductions', desc: 'Double opt-in 4-step state machine' },
  { id: 'relationship-memory', title: 'Relationship Memory', desc: 'Chronological timeline ledger for key relationship' },
  { id: 'team-graph', title: 'Team Graph', desc: 'Firm-wide partner seats and relationship topology' },
  { id: 'diagnostics', title: 'Diagnostics', desc: 'Forensic Scan Complete: Golden Report' },
  { id: 'growth-studio', title: 'Growth Studio', desc: 'High-leverage outreach drafts from records' },
  { id: 'executive-brief', title: 'Executive Brief', desc: 'Synthesized morning audio briefing & focus items' },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTile,
  people = [],
  sortMode = 'last_engaged',
  onSortChange,
  onScanCalendar,
  onDownloadReport,
  onSwitchView,
  onSelectPerson,
  onOpenCheatSheet,
  onOpenPredictiveInsights,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        if (onOpenCheatSheet) {
          onClose();
          onOpenCheatSheet();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onOpenCheatSheet]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Real-time Predictive Search Algorithm based on recent activity patterns
  const predictiveSuggestions = useMemo<PredictedActionItem[]>(() => {
    const q = query.trim().toLowerCase();
    const suggestions: PredictedActionItem[] = [];

    // Helper activity scoring
    const getActivityBonus = (person: Person): { bonus: number; badge: string; reason: string } => {
      const touch = (person.lastTouchpoint || '').toLowerCase();
      if (touch.includes('yesterday') || touch.includes('today') || touch.includes('hours') || touch.includes('1 day')) {
        return { bonus: 40, badge: 'High Recency Activity', reason: 'Engaged within 24h' };
      }
      if (person.engagement === 'followup') {
        return { bonus: 35, badge: 'Follow-up Due', reason: 'Actionable commitment pending' };
      }
      if (person.engagement === 'dormant') {
        return { bonus: 30, badge: 'Communication Drift', reason: 'Drift window exceeding threshold' };
      }
      return { bonus: 15, badge: 'Active Node', reason: 'Regular syndicate alignment' };
    };

    // 1. Person matches and synthetic contextual actions
    people.forEach((p) => {
      const nameMatch = p.name.toLowerCase().includes(q);
      const companyMatch = p.company.toLowerCase().includes(q);
      const titleMatch = p.title.toLowerCase().includes(q);
      const notesMatch = (p.notes || '').toLowerCase().includes(q);
      const matches = !q || nameMatch || companyMatch || titleMatch || notesMatch;

      if (matches) {
        const { bonus, badge, reason } = getActivityBonus(p);
        const matchStrength = q
          ? (nameMatch ? 50 : 30) + (companyMatch ? 20 : 0)
          : 20;
        const totalScore = matchStrength + bonus + (p.connectionScore * 0.2);
        const confidence = Math.min(99, Math.round(80 + (totalScore / 3)));

        // Suggest Contact Profile
        suggestions.push({
          id: `person-${p.id}`,
          title: p.name,
          subtitle: `${p.title} · ${p.company} • ${p.lastTouchpoint}`,
          category: 'Recent Activity Match',
          badge: `${confidence}% Match · ${badge}`,
          confidence,
          score: totalScore,
          type: 'person',
          person: p,
          run: () => {
            if (onSelectPerson) onSelectPerson(p);
            onSelectTile('relationship-network');
            onClose();
          },
        });

        // Predictive Contextual Actions for this person based on their notes & status
        if (p.id === 'p-1' || p.name.includes('Elena')) {
          suggestions.push({
            id: `act-elena-brief`,
            title: `Draft Series B Governance Briefing for ${p.name}`,
            subtitle: `Apex Capital Fund V allocation rider · ${reason}`,
            category: 'Predicted Action',
            badge: `High Urgency Syndicate Step`,
            confidence: 97,
            score: totalScore + 15,
            type: 'action',
            person: p,
            run: () => {
              if (onSelectPerson) onSelectPerson(p);
              onSelectTile('relationship-network');
              onClose();
            },
          });
        }

        if (p.id === 'p-2' || p.name.includes('Marcus')) {
          suggestions.push({
            id: `act-marcus-telemetry`,
            title: `Synthesize Vance Aerospace Orbital Telemetry Brief`,
            subtitle: `Connect LEO satellite mesh to sovereign allocators · ${reason}`,
            category: 'Syndicate Bridge',
            badge: `Strategic Synergy`,
            confidence: 95,
            score: totalScore + 14,
            type: 'action',
            person: p,
            run: () => {
              if (onSelectPerson) onSelectPerson(p);
              onSelectTile('relationship-network');
              onClose();
            },
          });
        }

        if (p.id === 'p-3' || p.name.includes('Sophia')) {
          suggestions.push({
            id: `act-sophia-mandate`,
            title: `Structure €120M Nordic Sovereign Mandate Proposal`,
            subtitle: `European data sovereignty & sensor infrastructure · ${reason}`,
            category: 'Predicted Action',
            badge: `Institutional Mandate`,
            confidence: 96,
            score: totalScore + 16,
            type: 'action',
            person: p,
            run: () => {
              if (onSelectPerson) onSelectPerson(p);
              onSelectTile('relationship-network');
              onClose();
            },
          });
        }

        if (p.id === 'p-5' || p.name.includes('Arthur')) {
          suggestions.push({
            id: `act-arthur-recover`,
            title: `Recover Arthur Pendelton Communication Drift (48d)`,
            subtitle: `Horizon Health RFP closes soon · Outreach via David Sterling`,
            category: 'Drift Alert',
            badge: `Critical Drift Recovery`,
            confidence: 98,
            score: totalScore + 25,
            type: 'action',
            person: p,
            run: () => {
              if (onSelectPerson) onSelectPerson(p);
              onSelectTile('relationship-network');
              onClose();
            },
          });
        }

        if (p.id === 'p-6' || p.name.includes('Priya')) {
          suggestions.push({
            id: `act-priya-photonic`,
            title: `Introduce Priya Sharma to Elena Rostova (Fund V Compute)`,
            subtitle: `NeoQuantum 10x optical tensor benchmarks · ${reason}`,
            category: 'Syndicate Bridge',
            badge: `Unutilized Opportunity`,
            confidence: 93,
            score: totalScore + 12,
            type: 'action',
            person: p,
            run: () => {
              if (onSelectPerson) onSelectPerson(p);
              onSelectTile('relationship-network');
              onClose();
            },
          });
        }
      }
    });

    // 2. System and Tool predictive actions
    const systemActions: PredictedActionItem[] = [
      {
        id: 'sys-scan-cal',
        title: 'Scan Calendar & Auto-Map Engagement Trajectory',
        subtitle: 'Sync 8 briefing records and recalculate 30-day half-life decay',
        category: 'Predicted Action',
        badge: 'Engagement Autopilot',
        confidence: 95,
        score: (!q || 'scan'.includes(q) || 'cal'.includes(q) || 'map'.includes(q)) ? 85 : 10,
        type: 'tool',
        run: () => {
          if (onScanCalendar) onScanCalendar();
          onClose();
        },
      },
      {
        id: 'sys-export-csv',
        title: 'Export Executive Network Report (CSV)',
        subtitle: `Download comprehensive dossier dataset (${people.length} active records)`,
        category: 'Predicted Action',
        badge: 'Executive Export',
        confidence: 94,
        score: (!q || 'export'.includes(q) || 'csv'.includes(q) || 'report'.includes(q) || 'download'.includes(q)) ? 82 : 10,
        type: 'tool',
        run: () => {
          if (onDownloadReport) onDownloadReport();
          onClose();
        },
      },
      {
        id: 'sys-predictive-llm',
        title: 'Run Predictive LLM Network Analysis',
        subtitle: 'Detect graph blind spots, syndicate leaks & unutilized bridges',
        category: 'Predicted Action',
        badge: 'Gemini AI Intelligence',
        confidence: 98,
        score: (!q || 'predict'.includes(q) || 'ai'.includes(q) || 'blind'.includes(q) || 'insight'.includes(q) || 'llm'.includes(q)) ? 90 : 15,
        type: 'tool',
        run: () => {
          if (onOpenPredictiveInsights) onOpenPredictiveInsights();
          onClose();
        },
      },
      {
        id: 'sys-view-graph',
        title: 'Switch to D3 Force-Directed Network Graph',
        subtitle: 'Inspect visual clusters across 5 sectors and force simulation',
        category: 'System View',
        badge: 'Topology Visualizer',
        confidence: 91,
        score: (!q || 'graph'.includes(q) || 'd3'.includes(q) || 'cluster'.includes(q) || 'node'.includes(q)) ? 80 : 10,
        type: 'view',
        run: () => {
          if (onSwitchView) onSwitchView('graph');
          onClose();
        },
      },
      {
        id: 'sys-view-inbox',
        title: 'Switch to Central Actionable Inbox',
        subtitle: 'Review 8 consolidated commitments, approvals & drift alerts',
        category: 'System View',
        badge: 'Executive Queue',
        confidence: 92,
        score: (!q || 'inbox'.includes(q) || 'task'.includes(q) || 'queue'.includes(q) || 'commit'.includes(q)) ? 81 : 10,
        type: 'view',
        run: () => {
          if (onSwitchView) onSwitchView('inbox');
          onClose();
        },
      },
      {
        id: 'sys-shortcuts-cheatsheet',
        title: 'Open Keyboard Shortcuts Cheat Sheet',
        subtitle: 'Visual reference guide for high-speed navigation & hotkeys',
        category: 'System View',
        badge: 'Cheat Sheet (⌘/)',
        confidence: 90,
        score: (!q || 'shortcut'.includes(q) || 'key'.includes(q) || 'cheat'.includes(q) || 'help'.includes(q) || '?'.includes(q)) ? 79 : 10,
        type: 'tool',
        run: () => {
          if (onOpenCheatSheet) onOpenCheatSheet();
          onClose();
        },
      },
    ];

    systemActions.forEach((sa) => {
      if (!q || sa.title.toLowerCase().includes(q) || sa.subtitle.toLowerCase().includes(q) || sa.score > 50) {
        suggestions.push(sa);
      }
    });

    // 3. Modules matches
    MODULES.forEach((m) => {
      const match = !q || m.title.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q);
      if (match) {
        suggestions.push({
          id: `mod-${m.id}`,
          title: m.title,
          subtitle: m.desc,
          category: 'System View',
          badge: '24-Tile Architecture',
          confidence: 85,
          score: q ? (m.title.toLowerCase().includes(q) ? 45 : 25) : 15,
          type: 'view',
          run: () => {
            if (m.view && onSwitchView) {
              onSwitchView(m.view as any);
            } else {
              onSelectTile(m.id);
            }
            onClose();
          },
        });
      }
    });

    // Sort by predictive score descending
    return suggestions.sort((a, b) => b.score - a.score);
  }, [query, people, onSelectPerson, onSelectTile, onClose, onScanCalendar, onDownloadReport, onSwitchView, onOpenPredictiveInsights, onOpenCheatSheet]);

  // Handle arrow key navigation and Enter execution
  const handleKeyDownInList = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, predictiveSuggestions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + predictiveSuggestions.length) % Math.max(1, predictiveSuggestions.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = predictiveSuggestions[selectedIndex];
      if (current) current.run();
    }
  };

  const getStatusDot = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-[#C78522] shadow-[0_0_8px_rgba(63,179,127,0.7)]';
      case 'followup':
        return 'bg-[#F5B027] shadow-[0_0_8px_rgba(242,169,59,0.7)]';
      case 'dormant':
        return 'bg-[#64748B]';
      default:
        return 'bg-[#F5B027]';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      onKeyDown={handleKeyDownInList}
    >
      <div
        className="sys-tile w-full max-w-2xl shadow-2xl border border-[rgba(255,255,255,0.18)] bg-[#0A0D12] rounded-2xl overflow-hidden flex flex-col max-h-[80vh]"
        role="dialog"
      >
        {/* Main Search Input */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-[#07090C]/80">
          <div className="relative shrink-0">
            <Search size={18} className="text-[#F5B027]" />
            <Sparkles size={8} className="absolute -top-1 -right-1 text-[#C78522] animate-pulse" />
          </div>
          <input
            type="text"
            autoFocus
            placeholder="Search contacts, actions, or type 'Elena', 'Scan', 'RFP', 'Graph'..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm sm:text-base text-[#F2EEE6] placeholder-[#F2EEE6]/40 focus:outline-none font-sans"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenCheatSheet && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCheatSheet();
                }}
                className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] font-mono text-[#F2EEE6]/70 flex items-center gap-1 transition-colors border border-white/5"
                title="View Keyboard Shortcuts Cheat Sheet (⌘/)"
              >
                <Keyboard size={12} className="text-[#F5B027]" />
                <span className="hidden sm:inline">Cheat Sheet</span>
                <kbd className="text-[9px] opacity-60">⌘/</kbd>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded text-[#F2EEE6]/60 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Toolbar Bar: Sort Dropdown & Quick Actions */}
        <div className="px-4 py-2 border-b border-white/10 bg-[#0E1116] flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Predictive Banner State */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#F5B027] uppercase font-bold tracking-wider">
              <Zap size={11} className="text-[#C78522]" />
              <span>Real-Time Predictive Engine</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1">
              <ArrowUpDown size={11} className="text-[#F2EEE6]/50" />
              <select
                value={sortMode}
                onChange={(e) => onSortChange && onSortChange(e.target.value as SortMode)}
                className="bg-transparent text-[#F2EEE6]/80 text-[10px] font-mono focus:outline-none cursor-pointer"
              >
                <option value="last_engaged" className="bg-[#0E1116] text-[#F2EEE6]">Last Engaged</option>
                <option value="name" className="bg-[#0E1116] text-[#F2EEE6]">Name (A–Z)</option>
                <option value="urgency" className="bg-[#0E1116] text-[#F2EEE6]">Urgency Level</option>
              </select>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5">
            {onScanCalendar && (
              <button
                onClick={() => {
                  onScanCalendar();
                  onClose();
                }}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-[#F5B027]/20 border border-white/10 text-[10px] font-mono text-[#F2EEE6] flex items-center gap-1 transition-colors"
              >
                <Calendar size={10} className="text-[#F5B027]" />
                <span className="hidden sm:inline">Scan</span>
              </button>
            )}
            {onDownloadReport && (
              <button
                onClick={() => {
                  onDownloadReport();
                  onClose();
                }}
                className="px-2 py-0.5 rounded bg-[#F5B027]/20 hover:bg-[#F5B027]/30 border border-[#F5B027]/40 text-[10px] font-mono text-[#F2EEE6] flex items-center gap-1 transition-colors"
              >
                <Download size={10} className="text-[#F5B027]" />
                <span className="hidden sm:inline">CSV</span>
              </button>
            )}
            {onOpenPredictiveInsights && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPredictiveInsights();
                }}
                className="px-2 py-0.5 rounded bg-[#C78522]/15 hover:bg-[#C78522]/25 border border-[#C78522]/40 text-[#C78522] text-[10px] font-mono flex items-center gap-1 transition-colors"
              >
                <Sparkles size={10} />
                <span className="hidden sm:inline">AI Blind Spots</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Results Feed */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 divide-y divide-white/5 space-y-1">
          {predictiveSuggestions.length > 0 ? (
            predictiveSuggestions.slice(0, 15).map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={item.run}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-all ${
                    isSelected
                      ? 'bg-[#151922] border border-[#F5B027]/60 shadow-lg translate-x-0.5'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.person ? (
                      <div className="relative shrink-0">
                        <img
                          src={item.person.avatar}
                          alt={item.person.name}
                          className="w-8 h-8 rounded-full object-cover border border-white/15"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${getStatusDot(
                            item.person.engagement
                          )} ring-1 ring-[#0E1116]`}
                        />
                      </div>
                    ) : item.type === 'action' ? (
                      <div className="w-8 h-8 rounded-lg bg-[#F5B027]/20 border border-[#F5B027]/40 flex items-center justify-center text-[#F5B027] shrink-0">
                        <Zap size={15} />
                      </div>
                    ) : item.type === 'tool' ? (
                      <div className="w-8 h-8 rounded-lg bg-[#C78522]/20 border border-[#C78522]/40 flex items-center justify-center text-[#C78522] shrink-0">
                        <Sparkles size={15} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#F2EEE6]/70 shrink-0">
                        <LayoutGrid size={15} />
                      </div>
                    )}

                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-[13px] font-semibold text-[#F2EEE6] truncate">
                          {item.title}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-[#F5B027] shrink-0 border border-white/5">
                          {item.badge}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#F2EEE6]/60 truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-mono uppercase text-[#F2EEE6]/40 hidden md:inline">
                      {item.category}
                    </span>
                    <ArrowRight
                      size={13}
                      className={isSelected ? 'text-[#F5B027]' : 'text-[#F2EEE6]/30'}
                    />
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-[#F2EEE6]/50">
              No matching modules, contacts, or actions found for &quot;{query}&quot;.
            </div>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="p-2.5 border-t border-white/10 bg-[#07090C] flex items-center justify-between text-[10px] font-mono text-[#F2EEE6]/50">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.2 rounded bg-white/10 text-white font-bold">↑</kbd> <kbd className="px-1 py-0.2 rounded bg-white/10 text-white font-bold">↓</kbd> navigate
            </span>
            <span>
              <kbd className="px-1 py-0.2 rounded bg-white/10 text-white font-bold">↵</kbd> select
            </span>
            <span>
              <kbd className="px-1 py-0.2 rounded bg-white/10 text-white font-bold">esc</kbd> dismiss
            </span>
          </div>

          <div className="text-[9.5px] text-[#F5B027] flex items-center gap-1 font-semibold">
            <span>Powered by Aetheris Activity Graph</span>
          </div>
        </div>
      </div>
    </div>
  );
};
