import test from 'node:test';
import assert from 'node:assert/strict';
import {groqSchema,providerRequest} from '../netlify/functions/lib/providers.mjs';
import {analysisSchema,revisionSchema} from '../netlify/functions/lib/contract.mjs';
import {generateWithRecovery} from '../netlify/functions/lib/recovery.mjs';
import {createJobsHandler} from '../netlify/functions/jobs.mjs';
import {memoryStore} from '../dev-store.mjs';
const body={systemInstruction:{parts:[{text:'Return JSON.'}]},contents:[{role:'user',parts:[{text:'Example'}]}],generationConfig:{responseJsonSchema:analysisSchema,maxOutputTokens:7000}};
const response=value=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]})});
async function withKeys(fn){const names=['GROQ_API_KEY','GEMINI_API_KEY','GROQ_MODEL','GROQ_FALLBACK_MODEL'];const old=Object.fromEntries(names.map(n=>[n,process.env[n]]));for(const n of names)delete process.env[n];try{await fn();}finally{for(const n of names){if(old[n]===undefined)delete process.env[n];else process.env[n]=old[n];}}}
test('Groq schemas require every property, preserve enums and do not mutate shared schemas',()=>{
 for(const schema of [analysisSchema,revisionSchema]){
  const before=JSON.stringify(schema),strict=groqSchema(schema);
  const visit=s=>{if(s.type==='object'){assert.deepEqual(s.required,Object.keys(s.properties));assert.equal(s.additionalProperties,false);Object.values(s.properties).forEach(visit);}if(s.items)visit(s.items);};visit(strict);assert.equal(JSON.stringify(schema),before);
 }
 assert.deepEqual(groqSchema(analysisSchema).properties.categories.items.properties.id.enum,analysisSchema.properties.categories.items.properties.id.enum);
 const request=providerRequest('groq','qwen/qwen3.8-27b','secret',{...body,contents:[{role:'user',parts:[{text:'Read images'},{inlineData:{mimeType:'image/png',data:'one'}},{inlineData:{mimeType:'image/jpeg',data:'two'}}]}]});
 assert.deepEqual(request.body.messages[1].content.map(p=>p.type),['text','image_url','image_url']);assert.equal(request.body.messages[1].content[2].image_url.url,'data:image/jpeg;base64,two');
});
test('Groq retries Qwen only and ignores legacy GPT fallback settings',()=>withKeys(async()=>{
 process.env.GROQ_API_KEY='groq-test-secret';process.env.GROQ_FALLBACK_MODEL='openai/gpt-oss-20b';let calls=0;const delays=[];
 const result=await generateWithRecovery({provider:'groq',body,validate:x=>x},{fetch:async(url,options)=>{
  calls++;assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');assert.equal(options.headers.Authorization,'Bearer groq-test-secret');assert.equal(options.headers['x-goog-api-key'],undefined);
  const sent=JSON.parse(options.body);assert.equal(sent.response_format.json_schema.strict,true);assert.equal(sent.stream,false);assert.ok(!options.body.includes('groq-test-secret'));
  assert.equal(sent.model,'qwen/qwen3.8-27b');return calls===1?{ok:false,status:429}:response({done:true});
 },sleep:async ms=>delays.push(ms)});
 assert.equal(result.done,true);assert.equal(calls,2);assert.deepEqual(delays,[1000]);
}));
test('Groq truncation, refusal and missing key fail clearly without accepting partial output',()=>withKeys(async()=>{
 await assert.rejects(generateWithRecovery({provider:'groq',body,validate:x=>x}),/belum diaktifkan/);
 process.env.GROQ_API_KEY='test';
 for(const [choice,status] of [[{finish_reason:'length'},502],[{finish_reason:'stop',message:{refusal:'Refused'}},422]]){
  let calls=0;await assert.rejects(generateWithRecovery({provider:'groq',body,validate:x=>x},{fetch:async()=>{calls++;return {ok:true,json:async()=>({choices:[choice]})};}}),e=>e.status===status);assert.equal(calls,1);
 }
}));
test('text and image jobs both require only Gemini',()=>withKeys(async()=>{
 const handler=createJobsHandler({store:memoryStore(),dispatch:async()=>{}});
 const input={blueprint:{type:'PG',genre:'Narrative',barrett:'Literal Comprehension',kisi:'Find a detail',bloom:'C2 — Understand',cefr:'A2'},grade:null,stimuli:['Rina is kind.'],question:'Who is kind?'};
 const req=(kind,payload,char)=>new Request('https://example.test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'start',id:Date.now()+'-'+char.repeat(64),kind,payload})});
 process.env.GEMINI_API_KEY='gemini-test';assert.equal((await handler(req('analyze',input,'a'))).status,202);
 const image={images:[{mimeType:'image/jpeg',data:Buffer.from([255,216,255,0,0,0,0,0,0,0,0,0]).toString('base64')}]};
 assert.equal((await handler(req('read-image',image,'b'))).status,202);
 delete process.env.GEMINI_API_KEY;process.env.GROQ_API_KEY='groq-test';
 assert.match((await (await handler(req('read-image',image,'c'))).json()).error,/GEMINI_API_KEY/);
 assert.match((await (await handler(req('analyze',input,'d'))).json()).error,/GEMINI_API_KEY/);
}));
test('legacy non-Qwen main model is rejected before any request',()=>withKeys(async()=>{
 process.env.GROQ_API_KEY='test';process.env.GROQ_MODEL='openai/gpt-oss-120b';let called=false;
 await assert.rejects(generateWithRecovery({provider:'groq',body,validate:x=>x},{fetch:async()=>{called=true;}}),/CONFIG_MODEL/);
 assert.equal(called,false);
}));
