import {providerRequest,providerResponse} from './providers.mjs';
export class ServiceError extends Error {
 constructor(status,message){super(message);this.status=status;}
}
const pause=(ms,signal)=>new Promise((resolve,reject)=>{
 if(signal?.aborted)return reject(signal.reason);
 const done=()=>{signal?.removeEventListener('abort',abort);resolve();};
 const timer=setTimeout(done,ms);
 const abort=()=>{clearTimeout(timer);reject(signal.reason);};
 signal?.addEventListener('abort',abort,{once:true});
});
export async function generateWithRecovery({body,validate,onProgress=()=>{},signal,budgetMs=25000,attemptMs=25000,reserveFallback=false,provider='gemini'},deps={}){
 if(!['gemini','groq'].includes(provider))throw new ServiceError(503,'Konfigurasi layanan tidak valid. [CONFIG_INVALID]');
 const key=process.env[provider==='groq'?'GROQ_API_KEY':'GEMINI_API_KEY'];
 if(!key)throw new ServiceError(503,'Layanan belum diaktifkan. Hubungi pengelola untuk melengkapi konfigurasi layanan.');
 // The Qwen release uses one verified multimodal model for every operation.
 // Legacy GPT-OSS fallback settings must not silently switch away from Qwen.
 const models=[...new Set(provider==='groq'?[process.env.GROQ_MODEL||'qwen/qwen3.8-27b']:[process.env.GEMINI_MODEL||'gemini-3.6-flash',process.env.GEMINI_FALLBACK_MODEL||'gemini-3.5-flash-lite'])];
 if(provider==='groq'&&models[0]!=='qwen/qwen3.8-27b')throw new ServiceError(503,'Pengaturan model belum sesuai paket ini. Pengelola perlu memperbarui GROQ_MODEL sesuai panduan deployment. [CONFIG_MODEL]');
 if(models.some(m=>!(provider==='groq'?/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/:/^[a-zA-Z0-9._-]+$/).test(m)))throw new ServiceError(503,'Konfigurasi layanan tidak valid. Hubungi pengelola.');
 const request=deps.fetch||globalThis.fetch,now=deps.now||Date.now,sleep=deps.sleep||pause;
 const start=now(),deadline=start+budgetMs;
 let lastStatus=502,lastCode='SERVICE_BUSY',validationCode='';
 for(let modelIndex=0;modelIndex<models.length;modelIndex++){
  const phaseDeadline=reserveFallback&&modelIndex===0&&models.length>1?start+Math.floor(budgetMs/2):deadline;
  if(signal?.aborted)throw signal.reason;
  if(now()+1000>=deadline)break;
  if(modelIndex)onProgress('Layanan utama belum merespons. Mencoba layanan cadangan otomatis…');
  for(let attempt=0;attempt<4;attempt++){
   if(signal?.aborted)throw signal.reason;
   const remaining=phaseDeadline-now();if(remaining<1000)break;
   const controller=new AbortController();
   const abort=()=>controller.abort(signal.reason);
   signal?.addEventListener('abort',abort,{once:true});
   const timer=(deps.setTimeout||setTimeout)(()=>controller.abort(),Math.min(remaining,attemptMs));
   let waitMs=1000*2**attempt,tryNextModel=false;
   try{
    const transport=providerRequest(provider,models[modelIndex],key,body);
    const response=await request(transport.url,{method:'POST',headers:transport.headers,body:JSON.stringify(transport.body),signal:controller.signal});
    if(!response.ok){
     if([400,401,403].includes(response.status))throw new ServiceError(503,'Layanan belum dapat memproses permintaan. Hubungi pengelola untuk memeriksa konfigurasi atau kuota layanan.');
     if(response.status===404){tryNextModel=true;lastStatus=503;lastCode='MODEL_NOT_AVAILABLE';}
     else if(response.status===408||response.status===429||response.status>=500){
      lastStatus=response.status===429?429:502;lastCode='UPSTREAM_'+response.status;
      if(response.status===429&&modelIndex<models.length-1)tryNextModel=true;
      const retryAfter=response.headers?.get('retry-after');
      if(retryAfter){const seconds=Number(retryAfter);const ms=Number.isFinite(seconds)?seconds*1000:Date.parse(retryAfter)-now();if(Number.isFinite(ms))waitMs=Math.max(waitMs,ms);}
     }else throw new ServiceError(502,'Permintaan belum dapat diproses. Periksa isian atau hubungi pengelola.');
    }else{
     const data=providerResponse(provider,await response.json()),candidate=data.candidates?.[0];
     if(data.promptFeedback?.blockReason||['SAFETY','RECITATION','BLOCKLIST','PROHIBITED_CONTENT','SPII','IMAGE_SAFETY'].includes(candidate?.finishReason))throw new ServiceError(422,'Permintaan dibatasi oleh layanan. Periksa kembali isi soal sebelum mencoba kembali.');
     if(candidate?.finishReason==='MAX_TOKENS')throw new ServiceError(502,'Hasil belum selesai karena terlalu panjang. Ringkas stimulus tanpa menghilangkan informasi penting, lalu coba kembali.');
     if(candidate?.finishReason!=='STOP')throw new Error('Incomplete result');
     const raw=candidate.content?.parts?.filter(p=>!p.thought&&typeof p.text==='string').map(p=>p.text).join('');
     try{return validate(JSON.parse(raw));}catch(e){
      validationCode=/^INVALID_OUTPUT_[A-Z_]+$/.test(e.message)?e.message:'INVALID_OUTPUT_JSON_OR_STRUCTURE';
      throw new Error('INVALID_OUTPUT');
     }
    }
   }catch(error){
    if(signal?.aborted)throw signal.reason;
    if(error instanceof ServiceError)throw error;
    lastStatus=controller.signal.aborted?504:502;lastCode=controller.signal.aborted?'TIME_LIMIT':error.message==='INVALID_OUTPUT'?'INVALID_OUTPUT':'NETWORK_OR_RESPONSE';
    if(controller.signal.aborted&&modelIndex<models.length-1)tryNextModel=true;
   }finally{(deps.clearTimeout||clearTimeout)(timer);signal?.removeEventListener('abort',abort);}
   console.warn(JSON.stringify({event:'analysis_attempt_failed',provider,model:models[modelIndex],code:lastCode,status:lastStatus,attempt:attempt+1,fallback:modelIndex>0,elapsedMs:now()-start,...(lastCode==='INVALID_OUTPUT'?{validationCode}:{})}));
   if(tryNextModel||attempt===3||now()+waitMs+1000>=phaseDeadline)break;
   onProgress(`Server sedang sibuk, mencoba ulang otomatis dalam ${Math.ceil(waitMs/1000)} detik… (percobaan ulang ${attempt+1}/3)`);
   await sleep(waitMs,signal);
  }
 }
 const messages={
 MODEL_NOT_AVAILABLE:'Layanan yang dipilih tidak tersedia. Pengelola perlu memeriksa pengaturan layanan utama dan cadangan.',
 TIME_LIMIT:'Layanan pemeriksaan belum selesai dalam batas waktu pemrosesan. Isian tetap tersedia. Silakan coba kembali beberapa saat lagi.',
 INVALID_OUTPUT:'Hasil diterima, tetapi belum lengkap atau formatnya tidak sesuai. Isian Anda tetap tersedia; silakan coba kembali.',
 NETWORK_OR_RESPONSE:'Server tidak berhasil menerima respons lengkap dari layanan analisis.',
 UPSTREAM_503:'Layanan pemeriksaan sedang tidak tersedia setelah percobaan ulang. Isian dan hasil sebelumnya tetap tersedia; coba kembali beberapa saat lagi.',
 UPSTREAM_429:'Batas permintaan atau kuota layanan tercapai. Tunggu beberapa saat; pengelola perlu memeriksa kuota jika terus berulang.'
 };
 throw new ServiceError(lastStatus,(messages[lastCode]||'Layanan sedang mengalami gangguan setelah beberapa percobaan. Silakan coba kembali.')+' ['+(lastCode==='INVALID_OUTPUT'?validationCode:lastCode)+']');
}
