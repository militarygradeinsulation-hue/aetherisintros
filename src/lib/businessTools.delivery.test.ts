import {describe,it,expect} from 'vitest';
import {deliverBusinessContent} from './businessTools.delivery';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',draftId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const request={id,draftId,version:1,destination:'post',approved:true};
function database(){
 const records:Record<'business_tool_drafts'|'posts'|'calendar_events',any[]>={business_tool_drafts:[{id:draftId,user_id:'owner',version:1,title:'Reviewed',output:'Exact reviewed content'}],posts:[],calendar_events:[]};
 let fail=false;
 return {records,setFail:()=>{fail=true;},from(table:'business_tool_drafts'|'posts'|'calendar_events'){let filters:any[]=[];let inserted:any;return {select(){return this;},eq(k:string,v:any){filters.push([k,v]);return this;},insert(row:any){inserted=row;return this;},async maybeSingle(){if(inserted){if(fail)return {error:{message:'denied'}};records[table].push(inserted);return {data:inserted};}return {data:records[table].find(r=>filters.every(([k,v])=>r[k]===v))??null};}};}};
}
describe('reviewed business content delivery',()=>{
 it('requires explicit approval before any database operation',async()=>{await expect(deliverBusinessContent(null,'owner',{...request,approved:false})).rejects.toThrow();});
 it('rejects another member’s draft and stale versions',async()=>{const db=database();await expect(deliverBusinessContent(db,'other',request)).rejects.toThrow('Reopen');await expect(deliverBusinessContent(db,'owner',{...request,version:2})).rejects.toThrow('Reopen');expect(db.records.posts).toHaveLength(0);});
 it('posts exact saved content as the authenticated member once on retry',async()=>{const db=database();await deliverBusinessContent(db,'owner',request);await deliverBusinessContent(db,'owner',request);expect(db.records.posts).toHaveLength(1);expect(db.records.posts[0]).toMatchObject({author_id:'owner',text:'Exact reviewed content',visibility:'network',is_demo:false});expect(db.records.business_tool_drafts).toHaveLength(1);});
 it('adds content only to the owner calendar with explicit times',async()=>{const db=database();await deliverBusinessContent(db,'owner',{...request,destination:'calendar',startsAt:'2026-11-01T14:00:00.000Z',endsAt:'2026-11-01T14:30:00.000Z'});expect(db.records.calendar_events[0]).toMatchObject({user_id:'owner',notes:'Exact reviewed content',kind:'personal'});expect(db.records.posts).toHaveLength(0);});
 it('rejects reversed calendar times and oversized posts',async()=>{const db=database();await expect(deliverBusinessContent(db,'owner',{...request,destination:'calendar',startsAt:'2026-11-01T15:00:00.000Z',endsAt:'2026-11-01T14:30:00.000Z'})).rejects.toThrow();db.records.business_tool_drafts[0].output='x'.repeat(10001);await expect(deliverBusinessContent(db,'owner',request)).rejects.toThrow('10,000');});
 it('preserves saved content and reports a denied insert',async()=>{const db=database();db.setFail();await expect(deliverBusinessContent(db,'owner',request)).rejects.toThrow('Could not confirm');expect(db.records.business_tool_drafts).toHaveLength(1);expect(db.records.posts).toHaveLength(0);});
});
