import {ANALYSIS_PROMPT} from './lib/rubrics.mjs';
import {analysisSchema,validateInput,validateAnalysis,InputError} from './lib/contract.mjs';
import {generateWithRecovery} from './lib/recovery.mjs';
import {reply,endpoint} from './lib/transport.mjs';
export async function handleRequest(event,onProgress,signal,recoveryOptions={}){
 if(event.httpMethod!=='POST')return reply(405,{error:'Gunakan metode POST.'});
 if(!/application\/json/i.test(event.headers?.['content-type']||event.headers?.['Content-Type']||''))return reply(415,{error:'Format permintaan harus JSON.'});
 if(!event.body||Buffer.byteLength(event.body)>200000)return reply(413,{error:'Data terlalu besar atau kosong.'});
 let input;try{input=validateInput(JSON.parse(event.body));}catch(e){return reply(400,{error:e instanceof InputError?e.message:'Data JSON tidak valid.'});}
 try{
  const result=await generateWithRecovery({...recoveryOptions,provider:'gemini',onProgress,signal,validate:value=>validateAnalysis(value,input),body:{systemInstruction:{parts:[{text:ANALYSIS_PROMPT}]},contents:[{role:'user',parts:[{text:JSON.stringify(input)}]}],generationConfig:{temperature:1,responseMimeType:'application/json',responseJsonSchema:analysisSchema,maxOutputTokens:7000}}});
  return reply(200,{result});
 }catch(e){return reply(e.status||502,{error:e.status?e.message:'Koneksi layanan terputus. Silakan coba kembali; isian Anda tetap tersedia.'});}
}
export default endpoint(handleRequest);
