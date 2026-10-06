import React, { useState } from 'react';
import {
  ChevronRight,
  Plus,
  Check,
  CheckSquare,
  Search,
  Folder,
  User,
  AlertTriangle,
  DollarSign,
  ArrowDown,
  Layers,
  Sparkles,
  Link,
  Target,
  FileText,
  Building2,
  Users,
  Repeat,
  Share2,
  TrendingUp,
  Compass,
  ArrowRight,
  Shield,
  Circle,
  Eye,
  Briefcase,
  Lightbulb,
  Mic,
  Square,
} from 'lucide-react';
import { TileSummary } from '../../types';
import { EngagementChart } from '../EngagementChart';
import { RelationshipTierBadge } from '../RelationshipTierBadge';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import emptyStateImg from '../../../assets/images/network_empty_state_1791252869482.jpg';

interface PreviewProps {
  summary: TileSummary;
  onTaskToggle?: (taskId: string, e: React.MouseEvent) => void;
}

// 1. RELATIONSHIP NETWORK
export const RelationshipNetworkPreview: React.FC<PreviewProps> = ({ summary }) => {
  const { isRecording, startRecording, stopRecording, savedNote } = useVoiceRecorder();

  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="No connections" />;
  }
  const { person, connectionScore, avatars, overflowCount } = summary.data;

  // 30 days of relationship engagement trajectory data
  const engagementData = [
    { date: '1', value: 42 },
    { date: '3', value: 48 },
    { date: '5', value: 45 },
    { date: '7', value: 55 },
    { date: '9', value: 50 },
    { date: '11', value: 62 },
    { date: '13', value: 58 },
    { date: '15', value: 68 },
    { date: '17', value: 65 },
    { date: '19', value: 74 },
    { date: '21', value: 71 },
    { date: '23', value: 80 },
    { date: '25', value: 85 },
    { date: '27', value: 82 },
    { date: '28', value: 89 },
    { date: '29', value: 92 },
    { date: '30', value: 94 },
  ];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-[#3FB37F] shadow-[0_0_6px_rgba(63,179,127,0.7)]';
      case 'followup':
        return 'bg-[#F2A93B] shadow-[0_0_6px_rgba(242,169,59,0.7)]';
      case 'dormant':
        return 'bg-[#64748B]';
      default:
        return 'bg-[#3FB37F] shadow-[0_0_6px_rgba(63,179,127,0.7)]';
    }
  };

  return (
    <div className="flex flex-col h-full w-full justify-between">
      {/* Dark inner card */}
      <div className="bg-[#090C10] p-2 rounded-md border border-white/5 space-y-1.5 relative overflow-hidden">
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative shrink-0">
              <img
                src={person.avatar}
                alt={person.name}
                className="w-7 h-7 rounded-full object-cover border border-white/10"
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${getStatusColor(
                  person.engagement
                )} ring-1 ring-[#0E1116]`}
                title={`Engagement: ${person.engagement || 'Active'}`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-bold text-[#F2EEE6] leading-tight truncate flex items-center gap-1">
                <span className="truncate">{person.name}</span>
                <span className="text-[9px] font-mono text-[#3D6BF2]">({connectionScore})</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <RelationshipTierBadge tier={person.tier || 'inner_circle'} size="xs" />
                <span className="text-[7.5px] text-[#F2EEE6]/60 leading-tight truncate">
                  {person.title}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              isRecording ? stopRecording() : startRecording();
            }}
            className={`p-1.5 rounded-full transition-all shrink-0 ${
              isRecording
                ? 'bg-[#E5484D] text-white animate-pulse shadow-[0_0_8px_rgba(229,72,77,0.8)]'
                : 'bg-white/10 hover:bg-white/20 text-[#F2EEE6]'
            }`}
            title={isRecording ? 'Click to stop & save note' : 'Click to dictate voice note'}
          >
            {isRecording ? <Square size={9} /> : <Mic size={9} />}
          </button>
        </div>

        {/* Live voice recording feedback or 30-day engagement chart */}
        {isRecording ? (
          <div className="h-[44px] flex items-center justify-center gap-1.5 bg-[#E5484D]/10 rounded border border-[#E5484D]/30 px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E5484D] animate-ping" />
            <span className="text-[8.5px] font-mono text-[#E5484D] font-medium tracking-wide">
              Listening & Transcribing...
            </span>
          </div>
        ) : savedNote ? (
          <div className="h-[44px] flex flex-col justify-center bg-[#3FB37F]/10 rounded border border-[#3FB37F]/25 px-2 py-0.5 text-left">
            <span className="text-[7.5px] font-mono text-[#3FB37F] font-bold uppercase tracking-wider flex items-center gap-1">
              <Check size={8} /> Voice Note Saved
            </span>
            <span className="text-[8px] text-[#F2EEE6]/80 truncate italic">
              "{savedNote}"
            </span>
          </div>
        ) : (
          <div className="pt-0.5">
            <div className="flex items-center justify-between text-[7.5px] font-mono text-[#F2EEE6]/40 px-0.5 pb-0.5">
              <span>30-Day Trajectory</span>
              <span className="text-[#3D6BF2]">+14% MoM</span>
            </div>
            <EngagementChart data={engagementData} height={36} />
          </div>
        )}
      </div>

      {/* Avatars stack */}
      <div className="flex items-center justify-center -space-x-1.5 pt-1">
        {avatars.map((av: string, i: number) => (
          <img
            key={i}
            src={av}
            alt="Executive"
            className="w-4.5 h-4.5 rounded-full object-cover border border-[#0E1116]"
          />
        ))}
        <span className="w-4.5 h-4.5 rounded-full bg-[#151922] border border-white/10 text-[7.5px] font-mono text-[#F2EEE6]/80 flex items-center justify-center font-semibold">
          {overflowCount}
        </span>
      </div>
    </div>
  );
};

