import test from 'node:test';
import assert from 'node:assert/strict';
import {validateInput,validateOutput} from '../netlify/functions/lib/contract.mjs';
import {CATEGORIES,BARRETT,BLOOM,LABELS} from '../netlify/functions/lib/rubrics.mjs';
import {handleRequest as handler} from '../netlify/functions/analyze.mjs';
const input={blueprint:{type:'Pilihan Ganda',genre:'Narrative',barrett:BARRETT[2],kisi:'Infer character traits based on actions in the narrative',bloom:BLOOM[1],cefr:'A2'},grade:7,stimuli:['Rina helped an old woman.'],question:'What is Rina like? A. Kind B. Lazy C. Rude D. Selfish'};
const output=()=>({answerKey:{status:'Ditentukan',rows:[],answer:'A. Kind',explanation:'She helped the woman.'},categories:CATEGORIES.map(([id],i)=>({id,criteria:[1,2,3,4].map(index=>({index,level:3,reason:'Ada kekurangan kecil.',quote:'Rina helped an old woman.'})),score:99,label:LABELS[0],target:'Target',identified:'Identified',analysis:'Analisis',evidence:'Bukti'})),overall:{label:LABELS[1],reason:'Simpulan'},grammar:{summary:'Tidak ada kesalahan.',notes:[]},issues:[],revision:{stimuli:[...input.stimuli],question:input.question,rationale:'Perbaikan kecil.',answerKey:{status:'Ditentukan',rows:[],answer:'A. Kind',explanation:'Evidence.'}}});
test('input supports a free question type and one or two texts',()=>{assert.equal(validateInput(input).grade,7);assert.equal(validateInput({...input,blueprint:{...input.blueprint,type:'Kategori khusus'},stimuli:['Text A','Text B']}).stimuli.length,2);});
test('reject blank fields, wrong enums, extra texts, grade and oversize',()=>{for(const candidate of [{...input,question:'  '},{...input,grade:13},{...input,stimuli:['a','b','c']},{...input,stimuli:['']},{...input,blueprint:{...input.blueprint,bloom:'C9'}},{...input,question:'x'.repeat(12001)}])assert.throws(()=>validateInput(candidate));});
test('calculate mean instead of trusting AI; order categories',()=>{const x=output();x.overall.score=100;x.categories.reverse();const r=validateOutput(x,input);assert.equal(r.overall.score,75);assert.equal(r.categories[0].id,'type');});
test('omit revision whenever overall is Sangat Sesuai',()=>{const x=output();x.overall.label=LABELS[0];x.categories.forEach(c=>c.criteria.forEach(r=>r.level=4));assert.equal('revision' in validateOutput(x,input),false);});
test('all other labels require a whole revision with matching text count',()=>{const x=output();delete x.revision;assert.throws(()=>validateOutput(x,input));assert.throws(()=>validateOutput(output(),{...input,stimuli:['a','b']}));const y=output();y.revision.stimuli=['a','b'];y.categories.forEach(c=>c.criteria.forEach(r=>r.quote='What is Rina like?'));assert.equal(validateOutput(y,{...input,stimuli:['a','b']}).revision.stimuli.length,2);});
test('reject duplicate categories, criterion indices and invalid levels',()=>{const a=output();a.categories[0].id='genre';assert.throws(()=>validateOutput(a,input));const b=output();b.categories[0].criteria[0].level=5;assert.throws(()=>validateOutput(b,input));const c=output();c.categories[0].criteria[0].index=2;assert.throws(()=>validateOutput(c,input));});
test('HTTP method, content type, invalid input and missing key have clear errors',async()=>{assert.equal((await handler({httpMethod:'GET'})).statusCode,405);assert.equal((await handler({httpMethod:'POST',headers:{},body:'{}'})).statusCode,415);assert.equal((await handler({httpMethod:'POST',headers:{'content-type':'application/json'},body:'{}'})).statusCode,400);const old=process.env.GEMINI_API_KEY;delete process.env.GEMINI_API_KEY;try{assert.equal((await handler({httpMethod:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)})).statusCode,503);}finally{if(old)process.env.GEMINI_API_KEY=old;}});
test('proxy requests structured JSON, returns validated result, handles quota/truncation',async()=>{const originalFetch=global.fetch,oldKey=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='test-only-secret';const event={httpMethod:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)};try{global.fetch=async(url,opts)=>{assert.equal(opts.headers['x-goog-api-key'],'test-only-secret');assert.ok(!url.includes('test-only-secret'));const body=JSON.parse(opts.body);assert.equal(body.generationConfig.responseMimeType,'application/json');assert.ok(body.systemInstruction.parts[0].text.includes('BLOOM REVISI'));return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(output())}]}}]})};};const response=await handler(event);assert.equal(response.statusCode,200);assert.equal(JSON.parse(response.body).result.overall.score,75);assert.ok(!response.body.includes('test-only-secret'));global.fetch=async()=>({ok:false,status:401});assert.equal((await handler(event)).statusCode,503);global.fetch=async()=>({ok:true,json:async()=>({candidates:[{finishReason:'MAX_TOKENS'}]})});assert.equal((await handler(event)).statusCode,502);}finally{global.fetch=originalFetch;if(oldKey)process.env.GEMINI_API_KEY=oldKey;else delete process.env.GEMINI_API_KEY;}});
test('original and revised answer keys required, ambiguous answer permitted',()=>{const x=output();delete x.answerKey;assert.throws(()=>validateOutput(x,input));const y=output();delete y.revision.answerKey;assert.throws(()=>validateOutput(y,input));const z=output();z.answerKey={rows:[],status:'Ambigu',answer:'A atau B',explanation:'Dua opsi sama-sama didukung teks.'};assert.equal(validateOutput(z,input).answerKey.status,'Ambigu');});
test('rubric score boundaries and label caps are deterministic',()=>{
 for(const [levels,score,label] of [[[0,0,0,0],1,'Tidak Sesuai'],[[2,2,2,2],50,'Kurang Sesuai'],[[3,3,3,3],75,'Sesuai'],[[4,4,3,3],88,'Sesuai'],[[4,4,4,3],94,'Sangat Sesuai'],[[4,4,4,4],100,'Sangat Sesuai']]){
  const x=output();x.categories.forEach(c=>c.criteria.forEach((r,i)=>r.level=levels[i]));
  const result=validateOutput(x,input);assert.equal(result.overall.score,score);assert.equal(result.overall.label,label);
 }
 const x=output();x.categories.forEach(c=>c.criteria.forEach(r=>r.level=4));x.categories[0].criteria.forEach(r=>r.level=1);
 const result=validateOutput(x,input);assert.ok(result.overall.score>75);assert.equal(result.overall.label,'Kurang Sesuai');assert.ok(result.overall.rules.length);
 const a=output();a.categories.forEach(c=>c.criteria.forEach(r=>r.level=4));a.answerKey.status='Ambigu';
 assert.equal(validateOutput(a,input).overall.label,'Kurang Sesuai');
 const b=output();b.categories.forEach(c=>c.criteria.forEach(r=>r.level=4));b.issues=[{category:'type',location:'Opsi',explanation:'Ada masalah material',suggestion:'Perbaiki'}];
 assert.equal(validateOutput(b,input).overall.label,'Sesuai');
});
test('unmatched or missing criterion quotes flag provisional result instead of discarding analysis',()=>{
 const x=output();x.categories[0].criteria[0].quote='The dragon flew away.';const result=validateOutput(x,input);assert.equal(result.categories[0].criteria[0].evidenceVerified,false);assert.equal(result.overall.label,'Kurang Sesuai');assert.match(result.overall.rules.join(' '),/sementara/);
 const y=output();y.categories[0].criteria[0].quote='';assert.equal(validateOutput(y,input).categories[0].criteria[0].evidenceVerified,false);
 const z=output();z.categories[0].criteria[0].quote='';z.categories[0].criteria[0].level=0;assert.doesNotThrow(()=>validateOutput(z,input));
});
test('category question requires row keys, checks evidence and propagates uncertainty',()=>{
 const matrix={...input,blueprint:{...input.blueprint,type:'Pilihan Ganda Kompleks Kategori'},question:'Choose True or False.\n1. Rina helped an old woman.\n2. Rina went home.'};
 const row=(statement,status='Ditentukan')=>({statement,status,answer:status==='Ditentukan'?'True':'Belum dapat ditentukan',explanation:'Bukti tersedia atau tidak cukup.',evidence:status==='Ditentukan'?input.stimuli[0]:''});
 const x=output();x.answerKey.rows=[row('Rina helped an old woman.'),row('Rina went home.','Informasi tidak cukup')];x.revision.question=matrix.question;x.revision.answerKey.rows=structuredClone(x.answerKey.rows);
 const result=validateOutput(x,matrix);assert.equal(result.answerKey.status,'Informasi tidak cukup');assert.equal(result.overall.label,'Kurang Sesuai');
 const missing=output();assert.throws(()=>validateOutput(missing,matrix));
 const wrong=structuredClone(x);wrong.answerKey.rows[0].evidence='Imaginary evidence';assert.throws(()=>validateOutput(wrong,matrix));
 const duplicate=structuredClone(x);duplicate.answerKey.rows.push(duplicate.answerKey.rows[0]);assert.throws(()=>validateOutput(duplicate,matrix));
});
test('typographic punctuation and whitespace do not invalidate real quotes',()=>{
 const source={...input,stimuli:["Rina’s cat is small."]};const x=output();x.categories.forEach(c=>c.criteria.forEach(r=>r.quote="“Rina's   cat is small.”"));
 const result=validateOutput(x,source);assert.equal(result.categories[0].criteria[0].evidenceVerified,true);assert.equal(result.overall.label,'Sesuai');
});
