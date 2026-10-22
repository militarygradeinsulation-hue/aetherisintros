import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import BusinessAnalystPanel from '@/aetheris/BusinessAnalystPanel';
import { TrackRecordDashboard } from '@/aetheris/TrackRecordDashboard';
import type { ActivePage } from '../components/layout/TopNavigation';

type IntelligenceTab = 'business' | 'track' | 'specter';

const TABS: readonly { id: IntelligenceTab; label: string }[] = [
  { id: 'business', label: 'Business Intelligence' },
  { id: 'track', label: 'Track Record' },
  { id: 'specter', label: 'Specter Detect' },
];

/**
 * Private member intelligence as a compact tabbed destination inside the
 * shared workspace shell. Both panels keep their server-owned data paths;
 * the full Specter investigation stays on its own workspace page instead of
 * being duplicated below these sections. No scores or metrics are invented:
 * unavailable data renders as unavailable inside each panel.
 */
export function MemberIntelligenceView({ live, onNavigate }: {
  live: boolean;
  onNavigate: (page: ActivePage) => void;
}) {
  const [tab, setTab] = useState<IntelligenceTab>('business');
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(!live);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!live) return;
    let off = false;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (off) return;
      if (error) setAuthError('Your session could not be verified. Sign in again or retry.');
      setUserId(data.user?.id ?? null);
      setChecked(true);
    }).catch(() => {
      if (off) return;
      setAuthError('Your session could not be verified. Check your connection and retry.');
      setUserId(null);
      setChecked(true);
    });
    return () => { off = true; };
  }, [live]);

  if (!live) {
    return <section className="mi-view" aria-labelledby="mi-heading">
      <header className="mi-head">
        <p className="mi-eyebrow">PRIVATE MEMBER INTELLIGENCE</p>
        <h1 id="mi-heading">What the network knows. What it can prove.</h1>
        <p>Business analysis and your evidence-based track record are private member features. This demo shows no sample scores or invented metrics — sign in to review your real data.</p>
      </header>
    </section>;
  }

  if (!checked) {
    return <section className="mi-view" aria-busy="true"><p className="mi-loading">Loading member intelligence…</p></section>;
  }
  if (authError) return <section className="mi-view" role="alert"><p className="mi-loading">{authError}</p><button type="button" onClick={() => window.location.reload()}>Retry member intelligence</button></section>;
  if (!userId) {
    return <section className="mi-view" role="alert"><p className="mi-loading">Sign in to review your private business and track-record data.</p></section>;
  }

  return <section className="mi-view" aria-labelledby="mi-heading">
    <header className="mi-head">
      <p className="mi-eyebrow">PRIVATE MEMBER INTELLIGENCE</p>
      <h1 id="mi-heading">What the network knows. What it can prove.</h1>
      <p>Analysis runs against your real profile and network activity. Your track record is derived from introduction outcomes — never self-reported.</p>
    </header>

    <div className="mi-tabs" role="tablist" aria-label="Member intelligence sections">
      {TABS.map(({ id, label }) => (
        <button key={id} type="button" role="tab" id={`mi-tab-${id}`}
          aria-selected={tab === id} aria-controls={`mi-panel-${id}`}
          className={tab === id ? 'active' : ''}
          onClick={() => setTab(id)}>
          {label}
        </button>
      ))}
    </div>

    {tab === 'business' && (
      <div role="tabpanel" id="mi-panel-business" aria-labelledby="mi-tab-business" className="mi-panel">
        <BusinessAnalystPanel />
      </div>
    )}
    {tab === 'track' && (
      <div role="tabpanel" id="mi-panel-track" aria-labelledby="mi-tab-track" className="mi-panel">
        <p className="mi-note">This score is calculated from network outcomes. Members cannot directly edit their reputation score.</p>
        <TrackRecordDashboard userId={userId} />
      </div>
    )}
    {tab === 'specter' && (
      <div role="tabpanel" id="mi-panel-specter" aria-labelledby="mi-tab-specter" className="mi-panel mi-specter-card">
        <h2>Specter Detect</h2>
        <p>Company investigation runs in its own full-screen workspace with the interactive browser, capture and evidence tabs.</p>
        <button type="button" className="mi-cta" onClick={() => onNavigate('specter')}>Open Specter Detect</button>
      </div>
    )}
  </section>;
}