// 2. INTROS CRM
export const IntrosCrmPreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="Directory empty" />;
  }
  const { cards } = summary.data;

  // Status mapping for cards
  const crmStatuses = ['active', 'active', 'followup'];

  return (
    <div className="flex flex-col justify-between h-full w-full relative">
      {/* 3 Tabs */}
      <div className="flex items-center justify-between text-[8px] font-mono tracking-wider border-b border-white/5 pb-1">
        <span className="bg-white/10 text-white font-bold px-1.5 py-0.5 rounded">People</span>
        <span className="text-[#F2EEE6]/50">Companies</span>
        <span className="text-[#F2EEE6]/50">Deals</span>
      </div>

      {/* 3 Ivory Cards */}
      <div className="space-y-1 my-auto">
        {cards.map((c: any, i: number) => {
          const status = crmStatuses[i % crmStatuses.length];
          const statusColor =
            status === 'active'
              ? 'bg-[#3FB37F]'
              : status === 'followup'
              ? 'bg-[#F2A93B]'
              : 'bg-[#64748B]';

          return (
            <div
              key={i}
              className="sys-card-ivory px-1.5 py-1 rounded flex items-center gap-1.5 shadow-sm text-[8.5px] leading-tight"
            >
              <div className="relative shrink-0">
                <img
                  src={c.avatar}
                  alt={c.name}
                  className="w-4 h-4 rounded-full object-cover shrink-0"
                />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${statusColor} ring-[0.5px] ring-white`}
                  title={`Status: ${status}`}
                />
              </div>
              <div className="min-w-0 flex-1 truncate">
                <div className="font-bold text-[#14161A] truncate flex items-center justify-between gap-1">
                  <span className="truncate">{c.name}</span>
                  <RelationshipTierBadge tier={i === 0 ? 'inner_circle' : i === 1 ? 'inner_circle' : 'strategic'} size="xs" showLabel={false} />
                </div>
                <div className="text-[7.5px] text-[#14161A]/70 truncate">{c.title}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Circular + button at bottom right */}
      <div className="absolute right-0 bottom-0 w-4 h-4 rounded-full bg-[#3D6BF2] text-white flex items-center justify-center text-[10px] font-bold shadow-md">
        +
      </div>
    </div>
  );
};

// 3. OPPORTUNITIES
export const OpportunitiesPreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="Pipeline $0" />;
  }
  const { total, stages } = summary.data;

  return (
    <div className="flex flex-col justify-between h-full w-full font-mono text-[8.5px]">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-1 text-[9px]">
        <span className="text-[#F2EEE6] font-semibold">Pipeline</span>
        <span className="text-[#3D6BF2] font-bold">{total} &gt;</span>
      </div>

      {/* Stage Table */}
      <div className="space-y-1.5 my-auto">
        {stages.map((st: any, i: number) => (
          <div key={i} className="flex items-center justify-between text-[8px] leading-tight border-b border-white/[0.04] pb-0.5">
            <span className="text-[#F2EEE6]/80 w-16 truncate">{st.name}</span>
            <span className="text-[#F2EEE6]/60 w-4 text-center">{st.count}</span>
            <span className="text-[#F2EEE6] font-bold text-right w-12">{st.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 4. AETHERIS GRID
export const AetherisGridPreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="Grid empty" />;
  }
  const { formula, rows } = summary.data;

  return (
    <div className="flex flex-col justify-between h-full w-full font-mono text-[7.5px]">
      {/* Ivory Mini-sheet */}
      <div className="sys-card-ivory p-1 rounded shadow-sm">
        <div className="grid grid-cols-6 border-b border-black/10 pb-0.5 font-bold text-[7px] text-[#14161A]/60">
          <span className="col-span-1">#</span>
          <span className="col-span-3">A</span>
          <span className="col-span-2 text-right">C</span>
        </div>
        <div className="divide-y divide-black/5 text-[#14161A]">
          {rows.map((r: any) => (
            <div key={r.row} className="grid grid-cols-6 py-0.5 items-center">
              <span className="col-span-1 text-[#14161A]/50 font-bold">{r.row}</span>
              <span className="col-span-3 truncate">{r.colA}</span>
              <span className="col-span-2 text-right font-medium truncate">{r.colC}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Formula Bar */}
      <div className="bg-[#090C10] px-1.5 py-0.5 rounded border border-white/5 text-[7px] text-[#F2EEE6]/70 truncate mt-1">
        {formula}
      </div>
    </div>
  );
};

// 5. SIGNALS
export const SignalsPreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="No signals" />;
  }
  const { items } = summary.data;

  return (
    <div className="flex flex-col justify-between h-full w-full space-y-0.5 py-0.5">
      {items.map((item: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 text-[8px] leading-tight">
          <span
            className="w-2.5 h-2.5 rounded-[2px] shrink-0 flex items-center justify-center text-[6px] text-white font-bold"
            style={{ backgroundColor: item.color }}
          >
            ●
          </span>
          <span className="text-[#F2EEE6]/90 truncate">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

// 6. CALENDAR
export const CalendarPreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="Calendar clear" />;
  }
  const { events } = summary.data;

  return (
    <div className="flex flex-col justify-between h-full w-full">
      <div className="flex items-center justify-between text-[8px] font-mono text-[#F2EEE6]/70 border-b border-white/5 pb-1">
        <span>Today</span>
        <span className="w-3 h-3 rounded-full bg-white/10 flex items-center justify-center text-[9px] text-white">
          +
        </span>
      </div>

      <div className="space-y-1 my-auto">
        {events.map((ev: any, i: number) => (
          <div key={i} className="flex items-start gap-1.5 text-[7.5px] leading-tight">
            <span className="font-mono text-[#F2EEE6]/50 shrink-0 w-11">{ev.time}</span>
            <div className="pl-1 border-l-2 border-[#3D6BF2] truncate flex-1">
              <span className="font-semibold text-[#F2EEE6] block truncate">{ev.title}</span>
              <span className="text-[#F2EEE6]/50 block truncate text-[7px]">{ev.sub}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 7. MEETINGS
export const MeetingsPreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="No meetings" />;
  }
  const { meeting, checklist } = summary.data;

  return (
    <div className="flex flex-col justify-between h-full w-full">
      {/* Top Card */}
      <div className="bg-[#090C10] p-1.5 rounded border border-white/5 flex items-center gap-1.5">
        <img
          src={meeting.leadAvatar}
          alt={meeting.title}
          className="w-6 h-6 rounded object-cover shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="text-[8.5px] font-bold text-[#F2EEE6] truncate leading-tight">
            {meeting.title}
          </div>
          <div className="text-[7.5px] text-[#F2EEE6]/50 truncate leading-tight">
            {meeting.company}
          </div>
          <div className="flex items-center -space-x-1 mt-0.5">
            {meeting.attendees.map((att: string, i: number) => (
              <img
                key={i}
                src={att}
                alt="att"
                className="w-3.5 h-3.5 rounded-full object-cover border border-black"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[8px] pt-1 border-t border-white/5">
        {checklist.map((c: string, i: number) => (
          <div key={i} className="flex items-center gap-1 text-[#F2EEE6]/80 truncate">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-[#3D6BF2]/20 border border-[#3D6BF2] text-[#3D6BF2] flex items-center justify-center text-[6px] font-bold">
              ✓
            </span>
            <span className="truncate">{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 8. TASKS & WORK
export const TasksWorkPreview: React.FC<PreviewProps> = ({ summary, onTaskToggle }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="Tasks zero" />;
  }
  const { tasks } = summary.data;

  return (
    <div className="flex flex-col justify-between h-full w-full relative">
      <div className="space-y-1.5 my-auto">
        {tasks.map((task: any) => (
          <div
            key={task.id}
            onClick={(e) => onTaskToggle && onTaskToggle(task.id, e)}
            className="flex items-start gap-1.5 text-[8px] leading-tight cursor-pointer group"
          >
            <span className="w-2.5 h-2.5 rounded-[2px] border border-white/40 group-hover:border-[#3D6BF2] flex items-center justify-center text-[7px] text-[#3D6BF2] shrink-0 mt-0.5">
              ✓
            </span>
            <div className="truncate flex-1">
              <span className="text-[#F2EEE6] block truncate font-medium">{task.text}</span>
              <span className="text-[#F2EEE6]/50 block text-[7px] font-mono">{task.due}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Blue circular + button */}
      <div className="absolute right-0 bottom-0 w-4 h-4 rounded-full bg-[#3D6BF2] text-white flex items-center justify-center text-[10px] font-bold shadow-md">
        +
      </div>
    </div>
  );
};

// 9. INBOX
export const InboxPreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="Inbox zero" />;
  }
  const { threads } = summary.data;

  return (
    <div className="flex flex-col justify-between h-full w-full">
      {/* 3 tabs */}
      <div className="flex items-center gap-1 text-[7.5px] font-mono pb-1 border-b border-white/5">
        <span className="bg-[#3D6BF2] text-white px-2 py-0.5 rounded font-bold">All</span>
        <span className="text-[#F2EEE6]/60 px-1">Email</span>
        <span className="text-[#F2EEE6]/60 px-1">Messages</span>
      </div>

      {/* Ivory Card with threads */}
      <div className="sys-card-ivory p-1.5 rounded shadow-sm my-auto space-y-1">
        {threads.map((th: any, i: number) => (
          <div key={i} className="flex items-center justify-between text-[7.5px] border-b border-black/5 pb-0.5 last:border-0">
            <div className="flex items-center gap-1.5 truncate">
              <img src={th.avatar} alt={th.name} className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
              <div className="truncate">
                <span className="font-bold text-[#14161A] block truncate">{th.name}</span>
                <span className="text-[#14161A]/60 block text-[6.5px] truncate">{th.sub}</span>
              </div>
            </div>
            <span className="text-[6.5px] text-[#14161A]/50 font-mono shrink-0 ml-1">{th.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 10. KNOWLEDGE
export const KnowledgePreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="Vault empty" />;
  }
  const { folders } = summary.data;

  return (
    <div className="flex flex-col justify-between h-full w-full space-y-0.5 py-0.5">
      {folders.map((f: string, i: number) => (
        <div key={i} className="flex items-center gap-1.5 text-[8px] text-[#F2EEE6]/90 truncate">
          <Folder size={10} className="text-[#F2A93B] shrink-0" />
          <span className="truncate">{f}</span>
        </div>
      ))}
    </div>
  );
};

// 11. RELATIONSHIP RADAR
export const RelationshipRadarPreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="Radar empty" />;
  }
  const { hot, emerging, strategic, dormant, atRisk } = summary.data;

  return (
    <div className="flex flex-col justify-between h-full w-full">
      {/* Radar concentric circular graphic */}
      <div className="relative h-14 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border border-[#3D6BF2]/30 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-[#06B6D4]/30" />
          </div>
        </div>
        <span className="absolute top-1 right-2 text-[6.5px] font-mono text-[#F2EEE6]/40">43</span>
        <span className="absolute bottom-1 right-2 text-[6.5px] font-mono text-[#F2EEE6]/40">47</span>
      </div>

      {/* 5 Dots and counts */}
      <div className="space-y-0.5 text-[7.5px] font-mono">
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1 text-[#F2EEE6]/80">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E5484D]" /> Hot Now
          </span>
          <span className="text-[#F2EEE6] font-bold">{hot}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1 text-[#F2EEE6]/80">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F2A93B]" /> Emerging
          </span>
          <span className="text-[#F2EEE6] font-bold">{emerging}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1 text-[#F2EEE6]/80">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3D6BF2]" /> Strategic
          </span>
          <span className="text-[#F2EEE6] font-bold">{strategic}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1 text-[#F2EEE6]/80">
            <span className="w-1.5 h-1.5 rounded-full bg-[#64748B]" /> Dormant
          </span>
          <span className="text-[#F2EEE6] font-bold">{dormant}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1 text-[#F2EEE6]/80">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E5484D]" /> At Risk
          </span>
          <span className="text-[#F2EEE6] font-bold">{atRisk}</span>
        </div>
      </div>
    </div>
  );
};

// 12. CONNECTION PATHS
export const ConnectionPathsPreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="No path" />;
  }
  const { connector, target } = summary.data;

  return (
    <div className="flex flex-col justify-between items-center h-full w-full text-[7.5px] font-mono">
      {/* Node 1: You */}
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded-full bg-[#3D6BF2] text-white flex items-center justify-center text-[7px]">
          <User size={8} />
        </div>
        <span className="text-[#F2EEE6] font-bold">You</span>
      </div>

      <div className="w-0.5 h-2 bg-[#3D6BF2]/50" />

      {/* Node 2: Connector */}
      <div className="flex items-center gap-1.5">
        <img
          src={connector.avatar}
          alt={connector.name}
          className="w-4 h-4 rounded-full object-cover border border-[#3D6BF2]"
        />
        <div className="text-left">
          <span className="text-[6.5px] text-[#3D6BF2] block leading-none">{connector.role}</span>
          <span className="text-[#F2EEE6] font-bold block leading-none">{connector.name}</span>
        </div>
      </div>

      <div className="w-0.5 h-2 bg-[#3D6BF2]/50" />

      {/* Node 3: Target */}
      <div className="flex items-center gap-1.5">
        <img
          src={target.avatar}
          alt={target.name}
          className="w-4 h-4 rounded-full object-cover border border-white/20"
        />
        <div className="text-left">
          <span className="text-[6.5px] text-[#F2EEE6]/50 block leading-none">{target.role}</span>
          <span className="text-[#F2EEE6] font-bold block leading-none">{target.name}</span>
          <span className="text-[6.5px] text-[#F2EEE6]/60 block leading-none">{target.company}</span>
        </div>
      </div>
    </div>
  );
};

// 13. INTROS IQ
export const IntrosIqPreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="Graph idle" />;
  }
  const { placeholder, prompts } = summary.data;

  return (
    <div className="flex flex-col justify-between h-full w-full">
      {/* Search Input Bar */}
      <div className="bg-[#090C10] px-2 py-1 rounded border border-white/10 flex items-center justify-between text-[8px] text-[#F2EEE6]/50">
        <span>{placeholder}</span>
        <span className="text-[#3D6BF2] font-bold">&gt;</span>
      </div>

      {/* 5 Starter queries */}
      <div className="space-y-1 my-auto text-[7.5px] text-[#F2EEE6]/80">
        {prompts.map((p: string, i: number) => (
          <div key={i} className="flex items-center gap-1 truncate">
            <span className="w-1.5 h-1.5 rounded-full border border-white/40 shrink-0" />
            <span className="truncate">{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 14. NETWORK FORENSICS
export const NetworkForensicsPreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="No leaks" />;
  }
  const { dormant, missed, unfinished, atRisk, potential } = summary.data;

  return (
    <div className="flex flex-col justify-between h-full w-full space-y-1 text-[8px]">
      <div className="flex items-center gap-1.5 text-[#F2EEE6]/90">
        <AlertTriangle size={9} className="text-[#E5484D] shrink-0" />
        <span>{dormant} dormant contacts</span>
      </div>
      <div className="flex items-center gap-1.5 text-[#F2EEE6]/90">
        <AlertTriangle size={9} className="text-[#E5484D] shrink-0" />
        <span>{missed} missed follow-ups</span>
      </div>
      <div className="flex items-center gap-1.5 text-[#F2EEE6]/90">
        <AlertTriangle size={9} className="text-[#E5484D] shrink-0" />
        <span>{unfinished} unfinished intros</span>
      </div>
      <div className="flex items-center gap-1.5 text-[#F2EEE6]/90">
        <AlertTriangle size={9} className="text-[#E5484D] shrink-0" />
        <span>{atRisk} at risk opportunities</span>
      </div>
      <div className="flex items-center gap-1.5 text-[#F2EEE6] font-bold pt-0.5 border-t border-white/5">
        <DollarSign size={9} className="text-[#F2A93B] shrink-0" />
        <span>{potential} in potential value</span>
      </div>
    </div>
  );
};

// 15. DIGITAL YOU
export const DigitalYouPreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="Twin unconfigured" />;
  }
  const { avatar, actions } = summary.data;

  return (
    <div className="flex flex-col justify-between items-center h-full w-full">
      {/* Centered Avatar */}
      <img
        src={avatar}
        alt="Digital Twin"
        className="w-9 h-9 rounded object-cover border border-[#3D6BF2]/50"
      />

      {/* 5 Actions */}
      <div className="w-full space-y-0.5 text-[7.5px] text-[#F2EEE6]/90 mt-1">
        {actions.map((act: string, i: number) => (
          <div key={i} className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-[#3D6BF2] shrink-0" />
            <span className="truncate">{act}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 16. AUTOMATIONS
export const AutomationsPreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="No rules" />;
  }
  const { steps } = summary.data;

  return (
    <div className="flex flex-col justify-between items-center h-full w-full text-[8px] font-mono py-0.5">
      {steps.map((st: string, i: number) => (
        <React.Fragment key={st}>
          <div className="flex items-center gap-2 w-full px-2 py-0.5 bg-[#090C10] rounded border border-white/5 text-[#F2EEE6]">
            <span className="w-3.5 h-3.5 rounded bg-[#3D6BF2] text-white flex items-center justify-center text-[7px] font-bold shrink-0">
              {i + 1}
            </span>
            <span className="truncate font-medium">{st}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-0.5 h-1.5 bg-[#3D6BF2]/60" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// 17. ANALYTICS
export const AnalyticsPreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="Zero attribution" />;
  }
  const { roi, bars, legend } = summary.data;

  return (
    <div className="flex flex-col justify-between h-full w-full">
      <div>
        <div className="text-[7.5px] uppercase font-mono text-[#F2EEE6]/60">Relationship ROI</div>
        <div className="text-[14px] font-bold font-mono text-[#F2EEE6] leading-none mt-0.5">
          {roi}
        </div>
      </div>

      {/* Ascending Bar Chart */}
      <div className="h-8 flex items-end gap-1 px-1 my-1">
        {bars.map((h: number, i: number) => (
          <div key={i} className="flex-1 bg-white/5 rounded-t overflow-hidden h-full flex items-end">
            <div
              className={`w-full rounded-t ${i === bars.length - 1 ? 'bg-[#3D6BF2]' : 'bg-[#3D6BF2]/50'}`}
              style={{ height: `${h}%` }}
            />
          </div>
        ))}
      </div>

      {/* 4 Legend Dots */}
      <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[6.5px] font-mono text-[#F2EEE6]/70 border-t border-white/5 pt-0.5">
        {legend.map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-1 truncate">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="truncate">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 18. COMPANY INTELLIGENCE
export const CompanyIntelligencePreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="Registry empty" />;
  }
  const { company, tag, items } = summary.data;

  return (
    <div className="flex flex-col justify-between h-full w-full">
      {/* Top Company Card */}
      <div className="bg-[#090C10] p-1.5 rounded border border-white/5 flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-[#3D6BF2] flex items-center justify-center text-white shrink-0">
          <Building2 size={11} />
        </div>
        <div className="min-w-0 flex-1 truncate">
          <div className="text-[8.5px] font-bold text-[#F2EEE6] truncate">{company}</div>
          <div className="text-[7px] text-[#F2EEE6]/50 truncate">{tag}</div>
        </div>
      </div>

      {/* 6 Sections */}
      <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[7.5px] text-[#F2EEE6]/80 my-auto">
        {items.map((sec: string, i: number) => (
          <div key={i} className="flex items-center gap-1 truncate">
            <span className="w-1.5 h-1.5 rounded-[1px] bg-[#3D6BF2]/60 shrink-0" />
            <span className="truncate">{sec}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 19. INTRODUCTIONS
export const IntroductionsPreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="Zero intros" />;
  }
  const { partyA, partyB, title, sub, checklist } = summary.data;

  return (
    <div className="flex flex-col justify-between h-full w-full">
      {/* 2 faces with arrow */}
      <div className="flex items-center justify-center gap-2 pt-0.5">
        <img src={partyA} alt="A" className="w-6 h-6 rounded-full object-cover border border-white/20" />
        <span className="text-[8px] text-[#3D6BF2] font-mono">→</span>
        <img src={partyB} alt="B" className="w-6 h-6 rounded-full object-cover border border-white/20" />
      </div>

      <div className="text-center font-serif-editorial text-[9px] text-[#F2EEE6] leading-tight">
        <div>{title}</div>
        <div className="text-[#F2EEE6]/60 text-[8px]">{sub}</div>
      </div>

      {/* 4 Checklist steps */}
      <div className="space-y-0.5 text-[7.5px] font-mono text-[#F2EEE6]/80">
        {checklist.map((step: string, i: number) => (
          <div key={i} className="flex items-center gap-1 truncate">
            <span className="text-[#3D6BF2] font-bold text-[7px]">✓</span>
            <span className="truncate">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 20. RELATIONSHIP MEMORY
export const RelationshipMemoryPreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="Memory empty" />;
  }
  const { events } = summary.data;

  return (
    <div className="flex flex-col justify-between h-full w-full space-y-1 pl-2 border-l border-[#3D6BF2]/40 my-auto text-[7.5px]">
      {events.map((ev: any, i: number) => (
        <div key={i} className="relative pl-2 leading-tight">
          <span className="absolute -left-[11px] top-1 w-1.5 h-1.5 rounded-full bg-[#3D6BF2]" />
          <div className="font-semibold text-[#F2EEE6] truncate">{ev.title}</div>
          <div className="text-[6.5px] font-mono text-[#F2EEE6]/50">{ev.date}</div>
        </div>
      ))}
    </div>
  );
};

// 21. TEAM GRAPH
export const TeamGraphPreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="Single user" />;
  }
  const { yourTeam, target, sub, avatars } = summary.data;

  return (
    <div className="flex flex-col justify-between items-center h-full w-full text-[7px] font-mono">
      {/* Top cluster */}
      <div className="flex items-center -space-x-1">
        {avatars.slice(0, 3).map((av: string, i: number) => (
          <img key={i} src={av} alt="top" className="w-4 h-4 rounded-full object-cover border border-black" />
        ))}
      </div>

      {/* Middle bridge */}
      <div className="flex items-center justify-between w-full px-1">
        <div className="text-center">
          <img src={avatars[3]} alt="team" className="w-4 h-4 rounded-full object-cover mx-auto border border-[#3D6BF2]" />
          <span className="text-[#F2EEE6]/70 block">{yourTeam}</span>
        </div>
        <div className="w-4 h-0.5 bg-[#3D6BF2]/40" />
        <div className="text-center">
          <div className="w-4 h-4 rounded-full bg-[#3D6BF2] text-white flex items-center justify-center text-[7px] mx-auto">
            <Building2 size={8} />
          </div>
          <span className="text-[#F2EEE6] font-bold block">{target}</span>
          <span className="text-[6px] text-[#F2EEE6]/50 block">{sub}</span>
        </div>
      </div>

      {/* Bottom nodes */}
      <div className="flex items-center -space-x-1">
        {avatars.slice(3, 5).map((av: string, i: number) => (
          <img key={i} src={av} alt="bot" className="w-4 h-4 rounded-full object-cover border border-black" />
        ))}
      </div>
    </div>
  );
};

// 22. DIAGNOSTICS
export const DiagnosticsPreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="Diagnostics idle" />;
  }
  const { status, items } = summary.data;

  return (
    <div className="flex flex-col justify-between h-full w-full text-[7.5px] font-mono">
      <div className="text-[#F2EEE6] font-bold border-b border-white/5 pb-1">
        {status}
      </div>

      <div className="space-y-0.5 my-auto">
        {items.map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[#F2EEE6]/90 truncate">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="w-full py-1 rounded bg-[#3D6BF2] text-white font-bold text-[7px] flex items-center justify-center gap-1">
        <span>View Full Report</span>
        <span>→</span>
      </div>
    </div>
  );
};

// 23. GROWTH STUDIO
export const GrowthStudioPreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="Studio idle" />;
  }
  const { items } = summary.data;

  return (
    <div className="flex flex-col justify-between h-full w-full space-y-0.5 py-0.5">
      {items.map((item: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 text-[8px] text-[#F2EEE6]/90">
          <span
            className="w-2.5 h-2.5 rounded-[2px] flex items-center justify-center text-white shrink-0 text-[6px]"
            style={{ backgroundColor: item.color }}
          >
            ■
          </span>
          <span className="truncate">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

// 24. EXECUTIVE BRIEF
export const ExecutiveBriefPreview: React.FC<PreviewProps> = ({ summary }) => {
  if (summary.empty || !summary.data) {
    return <EmptyPreview nextAction={summary.next_action} label="Brief pending" />;
  }
  const { title, items } = summary.data;

  return (
    <div className="flex flex-col justify-between h-full w-full text-[7.5px]">
      <div className="font-bold text-[#F2EEE6] font-mono border-b border-white/5 pb-1">
        {title}
      </div>

      <div className="space-y-1 my-auto">
        {items.map((item: any, i: number) => (
          <div key={i} className="flex items-start gap-1.5 leading-tight">
            <span
              className="w-2 h-2 rounded-[2px] shrink-0 mt-0.5"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[#F2EEE6]/90 truncate">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const EmptyPreview: React.FC<{ nextAction?: string; label: string }> = ({
  nextAction,
  label,
}) => (
  <div className="flex flex-col items-center justify-center h-full text-center p-2">
    <img 
        src={emptyStateImg} 
        alt="Network empty state illustration" 
        className="w-16 h-16 opacity-60 rounded-md border border-white/10 mb-2 object-cover"
    />
    <span className="text-[10px] text-[#F2EEE6]/50 mb-1">{label}</span>
    <span className="text-[9px] text-[#3D6BF2] font-mono font-medium">{nextAction}</span>
  </div>
);

export const PREVIEW_COMPONENTS: Record<string, React.FC<PreviewProps>> = {
  'relationship-network': RelationshipNetworkPreview,
  'intros-crm': IntrosCrmPreview,
  'opportunities': OpportunitiesPreview,
  'aetheris-grid': AetherisGridPreview,
  'signals': SignalsPreview,
  'calendar': CalendarPreview,
  'meetings': MeetingsPreview,
  'tasks-work': TasksWorkPreview,
  'inbox': InboxPreview,
  'knowledge': KnowledgePreview,
  'relationship-radar': RelationshipRadarPreview,
  'connection-paths': ConnectionPathsPreview,
  'intros-iq': IntrosIqPreview,
  'network-forensics': NetworkForensicsPreview,
  'digital-you': DigitalYouPreview,
  'automations': AutomationsPreview,
  'analytics': AnalyticsPreview,
  'company-intelligence': CompanyIntelligencePreview,
  'introductions': IntroductionsPreview,
  'relationship-memory': RelationshipMemoryPreview,
  'team-graph': TeamGraphPreview,
  'diagnostics': DiagnosticsPreview,
  'growth-studio': GrowthStudioPreview,
  'executive-brief': ExecutiveBriefPreview,
};
