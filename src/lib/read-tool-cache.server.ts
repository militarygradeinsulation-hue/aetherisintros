import type { ToolDef } from './aiGateway.server';

/** Request-scoped only, for read-only tools. Successful identical reads can reuse
 * the same response during one assistant turn; errors stay retryable.
 */
export function memoizeReadTools(tools: ToolDef[]): ToolDef[] {
  const cache = new Map<string, Promise<unknown>>();
  return tools.map(tool => ({ ...tool, execute: async args => {
    const key = tool.name + ':' + JSON.stringify(Object.entries(args).sort(([a],[b]) => a.localeCompare(b)));
    const found = cache.get(key);
    if (found) return found;
    if (cache.size >= 24 || key.length > 4000) return tool.execute(args);
    const pending = Promise.resolve().then(() => tool.execute(args));
    cache.set(key,pending);
    try {
      const result = await pending;
      if (!result || (typeof result === 'object' && ('error' in result || 'note' in result))) cache.delete(key);
      return result;
    } catch (error) { cache.delete(key); throw error; }
  } }));
}
