const w=window as any
w.__identityUser='member-a';w.__identityProfile={id:'member-a',name:'Existing Name',email:null,avatar_url:null}
w.__identityWrites=[];w.__identityReceipts=[];w.__identityFailure=false;w.__delayIdentity=false
let listener: ((event:string)=>void)|undefined
w.__switchIdentity=(id:string)=>{w.__identityUser=id;w.__identityProfile={id,name:'Other account',email:null,avatar_url:null};listener?.('SIGNED_IN')}
const claims=()=>({name:'LinkedIn Name',email:'verified@example.test',email_verified:true,picture:'https://media.licdn.com/dms/image/example'})
export const supabase={auth:{
 getUser:async()=>({data:{user:{id:w.__identityUser,identities:[{provider:'linkedin_oidc',identity_data:claims()}]}},error:null}),
 onAuthStateChange:(callback:(event:string)=>void)=>{listener=callback;return {data:{subscription:{unsubscribe:()=>{listener=undefined}}}}},
},from:()=>({
 select:()=>({eq:()=>({maybeSingle:async()=>({data:{...w.__identityProfile},error:null})})}),
 update:(patch:Record<string,string>)=>{
  const guards: Array<[string,unknown]>=[]
  const query={eq:(key:string,value:unknown)=>{guards.push([key,value]);return query},is:(key:string,value:unknown)=>{guards.push([key,value]);return query},select:()=>query,maybeSingle:async()=>{
   if(w.__delayIdentity) await new Promise<void>(resolve=>{w.__releaseIdentity=resolve})
   if(w.__identityFailure)return {data:null,error:{message:'Fixture denial'}}
   if(guards.some(([key,value])=>w.__identityProfile[key]!==value))return {data:null,error:null}
   w.__identityProfile={...w.__identityProfile,...patch};w.__identityWrites.push({...patch});return {data:{...w.__identityProfile},error:null}
  }};return query
 },
})}
