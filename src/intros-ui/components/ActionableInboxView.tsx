import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Square,
  Clock,
  AlertTriangle,
  User,
  ShieldCheck,
  Check,
  X,
  Plus,
  ArrowRight,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ActionableTaskItem, Person } from '../types';
import { INITIAL_ACTIONABLE_TASKS } from '../dataStore';
import { RelationshipTierBadge } from './RelationshipTierBadge';

interface ActionableInboxViewProps {
  tasks?: ActionableTaskItem[];
  onOpenTileWorkspace?: (tileId: string) => void;
  onSelectPerson?: (person: Person) => void;
  people?: Person[];
}

export const ActionableInboxView: React.FC<ActionableInboxViewProps> = ({
  tasks: initialTasks = INITIAL_ACTIONABLE_TASKS,
  onOpenTileWorkspace,
  onSelectPerson,
  people = [],
}) => {
  const [tasks, setTasks] = useState<ActionableTaskItem[]>(initialTasks);
  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'approval' | 'commitment' | 'followup_drift'>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newPerson, setNewPerson] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [isAdding, setIsAdding] = useState(false);
  const [completedToast, setCompletedToast] = useState<string | null>(null);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const next = !t.completed;
          if (next) {
            setCompletedToast(`Marked completed: "${t.title}"`);
            setTimeout(() => setCompletedToast(null), 3000);
          }
          return { ...t, completed: next };
        }
        return t;
      })
    );
  };

  const handleApprove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: true } : t))
    );
    setCompletedToast(`Approved: Executive action dispatched`);
    setTimeout(() => setCompletedToast(null), 3000);
  };

  const handleReject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setCompletedToast(`Dismissed item`);
    setTimeout(() => setCompletedToast(null), 3000);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: ActionableTaskItem = {
      id: `task-custom-${Date.now()}`,
      sourceTile: 'tasks-work',
      sourceTileTitle: 'Tasks & Work',
      title: newTitle.trim(),
      type: 'commitment',
      priority: newPriority,
      dueDate: 'Today · Manual Entry',
      completed: false,
      linkedPerson: newPerson || undefined,
    };

    setTasks([newTask, ...tasks]);
    setNewTitle('');
    setNewPerson('');
    setIsAdding(false);
    setCompletedToast(`New actionable task added`);
    setTimeout(() => setCompletedToast(null), 3000);
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (activeFilter === 'high') return t.priority === 'high' && !t.completed;
      if (activeFilter === 'approval') return t.type === 'approval';
      if (activeFilter === 'commitment') return t.type === 'commitment';
      if (activeFilter === 'followup_drift') return t.type === 'followup_drift';
      return true;
    });
  }, [tasks, activeFilter]);

  const pendingCount = tasks.filter((t) => !t.completed).length;
  const approvalsCount = tasks.filter((t) => t.type === 'approval' && !t.completed).length;
  const highPriorityCount = tasks.filter((t) => t.priority === 'high' && !t.completed).length;

  const getPriorityStyle = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'text-[#E5484D] border-[#E5484D]/30 bg-[#E5484D]/10';
      case 'medium':
        return 'text-[#F2A93B] border-[#F2A93B]/30 bg-[#F2A93B]/10';
      case 'low':
      default:
        return 'text-[#3D6BF2] border-[#3D6BF2]/30 bg-[#3D6BF2]/10';
    }
  };

  return (
    <div className="w-full max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner / Metrics Band */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-[#0E1116] border border-white/10">
        <div>
          <div className="text-[10px] font-mono tracking-[0.25em] text-[#3D6BF2] uppercase font-bold">
            Executive Queue
          </div>
          <h2 className="font-serif-editorial text-2xl sm:text-3xl text-[#F2EEE6] mt-0.5">
            Actionable Inbox
          </h2>
          <p className="text-xs text-[#F2EEE6]/70 mt-1 font-sans">
            Centralized clearinghouse consolidating executive commitments, approvals, and follow-ups across 24 modules.
          </p>
        </div>

        {/* Aggregate Counters */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-3 py-2 rounded-lg bg-black/40 border border-white/5 text-center min-w-[90px]">
            <div className="text-[9px] font-mono text-[#F2EEE6]/50 uppercase tracking-wider">Pending</div>
            <div className="text-lg font-mono font-bold text-[#F2EEE6] tabular-nums mt-0.5">
              {pendingCount}
            </div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-black/40 border border-white/5 text-center min-w-[90px]">
            <div className="text-[9px] font-mono text-[#E5484D] uppercase tracking-wider">High Urgency</div>
            <div className="text-lg font-mono font-bold text-[#E5484D] tabular-nums mt-0.5">
              {highPriorityCount}
            </div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-black/40 border border-white/5 text-center min-w-[90px]">
            <div className="text-[9px] font-mono text-[#3D6BF2] uppercase tracking-wider">Approvals</div>
            <div className="text-lg font-mono font-bold text-[#3D6BF2] tabular-nums mt-0.5">
              {approvalsCount}
            </div>
          </div>
          <button
            onClick={() => setIsAdding((prev) => !prev)}
            className="px-3.5 py-2 rounded-lg bg-[#3D6BF2] hover:bg-[#3D6BF2]/90 text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-md"
          >
            <Plus size={13} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Quick Add Form Drawer */}
      {isAdding && (
        <form
          onSubmit={handleAddTask}
          className="p-4 rounded-xl bg-[#12161F] border border-[#3D6BF2]/40 shadow-xl space-y-3 animate-in fade-in duration-150"
        >
          <div className="text-xs font-mono text-[#3D6BF2] uppercase tracking-wider font-bold">
            Create Priority Action Item
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              autoFocus
              placeholder="e.g., Deliver Series B capitalization model to Elena Rostova..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="sm:col-span-2 bg-[#07090C] border border-white/15 rounded-lg px-3 py-2 text-xs text-[#F2EEE6] placeholder-[#F2EEE6]/30 focus:outline-none focus:border-[#3D6BF2]"
            />
            <div className="flex gap-2">
              <select
                value={newPerson}
                onChange={(e) => setNewPerson(e.target.value)}
                className="flex-1 bg-[#07090C] border border-white/15 rounded-lg px-2.5 py-2 text-xs text-[#F2EEE6] focus:outline-none focus:border-[#3D6BF2]"
              >
                <option value="">Link Person (Optional)</option>
                {people.map((p) => (
                  <option key={p.id} value={p.name} className="bg-[#0E1116] text-[#F2EEE6]">
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="bg-[#07090C] border border-white/15 rounded-lg px-2 py-2 text-xs text-[#F2EEE6] focus:outline-none focus:border-[#3D6BF2]"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 rounded text-xs font-mono text-[#F2EEE6]/60 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-[#3D6BF2] hover:bg-[#3D6BF2]/90 text-white text-xs font-mono font-semibold"
            >
              Commit Task
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Items', count: tasks.length },
            { id: 'high', label: 'High Urgency', count: highPriorityCount },
            { id: 'approval', label: 'Approvals & Autopilot', count: tasks.filter((t) => t.type === 'approval').length },
            { id: 'commitment', label: 'Executive Commitments', count: tasks.filter((t) => t.type === 'commitment').length },
            { id: 'followup_drift', label: 'Drift & Follow-up', count: tasks.filter((t) => t.type === 'followup_drift').length },
          ].map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white/10 text-white border border-white/20 font-bold'
                    : 'text-[#F2EEE6]/60 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <span>{f.label}</span>
                <span className="text-[10px] text-[#3D6BF2] tabular-nums font-semibold">({f.count})</span>
              </button>
            );
          })}
        </div>

        {/* Toast confirmation */}
        {completedToast && (
          <div className="text-[11px] font-mono text-[#3FB37F] flex items-center gap-1.5 animate-in fade-in duration-200">
            <CheckCircle2 size={13} />
            <span>{completedToast}</span>
          </div>
        )}
      </div>

      {/* Tasks Feed List */}
      <div className="space-y-2.5">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const isCompleted = task.completed;
            const isApproval = task.type === 'approval';

            return (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={`group p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  isCompleted
                    ? 'bg-[#0E1116]/50 border-white/5 opacity-60'
                    : 'bg-[#0E1116] hover:bg-[#131720] border-white/10 hover:border-white/20 shadow-md'
                }`}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTask(task.id);
                  }}
                  className="mt-0.5 text-[#3D6BF2] hover:text-white transition-colors shrink-0"
                >
                  {isCompleted ? (
                    <CheckSquare size={17} className="text-[#3FB37F]" />
                  ) : (
                    <Square size={17} className="text-[#F2EEE6]/40 group-hover:text-[#3D6BF2]" />
                  )}
                </button>

                {/* Content */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9.5px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider font-semibold ${getPriorityStyle(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenTileWorkspace) onOpenTileWorkspace(task.sourceTile);
                        }}
                        className="text-[9.5px] font-mono text-[#3D6BF2] hover:underline flex items-center gap-1"
                      >
                        <span>{task.sourceTileTitle}</span>
                        <ArrowRight size={9} />
                      </button>
                    </div>

                    <div className="text-[10px] font-mono text-[#F2EEE6]/50 flex items-center gap-1.5 tabular-nums">
                      <Clock size={11} className="text-[#F2EEE6]/40" />
                      <span>{task.dueDate}</span>
                    </div>
                  </div>

                  <h3
                    className={`text-sm font-semibold leading-snug transition-colors ${
                      isCompleted ? 'line-through text-[#F2EEE6]/50' : 'text-[#F2EEE6]'
                    }`}
                  >
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="text-xs text-[#F2EEE6]/65 leading-relaxed font-sans">
                      {task.description}
                    </p>
                  )}

                  {/* Linked Executive Badge */}
                  {task.linkedPerson && (
                    <div className="pt-1 flex items-center gap-2 text-xs">
                      {(() => {
                        const found = people.find((p) => p.name === task.linkedPerson);
                        return (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (found && onSelectPerson) onSelectPerson(found);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-mono text-[#F2EEE6]/80 hover:text-[#3D6BF2] transition-colors"
                            >
                              <User size={11} className="text-[#3D6BF2]" />
                              <span>{task.linkedPerson}</span>
                              {task.linkedCompany && <span className="text-[#F2EEE6]/40">· {task.linkedCompany}</span>}
                            </button>
                            {found?.tier && (
                              <RelationshipTierBadge tier={found.tier} size="xs" />
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Trailing Quick Approval Buttons if approval item */}
                {isApproval && !isCompleted && (
                  <div className="flex items-center gap-1.5 shrink-0 self-center">
                    <button
                      onClick={(e) => handleApprove(task.id, e)}
                      className="px-2.5 py-1 rounded bg-[#3FB37F]/20 hover:bg-[#3FB37F]/30 border border-[#3FB37F]/40 text-[#3FB37F] text-xs font-mono font-medium flex items-center gap-1 transition-colors"
                    >
                      <Check size={12} />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={(e) => handleReject(task.id, e)}
                      className="px-2 py-1 rounded bg-white/5 hover:bg-[#E5484D]/20 text-[#F2EEE6]/60 hover:text-[#E5484D] text-xs font-mono transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center border border-dashed border-white/10 rounded-xl bg-[#0E1116]/40 space-y-2">
            <CheckCircle2 size={24} className="mx-auto text-[#3FB37F]" />
            <div className="font-serif-editorial text-lg text-[#F2EEE6]">Inbox Cleared</div>
            <p className="text-xs text-[#F2EEE6]/50 max-w-sm mx-auto">
              No outstanding action items match this filter. All commitments across your relationship network are synchronized.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
