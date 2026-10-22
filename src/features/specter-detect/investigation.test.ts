import { describe, expect, it } from 'vitest';
import { parseReader, parseReaderResponse, publicTarget } from './investigation';

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

describe('complete reader summaries', () => {
  it('fills navigation and images outside the main article body', () => {
    const result = parseReaderResponse(JSON.stringify({data:{title:'Hallmark Homes',url:'https://hallmarkhomes.com/',content:'# Our homes',description:'Custom home builder in Indiana',links:{Contact:'https://hallmarkhomes.com/contact-us/',Guide:'https://hallmarkhomes.com/guide.pdf'},images:{House:'https://hallmarkhomes.com/house.jpg'},screenshotUrl:'https://storage.googleapis.com/reader-6b7dc.appspot.com/screenshots/test?X-Amz-Signature=temporary'}}), 'https://hallmarkhomes.com');
    expect(result.snapshot.links).toHaveLength(2);
    expect(result.description).toBe('Custom home builder in Indiana');
    expect(result.images[0]?.src).toBe('https://hallmarkhomes.com/house.jpg');
    expect(result.previewUrl).toContain('X-Amz-Signature=temporary');
  });
  it('rejects an upstream error page even if the transport status was 200', () => {
    expect(() => parseReaderResponse(JSON.stringify({data:{httpStatus:403,content:'Access denied'}}),'https://company.com')).toThrow();
  });
});
