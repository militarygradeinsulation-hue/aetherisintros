// Isolated browser regression for real insight rendering and failure states.
// All identities are synthetic; no network accounts, sends or production writes.
import { build } from 'esbuild'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const out = mkdtempSync(join(tmpdir(), 'member-readiness-'))
const virtual = {
  network: `import { useSyncExternalStore } from 'react';
    const listeners=new Set();
    const full={synced:true,feedError:false,networkLoadError:'',members:[{id:'one',company:'Example',introState:'requested'},{id:'two',company:'example',introState:'accepted'}],connections:['one'],saved:['two'],threads:[{unread:true}],posts:[{visibility:'network'}],asks:[],activity:[]};
    let state=full;
    export const change=kind=>{state=kind==='loading'?{...full,synced:false}:kind==='error'?{...full,feedError:true}:kind==='empty'?{...full,members:[],connections:[],saved:[],threads:[],posts:[]}:full;listeners.forEach(fn=>fn())};
    export const useNetwork=()=>useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>state);`,
  pro: `export const usePro=()=>({mode:'local'});`,
  track: `export const CurrentUserTrackRecord=()=>null; export const TrackRecordDashboard=()=>null;`,
  analyst: `export default ()=>null;`,
  auth: `export const supabase={auth:{getUser:()=>Promise.reject(new Error('Synthetic transport failure'))}};`,
}
await build({
  stdin: { contents: `import React,{useState} from 'react';import{createRoot}from'react-dom/client';
    import{change}from'fixture:network';
    import{LiveInsightsDashboard}from'./src/intros-ui/views/LiveInsightsDashboard';
    import{ProfessionalDraftBoundary}from'./src/aetheris/ProfessionalDraftBoundary';
    import{MemberIntelligenceView}from'./src/intros-ui/views/MemberIntelligenceView';
    function App(){const[target,setTarget]=useState('');const[session,setSession]=useState(false);return <main className="ix-root">
      <nav aria-label="Fixture controls">{['full','empty','loading','error'].map(s=><button key={s} onClick={()=>change(s)}>{s}</button>)}<button onClick={()=>setSession(true)}>Test unavailable session</button></nav>
      <output aria-label="Navigation result">{target}</output><LiveInsightsDashboard onNavigate={setTarget}/>
      <ProfessionalDraftBoundary page="capital" onNavigate={setTarget}><button>Legacy simulated approval</button></ProfessionalDraftBoundary>
      {session&&<MemberIntelligenceView live onNavigate={setTarget}/>}</main>};createRoot(document.getElementById('root')).render(<App/>);`, resolveDir: root, loader: 'tsx' },
  bundle: true, format: 'esm', outfile: join(out, 'entry.js'), jsx: 'automatic', logLevel: 'error',
  plugins: [{ name: 'synthetic-readiness-contexts', setup(b) {
    b.onResolve({ filter: /^fixture:/ }, a => ({ path: a.path.slice(8), namespace: 'fixture' }))
    b.onResolve({ filter: /^@\/aetheris\/store$/ }, () => ({ path: 'network', namespace: 'fixture' }))
    b.onResolve({ filter: /pro-store$/ }, () => ({ path: 'pro', namespace: 'fixture' }))
    b.onResolve({ filter: /CurrentUserTrackRecord$|TrackRecordDashboard$/ }, () => ({ path: 'track', namespace: 'fixture' }))
    b.onResolve({ filter: /BusinessAnalystPanel$/ }, () => ({ path: 'analyst', namespace: 'fixture' }))
    b.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({ path: 'auth', namespace: 'fixture' }))
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, a => ({ contents: virtual[a.path], loader: 'js', resolveDir: root }))
  } }], define: { 'process.env.NODE_ENV': '"production"' },
})
writeFileSync(join(out, 'index.html'), '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="entry.css"><style>body{margin:0;padding:12px;font-family:system-ui;background:#0c1119;color:#f3f1ed}button{font:inherit}nav[aria-label="Fixture controls"]{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}main{max-width:1200px;margin:auto}</style><div id="root"></div><script type="module" src="entry.js"></script>')
const server = createServer((req, res) => {
  const file = req.url === '/entry.js' ? 'entry.js' : req.url === '/entry.css' ? 'entry.css' : 'index.html'
  res.setHeader('content-type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html')
  res.end(readFileSync(join(out, file)))
}).listen(0, '127.0.0.1')
await new Promise(done => server.once('listening', done))
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? resolve(root, 'node_modules/playwright/index.mjs'))
const browser = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), headless: true })
let checks = 0
const assert = (condition, description) => { if (!condition) throw new Error(description); checks++; console.log('✓', description) }
try {
  for (const width of [320, 390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`http://127.0.0.1:${server.address().port}`)
    await page.getByRole('heading', { name: 'Network insights' }).waitFor()
    assert(await page.getByRole('button', { name: /2 Directory members/ }).isVisible(), `${width}: real network member count`)
    await page.getByRole('button', { name: /1 Unread conversations/ }).click()
    assert(await page.getByLabel('Navigation result').textContent() === 'messages', `${width}: insights opens real message destination`)
    const body = await page.textContent('body')
    assert(!/1\.2K|Sarah Chen|312 companies|live telemetry|92%/.test(body), `${width}: no sample analytics presented as live`)
    await page.getByText('Review preserved planner records (read only)', { exact: true }).click()
    assert(await page.getByRole('button', { name: 'Legacy simulated approval' }).isDisabled(), `${width}: private drafts cannot simulate another member's approval`)
    await page.getByRole('button', { name: 'Private deal workspaces', exact: true }).click()
    assert(await page.getByLabel('Navigation result').textContent() === 'workspaces', `${width}: connected-workflow alternative navigates correctly`)
    await page.getByRole('button', { name: 'loading', exact: true }).click()
    await page.getByText('Loading your network insights…').waitFor()
    assert(await page.locator('[aria-label="Confirmed account counts"]').count() === 0, `${width}: loading withholds counts`)
    await page.getByRole('button', { name: 'error', exact: true }).click()
    await page.getByRole('button', { name: 'Retry loading', exact: true }).waitFor()
    assert(await page.locator('[aria-label="Confirmed account counts"]').count() === 0, `${width}: failure withholds counts`)
    await page.getByRole('button', { name: 'empty', exact: true }).click()
    assert(await page.getByRole('button', { name: /0 Directory members/ }).isVisible(), `${width}: confirmed empty network is represented honestly`)
    await page.getByRole('button', { name: 'Test unavailable session', exact: true }).click()
    await page.getByRole('button', { name: 'Retry member intelligence' }).waitFor()
    assert((await page.textContent('body')).includes('Your session could not be verified'), `${width}: rejected auth read ends loading with a retry`)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), `${width}: no horizontal overflow`)
    assert(errors.length === 0, `${width}: no browser errors: ${errors.join(', ')}`)
    await page.screenshot({ path: join(out, `readiness-${width}.png`), fullPage: true })
    await page.close()
  }
  console.log(`${checks} isolated browser assertions passed. Screenshots: ${out}`)
} finally { await browser.close(); server.close() }
