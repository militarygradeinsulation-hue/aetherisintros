export async function scanSpecterWebsite({data}:{data:{url:string}}) {
  const hostname = new URL(data.url).hostname;
  if (hostname === 'blocked.com') throw new Error('Website blocked capture');
  const name = hostname === 'alpha.com' ? 'Alpha' : 'Beta';
  return {snapshot: {url:data.url,title:name,headings:[`${name} services`],links:[{text:`Contact ${name}`,href:`https://${name.toLowerCase()}.com/contact`}],capturedAt:new Date().toISOString()},description:`${name} captured description`,images:[{src:`https://${name.toLowerCase()}.com/house.jpg`,alt:`${name} house`}],mode:'reader' as const,previewUrl:`https://storage.googleapis.com/reader-6b7dc.appspot.com/screenshots/${name}`};
}
