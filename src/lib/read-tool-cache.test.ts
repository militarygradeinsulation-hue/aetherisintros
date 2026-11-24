import { describe, expect, it, vi } from 'vitest';
import { memoizeReadTools } from './read-tool-cache.server';
describe('assistant read cache',()=>{
  it('deduplicates identical reads in one turn but never across turns',async()=>{
    const execute=vi.fn(async()=>({records:[1]}));
    const definition={name:'read_workspace',description:'read',parameters:{},execute};
    const [tool]=memoizeReadTools([definition]);
    await Promise.all([tool!.execute({a:1,b:2}),tool!.execute({b:2,a:1})]);
    expect(execute).toHaveBeenCalledTimes(1);
    await memoizeReadTools([definition])[0]!.execute({a:1,b:2});
    expect(execute).toHaveBeenCalledTimes(2);
  });
  it('does not cache failed reads',async()=>{
    const execute=vi.fn(async()=>({error:'unavailable'}));
    const [tool]=memoizeReadTools([{name:'read_workspace',description:'read',parameters:{},execute}]);
    await tool!.execute({}); await tool!.execute({});
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
