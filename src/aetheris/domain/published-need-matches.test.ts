import { describe, expect, it } from 'vitest';
import type { NetworkAsk } from '../social';
import { findPublishedNeedMatches } from './published-need-matches';
const now=Date.parse('2026-11-24T12:00:00Z');
const ask=(id:string,overrides:Partial<NetworkAsk>={}):NetworkAsk=>({id,memberId:'member-'+id,ask:'Precision machining and titanium fixtures',detail:'Machining supplier',whyNow:'',offer:'',industry:'Manufacturing',location:'',urgency:'medium',posted:'Today',responses:0,visibility:'network',status:'open',...overrides});
const input={capabilities:['Precision machining','Titanium fixtures'],asks:[ask('valid')],connectedIds:['member-valid'],allowed:true};
describe('published need recommendations',()=>{
  it('requires permission and specific overlap from the actual published need',()=>{
    expect(findPublishedNeedMatches({...input,allowed:false},now)).toEqual([]);
    expect(findPublishedNeedMatches(input,now)[0]).toMatchObject({id:'valid',evidence:['fixtures','machining','precision','titanium'],directConnection:true});
    expect(findPublishedNeedMatches({...input,capabilities:['Business services help']},now)).toEqual([]);
  });
  it('excludes private, expired, invalid, self-authored and nonopen requests',()=>{
    expect(findPublishedNeedMatches({...input,asks:[
      ask('private',{visibility:'private'}),ask('expired',{expiresAt:'2026-11-23'}),ask('invalid',{expiresAt:'invalid'}),
      ask('own',{mine:true}),ask('closed',{status:'closed'}),(({status: _status, ...legacy}) => legacy)(ask('legacy')),
      ask('valid'),ask('valid')
    ]},now).map(x=>x.id)).toEqual(['valid']);
  });
  it('does not confuse industry or an offer with an actual need match',()=>{
    expect(findPublishedNeedMatches({...input,asks:[ask('wrong',{ask:'Looking for accounting support',detail:'Financial statements',industry:'Precision machining',offer:'Titanium fixtures'})]},now)).toEqual([]);
  });
});
