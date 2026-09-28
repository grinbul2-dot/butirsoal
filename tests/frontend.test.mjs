import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function runtime(){
 const elements=new Map();
 for(const [,id] of html.matchAll(/id="([^"]+)"/g))elements.set(id,{value:'',hidden:true,innerHTML:'',textContent:'',required:false,disabled:false,classList:{toggle(){}},setAttribute(){},removeAttribute(){},addEventListener(){},querySelectorAll(){return[];},scrollIntoView(){},focus(){}});
 const context=vm.createContext({document:{getElementById:id=>elements.get(id),querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem(){}},setTimeout,clearTimeout,setInterval,clearInterval,AbortController,TextDecoder,TextEncoder,console,crypto:webcrypto});
 vm.runInContext(source,context);
 return {context,elements};
}
const plain=s=>s.replace(/<\/?(?:mark|del)>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
test('frontend parses and diff preserves original/revision while escaping markup',()=>{
 const {context}=runtime();
 for(const [a,b] of [['abc def','abc xyz def'],['a b c','a c'],['','new'],['old',''],['same','same'],['<script>alert(1)</script>','<b>new</b>'],['x '.repeat(1500),'y '.repeat(1500)]]){
  const result=context.diffPair(a,b);assert.equal(plain(result.before),a);assert.equal(plain(result.after),b);assert.ok(!result.before.includes('<script>'));assert.ok(!result.after.includes('<b>'));
 }
});
test('render all 7 score cards, both complete texts and suppress revision for very-good label',()=>{
 const {context,elements}=runtime();
 const input={stimuli:['Rina see a woman.','Dina walks home.'],question:'What does Rina do? A. Help B. Leave'};
 const result={answerKey:{status:'Ditentukan',answer:'A. Help',explanation:'Evidence from text.'},categories:['type','genre','barrett','kisi','bloom','cefr','grammar'].map(id=>({id,score:88,label:'Sesuai',target:'Target',identified:'Terdeteksi',analysis:'Analisis',evidence:'Bukti'})),overall:{score:88,label:'Sesuai',reason:'Ada perbaikan.'},grammar:{summary:'Grammar perlu perbaikan.',notes:[]},issues:[],revision:{stimuli:['Rina saw a woman.','Dina walks home.'],question:input.question,rationale:'Perbaikan verb.',answerKey:{status:'Ditentukan',answer:'A. Help',explanation:'Evidence.'}}};
 context.renderResult({result,meta:{}},input);
 let rendered=elements.get('results').innerHTML;
 assert.equal((rendered.match(/class="score-card"/g)||[]).length,7);assert.ok(!rendered.includes('Rincian rubrik'));assert.ok(!rendered.includes('rubrik.html'));
 assert.equal((rendered.match(/class="comparison-text"/g)||[]).length,6);
 assert.match(rendered,/<mark>saw<\/mark>/);assert.match(rendered,/Kunci jawaban — Soal asli/);assert.match(rendered,/Kunci jawaban — Soal revisi/);assert.ok(!/\bAI\b|gemini|Analisis AI/i.test(rendered));
 result.overall.label='Sangat Sesuai';context.renderResult({result,meta:{}},input);rendered=elements.get('results').innerHTML;
 assert.match(rendered,/Soal sudah sangat sesuai/);assert.ok(!rendered.includes('compare-grid'));
});
test('model-provided HTML is displayed as text, never inserted as executable markup',()=>{
 const {context,elements}=runtime();
 const malicious='<img src=x onerror=alert(1)>';
 const result={answerKey:{status:'Ditentukan',answer:'A. Help',explanation:'Evidence from text.'},categories:['type','genre','barrett','kisi','bloom','cefr','grammar'].map(id=>({id,score:100,label:'Sangat Sesuai',target:malicious,identified:'Target',analysis:malicious,evidence:'Bukti'})),overall:{score:100,label:'Sangat Sesuai',reason:malicious},grammar:{summary:malicious,notes:[]},issues:[]};
 context.renderResult({result,meta:{}},{stimuli:['Text'],question:'Question'});
 assert.ok(!elements.get('results').innerHTML.includes('<img'));assert.ok(elements.get('results').innerHTML.includes('&lt;img'));
});
test('image reading previews before replacing input; rejection preserves existing fields',async()=>{
 const {context,elements}=runtime();context.location={protocol:'http:'};
 elements.get('text1').value='Old text';elements.get('question').value='Old question';
 vm.runInContext("selectedImages=[{name:'photo.jpg',mimeType:'image/jpeg',data:'test'}]",context);
 context.fetch=async()=>({ok:true,json:async()=>({state:'done',data:{result:{accepted:true,stimuli:['First text','Second text'],question:'New question'}}})});
 await elements.get('readImages').onclick();assert.equal(elements.get('text1').value,'Old text');assert.equal(elements.get('extractionReview').hidden,false);
 elements.get('applyExtraction').onclick();assert.equal(elements.get('text1').value,'First text');assert.equal(elements.get('text2').value,'Second text');assert.equal(elements.get('question').value,'New question');
 context.fetch=async()=>({ok:true,json:async()=>({state:'error',error:'File tidak didukung karena bukan soal Bahasa Inggris.'})});
 await elements.get('readImages').onclick();assert.equal(elements.get('question').value,'New question');assert.equal(elements.get('extractionReview').hidden,true);assert.match(elements.get('imageMessage').textContent,/bukan soal Bahasa Inggris/);assert.equal(elements.get('ocrFallback').hidden,false);
 elements.get('cleartext1').onclick();assert.equal(elements.get('text1').value,'');assert.equal(elements.get('question').value,'New question');assert.equal(elements.get('count1').textContent,'0 kata');
 elements.get('clearquestion').onclick();assert.equal(elements.get('question').value,'');
 context.imageMessage('Berhasil');assert.equal(elements.get('ocrFallback').hidden,true);
});
test('stream parser handles fragmented progress, final errors and truncated connections',async()=>{
 const {context}=runtime();const messages=[];
 const stream=lines=>new Response(new ReadableStream({start(c){const bytes=new TextEncoder().encode(lines);for(let i=0;i<bytes.length;i+=7)c.enqueue(bytes.slice(i,i+7));c.close();}}),{headers:{'content-type':'application/x-ndjson'}});
 const result=await context.readServiceResponse(stream(JSON.stringify({type:'progress',message:'Mencoba ulang…'})+'\n'+JSON.stringify({type:'result',result:{ok:true}})+'\n'),m=>messages.push(m));
 assert.equal(result.result.ok,true);assert.deepEqual(messages,['Mencoba ulang…']);
 await assert.rejects(context.readServiceResponse(stream('{"type":"error","error":"Server masih sibuk"}\n'),()=>{}),/Server masih sibuk/);
 await assert.rejects(context.readServiceResponse(stream('{"type":"progress","message":"Tunggu"}\n'),()=>{}),/Koneksi terputus/);
});
test('three pages isolate input from results; fresh start removes draft, images and all fields',()=>{
 const {context,elements}=runtime();const storage=new Map([['analisis-butir-draft-v1','old draft']]);
 context.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 context.showStep(1);assert.equal(elements.get('step1').hidden,false);assert.equal(elements.get('step2').hidden,true);assert.equal(elements.get('step3').hidden,true);
 context.showStep(2);assert.equal(elements.get('step1').hidden,true);assert.equal(elements.get('step2').hidden,false);
 vm.runInContext("for(const id of fields)$(id).value='Old value';selectedImages=[{name:'old.jpg',data:'abc',mimeType:'image/jpeg'}];pendingExtraction={accepted:true};lastInput={question:'Old'};second(true);saveTimer=setTimeout(saveDraft,250);",context);
 context.showStep(3);assert.equal(elements.get('inputWorkspace').hidden,true);assert.equal(elements.get('step3').hidden,false);assert.equal(elements.get('progressLabel').textContent,'Halaman 3 dari 3');
 elements.get('results').innerHTML='Old result';elements.get('imageFiles').value='Old file';elements.get('cameraFile').value='Old camera';
 elements.get('startNew').onclick();
 assert.equal(vm.runInContext("fields.every(id=>$(id).value==='')",context),true);
 assert.equal(vm.runInContext('selectedImages.length',context),0);assert.equal(vm.runInContext('pendingExtraction',context),null);assert.equal(vm.runInContext('lastInput',context),null);
 assert.equal(storage.has('analisis-butir-draft-v1'),false);
 assert.equal(elements.get('results').innerHTML,'');assert.equal(elements.get('imagePreviews').innerHTML,'');assert.equal(elements.get('imageFiles').value,'');assert.equal(elements.get('cameraFile').value,'');
 assert.equal(elements.get('secondText').hidden,true);assert.equal(elements.get('text2').required,false);assert.equal(elements.get('step1').hidden,false);assert.equal(elements.get('inputWorkspace').hidden,false);assert.equal(elements.get('step3').hidden,true);assert.equal(elements.get('tab3').disabled,true);
});
test('cached analysis avoids calls; failed revision preserves result and retries only revision',async()=>{
 const {context,elements}=runtime();context.location={protocol:'http:'};
 for(const id of ['type','genre','barrett','kisi','bloom','cefr','text1','question'])elements.get(id).value='Filled';
 const input=context.payload();
 const result={answerKey:{status:'Ditentukan',answer:'A',explanation:'Evidence'},categories:['type','genre','barrett','kisi','bloom','cefr','grammar'].map(id=>({id,score:80,label:'Sesuai',target:'Target',identified:'Found',analysis:'Reason',evidence:'Text'})),overall:{score:80,label:'Sesuai',reason:'Improve'},grammar:{summary:'OK',notes:[]},issues:[]};
 context.renderResult({result},input);const before=elements.get('results').innerHTML;
 let calls=0;context.fetch=async url=>{calls++;assert.equal(url,'/.netlify/functions/jobs');return {ok:true,json:async()=>({state:'error',error:'Server sibuk [UPSTREAM_429]'})};};
 await context.runAnalysis();assert.equal(calls,0);assert.match(elements.get('resultStatus').textContent,/tersimpan/);
 await context.requestRevision();assert.equal(calls,1);assert.equal(elements.get('results').innerHTML,before);assert.equal(elements.get('results').hidden,false);
 context.fetch=async url=>{calls++;assert.equal(url,'/.netlify/functions/jobs');return {ok:true,json:async()=>({state:'done',data:{revision:{stimuli:['Revised'],question:'New question',rationale:'Adjusted CEFR',answerKey:result.answerKey}}})};};
 await elements.get('retryRequest').onclick();assert.equal(calls,2);assert.match(elements.get('results').innerHTML,/Adjusted CEFR/);assert.equal(elements.get('retryRequest').hidden,true);
 context.invalidate();assert.equal(elements.get('resultTools').hidden,true);assert.equal(vm.runInContext('lastData',context),null);
});
test('background polling resumes the same job after connection loss without a second start',async()=>{
 const {context}=runtime();context.waitForStatus=async()=>{};
 let starts=0,polls=0,jobId;
 context.fetch=async(url,options)=>{
  assert.equal(url,'/.netlify/functions/jobs');const body=JSON.parse(options.body);
  if(body.action==='start'){starts++;jobId=body.id;return {ok:true,json:async()=>({state:'queued',message:'Waiting'})};}
  polls++;assert.equal(body.id,jobId);throw new Error('Disconnected');
 };
 await assert.rejects(context.backgroundService('analyze',{question:'Same'},()=>{}),/STATUS_CONNECTION/);
 assert.equal(starts,1);assert.equal(polls,3);
 context.fetch=async(url,options)=>{const body=JSON.parse(options.body);assert.equal(body.action,'status');assert.equal(body.id,jobId);return {ok:true,json:async()=>({state:'done',data:{result:{ok:true}}})};};
 const result=await context.backgroundService('analyze',{question:'Same'},()=>{});assert.equal(result.result.ok,true);assert.equal(starts,1);assert.equal(context.pendingFor('analyze',{question:'Same'}),null);
});
