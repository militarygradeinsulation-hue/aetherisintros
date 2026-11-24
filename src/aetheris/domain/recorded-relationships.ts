/** Source events represent member reports, not independently verified revenue.
 * Group once per introduction; never multiply a value band by duplicate events.
 */
export interface ReportedOutcome { intro_request_id: string; stage: string; attribution: string; outcome_category: string | null; created_at: string }
export function summarizeRecordedRelationships(rows: readonly ReportedOutcome[]) {
  const byIntro = new Map<string,ReportedOutcome>();
  for (const row of rows) {
    if (!row.intro_request_id || row.stage !== 'outcome' || !['direct','influenced','contextual'].includes(row.attribution) || !Number.isFinite(Date.parse(row.created_at))) continue;
    const prior=byIntro.get(row.intro_request_id);
    if (!prior || Date.parse(row.created_at)>Date.parse(prior.created_at)) byIntro.set(row.intro_request_id,row);
  }
  const count=(attribution:string)=>[...byIntro.values()].filter(x=>x.attribution===attribution).length;
  return { recordedOutcomes:byIntro.size,direct:count('direct'),influenced:count('influenced'),contextual:count('contextual') };
}
