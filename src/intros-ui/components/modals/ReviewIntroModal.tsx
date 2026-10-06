// @ts-nocheck
import React, { useState } from 'react';
import { X, Check, XCircle, ArrowRight, Shield } from 'lucide-react';
import { IntroRequest } from '../../networkData';
import { ExecutivePortrait } from '../shared/ExecutivePortrait';

interface ReviewIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: IntroRequest | null;
  onAccept: (reqId: string) => void;
  onDismiss: (reqId: string) => void;
}

export const ReviewIntroModal: React.FC<ReviewIntroModalProps> = ({
  isOpen,
  onClose,
  request,
  onAccept,
  onDismiss,
}) => {
  const [feedback, setFeedback] = useState('');
  const [actionDone, setActionDone] = useState<'accepted' | 'dismissed' | null>(null);

  if (!isOpen || !request) return null;

  const handleAccept = () => {
    onAccept(request.id);
    setActionDone('accepted');
    setTimeout(() => {
      setActionDone(null);
      onClose();
    }, 1200);
  };

  const handleDismiss = () => {
    onDismiss(request.id);
    setActionDone('dismissed');
    setTimeout(() => {
      setActionDone(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0E1218] border border-white/10 rounded-2xl shadow-2xl p-6 text-[#F2EEE6] overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#9CA3AF] hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {actionDone ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
              actionDone === 'accepted' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {actionDone === 'accepted' ? <Check className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
            </div>
            <h3 className="font-serif-editorial text-2xl font-bold mb-2">
              {actionDone === 'accepted' ? 'Introduction Facilitated' : 'Request Dismissed'}
            </h3>
            <p className="text-sm text-[#9CA3AF]">
              {actionDone === 'accepted'
                ? `An email intro thread has been initiated between ${request.requesterName} and ${request.targetName}.`
                : 'The requester has been notified with courteous feedback.'}
            </p>
          </div>
        ) : (
          <div>
            <div className="text-[10px] font-mono tracking-widest text-[#3D6BF2] uppercase font-semibold mb-1">
              Active Introduction Request · {request.date}
            </div>
            <h2 className="font-serif-editorial text-2xl font-bold text-white mb-5">
              Review Introduction Request
            </h2>

            {/* Requester -> Target Pair */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/5 mb-5">
              {/* Requester */}
              <div className="flex items-center gap-3">
                <ExecutivePortrait name={request.requesterName} size="md" />
                <div>
                  <div className="text-xs text-[#9CA3AF]">Requested by</div>
                  <div className="text-sm font-semibold text-white">{request.requesterName}</div>
                  <div className="text-[11px] text-[#6B7280]">{request.requesterTitle}</div>
                  <div className="text-[11px] text-[#3D6BF2]">{request.requesterCompany}</div>
                </div>
              </div>

              {/* Target */}
              <div className="flex items-center gap-3 md:border-l md:border-white/10 md:pl-3">
                <ExecutivePortrait name={request.targetName} size="md" />
                <div>
                  <div className="text-xs text-[#9CA3AF]">Target Person</div>
                  <div className="text-sm font-semibold text-white">{request.targetName}</div>
                  <div className="text-[11px] text-[#6B7280]">{request.targetTitle}</div>
                  <div className="text-[11px] text-[#3D6BF2]">{request.targetCompany}</div>
                </div>
              </div>
            </div>

            {/* Note from requester */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">
                Note & Rationale from {request.requesterName}:
              </label>
              <div className="p-3 bg-[#131722] rounded-lg border border-white/5 text-xs text-[#E2E8F0] italic">
                "{request.note}"
              </div>
            </div>

            {/* Optional Personal Note to accompany */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">
                Your Intro Note (Optional for {request.targetName})
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={2}
                placeholder="e.g. Connecting two leaders whose work in applied AI infrastructure closely aligns..."
                className="w-full bg-[#151A24] border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#3D6BF2]"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={handleDismiss}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                Decline Request
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 text-xs text-[#9CA3AF] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAccept}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#3D6BF2] hover:bg-[#2563EB] rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Accept & Make Intro
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
