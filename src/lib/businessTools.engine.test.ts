import { describe, it, expect, vi, afterEach } from 'vitest';
import { collectToolEvidence, evidenceReport, generationPrompt } from './businessTools.engine';
import { generateBusinessImage } from './businessTools.images.server';
import { BUSINESS_TOOLS } from '@/features/business-tools/catalog';
const capture = vi.fn(async (url: string) => ({snapshot:{url,title:'Real page',headings:['Services'],links:[{text:'Contact us',href:url+'contact'}],capturedAt:'2026-10-25T00:00:00Z'},description:'Captured description',images:[],mode:'reader' as const}));
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();capture.mockClear();});
describe('Business Tools execution',()=>{
 it('captures both competitor sources and retains attribution',async()=>{const e=await collectToolEvidence('head-to-head',{'Your URL':'https://company.com','Competitor URL':'https://competitor.com'},capture);expect(capture).toHaveBeenCalledTimes(2);expect(e.map(p=>p.field)).toEqual(['Your URL','Competitor URL']);expect(evidenceReport(e)).toContain('https://competitor.com/');expect(evidenceReport(e)).toContain('were not measured');});
 it('validates all targets before capture and rejects private targets',async()=>{await expect(collectToolEvidence('head-to-head',{'Your URL':'https://company.com','Competitor URL':'http://127.0.0.1'},capture)).rejects.toThrow();expect(capture).not.toHaveBeenCalled();});
 it('does not pretend a failed capture succeeded',async()=>{await expect(collectToolEvidence('website-scanner',{'Website URL':'https://company.com'},async()=>{throw Error('Blocked');})).rejects.toThrow('Blocked');});
 it('does not fetch for writing tools',async()=>{expect(await collectToolEvidence('sales-scripts',{},capture)).toEqual([]);expect(capture).not.toHaveBeenCalled();});
 it('requests complete deliverables for every catalog entry',()=>{expect(BUSINESS_TOOLS).toHaveLength(24);for(const tool of BUSINESS_TOOLS)expect(generationPrompt(tool,false).length).toBeGreaterThan(100);});
 it('does not call an image provider without credentials',async()=>{vi.stubEnv('OPENAI_API_KEY','');const f=vi.fn();vi.stubGlobal('fetch',f);await expect(generateBusinessImage('test')).rejects.toThrow('not connected');expect(f).not.toHaveBeenCalled();});
 it('returns generated PNG data and uses the configured provider securely',async()=>{vi.stubEnv('OPENAI_API_KEY','test-key');const f=vi.fn(async(_url:string,_init?:RequestInit)=>new Response(JSON.stringify({data:[{b64_json:'iVBORw0KGgoAAA=='}]})));vi.stubGlobal('fetch',f);expect(await generateBusinessImage('Business illustration')).toBe('data:image/png;base64,iVBORw0KGgoAAA==');expect(f.mock.calls[0]?.[0]).toBe('https://api.openai.com/v1/images/generations');});
 it('rejects provider errors and invalid image data',async()=>{vi.stubEnv('OPENAI_API_KEY','test-key');vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:429})));await expect(generateBusinessImage('test')).rejects.toThrow('account limit');vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({data:[{b64_json:'<script>'}]}))));await expect(generateBusinessImage('test')).rejects.toThrow('invalid PNG');});
});
