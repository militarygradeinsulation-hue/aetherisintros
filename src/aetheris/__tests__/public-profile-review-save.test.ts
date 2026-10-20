import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({getUser:vi.fn(),from:vi.fn(),read:vi.fn(),update:vi.fn(),eq:vi.fn(),is:vi.fn(),receipt:vi.fn()}))
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:mocks.getUser},from:mocks.from}}))
import { loadPublicReviewContext, savePublicReview, type PublicReviewContext } from '../public-profile-review-save'
const context:PublicReviewContext={userId:'member-a',baseline:{name:'Member',title:'Old title',company:null,location:null,thesis:'Headline',what_i_do:null}}
beforeEach(()=>{
 vi.resetAllMocks()
 mocks.getUser.mockResolvedValue({data:{user:{id:'member-a'}},error:null})
 mocks.read.mockResolvedValue({data:context.baseline,error:null})
 mocks.receipt.mockResolvedValue({data:{id:'member-a'},error:null})
 const write={eq:mocks.eq,is:mocks.is,select:()=>write,maybeSingle:mocks.receipt}
 mocks.eq.mockReturnValue(write);mocks.is.mockReturnValue(write);mocks.update.mockReturnValue(write)
 mocks.from.mockReturnValue({select:()=>({eq:()=>({maybeSingle:mocks.read})}),update:mocks.update})
})
describe('own public suggestion review persistence',()=>{
 it('loads a saved profile without writing',async()=>{
  expect(await loadPublicReviewContext()).toEqual(context)
  expect(mocks.update).not.toHaveBeenCalled()
 })
 it('writes only supported reviewed fields with account and search-input guards',async()=>{
  await savePublicReview(context,{company:'Reviewed company',about:'Reviewed about'})
  expect(mocks.update).toHaveBeenCalledWith({company:'Reviewed company',what_i_do:'Reviewed about'})
  expect(mocks.eq).toHaveBeenCalledWith('id','member-a')
  expect(mocks.eq).toHaveBeenCalledWith('name','Member');expect(mocks.eq).toHaveBeenCalledWith('thesis','Headline')
  expect(mocks.is).toHaveBeenCalledWith('company',null);expect(mocks.is).toHaveBeenCalledWith('what_i_do',null)
 })
 it('refuses stale accounts, unsupported fields and empty selections without writes',async()=>{
  for(const patch of [{},{name:'Other person'},{focus:'Unsupported'}]) await expect(savePublicReview(context,patch)).rejects.toThrow()
  mocks.getUser.mockResolvedValue({data:{user:{id:'member-b'}},error:null})
  await expect(savePublicReview(context,{title:'Title'})).rejects.toThrow('account changed')
  expect(mocks.update).not.toHaveBeenCalled()
 })
 it('requires a matching saved row and exposes no private database errors',async()=>{
  for(const data of [null,{id:'member-b'}]){
   mocks.receipt.mockResolvedValue({data,error:null})
   await expect(savePublicReview(context,{title:'Title'})).rejects.toThrow('protect your edits')
  }
  mocks.receipt.mockResolvedValue({data:null,error:{message:'private SQL error'}})
  await expect(savePublicReview(context,{title:'Title'})).rejects.toThrow('could not be saved')
 })
})
