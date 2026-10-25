import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CompactExperienceSwitch } from '../experience/CompactExperienceSwitch';
import type { ExperienceView } from '../experience/preference';
export function shouldWelcomeNewMember(createdAt:string, seen:boolean, now=Date.now()) {const created=Date.parse(createdAt);return !seen&&Number.isFinite(created)&&created<=now&&now-created<7*86400000;}
export function useButlerWelcome(onWelcome:()=>void){
 const [welcome,setWelcome]=useState(false);
 useEffect(()=>{let alive=true;let revision=0;
 const check=async()=>{const requested=++revision;const {data,error}=await supabase.auth.getUser();if(!alive||requested!==revision||error||!data.user||!document.querySelector('.ledger-crm-shell'))return;const key=`ask-intros.butler-welcome.v1.${data.user.id}`;let seen=true;try{seen=localStorage.getItem(key)==='seen';}catch{return;}if(shouldWelcomeNewMember(data.user.created_at,seen)){try{localStorage.setItem(key,'seen');}catch{return;}setWelcome(true);onWelcome();}};
 void check();const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{setWelcome(false);window.setTimeout(()=>{if(alive)void check();},0);});return()=>{alive=false;revision++;subscription.unsubscribe();};
 },[]);return welcome;
}
export function ButlerWorkspaceControls({welcome,onStart}:{welcome:boolean;onStart:()=>void}){
 const [experience,setExperience]=useState<ExperienceView>('business');const [available,setAvailable]=useState(false);
 useEffect(()=>{const read=()=>{const view=document.documentElement.dataset['experience'];setAvailable(Boolean(document.querySelector('.ledger-crm-shell')));setExperience(view==='social'?'social':'business');};read();const observer=new MutationObserver(read);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-experience']});return()=>observer.disconnect();},[]);
 if(!available)return null;
 return <section className="butler-workspace-controls" aria-label="Workspace help and appearance">{welcome&&<p>Welcome to Ask Intros. New here? I can walk you through the features and show you how to use them.</p>}<div><CompactExperienceSwitch value={experience} onChange={view=>window.dispatchEvent(new CustomEvent('ask-intros:experience',{detail:view}))}/><button type="button" onClick={onStart}>{welcome?'Start my walkthrough':'Onboarding walkthrough'}</button></div></section>;
}
