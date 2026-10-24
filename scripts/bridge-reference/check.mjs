import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(readFileSync('src/bridge-reference/manifest.json', 'utf8'));
for (const {target, sha256} of manifest.files) {
  const actual = createHash('sha256').update(readFileSync(target)).digest('hex');
  if(actual !== sha256) throw new Error(`Original Bridge source modified: ${target}`);
}
console.log(`${manifest.files.length} original Bridge files match the supplied source byte for byte`);

// The original live-message JSX is used with the canonical, newer send controller.
const liveReference = readFileSync('src/bridge-reference/src/intros-ui/views/LiveMessagesView.tsx','utf8');
const start = liveReference.indexOf('  return (\n    <div className="max-w-');
const end = liveReference.indexOf('\n  )\n}', start) + '\n  )'.length;
const originalRender = liveReference.slice(start, end).replace('  return (','  if (social) return (');
if (start < 0 || !readFileSync('src/intros-ui/views/LiveMessagesView.tsx','utf8').includes(originalRender)) throw Error('Original Bridge live-message rendering changed');
console.log('Live message rendering matches original Bridge JSX exactly');
