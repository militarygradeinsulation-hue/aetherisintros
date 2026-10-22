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
    expect(fetcher.mock.calls[0]![1].redirect).toBe('manual');
    expect(value.mode).toBe('reader');
  });
  it('does not treat blocked capture as a successful scan', async () => {
    vi.stubEnv('SPECTER_BROWSER_URL',''); vi.stubEnv('SPECTER_BROWSER_TOKEN','');
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('blocked',{status:403})));
    await expect(captureSpecterWebsite('https://company.com')).rejects.toThrow('could not be captured');
  });
  it('uses the configured browser gateway without leaking credentials to target websites', async () => {
    vi.stubEnv('SPECTER_BROWSER_URL','https://worker.company.com/capture'); vi.stubEnv('SPECTER_BROWSER_TOKEN','server-only-token');
    const fetcher = vi.fn().mockResolvedValue(Response.json({url:'https://company.com/?id=3&session=private',title:'Real company',headings:[],links:[],capturedAt:new Date().toISOString()}));
    vi.stubGlobal('fetch',fetcher);
    const captured = await captureSpecterWebsite('https://company.com');
    expect(captured.mode).toBe('browser');
    expect(captured.snapshot.url).toBe('https://company.com/?id=3');
    expect(fetcher.mock.calls[0]![0]).toBe('https://worker.company.com/capture');
    expect(fetcher.mock.calls[0]![1].headers.authorization).toBe('Bearer server-only-token');
    expect(fetcher.mock.calls[0]![1].redirect).toBe('manual');
  });
  it.each(['reader', 'gateway'])('captures through %s on edge runtimes that reject error redirect mode', async transport => {
    vi.stubEnv('SPECTER_BROWSER_URL', transport === 'gateway' ? 'https://worker.company.com/capture' : '');
    vi.stubEnv('SPECTER_BROWSER_TOKEN', transport === 'gateway' ? 'server-only-token' : '');
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      if (init.redirect === 'error') throw new TypeError('Invalid redirect value, must be one of "follow" or "manual"');
      return transport === 'gateway'
        ? Response.json({ url: 'https://company.com/', title: 'Real company', headings: [], links: [], capturedAt: new Date().toISOString() })
        : new Response('Title: Real company\nMarkdown Content:\n# Real heading');
    }));
    const result = await captureSpecterWebsite('https://company.com');
    expect(result.snapshot.title).toBe('Real company');
  });
  describe.each(['reader', 'gateway'])('%s redirect policy', transport => {
    it.each([300, 301, 302, 303, 304, 307, 308, 399])('rejects HTTP %i without requesting the destination', async status => {
      vi.stubEnv('SPECTER_BROWSER_URL', transport === 'gateway' ? 'https://worker.company.com/capture' : '');
      vi.stubEnv('SPECTER_BROWSER_TOKEN', transport === 'gateway' ? 'server-only-token' : '');
      const response = new Response(null, { status, headers: { location: 'https://untrusted.example/capture' } });
      const fetcher = vi.fn().mockResolvedValue(response);
      vi.stubGlobal('fetch', fetcher);
      await expect(captureSpecterWebsite('https://company.com')).rejects.toThrow('unexpected redirect');
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher.mock.calls[0]![1].redirect).toBe('manual');
    });
    it('cancels an unread redirect body', async () => {
      vi.stubEnv('SPECTER_BROWSER_URL', transport === 'gateway' ? 'https://worker.company.com/capture' : '');
      vi.stubEnv('SPECTER_BROWSER_TOKEN', transport === 'gateway' ? 'server-only-token' : '');
      const cancel = vi.fn();
      const response = new Response(new ReadableStream({ cancel }), { status: 302 });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
      await expect(captureSpecterWebsite('https://company.com')).rejects.toThrow('unexpected redirect');
      expect(cancel).toHaveBeenCalledTimes(1);
    });
  });
});
