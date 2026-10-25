import { useState } from 'react';
import type { Post } from './social';
import './post-owner-actions.css';
export function PostOwnerActions({post,onEdit,onDelete}:{post:Post;onEdit:(text:string,detail:string)=>Promise<void>;onDelete:()=>Promise<void>}){
 const [editing,setEditing]=useState(false),[confirming,setConfirming]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [text,setText]=useState(post.text),[detail,setDetail]=useState(post.detail);
 if(post.memberId!=='me')return null;
 const save=async()=>{setBusy(true);setError('');try{await onEdit(text.trim(),detail.trim());setEditing(false);setNotice('Post updated.');}catch(e){setError(e instanceof Error?e.message:'The post was not saved. Your edits are still here.');}finally{setBusy(false);}};
 const remove=async()=>{setBusy(true);setError('');try{await onDelete();}catch(e){setError(e instanceof Error?e.message:'The post was not deleted. Please retry.');setBusy(false);}};
 return <section className="post-owner-actions" aria-label="Manage your post">
 {!editing&&!confirming&&<div><button type="button" onClick={()=>{setText(post.text);setDetail(post.detail);setEditing(true);setError('');setNotice('');}}>Edit post</button><button type="button" onClick={()=>{setConfirming(true);setError('');setNotice('');}}>Delete post</button></div>}
 {editing&&<form onSubmit={e=>{e.preventDefault();void save();}}><label>Post text<textarea aria-label="Post text" required maxLength={5000} disabled={busy} value={text} onChange={e=>setText(e.target.value)}/></label><label>Details<textarea aria-label="Details" maxLength={20000} disabled={busy} value={detail} onChange={e=>setDetail(e.target.value)}/></label><p>Existing photos, attachments, and audience stay unchanged.</p><div><button type="submit" disabled={busy||!text.trim()}>{busy?'Saving…':'Save changes'}</button><button type="button" disabled={busy} onClick={()=>{setEditing(false);setError('');}}>Cancel</button></div></form>}
 {confirming&&<div role="group" aria-label="Confirm post deletion"><p>Delete this post? It will be removed from your feed and cannot be restored here.</p><button type="button" disabled={busy} onClick={()=>void remove()}>{busy?'Deleting…':'Delete permanently'}</button><button type="button" disabled={busy} onClick={()=>{setConfirming(false);setError('');}}>Keep post</button></div>}
 {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 </section>;
}
