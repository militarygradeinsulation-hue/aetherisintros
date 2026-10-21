import { describe, expect, it } from 'vitest';
import { parseReader, publicTarget } from './investigation';

describe('public website targets', () => {
  it('normalizes bare domains and preserves page identity without secret parameters', () => {
    expect(publicTarget('company.com/company?id=123&token=private#top')).toBe('https://company.com/company?id=123');
  });
  it.each(['http://127.0.0.1', 'http://2130706433', 'http://[::1]', 'http://localhost', 'http://a.local', 'http://a.internal', 'http://a.com:8080', 'https://user:pass@a.com', 'file:///etc/passwd', 'javascript:alert(1)'])('rejects %s', value => {
    expect(() => publicTarget(value)).toThrow();
  });
});
describe('real reader evidence', () => {
  it('extracts actual page content without substituting sample company data', () => {
    const result = parseReader('Title: Actual Co\nURL Source: https://actual.com/company?id=3\nMarkdown Content:\n# Actual services\nA business description with enough words to describe what this specific company actually provides to its customers.\n[Contact](https://actual.com/contact)\n![Office](https://actual.com/office.png)', 'https://actual.com');
    expect(result.snapshot.title).toBe('Actual Co');
    expect(result.snapshot.url).toBe('https://actual.com/company?id=3');
    expect(result.snapshot.headings).toEqual(['Actual services']);
    expect(result.snapshot.links).toEqual([{ text: 'Contact', href: 'https://actual.com/contact' }]);
    expect(result.images).toHaveLength(1);
    expect(result.mode).toBe('reader');
  });
  it('isolates malformed links and redacts sensitive captured text', () => {
    const result = parseReader('Title: sk_live_abc123\nMarkdown Content:\n# Write a@b.com\n[Broken](http://[)\n[Contact](https://real.com/contact)', 'https://real.com');
    expect(result.snapshot.title).toBe('[token redacted]');
    expect(result.snapshot.headings).toEqual(['Write [email redacted]']);
    expect(result.snapshot.links).toHaveLength(1);
  });
  it('never borrows evidence from the previous company', () => {
    const a = parseReader('Title: Alpha\nMarkdown Content:\n# Alpha heading', 'https://alpha.com');
    const b = parseReader('Title: Beta\nMarkdown Content:\n# Beta heading', 'https://beta.com');
    const history = [a,b];
    expect(history[0]!.snapshot).toMatchObject({url:'https://alpha.com/',title:'Alpha',headings:['Alpha heading']});
    expect(history[1]!.snapshot).toMatchObject({url:'https://beta.com/',title:'Beta',headings:['Beta heading']});
  });
});
