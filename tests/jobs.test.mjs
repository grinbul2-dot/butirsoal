import test from 'node:test';
import assert from 'node:assert/strict';
import {memoryStore} from '../dev-store.mjs';
import {startJob,runJob,publicJob,JOB_LIMIT,JOB_TTL} from '../netlify/functions/lib/jobs.mjs';
import {createJobsHandler} from '../netlify/functions/jobs.mjs';
const id=()=>Date.now()+'-'+'a'.repeat(64);
const input={blueprint:{type:'PG',genre:'Narrative',barrett:'Literal Comprehension',kisi:'Identify the character',bloom:'C2 — Understand',cefr:'A2'},grade:7,stimuli:['Rina helped a woman.'],question:'Who helped the woman? A. Rina B. Dina'};
test('job survives detached connection, authenticates worker and executes duplicate deliveries once',async()=>{
 const store=memoryStore(),jobId=id();let dispatch,calls=0,finish;
 const gate=new Promise(resolve=>finish=resolve);
 const args={store,id:jobId,kind:'analyze',payload:input,dispatch:async data=>{dispatch=data;}};
 assert.equal((await startJob(args)).state,'queued');
 await startJob(args);
 await runJob({...dispatch,secret:'0'.repeat(64)},{store,execute:()=>{throw new Error('must not call');}});
 assert.equal((await store.get(jobId)).state,'queued');
 const execute=async(event,progress,signal,options)=>{calls++;assert.equal(signal,undefined);assert.equal(options.budgetMs,180000);assert.equal(options.reserveFallback,true);progress('Mencoba cadangan…');await gate;return {statusCode:200,body:JSON.stringify({result:{complete:true}})};};
 const worker=runJob(dispatch,{store,execute});
 await new Promise(resolve=>setImmediate(resolve));
 await runJob(dispatch,{store,execute});assert.equal(calls,1);
 assert.equal(publicJob(await store.get(jobId)).state,'running');
 finish();await worker;
 const job=await store.get(jobId);assert.equal(publicJob(job).data.result.complete,true);assert.equal(job.payload,undefined);assert.equal(job.secret,undefined);
 assert.equal((await startJob(args)).state,'done');assert.equal(calls,1);
 await assert.rejects(startJob({...args,payload:{...input,question:'Different'}}),/JOB_CONFLICT/);
});
test('worker persists terminal provider error and stale jobs provide bounded recovery',async()=>{
 const store=memoryStore();let data;const jobId=id();
 await startJob({store,id:jobId,kind:'analyze',payload:input,dispatch:async x=>{data=x;}});
 await runJob(data,{store,execute:async()=>({statusCode:429,body:JSON.stringify({error:'Kuota tercapai [UPSTREAM_429]'})})});
 const job=await store.get(jobId);assert.equal(job.state,'error');assert.match(publicJob(job).error,/UPSTREAM_429/);
 assert.match(publicJob({state:'running',createdAt:0},JOB_LIMIT+1).error,/JOB_STALLED/);
});
test('jobs API validates, hides private data and reports missing store/worker clearly',async()=>{
 const old=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='test';
 try{
  const store=memoryStore();let dispatched;
  const handler=createJobsHandler({store,dispatch:async data=>{dispatched=data;}});
  const request=body=>new Request('https://example.test/.netlify/functions/jobs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await handler(request({id:'bad',action:'start'}))).status,400);
  const jobId=id();const started=await handler(request({action:'start',id:jobId,kind:'analyze',payload:input}));assert.equal(started.status,202);assert.ok(dispatched.secret);
  const status=await handler(request({action:'status',id:jobId}));const json=await status.json();assert.equal(json.state,'queued');assert.equal(json.payload,undefined);assert.equal(json.secret,undefined);
  const missingStore=createJobsHandler({store:{get:async()=>{throw Error('secret config');}}});
  assert.match((await (await missingStore(request({action:'status',id:jobId}))).json()).error,/JOB_STORAGE/);
  const failedDispatch=createJobsHandler({store,dispatch:async()=>{throw Error('JOB_DISPATCH');}});
  assert.match((await (await failedDispatch(request({action:'start',id:jobId,kind:'analyze',payload:input}))).json()).error,/JOB_DISPATCH/);
  const expired=(Date.now()-JOB_TTL-1)+'-'+'b'.repeat(64);assert.equal((await handler(request({action:'status',id:expired}))).status,410);
 }finally{if(old)process.env.GEMINI_API_KEY=old;else delete process.env.GEMINI_API_KEY;}
});
test('forget deletes running job and late worker cannot recreate its data',async()=>{
 const store=memoryStore();let dispatched,finish;const gate=new Promise(r=>finish=r),jobId=id();
 await startJob({store,id:jobId,kind:'analyze',payload:input,dispatch:async x=>{dispatched=x;}});
 const worker=runJob(dispatched,{store,execute:async(_event,progress)=>{await gate;progress('Late progress');return {statusCode:200,body:JSON.stringify({result:{complete:true}})};}});
 await new Promise(r=>setImmediate(r));
 const handler=createJobsHandler({store});
 const response=await handler(new Request('https://example.test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'forget',id:jobId})}));
 assert.equal(response.status,200);finish();await worker;assert.equal(await store.get(jobId),null);
});
