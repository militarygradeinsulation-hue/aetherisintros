import { parseReaderResponse, publicTarget, type Investigation } from '@/features/specter-detect/investigation';
import { validatePublicSnapshot } from '@/features/specter-detect/snapshot-validation';

/** A fixed external reader origin avoids fetching member-controlled hosts from our network. */
export async function captureSpecterWebsite(target: string): Promise<Investigation> {
  const url = publicTarget(target);
  const endpoint = process.env['SPECTER_BROWSER_URL'];
  const secret = process.env['SPECTER_BROWSER_TOKEN'];
  if (endpoint && secret && new URL(endpoint).protocol !== 'https:') throw new Error('Browser gateway requires HTTPS.');
  let response = endpoint && secret
    ? await fetch(endpoint, {
        method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(25_000),
        headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      })
    : await fetch(`https://r.jina.ai/${url}`, {
        redirect: 'manual', signal: AbortSignal.timeout(25_000), headers: { accept: 'application/json', 'x-with-links-summary': 'true', 'x-with-images-summary': 'true', 'x-respond-with': 'markdown', ...(process.env['JINA_API_KEY'] ? { authorization: 'Bearer '+process.env['JINA_API_KEY'] } : {}) },
      });
  // Retry only a short provider cooldown once; never hammer a denied target page.
  if (response.status === 429) {
    const retry = response.headers.get('retry-after');
    const seconds = retry ? (/^\d+$/.test(retry) ? Number(retry) : Math.ceil((Date.parse(retry)-Date.now())/1000)) : 2;
    await response.body?.cancel().catch(() => {});
    if (Number.isFinite(seconds) && seconds >= 0 && seconds <= 2) {
      await new Promise(resolve=>setTimeout(resolve,Math.max(250,seconds*1000)));
      response = endpoint && secret
        ? await fetch(endpoint,{method:'POST',redirect:'manual',signal:AbortSignal.timeout(25_000),headers:{authorization:'Bearer '+secret,'content-type':'application/json'},body:JSON.stringify({url})})
        : await fetch('https://r.jina.ai/'+url,{redirect:'manual',signal:AbortSignal.timeout(25_000),headers:{accept:'application/json','x-respond-with':'markdown',...(process.env['JINA_API_KEY']?{authorization:'Bearer '+process.env['JINA_API_KEY']}:{})}});
    } else {
      throw new Error('The website capture provider reached its rate limit. Retry in '+(Number.isFinite(seconds)?Math.max(1,Math.min(seconds,3600)):60)+' seconds. You can still open the original website.');
    }
  }
  // Workers rejects redirect: 'error' before sending the request. Manual mode
  // preserves the same no-follow policy, including for authenticated gateways.
  if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
    await response.body?.cancel().catch(() => {});
    throw new Error('Website capture returned an unexpected redirect. Try again shortly or open the original website.');
  }
  if (!response.ok) { await response.body?.cancel().catch(() => {}); throw new Error(response.status === 429 ? 'The website capture provider is rate limited. Retry in 60 seconds. You can still open the original website.' : 'This website could not be captured. Try another public page or open the original website.'); }
  // Bound the response while streaming; do not buffer an unbounded third-party response.
  const reader = response.body?.getReader();
  if (!reader) throw new Error('The website returned no readable content.');
  const decoder = new TextDecoder();
  let body = '', bytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 512_000) throw new Error('Website capture exceeded the content limit.');
      body += decoder.decode(part.value, { stream: true });
    }
    body += decoder.decode();
  } finally { await reader.cancel().catch(() => {}); }
  if (endpoint && secret) {
    const value = JSON.parse(body);
    const snapshot = validatePublicSnapshot(value.snapshot ?? value);
    snapshot.url = publicTarget(snapshot.url);
    snapshot.links = snapshot.links.flatMap(link => {
      try { return [{ text: link.text, href: publicTarget(link.href) }]; } catch { return []; }
    });
    return { snapshot, description: '', images: [], mode: 'browser' };
  }
  const result = parseReaderResponse(body, url);
  if (!result.snapshot.title && !result.snapshot.headings.length && !result.description) throw new Error('No public website evidence was returned.');
  if (/^Warning:.*(?:403|blocked|captcha|429)/im.test(body)) throw new Error('The website blocked capture. Open the original website to review it.');
  return result;
}
