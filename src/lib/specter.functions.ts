import { createServerFn } from '@tanstack/react-start';
import { requireAuthContract } from './auth-gate';
import { createRateLimiter } from '@/aetheris/linkedin-import';
import { publicTarget, type Investigation } from '@/features/specter-detect/investigation';

const recent = new Map<string,{at:number;value:Investigation}>();
const pending = new Map<string,Promise<Investigation>>();
const allowScan = createRateLimiter(6, 10 * 60_000);
export const scanSpecterWebsite = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: { url: string }) => ({ url: publicTarget(typeof data?.url === 'string' ? data.url : '') }))
  .handler(async ({ data, context }): Promise<Investigation> => {
    const { userId } = context as unknown as { userId: string };
    const key=userId+'|'+data.url;
    const cached=recent.get(key);
    if(cached&&Date.now()-cached.at<60_000)return cached.value;
    const running=pending.get(key);if(running)return running;
    if (!allowScan(userId)) throw new Error('Scan limit reached. Please try again in a few minutes.');
    const { captureSpecterWebsite } = await import('./specter.server');
    const request=captureSpecterWebsite(data.url).then(value=>{
      if(recent.size>=100)recent.delete(recent.keys().next().value!);
      recent.set(key,{at:Date.now(),value});return value;
    }).finally(()=>pending.delete(key));
    pending.set(key,request);return request;
  });
