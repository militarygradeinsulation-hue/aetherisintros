// @ts-nocheck
import React, { useState } from 'react';
import { X, ShieldCheck, Check, Ban, Eye, Send, ArrowRight } from 'lucide-react';
import { ApprovalAction } from '../types';
import { INITIAL_APPROVALS } from '../dataStore';

interface ApprovalQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  approvals: ApprovalAction[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export const ApprovalQueueModal: React.FC<ApprovalQueueModalProps> = ({
  isOpen,
  onClose,
  approvals,
  onApprove,
  onReject,
}) => {
  const [selectedAction, setSelectedAction] = useState<ApprovalAction | null>(
    approvals[0] || null
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="sys-tile w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl border border-[rgba(255,255,255,0.12)] bg-[#0E1116] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between bg-[#07090C]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#F5B027]/10 border border-[#F5B027]/40 flex items-center justify-center text-[#F5B027]">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="font-serif-editorial text-xl text-[#F2EEE6] font-semibold">
                Executive Approval Queue
              </h2>
              <p className="text-xs text-[#F2EEE6]/60 font-mono">
                Strict Gate: Zero outbound actions transmit without explicit CEO authorization.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-[#F2EEE6] flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {approvals.length === 0 ? (
            <div className="text-center py-12 text-[#F2EEE6]/60">
              <ShieldCheck size={36} className="mx-auto text-[#C78522] mb-3" />
              <p className="text-sm font-semibold text-[#F2EEE6]">Approval Queue Clear</p>
              <p className="text-xs text-[#F2EEE6]/50 mt-1">
                No outbound drafts or automations pending authorization.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvals.map((act) => (
                <div
                  key={act.id}
                  className="p-4 rounded-lg bg-[#151922] border border-white/5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#F5B027]/10 border border-[#F5B027]/30 text-[#F5B027] text-[10px] font-mono font-bold uppercase">
                        {act.originTile}
                      </span>
                      <span className="text-xs font-semibold text-[#F2EEE6]">
                        {act.actionType} → {act.recipient}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#F2EEE6]/50">
                      Enqueued {act.createdTime}
                    </span>
                  </div>

                  <p className="text-xs text-[#F2EEE6]/80 leading-relaxed font-sans">
                    {act.summary}
                  </p>

                  <div className="sys-card-ivory p-3 rounded text-xs leading-relaxed italic">
                    "{act.fullDraft}"
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => onReject(act.id)}
                      className="px-3.5 py-1.5 rounded bg-white/5 hover:bg-[#C78522]/20 text-[#C78522] text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Ban size={13} />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => onApprove(act.id)}
                      className="px-4 py-1.5 rounded bg-[#C78522] text-black text-xs font-mono font-bold hover:bg-[#C78522]/90 flex items-center gap-1.5 transition-colors"
                    >
                      <Check size={14} />
                      <span>Approve & Transmit</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
