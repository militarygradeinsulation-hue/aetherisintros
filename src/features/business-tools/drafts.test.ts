import { describe,it,expect } from 'vitest';
import { BUSINESS_TOOLS } from './catalog';
import { createWorkingDraft,validateToolInput,toolSystemPrompt } from './drafts';
describe('Ask Intros business tools',()=>{
 it('adapts all 24 tools with useful, non-random output',()=>{expect(BUSINESS_TOOLS).toHaveLength(24);for(const tool of BUSINESS_TOOLS){const input=Object.fromEntries(tool.fields.map(field=>[field,`${field} example`]));const values=validateToolInput(tool.id,input);const a=createWorkingDraft(tool,values);expect(a).toEqual(createWorkingDraft(tool,values));expect(a).toContain('ASK INTROS');expect(a).not.toMatch(/Est\. leak|Severity:|Aetheris AI Studio/);expect(a.length).toBeGreaterThan(250);expect(toolSystemPrompt(tool)).toContain('Do not claim to browse');}});
 it('rejects invalid tools, missing values and oversized fields',()=>{expect(()=>validateToolInput('unknown',{})).toThrow();expect(()=>validateToolInput('sales-scripts',{})).toThrow('offer');expect(()=>validateToolInput('sales-scripts',{'Offer':'x'.repeat(16001),'Target buyer':'Owner'})).toThrow('16,000');});
 it('creates an actual contextual sales script',()=>{const tool=BUSINESS_TOOLS.find(t=>t.id==='sales-scripts')!;const result=createWorkingDraft(tool,{'Offer':'CRM cleanup','Target buyer':'local founders'});expect(result).toContain('I work with local founders on CRM cleanup');});
 it('does not manufacture audit findings from a URL',()=>{const tool=BUSINESS_TOOLS.find(t=>t.id==='website-scanner')!;const result=createWorkingDraft(tool,{'Website URL':'https://example.com'});expect(result.match(/Status: Not verified/g)).toHaveLength(tool.sections.length);expect(result).not.toMatch(/\$\d|HIGH|MEDIUM/);});
 it('creates thirty calendar entries',()=>{const tool=BUSINESS_TOOLS.find(t=>t.id==='content-calendar')!;expect(createWorkingDraft(tool,{'Business':'Ask Intros','Theme':'Connections'}).match(/Day \d+ \|/g)).toHaveLength(30);});
});
