import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle,
  Clock,
  ArrowRight,
  Plus,
  Users,
  ShieldCheck,
  Send,
  Check,
  Share2,
} from 'lucide-react';
import { NetworkMember, IntroRequest } from '../networkData';
import { ExecutivePortrait } from '../components/shared/ExecutivePortrait';
import { ActivePage } from '../components/layout/TopNavigation';

interface IntrosHubViewProps {
  introRequests: IntroRequest[];
  networkMembers: NetworkMember[];
  onNavigate: (page: ActivePage, memberId?: string) => void;
  onReviewRequest: (req: IntroRequest) => void;
  onDismissRequest: (reqId: string) => void;
  onRequestIntro: (member: NetworkMember) => void;
}

export const IntrosHubView: React.FC<IntrosHubViewProps> = ({
  introRequests,
  networkMembers,
  onNavigate,
  onReviewRequest,
  onDismissRequest,
  onRequestIntro,
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'outbound' | 'completed' | 'recommendations'>('pending');
  const [showMakeIntroModal, setShowMakeIntroModal] = useState(false);
  const [personA, setPersonA] = useState(networkMembers[0]?.id || 'marcus-lee');
  const [personB, setPersonB] = useState(networkMembers[1]?.id || 'sarah-chen');
  const [introContext, setIntroContext] = useState('');
  const [introSuccessNotice, setIntroSuccessNotice] = useState(false);

  const handleMakeIntro = (e: React.FormEvent) => {
    e.preventDefault();
    setIntroSuccessNotice(true);
    setTimeout(() => {
      setIntroSuccessNotice(false);
      setShowMakeIntroModal(false);
    }, 1500);
  };

  const memberA = networkMembers.find((m) => m.id === personA) || networkMembers[0];
  const memberB = networkMembers.find((m) => m.id === personB) || networkMembers[1];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-8 animate-fadeIn">
      {/* Editorial Header */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0C1017] via-[#090C10] to-[#07090C] p-6 lg:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="text-[10px] md:text-xs font-mono uppercase tracking-[0.25em] text-[#9CA3AF] font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3D6BF2]" />
              Double Opt-In Protocol
            </div>
            <h1 className="font-serif-editorial text-3xl sm:text-4xl md:text-5xl text-[#F2EEE6] leading-tight">
              Warm Introductions{' '}
              <span className="text-[#3D6BF2]">Workspace</span>
            </h1>
            <p className="text-xs md:text-sm text-[#9CA3AF] max-w-xl">
              Facilitate high-signal relationships with confidential double-opt-in workflows.
              Every introduction is protected by mutual consent.
            </p>
          </div>

          <button
            onClick={() => setShowMakeIntroModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#3D6BF2] hover:bg-[#2563EB] text-white text-xs md:text-sm font-semibold transition-all shadow-md shadow-[#3D6BF2]/20 cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            Facilitate New Introduction
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-white/10 pb-2">
        {[
          { id: 'pending', label: 'Inbound Requests', count: introRequests.length },
          { id: 'outbound', label: 'My Requests', count: 2 },
          { id: 'completed', label: 'Introductions Made', count: 18 },
          { id: 'recommendations', label: 'AI Match Synergies', count: 4 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`text-xs font-medium cursor-pointer transition-colors pb-1 flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-[#3D6BF2] font-semibold'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <span>{tab.label}</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-[#CBD5E1]">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab 1: Inbound Pending Requests */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {introRequests.length === 0 ? (
            <div className="text-center py-16 bg-[#0E121A] border border-white/10 rounded-xl text-[#9CA3AF]">
              All introduction requests reviewed.
            </div>
          ) : (
            introRequests.map((req) => (
              <div
                key={req.id}
                className="bg-[#0E121A] border border-white/10 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-white/20 transition-all"
              >
                <div className="flex items-start gap-4">
                  <ExecutivePortrait name={req.requesterName} size="md" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-white">
                        {req.requesterName}
                      </span>
                      <span className="text-[10px] text-[#9CA3AF]">({req.requesterTitle})</span>
                      <span className="text-[10px] font-mono text-[#6B7280]">· {req.date}</span>
                    </div>

                    <div className="text-xs text-[#CBD5E1] mb-2 flex items-center gap-2 flex-wrap">
                      <span>Requests an introduction to</span>
                      <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-white font-semibold">
                        <ExecutivePortrait name={req.targetName} size="sm" />
                        <span>{req.targetName}</span>
                      </span>
                      <span className="text-[11px] text-[#9CA3AF]">
                        ({req.targetTitle}, {req.targetCompany})
                      </span>
                    </div>

                    <p className="text-xs text-[#9CA3AF] italic bg-white/[0.02] p-2.5 rounded border border-white/5 max-w-xl">
                      "{req.note}"
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
                  <button
                    onClick={() => onReviewRequest(req)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#3D6BF2] hover:bg-[#2563EB] rounded-lg transition-colors cursor-pointer"
                  >
                    Review & Facilitate
                  </button>
                  <button
                    onClick={() => onDismissRequest(req.id)}
                    className="px-3 py-2 text-xs text-[#9CA3AF] hover:text-white border border-white/10 rounded-lg transition-colors cursor-pointer"
                  >
                    Pass
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Outbound Requests */}
      {activeTab === 'outbound' && (
        <div className="space-y-4">
          {[
            {
              targetName: 'Marcus Lee',
              targetTitle: 'General Partner, Horizon Capital',
              via: 'Elena Rossi',
              date: '2 days ago',
              status: 'Awaiting Connector Confirmation',
            },
            {
              targetName: 'Lisa Tran',
              targetTitle: 'VP Product, Atlas Cloud',
              via: 'Daniel Kim',
              date: '5 days ago',
              status: 'Under Review',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-[#0E121A] border border-white/10 rounded-xl p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <ExecutivePortrait name={item.targetName} size="md" />
                <div>
                  <div className="text-xs font-semibold text-white">{item.targetName}</div>
                  <div className="text-[11px] text-[#9CA3AF]">{item.targetTitle}</div>
                  <div className="text-[10px] text-[#6B7280] mt-0.5">
                    Requested through {item.via} · {item.date}
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/20 px-2.5 py-1 rounded">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Completed Introductions */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          {[
            {
              p1: 'Sarah Chen',
              p2: 'Marcus Lee',
              outcome: 'Meeting Scheduled',
              date: 'Yesterday',
            },
            {
              p1: 'James Okafor',
              p2: 'Alex Monroe',
              outcome: 'Conversation Active',
              date: 'Mar 08, 2026',
            },
            {
              p1: 'Daniel Kim',
              p2: 'Elena Rossi',
              outcome: 'Exploratory Call Completed',
              date: 'Mar 02, 2026',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-[#0E121A] border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <ExecutivePortrait name={item.p1} size="sm" />
                  <span className="text-xs font-semibold text-white">{item.p1}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#3D6BF2] shrink-0" />
                <div className="flex items-center gap-2">
                  <ExecutivePortrait name={item.p2} size="sm" />
                  <span className="text-xs font-semibold text-white">{item.p2}</span>
                </div>
                <span className="text-[10px] text-[#6B7280] hidden md:inline ml-2">· {item.date}</span>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded flex items-center gap-1 self-start sm:self-auto shrink-0">
                <CheckCircle className="w-3.5 h-3.5" />
                {item.outcome}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: AI Match Synergies */}
      {activeTab === 'recommendations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {networkMembers.slice(0, 4).map((member) => (
            <div
              key={member.id}
              className="bg-[#0E121A] border border-white/10 rounded-xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ExecutivePortrait name={member.name} size="md" />
                  <div>
                    <div className="text-xs font-semibold text-white">{member.name}</div>
                    <div className="text-[11px] text-[#9CA3AF]">{member.title}</div>
                  </div>
                </div>
                <span className="text-xs font-mono text-[#3D6BF2] font-bold">
                  {member.matchScore}% Match
                </span>
              </div>
              <p className="text-xs text-[#CBD5E1] italic">
                "{member.bioStatement}"
              </p>
              <button
                onClick={() => onRequestIntro(member)}
                className="w-full py-2 text-xs font-semibold text-white bg-[#3D6BF2] hover:bg-[#2563EB] rounded-lg transition-colors cursor-pointer text-center"
              >
                Request Warm Introduction
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Facilitate New Introduction Modal */}
      {showMakeIntroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#0E1218] border border-white/10 rounded-2xl shadow-2xl p-6 text-[#F2EEE6]">
            {introSuccessNotice ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="font-serif-editorial text-2xl font-bold">Introduction Dispatched</h3>
                <p className="text-xs text-[#9CA3AF]">
                  Both parties have received private double-opt-in briefing invitations.
                </p>
              </div>
            ) : (
              <form onSubmit={handleMakeIntro} className="space-y-4">
                <h2 className="font-serif-editorial text-2xl font-bold text-white">
                  Facilitate Introduction
                </h2>
                <p className="text-xs text-[#9CA3AF]">
                  Connect two peers from your network with a mutual context note.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#9CA3AF] block mb-1">Person 1</label>
                    <select
                      value={personA}
                      onChange={(e) => setPersonA(e.target.value)}
                      className="w-full bg-[#151A24] border border-white/10 rounded-lg p-2 text-xs text-white"
                    >
                      {networkMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-[#9CA3AF] block mb-1">Person 2</label>
                    <select
                      value={personB}
                      onChange={(e) => setPersonB(e.target.value)}
                      className="w-full bg-[#151A24] border border-white/10 rounded-lg p-2 text-xs text-white"
                    >
                      {networkMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#9CA3AF] block mb-1">
                    Introduction Rationale
                  </label>
                  <textarea
                    value={introContext}
                    onChange={(e) => setIntroContext(e.target.value)}
                    rows={3}
                    placeholder="Connecting both of you to explore AI infrastructure architectures..."
                    className="w-full bg-[#151A24] border border-white/10 rounded-lg p-3 text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#3D6BF2]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowMakeIntroModal(false)}
                    className="px-3 py-2 text-xs text-[#9CA3AF] hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#3D6BF2] hover:bg-[#2563EB] rounded-lg cursor-pointer"
                  >
                    Send Double-Opt-In
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
