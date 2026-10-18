import { useSyncExternalStore } from 'react'
const listeners = new Set<() => void>()
let value = { loading: false, signedIn: true, isAdmin: true, emailConfirmed: true, userId: 'admin-a' }
export function setAccount(admin: boolean, userId = 'admin-a') { value = { ...value, isAdmin: admin, userId }; listeners.forEach(fn => fn()) }
export const useAccess = () => ({ access: useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn) }, () => value) })
