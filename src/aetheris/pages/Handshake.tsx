import { useMemo, useState } from 'react'
import { Check, Lock, Send, X } from 'lucide-react'
import { useNetwork } from '../store'
import { usePlatform } from '../platform'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Numeral, Why } from '../ui'
import { buildCapsule, buildHandshake, deriveChain, deriveWeather } from '../domain/engine'

/**
 * Digital Handshake: the pre-introduction check both sides can see, plus the
 * context capsule that travels with the introduction.
 */
export function HandshakeModal({ memberId, onClose }: { memberId: string; onClose: () => void }) {
  const platform = usePlatform()
  const net = useNetwork()
  const nav = useNav()
  const member = net.members.find(m => m.id === memberId)
  const [step, setStep] = useState<'handshake' | 'capsule'>('handshake')

  const weather = useMemo(() => member ? deriveWeather(member, platform.loops, platform.weather.find(w => w.memberId === memberId)) : null, [member, platform.loops, platform.weather, memberId])
  const handshake = useMemo(() => {
    if (!member || !weather) return null
    const stored = platform.handshakes.find(h => h.bId === memberId)
    return stored ?? buildHandshake(member, platform.intents, platform.intents.filter(i => i.memberId === 'me'), weather)
  }, [member, weather, platform.handshakes, platform.intents, memberId])
  const capsule = useMemo(() => {
    if (!member || !handshake) return null
    return platform.capsules.find(c => c.memberId === memberId) ?? buildCapsule(member, handshake, platform.intents)
  }, [member, handshake, platform.capsules, platform.intents, memberId])
  const chain = useMemo(() => member ? deriveChain(member, net.members, platform.chains.find(c => c.targetId === memberId)) : null, [member, net.members, platform.chains, memberId])

  if (!member || !handshake || !capsule || !chain || !weather) return null
  const stored = platform.capsules.find(c => c.id === capsule.id)
  const live = stored ?? capsule

  return <div className="modal-wrap" onMouseDown={onClose}>
    <div className="modal handshake-modal" onMouseDown={e => e.stopPropagation()}>
      <header>
        <div>
          <Eyebrow signal>DIGITAL HANDSHAKE · CONFIDENCE {handshake.confidence}</Eyebrow>
          <h2>Is this introduction justified?</h2>
          <p>Both sides see the same reasoning before anyone agrees to anything.</p>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={17} /></button>
      </header>

      <div className="handshake-head">
        <Face person={member} portrait large />
        <div>
          <strong>{member.name}</strong>
          <small>{member.title}, {member.company}</small>
          <em className={`weather-chip ${weather.state.toLowerCase().replace(/\s/g, '-')}`}>{weather.state} · {weather.why}</em>
        </div>
        <div className={`justified ${handshake.justified.toLowerCase().replace(/\s/g, '-')}`}>
          <span>JUSTIFIED?</span><strong>{handshake.justified}</strong>
        </div>
      </div>

      <div className="state-filters">
        <button className={step === 'handshake' ? 'active' : ''} onClick={() => setStep('handshake')}>Handshake</button>
        <button className={step === 'capsule' ? 'active' : ''} onClick={() => setStep('capsule')}>Context capsule</button>
      </div>

      {step === 'handshake' && <div className="handshake-body">
        <dl>
          <div><dt>MUTUAL VALUE</dt><dd>{handshake.mutualValue}</dd></div>
          <div><dt>WHY NOW</dt><dd>{handshake.whyNow}</dd></div>
          <div><dt>TIMING</dt><dd>{handshake.timing}</dd></div>
          <div><dt>WHAT YOU GET</dt><dd>{handshake.whatAGets}</dd></div>
          <div><dt>WHAT {member.name.split(' ')[0]?.toUpperCase()} GETS</dt><dd>{handshake.whatBGets}</dd></div>
          <div><dt>POTENTIAL CONFLICT</dt><dd>{handshake.potentialConflict}</dd></div>
        </dl>
        <section className="mod">
          <header><span>SHARED CONTEXT</span></header>
          <ul className="mod-list">{handshake.sharedContext.map(c => <li key={c}>{c}</li>)}</ul>
          <header className="mod-second"><span>SAFE TO SHARE</span></header>
          <ul className="mod-list">{handshake.safeToShare.map(c => <li key={c}>{c}</li>)}</ul>
          <p className="private-note"><Lock size={12} /> {handshake.privateContextUsed} pieces of private context influenced this reasoning and were not shared.</p>
        </section>
        <section className="mod">
          <header><span>TRUST PATH</span></header>
          <ol className="chain">{chain.steps.map(s => <li key={s.personId}>
            <b>{s.name}</b>
            <small>{s.note}</small>
            <em>strength {s.strength} · trust {s.trust} · consent {s.consent}</em>
          </li>)}</ol>
          <Why>{chain.recommendation}</Why>
        </section>
        <div className="handshake-approve">
          <div className={handshake.aApproved ? 'ok' : ''}>{handshake.aApproved && <Check size={13} />} You {handshake.aApproved ? 'agreed' : 'have not agreed yet'}</div>
          <div className={handshake.bApproved ? 'ok' : ''}>{handshake.bApproved && <Check size={13} />} {member.name.split(' ')[0]} {handshake.bApproved ? 'agreed' : 'has not been asked'}</div>
        </div>
      </div>}

      {step === 'capsule' && <div className="handshake-body">
        <p className="mod-copy">This is exactly what travels with the introduction. Turn anything off before it moves.</p>
        <dl>
          <div><dt>WHY YOU ARE MEETING</dt><dd>{live.whyMeeting}</dd></div>
          <div><dt>START HERE</dt><dd>{live.startHere}</dd></div>
          <div><dt>CONNECTED BY</dt><dd>{live.connectedBy}</dd></div>
        </dl>
        <ul className="capsule-items">{live.items.map(i => <li key={i.id} className={i.shared ? '' : 'off'}>
          <button onClick={() => { platform.saveCapsule(live); platform.toggleCapsuleItem(live.id, i.id) }} aria-pressed={i.shared}>
            {i.shared ? <Check size={13} /> : <X size={13} />}
          </button>
          <div><b>{i.label}</b><small>{i.value}</small><em>{i.scope}</em></div>
        </li>)}</ul>
        <section className="mod">
          <header><span>NEVER SHARED</span></header>
          <ul className="mod-list amber">{live.protected.map(p => <li key={p}>{p}</li>)}</ul>
        </section>
        <div className="sys-modules two">
          <section className="mod">
            <header><span>THEY CAN HELP WITH</span></header>
            <ul className="mod-list">{live.helpA.map(h => <li key={h}>{h}</li>)}</ul>
          </section>
          <section className="mod">
            <header><span>YOU CAN HELP WITH</span></header>
            <ul className="mod-list">{live.helpB.map(h => <li key={h}>{h}</li>)}</ul>
          </section>
        </div>
      </div>}

      <footer>
        <Numeral value={handshake.confidence} of=" confidence" />
        <div className="row-actions">
          <Btn kind="quiet" onClick={onClose}>Not now</Btn>
          <Btn kind="secondary" onClick={() => { platform.saveHandshake(handshake); platform.saveCapsule(live); setStep('capsule') }}>Save capsule</Btn>
          <Btn disabled={handshake.justified === 'Not Yet'} onClick={() => {
            platform.saveHandshake({ ...handshake, aApproved: true })
            platform.saveCapsule(live)
            net.requestIntro(member.id)
            onClose()
            nav.setPage('intros')
          }}><Send size={15} /> Agree and request introduction</Btn>
        </div>
      </footer>
    </div>
  </div>
}
