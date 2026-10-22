const state = window as unknown as { __calls: string[]; __delay: boolean }
state.__calls = []
export const supabase = {
  from(table: string) {
    return { select(columns: string) { return { limit(count: number) { return { abortSignal(signal: AbortSignal) {
      state.__calls.push(`table:${table}:${columns}:${count}`)
      if (state.__delay) return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }))
      const missing = ['private_library_workspaces', 'private_library_import_batches', 'track_record_entries', 'proposals'].includes(table)
      if (table === 'deal_rooms' || table === 'reputation_scores') return Promise.resolve({ data: null, error: { code: '42703', message: 'DO_NOT_DISPLAY_TOKEN' } })
      return Promise.resolve({ data: missing ? null : [], error: missing ? { code: 'PGRST205', message: 'DO_NOT_DISPLAY_TOKEN' } : null })
    } } } } } }
  },
  rpc(name: string) {
    return { abortSignal(signal: AbortSignal) {
      state.__calls.push(name)
      if (state.__delay) return new Promise((_resolve,reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }))
      if (name === 'admin_platform_overview') return Promise.resolve({ data: null, error: { code: 'PGRST202', message: 'DO_NOT_DISPLAY_TOKEN' } })
      if (name === 'admin_network_health') return Promise.resolve({ data: null, error: { code: '42501' } })
      if (name === 'is_live_member') return Promise.resolve({ data: false, error: null })
      if (name === 'my_provider_requests') return Promise.resolve({ data: null, error: null })
      if (name === 'provider_inbox') return Promise.reject(new Error('DO_NOT_DISPLAY_TOKEN'))
      return Promise.resolve({ data: [], error: null })
    } }
  },
}
