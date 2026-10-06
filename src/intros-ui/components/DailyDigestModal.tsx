import React from 'react';
import { Sparkles, Calendar, CheckSquare, AlertTriangle, X, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { Person, CalendarEvent, ActionableTaskItem } from '../types';
import { INITIAL_CALENDAR, INITIAL_ACTIONABLE_TASKS } from '../dataStore';
import { RelationshipTierBadge } from './RelationshipTierBadge';

interface DailyDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  onSelectPerson: (person: Person) => void;
  onOpenTileWorkspace: (tileId: string) => void;
}

export const DailyDigestModal: React.FC<DailyDigestModalProps> = ({
  isOpen,
  onClose,
  people,
  onSelectPerson,
  onOpenTileWorkspace,
}) => {
  if (!isOpen) return null;

  // Filter overdue/followup connections
  const followupPeople = people.filter((p) => p.engagement === 'followup' || p.radarBucket === 'at_risk' || p.radarBucket === 'dormant');
  const highPriorityTasks = INITIAL_ACTIONABLE_TASKS.filter((t) => t.priority === 'high' && !t.completed);
  const upcomingMeetings = INITIAL_CALENDAR;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Executive Daily Digest"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#090C10] border border-[#3D6BF2]/40 rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh] select-none animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-[#0E1116] via-[#101726] to-[#0E1116] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3D6BF2]/20 border border-[#3D6BF2]/50 flex items-center justify-center text-[#3D6BF2] shadow-[0_0_15px_rgba(61,107,242,0.3)]">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif-editorial text-xs tracking-[0.25em] text-[#3D6BF2] uppercase font-semibold">
                  E X E C U T I V E &nbsp; I N T E L L I G E N C E
                </span>
                <span className="px-1.5 py-0.2 rounded bg-[#3FB37F]/20 text-[#3FB37F] text-[9px] font-mono font-bold">
                  Morning Briefing
                </span>
              </div>
              <h2 className="font-serif-editorial text-xl sm:text-2xl text-[#F2EEE6] font-normal">
                Daily Network Digest & Action Queue
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#F2EEE6]/60 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#0E1116] border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#3D6BF2]/15 text-[#3D6BF2] flex items-center justify-center shrink-0">
                <Calendar size={18} />
              </div>
              <div>
                <div className="text-[10px] font-mono text-[#F2EEE6]/60 uppercase tracking-wider">
                  Upcoming Briefings
                </div>
                <div className="text-lg font-serif-editorial text-[#F2EEE6] font-medium">
                  {upcomingMeetings.length} Priority Meetings
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0E1116] border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#E5484D]/15 text-[#FF6369] flex items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <div className="text-[10px] font-mono text-[#F2EEE6]/60 uppercase tracking-wider">
                  Drift / Follow-ups
                </div>
                <div className="text-lg font-serif-editorial text-[#F2EEE6] font-medium">
                  {followupPeople.length} At-Risk Connections
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0E1116] border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#3FB37F]/15 text-[#3FB37F] flex items-center justify-center shrink-0">
                <CheckSquare size={18} />
              </div>
              <div>
                <div className="text-[10px] font-mono text-[#F2EEE6]/60 uppercase tracking-wider">
                  Actionable Commitments
                </div>
                <div className="text-lg font-serif-editorial text-[#F2EEE6] font-medium">
                  {highPriorityTasks.length} High-Priority Tasks
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Overdue Connections & Drift Alerts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-editorial text-sm sm:text-base text-[#F2EEE6] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E5484D] animate-ping" />
                <span>Overdue Connections & Drift Alerts ({followupPeople.length})</span>
              </h3>
              <button
                onClick={() => {
                  onOpenTileWorkspace('relationship-radar');
                  onClose();
                }}
                className="text-xs font-mono text-[#3D6BF2] hover:underline flex items-center gap-1"
              >
                <span>Open Radar</span>
                <ArrowRight size={12} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {followupPeople.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectPerson(p);
                    onClose();
                  }}
                  className="p-3 rounded-xl bg-[#0A0D12] border border-[#E5484D]/30 hover:border-[#E5484D] transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={p.avatar}
                      alt={p.name}
                      className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-serif-editorial text-sm font-medium text-[#F2EEE6] group-hover:text-white truncate">
                          {p.name}
                        </span>
                        {p.tier && <RelationshipTierBadge tier={p.tier} size="xs" showLabel={false} />}
                      </div>
                      <div className="text-[11px] font-mono text-[#F2EEE6]/60 truncate">
                        {p.title} · {p.company}
                      </div>
                      <div className="text-[10px] font-mono text-[#FF6369] mt-0.5">
                        {p.lastTouchpoint || 'Stale interaction record'}
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-1 rounded bg-[#E5484D]/20 text-[#FF6369] text-[10px] font-mono shrink-0 group-hover:bg-[#E5484D] group-hover:text-white transition-colors">
                    Restore →
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: High Priority Commitments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-editorial text-sm sm:text-base text-[#F2EEE6] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#3FB37F]" />
                <span>Actionable Commitments ({highPriorityTasks.length})</span>
              </h3>
              <button
                onClick={() => {
                  onOpenTileWorkspace('tasks-work');
                  onClose();
                }}
                className="text-xs font-mono text-[#3D6BF2] hover:underline flex items-center gap-1"
              >
                <span>Open Tasks Workspace</span>
                <ArrowRight size={12} />
              </button>
            </div>

            <div className="space-y-2">
              {highPriorityTasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  onClick={() => {
                    onOpenTileWorkspace('tasks-work');
                    onClose();
                  }}
                  className="p-3 rounded-xl bg-[#0E1116] border border-white/10 hover:border-[#3D6BF2]/50 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-serif-editorial text-xs sm:text-sm text-[#F2EEE6] font-medium truncate">
                      {task.title}
                    </div>
                    <div className="text-[11px] font-mono text-[#F2EEE6]/60 truncate mt-0.5">
                      {task.description}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-[#3D6BF2] text-[10px] font-mono shrink-0">
                    {task.dueDate}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#07090C] flex items-center justify-between">
          <div className="text-xs font-mono text-[#F2EEE6]/60">
            All 24 system modules synchronized and ready for executive operation.
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#3D6BF2] hover:bg-[#3D6BF2]/90 text-white text-xs font-mono font-medium shadow-[0_0_20px_rgba(61,107,242,0.4)] transition-all flex items-center gap-2"
          >
            <span>Enter Intelligence Grid</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
