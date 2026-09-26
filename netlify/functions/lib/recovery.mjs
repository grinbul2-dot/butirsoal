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
export async function generateWithRecovery({body,validate,onProgress=()=>{},signal},deps={}){
 const key=process.env.GEMINI_API_KEY;
 if(!key)throw new ServiceError(503,'Layanan belum diaktifkan. Hubungi pengelola untuk melengkapi konfigurasi layanan.');
 const models=[...new Set([process.env.GEMINI_MODEL||'gemini-3.5-flash',process.env.GEMINI_FALLBACK_MODEL||'gemini-3.5-flash-lite'])];
 if(models.some(m=>!/^[a-zA-Z0-9._-]+$/.test(m)))throw new ServiceError(503,'Konfigurasi layanan tidak valid. Hubungi pengelola.');
 const request=deps.fetch||globalThis.fetch,now=deps.now||Date.now,sleep=deps.sleep||pause;
 const start=now(),deadline=start+54000;
 let lastStatus=502;
 for(let modelIndex=0;modelIndex<models.length;modelIndex++){
  const phaseDeadline=models.length>1&&modelIndex===0?start+32000:deadline;
  if(signal?.aborted)throw signal.reason;
  if(now()+1000>=deadline)break;
  if(modelIndex)onProgress('Layanan utama belum merespons. Mencoba layanan cadangan otomatis…');
  for(let attempt=0;attempt<4;attempt++){
   if(signal?.aborted)throw signal.reason;
   const remaining=phaseDeadline-now();if(remaining<1000)break;
   const controller=new AbortController();
   const abort=()=>controller.abort(signal.reason);
   signal?.addEventListener('abort',abort,{once:true});
   const timer=setTimeout(()=>controller.abort(),remaining);
   let waitMs=1000*2**attempt,tryNextModel=false;
   try{
    const response=await request(`https://generativelanguage.googleapis.com/v1beta/models/${models[modelIndex]}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body),signal:controller.signal});
    if(!response.ok){
     if([400,401,403].includes(response.status))throw new ServiceError(503,'Layanan belum dapat memproses permintaan. Hubungi pengelola untuk memeriksa konfigurasi atau kuota layanan.');
     if(response.status===404){tryNextModel=true;lastStatus=503;}
     else if(response.status===408||response.status===429||response.status>=500){
      lastStatus=response.status===429?429:502;
      const retryAfter=response.headers?.get('retry-after');
      if(retryAfter){const seconds=Number(retryAfter);const ms=Number.isFinite(seconds)?seconds*1000:Date.parse(retryAfter)-now();if(Number.isFinite(ms))waitMs=Math.max(waitMs,ms);}
     }else throw new ServiceError(502,'Permintaan belum dapat diproses. Periksa isian atau hubungi pengelola.');
    }else{
     const data=await response.json(),candidate=data.candidates?.[0];
     if(data.promptFeedback?.blockReason||['SAFETY','RECITATION','BLOCKLIST','PROHIBITED_CONTENT','SPII','IMAGE_SAFETY'].includes(candidate?.finishReason))throw new ServiceError(422,'Permintaan dibatasi oleh layanan. Periksa kembali isi soal sebelum mencoba kembali.');
     if(candidate?.finishReason==='MAX_TOKENS')throw new ServiceError(502,'Hasil belum selesai karena terlalu panjang. Ringkas stimulus tanpa menghilangkan informasi penting, lalu coba kembali.');
     if(candidate?.finishReason!=='STOP')throw new Error('Incomplete result');
     const raw=candidate.content?.parts?.filter(p=>!p.thought&&typeof p.text==='string').map(p=>p.text).join('');
     return validate(JSON.parse(raw));
    }
   }catch(error){
    if(signal?.aborted)throw signal.reason;
    if(error instanceof ServiceError)throw error;
    lastStatus=controller.signal.aborted?504:502;
   }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
   if(tryNextModel||attempt===3||now()+waitMs+1000>=phaseDeadline)break;
   onProgress(`Server sedang sibuk, mencoba ulang otomatis dalam ${Math.ceil(waitMs/1000)} detik… (percobaan ulang ${attempt+1}/3)`);
   await sleep(waitMs,signal);
  }
 }
 throw new ServiceError(lastStatus,'Server masih sibuk setelah beberapa percobaan. Silakan coba kembali beberapa saat lagi; isian Anda tetap tersedia.');
}
