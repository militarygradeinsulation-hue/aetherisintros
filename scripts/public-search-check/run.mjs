import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const port = await new Promise(done => {
  const listener = createServer().listen(0, '127.0.0.1', () => { const p = listener.address().port; listener.close(() => done(p)); });
});
const server = spawn('npx', ['vite', 'dev', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'], detached: true });
const base = `http://127.0.0.1:${port}`;
const origin = 'https://askintros.vip';
const pages = [
  ['/', 'Ask Intros | Business Networking and Warm Introductions'],
  ['/how-it-works', 'How Ask Intros Works | Business Networking with Context'],
  ['/warm-introductions', 'Warm Introductions with Mutual Consent | Ask Intros'],
  ['/active-memory', 'Active Memory for Business Relationships | Ask Intros'],
];
const read = async path => {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path + ' responds successfully');
  return response.text();
};
const canonical = html => [...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/g)].map(m => m[1]);
let browser;
try {
  await new Promise((done, fail) => {
    const timeout = setTimeout(() => fail(Error('Public preview startup timed out')), 90000);
    const ready = bytes => { if (/ready in|Local:/.test(String(bytes))) { clearTimeout(timeout); done(); } };
    server.stdout.on('data', ready); server.stderr.on('data', ready);
    server.once('exit', code => { clearTimeout(timeout); fail(Error('Preview exited ' + code)); });
  });
  const titles = new Set();
  for (const [path, title] of pages) {
    // Raw HTTP deliberately does not execute JavaScript: this is the crawler's first response.
    const html = await read(path);
    assert(html.includes(`<title>${title}</title>`), path + ' has the expected unique title');
    titles.add(title);
    assert.deepEqual(canonical(html), [origin + path]);
    assert.match(html, /<meta name="robots" content="index,follow,max-image-preview:large"/);
    const scripts = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 1, path + ' has one valid identity graph');
    const graph = JSON.parse(scripts[0][1])['@graph'];
    assert(graph.some(node => node['@type'] === 'Organization' && node.name === 'Ask Intros'));
    assert(graph.some(node => node['@type'] === 'WebPage' && node.url === origin + path));
    assert(!JSON.stringify(graph).includes('aggregateRating'), 'No invented review data');
    if (path !== '/') {
      assert.equal([...html.matchAll(/<h1\b/g)].length, 1, 'One readable main heading');
      assert(html.includes('Common questions') &&  /<details\b/.test(html), 'Answers appear in the initial HTML');
      assert(html.includes('Explore the demo'), 'Product navigation is present');
    } else {
      for (const [guide] of pages.slice(1)) assert(html.includes(`href="${guide}"`), 'Homepage links to ' + guide);
      assert(html.includes('google-site-verification'), 'Existing verification is preserved');
    }
    console.log('PASS raw HTML metadata, content and identity: ' + path);
  }
  assert.equal(titles.size, pages.length);
  for (const path of ['/auth', '/demo']) assert.match(await read(path), /<meta name="robots" content="noindex,follow"/, path + ' excludes utility content from results');
  const sitemap = await read('/sitemap.xml');
  for (const [path] of pages) assert(sitemap.includes(`<loc>${origin + path}</loc>`), 'Sitemap includes ' + path);
  for (const path of ['/auth', '/demo', '/app']) assert(!sitemap.includes(`<loc>${origin + path}</loc>`), 'Sitemap excludes ' + path);
  assert.match(await read('/founder-story'), /<title>Why Joseph Toney Built Ask Intros \| Founder Story<\/title>/);
  assert.match(await read('/early-access'), /<title>Ask Intros Membership \| Basic and Executive Access<\/title>/);
  console.log('PASS discovery links, sitemap and utility noindex');

  if (process.env.PUBLIC_SEARCH_BROWSER === '1') {
    const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || resolve('node_modules/playwright/index.mjs'));
    browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
    const errors = [];
    for (const width of [390, 1280]) for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
      await context.addInitScript(theme => { localStorage.setItem('ask-intros.appearance', theme); }, theme);
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      for (const [path] of pages.slice(1)) {
        await page.goto(base + path, { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading', { level: 1 }).waitFor();
        await page.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
        assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), path + ' fits ' + width);
        const question = page.locator('.public-product-questions details').first();
        await question.locator('summary').click();
        assert(await question.locator('p').isVisible(), 'Question opens normally');
        assert(await page.getByRole('link', { name: 'Membership options', exact: true }).isVisible());
      }
      console.log('PASS guide browser layout and controls: ' + width + ' ' + theme);
      await context.close();
    }
    assert.deepEqual(errors, []);
  }
} finally {
  await browser?.close();
  try { process.kill(-server.pid); } catch { /* exited */ }
}
