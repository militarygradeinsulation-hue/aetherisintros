import React, { useState } from 'react';
import {
  Globe, Search, Download, CheckCircle, AlertTriangle,
  Building2, Bookmark, FileText, TrendingUp, Eye,
  Link2, Image, Phone, FileSearch, ChevronRight, Zap,
  ExternalLink, Clock, Shield, Users
} from 'lucide-react';

interface Finding {
  id: string;
  label: string;
  text: string;
  status: 'confirmed' | 'warning' | 'unknown';
}

interface CompanyOverview {
  name: string;
  domain: string;
  type: string;
  founded: string;
  employees: string;
  description: string;
}

interface ExtractedStats {
  headings: number;
  links: number;
  images: number;
  contacts: number;
  documents: number;
}

type AnalysisTab = 'analysis' | 'evidence' | 'keyfacts' | 'links' | 'images';

const DEMO_COMPANY: CompanyOverview = {
  name: 'Meridian Solutions Group',
  domain: 'meridiansolutions.io',
  type: 'Privately Held',
  founded: '2015',
  employees: '~250',
  description:
    'Meridian Solutions Group is a B2B software and consulting firm specializing in enterprise workflow automation and digital transformation. They serve mid-market and enterprise clients across professional services, healthcare, and financial sectors.',
};

const DEMO_STATS: ExtractedStats = {
  headings: 24,
  links: 18,
  images: 12,
  contacts: 8,
  documents: 6,
};

const DEMO_FINDINGS: Finding[] = [
  { id: 'f1', label: 'Business Model', text: 'B2B software and consulting services targeting enterprise and mid-market', status: 'confirmed' },
  { id: 'f2', label: 'Target Market', text: 'Enterprise and mid-market organizations in professional services and healthcare', status: 'confirmed' },
  { id: 'f3', label: 'Leadership', text: 'Experienced team with deep industry background and prior enterprise exits', status: 'confirmed' },
  { id: 'f4', label: 'Funding', text: 'No recent funding announcements found — bootstrapped or early-stage undisclosed', status: 'warning' },
  { id: 'f5', label: 'Recent News', text: 'Positive growth indicators — new case studies published, expanded team page', status: 'confirmed' },
  { id: 'f6', label: 'Potential Risks', text: 'Limited transparency on key partnership ecosystem and distribution channels', status: 'warning' },
];

const DEMO_LINKS = [
  { text: 'About Us', href: '#', section: 'Company' },
  { text: 'Enterprise Solutions', href: '#', section: 'Product' },
  { text: 'Case Studies', href: '#', section: 'Proof' },
  { text: 'Leadership Team', href: '#', section: 'Company' },
  { text: 'Careers', href: '#', section: 'Company' },
  { text: 'Blog', href: '#', section: 'Content' },
  { text: 'Contact Sales', href: '#', section: 'CTA' },
  { text: 'Request Demo', href: '#', section: 'CTA' },
];

const DEMO_KEY_FACTS = [
  { label: 'Industry', value: 'Enterprise SaaS / Consulting' },
  { label: 'Revenue Stage', value: 'Growth (est. $5M–$20M ARR)' },
  { label: 'Tech Stack', value: 'React, Node.js, AWS, Salesforce integrations' },
  { label: 'Hiring Signal', value: 'Active — 7 open roles in engineering and sales' },
  { label: 'Customer Count', value: '80+ enterprise clients (inferred from case studies)' },
  { label: 'Geo Focus', value: 'North America primary, EU expansion indicated' },
];

function FindingIcon({ status }: { status: Finding['status'] }) {
  if (status === 'confirmed') return <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />;
  if (status === 'warning') return <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />;
  return <Eye size={14} className="text-[#6B7280] shrink-0 mt-0.5" />;
}

interface BrowserFrameProps {
  url: string;
  scanned: boolean;
}

