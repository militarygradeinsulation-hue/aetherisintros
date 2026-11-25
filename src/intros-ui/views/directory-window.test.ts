import { describe, expect, it } from 'vitest';
import { directoryWindow, DIRECTORY_PAGE_SIZE } from './directory-window';
describe('bounded directory pages', () => {
  it('keeps all records reachable in original rank order and bounds DOM rows', () => {
    const source = Array.from({length:101},(_,i)=>({id:i}));
    const pages = Array.from({length:directoryWindow(source,0).pages},(_,p)=>directoryWindow(source,p));
    expect(pages.every(p=>p.rows.length<=DIRECTORY_PAGE_SIZE)).toBe(true);
    expect(pages.flatMap(p=>p.rows)).toEqual(source);
  });
  it('clamps stale page indices and handles empty search results',()=>{
    expect(directoryWindow([1,2],999)).toMatchObject({page:0,start:0,end:2,rows:[1,2]});
    expect(directoryWindow([],NaN)).toMatchObject({page:0,pages:1,start:0,end:0,rows:[]});
  });
});
