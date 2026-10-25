const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require(process.env.TYPESCRIPT_MODULE || 'typescript');
const { z } = require(process.env.ZOD_MODULE || 'zod');
function load(file, mocks = {}, extras = {}) {
  const box = { exports: {}, require: name => { if (name in mocks) return mocks[name]; throw Error('Unexpected module: ' + name); }, console, crypto, File, Blob, TextDecoder, Uint8Array, DataView, DecompressionStream, Response, AbortSignal, setTimeout, ...extras };
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, reportDiagnostics: true });
  assert.equal(output.diagnostics.length, 0, file + ' syntax');
  vm.runInNewContext(output.outputText, box, { filename: file });
  return box.exports;
}
function serverFn() {
  let validator;
  const chain = { middleware(list) { assert.equal(list.length, 1); return chain; }, inputValidator(value) { validator = value; return chain; }, handler(fn) { return ({ data, context }) => fn({ data: validator.parse(data), context }); } };
  return chain;
}
function database() {
  const rows = { memories: [], posts: [], crm_tasks: [] }, calls = [];
  return { rows, calls, from(table) {
    const filters = []; let values, operation = 'read', maximum = 100;
    const query = { select() { return query; }, eq(key, value) { filters.push([key, value]); return query; }, lt() { return query; }, order() { return query; }, limit(n) { maximum = n; return query; }, ilike() { return query; },
      insert(value) { operation = 'insert'; values = value; return query; }, upsert(value) { operation = 'upsert'; values = value; return query; },
      single() { return execute(true); }, maybeSingle() { return execute(true); }, then(resolve, reject) { return execute(false).then(resolve, reject); } };
    async function execute(single) {
      calls.push({ table, operation, filters });
      if (operation !== 'read') { (rows[table] ??= []).push(values); return { data: values, error: null }; }
      const data = (rows[table] ?? []).filter(row => filters.every(([key, value]) => row[key] === value)).slice(0, maximum);
      return { data: single ? data[0] ?? null : data, error: null };
    }
    return query;
  } };
}
(async () => {
  const api = load('src/lib/butler.functions.ts', { zod: { z }, '@tanstack/react-start': { createServerFn: serverFn }, './auth-gate': { requireAuthContract: {} } });
  const db = database(), owner = crypto.randomUUID(), other = crypto.randomUUID(), conversation = crypto.randomUUID();
  const context = { userId: owner, supabase: db };
  const turn = { id: crypto.randomUUID(), role: 'user', content: 'Remember this conversation', at: new Date().toISOString() };
  await api.saveButlerTurn({ context, data: { owner, conversation, turn } });
  await api.saveButlerTurn({ context, data: { owner, conversation, turn } });
  assert.equal(db.rows.memories.length, 1, 'retry must not duplicate a turn');
  assert.equal(db.rows.memories[0].scope, 'private'); assert.equal(db.rows.memories[0].user_id, owner);
  await assert.rejects(() => api.saveButlerTurn({ context, data: { owner: other, conversation, turn } }), /Account changed/);
  await assert.rejects(() => api.saveButlerTurn({ context, data: { owner, conversation, turn: { ...turn, content: 'Changed turn' } } }), /conflict/);
  const history = await api.loadButlerHistory({ context, data: { conversation } }); assert.equal(history.entries[0].turn.content, turn.content);
  const foreign = await api.loadButlerHistory({ context: { ...context, userId: other }, data: { conversation } }); assert.equal(foreign.entries.length, 0);
  const draft = { id: crypto.randomUUID(), owner, kind: 'publish-post', text: 'A reviewed network update.' };
  await api.executeButlerDraft({ context, data: draft }); await api.executeButlerDraft({ context, data: draft });
  assert.equal(db.rows.posts.length, 1); assert.equal(db.rows.posts[0].author_id, owner); assert.equal(db.rows.posts[0].is_demo, false);
  await assert.rejects(() => api.executeButlerDraft({ context, data: { ...draft, text: 'Different post content' } }), /different text/);
  await assert.rejects(() => api.executeButlerDraft({ context, data: { ...draft, owner: other } }), /Account changed/);
  await api.executeButlerDraft({ context, data: { ...draft, id: crypto.randomUUID(), kind: 'create-task', text: 'Follow up with the buyer' } });
  assert.equal(db.rows.crm_tasks[0].owner_id, owner);
  const tools = load('src/lib/butler-tools.server.ts').butlerTools(db, owner);
  for (const area of ['profile', 'contacts', 'opportunities', 'tasks', 'posts', 'memory']) {
    await tools[0].execute({ area, query: 'test' });
    const call = db.calls.at(-1); assert.equal(call.operation, 'read'); assert.ok(call.filters.some(([key, value]) => ['id', 'owner_id', 'author_id', 'user_id'].includes(key) && value === owner));
  }
  const files = load('src/aetheris/butler/files.ts');
  const text = await files.readButlerFile(new File(['hello'], 'hello.txt')); assert.equal(text.text, 'hello');
  const long = await files.readButlerFile(new File(['x'.repeat(25000)], 'large.csv')); assert.ok(long.text.length <= 20000); assert.match(long.text, /Truncated/);
  await assert.rejects(() => files.readButlerFile(new File(['bad'], 'run.exe')), /Use TXT/);
  await assert.rejects(() => files.readButlerFile(new File(['bad'], 'bad.docx')), /Invalid DOCX/);
  await assert.rejects(() => files.readButlerFile({ name: 'huge.txt', size: 9 * 1024 * 1024 }), /8 MB/);
  console.log('PASS private history, account isolation, idempotent saves/posts, task ownership, read tools, file limits and invalid files.');
})();
