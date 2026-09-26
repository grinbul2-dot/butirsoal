import {SYSTEM_PROMPT} from './lib/rubrics.mjs';
import {schema,validateInput,validateOutput,InputError} from './lib/contract.mjs';
const reply=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},body:JSON.stringify(data)});
export const handler = async (event) => {
 if(event.httpMethod!=='POST')return {...reply(405,{error:'Gunakan metode POST.'}),headers:{...reply(405,{}).headers,Allow:'POST'}};
 if(!/application\/json/i.test(event.headers?.['content-type']||event.headers?.['Content-Type']||''))return reply(415,{error:'Format permintaan harus JSON.'});
 if(!event.body||Buffer.byteLength(event.body)>200000)return reply(413,{error:'Data terlalu besar atau kosong.'});
 let input;
 try{input=validateInput(JSON.parse(event.body));}catch(e){return reply(400,{error:e instanceof InputError?e.message:'Data JSON tidak valid.'});}
 const key=process.env.GEMINI_API_KEY;
 if(!key)return reply(503,{error:'Analisis belum diaktifkan. Hubungi pengelola untuk melengkapi konfigurasi layanan.'});
 const model=process.env.GEMINI_MODEL||'gemini-3.5-flash';
 if(!/^[a-zA-Z0-9._-]+$/.test(model))return reply(503,{error:'Konfigurasi model tidak valid. Hubungi pengelola.'});
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),52000);
 try{
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
   method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},signal:controller.signal,
   body:JSON.stringify({systemInstruction:{parts:[{text:SYSTEM_PROMPT}]},contents:[{role:'user',parts:[{text:JSON.stringify(input)}]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema:schema,maxOutputTokens:14000}})
  });
  if(!response.ok){
   if(response.status===429)return reply(429,{error:'Kuota atau batas permintaan layanan tercapai. Tunggu sebentar, lalu coba kembali; pengelola dapat memeriksa kuota API.'});
   if([400,401,403,404].includes(response.status))return reply(503,{error:'Layanan belum dapat memproses permintaan. Hubungi pengelola untuk memeriksa konfigurasi.'});
   return reply(502,{error:'Layanan analisis sedang mengalami gangguan. Input Anda tetap tersedia; silakan coba lagi.'});
  }
  const data=await response.json();const candidate=data.candidates?.[0];
  if(candidate?.finishReason!=='STOP')return reply(502,{error:'Analisis tidak selesai atau dibatasi oleh layanan analisis. Coba lagi dengan teks yang lebih ringkas.'});
  const raw=candidate.content?.parts?.filter(p=>!p.thought && typeof p.text==='string').map(p=>p.text).join('');
  const result=validateOutput(JSON.parse(raw),input);
  return reply(200,{result});
 }catch(e){
  if(controller.signal.aborted)return reply(504,{error:'Analisis melebihi batas waktu. Silakan coba lagi atau ringkas stimulus tanpa menghilangkan informasi penting.'});
  return reply(502,{error:'Hasil telaah belum lengkap atau tidak dapat dibaca. Silakan ulangi analisis; input Anda tetap tersedia.'});
 }finally{clearTimeout(timeout);}
};
