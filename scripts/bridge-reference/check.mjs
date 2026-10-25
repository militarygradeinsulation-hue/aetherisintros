import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(readFileSync('src/bridge-reference/manifest.json', 'utf8'));
for (const {target, sha256} of manifest.files) {
  const actual = createHash('sha256').update(readFileSync(target)).digest('hex');
  if(actual !== sha256) throw new Error(`Original Bridge source modified: ${target}`);
}
console.log(`${manifest.files.length} original Bridge files match the supplied source byte for byte`);

// The user-requested mobile inbox, recipient picker and header controls are host
// integrations. Preserve the pinned reference itself and the untouched Social
// message body/composer and relationship context. Browser tests cover adapters.
const liveReference = readFileSync('src/bridge-reference/src/intros-ui/views/LiveMessagesView.tsx','utf8');
const liveHost = readFileSync('src/intros-ui/views/LiveMessagesView.tsx','utf8');
const socialStart = liveHost.indexOf('  if (social) return (');
const socialEnd = liveHost.indexOf('\n  return (', socialStart);
if (socialStart < 0 || socialEnd < 0) throw Error('Social live-message integration is missing');
const socialRender = liveHost.slice(socialStart, socialEnd);
for (const [label, startMarker, endMarker] of [
  ['message body and composer', '            <div className="msg-live-chat-body', '            </footer>'],
  ['relationship context', '        <aside className="hidden lg:flex', '        </aside>'],
]) {
  const start = liveReference.indexOf(startMarker);
  const end = liveReference.indexOf(endMarker, start);
  if (start < 0 || end < start || !socialRender.includes(liveReference.slice(start, end + endMarker.length))) {
    throw Error(`Original Bridge Social ${label} changed`);
  }
}
console.log('Social message body, composer and context retain original Bridge JSX; mobile controls use the tested host adapter');
