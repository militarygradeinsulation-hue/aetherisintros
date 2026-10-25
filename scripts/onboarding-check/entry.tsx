import '../../src/intros-ui/experience/bridge-social-tokens.css';
import '../../src/intros-ui/experience/bridge-social.css';
import '../../src/intros-ui/components/layout/more-menu-readability.css';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { OnboardingGuide } from '../../src/intros-ui/onboarding/OnboardingGuide';
function Fixture() {
 const [target,setTarget]=useState('home');
 return <><button onClick={()=>window.dispatchEvent(new Event('ask-intros:onboarding'))}>Onboarding</button><output>{target}</output><div className="ix-root ix-commons-bridge"><div className="ix-mobile-sheet" style={{position:"fixed",bottom:80}}>{["Network intelligence", "Deals & Private Workspaces", "Onboarding walkthrough"].map(label=><button className="ix-mobile-sheet-item" key={label}><svg aria-hidden="true"/>{label}</button>)}</div></div><OnboardingGuide mode="demo" onNavigate={t=>setTarget(t.tool || t.page)}/></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
