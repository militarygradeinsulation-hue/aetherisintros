import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { NavigationTarget } from '../components/layout/workspace-navigation';
import { GUIDE_KEY, GUIDE_STEPS, readGuidePosition } from './guide';
import './onboarding.css';

export function OnboardingGuide({ onNavigate, mode }: { onNavigate: (target: NavigationTarget) => void; mode: 'demo' | 'live' }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [exploring, setExploring] = useState(false);
  const [position, setPosition] = useState('welcome');
  const dialog = useRef<HTMLDialogElement>(null);
  const index = Math.max(0, GUIDE_STEPS.findIndex(step => step.id === position));
  const step = GUIDE_STEPS[index]!;
  useEffect(() => {
    setMounted(true);
    const start = () => { setPosition(readGuidePosition()); setExploring(false); setOpen(true); };
    window.addEventListener('ask-intros:onboarding', start);
    return () => window.removeEventListener('ask-intros:onboarding', start);
  }, []);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open, mounted]);
  const select = (id: string) => {
    setPosition(id);
    try { localStorage.setItem(GUIDE_KEY, id); } catch { /* Optional device preference. */ }
    const target = GUIDE_STEPS.find(item => item.id === id)?.target;
    if (target) onNavigate(target);
  };
  const pause = () => { setOpen(false); setExploring(false); };
  const explore = () => {
    if (step.target) onNavigate(step.target);
    setOpen(false); setExploring(true);
  };
  if (!mounted) return null;
  return createPortal(<>
    <dialog ref={dialog} className="onboarding-guide" aria-labelledby="onboarding-title" aria-describedby="onboarding-description" onCancel={event => { event.preventDefault(); pause(); }}>
      <header><span>ASK INTROS · ONBOARDING</span><button type="button" onClick={pause} aria-label="Pause walkthrough">Close</button></header>
      <div className="onboarding-scroll">
        <p className="onboarding-progress">{step.group} · Step {index + 1} of {GUIDE_STEPS.length}</p>
        <progress max={GUIDE_STEPS.length} value={index + 1} aria-label="Walkthrough progress" />
        <div aria-live="polite" aria-atomic="true">
          <h2 id="onboarding-title">{step.title}</h2>
          <p id="onboarding-description">{step.description}</p>
          <ol>{step.instructions.map(text => <li key={text}>{text}</li>)}</ol>
        </div>
        <p className="onboarding-context">{mode === 'demo' ? 'You are exploring a demo. Sign in to use your own account and real member data.' : 'This is your live workspace. Trying a feature uses your normal account permissions.'}</p>
        <label htmlFor="onboarding-topic">Jump to a feature</label>
        <select id="onboarding-topic" value={step.id} onChange={event => select(event.target.value)}>
          {GUIDE_STEPS.map(item => <option value={item.id} key={item.id}>{item.group} / {item.title}</option>)}
        </select>
        <button type="button" className="onboarding-explore" onClick={explore}>{step.target ? 'Try this page' : 'Explore the workspace'}</button>
      </div>
      <footer>
        <div><button type="button" onClick={() => select('welcome')}>Restart</button><button type="button" onClick={pause}>Skip tour</button></div>
        <div><button type="button" disabled={index === 0} onClick={() => select(GUIDE_STEPS[index - 1]!.id)}>Back</button>
          <button type="button" className="onboarding-next" onClick={() => index === GUIDE_STEPS.length - 1 ? pause() : select(GUIDE_STEPS[index + 1]!.id)}>{index === GUIDE_STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>
      </footer>
    </dialog>
    {exploring && <aside className="onboarding-resume" aria-label="Walkthrough paused for practice"><span>{step.title}</span><button type="button" onClick={() => { setExploring(false); setOpen(true); }}>Continue walkthrough</button><button type="button" aria-label="Pause walkthrough" onClick={pause}>Close</button></aside>}
  </>, document.body);
}
