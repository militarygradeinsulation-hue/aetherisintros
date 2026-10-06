// @ts-nocheck
import React, { useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Linkedin,
  Globe,
  GraduationCap,
  Sparkles,
  Users,
  CheckCircle,
  ThumbsUp,
  MessageSquare,
  Share2,
  Bookmark,
  Check,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { NetworkMember } from '../networkData';
import { ExecutivePortrait } from '../components/shared/ExecutivePortrait';
import { ConstellationGraphic } from '../components/shared/ConstellationGraphic';
import { ActivePage } from '../components/layout/TopNavigation';

interface ProfileDetailViewProps {
  member: NetworkMember;
  onBack: () => void;
  onNavigate: (page: ActivePage, memberId?: string) => void;
  onRequestIntro: (member: NetworkMember) => void;
  isSaved?: boolean;
  onToggleSave?: (memberId: string) => void;
}

export const ProfileDetailView: React.FC<ProfileDetailViewProps> = ({
  member,
  onBack,
  onNavigate,
  onRequestIntro,
  isSaved = false,
  onToggleSave,
}) => {
  const [showReasoningModal, setShowReasoningModal] = useState(false);
  const [savedState, setSavedState] = useState(isSaved);

  const handleToggleSave = () => {
    setSavedState(!savedState);
    if (onToggleSave) onToggleSave(member.id);
  };

  const aiRec = member.aiRecommendation;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-8 animate-fadeIn">
      {/* Back button navigation */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to People
        </button>
      </div>

      {/* Hero Section: Editorial Typography, Portrait Silhouette & AI Match (Images 4 & 8) */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0C1017] via-[#090C10] to-[#07090C] p-6 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Hero Left: Big Editorial Name & Bio statement */}
          <div className="lg:col-span-4 space-y-5">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#9CA3AF] font-semibold">
              Member Profile
            </div>

            {/* Giant Editorial Name */}
            <div>
              <h1 className="font-serif-editorial text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[0.95]">
                {member.firstName}
              </h1>
              <h1 className="font-serif-editorial text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#3D6BF2] leading-[0.95] mt-1">
                {member.lastName}
              </h1>
            </div>

            {/* Title & Affiliation */}
            <div>
              <div className="text-base sm:text-lg text-white font-medium">
                {member.title}
              </div>
              <div className="text-sm text-[#9CA3AF] font-mono">
                {member.company}
              </div>
              <div className="flex items-center gap-3 text-xs text-[#9CA3AF] mt-2">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#6B7280]" />
                  {member.location}
                </span>
                <a
                  href={`https://linkedin.com${member.linkedin}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#3D6BF2] hover:underline flex items-center gap-1"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  LinkedIn
                </a>
              </div>
            </div>

            {/* Editorial Bio Statement */}
            <p className="text-sm md:text-base text-[#CBD5E1] leading-relaxed">
              {member.bioStatement}
            </p>

            {/* 3 Metric Badges */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10 font-mono">
              <div>
                <div className="text-xl font-serif-editorial font-bold text-white">
                  {member.yearsInRole}
                </div>
                <div className="text-[10px] text-[#9CA3AF] uppercase">
                  {member.roleType === 'investor' ? 'Years in VC' : 'Years in Tech'}
                </div>
              </div>
              <div>
                <div className="text-xl font-serif-editorial font-bold text-white">
                  {member.portfolioCount || member.founderCount}
                </div>
                <div className="text-[10px] text-[#9CA3AF] uppercase">
                  {member.portfolioCount ? 'Portfolio' : 'Founder'}
                </div>
              </div>
              <div>
                <div className="text-xl font-serif-editorial font-bold text-white">
                  {member.perspectiveLabel || member.founderCount || 'Global'}
                </div>
                <div className="text-[10px] text-[#9CA3AF] uppercase">
                  {member.perspectiveLabel ? 'Perspective' : 'Operator'}
                </div>
              </div>
            </div>

            {/* Quote Callout */}
            <div className="p-4 bg-white/[0.02] border-l-2 border-[#3D6BF2] rounded-r-lg text-xs italic text-[#E2E8F0] leading-relaxed">
              "{member.quote}"
              <div className="text-[10px] font-mono text-[#9CA3AF] not-italic mt-1.5 uppercase">
                — {member.name}
              </div>
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => onRequestIntro(member)}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-[#3D6BF2] hover:bg-[#2563EB] rounded-lg shadow-sm transition-colors cursor-pointer text-center"
              >
                Request Introduction →
              </button>
              <button
                onClick={handleToggleSave}
                className={`px-4 py-2.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  savedState
                    ? 'bg-white/10 text-white border-white/30'
                    : 'border-white/15 text-[#9CA3AF] hover:text-white hover:border-white/30'
                }`}
              >
                {savedState ? 'Saved to Network' : 'Save to Network'}
              </button>
            </div>
          </div>

          {/* Center Column: Portrait Artwork & Quote (Images 4 & 8) */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center">
            <div className="w-full max-w-[340px] aspect-[3/4] relative rounded-xl overflow-hidden shadow-2xl border border-white/10">
              <ExecutivePortrait
                name={member.name}
                avatarUrl={member.avatarUrl}
                size="hero"
                className="w-full h-full"
              />
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/80 drop-shadow">
                  Better people build a brighter tomorrow.
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: AI Match Recommendation & Network Influence (Images 4 & 8) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Constellation Graphic Heading */}
            <div className="flex items-center justify-between text-[10px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
              <span>Strategic Connections Accelerate Progress</span>
            </div>

            {/* AI Introduction Recommendation Card */}
            {aiRec && (
              <div className="bg-[#111622]/95 border border-[#3D6BF2]/30 rounded-xl p-5 shadow-lg relative overflow-hidden backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#3D6BF2] font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Introduction Recommendation
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#3D6BF2]/20 text-[#60A5FA]">
                    BETA
                  </span>
                </div>

                <p className="text-xs text-[#CBD5E1] mb-3">
                  We found a strong match based on your mutual interests in AI infrastructure,
                  enterprise software, and climate tech.
                </p>

                {/* Counterpart Preview */}
                <div className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-lg mb-3">
                  <ExecutivePortrait name={aiRec.counterpartName} size="md" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">
                        {aiRec.counterpartName}
                      </span>
                      <span className="text-[10px] font-mono text-[#3D6BF2] font-semibold">
                        {aiRec.matchPercent}% Match
                      </span>
                    </div>
                    <div className="text-[11px] text-[#9CA3AF]">
                      {aiRec.counterpartTitle}, {aiRec.counterpartCompany}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {aiRec.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] text-[#9CA3AF] bg-white/5 border border-white/10 px-2 py-0.5 rounded"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <p className="text-xs text-[#CBD5E1] italic mb-4">
                  "{aiRec.reasoning}"
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const counterpart = {
                        ...member,
                        id: aiRec.counterpartId,
                        name: aiRec.counterpartName,
                        firstName: aiRec.counterpartName.split(' ')[0],
                        lastName: aiRec.counterpartName.split(' ')[1] || '',
                        title: aiRec.counterpartTitle,
                        company: aiRec.counterpartCompany,
                        matchScore: aiRec.matchPercent,
                      } as NetworkMember;
                      onRequestIntro(counterpart);
                    }}
                    className="flex-1 py-2 text-xs font-semibold text-white bg-[#3D6BF2] hover:bg-[#2563EB] rounded-lg transition-colors cursor-pointer text-center"
                  >
                    Request Introduction
                  </button>
                  <button
                    onClick={() => setShowReasoningModal(!showReasoningModal)}
                    className="px-3 py-2 text-xs text-[#9CA3AF] hover:text-white border border-white/10 rounded-lg transition-colors cursor-pointer"
                  >
                    View Reasoning
                  </button>
                </div>
              </div>
            )}

            {/* Network Influence Stats Card */}
            <div className="bg-[#0E121A] border border-white/10 rounded-xl p-5 space-y-4">
              <div className="text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
                Network Influence
              </div>
              <div className="grid grid-cols-3 gap-3 text-center font-mono">
                <div>
                  <div className="text-xl font-bold text-white">
                    {member.networkInfluence.strongerReplies}
                  </div>
                  <div className="text-[10px] text-[#9CA3AF] uppercase">Stronger Replies</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#10B981]">
                    {member.networkInfluence.introSuccessRate}
                  </div>
                  <div className="text-[10px] text-[#9CA3AF] uppercase">Intro Success</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-white">
                    {member.networkInfluence.fasterConversations}
                  </div>
                  <div className="text-[10px] text-[#9CA3AF] uppercase">Faster Chats</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5 text-xs text-[#CBD5E1]">
                <div>
                  <span className="font-mono text-white font-bold">
                    {member.networkInfluence.peopleInNetwork}
                  </span>{' '}
                  <span className="text-[#9CA3AF]">People in Network</span>
                </div>
                <div>
                  <span className="font-mono text-white font-bold">
                    {member.networkInfluence.companiesCount}
                  </span>{' '}
                  <span className="text-[#9CA3AF]">Companies</span>
                </div>
                <div>
                  <span className="font-mono text-white font-bold">
                    {member.networkInfluence.keyThemes}
                  </span>{' '}
                  <span className="text-[#9CA3AF]">Key Themes</span>
                </div>
                <div>
                  <span className="font-mono text-white font-bold">
                    {member.networkInfluence.sharedInvestors}
                  </span>{' '}
                  <span className="text-[#9CA3AF]">Shared Investors</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lower Details Grid (Matching Images 4 & 8) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: About */}
        <div className="bg-[#0E121A] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
            About {member.firstName}
          </div>
          <p className="text-xs text-[#CBD5E1] leading-relaxed">
            {member.fullBio}
          </p>
          <div className="space-y-2 text-xs text-[#9CA3AF] pt-2 border-t border-white/5">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>{member.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>{member.company}</span>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>{member.almaMater}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-[#6B7280]" />
              <span className="text-[#3D6BF2]">{member.website}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Focus Areas & Objectives */}
        <div className="bg-[#0E121A] border border-white/10 rounded-xl p-5 space-y-4">
          <div>
            <div className="text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold mb-2">
              Focus Areas
            </div>
            <div className="flex flex-wrap gap-1.5">
              {member.focusAreas.map((area, idx) => (
                <span
                  key={idx}
                  className="text-xs text-[#CBD5E1] bg-white/5 border border-white/10 px-2.5 py-1 rounded-md"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-white/5">
            <div className="text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold mb-2">
              Current Objectives
            </div>
            <ul className="space-y-2 text-xs text-[#CBD5E1]">
              {member.currentObjectives.map((obj, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3D6BF2] mt-1.5 shrink-0" />
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Card 3: Compatibility Insights (3 Circular SVG Radial Gauges) */}
        <div className="bg-[#0E121A] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
            Compatibility Insights
          </div>

          <div className="grid grid-cols-3 gap-2 text-center py-2">
            {/* Gauge 1: Strategic Fit */}
            <div className="space-y-2">
              <div className="relative w-16 h-16 mx-auto">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#3D6BF2"
                    strokeWidth="3"
                    strokeDasharray={`${member.compatibility.strategicFit}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-white">
                  {member.compatibility.strategicFit}%
                </div>
              </div>
              <div className="text-[10px] font-medium text-white">Strategic Fit</div>
            </div>

            {/* Gauge 2: Shared Interests */}
            <div className="space-y-2">
              <div className="relative w-16 h-16 mx-auto">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#60A5FA"
                    strokeWidth="3"
                    strokeDasharray={`${member.compatibility.sharedInterests}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-white">
                  {member.compatibility.sharedInterests}%
                </div>
              </div>
              <div className="text-[10px] font-medium text-white">Shared Interests</div>
            </div>

            {/* Gauge 3: Network Value */}
            <div className="space-y-2">
              <div className="relative w-16 h-16 mx-auto">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="3"
                    strokeDasharray={`${member.compatibility.networkValue}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-white">
                  {member.compatibility.networkValue}%
                </div>
              </div>
              <div className="text-[10px] font-medium text-white">Network Value</div>
            </div>
          </div>

          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg text-xs space-y-1">
            <div className="text-[10px] font-mono uppercase text-[#3D6BF2]">Availability Status</div>
            <div className="text-[#CBD5E1] flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {member.introStatusText}
            </div>
          </div>
        </div>

        {/* Card 4: Shared Connections */}
        <div className="bg-[#0E121A] border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
            <span>Shared Connections ({member.mutualConnectionsCount})</span>
            <button
              onClick={() => onNavigate('people')}
              className="text-[#3D6BF2] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {member.mutualConnections.map((conn) => (
              <div
                key={conn.id}
                onClick={() => onNavigate('profile', conn.id)}
                className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <ExecutivePortrait name={conn.name} size="sm" />
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-[#3D6BF2]">
                      {conn.name}
                    </div>
                    <div className="text-[10px] text-[#9CA3AF]">
                      {conn.title}, {conn.company}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#CBD5E1]">
                  {conn.degree}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 5: Recent Posts */}
        <div className="bg-[#0E121A] border border-white/10 rounded-xl p-5 space-y-3">
          <div className="text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
            Recent Posts
          </div>
          {member.recentPosts.length > 0 ? (
            <div className="space-y-3">
              {member.recentPosts.map((post) => (
                <div key={post.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-white">{post.title}</h4>
                    <span className="text-[10px] text-[#6B7280]">{post.timeAgo}</span>
                  </div>
                  <p className="text-[11px] text-[#9CA3AF] line-clamp-2">
                    {post.snippet}
                  </p>
                  <div className="flex items-center gap-4 text-[10px] text-[#6B7280] pt-1">
                    <span>❤️ {post.likes}</span>
                    <span>💬 {post.comments}</span>
                    <span>🔁 {post.shares}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#9CA3AF] italic">No recent public dispatches.</p>
          )}
        </div>

        {/* Card 6: Recommendations */}
        <div className="bg-[#0E121A] border border-white/10 rounded-xl p-5 space-y-3">
          <div className="text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
            Recommendations
          </div>
          {member.recommendations.length > 0 ? (
            <div className="space-y-3">
              {member.recommendations.map((rec) => (
                <div key={rec.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-lg space-y-2">
                  <p className="text-xs text-[#CBD5E1] italic leading-relaxed">
                    "{rec.text}"
                  </p>
                  <div className="pt-2 border-t border-white/5 flex items-center gap-2.5">
                    <ExecutivePortrait name={rec.author} size="sm" />
                    <div>
                      <div className="text-xs font-semibold text-white">{rec.author}</div>
                      <div className="text-[10px] text-[#9CA3AF]">{rec.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#9CA3AF] italic">No public endorsements on file.</p>
          )}
        </div>
      </div>
    </div>
  );
};
