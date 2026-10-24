import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(readFileSync('src/bridge-reference/manifest.json', 'utf8'));
for (const {target, sha256} of manifest.files) {
  const actual = createHash('sha256').update(readFileSync(target)).digest('hex');
  if(actual !== sha256) throw new Error(`Original Bridge source modified: ${target}`);
}
console.log(`${manifest.files.length} original Bridge files match the supplied source byte for byte`);
