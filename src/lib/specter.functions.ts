import { createServerFn } from '@tanstack/react-start';
import { requireAuthContract } from './auth-gate';
import { createRateLimiter } from '@/aetheris/linkedin-import';
import { publicTarget, type Investigation } from '@/features/specter-detect/investigation';

const allowScan = createRateLimiter(6, 10 * 60_000);
export const scanSpecterWebsite = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: { url: string }) => ({ url: publicTarget(typeof data?.url === 'string' ? data.url : '') }))
  .handler(async ({ data, context }): Promise<Investigation> => {
    const { userId } = context as unknown as { userId: string };
    if (!allowScan(userId)) throw new Error('Scan limit reached. Please try again in a few minutes.');
    const { captureSpecterWebsite } = await import('./specter.server');
    return captureSpecterWebsite(data.url);
  });
