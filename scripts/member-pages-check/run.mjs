// Product-wide Architect smoke test: the look cannot stop at the homepage.
// Checks both modes across the member destinations and classic operational pages.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const port = () => new Promise(done => {
  const s = createServer().listen(0, '127.0.0.1', () => {
    const p = s.address().port;
    s.close(() => done(p));
  });
});
let child;
let base = process.env.BASE;
if (!base) {
  const p = await port();
  base = `http://127.0.0.1:${p}`;
  child = spawn('npx',['vite','dev','--port',String(p),'--host','127.0.0.1','--strictPort'],{
    cwd:root,stdio:['ignore','pipe','pipe'],detached:true,
  });
  await new Promise((ok,fail) => {
    const timer = setTimeout(() => fail(new Error('dev server startup exceeded 90s')),90000);
    const started = data => { if (/ready in|Local:/.test(String(data))) { clearTimeout(timer); ok(); } };
    child.stdout.on('data',started);child.stderr.on('data',started);
    child.once('exit',code => {clearTimeout(timer);fail(new Error('server exited '+code));});
  });
}
const stop = () => {if (child) try {process.kill(-child.pid);}catch {/* ignored */}};
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ?? resolve(root,'node_modules/playwright/index.mjs'));
const executable = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(executable)?{executablePath:executable}:{});
// Exercise every protected tool from the actual mounted showcase host. This
// checks presentation and navigation only; it does not certify live permissions.
const { mkdirSync, readFileSync } = await import('node:fs');
const toolSource = readFileSync(resolve(root, 'src/intros-ui/components/layout/WorkspaceTools.tsx'), 'utf8');
const ids = [...toolSource.matchAll(/\{ id: '([^']+)'/g)].map(match => match[1]);
let failures = 0, passes = 0;
const check = (condition, description) => { if (condition) passes++; else { failures++; console.error('FAIL '+description); } };
try {
 for (const theme of (process.env.THEMES ?? 'dark,light').split(',')) for (const width of (process.env.WIDTHS ?? '320,390,1440').split(',').map(Number)) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(theme => { localStorage.setItem('ask-intros.appearance', theme); }, theme);
  await page.goto(base+'/demo', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('.aetheris-workspace-shell', { timeout: 60000 });
  // Real shell event, also used by the assistant. No auth/session mocking.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('aetheris:navigate', { detail: 'crm' })));
  // The outer shell listens through the assistant API, so use its actual CTA
  // when a classic host is not yet mounted.
  if (!(await page.locator('.ix-workspace-tools').count())) {
    await page.locator('.specter-app-header .specter-header-cta').click();
  }
  await page.waitForSelector('.ix-workspace-tools');
  const shell = await page.locator('.ix-classic .app-shell').elementHandle();
  for (const id of ids) {
    await page.locator('.ix-workspace-tools > summary').click();
    await page.locator('[data-tool-id="'+id+'"]').click();
    await page.waitForSelector('.ix-classic .app-shell[data-member-page="'+id+'"]', { timeout: 15000 });
    const result = await page.evaluate(() => {
      const host = document.querySelector('.ix-classic .app-shell');
      const content = host.querySelector('.content');
      const frame = content.getBoundingClientRect();
      const overflow = [...content.querySelectorAll('button,input,select,textarea,h1,h2')].filter(el => {
        const r=el.getBoundingClientRect(); const s=getComputedStyle(el);
        return el.checkVisibility() && r.width>0 && r.height>0 && s.visibility!=='hidden' && (r.right>innerWidth+2 || r.left < -2);
      }).slice(0,6).map(el=>el.parentElement.className+' > '+el.className+':'+(el.textContent||'').slice(0,40));
      return { frameFits: frame.right<=innerWidth+2 && frame.left>=-2,
        font: getComputedStyle(content).fontFamily,
        action: content.querySelector('.btn.primary') ? getComputedStyle(content.querySelector('.btn.primary')).backgroundColor : null,
        active: document.querySelector('[data-tool-id][aria-current="page"]')?.getAttribute('data-tool-id'),
        collapsed: !document.querySelector('.ix-workspace-tools').open,
        overflow };
    });
    check(result.frameFits && result.overflow.length===0, theme+' '+width+' '+id+' fits: '+JSON.stringify(result.overflow));
    check(result.font.startsWith('Poppins') && result.active===id && result.collapsed, theme+' '+width+' '+id+' shared presentation and selected tool');
    check(!result.action || result.action === 'rgb(255, 138, 76)', theme+' '+width+' '+id+' uses current orange primary actions: '+result.action);
    check(await shell.evaluate(el=>el.isConnected), theme+' '+width+' '+id+' preserves mounted feature host');
    if (id === 'crm') console.log(theme+' '+width+' rendered font: '+result.font);
    if (process.env.SHOTS && ['crm','pocket','preferences','capital','workspaces'].includes(id)) {
      mkdirSync(process.env.SHOTS,{recursive:true});
      await page.screenshot({path:resolve(process.env.SHOTS,theme+'-'+width+'-'+id+'.png')});
    }
  }
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('aetheris:navigate', {detail:'crm'})));
  await page.waitForSelector('[data-tool-id="crm"][aria-current="page"]', {state:'attached'});
  check(await page.locator('.ix-workspace-tools summary strong').textContent()==='CRM', 'Internal navigation updates outer chooser');
  await page.locator('.ix-workspace-tools > summary').click();
  await page.getByRole('searchbox',{name:'Find a member tool'}).fill('zz-no-match');
  check(await page.getByRole('status').filter({hasText:'No tools match'}).isVisible(), 'Tool search has explicit empty result');
  await page.getByRole('searchbox',{name:'Find a member tool'}).press('Escape');
  check(await page.locator('.ix-workspace-tools > summary').evaluate(el=>el===document.activeElement), 'Escape returns focus to chooser');
  for (const [label, id] of [['News','news'],['Memory','memory'],['Meetings','meetings'],['Work','work']]) {
    if (width <= 760) await page.getByRole('button',{name:'Open workspace menu'}).click();
    const nav = page.locator(width <= 760 ? '.specter-mobile-menu' : '.specter-app-sidebar');
    await nav.getByRole('button',{name:label,exact:true}).click();
    await page.waitForSelector('.ix-classic [data-member-page="'+id+'"]');
    check(await page.locator('.ix-classic .content').evaluate(el=>getComputedStyle(el).fontFamily.startsWith('Poppins')), theme+' '+width+' '+id+' shared content typography');
    check(await page.locator('.aetheris-workspace-shell').count()===1, id+' keeps one navigation owner');
    if (process.env.SHOTS) await page.screenshot({path:resolve(process.env.SHOTS,theme+'-'+width+'-'+id+'.png')});
  }
  check(errors.length===0, theme+' '+width+' no runtime errors: '+errors.join('; '));
  console.log(theme+' '+width+' completed');
  await page.close();
 }
 console.log(passes+' passed; '+failures+' failed; '+ids.length+' member tools, dark/light, phone/desktop');
} finally { await browser.close(); stop(); }
if (failures) process.exit(1);
