// Smoke test for actual /demo Read Aloud buttons. Browser speech is mocked so
// no device speakers, private voices, credentials or real network TTS are used.
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const port = await new Promise(done => {
  const server = createServer().listen(0, '127.0.0.1', () => {
    const n = server.address().port
    server.close(() => done(n))
  })
})
const child = spawn('npx', ['vite', 'dev', '--port', String(port), '--host', '127.0.0.1', '--strictPort'], {
  cwd: root, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
})
const stop = () => { try { process.kill(-child.pid) } catch { /* already exited */ } }
let browser
try {
  await new Promise((done, fail) => {
    const timeout = setTimeout(() => fail(new Error('Vite startup timed out')), 90000)
    const ready = chunk => {
      if (/ready in|Local:/.test(String(chunk))) { clearTimeout(timeout); done() }
    }
    child.stdout.on('data', ready)
    child.stderr.on('data', ready)
    child.once('exit', code => { clearTimeout(timeout); fail(new Error('Vite exited ' + code)) })
  })
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? resolve(root, 'node_modules/playwright/index.mjs'))
  browser = await chromium.launch()
  for (const scenario of [
    { name: 'iPhone retains managed ElevenLabs voice', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1', voice: 'intros-managed', width: 390 },
    { name: 'desktop device voice', userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/127.0.0.0 Safari/537.36', voice: 'device-default', width: 1280 },
  ]) {
    const context = await browser.newContext({ userAgent: scenario.userAgent, viewport: { width: scenario.width, height: 850 } })
    await context.addInitScript(voice => {
      localStorage.setItem('aetheris.voice.settings', JSON.stringify({
        readAloud:true, speakReplies:true, conversation:false, tapToRead:true,
        voiceName:voice, speed:'normal',
      }))
      window.__readAloudUtterances = []
      window.__audioContextUnblocks = 0
      class MockAudioContext {
        constructor() { this.state = 'suspended' }
        resume() { window.__audioContextUnblocks++; this.state = 'running'; return Promise.resolve() }
        get destination() { return {} }
      }
      Object.defineProperty(window, 'AudioContext', { configurable:true, value:MockAudioContext })
      class MockUtterance {
        constructor(text) { this.text=text; this.lang='en-US'; this.rate=1; this.pitch=1; this.volume=1 }
      }
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable:true, value:MockUtterance })
      Object.defineProperty(window, 'speechSynthesis', { configurable:true, value: {
        getVoices:()=>[],
        speaking:false, pending:false,
        cancel:()=>{}, pause:()=>{}, resume:()=>{},
        speak:utterance=>{ window.__readAloudUtterances.push(utterance.text) },
      } })
    }, scenario.voice)
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('http://127.0.0.1:' + port + '/demo', { waitUntil: 'domcontentloaded', timeout:120000 })
    await page.waitForSelector('.ix-root', { timeout:60000 })
    // The modern Ask Intros /demo shell has an integrated VoiceBar rather
    // than a legacy .read-btn; use its real Read-on-tap integration.
    await page.locator('.voice-bar').first().waitFor({state:'visible',timeout:30000})
    // The concise Social Board header has no subtitle; test its stable heading instead.
    const text = page.locator('.home-social-heading h2').first()
    await text.waitFor({state:'visible',timeout:30000})
    await text.click()
    if (scenario.voice === 'intros-managed') {
      await page.waitForFunction(() => window.__audioContextUnblocks > 0, {timeout:5000})
      // A managed voice MUST NOT silently switch to generic browser speech,
      // even on Safari when private ElevenLabs synthesis is unavailable.
      await page.waitForTimeout(1000)
      const recorded = await page.evaluate(() => window.__readAloudUtterances)
      if (recorded.length) throw Error('Selected ElevenLabs voice was replaced with a device voice')
      console.log('PASS '+scenario.name+': Web Audio unlocked synchronously; no generic voice')
    } else {
      await page.waitForFunction(() => window.__readAloudUtterances.length > 0, {timeout:6000})
      const recorded = await page.evaluate(() => window.__readAloudUtterances)
      if (!recorded.some(text => text.length > 1)) throw Error(scenario.name+': no readable text')
      if (recorded.some(text => text.length > 240)) throw Error(scenario.name+': long native speech segment')
      console.log('PASS '+scenario.name+': '+recorded.length+' spoken segments; first '+recorded[0].slice(0,80))
    }
    if (errors.length) throw Error(scenario.name + ': page error ' + errors.join(', '))
    await context.close()
  }
} finally {
  if (browser) await browser.close()
  stop()
}
