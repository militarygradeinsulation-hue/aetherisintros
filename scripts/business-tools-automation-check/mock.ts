export const supabase={auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getSession:async()=>({data:{session:{user:{id:'test-user'}}}})}};
export async function loadBusinessTools(){return {profile:{name:'Test Member'},drafts:[],aiAvailable:true,imageAvailable:true,storageError:null};}
export async function refineBusinessTool({data}:any){if((window as any).failGeneration)throw Error('Capture blocked. Existing work preserved.');return {output:data.toolId==='website-scanner'?'Captured https://company.com/\nSource evidence and capture scope':'Finished sales script for your offer'};}
export async function createBusinessImage(){if((window as any).failGeneration)throw Error('Image provider unavailable');return {image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII='};}
export async function saveBusinessTool({data}:any){return {...data,id:crypto.randomUUID(),tool_id:data.toolId,version:1,updated_at:new Date().toISOString()};}
export async function deliverBusinessTool({data}:any){(window as any).deliveries??=[];if((window as any).failDelivery)throw Error('Delivery unavailable. Retry this action.');(window as any).deliveries.push(data);return {id:data.id,destination:data.destination};}
export async function deleteBusinessTool(){throw Error('No production writes in browser check');}

export const networkValue=async()=>({benchmarks:[],cohort:null});
