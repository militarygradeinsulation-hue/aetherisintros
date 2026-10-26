import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

/** Runs in disposable embedded PostgreSQL; never touches the live account database. */
describe('member context SQL authorization contract', () => {
  it('enforces per-account RLS, idempotency, tombstones and anonymous denial', () => {
    const output = execFileSync(process.execPath, ['scripts/device-cache-check/member_context.pglite.mjs'], {
      encoding: 'utf8',
      cwd: process.cwd(),
      timeout: 30_000,
    });
    expect(output).toContain('PASS RLS isolates B from A');
    expect(output).toContain('PASS anon cannot call sync');
    expect(output).not.toContain('FAIL ');
  }, 35_000);
});
