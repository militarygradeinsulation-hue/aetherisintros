import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ButlerOrb } from '../../src/components/ui/butler-orb';
import { CinematicEntrance } from '../../src/components/ui/cinematic-entrance';
function Demo() {
  const [open,setOpen]=useState(false);
  const [showIntro,setIntro]=useState(false);
  return <><button onClick={()=>document.documentElement.dataset.experience='social'}>Social</button><button onClick={()=>document.documentElement.dataset.experience='business'}>Business</button>
    <button aria-label="Ask Intros" aria-expanded={open} onClick={()=>setOpen(!open)}><ButlerOrb />Ask Intros</button>
    {open && <section role="dialog" aria-label="Butler conversation">Conversation is open</section>}
    <button onClick={()=>setIntro(true)}>Start intro</button>
    {showIntro && <CinematicEntrance videoSrc="/pending.mp4" onComplete={()=>setIntro(false)}/>}
    <main style={{height:1800}}>Homepage content</main></>;
}
createRoot(document.getElementById('root')!).render(<Demo/>);
