import { useMemo, useState } from 'react'
import { Volume2, Square, ChevronDown } from 'lucide-react'
import { useOps } from '../crm/store'
import { readAloud, stopReading, unlockAudio } from '../voice'
import { buildDiagnostic, explainReport, type DiagnosticArea } from './diagnostic'

const areas: DiagnosticArea[] = ['Revenue', 'Customer retention', 'Coverage', 'Follow-through']

export function CompanyDiagnosticReport({ companyName = 'Your company' }: { companyName?: string }) {
  const ops = useOps()
  const report = useMemo(() => buildDiagnostic(ops, companyName), [ops, companyName])
  const [open, setOpen] = useState<string | null>(null)
  const [depth, setDepth] = useState<Record<string, number>>({})
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [speaking, setSpeaking] = useState(false)
  const money = Object.entries(report.exposureByCurrency)

  const explain = () => {
    if (speaking) { stopReading(); setSpeaking(false); return }
    unlockAudio(); readAloud([explainReport(report)], 'Company diagnostic'); setSpeaking(true)
  }
  const fix = async (id: string) => {
    const issue = report.issues.find(i => i.id === id)
    if (!issue) return
    const due = new Date(Date.now() + 2 * 86_400_000).toISOString()
    const task = await ops.createTask({ title: issue.fix.task, detail: issue.detail, dueAt: due, priority: issue.severity === 'high' ? 'high' : 'medium', status: 'open', companyId: issue.fix.companyId, opportunityId: issue.fix.opportunityId, personId: issue.fix.personId })
    if (task) setDone(d => ({ ...d, [id]: true }))
  }

  return <section className="dx">
    <header className="dx-head">
      <div>
        <span className="eyebrow">COMPANY DIAGNOSTIC · FROM YOUR RECORDS</span>
        <h1>Where {report.companyName} <em>needs attention.</em></h1>
        <p>Read from the {report.recordCounts.opportunities} deals, {report.recordCounts.people} people and {report.recordCounts.tasks} tasks in your CRM. Nothing is estimated, and nothing changes until you act.</p>
      </div>
      <button className="btn primary" onClick={explain}>{speaking ? <Square size={14} /> : <Volume2 size={14} />}{speaking ? 'Stop' : 'Explain this report'}</button>
    </header>

    <div className="dx-score">
      <div><span className="eyebrow">ISSUES FOUND</span><strong>{report.issues.length}</strong></div>
      <div><span className="eyebrow">OPEN VALUE IN STALLED DEALS</span><strong>{money.length ? money.map(([c, v]) => `${v.toLocaleString()} ${c}`).join(' · ') : '—'}</strong><small>Exposure, not a confirmed loss.</small></div>
      {areas.map(a => <div key={a}><span className="eyebrow">{a.toUpperCase()}</span><strong>{report.issues.filter(i => i.area === a).length}</strong></div>)}
    </div>

    {!report.issues.length
      ? <p className="dx-empty">{explainReport(report)}</p>
      : <ol className="dx-list">{report.issues.map(issue => {
          const isOpen = open === issue.id
          const shown = depth[issue.id] ?? 1
          return <li key={issue.id} className={`dx-item sev-${issue.severity}`}>
            <button className="dx-row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : issue.id)}>
              <span className="eyebrow">{issue.area.toUpperCase()} · {issue.severity.toUpperCase()}</span>
              <strong>{issue.title}</strong>
              <ChevronDown size={16} className={isOpen ? 'rot' : ''} />
            </button>
            {isOpen && <div className="dx-body">
              <p>{issue.detail}</p>
              <div className="dx-cols">
                <div><span className="eyebrow">EVIDENCE</span><ul>{issue.evidence.map(e => <li key={e}>{e}</li>)}</ul></div>
                <div><span className="eyebrow">CAUSE CHAIN</span><ol>{issue.why.slice(0, shown).map((w, n) => <li key={w}><span>Why {n + 1}</span>{w}</li>)}</ol>
                  {shown < issue.why.length && <button className="btn quiet" onClick={() => setDepth(d => ({ ...d, [issue.id]: shown + 1 }))}>Ask why again</button>}
                </div>
              </div>
              <div className="dx-fix">
                <span>Proposed: {issue.fix.task}</span>
                <button className="btn primary" disabled={done[issue.id]} onClick={() => void fix(issue.id)}>{done[issue.id] ? 'Added to your tasks' : `Approve · ${issue.fix.label}`}</button>
              </div>
            </div>}
          </li>
        })}</ol>}
  </section>
}
