import { beforeEach, describe, expect, it, vi } from 'vitest'

const fake = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  limit: vi.fn(),
  rpc: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: fake.from,
    rpc: fake.rpc,
    auth: { getUser: fake.getUser },
  },
}))

import {
  createWorkspace,
  findWorkspaceForSource,
  listWorkspaces,
  loadWorkspace,
  WORKSPACE_MIGRATION_NOTICE,
  WorkspaceSchemaUnavailableError,
} from './repo'

const payload = {
  title: 'Private project',
  scope: 'A discrete project scope',
  nextAction: 'Confirm brief',
  budgetCents: null,
  currency: null,
  dueOn: null,
}

describe('Private Deal Workspace legacy schema guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fake.from.mockReturnValue({ select: fake.select })
    fake.select.mockReturnValue({ limit: fake.limit })
    fake.getUser.mockResolvedValue({ data: { user: { id: 'fixture-owner' } } })
    fake.limit.mockResolvedValue({
      data: null,
      error: { code: '42703', message: 'column deal_workspaces.title does not exist' },
    })
  })

  it('blocks every workspace entry point before any write or legacy row read', async () => {
    const actions = [
      () => listWorkspaces(),
      () => loadWorkspace('fixture-workspace'),
      () => findWorkspaceForSource('dm_thread', 'fixture-source'),
      () => createWorkspace('dm_thread', 'fixture-source', payload),
    ]
    for (const action of actions) {
      await expect(action()).rejects.toThrow(WORKSPACE_MIGRATION_NOTICE)
    }
    expect(fake.from).toHaveBeenCalledTimes(actions.length)
    expect(fake.from.mock.calls.every(([table]) => table === 'deal_workspaces')).toBe(true)
    expect(fake.select.mock.calls.every(([columns]) =>
      columns.includes('title') && columns.includes('row_version') && columns.includes('scope_version'),
    )).toBe(true)
    expect(fake.limit.mock.calls.every(([count]) => count === 0)).toBe(true)
    expect(fake.rpc).not.toHaveBeenCalled()
    expect(fake.getUser).not.toHaveBeenCalled()
  })

  it('fails closed on permission errors instead of hiding the fault', async () => {
    fake.limit.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'permission denied for deal_workspaces' },
    })
    await expect(findWorkspaceForSource('intro_request', 'fixture-source'))
      .rejects.toThrow('Could not verify deal workspace access: permission denied')
    expect(fake.rpc).not.toHaveBeenCalled()
  })

  it('uses a dedicated recoverable error for missing columns', async () => {
    await expect(findWorkspaceForSource('dm_thread', 'fixture-source'))
      .rejects.toBeInstanceOf(WorkspaceSchemaUnavailableError)
  })
})
