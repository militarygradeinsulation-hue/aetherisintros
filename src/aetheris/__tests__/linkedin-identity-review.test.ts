import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({getUser:vi.fn(),from:vi.fn(),read:vi.fn(),update:vi.fn(),eq:vi.fn(),is:vi.fn(),receipt:vi.fn()}))
const db={auth:{getUser:mocks.getUser},from:mocks.from}
import { loadLinkedInIdentityDraft as load, saveLinkedInIdentityDraft as save } from '@/lib/linkedin-identity-review.server'
import type { LinkedInIdentityDraft } from '../linkedin-identity-review'
const loadLinkedInIdentityDraft=()=>load(db,'member-a')
const saveLinkedInIdentityDraft=(draft:LinkedInIdentityDraft,consent:Parameters<typeof save>[3])=>save(db,'member-a',draft,consent)
const suggestion={name:'LinkedIn Name',email:'verified@example.test',photoUrl:'https://media.licdn.com/dms/image/example'}
const current={name:'Existing Name',email:null,avatar_url:null}
const draft=():LinkedInIdentityDraft=>({userId:'member-a',suggestion:{...suggestion},current:{...current}})
const user=(id='member-a',changes={})=>({id,identities:[{provider:'linkedin_oidc',identity_data:{name:suggestion.name,email:suggestion.email,email_verified:true,picture:suggestion.photoUrl,...changes}}]})
beforeEach(()=>{
 vi.resetAllMocks()
 mocks.getUser.mockResolvedValue({data:{user:user()},error:null})
 mocks.read.mockResolvedValue({data:{...current},error:null})
 mocks.receipt.mockResolvedValue({data:{id:'member-a',name:suggestion.name,email:null,avatar_url:null},error:null})
 const write={eq:mocks.eq,is:mocks.is,select:()=>write,maybeSingle:mocks.receipt}
 mocks.eq.mockReturnValue(write);mocks.is.mockReturnValue(write);mocks.update.mockReturnValue(write)
 mocks.from.mockReturnValue({select:()=>({eq:()=>({maybeSingle:mocks.read})}),update:mocks.update})
})
describe('reviewed LinkedIn identity persistence',()=>{
 it('loads only the authenticated LinkedIn identity without writing',async()=>{
  expect(await loadLinkedInIdentityDraft()).toEqual(draft())
  expect(mocks.from).toHaveBeenCalledWith('profiles');expect(mocks.update).not.toHaveBeenCalled()
 })
 it('does not offer unverified email or another provider identity',async()=>{
  mocks.getUser.mockResolvedValue({data:{user:user('member-a',{email_verified:false})},error:null})
  expect((await loadLinkedInIdentityDraft())?.suggestion.email).toBe('')
  mocks.getUser.mockResolvedValue({data:{user:{id:'member-a',identities:[{provider:'google',identity_data:{name:'Other'}}]}},error:null})
  expect(await loadLinkedInIdentityDraft()).toBeNull()
 })
 it('requires field consent and writes only a selected name',async()=>{
  await expect(saveLinkedInIdentityDraft(draft(),{})).rejects.toThrow('Select at least')
  expect(mocks.update).not.toHaveBeenCalled()
  const result=await saveLinkedInIdentityDraft(draft(),{name:true})
  expect(mocks.update).toHaveBeenCalledWith({name:suggestion.name})
  expect(mocks.eq).toHaveBeenCalledWith('id','member-a')
  expect(mocks.eq).toHaveBeenCalledWith('name',current.name)
  expect(result.changed).toEqual(['name'])
 })
 it('atomically applies selected verified fields with optimistic null guards',async()=>{
  mocks.receipt.mockResolvedValue({data:{id:'member-a',name:suggestion.name,email:suggestion.email,avatar_url:suggestion.photoUrl},error:null})
  const result=await saveLinkedInIdentityDraft(draft(),{name:true,email:true,photoUrl:true})
  expect(mocks.update).toHaveBeenCalledWith({name:suggestion.name,email:suggestion.email,avatar_url:suggestion.photoUrl})
  expect(mocks.is).toHaveBeenCalledWith('email',null);expect(mocks.is).toHaveBeenCalledWith('avatar_url',null)
  expect(result.changed).toEqual(['name','email','avatar_url'])
 })
 it('refuses a changed account or changed provider claims',async()=>{
  mocks.getUser.mockResolvedValue({data:{user:user('member-b')},error:null})
  await expect(saveLinkedInIdentityDraft(draft(),{name:true})).rejects.toThrow('Sign in again')
  mocks.getUser.mockResolvedValue({data:{user:user('member-a',{name:'Changed provider name'})},error:null})
  await expect(saveLinkedInIdentityDraft(draft(),{name:true})).rejects.toThrow('LinkedIn details changed')
  expect(mocks.update).not.toHaveBeenCalled()
 })
 it('protects edits made while the review was open',async()=>{
  mocks.read.mockResolvedValue({data:{...current,name:'Newly edited name'},error:null})
  await expect(saveLinkedInIdentityDraft(draft(),{name:true})).rejects.toThrow('protect your edits')
  expect(mocks.update).not.toHaveBeenCalled()
 })
 it('requires the matching saved row and reports write failures',async()=>{
  for(const data of [null,{id:'member-b',name:'wrong',email:null,avatar_url:null}]){
   mocks.receipt.mockResolvedValue({data,error:null})
   await expect(saveLinkedInIdentityDraft(draft(),{name:true})).rejects.toThrow('changed before')
  }
  mocks.receipt.mockResolvedValue({data:null,error:{message:'private database detail'}})
  await expect(saveLinkedInIdentityDraft(draft(),{name:true})).rejects.toThrow('selections are kept')
 })
})
