const user={id:'test-member',created_at:new Date().toISOString()};
export const supabase={auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getSession:async()=>({data:{session:{user}},error:null}),getUser:async()=>({data:{user},error:null})}};
let drafts:any[]=[];
export async function loadBusinessTools(){return {profile:{id:user.id,name:'Test Member',company:'Example Company',title:'Founder',what_i_do:'CRM planning'},drafts:[...drafts],aiAvailable:false,storageError:null};}
export async function refineBusinessTool(){throw Error('AI is not configured');}
export async function saveBusinessTool({data}:any){if((window as any).failSave)throw Error('Save failed; your work is still here.');const row={...data,id:data.id||'draft-1',tool_id:data.toolId,version:(data.version||0)+1,updated_at:new Date().toISOString()};drafts=[row,...drafts.filter(d=>d.id!==row.id)];return row;}
export async function deleteBusinessTool({data}:any){drafts=drafts.filter(d=>d.id!==data.id);return {deleted:true};}

export async function speakWithIntrosVoice(){throw Error('No live speech in tests');}
