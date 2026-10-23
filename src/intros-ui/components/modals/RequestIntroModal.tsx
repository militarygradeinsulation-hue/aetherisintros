// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Sparkles, ShieldCheck, Check } from 'lucide-react';
import { NetworkMember } from '../../networkData';
import { ExecutivePortrait } from '../shared/ExecutivePortrait';

interface RequestIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMember: NetworkMember | null;
  onSendRequest: (targetId: string, note: string) => Promise<'created' | 'existing'>;
}

export const RequestIntroModal: React.FC<RequestIntroModalProps> = ({
  isOpen,
  onClose,
  targetMember,
  onSendRequest,
}) => {
  const [note, setNote] = useState('');
  const [sharedGoal, setSharedGoal] = useState('Explore strategic partnership & infrastructure synergies');
  const [urgency, setUrgency] = useState<'Standard' | 'Time-Sensitive'>('Standard');
  const [isSuccess, setIsSuccess] = useState(false);
  const [requestState, setRequestState] = useState<'created' | 'existing'>('created');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  // Prevent an earlier member's successful request from being displayed as a
  // confirmation for a different member (or a later reopen of the same modal).
  const attemptEpoch = useRef(0);
  useEffect(() => {
    attemptEpoch.current += 1;
    setIsSuccess(false);
    setRequestState('created');
    setSendError('');
    setNote('');
    setSending(false);
  }, [isOpen, targetMember?.id]);

  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen || !targetMember) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key !== 'Tab' || !dialog) return;
      const controls = [...dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]'
      )].filter(element => element.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen, targetMember?.id, onClose]);

  if (!isOpen || !targetMember) return null;

  const handleSend = async () => {
    if (sending) return;
    const epoch = attemptEpoch.current;
    const requestedMemberId = targetMember.id;
    setSending(true);
    setSendError('');
    try {
      const result = await onSendRequest(requestedMemberId, note.trim() || sharedGoal);
      if (epoch !== attemptEpoch.current) return;
      setRequestState(result);
      setIsSuccess(true);
    } catch (error) {
      if (epoch !== attemptEpoch.current) return;
      setSendError(error instanceof Error ? error.message : 'Not sent. Retry your introduction request.');
    } finally {
      if (epoch === attemptEpoch.current) setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={"Request introduction to " + targetMember.name} className="request-intro-modal-surface stencil-intro-request-panel relative w-full max-w-lg bg-[#0E1218] border border-white/10 rounded-2xl shadow-2xl p-6 text-[#F2EEE6] overflow-hidden">
        {/* Close Button */}
        <button type="button" aria-label="Close introduction request"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#9CA3AF] hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-full bg-[#EF4444]/20 border border-[#EF4444] flex items-center justify-center text-[#EF4444] mb-4">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="font-serif-editorial text-2xl font-bold mb-2">{requestState === 'existing' ? 'Request Already Saved' : 'Request Saved'}</h3>
            <p className="text-sm text-[#9CA3AF] max-w-xs">
              {requestState === 'existing' ? 'Your earlier introduction request is already saved.' : 'Your request is saved for the other member to consider.'} It is not an accepted introduction until both parties opt in.
            </p>
            <button type="button" className="mt-5 px-4 py-2 rounded bg-[#B91C1C] text-white" onClick={() => { setIsSuccess(false); setNote(''); onClose(); }}>Close</button>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className="intro-modal-amber-label text-[10px] font-mono tracking-widest text-[#EF4444] uppercase font-semibold">
                Double Opt-in Warm Introduction
              </span>
            </div>
            <h2 className="font-serif-editorial text-2xl font-bold text-white mb-4">
              Request Introduction to {targetMember.name}
            </h2>

            {/* Target profile preview snippet */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 mb-5">
              <ExecutivePortrait name={targetMember.name} size="md" />
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                  {targetMember.name}
                  <span className="intro-modal-amber-label text-[10px] text-[#EF4444] font-mono font-medium">
                    {targetMember.matchScore}% Match
                  </span>
                </div>
                <div className="text-xs text-[#9CA3AF]">
                  {targetMember.title} · {targetMember.company}
                </div>
                <div className="text-[11px] text-[#6B7280]">
                  {targetMember.location} · {targetMember.mutualConnectionsCount} mutual connections
                </div>
              </div>
            </div>

            {/* Strategic Intent */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">
                Primary Objective
              </label>
              <select
                value={sharedGoal}
                onChange={(e) => setSharedGoal(e.target.value)}
                className="w-full bg-[#151A24] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#EF4444]"
              >
                <option value="Explore strategic partnership & infrastructure synergies">
                  Explore strategic partnership & infrastructure synergies
                </option>
                <option value="Co-investment & syndicate opportunity">
                  Co-investment & syndicate opportunity
                </option>
                <option value="Executive advice & market expansion">
                  Executive advice & market expansion
                </option>
                <option value="Direct commercial exploratory conversation">
                  Direct commercial exploratory conversation
                </option>
              </select>
            </div>

            {/* Forwardable Context Note */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#9CA3AF]">
                  Forwardable Note for Connector
                </label>
                <span className="text-[10px] text-[#6B7280]">
                  Connector forwards this note directly
                </span>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={`Hi ${targetMember.firstName}, I'd love to connect regarding your focus on ${targetMember.focusAreas[0] || 'AI infrastructure'}...`}
                className="w-full bg-[#151A24] border border-white/10 rounded-lg p-3 text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#EF4444]"
              />
            </div>

            {/* Urgency & Etiquette */}
            <div className="flex items-center justify-between text-xs text-[#9CA3AF] mb-6 pt-2 border-t border-white/5">
              <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#EF4444]" />
                Strict double opt-in protocol ensures zero spam.
              </div>
              <div className="flex items-center gap-1">
                {(['Standard', 'Time-Sensitive'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setUrgency(lvl)}
                    className={`px-2.5 py-1 rounded text-[11px] cursor-pointer transition-colors ${
                      urgency === lvl
                        ? 'stencil-intro-selected bg-[#EF4444] text-[#1C0C0C] font-medium'
                        : 'bg-white/5 text-[#9CA3AF] hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {sendError && <p role="alert" className="mb-3 text-sm text-[#FFD1D1] border border-red-400/40 rounded-lg p-3">{sendError} <button type="button" disabled={sending} onClick={() => void handleSend()} className="underline font-semibold">Retry</button></p>}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-[#9CA3AF] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending}
                className="stencil-intro-submit flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#1C0C0C] bg-[#EF4444] hover:bg-[#B91C1C] rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                {sending ? 'Sending…' : sendError ? 'Retry Request' : 'Submit Request'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
