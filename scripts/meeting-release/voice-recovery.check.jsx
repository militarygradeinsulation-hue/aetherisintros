import React from 'react'
import {create,act} from 'react-test-renderer'
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest'
const mocks=vi.hoisted(()=>({recorders:[]}))
vi.mock('@/lib/voice.functions',()=>({speakWithIntrosVoice:vi.fn()}))
vi.mock('../../src/aetheris/meeting-recorder',()=>({recordingSupported:()=>true,ClipRecorder:class {
 constructor(stream,onClip){this.onClip=onClip;this.stop=vi.fn(()=>Promise.resolve());this.start=vi.fn();mocks.recorders.push(this)}
}}))
import {useDictation} from '../../src/aetheris/voice'
let current,root,instance,track,getMicrophone
function Harness({onFinal=()=>{},transcribe}){current=useDictation({onFinal,keepOpen:true,transcribe});return null}
beforeEach(()=>{
 vi.useFakeTimers();mocks.recorders.length=0
 track={stop:vi.fn()};getMicrophone=vi.fn(async()=>({getTracks:()=>[track]}))
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
 vi.stubGlobal('navigator',{language:'en-US',mediaDevices:{getUserMedia:getMicrophone}})
 vi.stubGlobal('window',{localStorage:{getItem:()=>null},SpeechRecognition:class{constructor(){instance=this;this.start=vi.fn();this.stop=vi.fn();this.abort=vi.fn()}}})
})
afterEach(async()=>{if(root)await act(async()=>root.unmount());root=null;vi.useRealTimers();vi.unstubAllGlobals()})
describe('voice recovery',()=>{
 it('treats silence as a normal pause and restarts without the generic error',async()=>{
  await act(async()=>{root=create(<Harness/>)});await act(async()=>current.start())
  await act(async()=>{instance.onerror({error:'no-speech'});instance.onend();vi.advanceTimersByTime(250)})
  expect(current.error).toBe('');expect(instance.start).toHaveBeenCalledTimes(2)
 })
 it('uses server transcription when browser speech loses its network and releases the mic',async()=>{
  const final=vi.fn(),transcribe=vi.fn(async()=> 'Find my meetings')
  await act(async()=>{root=create(<Harness onFinal={final} transcribe={transcribe}/>)});await act(async()=>current.start())
  await act(async()=>instance.onerror({error:'network'}))
  expect(getMicrophone).toHaveBeenCalledTimes(1);expect(mocks.recorders[0].start).toHaveBeenCalledTimes(1)
  await act(async()=>mocks.recorders[0].onClip({blob:new Blob(['voice']),mimeType:'audio/webm;codecs=opus'}))
  expect(final).toHaveBeenCalledWith('Find my meetings')
  await act(async()=>current.stop());expect(track.stop).toHaveBeenCalled();expect(current.listening).toBe(false)
 })
 it('does not retry or bypass microphone denial',async()=>{
  await act(async()=>{root=create(<Harness transcribe={async()=>''}/>)});await act(async()=>current.start())
  await act(async()=>instance.onerror({error:'not-allowed'}))
  expect(current.error).toContain('permission was denied');expect(getMicrophone).not.toHaveBeenCalled()
 })
 it('drops an in-flight transcription after stopping',async()=>{
  let resolve;const final=vi.fn(),transcribe=()=>new Promise(r=>{resolve=r})
  await act(async()=>{root=create(<Harness onFinal={final} transcribe={transcribe}/>)});await act(async()=>current.start());await act(async()=>instance.onerror({error:'network'}))
  await act(async()=>mocks.recorders[0].onClip({blob:new Blob(['voice']),mimeType:'audio/webm'}))
  await act(async()=>current.stop());await act(async()=>resolve('Old account speech'))
  expect(final).not.toHaveBeenCalled()
 })
})
