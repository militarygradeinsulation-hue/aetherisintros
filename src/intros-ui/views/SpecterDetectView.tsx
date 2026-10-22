import React, { useState } from 'react';
import {
  Globe, Search, Download, CheckCircle, AlertTriangle,
  Building2, Bookmark, FileText, TrendingUp, Eye,
  Link2, Image, Phone, FileSearch, ChevronRight, Zap,
  ExternalLink, Lock, RotateCcw, ChevronLeft, Star,
  MoreHorizontal, X, HelpCircle
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
  name: 'Example Company',
  domain: 'examplecompany.com',
  type: 'Privately Held',
  founded: '2015',
  employees: '~250',
  description:
    'Example Company is a B2B technology firm specializing in enterprise solutions and digital transformation. They serve mid-market and enterprise clients across professional services, healthcare, and financial sectors with innovative software products.',
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
  { text: 'Products', href: '#', section: 'Nav' },
  { text: 'Solutions', href: '#', section: 'Nav' },
  { text: 'About Us', href: '#', section: 'Company' },
  { text: 'Resources', href: '#', section: 'Content' },
  { text: 'Contact Us', href: '#', section: 'CTA' },
  { text: 'Case Studies', href: '#', section: 'Proof' },
  { text: 'Leadership Team', href: '#', section: 'Company' },
  { text: 'Request Demo', href: '#', section: 'CTA' },
];

const DEMO_KEY_FACTS = [
  { label: 'Industry', value: 'Enterprise SaaS / Consulting' },
  { label: 'Revenue Stage', value: 'Growth (est. $5M–$20M ARR)' },
  { label: 'Tech Stack', value: 'React, Node.js, AWS, Salesforce' },
  { label: 'Hiring Signal', value: 'Active — 7 open roles' },
  { label: 'Customer Count', value: '80+ enterprise clients' },
  { label: 'Geo Focus', value: 'North America primary, EU expansion' },
];

function FindingIcon({ status }: { status: Finding['status'] }) {
  if (status === 'confirmed') return <CheckCircle size={15} className="text-emerald-400 shrink-0 mt-0.5" />;
  if (status === 'warning') return <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />;
  return <Eye size={15} className="text-[#6B7280] shrink-0 mt-0.5" />;
}

