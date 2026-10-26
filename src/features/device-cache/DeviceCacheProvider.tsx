import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDeviceSession, type DeviceSession } from './useDeviceSession';

const DeviceContext = createContext<DeviceSession | null>(null);
let activeSession: DeviceSession | null = null;

/** Only the authenticated shell mounts this provider; no demo-user caching. */
export function DeviceCacheProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const device = useDeviceSession(
    supabase as unknown as Parameters<typeof useDeviceSession>[0],
    {},
    enabled,
  );
  useEffect(() => {
    if (!enabled) return;
    activeSession = device;
    return () => { if (activeSession === device) activeSession = null; };
  }, [device, enabled]);
  return <DeviceContext.Provider value={enabled ? device : null}>{children}</DeviceContext.Provider>;
}
export function useDeviceCache(): DeviceSession | null {
  return useContext(DeviceContext);
}

/** Central logout guard, shared by all logout buttons via signOutMember(). */
export async function prepareDeviceSignOut(): Promise<boolean> {
  const device = activeSession;
  if (!device) return true;
  const pending = await device.pendingBeforeSignOut();
  if (pending > 0 && !window.confirm(
    pending + ' device change(s) have not synced. Signing out will discard them from this device. Sign out anyway?'
  )) return false;
  await device.wipe();
  return true;
}
