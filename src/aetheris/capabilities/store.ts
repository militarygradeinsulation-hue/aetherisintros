import { useEffect, useSyncExternalStore } from 'react'
import type { EntityRef, FindingRow } from './types'

export interface OpenRequest { capabilityId: string; subject?: EntityRef; subjectLabel?: string; focus?: string; runId?: string }

export const openCapability = (req: OpenRequest) => window.dispatchEvent(new CustomEvent('aetheris:capability', { detail: req }))

/* The subject the member is currently looking at (set by record views). */
let active: { ref: EntityRef; label: string } | null = null
export const setActiveSubject = (ref: EntityRef | null, label = '') => { active = ref ? { ref, label } : null }
export const getActiveSubject = () => active

/* Owner-scoped findings, read through the member's own session (RLS). */
let findings: FindingRow[] = []
let loaded = false
const subs = new Set<() => void>()
const emit = () => subs.forEach(f => f())

export async function refreshFindings() {
  const { supabase } = await import('@/integrations/supabase/client')
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) { findings = []; loaded = true; emit(); return }
  const { data } = await supabase.from('capability_findings').select('*').eq('owner_id', session.session.user.id).order('created_at', { ascending: false }).limit(300)
  findings = (data ?? []) as unknown as FindingRow[]
  loaded = true
  emit()
}
export const findingsChanged = () => { void refreshFindings() }

export function useFindings(): { findings: FindingRow[]; loaded: boolean } {
  useEffect(() => { if (!loaded) void refreshFindings() }, [])
  const snap = useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, () => findings, () => findings)
  return { findings: snap, loaded }
}
