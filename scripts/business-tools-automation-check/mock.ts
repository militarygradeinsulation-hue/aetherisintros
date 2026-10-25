export const supabase={auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getSession:async()=>({data:{session:{user:{id:'test-user'}}}})}};
export async function loadBusinessTools(){return {profile:{name:'Test Member'},drafts:[],aiAvailable:true,imageAvailable:true,storageError:null};}
export async function refineBusinessTool({data}:any){if((window as any).failGeneration)throw Error('Capture blocked. Existing work preserved.');return {output:data.toolId==='website-scanner'?'Captured https://company.com/\nSource evidence and capture scope':'Finished sales script for your offer'};}
export async function createBusinessImage(){if((window as any).failGeneration)throw Error('Image provider unavailable');return {image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII='};}
export async function saveBusinessTool(){throw Error('No production writes in browser check');}
export async function deleteBusinessTool(){throw Error('No production writes in browser check');}
