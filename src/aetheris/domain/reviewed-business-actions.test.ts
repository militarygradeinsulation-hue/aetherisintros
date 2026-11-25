import { describe, expect, it } from 'vitest';
import { approvedActionId, approvedReportActionSchema, parseGoldenReport, reportActionPreview, briefTaskPreview } from './reviewed-business-actions';
const owner='11111111-1111-4111-8111-111111111111';
const report={reportReference:'GR-1',company:'Test company',findings:[{id:'finding-1',title:'Quote follow-through',evidence:'Three open quotes have no next step',proposedAction:'Review open quotes',metric:'Follow-up completion'}]};
describe('reviewed Golden Report actions',()=>{
  it('requires bounded evidence, action and metric and rejects duplicate finding IDs',()=>{
    expect(parseGoldenReport(JSON.stringify(report))).toEqual(report);
    expect(()=>parseGoldenReport(JSON.stringify({...report,findings:[...report.findings,...report.findings]}))).toThrow('unique ID');
    expect(()=>parseGoldenReport(JSON.stringify({...report,findings:[{...report.findings[0],evidence:''}]}))).toThrow();
    expect(()=>parseGoldenReport('not JSON')).toThrow();
  });
  it('never fills missing financial baselines or targets',()=>{
    const preview=reportActionPreview({reportReference:report.reportReference,company:report.company,finding:report.findings[0]!,kind:'opportunity',assignee:''});
    expect(preview.detail).toContain('Baseline: Not supplied');
    expect(preview.detail).toContain('Target: Not supplied');
    expect(preview.detail).toContain('No financial result is claimed');
  });
  it('requires explicit approval and derives separate stable record IDs by owner and action',async()=>{
    const input={owner,approved:true,reportReference:'GR-1',company:'Test',finding:report.findings[0],kind:'task',companyId:null,assignee:''};
    expect(approvedReportActionSchema.safeParse(input).success).toBe(true);
    expect(approvedReportActionSchema.safeParse({...input,approved:false}).success).toBe(false);
    const id=await approvedActionId(owner,'golden-report','GR-1:1','task');
    expect(id).toBe(await approvedActionId(owner,'golden-report','GR-1:1','task'));
    expect(id).not.toBe(await approvedActionId(owner,'golden-report','GR-1:1','opportunity'));
    expect(id).not.toBe(await approvedActionId('22222222-2222-4222-8222-222222222222','golden-report','GR-1:1','task'));
  });
  it('does not turn an introduction consent request into an automatically approved action',()=>{
    const base={id:'i',recordId:owner,title:'Review introduction',reason:'Consent required',destination:'intros' as const,urgency:'next' as const,missingEvidence:['Consent']};
    expect(briefTaskPreview({...base,source:'Introduction'})).toBeNull();
    expect(briefTaskPreview({...base,source:'CRM opportunity',destination:'pipeline'})?.detail).toContain('does not send a message');
  });
});
