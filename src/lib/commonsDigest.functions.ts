import { createServerFn } from '@tanstack/react-start';
import { requireAuthContract } from './auth-gate';
import { buildDigest, type DigestSourcePost } from '@/features/commons-trust/digest';
/** Only the caller's followed people and RLS-visible, non-demo posts. */
export const loadCommonsDigest=createServerFn({method:'GET'}).middleware([requireAuthContract]).handler(async({context})=>{
 const c=context as any;const to=new Date().toISOString(),from=new Date(Date.now()-7*86400000).toISOString();
 const {data:relationships,error:relationshipError}=await c.supabase.from('relationships').select('member_id').eq('user_id',c.userId).eq('kind','follow');
 if(relationshipError)throw new Error('Your followed people could not be loaded. Try again.');
 const ids=[...new Set((relationships??[]).map((r:any)=>r.member_id).filter((id:unknown)=>typeof id==='string'&&/^[0-9a-f-]{36}$/i.test(id as string)))].slice(0,500);
 if(!ids.length)return buildDigest({from,to,followedAuthorIds:[],circles:[],posts:[]});
 const {data:rows,error}=await c.supabase.from('posts').select('id,author_id,text,detail,created_at,kind').in('author_id',ids).eq('is_demo',false).eq('visibility','network').gte('created_at',from).lte('created_at',to).order('created_at',{ascending:false}).limit(200);
 if(error)throw new Error('Your weekly posts could not be loaded. Try again.');
 const {data:profiles,error:profileError}=await c.supabase.from('profiles').select('id,name').in('id',ids);
 if(profileError)throw new Error('Member names could not be loaded. Try again.');
 const names=new Map((profiles??[]).map((p:any)=>[p.id,p.name]));
 const posts:DigestSourcePost[]=(rows??[]).map((p:any)=>({id:p.id,authorId:p.author_id,authorName:String(names.get(p.author_id)||'Member'),circleId:null,kind:'note',summary:String(p.text||p.detail||'').slice(0,1000),createdAt:p.created_at}));
 return buildDigest({from,to,followedAuthorIds:ids as string[],circles:[],posts,maxPeople:8});
});
