import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const port = await new Promise(done => {
  const listener = createServer().listen(0, '127.0.0.1', () => {
    const port = listener.address().port;
    listener.close(() => done(port));
  });
});
const server = spawn('npx', ['vite', 'dev', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: root, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
});
try {
  await new Promise((done, fail) => {
    const timer = setTimeout(() => fail(new Error('Social View preview startup timeout')), 90_000);
    const ready = data => { if (/ready in|Local:/.test(String(data))) { clearTimeout(timer); done(); } };
    server.stdout.on('data', ready); server.stderr.on('data', ready);
    server.once('exit', code => { clearTimeout(timer); fail(new Error('Social View preview exited ' + code)); });
  });
  const test = spawn(process.execPath, ['scripts/experience-check/run.mjs'], {
    cwd: root, stdio: 'inherit', env: { ...process.env, EXPERIENCE_BASE_URL: 'http://127.0.0.1:' + port },
  });
  const code = await new Promise(done => test.once('exit', done));
  if (code !== 0) throw new Error('Social/Business browser regression exited ' + code);
} finally {
  try { process.kill(-server.pid); } catch { /* already exited */ }
}
