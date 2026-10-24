import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ current: {} as any }));
vi.mock('../crm/store', () => ({ useOps: () => state.current }));
import { CrmOpportunityReadiness } from './CrmOpportunityReadiness';
const render = () => renderToStaticMarkup(<CrmOpportunityReadiness opportunityId="opp-a"/>);
describe('private CRM evidence boundary', () => {
  beforeEach(() => { state.current = { ready:true,signedIn:true,
    opportunities:[{id:'opp-a',personId:'person-a',detail:'Recorded need',source:'Reviewed meeting',expectedClose:null,nextAction:'Clarify timing'}],
    people:[{id:'person-a',fullName:'Contact A',title:'Operator',companyName:'Company A'}],
    activities:[{opportunityId:'opp-a',kind:'meeting',subject:'Permitted context'},{opportunityId:'other',kind:'note',subject:'UNRELATED PRIVATE DETAIL'}],
  }; });
  it('shows only the selected canonical evidence and starts without a score', () => {
    const html=render(); expect(html).toContain('Recorded need');expect(html).toContain('Contact A');
    expect(html).toContain('Permitted context');expect(html).not.toContain('UNRELATED PRIVATE DETAIL');
    expect(html).toContain('Matching consent is not granted');expect(html).not.toContain('type="number"');
  });
  it('does not show evidence while signed out or loading', () => {
    state.current.signedIn=false;expect(render()).toBe('');
    state.current.signedIn=true;state.current.ready=false;expect(render()).toBe('');
  });
  it('does not fabricate missing or archived opportunities', () => {
    state.current.opportunities=[];expect(render()).toBe('');
    state.current.opportunities=[{id:'opp-a',archived:true}];expect(render()).toBe('');
  });
  it('keeps an inaccessible linked contact unknown', () => {
    state.current.people=[];expect(render()).toContain('No accessible linked contact');expect(render()).not.toContain('Contact A');
  });
});
