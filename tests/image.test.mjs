import test from 'node:test';
import assert from 'node:assert/strict';
import {validateImages,validateExtraction,handleRequest as handler} from '../netlify/functions/read-image.mjs';
const png={mimeType:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGfoAAAAASUVORK5CYII='};
const event={httpMethod:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({images:[png]})};
test('image validation accepts permitted signature, rejects spoofed and excessive inputs',()=>{
 assert.equal(validateImages({images:[png]}).length,1);
 for(const images of [[],[png,png,png,png],[{...png,mimeType:'image/jpeg'}],[{...png,data:'bad!'}],[{mimeType:'image/svg+xml',data:png.data}],[{...png,data:'a'.repeat(1500000)}]])assert.throws(()=>validateImages({images}));
});
test('rejected extraction never returns invented transcript; accepted must be complete',()=>{
 assert.deepEqual(validateExtraction({accepted:false,reason:'gambar buram.',stimuli:['invented'],question:'invented'}),{accepted:false,reason:'gambar buram.',stimuli:[],question:''});
 assert.throws(()=>validateExtraction({accepted:true,reason:'',stimuli:[],question:'Question'}));
 assert.throws(()=>validateExtraction({accepted:true,reason:'',stimuli:['Text'],question:''}));
 assert.equal(validateExtraction({accepted:true,reason:'',stimuli:['Text A','Text B'],question:'Question and options'}).stimuli.length,2);
});
test('unsupported file gives requested message; missing configuration is a service error',async()=>{
 const r=await handler({...event,body:JSON.stringify({images:[{...png,mimeType:'application/pdf'}]})});assert.equal(r.statusCode,422);assert.match(JSON.parse(r.body).error,/^File tidak didukung karena/);
 const old=process.env.GEMINI_API_KEY;delete process.env.GEMINI_API_KEY;try{assert.equal((await handler(event)).statusCode,503);}finally{if(old)process.env.GEMINI_API_KEY=old;}
});
test('image endpoint passes real image parts and distinguishes rejection, success and provider failure',async()=>{
 const oldFetch=global.fetch,oldKey=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='test-only';
 let extraction={accepted:false,reason:'teks buram dan opsi B tidak terbaca.',stimuli:[],question:''};
 try{
  global.fetch=async(url,opts)=>{const payload=JSON.parse(opts.body);assert.equal(payload.contents[0].parts[1].inlineData.mimeType,'image/png');return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(extraction)}]}}]})};};
  let r=await handler(event);assert.equal(r.statusCode,422);assert.equal(JSON.parse(r.body).error,'File tidak didukung karena teks buram dan opsi B tidak terbaca.');
  extraction={accepted:true,reason:'',stimuli:['Rina helped a woman.'],question:'Who helped the woman? A. Rina B. Dina'};
  r=await handler(event);assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).result.question,extraction.question);
  global.fetch=async()=>({ok:false,status:401});r=await handler(event);assert.equal(r.statusCode,503);assert.ok(!r.body.includes('File tidak didukung'));
 }finally{global.fetch=oldFetch;if(oldKey)process.env.GEMINI_API_KEY=oldKey;else delete process.env.GEMINI_API_KEY;}
});
