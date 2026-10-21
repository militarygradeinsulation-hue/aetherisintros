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
  const headings = [...content.matchAll(/^#{1,3}\s+(.+)$/gm)].map(m => clean(m[1]!));
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
  const description = clean(content.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').split('\n').filter(l => l.trim().length > 70 && !/^Title:|^URL Source:|^#/.test(l)).slice(0, 3).join(' '), 1200);
  return {
    snapshot: validatePublicSnapshot({ url, title: clean(rawTitle, 300), headings: [...new Set(headings)].slice(0,100), links, capturedAt: new Date().toISOString() }),
    description, images, mode: 'reader',
  };
}
