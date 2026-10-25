import { useEffect, useRef, useState } from 'react';
import { loadCommonsDigest } from '@/lib/commonsDigest.functions';
import type { Digest } from './digest';
import { isShowcase } from '@/aetheris/showcase';
import { supabase } from '@/integrations/supabase/client';
export function WeeklyDigest(){
 const revision=useRef(0);
 const [digest,setDigest]=useState<Digest|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 useEffect(()=>{const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{revision.current++;setDigest(null);setError('');setLoading(false);});return()=>{revision.current++;subscription.unsubscribe();};},[]);
 const load=async()=>{const requested=++revision.current;setLoading(true);setError('');try{const result=await loadCommonsDigest();if(requested!==revision.current)return;setDigest(result);}catch(e){if(requested!==revision.current)return;setError(e instanceof Error?e.message:'Your digest could not be loaded.');}finally{if(requested===revision.current)setLoading(false);}};
 return <section className="business-tools"><small>ASK INTROS · WEEKLY DIGEST</small><h2>Your week, in five minutes.</h2><p>Updates from people you follow, using posts visible to your account from the last seven days.</p>{isShowcase()?<p><a href="/auth">Sign in to read your own network digest.</a></p>:<button disabled={loading} onClick={()=>void load()}>{loading?'Loading…':digest?'Refresh digest':'Read my weekly digest'}</button>}{error&&<p role="alert">{error}</p>}{digest&&<><p>{new Date(digest.from).toLocaleDateString()} to {new Date(digest.to).toLocaleDateString()}</p>{digest.isEmpty?<p>A quiet week. No visible updates from the people you follow in this window.</p>:<div className="bt-saved">{digest.people.map(post=><article key={post.id}><strong>{post.authorName}</strong><p>{post.summary}</p><small>{new Date(post.createdAt).toLocaleDateString()}</small></article>)}</div>}</>}</section>;
}
