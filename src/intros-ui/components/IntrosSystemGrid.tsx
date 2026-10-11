// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { ConstellationField } from './ConstellationField';
import { SystemTile } from './SystemTile';
import { PREVIEW_COMPONENTS } from './tilePreviews';
import { WorkspaceModal } from './workspaces/WorkspaceModal';
import { ApprovalQueueModal } from './ApprovalQueueModal';
import { UtilitiesModal } from './UtilitiesModal';
import { CommandPalette } from './CommandPalette';
import { ExecutiveIntelligenceSidebar } from './ExecutiveIntelligenceSidebar';
import { ActionableInboxView } from './ActionableInboxView';
import { NetworkGraphView } from './NetworkGraphView';
import { NetworkClusterHeatmapView } from './NetworkClusterHeatmapView';
import { BiometricGuardModal } from './BiometricGuardModal';
import { PredictiveInsightsModal } from './PredictiveInsightsModal';
import { KeyboardCheatSheetModal } from './KeyboardCheatSheetModal';
import { PersistentGridCommandPalette, ActivityHistoryFilter } from './PersistentGridCommandPalette';
import { Dashboard30DayTrendChart } from './Dashboard30DayTrendChart';
import { TileVoiceMinutesModal } from './TileVoiceMinutesModal';
import { FullTextSearchModal } from './FullTextSearchModal';
import { PersistentFooterKeyMap } from './PersistentFooterKeyMap';
import { QuickAddContactModal } from './QuickAddContactModal';
import { DailyDigestModal } from './DailyDigestModal';
import { NetworkPulseHeaderTile } from './NetworkPulseHeaderTile';
import { RelationshipTier } from './RelationshipTierBadge';
import { fetchBatchTileSummaries, invalidateTileCache } from '../tileSummaries';
import { INITIAL_APPROVALS, INITIAL_PEOPLE, INITIAL_CALENDAR, INITIAL_OPPORTUNITIES } from '../dataStore';
import { ApprovalAction, Person } from '../types';
import { SortMode, sortConnections, downloadNetworkReport } from '../utils/reportExport';
import { scanCalendarAndMapEngagement, CalendarScanResult } from '../utils/calendarScanner';
import {
  Search,
  ShieldCheck,
  Settings,
  ArrowUpDown,
  Calendar,
  Download,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Eye,
  EyeOff,
  X,
  LayoutGrid,
  CheckSquare,
  Share2,
  BookOpen,
  Lock,
  Unlock,
  Keyboard,
  Activity,
  Tag,
  AlertTriangle,
} from 'lucide-react';

const TILE_ORDER = [
  // Row 1
  'relationship-network',
  'intros-crm',
  'opportunities',
  'aetheris-grid',
  'signals',
  'calendar',
  'meetings',
  'tasks-work',

  // Row 2
  'inbox',
  'knowledge',
  'relationship-radar',
  'connection-paths',
  'intros-iq',
  'network-forensics',
  'digital-you',
  'automations',

  // Row 3
  'analytics',
  'company-intelligence',
  'introductions',
  'relationship-memory',
  'team-graph',
  'diagnostics',
  'growth-studio',
  'executive-brief',
];

