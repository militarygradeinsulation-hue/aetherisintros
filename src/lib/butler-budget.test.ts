import {describe,expect,it} from 'vitest';
import {boundedSetting,createButlerBudget,ButlerBudgetExceeded} from './butler-budget';
describe('shared Butler runtime resource budget',()=>{
  it('bounds settings and keeps reasonable defaults for invalid configuration',()=>{
    expect(boundedSetting(undefined,8,2,8)).toBe(8);
    expect(boundedSetting('100',8,2,8)).toBe(8);
    expect(boundedSetting('1',8,2,8)).toBe(2);
    expect(boundedSetting('2.2',8,2,8)).toBe(8);
  });
  it('counts attempts across fallback providers and refuses work beyond the limit',()=>{
    const budget=createButlerBudget(2,2);
    budget.beforeProviderRequest();budget.beforeProviderRequest();
    expect(()=>budget.beforeProviderRequest()).toThrow(ButlerBudgetExceeded);
    expect([budget.reserveTool(),budget.reserveTool(),budget.reserveTool()]).toEqual([true,true,false]);
    expect(budget.usage()).toMatchObject({providerRequests:2,toolReads:2,blockedToolReads:1});
    expect(createButlerBudget(2,2).usage().providerRequests).toBe(0);
  });
});
