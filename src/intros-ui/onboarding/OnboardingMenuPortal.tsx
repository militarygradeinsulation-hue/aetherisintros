import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
/** Add the host action to the pinned Bridge menus without changing their snapshot. */
export function OnboardingMenuPortal(){
 const [menus,setMenus]=useState<Element[]>([]);
 useEffect(()=>{const refresh=()=>{const next=Array.from(document.querySelectorAll('.bridge-navigation-host .ix-desktop-more-menu, .bridge-navigation-host .ix-mobile-sheet'));setMenus(old=>old.length===next.length&&old.every((el,i)=>el===next[i])?old:next);};refresh();const observer=new MutationObserver(refresh);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect();},[]);
 return <>{menus.map((menu,index)=>createPortal(<button type="button" role={menu.getAttribute('role')==='menu'?'menuitem':undefined} className={menu.classList.contains('ix-mobile-sheet')?'ix-mobile-sheet-item':'ix-desktop-more-item'} onClick={()=>{const close=menu.querySelector<HTMLButtonElement>('[aria-label="Close more menu"]');if(close)close.click();else document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));window.dispatchEvent(new Event('ask-intros:onboarding'));}}>Onboarding walkthrough</button>,menu,String(index)))}</>;
}
