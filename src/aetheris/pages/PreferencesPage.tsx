import { useState } from 'react'
import { Check, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useNetwork, type PreferenceSettings } from '../store'
import { Btn, Eyebrow, Head } from '../ui'

const tabs = ['Profile', 'Availability', 'Preferences', 'Notifications', 'Privacy', 'Memory Controls'] as const

type Tab = typeof tabs[number]

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} className={`control-toggle ${checked ? 'active' : ''}`} onClick={() => onChange(!checked)}><span /><b>{label}</b></button>
}

export function PreferencesPage() {
  const net = useNetwork()
  const [tab, setTab] = useState<Tab>('Profile')
  const [draft, setDraft] = useState<PreferenceSettings>(net.preferences)
  const [saved, setSaved] = useState(false)
  const update = <K extends keyof PreferenceSettings>(key: K, value: PreferenceSettings[K]) => setDraft(current => ({ ...current, [key]: value }))
  const save = () => { net.setPreferences(draft); setSaved(true); window.setTimeout(() => setSaved(false), 1400) }

  return <>
    <Head
      label="PREFERENCES / CONTROL CENTER"
      title="Decide how the network works for you."
      copy="Control who can reach you, what Intros prioritizes, what becomes memory, and where your context is allowed to travel."
      proof="Your boundaries are part of the recommendation system"
      action={<Btn onClick={save}>{saved ? <><Check size={14} /> Saved</> : 'Save changes'}</Btn>}
    />

    <nav className="preference-tabs" aria-label="Preference sections">{tabs.map(item => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</nav>

    <div className="preferences-layout">
      <main className="preference-panel">
        {tab === 'Profile' && <section>
          <Eyebrow>PROFESSIONAL IDENTITY</Eyebrow><h2>How you appear in the network.</h2>
          <label><span>Professional title</span><input value={draft.title} onChange={event => update('title', event.target.value)} /></label>
          <label><span>Current focus</span><textarea rows={3} value={draft.focus} onChange={event => update('focus', event.target.value)} /></label>
          <label><span>Profile visibility</span><select value={draft.profileVisibility} onChange={event => update('profileVisibility', event.target.value as PreferenceSettings['profileVisibility'])}><option value="network">Aetheris network</option><option value="connections">Connections only</option><option value="private">Private</option></select></label>
        </section>}
        {tab === 'Availability' && <section>
          <Eyebrow>MEETING PREFERENCES</Eyebrow><h2>Make good conversations easier to schedule.</h2>
          <label><span>Availability</span><select value={draft.availability} onChange={event => update('availability', event.target.value)}><option>Open to two conversations a week</option><option>Selective · warm paths only</option><option>Message first</option><option>Not taking meetings</option></select></label>
          <label><span>Preferred format</span><select value={draft.meetingFormat} onChange={event => update('meetingFormat', event.target.value)}><option>Video call</option><option>In person</option><option>Phone</option><option>Message first</option></select></label>
          <Toggle checked={draft.allowBooking} onChange={value => update('allowBooking', value)} label="Allow qualified members to request time" />
        </section>}
        {tab === 'Preferences' && <section>
          <Eyebrow>RECOMMENDATION SETTINGS</Eyebrow><h2>Shape what rises to your attention.</h2>
          <Toggle checked={draft.useRecommendations} onChange={value => update('useRecommendations', value)} label="Use relationship intelligence for introductions" />
          <Toggle checked={draft.prioritizeMutual} onChange={value => update('prioritizeMutual', value)} label="Prioritize mutual interests and trusted paths" />
          <Toggle checked={draft.crossIndustry} onChange={value => update('crossIndustry', value)} label="Surface cross-industry opportunities" />
          <Toggle checked={draft.includeEarlyStage} onChange={value => update('includeEarlyStage', value)} label="Include early-stage companies" />
          <label className="range-setting"><span>Serendipity <b>{draft.serendipity}%</b></span><input type="range" min="0" max="100" value={draft.serendipity} onChange={event => update('serendipity', Number(event.target.value))} /><small>Focused</small><small>Exploratory</small></label>
        </section>}
        {tab === 'Notifications' && <section>
          <Eyebrow>ATTENTION POLICY</Eyebrow><h2>Only notify you when context changes.</h2>
          <label><span>Summary frequency</span><select value={draft.notificationFrequency} onChange={event => update('notificationFrequency', event.target.value)}><option>Daily intelligence brief</option><option>Weekly relationship review</option><option>Important signals only</option><option>Off</option></select></label>
          <Toggle checked={draft.coolingAlerts} onChange={value => update('coolingAlerts', value)} label="Cooling relationship alerts" />
          <Toggle checked={draft.introAlerts} onChange={value => update('introAlerts', value)} label="Introduction and warm-path updates" />
        </section>}
        {tab === 'Privacy' && <section>
          <Eyebrow>COMMUNICATION PERMISSIONS</Eyebrow><h2>Context never outranks consent.</h2>
          <label><span>Who can contact you</span><select value={draft.contactPermission} onChange={event => update('contactPermission', event.target.value)}><option>Connections and warm introductions</option><option>Connections only</option><option>Anyone in the network</option><option>No direct requests</option></select></label>
          <Toggle checked={draft.requireDoubleOptIn} onChange={value => update('requireDoubleOptIn', value)} label="Require double opt-in for introductions" />
          <Toggle checked={draft.shareActivity} onChange={value => update('shareActivity', value)} label="Show professional activity to the network" />
        </section>}
        {tab === 'Memory Controls' && <section>
          <Eyebrow>ACTIVE MEMORY CONTROLS</Eyebrow><h2>Choose what is remembered and for how long.</h2>
          <Toggle checked={draft.rememberConversations} onChange={value => update('rememberConversations', value)} label="Remember conversation context" />
          <Toggle checked={draft.rememberActions} onChange={value => update('rememberActions', value)} label="Remember relationship actions and outcomes" />
          <Toggle checked={draft.sharedMemory} onChange={value => update('sharedMemory', value)} label="Allow explicitly shared memory" />
          <label><span>Retention</span><select value={draft.retention} onChange={event => update('retention', event.target.value)}><option>Until I delete it</option><option>12 months</option><option>90 days</option><option>30 days</option></select></label>
          <div className="memory-danger"><LockKeyhole size={16} /><div><b>Private memory stays private.</b><p>It may improve your own relevance but is never quoted into an introduction.</p></div></div>
        </section>}
      </main>

      <aside className="preference-preview">
        <Eyebrow>LIVE PROFILE PREVIEW</Eyebrow>
        <div className="preview-initials">{net.profile.initials}</div>
        <h2>{net.profile.name}</h2><p>{draft.title}</p><blockquote>“{draft.focus}”</blockquote>
        <dl><div><dt>VISIBILITY</dt><dd>{draft.profileVisibility}</dd></div><div><dt>MEETINGS</dt><dd>{draft.availability}</dd></div><div><dt>MEMORY</dt><dd>{draft.rememberConversations ? 'Conversation context on' : 'Conversation context off'}</dd></div></dl>
        <div className="privacy-proof"><ShieldCheck size={17} /><span><b>Your controls travel with your context.</b><small>Every note, recommendation and introduction keeps its source and privacy scope.</small></span></div>
      </aside>
    </div>
  </>
}
