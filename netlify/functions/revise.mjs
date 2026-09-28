import {REVISION_PROMPT} from './lib/rubrics.mjs';
import {revisionSchema,validateInput,validateAnalysis,validateRevision,InputError} from './lib/contract.mjs';
import {generateWithRecovery} from './lib/recovery.mjs';
import {reply,endpoint} from './lib/transport.mjs';
export async function handleRequest(event,onProgress,signal,recoveryOptions={}){
 if(event.httpMethod!=='POST')return reply(405,{error:'Gunakan metode POST.'});
 if(!/application\/json/i.test(event.headers?.['content-type']||event.headers?.['Content-Type']||''))return reply(415,{error:'Format permintaan harus JSON.'});
 if(!event.body||Buffer.byteLength(event.body)>400000)return reply(413,{error:'Data terlalu besar atau kosong.'});
 let input,analysis;try{const data=JSON.parse(event.body);input=validateInput(data.input);analysis=validateAnalysis(data.analysis,input);}catch(e){return reply(400,{error:e instanceof InputError?e.message:'Data JSON tidak valid.'});}
 try{
  const result=await generateWithRecovery({...recoveryOptions,onProgress,signal,validate:value=>validateRevision(value,input),body:{systemInstruction:{parts:[{text:REVISION_PROMPT}]},contents:[{role:'user',parts:[{text:JSON.stringify({input,analysis})}]}],generationConfig:{temperature:1,responseMimeType:'application/json',responseJsonSchema:revisionSchema,maxOutputTokens:12000}}});
  return reply(200,{revision:result});
 }catch(e){return reply(e.status||502,{error:e.status?e.message:'Koneksi layanan terputus. Silakan coba kembali; isian Anda tetap tersedia.'});}
}
export default endpoint(handleRequest);
