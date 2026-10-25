import { describe, expect, it, vi } from 'vitest'
import { latestAccountRead } from './latest-account-read'
const deferred = () => { let resolve!: (s: string) => void; let reject!: () => void; const promise = new Promise<string>((a,b) => { resolve=a; reject=b }); return { promise, resolve, reject } }
describe('membership account changes', () => {
  it('clears access immediately and ignores the previous account after the next account loads', async () => {
    const a = deferred(), b = deferred(), publish = vi.fn()
    const load = vi.fn().mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise)
    const reader = latestAccountRead(load, publish, () => 'restricted', () => 'failed')
    const first = reader.read()
    reader.invalidate()
    expect(publish).toHaveBeenLastCalledWith('restricted')
    const second = reader.read()
    b.resolve('member-b'); await second
    a.resolve('admin-a'); await first
    expect(publish).toHaveBeenLastCalledWith('member-b')
    expect(publish).not.toHaveBeenCalledWith('admin-a')
  })
  it('ignores failures after unmount and fails closed for the current read', async () => {
    const a = deferred(), publish = vi.fn()
    const reader = latestAccountRead(() => a.promise, publish, () => 'restricted', () => 'failed')
    const request = reader.read(); reader.dispose(); a.reject(); await request
    expect(publish).toHaveBeenCalledTimes(1)
    const failed = latestAccountRead(async () => { throw Error('private payload') }, publish, () => 'restricted', () => 'failed')
    await failed.read()
    expect(publish).toHaveBeenLastCalledWith('failed')
  })
})
