import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AetherisAppSurface } from '@/aetheris/App';
import { InviteCard } from '@/aetheris/InviteCard';
import { ConnectionBubblesView } from '../../bridge-reference/src/intros-ui/views/ConnectionBubblesView';
import { IntrosHubView } from '../../bridge-reference/src/intros-ui/views/IntrosHubView';
import type { NetworkMember, IntroRequest } from '../networkData';
import type { ActivePage } from '../components/layout/TopNavigation';
type IntrosSection = 'radar' | 'introductions' | 'memory';
export function BridgeIntroductions({ mode, members, introRequests, handleNavigate, setRequestIntroTarget, setReviewIntroRequest, handleDismissIntroRequest }: {
 mode: 'live' | 'demo'; members: NetworkMember[]; introRequests: IntroRequest[];
 handleNavigate: (page: ActivePage, id?: string) => void;
 setRequestIntroTarget: (member: NetworkMember) => void;
 setReviewIntroRequest: (request: IntroRequest) => void;
 handleDismissIntroRequest: (id: string) => void;
}) {
 const [introsSection, setIntrosSection] = useState<IntrosSection>('radar');
 return (<section className="commons-intros-workspace">
          <header className="commons-page-head"><div><span className="commons-eyebrow">RELATIONSHIPS, WITH CONTEXT</span><h1>Ask Intros</h1></div></header>
          <div role="tablist" aria-label="Ask Intros sections" className="commons-section-tabs">
            {(['radar', 'introductions', 'memory'] as const).map(section => <Button key={section} variant="ghost"
              role="tab" id={`intros-tab-${section}`} aria-selected={introsSection === section} aria-controls={`intros-panel-${section}`}
              tabIndex={introsSection === section ? 0 : -1}
              onKeyDown={event => {
                const sections: IntrosSection[] = ['radar', 'introductions', 'memory'];
                const index = sections.indexOf(section);
                const next = event.key === 'ArrowRight' ? sections[(index + 1) % 3] : event.key === 'ArrowLeft' ? sections[(index + 2) % 3] : event.key === 'Home' ? 'radar' : event.key === 'End' ? 'memory' : undefined;
                if (next) { event.preventDefault(); setIntrosSection(next); document.getElementById(`intros-tab-${next}`)?.focus(); }
              }} onClick={() => setIntrosSection(section)}>{section === 'radar' ? 'Live Signal Radar' : section === 'memory' ? 'Memory' : 'Introductions'}</Button>)}
          </div>
          {introsSection === 'radar' && <div role="tabpanel" id="intros-panel-radar" aria-labelledby="intros-tab-radar">
            <ConnectionBubblesView embedded members={members} onNavigate={handleNavigate} onRequestIntro={setRequestIntroTarget} />
          </div>}
          {introsSection === 'memory' && <div role="tabpanel" id="intros-panel-memory" aria-labelledby="intros-tab-memory" className="ix-classic"><AetherisAppSurface startPage="memory" /></div>}
          {introsSection === 'introductions' && <div role="tabpanel" id="intros-panel-introductions" aria-labelledby="intros-tab-introductions">
            {mode === 'live' ? <div className="ix-classic"><InviteCard /><AetherisAppSurface startPage="intros" /></div> :
              <IntrosHubView introRequests={introRequests} networkMembers={members} onNavigate={handleNavigate}
                onReviewRequest={setReviewIntroRequest} onDismissRequest={handleDismissIntroRequest} onRequestIntro={setRequestIntroTarget} />}
          </div>}
        </section>);
}
