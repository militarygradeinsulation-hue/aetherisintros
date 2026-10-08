/** The member directory and app context the meeting room reads. */
export const useNetwork = () => ({
  members: [
    { id: '00000000-0000-4000-8000-0000000000c1', name: 'Cora Lane', company: 'Lane Capital' },
    { id: '00000000-0000-4000-8000-0000000000c2', name: 'Dev Patel', company: 'Northwind' },
  ],
  profile: { name: 'Tester' },
})
export const useGraph = () => ({ signedIn: true, userId: new URLSearchParams(location.search).get('user') })
export const useNav = () => ({ setPage() {} })
export function NetworkProvider({ children }: { children: React.ReactNode }) { return <>{children}</> }
