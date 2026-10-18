import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '../../src/aetheris/styles.css'
import { LiveOpportunityExchange } from '../../src/aetheris/LiveOpportunityExchange'
import { switchUser, A, B, C } from './db-stub'
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><div className="ix-classic app-shell" style={{padding:20}}><nav><button onClick={() => switchUser(A)}>Member A</button><button onClick={() => switchUser(B)}>Member B</button><button onClick={() => switchUser(C)}>Member C</button></nav><LiveOpportunityExchange /></div></QueryClientProvider>)
