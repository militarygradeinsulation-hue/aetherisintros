import { describe, expect, it, vi } from 'vitest'
const seed = vi.hoisted(() => vi.fn())
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: unknown) => options }))
vi.mock('./network-seed.server', () => ({ seedNetworkDirectory: seed }))
import { Route } from '@/routes/api/public/seed-network'
describe('retired public directory mutation', () => {
  it('rejects public POST requests without invoking any privileged write', async () => {
    const route = Route as unknown as { server: { handlers: { POST: () => Promise<Response> } } }
    const response = await route.server.handlers.POST()
    expect(response.status).toBe(410)
    expect(seed).not.toHaveBeenCalled()
  })
})
