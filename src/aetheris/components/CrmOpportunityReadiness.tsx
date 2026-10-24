import { useState } from 'react';
import './crm-opportunity-readiness.css';
import { useOps } from '../crm/store';
import { assessAuthorizedOpportunity, type AuthorizedOpportunityEvidence } from '../domain/opportunity-adapter';
import { OpportunityReadinessPanel } from './OpportunityReadinessPanel';

const fields = [
  ['profileFit', 'Profile fit'], ['statedNeedStrength', 'Stated need'], ['verifiedTiming', 'Verified timing'],
  ['evidenceConfidence', 'Evidence confidence'], ['recordedEngagement', 'Recorded engagement'],
] as const;

/** Read only the current account's canonical CRM. Assessments are ephemeral and never trigger outreach. */
export function CrmOpportunityReadiness({ opportunityId }: { opportunityId: string }) {
  const ops = useOps();
  const opportunity = ops.opportunities.find(item => item.id === opportunityId && !item.archived);
  const person = ops.people.find(item => item.id === opportunity?.personId && !item.archived);
  const activities = ops.activities.filter(item => item.opportunityId === opportunityId);
  const [consent, setConsent] = useState(false);
  const [ratings, setRatings] = useState<Record<string, string>>({});
  if (!ops.ready || !ops.signedIn || !opportunity) return null;
  const evidence: AuthorizedOpportunityEvidence = { matchingConsentGranted: consent };
  for (const [key] of fields) evidence[key] = ratings[key]?.trim() ? Number(ratings[key]) : null;
  const result = assessAuthorizedOpportunity(evidence);
  return <section className="ops-panel" aria-label="Review opportunity evidence">
    <h2>Opportunity intelligence</h2>
    <p className="ops-note">Review your private CRM evidence before assessing readiness. Ratings are your judgement, not a predicted sale or an automatically verified fact. They stay in this view and are cleared when you leave the record.</p>
    <dl className="ops-readiness-evidence">
      <dt>Linked contact</dt><dd>{person ? `${person.fullName} · ${person.title || 'Role not recorded'} · ${person.companyName || 'Company not recorded'}` : 'No accessible linked contact'}</dd>
      <dt>Recorded need/context</dt><dd>{opportunity.detail || 'Not recorded'}</dd>
      <dt>Expected close</dt><dd>{opportunity.expectedClose || 'Not recorded'} · an owner-entered forecast, not verified timing</dd>
      <dt>Source</dt><dd>{opportunity.source || 'Not recorded'}</dd>
      <dt>Recorded activity</dt><dd>{activities.length ? activities.slice(0, 5).map(item => `${item.kind}: ${item.subject}`).join(' · ') : 'No activity linked to this opportunity'}</dd>
      <dt>Next action</dt><dd>{opportunity.nextAction || 'Not recorded'}</dd>
    </dl>
    <label><input type="checkbox" checked={consent} onChange={event => { setConsent(event.target.checked); if (!event.target.checked) setRatings({}); }}/> I have permission to use this evidence and matching consent for this assessment.</label>
    {consent && <fieldset className="ops-readiness-ratings"><legend>Assess the recorded evidence (0–100); leave unknown signals blank</legend>{fields.map(([key, label]) => <label key={key}>{label}<input type="number" min="0" max="100" step="1" value={ratings[key] ?? ''} placeholder="Unknown" onChange={event => setRatings(previous => ({ ...previous, [key]: event.target.value }))}/></label>)}</fieldset>}
    <OpportunityReadinessPanel result={result}/>
  </section>;
}
