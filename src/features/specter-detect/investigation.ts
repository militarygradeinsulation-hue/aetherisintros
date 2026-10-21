import { redactSensitiveText, validatePublicSnapshot } from './snapshot-validation';
import type { PublicPageSnapshot } from './diagnostics';

export interface Investigation {
  snapshot: PublicPageSnapshot;
  description: string;
  images: Array<{ src: string; alt: string }>;
  mode: 'browser' | 'reader';
}

/** Only public DNS names, no credentials or nonstandard ports. */
export function publicTarget(raw: string): string {
  const input = raw.trim();
  const u = new URL(/^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`);
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.port ||
      !host.includes('.') || !/^[a-z\d.-]+$/.test(host) || /^[\d.]+$/.test(host) ||
      /(?:^|\.)(?:localhost|local|internal|test|invalid|example|onion|home|lan)$/.test(host)) {
    throw new Error('Enter a public website address without credentials or a custom port.');
  }
  u.hostname = host;
  u.hash = '';
  // Preserve page selectors while removing common secret query parameters.
  for (const key of [...u.searchParams.keys()]) {
    if (/token|secret|password|auth|session|api.?key|signature/i.test(key)) u.searchParams.delete(key);
  }
  if (u.href.length > 2000) throw new Error('Website address is too long.');
  return u.href;
}

export function parseReader(markdown: string, requestedUrl: string): Investigation {
  const clean = (s: string, max = 500) => redactSensitiveText(s.replace(/\s+/g, ' ').trim()).slice(0, max);
  const rawTitle = /^Title:\s*(.+)$/m.exec(markdown)?.[1] ?? '';
  const source = /^URL Source:\s*(.+)$/m.exec(markdown)?.[1] ?? requestedUrl;
  const url = publicTarget(source);
  const content = markdown.split(/Markdown Content:\s*\n/)[1] ?? markdown;
  const headings = [...content.matchAll(/^#{1,6}\s+(.+)$/gm)].map(m => clean(m[1]!));
  // Reader also emits Setext headings.
  for (const match of content.matchAll(/^([^\n]+)\n[=-]{3,}\s*$/gm)) headings.push(clean(match[1]!));
  const links: PublicPageSnapshot['links'] = [];
  const images: Investigation['images'] = [];
  for (const m of content.matchAll(/(!?)\[([^\]]*)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    try {
      const href = publicTarget(new URL(m[3]!, url).href);
      if (m[1]) { if (images.length < 24) images.push({ src: href, alt: clean(m[2]!, 200) }); }
      else if (links.length < 100) links.push({ text: clean(m[2]!), href });
    } catch { /* A malformed or unsafe link must not discard a valid scan. */ }
  }
  const uniqueLinks = links.filter((link, i) => links.findIndex(other => other.href === link.href && other.text === link.text) === i);
  const uniqueImages = images.filter((image, i) => images.findIndex(other => other.src === image.src) === i);
  const description = clean(content.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').split('\n').filter(l => l.trim().length > 70 && !/^Title:|^URL Source:|^#/.test(l)).slice(0, 3).join(' '), 1200);
  return {
    snapshot: validatePublicSnapshot({ url, title: clean(rawTitle, 300), headings: [...new Set(headings)].slice(0,100), links: uniqueLinks, capturedAt: new Date().toISOString() }),
    description, images: uniqueImages, mode: 'reader',
  };
}

/** JSON summaries include navigation and image sources omitted from readable body copy. */
export function parseReaderResponse(body: string, requestedUrl: string): Investigation {
  if (!body.trimStart().startsWith('{')) return parseReader(body, requestedUrl);
  const payload = JSON.parse(body);
  const data = payload?.data;
  if (!data || typeof data.content !== 'string' || (data.httpStatus && data.httpStatus >= 400)) throw new Error('The website did not return usable public content.');
  const source = publicTarget(typeof data.url === 'string' ? data.url : requestedUrl);
  const result = parseReader(`Title: ${typeof data.title === 'string' ? data.title.slice(0,300).replace(/[\r\n]/g,' ') : ''}\nURL Source: ${source}\nMarkdown Content:\n${data.content}`, source);
  const pairs = (value: unknown): [string, string][] => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.entries(value).filter((pair): pair is [string,string] => typeof pair[1] === 'string').slice(0,200) : [];
  const links = pairs(data.links).flatMap(([text, href]) => {
    try { return [{ text: redactSensitiveText(text).slice(0,500), href: publicTarget(href) }]; } catch { return []; }
  });
  const images = pairs(data.images).flatMap(([alt, src]) => {
    try { return [{ alt: redactSensitiveText(alt).slice(0,200), src: publicTarget(src) }]; } catch { return []; }
  });
  result.snapshot.links = [...links, ...result.snapshot.links].filter((link, i, all) => all.findIndex(other => other.href === link.href) === i).slice(0,100);
  result.images = [...images, ...result.images].filter((image, i, all) => all.findIndex(other => other.src === image.src) === i).slice(0,24);
  if (typeof data.description === 'string' && data.description.trim()) result.description = redactSensitiveText(data.description).slice(0,1200);
  return result;
}
