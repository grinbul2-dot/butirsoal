import test from 'node:test';
import assert from 'node:assert/strict';
import {generateWithRecovery} from '../netlify/functions/lib/recovery.mjs';
import {endpoint,reply} from '../netlify/functions/lib/transport.mjs';
const ok=value=>({ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(value)}]}}]})});
async function scenario(sequence,options={}){
 const old={...process.env};process.env.GEMINI_API_KEY='test-key';process.env.GEMINI_MODEL='primary';process.env.GEMINI_FALLBACK_MODEL='backup';
 let time=0;const calls=[],delays=[],messages=[];
 try{
  const run=()=>generateWithRecovery({body:{},validate:x=>x,onProgress:x=>messages.push(x),...options},{now:()=>time,sleep:async ms=>{delays.push(ms);time+=ms;},fetch:async(url,opts)=>{calls.push(url);const next=sequence[Math.min(calls.length-1,sequence.length-1)];if(next instanceof Error)throw next;if(typeof next==='function')return next({advance:ms=>time+=ms,opts});return next;}});
  let result,error;try{result=await run();}catch(e){error=e;}
  return {result,error,calls,delays,messages};
 }finally{for(const name of ['GEMINI_API_KEY','GEMINI_MODEL','GEMINI_FALLBACK_MODEL']){if(old[name]===undefined)delete process.env[name];else process.env[name]=old[name];}}
}
test('transient failures retry with 1s 2s 4s before fallback',async()=>{
 const r=await scenario([{ok:false,status:503},{ok:false,status:503},new TypeError('network'),{ok:false,status:500},ok({done:true})]);
 assert.equal(r.result.done,true);assert.deepEqual(r.delays,[1000,2000,4000]);assert.equal(r.calls.length,5);assert.match(r.calls[4],/backup/);assert.match(r.messages[0],/mencoba ulang otomatis/);assert.match(r.messages[3],/cadangan/);assert.ok(!r.messages.join().includes('primary'));
});
test('successful retry stops calls and permanent errors do not retry',async()=>{
 const r=await scenario([{ok:false,status:503},ok({done:true})]);assert.equal(r.calls.length,2);assert.deepEqual(r.delays,[1000]);
 for(const status of [400,401,403]){const x=await scenario([{ok:false,status}]);assert.equal(x.calls.length,1);assert.equal(x.error.status,503);}
});
test('exhaustion is bounded, Retry-After respected, unavailable model falls back directly',async()=>{
 const r=await scenario([{ok:false,status:429}]);assert.equal(r.calls.length,5);assert.match(r.calls[1],/backup/);assert.deepEqual(r.delays,[1000,2000,4000]);assert.equal(r.error.status,429);
 const x=await scenario([{ok:false,status:503,headers:new Headers({'Retry-After':'3'})},ok({})]);assert.deepEqual(x.delays,[3000]);
 const y=await scenario([{ok:false,status:404},ok({})]);assert.equal(y.calls.length,2);assert.deepEqual(y.delays,[]);
});
test('25-second budget stops requests before platform timeout',async()=>{
 const r=await scenario([({advance})=>{advance(24500);return {ok:false,status:503};},ok({done:true})]);assert.equal(r.calls.length,1);assert.deepEqual(r.delays,[]);assert.ok(r.error);
});
test('rejected images and safety blocks are not retried; malformed output is',async()=>{
 const r=await scenario([ok({accepted:false,reason:'buram'})]);assert.equal(r.calls.length,1);assert.equal(r.result.accepted,false);
 const x=await scenario([{ok:true,json:async()=>({candidates:[{finishReason:'SAFETY'}]})}]);assert.equal(x.calls.length,1);assert.equal(x.error.status,422);
 const y=await scenario([{ok:true,json:async()=>{throw new SyntaxError('bad');}},ok({})]);assert.equal(y.calls.length,2);
 const controller=new AbortController();controller.abort();const z=await scenario([ok({})],{signal:controller.signal});assert.equal(z.calls.length,0);
});
test('endpoint waits for complete JSON even for an old streaming client',async()=>{
 let finish;const gate=new Promise(resolve=>finish=resolve);let returned=false;
 const fn=endpoint(async(_event,progress)=>{progress('Mencoba ulang');await gate;return reply(200,{result:{done:true}});});
 const pending=fn(new Request('https://example.test',{headers:{Accept:'application/x-ndjson'}})).then(r=>{returned=true;return r;});
 await Promise.resolve();assert.equal(returned,false);finish();
 const response=await pending;assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/application\/json/);assert.equal((await response.json()).result.done,true);
 const error=await endpoint(async()=>reply(503,{error:'Konfigurasi belum lengkap'}))(new Request('https://example.test'));assert.equal(error.status,503);assert.equal((await error.json()).error,'Konfigurasi belum lengkap');
});
test('background budget reserves fallback after a slow primary without the 25s cutoff',async()=>{
 const old={...process.env};process.env.GEMINI_API_KEY='test';process.env.GEMINI_MODEL='primary';process.env.GEMINI_FALLBACK_MODEL='backup';
 let time=0,timer,calls=0;const deadlines=[];
 try{
  const result=await generateWithRecovery({body:{},validate:x=>x,budgetMs:180000,attemptMs:80000,reserveFallback:true},{now:()=>time,setTimeout:(fn,ms)=>{timer=fn;deadlines.push(ms);return 1;},clearTimeout:()=>{},sleep:async()=>{throw new Error('timeout must go directly to fallback');},fetch:async(url,options)=>{
   calls++;if(calls===1){time+=80000;timer();assert.equal(options.signal.aborted,true);throw new Error('aborted');}
   assert.match(url,/backup/);time+=40000;return ok({done:true});
  }});
  assert.equal(result.done,true);assert.equal(calls,2);assert.deepEqual(deadlines,[80000,80000]);assert.equal(time,120000);
 }finally{for(const name of ['GEMINI_API_KEY','GEMINI_MODEL','GEMINI_FALLBACK_MODEL']){if(old[name]===undefined)delete process.env[name];else process.env[name]=old[name];}}
});
