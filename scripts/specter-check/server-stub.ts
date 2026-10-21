export async function scanSpecterWebsite({data}:{data:{url:string}}) {
  if (data.url.includes('blocked.com')) throw new Error('Website blocked capture');
  const name = data.url.includes('alpha.com') ? 'Alpha' : 'Beta';
  return {snapshot: {url:data.url,title:name,headings:[`${name} services`],links:[{text:`Contact ${name}`,href:`https://${name.toLowerCase()}.com/contact`}],capturedAt:new Date().toISOString()},description:`${name} captured description`,images:[],mode:'reader' as const};
}
