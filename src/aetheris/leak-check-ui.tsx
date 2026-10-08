/**
 * Business leak check: ten questions, two minutes, a leak index, and for each leak the
 * first fix plus members whose own profiles show they have solved it ("Who has solved
 * this?" reuses Diagnose → Route). Results save privately so progress shows over time.
 */
import { useEffect, useMemo, useState } from 'react'
import { Droplets, RotateCcw } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { RouteToNetwork } from './capabilities/RouteToNetwork'
import { LEAK_QUESTIONS, leakIndexLabel, scoreLeakCheck, type LeakAnswers } from './leak-check'
import { useGraph } from './graph-store'
import { Btn, Eyebrow } from './ui'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

interface SavedCheck { id: string; leakIndex: number; createdAt: string; companyName: string }

export function LeakCheckPanel() {
  const graph = useGraph()
  const [answers, setAnswers] = useState<LeakAnswers>({})
  const [company, setCompany] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [history, setHistory] = useState<SavedCheck[]>([])
  const [msg, setMsg] = useState('')
  const result = useMemo(() => scoreLeakCheck(answers), [answers])
  const complete = result.answered === LEAK_QUESTIONS.length

  useEffect(() => {
    if (!graph.signedIn) return
    void db.from('leak_checks').select('id, leak_index, created_at, company_name').order('created_at', { ascending: false }).limit(6)
      .then((r: any) => setHistory((r.data ?? []).map((c: any) => ({ id: c.id, leakIndex: c.leak_index, createdAt: c.created_at, companyName: c.company_name }))))
  }, [graph.signedIn])

  const finish = async () => {
    setShowResult(true)
    setMsg('')
    if (!graph.signedIn) return
    const r = await db.from('leak_checks').insert({ company_name: company.trim().slice(0, 140), answers, leak_index: result.leakIndex }).select('id, created_at').single()
    if (r.error) { setMsg(`Your result was not saved: ${r.error.message}`); return }
    setHistory(h => [{ id: r.data.id, leakIndex: result.leakIndex, createdAt: r.data.created_at, companyName: company.trim() }, ...h].slice(0, 6))
  }

  const previous = history.find((_, i) => i === (showResult ? 1 : 0))

  return <section className="executive-section leak-check">
    <Eyebrow signal><Droplets size={12} /> BUSINESS LEAK CHECK</Eyebrow>
    <h2>Where is the business losing time, leads and revenue?</h2>
    <p className="og-note">Ten questions, about two minutes. Each leak comes with the first fix to try and the members who have already solved it. Your answers stay private to you.</p>

    {!showResult && <>
      <label className="leak-company">Company (optional)<input value={company} maxLength={140} onChange={e => setCompany(e.target.value)} placeholder="Which business are you checking?" /></label>
      <ol className="leak-questions">{LEAK_QUESTIONS.map(q => <li key={q.id}>
        <fieldset>
          <legend><b>{q.topic}.</b> {q.question}</legend>
          <div className="leak-options">{q.options.map((o, i) => <label key={o.label} className={answers[q.id] === i ? 'on' : ''}>
            <input type="radio" name={`leak-${q.id}`} checked={answers[q.id] === i} onChange={() => setAnswers(a => ({ ...a, [q.id]: i }))} /> {o.label}
          </label>)}</div>
        </fieldset>
      </li>)}</ol>
      <div className="og-inline">
        <Btn disabled={!complete} onClick={() => void finish()}>See my leaks</Btn>
        <small className="og-note">{result.answered} of {LEAK_QUESTIONS.length} answered</small>
      </div>
    </>}

    {showResult && <div className="leak-result">
      <div className="leak-index"><b>{result.leakIndex}</b><span>/100 leak index · {leakIndexLabel(result.leakIndex)}</span>
        {previous && <small>{previous.leakIndex > result.leakIndex ? `Down ${previous.leakIndex - result.leakIndex} since ${new Date(previous.createdAt).toLocaleDateString()}` : previous.leakIndex < result.leakIndex ? `Up ${result.leakIndex - previous.leakIndex} since ${new Date(previous.createdAt).toLocaleDateString()}` : `Same as ${new Date(previous.createdAt).toLocaleDateString()}`}</small>}
      </div>
      {result.findings.length ? result.findings.map((f, i) => <article key={f.id} className={`oc-card leak-finding sev-${f.severity}`}>
        <span className="leak-rank">{i + 1}</span>
        <div>
          <h3>{f.topic} <small>{f.severity === 'high' ? 'Major leak' : 'Leak'}</small></h3>
          <p>{f.leak}</p>
          <p className="leak-fix"><b>First fix:</b> {f.firstFix}</p>
          <RouteToNetwork f={f} />
        </div>
      </article>) : <p>No significant leaks found. Retake it every quarter to keep it that way.</p>}
      {result.strengths.length > 0 && <p className="og-note">Working well: {result.strengths.join(', ')}.</p>}
      <Btn kind="quiet" onClick={() => { setShowResult(false); setAnswers({}) }}><RotateCcw size={14} /> Take it again</Btn>
    </div>}
    {msg && <p className="og-note">{msg}</p>}
    {!showResult && history.length > 0 && <p className="og-note">Last check: {history[0]!.leakIndex}/100 on {new Date(history[0]!.createdAt).toLocaleDateString()}{history[0]!.companyName ? ` for ${history[0]!.companyName}` : ''}.</p>}
  </section>
}
