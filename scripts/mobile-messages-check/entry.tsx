import { createRoot } from 'react-dom/client'
import { LiveMessagesView } from '../../src/intros-ui/views/LiveMessagesView'
import { FixtureNetwork } from './mock'
import './style.css'
const social = new URLSearchParams(location.search).get('social') === 'true'
createRoot(document.getElementById('root')!).render(<div className="ix-root"><FixtureNetwork><LiveMessagesView social={social} onOpenWorkspaces={() => {}}/></FixtureNetwork></div>)