export const IntrosSystemGrid: React.FC = () => {
  const [dashboardView, setDashboardView] = useState<'grid' | 'inbox' | 'graph' | 'heatmap'>('grid');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isEmptyState, setIsEmptyState] = useState<boolean>(false);
  const [activeWorkspaceTile, setActiveWorkspaceTile] = useState<string | null>(null);
  const [isApprovalOpen, setIsApprovalOpen] = useState<boolean>(false);
  const [isCommandOpen, setIsCommandOpen] = useState<boolean>(false);
  const [isUtilitiesOpen, setIsUtilitiesOpen] = useState<boolean>(false);
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState<boolean>(false);
  const [isBiometricUnlocked, setIsBiometricUnlocked] = useState<boolean>(false);
  const [isPredictiveModalOpen, setIsPredictiveModalOpen] = useState<boolean>(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState<boolean>(false);
  const [approvals, setApprovals] = useState<ApprovalAction[]>(INITIAL_APPROVALS);

  // Connection management & sorting state
  const [people, setPeople] = useState<Person[]>(INITIAL_PEOPLE);
  const [sortMode, setSortMode] = useState<SortMode>('last_engaged');
  const [scanResult, setScanResult] = useState<CalendarScanResult | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Sort connections based on selected sortMode
  const sortedPeople = useMemo(() => {
    return sortConnections(people, sortMode);
  }, [people, sortMode]);

  // Persistent top-of-grid filter and search state
  const [gridFilterStatus, setGridFilterStatus] = useState<'all' | 'active' | 'followup' | 'dormant'>('all');
  const [gridTierFilter, setGridTierFilter] = useState<'all' | 'inner_circle' | 'strategic' | 'network'>('all');
  const [gridSelectedTag, setGridSelectedTag] = useState<string | null>(null);
  const [gridActivityHistoryFilter, setGridActivityHistoryFilter] = useState<ActivityHistoryFilter>('all');
  const [gridSearchQuery, setGridSearchQuery] = useState<string>('');

  // Visual Heatmap Overlay state
  const [heatmapActive, setHeatmapActive] = useState<boolean>(false);
  const [heatmapMode, setHeatmapMode] = useState<'sector' | 'frequency'>('sector');

  // Voice Notes to Tile Minutes Modal state
  const [voiceModalTile, setVoiceModalTile] = useState<{ id: string; title: string } | null>(null);

  // Keyboard Tile Navigation
  const [focusedTileIndex, setFocusedTileIndex] = useState<number | null>(null);

  // Inactivity Drift Alert System (Predefined threshold: 7, 14, 30 default, 45, 60 days)
  const [inactivityThreshold, setInactivityThreshold] = useState<number>(30);
  const [isInactivityAlertActive, setIsInactivityAlertActive] = useState<boolean>(true);

  // Full-Text Search Modal
  const [isFullTextSearchOpen, setIsFullTextSearchOpen] = useState<boolean>(false);

  // Quick Add, Daily Digest, Reordering, and Bulk Actions state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isDailyDigestOpen, setIsDailyDigestOpen] = useState<boolean>(true);
  const [tileOrder, setTileOrder] = useState<string[]>(TILE_ORDER);
  const [smartGrouping, setSmartGrouping] = useState<'default' | 'sector' | 'tier'>('default');
  const [selectedPeopleIds, setSelectedPeopleIds] = useState<string[]>([]);
  const [draggedTileId, setDraggedTileId] = useState<string | null>(null);

  const handleBulkApplyTag = (tag: string) => {
    setPeople((prev) =>
      prev.map((p) => {
        if (selectedPeopleIds.includes(p.id)) {
          const currentTags = p.tags || [];
          if (!currentTags.includes(tag)) {
            return { ...p, tags: [...currentTags, tag] };
          }
        }
        return p;
      })
    );
    setNotification({
      message: `Applied sector tag #${tag} to ${selectedPeopleIds.length} contact(s) simultaneously.`,
      type: 'success',
    });
    setSelectedPeopleIds([]);
  };

  const handleBulkApplyTier = (tier: RelationshipTier) => {
    setPeople((prev) =>
      prev.map((p) => {
        if (selectedPeopleIds.includes(p.id)) {
          return { ...p, tier };
        }
        return p;
      })
    );
    setNotification({
      message: `Assigned Relationship Tier (${tier}) to ${selectedPeopleIds.length} contact(s) simultaneously.`,
      type: 'success',
    });
    setSelectedPeopleIds([]);
  };

  // Apply real-time search & status/tag/tier/activity filtering across the network
  const filteredGridPeople = useMemo(() => {
    let result = sortedPeople;
    if (gridFilterStatus !== 'all') {
      result = result.filter((p) => (p.engagement || 'active') === gridFilterStatus);
    }
    if (gridTierFilter !== 'all') {
      result = result.filter((p) => p.tier === gridTierFilter);
    }
    if (gridSelectedTag) {
      result = result.filter((p) => p.tags?.includes(gridSelectedTag));
    }
    if (gridActivityHistoryFilter !== 'all') {
      result = result.filter((p) => {
        const touch = (p.lastTouchpoint || '').toLowerCase();
        if (gridActivityHistoryFilter === 'last_24h') {
          return touch.includes('yesterday') || touch.includes('today') || touch.includes('24h');
        }
        if (gridActivityHistoryFilter === 'last_3d') {
          return (
            touch.includes('yesterday') ||
            touch.includes('today') ||
            touch.includes('2 days') ||
            touch.includes('3 days')
          );
        }
        if (gridActivityHistoryFilter === 'this_week') {
          return (
            touch.includes('yesterday') ||
            touch.includes('today') ||
            touch.includes('2 days') ||
            touch.includes('3 days') ||
            touch.includes('5 days') ||
            touch.includes('1 week')
          );
        }
        if (gridActivityHistoryFilter === 'drift_30d') {
          return (
            touch.includes('48 days') ||
            touch.includes('64 days') ||
            touch.includes('unanswered') ||
            p.engagement === 'dormant' ||
            p.radarBucket === 'at_risk'
          );
        }
        return true;
      });
    }
    if (gridSearchQuery.trim()) {
      const q = gridSearchQuery.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.company.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          (p.notes || '').toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [sortedPeople, gridFilterStatus, gridTierFilter, gridSelectedTag, gridActivityHistoryFilter, gridSearchQuery]);

  const topPerson = filteredGridPeople[0] || sortedPeople[0];
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(topPerson || null);

  // Heatmap density calculation per tile
  const getTileHeatmapData = (tileId: string) => {
    const sectorData: Record<string, { score: number; label: string }> = {
      'relationship-network': { score: 96, label: 'Capital Lead' },
      'intros-crm': { score: 93, label: 'CRM Directory' },
      'opportunities': { score: 91, label: '$4.8M Pipeline' },
      'signals': { score: 88, label: 'Market Signals' },
      'calendar': { score: 95, label: '4 Briefings' },
      'meetings': { score: 90, label: 'Board Strategy' },
      'tasks-work': { score: 86, label: 'SLA Commitments' },
      'inbox': { score: 87, label: 'Executive Comms' },
      'knowledge': { score: 75, label: 'Dossier Briefs' },
      'relationship-radar': { score: 89, label: 'Hot Radar' },
      'connection-paths': { score: 92, label: 'Sovereign Bridge' },
      'intros-iq': { score: 88, label: 'Graph IQ' },
      'network-forensics': { score: 79, label: 'Drift Leak' },
      'digital-you': { score: 85, label: 'Autopilot Twin' },
      'automations': { score: 82, label: 'Active Rules' },
      'analytics': { score: 87, label: '+342% ROI' },
      'company-intelligence': { score: 84, label: 'Stripe Mandate' },
      'introductions': { score: 86, label: 'Double Opt-In' },
      'relationship-memory': { score: 83, label: 'Memory Ledger' },
      'team-graph': { score: 85, label: '5 Clusters' },
      'diagnostics': { score: 76, label: 'Forensic Health' },
      'growth-studio': { score: 80, label: 'Outreach Deck' },
      'executive-brief': { score: 94, label: 'Daily Brief' },
      'aetheris-grid': { score: 84, label: 'Workbook Sheet' },
    };

    const frequencyData: Record<string, { score: number; label: string }> = {
      'relationship-network': { score: 98, label: 'Daily (24h)' },
      'calendar': { score: 96, label: 'Daily (Today)' },
      'inbox': { score: 94, label: 'Daily (Live)' },
      'meetings': { score: 91, label: '2d Cadence' },
      'tasks-work': { score: 88, label: '2d SLA' },
      'executive-brief': { score: 95, label: 'Daily Audio' },
      'intros-crm': { score: 89, label: '3d Cadence' },
      'signals': { score: 86, label: 'Weekly Sync' },
      'connection-paths': { score: 87, label: 'Weekly Bridge' },
      'relationship-radar': { score: 85, label: 'Weekly Radar' },
      'intros-iq': { score: 84, label: '3d Frequency' },
      'analytics': { score: 82, label: 'Weekly Report' },
      'opportunities': { score: 90, label: '2d Deal Rhythm' },
      'network-forensics': { score: 45, label: '48d Drift Warning' },
      'knowledge': { score: 72, label: 'Bi-weekly' },
      'diagnostics': { score: 68, label: 'Monthly Scan' },
      'company-intelligence': { score: 81, label: 'Weekly' },
      'team-graph': { score: 83, label: 'Weekly Mesh' },
      'introductions': { score: 85, label: 'Weekly Opt-In' },
      'relationship-memory': { score: 80, label: 'Weekly Ledger' },
      'automations': { score: 83, label: 'Continuous' },
      'digital-you': { score: 86, label: 'Continuous' },
      'growth-studio': { score: 77, label: 'Weekly' },
      'aetheris-grid': { score: 81, label: 'Weekly' },
    };

    return heatmapMode === 'sector'
      ? sectorData[tileId] || { score: 75, label: 'Active Sector' }
      : frequencyData[tileId] || { score: 75, label: 'Active Cadence' };
  };

  // Tier assignment per tile
  const getTileTier = (tileId: string): RelationshipTier | undefined => {
    if (tileId === 'relationship-network') return topPerson?.tier || 'inner_circle';
    if (tileId === 'intros-crm') return 'inner_circle';
    if (tileId === 'opportunities') return 'inner_circle';
    if (tileId === 'meetings') return 'inner_circle';
    if (tileId === 'connection-paths') return 'strategic';
    if (tileId === 'relationship-radar') return 'strategic';
    if (tileId === 'signals') return 'strategic';
    if (tileId === 'team-graph') return 'network';
    if (tileId === 'introductions') return 'network';
    return undefined;
  };

  // Calculate days since last interaction for connection tiles
  const getTileInactivityDays = (tileId: string): number => {
    if (tileId === 'relationship-network') {
      const touch = (topPerson?.lastTouchpoint || '').toLowerCase();
      if (touch.includes('yesterday') || touch.includes('1 day')) return 1;
      if (touch.includes('today') || touch.includes('hours') || touch.includes('24h')) return 0;
      const match = touch.match(/(\d+)\s*days?\s*ago/);
      if (match) return parseInt(match[1], 10);
      if (touch.includes('1 week ago')) return 7;
      if (topPerson?.engagement === 'dormant') return 64;
      if (topPerson?.engagement === 'followup') return 48;
      return 1;
    }
    if (tileId === 'relationship-radar') return 64; // Priya Sharma: 64 days dormant
    if (tileId === 'intros-crm') return 48; // Arthur Pendelton: 48 days uncontacted
    if (tileId === 'network-forensics') return 48; // 48d half-life decay alert
    if (tileId === 'meetings') return 35; // Lapsed quarterly meeting cadence
    if (tileId === 'signals') return 32; // Stale executive signal
    if (tileId === 'connection-paths') return 40; // Stale bridge pathway
    if (tileId === 'relationship-memory') return 48; // Memory ledger notes
    if (tileId === 'team-graph') return 28; // Team node contact
    return 0;
  };

  const isTileInactivityAlerted = (tileId: string): boolean => {
    if (!isInactivityAlertActive) return false;
    const days = getTileInactivityDays(tileId);
    return days >= inactivityThreshold;
  };

  const alertedConnectionTilesCount = useMemo(() => {
    if (!isInactivityAlertActive) return 0;
    return TILE_ORDER.filter((t) => isTileInactivityAlerted(t)).length;
  }, [isInactivityAlertActive, inactivityThreshold, topPerson]);

  useEffect(() => {
    if (!selectedPerson && topPerson) {
      setSelectedPerson(topPerson);
    }
  }, [topPerson, selectedPerson]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setIsFullTextSearchOpen((prev) => !prev);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setIsPredictiveModalOpen((prev) => !prev);
        return;
      }
      if (((e.metaKey || e.ctrlKey) && e.key === '/') || (!isInput && e.key === '?')) {
        e.preventDefault();
        setIsCheatSheetOpen((prev) => !prev);
        return;
      }
      if (!isInput && e.key === '/') {
        e.preventDefault();
        setIsFullTextSearchOpen(true);
        return;
      }

      if (!isInput) {
        if (e.key === '1') {
          setDashboardView('grid');
        } else if (e.key === '2') {
          setDashboardView('inbox');
        } else if (e.key === '3') {
          setDashboardView('graph');
        } else if (e.key === '4') {
          setDashboardView('heatmap');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setFocusedTileIndex((prev) => {
            const next = prev !== null ? (prev < TILE_ORDER.length - 1 ? prev + 1 : 0) : 0;
            const el = document.getElementById(`tile-${TILE_ORDER[next]}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return next;
          });
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setFocusedTileIndex((prev) => {
            const next = prev !== null ? (prev > 0 ? prev - 1 : TILE_ORDER.length - 1) : 0;
            const el = document.getElementById(`tile-${TILE_ORDER[next]}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return next;
          });
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedTileIndex((prev) => {
            const next = prev !== null ? (prev + 8) % TILE_ORDER.length : 0;
            const el = document.getElementById(`tile-${TILE_ORDER[next]}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return next;
          });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedTileIndex((prev) => {
            const next = prev !== null ? (prev - 8 + TILE_ORDER.length) % TILE_ORDER.length : 0;
            const el = document.getElementById(`tile-${TILE_ORDER[next]}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return next;
          });
        } else if (e.key === 'Enter' || e.key === ' ') {
          if (focusedTileIndex !== null && !activeWorkspaceTile && !isCommandOpen && !isFullTextSearchOpen) {
            e.preventDefault();
            setActiveWorkspaceTile(TILE_ORDER[focusedTileIndex]);
          }
        } else if (e.key === 'Escape') {
          setFocusedTileIndex(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedTileIndex, activeWorkspaceTile, isCommandOpen, isFullTextSearchOpen]);

  // Auto-dismiss notifications after 6 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Fetch summaries dynamically, passing topPerson for the relationship-network tile
  const summaries = useMemo(() => {
    return fetchBatchTileSummaries(isEmptyState, topPerson);
  }, [isEmptyState, topPerson]);

  const handleApprove = (id: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
  };

  const handleReject = (id: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
  };

  // Mock integration: Scan calendar events & map them to connection engagement levels
  const handleScanCalendar = () => {
    setIsScanning(true);
    setTimeout(() => {
      const result = scanCalendarAndMapEngagement(people, INITIAL_CALENDAR);
      setPeople(result.updatedPeople);
      setScanResult(result);
      invalidateTileCache();
      setIsScanning(false);
      setNotification({
        message: `Calendar Scan Synced: ${result.activeCount} Active · ${result.dormantCount} Dormant · ${result.followupCount} Follow-up Needed (Auto-mapped across ${result.totalScannedEvents} briefings)`,
        type: 'success',
      });
    }, 400);
  };

  // Download Report feature: export connection data as CSV
  const handleDownloadReport = async () => {
    await downloadNetworkReport(sortedPeople, INITIAL_OPPORTUNITIES);
    setNotification({
      message: 'Contact exports are disabled by policy.',
      type: 'warning',
    });
  };

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pending').length;

  // Determine engagement dot for specific connection tiles
  const getTileEngagement = (tileId: string): 'active' | 'dormant' | 'followup' | undefined => {
    if (tileId === 'relationship-network') {
      return topPerson?.engagement || 'active';
    }
    if (tileId === 'intros-crm') {
      return 'active';
    }
    if (tileId === 'relationship-radar') {
      return people.some((p) => p.engagement === 'followup') ? 'followup' : 'active';
    }
    if (tileId === 'connection-paths') {
      return 'active';
    }
    if (tileId === 'relationship-memory') {
      return 'active';
    }
    if (tileId === 'digital-you') {
      return 'active';
    }
    return undefined;
  };

  return (
    <div className="relative min-h-screen w-full bg-[#07090C] text-[#F2EEE6] flex flex-col font-sans-clean select-none">
      {/* Background Constellation Field */}
      <ConstellationField />

      {/* 1. TOP HEADER BAND */}
      <header className="relative z-20 w-full border-b border-[rgba(255,255,255,0.06)] bg-[#07090C]/90 backdrop-blur-md">
        <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: A E T H E R I S / I N T R O S */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex flex-col">
              <span className="font-serif-editorial text-[15px] sm:text-[17px] font-medium tracking-[0.38em] text-[#F2EEE6] uppercase leading-none">
                A E T H E R I S
              </span>
              <span className="font-serif-editorial text-[9px] sm:text-[10px] tracking-[0.55em] text-[#F2EEE6]/70 uppercase leading-none mt-1">
                I N T R O S
              </span>
            </div>

            <div className="h-8 w-[1px] bg-white/10" aria-hidden="true" />

            <div className="font-serif-editorial text-xs sm:text-[13px] leading-tight text-[#F2EEE6]/90">
              <div>The Relationship Network</div>
              <div>for <span className="text-[#F5B027] font-semibold not-italic">CEOs.</span></div>
            </div>
          </div>

          {/* Center: View Switcher (Grid / Actionable Inbox / Network Graph) */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0E1116] border border-white/10 self-center md:self-auto">
            <button
              onClick={() => setDashboardView('grid')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono flex items-center gap-1.5 transition-all ${
                dashboardView === 'grid'
                  ? 'bg-white/15 text-white font-semibold shadow-sm'
                  : 'text-[#F2EEE6]/60 hover:text-white hover:bg-white/5'
              }`}
              title="24-Tile System Grid View"
            >
              <LayoutGrid size={13} className={dashboardView === 'grid' ? 'text-[#F5B027]' : 'text-current'} />
              <span>Intelligence Grid</span>
            </button>

            <button
              onClick={() => setDashboardView('inbox')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono flex items-center gap-1.5 transition-all ${
                dashboardView === 'inbox'
                  ? 'bg-white/15 text-white font-semibold shadow-sm'
                  : 'text-[#F2EEE6]/60 hover:text-white hover:bg-white/5'
              }`}
              title="Central Actionable Inbox"
            >
              <CheckSquare size={13} className={dashboardView === 'inbox' ? 'text-[#F5B027]' : 'text-current'} />
              <span>Actionable Inbox</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#C78522] text-white text-[9px] font-bold">
                8
              </span>
            </button>

            <button
              onClick={() => setDashboardView('graph')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono flex items-center gap-1.5 transition-all ${
                dashboardView === 'graph'
                  ? 'bg-white/15 text-white font-semibold shadow-sm'
                  : 'text-[#F2EEE6]/60 hover:text-white hover:bg-white/5'
              }`}
              title="D3 Network Graph Visualization (3)"
            >
              <Share2 size={13} className={dashboardView === 'graph' ? 'text-[#F5B027]' : 'text-current'} />
              <span>Network Graph</span>
            </button>

            <button
              onClick={() => setDashboardView('heatmap')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono flex items-center gap-1.5 transition-all ${
                dashboardView === 'heatmap'
                  ? 'bg-white/15 text-white font-semibold shadow-sm'
                  : 'text-[#F2EEE6]/60 hover:text-white hover:bg-white/5'
              }`}
              title="Cluster Engagement Density Heatmap Visualization (4)"
            >
              <Activity size={13} className={dashboardView === 'heatmap' ? 'text-[#F5B027]' : 'text-current'} />
              <span>Cluster Heatmap</span>
            </button>
          </div>

          {/* Right: Actions, Full-Text Search, Inactivity Alerts, Predictive AI, Heatmap, Sort, Scan, Export & Utility Icons */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap self-end md:self-auto">
            {/* Full-Text Search Quick Button */}
            <button
              onClick={() => setIsFullTextSearchOpen(true)}
              className="px-2.5 py-1 rounded bg-[#F5B027]/15 hover:bg-[#F5B027]/25 border border-[#F5B027]/40 text-[#F2EEE6] text-[11px] font-mono flex items-center gap-1.5 transition-all shadow-sm"
              title="Full-Text Search Across Profiles, Tags & Notes (⌘F / /)"
            >
              <Search size={12} className="text-[#F5B027]" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden lg:inline px-1 py-0.2 bg-white/10 rounded border border-white/15 text-[8.5px] text-white">⌘F</kbd>
            </button>

            {/* Inactivity Drift Alerts Quick Button */}
            <button
              onClick={() => {
                setIsInactivityAlertActive((prev) => !prev);
                setNotification({
                  message: !isInactivityAlertActive
                    ? `Inactivity Notification System active: ${alertedConnectionTilesCount} connection tiles exceed the ${inactivityThreshold}-day interaction threshold.`
                    : 'Inactivity alert tile highlights hidden.',
                  type: 'info',
                });
              }}
              className={`px-2.5 py-1 rounded border text-[11px] font-mono flex items-center gap-1.5 transition-all shadow-sm ${
                isInactivityAlertActive && alertedConnectionTilesCount > 0
                  ? 'bg-[#C78522]/25 border-[#C78522]/60 text-[#FF6369] font-bold shadow-[0_0_12px_rgba(229,72,77,0.3)]'
                  : 'bg-white/5 border-white/10 text-[#F2EEE6]/75 hover:bg-white/10'
              }`}
              title="Toggle Inactivity SLA Drift Alerts for Connection Tiles"
            >
              <AlertTriangle size={11} className={isInactivityAlertActive ? 'text-[#FF6369]' : 'text-current'} />
              <span className="hidden sm:inline">Drift:</span>
              <span>{alertedConnectionTilesCount}</span>
            </button>

            {/* Heatmap Overlay Quick Button */}
            <button
              onClick={() => setHeatmapActive((prev) => !prev)}
              className={`px-2.5 py-1 rounded border text-[11px] font-mono flex items-center gap-1.5 transition-all shadow-sm ${
                heatmapActive
                  ? 'bg-[#F5B027]/25 border-[#F5B027]/60 text-[#F5B027] font-bold shadow-[0_0_12px_rgba(249,115,22,0.3)]'
                  : 'bg-white/5 border-white/10 text-[#F2EEE6]/75 hover:bg-white/10 hover:text-white'
              }`}
              title="Toggle Activity Density & Frequency Heatmap Overlay"
            >
              <span>🔥</span>
              <span className="hidden sm:inline">Heatmap</span>
            </button>

            {/* Predictive LLM Insights Trigger */}
            <button
              onClick={() => setIsPredictiveModalOpen(true)}
              className="px-2.5 py-1 rounded bg-[#F5B027]/20 hover:bg-[#F5B027]/30 border border-[#F5B027]/50 text-white text-[11px] font-mono flex items-center gap-1.5 transition-all shadow-sm"
              title="Run Predictive LLM Network Analysis (⌘P)"
            >
              <Sparkles size={12} className="text-[#F5B027]" />
              <span className="hidden sm:inline">Predictive AI</span>
            </button>

            {/* Sort Dropdown Menu in Header */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0E1116] border border-white/10 text-xs">
              <ArrowUpDown size={12} className="text-[#F5B027]" />
              <label htmlFor="header-sort" className="text-[10px] font-mono text-[#F2EEE6]/60 uppercase tracking-wider hidden sm:inline">
                Sort:
              </label>
              <select
                id="header-sort"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="bg-transparent text-[#F2EEE6] text-[11px] font-mono focus:outline-none cursor-pointer"
                title="Sort network connections"
              >
                <option value="last_engaged" className="bg-[#0E1116] text-[#F2EEE6]">Last Engaged</option>
                <option value="name" className="bg-[#0E1116] text-[#F2EEE6]">Name (A–Z)</option>
                <option value="urgency" className="bg-[#0E1116] text-[#F2EEE6]">Urgency Level</option>
              </select>
            </div>

            {/* Mock Calendar Scan Integration Button */}
            <button
              onClick={handleScanCalendar}
              disabled={isScanning}
              className={`px-2.5 py-1 rounded border text-[11px] font-mono flex items-center gap-1.5 transition-colors ${
                isScanning
                  ? 'bg-[#F5B027]/30 border-[#F5B027] text-white animate-pulse'
                  : 'bg-white/5 hover:bg-[#F5B027]/20 border-white/10 text-[#F2EEE6]'
              }`}
              title="Scan calendar events and auto-map connection engagement status"
            >
              <Calendar size={12} className="text-[#F5B027]" />
              <span className="hidden sm:inline">Scan Calendar</span>
              {isScanning && <RefreshCw size={10} className="animate-spin text-white" />}
            </button>

            {/* Download Report Button (CSV Export) */}
            <button
              onClick={handleDownloadReport}
              className="px-2.5 py-1 rounded bg-[#F5B027]/15 hover:bg-[#F5B027]/25 border border-[#F5B027]/40 text-[#F2EEE6] text-[11px] font-mono flex items-center gap-1.5 transition-colors"
              title="Download Executive Network Report (CSV)"
            >
              <Download size={12} className="text-[#F5B027]" />
              <span className="hidden sm:inline">Download Report</span>
            </button>

            {/* Quick Utility Icon Buttons */}
            <div className="flex items-center gap-1.5 border-l border-white/10 pl-2">
              {/* Biometric FaceID Guard Button */}
              <button
                onClick={() => {
                  if (!isBiometricUnlocked) {
                    setIsBiometricModalOpen(true);
                  } else {
                    setIsBiometricUnlocked(false);
                    setNotification({
                      message: 'Biometric Enclave Re-locked: Executive Intelligence encrypted.',
                      type: 'info',
                    });
                  }
                }}
                className={`p-1.5 rounded border text-[10px] font-mono flex items-center gap-1 transition-colors ${
                  isBiometricUnlocked
                    ? 'bg-[#C78522]/15 border-[#C78522]/30 text-[#C78522]'
                    : 'bg-[#F5B027]/15 border-[#F5B027]/40 text-[#F5B027] hover:bg-[#F5B027]/25'
                }`}
                title={
                  isBiometricUnlocked
                    ? 'Biometric Enclave Decrypted (Click to lock)'
                    : 'Confidential Data Locked (Click to verify FaceID)'
                }
              >
                {isBiometricUnlocked ? <Unlock size={12} /> : <Lock size={12} />}
              </button>

              {/* Executive Intelligence Sidebar Toggle */}
              <button
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                className={`px-2 py-1 rounded border text-[10px] font-mono flex items-center gap-1 transition-all ${
                  isSidebarOpen
                    ? 'bg-[#F5B027] text-white border-[#F5B027] shadow-sm font-semibold'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-[#F2EEE6]/80'
                }`}
                title="Toggle Executive Intelligence Sidebar (⌘I)"
              >
                <BookOpen size={12} />
                <span className="hidden sm:inline">Intelligence</span>
              </button>

              <button
                onClick={() => setIsCommandOpen(true)}
                className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-[#F2EEE6]/70 text-[10px] font-mono flex items-center gap-1 transition-colors"
                title="Search modules and predictive actions (⌘K)"
              >
                <Search size={12} className="text-[#F5B027]" />
                <span className="hidden sm:inline text-[9px]">⌘K</span>
              </button>
              <button
                onClick={() => setIsCheatSheetOpen(true)}
                className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-[#F2EEE6]/70 text-[10px] font-mono flex items-center gap-1 transition-colors"
                title="Keyboard Shortcuts & Cheat Sheet (? or ⌘/)"
              >
                <Keyboard size={12} className="text-[#F5B027]" />
                <span className="hidden sm:inline text-[9px]">⌘/</span>
              </button>
              <button
                onClick={() => setIsApprovalOpen(true)}
                className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-[#F2EEE6]/70 text-[10px] font-mono flex items-center gap-1 transition-colors relative"
                title="Approval Queue"
              >
                <ShieldCheck size={12} className="text-[#F5B027]" />
                {pendingApprovalsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#C78522]" />
                )}
              </button>
              <button
                onClick={() => setIsEmptyState((prev) => !prev)}
                className={`p-1.5 rounded border text-[10px] font-mono flex items-center gap-1 transition-colors ${
                  isEmptyState
                    ? 'bg-[#C78522]/20 border-[#C78522]/40 text-[#C78522]'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-[#F2EEE6]/70'
                }`}
                title={isEmptyState ? 'Switch back to Live Network' : 'Demo Empty State Illustration'}
              >
                {isEmptyState ? <EyeOff size={12} /> : <Eye size={12} className="text-[#F5B027]" />}
              </button>
              <button
                onClick={() => setIsUtilitiesOpen(true)}
                className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-[#F2EEE6]/70 text-[10px] font-mono flex items-center gap-1 transition-colors"
                title="Utilities Drawer"
              >
                <Settings size={12} className="text-[#F5B027]" />
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Notification Banner for Calendar Scan & Report Export */}
        {notification && (
          <div className="w-full bg-[#0E1116] border-t border-b border-[#F5B027]/30 px-4 py-2 flex items-center justify-between text-xs animate-in slide-in-from-top-1 duration-200">
            <div className="max-w-[1560px] mx-auto w-full flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-[#C78522] shrink-0" />
                <span className="text-[11px] font-mono text-[#F2EEE6] tracking-wide">
                  {notification.message}
                </span>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-[#F2EEE6]/50 hover:text-white transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. DYNAMIC CONTENT RENDERING BASED ON ACTIVE VIEW */}
      {dashboardView === 'inbox' ? (
        <main className="relative z-10 w-full flex-1">
          <ActionableInboxView
            people={sortedPeople}
            onOpenTileWorkspace={(tileId) => setActiveWorkspaceTile(tileId)}
            onSelectPerson={(p) => {
              setSelectedPerson(p);
              setIsSidebarOpen(true);
            }}
          />
        </main>
      ) : dashboardView === 'graph' ? (
        <main className="relative z-10 w-full flex-1">
          <NetworkGraphView
            people={sortedPeople}
            onSelectPerson={(p) => {
              setSelectedPerson(p);
              setIsSidebarOpen(true);
            }}
            onOpenPredictiveInsights={() => setIsPredictiveModalOpen(true)}
          />
        </main>
      ) : dashboardView === 'heatmap' ? (
        <main className="relative z-10 w-full flex-1">
          <NetworkClusterHeatmapView
            people={sortedPeople}
            calendarEvents={INITIAL_CALENDAR}
            onSelectPerson={(p) => {
              setSelectedPerson(p);
              setIsSidebarOpen(true);
            }}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onOpenGraph={() => setDashboardView('graph')}
          />
        </main>
      ) : (
        /* Standard 24-Tile System Grid View */
        <>
          {/* HERO HEADLINE & SUBHEAD */}
          <section className="relative z-10 w-full pt-8 sm:pt-11 pb-5 sm:pb-7 px-4 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto">
            <h1 className="font-serif-editorial text-3xl sm:text-5xl lg:text-[56px] leading-[1.06] font-normal tracking-[-0.01em] text-[#F2EEE6]">
              One Connected System for <span className="text-[#F5B027] font-semibold">CEOs.</span>
            </h1>
            <p className="mt-2.5 sm:mt-3 font-serif-editorial text-xs sm:text-[14px] leading-relaxed tracking-[0.06em] text-[#F2EEE6]/75">
              Relationships. CRM. Grid. Work. Meetings. Intelligence. All connected.
            </p>

            {/* Status Legend Bar */}
            <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-mono text-[#F2EEE6]/60 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#C78522] shadow-[0_0_6px_rgba(63,179,127,0.7)]" />
                <span>Active ({people.filter((p) => p.engagement === 'active' || !p.engagement).length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F5B027] shadow-[0_0_6px_rgba(242,169,59,0.7)]" />
                <span>Follow-up Needed ({people.filter((p) => p.engagement === 'followup').length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#64748B]" />
                <span>Dormant ({people.filter((p) => p.engagement === 'dormant').length})</span>
              </div>
              <span className="text-white/20 hidden sm:inline">|</span>
              <button
                onClick={() => {
                  if (topPerson) {
                    setSelectedPerson(topPerson);
                    setIsSidebarOpen(true);
                  }
                }}
                className="text-[10px] text-[#F5B027] hover:underline flex items-center gap-1"
              >
                <span>Current Focus:</span>
                <span className="font-bold text-[#F2EEE6]">{topPerson?.name || 'Network Sync'}</span>
                <span className="text-[9px] font-mono text-[#F5B027]">(Inspect Dossier →)</span>
              </button>
            </div>
          </section>

          {/* THE 24 TILES GRID (Exact 8x3 Image Order) */}
          <main className="relative z-10 w-full flex-1 max-w-[1560px] mx-auto px-3 sm:px-6 lg:px-8 pb-14">
            {/* Network Pulse & Activity Velocity Header Tile */}
            <NetworkPulseHeaderTile
              people={sortedPeople}
              onOpenGraph={() => setDashboardView('graph')}
              onOpenHeatmap={() => setDashboardView('heatmap')}
            />

            {/* 1. Persistent, keyboard-triggered Command Palette (Cmd+K) at the top of the grid */}
            <PersistentGridCommandPalette
              people={sortedPeople}
              selectedPerson={selectedPerson}
              onSelectPerson={(p) => {
                setSelectedPerson(p);
                setIsSidebarOpen(true);
              }}
              sortMode={sortMode}
              onSortChange={setSortMode}
              onScanCalendar={handleScanCalendar}
              onDownloadReport={handleDownloadReport}
              onSwitchView={(v) => setDashboardView(v)}
              onOpenCheatSheet={() => setIsCheatSheetOpen(true)}
              onOpenPredictiveInsights={() => setIsPredictiveModalOpen(true)}
              filterStatus={gridFilterStatus}
              onFilterStatusChange={setGridFilterStatus}
              tierFilter={gridTierFilter}
              onTierFilterChange={setGridTierFilter}
              selectedTag={gridSelectedTag}
              onSelectTag={setGridSelectedTag}
              activityHistoryFilter={gridActivityHistoryFilter}
              onActivityHistoryFilterChange={setGridActivityHistoryFilter}
              searchQuery={gridSearchQuery}
              onSearchQueryChange={setGridSearchQuery}
              onOpenFullTextSearch={() => setIsFullTextSearchOpen(true)}
              heatmapActive={heatmapActive}
              onToggleHeatmap={() => setHeatmapActive((prev) => !prev)}
              heatmapMode={heatmapMode}
              onToggleHeatmapMode={() => setHeatmapMode((prev) => (prev === 'sector' ? 'frequency' : 'sector'))}
            />

            {/* 2. Recharts 30-Day Relationship Engagement Trends & Telemetry */}
            <Dashboard30DayTrendChart
              people={filteredGridPeople}
              topPerson={topPerson}
            />

            {/* Visual Heatmap Overlay Controller & Editorial Legend */}
            {heatmapActive && (
              <div className="mb-3.5 p-3 sm:p-3.5 rounded-xl bg-[#0E1116] border border-[#F5B027]/40 shadow-[0_0_25px_rgba(249,115,22,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#F5B027]/20 border border-[#F5B027]/40 flex items-center justify-center text-base shrink-0">
                    🔥
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-[#F5B027]">
                        Activity Density Heatmap Active
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-[#F2EEE6]/70">
                        {heatmapMode === 'sector' ? 'Professional Sector Density' : 'Time-Based Connection Cadence'}
                      </span>
                    </div>
                    <div className="text-xs text-[#F2EEE6]/80 font-serif-editorial truncate">
                      {heatmapMode === 'sector'
                        ? 'Highlighting activity density across Sovereign Tech, Aerospace, Deep Tech, Enterprise SaaS & Syndicates.'
                        : 'Highlighting connection cadence: 24h Daily touchpoints, 48h SLAs, vs 48d/64d half-life drift alerts.'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap justify-between md:justify-end">
                  {/* Legend Scale */}
                  <div className="flex items-center gap-2 text-[9px] font-mono flex-wrap">
                    <span className="flex items-center gap-1 text-[#F5B027]">
                      <span className="w-2 h-2 rounded-full bg-[#F5B027] shadow-[0_0_6px_rgba(249,115,22,0.8)]" />
                      <span>&gt;88% High Density</span>
                    </span>
                    <span className="flex items-center gap-1 text-[#C78522]">
                      <span className="w-2 h-2 rounded-full bg-[#C78522] shadow-[0_0_6px_rgba(63,179,127,0.8)]" />
                      <span>75–87% Optimal</span>
                    </span>
                    <span className="flex items-center gap-1 text-[#F5B027]">
                      <span className="w-2 h-2 rounded-full bg-[#F5B027]" />
                      <span>60–74% Baseline</span>
                    </span>
                    <span className="flex items-center gap-1 text-[#94A3B8]">
                      <span className="w-2 h-2 rounded-full bg-[#64748B]" />
                      <span>&lt;60% Drift Alert</span>
                    </span>
                  </div>

                  {/* Mode switch & dismiss */}
                  <div className="flex items-center gap-1.5 border-l border-white/10 pl-2 shrink-0">
                    <button
                      onClick={() => setHeatmapMode((prev) => (prev === 'sector' ? 'frequency' : 'sector'))}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[#F2EEE6] text-[10px] font-mono font-medium transition-all"
                    >
                      Switch to {heatmapMode === 'sector' ? 'Cadence' : 'Sector'}
                    </button>
                    <button
                      onClick={() => setHeatmapActive(false)}
                      className="p-1 rounded text-[#F2EEE6]/50 hover:text-white transition-colors"
                      title="Dismiss Heatmap Overlay"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Inactivity Notification System Control Banner */}
            {isInactivityAlertActive && (
              <div className="mb-3.5 p-3 sm:p-3.5 rounded-xl bg-[#140A0D] border border-[#C78522]/40 shadow-[0_0_20px_rgba(229,72,77,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#C78522]/20 border border-[#C78522]/40 flex items-center justify-center text-sm shrink-0 text-[#FF6369]">
                    <AlertTriangle size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-[#FF6369]">
                        Inactivity Notification System Active
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#C78522]/25 text-[#FF6369] font-bold">
                        {alertedConnectionTilesCount} Connection Tiles Exceed SLA Threshold
                      </span>
                    </div>
                    <div className="text-xs text-[#F2EEE6]/80 font-serif-editorial truncate">
                      Highlighting relationship connection tiles where &gt;{inactivityThreshold} days have passed since the last interaction (e.g. Arthur Pendelton: 48d, Priya Sharma: 64d).
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap justify-between md:justify-end">
                  {/* Predefined Days Threshold Selector */}
                  <div className="flex items-center gap-1 text-[9px] font-mono">
                    <span className="text-[#F2EEE6]/50 mr-1 text-[9.5px]">Threshold:</span>
                    {[7, 14, 30, 45, 60].map((days) => (
                      <button
                        key={days}
                        onClick={() => {
                          setInactivityThreshold(days);
                          setNotification({
                            message: `Inactivity notification threshold updated to ${days} days. Stale touchpoints highlighted across grid.`,
                            type: 'info',
                          });
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                          inactivityThreshold === days
                            ? 'bg-[#C78522] text-white font-bold shadow-sm'
                            : 'bg-white/5 hover:bg-white/10 text-[#F2EEE6]/70'
                        }`}
                      >
                        {days}d{days === 30 ? ' (Default)' : ''}
                      </button>
                    ))}
                  </div>

                  {/* Toggle / Dismiss */}
                  <div className="flex items-center gap-1.5 border-l border-white/10 pl-2 shrink-0">
                    <button
                      onClick={() => setIsInactivityAlertActive(false)}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[#F2EEE6]/60 hover:text-white text-[10px] font-mono transition-all"
                      title="Hide Inactivity Drift Alerts"
                    >
                      Hide Alerts
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Match status feedback when filtered */}
            {(gridFilterStatus !== 'all' ||
              gridTierFilter !== 'all' ||
              gridSelectedTag !== null ||
              gridActivityHistoryFilter !== 'all' ||
              gridSearchQuery.trim()) && (
              <div className="mb-3.5 px-3 py-1.5 rounded-lg bg-[#0E1116] border border-white/10 flex items-center justify-between text-xs font-mono">
                <span className="text-[#F5B027]">
                  Showing {filteredGridPeople.length} of {people.length} executive connections
                  {gridFilterStatus !== 'all' && ` · Status: ${gridFilterStatus}`}
                  {gridTierFilter !== 'all' && ` · Tier: ${gridTierFilter}`}
                  {gridSelectedTag && ` · Tag: #${gridSelectedTag}`}
                  {gridActivityHistoryFilter !== 'all' && ` · Activity: ${gridActivityHistoryFilter}`}
                  {gridSearchQuery.trim() && ` · Query: "${gridSearchQuery}"`}
                </span>
                <button
                  onClick={() => {
                    setGridFilterStatus('all');
                    setGridTierFilter('all');
                    setGridSelectedTag(null);
                    setGridActivityHistoryFilter('all');
                    setGridSearchQuery('');
                  }}
                  className="text-[#F2EEE6]/60 hover:text-white underline text-[10px]"
                >
                  Reset Grid Filters
                </button>
              </div>
            )}

            <div
              role="region"
              aria-label="Aetheris Intelligence Grid"
              className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2.5 sm:gap-3"
            >
              {TILE_ORDER.map((tileId, index) => {
                const summary = summaries[tileId];
                if (!summary) return null;

                const PreviewComponent = PREVIEW_COMPONENTS[tileId];
                const tileEngagement = getTileEngagement(tileId);
                const tileTier = getTileTier(tileId);
                const heatmapData = getTileHeatmapData(tileId);

                return (
                  <SystemTile
                    key={tileId}
                    index={index}
                    tileId={tileId}
                    title={summary.title}
                    caption={summary.caption}
                    onClick={() => {
                      setFocusedTileIndex(index);
                      if (tileId === 'relationship-network' && topPerson) {
                        setSelectedPerson(topPerson);
                      }
                      setActiveWorkspaceTile(tileId);
                    }}
                    engagement={tileEngagement}
                    tier={tileTier}
                    heatmapActive={heatmapActive}
                    heatmapScore={heatmapData.score}
                    heatmapLabel={heatmapData.label}
                    isKeyboardFocused={focusedTileIndex === index}
                    isInactivityAlerted={isTileInactivityAlerted(tileId)}
                    inactivityDays={getTileInactivityDays(tileId)}
                    inactivityThreshold={inactivityThreshold}
                    onAttachVoiceNote={() =>
                      setVoiceModalTile({
                        id: tileId,
                        title: summary.title.replace('\n', ' '),
                      })
                    }
                  >
                    {PreviewComponent ? (
                      <PreviewComponent summary={summary} />
                    ) : (
                      <div className="text-xs text-[#F2EEE6]/50">Module Ready</div>
                    )}
                  </SystemTile>
                );
              })}
            </div>
          </main>
        </>
      )}

      {/* 3. FOOTER BAND OVER DARK MOUNTAIN HORIZON */}
      <footer className="relative z-10 w-full border-t border-[rgba(255,255,255,0.06)] bg-[#050709] overflow-hidden">
        {/* Persistent Visual Key-Map Dock */}
        <PersistentFooterKeyMap
          focusedTileIndex={focusedTileIndex}
          totalTiles={TILE_ORDER.length}
          focusedTileTitle={focusedTileIndex !== null ? summaries[TILE_ORDER[focusedTileIndex]]?.title : undefined}
          onNavigatePrev={() => {
            setFocusedTileIndex((prev) => {
              const next = prev !== null ? (prev > 0 ? prev - 1 : TILE_ORDER.length - 1) : 0;
              const el = document.getElementById(`tile-${TILE_ORDER[next]}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              return next;
            });
          }}
          onNavigateNext={() => {
            setFocusedTileIndex((prev) => {
              const next = prev !== null ? (prev < TILE_ORDER.length - 1 ? prev + 1 : 0) : 0;
              const el = document.getElementById(`tile-${TILE_ORDER[next]}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              return next;
            });
          }}
          onOpenFocusedTile={() => {
            if (focusedTileIndex !== null) {
              setActiveWorkspaceTile(TILE_ORDER[focusedTileIndex]);
            }
          }}
          onOpenCommandPalette={() => setIsCommandOpen(true)}
          onOpenFullTextSearch={() => setIsFullTextSearchOpen(true)}
          onOpenCheatSheet={() => setIsCheatSheetOpen(true)}
          onSwitchView={(v) => setDashboardView(v)}
          activeView={dashboardView}
        />

        {/* Mountain Horizon Atmospheric Background Graphic */}
        <div className="absolute inset-0 pointer-events-none opacity-40 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#F5B027]/10 via-[#F5B027]/10 to-transparent" />
          <svg
            className="w-full h-full object-cover"
            viewBox="0 0 1440 280"
            preserveAspectRatio="none"
            fill="none"
          >
            <path
              d="M0,170 L90,145 L180,180 L290,135 L420,165 L550,110 L680,155 L790,95 L910,140 L1040,115 L1170,160 L1290,125 L1440,155 L1440,280 L0,280 Z"
              fill="rgba(14, 17, 22, 0.9)"
            />
            <path
              d="M0,185 L110,165 L220,195 L340,150 L470,175 L590,130 L720,170 L830,120 L960,160 L1080,135 L1210,175 L1330,145 L1440,170"
              stroke="rgba(249, 115, 22, 0.35)"
              strokeWidth="1.5"
            />
            <path
              d="M0,200 L130,180 L270,215 L390,175 L520,205 L660,160 L780,200 L900,155 L1020,190 L1150,165 L1280,205 L1440,180 L1440,280 L0,280 Z"
              fill="#07090C"
            />
          </svg>
        </div>

        <div className="relative z-10 max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex flex-col items-center justify-center">
          <div className="font-serif-editorial text-[9.5px] sm:text-[11px] tracking-[0.35em] text-[#F2EEE6]/50 uppercase mb-3">
            E V E R Y T H I N G &nbsp;&nbsp; I N T R O S &nbsp;&nbsp; B R I N G S &nbsp;&nbsp; T O G E T H E R
          </div>

          <div className="text-center space-y-1.5 my-2">
            <h2 className="font-serif-editorial text-xl sm:text-3xl text-[#F2EEE6] tracking-[0.02em] font-normal">
              One person. One company. One relationship record.
            </h2>
            <h2 className="font-serif-editorial text-xl sm:text-3xl text-[#F5B027] tracking-[0.02em] font-medium">
              Everything connected.
            </h2>
            <p className="font-serif-editorial text-sm sm:text-base text-[#F2EEE6]/60 italic tracking-[0.04em] pt-1">
              Who matters. Why they matter. Why now.
            </p>
          </div>

          <div className="w-full pt-8 sm:pt-10 flex items-center justify-between border-t border-[rgba(255,255,255,0.05)] mt-6">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center justify-center">
                <span className="font-serif-editorial text-2xl font-light text-[#F2EEE6] leading-none">
                  ▲
                </span>
                <span className="font-serif-editorial text-[9px] tracking-[0.35em] text-[#F2EEE6] uppercase mt-1 leading-none">
                  AETHERIS
                </span>
                <span className="font-serif-editorial text-[7.5px] tracking-[0.45em] text-[#F2EEE6]/60 uppercase leading-none mt-0.5">
                  INTROS
                </span>
              </div>
            </div>

            <div className="text-[7.5px] sm:text-[8px] font-mono tracking-[0.18em] text-[#F2EEE6]/40 uppercase text-right leading-tight">
              <div>RELATIONSHIPS</div>
              <div>CREATE</div>
              <div>OPPORTUNITIES</div>
              <div>OPPORTUNITIES</div>
              <div>CREATE</div>
              <div className="text-[#F5B027] font-semibold">FREEDOM</div>
            </div>
          </div>
        </div>
      </footer>

      {/* 4. COLLAPSIBLE EXECUTIVE INTELLIGENCE SIDEBAR */}
      <ExecutiveIntelligenceSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((prev) => !prev)}
        selectedPerson={selectedPerson || topPerson}
        onSelectPerson={(p) => setSelectedPerson(p)}
        people={sortedPeople}
        calendarEvents={INITIAL_CALENDAR}
        onOpenGraph={() => setDashboardView('graph')}
        onOpenWorkspace={(tileId) => setActiveWorkspaceTile(tileId)}
        isBiometricUnlocked={isBiometricUnlocked}
        onTriggerBiometricAuth={() => setIsBiometricModalOpen(true)}
        onToggleBiometricLock={() => {
          setIsBiometricUnlocked(false);
          setNotification({
            message: 'Biometric Enclave Re-locked: Executive Intelligence encrypted.',
            type: 'info',
          });
        }}
        onAddTaskToInbox={(title, person) => {
          setNotification({
            message: `Action item committed to Inbox: "${title.slice(0, 48)}..."`,
            type: 'success',
          });
        }}
      />

      {/* Biometric Guard Modal (FaceID / TouchID) */}
      <BiometricGuardModal
        isOpen={isBiometricModalOpen}
        onClose={() => setIsBiometricModalOpen(false)}
        onSuccess={() => {
          setIsBiometricUnlocked(true);
          setNotification({
            message: 'FaceID Verified: Confidential executive pipeline and intelligence decrypted.',
            type: 'success',
          });
        }}
      />

      {/* Predictive Insights Modal (LLM Network Analysis) */}
      <PredictiveInsightsModal
        isOpen={isPredictiveModalOpen}
        onClose={() => setIsPredictiveModalOpen(false)}
        people={sortedPeople}
        onSelectPerson={(p) => {
          setSelectedPerson(p);
          setIsSidebarOpen(true);
          setIsPredictiveModalOpen(false);
        }}
        onAddTask={(title, person) => {
          setNotification({
            message: `Added to Actionable Inbox: "${title.slice(0, 48)}..."`,
            type: 'success',
          });
        }}
      />

      {/* Capability Workspace Modal */}
      <WorkspaceModal
        activeTileId={activeWorkspaceTile}
        onClose={() => setActiveWorkspaceTile(null)}
        onOpenApprovalQueue={() => {
          setActiveWorkspaceTile(null);
          setIsApprovalOpen(true);
        }}
        pendingApprovalsCount={pendingApprovalsCount}
      />

      {/* Approval Queue Modal */}
      <ApprovalQueueModal
        isOpen={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
        approvals={approvals}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Utilities Modal */}
      <UtilitiesModal
        isOpen={isUtilitiesOpen}
        onClose={() => setIsUtilitiesOpen(false)}
      />

      {/* Command Palette Modal (Cmd+K) with Real-Time Predictive Search */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onSelectTile={(tileId) => setActiveWorkspaceTile(tileId)}
        people={sortedPeople}
        sortMode={sortMode}
        onSortChange={setSortMode}
        onScanCalendar={handleScanCalendar}
        onDownloadReport={handleDownloadReport}
        onSwitchView={(v) => setDashboardView(v)}
        onSelectPerson={(p) => {
          setSelectedPerson(p);
          setIsSidebarOpen(true);
        }}
        onOpenCheatSheet={() => setIsCheatSheetOpen(true)}
        onOpenPredictiveInsights={() => setIsPredictiveModalOpen(true)}
      />

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <KeyboardCheatSheetModal
        isOpen={isCheatSheetOpen}
        onClose={() => setIsCheatSheetOpen(false)}
        onExecuteAction={(actionId) => {
          if (actionId === 'command') setIsCommandOpen(true);
          else if (actionId === 'full_text_search') setIsFullTextSearchOpen(true);
          else if (actionId === 'sidebar') setIsSidebarOpen(true);
          else if (actionId === 'predictive') setIsPredictiveModalOpen(true);
          else if (actionId === 'view_grid') setDashboardView('grid');
          else if (actionId === 'view_inbox') setDashboardView('inbox');
          else if (actionId === 'view_graph') setDashboardView('graph');
          else if (actionId === 'view_heatmap') setDashboardView('heatmap');
          else if (actionId === 'scan_calendar') handleScanCalendar();
          else if (actionId === 'export_csv') handleDownloadReport();
          else if (actionId === 'open_tile' && focusedTileIndex !== null) setActiveWorkspaceTile(TILE_ORDER[focusedTileIndex]);
        }}
      />

      {/* Voice Notes to Tile Minutes Modal (LLM Processing) */}
      {voiceModalTile && (
        <TileVoiceMinutesModal
          isOpen={!!voiceModalTile}
          onClose={() => setVoiceModalTile(null)}
          tileId={voiceModalTile.id}
          tileTitle={voiceModalTile.title}
          linkedPerson={topPerson}
          onMinutesSaved={(minutes) => {
            setNotification({
              message: `AI Meeting Minutes attached to ${voiceModalTile.title}: "${minutes.title}"`,
              type: 'success',
            });
          }}
          onSendTasksToInbox={(tasks, personName) => {
            setNotification({
              message: `Committed ${tasks.length} action item(s) from voice dictation into Actionable Inbox!`,
              type: 'success',
            });
          }}
        />
      )}

      {/* Full-Text Search Modal across Profiles, Tags, and Meeting Notes (Cmd+F) */}
      <FullTextSearchModal
        isOpen={isFullTextSearchOpen}
        onClose={() => setIsFullTextSearchOpen(false)}
        people={sortedPeople}
        onSelectPerson={(p) => {
          setSelectedPerson(p);
          setIsSidebarOpen(true);
        }}
        onOpenTileWorkspace={(tileId) => setActiveWorkspaceTile(tileId)}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      {/* Floating Quick Add Contact Button (FAB) */}
      <div className="fixed bottom-20 right-6 z-40">
        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="px-4 py-3 rounded-2xl bg-[#F5B027] hover:bg-[#F5B027]/90 text-white font-mono text-xs font-medium shadow-[0_10px_30px_rgba(199, 133, 34,0.6)] flex items-center gap-2 transition-all active:scale-95 group"
          title="Quickly add a new executive contact (Quick Add)"
        >
          <span className="text-base font-bold">+</span>
          <span className="hidden sm:inline">Quick Add Contact</span>
        </button>
      </div>

      {/* Quick Add Contact Modal */}
      <QuickAddContactModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onAddContact={(newPerson) => {
          setPeople((prev) => [newPerson, ...prev]);
          setNotification({
            message: `Successfully indexed new executive contact: ${newPerson.name} (${newPerson.company})`,
            type: 'success',
          });
        }}
      />

      {/* Executive Daily Digest Modal (Morning Briefing on Load) */}
      <DailyDigestModal
        isOpen={isDailyDigestOpen}
        onClose={() => setIsDailyDigestOpen(false)}
        people={sortedPeople}
        onSelectPerson={(p) => {
          setSelectedPerson(p);
          setIsSidebarOpen(true);
        }}
        onOpenTileWorkspace={(tileId) => setActiveWorkspaceTile(tileId)}
      />
    </div>
  );
};
