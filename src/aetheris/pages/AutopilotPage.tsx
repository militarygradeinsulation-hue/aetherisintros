import { useState } from 'react'
import { Eyebrow, Head } from '../ui'
import { useNetwork } from '../store'
import { useOS } from '../os-store'
import { AutopilotCard } from '../os-ui'
import type { AutopilotAction } from '../domain/os-models'

const lanes: Array<AutopilotAction['status'] | 'prepared'> = ['prepared', 'approved', 'skipped', 'snoozed']

export function AutopilotPage() {
  const os = useOS()
  const net = useNetwork()
  const [lane, setLane] = useState<AutopilotAction['status']>('prepared')
  const items = os.autopilot.filter(a => a.status === lane)

  return <>
    <Head
      label="AUTOPILOT · APPROVAL REQUIRED"
      title="Considered moves, prepared and held."
      copy="Intros prepares the work — the reconnect note, the introduction request, the follow-up, the placement — and then stops. Nothing leaves your account without your approval unless you have explicitly raised your autonomy for that class of action."
      proof={`${os.autopilot.filter(a => a.status === 'prepared').length} prepared · autonomy level ${net.autonomy}`}
    />
    <nav className="lane-row" role="tablist" aria-label="Autopilot queue">
      {lanes.map(l => <button key={l} role="tab" aria-selected={lane === l} className={lane === l ? 'on' : ''} onClick={() => setLane(l)}>{l}</button>)}
    </nav>
    <section className="autopilot-list">
      {items.map(a => <AutopilotCard key={a.id} action={a} />)}
      {!items.length && <p className="quiet-empty">Nothing in this queue.</p>}
    </section>
    <section className="teach-block">
      <div><Eyebrow>WHY APPROVAL IS THE DEFAULT</Eyebrow>
        <h2>A network dies the moment it starts sending on your behalf.</h2>
        <p>Autopilot exists to remove the drafting, not the judgement. Every consequential action shows why it was prepared, what evidence it rests on, what it costs a connector, and who would see it.</p>
      </div>
      <ul className="teach-points">
        <li><b>Prepared</b><span>Written and waiting for you.</span></li>
        <li><b>Approved</b><span>You released it, with the edit you made.</span></li>
        <li><b>Skipped</b><span>Declined, and recorded so it is not re-proposed.</span></li>
      </ul>
    </section>
  </>
}
