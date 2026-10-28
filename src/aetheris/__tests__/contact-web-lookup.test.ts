import { describe, expect, it } from 'vitest'
import {contactLookupIdentity,contactLookupQueries,identityWindows,validContactValue,extractContactQuotes,groundContactQuotes,stillMissingValues,type ContactLookupSource} from '../crm/contact-web-lookup'
const person=contactLookupIdentity('Jane Smith','Acme Widgets','Indiana')!
const source:ContactLookupSource={url:'https://acme.example/team',title:'Acme staff',text:'Jane Smith — Chief Operating Officer at Acme Widgets. Email jane.smith@acme.example. Direct phone +1 (317) 555-0102.'}
const fields=['email','phone','title'] as const

describe('source-backed contact lookup',()=>{
  it('requires identity and company/location; never transmits private phone/email',()=>{
    expect(contactLookupIdentity('Jane','','')).toBeNull()
    expect(contactLookupIdentity('Jane Smith','','')).toBeNull()
    expect(contactLookupQueries(person).join(' ')).not.toContain('jane.smith@')
  })
  it('filters unrelated and unsafe pages',()=>{
    expect(identityWindows({...source,url:'https://linkedin.com/in/janesmith'},person)).toEqual([])
    expect(identityWindows({...source,text:'Jane Smith at Other LLC. joe@other.com'},person)).toEqual([])
    expect(identityWindows({...source,url:'http://localhost/private'},person)).toEqual([])
  })
  it('extracts only published values with actual source quotes',()=>{
    const results=extractContactQuotes([source],person,fields,'2026-10-27T12:00:00Z')
    expect(results.map(x=>x.field).sort()).toEqual(['email','phone','title'])
    expect(results.find(x=>x.field==='title')?.value).toBe('Chief Operating Officer')
    expect(results.every(x=>x.quote.includes(x.value)&&x.sourceUrl===source.url)).toBe(true)
    expect(validContactValue('email','jane@gmail.com')).toBe(false)
  })
  it('rejects invented emails or false citations',()=>{
    const madeUp='{"suggestions":[{"field":"email","value":"fake@acme.example","quote":"Jane Smith fake@acme.example","source":1}]}'
    expect(groundContactQuotes(madeUp,[source],person,fields,'2026-10-27')).toEqual([])
  })
  it('accepts exact quotes but never overwrites an existing value',()=>{
    const exact='{"suggestions":[{"field":"email","value":"jane.smith@acme.example","quote":"Jane Smith — Chief Operating Officer at Acme Widgets. Email jane.smith@acme.example.","source":1}]}'
    const found=groundContactQuotes(exact,[source],person,fields,'2026-10-27')
    expect(found).toHaveLength(1)
    expect(stillMissingValues({email:'existing@acme.example',phone:'',title:''},found)).toEqual({})
  })
})