function BrowserFrame({ url, scanned }: BrowserFrameProps) {
  const displayUrl = url || 'https://';
  return (
    <div className="flex flex-col rounded-xl border border-white/10 overflow-hidden bg-[#0A0C12]">
      {/* Chrome bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#12151C] border-b border-white/8">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
        </div>
        <div className="flex-1 mx-2 flex items-center gap-2 bg-[#0E1117] rounded-md px-3 py-1 border border-white/8">
          <Globe size={11} className="text-[#6B7280] shrink-0" />
          <span className="text-[11px] text-[#9CA3AF] truncate font-mono">{displayUrl}</span>
        </div>
        <ExternalLink size={11} className="text-[#6B7280]" />
      </div>
      {/* Page area */}
      {scanned ? (
        <div className="relative h-72 overflow-hidden">
          {/* Simulated page rendering */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3 pb-2 border-b border-white/8">
              <div className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center">
                <Building2 size={12} className="text-amber-400" />
              </div>
              <span className="text-xs font-semibold text-white">Meridian Solutions Group</span>
              <div className="flex items-center gap-3 ml-auto text-[10px] text-[#6B7280]">
                <span>Solutions</span>
                <span>About</span>
                <span>Blog</span>
                <span className="text-amber-400 font-semibold">Contact</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="w-4/5 h-3 rounded-sm bg-white/10" />
              <div className="w-3/5 h-5 rounded-sm bg-white/15" />
              <div className="w-2/3 h-3 rounded-sm bg-white/8" />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[1,2,3].map(i => (
                <div key={i} className="rounded-lg bg-white/5 border border-white/8 p-2 space-y-1.5">
                  <div className="w-full h-8 rounded bg-white/8" />
                  <div className="w-3/4 h-2 rounded-sm bg-white/10" />
                  <div className="w-full h-2 rounded-sm bg-white/8" />
                  <div className="w-2/3 h-2 rounded-sm bg-white/6" />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {[100,85,70].map((w, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <div className={`h-2 rounded-sm bg-white/8`} style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>
          </div>
          {/* Scan overlay shimmer */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-teal-500/5 to-transparent pointer-events-none" />
        </div>
      ) : (
        <div className="h-72 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Globe size={28} className="text-white/20 mx-auto" />
            <p className="text-xs text-[#6B7280]">Enter a URL above to begin</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function SpecterDetectView() {
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [activeTab, setActiveTab] = useState<AnalysisTab>('analysis');
  const [savedCase, setSavedCase] = useState(false);
  const [tracking, setTracking] = useState(false);

  const handleScan = () => {
    if (!url.trim()) return;
    setScanning(true);
    setScanned(false);
    setTimeout(() => {
      setScanning(false);
      setScanned(true);
    }, 1800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleScan();
  };

  const tabs: { id: AnalysisTab; label: string; count?: number }[] = [
    { id: 'analysis', label: 'Analysis' },
    { id: 'evidence', label: 'Evidence', count: 24 },
    { id: 'keyfacts', label: 'Key Facts' },
    { id: 'links', label: 'Links', count: DEMO_STATS.links },
    { id: 'images', label: 'Images', count: DEMO_STATS.images },
  ];

  return (
    <div className="min-h-screen bg-[#07090C] px-4 sm:px-6 py-5">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-baseline gap-2 mb-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">SPECTER</h1>
          <h1 className="text-2xl font-bold tracking-tight text-[#F5B027]">DETECT</h1>
        </div>
        <p className="text-xs text-[#6B7280] tracking-wide">
          Investigate companies. Verify information. Make informed decisions.
        </p>
      </div>

      {/* URL Scanner Bar */}
      <div className="flex items-center gap-2 mb-6 p-1 rounded-xl border border-white/10 bg-[#0E121A]">
        <div className="flex items-center gap-2 flex-1 px-3">
          <Globe size={15} className="text-[#6B7280] shrink-0" />
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter company website URL…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#4B5563] outline-none py-2 font-mono"
          />
          {url && (
            <button
              type="button"
              onClick={() => { setUrl(''); setScanned(false); }}
              className="text-[#6B7280] hover:text-white transition-colors text-xs"
            >
              ×
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleScan}
            disabled={!url.trim() || scanning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F5B027] text-black text-sm font-bold hover:bg-[#F5B027]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {scanning ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Scanning…
              </>
            ) : (
              <>
                <Search size={14} />
                Scan Website
              </>
            )}
          </button>
          <button
            type="button"
            className="p-2 rounded-lg border border-white/10 text-[#6B7280] hover:text-white hover:border-white/20 transition-colors"
            title="Export"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left Panel — Browser + Stats */}
        <div className="lg:col-span-3 space-y-4">
          <BrowserFrame url={scanned ? (url || 'https://meridiansolutions.io') : url} scanned={scanned} />

          {/* Extracted Info */}
          {scanned && (
            <div className="rounded-xl border border-white/10 bg-[#0E121A] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF]">
                  Extracted Information
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Page loaded successfully
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { icon: FileSearch, label: 'Headings', value: DEMO_STATS.headings },
                  { icon: Link2, label: 'Links', value: DEMO_STATS.links },
                  { icon: Image, label: 'Images', value: DEMO_STATS.images },
                  { icon: Phone, label: 'Contacts', value: DEMO_STATS.contacts },
                  { icon: FileText, label: 'Documents', value: DEMO_STATS.documents },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex flex-col items-center gap-1 bg-[#12151C] rounded-lg p-2.5 border border-white/6">
                    <Icon size={13} className="text-[#F5B027]" />
                    <span className="text-base font-bold text-white">{value}</span>
                    <span className="text-[9px] text-[#6B7280] text-center">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!scanned && !scanning && (
            <div className="rounded-xl border border-white/6 bg-[#0A0C12] p-8 text-center">
              <Shield size={28} className="text-white/15 mx-auto mb-3" />
              <p className="text-sm text-[#4B5563]">Scan a company URL to extract page intelligence</p>
              <p className="text-[11px] text-[#374151] mt-1">Headings, links, contacts, and signals will appear here</p>
            </div>
          )}

          {scanning && (
            <div className="rounded-xl border border-[#F5B027]/20 bg-[#F5B027]/5 p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-4 h-4 border-2 border-[#F5B027]/30 border-t-[#F5B027] rounded-full animate-spin" />
                <span className="text-sm font-semibold text-[#F5B027]">Analyzing page content…</span>
              </div>
              <p className="text-[11px] text-[#9CA3AF]">Extracting headings, links, contacts, and business signals</p>
            </div>
          )}
        </div>

        {/* Right Panel — Analysis */}
        <div className="lg:col-span-2 space-y-4">
          {scanned ? (
            <>
              {/* Tabs */}
              <div className="flex items-center gap-0.5 bg-[#0E121A] rounded-xl p-1 border border-white/8">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-[#F5B027] text-black'
                        : 'text-[#6B7280] hover:text-white'
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className={`text-[9px] px-1 rounded ${activeTab === tab.id ? 'bg-black/20 text-black' : 'bg-white/8 text-[#9CA3AF]'}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'analysis' && (
                <div className="space-y-3">
                  {/* Company Overview */}
                  <div className="rounded-xl border border-white/10 bg-[#0E121A] p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                        <Building2 size={16} className="text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-bold text-white">{DEMO_COMPANY.name}</h3>
                          <span className="text-[9px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded px-1.5 py-0.5 uppercase tracking-wider whitespace-nowrap">
                            AI Generated
                          </span>
                        </div>
                        <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                          {DEMO_COMPANY.type} · Founded {DEMO_COMPANY.founded} · {DEMO_COMPANY.employees} Employees
                        </p>
                        <p className="text-[10px] text-[#F5B027] font-mono mt-0.5">{DEMO_COMPANY.domain}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#9CA3AF] leading-relaxed border-t border-white/8 pt-3">
                      {DEMO_COMPANY.description}
                    </p>
                  </div>

                  {/* Key Findings */}
                  <div className="rounded-xl border border-white/10 bg-[#0E121A] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap size={12} className="text-[#F5B027]" />
                      <span className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF]">Key Findings</span>
                    </div>
                    <div className="space-y-2.5">
                      {DEMO_FINDINGS.map(finding => (
                        <div key={finding.id} className="flex items-start gap-2">
                          <FindingIcon status={finding.status} />
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-semibold text-white">{finding.label}: </span>
                            <span className="text-[11px] text-[#9CA3AF]">{finding.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="rounded-xl border border-white/10 bg-[#0E121A] p-4">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-3">Quick Actions</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSavedCase(v => !v)}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border text-[10px] font-semibold transition-all ${
                          savedCase
                            ? 'bg-teal-500/15 border-teal-500/30 text-teal-400'
                            : 'bg-white/4 border-white/8 text-[#9CA3AF] hover:border-white/15 hover:text-white'
                        }`}
                      >
                        <Bookmark size={14} />
                        {savedCase ? 'Saved' : 'Save Case'}
                      </button>
                      <button
                        type="button"
                        className="flex flex-col items-center gap-1.5 py-3 rounded-lg border border-white/8 bg-white/4 text-[#9CA3AF] hover:border-white/15 hover:text-white text-[10px] font-semibold transition-all"
                      >
                        <FileText size={14} />
                        Export Report
                      </button>
                      <button
                        type="button"
                        onClick={() => setTracking(v => !v)}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border text-[10px] font-semibold transition-all ${
                          tracking
                            ? 'bg-[#F5B027]/15 border-[#F5B027]/30 text-[#F5B027]'
                            : 'bg-white/4 border-white/8 text-[#9CA3AF] hover:border-white/15 hover:text-white'
                        }`}
                      >
                        <TrendingUp size={14} />
                        {tracking ? 'Tracking' : 'Track Company'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'evidence' && (
                <div className="rounded-xl border border-white/10 bg-[#0E121A] p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye size={12} className="text-teal-400" />
                    <span className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF]">Evidence Signals</span>
                    <span className="ml-auto text-[10px] text-teal-400 font-semibold">24 collected</span>
                  </div>
                  {[
                    { type: 'Page Copy', signal: 'Enterprise-grade security and compliance mentioned 4× on homepage', confidence: 91 },
                    { type: 'Team Page', signal: 'Former Salesforce and Oracle executives on leadership team', confidence: 87 },
                    { type: 'Case Studies', signal: '6 published case studies with Fortune 1000 client names', confidence: 85 },
                    { type: 'Job Listings', signal: 'Hiring VP of Sales and 3 enterprise account executives', confidence: 82 },
                    { type: 'Pricing Page', signal: 'Enterprise pricing contact-only — no self-serve tier visible', confidence: 79 },
                    { type: 'Blog Content', signal: 'Recent posts on digital transformation and AI automation signal', confidence: 74 },
                  ].map((ev, i) => (
                    <div key={i} className="flex items-start gap-3 py-2.5 border-b border-white/6 last:border-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-white uppercase tracking-wide">{ev.type}</span>
                          <span className="text-[10px] font-mono font-bold text-teal-400">{ev.confidence}%</span>
                        </div>
                        <p className="text-[11px] text-[#9CA3AF] mt-0.5 leading-relaxed">{ev.signal}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'keyfacts' && (
                <div className="rounded-xl border border-white/10 bg-[#0E121A] p-4 space-y-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <FileSearch size={12} className="text-[#F5B027]" />
                    <span className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF]">Key Facts</span>
                  </div>
                  {DEMO_KEY_FACTS.map((fact, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-white/6 last:border-0">
                      <span className="text-[11px] text-[#6B7280]">{fact.label}</span>
                      <span className="text-[11px] text-white font-medium text-right">{fact.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'links' && (
                <div className="rounded-xl border border-white/10 bg-[#0E121A] p-4 space-y-1.5">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 size={12} className="text-[#6B7280]" />
                    <span className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF]">Extracted Links</span>
                    <span className="ml-auto text-[10px] text-[#6B7280]">{DEMO_LINKS.length} found</span>
                  </div>
                  {DEMO_LINKS.map((link, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-white/6 last:border-0">
                      <div className="flex items-center gap-2">
                        <ChevronRight size={10} className="text-[#F5B027]" />
                        <span className="text-[11px] text-white">{link.text}</span>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-[#6B7280] border border-white/8 uppercase">{link.section}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'images' && (
                <div className="rounded-xl border border-white/10 bg-[#0E121A] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Image size={12} className="text-[#6B7280]" />
                    <span className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF]">Images</span>
                    <span className="ml-auto text-[10px] text-[#6B7280]">{DEMO_STATS.images} found</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: DEMO_STATS.images }).map((_, i) => (
                      <div key={i} className="aspect-square rounded-lg bg-[#12151C] border border-white/8 flex items-center justify-center">
                        <Image size={16} className="text-white/15" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-white/6 bg-[#0A0C12] p-8 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <Search size={20} className="text-white/20" />
              </div>
              <p className="text-sm text-[#4B5563] font-medium">Analysis will appear here</p>
              <p className="text-[11px] text-[#374151] mt-1.5 max-w-[200px] leading-relaxed">
                Scan a company URL to get AI-generated insights, key findings, and evidence signals
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
