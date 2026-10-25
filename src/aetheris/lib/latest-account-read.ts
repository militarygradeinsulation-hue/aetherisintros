/** A late authorization read must never restore a previous account's UI. */
export function latestAccountRead<T>(load: () => Promise<T>, publish: (value: T) => void, pending: () => T, failed: () => T) {
  let revision = 0
  const invalidate = () => { revision++; publish(pending()) }
  return {
    invalidate,
    dispose: () => { revision++ },
    read: async (clear = true): Promise<T | null> => {
      const requested = ++revision
      if (clear) publish(pending())
      try {
        const value = await load()
        if (revision !== requested) return null
        publish(value)
        return value
      } catch {
        if (revision === requested) publish(failed())
        return null
      }
    },
  }
}
