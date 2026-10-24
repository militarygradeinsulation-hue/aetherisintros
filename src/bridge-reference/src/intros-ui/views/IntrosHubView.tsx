// @ts-nocheck
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
import { AskIntrosComposerCard } from '@/aetheris/AskIntrosComposerCard';
import { AskIntrosPreview } from '@/aetheris/AskIntrosPreview';
import { MatchedMemberCards } from '@/aetheris/MatchedMemberCards';
import { ConsentHandshake } from '@/aetheris/ConsentHandshake';
import { SpecterSignalFeed } from '@/aetheris/SpecterSignalFeed';
import { GapOpportunityFeed } from '@/aetheris/GapOpportunityCard';
import { RelationshipMomentBanner } from '@/aetheris/RelationshipMomentBanner';
import type { AskDraft } from '@/aetheris/AskIntrosComposerCard';

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
  const [composerDraft, setComposerDraft] = useState<AskDraft>({ whoIAm: '', whatIBring: '', whoImLookingFor: '', source: 'manual' });
  const [handshakeReq, setHandshakeReq] = useState<{ sender: string; recipient: string } | null>(null);

  const handleSpecterSignal = (partial: Partial<AskDraft>) => {
    setComposerDraft(prev => ({ ...prev, ...partial }));
    setActiveTab('outbound');
  };
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
      <section className="relative overflow-hidden rounded-2xl border border-border/10 bg-card p-6 lg:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="text-[10px] md:text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Double Opt-In Protocol
            </div>
            <h1 className="font-serif-editorial text-3xl sm:text-4xl md:text-5xl text-foreground leading-tight">
              Warm Introductions{' '}
              <span className="text-accent-foreground">Workspace</span>
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground max-w-xl">
              Facilitate high-signal relationships with confidential double-opt-in workflows.
              Every introduction is protected by mutual consent.
            </p>
          </div>

          <button
            onClick={() => setShowMakeIntroModal(true)}
            className="bridge-primary-action flex items-center gap-2 px-5 py-2.5 text-xs md:text-sm font-semibold transition-all cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            Facilitate New Introduction
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border/10 pb-2">
        {[
          { id: 'pending', label: 'Inbound Requests', count: introRequests.length },
          { id: 'outbound', label: 'My Requests', count: 2 },
          { id: 'completed', label: 'Introductions Made', count: 18 },
          { id: 'recommendations', label: 'AI Match Synergies', count: 4 },
        ].map((tab) => (
          <button
            key={tab.id}
            aria-pressed={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`ix-option-tab text-xs font-medium cursor-pointer transition-colors pb-1 flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'text-foreground border-b-2 border-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{tab.label}</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-muted/10 text-muted-foreground">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab 1: Inbound Pending Requests */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {introRequests.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border/10 rounded-xl text-muted-foreground">
              All introduction requests reviewed.
            </div>
          ) : (
            introRequests.map((req) => (
              <div
                key={req.id}
                className="bg-card border border-border/10 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-border/20 transition-all"
              >
                <div className="flex items-start gap-4">
                  <ExecutivePortrait name={req.requesterName} size="md" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-foreground">
                        {req.requesterName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">({req.requesterTitle})</span>
                      <span className="text-[10px] font-mono text-muted-foreground">· {req.date}</span>
                    </div>

                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2 flex-wrap">
                      <span>Requests an introduction to</span>
                      <span className="inline-flex items-center gap-1.5 bg-muted/5 border border-border/10 px-2 py-0.5 rounded-md text-foreground font-semibold">
                        <ExecutivePortrait name={req.targetName} size="sm" />
                        <span>{req.targetName}</span>
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        ({req.targetTitle}, {req.targetCompany})
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground italic bg-muted/[0.02] p-2.5 rounded border border-border/5 max-w-xl">
                      "{req.note}"
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
                  <button
                    onClick={() => setHandshakeReq({ sender: req.requesterName, recipient: req.targetName })}
                    className="bridge-primary-action px-4 py-2 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Review & Facilitate
                  </button>
                  <button
                    onClick={() => onDismissRequest(req.id)}
                    className="bridge-secondary-action px-3 py-2 text-xs border transition-colors cursor-pointer"
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
        <div className="space-y-6">
          {/* Composer + Live Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AskIntrosComposerCard
              authorName={networkMembers[0]?.name}
              onSubmit={draft => setComposerDraft(draft)}
            />
            <AskIntrosPreview
              draft={composerDraft}
              authorName={networkMembers[0]?.name}
              authorRole={networkMembers[0]?.title}
            />
          </div>

          <div className="border-t border-border/10 pt-5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">Sent Requests</p>
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
              className="bg-card border border-border/10 rounded-xl p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <ExecutivePortrait name={item.targetName} size="md" />
                <div>
                  <div className="text-xs font-semibold text-foreground">{item.targetName}</div>
                  <div className="text-[11px] text-muted-foreground">{item.targetTitle}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Requested through {item.via} · {item.date}
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono text-accent-foreground bg-primary/10 border border-primary/20 px-2.5 py-1 rounded">
                {item.status}
              </span>
            </div>
          ))}
          </div>
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
              className="bg-card border border-border/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <ExecutivePortrait name={item.p1} size="sm" />
                  <span className="text-xs font-semibold text-foreground">{item.p1}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-accent-foreground shrink-0" />
                <div className="flex items-center gap-2">
                  <ExecutivePortrait name={item.p2} size="sm" />
                  <span className="text-xs font-semibold text-foreground">{item.p2}</span>
                </div>
                <span className="text-[10px] text-muted-foreground hidden md:inline ml-2">· {item.date}</span>
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
        <div className="space-y-6">
          <RelationshipMomentBanner
            onViewPaths={() => setShowMakeIntroModal(true)}
          />
          <SpecterSignalFeed onBuildAsk={handleSpecterSignal} />
          <GapOpportunityFeed onBuildAsk={handleSpecterSignal} />
          <MatchedMemberCards
            count={3}
            onRequestIntro={() => setShowMakeIntroModal(true)}
          />
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">All Matches</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {networkMembers.slice(0, 4).map((member) => (
            <div
              key={member.id}
              className="bg-card border border-border/10 rounded-xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ExecutivePortrait name={member.name} size="md" />
                  <div>
                    <div className="text-xs font-semibold text-foreground">{member.name}</div>
                    <div className="text-[11px] text-muted-foreground">{member.title}</div>
                  </div>
                </div>
                <span className="text-xs font-mono text-accent-foreground font-bold">
                  {member.matchScore}% Match
                </span>
              </div>
              <p className="text-xs text-muted-foreground italic">
                "{member.bioStatement}"
              </p>
              <button
                onClick={() => onRequestIntro(member)}
                className="bridge-primary-action w-full py-2 px-3 text-xs font-semibold transition-colors cursor-pointer text-center"
              >
                Request Warm Introduction
              </button>
            </div>
          ))}
        </div>
        </div>
      )}

      {/* Consent Handshake overlay */}
      {handshakeReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm">
            <ConsentHandshake
              senderName={handshakeReq.sender}
              recipientName={handshakeReq.recipient}
              onConfirm={() => setHandshakeReq(null)}
              onDecline={() => setHandshakeReq(null)}
            />
          </div>
        </div>
      )}

      {/* Facilitate New Introduction Modal */}
      {showMakeIntroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-card border border-border/10 rounded-2xl shadow-2xl p-6 text-foreground">
            {introSuccessNotice ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="font-serif-editorial text-2xl font-bold">Introduction Dispatched</h3>
                <p className="text-xs text-muted-foreground">
                  Both parties have received private double-opt-in briefing invitations.
                </p>
              </div>
            ) : (
              <form onSubmit={handleMakeIntro} className="space-y-4">
                <h2 className="font-serif-editorial text-2xl font-bold text-foreground">
                  Facilitate Introduction
                </h2>
                <p className="text-xs text-muted-foreground">
                  Connect two peers from your network with a mutual context note.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Person 1</label>
                    <select
                      value={personA}
                      onChange={(e) => setPersonA(e.target.value)}
                      className="w-full bg-card border border-border/10 rounded-lg p-2 text-xs text-foreground"
                    >
                      {networkMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Person 2</label>
                    <select
                      value={personB}
                      onChange={(e) => setPersonB(e.target.value)}
                      className="w-full bg-card border border-border/10 rounded-lg p-2 text-xs text-foreground"
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
                  <label className="text-xs text-muted-foreground block mb-1">
                    Introduction Rationale
                  </label>
                  <textarea
                    value={introContext}
                    onChange={(e) => setIntroContext(e.target.value)}
                    rows={3}
                    placeholder="Connecting both of you to explore AI infrastructure architectures..."
                    className="w-full bg-card border border-border/10 rounded-lg p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/5">
                  <button
                    type="button"
                    onClick={() => setShowMakeIntroModal(false)}
                    className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bridge-primary-action px-4 py-2 text-xs font-semibold cursor-pointer"
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
