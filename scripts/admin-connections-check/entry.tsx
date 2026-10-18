import { createRoot } from 'react-dom/client'
import '../../src/aetheris/styles.css'
import { AdminConnectionsPanel } from '../../src/aetheris/admin-connections'
import { setAccount } from './access-stub'
createRoot(document.getElementById('root')!).render(<main style={{padding:16}}><nav><button onClick={() => setAccount(false)}>Ordinary member</button><button onClick={() => setAccount(true, 'admin-a')}>Admin A</button><button onClick={() => setAccount(true, 'admin-b')}>Admin B</button></nav><AdminConnectionsPanel /></main>)