function BrowserFrame({ url }: { url: string }) {
  return (
    <div className="flex flex-col rounded-xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Tab bar */}
      <div className="flex items-center gap-0 bg-[#1A1D26] border-b border-white/8 px-3 pt-2">
        <div className="flex items-center gap-2 bg-[#12151C] rounded-t-lg px-3 py-1.5 border border-white/10 border-b-transparent -mb-px">
          <div className="w-3.5 h-3.5 rounded-full bg-amber-500/20 flex items-center justify-center">
            <span className="text-[7px] font-bold text-amber-400">E</span>
          </div>
          <span className="text-[11px] text-[#D1D5DB] whitespace-nowrap">Example Company – Home</span>
          <X size={10} className="text-[#6B7280] ml-1 hover:text-white cursor-pointer" />
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-[#4B5563] cursor-pointer hover:text-[#9CA3AF] ml-1">
          <span className="text-lg leading-none">+</span>
        </div>
      </div>
      {/* Chrome bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#12151C] border-b border-white/8">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/70 flex items-center justify-center" />
          <span className="w-3 h-3 rounded-full bg-amber-400/70" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
        </div>
        <button type="button" className="p-1 text-[#4B5563] hover:text-[#9CA3AF]"><ChevronLeft size={14} /></button>
        <button type="button" className="p-1 text-[#4B5563] hover:text-[#9CA3AF]"><ChevronLeft size={14} className="opacity-40" /></button>
        <button type="button" className="p-1 text-[#4B5563] hover:text-[#9CA3AF]"><RotateCcw size={12} /></button>
        <div className="flex-1 mx-1 flex items-center gap-2 bg-[#0E1117] rounded-md px-3 py-1.5 border border-white/8">
          <Lock size={11} className="text-emerald-400/70 shrink-0" />
          <span className="text-[11px] text-[#9CA3AF] flex-1 truncate font-mono">{url}</span>
          <Star size={11} className="text-[#4B5563]" />
        </div>
        <button type="button" className="p-1 text-[#4B5563] hover:text-[#9CA3AF]"><MoreHorizontal size={14} /></button>
        <ExternalLink size={11} className="text-[#6B7280]" />
      </div>
      {/* Simulated website */}
      <div className="bg-[#F8F9FA] overflow-hidden" style={{ height: '260px' }}>
        {/* Website nav */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
              <span className="text-white text-[9px] font-black">E</span>
            </div>
            <span className="text-[12px] font-bold text-gray-800">ExampleCompany</span>
          </div>
          <div className="flex items-center gap-5 ml-4">
            {['Products', 'Solutions', 'About', 'Resources', 'Contact Us'].map(item => (
              <span key={item} className="text-[11px] text-gray-600 hover:text-blue-600 cursor-pointer font-medium">{item}</span>
            ))}
          </div>
          <div className="ml-auto">
            <div className="bg-blue-600 text-white text-[10px] font-semibold px-3 py-1.5 rounded">Get Started</div>
          </div>
        </div>
        {/* Hero section */}
        <div className="relative overflow-hidden" style={{ height: '210px' }}>
          {/* Background image simulation - dark blue gradient with building silhouette */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-800 via-blue-900 to-slate-700">
            {/* Simulated cityscape/building shapes */}
            <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-2 opacity-30">
              {[120, 80, 160, 100, 140, 90, 110, 75, 130].map((h, i) => (
                <div key={i} className="bg-slate-400 rounded-t-sm" style={{ width: '28px', height: `${h}px` }} />
              ))}
            </div>
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
          </div>
          <div className="relative z-10 px-8 pt-8">
            <div className="text-[10px] text-blue-300 font-semibold uppercase tracking-widest mb-2">Enterprise Solutions</div>
            <h2 className="text-white font-black text-[20px] leading-tight max-w-xs">
              Innovative Solutions for a Stronger Tomorrow
            </h2>
            <p className="text-gray-300 text-[10px] mt-2 max-w-sm">
              Empowering businesses with cutting-edge technology and strategic consulting.
            </p>
            <div className="flex gap-2 mt-4">
              <div className="bg-blue-600 text-white text-[9px] font-bold px-3 py-1.5 rounded cursor-pointer">Learn More</div>
              <div className="border border-white/40 text-white text-[9px] font-semibold px-3 py-1.5 rounded cursor-pointer">Watch Demo</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SpecterDetectView() {
  const [url, setUrl] = useState('https://www.examplecompany.com');
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(true); // Start pre-loaded for demo
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
    <div className="min-h-screen bg-[#07090C] px-5 py-5 relative overflow-hidden">
      {/* Subtle bottom-left texture */}
      <div className="pointer-events-none absolute bottom-0 left-0 w-96 h-96 opacity-20" style={{
        background: 'radial-gradient(ellipse at bottom left, #8B1A00 0%, #4A0A00 40%, transparent 70%)',
        filter: 'blur(60px)'
      }} />

      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="flex items-baseline gap-2 mb-1">
            <h1 className="text-3xl font-black tracking-tight text-white">SPECTER</h1>
            <h1 className="text-3xl font-black tracking-tight text-[#F5B027]">DETECT</h1>
          </div>
          <p className="text-[13px] text-[#6B7280]">
            Investigate companies. Verify information. Make informed decisions.
          </p>
        </div>
        <button type="button" className="flex items-center gap-1.5 text-[12px] text-[#6B7280] hover:text-[#F5B027] transition-colors mt-1">
          <HelpCircle size={13} />
          How it works
        </button>
      </div>

      {/* URL Scanner Bar */}
      <div className="flex items-center gap-2 mb-5 rounded-xl border border-white/10 bg-[#0E121A] p-1.5">
        <div className="flex items-center gap-2 flex-1 px-3">
          <Globe size={15} className="text-[#6B7280] shrink-0" />
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://www.examplecompany.com"
            className="flex-1 bg-transparent text-[13px] text-white placeholder:text-[#374151] outline-none py-2 font-mono"
          />
          {url && (
            <button
              type="button"
              onClick={() => { setUrl(''); setScanned(false); }}
              className="text-[#4B5563] hover:text-white transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleScan}
            disabled={!url.trim() || scanning}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#F5B027] text-black text-[13px] font-bold hover:bg-[#F5B027]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            className="p-2.5 rounded-lg border border-white/10 text-[#6B7280] hover:text-white hover:border-white/20 transition-colors"
            title="Export"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Left Panel — Browser + Stats */}
        <div className="xl:col-span-3 space-y-4">
          {/* Browser frame */}
          <BrowserFrame url={scanned ? url : (url || 'https://')} />

          {/* Extracted Info */}
          {scanned && !scanning && (
            <div className="rounded-xl border border-white/10 bg-[#0E121A] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF]">
                  Extracted Information
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
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
                  <div key={label} className="flex flex-col items-center gap-1.5 bg-[#12151C] rounded-lg p-3 border border-white/6">
                    <Icon size={14} className="text-[#F5B027]" />
                    <span className="text-xl font-bold text-white leading-none">{value}</span>
                    <span className="text-[9px] text-[#6B7280] text-center leading-tight">{label}</span>
                  </div>
                ))}
              </div>
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
        <div className="xl:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-0.5 bg-[#0E121A] rounded-xl p-1 border border-white/8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap flex-1 justify-center ${
                  activeTab === tab.id
                    ? 'bg-[#12151C] text-white border-b-2 border-[#F5B027]'
                    : 'text-[#6B7280] hover:text-white'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`text-[9px] px-1 rounded ${activeTab === tab.id ? 'bg-[#F5B027]/20 text-[#F5B027]' : 'bg-white/8 text-[#4B5563]'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'analysis' && scanned && (
            <div className="space-y-3">
              {/* Company Overview */}
              <div className="rounded-xl border border-white/10 bg-[#0E121A] p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-white">{DEMO_COMPANY.name}</h3>
                      <span className="text-[9px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded px-1.5 py-0.5 uppercase tracking-wider whitespace-nowrap">
                        AI Generated
                      </span>
                    </div>
                    <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                      {DEMO_COMPANY.type} | Founded {DEMO_COMPANY.founded} | {DEMO_COMPANY.employees} Employees
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
                  <span className="text-[11px] font-semibold text-[#D1D5DB] uppercase tracking-wider">Key Findings</span>
                  <span className="ml-auto text-[9px] font-bold bg-[#F5B027]/10 text-[#F5B027] border border-[#F5B027]/20 rounded px-1.5 py-0.5">AI Analysis</span>
                </div>
                <div className="space-y-2.5">
                  {DEMO_FINDINGS.map(finding => (
                    <div key={finding.id} className="flex items-start gap-2.5">
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

          {activeTab === 'analysis' && !scanned && (
            <div className="rounded-xl border border-white/6 bg-[#0A0C12] p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <Search size={20} className="text-white/20" />
              </div>
              <p className="text-sm text-[#4B5563] font-medium">Analysis will appear here</p>
              <p className="text-[11px] text-[#374151] mt-1.5 max-w-[200px] leading-relaxed">
                Scan a company URL to get AI-generated insights, key findings, and evidence signals
              </p>
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
                { type: 'Blog Content', signal: 'Recent posts on digital transformation and AI automation', confidence: 74 },
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
        </div>
      </div>
    </div>
  );
}
