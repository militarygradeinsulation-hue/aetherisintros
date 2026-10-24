"use client";

import * as React from "react";
import { AnimatePresence, motion, useAnimationControls, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "framer-motion";
import { Command } from "lucide-react";
import "./macos-dock.css";

export interface DockApp { id: string; label: string; icon: React.ReactNode; badge?: number }
export interface DockCommand { id: string; label: string; shortcut?: string; onSelect: () => void }
export interface MacOsDockProps {
  items: readonly DockApp[];
  activeIds?: readonly string[];
  onSelect: (item: DockApp) => void;
  commands?: readonly DockCommand[];
  onCommand?: () => void;
  className?: string;
  ariaLabel?: string;
}
const FAR = 99999, REST = 44, PEAK = 56, RADIUS = 110;
const EASE = [0.16,1,0.3,1] as const;
function DockItem({mouseX,reduce,label,hovered,active,badge,onEnter,onClick,children}:{
  mouseX:MotionValue<number>;reduce:boolean;label:string;hovered:boolean;active:boolean;badge?:number;
  onEnter:()=>void;onClick:()=>void;children:React.ReactNode;
}) {
 const ref=React.useRef<HTMLButtonElement>(null);
 const dist=useTransform(mouseX,(x:number)=>{const r=ref.current?.getBoundingClientRect();return r?x-(r.x+r.width/2):FAR});
 const raw=useTransform(dist,(d:number)=>{const t=Math.min(1,Math.abs(d)/RADIUS);return REST+(PEAK-REST)*(1+Math.cos(Math.PI*t))/2});
 const size=useSpring(raw,{mass:.1,stiffness:240,damping:18});
 const bounce=useAnimationControls();
 const click=()=>{if(!reduce)void bounce.start({y:[0,-10,0],transition:{duration:.38,ease:EASE}});onClick()};
 return <button ref={ref} type="button" className="ask-macos-dock-item" onMouseEnter={onEnter} onFocus={onEnter} onClick={click}
   aria-label={label+(badge&&badge>0?", "+badge+" unread":"")} aria-current={active?"page":undefined}>
   <motion.span animate={bounce} className="ask-macos-dock-icon" style={{width:reduce?REST:size,height:reduce?REST:size}}>
    {children}{badge&&badge>0?<span className="ask-macos-dock-badge" aria-hidden="true">{badge>99?"99+":badge}</span>:null}
   </motion.span>
   {active?<span className="ask-macos-dock-running" aria-hidden="true"/>:null}
   <motion.span className="ask-macos-dock-reflection" aria-hidden="true" style={{width:reduce?REST:size,height:reduce?REST*.45:size}}>{children}</motion.span>
   <AnimatePresence>{hovered?<motion.span className="ask-macos-dock-tooltip"
    initial={reduce?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}
    transition={reduce?{duration:0}:{duration:.2}}>{label}</motion.span>:null}</AnimatePresence>
 </button>;
}
/** User-wired magnifying desktop dock; all shortcuts trigger real workspace callbacks. */
export function MacOsDock({items,activeIds=[],onSelect,commands=[],onCommand,className="",ariaLabel="Ask Intros quick navigation"}:MacOsDockProps){
 const reduce=!!useReducedMotion(),mouseX=useMotionValue(FAR);
 const [hovered,setHovered]=React.useState<string|null>(null),[menuOpen,setMenuOpen]=React.useState(false);
 const menuRef=React.useRef<HTMLDivElement>(null);
 React.useEffect(()=>{
   if(!menuOpen)return;
   const key=(e:KeyboardEvent)=>{if(e.key==="Escape")setMenuOpen(false)};
   const outside=(e:MouseEvent)=>{if(!menuRef.current?.contains(e.target as Node))setMenuOpen(false)};
   window.addEventListener("keydown",key);window.addEventListener("mousedown",outside);
   return ()=>{window.removeEventListener("keydown",key);window.removeEventListener("mousedown",outside)};
 },[menuOpen]);
 return <nav aria-label={ariaLabel} className={"ask-macos-dock "+className}
   onMouseMove={e=>{if(!reduce)mouseX.set(e.clientX)}} onMouseLeave={()=>{mouseX.set(FAR);setHovered(null)}}>
   <span className="ask-macos-dock-glint" aria-hidden="true"/>
   {items.map(it=><DockItem key={it.id} mouseX={mouseX} reduce={reduce} label={it.label}
     hovered={hovered===it.id} active={activeIds.includes(it.id)} badge={it.badge}
     onEnter={()=>setHovered(it.id)} onClick={()=>{setMenuOpen(false);onSelect(it)}}>
     <span className="ask-macos-dock-plate">{it.icon}</span>
   </DockItem>)}
   <span className="ask-macos-dock-divider" aria-hidden="true"/>
   <div ref={menuRef} className="ask-macos-command-wrap">
    <DockItem mouseX={mouseX} reduce={reduce} label="Command menu" hovered={hovered==="__cmd"&&!menuOpen}
      active={menuOpen} onEnter={()=>setHovered("__cmd")}
      onClick={()=>{if(commands.length)setMenuOpen(v=>!v);else onCommand?.()}}>
      <span className="ask-macos-dock-plate ask-macos-command-icon"><Command size={18} aria-hidden="true"/><span>K</span></span>
    </DockItem>
    <AnimatePresence>{menuOpen&&commands.length>0?<motion.div role="menu" className="ask-macos-command-menu"
      aria-label="Workspace commands" initial={reduce?false:{opacity:0,y:8,scale:.97}} animate={{opacity:1,y:0,scale:1}}
      exit={{opacity:0,y:8,scale:.97}} transition={reduce?{duration:0}:{duration:.2,ease:EASE}}>
      {commands.map(cmd=><button key={cmd.id} type="button" role="menuitem" onClick={()=>{setMenuOpen(false);cmd.onSelect()}}>
        <span>{cmd.label}</span>{cmd.shortcut?<kbd>{cmd.shortcut}</kbd>:null}
      </button>)}
    </motion.div>:null}</AnimatePresence>
   </div>
 </nav>;
}
export default MacOsDock;
