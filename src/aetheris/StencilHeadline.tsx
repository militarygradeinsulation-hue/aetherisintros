import type { ReactNode } from 'react';

/**
 * Responsive vector stencil headline based on the single-stroke, mechanically
 * interrupted glyph language in the supplied Aetheris reference HTML.
 * Decorative paths only; callers provide normal semantic heading copy as
 * visually hidden text for assistive technology and search engines.
 */
const GLYPHS: Record<string, string> = {
  A:'0,6 0,1.5 1.5,0 2.5,0 4,1.5 4,6|0,3.6 4,3.6',
  B:'0,0 3,0 4,1 4,2 3,3|0,3 3,3 4,4 4,5 3,6 0,6 0,0',
  C:'4,0 1,0 0,1 0,5 1,6 4,6',
  D:'0,0 0,6 3,6 4,5 4,1 3,0 0,0',
  E:'4,0 0,0 0,6 4,6|0,3 3,3',
  F:'4,0 0,0 0,6|0,3 3,3',
  G:'4,0 1,0 0,1 0,5 1,6 4,6 4,3 2,3',
  H:'0,0 0,6|4,0 4,6|0,3 4,3',
  I:'0.5,0 3.5,0|2,0 2,6|0.5,6 3.5,6',
  J:'1,0 4,0 4,5 3,6 1,6 0,5',
  K:'0,0 0,6|0,3 1.5,3 4,0|1.5,3 4,6',
  L:'0,0 0,6 4,6',
  M:'0,6 0,1 1,0 3,0 4,1 4,6|2,0 2,3.6',
  N:'0,6 0,0 4,6 4,0',
  O:'1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,1 1,0',
  P:'0,6 0,0 3,0 4,1 4,2 3,3 0,3',
  Q:'1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,1 1,0|2.6,4.6 4,6',
  R:'0,6 0,0 3,0 4,1 4,2 3,3 0,3|2,3 4,6',
  S:'4,0 1,0 0,1 0,2 1,3 3,3 4,4 4,5 3,6 0,6',
  T:'0,0 4,0|2,0 2,6',
  U:'0,0 0,5 1,6 3,6 4,5 4,0',
  V:'0,0 0,3.5 2,6 4,3.5 4,0',
  W:'0,0 0,5 1,6 3,6 4,5 4,0|2,6 2,2.4',
  X:'0,0 4,6|4,0 0,6',
  Y:'0,0 2,3 4,0|2,3 2,6',
  Z:'0,0 4,0 0,6 4,6',
  '0':'1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,1 1,0',
  '1':'0.5,1.5 2,0 2,6|0.5,6 3.5,6',
  '2':'0,1 1,0 3,0 4,1 4,2 0,6 4,6',
  '3':'0,0 4,0 2,2.6 3,2.6 4,3.6 4,5 3,6 0,6',
  '4':'3,6 3,0 0,4 4,4',
  '5':'4,0 0,0 0,2.6 3,2.6 4,3.6 4,5 3,6 0,6',
  '6':'3.5,0 1,0 0,1 0,5 1,6 3,6 4,5 4,3.6 3,2.6 0,2.6',
  '7':'0,0 4,0 1.5,6',
  '8':'1,0 3,0 4,1 4,2 3,3 1,3 0,2 0,1 1,0|1,3 3,3 4,4 4,5 3,6 1,6 0,5 0,4 1,3',
  '9':'0.5,6 3,6 4,5 4,1 3,0 1,0 0,1 0,2.4 1,3.4 4,3.4',
  '.':'1.6,5.4 2.4,5.4',
  ',':'2,5.2 1.4,6.6',
  '-':'0.6,3.2 3.4,3.2',
  '/':'0.4,6 3.6,0',
  ':':'1.6,1.8 2.4,1.8|1.6,5.4 2.4,5.4',
  '!':'2,0 2,3.8|1.6,5.4 2.4,5.4',
  '?':'0,1 1,0 3,0 4,1 4,2 2,3.6 2,4.2|1.6,5.4 2.4,5.4',
  "'":'2,0 2,1.8',
  '&':'4,6 0.6,2.4 0.6,1 1.6,0 2.6,0 3.4,1 3.4,1.8 0,4.2 0,5 1,6 2.4,6 4,3.4',
  '+':'2,1.4 2,4.6|0.4,3 3.6,3'
};
const NARROW:Record<string,number> = {I:4,'.':2.4,',':2.4,':':2.4,'!':2.4,"'":2.4};
const TRACK=1.3,SPACE=2.6,CUT=.32,STROKE=1.05;
type Point=[number,number];

function unit(a:Point,b:Point):Point {
  const length=Math.hypot(b[0]-a[0],b[1]-a[1])||1;
  return [(b[0]-a[0])/length,(b[1]-a[1])/length];
}
const fixed=(n:number)=>Math.round(n*1000)/1000;

export function stencilPath(text:string):{d:string;width:number} {
  const segments:Point[][]=[];let x=0,first=true;
  for(const char of text.toUpperCase()){
    const glyph=GLYPHS[char];
    if(!first)x+=TRACK;
    first=false;
    if(!glyph){x+=SPACE;continue}
    const width=NARROW[char]??4,offset=width<4?-(4-width)/2:0;
    for(const stroke of glyph.split('|')){
      const points=stroke.trim().split(/\s+/).map(pair=>{
        const [a=0,b=0]=pair.split(',').map(Number);
        return [a+x+offset,b] as Point;
      });
      if(!points.length)continue;
      const closed=points.length>2&&points[0]![0]===points[points.length-1]![0]&&points[0]![1]===points[points.length-1]![1];
      const pieces:Point[][]=[];let current:Point[]=[points[0]!];
      for(let i=1;i<points.length;i++){
        current.push(points[i]!);
        if(i<points.length-1){
          const u=unit(points[i-1]!,points[i]!),v=unit(points[i]!,points[i+1]!);
          if(u[0]*v[0]+u[1]*v[1]<.34){
            pieces.push(current);current=[points[i]!];
          }
        }
      }
      pieces.push(current);
      pieces.forEach((piece,k)=>{
        const part=piece.map(p=>[...p] as Point);
        const cutHead=k>0||closed;
        const cutTail=k<pieces.length-1||closed;
        if(part.length>=2){
          if(cutHead){const d=unit(part[0]!,part[1]!);part[0]=[part[0]![0]+d[0]*CUT,part[0]![1]+d[1]*CUT]}
          if(cutTail){
            const n=part.length,d=unit(part[n-2]!,part[n-1]!);
            part[n-1]=[part[n-1]![0]-d[0]*CUT,part[n-1]![1]-d[1]*CUT];
          }
        }
        segments.push(part);
      });
    }
    x+=width;
  }
  return {d:segments.map(points=>points.map(([a,b],i)=>(i?'L':'M')+fixed(a)+' '+fixed(b)).join('')).join(''),width:Math.max(x,1)};
}

export function StencilHeadline({
  lines, className='', children
}:{
  lines:string[];
  className?:string;
  children?:ReactNode;
}) {
  return <span aria-hidden="true" className={'stencil-headline '+className}>
    {lines.map((line,i)=>{
      const path=stencilPath(line);
      const half=STROKE/2;
      return <svg key={i} viewBox={[-half,-half,fixed(path.width+STROKE),6+STROKE].join(' ')} preserveAspectRatio="xMinYMid meet" focusable="false">
        <path d={path.d} fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="butt" strokeLinejoin="miter" />
      </svg>;
    })}
    {children}
  </span>;
}
