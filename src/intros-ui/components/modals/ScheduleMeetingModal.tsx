// @ts-nocheck
import React, { useState } from 'react';
import { X, Calendar, Clock, Video, Check } from 'lucide-react';
import { ExecutivePortrait } from '../shared/ExecutivePortrait';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  memberTitle: string;
}

export const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  isOpen,
  onClose,
  memberName,
  memberTitle,
}) => {
  const [selectedDuration, setSelectedDuration] = useState('30 min');
  const [selectedDate, setSelectedDate] = useState('Tomorrow · 2:00 PM EST');
  const [meetingTopic, setMeetingTopic] = useState('AI Infrastructure & Exploratory Partnership');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#0E1218] border border-white/10 rounded-2xl shadow-2xl p-6 text-[#F2EEE6] overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#9CA3AF] hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-4">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="font-serif-editorial text-2xl font-bold mb-2">Meeting Invitation Sent</h3>
            <p className="text-sm text-[#9CA3AF]">
              Calendar invite and private video conference room dispatched to {memberName}.
            </p>
          </div>
        ) : (
          <div>
            <div className="text-[10px] font-mono tracking-widest text-[#3D6BF2] uppercase font-semibold mb-1">
              Direct Executive Sync
            </div>
            <h2 className="font-serif-editorial text-2xl font-bold text-white mb-4">
              Schedule Meeting
            </h2>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 mb-5">
              <ExecutivePortrait name={memberName} size="md" />
              <div>
                <div className="text-sm font-semibold text-white">{memberName}</div>
                <div className="text-xs text-[#9CA3AF]">{memberTitle}</div>
              </div>
            </div>

            {/* Duration Selector */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">
                Session Length
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['20 min', '30 min', '45 min'].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setSelectedDuration(dur)}
                    className={`py-2 text-xs rounded-lg border font-medium cursor-pointer transition-colors ${
                      selectedDuration === dur
                        ? 'border-[#3D6BF2] bg-[#3D6BF2]/20 text-white'
                        : 'border-white/10 bg-white/5 text-[#9CA3AF] hover:text-white'
                    }`}
                  >
                    {dur}
                  </button>
                ))}
              </div>
            </div>

            {/* Proposed Time Slot */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">
                Proposed Time Slot
              </label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-[#151A24] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#3D6BF2]"
              >
                <option value="Tomorrow · 2:00 PM EST">Tomorrow · 2:00 PM EST (Recommended)</option>
                <option value="Thursday · 10:30 AM EST">Thursday · 10:30 AM EST</option>
                <option value="Friday · 3:00 PM EST">Friday · 3:00 PM EST</option>
                <option value="Next Monday · 11:00 AM EST">Next Monday · 11:00 AM EST</option>
              </select>
            </div>

            {/* Agenda / Topic */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">
                Meeting Focus & Agenda
              </label>
              <input
                type="text"
                value={meetingTopic}
                onChange={(e) => setMeetingTopic(e.target.value)}
                className="w-full bg-[#151A24] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#3D6BF2]"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs text-[#9CA3AF] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#3D6BF2] hover:bg-[#2563EB] rounded-lg transition-colors cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                Dispatch Invite
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
