import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureSpecterWebsite } from './specter.server';
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('Specter capture transport', () => {
  it('only contacts the fixed reader origin and bounds its request', async () => {
    vi.stubEnv('SPECTER_BROWSER_URL',''); vi.stubEnv('SPECTER_BROWSER_TOKEN','');
    const fetcher = vi.fn().mockResolvedValue(new Response('Title: Real company\nMarkdown Content:\n# Real heading'));
    vi.stubGlobal('fetch',fetcher);
    const value = await captureSpecterWebsite('https://company.com/?id=5');
    expect(fetcher.mock.calls[0]![0]).toBe('https://r.jina.ai/https://company.com/?id=5');
    expect(value.mode).toBe('reader');
  });
  it('does not treat blocked capture as a successful scan', async () => {
    vi.stubEnv('SPECTER_BROWSER_URL',''); vi.stubEnv('SPECTER_BROWSER_TOKEN','');
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('blocked',{status:403})));
    await expect(captureSpecterWebsite('https://company.com')).rejects.toThrow('could not be captured');
  });
  it('uses the configured browser gateway without leaking credentials to target websites', async () => {
    vi.stubEnv('SPECTER_BROWSER_URL','https://worker.company.com/capture'); vi.stubEnv('SPECTER_BROWSER_TOKEN','server-only-token');
    const fetcher = vi.fn().mockResolvedValue(Response.json({url:'https://company.com/',title:'Real company',headings:[],links:[],capturedAt:new Date().toISOString()}));
    vi.stubGlobal('fetch',fetcher);
    expect((await captureSpecterWebsite('https://company.com')).mode).toBe('browser');
    expect(fetcher.mock.calls[0]![0]).toBe('https://worker.company.com/capture');
    expect(fetcher.mock.calls[0]![1].headers.authorization).toBe('Bearer server-only-token');
  });
});
