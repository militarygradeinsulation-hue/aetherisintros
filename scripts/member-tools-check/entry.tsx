import { useDictation } from '../../src/aetheris/voice';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BusinessTools } from '../../src/features/business-tools/BusinessTools';
import { PostOwnerActions } from '../../src/aetheris/PostOwnerActions';
import { CompactExperienceSwitch } from '../../src/intros-ui/experience/CompactExperienceSwitch';
import { useExperience } from '../../src/intros-ui/experience/useExperience';
import { ButlerWorkspaceControls,useButlerWelcome } from '../../src/intros-ui/onboarding/ButlerWorkspaceControls';
import { OnboardingMenuPortal } from '../../src/intros-ui/onboarding/OnboardingMenuPortal';
function VoiceHarness(){const [heard,setHeard]=useState('');const voice=useDictation({keepOpen:true,onFinal:setHeard});return <section aria-label="Voice test"><button onClick={voice.start}>Start test conversation</button><button onClick={voice.stop}>Stop test conversation</button><output aria-label="Heard text">{heard}</output><output aria-label="Voice error">{voice.error}</output></section>;}
function Fixture(){
 const {experience,chooseExperience}=useExperience();const [welcomeShown,setWelcome]=useState(false);const welcome=useButlerWelcome(()=>setWelcome(true));
 const [post,setPost]=useState({id:'post-1',memberId:'me',kind:'Insight' as const,text:'Original post',detail:'Original details',when:'Today',responses:0});const [deleted,setDeleted]=useState(false);
 return <div className="ledger-crm-shell"><header><CompactExperienceSwitch value={experience} onChange={chooseExperience}/></header><output aria-label="Current view">{experience}</output><output aria-label="Welcome shown">{String(welcomeShown)}</output><ButlerWorkspaceControls welcome={welcome} onStart={()=>window.dispatchEvent(new Event('ask-intros:onboarding'))}/><div className="bridge-navigation-host"><div className="ix-desktop-more-menu" role="menu"/></div><OnboardingMenuPortal/>
 <VoiceHarness/><BusinessTools/>
 {!deleted&&<article aria-label="Test post"><h2>{post.text}</h2><PostOwnerActions post={post} onEdit={async(text,detail)=>{if((window as any).failPost)throw Error('Save failed. Keep your draft.');setPost({...post,text,detail});}} onDelete={async()=>setDeleted(true)}/></article>}
 <PostOwnerActions post={{...post,memberId:'someone-else'}} onEdit={async()=>{throw Error('Not allowed');}} onDelete={async()=>{throw Error('Not allowed');}}/>
 </div>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
