import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function runtime(){
 const elements=new Map();
 for(const [,id] of html.matchAll(/id="([^"]+)"/g))elements.set(id,{value:'',hidden:true,innerHTML:'',textContent:'',required:false,disabled:false,classList:{toggle(){}},setAttribute(){},removeAttribute(){},addEventListener(){},querySelectorAll(){return[];},scrollIntoView(){},focus(){}});
 const context=vm.createContext({document:{getElementById:id=>elements.get(id),querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem(){}},setTimeout,clearTimeout,setInterval,clearInterval,AbortController,console});
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
 assert.equal((rendered.match(/class="score-card"/g)||[]).length,7);
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
 context.fetch=async()=>({ok:true,json:async()=>({result:{accepted:true,stimuli:['First text','Second text'],question:'New question'}})});
 await elements.get('readImages').onclick();assert.equal(elements.get('text1').value,'Old text');assert.equal(elements.get('extractionReview').hidden,false);
 elements.get('applyExtraction').onclick();assert.equal(elements.get('text1').value,'First text');assert.equal(elements.get('text2').value,'Second text');assert.equal(elements.get('question').value,'New question');
 context.fetch=async()=>({ok:false,json:async()=>({error:'File tidak didukung karena bukan soal Bahasa Inggris.'})});
 await elements.get('readImages').onclick();assert.equal(elements.get('question').value,'New question');assert.equal(elements.get('extractionReview').hidden,true);assert.match(elements.get('imageMessage').textContent,/bukan soal Bahasa Inggris/);
});
