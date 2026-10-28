import { describe, expect, it } from 'vitest'
import { uploadedContactsNeedingResearch } from '../crm/BulkContactWebLookup'
describe('uploaded contacts research queue',()=>{
  it('only queues uploaded contacts with missing fields',()=>{
    const c=(id:string,source:string,email:string,phone:string,title:string)=>({id,source,email,phone,title})
    expect(uploadedContactsNeedingResearch([
      c('a','Import · file.csv','','',''),c('b','Added in People','','',''),
      c('c','Import · file.csv','a@b.com','555-0100','CEO'),
      c('d','Import · file.csv','a@b.com','','CEO'),
    ]).map(x=>x.id)).toEqual(['a','d'])
  })
})
